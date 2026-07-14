import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

// getHoleCutForLandform is the single source of truth mountChunk's render
// pass and isHoleTile's collision/fall-hazard pass both call — the bug
// this fixes ("holes are in the door") was these two paths each hardcoding
// their own copy of these thresholds and drifting apart. It only reads its
// argument, so it's callable without a full ThreeGame instance.
function holeCutFor(landform) {
    return ThreeGame.prototype.getHoleCutForLandform.call({}, landform);
}

describe('getHoleCutForLandform', () => {
    it('matches the exact per-landform thresholds mountChunk renders with', () => {
        expect(holeCutFor('maze')).toBe(0.08);
        expect(holeCutFor('ruins')).toBe(0.08);
        expect(holeCutFor('field')).toBe(0.03);
        expect(holeCutFor('canyon')).toBe(0.0);
        expect(holeCutFor('crater')).toBe(0.06);
        expect(holeCutFor(undefined)).toBe(0.06);
    });
});

describe('isHoleTile / mountChunk agreement', () => {
    it('rolls the same seeded value both call sites would compare against the same threshold', () => {
        // Both mountChunk and isHoleTile derive their roll from
        // hashTile(worldX, worldY) + 999 via createSeededRandom — confirm
        // that derivation is deterministic and reused correctly by
        // isHoleTile, which is the actual code path under test here.
        const fakeThis = {
            chunkSize: 19,
            _chunkLandformCache: new Map(),
            getOrCreateChunk: () => Array.from({ length: 19 }, () => Array(19).fill('#')),
            getChunkLandform: () => 'maze',
            hashTile: ThreeGame.prototype.hashTile,
            createSeededRandom: ThreeGame.prototype.createSeededRandom,
            getTileType: ThreeGame.prototype.getTileType,
            getHoleCutForLandform: ThreeGame.prototype.getHoleCutForLandform
        };

        const isHole = ThreeGame.prototype.isHoleTile.call(fakeThis, 5, 5);
        // Independently recompute what the threshold-aware roll should be.
        const rng = fakeThis.createSeededRandom(fakeThis.hashTile(5, 5) + 999);
        const expectedHole = rng() < fakeThis.getHoleCutForLandform('maze');

        expect(isHole).toBe(expectedHole);
    });
});
