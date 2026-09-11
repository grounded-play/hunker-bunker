import { afterEach, describe, expect, it, vi } from 'vitest';
import { BankManager } from './bank.js';
import { ExpeditionReceipt } from './economyReceipt.js';
import { applyTrade } from './campEconomy.js';
import { renderReturnManifest } from './returnManifest.js';

function fixture() {
    const data = new Map();
    const storage = { getItem: key => data.get(key) ?? null, setItem: vi.fn((key, value) => data.set(key, value)) };
    const bank = new BankManager({ storage });
    return { bank, storage };
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('committed economy receipts', () => {
    it('retains separate earnings and spending even when the final balance is unchanged', () => {
        const { bank } = fixture();
        bank.deposit({ tech: 12, coin: 8, med: 3 });
        const receipt = new ExpeditionReceipt();
        receipt.begin('run-1', bank.getState());
        const surface = new EventTarget();
        vi.stubGlobal('window', surface);
        surface.addEventListener('bank-transaction', event => receipt.record(event.detail));
        bank.deposit({ tech: 20, coin: 12, med: 5 });
        bank.spend({ tech: 20, coin: 12, med: 5 });
        const result = receipt.finish();
        expect(result.earned).toMatchObject({ tech: 20, coin: 12, med: 5 });
        expect(result.spent).toMatchObject({ tech: 20, coin: 12, med: 5 });
        expect(result.balance).toEqual(result.opening);
        bank.deposit({ tech: 99 });
        expect(receipt.snapshot()).toEqual(result);
    });

    it.each([
        ['deposit', bank => bank.deposit({ tech: 5, coin: 2, med: 1 })],
        ['spend', bank => bank.spend({ tech: 5, coin: 2 })],
        ['shell grant', bank => bank.addShells(5)],
        ['shell spend', bank => bank.spendShells(5)],
        ['camp exchange', bank => applyTrade({ give: { shells: 10 }, receive: { coin: 1 } }, bank)]
    ])('rolls back %s when persistence fails, without publishing a transaction', (_name, action) => {
        const { bank, storage } = fixture();
        bank.deposit({ tech: 20, coin: 20, med: 5 });
        bank.addShells(20);
        const before = bank.getState();
        const surface = new EventTarget();
        vi.stubGlobal('window', surface);
        const handler = vi.fn();
        surface.addEventListener('bank-transaction', handler);
        storage.setItem.mockImplementationOnce(() => { throw new Error('disk full'); });
        expect(() => action(bank)).toThrow('disk full');
        expect(bank.getState()).toEqual(before);
        expect(new BankManager({ storage }).getState()).toEqual(before);
        expect(handler).not.toHaveBeenCalled();
    });

    it('commits both sides of a camp exchange with a single durable write', () => {
        const { bank, storage } = fixture();
        bank.addShells(100);
        storage.setItem.mockClear();
        expect(applyTrade({ give: { shells: 40 }, receive: { coin: 5 } }, bank)).toBe(true);
        expect(storage.setItem).toHaveBeenCalledTimes(1);
        expect(new BankManager({ storage }).getState()).toMatchObject({ coin: 5, shells: 60 });
    });

    it.each([-1, Infinity, NaN, 0.5, '5'])('rejects invalid trade quantities (%s)', amount => {
        const { bank, storage } = fixture();
        expect(applyTrade({ give: { shells: amount }, receive: { coin: 1 } }, bank)).toBe(false);
        expect(bank.exchange({}, { tech: amount })).toBe(false);
        expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('resets the next expedition without including old spending or duplicating repeated notifications', () => {
        const receipt = new ExpeditionReceipt();
        receipt.begin('one', { tech: 10 });
        receipt.record({ after: { tech: 20 } });
        receipt.record({ after: { tech: 20 } });
        expect(receipt.finish().earned.tech).toBe(10);
        receipt.begin('two', { tech: 20 });
        expect(receipt.finish().earned.tech).toBe(0);
    });

    it('shows unrecorded sessions honestly instead of treating the entire bank as newly earned', () => {
        const element = { dataset: {}, innerHTML: '' };
        renderReturnManifest(element, null, { tech: 500, shells: 22 });
        expect(element.innerHTML).toContain('Run receipt unavailable');
        expect(element.innerHTML).not.toContain('+500');
        expect(element.innerHTML).toContain('500 banked');
    });
});
