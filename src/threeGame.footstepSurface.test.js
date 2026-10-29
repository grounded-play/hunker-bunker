import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { surfaceLayer } from './floorSplat.js';
import { resolveFootstepSurface } from './footstepSurface.js';

// Steps used to look rooms up with a chunk size of 16 (chunks are 49), so the
// room style was read from the wrong cell; they now read the blended floor's
// own per-cell layer and wetness.
describe('ThreeGame.getFloorSurfaceAt', () => {
    function gameWithChunk(chunkX, chunkY, size, setCell) {
        const layer = new Uint8Array(size * size);
        const data = new Uint8Array(size * size * 4);
        setCell(layer, data);
        const game = Object.create(ThreeGame.prototype);
        game.chunkSize = size;
        game.chunkMeshes = new Map([[`${chunkX},${chunkY}`, {
            userData: { floorSplatMaterial: { userData: { floorSplatLayer: layer, floorSplat: { uSplatData: { value: { image: { data } } } } } } }
        }]]);
        return game;
    }

    it('reads the layer and wetness of the cell under a world point', () => {
        const size = 49;
        const grate = surfaceLayer('tex_floor_grate_trench', 'x');
        // World (60.4, 101.6) -> tile (60, 102) -> chunk (1, 2), local (11, 4).
        const game = gameWithChunk(1, 2, size, (layer, data) => {
            layer[4 * size + 11] = grate;
            data[(4 * size + 11) * 4 + 3] = 204;
        });
        const at = game.getFloorSurfaceAt(60.4, 101.6);
        expect(at).toEqual({ floorLayer: grate, wetness: 0.8 });
        expect(resolveFootstepSurface(at)).toMatchObject({ key: 'footstep_metal_grate', splash: true });
    });

    it('returns null where no blended floor is mounted', () => {
        const game = gameWithChunk(0, 0, 49, () => {});
        expect(game.getFloorSurfaceAt(500, 500)).toBeNull();
    });
});
