import { describe, expect, it, beforeEach } from 'vitest';
import {
    createOwnershipStore,
    getCatalogEntry,
    getCatalogIds,
    ITEM_TYPE,
    DEV_GRANTS_STORAGE_KEY,
    UNLOCK_ALL_STORAGE_KEY
} from './itemOwnership.js';

function memoryStorage(seed = {}) {
    const map = new Map(Object.entries(seed));
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k),
        _map: map
    };
}

describe('catalog lookup', () => {
    it('exposes every generated catalog item, not the armory subset', () => {
        // src/armoryUi.js's CATALOG_ITEMS carried 58 of the 71 generated items
        // and silently dropped the rest (4110 among them), so anything asking
        // it for a name got an id back instead.
        const ids = getCatalogIds();
        expect(ids.length).toBeGreaterThanOrEqual(71);
        expect(getCatalogEntry(4110)?.name).toBe("Queen's Carapace Carbine");
    });

    it('accepts string and numeric ids interchangeably', () => {
        expect(getCatalogEntry('4110')).toEqual(getCatalogEntry(4110));
    });

    it('carries the equip category the generated catalog lacks', () => {
        expect(getCatalogEntry(4100).type).toBe(ITEM_TYPE.SKIN);
        expect(getCatalogEntry(4114).type).toBe(ITEM_TYPE.CHASSIS);
        expect(getCatalogEntry(4120).type).toBe(ITEM_TYPE.DECAL);
        expect(getCatalogEntry(4140).type).toBe(ITEM_TYPE.MOD);
    });

    it('returns null for unknown ids rather than throwing', () => {
        expect(getCatalogEntry(999999)).toBeNull();
        expect(getCatalogEntry(null)).toBeNull();
    });
});

describe('ownership store', () => {
    let storage;
    let store;
    beforeEach(() => {
        storage = memoryStorage();
        store = createOwnershipStore({ storage });
    });

    it('owns nothing by default', () => {
        expect(store.isOwned(4100)).toBe(false);
        expect(store.getQuantity(4100)).toBe(0);
    });

    it('treats the Steam inventory as authoritative and does not persist it', () => {
        store.setSteamInventory([{ itemdefid: 4100, quantity: 2 }]);
        expect(store.isOwned(4100)).toBe(true);
        expect(store.getQuantity(4100)).toBe(2);
        // Entitlements must never be writable from local storage.
        expect(storage.getItem(DEV_GRANTS_STORAGE_KEY)).toBeNull();
    });

    it('persists dev grants and reloads them into a fresh store', () => {
        store.grantDev(4114, 1);
        const reloaded = createOwnershipStore({ storage });
        expect(reloaded.isOwned(4114)).toBe(true);
        expect(reloaded.getQuantity(4114)).toBe(1);
    });

    it('stacks quantities across both sources', () => {
        store.setSteamInventory([{ itemdefid: 4100, quantity: 1 }]);
        store.grantDev(4100, 2);
        expect(store.getQuantity(4100)).toBe(3);
    });

    it('replaces, not merges, on a later Steam inventory refresh', () => {
        store.setSteamInventory([{ itemdefid: 4100, quantity: 1 }]);
        store.setSteamInventory([{ itemdefid: 4101, quantity: 1 }]);
        expect(store.isOwned(4100)).toBe(false);
        expect(store.isOwned(4101)).toBe(true);
    });
});

describe('equip gating', () => {
    let store;
    beforeEach(() => { store = createOwnershipStore({ storage: memoryStorage() }); });

    it('refuses to equip what is not owned', () => {
        expect(store.canEquip(4100)).toBe(false);
    });

    it('allows equipping an owned item', () => {
        store.grantDev(4100, 1);
        expect(store.canEquip(4100)).toBe(true);
    });

    it('UNLOCK ALL permits equipping without granting ownership', () => {
        store.setUnlockAll(true);
        expect(store.canEquip(4100)).toBe(true);
        // "rewards locked until earned": the override must not fake ownership,
        // or dev inspection would report items the player never earned.
        expect(store.isOwned(4100)).toBe(false);
        expect(store.getQuantity(4100)).toBe(0);
    });

    it('persists the UNLOCK ALL flag', () => {
        store.setUnlockAll(true);
        const reloaded = createOwnershipStore({ storage: store.storage });
        expect(reloaded.isUnlockAll()).toBe(true);
    });

    it('never equips an id absent from the catalog, even under UNLOCK ALL', () => {
        store.setUnlockAll(true);
        expect(store.canEquip(999999)).toBe(false);
    });
});

describe('change notification', () => {
    it('notifies subscribers so a grant lands without a restart', () => {
        const store = createOwnershipStore({ storage: memoryStorage() });
        const seen = [];
        store.subscribe(() => seen.push(store.getQuantity(4100)));
        store.grantDev(4100, 1);
        store.setSteamInventory([{ itemdefid: 4100, quantity: 4 }]);
        expect(seen).toEqual([1, 5]);
    });

    it('stops notifying after unsubscribe', () => {
        const store = createOwnershipStore({ storage: memoryStorage() });
        let calls = 0;
        const off = store.subscribe(() => { calls += 1; });
        store.grantDev(4100, 1);
        off();
        store.grantDev(4101, 1);
        expect(calls).toBe(1);
    });

    it('one bad subscriber cannot block the others', () => {
        const store = createOwnershipStore({ storage: memoryStorage() });
        let reached = false;
        store.subscribe(() => { throw new Error('boom'); });
        store.subscribe(() => { reached = true; });
        expect(() => store.grantDev(4100, 1)).not.toThrow();
        expect(reached).toBe(true);
    });
});

describe('reset', () => {
    it('clears dev grants and the unlock flag but leaves unrelated keys alone', () => {
        const storage = memoryStorage({ hb_settings_volume: '0.5' });
        const store = createOwnershipStore({ storage });
        store.grantDev(4100, 1);
        store.setUnlockAll(true);

        store.reset();

        expect(store.isOwned(4100)).toBe(false);
        expect(store.isUnlockAll()).toBe(false);
        expect(storage.getItem(DEV_GRANTS_STORAGE_KEY)).toBeNull();
        expect(storage.getItem(UNLOCK_ALL_STORAGE_KEY)).toBeNull();
        // Settings are explicitly not economy state.
        expect(storage.getItem('hb_settings_volume')).toBe('0.5');
    });

    it('notifies subscribers on reset', () => {
        const store = createOwnershipStore({ storage: memoryStorage() });
        let calls = 0;
        store.grantDev(4100, 1);
        store.subscribe(() => { calls += 1; });
        store.reset();
        expect(calls).toBe(1);
    });
});

describe('corrupt storage', () => {
    it('survives unparseable dev-grant data instead of failing to boot', () => {
        const storage = memoryStorage({ [DEV_GRANTS_STORAGE_KEY]: '{not json' });
        const store = createOwnershipStore({ storage });
        expect(store.isOwned(4100)).toBe(false);
    });

    it('ignores non-numeric and unknown ids in persisted grants', () => {
        const storage = memoryStorage({
            [DEV_GRANTS_STORAGE_KEY]: JSON.stringify({ abc: 2, 999999: 1, 4100: 3 })
        });
        const store = createOwnershipStore({ storage });
        expect(store.getQuantity(4100)).toBe(3);
        expect(store.isOwned(999999)).toBe(false);
    });

    it('works with no storage at all', () => {
        const store = createOwnershipStore({ storage: null });
        store.grantDev(4100, 1);
        expect(store.isOwned(4100)).toBe(true);
    });
});

// docs/armory-vault-progression-audit-2026-08-23.md A3. The Steam catalog is
// not the whole item space: the Armory's chassis lists also carry achievement
// reward ids (5001-5012, from ACHIEVEMENT_COSMETIC_REWARDS) and 30 community
// skins with string ids (comm_*). Neither appears in any catalog, so today
// they render as a bare id, and a catalog-only lookup would drop them from the
// dropdown entirely.
describe('non-Steam item sources', () => {
    it('catalogues achievement reward cosmetics with a real name', () => {
        const entry = getCatalogEntry('5001');
        expect(entry).not.toBeNull();
        expect(entry.name).toMatch(/GHOST/i);
        expect(entry.type).toBe(ITEM_TYPE.CHASSIS);
    });

    it('catalogues community skins by their string id', () => {
        const entry = getCatalogEntry('comm_scout_foxhole_shadow');
        expect(entry).not.toBeNull();
        expect(entry.name).toContain('Foxhole Shadow');
        expect(entry.type).toBe(ITEM_TYPE.CHASSIS);
    });

    it('keeps string ids distinct instead of coercing them to NaN', () => {
        expect(getCatalogEntry('comm_scout_abg')).not.toBeNull();
        expect(getCatalogEntry('comm_not_a_real_skin')).toBeNull();
    });

    it('treats default-unlocked community skins as owned without any grant', () => {
        const store = createOwnershipStore({ storage: null });
        expect(store.isOwned('comm_scout_foxhole_shadow')).toBe(true);
        expect(store.canEquip('comm_scout_foxhole_shadow')).toBe(true);
    });

    it('does not treat achievement rewards as owned until the achievement unlocks them', () => {
        const store = createOwnershipStore({ storage: null });
        expect(store.isOwned('5001')).toBe(false);

        store.setExternalOwnership('achievements', ['5001']);
        expect(store.isOwned('5001')).toBe(true);
        expect(store.isOwned('5002')).toBe(false);
    });

    it('replaces an external source wholesale so a revoked unlock disappears', () => {
        const store = createOwnershipStore({ storage: null });
        store.setExternalOwnership('achievements', ['5001', '5002']);
        store.setExternalOwnership('achievements', ['5002']);
        expect(store.isOwned('5001')).toBe(false);
        expect(store.isOwned('5002')).toBe(true);
    });

    it('keeps external sources independent of each other', () => {
        const store = createOwnershipStore({ storage: null });
        store.setExternalOwnership('achievements', ['5001']);
        store.setExternalOwnership('seasonPass', ['5002']);
        store.setExternalOwnership('achievements', []);
        expect(store.isOwned('5002')).toBe(true);
    });

    it('notifies subscribers when an external source changes', () => {
        const store = createOwnershipStore({ storage: null });
        let calls = 0;
        store.subscribe(() => { calls += 1; });
        store.setExternalOwnership('achievements', ['5001']);
        expect(calls).toBe(1);
    });

    it('does not persist external ownership — its subsystem stays authoritative', () => {
        const storage = memoryStorage();
        const store = createOwnershipStore({ storage });
        store.setExternalOwnership('achievements', ['5001']);
        const reloaded = createOwnershipStore({ storage });
        expect(reloaded.isOwned('5001')).toBe(false);
    });

    it('reset clears external sources too but leaves default-unlocked items owned', () => {
        const store = createOwnershipStore({ storage: null });
        store.setExternalOwnership('achievements', ['5001']);
        store.reset();
        expect(store.isOwned('5001')).toBe(false);
        // Default-unlocked is a property of the catalog, not earned state.
        expect(store.isOwned('comm_scout_foxhole_shadow')).toBe(true);
    });
});
