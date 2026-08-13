import { describe, expect, it } from 'vitest';
import {
    ROOM_BUILD_CATALOG,
    rotateRoomBuild,
    validateRoomBuild,
    computeApproachPoint,
    classifyRoomBuildSize,
    selectRoomBuild,
    stampRoomBuild,
    buildRoomInstanceFromBuild
} from './roomBuilds.js';
import { CHUNK_SIZE } from './tileCatalog.js';

function seededRandom(seed) {
    let state = (seed >>> 0) || 1;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
}

describe('ROOM_BUILD_CATALOG', () => {
    it('has exactly the eight vertical-slice families the plan requires', () => {
        const families = ROOM_BUILD_CATALOG.map((build) => build.family).sort();
        expect(families).toEqual([
            'armory', 'cache', 'fabricator', 'gate', 'medical', 'o2', 'puzzle', 'trap_reward'
        ].sort());
    });

    it.each(ROOM_BUILD_CATALOG.map((build) => [build.id, build]))('%s is internally valid', (_, build) => {
        expect(validateRoomBuild(build)).toEqual([]);
    });

    it.each(ROOM_BUILD_CATALOG.map((build) => [build.id, build]))('%s\'s approach point sits on floor', (_, build) => {
        const point = computeApproachPoint(build);
        expect(build.pattern[point.y][point.x]).toBe('.');
    });

    it.each(ROOM_BUILD_CATALOG.map((build) => [build.id, build]))('%s fits inside a chunk with border margin', (_, build) => {
        expect(build.pattern[0].length).toBeLessThanOrEqual(CHUNK_SIZE - 6);
        expect(build.pattern.length).toBeLessThanOrEqual(CHUNK_SIZE - 6);
    });

    it('the ring crossing landmark is the only build meeting the Large size contract, matching its 2/2 content budget', () => {
        const gate = ROOM_BUILD_CATALOG.find((build) => build.id === 'ring_crossing_landmark');
        expect(classifyRoomBuildSize(gate)).toBe('large');
        expect(gate.structuralAnchors.length).toBeGreaterThanOrEqual(2);
        expect(gate.encounterZones.length + gate.interactionAnchors.length).toBeGreaterThanOrEqual(2);
    });
});

describe('rotateRoomBuild', () => {
    const build = ROOM_BUILD_CATALOG.find((b) => b.id === 'medical_triage');

    it('swaps width/height and rotates sockets n->e->s->w->n over four steps', () => {
        const original = build;
        expect(original.sockets[0].side).toBe('s');

        const once = rotateRoomBuild(build, 1);
        expect(once.pattern.length).toBe(original.pattern[0].length);
        expect(once.pattern[0].length).toBe(original.pattern.length);
        expect(once.sockets[0].side).toBe('w');

        const twice = rotateRoomBuild(build, 2);
        expect(twice.sockets[0].side).toBe('n');
        expect(twice.pattern.length).toBe(original.pattern.length);
        expect(twice.pattern[0].length).toBe(original.pattern[0].length);

        const four = rotateRoomBuild(build, 4);
        expect(four.pattern).toEqual(original.pattern);
        expect(four.sockets[0].side).toBe(original.sockets[0].side);
    });

    it('keeps every rotated build internally valid', () => {
        for (const b of ROOM_BUILD_CATALOG) {
            for (let steps = 0; steps < 4; steps += 1) {
                expect(validateRoomBuild(rotateRoomBuild(b, steps))).toEqual([]);
            }
        }
    });

    it('rotates anchor points consistently with the pattern (approach point still on floor after rotation)', () => {
        for (let steps = 0; steps < 4; steps += 1) {
            const rotated = rotateRoomBuild(build, steps);
            const point = computeApproachPoint(rotated);
            expect(rotated.pattern[point.y][point.x]).toBe('.');
        }
    });
});

describe('selectRoomBuild', () => {
    it('filters by family/tier/biome/roles and is deterministic for a given roll', () => {
        const a = selectRoomBuild(ROOM_BUILD_CATALOG, { family: 'medical', tier: 1, biome: 'active', roll: 0.4 });
        const b = selectRoomBuild(ROOM_BUILD_CATALOG, { family: 'medical', tier: 1, biome: 'active', roll: 0.4 });
        expect(a).toBe(b);
        expect(a.family).toBe('medical');
    });

    it('returns null when nothing matches', () => {
        expect(selectRoomBuild(ROOM_BUILD_CATALOG, { family: 'nonexistent' })).toBeNull();
    });
});

describe('stampRoomBuild', () => {
    const build = ROOM_BUILD_CATALOG.find((b) => b.id === 'o2_scrubber');

    it('produces a chunk-sized grid with a non-empty interior and doors cut for the given openings', () => {
        const { grid, interior, doors } = stampRoomBuild(build, seededRandom(1), {
            openings: { north: { open: true, offset: 4 } }
        });
        expect(grid.length).toBe(CHUNK_SIZE);
        expect(grid.every((row) => row.length === CHUNK_SIZE)).toBe(true);
        expect(interior.length).toBeGreaterThan(0);
        expect(doors.length).toBeGreaterThan(0);
        for (const door of doors) {
            for (const cell of door.cells) expect(grid[cell.y][cell.x]).toBe('D');
        }
    });

    it('is deterministic for a given seed', () => {
        const options = { openings: { north: { open: true, offset: 4 }, west: { open: true, offset: 2 } } };
        const a = stampRoomBuild(build, seededRandom(9), options);
        const b = stampRoomBuild(build, seededRandom(9), options);
        expect(a.grid).toEqual(b.grid);
    });

    it('never carves through the room\'s own structural obstruction, and skips openings with no matching declared socket', () => {
        // o2_scrubber only declares an 'n' socket. A south opening (no
        // matching socket) must be skipped rather than connected straight
        // through the scrubber column obstruction in the room's middle.
        const { grid, origin, skippedSides } = stampRoomBuild(build, seededRandom(3), {
            openings: { north: { open: true, offset: 4 }, south: { open: true, offset: 4 } }
        });
        expect(skippedSides).toEqual(['south']);
        const obstruction = build.structuralAnchors[0];
        expect(grid[origin.y + obstruction.y][origin.x + obstruction.x]).toBe('#');
    });

    it('connects every declared-socket opening only up to the room boundary, never past it', () => {
        const gate = ROOM_BUILD_CATALOG.find((b) => b.id === 'ring_crossing_landmark');
        const { grid, origin, doors } = stampRoomBuild(gate, seededRandom(4), {
            openings: { south: { open: true, offset: 8 }, north: { open: true, offset: 8 } }
        });
        expect(doors.length).toBeGreaterThanOrEqual(2);
        for (const pillar of gate.structuralAnchors) {
            expect(grid[origin.y + pillar.y][origin.x + pillar.x]).toBe('#');
        }
    });
});

describe('buildRoomInstanceFromBuild', () => {
    it('produces a roomInstances-compatible shape with world-translated anchors', () => {
        const build = ROOM_BUILD_CATALOG.find((b) => b.id === 'medical_triage');
        const stamped = stampRoomBuild(build, seededRandom(5), {
            openings: { south: { open: true, offset: 5 } }
        });
        const room = buildRoomInstanceFromBuild(build, stamped, { chunkX: 2, chunkY: -3 });

        expect(room.chunkKey).toBe('2,-3');
        expect(room.id).toBe(`authored-room:${build.id}:2,-3`);
        expect(room.interior.length).toBeGreaterThan(0);
        expect(room.doors.length).toBeGreaterThan(0);
        expect(room.navigation.doorLanes.length).toBeGreaterThan(0);
        expect(room.safeZone).toBe(true);

        const consoleAnchor = room.interactionAnchors.find((a) => a.id === 'triage_console');
        expect(consoleAnchor).toBeDefined();
        expect(consoleAnchor.x).toBe(stamped.origin.x + build.interactionAnchors[0].x);
        expect(consoleAnchor.y).toBe(stamped.origin.y + build.interactionAnchors[0].y);
    });

    it('carries chunkX/chunkY and ring/tier for consumers that gate on them', () => {
        const build = ROOM_BUILD_CATALOG.find((b) => b.id === 'armory_cage');
        const stamped = stampRoomBuild(build, seededRandom(5), {
            openings: { west: { open: true, offset: 3 } }
        });
        const room = buildRoomInstanceFromBuild(build, stamped, { chunkX: 4, chunkY: 1, ring: 2 });
        expect(room.chunkX).toBe(4);
        expect(room.chunkY).toBe(1);
        expect(room.ring).toBe(2);
        expect(room.tier).toBe(2);
    });

    it('exposes isSafe alongside safeZone, matching what src/roomContainment.js and threeGame.js\'s getActiveContainmentZones() read', () => {
        const safe = ROOM_BUILD_CATALOG.find((b) => b.id === 'medical_triage');
        const stampedSafe = stampRoomBuild(safe, seededRandom(1), { openings: { south: { open: true, offset: 5 } } });
        const safeRoom = buildRoomInstanceFromBuild(safe, stampedSafe, { chunkX: 0, chunkY: 0 });
        expect(safeRoom.isSafe).toBe(true);
        expect(safeRoom.safeZone).toBe(true);

        const unsafe = ROOM_BUILD_CATALOG.find((b) => b.id === 'trap_vault');
        const stampedUnsafe = stampRoomBuild(unsafe, seededRandom(1), { openings: { north: { open: true, offset: 4 } } });
        const unsafeRoom = buildRoomInstanceFromBuild(unsafe, stampedUnsafe, { chunkX: 0, chunkY: 0 });
        expect(unsafeRoom.isSafe).toBe(false);
    });

    it('exposes contentBudget verbatim so room.contentBudget?.enemiesMax resolves (roomEncounters.js reads this, not populationBudget.enemy.max)', () => {
        const build = ROOM_BUILD_CATALOG.find((b) => b.id === 'armory_cage');
        const stamped = stampRoomBuild(build, seededRandom(2), { openings: { west: { open: true, offset: 3 } } });
        const room = buildRoomInstanceFromBuild(build, stamped, { chunkX: 0, chunkY: 0 });
        expect(room.contentBudget.enemiesMax).toBe(build.contentBudget.enemiesMax);
        expect(typeof room.populationBudget.enemy).toBe('number');
    });

    it('every translated zone carries a resolvable .bounds (roomEncounters.js/roomContainment.js read zone.bounds ?? zone, and only understand minX/maxX, not w/h)', () => {
        const build = ROOM_BUILD_CATALOG.find((b) => b.id === 'ring_crossing_landmark');
        const stamped = stampRoomBuild(build, seededRandom(3), {
            openings: { south: { open: true, offset: 8 }, north: { open: true, offset: 8 } }
        });
        const room = buildRoomInstanceFromBuild(build, stamped, { chunkX: 0, chunkY: 0 });
        for (const zone of [...room.coverZones, ...room.encounterZones, ...room.hazardZones, ...room.quietZones]) {
            expect(zone.bounds.minX).toBe(zone.x);
            expect(zone.bounds.maxX).toBe(zone.x + zone.w - 1);
            expect(zone.bounds.minY).toBe(zone.y);
            expect(zone.bounds.maxY).toBe(zone.y + zone.h - 1);
        }
        for (const zone of room.quietZones) {
            expect(zone.isQuiet).toBe(true);
            expect(zone.type).toBe('quiet');
        }
    });
});
