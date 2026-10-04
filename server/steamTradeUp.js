// Server-authoritative Smelter trade-ups and Dispensary redemptions
// (decision 9, Sprint 48). Players expect a trade-up on their Steam inventory
// to stick, and the industry pattern (CS2 trade-up contracts) is that the
// server decides: the client names only the tier or the target, the server
// picks the inputs it will consume from the player's real inventory, rolls
// the output, and commits.
//
// Commit order is consume-then-grant, and any failure after the first
// consume refunds what was taken, so a failed trade can cost the player
// nothing. Steam's IInventoryService/ConsumeItem and AddItem are partner
// (publisher-key) calls, the same trust path the backend already uses for
// grants, so no Steamworks schema change is needed.
import { createHash } from 'node:crypto';
import { getMockInventory, setMockInventory } from './db.js';
import { grantItemToPlayer } from './steamGrant.js';
import { TRADE_UP_ITEMS } from './tradeUpCatalog.js';

const STEAM_INVENTORY_URL = 'https://partner.steam-api.com/IInventoryService/';

export const TRADE_UP_INPUT_COUNT = 5;
export const TRADE_UP_NEXT_TIER = Object.freeze({ uncommon: 'rare', rare: 'epic', epic: 'legendary' });
export const SHARD_ITEMDEFID = 4159;
// docs/season-zero-protocol/05 §3; mirrors src/craftingMatrix.js DISPENSARY_COST_BY_RARITY.
export const DISPENSARY_COST_BY_RARITY = Object.freeze({ uncommon: 25, rare: 60, epic: 150, legendary: 350 });

export function tradeUpRarity(itemdefid) {
    return TRADE_UP_ITEMS[Number(itemdefid)] ?? null;
}

/**
 * Pick the five inputs (oldest first, so fresh drops are kept) and the
 * output. Pure: `inventory` is [{ itemId, itemdefid, quantity, acquiredAt }].
 */
export function planTradeUp({ inventory = [], rarity, random = Math.random }) {
    const nextTier = TRADE_UP_NEXT_TIER[rarity];
    if (!nextTier) return { ok: false, reason: 'invalid_tier' };
    const stacks = inventory
        .filter((item) => tradeUpRarity(item.itemdefid) === rarity && Number(item.quantity) > 0)
        .sort((a, b) => (Number(a.acquiredAt) || 0) - (Number(b.acquiredAt) || 0));
    const consumed = [];
    let remaining = TRADE_UP_INPUT_COUNT;
    for (const stack of stacks) {
        if (remaining <= 0) break;
        const take = Math.min(Number(stack.quantity), remaining);
        consumed.push({ itemId: String(stack.itemId), itemdefid: Number(stack.itemdefid), quantity: take });
        remaining -= take;
    }
    if (remaining > 0) return { ok: false, reason: 'insufficient_items' };
    const pool = Object.keys(TRADE_UP_ITEMS).map(Number).filter((id) => TRADE_UP_ITEMS[id] === nextTier);
    if (!pool.length) return { ok: false, reason: 'no_output_pool' };
    const outputItemdefid = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
    return { ok: true, consumed, outputItemdefid, outputRarity: nextTier };
}

export function planRedeem({ inventory = [], itemdefid }) {
    const rarity = tradeUpRarity(itemdefid);
    if (!rarity) return { ok: false, reason: 'not_dispensable' };
    const cost = DISPENSARY_COST_BY_RARITY[rarity];
    const consumed = [];
    let remaining = cost;
    for (const stack of inventory.filter((item) => Number(item.itemdefid) === SHARD_ITEMDEFID && Number(item.quantity) > 0)) {
        if (remaining <= 0) break;
        const take = Math.min(Number(stack.quantity), remaining);
        consumed.push({ itemId: String(stack.itemId), itemdefid: SHARD_ITEMDEFID, quantity: take });
        remaining -= take;
    }
    if (remaining > 0) return { ok: false, reason: 'insufficient_shards' };
    return { ok: true, consumed, outputItemdefid: Number(itemdefid), cost };
}

export function deriveNumericRequestId(baseRequestId, ...parts) {
    if (!baseRequestId) return null;
    const identity = JSON.stringify(['hb-trade-up-v1', String(baseRequestId), ...parts]);
    const value = createHash('sha256').update(identity).digest().readBigUInt64BE(0);
    return String(value || 1n);
}

export function decodeConsumeItemResponse(data) {
    const response = data?.response;
    if (response?.success !== undefined && response.success !== true) {
        return { ok: false, reason: 'steam_consume_rejected' };
    }
    if (typeof response?.item_json !== 'string') {
        if (response && typeof response === 'object' && Object.keys(response).length === 0) {
            return { ok: true };
        }
        return { ok: false, reason: 'steam_consume_invalid_response' };
    }
    let rows;
    try {
        rows = JSON.parse(response.item_json);
    } catch {
        return { ok: false, reason: 'steam_consume_invalid_response' };
    }
    if (!Array.isArray(rows)) return { ok: false, reason: 'steam_consume_invalid_response' };
    return { ok: true, items: rows };
}

function getSteamPublisherKey() {
    return process.env.HB_STEAM_PUBLISHER_KEY ?? process.env.STEAM_PUBLISHER_KEY ?? process.env.STEAM_WEB_API_KEY ?? '';
}

function getSteamAppId() {
    return Number(process.env.HB_STEAM_APPID ?? 4957040);
}

async function consumeLive({ steamId, entry, requestId }) {
    try {
        const params = new URLSearchParams();
        params.append('key', getSteamPublisherKey());
        params.append('appid', String(getSteamAppId()));
        params.append('steamid', steamId);
        params.append('itemid', entry.itemId);
        params.append('quantity', String(entry.quantity));
        if (requestId) {
            params.append('requestid', String(requestId));
        }
        const response = await fetch(`${STEAM_INVENTORY_URL}ConsumeItem/v1/`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: params,
            signal: AbortSignal.timeout(15_000)
        });
        if (!response.ok) {
            return { ok: false, reason: 'steam_api_error', status: response.status };
        }
        const data = await response.json();
        return decodeConsumeItemResponse(data);
    } catch (err) {
        return { ok: false, reason: 'steam_request_failed', message: err.message, ambiguous: true };
    }
}

function consumeMock(steamId, consumed) {
    const inventory = getMockInventory(steamId).map((item) => ({ ...item }));
    for (const entry of consumed) {
        const stack = inventory.find((item) => String(item.itemId) === entry.itemId);
        if (!stack || Number(stack.quantity) < entry.quantity) return null;
        stack.quantity -= entry.quantity;
    }
    return inventory.filter((item) => item.quantity > 0);
}

async function refund({ steamId, taken, isDevMode, requestId }) {
    const refunded = [];
    for (const [index, entry] of taken.entries()) {
        const refundRequestId = deriveNumericRequestId(requestId, 'refund', index);
        const grant = await grantItemToPlayer({
            steamId,
            itemdefid: entry.itemdefid,
            quantity: entry.quantity,
            isDevMode,
            source: 'trade_up_refund',
            mode: 'stack',
            requestId: refundRequestId
        });
        refunded.push({ itemdefid: entry.itemdefid, quantity: entry.quantity, ok: grant.ok });
    }
    return refunded;
}

/**
 * Commit a planned exchange. Returns { ok, consumed, granted } or
 * { ok: false, reason, refunded }.
 */
export async function commitExchange({ steamId, plan, isDevMode, requestId, source }) {
    if (isDevMode) {
        const next = consumeMock(steamId, plan.consumed);
        if (!next) return { ok: false, reason: 'inventory_changed' };
        await setMockInventory(steamId, next);
    } else {
        const taken = [];
        for (const [index, entry] of plan.consumed.entries()) {
            const consumeRequestId = deriveNumericRequestId(requestId, 'consume', index);
            const result = await consumeLive({ steamId, entry, requestId: consumeRequestId });
            if (!result.ok) {
                if (result.ambiguous) {
                    return { ok: false, reason: 'exchange_outcome_requires_review', detail: result };
                }
                const refunded = await refund({ steamId, taken, isDevMode, requestId });
                return { ok: false, reason: 'consume_failed', detail: result, refunded };
            }
            taken.push(entry);
        }
    }
    const grantRequestId = deriveNumericRequestId(requestId, 'grant');
    const grant = await grantItemToPlayer({
        steamId,
        itemdefid: plan.outputItemdefid,
        quantity: 1,
        isDevMode,
        source,
        mode: 'unique',
        requestId: grantRequestId
    });
    if (!grant.ok) {
        if (grant.reason === 'steam_request_failed') {
            return { ok: false, reason: 'exchange_outcome_requires_review', detail: grant };
        }
        const refunded = await refund({ steamId, taken: plan.consumed, isDevMode, requestId });
        return { ok: false, reason: 'grant_failed', detail: grant, refunded };
    }
    return { ok: true, consumed: plan.consumed, granted: grant.granted };
}

// One exchange at a time per player, so two quick presses cannot plan
// against the same inventory and spend it twice.
const inFlight = new Set();

export async function withPlayerLock(steamId, run) {
    if (inFlight.has(steamId)) return { status: 409, body: { ok: false, reason: 'exchange_in_progress' } };
    inFlight.add(steamId);
    try {
        return await run();
    } finally {
        inFlight.delete(steamId);
    }
}
