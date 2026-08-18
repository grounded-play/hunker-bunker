import { describe, expect, it } from 'vitest';
import {
    MILESTONE_BOSS_DEFINITIONS,
    MILESTONE_BOSS_EVENT_TYPES,
    MILESTONE_BOSS_IDS,
    MILESTONE_BOSS_LIFECYCLE_VERSION,
    MILESTONE_BOSS_STATES,
    advanceMilestoneBossState,
    applyMilestoneBossEvent,
    buildMilestoneBossReport,
    createMilestoneBossLifecycleState,
    getCanonicalMilestoneBossId,
    getMilestoneById,
    getMilestoneBossIdForCrossing,
    getMilestoneBossIdForGoal,
    getMilestoneForCrossing,
    getMilestoneForGoal,
    getMilestoneStatus,
    isMilestoneDefeated,
    migrateLegacyMilestoneIdentifier,
    migrateMilestoneBossLifecycleState,
    reconcileMilestoneBossLifecycle,
    serializeMilestoneBossLifecycleState
} from './milestoneBossLifecycle.js';

const ALL_GOALS = MILESTONE_BOSS_DEFINITIONS.map(({ goalKey }) => goalKey);
const ALL_IDS = MILESTONE_BOSS_DEFINITIONS.map(({ milestoneId }) => milestoneId);

function statusOf(state, milestoneId) {
    return state.milestones[milestoneId].status;
}

describe('milestone boss identities', () => {
    it('defines one canonical milestone for each goal and crossing while keeping presentation separate', () => {
        expect(MILESTONE_BOSS_DEFINITIONS).toHaveLength(4);
        expect(new Set(ALL_IDS).size).toBe(4);
        expect(MILESTONE_BOSS_DEFINITIONS.map(({ ringCrossingId }) => ringCrossingId)).toEqual([
            'ring-1-gate', 'ring-2-gate', 'ring-3-gate', 'ring-4-gate'
        ]);
        for (const definition of MILESTONE_BOSS_DEFINITIONS) {
            expect(getMilestoneBossIdForGoal(definition.goalKey)).toBe(definition.milestoneId);
            expect(getMilestoneBossIdForCrossing(definition.ringCrossingId)).toBe(definition.milestoneId);
            expect(getMilestoneForGoal(definition.goalKey)).toBe(definition);
            expect(getMilestoneForCrossing(definition.ringCrossingId)).toBe(definition);
            expect(getMilestoneById(definition.milestoneId)).toBe(definition);
            expect(getCanonicalMilestoneBossId(definition.milestoneId)).toBe(definition.milestoneId);
            expect(getCanonicalMilestoneBossId(definition.goalKey)).toBeNull();
            expect(getCanonicalMilestoneBossId(definition.presentationEnemyType)).toBeNull();
        }
        expect(MILESTONE_BOSS_DEFINITIONS[2].presentationEnemyType).toBe('boss_sporesnail');
        expect(MILESTONE_BOSS_DEFINITIONS[3].presentationEnemyType).toBe('boss_sporesnail');
    });

    it('maps legacy conceptual tier labels only through the explicit migration API', () => {
        expect(migrateLegacyMilestoneIdentifier('sentinel')).toBe(MILESTONE_BOSS_IDS.O2_BUBBLE);
        expect(migrateLegacyMilestoneIdentifier('warden')).toBe(MILESTONE_BOSS_IDS.HULL_EXPANSION);
        expect(migrateLegacyMilestoneIdentifier('broodmother')).toBe(MILESTONE_BOSS_IDS.RADAR_NODE);
        expect(migrateLegacyMilestoneIdentifier('praetorian')).toBe(MILESTONE_BOSS_IDS.REACTOR_COMPRESSOR);
        for (const ambiguous of ['active', 'cryo', 'bio', 'boss_cybersnail', 'boss_cryosnail', 'boss_sporesnail']) {
            expect(migrateLegacyMilestoneIdentifier(ambiguous)).toBeNull();
            expect(getCanonicalMilestoneBossId(ambiguous)).toBeNull();
        }
    });
});

describe('milestone boss lifecycle', () => {
    it('creates versioned serializable state and derives readiness from durable built goals', () => {
        const state = createMilestoneBossLifecycleState({ builtGoalKeys: ALL_GOALS });
        expect(state.version).toBe(MILESTONE_BOSS_LIFECYCLE_VERSION);
        expect(Object.keys(state.milestones)).toEqual(ALL_IDS);
        expect(Object.values(state.milestones).map(({ status }) => status)).toEqual(
            Array(4).fill(MILESTONE_BOSS_STATES.READY_TO_STAGE)
        );
        expect(JSON.parse(JSON.stringify(state))).toEqual(state);
        expect(serializeMilestoneBossLifecycleState(state)).toEqual(state);
    });

    it.each(MILESTONE_BOSS_DEFINITIONS)('runs an idempotent four-state sequence for $goalKey', (definition) => {
        let state = createMilestoneBossLifecycleState();
        let result = applyMilestoneBossEvent(state, {
            type: MILESTONE_BOSS_EVENT_TYPES.GOAL_BUILT,
            goalKey: definition.goalKey
        });
        expect(statusOf(result.state, definition.milestoneId)).toBe(MILESTONE_BOSS_STATES.READY_TO_STAGE);
        expect(result.effects).toHaveLength(1);
        state = result.state;

        const duplicateGoal = applyMilestoneBossEvent(state, {
            type: MILESTONE_BOSS_EVENT_TYPES.GOAL_BUILT,
            goalKey: definition.goalKey
        });
        expect(duplicateGoal.changed).toBe(false);
        expect(duplicateGoal.state.revision).toBe(state.revision);

        result = applyMilestoneBossEvent(state, {
            type: MILESTONE_BOSS_EVENT_TYPES.BOSS_SPAWNED,
            milestoneId: definition.milestoneId,
            encounterId: `encounter:${definition.goalKey}`
        });
        expect(statusOf(result.state, definition.milestoneId)).toBe(MILESTONE_BOSS_STATES.ACTIVE);
        expect(result.state.milestones[definition.milestoneId].activeEncounterId).toBe(`encounter:${definition.goalKey}`);
        state = result.state;

        const duplicateSpawn = applyMilestoneBossEvent(state, {
            type: MILESTONE_BOSS_EVENT_TYPES.BOSS_SPAWNED,
            milestoneId: definition.milestoneId,
            encounterId: 'a-second-boss'
        });
        expect(duplicateSpawn.changed).toBe(false);
        expect(duplicateSpawn.state.milestones[definition.milestoneId].stageAttempt).toBe(1);

        result = applyMilestoneBossEvent(state, {
            type: MILESTONE_BOSS_EVENT_TYPES.ENEMY_KILLED,
            milestoneId: definition.milestoneId,
            encounterId: `encounter:${definition.goalKey}`
        });
        expect(statusOf(result.state, definition.milestoneId)).toBe(MILESTONE_BOSS_STATES.DEFEATED);
        state = result.state;

        for (const event of [
            { type: MILESTONE_BOSS_EVENT_TYPES.GOAL_BUILT, goalKey: definition.goalKey },
            { type: MILESTONE_BOSS_EVENT_TYPES.BOSS_SPAWNED, milestoneId: definition.milestoneId },
            { type: MILESTONE_BOSS_EVENT_TYPES.ENEMY_KILLED, milestoneId: definition.milestoneId },
            { type: MILESTONE_BOSS_EVENT_TYPES.RELOAD, builtGoalKeys: ALL_GOALS }
        ]) {
            const terminal = applyMilestoneBossEvent(state, event);
            expect(statusOf(terminal.state, definition.milestoneId)).toBe(MILESTONE_BOSS_STATES.DEFEATED);
        }
    });

    it('restages active-but-missing bosses and preserves bosses confirmed active', () => {
        let state = createMilestoneBossLifecycleState({ builtGoalKeys: ['o2Bubble', 'hullExpansion'] });
        state = applyMilestoneBossEvent(state, {
            type: MILESTONE_BOSS_EVENT_TYPES.BOSS_SPAWNED,
            milestoneId: MILESTONE_BOSS_IDS.O2_BUBBLE
        }).state;
        state = applyMilestoneBossEvent(state, {
            type: MILESTONE_BOSS_EVENT_TYPES.BOSS_SPAWNED,
            milestoneId: MILESTONE_BOSS_IDS.HULL_EXPANSION
        }).state;

        const result = reconcileMilestoneBossLifecycle(state, {
            builtGoalKeys: ['o2Bubble', 'hullExpansion'],
            activeMilestoneIds: [MILESTONE_BOSS_IDS.HULL_EXPANSION]
        });
        expect(statusOf(result.state, MILESTONE_BOSS_IDS.O2_BUBBLE)).toBe(MILESTONE_BOSS_STATES.READY_TO_STAGE);
        expect(statusOf(result.state, MILESTONE_BOSS_IDS.HULL_EXPANSION)).toBe(MILESTONE_BOSS_STATES.ACTIVE);
        expect(result.effects).toEqual([
            expect.objectContaining({ milestoneId: MILESTONE_BOSS_IDS.O2_BUBBLE, reason: 'active_boss_missing' })
        ]);
        expect(reconcileMilestoneBossLifecycle(result.state, {
            builtGoalKeys: ['o2Bubble', 'hullExpansion'],
            activeMilestoneIds: [MILESTONE_BOSS_IDS.HULL_EXPANSION]
        }).changed).toBe(false);
    });

    it.each([
        MILESTONE_BOSS_EVENT_TYPES.PLAYER_DEATH,
        MILESTONE_BOSS_EVENT_TYPES.QUIT,
        MILESTONE_BOSS_EVENT_TYPES.ACT_TRANSITION
    ])('%s safely returns active encounters to ready_to_stage', (type) => {
        let state = createMilestoneBossLifecycleState({ builtGoalKeys: ['radarNode'] });
        state = applyMilestoneBossEvent(state, {
            type: MILESTONE_BOSS_EVENT_TYPES.BOSS_SPAWNED,
            milestoneId: MILESTONE_BOSS_IDS.RADAR_NODE
        }).state;
        const result = applyMilestoneBossEvent(state, { type });
        expect(statusOf(result.state, MILESTONE_BOSS_IDS.RADAR_NODE)).toBe(MILESTONE_BOSS_STATES.READY_TO_STAGE);
        expect(applyMilestoneBossEvent(result.state, { type }).changed).toBe(false);
    });

    it.each([MILESTONE_BOSS_EVENT_TYPES.RELOAD, MILESTONE_BOSS_EVENT_TYPES.BASE_RETURN])(
        '%s reconciles built goals and missing active encounters idempotently',
        (type) => {
            let state = createMilestoneBossLifecycleState({ builtGoalKeys: ['reactorCompressor'] });
            state = applyMilestoneBossEvent(state, {
                type: MILESTONE_BOSS_EVENT_TYPES.BOSS_SPAWNED,
                milestoneId: MILESTONE_BOSS_IDS.REACTOR_COMPRESSOR
            }).state;
            const result = applyMilestoneBossEvent(state, { type, builtGoalKeys: ALL_GOALS, activeMilestoneIds: [] });
            expect(Object.values(result.state.milestones).every(({ status }) => status === MILESTONE_BOSS_STATES.READY_TO_STAGE)).toBe(true);
            expect(applyMilestoneBossEvent(result.state, { type, builtGoalKeys: ALL_GOALS, activeMilestoneIds: [] }).changed).toBe(false);
        }
    );

    it('rejects enemy-type, biome, goal-only, and stale-encounter kill ambiguity', () => {
        let state = createMilestoneBossLifecycleState({ builtGoalKeys: ['radarNode'] });
        state = applyMilestoneBossEvent(state, {
            type: MILESTONE_BOSS_EVENT_TYPES.BOSS_SPAWNED,
            milestoneId: MILESTONE_BOSS_IDS.RADAR_NODE,
            encounterId: 'radar:1'
        }).state;
        for (const detail of [
            { enemyType: 'boss_sporesnail' },
            { biome: 'bio' },
            { goalKey: 'radarNode' },
            { milestoneId: MILESTONE_BOSS_IDS.RADAR_NODE, encounterId: 'old-spawn' }
        ]) {
            const result = applyMilestoneBossEvent(state, { type: MILESTONE_BOSS_EVENT_TYPES.ENEMY_KILLED, ...detail });
            expect(result.changed).toBe(false);
            expect(statusOf(result.state, MILESTONE_BOSS_IDS.RADAR_NODE)).toBe(MILESTONE_BOSS_STATES.ACTIVE);
        }

        const neverStaged = applyMilestoneBossEvent(
            createMilestoneBossLifecycleState({ builtGoalKeys: ['o2Bubble'] }),
            { type: MILESTONE_BOSS_EVENT_TYPES.ENEMY_KILLED, milestoneId: MILESTONE_BOSS_IDS.O2_BUBBLE }
        );
        expect(neverStaged.changed).toBe(false);
        expect(statusOf(neverStaged.state, MILESTONE_BOSS_IDS.O2_BUBBLE)).toBe(MILESTONE_BOSS_STATES.READY_TO_STAGE);
    });
});

describe('milestone boss save migration', () => {
    it('migrates absent state and legacy bank unlock shapes', () => {
        expect(migrateMilestoneBossLifecycleState(null).version).toBe(MILESTONE_BOSS_LIFECYCLE_VERSION);
        const state = migrateMilestoneBossLifecycleState({
            bank: { unlocks: { o2Bubble: true, hullExpansion: true, radarNode: false } }
        });
        expect(statusOf(state, MILESTONE_BOSS_IDS.O2_BUBBLE)).toBe(MILESTONE_BOSS_STATES.READY_TO_STAGE);
        expect(statusOf(state, MILESTONE_BOSS_IDS.HULL_EXPANSION)).toBe(MILESTONE_BOSS_STATES.READY_TO_STAGE);
        expect(statusOf(state, MILESTONE_BOSS_IDS.RADAR_NODE)).toBe(MILESTONE_BOSS_STATES.NOT_READY);
    });

    it('migrates legacy mazeTiers defeat labels but ignores runtime biome and enemy-type kill keys', () => {
        const state = migrateMilestoneBossLifecycleState({
            unlockedGoalKeys: ALL_GOALS,
            defeatedBosses: ['sentinel', 'broodmother', 'boss_cryosnail', 'boss_sporesnail', 'bio'],
            killedBosses: ['active', 'cryo', 'bio', 'boss_cybersnail']
        });
        expect(statusOf(state, MILESTONE_BOSS_IDS.O2_BUBBLE)).toBe(MILESTONE_BOSS_STATES.DEFEATED);
        expect(statusOf(state, MILESTONE_BOSS_IDS.RADAR_NODE)).toBe(MILESTONE_BOSS_STATES.DEFEATED);
        expect(statusOf(state, MILESTONE_BOSS_IDS.HULL_EXPANSION)).toBe(MILESTONE_BOSS_STATES.READY_TO_STAGE);
        expect(statusOf(state, MILESTONE_BOSS_IDS.REACTOR_COMPRESSOR)).toBe(MILESTONE_BOSS_STATES.READY_TO_STAGE);
    });

    it('normalizes legacy milestone maps and restages an interrupted active save on load', () => {
        const migrated = migrateMilestoneBossLifecycleState({
            version: 0,
            builtGoals: ALL_GOALS,
            milestones: {
                o2Bubble: { state: 'defeated' },
                warden: { active: true, stageAttempt: 2, activeEncounterId: 'old:warden' },
                'ring-3-gate': { ready: true },
                [MILESTONE_BOSS_IDS.REACTOR_COMPRESSOR]: false
            }
        });
        expect(statusOf(migrated, MILESTONE_BOSS_IDS.O2_BUBBLE)).toBe(MILESTONE_BOSS_STATES.DEFEATED);
        expect(statusOf(migrated, MILESTONE_BOSS_IDS.HULL_EXPANSION)).toBe(MILESTONE_BOSS_STATES.ACTIVE);
        expect(statusOf(migrated, MILESTONE_BOSS_IDS.RADAR_NODE)).toBe(MILESTONE_BOSS_STATES.READY_TO_STAGE);

        const loaded = applyMilestoneBossEvent(migrated, {
            type: MILESTONE_BOSS_EVENT_TYPES.RELOAD,
            builtGoalKeys: ALL_GOALS,
            activeMilestoneIds: []
        }).state;
        expect(statusOf(loaded, MILESTONE_BOSS_IDS.HULL_EXPANSION)).toBe(MILESTONE_BOSS_STATES.READY_TO_STAGE);
        expect(statusOf(loaded, MILESTONE_BOSS_IDS.O2_BUBBLE)).toBe(MILESTONE_BOSS_STATES.DEFEATED);
    });

    it('provides advanceMilestoneBossState, buildMilestoneBossReport, and status check helpers', () => {
        let state = createMilestoneBossLifecycleState({ builtGoalKeys: ['o2Bubble'] });
        expect(getMilestoneStatus(state, 'o2Bubble')).toBe(MILESTONE_BOSS_STATES.READY_TO_STAGE);
        expect(getMilestoneStatus(state, MILESTONE_BOSS_IDS.O2_BUBBLE)).toBe(MILESTONE_BOSS_STATES.READY_TO_STAGE);
        expect(isMilestoneDefeated(state, 'o2Bubble')).toBe(false);

        state = advanceMilestoneBossState(state, {
            type: MILESTONE_BOSS_EVENT_TYPES.STAGE,
            milestoneId: MILESTONE_BOSS_IDS.O2_BUBBLE
        }).state;
        expect(getMilestoneStatus(state, 'o2Bubble')).toBe(MILESTONE_BOSS_STATES.ACTIVE);

        state = advanceMilestoneBossState(state, {
            type: MILESTONE_BOSS_EVENT_TYPES.ENEMY_KILLED,
            milestoneId: MILESTONE_BOSS_IDS.O2_BUBBLE
        }).state;
        expect(isMilestoneDefeated(state, 'o2Bubble')).toBe(true);

        const report = buildMilestoneBossReport(state);
        expect(report.o2Bubble.status).toBe(MILESTONE_BOSS_STATES.DEFEATED);
        expect(report.o2Bubble.isDefeated).toBe(true);
        expect(report.hullExpansion.status).toBe(MILESTONE_BOSS_STATES.NOT_READY);
        expect(report.hullExpansion.isUnlocked).toBe(false);
    });
});
