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
        expect(roomPracticalLightPlacement(plan.slice(1))).toBeNull();
        expect(roomPracticalLightPlacement()).toBeNull();
    });
});
