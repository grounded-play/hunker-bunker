import { describe, expect, it } from 'vitest';
import {
    MYSTERY_BOX_KINDS, MYSTERY_OUTCOMES, mysteryBoxChance, mysteryOpenSeconds, pickMysteryBoxKind, rollMysteryOutcome, seededRandom
} from './mysteryBoxes.js';

// Sprint 53 V6 (owner-approved roll table: supplies 40, salvage 25, lore 15,
// ambush 10, hazard 5, quest hook 5).
describe('mystery boxes', () => {
    const share = (kind, n = 40000) => {
        const random = seededRandom(1234);
        const counts = Object.fromEntries(MYSTERY_OUTCOMES.map((o) => [o, 0]));
        for (let i = 0; i < n; i++) counts[rollMysteryOutcome(kind, random)] += 1;
        return Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v / n]));
    };

    it('rolls the approved table for an ordinary courier case', () => {
        const s = share('courier');
        expect(s.supplies).toBeCloseTo(0.40, 1);
        expect(s.salvage).toBeCloseTo(0.25, 1);
        expect(s.lore).toBeCloseTo(0.15, 1);
        expect(s.ambush).toBeCloseTo(0.10, 1);
        expect(s.hazard).toBeCloseTo(0.05, 1);
        expect(s.quest_hook).toBeCloseTo(0.05, 1);
    });

    it('a quarantine crate is the risky one; a black-site lockbox never bites', () => {
        const q = share('quarantine');
        expect(q.ambush + q.hazard).toBeGreaterThan(0.5);
        const b = share('blacksite');
        expect(b.ambush + b.hazard).toBe(0);
        expect(b.salvage).toBeGreaterThan(0.35);
    });

    it('a reliquary pod leans to lore and leads', () => {
        const r = share('reliquary');
        expect(r.lore + r.quest_hook).toBeGreaterThan(0.45);
    });

    it('is deterministic for a seed, so co-op screens agree', () => {
        expect(rollMysteryOutcome('courier', seededRandom(77))).toBe(rollMysteryOutcome('courier', seededRandom(77)));
        expect(pickMysteryBoxKind('bio', seededRandom(5))).toBe(pickMysteryBoxKind('bio', seededRandom(5)));
    });

    it('picks kinds by biome: reliquary pods only in the bio ring', () => {
        const kinds = (biome) => new Set(Array.from({ length: 400 }, (_, i) => pickMysteryBoxKind(biome, seededRandom(i + 1))));
        expect(kinds('bio').has('reliquary')).toBe(true);
        expect(kinds('active').has('reliquary')).toBe(false);
        expect(kinds('active').has('blacksite')).toBe(true);
    });

    it('opens faster for an Engineer, slower for a locked lockbox', () => {
        expect(mysteryOpenSeconds('courier', 'ENGINEER')).toBeLessThan(mysteryOpenSeconds('courier', 'TANK'));
        expect(mysteryOpenSeconds('blacksite', 'TANK')).toBeGreaterThan(mysteryOpenSeconds('courier', 'TANK'));
        expect(MYSTERY_BOX_KINDS.blacksite.needsKeycard).toBe(true);
    });

    it('places a box in roughly one room in six', () => {
        expect(mysteryBoxChance(0)).toBeGreaterThan(0.1);
        expect(mysteryBoxChance(0)).toBeLessThan(0.25);
        expect(mysteryBoxChance(5)).toBeGreaterThan(mysteryBoxChance(0));
    });
});
