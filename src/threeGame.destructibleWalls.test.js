import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

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
});
