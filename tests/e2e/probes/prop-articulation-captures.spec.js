import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Articulated props (src/propArticulation.js): spawns each rig beside the
// player, captures it at rest, presses E through the prop experience, and
// captures it open / working.
//   HB_PROBES=1 ARTIC_SHOTS_DIR=/tmp/shots npx playwright test -c <gpu config> \
//     tests/e2e/probes/prop-articulation-captures.spec.js
const RIGS = ['life_ribcage_rescue_cabinet', 'life_confessional', 'life_seismic_drill', 'life_ice_bore_winch', 'life_supply_drop_pod'];

test('articulated props: rest and active captures', async ({ page }) => {
    test.setTimeout(240_000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.setViewportSize({ width: 1600, height: 900 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForFunction(() => window.game?.performanceProfile === 'gameplay', null, { timeout: 30_000 });
    const dir = process.env.ARTIC_SHOTS_DIR;
    if (dir) fs.mkdirSync(dir, { recursive: true });

    // Open ground on the pinned map, so each rig stands clear.
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

    const placed = await page.evaluate(async (rigs) => {
        const game = window.game;
        const { createWorld3dModel } = await import('/src/world3dOverlay.js');
        const origin = game.player.position.clone();
        const roots = [];
        for (const [index, type] of rigs.entries()) {
            const root = await createWorld3dModel(type);
            root.position.set(origin.x - 7.2 + index * 3.6, 0, origin.z + 2);
            game.scene.add(root);
            game.registerWorld3dPropExperience(root);
            roots.push(root);
        }
        window.__articRoots = roots;
        return roots.map((root) => ({
            type: root.userData.modelType,
            parts: root.userData.propExperience?.articulation?.parts.length ?? 0,
            state: root.userData.propExperience?.state
        }));
    }, RIGS);
    console.log(JSON.stringify(placed));
    expect(placed.every((rig) => rig.parts > 0)).toBe(true);

    const hideHud = () => page.evaluate(() => {
        for (const id of ['ui', 'tilt-shift-overlay', 'damage-vignette', 'cinematic-overlay']) {
            const element = document.getElementById(id);
            if (element) element.style.visibility = 'hidden';
        }
    });
    await page.waitForTimeout(1500);
    await hideHud();
    const shoot = async (label) => {
        if (!dir) return;
        await page.screenshot({ path: path.join(dir, `${label}.png`) });
        for (const [index, type] of RIGS.entries()) {
            const box = await page.evaluate((i) => {
                const game = window.game;
                const root = window.__articRoots[i];
                const centre = root.position.clone().setY(1.0).project(game.camera);
                return { x: (centre.x + 1) / 2 * innerWidth, y: (1 - centre.y) / 2 * innerHeight };
            }, index);
            await page.screenshot({
                path: path.join(dir, `${label}-${type}.png`),
                clip: { x: Math.max(0, box.x - 190), y: Math.max(0, box.y - 190), width: 380, height: 380 }
            });
        }
    };
    await shoot('rest');
    const pressed = await page.evaluate(() => window.__articRoots.map((root) => root.userData.propExperience.acknowledge()));
    expect(pressed.every(Boolean)).toBe(true);
    await page.waitForTimeout(1800);
    await hideHud();
    await shoot('active');
    const states = await page.evaluate(() => window.__articRoots.map((root) => root.userData.propExperience.state));
    console.log(JSON.stringify(states));
    expect(states).toEqual(['open', 'open', 'working', 'working', 'open']);
    expect(errors).toEqual([]);
});
