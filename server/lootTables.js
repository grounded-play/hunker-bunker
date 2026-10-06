// Single source of truth for paid-loot-box odds. Valve's Steamworks policy
// requires disclosed odds to exactly match actual odds, so both the public
// store catalog and the server-side roll pull from this one table.

export const DEEP_RELIC_CACHE_ITEMDEFID = 4000;
export const CACHE_KEY_ITEMDEFID = 4001;
export const OPEN_CACHE_RECIPE_ID = 4100;

// Weights are integers so the roll is exact integer arithmetic (no float
// drift between disclosed percentages and actual probability).
export const DEEP_RELIC_CACHE_DROP_TABLE = Object.freeze([
    { itemdefid: 1000, quantity: 3, weight: 55, label: 'Common Relic Fragment x3', rarity: 'common' },
    { itemdefid: 1100, quantity: 1, weight: 25, label: 'Rare Relic Fragment', rarity: 'rare' },
    { itemdefid: 2100, quantity: 1, weight: 12, label: 'Carbon Fiber Decal', rarity: 'epic' },
    { itemdefid: 2200, quantity: 1, weight: 8, label: 'Chrome Plated Sidearm', rarity: 'legendary' }
]);

const TOTAL_WEIGHT = DEEP_RELIC_CACHE_DROP_TABLE.reduce((sum, row) => sum + row.weight, 0);

export function getDisclosedOdds() {
    return DEEP_RELIC_CACHE_DROP_TABLE.map((row) => ({
        itemdefid: row.itemdefid,
        label: row.label,
        rarity: row.rarity,
        quantity: row.quantity,
        percent: Number(((row.weight / TOTAL_WEIGHT) * 100).toFixed(2))
    }));
}

// rollFn defaults to Math.random but is injectable so tests can assert exact
// bucket boundaries deterministically.
export function rollDeepRelicCache(rollFn = Math.random) {
    const roll = rollFn() * TOTAL_WEIGHT;
    let cursor = 0;
    for (const row of DEEP_RELIC_CACHE_DROP_TABLE) {
        cursor += row.weight;
        if (roll < cursor) {
            return { itemdefid: row.itemdefid, quantity: row.quantity, rarity: row.rarity };
        }
    }
    // Floating point edge case at roll === TOTAL_WEIGHT: fall back to the
    // last entry rather than returning undefined.
    const last = DEEP_RELIC_CACHE_DROP_TABLE[DEEP_RELIC_CACHE_DROP_TABLE.length - 1];
    return { itemdefid: last.itemdefid, quantity: last.quantity, rarity: last.rarity };
}

// Doc 05 §3 duplicate protection. A cache that rolls a cosmetic the player
// already owns still grants it, plus Deep Core Shards (4159, the Dispensary's
// currency) by rarity. Fragments are stackable materials, never duplicates.
// The client sandbox (src/craftingMatrix.js) uses this same table.
export const SHARD_ITEMDEFID = 4159;
export const DUPLICATE_SHARD_BONUS = Object.freeze({ uncommon: 5, rare: 15, epic: 40, legendary: 100 });
const DUPLICATE_PROTECTED_REWARDS = new Set([2100, 2200]);

export function cacheDuplicateShardBonus(granted = [], inventoryBefore = []) {
    const owned = new Set(inventoryBefore.filter((item) => Number(item?.quantity) > 0).map((item) => Number(item.itemdefid)));
    return granted.reduce((total, item) => {
        const itemdefid = Number(item?.itemdefid);
        if (!DUPLICATE_PROTECTED_REWARDS.has(itemdefid) || !owned.has(itemdefid)) return total;
        const rarity = DEEP_RELIC_CACHE_DROP_TABLE.find((row) => row.itemdefid === itemdefid)?.rarity;
        return total + (DUPLICATE_SHARD_BONUS[rarity] ?? 0);
    }, 0);
}
