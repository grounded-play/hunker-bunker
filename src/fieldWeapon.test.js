import { describe, expect, it } from 'vitest';
import { getFieldWeaponProfile } from './fieldWeapon.js';

describe('fabricated field weapon profiles', () => {
    it('gives every Foundry weapon a distinct live projectile profile', () => {
        const ids = ['mk1_sidearm', 'pulse_carbine', 'scatter_rep', 'rail_marksman', 'neon_smg', 'cryo_lance'];
        const profiles = ids.map((id) => getFieldWeaponProfile(id, true));
        expect(profiles.every(Boolean)).toBe(true);
        expect(new Set(profiles.map((profile) => `${profile.damageMultiplier}:${profile.cooldownMultiplier}:${profile.spreads.join(',')}`)).size).toBe(ids.length);
    });

    it('does not apply a profile before fabrication or for an unknown concept id', () => {
        expect(getFieldWeaponProfile('rail_marksman', false)).toBeNull();
        expect(getFieldWeaponProfile('concept_only', true)).toBeNull();
    });
});
