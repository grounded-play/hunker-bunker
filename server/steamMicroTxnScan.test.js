import { describe, expect, it, vi } from 'vitest';
import { scanMicroTxnReport } from './steamMicroTxnScan.js';

const START = '2026-01-01T00:00:00Z';
const FIRST = '2026-01-02T00:00:00Z';
const SECOND = '2026-01-03T00:00:00Z';
const order = (id, time = FIRST, status = 'Succeeded') => ({ orderid: String(id), transid: String(1000 + id), time, status, steamid: '76561198000000000' });
const page = (orders) => ({ ok: true, orders, request: { time: START }, response: { orders } });

describe('Steam timestamp report enumeration', () => {
    it('continues through short batches, duplicates and shared-time boundaries until empty', async () => {
        const fetchPage = vi.fn()
            .mockResolvedValueOnce(page([order(1)]))
            .mockResolvedValueOnce(page([order(1), order(2)]))
            .mockResolvedValueOnce(page([order(2), order(3, SECOND)]))
            .mockResolvedValueOnce(page([]));
        const onPage = vi.fn();
        const result = await scanMicroTxnReport({ time: START, fetchPage, onPage });
        expect(result.ok).toBe(true);
        expect(result.orders).toHaveLength(3);
        expect(fetchPage.mock.calls.map(([time]) => time)).toEqual([START, FIRST, FIRST, SECOND]);
        expect(onPage).toHaveBeenCalledTimes(3);
        expect(result.cursor).toBe(SECOND);
    });

    it('persists each batch before requesting the next; a write failure cannot advance the cursor', async () => {
        const fetchPage = vi.fn().mockResolvedValue(page([order(1)]));
        const onPage = vi.fn().mockRejectedValue(new Error('disk full'));
        const result = await scanMicroTxnReport({ time: START, fetchPage, onPage });
        expect(result).toMatchObject({ ok: false, reason: 'report_checkpoint_failed', cursor: START });
        expect(fetchPage).toHaveBeenCalledTimes(1);
    });

    it('retains newer refund evidence across overlapping older batches', async () => {
        const fetchPage = vi.fn().mockResolvedValueOnce(page([order(1, FIRST)])).mockResolvedValueOnce(page([]));
        const result = await scanMicroTxnReport({ time: SECOND, orders: [order(1, SECOND, 'Refunded')], fetchPage });
        expect(result.ok).toBe(true);
        expect(result.orders[0].status).toBe('Refunded');
        expect(result.cursor).toBe(SECOND);
    });

    it('marks contradictory statuses at the same timestamp as review-required evidence', async () => {
        const fetchPage = vi.fn().mockResolvedValueOnce(page([order(1, FIRST, 'Refunded')])).mockResolvedValueOnce(page([]));
        const result = await scanMicroTxnReport({ time: FIRST, orders: [order(1)], fetchPage });
        expect(result.orders[0].reportConflict).toBe(true);
    });

    it('reports a stalled boundary instead of skipping ahead by one second', async () => {
        const fetchPage = vi.fn().mockResolvedValue(page([order(1)]));
        const result = await scanMicroTxnReport({ time: FIRST, orders: [order(1)], fetchPage });
        expect(result).toMatchObject({ ok: false, complete: false, reason: 'report_cursor_stalled', cursor: FIRST });
        expect(fetchPage.mock.calls.every(([time]) => time === FIRST)).toBe(true);
        expect(fetchPage).toHaveBeenCalledTimes(3);
    });

    it('returns partial evidence and an unhealthy result on page limit or outage', async () => {
        const fetchPage = vi.fn().mockResolvedValueOnce(page([order(1)])).mockResolvedValueOnce({ ok: false, reason: 'offline' });
        const failed = await scanMicroTxnReport({ time: START, fetchPage });
        expect(failed).toMatchObject({ ok: false, reason: 'offline', cursor: FIRST });
        expect(failed.orders).toHaveLength(1);
        const limited = await scanMicroTxnReport({ time: START, maxPages: 1, fetchPage: async () => page([order(1)]) });
        expect(limited).toMatchObject({ ok: false, reason: 'report_page_limit', cursor: FIRST });
    });

    it('rejects malformed, over-limit, or timestampless evidence without claiming completion', async () => {
        for (const invalid of [{ ...order(1), time: undefined }, { ...order(1), orderid: {}, transid: null }]) {
            const result = await scanMicroTxnReport({ time: START, fetchPage: async () => page([invalid]) });
            expect(result).toMatchObject({ ok: false, reason: 'invalid_report_order' });
        }
        expect(await scanMicroTxnReport({ time: START, maxOrders: 1, fetchPage: async () => page([order(1), order(2)]) }))
            .toMatchObject({ ok: false, reason: 'report_evidence_limit' });
    });
});
