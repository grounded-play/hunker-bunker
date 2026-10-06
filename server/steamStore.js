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
import { createPurchaseGrantIntent } from './purchaseGrantIntent.js';

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
const finalizingPurchases = new Set();

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

// HB_STEAM_MICROTXN_SANDBOX=1 sends every purchase to Valve's sandbox. Beta
// testers instead ask for it per purchase, and only the SteamIDs listed in
// HB_STEAM_SANDBOX_STEAM_IDS get it: the server cannot see which branch a
// client runs, and a sandbox purchase still grants real inventory keys.
function globalSandbox() {
    return process.env.HB_STEAM_MICROTXN_SANDBOX === '1';
}

function sandboxAllowed(steamId) {
    return String(process.env.HB_STEAM_SANDBOX_STEAM_IDS ?? '')
        .split(',')
        .map((id) => id.trim())
        .includes(String(steamId));
}

// Purchases record their mode at init; older records predate that field.
function purchaseUsesSandbox(purchase) {
    return typeof purchase?.sandbox === 'boolean' ? purchase.sandbox : globalSandbox();
}

function getMicroTxnBaseUrl(sandbox = globalSandbox()) {
    return sandbox
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
// Pricing categories match Steamworks inventory schema (1;VLV100, 1;VLV400, 1;VLV1000).
export const STORE_CATALOG = Object.freeze([
    { sku: 'key_1', itemdefid: CACHE_KEY_ITEMDEFID, keyCount: 1, priceCategory: '1;VLV100', priceUsdCents: 100, label: '1x Cache Key' },
    { sku: 'key_5', itemdefid: CACHE_KEY_ITEMDEFID, keyCount: 5, priceCategory: '1;VLV400', priceUsdCents: 400, label: '5x Cache Key' },
    { sku: 'key_15', itemdefid: CACHE_KEY_ITEMDEFID, keyCount: 15, priceCategory: '1;VLV1000', priceUsdCents: 1000, label: '15x Cache Key' }
]);

export function getRestrictedRandomPurchaseRegions() {
    const fromEnv = process.env.HB_RANDOM_PURCHASE_RESTRICTED_REGIONS;
    if (fromEnv) {
        return new Set(fromEnv.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean));
    }
    return new Set(['BE', 'BEL']);
}

export function isRegionRestrictedForRandomPurchases(countryCode) {
    if (!countryCode || typeof countryCode !== 'string') return false;
    const normalized = countryCode.trim().toUpperCase();
    return getRestrictedRandomPurchaseRegions().has(normalized);
}

export function extractClientCountry(req) {
    const raw = req?.body?.country
        || req?.query?.country
        || req?.headers?.['cf-ipcountry']
        || req?.headers?.['x-country-code']
        || req?.headers?.['x-client-country']
        || null;
    if (typeof raw !== 'string') return null;
    return raw.trim().toUpperCase().slice(0, 3) || null;
}

function findSku(sku) {
    return STORE_CATALOG.find((row) => row.sku === sku) ?? null;
}

function grantCacheKeys(steamId, keyCount, isDevMode, requestId = null) {
    return grantItemToPlayer({
        steamId,
        itemdefid: CACHE_KEY_ITEMDEFID,
        quantity: keyCount,
        isDevMode,
        source: 'store_purchase',
        mode: 'stack',
        requestId,
        tradeRestriction: !isDevMode
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
            ledgerStatus: 'payment_succeeded',
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

function hasLegacyGrantAttempt(purchase) {
    const attempted = (status) => ['grant_failed', 'finalized_pending_grant', 'completed'].includes(status);
    return !purchase.grantIntent && (attempted(purchase.status) || purchase.events?.some((event) => attempted(event.status)));
}

export async function fulfillPurchasedKeys(purchase) {
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

    if (hasLegacyGrantAttempt(purchase)) {
        await savePurchaseState({ ...purchase, status: 'grant_review_required', reason: 'legacy_grant_requires_review' });
        return { status: 409, body: { ok: false, reason: 'legacy_grant_requires_review', purchaseStatus: 'pending', nextAction: 'show_error' } };
    }
    const grantIntent = purchase.grantIntent ?? createPurchaseGrantIntent(purchase, {
        appId: getSteamAppId(), sandbox: purchaseUsesSandbox(purchase),
        itemdefid: CACHE_KEY_ITEMDEFID, quantity: sku.keyCount
    });
    if (grantIntent.appId !== getSteamAppId()
        || grantIntent.sandbox !== purchaseUsesSandbox(purchase)
        || grantIntent.itemdefid !== CACHE_KEY_ITEMDEFID) {
        return { status: 409, body: { ok: false, reason: 'purchase_grant_context_mismatch', purchaseStatus: 'pending', nextAction: 'show_error' } };
    }
    purchase = await savePurchaseState({
        ...purchase,
        status: 'finalized_pending_grant',
        reason: 'steam_payment_finalized',
        grantIntent
    });
    const grant = await grantCacheKeys(purchase.steamId64, grantIntent.quantity, false, grantIntent.requestId);
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

    const wrongItems = grant.granted.some((item) => item.itemdefid !== grantIntent.itemdefid);
    const wrongInitialQuantity = !grant.replayed && grant.granted.reduce((sum, item) => sum + item.quantity, 0) !== grantIntent.quantity;
    if (wrongItems || wrongInitialQuantity) {
        await savePurchaseState({ ...purchase, status: 'grant_review_required', reason: 'steam_inventory_grant_requires_review', granted: grant.granted });
        return { status: 409, body: { ok: false, reason: 'steam_inventory_grant_requires_review', purchaseStatus: 'pending', nextAction: 'show_error' } };
    }
    const completed = await savePurchaseState({
        ...purchase,
        status: 'completed',
        reason: 'steam_payment_completed',
        granted: grant.granted,
        grantReplayed: grant.replayed,
        grantDelivered: true
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
            granted: grant.granted,
            grantReplayed: grant.replayed
        }
    };
}

export function attachSteamStoreRoutes(app) {
    const steamRouteRateLimit = rateLimit(createRateLimitOptions());

    // Public: catalog + disclosed odds must be visible before purchase
    // (Steamworks policy requires published probabilities for any
    // real-money item involving randomized rewards).
    app.get('/steam/store/catalog', steamRouteRateLimit, (req, res) => {
        const availability = getStoreAvailability();
        const country = extractClientCountry(req);
        const keysRestricted = isRegionRestrictedForRandomPurchases(country);
        res.json({
            ok: true,
            ...availability,
            country: country ?? null,
            keysRestricted,
            restrictedRegionReason: keysRestricted ? 'region_compliance_belgium' : null,
            restrictedRegionNotice: keysRestricted
                ? 'Paid random item keys are unavailable in your region in accordance with local regulations. Direct collection purchases and in-game crafting remain available.'
                : null,
            legalTerms: 'Virtual items have no cash value. Steam Subscriber Agreement governs Steam Wallet and Community Market transactions. In-Game Purchases (Includes Random Items).',
            hostedItemStore: getHostedItemStoreConfig(),
            catalog: STORE_CATALOG.map(({ sku, keyCount, priceUsdCents, priceCategory, label }) => ({
                sku, keyCount, priceUsdCents, priceCategory, label,
                restricted: keysRestricted
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

        const country = extractClientCountry(req);
        if (isRegionRestrictedForRandomPurchases(country)) {
            return res.status(403).json({
                ok: false,
                reason: 'region_restricted',
                message: 'Paid random item keys are unavailable in your region (Belgium) in compliance with local regulations. Direct collection purchases and in-game crafting remain available.',
                purchaseStatus: 'disabled',
                nextAction: 'show_error',
                country
            });
        }

        const sandbox = globalSandbox() || req.body?.sandbox === true;
        if (sandbox && !globalSandbox() && !sandboxAllowed(req.steamId)) {
            return res.status(403).json({
                ok: false,
                reason: 'sandbox_not_allowed',
                purchaseStatus: 'disabled',
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

                const response = await fetch(`${getMicroTxnBaseUrl(sandbox)}InitTxn/v3/`, {
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
                        sandbox,
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
                            sandbox,
                            // usersession=client: Steam shows the approval dialog in
                            // the game's own overlay and returns no URL; the client
                            // waits for MicroTxnAuthorizationResponse, then finalizes.
                            // A web session returns steamurl to open instead.
                            nextAction: steamParams.steamurl ? 'open_overlay' : 'await_steam_approval',
                            requiresConfirmation: true,
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
        if (purchase.steamId64 !== req.steamId) {
            return res.status(403).json({ ok: false, reason: 'transaction_owner_mismatch' });
        }

        // Canonical ledger identity also covers callers using the order-ID alias.
        const lockKey = `${purchase.steamId64}:${purchase.orderId}`;
        if (finalizingPurchases.has(lockKey)) {
            return res.status(409).json({ ok: false, reason: 'purchase_finalize_in_progress', purchaseStatus: 'pending', nextAction: 'retry_finalize' });
        }
        finalizingPurchases.add(lockKey);
        try {
            if (purchase.grantIntent && (purchase.grantIntent.appId !== getSteamAppId()
                || purchase.grantIntent.sandbox !== purchaseUsesSandbox(purchase))) {
                return res.status(409).json({ ok: false, reason: 'purchase_grant_context_mismatch', purchaseStatus: 'pending', nextAction: 'show_error' });
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

            if (purchase.status === 'grant_review_required') {
                return res.status(409).json({ ok: false, reason: purchase.reason, purchaseStatus: 'pending', nextAction: 'show_error' });
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
                // Fence old, non-idempotent attempts before more query events can
                // age their only grant evidence out of the bounded event history.
                if (hasLegacyGrantAttempt(purchase) && purchase.status !== 'completed') {
                    await savePurchaseState({ ...purchase, status: 'grant_review_required', reason: 'legacy_grant_requires_review' });
                    return res.status(409).json({ ok: false, reason: 'legacy_grant_requires_review', purchaseStatus: 'pending', nextAction: 'show_error' });
                }
                const queryParams = new URLSearchParams({
                    key: getSteamPublisherKey(),
                    appid: String(getSteamAppId()),
                    orderid: purchase.orderId ?? purchase.transId,
                    transid: purchase.transId
                });
                const queryResp = await fetch(`${getMicroTxnBaseUrl(purchaseUsesSandbox(purchase))}QueryTxn/v3/?${queryParams.toString()}`, { signal: AbortSignal.timeout(15_000) });
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
                if (steamParams.orderid !== purchase.orderId || steamParams.transid !== purchase.transId
                    || steamParams.steamid !== purchase.steamId64) {
                    await savePurchaseState({ ...purchase, status: 'review_required', reason: 'steam_purchase_identity_mismatch' });
                    return res.status(409).json({ ok: false, reason: 'steam_purchase_identity_mismatch', purchaseStatus: 'pending', nextAction: 'show_error' });
                }
                const steamState = steamParams.status ?? null;
                const classified = classifySteamStatus(steamState);
                await savePurchaseState({
                    ...purchase,
                    status: classified.ledgerStatus,
                    reason: classified.reason,
                    steamState
                });

                const previouslyDelivered = purchase.status === 'completed' || purchase.grantDelivered;
                if (previouslyDelivered && classified.purchaseStatus === 'approved') {
                    await savePurchaseState({ ...purchase, status: 'grant_review_required', reason: 'grant_without_settled_payment', steamState });
                    return res.status(409).json({ ok: false, reason: 'grant_without_settled_payment', purchaseStatus: 'pending', nextAction: 'show_error' });
                }
                if (previouslyDelivered && classified.purchaseStatus === 'completed') {
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
                const finalizeResp = await fetch(`${getMicroTxnBaseUrl(purchaseUsesSandbox(purchase))}FinalizeTxn/v2/`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/x-www-form-urlencoded' },
                    body: finalizeParams,
                    signal: AbortSignal.timeout(15_000)
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
                        // A concurrent capture may since have been refunded. Require
                        // a fresh QueryTxn on the next attempt, never grant on error 6.
                        return res.status(409).json({ ...failureBody, purchaseStatus: 'pending', nextAction: 'retry_finalize' });
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

                const finalized = getSteamParams(finalizeData);
                if (finalized.orderid !== purchase.orderId || finalized.transid !== purchase.transId) {
                    return res.status(409).json({ ok: false, reason: 'steam_purchase_identity_mismatch', purchaseStatus: 'pending', nextAction: 'show_error' });
                }
                const grant = await fulfillPurchasedKeys(purchase);
                res.status(grant.status).json(grant.body);
            } catch {
                res.status(502).json({
                    ok: false,
                    reason: 'steam_request_failed',
                    purchaseStatus: 'pending',
                    nextAction: 'retry_finalize'
                });
            }
        } finally {
            finalizingPurchases.delete(lockKey);
        }
    });
}
