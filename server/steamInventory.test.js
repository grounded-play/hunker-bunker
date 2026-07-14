import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { afterEach, beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { attachSteamInventoryRoutes } from './steamInventory.js';
import { initDb, setMockInventory, getMockInventory } from './db.js';

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

    it('POST /steam/inventory/trigger-drop rewards items and respects idempotency', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
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
    it('grants a Deep Relic Cache for a boss_kill milestone', async () => {
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
        expect(body.granted[0].itemdefid).toBe(4000);
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
        expect(inv.find((i) => i.itemdefid === 4000)?.quantity).toBe(1);
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
});
