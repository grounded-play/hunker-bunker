import { describe, expect, it } from 'vitest';
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
