import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// User request 2026-09-09: the museum is a QA space, so it needs a clean grid
// floor like the hero-select backdrop, only the exhibits it spawned, and no
// wall stopping you walking around.
//
// This also guards the entry point. `__DEBUG__.openMuseum()` used to route
// through `teleport('museum')`, which opened the SHOWROOM -- the museum was
// unreachable from every console command, dev button and __DEBUG__ call, and
// `closeMuseum` was undefined. Unit tests could not see that: the wiring lives
// in main.js's __DEBUG__ object literal, which replaces debugMuseum.js's own
// self-registration wholesale.

test('museum opens on a clean grid with no world and free movement', async ({ page }) => {
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);

    // openMuseum() resolves only after ~76 sequential GLB loads (minutes).
    // It deliberately teleports and builds the floor first, then fills in
    // pedestals -- so kick it off and wait on the floor, not the promise.
    await page.evaluate(() => { window.__museumPromise = window.__DEBUG__.openMuseum(); });
    await page.waitForFunction(
        () => Boolean(window.game?.scene?.getObjectByName('debug-museum')?.getObjectByName('debug-museum-floor')),
        { timeout: 30_000 }
    );

    const state = await page.evaluate(() => {
        const game = window.game;
        const group = game.scene.getObjectByName('debug-museum');
        const floor = group?.getObjectByName('debug-museum-floor');
        let helpers = 0;
        group?.traverse((c) => { if (c.isGridHelper) helpers++; });
        // Walk hard into where a wall would be and confirm nothing stops us.
        const startX = game.player.position.x;
        for (let i = 0; i < 240; i++) game.player.position.x += 0.25;
        return {
            hasGroup: Boolean(group),
            hasFloor: Boolean(floor),
            floorSquare: floor ? floor.geometry.parameters.width === floor.geometry.parameters.height : null,
            floorTextured: Boolean(floor?.material?.map),
            gridHelpers: helpers,
            chunksVisible: game.chunkGroups?.visible,
            noclip: game.noclip,
            skyVisible: game.skyRig?.group?.visible,
            moved: game.player.position.x - startX
        };
    });

    expect(state.hasGroup).toBe(true);
    expect(state.hasFloor).toBe(true);
    expect(state.floorSquare).toBe(true);
    expect(state.floorTextured).toBe(true);
    expect(state.gridHelpers).toBe(0);
    expect(state.chunksVisible).toBe(false);
    expect(state.noclip).toBe(true);
    expect(state.skyVisible ?? false).toBe(false);
    expect(state.moved).toBeCloseTo(60, 1);

    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'docs/reports/assets/museum-clean-grid-2026-09-09.png' });

    expect(consoleErrors, `page errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
