// Microtransactions reconciliation (Valve review, build 25475189): the game's
// economy must be reconciled against Steam's settled transactions with
// ISteamMicroTxn/GetReport. This module fetches the report, compares it with
// the purchases this backend recorded, and flags every mismatch:
//
//   * settled on Steam but not granted here (the player paid, got nothing);
//   * granted here but refunded or charged back on Steam (revoke or review);
//   * completed here but absent from this report (requires further investigation).
//
// It runs on a timer while Microtransactions are enabled, and as a CLI
// (server/scripts/microtxn-report.js) whose output is what Valve asks for.
import { listPurchases, getMicroTxnCheckpoint, saveMicroTxnCheckpoint, savePurchaseState, getMockInventory, setMockInventory } from './db.js';
import { isReportTime, scanMicroTxnReport } from './steamMicroTxnScan.js';
import { fetchSteamInventory } from './steamInventoryRead.js';
import { decodeConsumeItemResponse, deriveNumericRequestId } from './steamTradeUp.js';
import { fulfillPurchasedKeys } from './steamStore.js';

const MICROTXN_URL = 'https://partner.steam-api.com/ISteamMicroTxn/';
const MICROTXN_SANDBOX_URL = 'https://partner.steam-api.com/ISteamMicroTxnSandbox/';

export const REPORT_TYPES = Object.freeze(['GAMESALES', 'STEAMSTORESALES', 'SETTLEMENT']);
export const REVERSAL_DISPOSITIONS = Object.freeze({
    ITEMS_REVOKED: 'items_revoked',
    ITEMS_ALREADY_CONSUMED: 'items_already_consumed',
    ITEMS_TRADED_OR_TRANSFERRED: 'items_traded_or_transferred',
    HELD_FOR_REVIEW: 'held_for_review',
    OPERATOR_SETTLED: 'operator_settled'
});

const REVERSED_STATUSES = new Set(['Refunded', 'PartialRefund', 'Chargedback', 'RefundedSuspectedFraud', 'RefundedFriendlyFraud']);
// Finalizing payment is not proof that inventory was granted successfully.
const GRANTED_LOCAL_STATUSES = new Set(['completed']);
const UNSETTLED_STATUSES = new Set(['Init', 'Approved', 'Denied', 'Failed']);

export function hasGrantEvidence(purchase) {
    if (!purchase || purchase.status === 'mock_completed' || purchase.mode === 'mock') return false;
    // Settled reversals (keys revoked or operator reviewed and settled) have no outstanding unrevoked grant
    if (purchase.status === 'reversed_settled'
        || purchase.reversalDisposition === REVERSAL_DISPOSITIONS.ITEMS_REVOKED
        || purchase.reversalDisposition === REVERSAL_DISPOSITIONS.OPERATOR_SETTLED) {
        return false;
    }
    // QueryTxn can replace `completed` with `reversed` or a failure state.
    // The existing grant receipt/event must still trigger refund review.
    return purchase.grantDelivered === true || GRANTED_LOCAL_STATUSES.has(purchase.status)
        || (Array.isArray(purchase.granted) && purchase.granted.length > 0)
        || (Array.isArray(purchase.events) && purchase.events.some((event) => event.status === 'completed'));
}

export function microTxnReportUrl({ sandbox = false } = {}) {
    return `${sandbox ? MICROTXN_SANDBOX_URL : MICROTXN_URL}GetReport/v5/`;
}

/**
 * Calls GetReport. `time` is the RFC 3339 start of the window. The key is
 * never included in the returned request description.
 */
export async function fetchMicroTxnReport({
    key,
    appId,
    time,
    type = 'GAMESALES',
    maxResults = 1000,
    sandbox = false,
    fetchImpl = fetch,
    timeoutMs = 15_000
}) {
    if (!key) return { ok: false, reason: 'missing_publisher_key' };
    if (!REPORT_TYPES.includes(type)) return { ok: false, reason: 'invalid_report_type' };
    if (!isReportTime(time)) return { ok: false, reason: 'invalid_report_time' };
    if (!Number.isSafeInteger(Number(appId)) || Number(appId) < 1) return { ok: false, reason: 'invalid_app_id' };
    if (!Number.isSafeInteger(maxResults) || maxResults < 1 || maxResults > 50_000) return { ok: false, reason: 'invalid_page_size' };
    const params = new URLSearchParams({ key, appid: String(appId), type, time, maxresults: String(maxResults) });
    const request = { endpoint: microTxnReportUrl({ sandbox }), appid: String(appId), type, time, maxresults: maxResults };
    try {
        const response = await fetchImpl(`${request.endpoint}?${params.toString()}`, { signal: AbortSignal.timeout(timeoutMs) });
        const body = await response.json().catch(() => null);
        const result = body?.response?.result;
        if (!response.ok || result !== 'OK') {
            return { ok: false, reason: 'steam_api_error', status: response.status, request, response: body };
        }
        const reportParams = body.response.params;
        const orders = reportParams?.orders ?? (reportParams?.count === 0 ? [] : null);
        if (!Array.isArray(orders) || (reportParams.count !== undefined && Number(reportParams.count) !== orders.length)) {
            return { ok: false, reason: 'invalid_report_response', request, response: body };
        }
        return { ok: true, request, response: body, orders };
    } catch {
        // A fetch error can embed the complete URL including the publisher key.
        // Never propagate arbitrary transport exception text into evidence/logs.
        return { ok: false, reason: 'steam_request_failed', request };
    }
}

/** Compares Steam's settled orders with this backend's purchase records. */
export function reconcileMicroTxnReport(orders = [], purchases = [], { since = null } = {}) {
    const windowStart = since ? Date.parse(since) : -Infinity;
    const byOrderId = new Map();
    const byTransId = new Map();
    for (const purchase of purchases) {
        if (purchase.orderId && String(purchase.orderId) !== '0') byOrderId.set(String(purchase.orderId), purchase);
        if (purchase.transId) byTransId.set(String(purchase.transId), purchase);
    }
    const matched = [];
    const paidNotGranted = [];
    const reversedButGranted = [];
    const needsReview = [];
    const seen = new Set();
    for (const order of orders) {
        const byOrder = byOrderId.get(String(order?.orderid));
        const byTransaction = byTransId.get(String(order?.transid));
        const local = byOrder ?? byTransaction;
        if (local) seen.add(local);
        const granted = hasGrantEvidence(local);
        const summary = { orderid: String(order?.orderid ?? ''), transid: String(order?.transid ?? ''), steamStatus: order?.status ?? null, localStatus: local?.status ?? null, sku: local?.sku ?? null };
        const identifierConflict = (byOrder && byTransaction && byOrder !== byTransaction)
            || (byOrder?.transId && order?.transid && String(byOrder.transId) !== String(order.transid))
            || (byTransaction?.orderId && order?.orderid && String(order.orderid) !== '0' && String(byTransaction.orderId) !== String(order.orderid));
        if (order?.reportConflict) {
            needsReview.push({ ...summary, reason: 'conflicting_report_evidence' });
        } else if (identifierConflict) {
            needsReview.push({ ...summary, reason: 'identifier_conflict' });
        } else if (local?.steamId64 && order?.steamid && String(local.steamId64) !== String(order.steamid)) {
            needsReview.push({ ...summary, reason: 'account_mismatch' });
        } else if (!order || (!order.orderid && !order.transid)) {
            needsReview.push({ ...summary, reason: 'invalid_order' });
        } else if (local?.status === 'grant_review_required' || local?.status === 'reversal_review_required') {
            needsReview.push({
                ...summary,
                reason: local.reason ?? (local.status === 'reversal_review_required' ? 'reversal_requires_review' : 'grant_requires_review'),
                disposition: local.reversalDisposition ?? null
            });
        } else if (REVERSED_STATUSES.has(order.status)) {
            if (granted) reversedButGranted.push(summary);
            else matched.push(summary);
        } else if (order.status === 'Succeeded' && !granted) {
            paidNotGranted.push(summary);
        } else if (order.status === 'Succeeded' || (UNSETTLED_STATUSES.has(order.status) && !granted)) {
            matched.push(summary);
        } else {
            needsReview.push({ ...summary, reason: granted ? 'grant_without_settled_payment' : 'unknown_steam_status' });
        }
    }
    // A local review hold is unresolved even if this report contains no row for
    // it (including older ambiguous grants with no surviving item receipt).
    for (const local of purchases) {
        if (!seen.has(local) && (local.status === 'grant_review_required' || local.status === 'reversal_review_required')) {
            needsReview.push({
                orderid: local.orderId, transid: local.transId, steamStatus: null,
                localStatus: local.status, sku: local.sku,
                reason: local.reason ?? (local.status === 'reversal_review_required' ? 'reversal_requires_review' : 'grant_requires_review'),
                disposition: local.reversalDisposition ?? null
            });
        }
    }
    const notInReport = purchases
        .filter((p) => hasGrantEvidence(p) && !seen.has(p) && (Number(p.createdAt) || 0) >= windowStart)
        .map((p) => ({ orderid: p.orderId, transid: p.transId, localStatus: p.status, sku: p.sku }));
    return {
        ok: !Number.isNaN(windowStart) && paidNotGranted.length === 0 && reversedButGranted.length === 0 && notInReport.length === 0 && needsReview.length === 0,
        ...(Number.isNaN(windowStart) ? { reason: 'invalid_since' } : {}),
        counts: { steamOrders: orders.length, matched: matched.length, paidNotGranted: paidNotGranted.length, reversedButGranted: reversedButGranted.length, notInReport: notInReport.length, needsReview: needsReview.length },
        matched,
        paidNotGranted,
        reversedButGranted,
        notInReport,
        needsReview
    };
}

export async function consumeSteamItem({
    key = publisherKey(),
    appId = Number(process.env.HB_STEAM_APPID ?? 4957040),
    steamId,
    itemId,
    quantity = 1,
    requestId = null,
    fetchImpl = fetch,
    timeoutMs = 15_000
} = {}) {
    if (!key) return { ok: false, reason: 'missing_publisher_key' };
    if (!steamId || !itemId) return { ok: false, reason: 'invalid_consume_parameters' };
    const params = new URLSearchParams({
        key,
        appid: String(appId),
        steamid: String(steamId),
        itemid: String(itemId),
        quantity: String(quantity)
    });
    if (requestId) params.append('requestid', String(requestId));
    try {
        const response = await fetchImpl('https://partner.steam-api.com/IInventoryService/ConsumeItem/v1/', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: params,
            signal: AbortSignal.timeout(timeoutMs)
        });
        if (!response.ok) return { ok: false, reason: 'steam_api_error', status: response.status };
        const data = await response.json();
        return decodeConsumeItemResponse(data);
    } catch {
        return { ok: false, reason: 'steam_request_failed', ambiguous: true };
    }
}

export async function consumeMockInventoryItem(steamId, { itemId, quantity = 1 } = {}) {
    const inv = getMockInventory(steamId).map((item) => ({ ...item }));
    const stack = inv.find((item) => String(item.itemId ?? item.itemid) === String(itemId));
    if (!stack || Number(stack.quantity) < quantity) return { ok: false, reason: 'insufficient_items' };
    stack.quantity -= quantity;
    const remaining = inv.filter((item) => item.quantity > 0);
    await setMockInventory(steamId, remaining);
    return { ok: true, items: remaining };
}

export async function applyReversalDisposition({
    purchase,
    disposition,
    auditNote = null,
    operatorId = null,
    savePurchase = savePurchaseState,
    now = Date.now
} = {}) {
    if (!purchase) return { ok: false, reason: 'missing_purchase' };
    if (!Object.values(REVERSAL_DISPOSITIONS).includes(disposition)) {
        return { ok: false, reason: 'invalid_reversal_disposition' };
    }
    const isSettled = disposition === REVERSAL_DISPOSITIONS.ITEMS_REVOKED
        || disposition === REVERSAL_DISPOSITIONS.OPERATOR_SETTLED;
    const status = isSettled ? 'reversed_settled' : 'reversal_review_required';
    const reason = isSettled ? 'reversal_settled' : (purchase.reason ?? disposition);
    const reversalAudit = {
        disposition,
        updatedAt: now(),
        ...(operatorId ? { operatorId: String(operatorId) } : {}),
        ...(auditNote ? { auditNote: String(auditNote) } : {})
    };
    const updated = await savePurchase({
        ...purchase,
        status,
        reason,
        reversalDisposition: disposition,
        reversalAudit
    });
    return { ok: true, purchase: updated, status, disposition };
}

export async function processOrderReversal({
    purchase,
    order = null,
    inventory = null,
    dispositionHint = null,
    fetchInventory = fetchSteamInventory,
    consumeItem = consumeSteamItem,
    consumeMock = consumeMockInventoryItem,
    savePurchase = savePurchaseState,
    isDevMode = false,
    key = publisherKey(),
    appId = Number(process.env.HB_STEAM_APPID ?? 4957040),
    now = Date.now
} = {}) {
    if (!purchase) return { ok: false, reason: 'missing_purchase' };

    if (purchase.status === 'reversed_settled') {
        return { ok: true, disposition: purchase.reversalDisposition, alreadySettled: true, purchase };
    }

    const mode = purchase.mode ?? (isDevMode ? 'mock' : 'live');
    const steamId = purchase.steamId64;
    const orderTag = order?.status ? ` [steam:${order.status}]` : '';

    const grantedItems = Array.isArray(purchase.granted) ? purchase.granted : [];
    if (grantedItems.length === 0) {
        return applyReversalDisposition({
            purchase,
            disposition: REVERSAL_DISPOSITIONS.HELD_FOR_REVIEW,
            auditNote: `missing_grant_item_evidence${orderTag}`,
            savePurchase,
            now
        });
    }

    if (dispositionHint && dispositionHint !== REVERSAL_DISPOSITIONS.ITEMS_REVOKED) {
        return applyReversalDisposition({
            purchase,
            disposition: dispositionHint,
            auditNote: `disposition_hint_${dispositionHint}${orderTag}`,
            savePurchase,
            now
        });
    }

    let playerInventory = inventory;
    if (!playerInventory) {
        if (mode === 'mock' || isDevMode) {
            playerInventory = getMockInventory(steamId);
        } else {
            const invResult = await fetchInventory({ steamId, key, appId });
            if (!invResult?.ok) {
                return applyReversalDisposition({
                    purchase,
                    disposition: REVERSAL_DISPOSITIONS.HELD_FOR_REVIEW,
                    auditNote: `inventory_fetch_failed_${invResult?.reason ?? 'unknown'}${orderTag}`,
                    savePurchase,
                    now
                });
            }
            playerInventory = invResult.inventory;
        }
    }

    const revokedItems = [];
    for (let index = 0; index < grantedItems.length; index++) {
        const item = grantedItems[index];
        const itemId = item.itemId ?? item.itemid;
        const itemdefid = item.itemdefid ? Number(item.itemdefid) : null;
        const quantity = Number(item.quantity) || 1;

        const owned = playerInventory.find((invItem) =>
            (itemId && String(invItem.itemId ?? invItem.itemid) === String(itemId))
            || (itemdefid && Number(invItem.itemdefid) === itemdefid && Number(invItem.quantity) >= quantity)
        );

        if (!owned || Number(owned.quantity) < quantity) {
            const disposition = dispositionHint ?? (
                item.state === 'consumed' || item.consumed === true
                    ? REVERSAL_DISPOSITIONS.ITEMS_ALREADY_CONSUMED
                    : (item.state === 'removed' || item.traded === true
                        ? REVERSAL_DISPOSITIONS.ITEMS_TRADED_OR_TRANSFERRED
                        : REVERSAL_DISPOSITIONS.ITEMS_ALREADY_CONSUMED)
            );
            return applyReversalDisposition({
                purchase,
                disposition,
                auditNote: `item_${itemId ?? itemdefid}_not_in_inventory${orderTag}`,
                savePurchase,
                now
            });
        }

        const targetItemId = owned.itemId ?? owned.itemid ?? itemId;
        const revokeRequestId = deriveNumericRequestId(purchase.transId || purchase.orderId, 'revoke', index);

        let consumeResult;
        if (mode === 'mock' || isDevMode) {
            consumeResult = await consumeMock(steamId, { itemId: targetItemId, quantity });
        } else {
            consumeResult = await consumeItem({
                key, appId, steamId, itemId: targetItemId, quantity, requestId: revokeRequestId
            });
        }

        if (!consumeResult?.ok) {
            return applyReversalDisposition({
                purchase,
                disposition: REVERSAL_DISPOSITIONS.HELD_FOR_REVIEW,
                auditNote: `consume_failed_${consumeResult?.reason ?? 'unknown'}${orderTag}`,
                savePurchase,
                now
            });
        }

        revokedItems.push({ itemId: targetItemId, quantity, itemdefid });
    }

    return applyReversalDisposition({
        purchase,
        disposition: REVERSAL_DISPOSITIONS.ITEMS_REVOKED,
        auditNote: `revoked_${revokedItems.length}_items${orderTag}`,
        savePurchase,
        now
    });
}

export async function processOrderReversals({
    reconciliation = null,
    orders = [],
    purchases = [],
    processReversal = processOrderReversal,
    log = console,
    ...options
} = {}) {
    const byOrderId = new Map();
    const byTransId = new Map();
    for (const p of purchases) {
        if (p.orderId && String(p.orderId) !== '0') byOrderId.set(String(p.orderId), p);
        if (p.transId) byTransId.set(String(p.transId), p);
    }
    const orderMap = new Map();
    for (const o of orders) {
        if (o.orderid) orderMap.set(String(o.orderid), o);
        if (o.transid) orderMap.set(String(o.transid), o);
    }

    const targets = reconciliation?.reversedButGranted ?? orders.filter((o) => REVERSED_STATUSES.has(o.status));
    const results = [];
    for (const entry of targets) {
        const orderid = String(entry.orderid ?? '');
        const transid = String(entry.transid ?? '');
        const purchase = byOrderId.get(orderid) ?? byTransId.get(transid);
        if (!purchase) continue;
        const steamOrder = orderMap.get(orderid) ?? orderMap.get(transid) ?? entry;

        try {
            const outcome = await processReversal({ purchase, order: steamOrder, ...options });
            results.push({ orderid, transid, ...outcome });
            log.info?.('[microtxn-reversals] processed order reversal', { orderid, transid, disposition: outcome.disposition, status: outcome.status });
        } catch (err) {
            results.push({ orderid, transid, ok: false, reason: 'reversal_exception', error: err.message });
            log.warn?.('[microtxn-reversals] reversal exception', { orderid, transid, err });
        }
    }
    return results;
}

export async function recoverPaidOrders({
    reconciliation = null,
    orders = [],
    purchases = [],
    fulfill = fulfillPurchasedKeys,
    log = console
} = {}) {
    const byOrderId = new Map();
    const byTransId = new Map();
    for (const p of purchases) {
        if (p.orderId && String(p.orderId) !== '0') byOrderId.set(String(p.orderId), p);
        if (p.transId) byTransId.set(String(p.transId), p);
    }

    const targets = reconciliation?.paidNotGranted ?? orders.filter((o) => o.status === 'Succeeded');
    const results = [];
    for (const entry of targets) {
        const orderid = String(entry.orderid ?? '');
        const transid = String(entry.transid ?? '');
        const local = byOrderId.get(orderid) ?? byTransId.get(transid);
        if (!local) continue;
        if (hasGrantEvidence(local)) continue;
        if (local.status === 'grant_review_required' || local.status === 'reversal_review_required') continue;

        try {
            const result = await fulfill(local);
            const recovered = result?.status === 200 && result?.body?.ok === true;
            results.push({
                orderid,
                transid,
                ok: recovered,
                status: result?.status ?? 500,
                body: result?.body ?? null
            });
            if (recovered) {
                log.info?.('[microtxn-recovery] recovered paid order', { orderid, transid });
            } else {
                log.warn?.('[microtxn-recovery] fulfillment failed for paid order', { orderid, transid, result });
            }
        } catch (err) {
            results.push({
                orderid,
                transid,
                ok: false,
                reason: 'fulfillment_exception',
                error: err.message
            });
            log.warn?.('[microtxn-recovery] fulfillment exception', { orderid, transid, err });
        }
    }
    return results;
}

function publisherKey() {
    return process.env.HB_STEAM_PUBLISHER_KEY ?? process.env.STEAM_PUBLISHER_KEY ?? process.env.STEAM_WEB_API_KEY ?? '';
}

const checkpointStore = { load: getMicroTxnCheckpoint, save: saveMicroTxnCheckpoint };
const activeReportScopes = new Set();

export function readAllReportPurchases({ readPage = listPurchases, maxRows = 100_000 } = {}) {
    const purchases = [];
    // Both database implementations are synchronous. This loop is one local
    // snapshot within the backend's single-writer event loop, not async offsets
    // interleaved with finalization writes.
    for (let offset = 0; ; offset += 1000) {
        const page = readPage({ limit: 1000, offset });
        if (!Array.isArray(page)) throw new Error('invalid_local_ledger_page');
        if (purchases.length + page.length > maxRows) throw new Error('local_ledger_limit');
        purchases.push(...page);
        if (page.length < 1000) return purchases;
    }
}

/** Read-only entitlement reconciliation: never charges, grants or revokes. */
export async function runMicroTxnReconciliation({
    since, type = 'GAMESALES', fetchImpl = fetch, purchases = null,
    durable = false, initialSince = process.env.HB_STEAM_REPORT_START_TIME,
    store = checkpointStore, readPurchases = listPurchases, now = Date.now,
    key = publisherKey(), appId = Number(process.env.HB_STEAM_APPID ?? 4957040),
    sandbox = process.env.HB_STEAM_MICROTXN_SANDBOX === '1',
    maxPages = 100, maxOrders = 100_000, maxResults = 1000,
    recoverPaid = false, processReversals = false,
    fulfill = fulfillPurchasedKeys, processReversal = processOrderReversal
} = {}) {
    const failure = (reason) => ({ ok: false, report: { ok: false, complete: false, reason }, reconciliation: null });
    if (!key) return failure('missing_publisher_key');
    if (!REPORT_TYPES.includes(type)) return failure('invalid_report_type');
    if (!Number.isSafeInteger(Number(appId)) || Number(appId) < 1) return failure('invalid_app_id');
    const scope = `${appId}.${sandbox ? 'sandbox' : 'live'}.${type}`;
    if (durable && activeReportScopes.has(scope)) return failure('reconciliation_in_progress');
    if (durable) activeReportScopes.add(scope);
    let state;
    try {
        if (durable) {
            state = await store.load(scope);
            if (!state) {
                const startTime = since ?? initialSince;
                if (!isReportTime(startTime)) return failure('initial_report_time_required');
                state = await store.save(scope, {
                    version: 1, startTime, cursor: startTime, orders: [],
                    health: { ok: false, reason: 'not_yet_scanned' }
                }, { expectedRevision: 0 });
            }
            if (state.version !== 1 || !isReportTime(state.startTime) || !isReportTime(state.cursor)
                || Date.parse(state.cursor) < Date.parse(state.startTime)
                || !Array.isArray(state.orders) || !Number.isSafeInteger(state.revision) || state.revision < 1) {
                return failure('invalid_report_checkpoint');
            }
        } else {
            if (!isReportTime(since)) return failure('invalid_report_time');
            state = { version: 1, startTime: since, cursor: since, orders: [] };
        }
        const report = await scanMicroTxnReport({
            time: state.cursor, orders: state.orders, maxPages, maxOrders,
            fetchPage: (time) => fetchMicroTxnReport({ key, appId, time, type, maxResults, sandbox, fetchImpl }),
            onPage: async (page) => {
                if (!durable) return;
                state = await store.save(scope, { ...state, ...page, lastAttemptAt: now(),
                    health: { ok: false, reason: 'scan_in_progress' }
                }, { expectedRevision: state.revision });
            }
        });
        let reconciliation = null;
        let recoveryResults = null;
        let reversalResults = null;
        if (report.ok) {
            try {
                const local = purchases ?? readAllReportPurchases({ readPage: readPurchases, maxRows: maxOrders });
                reconciliation = reconcileMicroTxnReport(report.orders, local, { since: state.startTime });
                let needsRerun = false;
                if (recoverPaid && reconciliation.paidNotGranted.length > 0) {
                    recoveryResults = await recoverPaidOrders({
                        reconciliation, purchases: local, fulfill
                    });
                    needsRerun = true;
                }
                if (processReversals && reconciliation.reversedButGranted.length > 0) {
                    reversalResults = await processOrderReversals({
                        reconciliation, purchases: local, orders: report.orders, processReversal
                    });
                    needsRerun = true;
                }
                if (needsRerun) {
                    const refreshed = purchases ?? readAllReportPurchases({ readPage: readPurchases, maxRows: maxOrders });
                    reconciliation = reconcileMicroTxnReport(report.orders, refreshed, { since: state.startTime });
                }
            } catch {
                report.ok = false;
                report.reason = 'local_ledger_scan_failed';
            }
        }
        const ok = report.ok && reconciliation?.ok === true;
        if (durable) {
            state = await store.save(scope, {
                ...state, lastAttemptAt: now(),
                lastCompletedAt: report.complete ? now() : (state.lastCompletedAt ?? null),
                lastSuccessAt: ok ? now() : (state.lastSuccessAt ?? null),
                health: { ok, reason: report.reason ?? reconciliation?.reason ?? (ok ? null : 'unresolved_orders'), counts: reconciliation?.counts ?? null }
            }, { expectedRevision: state.revision });
        }
        return { ok, report, reconciliation, recoveryResults, reversalResults, checkpoint: durable ? {
            scope, cursor: state.cursor, revision: state.revision, health: state.health,
            startTime: state.startTime, lastSuccessAt: state.lastSuccessAt
        } : null };
    } catch {
        return failure('report_checkpoint_failed');
    } finally {
        if (durable) activeReportScopes.delete(scope);
    }
}

/**
 * While Microtransactions are enabled, reconcile every `intervalMs` over a
 * persisted cursor and retained evidence. No rolling window can erase an outage.
 * The first run requires HB_STEAM_REPORT_START_TIME (UTC, before the first sale).
 * Returns a stop function; overlapping ticks and rejected jobs are contained.
 */
export function startMicroTxnReconciliation({ intervalMs = 6 * 60 * 60 * 1000, log = console, run = runMicroTxnReconciliation } = {}) {
    if (process.env.HB_STEAM_MICROTXN_ENABLED !== '1' || !publisherKey()) return () => {};
    let running = false;
    let stopped = false;
    const tick = async () => {
        if (running || stopped) return;
        running = true;
        try {
            const { ok, report, reconciliation, checkpoint } = await run({ durable: true });
            const line = { cursor: checkpoint?.cursor ?? null, reason: report.reason ?? reconciliation?.reason ?? null,
                ...reconciliation?.counts };
            if (ok) log.info?.('[microtxn-report] reconciled', line);
            else log.warn?.('[microtxn-report] UNHEALTHY', line);
        } catch {
            log.warn?.('[microtxn-report] UNHEALTHY', { reason: 'worker_failed' });
        } finally { running = false; }
    };
    const timer = setInterval(() => { void tick(); }, intervalMs);
    timer.unref?.();
    void tick();
    return () => { stopped = true; clearInterval(timer); };
}
