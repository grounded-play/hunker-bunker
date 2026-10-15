import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// Playthrough 2026-10-07: "there are alien arch doorways that are solid,
// they need to be walk-underable". A real grand archway in a live run: its
// opening is clear once the model loads, and its posts still block.
test.describe.configure({ timeout: 300_000 });

for (const type of ['arch_deco_archway_grand_01', 'arch_bulkhead_frame', 'hive_tendril_arch']) test(`the opening of ${type} is walkable, its posts are not`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    const placed = await page.evaluate(async (archType) => {
        const g = window.game;
        const x = Math.round(g.player.position.x) + 0.5;
        const z = Math.round(g.player.position.z) + 3;
        const arch = g.createScatterInstance({ type: archType, x, z, scale: 1, tiltX: 0, elevation: 0, rotation: 0, scatterKey: `test:${archType}` });
        if (!arch) return { created: false };
        // Keep the probe independent of which edge chunks happened to finish
        // mounting during deployment. A live scene parent matches the setup
        // contract supplied by a mounted chunk in normal play.
        g.scene.add(arch);
        await g.setupWorld3dReplacement(arch, archType);
        await new Promise((resolve) => setTimeout(resolve, 500));
        // Isolate the arch contract from unrelated room walls and props. The
        // production model still supplies the measured post bounds.
        g.scatterSprites = [arch];
        g.getTileType = () => '.';
        g.getCachedTileType = () => '.';
        g.isHoleTile = () => false;
        const posts = arch.userData.pillarColliders ?? null;
        return {
            created: true,
            solid: Boolean(arch.userData.isSolidProp),
            posts,
            openingWalkable: g.canOccupyPosition(x, z),
            postWalkable: posts?.length ? g.canOccupyPosition(posts[0].x, posts[0].z) : null
        };
    }, type);
    expect(placed.created).toBe(true);
    expect(placed.solid).toBe(true);
    expect(placed.posts).toHaveLength(2);
    expect(placed.openingWalkable).toBe(true);
    expect(placed.postWalkable).toBe(false);
});
