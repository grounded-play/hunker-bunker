import { rateLimit } from 'express-rate-limit';
import { steamAuthMiddleware as steamStoreAuthMiddleware } from './steamAuth.js';
import {
    checkIdempotency,
    saveIdempotency,
    findPurchaseByTransId,
    findPurchaseByRequestId,
    savePurchaseState
} from './db.js';
import { CACHE_KEY_ITEMDEFID, getDisclosedOdds } from './lootTables.js';
import { grantItemToPlayer } from './steamGrant.js';
import { createRateLimitOptions } from './rateLimit.js';

const STEAM_MICROTXN_URL = 'https://partner.steam-api.com/ISteamMicroTxn/';
const STEAM_MICROTXN_SANDBOX_URL = 'https://partner.steam-api.com/ISteamMicroTxnSandbox/';
const DEFAULT_STORE_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const TERMINAL_FAILED_STATES = new Set(['Failed']);
const REVERSAL_STATES = new Set([
    'Refunded',
    'PartialRefund',
    'Chargedback',
    'RefundedSuspectedFraud',
    'RefundedFriendlyFraud'
]);

let orderCounter = 0;

function getSteamPublisherKey() {
    return process.env.HB_STEAM_PUBLISHER_KEY
        ?? process.env.STEAM_PUBLISHER_KEY
        ?? process.env.STEAM_WEB_API_KEY
        ?? '';
}

function getSteamAppId() {
    return Number(process.env.HB_STEAM_APPID ?? 4957040);
}

function getSteamItemStoreAppId() {
    const appId = Number(process.env.HB_STEAM_ITEM_STORE_APPID ?? getSteamAppId());
    return Number.isInteger(appId) && appId > 0 ? appId : getSteamAppId();
}

// Real-money microtransactions require Valve to enable "Microtransactions"
// for this app in Steamworks (a separate partner agreement/tax setup beyond
// the base Web API key) before InitTxn/QueryTxn/FinalizeTxn calls will
// succeed. Keep this off by default so packaged builds never attempt a real
// charge until that Steamworks-side setup is confirmed done.
function microtxnEnabled() {
    return process.env.HB_STEAM_MICROTXN_ENABLED === '1' && Boolean(getSteamPublisherKey());
}

function isProductionRuntime() {
    return process.env.NODE_ENV === 'production';
}

function mockPurchasesEnabled() {
    if (process.env.HB_STEAM_STORE_MOCK_PURCHASES === '1') return true;
    if (process.env.HB_STEAM_STORE_MOCK_PURCHASES === '0') return false;
    return !isProductionRuntime();
}

function livePurchasesEnabled() {
    return process.env.HB_STEAM_STORE_ENABLED === '1' && microtxnEnabled();
}

function getStoreIdempotencyTtlMs() {
    const raw = Number(process.env.HB_STORE_IDEMPOTENCY_TTL_SECONDS);
    if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_STORE_IDEMPOTENCY_TTL_MS;
    return Math.min(7 * 24 * 60 * 60, Math.max(60, Math.floor(raw))) * 1000;
}

function getMicroTxnBaseUrl() {
    return process.env.HB_STEAM_MICROTXN_SANDBOX === '1'
        ? STEAM_MICROTXN_SANDBOX_URL
        : STEAM_MICROTXN_URL;
}

function normalizeSteamItemStoreUrl(value) {
    const text = String(value ?? '').trim();
    if (!text) return null;
    try {
        const parsed = new URL(text);
        if (parsed.protocol !== 'https:' || parsed.hostname !== 'store.steampowered.com') return null;
        if (!parsed.pathname.startsWith('/itemstore/')) return null;
        return parsed.toString();
    } catch {
        return null;
    }
}

function withBetaQuery(url) {
    const parsed = new URL(url);
    parsed.searchParams.set('beta', '1');
    return parsed.toString();
}

function getHostedItemStoreConfig() {
    const appId = getSteamItemStoreAppId();
    const defaultUrl = `https://store.steampowered.com/itemstore/${appId}/`;
    const url = normalizeSteamItemStoreUrl(process.env.HB_STEAM_ITEM_STORE_URL) ?? defaultUrl;
    const betaUrl = normalizeSteamItemStoreUrl(process.env.HB_STEAM_ITEM_STORE_BETA_URL) ?? withBetaQuery(url);
    const enabled = process.env.HB_STEAM_ITEM_STORE_ENABLED === '1';
    const beta = process.env.HB_STEAM_ITEM_STORE_BETA === '1';
    return {
        enabled,
        mode: enabled ? (beta ? 'beta' : 'live') : 'disabled',
        appId,
        url: enabled ? (beta ? betaUrl : url) : null,
        betaUrl,
        publicUrl: url
    };
}

function createOrderId() {
    orderCounter = (orderCounter + 1) % 1000;
    return String((BigInt(Date.now()) * 1000n) + BigInt(orderCounter));
}

function getStoreAvailability() {
    const live = livePurchasesEnabled();
    const mock = mockPurchasesEnabled();
    return {
        microtransactionsEnabled: microtxnEnabled(),
        purchasesEnabled: live || mock,
        purchaseMode: live ? 'live' : (mock ? 'mock' : 'disabled'),
        mockPurchasesEnabled: mock,
        disabledReason: live || mock ? null : 'steam_store_disabled'
    };
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

function getSteamParams(data) {
    const params = data?.response?.params;
    return params && typeof params === 'object' ? params : {};
}

function getSteamError(data) {
    const error = data?.response?.error;
    return error && typeof error === 'object' ? error : {};
}

function steamResultOk(data) {
    const result = data?.response?.result;
    return result === 'OK' || result === 1 || result === '1';
}

function reasonForSteamError(errorCode, fallbackReason = 'steam_api_error') {
    const code = String(errorCode ?? '');
    const reasons = {
        '2': 'steam_operation_failed',
        '3': 'steam_invalid_parameter',
        '4': 'steam_internal_error',
        '5': 'steam_purchase_not_approved',
        '6': 'steam_purchase_already_committed',
        '7': 'steam_user_not_logged_in',
        '8': 'steam_currency_mismatch',
        '9': 'steam_account_unavailable',
        '10': 'steam_purchase_denied',
        '11': 'steam_restricted_country',
        '12': 'steam_billing_agreement_inactive',
        '13': 'steam_billing_agreement_not_game',
        '14': 'steam_billing_agreement_on_hold',
        '15': 'steam_billing_agreement_not_steam',
        '16': 'steam_billing_agreement_duplicate',
        '100': 'steam_insufficient_funds',
        '101': 'steam_finalization_expired',
        '102': 'steam_account_disabled',
        '103': 'steam_purchase_not_allowed',
        '104': 'steam_fraud_blocked',
        '105': 'steam_no_cached_payment_method',
        '106': 'steam_spending_limit_exceeded'
    };
    return reasons[code] ?? fallbackReason;
}

function steamFailureBody(data, fallbackReason = 'steam_api_error') {
    const error = getSteamError(data);
    const reason = reasonForSteamError(error.errorcode, fallbackReason);
    const body = {
        ok: false,
        reason,
        purchaseStatus: reason === 'steam_purchase_not_approved' ? 'pending' : 'failed',
        nextAction: reason === 'steam_purchase_not_approved' ? 'retry_finalize' : 'show_error'
    };
    if (error.errorcode !== undefined) body.steamErrorCode = String(error.errorcode);
    if (error.errordesc) body.steamErrorDesc = String(error.errordesc);
    if (data?.response?.result) body.steamResult = String(data.response.result);
    return body;
}

function classifySteamStatus(steamState) {
    if (steamState === 'Succeeded') {
        return {
            purchaseStatus: 'completed',
            ledgerStatus: 'completed',
            nextAction: 'refresh_inventory',
            reason: null
        };
    }
    if (steamState === 'Approved') {
        return {
            purchaseStatus: 'approved',
            ledgerStatus: 'approved',
            nextAction: 'finalize_purchase',
            reason: null
        };
    }
    if (steamState === 'Init' || !steamState) {
        return {
            purchaseStatus: 'pending',
            ledgerStatus: 'pending_confirmation',
            nextAction: 'retry_finalize',
            reason: 'steam_purchase_pending'
        };
    }
    if (TERMINAL_FAILED_STATES.has(steamState)) {
        return {
            purchaseStatus: 'failed',
            ledgerStatus: 'failed',
            nextAction: 'show_error',
            reason: 'steam_purchase_failed'
        };
    }
    if (REVERSAL_STATES.has(steamState)) {
        return {
            purchaseStatus: 'reversed',
            ledgerStatus: 'reversed',
            nextAction: 'show_error',
            reason: 'steam_purchase_reversed'
        };
    }
    return {
        purchaseStatus: 'pending',
        ledgerStatus: 'pending_unknown',
        nextAction: 'retry_finalize',
        reason: 'steam_purchase_unknown_state'
    };
}

function responseForStoredPurchase(purchase) {
    const mode = purchase.status === 'mock_completed' ? 'mock' : 'live';
    if (purchase.status === 'completed' || purchase.status === 'mock_completed') {
        return {
            status: 200,
            body: {
                ok: true,
                mode,
                status: 'completed',
                purchaseStatus: 'completed',
                nextAction: 'refresh_inventory',
                transId: purchase.transId,
                orderId: purchase.orderId,
                alreadyGranted: true
            }
        };
    }
    if (purchase.status === 'failed' || purchase.status === 'reversed') {
        return {
            status: 409,
            body: {
                ok: false,
                reason: purchase.reason ?? (purchase.status === 'reversed' ? 'steam_purchase_reversed' : 'steam_purchase_failed'),
                mode,
                status: purchase.status,
                purchaseStatus: purchase.status === 'reversed' ? 'reversed' : 'failed',
                nextAction: 'show_error',
                transId: purchase.transId,
                orderId: purchase.orderId,
                steamState: purchase.steamState ?? null
            }
        };
    }
    return {
        status: 200,
        body: {
            ok: true,
            mode,
            status: purchase.status,
            purchaseStatus: purchase.status === 'approved' ? 'approved' : 'pending',
            nextAction: purchase.status === 'approved' ? 'finalize_purchase' : 'retry_finalize',
            transId: purchase.transId,
            orderId: purchase.orderId,
            requiresConfirmation: true,
            confirmUrl: purchase.confirmUrl ?? null
        }
    };
}

async function readSteamJson(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

async function fulfillPurchasedKeys(purchase) {
    const sku = findSku(purchase.sku);
    if (!sku) {
        await savePurchaseState({
            ...purchase,
            status: 'grant_failed',
            reason: 'purchase_sku_not_found'
        });
        return {
            status: 500,
            body: {
                ok: false,
                reason: 'purchase_sku_not_found',
                purchaseStatus: 'failed',
                nextAction: 'show_error'
            }
        };
    }

    await savePurchaseState({
        ...purchase,
        status: 'finalized_pending_grant',
        reason: 'steam_payment_finalized'
    });
    const grant = await grantCacheKeys(purchase.steamId64, sku.keyCount, false);
    if (!grant.ok) {
        await savePurchaseState({
            ...purchase,
            status: 'grant_failed',
            reason: grant.reason ?? 'steam_inventory_grant_failed'
        });
        return {
            status: grant.status ?? 502,
            body: {
                ok: false,
                reason: grant.reason ?? 'steam_inventory_grant_failed',
                purchaseStatus: 'pending',
                nextAction: 'retry_finalize'
            }
        };
    }

    const completed = await savePurchaseState({
        ...purchase,
        status: 'completed',
        reason: 'steam_payment_completed',
        granted: grant.granted ?? []
    });
    return {
        status: 200,
        body: {
            ok: true,
            mode: 'live',
            status: 'completed',
            purchaseStatus: 'completed',
            nextAction: 'refresh_inventory',
            transId: completed.transId,
            orderId: completed.orderId,
            granted: grant.granted ?? []
        }
    };
}

export function attachSteamStoreRoutes(app) {
    const steamRouteRateLimit = rateLimit(createRateLimitOptions());

    // Public: catalog + disclosed odds must be visible before purchase
    // (Steamworks policy requires published probabilities for any
    // real-money item involving randomized rewards).
    app.get('/steam/store/catalog', steamRouteRateLimit, (_req, res) => {
        const availability = getStoreAvailability();
        res.json({
            ok: true,
            ...availability,
            hostedItemStore: getHostedItemStoreConfig(),
            catalog: STORE_CATALOG.map(({ sku, keyCount, priceUsdCents, label }) => ({
                sku, keyCount, priceUsdCents, label
            })),
            deepRelicCacheOdds: getDisclosedOdds()
        });
    });

    app.post('/steam/store/purchase/init', steamRouteRateLimit, steamStoreAuthMiddleware, async (req, res) => {
        const requestId = req.body?.requestId;
        const sku = findSku(req.body?.sku);

        const cached = checkIdempotency(requestId);
        if (cached) {
            return res.status(cached.status).json(cached.body);
        }
        if (!sku) {
            return res.status(400).json({
                ok: false,
                reason: 'invalid_sku',
                purchaseStatus: 'failed',
                nextAction: 'show_error'
            });
        }

        let result;
        const availability = getStoreAvailability();
        const existingPurchase = requestId ? findPurchaseByRequestId(requestId) : null;

        if (existingPurchase) {
            result = responseForStoredPurchase(existingPurchase);
        } else if (!availability.purchasesEnabled) {
            result = {
                status: 503,
                body: {
                    ok: false,
                    reason: availability.disabledReason,
                    purchaseStatus: 'disabled',
                    nextAction: 'show_error',
                    microtransactionsEnabled: availability.microtransactionsEnabled,
                    purchasesEnabled: false,
                    purchaseMode: availability.purchaseMode
                }
            };
        } else if (availability.purchaseMode === 'mock') {
            const grant = await grantCacheKeys(req.steamId, sku.keyCount, true);
            const transId = `mock-${requestId ?? Math.random().toString(36).slice(2)}`;
            await savePurchaseState({
                steamId64: req.steamId,
                requestId,
                sku: sku.sku,
                transId,
                orderId: transId,
                status: 'mock_completed',
                priceUsdCents: sku.priceUsdCents,
                granted: grant.granted ?? []
            });
            result = {
                status: 200,
                body: {
                    ok: true,
                    mode: 'mock',
                    status: 'completed',
                    purchaseStatus: 'completed',
                    nextAction: 'refresh_inventory',
                    transId,
                    orderId: transId,
                    granted: grant.granted,
                    requiresConfirmation: false
                }
            };
        } else if (availability.purchaseMode === 'live') {
            try {
                const orderId = createOrderId();
                const params = new URLSearchParams();
                params.append('key', getSteamPublisherKey());
                params.append('appid', String(getSteamAppId()));
                params.append('steamid', req.steamId);
                params.append('orderid', String(orderId));
                params.append('itemcount', '1');
                params.append('language', 'en');
                params.append('currency', 'USD');
                params.append('usersession', 'client');
                params.append('itemid[0]', String(sku.itemdefid));
                params.append('qty[0]', String(sku.keyCount));
                params.append('amount[0]', String(sku.priceUsdCents));
                params.append('description[0]', sku.label);

                const response = await fetch(`${getMicroTxnBaseUrl()}InitTxn/v3/`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/x-www-form-urlencoded' },
                    body: params
                });

                const data = await readSteamJson(response);
                if (!response.ok) {
                    result = {
                        status: response.status,
                        body: {
                            ok: false,
                            reason: 'steam_api_error',
                            purchaseStatus: 'failed',
                            nextAction: 'show_error'
                        }
                    };
                } else if (!steamResultOk(data)) {
                    result = { status: 409, body: steamFailureBody(data, 'steam_purchase_init_failed') };
                } else {
                    const steamParams = getSteamParams(data);
                    const transId = steamParams.transid ?? String(orderId);
                    await savePurchaseState({
                        steamId64: req.steamId,
                        requestId,
                        sku: sku.sku,
                        orderId: String(steamParams.orderid ?? orderId),
                        transId: String(transId),
                        status: 'pending_confirmation',
                        priceUsdCents: sku.priceUsdCents,
                        confirmUrl: steamParams.steamurl ?? null,
                        steamResult: data?.response?.result ?? null
                    });
                    result = {
                        status: 200,
                        body: {
                            ok: true,
                            mode: 'live',
                            transId: String(transId),
                            orderId: String(steamParams.orderid ?? orderId),
                            status: 'pending_confirmation',
                            purchaseStatus: 'pending',
                            nextAction: 'open_overlay',
                            requiresConfirmation: true,
                            // Client should open this via electronAPI.openSteamOverlayToUrl
                            // so the player confirms payment in the Steam overlay.
                            confirmUrl: steamParams.steamurl ?? null
                        }
                    };
                }
            } catch (err) {
                result = {
                    status: 502,
                    body: {
                        ok: false,
                        reason: 'steam_request_failed',
                        purchaseStatus: 'failed',
                        nextAction: 'show_error',
                        message: err.message
                    }
                };
            }
        } else {
            result = {
                status: 503,
                body: {
                    ok: false,
                    reason: 'steam_store_disabled',
                    purchaseStatus: 'disabled',
                    nextAction: 'show_error'
                }
            };
        }

        await saveIdempotency(requestId, result, { ttlMs: getStoreIdempotencyTtlMs() });
        res.status(result.status).json(result.body);
    });

    app.post('/steam/store/purchase/finalize', steamRouteRateLimit, steamStoreAuthMiddleware, async (req, res) => {
        const transId = req.body?.transId;
        const reconcile = req.body?.reconcile === true || req.body?.checkSteamState === true;
        if (!transId) {
            return res.status(400).json({ ok: false, reason: 'missing_trans_id' });
        }

        const purchase = findPurchaseByTransId(transId);
        if (!purchase) {
            return res.status(404).json({ ok: false, reason: 'unknown_transaction' });
        }
        if (purchase.steamId64 && purchase.steamId64 !== req.steamId) {
            return res.status(403).json({ ok: false, reason: 'transaction_owner_mismatch' });
        }

        // Mock purchases already granted at init time — finalize is a no-op
        // confirmation so the client can always call the same two-step flow.
        if (purchase.status === 'mock_completed') {
            return res.json({
                ok: true,
                mode: 'mock',
                status: 'completed',
                purchaseStatus: 'completed',
                nextAction: 'refresh_inventory',
                alreadyGranted: true
            });
        }

        if (purchase.status === 'completed' && !reconcile) {
            return res.json({
                ok: true,
                mode: 'live',
                status: 'completed',
                purchaseStatus: 'completed',
                nextAction: 'refresh_inventory',
                alreadyGranted: true
            });
        }

        if (purchase.status === 'grant_failed' || purchase.status === 'finalized_pending_grant') {
            const retryGrant = await fulfillPurchasedKeys(purchase);
            return res.status(retryGrant.status).json(retryGrant.body);
        }

        if (!microtxnEnabled()) {
            return res.status(503).json({
                ok: false,
                reason: 'steam_microtransactions_not_enabled',
                purchaseStatus: 'disabled',
                nextAction: 'show_error'
            });
        }

        try {
            const queryParams = new URLSearchParams({
                key: getSteamPublisherKey(),
                appid: String(getSteamAppId()),
                orderid: purchase.orderId ?? purchase.transId,
                transid: purchase.transId
            });
            const queryResp = await fetch(`${getMicroTxnBaseUrl()}QueryTxn/v3/?${queryParams.toString()}`);
            const queryData = await readSteamJson(queryResp);
            if (!queryResp.ok) {
                await savePurchaseState({
                    ...purchase,
                    status: 'query_failed',
                    reason: 'steam_api_error'
                });
                return res.status(queryResp.status).json({
                    ok: false,
                    reason: 'steam_api_error',
                    purchaseStatus: 'pending',
                    nextAction: 'retry_finalize'
                });
            }
            if (!steamResultOk(queryData)) {
                const failureBody = steamFailureBody(queryData, 'steam_query_failed');
                if (failureBody.reason === 'steam_purchase_not_approved') {
                    await savePurchaseState({
                        ...purchase,
                        status: 'pending_confirmation',
                        reason: failureBody.reason
                    });
                    return res.json({ ...failureBody, ok: true, status: 'pending' });
                }
                await savePurchaseState({
                    ...purchase,
                    status: 'failed',
                    reason: failureBody.reason,
                    steamErrorCode: failureBody.steamErrorCode ?? null
                });
                return res.status(409).json(failureBody);
            }

            const steamParams = getSteamParams(queryData);
            const steamState = steamParams.status ?? null;
            const classified = classifySteamStatus(steamState);
            await savePurchaseState({
                ...purchase,
                status: classified.ledgerStatus,
                reason: classified.reason,
                steamState
            });

            if (
                purchase.status === 'completed'
                && (classified.purchaseStatus === 'completed' || classified.purchaseStatus === 'approved')
            ) {
                await savePurchaseState({
                    ...purchase,
                    status: 'completed',
                    reason: 'steam_payment_still_completed',
                    steamState
                });
                return res.json({
                    ok: true,
                    mode: 'live',
                    status: 'completed',
                    purchaseStatus: 'completed',
                    nextAction: 'refresh_inventory',
                    alreadyGranted: true,
                    reconciled: true,
                    steamState: steamState ?? 'unknown'
                });
            }

            if (classified.purchaseStatus === 'completed') {
                const grant = await fulfillPurchasedKeys({ ...purchase, steamState });
                return res.status(grant.status).json(grant.body);
            }
            if (classified.purchaseStatus !== 'approved') {
                const body = {
                    ok: classified.purchaseStatus === 'pending',
                    status: classified.purchaseStatus === 'pending' ? 'pending' : classified.purchaseStatus,
                    purchaseStatus: classified.purchaseStatus,
                    nextAction: classified.nextAction,
                    steamState: steamState ?? 'unknown'
                };
                if (classified.reason) body.reason = classified.reason;
                return res.status(classified.purchaseStatus === 'pending' ? 200 : 409).json(body);
            }

            const finalizeParams = new URLSearchParams({
                key: getSteamPublisherKey(),
                appid: String(getSteamAppId()),
                orderid: purchase.orderId ?? purchase.transId
            });
            const finalizeResp = await fetch(`${getMicroTxnBaseUrl()}FinalizeTxn/v2/`, {
                method: 'POST',
                headers: { 'content-type': 'application/x-www-form-urlencoded' },
                body: finalizeParams
            });
            const finalizeData = await readSteamJson(finalizeResp);
            if (!finalizeResp.ok) {
                await savePurchaseState({
                    ...purchase,
                    status: 'finalize_failed',
                    reason: 'steam_finalize_failed'
                });
                return res.status(finalizeResp.status).json({
                    ok: false,
                    reason: 'steam_finalize_failed',
                    purchaseStatus: 'pending',
                    nextAction: 'retry_finalize'
                });
            }
            if (!steamResultOk(finalizeData)) {
                const failureBody = steamFailureBody(finalizeData, 'steam_finalize_failed');
                if (failureBody.reason === 'steam_purchase_already_committed') {
                    const grant = await fulfillPurchasedKeys(purchase);
                    return res.status(grant.status).json(grant.body);
                }
                if (failureBody.reason === 'steam_purchase_not_approved') {
                    await savePurchaseState({
                        ...purchase,
                        status: 'pending_confirmation',
                        reason: failureBody.reason
                    });
                    return res.json({ ...failureBody, ok: true, status: 'pending' });
                }
                await savePurchaseState({
                    ...purchase,
                    status: 'finalize_failed',
                    reason: failureBody.reason,
                    steamErrorCode: failureBody.steamErrorCode ?? null
                });
                return res.status(409).json(failureBody);
            }

            const grant = await fulfillPurchasedKeys(purchase);
            res.status(grant.status).json(grant.body);
        } catch (err) {
            res.status(502).json({
                ok: false,
                reason: 'steam_request_failed',
                purchaseStatus: 'pending',
                nextAction: 'retry_finalize',
                message: err.message
            });
        }
    });
}
