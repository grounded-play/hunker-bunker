import { describe, expect, it } from 'vitest';
import {
    CHASSIS_BODY_VARIANTS,
    decodeChassisChoice,
    encodeChassisChoice,
    expandChassisBodyOptions,
    resolveChassisModelUrl
} from './chassisBodies.js';

const BASE = { '5001': '/base-5001.glb', '5003': '/base-5003.glb' };

describe('chassis body variants', () => {
    it('ships 5001 Ghost Runner with a female and a male body, female first', () => {
        const bodies = CHASSIS_BODY_VARIANTS['5001'].map((v) => v.body);
        expect(bodies).toEqual(['female', 'male']);
        expect(CHASSIS_BODY_VARIANTS['5001'][1].url).toBe('/3d/runtime/new3ds/chassis_scout_ghost_runner_male.glb');
    });

    it('encodes the default body as the bare item id so saved loadouts and ownership keep working', () => {
        expect(encodeChassisChoice('5001', 'female')).toBe('5001');
        expect(encodeChassisChoice('5001', null)).toBe('5001');
        expect(encodeChassisChoice('5001', 'male')).toBe('5001:male');
        expect(encodeChassisChoice('5003', 'male')).toBe('5003');
        expect(encodeChassisChoice(null, 'male')).toBe('');
    });

    it('decodes a picker value back to the item id and body', () => {
        expect(decodeChassisChoice('5001:male')).toEqual({ id: '5001', body: 'male' });
        expect(decodeChassisChoice('5001')).toEqual({ id: '5001', body: null });
        expect(decodeChassisChoice('5001:nonsense')).toEqual({ id: '5001', body: null });
        expect(decodeChassisChoice('')).toEqual({ id: null, body: null });
        expect(decodeChassisChoice('frame:talon')).toEqual({ id: 'frame:talon', body: null });
    });

    it('resolves the body model, falling back to the item model for the default or an unknown body', () => {
        expect(resolveChassisModelUrl('5001', 'male', BASE)).toBe('/3d/runtime/new3ds/chassis_scout_ghost_runner_male.glb');
        expect(resolveChassisModelUrl('5001', null, BASE)).toBe('/base-5001.glb');
        expect(resolveChassisModelUrl('5003', 'male', BASE)).toBe('/base-5003.glb');
        expect(resolveChassisModelUrl(null, 'male', BASE)).toBeNull();
    });

    it('expands a variant item into one picker option per body, keeping lock state', () => {
        const options = [
            { id: 5001, name: 'Ghost Runner', disabled: true, selected: false },
            { id: 5003, name: 'Cartographer', disabled: false, selected: false }
        ];
        const out = expandChassisBodyOptions(options, '5001:male', (body) => body.toUpperCase());
        expect(out.map((o) => o.id)).toEqual(['5001', '5001:male', 5003]);
        expect(out[0]).toMatchObject({ name: 'Ghost Runner — FEMALE', disabled: true, selected: false });
        // The equipped body stays selectable even if ownership lapsed (buildEquipOptions' rule).
        expect(out[1]).toMatchObject({ name: 'Ghost Runner — MALE', disabled: false, selected: true });
    });
});
