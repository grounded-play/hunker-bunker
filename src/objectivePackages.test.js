import { describe, expect, it } from 'vitest';
import {
    activePackageConsequence,
    activePackageConsequences,
    applyPackageReward,
    completePackageStep,
    createObjectivePackageState,
    nextPackageStep,
    normalizeObjectivePackageState,
    OBJECTIVE_PACKAGES,
    PACKAGE_GOAL_ORDER,
    packagesForGoal,
    selectObjectivePackageId
} from './objectivePackages.js';
import { GOAL_COSTS } from './bank.js';
import { MANDATORY_SHIP_GOALS } from './ringManifest.js';
import { RADIAL_SITE_RULES } from './mazeExpedition.js';

const complete = (state, goalKey) => {
    let current = state;
    let step = nextPackageStep(current, goalKey);
    while (step) {
        current = completePackageStep(current, goalKey, step.id).state;
        step = nextPackageStep(current, goalKey);
    }
    return current;
};

describe('per-campaign objective packages for every ship goal', () => {
    it('offers three distinct packages for each of the four goals', () => {
        for (const goalKey of PACKAGE_GOAL_ORDER) {
            const options = packagesForGoal(goalKey);
            expect(options, goalKey).toHaveLength(3);
            const fingerprints = new Set(options.map((entry) => JSON.stringify([
                entry.steps.map((step) => step.site.key), entry.reward, entry.consequence
            ])));
            expect(fingerprints.size, goalKey).toBe(3);
        }
    });

    it('routes every package through places that exist in its goal\'s ring', () => {
        for (const entry of Object.values(OBJECTIVE_PACKAGES)) {
            const ring = MANDATORY_SHIP_GOALS.find((goal) => goal.goalKey === entry.goalKey).ring;
            for (const { site } of entry.steps) {
                if (site.kind === 'goal_room') expect(site.goalKey, entry.id).toBe(entry.goalKey);
                if (site.kind === 'gate_control') expect(site.ring, entry.id).toBe(ring);
                if (site.kind === 'camp') expect(RADIAL_SITE_RULES[site.campId]?.ring, entry.id).toBe(ring);
                if (site.kind === 'hive_nursery') expect(RADIAL_SITE_RULES[site.hiveId]?.ring, entry.id).toBe(ring);
            }
            if (entry.consequence.ring) expect(entry.consequence.ring, entry.id).toBe(ring);
        }
    });

    it('rolls each goal independently and covers every package across campaigns', () => {
        const seen = new Set();
        for (let seed = 1; seed <= 80; seed += 1) {
            for (const goalKey of PACKAGE_GOAL_ORDER) {
                const id = selectObjectivePackageId(seed, goalKey);
                expect(selectObjectivePackageId(seed, goalKey)).toBe(id);
                expect(OBJECTIVE_PACKAGES[id].goalKey).toBe(goalKey);
                seen.add(id);
            }
        }
        expect([...seen].sort()).toEqual(Object.keys(OBJECTIVE_PACKAGES).sort());
    });

    it('takes steps in order and only then pays out, per goal', () => {
        let state = createObjectivePackageState(1);
        state.goals.radarNode = { packageId: 'mast_power_reroute', completedSteps: [], completed: false };
        expect(nextPackageStep(state, 'radarNode').id).toBe('tap_gate_power');
        expect(completePackageStep(state, 'radarNode', 'align_radar_mast').advanced).toBe(false);
        state = completePackageStep(state, 'radarNode', 'tap_gate_power').state;
        expect(applyPackageReward(GOAL_COSTS.radarNode, state, 'radarNode')).toBe(GOAL_COSTS.radarNode);
        const last = completePackageStep(state, 'radarNode', 'align_radar_mast');
        expect(last).toMatchObject({ advanced: true, completedNow: true });
        state = last.state;
        expect(applyPackageReward(GOAL_COSTS.radarNode, state, 'radarNode')).toEqual({});
        expect(applyPackageReward(GOAL_COSTS.hullExpansion, state, 'hullExpansion')).toBe(GOAL_COSTS.hullExpansion);
        expect(activePackageConsequence(state, 'radarNode')).toEqual({ kind: 'gate_blackout', ring: 3 });
        expect(activePackageConsequence(state, 'hullExpansion')).toBeNull();
    });

    it('halves or frees each goal\'s build in whole units, and lists every consequence carried', () => {
        let state = createObjectivePackageState(1);
        state.goals.hullExpansion = { packageId: 'tallow_resin_seal', completedSteps: [], completed: false };
        state.goals.reactorCompressor = { packageId: 'carapace_heat_siphon', completedSteps: [], completed: false };
        state = complete(complete(state, 'hullExpansion'), 'reactorCompressor');
        expect(applyPackageReward(GOAL_COSTS.hullExpansion, state, 'hullExpansion')).toEqual({ tech: 25, med: 10 });
        expect(applyPackageReward(GOAL_COSTS.reactorCompressor, state, 'reactorCompressor')).toEqual({});
        expect(activePackageConsequences(state)).toEqual([
            { kind: 'camp_strained', campId: 'camp_tallow', bond: 1 },
            { kind: 'hive_creep', hiveId: 'hive_carapace', rings: 1 }
        ]);
    });

    it('restores saved progress, carries version-1 O2 saves forward and rejects malformed ones', () => {
        const legacy = { version: 1, packageId: 'power_reroute', completedSteps: ['reroute_gate_power'], completed: false };
        const upgraded = normalizeObjectivePackageState(legacy, 5);
        expect(upgraded.version).toBe(2);
        expect(upgraded.goals.o2Bubble).toEqual({ packageId: 'power_reroute', completedSteps: ['reroute_gate_power'], completed: false });
        expect(upgraded.goals.hullExpansion.packageId).toBe(selectObjectivePackageId(5, 'hullExpansion'));
        const saved = createObjectivePackageState(5);
        saved.goals.radarNode = { packageId: 'hull_plate_salvage', completedSteps: [], completed: true };
        expect(normalizeObjectivePackageState(saved, 5).goals.radarNode.packageId).toBe(selectObjectivePackageId(5, 'radarNode'));
        expect(normalizeObjectivePackageState({ version: 9 }, 5)).toEqual(createObjectivePackageState(5));
        expect(normalizeObjectivePackageState(null, 5)).toEqual(createObjectivePackageState(5));
    });
});
