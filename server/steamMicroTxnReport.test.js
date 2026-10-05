import { describe, expect, it, vi } from 'vitest';
import {
    fetchMicroTxnReport,
    reconcileMicroTxnReport,
    microTxnReportUrl,
    REVERSAL_DISPOSITIONS,
    hasGrantEvidence,
    applyReversalDisposition,
    processOrderReversal,
    processOrderReversals,
    recoverPaidOrders,
    runMicroTxnReconciliation
} from './steamMicroTxnReport.js';

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

    it('matches settled reversals with items_revoked or operator_settled as resolved', () => {
        const p1 = { ...purchase('1', 'reversed_settled'), reversalDisposition: REVERSAL_DISPOSITIONS.ITEMS_REVOKED };
        const p2 = { ...purchase('2', 'reversed_settled'), reversalDisposition: REVERSAL_DISPOSITIONS.OPERATOR_SETTLED };
        expect(hasGrantEvidence(p1)).toBe(false);
        expect(hasGrantEvidence(p2)).toBe(false);

        const r = reconcileMicroTxnReport([order('1', 'Refunded'), order('2', 'Chargedback')], [p1, p2]);
        expect(r.ok).toBe(true);
        expect(r.matched).toHaveLength(2);
        expect(r.reversedButGranted).toHaveLength(0);
        expect(r.needsReview).toHaveLength(0);
    });

    it('keeps reversal_review_required holds unhealthy in needsReview', () => {
        const pConsumed = {
            ...purchase('1', 'reversal_review_required'),
            reversalDisposition: REVERSAL_DISPOSITIONS.ITEMS_ALREADY_CONSUMED,
            reason: 'items_already_consumed'
        };
        const pTraded = {
            ...purchase('2', 'reversal_review_required'),
            reversalDisposition: REVERSAL_DISPOSITIONS.ITEMS_TRADED_OR_TRANSFERRED,
            reason: 'items_traded_or_transferred'
        };
        const pHeld = {
            ...purchase('3', 'reversal_review_required'),
            reversalDisposition: REVERSAL_DISPOSITIONS.HELD_FOR_REVIEW,
            reason: 'consume_item_ambiguous'
        };

        const r = reconcileMicroTxnReport([order('1', 'Refunded'), order('2', 'Refunded')], [pConsumed, pTraded, pHeld]);
        expect(r.ok).toBe(false);
        expect(r.needsReview).toHaveLength(3);
        expect(r.needsReview.map((x) => x.disposition)).toEqual([
            'items_already_consumed',
            'items_traded_or_transferred',
            'held_for_review'
        ]);
    });
});

describe('applyReversalDisposition', () => {
    it('validates disposition is a supported REVERSAL_DISPOSITIONS enum', async () => {
        const res = await applyReversalDisposition({ purchase: purchase('1', 'completed'), disposition: 'invalid_disposition' });
        expect(res.ok).toBe(false);
        expect(res.reason).toBe('invalid_reversal_disposition');
    });

    it('settles items_revoked and operator_settled as reversed_settled', async () => {
        let saved = null;
        const save = async (record) => { saved = record; return record; };

        const r1 = await applyReversalDisposition({
            purchase: purchase('1', 'completed'),
            disposition: REVERSAL_DISPOSITIONS.ITEMS_REVOKED,
            auditNote: 'keys consumed',
            savePurchase: save
        });
        expect(r1.ok).toBe(true);
        expect(r1.status).toBe('reversed_settled');
        expect(saved.reversalDisposition).toBe('items_revoked');
        expect(saved.reversalAudit.auditNote).toBe('keys consumed');

        const r2 = await applyReversalDisposition({
            purchase: purchase('2', 'completed'),
            disposition: REVERSAL_DISPOSITIONS.OPERATOR_SETTLED,
            operatorId: 'admin_42',
            auditNote: 'waived chargeback',
            savePurchase: save
        });
        expect(r2.ok).toBe(true);
        expect(r2.status).toBe('reversed_settled');
        expect(saved.reversalDisposition).toBe('operator_settled');
        expect(saved.reversalAudit.operatorId).toBe('admin_42');
    });

    it('places consumed, traded, or ambiguous items on persistent reversal_review_required hold', async () => {
        let saved = null;
        const save = async (record) => { saved = record; return record; };

        for (const disp of [
            REVERSAL_DISPOSITIONS.ITEMS_ALREADY_CONSUMED,
            REVERSAL_DISPOSITIONS.ITEMS_TRADED_OR_TRANSFERRED,
            REVERSAL_DISPOSITIONS.HELD_FOR_REVIEW
        ]) {
            const res = await applyReversalDisposition({
                purchase: purchase('10', 'completed'),
                disposition: disp,
                savePurchase: save
            });
            expect(res.ok).toBe(true);
            expect(res.status).toBe('reversal_review_required');
            expect(saved.status).toBe('reversal_review_required');
            expect(saved.reversalDisposition).toBe(disp);
        }
    });
});

describe('processOrderReversal', () => {
    it('successfully revokes items still owned in inventory and settles the purchase', async () => {
        let savedPurchase = null;
        const consumeMock = vi.fn(async () => ({ ok: true, items: [] }));
        const p = {
            ...purchase('1', 'completed'),
            mode: 'mock',
            steamId64: '76561198000000000',
            granted: [{ itemId: 'item_101', itemdefid: 4001, quantity: 1 }]
        };
        const inventory = [{ itemId: 'item_101', itemdefid: 4001, quantity: 1 }];

        const res = await processOrderReversal({
            purchase: p,
            order: order('1', 'Refunded'),
            inventory,
            consumeMock,
            savePurchase: async (rec) => { savedPurchase = rec; return rec; }
        });

        expect(res.ok).toBe(true);
        expect(res.disposition).toBe(REVERSAL_DISPOSITIONS.ITEMS_REVOKED);
        expect(res.status).toBe('reversed_settled');
        expect(consumeMock).toHaveBeenCalledWith('76561198000000000', { itemId: 'item_101', quantity: 1 });
        expect(savedPurchase.reversalDisposition).toBe('items_revoked');
    });

    it('detects when items were already consumed and holds for review', async () => {
        let savedPurchase = null;
        const p = {
            ...purchase('2', 'completed'),
            mode: 'mock',
            steamId64: '76561198000000000',
            granted: [{ itemId: 'item_102', itemdefid: 4001, quantity: 1, state: 'consumed' }]
        };
        const inventory = []; // empty inventory

        const res = await processOrderReversal({
            purchase: p,
            order: order('2', 'Refunded'),
            inventory,
            savePurchase: async (rec) => { savedPurchase = rec; return rec; }
        });

        expect(res.ok).toBe(true);
        expect(res.disposition).toBe(REVERSAL_DISPOSITIONS.ITEMS_ALREADY_CONSUMED);
        expect(res.status).toBe('reversal_review_required');
        expect(savedPurchase.status).toBe('reversal_review_required');
    });

    it('detects when items were traded or transferred and holds for review', async () => {
        let savedPurchase = null;
        const p = {
            ...purchase('3', 'completed'),
            mode: 'mock',
            steamId64: '76561198000000000',
            granted: [{ itemId: 'item_103', itemdefid: 4001, quantity: 1, state: 'removed' }]
        };
        const inventory = [];

        const res = await processOrderReversal({
            purchase: p,
            order: order('3', 'Chargedback'),
            inventory,
            savePurchase: async (rec) => { savedPurchase = rec; return rec; }
        });

        expect(res.ok).toBe(true);
        expect(res.disposition).toBe(REVERSAL_DISPOSITIONS.ITEMS_TRADED_OR_TRANSFERRED);
        expect(res.status).toBe('reversal_review_required');
        expect(savedPurchase.reversalDisposition).toBe('items_traded_or_transferred');
    });

    it('holds for review when consumeItem fails or returns ambiguous error', async () => {
        let savedPurchase = null;
        const consumeMock = vi.fn(async () => ({ ok: false, reason: 'steam_api_error' }));
        const p = {
            ...purchase('4', 'completed'),
            mode: 'mock',
            steamId64: '76561198000000000',
            granted: [{ itemId: 'item_104', itemdefid: 4001, quantity: 1 }]
        };
        const inventory = [{ itemId: 'item_104', itemdefid: 4001, quantity: 1 }];

        const res = await processOrderReversal({
            purchase: p,
            order: order('4', 'Refunded'),
            inventory,
            consumeMock,
            savePurchase: async (rec) => { savedPurchase = rec; return rec; }
        });

        expect(res.ok).toBe(true);
        expect(res.disposition).toBe(REVERSAL_DISPOSITIONS.HELD_FOR_REVIEW);
        expect(res.status).toBe('reversal_review_required');
        expect(savedPurchase.reversalDisposition).toBe('held_for_review');
    });

    it('processes batch reversals across multiple orders with processOrderReversals', async () => {
        const processReversal = vi.fn(async ({ purchase: item }) => ({
            ok: true,
            status: 'reversed_settled',
            disposition: REVERSAL_DISPOSITIONS.ITEMS_REVOKED,
            purchase: item
        }));
        const p1 = purchase('51', 'completed');
        const p2 = purchase('52', 'completed');
        const orders = [order('51', 'Refunded'), order('52', 'Chargedback')];

        const batchResults = await processOrderReversals({
            orders,
            purchases: [p1, p2],
            processReversal
        });

        expect(batchResults).toHaveLength(2);
        expect(batchResults.map((r) => r.disposition)).toEqual(['items_revoked', 'items_revoked']);
        expect(processReversal).toHaveBeenCalledTimes(2);
    });
});

describe('recoverPaidOrders', () => {
    it('recovers ungranted paid orders using idempotent fulfill function', async () => {
        const fulfill = vi.fn(async (p) => ({ status: 200, body: { ok: true, transId: p.transId } }));
        const ungranted = purchase('10', 'finalized_pending_grant');
        const orders = [order('10', 'Succeeded')];

        const results = await recoverPaidOrders({
            orders,
            purchases: [ungranted],
            fulfill
        });

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({ orderid: '10', ok: true });
        expect(fulfill).toHaveBeenCalledWith(ungranted);
    });

    it('never attempts recovery for refunded, chargebacked, or non-Succeeded orders', async () => {
        const fulfill = vi.fn();
        const ungranted = purchase('11', 'finalized_pending_grant');
        const orders = [order('11', 'Refunded'), order('12', 'Chargedback'), order('13', 'Init')];

        const results = await recoverPaidOrders({
            orders,
            purchases: [ungranted],
            fulfill
        });

        expect(results).toHaveLength(0);
        expect(fulfill).not.toHaveBeenCalled();
    });

    it('skips orders with active grant_review_required or reversal_review_required holds', async () => {
        const fulfill = vi.fn();
        const underReview = { ...purchase('14', 'grant_review_required'), reason: 'legacy_grant_requires_review' };
        const orders = [order('14', 'Succeeded')];

        const results = await recoverPaidOrders({
            orders,
            purchases: [underReview],
            fulfill
        });

        expect(results).toHaveLength(0);
        expect(fulfill).not.toHaveBeenCalled();
    });
});

describe('runMicroTxnReconciliation with recoverPaid and processReversals', () => {
    it('executes unattended paid recovery and re-reconciles to healthy ok: true', async () => {
        let callCount = 0;
        const fetchImpl = vi.fn(async () => {
            callCount++;
            if (callCount === 1) {
                return new Response(JSON.stringify({
                    response: {
                        result: 'OK',
                        params: {
                            count: 1,
                            orders: [{
                                orderid: '20',
                                transid: '2000',
                                status: 'Succeeded',
                                time: '2026-09-30T01:00:00Z',
                                steamid: '76561198000000000'
                            }]
                        }
                    }
                }), { status: 200 });
            }
            return new Response(JSON.stringify({
                response: { result: 'OK', params: { count: 0, orders: [] } }
            }), { status: 200 });
        });

        const p = { ...purchase('20', 'finalized_pending_grant'), transId: '2000' };
        const purchasesList = [p];

        const fulfill = vi.fn(async (local) => {
            local.status = 'completed';
            local.grantDelivered = true;
            return { status: 200, body: { ok: true } };
        });

        const res = await runMicroTxnReconciliation({
            key: 'test_key',
            since: '2026-09-30T00:00:00Z',
            fetchImpl,
            purchases: purchasesList,
            recoverPaid: true,
            fulfill
        });

        expect(fulfill).toHaveBeenCalled();
        expect(res.recoveryResults).toHaveLength(1);
        expect(res.recoveryResults[0].ok).toBe(true);
        expect(res.ok).toBe(true);
        expect(res.reconciliation.matched).toHaveLength(1);
        expect(res.reconciliation.paidNotGranted).toHaveLength(0);
    });

    it('executes automated reversals for refunded orders and re-reconciles cleanly', async () => {
        let callCount = 0;
        const fetchImpl = vi.fn(async () => {
            callCount++;
            if (callCount === 1) {
                return new Response(JSON.stringify({
                    response: {
                        result: 'OK',
                        params: {
                            count: 1,
                            orders: [{
                                orderid: '30',
                                transid: '3000',
                                status: 'Refunded',
                                time: '2026-09-30T01:00:00Z',
                                steamid: '76561198000000000'
                            }]
                        }
                    }
                }), { status: 200 });
            }
            return new Response(JSON.stringify({
                response: { result: 'OK', params: { count: 0, orders: [] } }
            }), { status: 200 });
        });

        const p = {
            ...purchase('30', 'completed'),
            transId: '3000',
            granted: [{ itemId: 'item_30', itemdefid: 4001, quantity: 1 }]
        };
        const purchasesList = [p];

        const processReversal = vi.fn(async ({ purchase: local }) => {
            local.status = 'reversed_settled';
            local.reversalDisposition = REVERSAL_DISPOSITIONS.ITEMS_REVOKED;
            return { ok: true, disposition: 'items_revoked', status: 'reversed_settled' };
        });

        const res = await runMicroTxnReconciliation({
            key: 'test_key',
            since: '2026-09-30T00:00:00Z',
            fetchImpl,
            purchases: purchasesList,
            processReversals: true,
            processReversal
        });

        expect(processReversal).toHaveBeenCalled();
        expect(res.reversalResults).toHaveLength(1);
        expect(res.reversalResults[0].ok).toBe(true);
        expect(res.ok).toBe(true);
        expect(res.reconciliation.matched).toHaveLength(1);
        expect(res.reconciliation.reversedButGranted).toHaveLength(0);
    });
});

