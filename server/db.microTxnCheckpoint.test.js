import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSqliteBackend } from './db-sqlite.js';

let directory;
let backend;
afterEach(() => {
    backend?.close?.();
    backend = null;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
    directory = null;
});

// `memory` keeps a large sqlite seed off the disk: each savePurchaseState is
// its own committed transaction, and 1,005 synced commits outran the 15 s
// test timeout on CI runners (1.2 s locally).
async function open(kind, seed = [], { memory = false } = {}) {
    directory ??= fs.mkdtempSync(path.join(os.tmpdir(), 'hb-report-db-'));
    if (kind === 'sqlite') {
        const dbFilePath = memory ? ':memory:' : path.join(directory, 'ledger.sqlite');
        backend = createSqliteBackend({ DatabaseSync, dbFilePath });
        await backend.initDb();
        for (const row of seed) await backend.savePurchaseState(row);
    } else {
        vi.stubEnv('HB_DB_BACKEND', 'json');
        const file = path.join(directory, 'ledger.json');
        vi.stubEnv('HB_DB_STORAGE_PATH', file);
        if (seed.length) fs.writeFileSync(file, JSON.stringify({ purchases: seed }));
        vi.resetModules();
        backend = await import('./db.js');
        await backend.initDb();
    }
    return backend;
}

describe.each(['json', 'sqlite'])('%s report persistence', (kind) => {
    it('atomically stores evidence with its cursor and survives a restart', async () => {
        let db = await open(kind);
        const record = { version: 1, cursor: '2026-01-01T00:00:00Z', orders: [{ orderid: '1', status: 'Succeeded' }] };
        expect(db.getMicroTxnCheckpoint('4957040.live.GAMESALES')).toBeNull();
        const saved = await db.saveMicroTxnCheckpoint('4957040.live.GAMESALES', record, { expectedRevision: 0 });
        expect(saved.revision).toBe(1);
        record.orders[0].status = 'changed';
        saved.orders[0].status = 'also changed';
        const read = db.getMicroTxnCheckpoint('4957040.live.GAMESALES');
        read.orders.length = 0;
        db.close?.();
        db = await open(kind);
        expect(db.getMicroTxnCheckpoint('4957040.live.GAMESALES')).toEqual({
            version: 1, revision: 1, cursor: '2026-01-01T00:00:00Z', orders: [{ orderid: '1', status: 'Succeeded' }]
        });
        expect(db.getMicroTxnCheckpoint('4957040.sandbox.GAMESALES')).toBeNull();
    });

    it('rejects stale writers rather than overwriting a newer cursor', async () => {
        const db = await open(kind);
        await db.saveMicroTxnCheckpoint('scope', { cursor: 'a' }, { expectedRevision: 0 });
        await expect(db.saveMicroTxnCheckpoint('scope', { cursor: 'stale' }, { expectedRevision: 0 })).rejects.toThrow('report_checkpoint_conflict');
        await db.saveMicroTxnCheckpoint('scope', { cursor: 'b' }, { expectedRevision: 1 });
        expect(db.getMicroTxnCheckpoint('scope')).toEqual({ cursor: 'b', revision: 2 });
        await expect(db.saveMicroTxnCheckpoint('__proto__', {}, { expectedRevision: 0 })).rejects.toThrow('invalid_report_scope');
    });

    it('enumerates beyond the 1,000-row cap without duplicates at tied timestamps', async () => {
        const rows = Array.from({ length: 1005 }, (_, index) => ({
            orderId: `order-${index}`, transId: `trans-${String(index).padStart(4, '0')}`,
            status: 'completed', createdAt: 123, updatedAt: 456
        }));
        vi.spyOn(Date, 'now').mockReturnValue(456);
        const db = await open(kind, rows, { memory: true });
        const first = db.listPurchases({ limit: 1000 });
        const second = db.listPurchases({ limit: 1000, offset: 1000 });
        expect(first).toHaveLength(1000);
        expect(second).toHaveLength(5);
        expect(new Set([...first, ...second].map((row) => row.transId)).size).toBe(1005);
        expect(first[0].transId).toBe('trans-1004');
        expect(db.listPurchases({ offset: 1005 })).toEqual([]);
    });
});

it('a failed JSON write cannot publish a cursor that was never persisted', async () => {
    const db = await open('json');
    await db.saveMicroTxnCheckpoint('scope', { cursor: 'old' }, { expectedRevision: 0 });
    vi.spyOn(fs.promises, 'rename').mockRejectedValueOnce(new Error('disk unavailable'));
    await expect(db.saveMicroTxnCheckpoint('scope', { cursor: 'new' }, { expectedRevision: 1 })).rejects.toThrow('disk unavailable');
    expect(db.getMicroTxnCheckpoint('scope')).toEqual({ cursor: 'old', revision: 1 });
    expect(JSON.parse(fs.readFileSync(path.join(directory, 'ledger.json'), 'utf8')).microTxnCheckpoints.scope.cursor).toBe('old');
    await db.saveMicroTxnCheckpoint('scope', { cursor: 'retried' }, { expectedRevision: 1 });
    expect(db.getMicroTxnCheckpoint('scope').cursor).toBe('retried');
});
