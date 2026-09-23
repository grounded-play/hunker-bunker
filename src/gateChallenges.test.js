import { describe, expect, it } from 'vitest';
import { GATE_CHALLENGES, planGateChallenges } from './gateChallenges.js';
import { buildWorldPlan } from './ringManifest.js';
import { generateRadialMazeExpedition, ROUTE_LAYOUT_VERSION } from './mazeExpedition.js';

const planFor = (seed) => buildWorldPlan(generateRadialMazeExpedition(seed, { layoutVersion: ROUTE_LAYOUT_VERSION }));

describe('per-campaign gate challenges', () => {
    it('gives every ring gate its own challenge, fixed for the campaign', () => {
        const plan = planFor(8128);
        const challenges = planGateChallenges(plan);
        expect(challenges.map((entry) => entry.ring)).toEqual([1, 2, 3, 4]);
        expect(new Set(challenges.map((entry) => entry.challenge)).size).toBe(4);
        expect(planGateChallenges(planFor(8128))).toEqual(challenges);
        for (const entry of challenges) {
            expect(Object.values(GATE_CHALLENGES)).toContain(entry.challenge);
            expect(entry.approachChunkKeys[0]).toBe(entry.gateChunkKey);
            expect(entry.approachChunkKeys.length).toBeGreaterThanOrEqual(2);
            for (const key of entry.approachChunkKeys) expect(plan.topology.spineChunkKeys).toContain(key);
        }
    });

    it('keeps each gate recognisable but changes how it is held between campaigns', () => {
        const byRing = new Map([[1, new Set()], [2, new Set()], [3, new Set()], [4, new Set()]]);
        for (let seed = 1; seed <= 16; seed += 1) {
            const plan = planFor(seed);
            const bridge = plan.ringCrossings.find((crossing) => crossing.ring === 2);
            expect(bridge.opensTraversal).toBe('bridge');
            for (const entry of planGateChallenges(plan)) byRing.get(entry.ring).add(entry.challenge);
        }
        for (const [ring, seen] of byRing) expect(seen.size, `ring ${ring}`).toBeGreaterThanOrEqual(3);
    });

    it('plans nothing without crossings', () => {
        expect(planGateChallenges(null)).toEqual([]);
        expect(planGateChallenges({ seed: 1, ringCrossings: [] })).toEqual([]);
    });
});
