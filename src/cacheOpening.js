import { getCatalogEntry } from './itemOwnership.js';

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
const DUPLICATE_SHARDS_BY_RARITY = Object.freeze({ common: 10, uncommon: 20, rare: 40, epic: 80, legendary: 150 });

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

function rewardFor(slot, itemdefid, quantity = 1, inventoryIds = new Set()) {
    const entry = getCatalogEntry(itemdefid);
    const duplicate = slot === 'cosmetic' && inventoryIds.has(itemdefid);
    if (duplicate) {
        const convertedQuantity = DUPLICATE_SHARDS_BY_RARITY[entry?.rarity] ?? 20;
        return {
            slot,
            itemdefid: SHARD_ITEMDEFID,
            quantity: convertedQuantity,
            rarity: entry?.rarity ?? 'uncommon',
            label: `DUPLICATE CONVERTED // ${convertedQuantity} DEEP CORE SHARDS`,
            duplicate: true,
            convertedFrom: itemdefid
        };
    }
    return {
        slot,
        itemdefid,
        quantity,
        rarity: entry?.rarity ?? 'common',
        label: entry?.name ?? `ITEM #${itemdefid}`,
        duplicate: false
    };
}

export function createCacheOpeningResult({ seed = Date.now(), inventory = [], openingId = null } = {}) {
    const random = createSeededRandom(seed);
    const inventoryIds = new Set((Array.isArray(inventory) ? inventory : []).map((item) => item?.itemdefid));
    const cosmeticId = pick(COSMETIC_IDS, random);
    const powerUpId = pick(POWER_UP_IDS, random);
    const materialId = pick(MATERIAL_IDS, random);
    return {
        version: CACHE_OPENING_VERSION,
        source: 'dev',
        openingId: openingId ?? `dev-cache-${Date.now()}-${Math.floor(random() * 1e6)}`,
        consumed: { cache: CACHE_ITEMDEFID, key: CACHE_KEY_ITEMDEFID, quantity: 1 },
        rewards: [
            rewardFor('cosmetic', cosmeticId, 1, inventoryIds),
            rewardFor('power-up', powerUpId, 1, inventoryIds),
            rewardFor('currency-material', materialId, materialId === SHARD_ITEMDEFID ? 25 : (materialId === 1000 ? 3 : 1), inventoryIds)
        ]
    };
}

export function adaptSteamCacheResult(result, openingId = null) {
    const granted = Array.isArray(result?.granted) ? result.granted : [];
    const rewards = granted.map((item) => rewardFor('cosmetic', Number(item.itemdefid), Number(item.quantity) || 1));
    return {
        version: CACHE_OPENING_VERSION,
        source: 'steam',
        openingId: openingId ?? result?.openingId ?? null,
        consumed: result?.consumed ?? null,
        rewards,
        complete: rewards.length >= 3,
        reason: rewards.length === 0 ? 'steam_returned_no_grant' : null
    };
}

export function getCacheOpeningPools() {
    return { cosmetic: [...COSMETIC_IDS], powerUp: [...POWER_UP_IDS], material: [...MATERIAL_IDS] };
}
