import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { afterEach, beforeAll, afterAll, describe, expect, it } from 'vitest';
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
    for (const key of Object.keys(process.env)) {
        delete process.env[key];
    }
    Object.assign(process.env, ORIGINAL_ENV);
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
