import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { buildGrammarRoomChunk } from './roomGrammarChunk.js';
import { grammarWallExterior } from './roomGrammarBreach.js';

describe('grammar wall breach classification and replay', () => {
    it('opens every thick module cell as interior floor and replays through the existing wall save contract', () => {
        const result = buildGrammarRoomChunk({ seed: 7, openings: { north: { open: true, offset: 12 } }, tier: 'major' });
        const metadata = { ...result, roomInstances: result.rooms };
        const original = result.grid.map(row => [...row]);
        const game = { chunkSize: 49, chunkCache: new Map([['0,0', result.grid]]),
            wfcMetadataCache: new Map([['0,0', metadata]]), destroyedWallKeys: new Set(), destroyedExteriorWallKeys: new Set(),
            getChunkLocalFromWorld: ThreeGame.prototype.getChunkLocalFromWorld,
            getWallKey: ThreeGame.prototype.getWallKey, isExteriorWallTile: ThreeGame.prototype.isExteriorWallTile };
        for (const m of result.rooms[0].grammar.modules) for (let y = m.y; y < m.y + m.h; y += 1) for (let x = m.x; x < m.x + m.w; x += 1) {
            expect(grammarWallExterior(metadata, x, y)).toBe(false);
            ThreeGame.prototype.markWallTileDestroyed.call(game, x, y);
            expect(result.grid[y][x]).toBe('.');
        }
        expect(game.destroyedExteriorWallKeys.size).toBe(0);
        ThreeGame.prototype.applyDestroyedWallsToGrid.call(game, original, 0, 0);
        expect(original).toEqual(result.grid);
        const b = result.rooms[0].bounds;
        expect(grammarWallExterior(metadata, b.left, b.top)).toBe(true);
        expect(grammarWallExterior({ generatorId: 'authored-room' }, b.left, b.top)).toBeNull();
    });
});
