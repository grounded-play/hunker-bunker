import { describe, expect, it, vi } from 'vitest';
import { fetchMicroTxnReport, reconcileMicroTxnReport, microTxnReportUrl } from './steamMicroTxnReport.js';

const order = (orderid, status, transid = `t${orderid}`) => ({ orderid, transid, status, steamid: '76561198000000000', items: [{ itemid: 4001, qty: 1, amount: 99 }] });
const purchase = (orderId, status, createdAt = Date.parse('2026-09-30T12:00:00Z')) => ({ orderId: String(orderId), transId: `t${orderId}`, status, sku: 'key_1', createdAt });

describe('GetReport fetch', () => {
    it('calls ISteamMicroTxn/GetReport/v5 with the window and never returns the key', async () => {
        const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ response: { result: 'OK', params: { count: 1, orders: [order(1, 'Succeeded')] } } }), { status: 200 }));
        const result = await fetchMicroTxnReport({ key: 'secret', appId: 4957040, time: '2026-09-30T00:00:00Z', fetchImpl });
        const url = new URL(fetchImpl.mock.calls[0][0]);
        expect(url.origin + url.pathname).toBe('https://partner.steam-api.com/ISteamMicroTxn/GetReport/v5/');
        expect(url.searchParams.get('type')).toBe('GAMESALES');
        expect(url.searchParams.get('time')).toBe('2026-09-30T00:00:00Z');
        expect(result.ok).toBe(true);
        expect(result.orders).toHaveLength(1);
        expect(JSON.stringify(result.request)).not.toContain('secret');
    });

    it('uses the sandbox endpoint when asked, and reports Steam failures', async () => {
        expect(microTxnReportUrl({ sandbox: true })).toContain('ISteamMicroTxnSandbox/GetReport');
        const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ response: { result: 'Failure', error: { errorcode: 7 } } }), { status: 200 }));
        const result = await fetchMicroTxnReport({ key: 'k', appId: 1, time: '2026-09-30T00:00:00Z', fetchImpl });
        expect(result).toMatchObject({ ok: false, reason: 'steam_api_error' });
        expect(await fetchMicroTxnReport({ key: '', appId: 1, time: 'x' })).toMatchObject({ reason: 'missing_publisher_key' });
    });

    it('does not misinterpret malformed OK responses as an empty report', async () => {
        const fetchImpl = async () => new Response(JSON.stringify({ response: { result: 'OK', params: { count: 1 } } }));
        expect(await fetchMicroTxnReport({ key: 'k', appId: 1, time: '2026-09-30T00:00:00Z', fetchImpl }))
            .toMatchObject({ ok: false, reason: 'invalid_report_response' });
    });

    it('does not expose publisher keys embedded in thrown transport errors', async () => {
        const fetchImpl = async (url) => { throw new Error(`Failed request ${url}`); };
        const result = await fetchMicroTxnReport({ key: 'private-publisher-key', appId: 1, time: '2026-09-30T00:00:00Z', fetchImpl });
        expect(result.ok).toBe(false);
        expect(JSON.stringify(result)).not.toContain('private-publisher-key');
    });
});

describe('reconciliation', () => {
    it('never matches a partial or ambiguous grant just because an item receipt exists', () => {
        const r = reconcileMicroTxnReport([order(1, 'Succeeded')], [{
            ...purchase(1, 'grant_review_required'), granted: [{ itemId: '123', quantity: 1 }],
            reason: 'steam_inventory_grant_requires_review'
        }]);
        expect(r.ok).toBe(false);
        expect(r.matched).toEqual([]);
        expect(r.needsReview[0].reason).toBe('steam_inventory_grant_requires_review');
    });

    it('keeps legacy grant review holds unhealthy even when absent from the report', () => {
        const r = reconcileMicroTxnReport([], [{ ...purchase(1, 'grant_review_required'), reason: 'legacy_grant_requires_review' }]);
        expect(r.ok).toBe(false);
        expect(r.needsReview[0].reason).toBe('legacy_grant_requires_review');
    });

    it('retains replay delivery evidence after consumed items and bounded history disappear', () => {
        const r = reconcileMicroTxnReport([order(1, 'Refunded')], [{
            ...purchase(1, 'reversed'), grantDelivered: true, grantReplayed: true, granted: [], events: []
        }]);
        expect(r.ok).toBe(false);
        expect(r.reversedButGranted).toHaveLength(1);
    });
    it('passes when every settled order was granted', () => {
        const r = reconcileMicroTxnReport([order(1, 'Succeeded')], [purchase(1, 'completed')]);
        expect(r.ok).toBe(true);
        expect(r.counts).toMatchObject({ steamOrders: 1, matched: 1 });
    });

    it('flags a paid order that was never granted', () => {
        const r = reconcileMicroTxnReport([order(2, 'Succeeded')], [purchase(2, 'grant_failed')]);
        expect(r.ok).toBe(false);
        expect(r.paidNotGranted).toEqual([expect.objectContaining({ orderid: '2', localStatus: 'grant_failed' })]);
    });

    it('does not confuse finalized payment with a completed inventory grant', () => {
        const r = reconcileMicroTxnReport([order(2, 'Succeeded')], [purchase(2, 'finalized_pending_grant')]);
        expect(r.ok).toBe(false);
        expect(r.paidNotGranted).toHaveLength(1);
    });

    it('flags refunds and chargebacks on orders that were granted', () => {
        const r = reconcileMicroTxnReport([order(3, 'Refunded'), order(4, 'Chargedback')], [purchase(3, 'completed'), purchase(4, 'completed')]);
        expect(r.reversedButGranted.map((x) => x.orderid)).toEqual(['3', '4']);
        expect(r.ok).toBe(false);
    });

    it('retains grant evidence when QueryTxn has replaced the current ledger status', () => {
        const r = reconcileMicroTxnReport([order(1, 'Refunded'), order(2, 'Chargedback')], [
            { ...purchase(1, 'reversed'), granted: [{ itemid: 'item1' }] },
            { ...purchase(2, 'reversed'), events: [{ status: 'completed' }, { status: 'reversed' }] }
        ]);
        expect(r.ok).toBe(false);
        expect(r.reversedButGranted).toHaveLength(2);
    });

    it('never treats mock inventory grants as missing real-money settlement', () => {
        const r = reconcileMicroTxnReport([], [{ ...purchase(1, 'mock_completed'), granted: [{ itemid: 'mock1' }] }]);
        expect(r.ok).toBe(true);
        expect(r.notInReport).toEqual([]);
    });

    it('lists local completions missing from the report, only inside the window', () => {
        const r = reconcileMicroTxnReport([], [purchase(5, 'completed'), purchase(6, 'completed', Date.parse('2026-01-01T00:00:00Z'))], { since: '2026-09-29T00:00:00Z' });
        expect(r.notInReport.map((x) => x.orderid)).toEqual(['5']);
        expect(r.ok).toBe(false);
    });

    it('keeps transaction and order identifiers in separate namespaces', () => {
        const r = reconcileMicroTxnReport([order('collision', 'Succeeded', 'steam-tx')], [
            { ...purchase('real-order', 'completed'), transId: 'collision' }
        ]);
        expect(r.ok).toBe(false);
        expect(r.paidNotGranted).toHaveLength(1);
        expect(r.notInReport).toHaveLength(1);
    });

    it('requires review for identity conflicts, unknown states, or grants without a settled payment', () => {
        const r = reconcileMicroTxnReport([
            order('1', 'Succeeded'), order('2', 'FutureStatus'), order('3', 'Approved')
        ], [
            { ...purchase('1', 'completed'), steamId64: 'a-different-account' },
            purchase('2', 'completed'), purchase('3', 'completed')
        ]);
        expect(r.ok).toBe(false);
        expect(r.needsReview).toHaveLength(3);
        expect(r.matched).toEqual([]);
    });

    it('does not match contradictory order and transaction mappings', () => {
        const r = reconcileMicroTxnReport([order('1', 'Succeeded', 't2')], [purchase('1', 'completed'), purchase('2', 'completed')]);
        expect(r.ok).toBe(false);
        expect(r.needsReview[0].reason).toBe('identifier_conflict');
    });

    it('fails explicitly on an invalid comparison window', () => {
        const r = reconcileMicroTxnReport([], [purchase('1', 'completed')], { since: 'not-a-date' });
        expect(r.ok).toBe(false);
        expect(r.reason).toBe('invalid_since');
    });
});
