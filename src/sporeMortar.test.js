import { describe, expect, it } from 'vitest';
import { SPORE_MORTAR, planSporeMortarPlacements, sporeMortarTuning } from './sporeMortar.js';

describe('sporeMortar data & placement', () => {
    it('defines expected artillery sentry stats and tuning', () => {
        expect(SPORE_MORTAR.type).toBe('spore_mortar');
        expect(SPORE_MORTAR.maxHp).toBe(6);
        expect(SPORE_MORTAR.speed).toBe(0.0);
        expect(SPORE_MORTAR.minRange).toBe(3.5);
        expect(SPORE_MORTAR.maxRange).toBe(18.0);
        expect(SPORE_MORTAR.directDamage).toBe(2);

        const tuning = sporeMortarTuning();
        expect(tuning.minRange).toBe(3.5);
        expect(tuning.maxRange).toBe(18.0);
        expect(tuning.chargeDuration).toBe(0.75);
        expect(tuning.cooldown).toBe(3.6);
        expect(tuning.lobDuration).toBe(1.15);
    });

    it('requires tier 2+ and bio biome to plan spawns', () => {
        const candidates = [
            { x: 10, z: 10 },
            { x: 11, z: 10 },
            { x: 12, z: 10 },
            { x: 13, z: 10 },
            { x: 14, z: 10 }
        ];

        // Shallow tier -> no spawn
        expect(planSporeMortarPlacements({ seed: 42, depthTier: 1, biomeKey: 'bio', candidates })).toEqual([]);

        // Non-bio biome -> no spawn
        expect(planSporeMortarPlacements({ seed: 42, depthTier: 2, biomeKey: 'cryo', candidates })).toEqual([]);
        expect(planSporeMortarPlacements({ seed: 42, depthTier: 2, biomeKey: 'active', candidates })).toEqual([]);

        // Too few candidates -> no spawn
        expect(planSporeMortarPlacements({ seed: 42, depthTier: 2, biomeKey: 'bio', candidates: [{ x: 1, z: 1 }] })).toEqual([]);
    });

    it('is deterministic for the same seed', () => {
        const candidates = Array.from({ length: 10 }, (_, i) => ({ x: i * 2, z: i * 2 }));
        const resA = planSporeMortarPlacements({ seed: 99999, depthTier: 2, biomeKey: 'bio', candidates });
        const resB = planSporeMortarPlacements({ seed: 99999, depthTier: 2, biomeKey: 'bio', candidates });
        expect(resA).toEqual(resB);
    });
});
