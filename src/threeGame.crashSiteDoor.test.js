import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

function makeFakeGame() {
    return {
        performanceProfile: 'gameplay',
        chunkSize: 19,
        chunkCellCount: 9,
        getSpawnTile: ThreeGame.prototype.getSpawnTile
    };
}

describe('clearSpawnArea — door/portal alignment', () => {
    it('authors one circular room with its only exit centered on the north/top wall', () => {
        const game = makeFakeGame();
        const grid = Array(19).fill(null).map(() => Array(19).fill('.'));
        ThreeGame.prototype.clearSpawnArea.call(game, grid, 0, 0);

        expect(grid[0].slice(8, 11)).toEqual(['.', '.', '.']);
        for (let x = 0; x < 19; x += 1) {
            if (x >= 8 && x <= 10) continue;
            expect(grid[0][x], `north edge x=${x}`).toBe('#');
        }
        expect(grid[9][9]).toBe('.');
        expect(grid[1][1]).toBe('#');
        expect(grid[17][17]).toBe('#');
        expect(grid[18].every((cell) => cell === '#')).toBe(true);
        expect(grid.every((row) => row[0] === '#')).toBe(true);
        expect(grid.every((row) => row[18] === '#')).toBe(true);
    });

    it('forces the shared north edge portal to the authored hallway center', () => {
        const game = {
            chunkCellCount: 9,
            hashTile: () => 99
        };
        expect(ThreeGame.prototype.getEdgeOpening.call(game, 'horizontal', 0, 0)).toEqual({
            open: true,
            offset: 4
        });
    });
});
