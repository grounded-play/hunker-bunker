import { describe, expect, it, vi } from 'vitest';
import { finishPendingPurchases, runSteamKeyPurchase } from './steamStorePurchase.js';

// Session log 2026-10-06 (Deck, beta 2.4.14 f76dde08): 22 presses of BUY VIA
// STEAM logged purchase-start and nothing else. The beta build refused locally
// and wrote the reason far below the buttons; the live path also finalized
// before the player could approve, and required a URL Steam never sends for an
// in-game (usersession=client) purchase.
function fakeApi({ init, authorization = { authorized: true }, finalize = [{ ok: true, status: 'completed', purchaseStatus: 'completed' }] } = {}) {
    let authHandler = null;
    const finals = [...finalize];
    return {
        purchaseSteamKeys: vi.fn(async () => init ?? { ok: true, requiresConfirmation: true, transId: 't1', orderId: '42', sandbox: false, confirmUrl: null }),
        onMicroTxnAuthorization: vi.fn((handler) => {
            authHandler = handler;
            if (authorization) queueMicrotask(() => authHandler?.({ appId: 1, orderId: '42', ...authorization }));
            return () => { authHandler = null; };
        }),
        openSteamOverlayToUrl: vi.fn(async () => ({ ok: true })),
        finalizeSteamPurchase: vi.fn(async () => finals.length > 1 ? finals.shift() : finals[0])
    };
}

const pendingStore = () => {
    const ids = new Set();
    return { add: (id) => ids.add(id), remove: (id) => ids.delete(id), list: () => [...ids] };
};

describe('runSteamKeyPurchase', () => {
    it('waits for Steam approval, then finalizes and reports the keys', async () => {
        const api = fakeApi();
        const status = vi.fn();
        const pending = pendingStore();
        const outcome = await runSteamKeyPurchase({ api, sku: 'key_5', onStatus: status, pending, retryDelayMs: 0 });
        expect(outcome).toMatchObject({ state: 'completed' });
        expect(api.finalizeSteamPurchase).toHaveBeenCalledWith('t1');
        expect(status.mock.calls.map(([s]) => s.key)).toEqual(['awaiting_approval', 'completed']);
        expect(api.openSteamOverlayToUrl).not.toHaveBeenCalled();
        expect(pending.list()).toEqual([]);
    });

    it('says so when the purchase runs in the no-charge sandbox', async () => {
        const api = fakeApi({ init: { ok: true, requiresConfirmation: true, transId: 't1', orderId: '42', sandbox: true } });
        const status = vi.fn();
        await runSteamKeyPurchase({ api, sku: 'key_1', onStatus: status, pending: pendingStore(), retryDelayMs: 0 });
        expect(status.mock.calls[0][0].key).toBe('awaiting_sandbox');
    });

    it('opens the overlay when Steam returns a web approval URL', async () => {
        const api = fakeApi({ init: { ok: true, requiresConfirmation: true, transId: 't1', orderId: '42', confirmUrl: 'https://store.steampowered.com/checkout' } });
        await runSteamKeyPurchase({ api, sku: 'key_1', onStatus: () => {}, pending: pendingStore(), retryDelayMs: 0 });
        expect(api.openSteamOverlayToUrl).toHaveBeenCalledWith('https://store.steampowered.com/checkout');
    });

    it('stops without finalizing when the player declines in Steam', async () => {
        const api = fakeApi({ authorization: { authorized: false } });
        const pending = pendingStore();
        const outcome = await runSteamKeyPurchase({ api, sku: 'key_1', onStatus: () => {}, pending, retryDelayMs: 0 });
        expect(outcome.state).toBe('declined');
        expect(api.finalizeSteamPurchase).not.toHaveBeenCalled();
        expect(pending.list()).toEqual([]);
    });

    it('ignores another order\'s approval', async () => {
        const api = fakeApi({ authorization: null });
        const run = runSteamKeyPurchase({ api, sku: 'key_1', onStatus: () => {}, pending: pendingStore(), retryDelayMs: 0, approvalTimeoutMs: 30 });
        await vi.waitFor(() => expect(api.onMicroTxnAuthorization).toHaveBeenCalled());
        api.onMicroTxnAuthorization.mock.calls[0][0]({ orderId: '999', authorized: false });
        expect((await run).state).not.toBe('declined');
    });

    it('retries a finalize Steam has not settled yet, and keeps an unsettled one for later', async () => {
        const stillPending = { ok: true, status: 'pending', purchaseStatus: 'pending', nextAction: 'retry_finalize' };
        const settles = fakeApi({ finalize: [stillPending, { ok: true, status: 'completed', purchaseStatus: 'completed' }] });
        expect((await runSteamKeyPurchase({ api: settles, sku: 'key_1', onStatus: () => {}, pending: pendingStore(), retryDelayMs: 0 })).state).toBe('completed');

        const never = fakeApi({ finalize: [stillPending] });
        const pending = pendingStore();
        const outcome = await runSteamKeyPurchase({ api: never, sku: 'key_1', onStatus: () => {}, pending, retryDelayMs: 0, finalizeAttempts: 3 });
        expect(outcome.state).toBe('pending');
        expect(never.finalizeSteamPurchase).toHaveBeenCalledTimes(3);
        expect(pending.list()).toEqual(['t1']);
    });

    it('reports a refused purchase with the server reason', async () => {
        const api = fakeApi({ init: { ok: false, reason: 'sandbox_not_allowed', purchaseStatus: 'disabled' } });
        const status = vi.fn();
        const outcome = await runSteamKeyPurchase({ api, sku: 'key_1', onStatus: status, pending: pendingStore(), retryDelayMs: 0 });
        expect(outcome).toMatchObject({ state: 'refused', reason: 'sandbox_not_allowed' });
        expect(status.mock.calls.at(-1)[0]).toMatchObject({ key: 'sandbox_not_allowed', tone: 'error' });
        expect(api.finalizeSteamPurchase).not.toHaveBeenCalled();
    });

    it('turns a thrown bridge call into a failure, not a hang', async () => {
        const api = fakeApi();
        api.purchaseSteamKeys.mockRejectedValue(new Error('backend unreachable'));
        const status = vi.fn();
        const outcome = await runSteamKeyPurchase({ api, sku: 'key_1', onStatus: status, pending: pendingStore(), retryDelayMs: 0 });
        expect(outcome.state).toBe('refused');
        expect(status.mock.calls.at(-1)[0]).toMatchObject({ key: 'failed', tone: 'error' });
    });
});

describe('finishPendingPurchases', () => {
    it('finalizes purchases left pending last time and forgets settled ones', async () => {
        const pending = pendingStore();
        pending.add('old-1');
        pending.add('old-2');
        const api = { finalizeSteamPurchase: vi.fn(async (id) => (id === 'old-1'
            ? { ok: true, status: 'completed', purchaseStatus: 'completed' }
            : { ok: true, status: 'pending', purchaseStatus: 'pending' })) };
        expect(await finishPendingPurchases({ api, pending })).toEqual({ completed: 1 });
        expect(pending.list()).toEqual(['old-2']);
    });
});
