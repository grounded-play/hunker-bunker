import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('Chunk children indexing & syncVisibleChunks optimization', () => {
    function createMockGame(overrides = {}) {
        const game = Object.create(ThreeGame.prototype);
        Object.assign(game, {
            chunkSize: 16,
            visibleChunkRadius: 1,
            wallHeight: 2,
            runEntropy: 12345,
            visitedChunks: new Set(),
            chunkMeshes: new Map(),
            chunkGroups: new THREE.Group(),
            wfcMetadataCache: new Map(),
            depletedGearPileKeys: new Set(),
            killedEnemyScatterKeys: new Set(),
            scatterTextures: {},
            scatterMaterials: {},
            wallMaterial: new THREE.MeshBasicMaterial(),
            floorMaterial: new THREE.MeshBasicMaterial(),
            pendingChunkMounts: [],
            pendingChunkMountKeys: new Set(),
            wallMeshes: [],
            pickupMeshes: [],
            scatterSprites: [],
            player: { position: { x: 0, z: 0 } },
            isInPocket: false,
            getOrCreateChunk: () => Array.from({ length: 16 }, () => Array(16).fill('.')),
            getChunkLandform: () => 'maze',
            getHoleCutForLandform: () => 0.05,
            getHazardCutForLandform: () => 0.1,
            getWallKey: (x, z) => `${x},${z}`,
            createSeededRandom: () => () => 0.5,
            hashTile: () => 42,
            createChunkScatterPlacements: () => [],
            createChunkSetPiecePlacements: () => [],
            createChunkPickupPlacements: () => [],
            getRoomTypeGrid: () => null,
            getChunkTemplate: () => null,
            maybeSpawnChunkLoreDrop: () => {},
            addTerrainStepDressing: () => {},
            addDoorThresholdSurfaceOverlay: () => {},
            addHallwayRouteDressing: () => {},
            addWallAccentGlows: () => {},
            addHallwaySurfaceOverlay: () => {},
            addCrashRoomSurfaceOverlay: () => {},
            addRoomSurfaceOverlays: () => {},
            addWfcDebugOverlay: () => {},
            queueChunkMount: () => {},
            onNewChunkDiscovered: () => {},
            getChunkPrefetchCoords: () => [],
            updateDepthTierProgress: () => {},
            processPendingChunkMounts: () => {},
            ...overrides
        });
        return game;
    }

    it('initializes walls, pickups, and scatters on group.userData in mountChunk', () => {
        const game = createMockGame();
        game.mountChunk(0, 0);
        const group = game.chunkMeshes.get('0,0');
        expect(group).toBeDefined();
        expect(group.userData.walls).toBeDefined();
        expect(group.userData.pickups).toBeDefined();
        expect(group.userData.scatters).toBeDefined();
        expect(Array.isArray(group.userData.walls)).toBe(true);
        expect(Array.isArray(group.userData.pickups)).toBe(true);
        expect(Array.isArray(group.userData.scatters)).toBe(true);
    });

    it('indexes added and removed children dynamically via wrapped group methods', () => {
        const game = createMockGame();
        game.mountChunk(1, 1);
        const group = game.chunkMeshes.get('1,1');

        const mockWall = new THREE.Mesh();
        mockWall.userData = { isWall: true };
        const mockPickup = new THREE.Mesh();
        mockPickup.userData = { isPickup: true };
        const mockScatter = new THREE.Mesh();
        mockScatter.userData = { isScatter: true };

        group.add(mockWall, mockPickup, mockScatter);
        expect(group.userData.walls).toContain(mockWall);
        expect(group.userData.pickups).toContain(mockPickup);
        expect(group.userData.scatters).toContain(mockScatter);

        group.remove(mockPickup);
        expect(group.userData.pickups).not.toContain(mockPickup);
        expect(group.userData.walls).toContain(mockWall);
        expect(group.userData.scatters).toContain(mockScatter);
    });

    it('populates wallMeshes, pickupMeshes, and scatterSprites from group.userData in syncVisibleChunks', () => {
        const game = createMockGame();
        const mockWall = new THREE.Mesh();
        mockWall.userData = { isWall: true };
        const mockPickup = new THREE.Mesh();
        mockPickup.userData = { isPickup: true };
        const mockScatter = new THREE.Mesh();
        mockScatter.userData = { isScatter: true };

        const group = new THREE.Group();
        group.visible = true;
        group.userData = {
            walls: [mockWall],
            pickups: [mockPickup],
            scatters: [mockScatter]
        };
        group.add(mockWall);
        group.add(mockPickup);
        group.add(mockScatter);

        game.visitedChunks.add('0,0');
        game.chunkMeshes.set('0,0', group);

        game.syncVisibleChunks(true);

        expect(game.wallMeshes).toContain(mockWall);
        expect(game.pickupMeshes).toContain(mockPickup);
        expect(game.scatterSprites).toContain(mockScatter);
    });

    it('falls back to group.children if group.userData.walls is not present', () => {
        const game = createMockGame();
        const mockWall = new THREE.Mesh();
        mockWall.userData = { isWall: true };
        const mockPickup = new THREE.Mesh();
        mockPickup.userData = { isPickup: true };

        const group = new THREE.Group();
        group.visible = true;
        group.userData = {}; // no pre-indexed arrays
        group.add(mockWall);
        group.add(mockPickup);

        game.visitedChunks.add('0,0');
        game.chunkMeshes.set('0,0', group);

        game.syncVisibleChunks(true);

        expect(game.wallMeshes).toContain(mockWall);
        expect(game.pickupMeshes).toContain(mockPickup);
    });
});
