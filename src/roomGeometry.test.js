import { describe, expect, it } from 'vitest';
import { TILE_CATALOG } from './tileCatalog.js';
import {
    buildRoomInstances,
    getTileDoorLanes,
    getTileInteriorCells,
    inferRoomSizeClass,
    validateRoomInstance
} from './roomGeometry.js';
import { stampLattice } from './wfcGenerator.js';

describe('room geometry', () => {
    it('extracts only walkable interior cells and explicit socket lanes', () => {
        for (const tile of TILE_CATALOG.filter((entry) => entry.category === 'room')) {
            const interior = getTileInteriorCells(tile);
            expect(interior.length, tile.id).toBeGreaterThan(0);
            for (const { x, y } of interior) expect(tile.pattern[y][x], tile.id).toBe('.');
            expect(Object.keys(getTileDoorLanes(tile)).length, tile.id).toBeGreaterThan(0);
        }
    });

    it('distinguishes compact and large room footprints', () => {
        const compact = TILE_CATALOG.find((tile) => tile.id === 'room-compact-s');
        const hub = TILE_CATALOG.find((tile) => tile.id === 'room-hub');
        expect(inferRoomSizeClass(compact)).toBe('compact');
        expect(inferRoomSizeClass(hub)).toBe('large');
    });

    it('builds stable room ids, translated footprints, and valid interiors', () => {
        const room = TILE_CATALOG.find((tile) => tile.id === 'room-alcove-s');
        const hall = TILE_CATALOG.find((tile) => tile.id === 'corridor-straight-ns');
        const lattice = [room, hall, room, hall, room, hall, room, hall, room];
        const grid = stampLattice(lattice, 19);
        const instances = buildRoomInstances(lattice, { chunkX: 2, chunkY: -4, chunkSize: 19 });
        expect(instances).toHaveLength(5);
        expect(instances[0].id).toBe('2,-4:room:0');
        for (const instance of instances) {
            expect(validateRoomInstance(instance, grid), instance.id).toEqual([]);
        }
    });
});
