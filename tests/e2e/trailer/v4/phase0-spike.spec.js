import { test, expect } from '@playwright/test';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { bootForCapture, captureShot, RAW_ROOT, shotApi } from './capture.js';

// Phase 0 of docs/planning/trailer-v4-capture-edit-and-sound-plan-2026-10-14.md:
// does virtual-time frame stepping give smooth, in-sync footage on the GPU?
//   1. sync: a canvas change and a HUD change made before the same step must
//      first show up in the same captured frame;
//   2. 3 s of combat at 60 fps and at 240 fps: no duplicated frames
//      (freezedetect / mpdecimate), exactly one game.render() per step with
//      delta = 1/fps, and enemies covering the same distance per virtual
//      second at both rates (the sim follows the stepped clock).
// Writes trailer/raw/v4/phase0/report.json.
test.skip(!process.env.HB_TRAILER_V4, 'footage generator: run with -c tests/e2e/trailer/v4/playwright.config.js');
const OUT = path.join(RAW_ROOT, 'phase0');

// Duplicated frames: identical consecutive decoded frames (framemd5). A
// static scene can legitimately trip freezedetect, so it is reported only.
const ffmpegStats = (file) => {
    const md5 = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-an', '-f', 'framemd5', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 })
        .split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
    let duplicates = 0;
    for (let i = 1; i < md5.length; i += 1) if (md5[i] === md5[i - 1]) duplicates += 1;
    const freeze = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vf', 'freezedetect=n=0.0005:d=0.1', '-an', '-f', 'null', '-'], { encoding: 'utf8' }).stderr ?? '';
    return {
        frames: md5.length,
        duplicates,
        freezeLines: freeze.split('\n').filter((l) => l.includes('freeze_')).slice(0, 10)
    };
};

// RMS difference of a region between consecutive frames, from ffmpeg-dumped PNGs.
const regionDiffs = (file, region, count) => {
    const dir = fs.mkdtempSync(path.join(OUT, 'sync-'));
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file,
        '-vf', `crop=${region.w}:${region.h}:${region.x}:${region.y}`, '-frames:v', String(count), path.join(dir, 'f%03d.png')]);
    const diffs = [];
    for (let i = 2; i <= count; i += 1) {
        const out = execFileSync('sh', ['-c', `compare -metric RMSE "${dir}/f${String(i - 1).padStart(3, '0')}.png" "${dir}/f${String(i).padStart(3, '0')}.png" null: 2>&1 || true`], { encoding: 'utf8' });
        const match = out.match(/\(([\d.e-]+)\)/);
        diffs.push(match ? Number(match[1]) : null);
    }
    fs.rmSync(dir, { recursive: true, force: true });
    return diffs; // diffs[k] = change between frame k and frame k+1 (0-based)
};

test('phase 0: virtual-time capture spike', async ({ page }) => {
    fs.mkdirSync(OUT, { recursive: true });
    await bootForCapture(page, { playerClass: 'TANK' });
    const api = shotApi(page);
    await page.evaluate(() => {
        const game = window.game;
        game.setGodMode?.(true);
        const render = game.render.bind(game);
        game.__renders = 0;
        game.render = () => { game.__renders += 1; return render(); };
    });
    const report = { startedAt: new Date().toISOString() };

    const stage = async () => {
        await api.teleport(12, 0, { settle: 6000 });
        await api.clearEnemies();
        await api.equip('scatter_rep');
        await api.view({ zoom: 1.35, time: 0.45 });
    };

    // 1. Sync: before step 6, zoom the camera and add a HUD element (a
    // marker inside the weapon panel; game-owned text is re-rendered every
    // frame, so overwriting it proves nothing).
    await stage();
    let clipBox = null;
    const sync = await captureShot(page, {
        id: 'sync', fps: 60, seconds: 0.2, outDir: OUT,
        onFrame: async (frame) => {
            if (frame !== 6) return;
            await page.evaluate(() => {
                const game = window.game;
                game.camera.zoom = 2.2;
                game.camera.updateProjectionMatrix();
                const marker = document.createElement('div');
                marker.style.cssText = 'position:absolute;inset:0;background:#ff00ff;z-index:99999;pointer-events:none';
                document.getElementById('weapon-status-panel').appendChild(marker);
            });
            // Measure the marker itself: the HUD console re-parents the panel
            // after boot, so a box read earlier points at the wrong place.
            clipBox = await page.evaluate(() => {
                const r = document.getElementById('weapon-status-panel').lastElementChild.getBoundingClientRect();
                return { x: r.x, y: r.y, width: r.width, height: r.height };
            });
        }
    });
    // Region scale from the take itself (CSS px -> video px).
    const videoWidth = Number(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width', '-of', 'csv=p=0', sync.file], { encoding: 'utf8' }).trim());
    const scale = videoWidth / sync.meta.clip.width;
    const canvasRegion = { x: Math.round(sync.meta.clip.width * scale * 0.3), y: Math.round(sync.meta.clip.height * scale * 0.25), w: 600, h: 400 };
    const hudRegion = {
        x: Math.round((clipBox.x - sync.meta.clip.x) * scale) - 8,
        y: Math.round((clipBox.y - sync.meta.clip.y) * scale) - 8,
        w: Math.round(clipBox.width * scale) + 16,
        h: Math.round(clipBox.height * scale) + 16
    };
    const canvasDiffs = regionDiffs(sync.file, canvasRegion, 12);
    const hudDiffs = regionDiffs(sync.file, hudRegion, 12);
    const spike = (diffs) => diffs.indexOf(Math.max(...diffs.filter((d) => d !== null))) + 1;
    report.sync = { scale, canvasRegion, hudRegion, canvasDiffs, hudDiffs, canvasChangedAtFrame: spike(canvasDiffs), hudChangedAtFrame: spike(hudDiffs) };
    await api.view({ zoom: 1.35 });

    // 2. Combat at 60 and 240 fps.
    const probe = () => {
        const game = window.game;
        // Live enemies draw through their 3D visual; the sprite itself is hidden.
        const enemies = (game.scatterSprites ?? []).filter((s) => s.userData?.isEnemy && !s.userData.dead && s.userData.hp > 0);
        return {
            renders: game.__renders,
            lastTime: game.lastTime,
            enemies: enemies.slice(0, 4).map((s) => [Math.round(s.position.x * 1000) / 1000, Math.round(s.position.z * 1000) / 1000]),
            clip: document.getElementById('weapon-clip-current')?.textContent ?? null
        };
    };
    for (const fps of [60, 240]) {
        await stage();
        await api.spawnScreen(['crawler', 'cybersnail', 'crawler', 'cybersnail'], { dist: 7, from: 20, to: 70, hpMult: 3 });
        await page.waitForTimeout(400);
        let aim = null;
        const take = await captureShot(page, {
            id: `combat-${fps}`, fps, seconds: 3, outDir: OUT, probe,
            onFrame: async (frame) => {
                const every = Math.round(fps / 10);
                if (frame % every === 0) {
                    const targets = await api.enemyPoints();
                    if (targets[0]) {
                        aim = targets[0];
                        await page.mouse.move(aim.x, aim.y);
                    }
                }
                if (frame === Math.round(fps * 0.25)) await page.mouse.down();
                if (frame === Math.round(fps * 2.6)) await page.mouse.up();
            }
        });
        const rows = take.perFrame.map((row) => row.extra);
        const renders = rows.map((row, i) => (i ? row.renders - rows[i - 1].renders : null)).slice(1);
        const deltas = rows.map((row, i) => (i ? Math.round((row.lastTime - rows[i - 1].lastTime) * 1000) / 1000 : null)).slice(1);
        // Enemy speed: mean displacement per virtual second of enemy 0 over the take.
        const tracks = rows.map((row) => row.enemies[0]).filter(Boolean);
        let distance = 0;
        for (let i = 1; i < tracks.length; i += 1) distance += Math.hypot(tracks[i][0] - tracks[i - 1][0], tracks[i][1] - tracks[i - 1][1]);
        report[`combat${fps}`] = {
            meta: take.meta,
            soundEvents: take.events.length,
            soundKeys: [...new Set(take.events.map((e) => e.buffer ?? e.key))].slice(0, 30),
            rendersPerStep: [...new Set(renders)],
            deltaMs: { min: Math.min(...deltas), max: Math.max(...deltas), expected: Math.round(100000 / fps) / 100 },
            enemy0DistancePerSecond: Math.round((distance / (tracks.length / fps)) * 1000) / 1000,
            clipValues: [...new Set(rows.map((r) => r.clip))].slice(0, 20),
            video: ffmpegStats(take.file)
        };
        await page.mouse.up();
    }
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
    console.log(JSON.stringify(report, (k, v) => (k === 'perFrame' ? undefined : v), 1));

    expect(report.sync.canvasChangedAtFrame).toBe(report.sync.hudChangedAtFrame);
    for (const fps of [60, 240]) {
        expect(report[`combat${fps}`].rendersPerStep).toEqual([1]);
        expect(report[`combat${fps}`].video.duplicates).toBe(0);
    }
});
