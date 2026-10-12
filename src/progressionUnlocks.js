// What a save has earned through play, derived from its saved progress rather
// than granted item by item (Sprint 51, docs/planning/sprint-51-loadout-and-ownership.md).
//
// A fresh or reset save owns nothing beyond the voice packs and each class's
// factory look; everything else here comes from the achievement record
// (hb_achievements_v1) or from Rig Module purchases (hb_rig_purchases_v1). Both
// are `hb_` keys, so a save reset takes every unlock away again. Because it is
// computed, it also works on the Steam build, where local item grants are off.
import { ACHIEVEMENT_COSMETIC_REWARDS } from './achievements.js';
import { COMMUNITY_SKINS } from './data/communitySkins.js';

export const RIG_PURCHASES_STORAGE_KEY = 'hb_rig_purchases_v1';

// Rig Modules bought in the Foundry. Deep Core Shards are Steam items that
// would need a server consume, so the two shard-priced modules cost shells.
export const RIG_MODULE_PRICES = Object.freeze({
    4160: Object.freeze({ shells: 150 }),
    4161: Object.freeze({ shells: 150 }),
    4164: Object.freeze({ shells: 250 }),
    4165: Object.freeze({ shells: 400 })
});

const ACHIEVEMENT_MODULES = Object.freeze({ 4162: 'slay_the_queen', 4163: 'archivist' });
const DEPTH_MODULES = Object.freeze({ 4166: 4, 4167: 6 });

// Runs as a class it takes to earn that class's community skins, in order.
export const SKIN_RUN_THRESHOLDS = Object.freeze([1, 2, 3, 5, 7, 10, 13, 16, 20, 25, 30]);

const skinsByClass = () => {
    const map = new Map();
    for (const skin of COMMUNITY_SKINS ?? []) {
        const cls = String(skin.classId ?? '').toUpperCase();
        if (!map.has(cls)) map.set(cls, []);
        map.get(cls).push(skin.id);
    }
    return map;
};

function deepestTier(state) {
    return Math.max(0, ...Object.values(state?.stats?.byClass ?? {}).map((record) => Number(record?.deepestTier) || 0));
}

export function computeProgressionUnlocks(achievementState = null, { purchases = [] } = {}) {
    const unlocked = achievementState?.unlocked ?? {};
    const ids = new Set();
    for (const [key, id] of Object.entries(ACHIEVEMENT_COSMETIC_REWARDS)) if (unlocked[key]) ids.add(String(id));
    for (const [id, key] of Object.entries(ACHIEVEMENT_MODULES)) if (unlocked[key]) ids.add(id);
    const depth = deepestTier(achievementState);
    for (const [id, tier] of Object.entries(DEPTH_MODULES)) if (depth >= tier) ids.add(id);
    for (const [cls, skins] of skinsByClass()) {
        const runs = Number(achievementState?.stats?.byClass?.[cls]?.runs) || 0;
        skins.forEach((skinId, index) => {
            if (runs >= (SKIN_RUN_THRESHOLDS[index] ?? Infinity)) ids.add(String(skinId));
        });
    }
    for (const id of purchases) if (RIG_MODULE_PRICES[id]) ids.add(String(id));
    return [...ids];
}

/** How to earn an item, for the picker's locked tiles: { key, params } or null. */
export function describeProgressionUnlock(itemId) {
    const id = String(itemId);
    if (RIG_MODULE_PRICES[id]) return { key: 'ui.unlock.buy_shells', params: { shells: RIG_MODULE_PRICES[id].shells } };
    if (ACHIEVEMENT_MODULES[id] === 'slay_the_queen') return { key: 'ui.unlock.slay_the_queen', params: {} };
    if (ACHIEVEMENT_MODULES[id] === 'archivist') return { key: 'ui.unlock.archivist', params: {} };
    if (DEPTH_MODULES[id]) return { key: 'ui.unlock.reach_depth', params: { depth: DEPTH_MODULES[id] } };
    for (const [cls, skins] of skinsByClass()) {
        const index = skins.indexOf(id);
        if (index >= 0) return { key: 'ui.unlock.class_runs', params: { runs: SKIN_RUN_THRESHOLDS[index], cls } };
    }
    const achievement = Object.entries(ACHIEVEMENT_COSMETIC_REWARDS).find(([, reward]) => String(reward) === id);
    if (achievement) return { key: 'ui.unlock.achievement', params: { achievement: achievement[0] } };
    return null;
}

export function loadRigPurchases(storage = globalThis.localStorage) {
    try {
        const parsed = JSON.parse(storage?.getItem(RIG_PURCHASES_STORAGE_KEY) ?? '[]');
        return Array.isArray(parsed) ? parsed.map(String).filter((id) => RIG_MODULE_PRICES[id]) : [];
    } catch {
        return [];
    }
}

/**
 * Buy a Rig Module with shells from the bank. Returns { ok, reason? }.
 * `bank` is a BankManager; `storage` persists the purchase.
 */
export function purchaseRigModule(itemId, { bank, storage = globalThis.localStorage } = {}) {
    const id = String(itemId);
    const price = RIG_MODULE_PRICES[id];
    if (!price) return { ok: false, reason: 'not_for_sale' };
    const purchases = loadRigPurchases(storage);
    if (purchases.includes(id)) return { ok: false, reason: 'already_owned' };
    if (!bank?.spendShells?.(price.shells)) return { ok: false, reason: 'insufficient_shells' };
    try {
        storage?.setItem(RIG_PURCHASES_STORAGE_KEY, JSON.stringify([...purchases, id]));
    } catch {
        bank.addShells?.(price.shells);
        return { ok: false, reason: 'save_failed' };
    }
    return { ok: true };
}
