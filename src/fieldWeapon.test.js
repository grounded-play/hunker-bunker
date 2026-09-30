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

describe('describeFieldWeapon', () => {
    it('reports the multipliers combat applies, for every Foundry weapon', async () => {
        const { describeFieldWeapon } = await import('./fieldWeapon.js');
        const { WEAPON_PROFILES } = await import('./data/itemCatalog.js');
        for (const id of Object.keys(WEAPON_PROFILES)) {
            const stats = describeFieldWeapon(id);
            const live = getFieldWeaponProfile(id, true);
            expect(stats.damage).toBe(live.damageMultiplier);
            expect(stats.fireRate).toBeCloseTo(1 / live.cooldownMultiplier);
            expect(stats.range).toBe(live.lifetimeMultiplier);
            expect(stats.projectiles).toBe(live.spreads.length);
        }
        expect(describeFieldWeapon('scatter_rep').projectiles).toBe(3);
        expect(describeFieldWeapon('nope')).toBeNull();
    });
});
