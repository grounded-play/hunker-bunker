const INVENTORY_URL = 'https://partner.steam-api.com/IInventoryService/GetInventory/v1/';

function integer(value, minimum) {
    if (!['number', 'string'].includes(typeof value)
        || (typeof value === 'string' && !/^\d+$/.test(value))) return null;
    const number = Number(value);
    return Number.isSafeInteger(number) && number >= minimum ? number : null;
}

function uint64(value) {
    return typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value)
        && BigInt(value) <= 18446744073709551615n;
}

function acquisitionTime(value) {
    if (typeof value !== 'string') return 0;
    // Steam's documented example uses a compact UTC date, not ISO separators.
    const normalized = value.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z');
    const time = Date.parse(normalized);
    return Number.isFinite(time) ? time : 0;
}

// GetInventory's item_json is a JSON-encoded array. Missing/rejected evidence
// must not look like a successful empty inventory or a newly minted quantity 1.
// https://partner.steamgames.com/doc/webapi/IInventoryService#GetInventory
export function decodeSteamInventory(data) {
    const response = data?.response;
    const invalid = { ok: false, status: 502, reason: 'steam_inventory_invalid_response' };
    if (response?.success !== undefined && response.success !== true) {
        return { ok: false, status: 502, reason: 'steam_inventory_rejected' };
    }
    if (typeof response?.item_json !== 'string') return invalid;
    let rows;
    try { rows = JSON.parse(response.item_json); } catch { return invalid; }
    if (!Array.isArray(rows)) return invalid;
    const inventory = [];
    const seen = new Set();
    for (const item of rows) {
        if (!item || !uint64(item.itemid) || seen.has(item.itemid)) return invalid;
        const itemdefid = integer(item.itemdefid, 1);
        const quantity = integer(item.quantity, 0);
        if (itemdefid === null || quantity === null) return invalid;
        seen.add(item.itemid);
        if (quantity === 0 || item.state === 'removed' || item.state === 'consumed') continue;
        inventory.push({ itemId: item.itemid, itemdefid, quantity, acquiredAt: acquisitionTime(item.acquired) });
    }
    return { ok: true, inventory };
}

export async function fetchSteamInventory({ steamId, key, appId, fetchImpl = fetch, timeoutMs = 15_000 }) {
    if (!key) return { ok: false, status: 503, reason: 'missing_publisher_key' };
    if (!uint64(steamId) || integer(appId, 1) === null) {
        return { ok: false, status: 502, reason: 'invalid_inventory_request' };
    }
    try {
        const params = new URLSearchParams({ key, appid: String(appId), steamid: steamId });
        const response = await fetchImpl(`${INVENTORY_URL}?${params}`, { signal: AbortSignal.timeout(timeoutMs) });
        if (!response.ok) return { ok: false, status: 502, reason: 'steam_api_error' };
        return decodeSteamInventory(await response.json());
    } catch {
        // Transport exceptions may contain the complete URL and publisher key.
        return { ok: false, status: 502, reason: 'steam_request_failed' };
    }
}
