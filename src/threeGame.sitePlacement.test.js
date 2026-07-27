import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

// Hive/camp placement bands (sprint-19 wave 6 punch list, §2b "the alien
// hives are too close"): hives and camps used to draw from overlapping
// distance bands (hives 45-90u, camps 70-120u) and the hives' wide angular
// jitter could swing one right onto a camp bearing — so a player walking
// toward any camp crossed a hive's radius first almost every time. The fix
// keeps hives on a distinctly closer ring (40-60u) with tighter jitter on
// the between-camp bisector bearings, while camps stay 70-120u. These tests
// pin the separated bands so a future tuning pass can't silently re-overlap
// them. Pure-logic methods, exercised via the established
// ThreeGame.prototype.method.call(fakeThis, ...) pattern.

function makeFakePlacementGame(runEntropy) {
    return {
        chunkSize: 19,
        runEntropy,
        getBiomeAnchorPosition: () => ({ x: 0, z: 0 }),
        hashTile: ThreeGame.prototype.hashTile,
        createSeededRandom: ThreeGame.prototype.createSeededRandom,
        isSnailTileWalkable: () => true,
        canOccupyPosition: () => true,
        isGoodSitePosition: ThreeGame.prototype.isGoodSitePosition,
        // Every chunk qualifies as a camp clearing so the camp path exercises
        // its normal (non-fallback) placement branch.
        getChunkLandform: () => 'crater'
    };
}

const HIVE_BASE_ANGLES = [Math.PI * 0.45, Math.PI * 1.1, Math.PI * 1.75];

function angularDistance(a, b) {
    let diff = Math.abs(a - b) % (Math.PI * 2);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    return diff;
}

describe('hive/camp placement bands', () => {
    const entropies = [1, 7, 42, 1999, 987654321];

    it('places hives on a 40-60u ring (closer than every camp)', () => {
        for (const entropy of entropies) {
            const fakeThis = makeFakePlacementGame(entropy);
            for (let index = 0; index < 3; index += 1) {
                const spot = ThreeGame.prototype.chooseHiveSitePosition.call(fakeThis, index);
                const dist = Math.hypot(spot.x, spot.z);
                // ±1 tolerance for the Math.round on tile coordinates.
                expect(dist).toBeGreaterThanOrEqual(39);
                expect(dist).toBeLessThanOrEqual(61);
            }
        }
    });

    it('places camps on a 70-120u ring', () => {
        for (const entropy of entropies) {
            const fakeThis = makeFakePlacementGame(entropy);
            for (let index = 0; index < 3; index += 1) {
                const spot = ThreeGame.prototype.chooseCampPosition.call(fakeThis, index);
                const dist = Math.hypot(spot.x, spot.z);
                expect(dist).toBeGreaterThanOrEqual(69);
                expect(dist).toBeLessThanOrEqual(121);
            }
        }
    });

    it('keeps the hive band strictly inside the camp band (no overlap)', () => {
        let maxHiveDist = 0;
        let minCampDist = Infinity;
        for (const entropy of entropies) {
            const fakeThis = makeFakePlacementGame(entropy);
            for (let index = 0; index < 3; index += 1) {
                const hive = ThreeGame.prototype.chooseHiveSitePosition.call(fakeThis, index);
                const camp = ThreeGame.prototype.chooseCampPosition.call(fakeThis, index);
                maxHiveDist = Math.max(maxHiveDist, Math.hypot(hive.x, hive.z));
                minCampDist = Math.min(minCampDist, Math.hypot(camp.x, camp.z));
            }
        }
        expect(maxHiveDist).toBeLessThan(minCampDist);
    });

    it('keeps hives near their between-camp bisector bearings (tight jitter)', () => {
        for (const entropy of entropies) {
            const fakeThis = makeFakePlacementGame(entropy);
            for (let index = 0; index < 3; index += 1) {
                const spot = ThreeGame.prototype.chooseHiveSitePosition.call(fakeThis, index);
                const angle = Math.atan2(spot.z, spot.x);
                // Jitter is ±0.1π; small extra slack for tile rounding at
                // 40u radius (1 tile ≈ 1.4° ≈ 0.008π).
                expect(angularDistance(angle, HIVE_BASE_ANGLES[index])).toBeLessThanOrEqual(Math.PI * 0.11);
            }
        }
    });
});
