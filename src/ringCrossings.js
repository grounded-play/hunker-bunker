import { RING_BLOCKER_FEATURES, RING_UNLOCK_GOAL_ORDER, getTraversalUnlocks } from './mazeExpedition.js';
import {
    MILESTONE_BOSS_STATES,
    getMilestoneForCrossing,
    migrateMilestoneBossLifecycleState
} from './milestoneBossLifecycle.js';

export const RING_CROSSING_PLAN_VERSION = 1;
export const RING_CROSSING_STATE_VERSION = 1;

export const RING_CROSSING_STATES = Object.freeze({
    LOCKED: 'locked',
    OBJECTIVE_READY: 'objective_ready',
    BOSS_PENDING: 'boss_pending',
    OPEN: 'open'
});

function stringSet(value) {
    if (value instanceof Set || Array.isArray(value)) {
        return new Set([...value].filter((entry) => typeof entry === 'string'));
    }
    return new Set();
}

function crossingEntries(raw) {
    if (Array.isArray(raw?.crossings)) {
        return raw.crossings.map((entry) => [entry?.id, entry]);
    }
    if (raw?.crossings && typeof raw.crossings === 'object') return Object.entries(raw.crossings);
    return [];
}

function legacyOpenIds(raw) {
    const ids = new Set([
        ...stringSet(raw?.openCrossingIds),
        ...stringSet(raw?.unlockedCrossingIds),
        ...stringSet(raw?.unlockedBlockerIds)
    ]);
    // Only interpret persisted `open` booleans/statuses as a migration input.
    // A current-version derived state is reconciled from durable conditions;
    // re-reading its own OPEN records must not relabel them as migration wins.
    if (raw?.version !== RING_CROSSING_STATE_VERSION) {
        for (const [key, entry] of crossingEntries(raw)) {
            if (entry?.status === RING_CROSSING_STATES.OPEN || entry?.open === true) {
                ids.add(entry?.id ?? key);
            }
        }
    }
    return ids;
}

function cloneCrossing(crossing) {
    return {
        id: crossing.id,
        ring: crossing.ring,
        blocksRing: crossing.blocksRing,
        blockerFeature: crossing.blockerFeature,
        missionId: crossing.missionId,
        door: crossing.door,
        opensTraversal: crossing.opensTraversal,
        chunkX: crossing.chunkX,
        chunkY: crossing.chunkY,
        chunkKey: crossing.chunkKey,
        requirements: { ...crossing.requirements }
    };
}

/**
 * Build the serializable macro crossing contract from the existing expedition
 * blockers. This does not replace collision or the shipped radial clamp.
 */
export function buildRingCrossingPlan(expedition) {
    const blockers = [...(expedition?.blockers ?? [])].sort((a, b) => a.ring - b.ring);
    const ringCrossings = blockers.map((blocker, index) => {
        const shippedFeature = RING_BLOCKER_FEATURES[blocker.ring - 1];
        const milestone = getMilestoneForCrossing(blocker.id);
        return {
            id: blocker.id,
            ring: blocker.ring,
            blocksRing: blocker.blocksRing,
            blockerFeature: blocker.feature,
            missionId: blocker.missionId,
            door: blocker.door,
            opensTraversal: blocker.opensTraversal ?? null,
            chunkX: blocker.chunkX,
            chunkY: blocker.chunkY,
            chunkKey: Number.isInteger(blocker.chunkX) && Number.isInteger(blocker.chunkY)
                ? `${blocker.chunkX},${blocker.chunkY}`
                : null,
            requirements: {
                previousCrossingId: index > 0 ? blockers[index - 1].id : null,
                goalKey: RING_UNLOCK_GOAL_ORDER[blocker.ring - 1] ?? null,
                missionId: shippedFeature?.mission ?? blocker.missionId ?? null,
                milestoneId: milestone?.milestoneId ?? null
            }
        };
    });
    return {
        version: RING_CROSSING_PLAN_VERSION,
        seed: Number(expedition?.seed) >>> 0,
        ringCrossings
    };
}

export function validateRingCrossingPlan(plan) {
    const errors = [];
    const crossings = plan?.ringCrossings ?? [];
    if (plan?.version !== RING_CROSSING_PLAN_VERSION) {
        errors.push(`unsupported ring crossing plan version ${plan?.version}`);
    }
    if (crossings.length !== RING_BLOCKER_FEATURES.length) {
        errors.push(`expected ${RING_BLOCKER_FEATURES.length} ring crossings, found ${crossings.length}`);
    }
    const ids = new Set();
    for (let index = 0; index < crossings.length; index += 1) {
        const crossing = crossings[index];
        const ring = index + 1;
        const feature = RING_BLOCKER_FEATURES[index];
        const milestone = getMilestoneForCrossing(crossing?.id);
        if (!crossing?.id || ids.has(crossing.id)) errors.push(`duplicate or missing crossing id ${crossing?.id}`);
        ids.add(crossing?.id);
        if (crossing?.ring !== ring || crossing?.blocksRing !== ring + 1) {
            errors.push(`${crossing?.id ?? `crossing ${ring}`} has invalid ring transition`);
        }
        if (crossing?.blockerFeature !== feature?.type
            || crossing?.missionId !== feature?.mission
            || crossing?.door !== feature?.door
            || crossing?.opensTraversal !== feature?.opensTraversal) {
            errors.push(`${crossing?.id ?? `crossing ${ring}`} drifted from RING_BLOCKER_FEATURES`);
        }
        if (!crossing?.chunkKey || !Number.isInteger(crossing?.chunkX) || !Number.isInteger(crossing?.chunkY)) {
            errors.push(`${crossing?.id ?? `crossing ${ring}`} has no reserved route chunk`);
        }
        if (crossing?.requirements?.goalKey !== RING_UNLOCK_GOAL_ORDER[index]
            || crossing?.requirements?.missionId !== feature?.mission
            || crossing?.requirements?.milestoneId !== milestone?.milestoneId) {
            errors.push(`${crossing?.id ?? `crossing ${ring}`} has invalid authoritative requirements`);
        }
        const expectedPrevious = index > 0 ? crossings[index - 1]?.id : null;
        if (crossing?.requirements?.previousCrossingId !== expectedPrevious) {
            errors.push(`${crossing?.id ?? `crossing ${ring}`} has invalid progression predecessor`);
        }
    }
    return { valid: errors.length === 0, errors };
}

function milestoneDefeated(lifecycle, milestoneId) {
    return lifecycle?.milestones?.[milestoneId]?.status === MILESTONE_BOSS_STATES.DEFEATED;
}

function deriveStatus({ previousOpen, goalBuilt, missionComplete, bossDefeated, migratedOpen }) {
    if (migratedOpen || (previousOpen && goalBuilt && missionComplete && bossDefeated)) {
        return RING_CROSSING_STATES.OPEN;
    }
    if (!previousOpen) return RING_CROSSING_STATES.LOCKED;
    if (goalBuilt && missionComplete) return RING_CROSSING_STATES.BOSS_PENDING;
    if (goalBuilt || missionComplete) return RING_CROSSING_STATES.OBJECTIVE_READY;
    return RING_CROSSING_STATES.LOCKED;
}

/**
 * Reconcile crossing presentation/open state entirely from durable mission,
 * build, and canonical milestone state. Legacy-open crossings remain open so
 * old saves are not re-locked behind completed content.
 */
export function reconcileRingCrossingState(plan, rawState, {
    builtGoalKeys,
    completedMissionIds,
    milestoneLifecycle,
    defeatedMilestoneIds
} = {}) {
    const built = stringSet(builtGoalKeys ?? rawState?.builtGoalKeys);
    const missions = stringSet(completedMissionIds ?? rawState?.completedMissionIds);
    const defeated = stringSet(defeatedMilestoneIds ?? rawState?.defeatedMilestoneIds);
    const lifecycle = migrateMilestoneBossLifecycleState(milestoneLifecycle ?? rawState?.milestoneLifecycle, {
        builtGoalKeys: built
    });
    const migratedOpen = legacyOpenIds(rawState);
    const crossings = {};
    const openIds = new Set();

    for (const definition of plan?.ringCrossings ?? []) {
        const requirements = definition.requirements ?? {};
        const previousOpen = !requirements.previousCrossingId || openIds.has(requirements.previousCrossingId);
        const goalBuilt = built.has(requirements.goalKey);
        const missionComplete = missions.has(requirements.missionId);
        const bossDefeated = defeated.has(requirements.milestoneId)
            || milestoneDefeated(lifecycle, requirements.milestoneId);
        const status = deriveStatus({
            previousOpen,
            goalBuilt,
            missionComplete,
            bossDefeated,
            migratedOpen: migratedOpen.has(definition.id)
        });
        if (status === RING_CROSSING_STATES.OPEN) openIds.add(definition.id);
        crossings[definition.id] = {
            id: definition.id,
            status,
            goalBuilt,
            missionComplete,
            bossDefeated,
            previousCrossingOpen: previousOpen,
            openedByMigration: migratedOpen.has(definition.id),
            opensTraversal: status === RING_CROSSING_STATES.OPEN ? definition.opensTraversal : null
        };
    }

    const next = {
        version: RING_CROSSING_STATE_VERSION,
        revision: Math.max(0, Math.floor(Number(rawState?.revision) || 0)),
        crossings
    };
    const comparableRaw = rawState?.version === RING_CROSSING_STATE_VERSION
        ? { version: rawState.version, revision: next.revision, crossings: rawState.crossings }
        : null;
    const changed = JSON.stringify(comparableRaw) !== JSON.stringify(next);
    if (changed) next.revision += 1;
    return { state: next, changed };
}

export function getOpenRingCrossingIds(state) {
    return new Set(Object.values(state?.crossings ?? {})
        .filter((crossing) => crossing?.status === RING_CROSSING_STATES.OPEN)
        .map((crossing) => crossing.id));
}

export function getRingCrossingTraversalUnlocks(state) {
    return getTraversalUnlocks(getOpenRingCrossingIds(state));
}

export function getRingCrossing(plan, crossingId) {
    const crossing = plan?.ringCrossings?.find((entry) => entry.id === crossingId);
    return crossing ? cloneCrossing(crossing) : null;
}

export function isRingCrossingOpen(state, crossingId) {
    if (!crossingId || !state?.crossings) return false;
    const entry = state.crossings[crossingId];
    return entry?.status === RING_CROSSING_STATES.OPEN;
}

export function getCrossingStatus(state, crossingId) {
    if (!crossingId || !state?.crossings) return RING_CROSSING_STATES.LOCKED;
    return state.crossings[crossingId]?.status ?? RING_CROSSING_STATES.LOCKED;
}

export function getCrossingTraversalState(state) {
    const openIds = getOpenRingCrossingIds(state);
    const traversalUnlocks = getTraversalUnlocks(openIds);
    return {
        openCrossingIds: [...openIds],
        traversalUnlocks,
        openCount: openIds.size
    };
}
