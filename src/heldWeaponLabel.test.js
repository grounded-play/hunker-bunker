import { describe, expect, it } from 'vitest';
import { LoadoutManager } from './loadout.js';
import { getHeldWeaponLabel } from './heldWeaponLabel.js';

function makeStorage() {
    const map = new Map();
    return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
}
const fabricatorOf = (...ids) => ({ isFabricated: (id) => ids.includes(id) });

describe('getHeldWeaponLabel', () => {
    it('names the class gun instead of SIDEARM', () => {
        const loadout = new LoadoutManager({ storage: makeStorage() });
        expect(getHeldWeaponLabel({ loadout, classId: 'scout' })).toBe('Vector-9 Talon SMG');
        expect(getHeldWeaponLabel({ loadout, classId: 'tank' })).toBe('Siege-Breaker 50 Autocannon');
        expect(getHeldWeaponLabel({ loadout, classId: 'engineer' })).toBe('Tesla-Lock MK-IV Arc Driver');
        loadout.setArchetype('scout', 'talon_c');
        expect(getHeldWeaponLabel({ loadout, classId: 'scout' })).toBe('Talon-C Carbine');
    });

    it('names a finish that is its own gun, but not a paint called "... Weapon Skin"', () => {
        const loadout = new LoadoutManager({ storage: makeStorage() });
        loadout.state.perClass.scout.archetypeId = 'talon_c';
        loadout.state.perClass.scout.weaponSkinId = '4110';
        expect(getHeldWeaponLabel({ loadout, classId: 'scout' })).toBe("Queen's Carapace Carbine");
        loadout.state.perClass.tank.weaponSkinId = '4208';
        expect(getHeldWeaponLabel({ loadout, classId: 'tank' })).toBe('Siege-Breaker 50 Autocannon');
    });

    it('prefers a field weapon picked up this run, then a Foundry weapon', () => {
        const loadout = new LoadoutManager({ storage: makeStorage() });
        loadout.getClassLoadout('scout').craftedWeaponId = 'pulse_carbine';
        expect(getHeldWeaponLabel({ loadout, fabricator: fabricatorOf('pulse_carbine'), classId: 'scout' })).toBe('Pulse Carbine');
        expect(getHeldWeaponLabel({ loadout, fabricator: fabricatorOf(), classId: 'scout' })).toBe('Vector-9 Talon SMG');
        expect(getHeldWeaponLabel({ loadout, classId: 'scout', fieldWeaponId: 'flamethrower' })).toBe('M-70 FLAMETHROWER');
        expect(getHeldWeaponLabel({ loadout, classId: 'scout', fieldWeaponId: 'rail_marksman' })).toBe('Rail Marksman');
    });
});
