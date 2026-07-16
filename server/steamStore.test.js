import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { afterEach, beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { attachSteamStoreRoutes } from './steamStore.js';
import { initDb, setMockInventory, getMockInventory } from './db.js';

let server;
let baseUrl;
// Isolated from server/db_storage.json so this file's writes never race
// steamInventory.test.js writing the same physical file in a parallel worker.
const TEST_DB_PATH = path.join(os.tmpdir(), `hb-steam-store-test-${process.pid}-${Date.now()}.json`);
process.env.HB_DB_STORAGE_PATH = TEST_DB_PATH;
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

beforeAll(async () => {
    await initDb();
    const app = express();
    app.use(express.json());
    attachSteamStoreRoutes(app);

    server = await new Promise((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => {
    server.close();
    for (const p of [TEST_DB_PATH, `${TEST_DB_PATH}.tmp`]) {
        try { fs.unlinkSync(p); } catch { /* already gone */ }
    }
});

afterEach(() => {
    for (const key of Object.keys(process.env)) {
        delete process.env[key];
    }
    Object.assign(process.env, ORIGINAL_ENV);
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
});

describe('Steam Store API endpoints', () => {
    it('GET /steam/store/catalog is public and discloses odds alongside pricing', async () => {
        const res = await fetch(`${baseUrl}/steam/store/catalog`);
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.purchasesEnabled).toBe(true);
        expect(body.purchaseMode).toBe('mock');
        expect(body.mockPurchasesEnabled).toBe(true);
        expect(body.catalog.length).toBeGreaterThan(0);
        expect(body.catalog[0]).toMatchObject({ sku: expect.any(String), priceUsdCents: expect.any(Number) });

        const oddsTotal = body.deepRelicCacheOdds.reduce((sum, row) => sum + row.percent, 0);
        expect(oddsTotal).toBeCloseTo(100, 1);
    });

    it('POST /steam/store/purchase/init grants keys immediately in mock mode', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        delete process.env.HB_STEAM_MICROTXN_ENABLED;
        const testId = '76561198000000000';
        await setMockInventory(testId, []);

        const res = await fetch(`${baseUrl}/steam/store/purchase/init`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                ticketHex: '00112233445566778899aabbccddeeff',
                requestId: `buy-test-${Math.random()}`,
                sku: 'key_5'
            })
        });
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.mode).toBe('mock');
        expect(body.requiresConfirmation).toBe(false);

        const inv = getMockInventory(testId);
        const keys = inv.find((i) => i.itemdefid === 4001);
        expect(keys?.quantity).toBe(5);
    });

    it('POST /steam/store/purchase/init rejects production purchases until live Steam commerce is enabled', async () => {
        process.env.NODE_ENV = 'production';
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        delete process.env.HB_STEAM_MICROTXN_ENABLED;
        delete process.env.HB_STEAM_STORE_ENABLED;
        delete process.env.HB_STEAM_STORE_MOCK_PURCHASES;
        const testId = '76561198000000000';
        await setMockInventory(testId, []);

        const res = await fetch(`${baseUrl}/steam/store/purchase/init`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                ticketHex: '00112233445566778899aabbccddeeff',
                requestId: `buy-prod-disabled-${Math.random()}`,
                sku: 'key_1'
            })
        });
        expect(res.status).toBe(503);

        const body = await res.json();
        expect(body).toMatchObject({
            ok: false,
            reason: 'steam_store_disabled',
            purchasesEnabled: false,
            purchaseMode: 'disabled'
        });
        expect(getMockInventory(testId).find((i) => i.itemdefid === 4001)).toBeUndefined();
    });

    it('POST /steam/store/purchase/init is idempotent on requestId', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const testId = '76561198000000000';
        await setMockInventory(testId, []);
        const reqId = `buy-idem-${Math.random()}`;

        const first = await fetch(`${baseUrl}/steam/store/purchase/init`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ticketHex: '00112233445566778899aabbccddeeff', requestId: reqId, sku: 'key_1' })
        });
        const firstBody = await first.json();

        const second = await fetch(`${baseUrl}/steam/store/purchase/init`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ticketHex: '00112233445566778899aabbccddeeff', requestId: reqId, sku: 'key_1' })
        });
        const secondBody = await second.json();

        expect(secondBody).toEqual(firstBody);

        const inv = getMockInventory(testId);
        const keys = inv.find((i) => i.itemdefid === 4001);
        // Only one grant of 1 key should have happened, not two.
        expect(keys?.quantity).toBe(1);
    });

    it('POST /steam/store/purchase/init rejects an unknown sku', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const res = await fetch(`${baseUrl}/steam/store/purchase/init`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                ticketHex: '00112233445566778899aabbccddeeff',
                requestId: `buy-bad-${Math.random()}`,
                sku: 'not_a_real_sku'
            })
        });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.reason).toBe('invalid_sku');
    });

    it('POST /steam/store/purchase/finalize is a no-op confirmation for mock purchases', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const testId = '76561198000000000';
        await setMockInventory(testId, []);
        const reqId = `buy-finalize-${Math.random()}`;

        const initRes = await fetch(`${baseUrl}/steam/store/purchase/init`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ticketHex: '00112233445566778899aabbccddeeff', requestId: reqId, sku: 'key_1' })
        });
        expect(initRes.status).toBe(200);

        // Mock mode returns no transId (nothing to confirm), so finalize
        // should be called with the mock- prefixed id the receipt was saved under.
        const finalizeRes = await fetch(`${baseUrl}/steam/store/purchase/finalize`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ticketHex: '00112233445566778899aabbccddeeff', transId: `mock-${reqId}` })
        });
        expect(finalizeRes.status).toBe(200);
        const finalizeBody = await finalizeRes.json();
        expect(finalizeBody).toMatchObject({ ok: true, mode: 'mock', status: 'completed', alreadyGranted: true });
    });

    it('POST /steam/store/purchase/finalize 404s an unknown transaction id', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const res = await fetch(`${baseUrl}/steam/store/purchase/finalize`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ticketHex: '00112233445566778899aabbccddeeff', transId: 'never-existed' })
        });
        expect(res.status).toBe(404);
    });
});
