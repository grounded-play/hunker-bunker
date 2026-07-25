import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { LANDFORMS } from './landforms.js';

// The maze/landform/content generators are seeded purely off chunk
// coordinates via hashTile, so every run carved the exact same layout at a
// given depth — "we're always moving on the same x-y" from the player's
// report. runEntropy (already randomized per run and already used for
// hive/camp placement) is now folded into the maze carve seed, the landform
// pick, and the room-template pick, the same way chooseFoundryDiscoveryPosition
// already mixes it into a hashTile seed. These tests pin that down using the
// established ThreeGame.prototype.method.call(fakeThis, ...) pattern.

function makeFakeChunkGame(runEntropy, overrides = {}) {
    return {
        performanceProfile: 'gameplay',
        chunkSize: 19,
        chunkCellCount: 9,
        runEntropy,
        globalSeedOffset: 0,
        hashTile: ThreeGame.prototype.hashTile,
        createSeededRandom: ThreeGame.prototype.createSeededRandom,
        carveCell: ThreeGame.prototype.carveCell,
        carvePassage: ThreeGame.prototype.carvePassage,
        shuffleDirections: ThreeGame.prototype.shuffleDirections,
        ensureChunkPortals: ThreeGame.prototype.ensureChunkPortals,
        getEdgeOpening: ThreeGame.prototype.getEdgeOpening,
        runMarkovPass: ThreeGame.prototype.runMarkovPass,
        widenChunkCorridors: ThreeGame.prototype.widenChunkCorridors,
        clearSpawnArea: ThreeGame.prototype.clearSpawnArea,
        getSpawnTile: ThreeGame.prototype.getSpawnTile,
        getChunkLandform: () => LANDFORMS.MAZE,
        getRunCardEffects: () => ({}),
        ...overrides
    };
}

function gridToString(grid) {
    return grid.map((row) => row.join('')).join('\n');
}

describe('buildChunk — per-run layout variation', () => {
    it('carves a different maze for the same chunk coordinate across different runs', () => {
        const gameA = makeFakeChunkGame(111);
        const gameB = makeFakeChunkGame(222);

        const gridA = ThreeGame.prototype.buildChunk.call(gameA, 5, 5);
        const gridB = ThreeGame.prototype.buildChunk.call(gameB, 5, 5);

        expect(gridToString(gridA)).not.toBe(gridToString(gridB));
    });

    it('is still fully deterministic for a fixed runEntropy (reproducible, not flaky)', () => {
        const gameA = makeFakeChunkGame(555);
        const gameB = makeFakeChunkGame(555);

        const gridA = ThreeGame.prototype.buildChunk.call(gameA, 3, -2);
        const gridB = ThreeGame.prototype.buildChunk.call(gameB, 3, -2);

        expect(gridToString(gridA)).toBe(gridToString(gridB));
    });
});

describe('getChunkLandform — per-run archetype variation', () => {
    function makeFakeLandformGame(runEntropy) {
        return {
            performanceProfile: 'gameplay',
            chunkSize: 19,
            runEntropy,
            hashTile: ThreeGame.prototype.hashTile,
            createSeededRandom: ThreeGame.prototype.createSeededRandom,
            getBiomeKeyForWorldPosition: () => 'active'
        };
    }

    it('picks a different landform archetype somewhere across a spread of chunks between two runs', () => {
        const gameA = makeFakeLandformGame(1);
        const gameB = makeFakeLandformGame(999999);

        let sawDifference = false;
        for (let cx = 3; cx < 3 + 12; cx += 1) {
            const landformA = ThreeGame.prototype.getChunkLandform.call(gameA, cx, cx);
            const landformB = ThreeGame.prototype.getChunkLandform.call(gameB, cx, cx);
            if (landformA !== landformB) sawDifference = true;
        }
        expect(sawDifference).toBe(true);
    });
});

describe('clearLoadedChunksForRunReset — stale landform cache', () => {
    it('clears _chunkLandformCache along with the other chunk caches so a new run re-rolls landforms', () => {
        const fakeThis = {
            chunkMeshes: new Map(),
            chunkGroups: { remove: () => {} },
            chunkCache: new Map([['0,0', {}]]),
            _chunkRoomTypeCache: new Map([['0,0', {}]]),
            _chunkTemplateCache: new Map([['0,0', 'armory']]),
            _chunkLandformCache: new Map([['0,0', LANDFORMS.CRATER]]),
            destroyedWallKeys: new Set(['0,0']),
            pendingChunkMounts: [1],
            pendingChunkMountKeys: new Set(['0,0']),
            wallMeshes: [1],
            pickupMeshes: [1],
            scatterSprites: [1]
        };

        ThreeGame.prototype.clearLoadedChunksForRunReset.call(fakeThis);

        expect(fakeThis._chunkLandformCache.size).toBe(0);
        expect(fakeThis.chunkCache.size).toBe(0);
        expect(fakeThis._chunkRoomTypeCache.size).toBe(0);
        expect(fakeThis._chunkTemplateCache.size).toBe(0);
    });
});
