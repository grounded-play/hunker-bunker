import { describe, expect, it } from 'vitest';
import { ANCHOR_LIGHT_PALETTE, anchorLightFor, anchorPaletteFor, roomPracticalLightPlacement } from './anchorPracticalLight.js';

describe('anchor practical light (lived-in world M4)', () => {
    it('maps the key-art anchors to cyan, amber and green', () => {
        expect(anchorPaletteFor('prop_oxygen_bottle_cascade_rack')).toBe('cyan');
        expect(anchorPaletteFor('prop_coolant_drum_leaking_pool')).toBe('cyan');
        expect(anchorPaletteFor('prop_liturgical_terminal_lectern')).toBe('amber');
        expect(anchorPaletteFor('prop_votive_candle_shrine')).toBe('amber');
        expect(anchorPaletteFor('prop_biomech_sphincter_hatch_vent')).toBe('green');
        expect(anchorPaletteFor('prop_biomech_tracheal_wall_pipe')).toBe('green');
        expect(anchorPaletteFor('life_water_still')).toBe('cyan');
        expect(anchorPaletteFor('prop_medical_bed')).toBe('cyan');
        expect(anchorPaletteFor('prop_tesla_coil_node')).toBe('cyan');
        expect(anchorPaletteFor('prop_fabricator_workstation')).toBe('cyan');
        expect(anchorPaletteFor('prop_cyber_junction')).toBe('cyan');
        expect(anchorPaletteFor('false_cache prop_bunker_supplies')).toBe('warning');
        expect(anchorPaletteFor('prop_laser_trap_emitter')).toBe('warning');
        expect(anchorPaletteFor('reward_vault prop_bunker_supplies')).toBe('amber');
        expect(anchorPaletteFor('prop_pipe_organ_heat_exchanger')).toBe('amber');
        expect(anchorPaletteFor('prop_ammo_crate_stack')).toBe('amber');
        expect(anchorPaletteFor('life_barrel_heater')).toBe('amber');
        expect(anchorPaletteFor('life_pheromone_censer')).toBe('amber');
        expect(anchorPaletteFor('prop_bunker_supplies')).toBeNull();
        expect(anchorLightFor('prop_votive_candle_shrine')).toEqual({ palette: 'amber', ...ANCHOR_LIGHT_PALETTE.amber });
    });

    it('lights at most one anchor per room: the signature, and only with a palette', () => {
        const plan = [
            { id: 'r:signature:0', kind: 'signature', type: 'prop_oxygen_bottle_cascade_rack' },
            { id: 'r:large:1', kind: 'large', type: 'prop_liturgical_terminal_lectern' },
            { id: 'r:large:2', kind: 'large', type: 'prop_biomech_incubator' }
        ];
        expect(roomPracticalLightPlacement(plan)).toEqual({
            placementId: 'r:signature:0',
            light: { palette: 'cyan', ...ANCHOR_LIGHT_PALETTE.cyan }
        });
        expect(roomPracticalLightPlacement([{ id: 'x', kind: 'signature', type: 'prop_bunker_supplies' }, ...plan.slice(1)])).toBeNull();
        expect(roomPracticalLightPlacement([
            { id: 'trap:signature:0', anchorId: 'false_cache', kind: 'signature', type: 'prop_bunker_supplies' }
        ])).toEqual({
            placementId: 'trap:signature:0',
            light: { palette: 'warning', ...ANCHOR_LIGHT_PALETTE.warning }
        });
        expect(roomPracticalLightPlacement(plan.slice(1))).toBeNull();
        expect(roomPracticalLightPlacement()).toBeNull();
    });
});
