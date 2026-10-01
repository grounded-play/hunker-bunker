import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { afterEach, beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { attachSteamStoreRoutes } from './steamStore.js';
import * as purchaseDb from './db.js';
import {
    initDb,
    setMockInventory,
    getMockInventory,
    listPurchases,
    savePurchaseState,
    saveIdempotency,
    checkIdempotency,
    cleanupExpiredIdempotency
} from './db.js';
import { createSteamSessionToken } from './steamAuth.js';

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

function enableLiveStoreEnv() {
    process.env.NODE_ENV = 'production';
    process.env.HB_SESSION_SECRET = 'steam-store-test-session';
    process.env.HB_STEAM_PUBLISHER_KEY = 'publisher-key';
    process.env.HB_STEAM_MICROTXN_ENABLED = '1';
    process.env.HB_STEAM_STORE_ENABLED = '1';
    process.env.HB_STEAM_STORE_MOCK_PURCHASES = '0';
}

function liveAuthHeaders(steamId64 = '76561198000000000') {
    const session = createSteamSessionToken({ steamId64, isDevMode: false });
    return {
        'content-type': 'application/json',
        authorization: `Bearer ${session.token}`
    };
}

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' }
    });
}

function mockExternalFetch(handler) {
    globalThis.fetch = vi.fn(async (url, options) => {
        if (String(url).startsWith(baseUrl)) {
            return ORIGINAL_FETCH(url, options);
        }
        return handler(url, options);
    });
}

function externalFetchCallCount() {
    return globalThis.fetch.mock.calls.filter(([url]) => !String(url).startsWith(baseUrl)).length;
}

describe('Steam Store API endpoints', () => {
    it('GET /steam/store/catalog is public and discloses odds alongside pricing', async () => {
        const res = await fetch(`${baseUrl}/steam/store/catalog`);
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.purchasesEnabled).toBe(true);
        expect(body.purchaseMode).toBe('mock');
        expect(body.mockPurchasesEnabled).toBe(true);
        expect(body.hostedItemStore).toMatchObject({
            enabled: false,
            mode: 'disabled',
            appId: 4957040,
            url: null,
            publicUrl: 'https://store.steampowered.com/itemstore/4957040/',
            betaUrl: 'https://store.steampowered.com/itemstore/4957040/?beta=1'
        });
        expect(body.catalog.length).toBeGreaterThan(0);
        expect(body.catalog[0]).toMatchObject({ sku: expect.any(String), priceUsdCents: expect.any(Number) });

        const oddsTotal = body.deepRelicCacheOdds.reduce((sum, row) => sum + row.percent, 0);
        expect(oddsTotal).toBeCloseTo(100, 1);
    });

    it('GET /steam/store/catalog exposes a gated hosted Steam Item Store URL when configured', async () => {
        process.env.HB_STEAM_ITEM_STORE_ENABLED = '1';
        process.env.HB_STEAM_ITEM_STORE_BETA = '1';
        process.env.HB_STEAM_ITEM_STORE_APPID = '4957040';

        const res = await fetch(`${baseUrl}/steam/store/catalog`);
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.hostedItemStore).toMatchObject({
            enabled: true,
            mode: 'beta',
            appId: 4957040,
            url: 'https://store.steampowered.com/itemstore/4957040/?beta=1',
            publicUrl: 'https://store.steampowered.com/itemstore/4957040/',
            betaUrl: 'https://store.steampowered.com/itemstore/4957040/?beta=1'
        });
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
        expect(body.purchaseStatus).toBe('completed');
        expect(body.nextAction).toBe('refresh_inventory');
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

        const session = createSteamSessionToken({ steamId64: testId });
        const res = await fetch(`${baseUrl}/steam/store/purchase/init`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${session.token}`
            },
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
            purchaseStatus: 'disabled',
            nextAction: 'show_error',
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
        expect(finalizeBody).toMatchObject({
            ok: true,
            mode: 'mock',
            status: 'completed',
            purchaseStatus: 'completed',
            nextAction: 'refresh_inventory',
            alreadyGranted: true
        });
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

    it('POST /steam/store/purchase/init stores a live pending transaction with separate order and transaction ids', async () => {
        enableLiveStoreEnv();
        const reqId = `buy-live-init-${Math.random()}`;
        mockExternalFetch(async (url, options) => {
            expect(String(url)).toContain('/ISteamMicroTxn/InitTxn/v3/');
            const body = new URLSearchParams(String(options.body));
            expect(body.get('usersession')).toBe('client');
            expect(body.get('steamid')).toBe('76561198000000000');
            expect(body.get('orderid')).toMatch(/^\d+$/);
            return jsonResponse({
                response: {
                    result: 'OK',
                    params: {
                        orderid: '9001001',
                        transid: '7001001'
                    }
                }
            });
        });

        const res = await fetch(`${baseUrl}/steam/store/purchase/init`, {
            method: 'POST',
            headers: liveAuthHeaders(),
            body: JSON.stringify({ requestId: reqId, sku: 'key_5' })
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toMatchObject({
            ok: true,
            mode: 'live',
            transId: '7001001',
            orderId: '9001001',
            status: 'pending_confirmation',
            purchaseStatus: 'pending',
            nextAction: 'open_overlay',
            requiresConfirmation: true
        });

        const purchase = listPurchases({ limit: 20 }).find((row) => row.transId === '7001001');
        expect(purchase).toMatchObject({
            requestId: reqId,
            transId: '7001001',
            orderId: '9001001',
            status: 'pending_confirmation',
            sku: 'key_5'
        });
        expect(purchase.events).toHaveLength(1);
    });

    it('POST /steam/store/purchase/finalize leaves Steam Init transactions pending', async () => {
        enableLiveStoreEnv();
        const transId = `pending-${Date.now()}`;
        await savePurchaseState({
            steamId64: '76561198000000000',
            sku: 'key_1',
            transId,
            orderId: `order-${transId}`,
            status: 'pending_confirmation',
            priceUsdCents: 99
        });
        mockExternalFetch(async (url) => {
            expect(String(url)).toContain('/ISteamMicroTxn/QueryTxn/v3/');
            return jsonResponse({
                response: {
                    result: 'OK',
                    params: { orderid: `order-${transId}`, transid: transId, steamid: '76561198000000000', status: 'Init' }
                }
            });
        });

        const res = await fetch(`${baseUrl}/steam/store/purchase/finalize`, {
            method: 'POST',
            headers: liveAuthHeaders(),
            body: JSON.stringify({ transId })
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toMatchObject({
            ok: true,
            status: 'pending',
            reason: 'steam_purchase_pending',
            purchaseStatus: 'pending',
            nextAction: 'retry_finalize',
            steamState: 'Init'
        });

        const purchase = listPurchases({ limit: 20 }).find((row) => row.transId === transId);
        expect(purchase).toMatchObject({ status: 'pending_confirmation', steamState: 'Init' });
        expect(externalFetchCallCount()).toBe(1);
    });

    it('POST /steam/store/purchase/finalize captures Approved transactions and grants inventory once', async () => {
        enableLiveStoreEnv();
        const transId = `approved-${Date.now()}`;
        const orderId = `order-${transId}`;
        await savePurchaseState({
            steamId64: '76561198000000000',
            sku: 'key_5',
            transId,
            orderId,
            status: 'pending_confirmation',
            priceUsdCents: 399
        });
        mockExternalFetch(async (url) => {
            const text = String(url);
            if (text.includes('/ISteamMicroTxn/QueryTxn/v3/')) {
                expect(text).toContain(`orderid=${encodeURIComponent(orderId)}`);
                expect(text).toContain(`transid=${encodeURIComponent(transId)}`);
                return jsonResponse({
                    response: {
                        result: 'OK',
                        params: { orderid: orderId, transid: transId, steamid: '76561198000000000', status: 'Approved' }
                    }
                });
            }
            if (text.includes('/ISteamMicroTxn/FinalizeTxn/v2/')) {
                return jsonResponse({
                    response: {
                        result: 'OK',
                        params: { orderid: orderId, transid: transId }
                    }
                });
            }
            if (text.includes('/IInventoryService/AddItem/v1/')) {
                return jsonResponse({
                    response: {
                        success: true,
                        item_json: JSON.stringify([
                            { itemid: '17209346500926339', itemdefid: '4001', quantity: '5' }
                        ])
                    }
                });
            }
            throw new Error(`unexpected fetch ${text}`);
        });

        const res = await fetch(`${baseUrl}/steam/store/purchase/finalize`, {
            method: 'POST',
            headers: liveAuthHeaders(),
            body: JSON.stringify({ transId })
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toMatchObject({
            ok: true,
            mode: 'live',
            status: 'completed',
            purchaseStatus: 'completed',
            nextAction: 'refresh_inventory',
            transId,
            orderId,
            granted: [{ itemId: '17209346500926339', itemdefid: 4001, quantity: 5 }]
        });

        const purchase = listPurchases({ limit: 20 }).find((row) => row.transId === transId);
        expect(purchase.status).toBe('completed');
        expect(purchase.events.map((event) => event.status)).toContain('approved');
        expect(purchase.events.map((event) => event.status)).toContain('completed');
        expect(externalFetchCallCount()).toBe(3);

        const retryRes = await fetch(`${baseUrl}/steam/store/purchase/finalize`, {
            method: 'POST',
            headers: liveAuthHeaders(),
            body: JSON.stringify({ transId })
        });
        expect(retryRes.status).toBe(200);
        expect(await retryRes.json()).toMatchObject({ alreadyGranted: true, purchaseStatus: 'completed' });
        expect(externalFetchCallCount()).toBe(3);
    });

    it('POST /steam/store/purchase/finalize records failed Steam transaction states without granting', async () => {
        enableLiveStoreEnv();
        const transId = `failed-${Date.now()}`;
        await savePurchaseState({
            steamId64: '76561198000000000',
            sku: 'key_1',
            transId,
            orderId: `order-${transId}`,
            status: 'pending_confirmation',
            priceUsdCents: 99
        });
        mockExternalFetch(async (url) => {
            expect(String(url)).toContain('/ISteamMicroTxn/QueryTxn/v3/');
            return jsonResponse({
                response: {
                    result: 'OK',
                    params: { orderid: `order-${transId}`, transid: transId, steamid: '76561198000000000', status: 'Failed' }
                }
            });
        });

        const res = await fetch(`${baseUrl}/steam/store/purchase/finalize`, {
            method: 'POST',
            headers: liveAuthHeaders(),
            body: JSON.stringify({ transId })
        });
        expect(res.status).toBe(409);
        const body = await res.json();
        expect(body).toMatchObject({
            ok: false,
            reason: 'steam_purchase_failed',
            purchaseStatus: 'failed',
            nextAction: 'show_error',
            steamState: 'Failed'
        });

        const purchase = listPurchases({ limit: 20 }).find((row) => row.transId === transId);
        expect(purchase).toMatchObject({ status: 'failed', steamState: 'Failed' });
        expect(externalFetchCallCount()).toBe(1);
    });

    it('POST /steam/store/purchase/finalize records refunded Steam transaction states as reversals', async () => {
        enableLiveStoreEnv();
        const transId = `refunded-${Date.now()}`;
        await savePurchaseState({
            steamId64: '76561198000000000',
            sku: 'key_1',
            transId,
            orderId: `order-${transId}`,
            status: 'completed',
            priceUsdCents: 99
        });
        mockExternalFetch(async (url) => {
            expect(String(url)).toContain('/ISteamMicroTxn/QueryTxn/v3/');
            return jsonResponse({
                response: {
                    result: 'OK',
                    params: { orderid: `order-${transId}`, transid: transId, steamid: '76561198000000000', status: 'Refunded' }
                }
            });
        });

        const res = await fetch(`${baseUrl}/steam/store/purchase/finalize`, {
            method: 'POST',
            headers: liveAuthHeaders(),
            body: JSON.stringify({ transId, reconcile: true })
        });
        expect(res.status).toBe(409);
        const body = await res.json();
        expect(body).toMatchObject({
            ok: false,
            reason: 'steam_purchase_reversed',
            purchaseStatus: 'reversed',
            nextAction: 'show_error',
            steamState: 'Refunded'
        });

        const purchase = listPurchases({ limit: 20 }).find((row) => row.transId === transId);
        expect(purchase).toMatchObject({ status: 'reversed', steamState: 'Refunded' });
        expect(externalFetchCallCount()).toBe(1);
    });

    it('expires only idempotency records that were saved with a ttl', async () => {
        const expiringKey = `idem-expiring-${Math.random()}`;
        const permanentKey = `idem-permanent-${Math.random()}`;
        await saveIdempotency(expiringKey, { status: 200, body: { ok: true, kind: 'expiring' } }, { ttlMs: 100 });
        await saveIdempotency(permanentKey, { status: 200, body: { ok: true, kind: 'permanent' } });

        const cleanup = await cleanupExpiredIdempotency({ now: Date.now() + 1000 });
        expect(cleanup.removed).toBeGreaterThanOrEqual(1);
        expect(checkIdempotency(expiringKey)).toBeNull();
        expect(checkIdempotency(permanentKey)?.body).toMatchObject({ kind: 'permanent' });
    });
});

describe('paid grant recovery', () => {
    let counter = 0;
    async function seed(status = 'pending_confirmation') {
        enableLiveStoreEnv();
        counter += 1;
        return savePurchaseState({ steamId64: '76561198000000000', sku: 'key_5',
            transId: `recover-${counter}`, orderId: `recover-order-${counter}`, status, priceUsdCents: 399 });
    }
    async function finalize(purchase) {
        const response = await fetch(`${baseUrl}/steam/store/purchase/finalize`, {
            method: 'POST', headers: liveAuthHeaders(), body: JSON.stringify({ transId: purchase.transId })
        });
        return { status: response.status, body: await response.json() };
    }
    function query(purchase, status = 'Succeeded', extra = {}) {
        return jsonResponse({ response: { result: 'OK', params: {
            orderid: purchase.orderId, transid: purchase.transId, steamid: purchase.steamId64, status, ...extra
        } } });
    }
    function delivered(replayed = false, quantity = 5, itemdefid = '4001') {
        return jsonResponse({ response: { success: true, replayed, item_json: JSON.stringify([
            { itemid: '17209346500926339', itemdefid, quantity }
        ]) } });
    }

    it.each(['lost_response', 'lost_completion_write'])('reuses durable uint64 identity after %s and never grants twice', async (failure) => {
        const purchase = await seed();
        const ids = [];
        const grants = new Set();
        let queryCount = 0;
        if (failure === 'lost_completion_write') {
            const save = purchaseDb.savePurchaseState;
            let fail = true;
            vi.spyOn(purchaseDb, 'savePurchaseState').mockImplementation(async (row) => {
                if (row.status === 'completed' && fail) { fail = false; throw new Error('disk unavailable'); }
                return save(row);
            });
        }
        mockExternalFetch(async (url, options) => {
            if (String(url).includes('/QueryTxn/')) { queryCount += 1; return query(purchase); }
            expect(String(url)).toContain('/AddItem/');
            const id = options.body.get('requestid');
            expect(id).toMatch(/^[1-9]\d{0,19}$/);
            expect(BigInt(id)).toBeLessThanOrEqual(18446744073709551615n);
            expect(options.body.get('trade_restriction')).toBe('1');
            const saved = purchaseDb.findPurchaseByTransId(purchase.transId);
            expect(saved.status).toBe('finalized_pending_grant');
            expect(saved.grantIntent).toMatchObject({ requestId: id, quantity: 5, itemdefid: 4001 });
            ids.push(id);
            const replayed = grants.has(id);
            grants.add(id);
            if (!replayed && failure === 'lost_response') throw new Error('response lost');
            // By retry time the original keys may already have been consumed.
            return delivered(replayed, replayed ? 0 : 5);
        });
        expect((await finalize(purchase)).status).toBe(502);
        const result = await finalize(purchase);
        expect(result).toMatchObject({ status: 200, body: { purchaseStatus: 'completed', grantReplayed: true } });
        expect(ids).toHaveLength(2);
        expect(new Set(ids).size).toBe(1);
        expect(grants.size).toBe(1);
        expect(queryCount).toBe(2);
        expect(purchaseDb.findPurchaseByTransId(purchase.transId)).toMatchObject({ status: 'completed', grantReplayed: true });
    });

    it('cannot issue AddItem before the grant intent is persisted', async () => {
        const purchase = await seed();
        const save = purchaseDb.savePurchaseState;
        vi.spyOn(purchaseDb, 'savePurchaseState').mockImplementation(async (row) => {
            if (row.grantIntent) throw new Error('disk unavailable');
            return save(row);
        });
        mockExternalFetch(async (url) => {
            expect(String(url)).toContain('/QueryTxn/');
            return query(purchase);
        });
        expect((await finalize(purchase)).status).toBe(502);
        expect(externalFetchCallCount()).toBe(1);
        expect(purchaseDb.findPurchaseByTransId(purchase.transId).status).not.toBe('completed');
    });

    it('serializes simultaneous finalize attempts including the order-ID alias', async () => {
        const purchase = await seed();
        let entered;
        let release;
        const atGrant = new Promise((resolve) => { entered = resolve; });
        const gate = new Promise((resolve) => { release = resolve; });
        let adds = 0;
        mockExternalFetch(async (url) => {
            if (String(url).includes('/QueryTxn/')) return query(purchase);
            adds += 1;
            entered();
            await gate;
            return delivered();
        });
        const first = finalize(purchase);
        await atGrant;
        let second;
        try { second = await finalize({ transId: purchase.orderId }); } finally { release(); }
        expect((await first).status).toBe(200);
        expect(second).toMatchObject({ status: 409, body: { reason: 'purchase_finalize_in_progress' } });
        expect(adds).toBe(1);
        expect((await finalize(purchase)).body.alreadyGranted).toBe(true);
    });

    it.each(['grant_failed', 'finalized_pending_grant'])('does not blindly repeat an old non-idempotent %s grant', async (status) => {
        const purchase = await seed(status);
        mockExternalFetch(async (url) => {
            expect(String(url)).toContain('/QueryTxn/');
            return query(purchase);
        });
        expect(await finalize(purchase)).toMatchObject({ status: 409, body: { reason: 'legacy_grant_requires_review' } });
        expect(externalFetchCallCount()).toBe(0);
    });

    it('rechecks pending delivery against a refund before retrying inventory', async () => {
        const purchase = await seed();
        let adds = 0;
        mockExternalFetch(async (url) => {
            if (String(url).includes('/QueryTxn/')) return query(purchase, adds ? 'Refunded' : 'Succeeded');
            adds += 1;
            throw new Error('response lost');
        });
        expect((await finalize(purchase)).status).toBe(502);
        expect(await finalize(purchase)).toMatchObject({ status: 409, body: { purchaseStatus: 'reversed' } });
        expect(adds).toBe(1);
    });

    it.each([{ steamid: '76561198000000001' }, { orderid: 'another-order' }, { transid: undefined }])('rejects mismatched or missing Steam identity: %j', async (extra) => {
        const purchase = await seed();
        mockExternalFetch(async (url) => {
            expect(String(url)).toContain('/QueryTxn/');
            return query(purchase, 'Succeeded', extra);
        });
        expect(await finalize(purchase)).toMatchObject({ status: 409, body: { reason: 'steam_purchase_identity_mismatch' } });
        expect(externalFetchCallCount()).toBe(1);
    });

    it.each([[1, '4001'], [5, '9999']])('does not complete an incorrect initial grant receipt (%s, %s)', async (quantity, itemdefid) => {
        const purchase = await seed();
        mockExternalFetch(async (url) => String(url).includes('/QueryTxn/') ? query(purchase) : delivered(false, quantity, itemdefid));
        expect(await finalize(purchase)).toMatchObject({ status: 409, body: { reason: 'steam_inventory_grant_requires_review' } });
        const calls = externalFetchCallCount();
        expect((await finalize(purchase)).status).toBe(409);
        expect(externalFetchCallCount()).toBe(calls);
        expect(purchaseDb.findPurchaseByTransId(purchase.transId).status).toBe('grant_review_required');
    });

    it('cannot retry pending inventory with MicroTxn disabled or in a different environment', async () => {
        const purchase = await seed();
        mockExternalFetch(async (url) => {
            if (String(url).includes('/QueryTxn/')) return query(purchase);
            throw new Error('response lost');
        });
        expect((await finalize(purchase)).status).toBe(502);
        const count = externalFetchCallCount();
        process.env.HB_STEAM_MICROTXN_ENABLED = '0';
        expect((await finalize(purchase)).status).toBe(503);
        process.env.HB_STEAM_MICROTXN_ENABLED = '1';
        process.env.HB_STEAM_MICROTXN_SANDBOX = '1';
        expect(await finalize(purchase)).toMatchObject({ status: 409, body: { reason: 'purchase_grant_context_mismatch' } });
        expect(externalFetchCallCount()).toBe(count);
    });

    it('requires fresh settlement proof after FinalizeTxn reports already committed', async () => {
        const purchase = await seed();
        let queried = 0;
        mockExternalFetch(async (url) => {
            if (String(url).includes('/QueryTxn/')) return query(purchase, queried++ ? 'Refunded' : 'Approved');
            expect(String(url)).toContain('/FinalizeTxn/');
            return jsonResponse({ response: { result: 'Failure', error: { errorcode: 6 } } });
        });
        expect(await finalize(purchase)).toMatchObject({ status: 409, body: { nextAction: 'retry_finalize' } });
        expect(await finalize(purchase)).toMatchObject({ status: 409, body: { purchaseStatus: 'reversed' } });
        expect(externalFetchCallCount()).toBe(3);
    });

    it('rejects FinalizeTxn success for a different transaction', async () => {
        const purchase = await seed();
        mockExternalFetch(async (url) => {
            if (String(url).includes('/QueryTxn/')) return query(purchase, 'Approved');
            expect(String(url)).toContain('/FinalizeTxn/');
            return jsonResponse({ response: { result: 'OK', params: { orderid: purchase.orderId, transid: 'another-trans' } } });
        });
        expect(await finalize(purchase)).toMatchObject({ status: 409, body: { reason: 'steam_purchase_identity_mismatch' } });
        expect(externalFetchCallCount()).toBe(2);
    });

    it('keeps completed inventory separate from a later unsettled payment', async () => {
        const purchase = await seed('completed');
        mockExternalFetch(async (url) => {
            expect(String(url)).toContain('/QueryTxn/');
            return query(purchase, 'Approved');
        });
        const response = await fetch(`${baseUrl}/steam/store/purchase/finalize`, {
            method: 'POST', headers: liveAuthHeaders(), body: JSON.stringify({ transId: purchase.transId, reconcile: true })
        });
        expect(response.status).toBe(409);
        expect(await response.json()).toMatchObject({ reason: 'grant_without_settled_payment' });
        expect(externalFetchCallCount()).toBe(1);
    });
});
