// Single source of truth for "what exists" and "what does the player own".
//
// docs/armory-vault-progression-audit-2026-08-23.md, findings F1-F3. Before
// this module there were three catalogs and no ownership query:
//
//   * src/data/steamItemCatalog.js — generated from the Steam schema, 71 items,
//     authoritative for name/rarity/art, but carries no equip category.
//   * src/armoryUi.js CATALOG_ITEMS — a hand-maintained 58-item subset that
//     added `type` and silently dropped 13 items (4110, a legendary weapon
//     finish, among them), so the Armory rendered a raw id where a name belonged.
//   * src/steamVaultUi.js — its own module-local `vaultItems` array.
//
// and ownership existed only as two copies of "strip equips I no longer own"
// (steamVaultUi.reconcileCosmeticsOwnership + loadout.reconcileOwnership),
// both reactive, neither answerable. The Armory therefore let you equip
// anything it listed.
import { STEAM_ITEM_CATALOG } from './data/steamItemCatalog.js';
import { COMMUNITY_SKINS } from './data/communitySkins.js';
import { ACHIEVEMENT_COSMETIC_REWARDS, ACHIEVEMENT_DEFS } from './achievements.js';

export const DEV_GRANTS_STORAGE_KEY = 'hb_dev_item_grants_v1';
export const UNLOCK_ALL_STORAGE_KEY = 'hb_dev_unlock_all_cosmetics_v1';
export const QA_GRANT_RECEIPTS_STORAGE_KEY = 'hb_qa_inventory_receipts_v1';

export const ITEM_TYPE = Object.freeze({
    SKIN: 'skin',
    CHASSIS: 'chassis',
    DECAL: 'decal',
    CHARM: 'charm',
    MOD: 'mod',
    HUD: 'hud',
    VFX: 'vfx',
    AUDIO: 'audio',
    MATERIAL: 'material',
    REAGENT: 'reagent',
    SHARD: 'shard',
    CONTAINER: 'container',
    KEY: 'key',
    KEY_BUNDLE: 'key_bundle'
});

export const EQUIPPABLE_ITEM_TYPES = Object.freeze([
    ITEM_TYPE.SKIN, ITEM_TYPE.CHASSIS, ITEM_TYPE.DECAL, ITEM_TYPE.CHARM,
    ITEM_TYPE.MOD, ITEM_TYPE.HUD, ITEM_TYPE.VFX, ITEM_TYPE.AUDIO
]);

// Equip category per itemdefid. The generated Steam catalog has no notion of
// this — it is a storefront schema — so the classification lives here and is
// merged over it at lookup time.
const TYPE_BY_ID = new Map();
function classify(type, ids) {
    for (const id of ids) TYPE_BY_ID.set(id, type);
}
classify(ITEM_TYPE.AUDIO, [4148, 4149]);
classify(ITEM_TYPE.CHARM, [4130, 4131, 4132, 4133, 4134, 4135, 4136, 4137, 4138, 4139, 4202, 4209, 4216, 4223, 4230, 4237]);
classify(ITEM_TYPE.CHASSIS, [4112, 4113, 4114, 4115, 4116, 4117, 4118, 4119, 4200, 4207, 4214, 4221, 4228, 4235]);
classify(ITEM_TYPE.CONTAINER, [4000]);
classify(ITEM_TYPE.DECAL, [2000, 2001, 2002, 2003, 2004, 2100, 4120, 4121, 4122, 4123, 4124, 4125, 4126, 4127, 4128, 4129, 4203, 4210, 4217, 4224, 4231, 4238]);
classify(ITEM_TYPE.HUD, [4150, 4151, 4206, 4213, 4220, 4227, 4234, 4241]);
classify(ITEM_TYPE.KEY, [4001, 4154]);
classify(ITEM_TYPE.KEY_BUNDLE, [4155]);
classify(ITEM_TYPE.MATERIAL, [1000, 1100]);
classify(ITEM_TYPE.MOD, [4140, 4141, 4142, 4143, 4144, 4145, 4146, 4147, 4160, 4161, 4162, 4163, 4164, 4165, 4166, 4167]);
classify(ITEM_TYPE.REAGENT, [4156, 4157, 4158]);
classify(ITEM_TYPE.SHARD, [4159]);
classify(ITEM_TYPE.SKIN, [2200, 4100, 4101, 4102, 4103, 4104, 4105, 4106, 4107, 4108, 4109, 4110, 4111, 4201, 4208, 4215, 4222, 4229, 4236]);
classify(ITEM_TYPE.VFX, [4152, 4153, 4204, 4205, 4211, 4212, 4218, 4219, 4225, 4226, 4232, 4233, 4239, 4240]);

// Ids are not uniformly numeric: Steam itemdefids are, achievement rewards are
// numeric-looking strings ('5001'), and community skins are opaque strings
// ('comm_scout_abg'). Normalising everything to Number would collapse the last
// group to NaN, so numeric-looking ids become numbers and the rest stay strings.
function toId(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const text = String(value).trim();
    if (text === '') return null;
    if (/^-?\d+$/.test(text)) return Number(text);
    return text;
}

const MERGED_CATALOG = new Map();
// Items owned from the outset rather than earned (community skins ship
// unlocked). Kept separate from the ownership store because it is a property
// of the item, not of a player's progress, and must survive a reset.
const DEFAULT_OWNED = new Set();

for (const [key, entry] of Object.entries(STEAM_ITEM_CATALOG)) {
    const id = Number(key);
    MERGED_CATALOG.set(id, Object.freeze({
        ...entry,
        itemdefid: id,
        source: 'steam',
        type: TYPE_BY_ID.get(id) ?? null
    }));
}

// Achievement reward cosmetics (5001-5012). They appear in
// CLASS_CHASSIS_SKINS and so are already offered by the Armory, but exist in no
// catalog -- today they render as the literal string "5001". Named from the
// achievement that grants them.
const ACHIEVEMENT_TITLE_BY_KEY = new Map(
    (ACHIEVEMENT_DEFS ?? []).map((def) => [def.key, def.title])
);
for (const [achievementKey, rewardId] of Object.entries(ACHIEVEMENT_COSMETIC_REWARDS ?? {})) {
    const id = toId(rewardId);
    if (id === null || MERGED_CATALOG.has(id)) continue;
    const title = ACHIEVEMENT_TITLE_BY_KEY.get(achievementKey) ?? achievementKey.replace(/_/g, ' ').toUpperCase();
    MERGED_CATALOG.set(id, Object.freeze({
        itemdefid: id,
        name: `${title} ${{ '5002': 'Carbine', '5006': 'Autocannon', '5009': 'Arc Driver', '5010': 'Arc Driver' }[String(id)] ?? 'Chassis'}`,
        rarity: 'rare',
        type: ['5002', '5006', '5009', '5010'].includes(String(id)) ? ITEM_TYPE.SKIN : ITEM_TYPE.CHASSIS,
        source: 'achievement',
        achievementKey
    }));
}

// Community chassis skins (comm_*), 30 of them, all shipping unlocked.
for (const skin of COMMUNITY_SKINS ?? []) {
    const id = toId(skin?.id);
    if (id === null || MERGED_CATALOG.has(id)) continue;
    MERGED_CATALOG.set(id, Object.freeze({
        itemdefid: id,
        name: skin.name ?? String(id),
        rarity: skin.rarity ?? 'common',
        type: ITEM_TYPE.CHASSIS,
        source: 'community',
        classId: skin.classId ?? null,
        glbUrl: skin.glbUrl ?? null
    }));
    if (skin?.isUnlockedDefault !== false) DEFAULT_OWNED.add(id);
}

// Earned Rig Modules (4160-4167) — Track A hardware, earned in-game, never sold on Steam Market
export const RIG_MODULE_DEFS = Object.freeze([
    { itemdefid: 4160, name: 'Ballast Plating', rarity: 'uncommon', type: ITEM_TYPE.MOD, source: 'earned', unlockPath: 'shells', cost: '150 Shells', desc: '+2 Max HP, −15% Move Speed' },
    { itemdefid: 4161, name: 'Scrap Furnace', rarity: 'uncommon', type: ITEM_TYPE.MOD, source: 'earned', unlockPath: 'shells', cost: '150 Shells', desc: 'Destroyed Props Drop Salvage, −10% Fire Rate' },
    { itemdefid: 4162, name: "Queen's Bane", rarity: 'legendary', type: ITEM_TYPE.MOD, source: 'achievement', unlockPath: 'achievement:queen', achievementKey: 'act2:queenKilled', desc: '+25% Boss Damage, −10% Other Damage' },
    { itemdefid: 4163, name: 'Archivist Lens', rarity: 'rare', type: ITEM_TYPE.MOD, source: 'achievement', unlockPath: 'achievement:lore', achievementKey: 'achievement:archivist_lore', desc: 'Lore Drops Grant Salvage, −1 Clip Size' },
    { itemdefid: 4164, name: 'Shard Conduit', rarity: 'rare', type: ITEM_TYPE.MOD, source: 'earned', unlockPath: 'shards', cost: '25 Deep Core Shards', desc: '+1 Relic Rarity Tier, −10% Max O₂' },
    { itemdefid: 4165, name: 'Duplicate Refiner', rarity: 'epic', type: ITEM_TYPE.MOD, source: 'earned', unlockPath: 'shards', cost: '50 Deep Core Shards', desc: 'Duplicate Relics Grant Shards, −15% Salvage' },
    { itemdefid: 4166, name: 'Pressure Seal', rarity: 'epic', type: ITEM_TYPE.MOD, source: 'depth', unlockPath: 'depth:4', requiredDepth: 4, desc: 'O₂ Drains 25% Slower, −40% Healing' },
    { itemdefid: 4167, name: 'Deep Anchor', rarity: 'legendary', type: ITEM_TYPE.MOD, source: 'depth', unlockPath: 'depth:6', requiredDepth: 6, desc: 'Ring Crossings Free O₂, Spawns Elite' }
]);

for (const mod of RIG_MODULE_DEFS) {
    MERGED_CATALOG.set(mod.itemdefid, Object.freeze(mod));
    DEFAULT_OWNED.add(mod.itemdefid);
}

// Tactical voice packs (4148 Soviet Sub-Commander, 4149 AURA) unlocked by default
DEFAULT_OWNED.add(4148);
DEFAULT_OWNED.add(4149);

export function getCatalogEntry(itemdefid) {
    const id = toId(itemdefid);
    if (id === null) return null;
    return MERGED_CATALOG.get(id) ?? null;
}

export function getCatalogIds() {
    return [...MERGED_CATALOG.keys()];
}

export function getCatalogIdsByType(type) {
    return [...MERGED_CATALOG.values()].filter((e) => e.type === type).map((e) => e.itemdefid);
}

function readJson(storage, key) {
    if (!storage) return null;
    try {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        // Corrupt local data must never stop the game booting.
        return null;
    }
}

/**
 * @param storage  Anything with getItem/setItem/removeItem. Injectable so tests
 *                 never touch a real localStorage, and so a headless/server
 *                 context can pass null.
 */
export function createOwnershipStore({ storage = null, allowLocalInventory = true } = {}) {
    let localInventoryAllowed = Boolean(allowLocalInventory);
    // Steam-side entitlements. Deliberately NOT persisted: writing them to
    // local storage would make entitlement forgeable with a devtools one-liner.
    // They are re-fetched from the inventory service on every boot.
    let steamQuantities = new Map();
    // Sandbox/dev grants. Persisted, because in a browser dev session there is
    // no inventory service to re-fetch from and a grant that vanished on reload
    // was findings F3.
    let devQuantities = new Map();
    let unlockAll = false;
    // Ownership asserted by another subsystem (achievements, season pass...).
    // Keyed by source so each can be replaced wholesale without disturbing the
    // others. Not persisted: the owning subsystem stays authoritative, exactly
    // as the Steam inventory does.
    let externalOwnership = new Map();
    const subscribers = new Set();

    function hydrateLocalInventory() {
        if (!localInventoryAllowed) return;
        const persistedGrants = readJson(storage, DEV_GRANTS_STORAGE_KEY);
        if (persistedGrants && typeof persistedGrants === 'object') {
        for (const [key, qty] of Object.entries(persistedGrants)) {
            const id = toId(key);
            const amount = Number(qty);
            // Drop anything that is not a real catalogued item, so a stale or
            // hand-edited file cannot inject phantom ids into the owned set.
            if (id === null || !MERGED_CATALOG.has(id)) continue;
            if (!Number.isFinite(amount) || amount <= 0) continue;
            devQuantities.set(id, amount);
        }
        }
        unlockAll = readJson(storage, UNLOCK_ALL_STORAGE_KEY) === true;
    }
    hydrateLocalInventory();

    function persistDevGrants() {
        if (!storage) return;
        try {
            storage.setItem(DEV_GRANTS_STORAGE_KEY, JSON.stringify(Object.fromEntries(devQuantities)));
        } catch {
            // Quota/private-mode failures are not worth breaking a grant over.
        }
    }

    function notify() {
        for (const fn of [...subscribers]) {
            try {
                fn();
            } catch {
                // One broken listener must not stop the rest from updating.
            }
        }
    }

    const store = {
        storage,

        setSteamInventory(inventory = []) {
            // Replaces rather than merges: the inventory service response is a
            // full picture, so a consumed/traded item has to be able to leave.
            steamQuantities = new Map();
            for (const item of Array.isArray(inventory) ? inventory : []) {
                const id = toId(item?.itemdefid);
                if (id === null) continue;
                const qty = Number(item?.quantity ?? 1);
                if (!Number.isFinite(qty) || qty <= 0) continue;
                steamQuantities.set(id, (steamQuantities.get(id) ?? 0) + qty);
            }
            notify();
        },

        grantDev(itemdefid, quantity = 1) {
            if (!localInventoryAllowed) return false;
            const id = toId(itemdefid);
            const amount = Number(quantity);
            if (id === null || !MERGED_CATALOG.has(id)) return false;
            if (!Number.isFinite(amount) || amount <= 0) return false;
            devQuantities.set(id, (devQuantities.get(id) ?? 0) + amount);
            persistDevGrants();
            notify();
            return true;
        },

        setDevInventory(inventory = []) {
            if (!localInventoryAllowed) return false;
            devQuantities = new Map();
            for (const item of Array.isArray(inventory) ? inventory : []) {
                const id = toId(item?.itemdefid);
                const amount = Number(item?.quantity ?? 1);
                if (id === null || !MERGED_CATALOG.has(id) || !Number.isFinite(amount) || amount <= 0) continue;
                devQuantities.set(id, (devQuantities.get(id) ?? 0) + amount);
            }
            persistDevGrants();
            notify();
            return true;
        },

        setLocalInventoryAllowed(enabled) {
            const next = Boolean(enabled);
            if (next === localInventoryAllowed) return localInventoryAllowed;
            localInventoryAllowed = next;
            if (next) hydrateLocalInventory();
            else {
                devQuantities = new Map();
                unlockAll = false;
            }
            notify();
            return localInventoryAllowed;
        },

        isLocalInventoryAllowed() {
            return localInventoryAllowed;
        },

        grantDevSet(setName = 'all_equippables', quantity = 1) {
            if (!localInventoryAllowed) return { ok: false, reason: 'qa_tools_disabled', granted: [] };
            const amount = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
            const setIds = setName === 'keys'
                ? [...getCatalogIdsByType(ITEM_TYPE.KEY), ...getCatalogIdsByType(ITEM_TYPE.KEY_BUNDLE)]
                : setName === 'marketplace'
                    ? getCatalogIds().filter((id) => getCatalogEntry(id)?.source === 'steam')
                    : EQUIPPABLE_ITEM_TYPES.flatMap((type) => getCatalogIdsByType(type));
            const granted = [];
            for (const id of new Set(setIds)) {
                const qty = setName === 'keys' ? amount : 1;
                devQuantities.set(id, Math.min(99, (devQuantities.get(id) ?? 0) + qty));
                granted.push({ itemdefid: id, quantity: qty, source: 'qa_synthetic', tradable: false });
            }
            persistDevGrants();
            const receipt = {
                id: `qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                at: Date.now(), setName, granted
            };
            if (storage) {
                const receipts = readJson(storage, QA_GRANT_RECEIPTS_STORAGE_KEY);
                try { storage.setItem(QA_GRANT_RECEIPTS_STORAGE_KEY, JSON.stringify([...(Array.isArray(receipts) ? receipts : []), receipt].slice(-25))); } catch { /* best effort */ }
            }
            notify();
            return { ok: true, receiptId: receipt.id, granted };
        },

        auditEquippableCatalog() {
            const ids = [...new Set(EQUIPPABLE_ITEM_TYPES.flatMap((type) => getCatalogIdsByType(type)))];
            const failedIds = ids.filter((id) => !store.canEquip(id));
            return { total: ids.length, available: ids.length - failedIds.length, failedIds, complete: failedIds.length === 0 };
        },

        setExternalOwnership(sourceKey, ids = []) {
            if (!sourceKey) return;
            const set = new Set();
            for (const raw of Array.isArray(ids) ? ids : []) {
                const id = toId(raw);
                if (id !== null && MERGED_CATALOG.has(id)) set.add(id);
            }
            externalOwnership.set(sourceKey, set);
            notify();
        },

        getQuantity(itemdefid) {
            const id = toId(itemdefid);
            if (id === null) return 0;
            return (steamQuantities.get(id) ?? 0) + (devQuantities.get(id) ?? 0);
        },

        isOwned(itemdefid) {
            const id = toId(itemdefid);
            if (id === null) return false;
            if (DEFAULT_OWNED.has(id)) return true;
            for (const set of externalOwnership.values()) {
                if (set.has(id)) return true;
            }
            return store.getQuantity(id) > 0;
        },

        // The equip gate. UNLOCK ALL is an override, not a grant: isOwned stays
        // false, so "rewards locked until earned" still reads true everywhere
        // that asks about ownership rather than about equippability.
        canEquip(itemdefid) {
            const id = toId(itemdefid);
            if (id === null || !MERGED_CATALOG.has(id)) return false;
            return unlockAll || store.isOwned(id);
        },

        isUnlockAll() {
            return unlockAll;
        },

        setUnlockAll(enabled) {
            if (!localInventoryAllowed) return false;
            unlockAll = Boolean(enabled);
            if (storage) {
                try {
                    if (unlockAll) storage.setItem(UNLOCK_ALL_STORAGE_KEY, 'true');
                    else storage.removeItem(UNLOCK_ALL_STORAGE_KEY);
                } catch {
                    // best-effort
                }
            }
            notify();
            return true;
        },

        subscribe(fn) {
            if (typeof fn !== 'function') return () => {};
            subscribers.add(fn);
            return () => subscribers.delete(fn);
        },

        // Economy state only. Settings, achievements and progression live under
        // their own keys and are explicitly out of scope here -- the brief calls
        // out "without silently clearing settings", and a blanket storage.clear()
        // is what that is warning against.
        reset() {
            devQuantities = new Map();
            steamQuantities = new Map();
            externalOwnership = new Map();
            unlockAll = false;
            if (storage) {
                try {
                    storage.removeItem(DEV_GRANTS_STORAGE_KEY);
                    storage.removeItem(UNLOCK_ALL_STORAGE_KEY);
                    storage.removeItem(QA_GRANT_RECEIPTS_STORAGE_KEY);
                } catch {
                    // best-effort
                }
            }
            notify();
        },

        // Snapshot in the shape the existing reconcile paths already expect.
        toInventoryArray() {
            const merged = new Map();
            for (const [id, qty] of steamQuantities) merged.set(id, qty);
            for (const [id, qty] of devQuantities) merged.set(id, (merged.get(id) ?? 0) + qty);
            return [...merged.entries()].map(([itemdefid, quantity]) => ({ itemdefid, quantity }));
        }
    };

    return store;
}
