import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Spline conduits (wires, veins, coolant pipes, vines): finds cuttable runs on
// the pinned map, captures one per area, cuts it through breakScatterProp and
// captures the severed halves.
//   HB_PROBES=1 SPLINE_SHOTS_DIR=/tmp/shots npx playwright test -c <gpu config> tests/e2e/probes/spline-captures.spec.js
test('spline conduits: per-area textures and severing', async ({ page }) => {
    test.setTimeout(300_000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => {
        if (/Shader Error|WebGLProgram|Spline conduit textures failed/i.test(message.text())) errors.push(message.text().slice(0, 300));
    });
    await page.setViewportSize({ width: 1600, height: 900 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForFunction(() => window.game?.performanceProfile === 'gameplay', null, { timeout: 30_000 });
    await page.evaluate(() => {
        const game = window.game;
        game.fixedRunEntropy = true;
        game.globalSeedOffset = 424242;
        game.respawnPlayer();
        game.setGodMode?.(true);
    });
    await page.waitForTimeout(3000);
    const runs = await page.evaluate(() => {
        const game = window.game;
        for (let cy = -3; cy <= 3; cy += 1) {
            for (let cx = -3; cx <= 3; cx += 1) {
                game.getOrCreateChunk(cx, cy);
                if (!game.chunkMeshes.has(`${cx},${cy}`)) game.mountChunk(cx, cy);
            }
        }
        const byKind = {};
        for (const sprite of game.scatterSprites) {
            const item = sprite.userData?.splineItem;
            if (!sprite.userData?.isCuttableSpline || !item) continue;
            const kind = item.layerKind ?? 'wire';
            (byKind[kind] ??= []).push({ id: item.id, x: sprite.position.x, z: sprite.position.z });
        }
        return Object.fromEntries(Object.entries(byKind).map(([kind, list]) => [kind, { count: list.length, first: list[0] }]));
    });
    console.log(JSON.stringify(runs));
    expect(Object.keys(runs).length).toBeGreaterThan(0);
    const dir = process.env.SPLINE_SHOTS_DIR;
    if (dir) fs.mkdirSync(dir, { recursive: true });
    const hideHud = () => page.evaluate(() => {
        for (const id of ['ui', 'tilt-shift-overlay', 'damage-vignette', 'cinematic-overlay']) {
            const element = document.getElementById(id);
            if (element) element.style.visibility = 'hidden';
        }
    });
    for (const [kind, { first }] of Object.entries(runs)) {
        await page.evaluate(({ x, z }) => {
            window.game.teleportPlayerTo(x + 1.5, z + 1.5, { safeFloor: false });
            window.game.snapCameraToPlayer?.();
        }, first);
        await page.waitForTimeout(2500);
        await hideHud();
        if (dir) await page.screenshot({ path: path.join(dir, `${kind}-intact.png`) });
        const cut = await page.evaluate((id) => {
            const game = window.game;
            const sprite = game.scatterSprites.find((s) => s.userData?.splineItem?.id === id);
            game.breakScatterProp(sprite);
            return game.scene.getObjectByName(`severed-spline-${id}`) ? 'severed' : 'missing';
        }, first.id);
        expect(cut, kind).toBe('severed');
        await page.waitForTimeout(1200);
        await hideHud();
        if (dir) await page.screenshot({ path: path.join(dir, `${kind}-cut.png`) });
    }
    // Hanging spans sway: some vertices carry weight, and the shared clock runs.
    const sway = await page.evaluate(async () => {
        const uniforms = (await import('/src/splineDressingRenderer.js')).getSplineMaterial().userData.splineUniforms;
        let swaying = 0;
        let freest = null;
        window.game.scene.traverse((object) => {
            const weights = object.isMesh && object.userData?.isSplineDressing ? object.geometry?.getAttribute('splineSway') : null;
            if (!weights) return;
            const positions = object.geometry.getAttribute('position');
            for (let i = 0; i < weights.count; i += 1) {
                if (weights.array[i] <= 0) continue;
                swaying += 1;
                if (!freest || weights.array[i] > freest.weight) freest = { weight: weights.array[i], x: positions.getX(i), z: positions.getZ(i) };
            }
        });
        const before = uniforms.uSplineTime.value;
        await new Promise((resolve) => { setTimeout(resolve, 1000); });
        return { swaying, freest, advanced: uniforms.uSplineTime.value - before };
    });
    console.log('sway', JSON.stringify(sway));
    expect(sway.swaying).toBeGreaterThan(0);
    expect(sway.advanced).toBeGreaterThan(0.5);
    if (dir && sway.freest) {
        await page.evaluate(({ x, z }) => {
            window.game.teleportPlayerTo(x + 1.5, z + 1.5, { safeFloor: false });
            window.game.snapCameraToPlayer?.();
        }, sway.freest);
        await page.waitForTimeout(2500);
        await hideHud();
        await page.screenshot({ path: path.join(dir, 'sway-a.png') });
        await page.waitForTimeout(1400);
        await page.screenshot({ path: path.join(dir, 'sway-b.png') });
    }
    const ready = await page.evaluate(async () => (await import('/src/splineDressingRenderer.js')).getSplineMaterial().userData.splineUniforms.uSplineReady.value);
    expect(ready).toBe(1);
    expect(errors).toEqual([]);
});
