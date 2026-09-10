import { describe, expect, it } from 'vitest';
import {
    WEAPON_SHEENS,
    reconcileSheenUnlocks,
    SHEEN_UNLOCK_BY_MILESTONE,
    getUnlockedSheenIds,
    getSelectedSheen,
    selectSheen,
    unlockSheen,
    unlockSheenForMilestone,
    unlockAllSheens
} from './weaponSheens.js';

function memoryStorage(initial = {}) {
    const map = new Map(Object.entries(initial));
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k)
    };
}

describe('weaponSheens', () => {
    it('always leaves the default sheen available', () => {
        expect(getUnlockedSheenIds(memoryStorage()).has(0)).toBe(true);
        expect(getSelectedSheen(memoryStorage()).id).toBe(0);
    });

    it('recovers from a corrupted record rather than leaving nothing equippable', () => {
        const storage = memoryStorage({ hb_weapon_sheens_v1: 'not json' });
        expect([...getUnlockedSheenIds(storage)]).toEqual([0]);
        expect(getSelectedSheen(storage).id).toBe(0);
    });

    it('refuses to select a locked sheen', () => {
        const storage = memoryStorage();
        expect(selectSheen(5, storage)).toBeNull();
        expect(getSelectedSheen(storage).id).toBe(0);
    });

    it('selects a sheen once it is unlocked, and remembers it', () => {
        const storage = memoryStorage();
        expect(unlockSheen(5, storage)).toBe(true);
        expect(selectSheen(5, storage)?.id).toBe(5);
        expect(getSelectedSheen(storage).id).toBe(5);
    });

    it('unlocks from a milestone key and ignores unknown ones', () => {
        const storage = memoryStorage();
        expect(unlockSheenForMilestone('achievement:kin', storage)).toBe(true);
        expect(getUnlockedSheenIds(storage).has(SHEEN_UNLOCK_BY_MILESTONE['achievement:kin'])).toBe(true);
        expect(unlockSheenForMilestone('achievement:not_a_thing', storage)).toBe(false);
    });

    it('never unlocks the default or an out-of-range id', () => {
        const storage = memoryStorage();
        expect(unlockSheen(0, storage)).toBe(false);
        expect(unlockSheen(999, storage)).toBe(false);
        expect(unlockSheen(-1, storage)).toBe(false);
    });

    it('does not re-report an unlock that already happened', () => {
        const storage = memoryStorage();
        expect(unlockSheen(3, storage)).toBe(true);
        expect(unlockSheen(3, storage)).toBe(false);
    });

    it('unlocks everything for the dev flag', () => {
        const storage = memoryStorage();
        unlockAllSheens(storage);
        expect(getUnlockedSheenIds(storage).size).toBe(WEAPON_SHEENS.length);
    });

    it('gives every sheen a distinct id, name and colour', () => {
        expect(new Set(WEAPON_SHEENS.map((s) => s.id)).size).toBe(WEAPON_SHEENS.length);
        expect(new Set(WEAPON_SHEENS.map((s) => s.name)).size).toBe(WEAPON_SHEENS.length);
        expect(new Set(WEAPON_SHEENS.map((s) => s.color)).size).toBe(WEAPON_SHEENS.length);
        for (const sheen of WEAPON_SHEENS) expect(sheen.color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('maps every milestone to a real sheen', () => {
        const ids = new Set(WEAPON_SHEENS.map((s) => s.id));
        for (const id of Object.values(SHEEN_UNLOCK_BY_MILESTONE)) expect(ids.has(id)).toBe(true);
    });
});


it('backfills sheens from real persisted career and world records without changing selection', () => {
    const storage = memoryStorage();
    reconcileSheenUnlocks({ achievements: { scouts_honor: { at: 123 }, hunkered: { at: 456 } },
        world: { dishBuilt: true, queenStatus: 'killed', camps: [{ aided: true }, { status: 'turned' }] } }, storage);
    expect([...getUnlockedSheenIds(storage)].sort((a,b) => a-b)).toEqual([0, 1, 2, 3, 4, 10, 11]);
    expect(getSelectedSheen(storage).id).toBe(0);
    expect(selectSheen(10, storage).name).toBe('VOID ANODIZE');
    reconcileSheenUnlocks({}, storage);
    expect(getSelectedSheen(storage).id).toBe(10);
});
