import { describe, expect, it } from 'vitest';
import { CATHEDRAL_ROOM_BLUEPRINTS } from './data/cathedralBlueprints.js';
import {
    validateRoomBuild,
    rotateRoomBuild,
    computeApproachPoint,
    selectRoomBuild,
    ALL_ROOM_BUILDS
} from './roomBuilds.js';
import { CHUNK_SIZE } from './tileCatalog.js';
import { buildAuthoredRoomChunkStructure } from './chunkStructure.js';

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
