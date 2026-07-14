import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

// widenChunkCorridors only reads this.chunkSize, so it's callable on a bare
// object without constructing a full ThreeGame (which needs a DOM container
// and a real Three.js/WebGL context).
function widen(grid) {
    ThreeGame.prototype.widenChunkCorridors.call({ chunkSize: grid.length }, grid);
    return grid;
}

function gridFromRows(rows) {
    return rows.map((row) => row.split(''));
}

describe('widenChunkCorridors', () => {
    it('opens a true dead-end alcove (exactly one open neighbor) instead of leaving it a 1-wide nub', () => {
        // Row 3 is a straight corridor; (4,5) is a dead-end nub hanging off (3,5)
        // with no other open neighbor — reward caches are placed on exactly
        // this class of cell (ROOM_TYPES.DEAD_END).
        const grid = gridFromRows([
            '#######',
            '#######',
            '#######',
            '#.....#',
            '#####.#',
            '#######',
            '#######'
        ]);

        widen(grid);

        // The nub's perpendicular neighbors must open up so the alcove reads
        // as a small pocket, not a slot exactly one player-width wide.
        expect(grid[4][4]).toBe('.');
        expect(grid[4][6]).toBe('.');
    });

    it('still widens ordinary corners and straight-throughs as before', () => {
        const grid = gridFromRows([
            '#######',
            '#######',
            '#.#####',
            '#.....#',
            '#######',
            '#######',
            '#######'
        ]);

        widen(grid);

        // The corner at (3,1) has both a right neighbor and an up neighbor
        // open, so the existing corner-widen rule should still fire.
        expect(grid[2][2]).toBe('.');
        expect(grid[4][1]).toBe('.');
    });
});
