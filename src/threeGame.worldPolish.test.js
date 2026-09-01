import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('world polish', () => {
    it('keeps biomechanical doors attached to structural wall jambs', () => {
        const grid = Array.from({ length: 7 }, () => Array(7).fill('.'));
        grid[3][3] = 'D';
        grid[3][1] = '#';
        grid[3][5] = '#';

        ThreeGame.prototype.clearDoorways.call({}, grid);

        expect(grid[3][2]).toBe('#');
        expect(grid[3][4]).toBe('#');
        expect(grid[2][3]).toBe('.');
        expect(grid[4][3]).toBe('.');
    });

    it('does not rebuild visible chunk registries on stationary frames', () => {
        const game = {
            isInPocket: false,
            player: { position: { x: 10, z: 10 } },
            chunkSize: 19,
            visibleChunkRadius: 1,
            chunkResidentPadding: 3,
            _lastChunkVisibilityKey: '0,0:1',
            pendingChunkMounts: [],
            getChunkPrefetchCoords: () => [],
            updateDepthTierProgress: vi.fn()
        };

        ThreeGame.prototype.syncVisibleChunks.call(game);

        expect(game.updateDepthTierProgress).not.toHaveBeenCalled();
    });

    it('queues forward prefetch when boundary proximity changes inside the same chunk', () => {
        const queueChunkMount = vi.fn();
        const game = {
            isInPocket: false,
            player: { position: { x: 46, z: 24 } },
            chunkSize: 49,
            visibleChunkRadius: 1,
            _lastChunkVisibilityKey: '0,0:1',
            pendingChunkMounts: [],
            pendingChunkMountKeys: new Set(),
            chunkMeshes: new Map(),
            visitedChunks: new Set(),
            maxChunkMountsPerFrame: 1,
            _lastFrameDeltaForChunkMounts: 0,
            getChunkPrefetchCoords: () => [{ key: '2,0', chunkX: 2, chunkY: 0 }],
            updateDepthTierProgress: vi.fn(),
            queueChunkMount,
            onNewChunkDiscovered: vi.fn(),
            processPendingChunkMounts: vi.fn()
        };

        ThreeGame.prototype.syncVisibleChunks.call(game);

        expect(queueChunkMount).toHaveBeenCalledWith(2, 0, 0, 0, { prefetch: true });
        expect(game._lastChunkVisibilityKey).toContain('2,0');
    });

    it('starts the enlarged chunk-loading scan well before the visible boundary', () => {
        const game = {
            player: { position: { x: 30, z: 24 } },
            chunkSize: 49,
            visibleChunkRadius: 1,
            chunkPrefetchMargin: 20
        };

        const coords = ThreeGame.prototype.getChunkPrefetchCoords.call(game, 0, 0);

        expect(coords.map((entry) => entry.key)).toEqual(expect.arrayContaining(['2,-1', '2,0', '2,1']));
    });

    it('mounts missing visible terrain even during sustained slow frames', () => {
        const processPendingChunkMounts = vi.fn();
        const game = {
            isInPocket: false,
            player: { position: { x: 10, z: 10 } },
            chunkSize: 49,
            visibleChunkRadius: 1,
            chunkResidentPadding: 3,
            pendingChunkMounts: [{ key: '0,0', chunkX: 0, chunkY: 0, prefetch: false }],
            pendingChunkMountKeys: new Set(['0,0']),
            chunkMeshes: new Map(),
            chunkGroups: { remove: vi.fn() },
            visitedChunks: new Set(),
            maxChunkMountsPerFrame: 1,
            _lastFrameDeltaForChunkMounts: 0.05,
            getChunkPrefetchCoords: () => [],
            updateDepthTierProgress: vi.fn(),
            queueChunkMount: vi.fn(),
            onNewChunkDiscovered: vi.fn(),
            processPendingChunkMounts,
            disposeChunkGroupResources: vi.fn()
        };

        ThreeGame.prototype.syncVisibleChunks.call(game);

        expect(processPendingChunkMounts).toHaveBeenCalledWith(1, expect.objectContaining({ maxDurationMs: expect.any(Number) }));
    });

    it('mounts 3x3, hides recently departed chunks, and restores them before distant eviction', () => {
        const retained = { visible: true, userData: {}, children: [] };
        const distant = { visible: true, userData: {}, children: [] };
        const queueChunkMount = vi.fn();
        const disposeChunkGroupResources = vi.fn();
        const game = {
            isInPocket: false,
            player: { position: { x: 10, z: 10 } },
            chunkSize: 49,
            visibleChunkRadius: 1,
            pendingChunkMounts: [],
            pendingChunkMountKeys: new Set(),
            chunkMeshes: new Map([['-2,0', retained], ['-3,0', distant]]),
            chunkGroups: { remove: vi.fn() },
            visitedChunks: new Set(),
            maxChunkMountsPerFrame: 1,
            _lastFrameDeltaForChunkMounts: 0,
            getChunkPrefetchCoords: () => [],
            updateDepthTierProgress: vi.fn(),
            queueChunkMount,
            onNewChunkDiscovered: vi.fn(),
            processPendingChunkMounts: vi.fn(),
            disposeChunkGroupResources
        };

        ThreeGame.prototype.syncVisibleChunks.call(game, true, { prefetch: false, processLimit: 0 });

        expect(queueChunkMount).toHaveBeenCalledTimes(9);
        expect(retained.visible).toBe(false);
        expect(game.chunkMeshes.has('-2,0')).toBe(true);
        expect(game.chunkMeshes.has('-3,0')).toBe(true);
        expect(disposeChunkGroupResources).not.toHaveBeenCalledWith(distant);

        game.player.position.x = -40; // center chunk -1: retained chunk is visible again
        ThreeGame.prototype.syncVisibleChunks.call(game, true, { prefetch: false, processLimit: 0 });
        expect(retained.visible).toBe(true);
    });

    it('does not dispose shared sprite geometry when evicting a chunk', () => {
        const spriteGeometry = { dispose: vi.fn() };
        const spriteMaterial = { dispose: vi.fn() };
        const meshGeometry = { dispose: vi.fn() };
        const meshMaterial = { dispose: vi.fn() };
        const children = [
            { isSprite: true, geometry: spriteGeometry, material: spriteMaterial, userData: { isScatter: true } },
            { isSprite: false, geometry: meshGeometry, material: meshMaterial, userData: { isScatter: true } }
        ];
        const group = { traverse: (visit) => children.forEach(visit) };

        ThreeGame.prototype.disposeChunkGroupResources.call({}, group);

        expect(spriteMaterial.dispose).toHaveBeenCalledOnce();
        expect(spriteGeometry.dispose).not.toHaveBeenCalled();
        expect(meshMaterial.dispose).toHaveBeenCalledOnce();
        expect(meshGeometry.dispose).toHaveBeenCalledOnce();
    });

    it('places doors at narrow room thresholds without opening the surrounding walls', () => {
        const grid = Array.from({ length: 9 }, () => Array(9).fill('#'));
        for (let y = 1; y < 8; y += 1) grid[y][4] = '.';
        const game = { getDepthTier: () => 2 };

        ThreeGame.prototype.addRoomThresholdDoors.call(game, grid, () => 0, 1, 2);

        expect(grid.some((row) => row.includes('D'))).toBe(true);
        expect(grid[4][3]).toBe('#');
        expect(grid[4][5]).toBe('#');
    });
});
