import { getCatalogEntry } from './itemOwnership.js';
import { DUPLICATE_SHARD_BONUS } from './craftingMatrix.js';

export const CACHE_OPENING_VERSION = 1;
export const CACHE_ITEMDEFID = 4000;
export const CACHE_KEY_ITEMDEFID = 4001;
export const SHARD_ITEMDEFID = 4159;

const COSMETIC_IDS = Object.freeze([
    4100, 4101, 4102, 4103, 4104, 4105, 4106, 4107, 4108, 4109, 4110, 4111,
    4120, 4121, 4122, 4123, 4124, 4125, 4126, 4127, 4128, 4129,
    4130, 4131, 4132, 4133, 4134, 4135, 4136, 4137, 4138, 4139,
    4148, 4149, 4150, 4151, 4152, 4153
]);
const POWER_UP_IDS = Object.freeze([4140, 4141, 4142, 4143, 4144, 4145, 4146, 4147]);
const MATERIAL_IDS = Object.freeze([1000, 1100, 4156, 4157, 4158, 4159]);

function normalizeSeed(seed) {
    if (Number.isFinite(Number(seed))) return Number(seed) >>> 0;
    const text = String(seed ?? 'cache-opening');
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return hash >>> 0;
}

export function createSeededRandom(seed = Date.now()) {
    let state = normalizeSeed(seed) || 1;
    return () => {
        state = Math.imul(state ^ (state >>> 15), 1 | state);
        state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
        return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
    };
}

function pick(pool, random) {
    return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

// Doc 05 §3, the rule the Steam server applies (server/lootTables.js): an
// owned cosmetic is still granted, plus Deep Core Shards by its rarity.
function rewardFor(slot, itemdefid, quantity = 1, inventoryIds = new Set()) {
    const entry = getCatalogEntry(itemdefid);
    return {
        slot,
        itemdefid,
        quantity,
        rarity: entry?.rarity ?? 'common',
        label: entry?.name ?? `ITEM #${itemdefid}`,
        duplicate: slot === 'cosmetic' && inventoryIds.has(itemdefid)
    };
}

function duplicateBonusReward(quantity, rarity) {
    return {
        slot: 'duplicate-bonus',
        itemdefid: SHARD_ITEMDEFID,
        quantity,
        rarity: rarity ?? 'uncommon',
        label: `DUPLICATE BONUS // ${quantity} DEEP CORE SHARDS`,
        duplicate: false
    };
}

export function createCacheOpeningResult({ seed = Date.now(), inventory = [], openingId = null } = {}) {
    const random = createSeededRandom(seed);
    const inventoryIds = new Set((Array.isArray(inventory) ? inventory : []).map((item) => item?.itemdefid));
    const cosmeticId = pick(COSMETIC_IDS, random);
    const powerUpId = pick(POWER_UP_IDS, random);
    const materialId = pick(MATERIAL_IDS, random);
    const cosmetic = rewardFor('cosmetic', cosmeticId, 1, inventoryIds);
    const bonusShards = cosmetic.duplicate ? (DUPLICATE_SHARD_BONUS[cosmetic.rarity] ?? 0) : 0;
    return {
        version: CACHE_OPENING_VERSION,
        source: 'dev',
        openingId: openingId ?? `dev-cache-${Date.now()}-${Math.floor(random() * 1e6)}`,
        consumed: { cache: CACHE_ITEMDEFID, key: CACHE_KEY_ITEMDEFID, quantity: 1 },
        rewards: [
            cosmetic,
            rewardFor('power-up', powerUpId, 1, inventoryIds),
            rewardFor('currency-material', materialId, materialId === SHARD_ITEMDEFID ? 25 : (materialId === 1000 ? 3 : 1), inventoryIds),
            ...(bonusShards > 0 ? [duplicateBonusReward(bonusShards, cosmetic.rarity)] : [])
        ]
    };
}

export function adaptSteamCacheResult(result, openingId = null) {
    const granted = Array.isArray(result?.granted) ? result.granted : [];
    const bonus = result?.duplicateBonus?.ok ? result.duplicateBonus : null;
    const bonusIndex = bonus ? granted.findIndex((item) => Number(item.itemdefid) === bonus.itemdefid) : -1;
    const rewards = granted.map((item, index) => (index === bonusIndex
        ? null
        : { ...rewardFor('cosmetic', Number(item.itemdefid), Number(item.quantity) || 1), duplicate: bonusIndex >= 0 }))
        .filter(Boolean);
    if (bonusIndex >= 0) rewards.push(duplicateBonusReward(bonus.quantity, rewards[0]?.rarity));
    return {
        version: CACHE_OPENING_VERSION,
        source: 'steam',
        openingId: openingId ?? result?.openingId ?? null,
        consumed: result?.consumed ?? null,
        rewards,
        // A Steam cache grants one reward (server/lootTables.js), not the
        // sandbox's three lanes.
        complete: rewards.length > 0,
        reason: rewards.length === 0 ? 'steam_returned_no_grant' : null
    };
}

export function getCacheOpeningPools() {
    return { cosmetic: [...COSMETIC_IDS], powerUp: [...POWER_UP_IDS], material: [...MATERIAL_IDS] };
}
