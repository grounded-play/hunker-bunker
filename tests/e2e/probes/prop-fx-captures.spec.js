import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Prop effects (src/propFx.js): spawns props with looping steam, light, fire,
// sparks or spores on open ground, captures them running, switches them off
// through the same API the E switch uses, and captures them again.
//   HB_PROBES=1 FX_SHOTS_DIR=/tmp/shots npx playwright test -c <gpu config> tests/e2e/probes/prop-fx-captures.spec.js
const PROPS = (process.env.FX_PROPS || [
    'life_seismic_drill', 'life_meat_smoking_rack', 'life_welding_station', 'life_ice_core_rack',
    'life_devotion_tree', 'life_wind_mast', 'life_supply_drop_pod', 'life_pipeline_trestle'
].join(',')).split(',');

test('prop effects: running and switched off', async ({ page }) => {
    test.setTimeout(240_000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
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
    await page.evaluate(() => {
        window.game.teleportPlayerTo(18, 10, { safeFloor: false });
        window.game.snapCameraToPlayer?.();
    });
    await page.waitForTimeout(2000);
    const placed = await page.evaluate(async (types) => {
        const game = window.game;
        const { createWorld3dModel } = await import('/src/world3dOverlay.js');
        const origin = game.player.position.clone();
        window.__fxRoots = [];
        for (const [index, type] of types.entries()) {
            const root = await createWorld3dModel(type);
            root.position.set(origin.x + 2 + (index % 4) * 3.2, 0, origin.z - 3.5 + Math.floor(index / 4) * 3.2);
            game.scene.add(root);
            game.registerWorld3dPropFx(root);
            window.__fxRoots.push(root);
        }
        return window.__fxRoots.map((root) => ({ type: root.userData.modelType, fx: Boolean(root.userData.propFx), lights: root.userData.propFx?.lightSources.length ?? 0 }));
    }, PROPS);
    console.log(JSON.stringify(placed));
    expect(placed.every((entry) => entry.fx)).toBe(true);
    const dir = process.env.FX_SHOTS_DIR;
    if (dir) fs.mkdirSync(dir, { recursive: true });
    const hideHud = () => page.evaluate(() => {
        for (const id of ['ui', 'tilt-shift-overlay', 'damage-vignette', 'cinematic-overlay']) {
            const element = document.getElementById(id);
            if (element) element.style.visibility = 'hidden';
        }
    });
    await page.waitForTimeout(2500);
    await hideHud();
    const shoot = async (label) => {
        if (!dir) return;
        await page.screenshot({ path: path.join(dir, `${label}.png`) });
        for (const [index, type] of PROPS.entries()) {
            const box = await page.evaluate((i) => {
                const root = window.__fxRoots[i];
                const centre = root.position.clone().setY(0.9).project(window.game.camera);
                return { x: (centre.x + 1) / 2 * innerWidth, y: (1 - centre.y) / 2 * innerHeight };
            }, index);
            if (box.x < 160 || box.y < 160 || box.x > 1440 || box.y > 740) continue;
            await page.screenshot({ path: path.join(dir, `${label}-${type}.png`), clip: { x: box.x - 160, y: box.y - 160, width: 320, height: 320 } });
        }
    };
    await shoot('fx-on');
    await page.evaluate(() => window.__fxRoots.forEach((root) => root.userData.propFx.setEnabled(false)));
    await page.waitForTimeout(800);
    await hideHud();
    await shoot('fx-off');
    expect(errors).toEqual([]);
});
