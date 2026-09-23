import { describe, expect, it } from 'vitest';
import {
    activePackageConsequence,
    applyPackageReward,
    completePackageStep,
    createObjectivePackageState,
    nextPackageStep,
    normalizeObjectivePackageState,
    O2_OBJECTIVE_PACKAGES,
    selectObjectivePackageId
} from './objectivePackages.js';
import { GOAL_COSTS } from './bank.js';

describe('per-campaign O2 objective packages', () => {
    it('rolls one package per world seed, all three across campaigns', () => {
        const seen = new Set();
        for (let seed = 1; seed <= 60; seed += 1) {
            expect(selectObjectivePackageId(seed)).toBe(selectObjectivePackageId(seed));
            seen.add(selectObjectivePackageId(seed));
        }
        expect([...seen].sort()).toEqual(Object.keys(O2_OBJECTIVE_PACKAGES).sort());
    });

    it('gives each package a different route, reward and consequence', () => {
        const fingerprints = new Set(Object.values(O2_OBJECTIVE_PACKAGES).map((entry) => JSON.stringify([
            entry.steps.map((step) => step.site), entry.reward, entry.consequence.kind
        ])));
        expect(fingerprints.size).toBe(3);
        for (const entry of Object.values(O2_OBJECTIVE_PACKAGES)) expect(entry.goalKey).toBe('o2Bubble');
    });

    it('takes steps in order and only then pays out', () => {
        let state = { ...createObjectivePackageState(1), packageId: 'power_reroute' };
        expect(nextPackageStep(state).id).toBe('reroute_gate_power');
        expect(completePackageStep(state, 'restart_o2_room').advanced).toBe(false);
        expect(applyPackageReward(GOAL_COSTS.o2Bubble, state, 'o2Bubble')).toBe(GOAL_COSTS.o2Bubble);
        state = completePackageStep(state, 'reroute_gate_power').state;
        expect(state.completed).toBe(false);
        const last = completePackageStep(state, 'restart_o2_room');
        expect(last).toMatchObject({ advanced: true, completedNow: true });
        state = last.state;
        expect(nextPackageStep(state)).toBeNull();
        expect(applyPackageReward(GOAL_COSTS.o2Bubble, state, 'o2Bubble')).toEqual({});
        expect(applyPackageReward(GOAL_COSTS.hullExpansion, state, 'hullExpansion')).toBe(GOAL_COSTS.hullExpansion);
        expect(activePackageConsequence(state)).toEqual({ kind: 'ring1_blackout' });
    });

    it('halves the build for the regulator and the supply deal, in whole units', () => {
        for (const packageId of ['regulator_recovery', 'camp_supply']) {
            const [step] = O2_OBJECTIVE_PACKAGES[packageId].steps;
            const done = completePackageStep({ ...createObjectivePackageState(1), packageId }, step.id).state;
            expect(applyPackageReward({ tech: 10, med: 5, coin: 5 }, done, 'o2Bubble')).toEqual({ tech: 5, med: 3, coin: 3 });
        }
    });

    it('restores saved progress and rejects malformed saves', () => {
        const saved = { version: 1, packageId: 'power_reroute', completedSteps: ['reroute_gate_power', 'bogus', 'reroute_gate_power'], completed: true };
        expect(normalizeObjectivePackageState(saved, 5)).toEqual({
            version: 1, packageId: 'power_reroute', completedSteps: ['reroute_gate_power'], completed: false
        });
        expect(normalizeObjectivePackageState({ version: 9, packageId: 'x' }, 5)).toEqual(createObjectivePackageState(5));
        expect(normalizeObjectivePackageState(null, 5).packageId).toBe(selectObjectivePackageId(5));
    });
});
