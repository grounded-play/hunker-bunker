import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

function makeFakeGame(edgeOpening) {
    return {
        performanceProfile: 'gameplay',
        chunkSize: 19,
        chunkCellCount: 9,
        getSpawnTile: ThreeGame.prototype.getSpawnTile,
        getEdgeOpening: () => edgeOpening
    };
}

describe('clearSpawnArea — door/portal alignment', () => {
    // Covers every possible offset getEdgeOpening can produce
    // (offset = hash % chunkCellCount, chunkCellCount = 9), directly
    // stubbed rather than relying on incidental hash distribution — the
    // real bug (localX 4..13 hardcoded, but portalX = offset*2+1 ranges
    // over 1,3,...,17) needs offset 0, 1, 7, or 8 to reproduce, which a
    // small sample of real hash outputs isn't guaranteed to hit.
    it('the carved south doorway always contains the real south portal column, for every possible offset', () => {
        for (let offset = 0; offset < 9; offset += 1) {
            const game = makeFakeGame({ open: true, offset });
            const grid = Array(19).fill(null).map(() => Array(19).fill('#'));
            ThreeGame.prototype.clearSpawnArea.call(game, grid, 0, 0);

            const portalX = offset * 2 + 1;
            expect(grid[18][portalX], `offset ${offset}`).toBe('.');
        }
    });

    it('falls back to the chunk center column when the south edge is closed', () => {
        const game = makeFakeGame({ open: false, offset: 0 });
        const grid = Array(19).fill(null).map(() => Array(19).fill('#'));
        ThreeGame.prototype.clearSpawnArea.call(game, grid, 0, 0);

        const centerX = Math.floor(game.chunkCellCount / 2) * 2 + 1;
        expect(grid[18][centerX]).toBe('.');
    });
});
