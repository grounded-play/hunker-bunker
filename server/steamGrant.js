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
    requestId = null
}) {
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
        params.append('itemdefid[0]', String(itemdefid));
        params.append('quantity[0]', String(quantity));
        if (requestId) {
            params.append('requestid', String(requestId));
        }

        const response = await fetch(`${STEAM_INVENTORY_URL}AddItem/v1/`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: params
        });

        if (!response.ok) {
            return { ok: false, reason: 'steam_api_error', status: response.status };
        }

        const data = await response.json();
        const items = (data?.response?.item_list ?? []).map((item) => ({
            itemId: String(item.itemid),
            itemdefid: Number(item.itemdefid),
            quantity: Number(item.quantity) || 1
        }));
        return { ok: true, granted: items };
    } catch (err) {
        return { ok: false, reason: 'steam_request_failed', message: err.message };
    }
}
