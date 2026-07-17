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
