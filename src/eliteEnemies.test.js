import { describe, expect, it } from 'vitest';
import {
    ELITE_ELIGIBLE_TYPES,
    ELITE_IDENTITY,
    isEliteEligibleType,
    isEliteForLoot,
    rollElitePromotion
} from './eliteEnemies.js';
import { DEPTH_CONTRACT } from './depthContract.js';

// docs/planning/depth-01-elite-and-relic-lane-2026-09-09.md D0/D1.
describe('isEliteForLoot (D0: elite is not enraged)', () => {
    it('does not treat a wounded ordinary enemy as elite', () => {
        // damageSnail() flips enraged on any non-boss non-crawler whose hp
        // passes through exactly 1. That is a last-stand state, not a rank,
        // and must not reach the 0.65 elite loot branch.
        expect(isEliteForLoot({ enraged: true })).toBe(false);
    });

    it('treats a spawn-time promoted enemy as elite', () => {
        expect(isEliteForLoot({ isElite: true })).toBe(true);
    });

    it('keeps sentinels elite by identity', () => {
        expect(isEliteForLoot({ isSentinel: true })).toBe(true);
    });

    it('keeps a wounded elite elite', () => {
        expect(isEliteForLoot({ isElite: true, enraged: true })).toBe(true);
    });

    it('treats a plain enemy as non-elite', () => {
        expect(isEliteForLoot({})).toBe(false);
        expect(isEliteForLoot(undefined)).toBe(false);
    });
});

describe('isEliteEligibleType (D1: promotion exclusions)', () => {
    it('includes crawlers, which dominate deep rings', () => {
        // Excluding them left the contract practically unreachable -- see the
        // sampling note in eliteEnemies.js.
        expect(isEliteEligibleType('crawler')).toBe(true);
    });

    it('accepts the ordinary hunting families', () => {
        for (const type of ELITE_ELIGIBLE_TYPES) {
            expect(isEliteEligibleType(type)).toBe(true);
        }
    });

    it('rejects bosses, sentinels and non-enemies', () => {
        for (const type of ['boss_cybersnail', 'boss_queen', 'sentinel', 'ship_wreckage', 'lore_terminal', 'scatter_gravel']) {
            expect(isEliteEligibleType(type)).toBe(false);
        }
    });
});

describe('rollElitePromotion (D1: the contract roll)', () => {
    const base = { type: 'cybersnail' };

    it('never promotes on ring I, whatever the roll', () => {
        expect(DEPTH_CONTRACT[1].eliteSpawnChance).toBe(0);
        for (const roll of [0, 0.0001, 0.5, 0.99]) {
            expect(rollElitePromotion(1, roll, base)).toBe(false);
        }
    });

    it('promotes below the ring chance and not at or above it', () => {
        const chance = DEPTH_CONTRACT[3].eliteSpawnChance;
        expect(rollElitePromotion(3, chance - 0.001, base)).toBe(true);
        expect(rollElitePromotion(3, chance, base)).toBe(false);
        expect(rollElitePromotion(3, chance + 0.001, base)).toBe(false);
    });

    it('scales with ring depth', () => {
        const roll = 0.2;
        expect(rollElitePromotion(2, roll, base)).toBe(false);
        expect(rollElitePromotion(4, roll, base)).toBe(true);
        expect(rollElitePromotion(5, roll, base)).toBe(true);
    });

    it('refuses ineligible families even on a certain roll', () => {
        expect(rollElitePromotion(5, 0, { type: 'boss_cybersnail' })).toBe(false);
        expect(rollElitePromotion(5, 0, { type: 'sentinel' })).toBe(false);
        expect(rollElitePromotion(5, 0, { type: 'ship_wreckage' })).toBe(false);
    });

    it('refuses bosses, display models and scripted encounter spawns', () => {
        expect(rollElitePromotion(5, 0, { ...base, isBoss: true })).toBe(false);
        expect(rollElitePromotion(5, 0, { ...base, isDisplayModel: true })).toBe(false);
        expect(rollElitePromotion(5, 0, { ...base, isScripted: true })).toBe(false);
    });

    it('is deterministic for the same ring and roll', () => {
        const first = rollElitePromotion(4, 0.19, base);
        const second = rollElitePromotion(4, 0.19, base);
        expect(first).toBe(second);
        expect(first).toBe(true);
    });

    it('clamps an out-of-catalog ring rather than throwing', () => {
        expect(rollElitePromotion(99, 0.25, base)).toBe(true);
        expect(rollElitePromotion(0, 0.0, base)).toBe(false);
    });
});

describe('ELITE_IDENTITY (D2: legible before wounded)', () => {
    it('carries a non-colour cue as well as a tint', () => {
        // Parent plan section 13 item 3: danger must be identifiable by shape,
        // motion or sound, not by colour alone. Silhouette is that cue here;
        // the audio cue is an open follow-up, see eliteEnemies.js.
        expect(ELITE_IDENTITY.scaleMultiplier).toBeGreaterThan(1);
        expect(typeof ELITE_IDENTITY.tint).toBe('number');
    });

    it('makes the promised danger real but bounded', () => {
        expect(ELITE_IDENTITY.hpMultiplier).toBeGreaterThan(1);
        expect(ELITE_IDENTITY.hpMultiplier).toBeLessThanOrEqual(2);
        expect(ELITE_IDENTITY.speedMultiplier).toBeGreaterThan(1);
        expect(ELITE_IDENTITY.speedMultiplier).toBeLessThanOrEqual(1.5);
    });

    it('does not reuse the enrage tint, so the two states stay distinct', () => {
        expect(ELITE_IDENTITY.tint).not.toBe(0xff4a4a);
    });
});
