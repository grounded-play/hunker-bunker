/**
 * Season 0 Crafting Matrix — Trade-Up Smelting & Deep Core Shard Dispensary
 * Implements docs/season-zero-protocol/05-crafting-matrix-and-salvage-economy.md §2/§3.
 *
 * Operates on the same client-side sandbox `vaultItems` array steamVaultUi.js already uses
 * for cache-opening and grants (see that file's `grantVaultItem` comment) — there is no real
 * Steamworks ExchangeItems backend in this codebase, so this matches the existing level of
 * "real" for the rest of the local Steam Vault simulation rather than faking a server call.
 */

export const RARITY_TIERS = Object.freeze(['uncommon', 'rare', 'epic', 'legendary']);

const NEXT_TIER = Object.freeze({
    uncommon: 'rare',
    rare: 'epic',
    epic: 'legendary'
});

export const SMELT_INPUT_COUNT = 5;

// docs/season-zero-protocol/05 §3 duplicate-protection table
export const DUPLICATE_SHARD_BONUS = Object.freeze({
    uncommon: 5,
    rare: 15,
    epic: 40,
    legendary: 100
});

// docs/season-zero-protocol/05 §3 dispensary exchange-rate table
export const DISPENSARY_COST_BY_RARITY = Object.freeze({
    uncommon: 25,
    rare: 60,
    epic: 150,
    legendary: 350
});

export const SHARD_ITEMDEFID = 4159;

export function countByRarity(vaultItems = [], catalogLookup) {
    const counts = {};
    for (const item of vaultItems) {
        const cat = catalogLookup(item.itemdefid);
        if (!cat) continue;
        counts[cat.rarity] = (counts[cat.rarity] || 0) + (Number(item.quantity) || 0);
    }
    return counts;
}

export function canSmelt(vaultItems, rarity, catalogLookup) {
    if (!NEXT_TIER[rarity]) return false;
    const counts = countByRarity(vaultItems, catalogLookup);
    return (counts[rarity] || 0) >= SMELT_INPUT_COUNT;
}

/**
 * Plans a 5:1 trade-up smelt: consumes SMELT_INPUT_COUNT items of `rarity` (greedily, in
 * vaultItems order) and picks one output itemdefid from `outputPool` at the next rarity tier
 * with equal probability, per doc 05 §2's "Weighted Selection: ... equal probability" rule.
 * Pure/side-effect-free — callers apply the returned plan to their own inventory state.
 */
export function planSmelt({ vaultItems = [], rarity, catalogLookup, outputPool = [], rng = Math.random }) {
    const nextTier = NEXT_TIER[rarity];
    if (!nextTier) return { ok: false, reason: 'max_tier' };
    if (!canSmelt(vaultItems, rarity, catalogLookup)) return { ok: false, reason: 'insufficient_items' };

    const eligibleOutputs = outputPool.filter((id) => catalogLookup(id)?.rarity === nextTier);
    if (eligibleOutputs.length === 0) return { ok: false, reason: 'no_output_pool' };

    let remaining = SMELT_INPUT_COUNT;
    const consumed = [];
    for (const item of vaultItems) {
        if (remaining <= 0) break;
        const cat = catalogLookup(item.itemdefid);
        if (!cat || cat.rarity !== rarity) continue;
        const take = Math.min(Number(item.quantity) || 0, remaining);
        if (take <= 0) continue;
        consumed.push({ itemdefid: item.itemdefid, quantity: take });
        remaining -= take;
    }
    if (remaining > 0) return { ok: false, reason: 'insufficient_items' };

    const outputItemdefid = eligibleOutputs[Math.floor(rng() * eligibleOutputs.length)];
    return { ok: true, consumed, outputItemdefid, outputRarity: nextTier };
}

/**
 * Duplicate-protection check for cache unboxing (doc 05 §3): if the rolled item is already
 * owned, the caller should still grant it (Steam-style — dupes aren't blocked) plus these
 * bonus Deep Core Shards.
 */
export function resolveDuplicateGrant(itemdefid, vaultItems = [], catalogLookup) {
    const alreadyOwned = vaultItems.some((i) => i.itemdefid === itemdefid && Number(i.quantity) > 0);
    if (!alreadyOwned) return { isDuplicate: false, bonusShards: 0 };
    const cat = catalogLookup(itemdefid);
    const bonusShards = DUPLICATE_SHARD_BONUS[cat?.rarity] || 0;
    return { isDuplicate: true, bonusShards };
}

export function getShardBalance(vaultItems = []) {
    const shardItem = vaultItems.find((i) => i.itemdefid === SHARD_ITEMDEFID);
    return Number(shardItem?.quantity) || 0;
}

/**
 * Plans a Dispensary redemption (doc 05 §3): spend Shards to directly acquire a specific
 * catalog item at its rarity's fixed cost. Pure — callers apply the plan themselves.
 */
export function planDispensaryRedeem(vaultItems = [], targetItemdefid, catalogLookup) {
    const cat = catalogLookup(targetItemdefid);
    if (!cat) return { ok: false, reason: 'unknown_item' };
    const cost = DISPENSARY_COST_BY_RARITY[cat.rarity];
    if (!cost) return { ok: false, reason: 'not_dispensable' };
    if (getShardBalance(vaultItems) < cost) return { ok: false, reason: 'insufficient_shards' };
    return { ok: true, cost, targetItemdefid, rarity: cat.rarity };
}
