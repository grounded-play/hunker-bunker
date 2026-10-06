import { getMockInventory, setMockInventory } from './db.js';

const STEAM_INVENTORY_URL = 'https://partner.steam-api.com/IInventoryService/';

function getSteamPublisherKey() {
    return process.env.HB_STEAM_PUBLISHER_KEY
        ?? process.env.STEAM_PUBLISHER_KEY
        ?? process.env.STEAM_WEB_API_KEY
        ?? '';
}

function getSteamAppId() {
    return Number(process.env.HB_STEAM_APPID ?? 4957040);
}

// AddItem returns a JSON-encoded item array, not GetInventory's historical
// item_list fixture shape. A 200 response alone is not evidence of a grant.
// https://partner.steamgames.com/doc/webapi/IInventoryService#AddItem
function decodeGrant(response, requestId) {
    if (response?.success !== undefined && response.success !== true) {
        return { ok: false, reason: 'steam_inventory_grant_rejected' };
    }
    const invalid = { ok: false, reason: 'steam_inventory_grant_invalid_response' };
    if (typeof response?.item_json !== 'string') return invalid;
    if (response.replayed !== undefined && typeof response.replayed !== 'boolean') return invalid;
    const replayed = response.replayed === true;
    if (replayed && !requestId) return invalid;
    let rows;
    try { rows = JSON.parse(response.item_json); } catch { return invalid; }
    if (!Array.isArray(rows) || (!rows.length && !replayed)) return invalid;
    const granted = [];
    const seen = new Set();
    for (const row of rows) {
        if (!row || typeof row.itemid !== 'string' || !/^[1-9]\d{0,19}$/.test(row.itemid)
            || BigInt(row.itemid) > 18446744073709551615n || seen.has(row.itemid)) return invalid;
        const itemdefid = Number(row.itemdefid);
        const quantity = Number(row.quantity);
        if (!['string', 'number'].includes(typeof row.itemdefid)
            || (typeof row.itemdefid === 'string' && !/^\d+$/.test(row.itemdefid))
            || !Number.isSafeInteger(itemdefid) || itemdefid <= 0
            || !['string', 'number'].includes(typeof row.quantity)
            || (typeof row.quantity === 'string' && !/^\d+$/.test(row.quantity))
            || !Number.isSafeInteger(quantity) || quantity < (replayed ? 0 : 1)) return invalid;
        seen.add(row.itemid);
        granted.push({
            itemId: row.itemid, itemdefid, quantity,
            ...(typeof row.state === 'string' && row.state ? { state: row.state } : {})
        });
    }
    // A replay describes CURRENT inventory, not the original delivered amount.
    // Zero/removed items must never become a fresh grant on the next retry.
    return { ok: true, granted, replayed };
}

// Shared by every route that grants a Steam Inventory item (trigger-drop,
// grant-promo, exchange's crafting/cache-open, store key purchases,
// milestone grants) so dev-mode mock-inventory bookkeeping and the real
// IInventoryService/AddItem/v1 call only exist in one place. The three
// existing call sites this replaces each had a different dev-mode
// stacking behavior, so `mode` preserves all three rather than silently
// changing any of them:
//
//   'stack'  — merge into an existing stack of the same itemdefid, or
//              create one. Always succeeds. (trigger-drop's fragments,
//              store key purchases.)
//   'once'   — ownership-gated: if the player already owns this itemdefid,
//              no-op (`granted: []`, `info: 'already_granted'`); otherwise
//              create a new single instance. (grant-promo's class patches,
//              achievement emblems — anything one-per-player.)
//   'unique' — always create a brand-new instance, never merges or checks
//              ownership. (exchange's crafted cosmetics and cache-open
//              rewards — each craft/open is its own tradable instance.)
//
// Real-mode calls Steam's AddItem/v1 identically for all three modes —
// none of the existing real-mode branches had an ownership check either
// (they rely solely on caller-supplied requestId idempotency), so that
// asymmetry is preserved rather than "fixed" here.
export async function grantItemToPlayer({
    steamId,
    itemdefid,
    quantity = 1,
    isDevMode,
    source = 'grant',
    mode = 'unique',
    requestId = null,
    tradeRestriction = false
}) {
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) {
        return { ok: false, reason: 'invalid_grant_quantity' };
    }
    if (isDevMode) {
        const inv = getMockInventory(steamId);

        if (mode === 'once' && inv.some((i) => i.itemdefid === itemdefid)) {
            return { ok: true, granted: [], info: 'already_granted' };
        }

        const existing = mode === 'stack' ? inv.find((i) => i.itemdefid === itemdefid) : null;
        let grantedItem;
        if (existing) {
            existing.quantity += quantity;
            grantedItem = { ...existing };
        } else {
            grantedItem = {
                itemId: `mock-inv-${Math.random().toString(36).substring(2, 10)}`,
                itemdefid,
                quantity,
                acquiredAt: Date.now(),
                properties: { source }
            };
            inv.push(grantedItem);
        }

        await setMockInventory(steamId, inv);
        return { ok: true, granted: [grantedItem] };
    }

    try {
        const params = new URLSearchParams();
        params.append('key', getSteamPublisherKey());
        params.append('appid', String(getSteamAppId()));
        params.append('steamid', steamId);
        for (let index = 0; index < quantity; index += 1) {
            params.append(`itemdefid[${index}]`, String(itemdefid));
        }
        if (tradeRestriction) params.append('trade_restriction', '1');
        if (requestId) {
            params.append('requestid', String(requestId));
        }

        const response = await fetch(`${STEAM_INVENTORY_URL}AddItem/v1/`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: params,
            signal: AbortSignal.timeout(15_000)
        });

        if (!response.ok) {
            return { ok: false, reason: 'steam_api_error', status: response.status };
        }

        const data = await response.json();
        return decodeGrant(data?.response, requestId);
    } catch {
        return { ok: false, reason: 'steam_request_failed' };
    }
}
