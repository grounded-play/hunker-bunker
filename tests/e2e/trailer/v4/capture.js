// Trailer v4 capture harness (docs/planning/trailer-v4-capture-edit-and-sound-plan-2026-10-14.md §5).
//
// bootForCapture() boots a run with the virtual clock shim installed, the
// graphics pinned to High (auto step-down off) and the transient HUD hidden.
// captureShot() switches the clock to virtual time and, per frame: runs the
// shot's input callback, steps the clock 1/fps s (one game.render()), takes a
// device-pixel screenshot of the game stage cropped to 16:9 from the top (the bottom
// HUD stays), and pipes it into ffmpeg. Capture speed never affects the
// footage, so every take is smooth and 240 fps slow-mo is native.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { bootToOperatorMenu, startRunAndSkipIntro, stubOfflineElectronAPI } from '../../helpers.js';
import { installVirtualClockShim } from './vclock.js';

export const RAW_ROOT = process.env.TRAILER_RAW ?? 'trailer/raw/v4';

// Transient cards and prompts that cover the player. Vitals, weapon,
// objective and minimap stay: they are what the game looks like.
export const HIDE_TRANSIENT_HUD = `.hud-notification-stack, .hud-stack-card, #hazard-status-panel, [id$="-hud-prompt"],
    #tutorial-prompt, #terminal-status-ticker, #radio-transmission-prompt, #mouse-look-prompt,
    #telemeter-action-prompt, .debug-overlay, #debug-overlay, #fps-counter { visibility: hidden !important; }`;

// Clean mode: the world render only (establishing shots, the class triptych,
// the Queen). Everything on the page is hidden except the main renderer's
// canvas (the minimap is a canvas too, and some toasts live outside the stage).
export const CLEAN_HUD = `body * { visibility: hidden !important; }
    canvas.hb-trailer-world { visibility: visible !important; }`;

export async function setHudMode(page, mode) {
    await page.evaluate(([css, on]) => {
        window.game?.renderer?.domElement?.classList.add('hb-trailer-world');
        let tag = document.getElementById('hb-trailer-clean-hud');
        if (on && !tag) {
            tag = document.createElement('style');
            tag.id = 'hb-trailer-clean-hud';
            tag.textContent = css;
            document.head.appendChild(tag);
        } else if (!on && tag) {
            tag.remove();
        }
    }, [CLEAN_HUD, mode === 'clean']);
}

export async function bootForCapture(page, { playerClass = null } = {}) {
    await page.addInitScript(installVirtualClockShim);
    await page.addInitScript((cls) => {
        if (cls) localStorage.setItem('hb_active_class_v1', cls);
        localStorage.setItem('hb_graphics', JSON.stringify({
            values: { resolution: '100', shadows: 'full', postProcessing: 'on', worldDetail: 'high', landmarks: 'on', effects: 'full' },
            autoAdjust: false,
            autoChanges: []
        }));
    }, playerClass);
    await stubOfflineElectronAPI(page);
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForFunction(() => window.game?.performanceProfile === 'gameplay', null, { timeout: 60_000 });
    await page.addStyleTag({ content: HIDE_TRANSIENT_HUD });
    // No visible tell: setGodMode only skips damage and refills vitals.
    await page.evaluate(() => window.game.setGodMode?.(true));
}

// The 16:9 capture rectangle (CSS px): the 16:10 game stage minus its top
// strip. Frames are taken with page.screenshot, which returns device pixels
// at the context's deviceScaleFactor. A raw CDP Page.captureScreenshot with
// clip.scale 1 returns CSS pixels instead, and any other clip.scale resets
// the page's devicePixelRatio to 1 (the canvas then drops to 1x on the next
// resize): both measured 2026-10-14.
export async function captureClip(page) {
    const box = await page.locator('#game-viewport').boundingBox();
    if (!box) throw new Error('no #game-viewport');
    const height = Math.round(box.width * 9 / 16);
    return { x: box.x, y: box.y + (box.height - height), width: box.width, height };
}

function startEncoder(file, fps) {
    // Visually lossless intermediate. 4:2:0 at 1.35x keeps the HUD crisp after
    // the downscale; crf 12 keeps the grain of the dark scenes.
    const args = ['-hide_banner', '-loglevel', 'error', '-y',
        '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
        // x264 needs even sizes; 1.35x frames are 2333x1312.
        '-vf', 'crop=trunc(iw/2)*2:trunc(ih/2)*2:0:0',
        '-c:v', 'libx264', '-preset', 'faster', '-crf', '12', '-pix_fmt', 'yuv420p',
        '-r', String(fps), file];
    const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (chunk) => { stderr += chunk; });
    const done = new Promise((resolve, reject) => {
        proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${stderr}`))));
    });
    return {
        write: (buffer) => new Promise((resolve) => {
            if (proc.stdin.write(buffer)) resolve();
            else proc.stdin.once('drain', resolve);
        }),
        end: async () => { proc.stdin.end(); await done; }
    };
}

// The shot API handed to recipes: everything runs against the live game.
export function shotApi(page) {
    const api = {
        page,
        evaluate: (fn, arg) => page.evaluate(fn, arg),
        view: ({ zoom = null, time = null } = {}) => page.evaluate(([z, t]) => {
            const game = window.game;
            if (t !== null) {
                game.timeOfDay = t;
                game.updateSky?.(0);
                game.updateDayNightCycle?.(0);
            }
            if (z !== null && game.camera?.isOrthographicCamera) {
                game.camera.zoom = z;
                game.camera.updateProjectionMatrix();
            }
        }, [zoom, time]),
        teleport: async (x, z, { settle = 7000, safeFloor = true } = {}) => {
            await page.evaluate(([wx, wz, safe]) => {
                window.game.teleportPlayerTo(wx, wz, { safeFloor: safe });
                window.game.snapCameraToPlayer?.();
            }, [x, z, safeFloor]);
            await page.waitForTimeout(settle);
        },
        // Despawn every enemy within `radius` of the player the way the
        // game's own death fade does (sprite, 3D visual, scatter entry).
        clearEnemies: (radius = 60) => page.evaluate((r) => {
            const game = window.game;
            const p = game.player.position;
            const keep = [];
            for (const sprite of game.scatterSprites ?? []) {
                const d = Math.hypot(sprite.position.x - p.x, sprite.position.z - p.z);
                if (!sprite.userData?.isEnemy || d > r) {
                    keep.push(sprite);
                    continue;
                }
                sprite.userData.enemy3dVisual?.root?.removeFromParent?.();
                sprite.userData.world3dRoot?.removeFromParent?.();
                sprite.parent?.remove(sprite);
                // startQueenFight() refuses while a live reference exists.
                if (game.queenFightSprite === sprite) game.queenFightSprite = null;
            }
            game.scatterSprites = keep;
        }, radius),
        // Field-weapon swap through the same path as the SWAP TO prompt.
        equip: (profileId) => page.evaluate((id) => {
            const game = window.game;
            const p = game.player.position;
            const drop = game.spawnFieldWeaponDrop(id, p.x, p.z, { ammoInWeapon: 240, reserveAmmo: 480 });
            if (drop?.instanceId) game.interactWithFieldWeaponDrop(drop.instanceId);
            return Boolean(drop);
        }, profileId),
        // Enemies placed on an arc in front of the player (angles in radians,
        // 0 = +x). Returns how many spawned.
        // hpMult lengthens fights for the camera (crawlers die to one hit).
        spawnArc: (types, { radius = 4.5, from = -0.9, to = 0.9, jitter = 1, hpMult = 1, cx = null, cz = null } = {}) => page.evaluate(([list, r, a0, a1, j, mult, x0, z0]) => {
            const game = window.game;
            const p = game.player.position;
            const ox = x0 ?? p.x;
            const oz = z0 ?? p.z;
            let count = 0;
            list.forEach((type, i) => {
                const a = a0 + (i / Math.max(1, list.length - 1)) * (a1 - a0);
                const rr = r + (i % 2) * j;
                const sprite = game.spawnEnemyInstance(type, ox + Math.cos(a) * rr, oz + Math.sin(a) * rr);
                if (!sprite) return;
                if (mult !== 1 && Number.isFinite(sprite.userData.hp)) {
                    sprite.userData.hp = Math.ceil(sprite.userData.hp * mult);
                    sprite.userData.maxHp = Math.max(sprite.userData.maxHp ?? 0, sprite.userData.hp);
                }
                count += 1;
            });
            return count;
        }, [types, radius, from, to, jitter, hpMult, cx, cz]),
        // Spawn in screen terms: degrees around the player, 0 = screen right,
        // 90 = screen up (away from the camera). Framing stays predictable
        // whatever the camera yaw is.
        spawnScreen: (types, { dist = 5, from = -30, to = 30, jitter = 0.8, hpMult = 1 } = {}) => page.evaluate(([list, d, a0, a1, j, mult]) => {
            const game = window.game;
            const p = game.player.position;
            const right = game.cameraPlanarRight;
            const fwd = game.cameraPlanarForward;
            const out = [];
            list.forEach((type, i) => {
                const deg = list.length === 1 ? (a0 + a1) / 2 : a0 + (i / (list.length - 1)) * (a1 - a0);
                const a = deg * Math.PI / 180;
                const r = d + (i % 2) * j;
                const sx = Math.cos(a) * r;
                const sy = Math.sin(a) * r;
                const x = p.x + right.x * sx + fwd.x * sy;
                const z = p.z + right.y * sx + fwd.y * sy;
                const sprite = game.spawnEnemyInstance(type, x, z);
                if (!sprite) return;
                if (mult !== 1 && Number.isFinite(sprite.userData.hp)) {
                    sprite.userData.hp = Math.ceil(sprite.userData.hp * mult);
                    sprite.userData.maxHp = Math.max(sprite.userData.maxHp ?? 0, sprite.userData.hp);
                }
                out.push(type);
            });
            return out.length;
        }, [types, dist, from, to, jitter, hpMult]),
        // Screen-relative world point (same convention as spawnScreen).
        screenOffset: (dx, dy) => page.evaluate(([sx, sy]) => {
            const game = window.game;
            const p = game.player.position;
            const right = game.cameraPlanarRight;
            const fwd = game.cameraPlanarForward;
            return { x: p.x + right.x * sx + fwd.x * sy, z: p.z + right.y * sx + fwd.y * sy };
        }, [dx, dy]),
        // Enemy screen points in CSS px through the live camera, nearest first.
        enemyPoints: () => page.evaluate(() => {
            const game = window.game;
            const rect = game.renderer.domElement.getBoundingClientRect();
            const p0 = game.player.position;
            const out = [];
            for (const sprite of game.scatterSprites ?? []) {
                const u = sprite.userData;
                // Live enemies draw through their 3D visual; the sprite itself is hidden.
                if (!u?.isEnemy || u.dead || u.burstTriggered || u.isDisplayModel || !(u.hp > 0)) continue;
                const p = sprite.position.clone().project(game.camera);
                if (Math.abs(p.x) > 0.95 || Math.abs(p.y) > 0.95) continue;
                out.push({
                    x: rect.left + (p.x + 1) / 2 * rect.width,
                    y: rect.top + (1 - p.y) / 2 * rect.height,
                    d: Math.hypot(sprite.position.x - p0.x, sprite.position.z - p0.z)
                });
            }
            return out.sort((a, b) => a.d - b.d);
        }),
        playerPoint: () => page.evaluate(() => {
            const game = window.game;
            const rect = game.renderer.domElement.getBoundingClientRect();
            const p = game.player.position.clone().project(game.camera);
            return { x: rect.left + (p.x + 1) / 2 * rect.width, y: rect.top + (1 - p.y) / 2 * rect.height };
        })
    };
    return api;
}

// Capture one take. `onFrame(frame, api)` runs before each step and drives
// input; `probe` (optional, in-page fn) returns per-frame state for the log.
export async function captureShot(page, {
    id,
    fps = 60,
    seconds = 3,
    outDir = path.join(RAW_ROOT, id),
    onFrame = null,
    probe = null,
    seed = null
}) {
    fs.mkdirSync(outDir, { recursive: true });
    const frames = Math.round(seconds * fps);
    const clip = await captureClip(page);
    const file = path.join(outDir, `${id}.mkv`);
    const encoder = startEncoder(file, fps);
    const api = shotApi(page);
    const perFrame = [];
    const timing = { input: 0, step: 0, shot: 0, write: 0 };
    await page.evaluate((s) => window.__hbVClock.startVirtual(s), seed);
    try {
        for (let frame = 0; frame < frames; frame += 1) {
            let t0 = performance.now();
            if (onFrame) await onFrame(frame, api);
            let t1 = performance.now();
            timing.input += t1 - t0;
            const state = await page.evaluate(([dt, probeSrc]) => {
                const ms = window.__hbVClock.step(dt);
                // eslint-disable-next-line no-new-func
                const extra = probeSrc ? new Function(`return (${probeSrc})()`)() : null;
                return { ms, extra };
            }, [1000 / fps, probe ? String(probe) : null]);
            t0 = performance.now();
            timing.step += t0 - t1;
            const png = await page.screenshot({ clip, type: 'png', animations: 'allow', caret: 'initial', scale: 'device' });
            t1 = performance.now();
            timing.shot += t1 - t0;
            await encoder.write(png);
            timing.write += performance.now() - t1;
            perFrame.push(state);
        }
    } finally {
        await page.evaluate(() => window.__hbVClock.stopVirtual()).catch(() => {});
        await encoder.end();
    }
    const events = await page.evaluate(() => window.__hbVClock.events.slice());
    const meta = {
        id, fps, frames, seconds, clip,
        capturedAt: new Date().toISOString(),
        msPerFrame: Object.fromEntries(Object.entries(timing).map(([k, v]) => [k, Math.round(v / frames)]))
    };
    fs.writeFileSync(path.join(outDir, `${id}.events.json`), JSON.stringify(events, null, 1));
    fs.writeFileSync(path.join(outDir, `${id}.meta.json`), JSON.stringify({ ...meta, perFrame }, null, 1));
    return { file, meta, events, perFrame };
}
