import { checkIdempotency, saveIdempotency } from './db.js';
import { createHash } from 'node:crypto';
import { fetchSteamInventory, decodeSteamInventory } from './steamInventoryRead.js';
import { OPEN_CACHE_RECIPE_ID, DEEP_RELIC_CACHE_DROP_TABLE } from './lootTables.js';
import { withPlayerLock } from './steamTradeUp.js';

const RECIPES = { 2100: { 1000: 5 }, 2200: { 1000: 10, 1100: 2 }, [OPEN_CACHE_RECIPE_ID]: { 4000: 1, 4001: 1 } };
const failure = (reason, status = 400) => ({ status, body: { ok: false, reason } });
const uncertain = () => failure('exchange_outcome_requires_review', 409);

export function recipeExchangeJournalKey({ appId, steamId, requestId }) {
    return `recipe-exchange.${createHash('sha256').update(JSON.stringify([appId, steamId, requestId])).digest('hex')}`;
}

// The existing journal table persists status/body only. Keep private metadata
// inside its body on disk, stripping it before returning any response to a player.
function readJournal(key) {
    const row = checkIdempotency(key);
    if (!row) return null;
    const { exchangeJournal, ...body } = row.body;
    return { ...row, body, ...exchangeJournal };
}

function saveJournal(key, { signature, plan, state, createdAt, ...result }) {
    return saveIdempotency(key, { status: result.status,
        body: { ...result.body, exchangeJournal: { signature, plan, state, createdAt } } });
}

export function planSteamRecipe(recipeId, materials, inventory) {
    const recipe = RECIPES[recipeId];
    if (!recipe) return { ok: false, reason: 'invalid_recipe_id' };
    if (!Array.isArray(materials) || !materials.length || materials.length > 64
        || materials.some((id) => typeof id !== 'string') || new Set(materials).size !== materials.length) {
        return { ok: false, reason: 'invalid_exchange_parameters' };
    }
    const needed = { ...recipe };
    const consumed = [];
    for (const id of materials) {
        const item = inventory.find((row) => row.itemId === id);
        if (!item) return { ok: false, reason: 'missing_material_instances' };
        if (!Object.hasOwn(recipe, item.itemdefid)) return { ok: false, reason: 'unexpected_recipe_material' };
        const quantity = Math.min(needed[item.itemdefid], item.quantity);
        if (quantity > 0) consumed.push({ itemId: id, itemdefid: item.itemdefid, quantity });
        needed[item.itemdefid] -= quantity;
    }
    if (Object.values(needed).some((quantity) => quantity > 0)) return { ok: false, reason: 'insufficient_recipe_materials' };
    return { ok: true, consumed, outputItemdefid: recipeId === OPEN_CACHE_RECIPE_ID ? 4002 : recipeId };
}

// ExchangeItem has no documented requestid parameter. Persist a fence BEFORE
// calling it: an ambiguous/crashed attempt must never be resent or rerolled.
// A later operator workflow can resolve the retained plan and item evidence.
export function performSteamRecipeExchange(options) {
    return withPlayerLock(options.steamId, () => performLockedRecipeExchange(options));
}

async function performLockedRecipeExchange({ steamId, recipeId, materials, requestId, key, appId,
    fetchImpl = fetch, read = readJournal, save = saveJournal }) {
    if (typeof requestId !== 'string' || !requestId || requestId.length > 256) return failure('missing_request_id');
    if (!Array.isArray(materials) || materials.some((id) => typeof id !== 'string')) return failure('invalid_exchange_parameters');
    const journalKey = recipeExchangeJournalKey({ appId, steamId, requestId });
    const activeKey = `recipe-exchange-active.${appId}.${steamId}`;
    const signature = JSON.stringify([recipeId, [...materials].sort()]);
    try {
        const existing = read(journalKey);
        if (existing) return existing.signature === signature ? existing : failure('exchange_request_conflict', 409);
        // The UI can generate a new nonce after a failed click. Do not let that
        // bypass an unresolved attempt and consume another batch from the stack.
        if (read(activeKey)?.state === 'submitted_unknown') return uncertain();
        // Older global nonce records cannot be safely attributed to this account.
        if (read(requestId)) return failure('legacy_exchange_requires_review', 409);
    } catch { return failure('exchange_journal_unavailable', 503); }
    const loaded = await fetchSteamInventory({ steamId, key, appId, fetchImpl });
    if (!loaded.ok) return failure(loaded.reason, loaded.status);
    const plan = planSteamRecipe(recipeId, materials, loaded.inventory);
    if (!plan.ok) return failure(plan.reason);
    const pending = { ...uncertain(), signature, plan, createdAt: Date.now(), state: 'submitted_unknown' };
    try {
        await save(journalKey, pending);
        await save(activeKey, pending);
    } catch { return failure('exchange_journal_unavailable', 503); }
    let result;
    try {
        const params = new URLSearchParams({ key, appid: String(appId), steamid: steamId, outputitemdefid: String(plan.outputItemdefid) });
        plan.consumed.forEach((item, index) => {
            params.set(`materialsitemid[${index}]`, item.itemId);
            params.set(`materialsquantity[${index}]`, String(item.quantity));
        });
        const response = await fetchImpl('https://partner.steam-api.com/IInventoryService/ExchangeItem/v1/', {
            method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: params, signal: AbortSignal.timeout(15_000)
        });
        if (!response.ok) return uncertain();
        const decoded = decodeSteamInventory(await response.json());
        if (!decoded.ok) return uncertain();
        const granted = decoded.inventory.filter((item) => !materials.includes(item.itemId));
        const expected = recipeId === OPEN_CACHE_RECIPE_ID ? DEEP_RELIC_CACHE_DROP_TABLE : [{ itemdefid: recipeId, quantity: 1 }];
        const match = expected.some((reward) => granted.length > 0
            && granted.every((item) => item.itemdefid === reward.itemdefid)
            && granted.reduce((sum, item) => sum + item.quantity, 0) === reward.quantity);
        if (!match) return uncertain();
        result = { status: 200, body: { ok: true, consumed: plan.consumed.map((item) => item.itemId), granted } };
        await save(journalKey, { ...pending, ...result, state: 'completed' });
        await save(activeKey, { ...pending, ...result, state: 'completed' });
    } catch {
        return uncertain();
    }
    return result;
}
