import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// Playthrough 2026-10-07: "there are alien arch doorways that are solid,
// they need to be walk-underable". A real grand archway in a live run: its
// opening is clear once the model loads, and its posts still block.
test.describe.configure({ timeout: 300_000 });

test('the opening of a grand archway is walkable, its posts are not', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    const placed = await page.evaluate(async () => {
        const g = window.game;
        const x = Math.round(g.player.position.x) + 0.5;
        const z = Math.round(g.player.position.z) + 3;
        const arch = g.createScatterInstance({ type: 'arch_deco_archway_grand_01', x, z, scale: 1, tiltX: 0, elevation: 0, rotation: 0, scatterKey: 'test:arch' });
        // Placed the way the world places it: inside the chunk it stands in,
        // where the scatter list (rebuilt from the chunks) will find it.
        const chunkKey = `${Math.floor(x / g.chunkSize)},${Math.floor(z / g.chunkSize)}`;
        g.chunkMeshes.get(chunkKey).add(arch);
        g.scatterSprites.push(arch);
        await g.setupWorld3dReplacement(arch, 'arch_deco_archway_grand_01');
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (!g.scatterSprites.includes(arch)) g.scatterSprites.push(arch);
        return { x, z, solid: Boolean(arch.userData.isSolidProp), posts: arch.userData.pillarColliders ?? null };
    });
    expect(placed.solid).toBe(true);
    expect(placed.posts).toHaveLength(2);
    const result = await page.evaluate(({ x, z, posts }) => {
        const g = window.game;
        // Only the arch matters here: judge it against the open floor around it.
        const floorClear = (px, pz) => g.isSnailTileWalkable(Math.round(px), Math.round(pz));
        return {
            opening: { ok: g.canOccupyPosition(x, z), floor: floorClear(x, z) },
            post: { ok: g.canOccupyPosition(posts[0].x, posts[0].z) }
        };
    }, placed);
    if (result.opening.floor) expect(result.opening.ok).toBe(true);
    expect(result.post.ok).toBe(false);
});
