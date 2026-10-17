import { describe, expect, it } from 'vitest';
import { CHITIN_SCUTTLER, planScuttlerPack, scuttlerTuning } from './chitinScuttler.js';

const grid = (n) => Array.from({ length: n }, (_, i) => ({ x: (i % 4) * 1.5, z: Math.floor(i / 4) * 1.5 }));

describe('chitin scuttler (AAA plan §6.2, built end to end)', () => {
    it('is a faster, twitchier crawler: shorter wind-up, faster charge, quicker recovery', () => {
        const tuning = scuttlerTuning();
        expect(tuning.windup).toBeLessThan(0.35);
        expect(tuning.chargeSpeed).toBeGreaterThan(7);
        expect(tuning.attackCooldown).toBeLessThan(1.5);
        expect(CHITIN_SCUTTLER.maxHp).toBe(1);
    });

    it('plans a pack of up to three from nearby eligible floor points, deterministically', () => {
        const base = { depthTier: 2, biomeHasCrawlers: false, candidates: grid(12) };
        let hits = 0;
        for (let seed = 0; seed < 400; seed++) {
            const pack = planScuttlerPack({ ...base, seed });
            expect(pack).toEqual(planScuttlerPack({ ...base, seed }));
            if (!pack.length) continue;
            hits += 1;
            expect(pack.length).toBeGreaterThanOrEqual(2);
            expect(pack.length).toBeLessThanOrEqual(CHITIN_SCUTTLER.packSize);
            const [leader, ...mates] = pack;
            for (const mate of mates) expect(Math.hypot(mate.x - leader.x, mate.z - leader.z)).toBeLessThanOrEqual(CHITIN_SCUTTLER.packRadius);
        }
        // Roughly the authored per-chunk chance.
        expect(hits / 400).toBeGreaterThan(CHITIN_SCUTTLER.packChance - 0.1);
        expect(hits / 400).toBeLessThan(CHITIN_SCUTTLER.packChance + 0.1);
    });

    it('stays out of shallow depth, crawler biomes, and lone points', () => {
        for (let seed = 0; seed < 200; seed++) {
            expect(planScuttlerPack({ seed, depthTier: 1, biomeHasCrawlers: false, candidates: grid(12) })).toEqual([]);
            expect(planScuttlerPack({ seed, depthTier: 3, biomeHasCrawlers: true, candidates: grid(12) })).toEqual([]);
            expect(planScuttlerPack({ seed, depthTier: 3, biomeHasCrawlers: false, candidates: [{ x: 0, z: 0 }] })).toEqual([]);
            expect(planScuttlerPack({ seed, depthTier: 3, biomeHasCrawlers: false, candidates: [{ x: 0, z: 0 }, { x: 40, z: 40 }] })).toEqual([]);
        }
    });
});
