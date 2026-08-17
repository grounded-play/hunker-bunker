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

    it('equips charms, rig modules, decals, and skins', () => {
        const lo = new LoadoutManager({ storage });
        lo.equipCharm(4130);
        lo.equipRigModule(1, 4141);
        lo.equipRigModule(2, 4147);
        lo.equipDecal(2000);
        lo.equipSkin(2200);

        expect(lo.getEquippedCharmId()).toBe('4130');
        expect(lo.getEquippedRigModule(1)).toBe('4141');
        expect(lo.getEquippedRigModule(2)).toBe('4147');
        expect(lo.getEquippedDecalId()).toBe('2000');
        expect(lo.getEquippedSkinId()).toBe('2200');

        const reloaded = new LoadoutManager({ storage });
        expect(reloaded.getEquippedCharmId()).toBe('4130');
        expect(reloaded.getEquippedRigModule(1)).toBe('4141');
        expect(reloaded.getEquippedRigModule(2)).toBe('4147');
    });

    it('calculates aggregate gameplay modifiers correctly', () => {
        const lo = new LoadoutManager({ storage });
        lo.equipRigModule(1, 4141); // Magnetic Scavenger Coil (+20% magnet)
        lo.equipRigModule(2, 4140); // Cryo-Capacitor Overclock (+8% cryo duration)

        const mods = lo.getActiveModifiers();
        expect(mods.scrapMagnetRadiusBonus).toBeCloseTo(0.20);
        expect(mods.cryoDurationMultiplier).toBeCloseTo(1.08);
        expect(mods.gasDamageReduction).toBe(0);
        expect(mods.dashRefundOnMultiKill).toBe(false);

        // Swap slot 2 to Zero-Point Flux Overdrive (4147)
        lo.equipRigModule(2, 4147);
        const updatedMods = lo.getActiveModifiers();
        expect(updatedMods.dashRefundOnMultiKill).toBe(true);
    });

    it('resets persisted equipment back to default state', () => {
        const lo = new LoadoutManager({ storage });
        lo.equip('neon_smg', fakeFab('neon_smg'));
        lo.equipCharm(4130);
        lo.equipRigModule(1, 4141);
        lo.reset();

        const reloaded = new LoadoutManager({ storage });
        expect(reloaded.getEquippedId()).toBeNull();
        expect(reloaded.getEquippedCharmId()).toBeNull();
        expect(reloaded.getEquippedRigModule(1)).toBeNull();
        expect(reloaded.getEquippedLabel(fakeFab('neon_smg'))).toBe(DEFAULT_WEAPON_LABEL);
    });
});
