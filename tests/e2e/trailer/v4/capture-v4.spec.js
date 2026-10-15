import { test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { bootToTitleSplash, stubOfflineElectronAPI } from '../../helpers.js';
import { bootForCapture, captureShot, RAW_ROOT, setHudMode, shotApi } from './capture.js';
import { installVirtualClockShim } from './vclock.js';
import { SHOTS } from './shots.js';

// Trailer v4 footage, every recipe in shots.js, one boot per class.
//   npm run trailer:capture:v4                       all shots
//   TRAILER_SHOTS=drop-rail,queen-turn npm run trailer:capture:v4
// Output per shot: trailer/raw/v4/<id>/{<id>.mkv,<id>.events.json,<id>.meta.json,sheet.jpg};
// trailer/raw/v4/index.json lists every take with its status.
test.skip(!process.env.HB_TRAILER_V4, 'footage generator: run with -c tests/e2e/trailer/v4/playwright.config.js');
const ONLY = new Set((process.env.TRAILER_SHOTS ?? '').split(',').filter(Boolean));
const wanted = (id) => ONLY.size === 0 || ONLY.has(id);
const INDEX = path.join(RAW_ROOT, 'index.json');

const readIndex = () => {
    try {
        return JSON.parse(fs.readFileSync(INDEX, 'utf8'));
    } catch {
        return {};
    }
};
const record = (id, entry) => {
    fs.mkdirSync(RAW_ROOT, { recursive: true });
    const index = readIndex();
    index[id] = { ...entry, at: new Date().toISOString() };
    fs.writeFileSync(INDEX, JSON.stringify(index, null, 1));
};

const contactSheet = (file, out) => {
    const frames = Number(execFileSync('ffprobe', ['-v', 'error', '-count_packets', '-select_streams', 'v:0',
        '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim()) || 60;
    const step = Math.max(1, Math.floor(frames / 6));
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', file,
        '-vf', `select='not(mod(n\\,${step}))',scale=640:-1,tile=3x2`, '-frames:v', '1', '-q:v', '4', out]);
};

const releaseInput = async (page) => {
    await page.mouse.up().catch(() => {});
    for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'Space']) await page.keyboard.up(code).catch(() => {});
};

async function runShot(page, shot, ctx) {
    const api = shotApi(page);
    const started = Date.now();
    try {
        await setHudMode(page, 'game');
        await shot.setup(api, ctx);
        await setHudMode(page, shot.hud ?? 'game');
        const take = await captureShot(page, {
            id: shot.id,
            fps: shot.fps,
            seconds: shot.seconds,
            seed: shot.seed ?? null,
            probe: shot.probe ?? null,
            onFrame: shot.frame ? (f, a) => shot.frame(f, a, ctx) : null
        });
        contactSheet(take.file, path.join(RAW_ROOT, shot.id, 'sheet.jpg'));
        record(shot.id, { status: 'ok', cls: shot.cls, fps: shot.fps, seconds: shot.seconds, hud: shot.hud, events: take.events.length, msPerFrame: take.meta.msPerFrame, wallSeconds: Math.round((Date.now() - started) / 1000) });
    } catch (error) {
        record(shot.id, { status: 'error', cls: shot.cls, error: String(error?.stack ?? error).slice(0, 1500) });
    } finally {
        await page.evaluate(() => window.__hbVClock?.stopVirtual()).catch(() => {});
        await releaseInput(page);
        await setHudMode(page, 'game').catch(() => {});
    }
}

for (const cls of ['TANK', 'SCOUT', 'ENGINEER']) {
    const shots = SHOTS.filter((s) => s.cls === cls && wanted(s.id));
    test(`trailer v4 capture: ${cls}`, async ({ page }) => {
        test.skip(shots.length === 0, 'no shots selected for this class');
        await bootForCapture(page, { playerClass: cls });
        const spawn = await page.evaluate(() => ({ x: window.game.player.position.x, z: window.game.player.position.z }));
        const ctx = { cls, spawn };
        for (const shot of shots) await runShot(page, shot, ctx);
    });
}

// The real title screen, for the Act 5 logo hit.
test('trailer v4 capture: title', async ({ page }) => {
    test.skip(!wanted('title-reveal'), 'not selected');
    await page.addInitScript(installVirtualClockShim);
    await stubOfflineElectronAPI(page);
    await bootToTitleSplash(page);
    // Art and logo only: the menu lists MULTIPLAYER, which the store claim
    // checklist keeps off camera, and the profile HUD is player data.
    await page.addStyleTag({ content: '.title-menu, .title-profile-hud, #menu-corner-settings, .title-footer { visibility: hidden !important; }' });
    await page.waitForTimeout(4000);
    try {
        const take = await captureShot(page, { id: 'title-reveal', fps: 60, seconds: 11, seed: 401 });
        contactSheet(take.file, path.join(RAW_ROOT, 'title-reveal', 'sheet.jpg'));
        record('title-reveal', { status: 'ok', fps: 60, seconds: 11, events: take.events.length, msPerFrame: take.meta.msPerFrame });
    } catch (error) {
        record('title-reveal', { status: 'error', error: String(error?.stack ?? error).slice(0, 1500) });
    }
});
