import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('world polish', () => {
    it('keeps biomechanical doors attached to structural wall jambs', () => {
        const grid = Array.from({ length: 7 }, () => Array(7).fill('.'));
        grid[3][3] = 'D';
        grid[3][1] = '#';
        grid[3][5] = '#';

        ThreeGame.prototype.clearDoorways.call({}, grid);

        expect(grid[3][2]).toBe('#');
        expect(grid[3][4]).toBe('#');
        expect(grid[2][3]).toBe('.');
        expect(grid[4][3]).toBe('.');
    });

    it('does not rebuild visible chunk registries on stationary frames', () => {
        const game = {
            isInPocket: false,
            player: { position: { x: 10, z: 10 } },
            chunkSize: 19,
            visibleChunkRadius: 1,
            _lastChunkVisibilityKey: '0,0:1',
            pendingChunkMounts: [],
            updateDepthTierProgress: vi.fn()
        };

        ThreeGame.prototype.syncVisibleChunks.call(game);

        expect(game.updateDepthTierProgress).not.toHaveBeenCalled();
    });

    it('places doors at narrow room thresholds without opening the surrounding walls', () => {
        const grid = Array.from({ length: 9 }, () => Array(9).fill('#'));
        for (let y = 1; y < 8; y += 1) grid[y][4] = '.';
        const game = { getDepthTier: () => 2 };

        ThreeGame.prototype.addRoomThresholdDoors.call(game, grid, () => 0, 1, 2);

        expect(grid.some((row) => row.includes('D'))).toBe(true);
        expect(grid[4][3]).toBe('#');
        expect(grid[4][5]).toBe('#');
    });
});
