import { describe, expect, it, vi } from 'vitest';
import { LEDGE_TILE, ThreeGame } from './threeGame.js';

function call(method, fakeThis, ...args) {
    return ThreeGame.prototype[method].call(fakeThis, ...args);
}

function makeGrid(size = 19, fill = '#') {
    return Array.from({ length: size }, () => Array(size).fill(fill));
}

describe('weapon ammo refill', () => {
    it('has a slow baseline refill even before the ammo-refill upgrade is purchased', () => {
        const interval = call('getAmmoRefillInterval', {
            bank: { getWeaponUpgradeLevel: () => 0 }
        });

        expect(Number.isFinite(interval)).toBe(true);
        expect(interval).toBeGreaterThan(0);
    });

    it('keeps upgrades as a faster refill path', () => {
        const base = call('getAmmoRefillInterval', {
            bank: { getWeaponUpgradeLevel: () => 0 }
        });
        const upgraded = call('getAmmoRefillInterval', {
            bank: { getWeaponUpgradeLevel: () => 2 }
        });

        expect(upgraded).toBeLessThan(base);
    });
});

describe('destructible wall grid persistence', () => {
    it('tunes wall HP above the first prototype values so breaking walls takes commitment', () => {
        const fakeThis = {};

        const damagedHp = call('getWallMaxHp', fakeThis, { variant: 'damaged', heightScale: 1 });
        const standardHp = call('getWallMaxHp', fakeThis, { variant: 'standard', heightScale: 1 });
        const hazardHp = call('getWallMaxHp', fakeThis, { variant: 'hazard', heightScale: 1 });
        const canyonHp = call('getWallMaxHp', fakeThis, { variant: 'standard', landform: 'canyon', heightScale: 1 });

        expect(damagedHp).toBeGreaterThan(3);
        expect(standardHp).toBeGreaterThan(6);
        expect(hazardHp).toBeGreaterThan(standardHp);
        expect(canyonHp).toBeGreaterThan(standardHp);
    });

    it('marks a destroyed wall tile open in the cached chunk grid', () => {
        const grid = makeGrid();
        const fakeThis = {
            chunkSize: 19,
            chunkCache: new Map([['0,0', grid]]),
            destroyedWallKeys: new Set(),
            _chunkRoomTypeCache: new Map([['0,0', []]]),
            _chunkTemplateCache: new Map([['0,0', 'mock']]),
            getWallKey: ThreeGame.prototype.getWallKey,
            getChunkLocalFromWorld: ThreeGame.prototype.getChunkLocalFromWorld
        };

        const coord = call('markWallTileDestroyed', fakeThis, 2, 3);

        expect(coord).toMatchObject({ chunkX: 0, chunkY: 0, localX: 2, localY: 3 });
        expect(grid[3][2]).toBe('.');
        expect(fakeThis.destroyedWallKeys.has('2,3')).toBe(true);
        expect(fakeThis._chunkRoomTypeCache.has('0,0')).toBe(false);
        expect(fakeThis._chunkTemplateCache.has('0,0')).toBe(false);
    });

    it('reapplies destroyed wall keys when a chunk is rebuilt after eviction', () => {
        const grid = makeGrid();
        const fakeThis = {
            chunkSize: 19,
            destroyedWallKeys: new Set(['4,5']),
            getWallKey: ThreeGame.prototype.getWallKey
        };

        call('applyDestroyedWallsToGrid', fakeThis, grid, 0, 0);

        expect(grid[5][4]).toBe('.');
    });

    it('classifies a room-shell wall as exterior but preserves interior dividers', () => {
        const grid = makeGrid(7);
        grid[3][2] = '.';
        const fakeThis = {
            chunkSize: 7,
            chunkCache: new Map([['0,0', grid]]),
            getChunkLocalFromWorld: ThreeGame.prototype.getChunkLocalFromWorld
        };

        expect(call('isExteriorWallTile', fakeThis, 3, 3)).toBe(true);

        grid[3][4] = '.';
        expect(call('isExteriorWallTile', fakeThis, 3, 3)).toBe(false);
    });

    it('turns a breached exterior wall into persistent walkable exterior ground', () => {
        const grid = makeGrid(7);
        grid[3][2] = '.';
        const fakeThis = {
            chunkSize: 7,
            chunkCache: new Map([['0,0', grid]]),
            destroyedWallKeys: new Set(),
            destroyedExteriorWallKeys: new Set(),
            _chunkRoomTypeCache: new Map(),
            _chunkTemplateCache: new Map(),
            wallMeshes: [],
            getWallKey: ThreeGame.prototype.getWallKey,
            getChunkLocalFromWorld: ThreeGame.prototype.getChunkLocalFromWorld,
            isExteriorWallTile: ThreeGame.prototype.isExteriorWallTile
        };

        const result = call('markWallTileDestroyed', fakeThis, 3, 3);

        expect(result.exterior).toBe(true);
        expect(grid[3][3]).toBe(LEDGE_TILE);
        expect(fakeThis.destroyedExteriorWallKeys.has('3,3')).toBe(true);

        const rebuilt = makeGrid(7);
        call('applyDestroyedWallsToGrid', fakeThis, rebuilt, 0, 0);
        expect(rebuilt[3][3]).toBe(LEDGE_TILE);
    });

    it('removes existing wall decals when their wall is destroyed', () => {
        const remove = vi.fn();
        const destroyedDecal = {
            wallKey: '2,3',
            mesh: { parent: { remove } },
            dispose: vi.fn()
        };
        const otherDecal = {
            wallKey: '4,5',
            mesh: { parent: { remove: vi.fn() } },
            dispose: vi.fn()
        };
        const fakeThis = {
            _wallDecals: [destroyedDecal, otherDecal],
            transientEffects: [destroyedDecal, otherDecal]
        };

        call('clearWallDecalsForWall', fakeThis, '2,3');

        expect(destroyedDecal.dispose).toHaveBeenCalledTimes(1);
        expect(remove).toHaveBeenCalledWith(destroyedDecal.mesh);
        expect(fakeThis._wallDecals).toEqual([otherDecal]);
        expect(fakeThis.transientEffects).toEqual([otherDecal]);
    });

    it('clones shared material and shifts color and emissive when damaged', () => {
        const sharedMat = { clone: vi.fn(() => ({ color: { getHex: () => 0x808b96, copy: vi.fn().mockReturnThis(), lerp: vi.fn() }, emissive: { setHex: vi.fn() }, emissiveIntensity: 0 })) };
        const wall = {
            userData: { isWall: true, wallHp: 10, maxWallHp: 10, worldX: 2, worldZ: 3 },
            material: sharedMat
        };
        const fakeThis = {
            wallMaterial: sharedMat,
            updateWallDamageColor: ThreeGame.prototype.updateWallDamageColor,
            destroyWall: vi.fn()
        };

        const result = call('damageWall', fakeThis, wall, 5);

        expect(result).toBe(false);
        expect(wall.userData.wallHp).toBe(5);
        expect(sharedMat.clone).toHaveBeenCalled();
        expect(wall.material.emissive.setHex).toHaveBeenCalledWith(0xff2200);
        expect(wall.material.emissiveIntensity).toBeGreaterThan(0);
    });

    it('tunes door HP lower than standard walls for quick breaching', () => {
        const fakeThis = {};
        const doorHp = call('getWallMaxHp', fakeThis, { variant: 'door', isDoor: true, heightScale: 1 });
        expect(doorHp).toBeLessThan(5);
        expect(doorHp).toBe(3);
    });
});

describe('createWallInstanceRecord — instanced wall identity record', () => {
    it('builds a self-referential userData record so wall.userData.X reads/writes the same object', () => {
        const fakeThis = {
            getWallKey: ThreeGame.prototype.getWallKey,
            getWallMaxHp: ThreeGame.prototype.getWallMaxHp
        };

        const record = call('createWallInstanceRecord', fakeThis, {
            chunkX: 1, chunkY: -2, localX: 5, localY: 6,
            worldX: 30, worldZ: -37, landform: 'maze',
            variant: 'standard', heightScale: 1,
            roomId: 'room-a', roomWallStyle: 'bunker-standard'
        });

        expect(record.isWall).toBe(true);
        expect(record.isInstancedWall).toBe(true);
        expect(record.wallKey).toBe('30,-37');
        expect(record.destroyed).toBe(false);
        expect(record.userData).toBe(record);

        record.userData.wallHp = 1;
        expect(record.wallHp).toBe(1);
    });

    it('sets maxWallHp/wallHp from getWallMaxHp for the given variant', () => {
        const fakeThis = {
            getWallKey: ThreeGame.prototype.getWallKey,
            getWallMaxHp: ThreeGame.prototype.getWallMaxHp
        };

        const record = call('createWallInstanceRecord', fakeThis, {
            chunkX: 0, chunkY: 0, localX: 0, localY: 0,
            worldX: 0, worldZ: 0, landform: 'maze',
            variant: 'damaged', heightScale: 1
        });

        const expectedHp = ThreeGame.prototype.getWallMaxHp.call(fakeThis, { landform: 'maze', variant: 'damaged', heightScale: 1 });
        expect(record.maxWallHp).toBe(expectedHp);
        expect(record.wallHp).toBe(expectedHp);
    });
});

describe('computeExteriorWallJitter — shared position/rotation jitter for exterior walls', () => {
    it('returns zero jitter for a non-exterior wall tile', () => {
        const fakeThis = {
            isExteriorWallTile: () => false,
            hashTile: ThreeGame.prototype.hashTile,
            createSeededRandom: ThreeGame.prototype.createSeededRandom
        };

        const jitter = call('computeExteriorWallJitter', fakeThis, 5, 5);

        expect(jitter).toEqual({ offsetX: 0, offsetZ: 0, rotationY: 0 });
    });

    it('returns deterministic non-zero jitter for an exterior wall tile, seeded by world position', () => {
        const fakeThis = {
            isExteriorWallTile: () => true,
            hashTile: ThreeGame.prototype.hashTile,
            createSeededRandom: ThreeGame.prototype.createSeededRandom
        };

        const jitterA = call('computeExteriorWallJitter', fakeThis, 5, 5);
        const jitterB = call('computeExteriorWallJitter', fakeThis, 5, 5);
        const jitterC = call('computeExteriorWallJitter', fakeThis, 6, 5);

        expect(jitterA).toEqual(jitterB);
        expect(jitterA).not.toEqual({ offsetX: 0, offsetZ: 0, rotationY: 0 });
        expect(jitterA).not.toEqual(jitterC);
    });
});

describe('instanced wall tile identity', () => {
    function makeRecord(worldX, worldZ, instanceIndex, pool) {
        const record = call('createWallInstanceRecord', {
            getWallKey: ThreeGame.prototype.getWallKey,
            getWallMaxHp: ThreeGame.prototype.getWallMaxHp
        }, {
            chunkX: 0,
            chunkY: 0,
            localX: worldX,
            localY: worldZ,
            worldX,
            worldZ,
            landform: 'maze'
        });
        record.instancedMesh = pool;
        record.instanceIndex = instanceIndex;
        return record;
    }

    it('resolves a projectile pool hit to only its matching wall record', () => {
        const pool = { userData: { isInstancedWallPool: true } };
        const first = makeRecord(4, 5, 0, pool);
        const second = makeRecord(5, 5, 1, pool);
        const fakeThis = { _wallInstanceIndex: new Map([[first.wallKey, first], [second.wallKey, second]]) };

        expect(call('findWallByPoolInstance', fakeThis, pool, 1)).toBe(second);
        expect(call('findWallByPoolInstance', fakeThis, pool, 9)).toBeNull();
    });

    it('retires only the destroyed matrix slot and leaves the shared pool active', () => {
        const pool = {
            setMatrixAt: vi.fn(),
            instanceMatrix: { needsUpdate: false }
        };
        const first = makeRecord(4, 5, 0, pool);
        const second = makeRecord(5, 5, 1, pool);
        const grid = makeGrid();
        const fakeThis = {
            chunkSize: 19,
            chunkCache: new Map([['0,0', grid]]),
            chunkMeshes: new Map(),
            destroyedWallKeys: new Set(),
            destroyedExteriorWallKeys: new Set(),
            _chunkRoomTypeCache: new Map(),
            _chunkTemplateCache: new Map(),
            _wallInstanceIndex: new Map([[first.wallKey, first], [second.wallKey, second]]),
            wallMeshes: [pool],
            getWallKey: ThreeGame.prototype.getWallKey,
            getChunkLocalFromWorld: ThreeGame.prototype.getChunkLocalFromWorld,
            findWallMeshAt: ThreeGame.prototype.findWallMeshAt,
            isExteriorWallTile: () => false
        };

        call('markWallTileDestroyed', fakeThis, 4, 5);

        expect(pool.setMatrixAt).toHaveBeenCalledTimes(1);
        expect(pool.setMatrixAt.mock.calls[0][0]).toBe(0);
        expect(pool.instanceMatrix.needsUpdate).toBe(true);
        expect(fakeThis._wallInstanceIndex.has(first.wallKey)).toBe(false);
        expect(fakeThis._wallInstanceIndex.get(second.wallKey)).toBe(second);
        expect(fakeThis.wallMeshes).toEqual([pool]);
        expect(grid[5][4]).toBe('.');
    });
});
