import { describe, expect, it } from 'vitest';

import { BankManager, GOAL_COSTS, O2_GENERATOR_UPGRADES } from './bank.js';

function createMemoryStorage() {
    const memory = new Map();
    return {
        getItem(key) {
            return memory.has(key) ? memory.get(key) : null;
        },
        setItem(key, value) {
            memory.set(key, String(value));
        },
        removeItem(key) {
            memory.delete(key);
        }
    };
}

describe('BankManager', () => {
    it('creates a default state when storage is empty', () => {
        const storage = createMemoryStorage();
        const bank = new BankManager({ storage });

        expect(bank.getState()).toEqual({
            schemaVersion: 1,
            med: 0,
            ammo: 0,
            tech: 0,
            coin: 0,
            o2GeneratorLevel: 0,
            unlocks: {
                o2Bubble: false,
                hullExpansion: false,
                radarNode: false,
                reactorCompressor: false
            }
        });
    });

    it('deposits session inventory using pickup key mapping', () => {
        const storage = createMemoryStorage();
        const bank = new BankManager({ storage });

        bank.deposit({ health: 4, ammo: 2, weapon: 9, coin: 3 });

        expect(bank.getState()).toMatchObject({
            med: 4,
            ammo: 2,
            tech: 9,
            coin: 3
        });
    });

    it('spends only when affordable and persists', () => {
        const storage = createMemoryStorage();
        const bank = new BankManager({ storage });

        bank.deposit({ med: 20, tech: 60, coin: 30 });
        expect(bank.canAfford({ tech: 50, med: 20 })).toBe(true);
        expect(bank.spend({ tech: 50, med: 20 })).toBe(true);
        expect(bank.getState()).toMatchObject({
            med: 0,
            tech: 10,
            coin: 30
        });

        expect(bank.spend({ tech: 999 })).toBe(false);
        expect(bank.getState().tech).toBe(10);
    });

    it('upgrades O2 generator level in sequence using costs', () => {
        const storage = createMemoryStorage();
        const bank = new BankManager({ storage });

        bank.deposit({ tech: 1000, med: 1000, coin: 1000 });

        expect(bank.getO2GeneratorLevel()).toBe(0);
        expect(bank.canUpgradeO2Generator()).toBe(true);

        const first = bank.upgradeO2Generator();
        expect(first?.level).toBe(1);
        expect(bank.getO2GeneratorLevel()).toBe(1);

        const second = bank.upgradeO2Generator();
        expect(second?.level).toBe(2);
        expect(bank.getO2GeneratorLevel()).toBe(2);

        const third = bank.upgradeO2Generator();
        expect(third?.level).toBe(3);
        expect(bank.getO2GeneratorLevel()).toBe(3);

        expect(bank.upgradeO2Generator()).toBeNull();
        expect(bank.getState().o2GeneratorLevel).toBe(O2_GENERATOR_UPGRADES.length);
    });

    it('enforces unlock ordering and cost checks', () => {
        const storage = createMemoryStorage();
        const bank = new BankManager({ storage });

        expect(bank.setUnlock('radarNode')).toBe(false);

        bank.deposit(GOAL_COSTS.o2Bubble);
        expect(bank.canUnlock('o2Bubble')).toBe(true);
        expect(bank.spend(GOAL_COSTS.o2Bubble)).toBe(true);
        expect(bank.setUnlock('o2Bubble')).toBe(true);

        expect(bank.canUnlock('radarNode')).toBe(false);
        bank.deposit({ tech: 999, med: 999, coin: 999 });
        expect(bank.setUnlock('hullExpansion')).toBe(true);
        expect(bank.setUnlock('radarNode')).toBe(true);
        expect(bank.setUnlock('reactorCompressor')).toBe(true);

        expect(bank.getUnlocks()).toEqual({
            o2Bubble: true,
            hullExpansion: true,
            radarNode: true,
            reactorCompressor: true
        });
    });

    it('loads persisted state from storage', () => {
        const storage = createMemoryStorage();
        const first = new BankManager({ storage });
        first.deposit({ med: 7, ammo: 5, tech: 4, coin: 2 });

        const second = new BankManager({ storage });
        expect(second.getState()).toMatchObject({
            med: 7,
            ammo: 5,
            tech: 4,
            coin: 2,
            o2GeneratorLevel: 0
        });
    });
});
