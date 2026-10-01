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
import { listPurchases } from './db.js';

const MICROTXN_URL = 'https://partner.steam-api.com/ISteamMicroTxn/';
const MICROTXN_SANDBOX_URL = 'https://partner.steam-api.com/ISteamMicroTxnSandbox/';

export const REPORT_TYPES = Object.freeze(['GAMESALES', 'STEAMSTORESALES', 'SETTLEMENT']);
const REVERSED_STATUSES = new Set(['Refunded', 'PartialRefund', 'Chargedback', 'RefundedSuspectedFraud', 'RefundedFriendlyFraud']);
// Finalizing payment is not proof that inventory was granted successfully.
const GRANTED_LOCAL_STATUSES = new Set(['completed']);
const UNSETTLED_STATUSES = new Set(['Init', 'Approved', 'Denied', 'Failed']);

function hasGrantEvidence(purchase) {
    if (!purchase || purchase.status === 'mock_completed' || purchase.mode === 'mock') return false;
    // QueryTxn can replace `completed` with `reversed` or a failure state.
    // The existing grant receipt/event must still trigger refund review.
    return GRANTED_LOCAL_STATUSES.has(purchase.status)
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
    fetchImpl = fetch
}) {
    if (!key) return { ok: false, reason: 'missing_publisher_key' };
    if (!REPORT_TYPES.includes(type)) return { ok: false, reason: 'invalid_report_type' };
    const params = new URLSearchParams({ key, appid: String(appId), type, time, maxresults: String(maxResults) });
    const request = { endpoint: microTxnReportUrl({ sandbox }), appid: String(appId), type, time, maxresults: maxResults };
    try {
        const response = await fetchImpl(`${request.endpoint}?${params.toString()}`);
        const body = await response.json().catch(() => null);
        const result = body?.response?.result;
        if (!response.ok || result !== 'OK') {
            return { ok: false, reason: 'steam_api_error', status: response.status, request, response: body };
        }
        const orders = Array.isArray(body.response.params?.orders) ? body.response.params.orders : [];
        return { ok: true, request, response: body, orders };
    } catch (err) {
        return { ok: false, reason: 'steam_request_failed', message: err.message, request };
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
        if (identifierConflict) {
            needsReview.push({ ...summary, reason: 'identifier_conflict' });
        } else if (local?.steamId64 && order?.steamid && String(local.steamId64) !== String(order.steamid)) {
            needsReview.push({ ...summary, reason: 'account_mismatch' });
        } else if (!order || (!order.orderid && !order.transid)) {
            needsReview.push({ ...summary, reason: 'invalid_order' });
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

function publisherKey() {
    return process.env.HB_STEAM_PUBLISHER_KEY ?? process.env.STEAM_PUBLISHER_KEY ?? process.env.STEAM_WEB_API_KEY ?? '';
}

export async function runMicroTxnReconciliation({ since, type = 'GAMESALES', fetchImpl = fetch, purchases = null } = {}) {
    const report = await fetchMicroTxnReport({
        key: publisherKey(),
        appId: Number(process.env.HB_STEAM_APPID ?? 4957040),
        time: since,
        type,
        sandbox: process.env.HB_STEAM_MICROTXN_SANDBOX === '1',
        fetchImpl
    });
    if (!report.ok) return { report, reconciliation: null };
    const local = purchases ?? listPurchases({ limit: 5000 });
    return { report, reconciliation: reconcileMicroTxnReport(report.orders, local, { since }) };
}

/**
 * While Microtransactions are enabled, reconcile every `intervalMs` over a
 * trailing window and log any mismatch. Returns a stop function.
 */
export function startMicroTxnReconciliation({ intervalMs = 6 * 60 * 60 * 1000, windowMs = 48 * 60 * 60 * 1000, log = console } = {}) {
    if (process.env.HB_STEAM_MICROTXN_ENABLED !== '1' || !publisherKey()) return () => {};
    const tick = async () => {
        const since = new Date(Date.now() - windowMs).toISOString();
        const { report, reconciliation } = await runMicroTxnReconciliation({ since });
        if (!report.ok) {
            log.warn?.('[microtxn-report] GetReport failed', { reason: report.reason, status: report.status ?? null });
            return;
        }
        const line = { since, ...reconciliation.counts };
        if (reconciliation.ok) log.info?.('[microtxn-report] reconciled', line);
        else log.warn?.('[microtxn-report] MISMATCH', {
            ...line,
            reason: reconciliation.reason ?? null,
            paidNotGranted: reconciliation.paidNotGranted,
            reversedButGranted: reconciliation.reversedButGranted,
            notInReport: reconciliation.notInReport,
            needsReview: reconciliation.needsReview
        });
    };
    const timer = setInterval(() => { void tick(); }, intervalMs);
    timer.unref?.();
    void tick();
    return () => clearInterval(timer);
}
