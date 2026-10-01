import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSqliteBackend } from './db-sqlite.js';
import { createPurchaseGrantIntent } from './purchaseGrantIntent.js';

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

async function open(kind) {
    directory ??= fs.mkdtempSync(path.join(os.tmpdir(), 'hb-paid-grant-db-'));
    if (kind === 'sqlite') {
        backend = createSqliteBackend({ DatabaseSync, dbFilePath: path.join(directory, 'ledger.sqlite') });
    } else {
        vi.stubEnv('HB_DB_BACKEND', 'json');
        vi.stubEnv('HB_DB_STORAGE_PATH', path.join(directory, 'ledger.json'));
        vi.resetModules();
        backend = await import('./db.js');
    }
    await backend.initDb();
    return backend;
}

const purchase = { transId: '123', orderId: '456', steamId64: '76561198000000000', sku: 'key_5', status: 'finalized_pending_grant' };
const settings = { appId: 4957040, sandbox: false, itemdefid: 4001, quantity: 5 };
const intent = createPurchaseGrantIntent(purchase, settings);

describe.each(['json', 'sqlite'])('%s paid-grant journal', (kind) => {
    it('persists the same immutable entitlement/request identity across restarts and defensive reads', async () => {
        let db = await open(kind);
        const input = { ...purchase, grantIntent: { ...intent } };
        const saved = await db.savePurchaseState(input);
        saved.grantIntent.quantity = 10;
        input.grantIntent.requestId = '789';
        const read = db.findPurchaseByTransId('123');
        read.grantIntent.quantity = 15;
        await db.savePurchaseState({ transId: '123', status: 'completed', grantDelivered: true, grantReplayed: true, granted: [] });
        db.close?.();
        db = await open(kind);
        expect(db.findPurchaseByTransId('123')).toMatchObject({ grantIntent: intent, grantDelivered: true, grantReplayed: true });
        await db.savePurchaseState({ transId: '123', status: 'reversed', grantDelivered: false });
        expect(db.findPurchaseByTransId('123').grantDelivered).toBe(true);
    });

    it('rejects replacement intents and ownership changes rather than issuing a fresh grant', async () => {
        const db = await open(kind);
        await db.savePurchaseState({ ...purchase, grantIntent: intent });
        for (const changed of [{ quantity: 15 }, { requestId: '789' }, { sandbox: true }, { appId: 480 }]) {
            await expect(db.savePurchaseState({ ...purchase, grantIntent: { ...intent, ...changed } }))
                .rejects.toThrow('purchase_grant_intent_conflict');
        }
        await expect(db.savePurchaseState({ ...purchase, steamId64: '76561198000000001' }))
            .rejects.toThrow('purchase_grant_identity_conflict');
        expect(db.findPurchaseByTransId('123').grantIntent).toEqual(intent);
    });

    it('cannot let simultaneous intent writers replace the winner', async () => {
        const db = await open(kind);
        const results = await Promise.allSettled([
            db.savePurchaseState({ ...purchase, grantIntent: intent }),
            db.savePurchaseState({ ...purchase, grantIntent: { ...intent, requestId: '789' } })
        ]);
        expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected']);
        expect(db.findPurchaseByTransId('123').grantIntent).toEqual(intent);
    });
});

it('JSON never publishes failed intent/completion writes, in memory or after restart', async () => {
    let db = await open('json');
    const pending = { ...purchase, status: 'payment_succeeded' };
    await db.savePurchaseState(pending);
    vi.spyOn(fs.promises, 'rename').mockRejectedValueOnce(new Error('disk unavailable'));
    await expect(db.savePurchaseState({ ...purchase, grantIntent: intent })).rejects.toThrow('disk unavailable');
    expect(db.findPurchaseByTransId('123').grantIntent).toBeUndefined();
    await db.savePurchaseState({ ...purchase, grantIntent: intent });
    vi.spyOn(fs.promises, 'rename').mockRejectedValueOnce(new Error('disk unavailable'));
    await expect(db.savePurchaseState({ ...purchase, status: 'completed', grantDelivered: true })).rejects.toThrow('disk unavailable');
    expect(db.findPurchaseByTransId('123')).toMatchObject({ status: 'finalized_pending_grant', grantIntent: intent });
    expect(db.findPurchaseByTransId('123').grantDelivered).toBeUndefined();
    db = await open('json');
    expect(db.findPurchaseByTransId('123')).toMatchObject({ status: 'finalized_pending_grant', grantIntent: intent });
    expect(db.findPurchaseByTransId('123').grantDelivered).toBeUndefined();
});

it('derives deterministic uint64 IDs with distinct account/order/app/environment namespaces', () => {
    expect(createPurchaseGrantIntent(purchase, settings)).toEqual(intent);
    const variants = [
        intent,
        createPurchaseGrantIntent({ ...purchase, steamId64: '76561198000000001' }, settings),
        createPurchaseGrantIntent({ ...purchase, orderId: '457' }, settings),
        createPurchaseGrantIntent(purchase, { ...settings, sandbox: true }),
        createPurchaseGrantIntent(purchase, { ...settings, appId: 480 })
    ];
    expect(new Set(variants.map((value) => value.requestId)).size).toBe(variants.length);
    for (const value of variants) {
        expect(BigInt(value.requestId)).toBeGreaterThan(0n);
        expect(BigInt(value.requestId)).toBeLessThanOrEqual(18446744073709551615n);
    }
});
