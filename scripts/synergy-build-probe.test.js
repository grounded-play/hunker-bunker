import { describe, expect, it } from 'vitest';
import { runEncounterSimulation } from './synergy-build-probe.js';

describe('Sprint 47 Lane 3: Wild Build Probes', () => {
    it('Cryo Shatter measurably reduces shots-to-kill on standard pack by 80%', () => {
        const baseline = runEncounterSimulation('baseline');
        const cryo = runEncounterSimulation('cryo_shatter');

        expect(baseline.shotsFired).toBe(15);
        expect(baseline.enemiesKilled).toBe(5);
        expect(baseline.totalDirectDamage).toBe(60);
        expect(baseline.totalElementalDamage).toBe(0);
        expect(baseline.timeToClearSeconds).toBeCloseTo(3.15, 1);

        // Cryo Shatter nova eliminates remaining pack members on first target death
        expect(cryo.shotsFired).toBe(3);
        expect(cryo.enemiesKilled).toBe(5);
        expect(cryo.totalDirectDamage).toBe(12);
        expect(cryo.totalElementalDamage).toBe(100); // 4 enemies * 25 shatter dmg
        expect(cryo.timeToClearSeconds).toBeCloseTo(0.5, 1);

        // Shots to kill reduced by 12 (from 15 to 3)
        expect(cryo.shotsFired).toBeLessThan(baseline.shotsFired);
        const reductionPercent = ((baseline.shotsFired - cryo.shotsFired) / baseline.shotsFired) * 100;
        expect(reductionPercent).toBe(80);
    });

    it('Bio Predator measurably refunds vitals (+40 O2, +2 hearts) on pack clear', () => {
        const baseline = runEncounterSimulation('baseline');
        const bio = runEncounterSimulation('bio_predator');

        expect(baseline.o2RestoredTotal).toBe(0);
        expect(baseline.heartsRestoredTotal).toBe(0);

        // 5 bio enemies killed * 8 O2 restore = 40 O2 restored
        expect(bio.o2RestoredTotal).toBe(40);
        // Player started with hp: 2, maxHp: 4; capped at 4, so +2 hearts restored
        expect(bio.heartsRestoredTotal).toBe(2);
        expect(bio.enemiesKilled).toBe(5);
    });

    it('Bio Predator saves shots on extended engagements where corrosion ticks', () => {
        // With higher shot interval (0.75s between shots), corrosion deals 1 dmg per tick
        const baselineSlow = runEncounterSimulation('baseline', { shotInterval: 0.75, shotDamage: 4 });
        const bioSlow = runEncounterSimulation('bio_predator', { shotInterval: 0.75, shotDamage: 4 });

        // On 10 HP targets:
        // Baseline takes 3 shots per enemy (4 + 4 + 4 = 12) = 15 shots total
        expect(baselineSlow.shotsFired).toBe(15);

        // With Bio Predator:
        // Shot 1 deals 4 dmg, corrosion ticks. At t=0.75s, 1 corrosion tick has dealt 1 dmg (HP: 5).
        // Shot 2 deals 4 dmg (HP: 1). At t=1.0s, corrosion tick deals 1 dmg (HP: 0) -> enemy dies in 2 shots!
        // 5 enemies * 2 shots = 10 shots total!
        expect(bioSlow.shotsFired).toBe(10);
        expect(bioSlow.totalElementalDamage).toBe(10); // 2 corrosion ticks * 5 enemies = 10 elemental dmg
        expect(bioSlow.shotsFired).toBeLessThan(baselineSlow.shotsFired);
        expect(bioSlow.o2RestoredTotal).toBe(40);
    });
});
