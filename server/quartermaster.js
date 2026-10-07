// Quartermaster shard trades and overclock assembly (Sprint 51; doc 05 §4/§6).
// Shared by the backend (server/steamInventory.js routes) and the Vault's
// local sandbox (src/steamVaultUi.js), so both judge a trade the same way.
//
// - Deep Core Shards (4159) buy reagents, a few a week.
// - Cryo-Alloy Ingots (4156), Sub-Core Matrices (4157) and Ambergris (4158)
//   assemble the overclock modules 4140-4147: doc 05 §6's quantities, without
//   the components that are not real items (Micro-Capacitor, Coolant Line...)
//   or Scrap (a client-side bank currency the server cannot charge).

export const SHARD_ITEMDEFID = 4159;

export const QUARTERMASTER_OFFERS = Object.freeze({
    4157: Object.freeze({ shards: 35, weeklyMax: 3 }),
    4158: Object.freeze({ shards: 50, weeklyMax: 2 }),
    4154: Object.freeze({ shards: 75, weeklyMax: 1 })
});

export const ASSEMBLY_RECIPES = Object.freeze({
    4140: Object.freeze({ 4156: 20 }),
    4141: Object.freeze({ 4156: 25 }),
    4142: Object.freeze({ 4156: 40, 4157: 1 }),
    4143: Object.freeze({ 4156: 40, 4157: 1 }),
    4144: Object.freeze({ 4156: 50, 4157: 1 }),
    4145: Object.freeze({ 4156: 80, 4157: 2 }),
    4146: Object.freeze({ 4156: 80, 4157: 2, 4158: 1 }),
    4147: Object.freeze({ 4156: 150, 4157: 5, 4158: 2 })
});

/** ISO-8601 week, e.g. "2026-W41": the window a weekly limit counts in. */
export function isoWeekKey(date = new Date()) {
    const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const weekday = day.getUTCDay() || 7;
    day.setUTCDate(day.getUTCDate() + 4 - weekday);
    const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((day - yearStart) / 86400000 + 1) / 7);
    return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Take `needed` of each itemdefid from the inventory's stacks, in order.
function drawFromStacks(inventory, requirements) {
    const consumed = [];
    for (const [rawId, amount] of Object.entries(requirements)) {
        const itemdefid = Number(rawId);
        let remaining = amount;
        for (const stack of inventory.filter((row) => Number(row.itemdefid) === itemdefid && Number(row.quantity) > 0)) {
            if (remaining <= 0) break;
            const take = Math.min(Number(stack.quantity), remaining);
            consumed.push({ ...(stack.itemId != null ? { itemId: String(stack.itemId) } : {}), itemdefid, quantity: take });
            remaining -= take;
        }
        if (remaining > 0) return null;
    }
    return consumed;
}

export function planQuartermasterTrade({ inventory = [], itemdefid, weeklyCount = 0 }) {
    const offer = QUARTERMASTER_OFFERS[Number(itemdefid)];
    if (!offer) return { ok: false, reason: 'not_offered' };
    if (weeklyCount >= offer.weeklyMax) return { ok: false, reason: 'weekly_limit' };
    const consumed = drawFromStacks(inventory, { [SHARD_ITEMDEFID]: offer.shards });
    if (!consumed) return { ok: false, reason: 'insufficient_shards' };
    return { ok: true, consumed, outputItemdefid: Number(itemdefid), cost: offer.shards, weeklyMax: offer.weeklyMax };
}

export function planAssembly({ inventory = [], itemdefid }) {
    const recipe = ASSEMBLY_RECIPES[Number(itemdefid)];
    if (!recipe) return { ok: false, reason: 'not_assemblable' };
    const consumed = drawFromStacks(inventory, recipe);
    if (!consumed) return { ok: false, reason: 'insufficient_reagents' };
    return { ok: true, consumed, outputItemdefid: Number(itemdefid), recipe };
}
