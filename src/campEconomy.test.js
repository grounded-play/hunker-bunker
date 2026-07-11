import { describe, it, expect } from 'vitest';
import {
    applyTrade,
    canApplyTrade,
    getAct2ClassPerks,
    getCampTrades,
    getCampVerbEffects,
    mergeCampVerbEffects
} from './campEconomy.js';
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

    it('turns camp identity into Wave 3 verb effects', () => {
        const meridian = getCampVerbEffects({ id: 'camp_meridian', level: 2, bond: 3 }, 'ENGINEER');
        const tallow = getCampVerbEffects({ id: 'camp_tallow', level: 2, bond: 4 }, 'SCOUT');
        const vesper = getCampVerbEffects({ id: 'camp_vesper', level: 3, bond: 2 }, 'TANK');

        expect(meridian.radar.rangeMult).toBeGreaterThan(1);
        expect(meridian.radar.cooldownMult).toBeLessThan(1);
        expect(tallow.humanityDecayMultiplier).toBeLessThan(1);
        expect(tallow.medkitInventory).toBeGreaterThan(0);
        expect(vesper.ammoReserve).toBeGreaterThan(0);
        expect(vesper.turretPlacementFavor).toBe(true);
    });

    it('merges camp verb effects for runtime consumers', () => {
        const merged = mergeCampVerbEffects([
            { id: 'camp_meridian', level: 1, bond: 2 },
            { id: 'camp_tallow', level: 2, bond: 3 },
            { id: 'camp_vesper', level: 1, bond: 1 }
        ], 'SCOUT');

        expect(merged.radar.rangeMult).toBeGreaterThan(1);
        expect(merged.humanityDecayMultiplier).toBeLessThan(1);
        expect(merged.medkitInventory).toBeGreaterThan(0);
        expect(merged.ammoReserve).toBeGreaterThan(0);
    });

    it('defines Act 2 class perks for Scout, Tank, and Engineer', () => {
        expect(getAct2ClassPerks('SCOUT').turretDetectionRadiusMult).toBeLessThan(1);
        expect(getAct2ClassPerks('TANK').shockGuardCharges).toBe(1);
        expect(getAct2ClassPerks('ENGINEER').canReprogramTurrets).toBe(true);
    });
});
