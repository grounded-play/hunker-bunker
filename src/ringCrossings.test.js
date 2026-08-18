import { describe, expect, it } from 'vitest';
import { generateRadialMazeExpedition } from './mazeExpedition.js';
import {
    MILESTONE_BOSS_DEFINITIONS,
    MILESTONE_BOSS_STATES,
    createMilestoneBossLifecycleState
} from './milestoneBossLifecycle.js';
import {
    RING_CROSSING_PLAN_VERSION,
    RING_CROSSING_STATE_VERSION,
    RING_CROSSING_STATES,
    buildRingCrossingPlan,
    getCrossingStatus,
    getCrossingTraversalState,
    getOpenRingCrossingIds,
    getRingCrossing,
    getRingCrossingTraversalUnlocks,
    isRingCrossingOpen,
    reconcileRingCrossingState,
    validateRingCrossingPlan
} from './ringCrossings.js';

const ALL_GOALS = MILESTONE_BOSS_DEFINITIONS.map((entry) => entry.goalKey);
const ALL_MISSIONS = [
    'restore_ring_power',
    'restore_canyon_crossing',
    'clear_infested_threshold',
    'restart_drainage_pumps'
];

function defeatedLifecycle() {
    const state = createMilestoneBossLifecycleState({ builtGoalKeys: ALL_GOALS });
    for (const definition of MILESTONE_BOSS_DEFINITIONS) {
        state.milestones[definition.milestoneId].status = MILESTONE_BOSS_STATES.DEFEATED;
    }
    return state;
}

describe('ring crossing plan', () => {
    it('consumes the four shipped blocker records and canonical milestone requirements', () => {
        const expedition = generateRadialMazeExpedition(8128);
        const plan = buildRingCrossingPlan(expedition);
        expect(plan.version).toBe(RING_CROSSING_PLAN_VERSION);
        expect(plan.seed).toBe(8128);
        expect(plan.ringCrossings).toHaveLength(4);
        expect(plan.ringCrossings.map((crossing) => crossing.id)).toEqual([
            'ring-1-gate', 'ring-2-gate', 'ring-3-gate', 'ring-4-gate'
        ]);
        expect(plan.ringCrossings.map((crossing) => crossing.requirements.milestoneId))
            .toEqual(MILESTONE_BOSS_DEFINITIONS.map((entry) => entry.milestoneId));
        expect(validateRingCrossingPlan(plan)).toEqual({ valid: true, errors: [] });
        expect(JSON.parse(JSON.stringify(plan))).toEqual(plan);
    });

    it('returns defensive copies from lookup without exposing plan mutation', () => {
        const plan = buildRingCrossingPlan(generateRadialMazeExpedition(1));
        const crossing = getRingCrossing(plan, 'ring-1-gate');
        crossing.requirements.goalKey = 'changed';
        expect(plan.ringCrossings[0].requirements.goalKey).toBe('o2Bubble');
        expect(getRingCrossing(plan, 'missing')).toBeNull();
    });

    it('rejects blocker drift, missing placement, and invalid predecessor order', () => {
        const plan = buildRingCrossingPlan(generateRadialMazeExpedition(2));
        plan.ringCrossings[0].door = 'generic_door';
        plan.ringCrossings[1].chunkKey = null;
        plan.ringCrossings[2].requirements.previousCrossingId = null;
        const result = validateRingCrossingPlan(plan);
        expect(result.valid).toBe(false);
        expect(result.errors).toEqual(expect.arrayContaining([
            'ring-1-gate drifted from RING_BLOCKER_FEATURES',
            'ring-2-gate has no reserved route chunk',
            'ring-3-gate has invalid progression predecessor'
        ]));
    });
});

describe('ring crossing state', () => {
    it('moves through locked, objective-ready, boss-pending, and open from durable conditions', () => {
        const plan = buildRingCrossingPlan(generateRadialMazeExpedition(3));
        const locked = reconcileRingCrossingState(plan, null).state;
        expect(locked.version).toBe(RING_CROSSING_STATE_VERSION);
        expect(locked.crossings['ring-1-gate'].status).toBe(RING_CROSSING_STATES.LOCKED);

        const ready = reconcileRingCrossingState(plan, null, {
            completedMissionIds: [ALL_MISSIONS[0]]
        }).state;
        expect(ready.crossings['ring-1-gate'].status).toBe(RING_CROSSING_STATES.OBJECTIVE_READY);

        const pending = reconcileRingCrossingState(plan, null, {
            builtGoalKeys: [ALL_GOALS[0]],
            completedMissionIds: [ALL_MISSIONS[0]]
        }).state;
        expect(pending.crossings['ring-1-gate'].status).toBe(RING_CROSSING_STATES.BOSS_PENDING);

        const open = reconcileRingCrossingState(plan, null, {
            builtGoalKeys: [ALL_GOALS[0]],
            completedMissionIds: [ALL_MISSIONS[0]],
            defeatedMilestoneIds: [MILESTONE_BOSS_DEFINITIONS[0].milestoneId]
        }).state;
        expect(open.crossings['ring-1-gate'].status).toBe(RING_CROSSING_STATES.OPEN);
        expect(getOpenRingCrossingIds(open)).toEqual(new Set(['ring-1-gate']));
    });

    it('keeps later crossings locked until every preceding crossing is open', () => {
        const plan = buildRingCrossingPlan(generateRadialMazeExpedition(4));
        const state = reconcileRingCrossingState(plan, null, {
            builtGoalKeys: ALL_GOALS,
            completedMissionIds: ALL_MISSIONS.slice(1),
            milestoneLifecycle: defeatedLifecycle()
        }).state;
        expect(Object.values(state.crossings).map((crossing) => crossing.status))
            .toEqual([
                RING_CROSSING_STATES.OBJECTIVE_READY,
                RING_CROSSING_STATES.LOCKED,
                RING_CROSSING_STATES.LOCKED,
                RING_CROSSING_STATES.LOCKED
            ]);
    });

    it('opens all four only when goals, blocker missions, and canonical bosses are satisfied', () => {
        const plan = buildRingCrossingPlan(generateRadialMazeExpedition(5));
        const first = reconcileRingCrossingState(plan, null, {
            builtGoalKeys: ALL_GOALS,
            completedMissionIds: ALL_MISSIONS,
            milestoneLifecycle: defeatedLifecycle()
        });
        expect([...getOpenRingCrossingIds(first.state)]).toEqual([
            'ring-1-gate', 'ring-2-gate', 'ring-3-gate', 'ring-4-gate'
        ]);
        expect(first.state.crossings['ring-2-gate'].opensTraversal).toBe('bridge');
        expect(getRingCrossingTraversalUnlocks(first.state)).toEqual([
            { ring: 2, traversal: 'bridge', from: 'ring-2-gate' }
        ]);
        const second = reconcileRingCrossingState(plan, first.state, {
            builtGoalKeys: ALL_GOALS,
            completedMissionIds: ALL_MISSIONS,
            milestoneLifecycle: defeatedLifecycle()
        });
        expect(second.changed).toBe(false);
        expect(second.state).toEqual(first.state);
    });

    it('migrates old unlocked blocker IDs without re-locking completed content', () => {
        const plan = buildRingCrossingPlan(generateRadialMazeExpedition(6));
        const result = reconcileRingCrossingState(plan, {
            unlockedBlockerIds: ['ring-1-gate', 'ring-2-gate']
        });
        expect(result.state.crossings['ring-1-gate']).toMatchObject({
            status: RING_CROSSING_STATES.OPEN,
            openedByMigration: true
        });
        expect(result.state.crossings['ring-2-gate'].status).toBe(RING_CROSSING_STATES.OPEN);
        expect(result.state.crossings['ring-3-gate'].status).toBe(RING_CROSSING_STATES.LOCKED);
    });

    it('does not confuse legacy enemy types or biome kill keys with milestone defeat', () => {
        const plan = buildRingCrossingPlan(generateRadialMazeExpedition(7));
        const state = reconcileRingCrossingState(plan, null, {
            builtGoalKeys: ALL_GOALS,
            completedMissionIds: ALL_MISSIONS,
            defeatedMilestoneIds: ['boss_sporesnail', 'active', 'cryo', 'bio']
        }).state;
        expect(state.crossings['ring-1-gate'].status).toBe(RING_CROSSING_STATES.BOSS_PENDING);
        expect(state.crossings['ring-2-gate'].status).toBe(RING_CROSSING_STATES.LOCKED);
    });

    it('provides isRingCrossingOpen, getCrossingStatus, and getCrossingTraversalState query helpers', () => {
        const plan = buildRingCrossingPlan(generateRadialMazeExpedition(8));
        const first = reconcileRingCrossingState(plan, null, {
            builtGoalKeys: ['o2Bubble'],
            completedMissionIds: ['restore_ring_power'],
            milestoneLifecycle: defeatedLifecycle()
        });
        expect(isRingCrossingOpen(first.state, 'ring-1-gate')).toBe(true);
        expect(isRingCrossingOpen(first.state, 'ring-2-gate')).toBe(false);
        expect(getCrossingStatus(first.state, 'ring-1-gate')).toBe(RING_CROSSING_STATES.OPEN);
        expect(getCrossingStatus(first.state, 'ring-2-gate')).toBe(RING_CROSSING_STATES.LOCKED);

        const traversal = getCrossingTraversalState(first.state);
        expect(traversal.openCrossingIds).toEqual(['ring-1-gate']);
        expect(traversal.openCount).toBe(1);
        expect(traversal.traversalUnlocks).toEqual([]);

        const second = reconcileRingCrossingState(plan, first.state, {
            builtGoalKeys: ['o2Bubble', 'hullExpansion'],
            completedMissionIds: ['restore_ring_power', 'restore_canyon_crossing'],
            milestoneLifecycle: defeatedLifecycle()
        });
        expect(isRingCrossingOpen(second.state, 'ring-2-gate')).toBe(true);
        expect(getCrossingStatus(second.state, 'ring-2-gate')).toBe(RING_CROSSING_STATES.OPEN);
        const secondTraversal = getCrossingTraversalState(second.state);
        expect(secondTraversal.openCount).toBe(2);
        expect(secondTraversal.traversalUnlocks).toEqual([
            { ring: 2, traversal: 'bridge', from: 'ring-2-gate' }
        ]);
    });
});
