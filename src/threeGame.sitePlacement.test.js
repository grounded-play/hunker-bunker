import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { WORLD_PROGRESSION_SLOTS } from './worldProgression.js';

function makeFakePlacementGame(runEntropy) {
    const fake = {
        chunkSize: 19,
        runEntropy,
        getBiomeAnchorPosition: () => ({ x: 0, z: 0 }),
        hashTile: ThreeGame.prototype.hashTile,
        createSeededRandom: ThreeGame.prototype.createSeededRandom,
        isSnailTileWalkable: () => true,
        canOccupyPosition: () => true,
        isGoodSitePosition: () => true,
        chooseProgressionSitePosition: ThreeGame.prototype.chooseProgressionSitePosition
    };
    return fake;
}

describe('ordered world landmark progression', () => {
    it('places all three camps in increasing outward depth bands', () => {
        const game = makeFakePlacementGame(42);
        const camps = [0, 1, 2].map((index) => (
            ThreeGame.prototype.chooseCampPosition.call(game, index)
        ));

        expect(camps[0].z).toBeLessThan(camps[1].z);
        expect(camps[1].z).toBeLessThan(camps[2].z);
        camps.forEach((camp, index) => {
            expect(Math.abs(camp.z - WORLD_PROGRESSION_SLOTS.camp[index].distance)).toBeLessThanOrEqual(15);
        });
    });

    it('puts hive branches beyond the early camps and around the final shelter', () => {
        const game = makeFakePlacementGame(1999);
        const hives = [0, 1, 2].map((index) => (
            ThreeGame.prototype.chooseHiveSitePosition.call(game, index)
        ));

        expect(hives[0].z).toBeGreaterThan(75);
        expect(hives[1].z).toBeGreaterThan(110);
        expect(hives[2].z).toBeGreaterThan(hives[1].z);
        expect(Math.sign(hives[0].x)).not.toBe(Math.sign(hives[1].x));
    });

    it('keeps the final cave deeper than every camp and hive', () => {
        const game = makeFakePlacementGame(7);
        const cave = ThreeGame.prototype.chooseCaveEntrancePosition.call(game);
        const landmarks = [
            ...[0, 1, 2].map((index) => ThreeGame.prototype.chooseCampPosition.call(game, index)),
            ...[0, 1, 2].map((index) => ThreeGame.prototype.chooseHiveSitePosition.call(game, index))
        ];

        expect(cave.z).toBeGreaterThan(Math.max(...landmarks.map((site) => site.z)) + 45);
    });
});
