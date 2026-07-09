import { describe, it, expect } from 'vitest';
import { getCampTrades, canApplyTrade, applyTrade } from './campEconomy.js';
import { BankManager } from './bank.js';

function createMemoryStorage() {
    const store = {};
    return {
        getItem: (k) => store[k] ?? null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; }
    };
}

describe('Camp Economy Barter System', () => {
    it('generates trades and applies class affinity', () => {
        const meridianScout = getCampTrades({ id: 'camp_meridian', level: 1, bond: 2 }, 'SCOUT');
        const meridianEngineer = getCampTrades({ id: 'camp_meridian', level: 1, bond: 2 }, 'ENGINEER');

        const sellTechScout = meridianScout.find(t => t.id === 'sell_tech');
        const sellTechEngineer = meridianEngineer.find(t => t.id === 'sell_tech');

        // Engineer gets a class bonus at Meridian, so shells received should be higher
        expect(sellTechEngineer.receive.shells).toBeGreaterThan(sellTechScout.receive.shells);
    });

    it('validates and applies trades against bank state', () => {
        const storage = createMemoryStorage();
        const bank = new BankManager({ storage });
        bank.addShells(100);

        const trade = {
            id: 'buy_coin',
            give: { shells: 40 },
            receive: { coin: 5 }
        };

        expect(canApplyTrade(trade, bank.getState())).toBe(true);

        const success = applyTrade(trade, bank);
        expect(success).toBe(true);
        expect(bank.getState().shells).toBe(60);
        expect(bank.getState().coin).toBe(5);
    });
});
