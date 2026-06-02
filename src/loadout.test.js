import { describe, it, expect, beforeEach } from 'vitest';
import { LoadoutManager, DEFAULT_WEAPON_LABEL } from './loadout.js';
import { getRecipe } from './fabricator.js';

function makeStorage() {
    const map = new Map();
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k)
    };
}

// Fabricator stand-in: only the ids passed are "fabricated".
function fakeFab(...fabricatedIds) {
    const set = new Set(fabricatedIds);
    return { isFabricated: (id) => set.has(id) };
}

describe('LoadoutManager', () => {
    let storage;
    beforeEach(() => { storage = makeStorage(); });

    it('defaults to no equipped weapon -> SIDEARM label', () => {
        const lo = new LoadoutManager({ storage });
        expect(lo.getEquippedId()).toBeNull();
        expect(lo.getEquippedLabel(fakeFab())).toBe(DEFAULT_WEAPON_LABEL);
    });

    it('refuses to equip an unfabricated weapon', () => {
        const lo = new LoadoutManager({ storage });
        expect(lo.equip('pulse_carbine', fakeFab())).toBe(false);
        expect(lo.getEquippedId()).toBeNull();
    });

    it('equips a fabricated weapon and reports its name', () => {
        const lo = new LoadoutManager({ storage });
        expect(lo.equip('pulse_carbine', fakeFab('pulse_carbine'))).toBe(true);
        expect(lo.getEquippedId()).toBe('pulse_carbine');
        expect(lo.getEquippedLabel(fakeFab('pulse_carbine'))).toBe(getRecipe('pulse_carbine').name);
    });

    it('refuses non-weapon recipes', () => {
        const lo = new LoadoutManager({ storage });
        // salvage_drill is a TOOL, exo_plating a MODULE
        expect(lo.equip('salvage_drill', fakeFab('salvage_drill'))).toBe(false);
        expect(lo.equip('exo_plating', fakeFab('exo_plating'))).toBe(false);
    });

    it('persists equipped weapon across reloads', () => {
        const lo = new LoadoutManager({ storage });
        lo.equip('neon_smg', fakeFab('neon_smg'));
        const reloaded = new LoadoutManager({ storage });
        expect(reloaded.getEquippedId()).toBe('neon_smg');
    });

    it('falls back to SIDEARM if the equipped weapon is no longer fabricated', () => {
        const lo = new LoadoutManager({ storage });
        lo.equip('neon_smg', fakeFab('neon_smg'));
        // e.g. progress was wiped — fabricator no longer reports it
        expect(lo.getEquippedLabel(fakeFab())).toBe(DEFAULT_WEAPON_LABEL);
    });

    it('clears the equipped weapon when passed null', () => {
        const lo = new LoadoutManager({ storage });
        lo.equip('neon_smg', fakeFab('neon_smg'));
        expect(lo.equip(null)).toBe(true);
        expect(lo.getEquippedId()).toBeNull();
    });
});
