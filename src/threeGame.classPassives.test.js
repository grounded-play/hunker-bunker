import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { ThreeGame } from './threeGame.js';

function makeFakeBank(unlockedIds = []) {
    return { isSkillUnlocked: (id) => unlockedIds.includes(id) };
}

describe('resolveClassPassiveStats', () => {
    it('gives SCOUT base 50% slow-resist and -20% reload with no skills unlocked', () => {
        const fakeThis = { bank: makeFakeBank([]) };
        const stats = ThreeGame.prototype.resolveClassPassiveStats.call(fakeThis, 'SCOUT');
        expect(stats.slowResistMult).toBeCloseTo(0.5);
        expect(stats.reloadSpeedMult).toBeCloseTo(0.8);
    });

    it('bumps SCOUT slow-resist to 75% duration-mult 0.25 with scout_special_unlock', () => {
        const fakeThis = { bank: makeFakeBank(['scout_special_unlock']) };
        const stats = ThreeGame.prototype.resolveClassPassiveStats.call(fakeThis, 'SCOUT');
        expect(stats.slowResistMult).toBeCloseTo(0.25);
    });

    it('gives SCOUT full slow immunity (mult 0) with scout_special_upgrade_2', () => {
        const fakeThis = { bank: makeFakeBank(['scout_special_unlock', 'scout_special_upgrade_2']) };
        const stats = ThreeGame.prototype.resolveClassPassiveStats.call(fakeThis, 'SCOUT');
        expect(stats.slowResistMult).toBe(0);
    });

    it('gives SCOUT -35% reload with scout_special_upgrade_1', () => {
        const fakeThis = { bank: makeFakeBank(['scout_special_unlock', 'scout_special_upgrade_1']) };
        const stats = ThreeGame.prototype.resolveClassPassiveStats.call(fakeThis, 'SCOUT');
        expect(stats.reloadSpeedMult).toBeCloseTo(0.65);
    });

    it('gives TANK base 20% block chance with no skills unlocked', () => {
        const fakeThis = { bank: makeFakeBank([]) };
        const stats = ThreeGame.prototype.resolveClassPassiveStats.call(fakeThis, 'TANK');
        expect(stats.blockChance).toBeCloseTo(0.2);
        expect(stats.tankRegenEnabled).toBe(false);
    });

    it('bumps TANK block chance to 40% and enables regen with both upgrades', () => {
        const fakeThis = { bank: makeFakeBank(['tank_special_unlock', 'tank_special_upgrade_1', 'tank_special_upgrade_2']) };
        const stats = ThreeGame.prototype.resolveClassPassiveStats.call(fakeThis, 'TANK');
        expect(stats.blockChance).toBeCloseTo(0.4);
        expect(stats.tankRegenEnabled).toBe(true);
    });

    it('gives ENGINEER base 20s interval / 6s duration / 1.2s fire interval with no skills unlocked', () => {
        const fakeThis = { bank: makeFakeBank([]) };
        const stats = ThreeGame.prototype.resolveClassPassiveStats.call(fakeThis, 'ENGINEER');
        expect(stats.turretInterval).toBe(20);
        expect(stats.turretDuration).toBe(6);
        expect(stats.turretFireInterval).toBeCloseTo(1.2);
    });

    it('improves ENGINEER turret with all three skills unlocked', () => {
        const fakeThis = { bank: makeFakeBank(['engineer_special_unlock', 'engineer_special_upgrade_1', 'engineer_special_upgrade_2']) };
        const stats = ThreeGame.prototype.resolveClassPassiveStats.call(fakeThis, 'ENGINEER');
        expect(stats.turretDuration).toBe(9);
        expect(stats.turretFireInterval).toBeCloseTo(0.9);
        expect(stats.turretInterval).toBe(15);
    });

    it('returns safe neutral defaults with no bank attached', () => {
        const fakeThis = {};
        const stats = ThreeGame.prototype.resolveClassPassiveStats.call(fakeThis, 'SCOUT');
        expect(stats.slowResistMult).toBeCloseTo(0.5);
    });
});

describe('applyPlayerSlow — SCOUT passive slow-resistance', () => {
    it('applies the full duration when slowResistMult is 1.0 (non-Scout default)', () => {
        const fakeThis = { slowResistMult: 1.0, playerSlowTimer: 0 };
        ThreeGame.prototype.applyPlayerSlow.call(fakeThis, 3.0);
        expect(fakeThis.playerSlowTimer).toBeCloseTo(3.0);
    });

    it('halves the duration for SCOUT base passive (slowResistMult 0.5)', () => {
        const fakeThis = { slowResistMult: 0.5, playerSlowTimer: 0 };
        ThreeGame.prototype.applyPlayerSlow.call(fakeThis, 3.0);
        expect(fakeThis.playerSlowTimer).toBeCloseTo(1.5);
    });

    it('applies zero duration once SCOUT has full immunity (slowResistMult 0)', () => {
        const fakeThis = { slowResistMult: 0, playerSlowTimer: 0 };
        ThreeGame.prototype.applyPlayerSlow.call(fakeThis, 2.5);
        expect(fakeThis.playerSlowTimer).toBe(0);
    });
});

describe('startReload — SCOUT passive reload speed', () => {
    function makeFakeThis(overrides = {}) {
        return {
            weaponReloading: false,
            weaponClipSize: 8,
            weaponClipAmmo: 2,
            reloadSpeedMult: 1.0,
            getAvailableAmmo: () => 10,
            emitWeaponClipState: () => {},
            ...overrides
        };
    }

    let originalWindow;
    beforeEach(() => {
        originalWindow = globalThis.window;
        globalThis.window = { AudioManager: { play: () => {} } };
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('uses the full WEAPON_RELOAD_DURATION when reloadSpeedMult is 1.0', () => {
        const fakeThis = makeFakeThis();
        ThreeGame.prototype.startReload.call(fakeThis);
        expect(fakeThis.weaponReloadDuration).toBeCloseTo(1.25);
        expect(fakeThis.weaponReloadTimer).toBeCloseTo(1.25);
    });

    it('shortens reload duration for SCOUT (reloadSpeedMult 0.8)', () => {
        const fakeThis = makeFakeThis({ reloadSpeedMult: 0.8 });
        ThreeGame.prototype.startReload.call(fakeThis);
        expect(fakeThis.weaponReloadDuration).toBeCloseTo(1.0);
        expect(fakeThis.weaponReloadTimer).toBeCloseTo(1.0);
    });
});
