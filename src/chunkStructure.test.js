import { describe, expect, it } from 'vitest';
import {
    buildMazeChunkStructure,
    buildAuthoredRoomChunkStructure,
    buildHallwayConnectorChunkStructure,
    CHUNK_STRUCTURE_VERSION,
    STRUCTURE_GENERATOR
} from './chunkStructure.js';
import { TILE_SIZE, LATTICE, CHUNK_SIZE } from './tileCatalog.js';

function seededRandom(seed) {
    let state = (seed >>> 0) || 1;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
}

describe('buildMazeChunkStructure', () => {
    it('returns exactly one final grid and matching version/chunkKey/generatorId', () => {
        const result = buildMazeChunkStructure(seededRandom(1), {
            chunkX: 2,
            chunkY: -1,
            roomMode: true,
            openings: { north: { open: true, offset: 4 } }
        });
        expect(result.version).toBe(CHUNK_STRUCTURE_VERSION);
        expect(result.chunkKey).toBe('2,-1');
        expect(Object.values(STRUCTURE_GENERATOR)).toContain(result.generatorId);
        expect(Array.isArray(result.grid)).toBe(true);
        expect(result.grid.length).toBe(CHUNK_SIZE);
    });

    it('produces one room instance in room mode, in the shape threeGame.js\'s roomInstances consumers already expect', () => {
        const result = buildMazeChunkStructure(seededRandom(7), {
            chunkX: 0,
            chunkY: 0,
            roomMode: true,
            important: true,
            openings: { south: { open: true, offset: 3 } }
        });
        expect(result.generatorId).toBe(STRUCTURE_GENERATOR.ARCHITECTURAL_ROOM);
        expect(result.rooms).toHaveLength(1);
        const [room] = result.rooms;
        expect(room.id).toBe('architectural-room:0,0');
        expect(room.chunkKey).toBe('0,0');
        expect(room.interior.length).toBeGreaterThan(0);
        expect(room.doors.length).toBeGreaterThan(0);
        for (const door of room.doors) {
            // Preserved from current threeGame.js behavior: one architectural
            // gesture per chunk has no sibling room to point a neighbor
            // lattice index at. Not a bug this module introduces.
            expect(door.neighborIndex).toBeNull();
            expect(door.id).toMatch(/^0,0:architectural-door:\d+:[nesw]$/);
        }
        expect(room.navigation.doorLanes.length).toBeGreaterThan(0);
    });

    it('still yields a junction-bay room instance for connector-shaped chunks, preserving existing behavior', () => {
        // generateArchitecturalMazeChunk's "long connector" branch (roomMode:
        // false, >=2 portals) still carves a junction bay and returns it as
        // `room` whenever carving produced any interior cells — which it
        // almost always does in practice. `architectural.room` is therefore
        // truthy in both branches today; `rooms: []` only happens on the
        // (rare, effectively unreachable in real seeds) zero-interior case.
        // This module preserves that exactly rather than inventing a new
        // room/connector distinction — a real one is Phase 3/4 scope
        // (authored room vs. hallway build catalogs replacing this file).
        const result = buildMazeChunkStructure(seededRandom(11), {
            chunkX: 3,
            chunkY: 5,
            roomMode: false,
            openings: {
                west: { open: true, offset: 2 },
                east: { open: true, offset: 7 }
            }
        });
        expect(result.generatorId).toBe(STRUCTURE_GENERATOR.ARCHITECTURAL_ROOM);
        expect(result.rooms).toHaveLength(1);
    });

    it('is deterministic for a given seed and options', () => {
        const options = {
            chunkX: 1,
            chunkY: 1,
            roomMode: true,
            openings: { north: { open: true, offset: 4 } }
        };
        const a = buildMazeChunkStructure(seededRandom(42), options);
        const b = buildMazeChunkStructure(seededRandom(42), options);
        expect(a.grid).toEqual(b.grid);
        expect(a.rooms).toEqual(b.rooms);
    });

    it('exposes discarded-generation diagnostics instead of silently dropping the WFC pass', () => {
        const result = buildMazeChunkStructure(seededRandom(3), {
            chunkX: 0,
            chunkY: 0,
            openings: { north: { open: true, offset: 4 }, south: { open: true, offset: 4 } }
        });
        expect(result.diagnostics.discardedGeneration).toBe('wfc-lattice-tile-selection');
        expect(result.diagnostics.discardedGenerationCount).toBe(1);
        expect(Array.isArray(result.diagnostics.wfcSeamErrors)).toBe(true);
        expect(result.diagnostics.wfcSeamErrors).toEqual([]);
        expect(['large-room', 'long-connector']).toContain(result.diagnostics.architecturalMode);
        expect(typeof result.diagnostics.canyonCellCount).toBe('number');
    });

    it('does not leak discarded WFC anchors/rooms — nothing downstream reads them today, so this module must not resurrect them', () => {
        const result = buildMazeChunkStructure(seededRandom(9), {
            chunkX: 0,
            chunkY: 0,
            roomMode: true,
            openings: { north: { open: true, offset: 4 } }
        });
        expect(result.anchors).toEqual([]);
    });

    it('echoes back the sockets it was given so callers can verify neighbor reciprocity', () => {
        const openings = { north: { open: true, offset: 4 }, west: { open: true, offset: 2 } };
        const result = buildMazeChunkStructure(seededRandom(5), { chunkX: 0, chunkY: 0, openings });
        expect(result.sockets).toEqual(openings);
    });
});

describe('buildAuthoredRoomChunkStructure', () => {
    it('runs no discarded generation pass, unlike buildMazeChunkStructure', () => {
        const result = buildAuthoredRoomChunkStructure(seededRandom(1), {
            chunkX: 0,
            chunkY: 0,
            family: 'medical',
            openings: { south: { open: true, offset: 5 } }
        });
        expect(result.generatorId).toBe(STRUCTURE_GENERATOR.AUTHORED_ROOM);
        expect(result.diagnostics.discardedGenerationCount).toBe(0);
        expect(result.diagnostics.buildId).toBe('medical_triage');
        expect(result.rooms).toHaveLength(1);
        expect(result.anchors.length).toBeGreaterThan(0);
        expect(result.zones.length).toBeGreaterThan(0);
    });

    it('returns null (so callers fall back to the procedural producer) when no build matches', () => {
        const result = buildAuthoredRoomChunkStructure(seededRandom(1), {
            chunkX: 0,
            chunkY: 0,
            family: 'nonexistent'
        });
        expect(result).toBeNull();
    });

    it('is deterministic for a given seed and selection', () => {
        const options = { chunkX: 1, chunkY: 1, family: 'armory', openings: { west: { open: true, offset: 2 } } };
        const a = buildAuthoredRoomChunkStructure(seededRandom(8), options);
        const b = buildAuthoredRoomChunkStructure(seededRandom(8), options);
        expect(a.grid).toEqual(b.grid);
        expect(a.rooms).toEqual(b.rooms);
    });
});

describe('buildHallwayConnectorChunkStructure', () => {
    it('runs no discarded generation pass and carries the selected archetype through diagnostics', () => {
        const result = buildHallwayConnectorChunkStructure(seededRandom(2), {
            chunkX: 0,
            chunkY: 0,
            fromFamily: 'entry',
            toFamily: 'camp',
            openings: { west: { open: true, offset: 2 }, east: { open: true, offset: 7 } }
        });
        expect(result.generatorId).toBe(STRUCTURE_GENERATOR.HALLWAY_CONNECTOR);
        expect(result.diagnostics.discardedGenerationCount).toBe(0);
        expect(result.diagnostics.archetypeId).toBe('camp_approach');
        expect(result.rooms).toEqual([]);
    });

    it('returns null when no archetype matches the requested families', () => {
        const result = buildHallwayConnectorChunkStructure(seededRandom(2), {
            fromFamily: 'nonexistent',
            toFamily: 'nonexistent'
        });
        expect(result).toBeNull();
    });
});

describe('coordinate contract (17/16/3/49)', () => {
    it('locks TILE_SIZE=17, stride=16, LATTICE=3, CHUNK_SIZE=49 together', () => {
        expect(TILE_SIZE).toBe(17);
        expect(TILE_SIZE - 1).toBe(16);
        expect(LATTICE).toBe(3);
        expect(CHUNK_SIZE).toBe((LATTICE * (TILE_SIZE - 1)) + 1);
        expect(CHUNK_SIZE).toBe(49);
    });

    it('buildMazeChunkStructure grids always span CHUNK_SIZE regardless of caller-supplied chunkSize', () => {
        const result = buildMazeChunkStructure(seededRandom(2), {
            chunkX: 0,
            chunkY: 0,
            chunkSize: CHUNK_SIZE,
            openings: { north: { open: true, offset: 4 } }
        });
        expect(result.grid.length).toBe(CHUNK_SIZE);
        expect(result.grid.every((row) => row.length === CHUNK_SIZE)).toBe(true);
    });
});
