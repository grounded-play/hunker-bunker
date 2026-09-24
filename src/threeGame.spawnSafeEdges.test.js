import { describe, expect, it } from 'vitest';
import { SPAWN_SAFE_EDGE_RADIUS, ThreeGame } from './threeGame.js';

// 2026-09-24 Deck + PC co-op QA: all three co-op deaths were a walk off an
// unguarded cliff about 15 tiles from the start room (x = 2, z <= -1 in the
// spawn chunk). Near spawn a lethal edge now blocks movement instead.

function game({ spawn = { x: 7, y: 12 }, profile = 'gameplay', inPocket = false } = {}) {
    const g = {
        performanceProfile: profile,
        isInPocket: inPocket,
        playerType: 'TANK',
        currentDepthTier: 0,
        getSpawnTile: () => spawn,
        isHoleBridged: () => false,
        // A cliff column at x = 2 for z <= -1, and far away at x = 102.
        getHoleVisualInfo: (x, z) => ((x === 2 || x === 102) && z <= -1
            ? { x, z, lethal: true, fallRadius: 0.52, cliff: true }
            : null)
    };
    for (const method of ['isInSpawnSafeZone', 'blocksSpawnSafeEdge', 'isPlayerOverAnyHole']) g[method] = ThreeGame.prototype[method];
    return g;
}

describe('lethal edges near spawn block instead of kill', () => {
    it('stops the player at the cliff beside the start corridor', () => {
        const g = game();
        expect(g.blocksSpawnSafeEdge(2.3, -2)).toBe(true);
        expect(g.blocksSpawnSafeEdge(3.5, -2)).toBe(false);
        expect(g.isPlayerOverAnyHole(2.1, -2)).toBe(false);
    });

    it('keeps cliffs lethal outside the safe zone', () => {
        const g = game();
        expect(Math.hypot(102 - 7, -2 - 12)).toBeGreaterThan(SPAWN_SAFE_EDGE_RADIUS);
        expect(g.blocksSpawnSafeEdge(102.1, -2)).toBe(false);
        expect(g.isPlayerOverAnyHole(102.1, -2)).toBe(true);
    });

    it('does not apply in menus or pocket worlds', () => {
        expect(game({ profile: 'menu' }).blocksSpawnSafeEdge(2.3, -2)).toBe(false);
        expect(game({ inPocket: true }).blocksSpawnSafeEdge(2.3, -2)).toBe(false);
    });
});
