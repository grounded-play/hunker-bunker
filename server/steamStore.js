import { verifySteamSessionTicket } from './steamAuth.js';
import {
    checkIdempotency,
    saveIdempotency,
    findPurchaseByTransId,
    savePurchaseReceipt
} from './db.js';
import { CACHE_KEY_ITEMDEFID, getDisclosedOdds } from './lootTables.js';
import { grantItemToPlayer } from './steamGrant.js';

const STEAM_MICROTXN_URL = 'https://partner.steam-api.com/ISteamMicroTxn/';

function getSteamPublisherKey() {
    return process.env.HB_STEAM_PUBLISHER_KEY
        ?? process.env.STEAM_PUBLISHER_KEY
        ?? process.env.STEAM_WEB_API_KEY
        ?? '';
}

function getSteamAppId() {
    return Number(process.env.HB_STEAM_APPID ?? 1247290);
}

// Real-money microtransactions require Valve to enable "Microtransactions"
// for this app in Steamworks (a separate partner agreement/tax setup beyond
// the base Web API key) before InitTxn/QueryTxn/FinalizeTxn calls will
// succeed. Keep this off by default so packaged builds never attempt a real
// charge until that Steamworks-side setup is confirmed done.
function microtxnEnabled() {
    return process.env.HB_STEAM_MICROTXN_ENABLED === '1' && Boolean(getSteamPublisherKey());
}

// Cache Keys are the only real-money SKU. Deep Relic Caches themselves drop
// for free via playtime/promo grants — this mirrors Valve's own crate+key model.
export const STORE_CATALOG = Object.freeze([
    { sku: 'key_1', itemdefid: CACHE_KEY_ITEMDEFID, keyCount: 1, priceUsdCents: 99, label: '1x Cache Key' },
    { sku: 'key_5', itemdefid: CACHE_KEY_ITEMDEFID, keyCount: 5, priceUsdCents: 399, label: '5x Cache Key' },
    { sku: 'key_15', itemdefid: CACHE_KEY_ITEMDEFID, keyCount: 15, priceUsdCents: 999, label: '15x Cache Key' }
]);

function findSku(sku) {
    return STORE_CATALOG.find((row) => row.sku === sku) ?? null;
}

// steamStoreAuthMiddleware mirrors steamInventory's auth middleware so this
// module has no import-order dependency on it.
async function steamStoreAuthMiddleware(req, res, next) {
    const ticketHex = req.body?.ticketHex ?? req.query?.ticketHex;
    const identity = req.body?.identity ?? req.query?.identity;

    if (!ticketHex) {
        return res.status(401).json({ ok: false, reason: 'missing_ticket' });
    }

    const auth = await verifySteamSessionTicket({ ticketHex, identity });
    if (!auth.ok) {
        if (auth.reason === 'steam_auth_not_configured') {
            req.steamId = '76561198000000000';
            req.isDevMode = true;
            return next();
        }
        return res.status(auth.status || 401).json(auth);
    }

    req.steamId = auth.steamId64;
    req.isDevMode = false;
    next();
}

function grantCacheKeys(steamId, keyCount, isDevMode) {
    return grantItemToPlayer({
        steamId,
        itemdefid: CACHE_KEY_ITEMDEFID,
        quantity: keyCount,
        isDevMode,
        source: 'store_purchase',
        mode: 'stack'
    });
}

export function attachSteamStoreRoutes(app) {
    // Public: catalog + disclosed odds must be visible before purchase
    // (Steamworks policy requires published probabilities for any
    // real-money item involving randomized rewards).
    app.get('/steam/store/catalog', (_req, res) => {
        res.json({
            ok: true,
            microtransactionsEnabled: microtxnEnabled(),
            catalog: STORE_CATALOG.map(({ sku, keyCount, priceUsdCents, label }) => ({
                sku, keyCount, priceUsdCents, label
            })),
            deepRelicCacheOdds: getDisclosedOdds()
        });
    });

    app.post('/steam/store/purchase/init', steamStoreAuthMiddleware, async (req, res) => {
        const requestId = req.body?.requestId;
        const sku = findSku(req.body?.sku);

        const cached = checkIdempotency(requestId);
        if (cached) {
            return res.status(cached.status).json(cached.body);
        }
        if (!sku) {
            return res.status(400).json({ ok: false, reason: 'invalid_sku' });
        }

        let result;

        if (req.isDevMode || !microtxnEnabled()) {
            const grant = await grantCacheKeys(req.steamId, sku.keyCount, true);
            await savePurchaseReceipt({
                steamId64: req.steamId,
                sku: sku.sku,
                transId: `mock-${requestId ?? Math.random().toString(36).slice(2)}`,
                status: 'mock_completed',
                priceUsdCents: sku.priceUsdCents
            });
            result = {
                status: 200,
                body: { ok: true, mode: 'mock', granted: grant.granted, requiresConfirmation: false }
            };
        } else {
            try {
                const orderId = Date.now();
                const params = new URLSearchParams();
                params.append('key', getSteamPublisherKey());
                params.append('appid', String(getSteamAppId()));
                params.append('steamid', req.steamId);
                params.append('orderid', String(orderId));
                params.append('itemcount', '1');
                params.append('language', 'en');
                params.append('currency', 'USD');
                params.append('itemid[0]', String(sku.itemdefid));
                params.append('qty[0]', String(sku.keyCount));
                params.append('amount[0]', String(sku.priceUsdCents));
                params.append('description[0]', sku.label);

                const response = await fetch(`${STEAM_MICROTXN_URL}InitTxn/v3/`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/x-www-form-urlencoded' },
                    body: params
                });

                if (!response.ok) {
                    result = { status: response.status, body: { ok: false, reason: 'steam_api_error' } };
                } else {
                    const data = await response.json();
                    const transId = data?.response?.params?.transid ?? String(orderId);
                    await savePurchaseReceipt({
                        steamId64: req.steamId,
                        sku: sku.sku,
                        transId: String(transId),
                        status: 'pending_confirmation',
                        priceUsdCents: sku.priceUsdCents
                    });
                    result = {
                        status: 200,
                        body: {
                            ok: true,
                            mode: 'live',
                            transId: String(transId),
                            requiresConfirmation: true,
                            // Client should open this via electronAPI.openSteamOverlayToUrl
                            // so the player confirms payment in the Steam overlay.
                            confirmUrl: data?.response?.params?.steamurl ?? null
                        }
                    };
                }
            } catch (err) {
                result = { status: 502, body: { ok: false, reason: 'steam_request_failed', message: err.message } };
            }
        }

        await saveIdempotency(requestId, result);
        res.status(result.status).json(result.body);
    });

    app.post('/steam/store/purchase/finalize', steamStoreAuthMiddleware, async (req, res) => {
        const transId = req.body?.transId;
        if (!transId) {
            return res.status(400).json({ ok: false, reason: 'missing_trans_id' });
        }

        const purchase = findPurchaseByTransId(transId);
        if (!purchase) {
            return res.status(404).json({ ok: false, reason: 'unknown_transaction' });
        }

        // Mock purchases already granted at init time — finalize is a no-op
        // confirmation so the client can always call the same two-step flow.
        if (purchase.status === 'mock_completed') {
            return res.json({ ok: true, mode: 'mock', status: 'completed', alreadyGranted: true });
        }

        if (!microtxnEnabled()) {
            return res.status(503).json({ ok: false, reason: 'steam_microtransactions_not_enabled' });
        }

        try {
            const queryParams = new URLSearchParams({
                key: getSteamPublisherKey(),
                appid: String(getSteamAppId()),
                orderid: transId,
                transid: transId
            });
            const queryResp = await fetch(`${STEAM_MICROTXN_URL}QueryTxn/v2/?${queryParams.toString()}`);
            if (!queryResp.ok) {
                return res.status(queryResp.status).json({ ok: false, reason: 'steam_api_error' });
            }
            const queryData = await queryResp.json();
            const steamState = queryData?.response?.params?.status;

            if (steamState !== 'Approved') {
                return res.json({ ok: true, status: 'pending', steamState: steamState ?? 'unknown' });
            }

            const finalizeParams = new URLSearchParams({
                key: getSteamPublisherKey(),
                appid: String(getSteamAppId()),
                orderid: transId
            });
            const finalizeResp = await fetch(`${STEAM_MICROTXN_URL}FinalizeTxn/v2/`, {
                method: 'POST',
                headers: { 'content-type': 'application/x-www-form-urlencoded' },
                body: finalizeParams
            });
            if (!finalizeResp.ok) {
                return res.status(finalizeResp.status).json({ ok: false, reason: 'steam_finalize_failed' });
            }

            const sku = findSku(purchase.sku);
            const grant = await grantCacheKeys(purchase.steamId64, sku?.keyCount ?? 1, false);
            await savePurchaseReceipt({
                steamId64: purchase.steamId64,
                sku: purchase.sku,
                transId: purchase.transId,
                status: 'completed',
                priceUsdCents: purchase.priceUsdCents
            });

            res.json({ ok: true, status: 'completed', granted: grant.granted ?? [] });
        } catch (err) {
            res.status(502).json({ ok: false, reason: 'steam_request_failed', message: err.message });
        }
    });
}
