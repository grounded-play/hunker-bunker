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
        const result = await fetchMicroTxnReport({ key: 'k', appId: 1, time: 'x', fetchImpl });
        expect(result).toMatchObject({ ok: false, reason: 'steam_api_error' });
        expect(await fetchMicroTxnReport({ key: '', appId: 1, time: 'x' })).toMatchObject({ reason: 'missing_publisher_key' });
    });
});

describe('reconciliation', () => {
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

    it('flags refunds and chargebacks on orders that were granted', () => {
        const r = reconcileMicroTxnReport([order(3, 'Refunded'), order(4, 'Chargedback')], [purchase(3, 'completed'), purchase(4, 'completed')]);
        expect(r.reversedButGranted.map((x) => x.orderid)).toEqual(['3', '4']);
        expect(r.ok).toBe(false);
    });

    it('lists local completions missing from the report, only inside the window', () => {
        const r = reconcileMicroTxnReport([], [purchase(5, 'completed'), purchase(6, 'completed', Date.parse('2026-01-01T00:00:00Z'))], { since: '2026-09-29T00:00:00Z' });
        expect(r.notInReport.map((x) => x.orderid)).toEqual(['5']);
    });
});
