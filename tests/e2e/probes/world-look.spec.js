import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// World-look A/B for the N64 world pass (docs/planning/
// n64-architectural-level-design-overhaul-2026-10-10.md §9.3): the same spots
// in one run, with the lane B wall work on and then off (hb_wall_autotile,
// flipped live: walk 3 km away so the chunks unload, flip, walk back so they
// remount). Per spot it saves the gameplay frame and a closer aerial, counts
// the wall pools and corner-cut walls in view, and fails on any shader error.
//   HB_PROBES=1 WORLD_LOOK_OUT=/tmp/look npx playwright test -c <gpu config> tests/e2e/probes/world-look.spec.js
// WORLD_LOOK_PERF=1 also measures draw calls, triangles and frame time per
// spot over 30 frames, shaders warmed first (headless frame time is only good
// for comparing the two passes of one run).
const OUT = process.env.WORLD_LOOK_OUT ?? 'playwright-report/world-look';
const PERF = process.env.WORLD_LOOK_PERF === '1';
// Bunker, cryo and bio: the ship sits near the origin, cryo starts ~60 m out, bio ~140 m.
const SPOTS = [[12, 0], [-20, 10], [40, 40], [-45, -10], [0, -60], [90, 10], [175, 0], [-130, 130]];

test.setTimeout(1_800_000);
test('world look: lane B walls on and off', async ({ page }) => {
    fs.mkdirSync(OUT, { recursive: true });
    const shaderErrors = [];
    page.on('console', (message) => {
        const text = message.text();
        if (/shader|WebGLProgram|GL_INVALID/i.test(text) && !/KHR_parallel_shader_compile/.test(text)) shaderErrors.push(text.slice(0, 400));
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForFunction(() => window.game?.performanceProfile === 'gameplay', null, { timeout: 60_000 });
    await page.evaluate(() => {
        const game = window.game;
        game.setGodMode?.(true);
        game.setNoclip?.(true, 1);
        game.enemiesFrozen = true;
    });

    const visit = async ([x, z]) => {
        await page.evaluate(([wx, wz]) => window.game.teleportPlayerTo(wx, wz, { safeFloor: true }), [x, z]);
        await page.waitForTimeout(3500);
    };
    const census = () => page.evaluate(() => {
        const game = window.game;
        let pools = 0;
        const walls = { square: 0, cut: 0, box: 0 };
        for (const group of game.chunkMeshes.values()) {
            if (!group.visible) continue;
            group.traverse((object) => {
                if (!object.userData?.isInstancedWallPool) return;
                pools += 1;
                const masks = object.geometry.getAttribute('hbCornerCut');
                if (!masks) {
                    walls.box += object.count;
                    return;
                }
                for (let i = 0; i < object.count; i += 1) walls[masks.getX(i) > 16.5 ? 'cut' : 'square'] += 1;
            });
        }
        // Chasm landmarks (lane F) the camera actually frames: the base or a
        // point 6 m up lands on screen.
        const camera = game.camera;
        camera.updateMatrixWorld();
        const Vector3 = camera.position.constructor;
        const onScreen = (x, y, z) => {
            const point = new Vector3(x, y, z).project(camera);
            return Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && point.z < 1;
        };
        let landmarksInView = 0;
        for (const group of game.chunkMeshes.values()) {
            if (!group.visible) continue;
            group.traverse((object) => {
                for (const { x, z } of object.userData?.isChasmLandmark ? object.userData.sites : []) {
                    if (onScreen(x, 0, z) || onScreen(x, 6, z)) landmarksInView += 1;
                }
            });
        }
        return { pools, walls, landmarksInView };
    });
    const aerial = () => page.evaluate(() => {
        const game = window.game;
        const camera = game.camera.clone();
        const p = game.player.position;
        camera.position.set(p.x - 9, 13, p.z + 11);
        camera.lookAt(p.x, 0.5, p.z);
        camera.updateProjectionMatrix();
        // The frame loop leaves its post-processing target bound.
        const previous = game.renderer.getRenderTarget();
        game.renderer.setRenderTarget(null);
        game.renderer.render(game.scene, camera);
        const url = game.renderer.domElement.toDataURL('image/png');
        game.renderer.setRenderTarget(previous);
        return url;
    });
    const measure = () => page.evaluate(async () => {
        const info = window.game.renderer.info;
        const frames = 30;
        let calls = 0;
        let triangles = 0;
        const started = performance.now();
        for (let frame = 0; frame < frames; frame += 1) {
            info.autoReset = false;
            info.reset();
            await new Promise((resolve) => requestAnimationFrame(() => resolve()));
            calls += info.render.calls;
            triangles += info.render.triangles;
        }
        info.autoReset = true;
        return {
            calls: Math.round(calls / frames),
            triangles: Math.round(triangles / frames),
            frameMs: Math.round(((performance.now() - started) / frames) * 10) / 10
        };
    });
    const pass = async (label) => {
        const rows = [];
        for (const [index, spot] of SPOTS.entries()) {
            await visit(spot);
            const name = `${String(index).padStart(2, '0')}-${label}`;
            await page.screenshot({ path: path.join(OUT, `${name}.png`) });
            const url = await aerial();
            fs.writeFileSync(path.join(OUT, `${name}-close.png`), Buffer.from(url.split(',')[1], 'base64'));
            rows.push({ spot, ...(await census()), ...(PERF ? await measure() : {}) });
        }
        return rows;
    };
    const flip = async (enabled) => {
        await page.evaluate(() => window.game.teleportPlayerTo(3000, 3000, { safeFloor: false }));
        await page.waitForTimeout(8000);
        await page.evaluate((value) => { window.game.wallAutotileEnabled = value; }, enabled);
    };

    if (PERF) await pass('warm');
    const on = await pass('on');
    await flip(false);
    const off = await pass('off');
    fs.writeFileSync(path.join(OUT, 'world-look.json'), JSON.stringify({ on, off, shaderErrors }, null, 1));

    expect(shaderErrors).toEqual([]);
    // Corner cuts ride on the same pools: the wall work adds none.
    for (const [index, row] of on.entries()) expect(row.pools).toBeLessThanOrEqual(off[index].pools + 2);
    expect(on.some((row) => row.walls.cut > 0)).toBe(true);
    expect(off.every((row) => row.walls.cut === 0 && row.walls.square === 0)).toBe(true);
});
