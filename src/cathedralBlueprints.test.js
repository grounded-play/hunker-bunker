import { describe, expect, it } from 'vitest';
import { CATHEDRAL_ROOM_BLUEPRINTS } from './data/cathedralBlueprints.js';
import {
    validateRoomBuild,
    rotateRoomBuild,
    computeApproachPoint,
    stampRoomBuild,
    selectRoomBuild,
    ALL_ROOM_BUILDS
} from './roomBuilds.js';
import { CHUNK_SIZE } from './tileCatalog.js';
import { buildAuthoredRoomChunkStructure } from './chunkStructure.js';

function shortestPatternPath(pattern, start, goal, blocked = new Set()) {
    const key = ({ x, y }) => `${x},${y}`;
    const queue = [{ ...start, distance: 0 }];
    const seen = new Set([key(start)]);
    for (let index = 0; index < queue.length; index += 1) {
        const current = queue[index];
        if (current.x === goal.x && current.y === goal.y) return current.distance;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const next = { x: current.x + dx, y: current.y + dy };
            const nextKey = key(next);
            if (pattern[next.y]?.[next.x] !== '.' || blocked.has(nextKey) || seen.has(nextKey)) continue;
            seen.add(nextKey);
            queue.push({ ...next, distance: current.distance + 1 });
        }
    }
    return Infinity;
}

describe('CATHEDRAL_ROOM_BLUEPRINTS', () => {
    it('has exactly the 8 cathedral blueprints defined in the planning doc', () => {
        expect(CATHEDRAL_ROOM_BLUEPRINTS).toHaveLength(8);
        const ids = CATHEDRAL_ROOM_BLUEPRINTS.map((b) => b.id);
        expect(ids).toEqual([
            'room_biomech_machine_nave',
            'room_corpospace_executive_crypt',
            'room_xenobiotic_incubation_cloister',
            'room_subdeck_cryo_exchanger',
            'room_cyber_surgical_fabrication_ward',
            'room_deep_space_astrogation_apse',
            'room_stasis_bunk_sepulcher',
            'room_quarantine_airlock_threshold'
        ]);
    });

    it.each(CATHEDRAL_ROOM_BLUEPRINTS.map((b) => [b.id, b]))('%s is internally valid', (_, build) => {
        const errors = validateRoomBuild(build);
        expect(errors).toEqual([]);
    });

    it.each(CATHEDRAL_ROOM_BLUEPRINTS.map((b) => [b.id, b]))('%s approach point sits on floor', (_, build) => {
        const point = computeApproachPoint(build);
        expect(build.pattern[point.y][point.x]).toBe('.');
    });

    it.each(CATHEDRAL_ROOM_BLUEPRINTS.map((b) => [b.id, b]))('%s fits inside a chunk with border margin', (_, build) => {
        expect(build.pattern[0].length).toBeLessThanOrEqual(CHUNK_SIZE - 6);
        expect(build.pattern.length).toBeLessThanOrEqual(CHUNK_SIZE - 6);
    });

    it('keeps every rotated blueprint internally valid through all 4 orientations', () => {
        for (const build of CATHEDRAL_ROOM_BLUEPRINTS) {
            for (let steps = 0; steps < 4; steps += 1) {
                const rotated = rotateRoomBuild(build, steps);
                expect(validateRoomBuild(rotated)).toEqual([]);
                const point = computeApproachPoint(rotated);
                expect(rotated.pattern[point.y][point.x]).toBe('.');
            }
        }
    });

    it('gives the machine nave a clear processional axis, side chapels and cross-cut', () => {
        const nave = CATHEDRAL_ROOM_BLUEPRINTS.find((build) => build.id === 'room_biomech_machine_nave');
        for (let y = 0; y < nave.pattern.length; y += 1) {
            expect(nave.pattern[y].slice(7, 14), `central axis row ${y}`).toBe('.......');
        }
        expect(nave.pattern[5]).toBe('.'.repeat(21));
        expect(nave.pattern[2]).toBe('...####.......####...');
        expect(nave.structuralAnchors.every((anchor) => nave.pattern[anchor.y][anchor.x] === '#')).toBe(true);
        expect(nave.interactionAnchors).toContainEqual(expect.objectContaining({
            id: 'conduit_bridge_controls', x: 12, y: 6
        }));
        expect(nave.rewardAnchors[0]).toMatchObject({ x: 2, y: 3 });
        expect(nave.loreAnchors[0]).toMatchObject({ x: 18, y: 3 });
        expect(nave.encounterZones[0]).toMatchObject({ x: 7, y: 5, w: 7, h: 4 });
    });

    it('gives the stasis sepulcher a clear inspection spine and optional pod/story niches', () => {
        const stasis = CATHEDRAL_ROOM_BLUEPRINTS.find((build) => build.id === 'room_stasis_bunk_sepulcher');
        expect(stasis.pattern).toEqual([
            '...............',
            '...###...###...',
            '...#.......#...',
            '...............',
            '...............',
            '...............',
            '....#.......#..',
            '....###...###..',
            '...............'
        ]);
        for (let y = 3; y <= 5; y += 1) {
            expect(stasis.pattern[y]).toBe('.'.repeat(15));
        }
        expect(computeApproachPoint(stasis)).toEqual({ x: 2, y: 4 });
        expect(stasis.signatureAnchorId).toBe('chrysalis_pod_console');
        expect(stasis.interactionAnchors).toContainEqual(expect.objectContaining({
            id: 'chrysalis_pod_console', type: 'prop_icey_thermal_pod', x: 7, y: 2
        }));
        expect(stasis.structuralAnchors.every((anchor) => stasis.pattern[anchor.y][anchor.x] === '#')).toBe(true);
        expect(stasis.rewardAnchors[0]).toMatchObject({ x: 11, y: 6 });
        expect(stasis.loreAnchors[0]).toMatchObject({ x: 13, y: 6 });
    });

    it('gives the cyber-surgical ward unequal bays joined by a fixed inspection loop', () => {
        const ward = CATHEDRAL_ROOM_BLUEPRINTS.find((build) => build.id === 'room_cyber_surgical_fabrication_ward');
        expect(ward.pattern).toEqual([
            '...................',
            '...................',
            '...................',
            '.........#####.....',
            '.........#.........',
            '.........#.........',
            '.........#.........',
            '....######.........',
            '...................',
            '...................',
            '...................'
        ]);
        const approach = computeApproachPoint(ward);
        const surgery = { x: 5, y: 5 };
        const fabricator = { x: 14, y: 5 };
        const northCrosscut = new Set();
        const southCrosscut = new Set();
        for (let x = 5; x <= 14; x += 1) {
            northCrosscut.add(`${x},2`);
            southCrosscut.add(`${x},8`);
        }
        expect(approach).toEqual({ x: 9, y: 8 });
        expect(shortestPatternPath(ward.pattern, approach, surgery))
            .toBeGreaterThan(shortestPatternPath(ward.pattern, approach, fabricator));
        expect(shortestPatternPath(ward.pattern, surgery, fabricator, northCrosscut)).toBeLessThan(Infinity);
        expect(shortestPatternPath(ward.pattern, surgery, fabricator, southCrosscut)).toBeLessThan(Infinity);
        expect(ward.signatureAnchorId).toBe('surgical_slab_controls');
        expect(ward.structuralAnchors.every((anchor) => ward.pattern[anchor.y][anchor.x] === '#')).toBe(true);
        expect(ward.interactionAnchors).toContainEqual(expect.objectContaining({
            id: 'surgical_slab_controls', type: 'prop_medical_bed', x: 5, y: 5
        }));
        expect(ward.interactionAnchors).toContainEqual(expect.objectContaining({
            id: 'fabricator_ward_terminal', type: 'prop_fabricator_workstation', x: 14, y: 5
        }));
    });

    it('gives the quarantine airlock two offset sluices around one purge gallery', () => {
        const airlock = CATHEDRAL_ROOM_BLUEPRINTS.find((build) => build.id === 'room_quarantine_airlock_threshold');
        expect(airlock.pattern).toEqual([
            '##.........##',
            '##.........##',
            '.............',
            '#######...###',
            '.............',
            '###...#######',
            '.............',
            '##.........##',
            '##.........##'
        ]);
        expect(computeApproachPoint(airlock)).toEqual({ x: 6, y: 6 });
        expect(airlock.pattern[5].slice(3, 6)).toBe('...');
        expect(airlock.pattern[3].slice(7, 10)).toBe('...');
        expect(airlock.pattern[5][6]).toBe('#');
        expect(airlock.pattern[3][6]).toBe('#');
        expect(airlock.pattern[4]).toBe('.'.repeat(13));
        expect(airlock.signatureAnchorId).toBe('airlock_purge_override');
        expect(airlock.interactionAnchors).toContainEqual(expect.objectContaining({
            id: 'airlock_purge_override', x: 1, y: 4
        }));
        expect(airlock.hazardZones[0]).toMatchObject({ x: 3, y: 4, w: 7, h: 1 });
        expect(airlock.structuralAnchors.every((anchor) => airlock.pattern[anchor.y][anchor.x] === '#')).toBe(true);

        const stamped = stampRoomBuild(airlock, () => 0.5, {
            openings: {
                north: { open: true, offset: 8 },
                south: { open: true, offset: 8 }
            }
        });
        expect(new Set(stamped.doors.map((door) => door.socketId))).toEqual(new Set(['entry', 'exit']));
    });

    it('proves all 8 cathedral blueprints are selectable from ALL_ROOM_BUILDS for live world generation', () => {
        for (const blueprint of CATHEDRAL_ROOM_BLUEPRINTS) {
            const selected = selectRoomBuild(ALL_ROOM_BUILDS, {
                family: blueprint.family,
                tier: blueprint.tierEligibility[0],
                biome: blueprint.biomeEligibility[0],
                roles: blueprint.roles,
                roll: 0.5
            });
            expect(selected, `Failed to select build for family ${blueprint.family}`).toBeDefined();
            expect(ALL_ROOM_BUILDS.some((b) => b.id === blueprint.id)).toBe(true);
        }
    });

    it.each(CATHEDRAL_ROOM_BLUEPRINTS.map((b) => [b.id, b]))(
        '%s generates a valid chunk structure via buildAuthoredRoomChunkStructure in live pipeline',
        (_id, blueprint) => {
            const result = buildAuthoredRoomChunkStructure(() => 0.5, {
                chunkX: 3,
                chunkY: 4,
                roomBuild: blueprint,
                family: blueprint.family,
                tier: blueprint.tierEligibility[0],
                biome: blueprint.biomeEligibility[0]
            });
            expect(result).not.toBeNull();
            expect(result.rooms).toHaveLength(1);
            expect(result.rooms[0].buildId).toBe(blueprint.id);
            expect(result.grid).toHaveLength(CHUNK_SIZE);
            expect(result.grid[0]).toHaveLength(CHUNK_SIZE);
            expect(result.diagnostics.discardedGenerationCount).toBe(0);
        }
    );
});
