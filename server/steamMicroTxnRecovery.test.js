import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSqliteBackend } from './db-sqlite.js';
import { runMicroTxnReconciliation, readAllReportPurchases, startMicroTxnReconciliation } from './steamMicroTxnReport.js';

const START = '2026-01-01T00:00:00Z';
const FIRST = '2026-01-02T00:00:00Z';
const SECOND = '2026-01-03T00:00:00Z';
const order = (id, time = FIRST) => ({ orderid: String(id), transid: String(1000 + id), time, status: 'Succeeded', steamid: '76561198000000000' });
const purchase = (id, status = 'completed') => ({ orderId: String(id), transId: String(1000 + id), status, createdAt: Date.parse(FIRST) });
const response = (orders) => new Response(JSON.stringify({ response: { result: 'OK', params: { count: orders.length, orders } } }));
const config = { key: 'test-key-not-live', appId: 1, initialSince: START, durable: true };
let directory;
let db;
afterEach(() => {
    db?.close?.();
    db = null;
    vi.useRealTimers();
    vi.unstubAllEnvs();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
    directory = null;
});

function open() {
    directory ??= fs.mkdtempSync(path.join(os.tmpdir(), 'hb-report-recovery-'));
    db = createSqliteBackend({ DatabaseSync, dbFilePath: path.join(directory, 'reports.sqlite') });
    db.initDb();
    return { load: db.getMicroTxnCheckpoint, save: db.saveMicroTxnCheckpoint };
}

describe('durable entitlement report recovery', () => {
    it('resumes persisted evidence after an outage longer than 48h and a process restart', async () => {
        let store = open();
        const interrupted = vi.fn().mockResolvedValueOnce(response([order(1)]))
            .mockResolvedValueOnce(new Response('{}', { status: 503 }));
        const first = await runMicroTxnReconciliation({ ...config, store, fetchImpl: interrupted, purchases: [purchase(1)] });
        expect(first.ok).toBe(false);
        expect(first.checkpoint.cursor).toBe(FIRST);
        expect(store.load('1.live.GAMESALES').orders).toHaveLength(1);
        db.close();
        store = open();
        const fetchImpl = vi.fn().mockResolvedValueOnce(response([order(1), order(2, SECOND)]))
            .mockResolvedValueOnce(response([]));
        const recovered = await runMicroTxnReconciliation({ ...config, store, fetchImpl,
            initialSince: '2026-02-01T00:00:00Z', now: () => Date.parse('2026-02-01T00:00:00Z'), purchases: [purchase(1), purchase(2)] });
        expect(new URL(fetchImpl.mock.calls[0][0]).searchParams.get('time')).toBe(FIRST);
        expect(recovered.ok).toBe(true);
        expect(recovered.report.orders).toHaveLength(2);
        expect(recovered.reconciliation.counts.matched).toBe(2);
        expect(store.load('1.live.GAMESALES')).toMatchObject({ startTime: START, cursor: SECOND, health: { ok: true } });
    });

    it('keeps unresolved paid orders visible even after their timestamp is behind the cursor', async () => {
        const store = open();
        const fetchImpl = vi.fn().mockResolvedValueOnce(response([order(1), order(2, SECOND)])).mockResolvedValueOnce(response([]));
        const first = await runMicroTxnReconciliation({ ...config, store, fetchImpl, purchases: [purchase(1, 'grant_failed'), purchase(2)] });
        expect(first.ok).toBe(false);
        expect(first.reconciliation.paidNotGranted).toHaveLength(1);
        const second = await runMicroTxnReconciliation({ ...config, store, fetchImpl: async () => response([]), purchases: [purchase(1, 'grant_failed'), purchase(2)] });
        expect(second.ok).toBe(false);
        expect(second.reconciliation.paidNotGranted[0].orderid).toBe('1');
        expect(store.load('1.live.GAMESALES').health.ok).toBe(false);
    });

    it('resumes bounded page-limit runs and does not confuse a successful fetch with healthy reconciliation', async () => {
        const store = open();
        const first = await runMicroTxnReconciliation({ ...config, store, maxPages: 1, fetchImpl: async () => response([order(1)]), purchases: [] });
        expect(first).toMatchObject({ ok: false, report: { reason: 'report_page_limit' } });
        const second = await runMicroTxnReconciliation({ ...config, store, fetchImpl: async () => response([]), purchases: [] });
        expect(second.report.ok).toBe(true);
        expect(second.ok).toBe(false);
        expect(second.reconciliation.paidNotGranted).toHaveLength(1);
    });

    it('requires an explicit first-sale boundary instead of silently choosing the last 48 hours', async () => {
        const store = open();
        const fetchImpl = vi.fn();
        const result = await runMicroTxnReconciliation({ ...config, initialSince: null, store, fetchImpl });
        expect(result.report.reason).toBe('initial_report_time_required');
        expect(fetchImpl).not.toHaveBeenCalled();
        expect(store.load('1.live.GAMESALES')).toBeNull();
    });

    it('serializes jobs for one stream while keeping sandbox state separate', async () => {
        const store = open();
        let resolveFetch;
        const fetchImpl = vi.fn(() => new Promise((resolve) => { resolveFetch = resolve; }));
        const pending = runMicroTxnReconciliation({ ...config, store, fetchImpl, purchases: [] });
        await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
        const second = await runMicroTxnReconciliation({ ...config, store, fetchImpl, purchases: [] });
        expect(second.report.reason).toBe('reconciliation_in_progress');
        const sandbox = await runMicroTxnReconciliation({ ...config, store, sandbox: true, fetchImpl: async () => response([]), purchases: [] });
        expect(sandbox.ok).toBe(true);
        resolveFetch(response([]));
        expect((await pending).ok).toBe(true);
        expect(store.load('1.sandbox.GAMESALES')).not.toBeNull();
    });

    it('enumerates every local ledger page and fails explicitly if its budget is exceeded', () => {
        const all = Array.from({ length: 2005 }, (_, index) => purchase(index));
        const readPage = vi.fn(({ limit, offset }) => all.slice(offset, offset + limit));
        expect(readAllReportPurchases({ readPage })).toHaveLength(2005);
        expect(readPage.mock.calls.map(([args]) => args.offset)).toEqual([0, 1000, 2000]);
        expect(() => readAllReportPurchases({ readPage, maxRows: 1000 })).toThrow('local_ledger_limit');
    });
});

it('background ticks do not overlap and contain errors without exposing exception secrets', async () => {
    vi.useFakeTimers();
    vi.stubEnv('HB_STEAM_MICROTXN_ENABLED', '1');
    vi.stubEnv('HB_STEAM_PUBLISHER_KEY', 'test-only');
    let resolveRun;
    const run = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { resolveRun = resolve; }))
        .mockRejectedValue(new Error('sensitive URL should never be logged'));
    const log = { info: vi.fn(), warn: vi.fn() };
    const stop = startMicroTxnReconciliation({ intervalMs: 100, run, log });
    await vi.advanceTimersByTimeAsync(350);
    expect(run).toHaveBeenCalledTimes(1);
    resolveRun({ ok: true, report: {}, reconciliation: { counts: {} } });
    await vi.advanceTimersByTimeAsync(100);
    expect(run).toHaveBeenCalledTimes(2);
    expect(log.warn).toHaveBeenCalledWith('[microtxn-report] UNHEALTHY', { reason: 'worker_failed' });
    expect(JSON.stringify(log.warn.mock.calls)).not.toContain('sensitive');
    stop();
    await vi.advanceTimersByTimeAsync(500);
    expect(run).toHaveBeenCalledTimes(2);
});
