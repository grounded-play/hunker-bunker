import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { attachSteamInventoryRoutes } from './steamInventory.js';
import { initDb, setMockInventory, getMockInventory } from './db.js';
import { createSteamSessionToken } from './steamAuth.js';
import { planRedeem, planTradeUp, SHARD_ITEMDEFID, tradeUpRarity } from './steamTradeUp.js';

const TEST_DB_PATH = path.join(os.tmpdir(), `hb-trade-up-test-${process.pid}-${Date.now()}.json`);
process.env.HB_DB_STORAGE_PATH = TEST_DB_PATH;
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;
const DEV_ID = '76561198000000000';
const TICKET = 'ticketHex=00112233445566778899aabbccddeeff';

let server;
let baseUrl;
let requestSeq = 0;

beforeAll(async () => {
    await initDb();
    const app = express();
    app.use(express.json());
    attachSteamInventoryRoutes(app);
    server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => {
    server.close();
    for (const p of [TEST_DB_PATH, `${TEST_DB_PATH}.tmp`]) { try { fs.unlinkSync(p); } catch { /* gone */ } }
});

afterEach(() => {
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, ORIGINAL_ENV);
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
});

function devMode() {
    delete process.env.HB_STEAM_PUBLISHER_KEY;
    delete process.env.STEAM_PUBLISHER_KEY;
    delete process.env.STEAM_WEB_API_KEY;
}

const post = (route, body, headers = {}) => fetch(`${baseUrl}${route}?${TICKET}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
});
const nextId = () => `req-${++requestSeq}`;
const count = (inv, pred) => inv.filter(pred).reduce((sum, item) => sum + item.quantity, 0);

describe('trade-up planning', () => {
    it('consumes five of the tier, oldest first, and outputs the next tier of the collection', () => {
        const inventory = [
            { itemId: 'new', itemdefid: 4103, quantity: 1, acquiredAt: 50 },
            { itemId: 'old', itemdefid: 4104, quantity: 5, acquiredAt: 10 }
        ];
        const plan = planTradeUp({ inventory, rarity: 'rare', random: () => 0 });
        expect(plan.ok).toBe(true);
        expect(plan.consumed).toEqual([{ itemId: 'old', itemdefid: 4104, quantity: 5 }]);
        expect(tradeUpRarity(plan.outputItemdefid)).toBe('epic');
    });

    it('never counts or burns items outside the collection (keys, shards, promo emblems, season sets)', () => {
        const inventory = [4154, SHARD_ITEMDEFID, 4157, 2003, 4201].map((itemdefid, i) => ({ itemId: `x${i}`, itemdefid, quantity: 5 }));
        expect(planTradeUp({ inventory, rarity: 'rare' })).toEqual({ ok: false, reason: 'insufficient_items' });
        expect(planTradeUp({ inventory, rarity: 'uncommon' }).ok).toBe(false);
    });

    it('refuses the top tier and unknown tiers', () => {
        expect(planTradeUp({ inventory: [], rarity: 'legendary' }).reason).toBe('invalid_tier');
        expect(planTradeUp({ inventory: [], rarity: 'nope' }).reason).toBe('invalid_tier');
    });

    it('redeems collection items for their rarity’s shard cost, and nothing else', () => {
        const inventory = [{ itemId: 's', itemdefid: SHARD_ITEMDEFID, quantity: 70 }];
        expect(planRedeem({ inventory, itemdefid: 4103 })).toMatchObject({ ok: true, cost: 60, outputItemdefid: 4103 });
        expect(planRedeem({ inventory, itemdefid: 4107 }).reason).toBe('insufficient_shards');
        expect(planRedeem({ inventory, itemdefid: 2003 }).reason).toBe('not_dispensable');
    });
});

describe('POST /steam/inventory/trade-up (dev mode)', () => {
    it('spends five, grants one, and a retry with the same requestId changes nothing', async () => {
        devMode();
        await setMockInventory(DEV_ID, [
            { itemId: 'a', itemdefid: 4103, quantity: 3, acquiredAt: 1 },
            { itemId: 'b', itemdefid: 4104, quantity: 3, acquiredAt: 2 }
        ]);
        const requestId = nextId();
        const first = await post('/steam/inventory/trade-up', { requestId, rarity: 'rare' });
        expect(first.status).toBe(200);
        const body = await first.json();
        expect(body.ok).toBe(true);
        expect(tradeUpRarity(body.granted[0].itemdefid)).toBe('epic');

        const after = getMockInventory(DEV_ID);
        expect(count(after, (i) => tradeUpRarity(i.itemdefid) === 'rare')).toBe(1);
        expect(count(after, (i) => tradeUpRarity(i.itemdefid) === 'epic')).toBe(1);

        const replay = await post('/steam/inventory/trade-up', { requestId, rarity: 'rare' });
        expect(await replay.json()).toEqual(body);
        expect(getMockInventory(DEV_ID)).toEqual(after);
    });

    it('refuses without enough items and leaves the inventory alone', async () => {
        devMode();
        const inventory = [{ itemId: 'a', itemdefid: 4103, quantity: 4, acquiredAt: 1 }];
        await setMockInventory(DEV_ID, inventory);
        const response = await post('/steam/inventory/trade-up', { requestId: nextId(), rarity: 'rare' });
        expect(response.status).toBe(400);
        expect((await response.json()).reason).toBe('insufficient_items');
        expect(getMockInventory(DEV_ID)).toMatchObject(inventory);
        expect(getMockInventory(DEV_ID)).toHaveLength(1);
    });

    it('requires a requestId', async () => {
        devMode();
        const response = await post('/steam/inventory/trade-up', { rarity: 'rare' });
        expect(response.status).toBe(400);
    });

    it('redeems shards for a collection item', async () => {
        devMode();
        await setMockInventory(DEV_ID, [{ itemId: 's', itemdefid: SHARD_ITEMDEFID, quantity: 30 }]);
        const response = await post('/steam/inventory/redeem', { requestId: nextId(), itemdefid: 4100 });
        expect(response.status).toBe(200);
        const after = getMockInventory(DEV_ID);
        expect(count(after, (i) => i.itemdefid === SHARD_ITEMDEFID)).toBe(5);
        expect(count(after, (i) => i.itemdefid === 4100)).toBe(1);
    });

    it('advertises the exchanges on GET /steam/inventory', async () => {
        devMode();
        const response = await fetch(`${baseUrl}/steam/inventory?${TICKET}`);
        expect((await response.json()).capabilities).toEqual(['trade-up', 'redeem']);
    });
});

describe('POST /steam/inventory/trade-up (live Steam, faked)', () => {
    function liveSession() {
        process.env.HB_SESSION_SECRET = 'trade-up-test-secret';
        process.env.HB_STEAM_PUBLISHER_KEY = 'publisher-key';
        return createSteamSessionToken({ steamId64: DEV_ID, isDevMode: false });
    }

    // A fake IInventoryService: GetInventory returns `items`; ConsumeItem and
    // AddItem succeed unless told to fail on the nth call.
    function fakeSteam({ items, failConsumeAt = null, failAdd = false }) {
        const calls = [];
        let consumes = 0;
        globalThis.fetch = vi.fn(async (url, options) => {
            if (String(url).startsWith(baseUrl)) return ORIGINAL_FETCH(url, options);
            const method = String(url).match(/IInventoryService\/(\w+)\//)?.[1];
            const params = Object.fromEntries(new URLSearchParams(options?.body ?? String(url).split('?')[1] ?? ''));
            calls.push({ method, params });
            const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
            if (method === 'GetInventory') {
                return json({ response: { item_list: items.map((i) => ({ itemid: i.itemId, itemdefid: i.itemdefid, quantity: i.quantity, acquired: '2026-09-01T00:00:00Z' })) } });
            }
            if (method === 'ConsumeItem') {
                consumes += 1;
                return consumes === failConsumeAt ? json({}, 500) : json({ response: {} });
            }
            if (method === 'AddItem') {
                const refund = String(params.requestid ?? '').includes(':refund:');
                if (failAdd && !refund) return json({}, 500);
                return json({ response: { item_list: [{ itemid: `new-${calls.length}`, itemdefid: params['itemdefid[0]'], quantity: params['quantity[0]'] }] } });
            }
            return json({}, 404);
        });
        return calls;
    }

    const liveItems = [
        { itemId: 'r1', itemdefid: 4103, quantity: 1 },
        { itemId: 'r2', itemdefid: 4104, quantity: 1 },
        { itemId: 'r3', itemdefid: 4105, quantity: 1 },
        { itemId: 'r4', itemdefid: 4106, quantity: 1 },
        { itemId: 'r5', itemdefid: 4103, quantity: 1 }
    ];

    it('consumes each input with the publisher key, then grants the output', async () => {
        const session = liveSession();
        const calls = fakeSteam({ items: liveItems });
        const response = await post('/steam/inventory/trade-up', { requestId: nextId(), rarity: 'rare' }, { authorization: `Bearer ${session.token}` });
        expect(response.status).toBe(200);
        const consumes = calls.filter((c) => c.method === 'ConsumeItem');
        expect(consumes.map((c) => c.params.itemid).sort()).toEqual(['r1', 'r2', 'r3', 'r4', 'r5']);
        expect(consumes.every((c) => c.params.key === 'publisher-key' && c.params.requestid)).toBe(true);
        const adds = calls.filter((c) => c.method === 'AddItem');
        expect(adds).toHaveLength(1);
        expect(tradeUpRarity(adds[0].params['itemdefid[0]'])).toBe('epic');
    });

    it('refunds what it already took when a consume fails, and grants nothing', async () => {
        const session = liveSession();
        const calls = fakeSteam({ items: liveItems, failConsumeAt: 3 });
        const response = await post('/steam/inventory/trade-up', { requestId: nextId(), rarity: 'rare' }, { authorization: `Bearer ${session.token}` });
        expect(response.status).toBe(502);
        const body = await response.json();
        expect(body.reason).toBe('consume_failed');
        expect(body.refunded).toHaveLength(2);
        expect(body.refunded.every((r) => r.ok)).toBe(true);
        const adds = calls.filter((c) => c.method === 'AddItem');
        expect(adds.every((c) => c.params.requestid.includes(':refund:'))).toBe(true);
        expect(adds).toHaveLength(2);
    });

    it('refunds all five when the grant fails', async () => {
        const session = liveSession();
        const calls = fakeSteam({ items: liveItems, failAdd: true });
        const response = await post('/steam/inventory/trade-up', { requestId: nextId(), rarity: 'rare' }, { authorization: `Bearer ${session.token}` });
        expect(response.status).toBe(502);
        const body = await response.json();
        expect(body.reason).toBe('grant_failed');
        expect(body.refunded.map((r) => r.itemdefid).sort()).toEqual([4103, 4103, 4104, 4105, 4106]);
        expect(calls.filter((c) => c.method === 'AddItem' && c.params.requestid.includes(':refund:'))).toHaveLength(5);
    });
});
