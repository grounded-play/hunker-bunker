import { TILE_SIZE } from './tileCatalog.js';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
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
        runMazeDetailPass: ThreeGame.prototype.runMazeDetailPass,
        widenChunkCorridors: ThreeGame.prototype.widenChunkCorridors,
        clearSpawnArea: ThreeGame.prototype.clearSpawnArea,
        getSpawnTile: ThreeGame.prototype.getSpawnTile,
        isInTutorialRing: ThreeGame.prototype.isInTutorialRing,
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
            getBiomeKeyForWorldPosition: () => 'active',
            // docs/phase6-wfc-ring-barrier-integration-plan.md: getChunkLandform
            // now checks proximity to a ring boundary before picking randomly.
            getBiomeAnchorPosition: () => ({ x: 0, z: 0 })
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
    // Phase 2 replaces the old 11x11 one-cell DFS maze with two overlapping
    // 7x7 WFC tiles per axis: 7 + 7 - 1 = 13.
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

    it('builds a WFC pocket with a multi-cell-wide room', () => {
        const game = makePocketFakeGame(13);
        const pocket = ThreeGame.prototype.generatePocket.call(game, 2, 8);
        expect(pocket.size).toBe((2 * (TILE_SIZE - 1)) + 1);
        expect(pocket.grid).toHaveLength(13);
        expect(pocket.lattice).toHaveLength(4);

        const hasWideRoom = pocket.grid.some((row, y) => row.some((_cell, x) => (
            y + 2 < pocket.size
            && x + 2 < pocket.size
            && pocket.grid.slice(y, y + 3).every((candidateRow) => (
                candidateRow.slice(x, x + 3).every((cell) => cell === '.')
            ))
        )));
        expect(hasWideRoom).toBe(true);
    });
});

describe('mountPocket — pocket geometry mounting', () => {
    function makeFakeThreeGameForMount() {
        return {
            pocketCache: new Map(),
            pocketGroups: new Map(),
            pickupMeshes: [],
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
            createPickupInstance: () => new THREE.Object3D()
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

describe('enterPocket / exitPocket — fall resolution', () => {
    function makeFakeThreeGameForEnter(overrides = {}) {
        const scene = { add: () => {}, remove: () => {} };
        return {
            scene,
            player: { position: { x: 10, y: -2.5, z: 20 }, scale: new THREE.Vector3(1, 1, 1), rotation: new THREE.Euler() },
            playerVitals: { hp: 3, maxHp: 3 },
            bank: { getState: () => ({ tier2Unlocks: {} }) },
            isInPocket: false,
            pocketCache: new Map(),
            pocketGroups: new Map(),
            pickupMeshes: [],
            chunkMeshes: new Map([['0,1', { visible: true }]]),
            chunkSize: 19,
            runEntropy: 55,
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
            getWallMaxHp: () => 8,
            configureWallMesh: ThreeGame.prototype.configureWallMesh,
            generatePocket: ThreeGame.prototype.generatePocket,
            mountPocket: ThreeGame.prototype.mountPocket,
            resolveFallDamage: () => 2,
            takeDamage: ThreeGame.prototype.takeDamage,
            iFrameTimer: 0,
            isPlayerDead: false, godMode: false, cinematicLock: false, _abilityImmune: false,
            missionState: { status: 'active' },
            showDirectionalHitIndicator: () => {},
            triggerCameraShake: () => {},
            emitHealthState: () => {},
            handleDeath: () => {},
            setInputEnabled: function (v) { this.inputEnabled = v; },
            createSnailDropPlacement: () => ({ worldX: 0, worldZ: 0, type: 'health', elevation: 0.2, offsetX: 0, offsetZ: 0, bobOffset: 0, rotation: 0, tiltX: 0, tiltZ: 0, scale: 0.8, shadowRadius: 0.24, collectLock: 0.34 }),
            createPickupInstance: () => new THREE.Object3D(),
            filledHoleKeys: new Set(),
            isHoleTile: () => true,
            fillHoleAt: ThreeGame.prototype.fillHoleAt,
            ...overrides
        };
    }

    let originalWindow;
    beforeEach(() => {
        originalWindow = globalThis.window;
        globalThis.window = { dispatchEvent: () => {} };
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('deals fall damage, hides the surface chunk, drops the player into the pocket, and re-enables input', () => {
        const fakeThis = makeFakeThreeGameForEnter();
        ThreeGame.prototype.enterPocket.call(fakeThis, 10, 20);

        expect(fakeThis.playerVitals.hp).toBe(1); // 3 - 2 fall damage
        expect(fakeThis.isInPocket).toBe(true);
        expect(fakeThis.chunkMeshes.get('0,1').visible).toBe(false);
        expect(fakeThis.inputEnabled).toBe(true);
        expect(fakeThis.player.position.y).toBe(-6);
        expect(fakeThis._pocketHoleX).toBe(10);
        expect(fakeThis._pocketHoleZ).toBe(20);
    });

    it('exitPocket restores the player to the surface and shows the chunk again', () => {
        const fakeThis = makeFakeThreeGameForEnter();
        ThreeGame.prototype.enterPocket.call(fakeThis, 10, 20);

        ThreeGame.prototype.exitPocket.call(fakeThis);

        expect(fakeThis.isInPocket).toBe(false);
        expect(fakeThis.player.position.y).toBe(0);
        expect(fakeThis.player.position.x).toBe(10);
        expect(fakeThis.player.position.z).toBe(20);
        expect(fakeThis.chunkMeshes.get('0,1').visible).toBe(true);
    });

    it('seals the hole behind the player so climbing out cannot immediately re-trigger the fall', () => {
        // Caught by the in-browser verification pass: without sealing the
        // hole, the player lands back exactly on it and the very next
        // "stepped on a hole" check in updatePlayer re-triggers the fall.
        const fakeThis = makeFakeThreeGameForEnter();
        ThreeGame.prototype.enterPocket.call(fakeThis, 10, 20);

        ThreeGame.prototype.exitPocket.call(fakeThis);

        expect(fakeThis.filledHoleKeys.has(fakeThis.getWallKey(10, 20))).toBe(true);
    });
});

describe('getTileType — pocket-aware collision redirection', () => {
    function makeFakeThisForTileType() {
        // A pocket whose center cell (5,5) is floor and one adjacent cell
        // (6,5) is a wall, so a real player position maps onto both.
        const grid = Array(11).fill(null).map(() => Array(11).fill('.'));
        grid[5][6] = '#';
        const pocket = { grid, size: 11, centerCell: { x: 5, y: 5 }, climbPoint: { x: 9, y: 9 } };
        return {
            isInPocket: true,
            _pocketHoleX: 100,
            _pocketHoleZ: 200,
            pocketCache: new Map([[ThreeGame.prototype.getWallKey.call({}, 100, 200), pocket]]),
            getWallKey: ThreeGame.prototype.getWallKey,
            chunkSize: 19,
            destroyedWallKeys: new Set(),
            getOrCreateChunk: () => { throw new Error('should not touch the surface chunk system while in a pocket'); }
        };
    }

    it('reads the pocket grid instead of the surface chunk when isInPocket is true', () => {
        const fakeThis = makeFakeThisForTileType();
        // World (100, 200) is the hole itself, which maps to the pocket's
        // center cell (5,5) — open floor.
        expect(ThreeGame.prototype.getTileType.call(fakeThis, 100, 200)).toBe('.');
        // One world unit east maps to pocket-local (6,5) — the wall we set.
        expect(ThreeGame.prototype.getTileType.call(fakeThis, 101, 200)).toBe('#');
    });

    it('falls back to the surface chunk system when not in a pocket', () => {
        const fakeThis = { ...makeFakeThisForTileType(), isInPocket: false, getOrCreateChunk: () => [['.']] };
        expect(() => ThreeGame.prototype.getTileType.call(fakeThis, 100, 200)).not.toThrow();
    });
});
