import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { afterEach, beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { attachSteamInventoryRoutes } from './steamInventory.js';
import { initDb, setMockInventory, getMockInventory, checkIdempotency } from './db.js';
import { createSteamSessionToken } from './steamAuth.js';
import { recipeExchangeJournalKey } from './steamRecipeExchange.js';

let server;
let baseUrl;
// Isolated per test run (not just per file) — some of these tests grant
// achievement-tied items using a fixed, non-randomized idempotency key
// (the dev-mode steamId is always the same hardcoded value), so a stale
// server/db_storage.json left over from a previous run of this same file
// would otherwise make "grants exactly once" tests see an already-granted
// record that this run never actually created.
const TEST_DB_PATH = path.join(os.tmpdir(), `hb-steam-inventory-test-${process.pid}-${Date.now()}.json`);
process.env.HB_DB_STORAGE_PATH = TEST_DB_PATH;
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

beforeAll(async () => {
    await initDb();
    const app = express();
    app.use(express.json());
    attachSteamInventoryRoutes(app);

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
    // Restore Env
    for (const key of Object.keys(process.env)) {
        delete process.env[key];
    }
    Object.assign(process.env, ORIGINAL_ENV);
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
});

describe('Steam Inventory API endpoints', () => {
    function liveInventory(responseBody, { throws = false } = {}) {
        process.env.HB_SESSION_SECRET = 'inventory-contract-test';
        process.env.HB_STEAM_PUBLISHER_KEY = 'private-test-key';
        const session = createSteamSessionToken({ steamId64: '76561198000000000', isDevMode: false });
        const external = vi.fn(async (url) => {
            const request = new URL(url);
            expect(request.pathname).toBe('/IInventoryService/GetInventory/v1/');
            expect(request.searchParams.get('steamid')).toBe('76561198000000000');
            if (throws) throw new Error(`${url} contains a private publisher key`);
            return new Response(JSON.stringify(responseBody));
        });
        globalThis.fetch = vi.fn((url, options) => String(url).startsWith(baseUrl)
            ? ORIGINAL_FETCH(url, options) : external(url, options));
        return { external, headers: { authorization: `Bearer ${session.token}` } };
    }

    it('GET /steam/inventory reads real item_json with exact IDs, counts and stable acquisition dates', async () => {
        const { headers, external } = liveInventory({ response: { item_json: JSON.stringify([
            { itemid: '18446744073709551615', itemdefid: '4001', quantity: '5', acquired: '20260930T120000Z' },
            { itemid: '17212166272732706', itemdefid: 1100, quantity: 2, acquired: '2026-09-29T12:00:00Z' },
            { itemid: '3', itemdefid: 1000, quantity: 0 },
            { itemid: '4', itemdefid: 1000, quantity: 1, state: 'removed' }
        ]) } });
        const response = await fetch(`${baseUrl}/steam/inventory`, { headers });
        expect(response.status).toBe(200);
        expect((await response.json()).inventory).toEqual([
            { itemId: '18446744073709551615', itemdefid: 4001, quantity: 5, acquiredAt: Date.parse('2026-09-30T12:00:00Z') },
            { itemId: '17212166272732706', itemdefid: 1100, quantity: 2, acquiredAt: Date.parse('2026-09-29T12:00:00Z') }
        ]);
        expect(external).toHaveBeenCalledTimes(1);
        expect(external.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    });

    it('GET /steam/inventory distinguishes a confirmed empty inventory from failed/missing evidence', async () => {
        const { headers } = liveInventory({ response: { success: true, item_json: '[]' } });
        const response = await fetch(`${baseUrl}/steam/inventory`, { headers });
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ ok: true, inventory: [] });
    });

    it.each([
        {},
        { response: { success: false, error: 'private publisher detail', item_json: '[]' } },
        { response: { success: true } },
        { response: { item_list: [] } },
        { response: { item_json: 'not JSON' } },
        { response: { item_json: '{}' } },
        { response: { item_json: '[{"itemid":"1","itemdefid":4001,"quantity":-1}]' } },
        { response: { item_json: '[{"itemid":18446744073709551615,"itemdefid":4001,"quantity":1}]' } },
        { response: { item_json: '[{"itemid":"1","itemdefid":4001,"quantity":1},{"itemid":"1","itemdefid":4001,"quantity":1}]' } }
    ])('fails closed instead of erasing ownership for an invalid Steam response: %j', async (payload) => {
        const { headers } = liveInventory(payload);
        const response = await fetch(`${baseUrl}/steam/inventory`, { headers });
        expect(response.status).toBe(502);
        const body = await response.json();
        expect(body.ok).toBe(false);
        expect(body.inventory).toBeUndefined();
        expect(JSON.stringify(body)).not.toContain('private');
    });

    it('does not expose publisher keys from inventory transport exceptions', async () => {
        const { headers } = liveInventory(null, { throws: true });
        const response = await fetch(`${baseUrl}/steam/inventory`, { headers });
        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({ ok: false, reason: 'steam_request_failed' });
    });

    it('routes live crafting through exact quantities and persists its private request journal', async () => {
        const { headers } = liveInventory({});
        const external = vi.fn(async (url, options) => {
            const items = String(url).includes('/GetInventory/')
                ? [{ itemid: '1', itemdefid: 1000, quantity: 10 }]
                : [{ itemid: '1', itemdefid: 1000, quantity: 5 }, { itemid: '2', itemdefid: 2100, quantity: 1 }];
            if (String(url).includes('/ExchangeItem/')) expect(options.body.get('materialsquantity[0]')).toBe('5');
            return new Response(JSON.stringify({ response: { item_json: JSON.stringify(items) } }));
        });
        globalThis.fetch = vi.fn((url, options) => String(url).startsWith(baseUrl)
            ? ORIGINAL_FETCH(url, options) : external(url, options));
        const requestId = `live-craft-${Date.now()}`;
        const post = () => fetch(`${baseUrl}/steam/inventory/exchange`, {
            method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
            body: JSON.stringify({ requestId, recipeId: 2100, materials: ['1'] })
        });
        const first = await post();
        expect(first.status).toBe(200);
        const body = await first.json();
        expect(body.granted).toHaveLength(1);
        expect(body.granted[0]).toMatchObject({ itemId: '2', itemdefid: 2100 });
        expect(body.exchangeJournal).toBeUndefined();
        const saved = checkIdempotency(recipeExchangeJournalKey({ appId: 4957040, steamId: '76561198000000000', requestId }));
        expect(saved.body.exchangeJournal).toMatchObject({ state: 'completed', plan: { consumed: [{ quantity: 5 }] } });
        expect(await (await post()).json()).toEqual(body);
        expect(external).toHaveBeenCalledTimes(2);
    });

    it('persists an uncertain live craft hold that a new request ID cannot bypass', async () => {
        const { headers } = liveInventory({});
        const external = vi.fn(async (url) => {
            if (String(url).includes('/GetInventory/')) return new Response(JSON.stringify({ response: { item_json: '[{"itemid":"1","itemdefid":1000,"quantity":20}]' } }));
            throw new Error('response lost after Steam may have exchanged');
        });
        globalThis.fetch = vi.fn((url, options) => String(url).startsWith(baseUrl)
            ? ORIGINAL_FETCH(url, options) : external(url, options));
        for (const requestId of ['uncertain-craft', 'uncertain-craft', 'another-click']) {
            const response = await fetch(`${baseUrl}/steam/inventory/exchange`, {
                method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
                body: JSON.stringify({ requestId, recipeId: 2100, materials: ['1'] })
            });
            expect(response.status).toBe(409);
            expect(await response.json()).toEqual({ ok: false, reason: 'exchange_outcome_requires_review' });
        }
        expect(external).toHaveBeenCalledTimes(2);
        expect(checkIdempotency('recipe-exchange-active.4957040.76561198000000000').body.exchangeJournal.state).toBe('submitted_unknown');
    });

    it('GET /steam/inventory returns mock items in dev mode', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_WEB_API_KEY;

        const testId = '76561198000000000';
        await setMockInventory(testId, [
            { itemId: 'test-item-1', itemdefid: 1000, quantity: 3, acquiredAt: Date.now() }
        ]);

        const response = await fetch(`${baseUrl}/steam/inventory?ticketHex=00112233445566778899aabbccddeeff`);
        expect(response.status).toBe(200);
        
        const body = await response.json();
        expect(body).toMatchObject({
            ok: true,
            inventory: [
                { itemId: 'test-item-1', itemdefid: 1000, quantity: 3 }
            ]
        });
    });

    it('GET /steam/inventory accepts bearer sessions without a fresh ticket', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_WEB_API_KEY;
        process.env.HB_SESSION_SECRET = 'session-secret';

        const testId = '76561198000000000';
        await setMockInventory(testId, [
            { itemId: 'bearer-item-1', itemdefid: 1100, quantity: 1, acquiredAt: Date.now() }
        ]);
        const session = createSteamSessionToken({
            steamId64: testId,
            isDevMode: true
        });

        const response = await fetch(`${baseUrl}/steam/inventory`, {
            headers: { authorization: `Bearer ${session.token}` }
        });
        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body).toMatchObject({
            ok: true,
            inventory: [
                { itemId: 'bearer-item-1', itemdefid: 1100, quantity: 1 }
            ]
        });
    });

    it('POST /steam/inventory/trigger-drop rewards items and respects idempotency', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        process.env.HB_STEAM_DROP_COOLDOWN_SECONDS = '0';
        const testId = '76561198000000000';
        await setMockInventory(testId, []);

        const reqId = `drop-test-${Math.random()}`;

        // 1. Initial drop request
        const res1 = await fetch(`${baseUrl}/steam/inventory/trigger-drop`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                ticketHex: '00112233445566778899aabbccddeeff',
                requestId: reqId
            })
        });
        expect(res1.status).toBe(200);
        const body1 = await res1.json();
        expect(body1.ok).toBe(true);
        expect(body1.granted).toHaveLength(1);

        const grantedItemId = body1.granted[0].itemId;

        // 2. Retry with same requestId should be cached / identical
        const res2 = await fetch(`${baseUrl}/steam/inventory/trigger-drop`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                ticketHex: '00112233445566778899aabbccddeeff',
                requestId: reqId
            })
        });
        expect(res2.status).toBe(200);
        const body2 = await res2.json();
        expect(body2).toMatchObject(body1);
        expect(body2.granted[0].itemId).toBe(grantedItemId);
    });

    it('POST /steam/inventory/trigger-drop enforces a server-side drop cooldown across unique request ids', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        process.env.HB_STEAM_DROP_COOLDOWN_SECONDS = '3600';
        const testId = '76561198000000000';
        await setMockInventory(testId, []);

        const first = await fetch(`${baseUrl}/steam/inventory/trigger-drop`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                ticketHex: '00112233445566778899aabbccddeeff',
                requestId: `drop-cooldown-a-${Math.random()}`
            })
        });
        expect(first.status).toBe(200);
        expect((await first.json()).granted).toHaveLength(1);

        const second = await fetch(`${baseUrl}/steam/inventory/trigger-drop`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                ticketHex: '00112233445566778899aabbccddeeff',
                requestId: `drop-cooldown-b-${Math.random()}`
            })
        });
        expect(second.status).toBe(200);
        const secondBody = await second.json();
        expect(secondBody).toMatchObject({
            ok: true,
            granted: [],
            reason: 'drop_cooldown',
            retryAfterSeconds: expect.any(Number)
        });
        expect(getMockInventory(testId)).toHaveLength(1);
    });

    it('POST /steam/inventory/trigger-drop decodes live item_json response and handles errors', async () => {
        process.env.HB_STEAM_PUBLISHER_KEY = 'publisher-key';
        process.env.HB_SESSION_SECRET = 'inventory-test-secret';
        process.env.HB_STEAM_DROP_COOLDOWN_SECONDS = '0';
        const session = createSteamSessionToken({ steamId64: '76561198000000000', isDevMode: false });

        const origFetch = globalThis.fetch;
        let mockResponse = {
            response: {
                success: true,
                item_json: JSON.stringify([
                    { itemid: '12345678901234567', itemdefid: 1000, quantity: 1, state: 'complete' }
                ])
            }
        };
        let fetchStatus = 200;
        globalThis.fetch = vi.fn(async (url, options) => {
            if (String(url).startsWith(baseUrl)) return origFetch(url, options);
            if (String(url).includes('TriggerItemDrop')) {
                return new Response(JSON.stringify(mockResponse), {
                    status: fetchStatus,
                    headers: { 'content-type': 'application/json' }
                });
            }
            return origFetch(url, options);
        });

        // 1. Success with item_json
        const res = await fetch(`${baseUrl}/steam/inventory/trigger-drop`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${session.token}`
            },
            body: JSON.stringify({ requestId: `live-drop-${Math.random()}` })
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.granted).toHaveLength(1);
        expect(body.granted[0]).toMatchObject({ itemId: '12345678901234567', itemdefid: 1000, quantity: 1 });

        // 2. Steam rejects drop
        mockResponse = { response: { success: false } };
        const resReject = await fetch(`${baseUrl}/steam/inventory/trigger-drop`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${session.token}`
            },
            body: JSON.stringify({ requestId: `live-drop-reject-${Math.random()}` })
        });
        expect(resReject.status).toBe(502);
        expect((await resReject.json()).reason).toBe('steam_inventory_rejected');

        // 3. Malformed item_json
        mockResponse = { response: { success: true, item_json: 'not valid json' } };
        const resBad = await fetch(`${baseUrl}/steam/inventory/trigger-drop`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${session.token}`
            },
            body: JSON.stringify({ requestId: `live-drop-bad-${Math.random()}` })
        });
        expect(resBad.status).toBe(502);
        expect((await resBad.json()).reason).toBe('steam_inventory_invalid_response');
    });

    it('POST /steam/inventory/grant-promo awards class victory patches', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const testId = '76561198000000000';
        await setMockInventory(testId, []);

        const res = await fetch(`${baseUrl}/steam/inventory/grant-promo`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                ticketHex: '00112233445566778899aabbccddeeff',
                requestId: `promo-test-${Math.random()}`,
                classType: 'TANK',
                outcome: 'victory'
            })
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.granted[0].itemdefid).toBe(2001); // Tank victory patch
    });

    it('POST /steam/inventory/exchange handles recipe materials consumption', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const testId = '76561198000000000';
        
        // Seed 5x common fragments
        await setMockInventory(testId, [
            { itemId: 'mat-1', itemdefid: 1000, quantity: 1, acquiredAt: Date.now() },
            { itemId: 'mat-2', itemdefid: 1000, quantity: 1, acquiredAt: Date.now() },
            { itemId: 'mat-3', itemdefid: 1000, quantity: 1, acquiredAt: Date.now() },
            { itemId: 'mat-4', itemdefid: 1000, quantity: 1, acquiredAt: Date.now() },
            { itemId: 'mat-5', itemdefid: 1000, quantity: 1, acquiredAt: Date.now() }
        ]);

        const res = await fetch(`${baseUrl}/steam/inventory/exchange`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                ticketHex: '00112233445566778899aabbccddeeff',
                requestId: `craft-test-${Math.random()}`,
                recipeId: 2100, // Carbon Fiber Decal
                materials: ['mat-1', 'mat-2', 'mat-3', 'mat-4', 'mat-5']
            })
        });
        expect(res.status).toBe(200);
        
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.granted[0].itemdefid).toBe(2100);

        // Verify items were consumed from database
        const finalInv = getMockInventory(testId);
        const hasDecal = finalInv.some(i => i.itemdefid === 2100);
        const commonFragmentsCount = finalInv.filter(i => i.itemdefid === 1000).length;
        
        expect(hasDecal).toBe(true);
        expect(commonFragmentsCount).toBe(0);
    });

    it('POST /steam/inventory/exchange consumes the recipe quantity from a single stack, not just 1 unit (QA regression)', async () => {
        // Real play accumulates drops into one stacked entry (mode: 'stack'
        // in grantItemToPlayer), unlike the fixture above's five separate
        // quantity-1 instances. Referencing that one stack once used to only
        // decrement it by 1 regardless of the recipe's actual requirement —
        // a stack of 10 dropped to 9 after "spending" 5 on Carbon Fiber
        // Decal (QA manual pass, 2026-07-25).
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const testId = '76561198000000000';

        await setMockInventory(testId, [
            { itemId: 'stacked-common', itemdefid: 1000, quantity: 10, acquiredAt: Date.now() }
        ]);

        const res = await fetch(`${baseUrl}/steam/inventory/exchange`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                ticketHex: '00112233445566778899aabbccddeeff',
                requestId: `craft-stack-test-${Math.random()}`,
                recipeId: 2100, // Carbon Fiber Decal, requires 5x Common Relic Fragment
                materials: ['stacked-common']
            })
        });
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.granted[0].itemdefid).toBe(2100);

        const finalInv = getMockInventory(testId);
        const remainingCommon = finalInv.find((i) => i.itemId === 'stacked-common');
        expect(remainingCommon?.quantity).toBe(5);
    });

    it('POST /steam/inventory/exchange consuming 10x Common + 2x Rare from single stacks leaves the correct remainders', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const testId = '76561198000000000';

        await setMockInventory(testId, [
            { itemId: 'common-stack', itemdefid: 1000, quantity: 12, acquiredAt: Date.now() },
            { itemId: 'rare-stack', itemdefid: 1100, quantity: 3, acquiredAt: Date.now() }
        ]);

        const res = await fetch(`${baseUrl}/steam/inventory/exchange`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                ticketHex: '00112233445566778899aabbccddeeff',
                requestId: `craft-chrome-test-${Math.random()}`,
                recipeId: 2200, // Chrome weapon finish, requires 10x Common, 2x Rare
                materials: ['common-stack', 'rare-stack']
            })
        });
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.granted[0].itemdefid).toBe(2200);

        const finalInv = getMockInventory(testId);
        expect(finalInv.find((i) => i.itemId === 'common-stack')?.quantity).toBe(2);
        expect(finalInv.find((i) => i.itemId === 'rare-stack')?.quantity).toBe(1);
    });

    it('POST /steam/inventory/exchange opens a Deep Relic Cache with a Cache Key into a disclosed-table reward', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const testId = '76561198000000000';

        await setMockInventory(testId, [
            { itemId: 'cache-1', itemdefid: 4000, quantity: 1, acquiredAt: Date.now() },
            { itemId: 'key-1', itemdefid: 4001, quantity: 1, acquiredAt: Date.now() }
        ]);

        const res = await fetch(`${baseUrl}/steam/inventory/exchange`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                ticketHex: '00112233445566778899aabbccddeeff',
                requestId: `cache-open-test-${Math.random()}`,
                recipeId: 4100,
                materials: ['cache-1', 'key-1']
            })
        });
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.ok).toBe(true);
        expect([1000, 1100, 2100, 2200]).toContain(body.granted[0].itemdefid);

        const finalInv = getMockInventory(testId);
        expect(finalInv.some((i) => i.itemdefid === 4000)).toBe(false);
        expect(finalInv.some((i) => i.itemdefid === 4001)).toBe(false);
    });

    it('POST /steam/inventory/exchange rejects opening a cache without a key', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const testId = '76561198000000000';

        await setMockInventory(testId, [
            { itemId: 'cache-only', itemdefid: 4000, quantity: 1, acquiredAt: Date.now() }
        ]);

        const res = await fetch(`${baseUrl}/steam/inventory/exchange`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                ticketHex: '00112233445566778899aabbccddeeff',
                requestId: `cache-open-nokey-${Math.random()}`,
                recipeId: 4100,
                materials: ['cache-only']
            })
        });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.reason).toBe('cache_open_requires_one_cache_and_one_key');
    });
});

describe('POST /steam/inventory/grant-milestone (Tier B)', () => {
    it('grants a Relic Key for a boss_kill milestone', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const testId = '76561198000000000';
        await setMockInventory(testId, []);

        const res = await fetch(`${baseUrl}/steam/inventory/grant-milestone`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                ticketHex: '00112233445566778899aabbccddeeff',
                milestone: 'boss_kill',
                runKey: `run-${Math.random()}`
            })
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.granted[0].itemdefid).toBe(4001);
    });

    it('is idempotent per run for boss_kill (same runKey never double-grants)', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const testId = '76561198000000000';
        await setMockInventory(testId, []);
        const runKey = `run-idem-${Math.random()}`;

        for (let i = 0; i < 2; i++) {
            await fetch(`${baseUrl}/steam/inventory/grant-milestone`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ ticketHex: '00112233445566778899aabbccddeeff', milestone: 'boss_kill', runKey })
            });
        }

        const inv = getMockInventory(testId);
        expect(inv.find((i) => i.itemdefid === 4001)?.quantity).toBe(1);
    });

    it('rejects boss_kill without a runKey', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const res = await fetch(`${baseUrl}/steam/inventory/grant-milestone`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ticketHex: '00112233445566778899aabbccddeeff', milestone: 'boss_kill' })
        });
        expect(res.status).toBe(400);
        expect((await res.json()).reason).toBe('missing_run_key');
    });

    it('grants the Queen Slayer emblem exactly once ever for the achievement:slay_the_queen milestone', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const testId = '76561198000000000';
        await setMockInventory(testId, []);

        const first = await fetch(`${baseUrl}/steam/inventory/grant-milestone`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ticketHex: '00112233445566778899aabbccddeeff', milestone: 'achievement:slay_the_queen' })
        });
        expect((await first.json()).granted[0].itemdefid).toBe(2003);

        // A second unlock event (e.g. a save reload racing the achievement
        // engine) must not grant a duplicate emblem.
        await fetch(`${baseUrl}/steam/inventory/grant-milestone`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ticketHex: '00112233445566778899aabbccddeeff', milestone: 'achievement:slay_the_queen' })
        });

        const inv = getMockInventory(testId);
        expect(inv.filter((i) => i.itemdefid === 2003)).toHaveLength(1);
    });

    it('grants the Archivist emblem for the achievement:archivist milestone', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const testId = '76561198000000000';
        await setMockInventory(testId, []);

        const res = await fetch(`${baseUrl}/steam/inventory/grant-milestone`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ticketHex: '00112233445566778899aabbccddeeff', milestone: 'achievement:archivist' })
        });
        expect((await res.json()).granted[0].itemdefid).toBe(2004);
    });

    it('rejects an unknown milestone type without granting anything', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const res = await fetch(`${baseUrl}/steam/inventory/grant-milestone`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ticketHex: '00112233445566778899aabbccddeeff', milestone: 'not_a_real_milestone' })
        });
        expect(res.status).toBe(400);
        expect((await res.json()).reason).toBe('invalid_milestone');
    });

    it('normalizes live Steam market eligibility into a top-level allowed flag', async () => {
        process.env.HB_SESSION_SECRET = 'market-eligibility-test-secret';
        process.env.HB_STEAM_PUBLISHER_KEY = 'publisher-key';
        const session = createSteamSessionToken({
            steamId64: '76561198000000000',
            isDevMode: false
        });
        globalThis.fetch = vi.fn(async (url, options) => {
            if (String(url).startsWith(baseUrl)) {
                return ORIGINAL_FETCH(url, options);
            }
            return new Response(JSON.stringify({
                response: {
                    allowed: 1,
                    reason: 'none'
                }
            }), {
                status: 200,
                headers: { 'content-type': 'application/json' }
            });
        });

        const response = await fetch(`${baseUrl}/steam/market/eligibility`, {
            headers: { authorization: `Bearer ${session.token}` }
        });

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({
            ok: true,
            allowed: true,
            eligibility: {
                allowed: 1,
                reason: 'none'
            }
        });
    });
});
