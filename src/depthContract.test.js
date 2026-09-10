import { describe, expect, it } from 'vitest';
import {
    DEPTH_CONTRACT,
    MIN_RING,
    MAX_RING,
    getDepthContract,
    applySalvageMultiplier,
    rollsElite,
    rollsRareRelic,
    applyO2EfficiencyPenalty,
    describeCrossing,
    formatCrossingDeltaSummary
} from './depthContract.js';

// docs/design/one-more-ring-design-pillars.md item 1: the Depth Contract is
// the first concrete build target from the sprint25.checkin.md design pass
// -- pure data/logic only, no HUD/audio wiring yet. These tests establish
// the contract each ring makes (deeper = more reward AND more danger,
// monotonically) since that invariant is the entire point of the mechanic.
describe('depthContract', () => {
    it('is monotonically non-decreasing in every "goes up with depth" field across all known rings', () => {
        for (let ring = MIN_RING; ring < MAX_RING; ring++) {
            const current = getDepthContract(ring);
            const next = getDepthContract(ring + 1);
            expect(next.salvageMultiplier).toBeGreaterThan(current.salvageMultiplier);
            expect(next.eliteSpawnChance).toBeGreaterThanOrEqual(current.eliteSpawnChance);
            expect(next.rareRelicChance).toBeGreaterThanOrEqual(current.rareRelicChance);
            expect(next.o2EfficiencyPenalty).toBeGreaterThanOrEqual(current.o2EfficiencyPenalty);
            expect(next.directorAggressionBonus).toBeGreaterThanOrEqual(current.directorAggressionBonus);
        }
    });

    it('ring 1 is the neutral baseline (no bonus, no penalty)', () => {
        const ring1 = getDepthContract(1);
        expect(ring1.salvageMultiplier).toBe(1.0);
        expect(ring1.eliteSpawnChance).toBe(0);
        expect(ring1.rareRelicChance).toBe(0);
        expect(ring1.o2EfficiencyPenalty).toBe(0);
    });

    it('clamps below-range and above-range ring numbers to the known catalog instead of returning undefined', () => {
        expect(getDepthContract(0)).toBe(DEPTH_CONTRACT[MIN_RING]);
        expect(getDepthContract(-5)).toBe(DEPTH_CONTRACT[MIN_RING]);
        expect(getDepthContract(99)).toBe(DEPTH_CONTRACT[MAX_RING]);
    });

    it('rounds a fractional ring value to the nearest known ring', () => {
        expect(getDepthContract(2.4)).toBe(DEPTH_CONTRACT[2]);
        expect(getDepthContract(2.6)).toBe(DEPTH_CONTRACT[3]);
    });

    it('applySalvageMultiplier scales the base value by the ring multiplier', () => {
        expect(applySalvageMultiplier(100, 1)).toBe(100);
        expect(applySalvageMultiplier(100, 3)).toBeCloseTo(160, 5);
    });

    it('rollsElite/rollsRareRelic compare the roll against the ring chance, not always-true/always-false', () => {
        expect(rollsElite(1, 0.01)).toBe(false); // ring 1 has zero elite chance
        expect(rollsElite(3, 0.05)).toBe(true);  // ring 3 chance is 0.15
        expect(rollsElite(3, 0.5)).toBe(false);
        expect(rollsRareRelic(5, 0.1)).toBe(true); // ring 5 chance is 0.3
        expect(rollsRareRelic(5, 0.9)).toBe(false);
    });

    it('applyO2EfficiencyPenalty reduces efficiency proportionally to the ring penalty', () => {
        expect(applyO2EfficiencyPenalty(1.0, 1)).toBe(1.0);
        expect(applyO2EfficiencyPenalty(1.0, 4)).toBeCloseTo(0.85, 5);
    });

    it('describeCrossing reports only the delta between two rings, in the direction of travel', () => {
        const crossing = describeCrossing(1, 2);
        expect(crossing.label).toBe('RING II');
        expect(crossing.salvageMultiplierDelta).toBeCloseTo(0.25, 5);
        expect(crossing.eliteSpawnChanceDelta).toBeCloseTo(0.08, 5);
    });

    it('describeCrossing produces negative deltas for a retreat (deeper -> shallower)', () => {
        const retreat = describeCrossing(3, 1);
        expect(retreat.salvageMultiplierDelta).toBeLessThan(0);
        expect(retreat.o2EfficiencyPenaltyDelta).toBeLessThanOrEqual(0);
    });
});

// docs/planning/depth-01-elite-and-relic-lane-2026-09-09.md D3: the crossing
// summary previously lived as a private, untested function in main.js and
// omitted the one field with no consumer. Now that eliteSpawnChance is
// connected, the announcement can honestly include it.
describe('formatCrossingDeltaSummary', () => {
    it('says nothing when nothing changed', () => {
        expect(formatCrossingDeltaSummary(describeCrossing(1, 1))).toBe('');
        expect(formatCrossingDeltaSummary(null)).toBe('');
        expect(formatCrossingDeltaSummary(undefined)).toBe('');
    });

    it('announces the elite chance the game now actually rolls', () => {
        const summary = formatCrossingDeltaSummary(describeCrossing(1, 2));
        expect(summary).toContain('ELITE');
        expect(summary).toContain('+8%');
    });

    it('reports every changed term of the bet', () => {
        const summary = formatCrossingDeltaSummary(describeCrossing(2, 3));
        expect(summary).toContain('SALVAGE');
        expect(summary).toContain('O2 EFFICIENCY');
        expect(summary).toContain('DIRECTOR PRESSURE');
        expect(summary).toContain('RARE SALVAGE ODDS');
        expect(summary).toContain('ELITE');
    });

    it('shows the O2 penalty as the loss it is', () => {
        // o2EfficiencyPenaltyDelta is positive when things get worse, so the
        // player-facing number is negated.
        expect(formatCrossingDeltaSummary(describeCrossing(1, 2))).toContain('O2 EFFICIENCY -5%');
    });

    it('keeps the leading separator so callers can append it to a label', () => {
        expect(formatCrossingDeltaSummary(describeCrossing(1, 2)).startsWith(' // ')).toBe(true);
    });
});
