import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
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

describe('generatePocket — per-hole, per-run pocket layout', () => {
    // POCKET_CELL_COUNT is 5 (an odd cell-count, like the real chunk carve's
    // chunkCellCount=9) so the DFS start cell lands exactly on the grid's
    // true center — see the worked arithmetic in this task's implementation
    // note. Grid size = 5*2+1 = 11.
    function makePocketFakeGame(runEntropy) {
        return {
            runEntropy,
            globalSeedOffset: 0,
            pocketCache: new Map(),
            hashTile: ThreeGame.prototype.hashTile,
            createSeededRandom: ThreeGame.prototype.createSeededRandom,
            carveCell: ThreeGame.prototype.carveCell,
            carvePassage: ThreeGame.prototype.carvePassage,
            shuffleDirections: ThreeGame.prototype.shuffleDirections,
            getWallKey: ThreeGame.prototype.getWallKey
        };
    }

    it('is deterministic for a fixed runEntropy and hole location', () => {
        const gameA = makePocketFakeGame(42);
        const gameB = makePocketFakeGame(42);
        const pocketA = ThreeGame.prototype.generatePocket.call(gameA, 10, 20);
        const pocketB = ThreeGame.prototype.generatePocket.call(gameB, 10, 20);
        expect(pocketA.grid.map((r) => r.join('')).join('\n'))
            .toBe(pocketB.grid.map((r) => r.join('')).join('\n'));
        expect(pocketA.climbPoint).toEqual(pocketB.climbPoint);
    });

    it('differs across runEntropy for the same hole location', () => {
        const gameA = makePocketFakeGame(1);
        const gameB = makePocketFakeGame(999999);
        const pocketA = ThreeGame.prototype.generatePocket.call(gameA, 10, 20);
        const pocketB = ThreeGame.prototype.generatePocket.call(gameB, 10, 20);
        expect(pocketA.grid.map((r) => r.join('')).join('\n'))
            .not.toBe(pocketB.grid.map((r) => r.join('')).join('\n'));
    });

    it('caches by hole location, returning the same pocket on a second fall', () => {
        const game = makePocketFakeGame(7);
        const first = ThreeGame.prototype.generatePocket.call(game, 5, 5);
        const second = ThreeGame.prototype.generatePocket.call(game, 5, 5);
        expect(second).toBe(first); // same object identity, not just equal content
    });

    it('places the player-entry center cell as open floor, and a valid, distinct climb point', () => {
        const game = makePocketFakeGame(3);
        const pocket = ThreeGame.prototype.generatePocket.call(game, 0, 0);
        expect(pocket.grid[pocket.centerCell.y][pocket.centerCell.x]).toBe('.');
        expect(pocket.grid[pocket.climbPoint.y][pocket.climbPoint.x]).toBe('.');
        expect(pocket.climbPoint).not.toEqual(pocket.centerCell);
    });
});

describe('mountPocket — pocket geometry mounting', () => {
    function makeFakeThreeGameForMount() {
        return {
            pocketCache: new Map(),
            pocketGroups: new Map(),
            runEntropy: 123,
            globalSeedOffset: 0,
            wallHeight: 2,
            wallGeometry: new THREE.BoxGeometry(1, 2, 1),
            wallMaterial: new THREE.MeshBasicMaterial(),
            floorGeometry: new THREE.PlaneGeometry(1, 1),
            floorMaterial: new THREE.MeshBasicMaterial(),
            ventGeometry: new THREE.BoxGeometry(0.48, 0.48, 0.06),
            ventMaterial: new THREE.MeshBasicMaterial(),
            hashTile: ThreeGame.prototype.hashTile,
            createSeededRandom: ThreeGame.prototype.createSeededRandom,
            carveCell: ThreeGame.prototype.carveCell,
            carvePassage: ThreeGame.prototype.carvePassage,
            shuffleDirections: ThreeGame.prototype.shuffleDirections,
            getWallKey: ThreeGame.prototype.getWallKey,
            generatePocket: ThreeGame.prototype.generatePocket,
            configureWallMesh: ThreeGame.prototype.configureWallMesh,
            getWallMaxHp: () => 8,
            createSnailDropPlacement: () => ({ worldX: 0, worldZ: 0, type: 'health', elevation: 0.2, offsetX: 0, offsetZ: 0, bobOffset: 0, rotation: 0, tiltX: 0, tiltZ: 0, scale: 0.8, shadowRadius: 0.24, collectLock: 0.34 }),
            createPickupInstance: () => ({ userData: {}, position: { set: () => {} } })
        };
    }

    it('mounts a group with a floor, at least one wall, and exactly one climb marker', () => {
        const fakeThis = makeFakeThreeGameForMount();
        const group = ThreeGame.prototype.mountPocket.call(fakeThis, 10, 10);

        expect(group.children.length).toBeGreaterThan(0);
        const climbMarkers = group.children.filter((c) => c.userData?.isPocketClimbPoint);
        expect(climbMarkers.length).toBe(1);
    });

    it('caches the mounted group by hole location', () => {
        const fakeThis = makeFakeThreeGameForMount();
        const first = ThreeGame.prototype.mountPocket.call(fakeThis, 3, 3);
        const second = ThreeGame.prototype.mountPocket.call(fakeThis, 3, 3);
        expect(second).toBe(first);
    });
});
