import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { afterEach, beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { grantItemToPlayer } from './steamGrant.js';
import { initDb, getMockInventory, setMockInventory } from './db.js';

const TEST_DB_PATH = path.join(os.tmpdir(), `hb-steam-grant-test-${process.pid}-${Date.now()}.json`);
process.env.HB_DB_STORAGE_PATH = TEST_DB_PATH;
const ORIGINAL_ENV = { ...process.env };

beforeAll(async () => {
    await initDb();
});

afterAll(() => {
    for (const p of [TEST_DB_PATH, `${TEST_DB_PATH}.tmp`]) {
        try { fs.unlinkSync(p); } catch { /* already gone */ }
    }
});

afterEach(() => {
    vi.unstubAllGlobals();
    for (const key of Object.keys(process.env)) {
        delete process.env[key];
    }
    Object.assign(process.env, ORIGINAL_ENV);
});

describe('grantItemToPlayer (Steam contract)', () => {
    const input = { steamId: '76561198000000000', itemdefid: 4001, quantity: 5, isDevMode: false, requestId: '18446744073709551615' };
    const item = { itemid: '17209346500926339', itemdefid: '4001', quantity: '5' };
    function reply(response) {
        const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ response })));
        vi.stubGlobal('fetch', fetch);
        return fetch;
    }

    it('sends one itemdef per requested instance and decodes the documented item_json', async () => {
        const fetch = reply({ success: true, item_json: JSON.stringify([item]) });
        const result = await grantItemToPlayer({ ...input, tradeRestriction: true });
        expect(result).toMatchObject({ ok: true, replayed: false, granted: [{ itemId: item.itemid, itemdefid: 4001, quantity: 5 }] });
        const options = fetch.mock.calls[0][1];
        expect([...options.body].filter(([key]) => key.startsWith('itemdefid['))).toEqual(
            Array.from({ length: 5 }, (_, index) => [`itemdefid[${index}]`, '4001'])
        );
        expect(options.body.has('quantity[0]')).toBe(false);
        expect(options.body.get('requestid')).toBe(input.requestId);
        expect(options.body.get('trade_restriction')).toBe('1');
        expect(options.signal).toBeInstanceOf(AbortSignal);
    });

    it('accepts the documented example with item_json and no success flag', async () => {
        reply({ item_json: JSON.stringify([item]) });
        expect((await grantItemToPlayer(input)).ok).toBe(true);
    });

    it.each([
        {},
        { success: false, item_json: JSON.stringify([item]), error: 'private publisher detail' },
        { success: 'false', item_json: JSON.stringify([item]) },
        { success: true, item_json: 'invalid JSON' },
        { success: true, item_json: '{}' },
        { success: true, item_json: '[]' },
        { success: true, item_json: JSON.stringify([{ ...item, itemid: undefined }]) },
        { success: true, item_json: JSON.stringify([{ ...item, quantity: -1 }]) },
        { success: true, item_json: JSON.stringify([{ ...item, quantity: 0 }]) },
        { success: true, item_json: JSON.stringify([{ ...item, itemdefid: 'bad' }]) }
    ])('never mistakes invalid or rejected evidence for delivery: %j', async (response) => {
        reply(response);
        const result = await grantItemToPlayer(input);
        expect(result.ok).toBe(false);
        expect(result.granted).toBeUndefined();
        expect(JSON.stringify(result)).not.toContain('private publisher detail');
    });

    it('preserves replay evidence even when original items have since been consumed', async () => {
        reply({ success: true, replayed: true, item_json: JSON.stringify([{ ...item, quantity: 0, state: 'removed' }]) });
        expect(await grantItemToPlayer(input)).toMatchObject({
            ok: true, replayed: true, granted: [{ quantity: 0, state: 'removed' }]
        });
        reply({ success: true, replayed: true, item_json: '[]' });
        expect(await grantItemToPlayer(input)).toMatchObject({ ok: true, replayed: true, granted: [] });
    });

    it.each([0, -1, 1.5, Infinity, 1001])('rejects invalid or unbounded quantity %s before calling Steam', async (quantity) => {
        const fetch = reply({});
        expect(await grantItemToPlayer({ ...input, quantity })).toMatchObject({ ok: false, reason: 'invalid_grant_quantity' });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('does not expose request exception strings or publisher keys', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('https://steam.example?key=private-publisher-key')));
        expect(await grantItemToPlayer(input)).toEqual({ ok: false, reason: 'steam_request_failed' });
    });
});

describe('grantItemToPlayer (dev mode)', () => {
    it('mode "stack" merges into an existing stack of the same itemdefid', async () => {
        const steamId = 'grant-test-stack';
        await setMockInventory(steamId, [
            { itemId: 'existing-1', itemdefid: 1000, quantity: 3, acquiredAt: Date.now() }
        ]);

        const result = await grantItemToPlayer({ steamId, itemdefid: 1000, quantity: 2, isDevMode: true, mode: 'stack' });
        expect(result.ok).toBe(true);
        expect(result.granted[0].quantity).toBe(5);

        const inv = getMockInventory(steamId);
        expect(inv.find((i) => i.itemdefid === 1000)?.quantity).toBe(5);
        expect(inv).toHaveLength(1);
    });

    it('mode "stack" creates a new entry when none exists', async () => {
        const steamId = 'grant-test-stack-new';
        await setMockInventory(steamId, []);

        const result = await grantItemToPlayer({ steamId, itemdefid: 1100, quantity: 1, isDevMode: true, mode: 'stack' });
        expect(result.ok).toBe(true);
        expect(result.granted[0].itemdefid).toBe(1100);

        const inv = getMockInventory(steamId);
        expect(inv).toHaveLength(1);
    });

    it('mode "once" no-ops with already_granted if the player already owns the item', async () => {
        const steamId = 'grant-test-once';
        await setMockInventory(steamId, [
            { itemId: 'patch-1', itemdefid: 2001, quantity: 1, acquiredAt: Date.now() }
        ]);

        const result = await grantItemToPlayer({ steamId, itemdefid: 2001, isDevMode: true, mode: 'once' });
        expect(result).toMatchObject({ ok: true, granted: [], info: 'already_granted' });

        const inv = getMockInventory(steamId);
        expect(inv).toHaveLength(1);
    });

    it('mode "once" grants a new single instance when not already owned', async () => {
        const steamId = 'grant-test-once-new';
        await setMockInventory(steamId, []);

        const result = await grantItemToPlayer({ steamId, itemdefid: 2002, isDevMode: true, mode: 'once' });
        expect(result.ok).toBe(true);
        expect(result.granted[0].itemdefid).toBe(2002);

        const inv = getMockInventory(steamId);
        expect(inv).toHaveLength(1);
    });

    it('mode "unique" always creates a brand-new instance, never merging', async () => {
        const steamId = 'grant-test-unique';
        await setMockInventory(steamId, [
            { itemId: 'decal-1', itemdefid: 2100, quantity: 1, acquiredAt: Date.now() }
        ]);

        const result = await grantItemToPlayer({ steamId, itemdefid: 2100, isDevMode: true, mode: 'unique' });
        expect(result.ok).toBe(true);

        const inv = getMockInventory(steamId);
        expect(inv.filter((i) => i.itemdefid === 2100)).toHaveLength(2);
    });
});
