import { describe, expect, it } from 'vitest';
import { LocalVaultLedger } from './localVaultLedger.js';
import { planSmelt } from './craftingMatrix.js';

function memoryStorage(initial = null) {
    const data = new Map();
    if (initial) data.set('hb_dev_vault_inventory_v1', JSON.stringify(initial));
    return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), data };
}

const RARITY = { 10: 'rare', 11: 'rare', 20: 'epic', 21: 'epic', 30: 'legendary' };
const lookup = (id) => (RARITY[Number(id)] ? { rarity: RARITY[Number(id)] } : null);
const count = (items, id) => items.filter((i) => Number(i.itemdefid) === id).reduce((s, i) => s + i.quantity, 0);

describe('local vault exchange (the trade-up commit)', () => {
    it('consumes the inputs and grants the output in one write that a fresh reader sees', () => {
        const storage = memoryStorage({ items: [{ itemId: 'a', itemdefid: 10, quantity: 5 }], receipts: {} });
        const ledger = new LocalVaultLedger(storage);
        const plan = planSmelt({ vaultItems: ledger.read().items, rarity: 'rare', catalogLookup: lookup, outputPool: [20], rng: () => 0 });
        expect(plan.ok).toBe(true);

        const result = ledger.exchange({ consumed: plan.consumed, granted: [{ itemdefid: plan.outputItemdefid, quantity: 1 }], receiptId: 'smelt:1' });
        expect(result.ok).toBe(true);

        // "Close and reopen": a new ledger over the same storage.
        const reopened = new LocalVaultLedger(storage).read().items;
        expect(count(reopened, 10)).toBe(0);
        expect(count(reopened, 20)).toBe(1);
    });

    it('takes inputs across several stacks of the same item (Steam returns one stack per instance)', () => {
        const items = [1, 2, 3, 4, 5, 6].map((n) => ({ itemId: `i${n}`, itemdefid: 10, quantity: 1 }));
        const storage = memoryStorage({ items, receipts: {} });
        const ledger = new LocalVaultLedger(storage);
        const plan = planSmelt({ vaultItems: ledger.read().items, rarity: 'rare', catalogLookup: lookup, outputPool: [20], rng: () => 0 });
        const result = ledger.exchange({ consumed: plan.consumed, granted: [{ itemdefid: 20, quantity: 1 }], receiptId: 'smelt:2' });
        expect(result.ok).toBe(true);
        expect(count(result.items, 10)).toBe(1);
        expect(count(result.items, 20)).toBe(1);
    });

    it('writes nothing when an input is missing', () => {
        const storage = memoryStorage({ items: [{ itemId: 'a', itemdefid: 10, quantity: 4 }], receipts: {} });
        const ledger = new LocalVaultLedger(storage);
        const before = storage.data.get('hb_dev_vault_inventory_v1');
        const result = ledger.exchange({ consumed: [{ itemdefid: 10, quantity: 5 }], granted: [{ itemdefid: 20, quantity: 1 }], receiptId: 'smelt:3' });
        expect(result).toEqual({ ok: false, reason: 'insufficient_items' });
        expect(storage.data.get('hb_dev_vault_inventory_v1')).toBe(before);
    });

    it('applies a receipt once, so a double press cannot trade twice', () => {
        const storage = memoryStorage({ items: [{ itemId: 'a', itemdefid: 10, quantity: 10 }], receipts: {} });
        const ledger = new LocalVaultLedger(storage);
        const trade = { consumed: [{ itemdefid: 10, quantity: 5 }], granted: [{ itemdefid: 20, quantity: 1 }], receiptId: 'smelt:4' };
        ledger.exchange(trade);
        const again = ledger.exchange(trade);
        expect(again.duplicate).toBe(true);
        expect(count(again.items, 10)).toBe(5);
        expect(count(again.items, 20)).toBe(1);
    });

    it('stacks a granted item onto an existing stack', () => {
        const storage = memoryStorage({ items: [{ itemId: 's', itemdefid: 4159, quantity: 60 }, { itemId: 'e', itemdefid: 21, quantity: 1 }], receipts: {} });
        const result = new LocalVaultLedger(storage).exchange({ consumed: [{ itemdefid: 4159, quantity: 60 }], granted: [{ itemdefid: 21, quantity: 1 }], receiptId: 'redeem:1' });
        expect(result.items).toEqual([{ itemId: 'e', itemdefid: 21, quantity: 2 }]);
    });
});
