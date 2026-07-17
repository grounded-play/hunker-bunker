import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
    cleanupExpiredIdempotency,
    checkIdempotency,
    findPurchaseByTransId,
    getDbStatus,
    getMockInventory,
    getMockLeaderboard,
    initDb,
    listPurchases,
    nodeSqliteAvailable,
    saveIdempotency,
    saveMockLeaderboard,
    savePurchaseState,
    setMockInventory
} from './db.js';

const TEST_DB_PATH = path.join(os.tmpdir(), `hb-sqlite-db-test-${process.pid}-${Date.now()}.sqlite`);
const ORIGINAL_ENV = { ...process.env };
const describeSqlite = nodeSqliteAvailable() ? describe : describe.skip;

describeSqlite('SQLite db backend', () => {
    beforeAll(async () => {
        process.env.HB_DB_BACKEND = 'sqlite';
        process.env.HB_DB_SQLITE_PATH = TEST_DB_PATH;
        await initDb();
    });

    afterEach(() => {
        process.env.HB_DB_BACKEND = 'sqlite';
        process.env.HB_DB_SQLITE_PATH = TEST_DB_PATH;
    });

    it('reports sqlite storage status', () => {
        const status = getDbStatus();
        expect(status).toMatchObject({
            storageBackend: 'sqlite',
            path: TEST_DB_PATH,
            durable: true,
            initialized: true,
            exists: true
        });
    });

    it('persists mock inventories through the same API', async () => {
        await setMockInventory('sqlite-inventory-player', [
            {
                itemId: 'sqlite-item-1',
                itemdefid: 4001,
                quantity: 3,
                acquiredAt: 1234,
                properties: { source: 'test' }
            }
        ]);

        expect(getMockInventory('sqlite-inventory-player')).toEqual([
            {
                itemId: 'sqlite-item-1',
                itemdefid: 4001,
                quantity: 3,
                acquiredAt: 1234,
                properties: { source: 'test' }
            }
        ]);
    });

    it('persists mock leaderboards through the same API', async () => {
        await saveMockLeaderboard('sqlite_board', [
            { steamId64: '76561198000000001', score: 99, persona: 'Sqlite A', timestamp: 100, rank: 1 },
            { steamId64: '76561198000000002', score: 25, persona: 'Sqlite B', timestamp: 200, rank: 2 }
        ]);

        expect(getMockLeaderboard('sqlite_board')).toEqual([
            { steamId64: '76561198000000001', score: 99, persona: 'Sqlite A', timestamp: 100, rank: 1 },
            { steamId64: '76561198000000002', score: 25, persona: 'Sqlite B', timestamp: 200, rank: 2 }
        ]);
    });

    it('expires only ttl-bound idempotency records', async () => {
        await saveIdempotency('sqlite-expiring', { status: 200, body: { ok: true, kind: 'expiring' } }, { ttlMs: 50 });
        await saveIdempotency('sqlite-permanent', { status: 200, body: { ok: true, kind: 'permanent' } });

        const cleanup = await cleanupExpiredIdempotency({ now: Date.now() + 1000 });
        expect(cleanup.removed).toBeGreaterThanOrEqual(1);
        expect(checkIdempotency('sqlite-expiring')).toBeNull();
        expect(checkIdempotency('sqlite-permanent')?.body).toMatchObject({ kind: 'permanent' });
    });

    it('upserts purchase state with an event trail instead of duplicating transactions', async () => {
        const created = await savePurchaseState({
            steamId64: '76561198000000000',
            requestId: 'sqlite-purchase-request',
            sku: 'key_1',
            transId: 'sqlite-trans-1',
            orderId: 'sqlite-order-1',
            status: 'pending_confirmation',
            priceUsdCents: 99
        });
        expect(created.status).toBe('pending_confirmation');

        const completed = await savePurchaseState({
            steamId64: '76561198000000000',
            sku: 'key_1',
            transId: 'sqlite-trans-1',
            orderId: 'sqlite-order-1',
            status: 'completed',
            priceUsdCents: 99,
            granted: [{ itemId: 'grant-1', itemdefid: 4001, quantity: 1 }]
        });

        expect(completed).toMatchObject({
            transId: 'sqlite-trans-1',
            orderId: 'sqlite-order-1',
            status: 'completed',
            granted: [{ itemId: 'grant-1', itemdefid: 4001, quantity: 1 }]
        });
        expect(completed.events.map((event) => event.status)).toEqual(['pending_confirmation', 'completed']);
        expect(findPurchaseByTransId('sqlite-trans-1')?.status).toBe('completed');
        expect(listPurchases({ steamId64: '76561198000000000' }).filter((p) => p.transId === 'sqlite-trans-1')).toHaveLength(1);
    });

    afterAll(() => {
        for (const key of Object.keys(process.env)) {
            delete process.env[key];
        }
        Object.assign(process.env, ORIGINAL_ENV);
        for (const suffix of ['', '-wal', '-shm']) {
            try { fs.unlinkSync(`${TEST_DB_PATH}${suffix}`); } catch { /* already gone */ }
        }
    });
});
