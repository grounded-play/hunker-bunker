import { describe, expect, it } from 'vitest';
import { formatTacticalTargetName, hasVisibleTacticalRepresentation } from './tacticalTargetLabels.js';

describe('tactical target labels', () => {
    it('uses authored enemy and prop names instead of implementation types', () => {
        expect(formatTacticalTargetName('sporesnail')).toBe('SLIME SNAIL');
        expect(formatTacticalTargetName('prop_specimen_tank')).toBe('SPECIMEN TANK');
        expect(formatTacticalTargetName('prop_fabricator_workstation')).toBe('FABRICATOR WORKSTATION');
    });

    it('recognizes either a visible source or its visible 3D replacement', () => {
        expect(hasVisibleTacticalRepresentation({ parent: {}, visible: true, userData: {} })).toBe(true);
        expect(hasVisibleTacticalRepresentation({
            parent: {},
            visible: false,
            userData: { world3dRoot: { parent: {}, visible: true } }
        })).toBe(true);
        expect(hasVisibleTacticalRepresentation({ parent: {}, visible: false, userData: {} })).toBe(false);
    });
});
