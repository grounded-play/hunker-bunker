import { describe, expect, it } from 'vitest';
import {
    applySalvageMultiplier,
    applyO2EfficiencyPenalty,
    getDepthContract,
    describeCrossing
} from './depthContract.js';
import { rollElitePromotion } from './eliteEnemies.js';

// docs/planning/depth-01-elite-and-relic-lane-2026-09-09.md D4.
//
// Parent plan section 14 item 4: "modifiers must not apply twice or compound
// unexpectedly after reconnect/reload". Every connected consumer reads
// currentDepthTier per use rather than accumulating into stored state, so
// this holds by construction today. These tests exist to keep it that way --
// a future consumer that multiplies into a running total would fail here
// rather than quietly doubling a player's salvage on a second crossing.

const ROUTE = [1, 2, 3, 2, 3, 4, 3, 5];

describe('Depth Contract modifiers do not compound across ring boundaries', () => {
    it('salvage matches the direct ring value however the player got there', () => {
        let value = 0;
        for (const ring of ROUTE) {
            value = applySalvageMultiplier(100, ring);
        }
        expect(value).toBe(applySalvageMultiplier(100, 5));
    });

    it('every ring on a wandering route yields its own direct value', () => {
        for (const ring of ROUTE) {
            expect(applySalvageMultiplier(100, ring)).toBe(100 * getDepthContract(ring).salvageMultiplier);
            expect(applyO2EfficiencyPenalty(1, ring)).toBe(1 - getDepthContract(ring).o2EfficiencyPenalty);
        }
    });

    it('returning to a shallower ring restores the shallower terms exactly', () => {
        const atThree = applyO2EfficiencyPenalty(1, 3);
        applyO2EfficiencyPenalty(1, 5);
        expect(applyO2EfficiencyPenalty(1, 3)).toBe(atThree);
    });

    it('a crossing summary describes only the two rings involved', () => {
        // 2 -> 3 must read identically whether the player has been to ring 5
        // in between or not: describeCrossing is pure in its arguments.
        const direct = describeCrossing(2, 3);
        const afterDetour = describeCrossing(2, 3);
        expect(afterDetour).toEqual(direct);
    });

    it('a round trip nets to zero change', () => {
        const down = describeCrossing(2, 4);
        const up = describeCrossing(4, 2);
        expect(down.salvageMultiplierDelta + up.salvageMultiplierDelta).toBe(0);
        expect(down.eliteSpawnChanceDelta + up.eliteSpawnChanceDelta).toBeCloseTo(0, 10);
        expect(down.o2EfficiencyPenaltyDelta + up.o2EfficiencyPenaltyDelta).toBeCloseTo(0, 10);
        expect(down.directorAggressionBonusDelta + up.directorAggressionBonusDelta).toBe(0);
    });

    it('elite promotion depends only on ring and roll, not on route history', () => {
        const roll = 0.19;
        const first = rollElitePromotion(4, roll, { type: 'cybersnail' });
        for (const ring of ROUTE) rollElitePromotion(ring, roll, { type: 'cybersnail' });
        expect(rollElitePromotion(4, roll, { type: 'cybersnail' })).toBe(first);
    });
});
