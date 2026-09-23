import { describe, expect, it } from 'vitest';
import {
    RING_CROSSING_STAGE_IDS,
    describeRingCrossingStages,
    describeShipGoalSteps,
    getShipGoalPrerequisite,
    getShipGoalAnchor,
    summarizeRingCrossing,
    summarizeRingRoute
} from './ringCrossingStages.js';
import { MANDATORY_SHIP_GOALS } from './ringManifest.js';
import { RING_CROSSING_STATES } from './ringCrossings.js';

const plan = {
    ringCrossings: [
        {
            id: 'cross_1',
            ring: 1,
            requirements: { previousCrossingId: null, goalKey: 'o2Bubble', missionId: 'mission_1', milestoneId: 'boss_1' }
        },
        {
            id: 'cross_2',
            ring: 2,
            requirements: { previousCrossingId: 'cross_1', goalKey: 'hullExpansion', missionId: 'mission_2', milestoneId: null }
        }
    ]
};

const state = {
    crossings: {
        cross_1: {
            id: 'cross_1',
            status: RING_CROSSING_STATES.BOSS_PENDING,
            goalBuilt: true,
            missionComplete: true,
            bossDefeated: false,
            previousCrossingOpen: true
        },
        cross_2: {
            id: 'cross_2',
            status: RING_CROSSING_STATES.LOCKED,
            goalBuilt: false,
            missionComplete: false,
            bossDefeated: false,
            previousCrossingOpen: false
        }
    }
};

describe('ship goal anchors', () => {
    it('resolves every authored ring goal to its console anchor', () => {
        for (const goal of MANDATORY_SHIP_GOALS) {
            const anchor = getShipGoalAnchor(goal.goalKey);
            expect(anchor).toMatchObject({
                goalKey: goal.goalKey,
                ring: goal.ring,
                anchorId: goal.objectiveAnchorId
            });
        }
    });

    it('covers the four rings in order without inventing names', () => {
        expect(MANDATORY_SHIP_GOALS.map((g) => g.goalKey))
            .toEqual(['o2Bubble', 'hullExpansion', 'radarNode', 'reactorCompressor']);
        expect(getShipGoalAnchor('causewayBridge')).toBe(null);
    });
});

describe('crossing stages', () => {
    it('lists the conditions in the order they actually fall', () => {
        const stages = describeRingCrossingStages(plan, state, 'cross_2');
        expect(stages.map((s) => s.id)).toEqual([
            RING_CROSSING_STAGE_IDS.PREVIOUS,
            RING_CROSSING_STAGE_IDS.GOAL,
            RING_CROSSING_STAGE_IDS.MISSION
        ]);
    });

    it('omits stages the plan does not define rather than showing an unmeetable one', () => {
        // cross_1 has no previous crossing; cross_2 has no milestone boss.
        expect(describeRingCrossingStages(plan, state, 'cross_1').map((s) => s.id))
            .not.toContain(RING_CROSSING_STAGE_IDS.PREVIOUS);
        expect(describeRingCrossingStages(plan, state, 'cross_2').map((s) => s.id))
            .not.toContain(RING_CROSSING_STAGE_IDS.BOSS);
    });

    it('reports what is done from live state, and points the goal stage at its console', () => {
        const stages = describeRingCrossingStages(plan, state, 'cross_1');
        const goal = stages.find((s) => s.id === RING_CROSSING_STAGE_IDS.GOAL);
        expect(goal.done).toBe(true);
        expect(goal.anchor.anchorId).toBe('o2_control');
        expect(stages.find((s) => s.id === RING_CROSSING_STAGE_IDS.BOSS).done).toBe(false);
    });

    it('summarizes progress and names the next unmet stage', () => {
        const summary = summarizeRingCrossing(plan, state, 'cross_1');
        expect(summary).toMatchObject({ completed: 2, total: 3, status: RING_CROSSING_STATES.BOSS_PENDING });
        expect(summary.next.id).toBe(RING_CROSSING_STAGE_IDS.BOSS);
    });

    it('reports no next stage once every condition is met', () => {
        const open = {
            crossings: {
                cross_1: { status: RING_CROSSING_STATES.OPEN, goalBuilt: true, missionComplete: true, bossDefeated: true, previousCrossingOpen: true }
            }
        };
        expect(summarizeRingCrossing(plan, open, 'cross_1').next).toBe(null);
    });

    it('leads the route with the crossing the player is working on', () => {
        const route = summarizeRingRoute(plan, state);
        expect(route.crossings).toHaveLength(2);
        expect(route.active.crossingId).toBe('cross_1');
    });

    it('is inert for unknown crossings and empty plans', () => {
        expect(describeRingCrossingStages(plan, state, 'nope')).toEqual([]);
        expect(describeRingCrossingStages(null, null, 'cross_1')).toEqual([]);
        expect(summarizeRingRoute(null, null)).toEqual({ crossings: [], active: null });
    });

    it('treats a missing live record as nothing done, never as done', () => {
        const stages = describeRingCrossingStages(plan, { crossings: {} }, 'cross_1');
        expect(stages.every((stage) => stage.done === false)).toBe(true);
    });
});

describe('ship goal sub-steps', () => {
    it('derives the prerequisite from the authored ring order', () => {
        expect(getShipGoalPrerequisite('o2Bubble')).toBe(null);
        expect(getShipGoalPrerequisite('hullExpansion').goalKey).toBe('o2Bubble');
        expect(getShipGoalPrerequisite('reactorCompressor').goalKey).toBe('radarNode');
        expect(getShipGoalPrerequisite('nonsense')).toBe(null);
    });

    it('authors only steps that something can actually mark done', () => {
        const steps = describeShipGoalSteps('hullExpansion', { built: false, canAfford: false, prereqBuilt: false });
        expect(steps.map((s) => s.id)).toEqual(['prerequisite', 'resources', 'install']);
        expect(steps.every((s) => s.done === false)).toBe(true);
        // The install step points at the console the player has to reach.
        expect(steps.at(-1).anchorId).toBe('hull_fabrication_console');
    });

    it('drops the prerequisite step for the first ring, which has none', () => {
        expect(describeShipGoalSteps('o2Bubble').map((s) => s.id)).toEqual(['resources', 'install']);
    });

    it('ticks resources once the parts are banked, and stays ticked after building', () => {
        const affordable = describeShipGoalSteps('o2Bubble', { canAfford: true });
        expect(affordable.find((s) => s.id === 'resources').done).toBe(true);
        expect(affordable.find((s) => s.id === 'install').done).toBe(false);

        const done = describeShipGoalSteps('o2Bubble', { built: true, canAfford: false });
        expect(done.every((s) => s.done)).toBe(true);
    });

    it('hangs the sub-steps off the goal stage of a crossing', () => {
        const stages = describeRingCrossingStages(plan, state, 'cross_2', {
            builtGoalKeys: new Set(['o2Bubble']),
            canAffordGoal: () => true
        });
        const goal = stages.find((s) => s.id === RING_CROSSING_STAGE_IDS.GOAL);
        expect(goal.steps.find((s) => s.id === 'prerequisite').done).toBe(true);
        expect(goal.steps.find((s) => s.id === 'resources').done).toBe(true);
        expect(goal.steps.find((s) => s.id === 'install').done).toBe(false);
    });

    it('treats a missing context as nothing known, never as done', () => {
        const stages = describeRingCrossingStages(plan, state, 'cross_2');
        const goal = stages.find((s) => s.id === RING_CROSSING_STAGE_IDS.GOAL);
        expect(goal.steps.every((s) => s.done === false)).toBe(true);
    });
});
