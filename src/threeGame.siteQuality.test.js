import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { LANDFORMS } from './landforms.js';

function makeFakeGame({ landform, roomTypes }) {
    return {
        chunkSize: 19,
        getChunkLandform: () => landform,
        getRoomTypeGrid: () => roomTypes
    };
}

describe('isGoodSitePosition', () => {
    it('accepts any position in a CRATER chunk', () => {
        const game = makeFakeGame({ landform: LANDFORMS.CRATER, roomTypes: null });
        expect(ThreeGame.prototype.isGoodSitePosition.call(game, 5, 5)).toBe(true);
    });

    it('accepts any position in a FIELD chunk', () => {
        const game = makeFakeGame({ landform: LANDFORMS.FIELD, roomTypes: null });
        expect(ThreeGame.prototype.isGoodSitePosition.call(game, 5, 5)).toBe(true);
    });

    it('rejects a RUINS chunk regardless of room classification', () => {
        const game = makeFakeGame({ landform: LANDFORMS.RUINS, roomTypes: null });
        expect(ThreeGame.prototype.isGoodSitePosition.call(game, 5, 5)).toBe(false);
    });

    it('accepts a MAZE chunk position that lands on a chamber cell', () => {
        const roomTypes = Array.from({ length: 19 }, () => Array(19).fill('corridor'));
        roomTypes[5][5] = 'chamber';
        const game = makeFakeGame({ landform: LANDFORMS.MAZE, roomTypes });
        expect(ThreeGame.prototype.isGoodSitePosition.call(game, 5, 5)).toBe(true);
    });

    it('rejects a MAZE chunk position that lands on a corridor cell', () => {
        const roomTypes = Array.from({ length: 19 }, () => Array(19).fill('corridor'));
        const game = makeFakeGame({ landform: LANDFORMS.MAZE, roomTypes });
        expect(ThreeGame.prototype.isGoodSitePosition.call(game, 5, 5)).toBe(false);
    });

    it('handles negative world coordinates with correct local-cell math', () => {
        // chunkSize=19: world tile -1 is local column 18 of chunk -1 (Math.floor(-1/19) = -1).
        const roomTypes = Array.from({ length: 19 }, () => Array(19).fill('corridor'));
        roomTypes[10][18] = 'chamber';
        const game = makeFakeGame({ landform: LANDFORMS.MAZE, roomTypes });
        expect(ThreeGame.prototype.isGoodSitePosition.call(game, -1, -190 + 10)).toBe(true);
    });
});
