import { describe, expect, it } from 'vitest';
import { loadoutMicroclipBases } from './loadoutMicroclips.js';

describe('loadout microclip sequence', () => {
    it('plays only shipped choices in weapon, badge, charm order', () => {
        const loadout = {
            state: { suit: { decalId: '2003' } },
            getClassLoadout: () => ({ archetypeId: 'talon', weaponSkinId: '4100', charmId: '4132' }),
            getEquippedDecalId: () => '2003'
        };
        const shipped = new Set([
            'loadout-scout-charm-4132',
            'loadout-scout-weapon-4100',
            'loadout-scout-badge-2003'
        ]);
        expect(loadoutMicroclipBases(loadout, 'SCOUT', shipped)).toEqual([
            'loadout/loadout-scout-weapon-4100',
            'loadout/loadout-scout-badge-2003',
            'loadout/loadout-scout-charm-4132'
        ]);
    });

    it('uses the factory frame and skips missing assets or empty slots', () => {
        const loadout = { getClassLoadout: () => ({ archetypeId: 'siege_breaker' }) };
        expect(loadoutMicroclipBases(loadout, 'TANK', new Set([
            'loadout-tank-weapon-frame-siege_breaker'
        ]))).toEqual(['loadout/loadout-tank-weapon-frame-siege_breaker']);
        expect(loadoutMicroclipBases(loadout, 'TANK', new Set())).toEqual([]);
    });
});
