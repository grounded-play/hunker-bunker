import { describe, expect, it } from 'vitest';

import { BankManager, FOUNDRY_ACTIVATION_COST, GOAL_COSTS, O2_GENERATOR_UPGRADES, shellPriceOf, TIER2_UPGRADE_ORDER, TIER2_UPGRADE_CONFIGS } from './bank.js';

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
            schemaVersion: 8,
            med: 0,
            ammo: 0,
            tech: 0,
            coin: 0,
            o2GeneratorLevel: 0,
            foundryActivated: false,
            unlocks: {
                o2Bubble: false,
                hullExpansion: false,
                radarNode: false,
                reactorCompressor: false
            },
            hullExpansionLevel: 0,
            radarNodeLevel: 0,
            reactorCompressorLevel: 0,
            baseTurretUnlocked: false,
            baseTurretLevel: 1,
            baseTurretHp: 100,
            tier2Unlocks: {
                suitThermal: false,
                deconFilters: false,
                stimCache: false,
                fallHardening: false
            },
            weaponUpgrades: {
                ammoCapacity: 0,
                ammoRefill: 0,
                shotSpeed: 0,
                shotDamage: 0,
                shotAmount: 0
            },
            unlockedSkills: [],
            shells: 0
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
        expect(bank.spend(GOAL_COSTS.o2Bubble)).toBe(true);
        expect(bank.setUnlock('o2Bubble')).toBe(true);

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

    it('migrates a v2 save to v8 without resetting and adds newer fields', () => {
        const storage = createMemoryStorage();
        storage.setItem('hb_bank', JSON.stringify({
            schemaVersion: 2,
            med: 5, ammo: 3, tech: 40, coin: 12,
            o2GeneratorLevel: 1,
            unlocks: { o2Bubble: true, hullExpansion: false, radarNode: false, reactorCompressor: false },
            tier2Unlocks: { suitThermal: false, deconFilters: false, stimCache: false }
        }));

        const bank = new BankManager({ storage });
        const state = bank.getState();
        expect(state.schemaVersion).toBe(8);
        expect(state.tech).toBe(40); // preserved, not reset
        expect(state.weaponUpgrades).toEqual({
            ammoCapacity: 0, ammoRefill: 0, shotSpeed: 0, shotDamage: 0, shotAmount: 0
        });
        expect(state.foundryActivated).toBe(false);
        expect(state.unlockedSkills).toEqual([]);
        expect(state.shells).toBe(0);
    });

    it('activates the foundry once using the activation cost and persists', () => {
        const storage = createMemoryStorage();
        const bank = new BankManager({ storage });

        expect(bank.isFoundryActivated()).toBe(false);
        expect(bank.canActivateFoundry()).toBe(false);
        expect(bank.activateFoundry()).toBe(false);

        bank.deposit(FOUNDRY_ACTIVATION_COST);
        expect(bank.canActivateFoundry()).toBe(true);
        expect(bank.activateFoundry()).toBe(true);
        expect(bank.isFoundryActivated()).toBe(true);
        expect(bank.getState()).toMatchObject({
            med: 0,
            tech: 0,
            coin: 0,
            foundryActivated: true
        });

        expect(bank.activateFoundry()).toBe(true);
        const reloaded = new BankManager({ storage });
        expect(reloaded.isFoundryActivated()).toBe(true);
    });

    it('purchases weapon upgrades, enforces cost + max level, and persists', () => {
        const storage = createMemoryStorage();
        const bank = new BankManager({ storage });

        // Too poor to start.
        expect(bank.upgradeWeapon('ammoCapacity')).toBe(false);

        bank.addShells(9999);

        // ammoCapacity has maxLevel 3 — buy all three.
        for (let i = 1; i <= 3; i++) {
            expect(bank.upgradeWeapon('ammoCapacity')).toBe(true);
            expect(bank.getWeaponUpgradeLevel('ammoCapacity')).toBe(i);
        }
        // Maxed out.
        expect(bank.getWeaponUpgradeNextCost('ammoCapacity')).toBeNull();
        expect(bank.upgradeWeapon('ammoCapacity')).toBe(false);

        // Unknown key is rejected.
        expect(bank.upgradeWeapon('nonexistent')).toBe(false);
        expect(bank.upgradeWeapon('ammoRefill')).toBe(true);
        expect(bank.getWeaponUpgradeLevel('ammoRefill')).toBe(1);

        // Persists across reload.
        const reloaded = new BankManager({ storage });
        expect(reloaded.getWeaponUpgradeLevel('ammoCapacity')).toBe(3);
        expect(reloaded.getWeaponUpgradeLevel('ammoRefill')).toBe(1);
    });

    it('enforces class skill tree prerequisite checks and unlock logic', () => {
        const storage = createMemoryStorage();
        const bank = new BankManager({ storage });

        // Scout tree has scout_magnet_1 (no prereqs) and scout_speed_1 (prereq: scout_magnet_1)
        expect(bank.isSkillUnlocked('scout_magnet_1')).toBe(false);
        expect(bank.canUnlockSkill('scout_magnet_1', 'SCOUT')).toBe(false); // No shells

        bank.addShells(100);
        expect(bank.canUnlockSkill('scout_magnet_1', 'SCOUT')).toBe(true);
        expect(bank.canUnlockSkill('scout_speed_1', 'SCOUT')).toBe(false); // Locked by prereq

        // Unlock first node
        expect(bank.unlockSkill('scout_magnet_1', 'SCOUT')).toBe(true);
        expect(bank.isSkillUnlocked('scout_magnet_1')).toBe(true);

        // Now the child node is available
        expect(bank.canUnlockSkill('scout_speed_1', 'SCOUT')).toBe(true);
        expect(bank.unlockSkill('scout_speed_1', 'SCOUT')).toBe(true);
        expect(bank.isSkillUnlocked('scout_speed_1')).toBe(true);

        // Persist across reload
        const reloaded = new BankManager({ storage });
        expect(reloaded.isSkillUnlocked('scout_magnet_1')).toBe(true);
        expect(reloaded.isSkillUnlocked('scout_speed_1')).toBe(true);
    });

    it('gates mid and high class skill tiers behind ship builds', () => {
        const bank = new BankManager({ storage: createMemoryStorage() });
        bank.addShells(9999);
        expect(bank.unlockSkill('scout_magnet_1', 'SCOUT')).toBe(true);
        expect(bank.unlockSkill('scout_speed_1', 'SCOUT')).toBe(true);

        expect(bank.canUnlockSkill('scout_special_unlock', 'SCOUT')).toBe(false);
        bank.setUnlock('o2Bubble');
        bank.setUnlock('hullExpansion');
        expect(bank.canUnlockSkill('scout_special_unlock', 'SCOUT')).toBe(true);
        expect(bank.unlockSkill('scout_special_unlock', 'SCOUT')).toBe(true);

        expect(bank.canUnlockSkill('scout_special_upgrade_1', 'SCOUT')).toBe(false);
        bank.setUnlock('radarNode');
        bank.setUnlock('reactorCompressor');
        expect(bank.getO2GeneratorLevel()).toBe(3);
        expect(bank.canUnlockSkill('scout_special_upgrade_1', 'SCOUT')).toBe(true);
    });

    it('tracks and persists the snail-shell balance', () => {
        const storage = createMemoryStorage();
        const bank = new BankManager({ storage });

        bank.addShells(16);
        expect(bank.getShells()).toBe(16);
        expect(bank.canAffordShells(17)).toBe(false);
        expect(bank.spendShells(10)).toBe(true);
        expect(bank.spendShells(99)).toBe(false);
        expect(new BankManager({ storage }).getShells()).toBe(6);
    });

    it('derives stable shell prices from resource costs', () => {
        expect(shellPriceOf({ tech: 20, coin: 5 })).toBe(3);
        expect(shellPriceOf({ tech: 60, coin: 12 })).toBe(7);
        expect(shellPriceOf({})).toBe(1);
    });

    it('buys tier2 and weapon upgrades with shells', () => {
        const bank = new BankManager({ storage: createMemoryStorage() });
        bank.deposit({ tech: 9999, coin: 9999, med: 9999 });
        bank.setUnlock('o2Bubble');
        expect(bank.canUnlockTier2('suitThermal')).toBe(false);

        bank.addShells(50);
        expect(bank.unlockTier2('suitThermal')).toBe(true);
        expect(bank.upgradeWeapon('ammoCapacity')).toBe(true);
        expect(bank.getShells()).toBeLessThan(50);
    });

    it('exposes fallHardening as a tier-2 upgrade gated behind the reactor compressor', () => {
        expect(TIER2_UPGRADE_ORDER).toContain('fallHardening');
        expect(TIER2_UPGRADE_CONFIGS.fallHardening).toMatchObject({
            key: 'fallHardening',
            prereq: 'reactorCompressor'
        });
        expect(TIER2_UPGRADE_CONFIGS.fallHardening.cost.tech).toBeGreaterThan(0);
    });

    it('upgrades base systems to level 2 with resources', () => {
        const bank = new BankManager({ storage: createMemoryStorage() });
        bank.deposit({ tech: 1000, med: 1000, coin: 1000 });
        bank.setUnlock('o2Bubble');
        bank.setUnlock('hullExpansion');

        expect(bank.getState().hullExpansionLevel).toBe(1);
        expect(bank.canUpgradeGoal('hullExpansion')).toBe(true);
        expect(bank.upgradeGoal('hullExpansion')).toBe(true);
        expect(bank.getState().hullExpansionLevel).toBe(2);
        expect(bank.canUpgradeGoal('hullExpansion')).toBe(false);
    });
});
