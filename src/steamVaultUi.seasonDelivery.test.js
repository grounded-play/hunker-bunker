import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Session logs 2026-10-06 (Steam build d2e7b149): every Dossier reward on a
// Steam build stayed "Pending — retry". deliverLocalSeasonReward refused all
// deliveries when window.electronAPI existed, including supply bundles, which
// are only the game's own TECH / COIN / MED bank and need no Steam service.
describe('season reward delivery on a Steam build', () => {
    let deposit;

    beforeEach(() => {
        deposit = vi.fn(() => ({ ok: true }));
        globalThis.window = {
            electronAPI: {},
            bankManager: { depositSeasonReward: deposit },
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
            localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
        };
        globalThis.localStorage = globalThis.window.localStorage;
    });

    afterEach(() => {
        delete globalThis.window;
        delete globalThis.localStorage;
        vi.resetModules();
    });

    it('banks a supply bundle locally', async () => {
        const { deliverLocalSeasonReward } = await import('./steamVaultUi.js');
        const result = deliverLocalSeasonReward({ kind: 'supply_bundle', tech: 20, coin: 10, med: 5 }, 'receipt-1');
        expect(result).toEqual({ ok: true });
        expect(deposit).toHaveBeenCalledWith({ tech: 20, coin: 10, med: 5 }, 'receipt-1');
    });

    it('still leaves Steam items to the verified service', async () => {
        const { deliverLocalSeasonReward } = await import('./steamVaultUi.js');
        expect(deliverLocalSeasonReward({ kind: 'item', itemdefid: 3001, qty: 1 }, 'receipt-2'))
            .toEqual({ ok: false, reason: 'verified_service_required' });
        expect(deposit).not.toHaveBeenCalled();
    });
});
