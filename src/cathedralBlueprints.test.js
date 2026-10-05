import { describe, expect, it } from 'vitest';
import { CATHEDRAL_ROOM_BLUEPRINTS } from './data/cathedralBlueprints.js';
import {
    validateRoomBuild,
    rotateRoomBuild,
    computeApproachPoint
} from './roomBuilds.js';
import { CHUNK_SIZE } from './tileCatalog.js';

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
});
