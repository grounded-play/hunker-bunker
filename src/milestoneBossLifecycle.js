// Pure, serializable lifecycle for the four ship-build retaliation bosses.
//
// Runtime spawning is deliberately outside this module.  The runtime adapter
// records a successful spawn with BOSS_SPAWNED and must attach the returned
// milestoneId/encounterId to the enemy.  A later kill is authoritative only
// when it carries that canonical milestone identity; enemy types and biome
// bookkeeping are presentation/ambient-combat data, not progression IDs.

export const MILESTONE_BOSS_LIFECYCLE_VERSION = 1;

export const MILESTONE_BOSS_STATES = Object.freeze({
    NOT_READY: 'not_ready',
    READY_TO_STAGE: 'ready_to_stage',
    ACTIVE: 'active',
    DEFEATED: 'defeated'
});

export const MILESTONE_BOSS_EVENT_TYPES = Object.freeze({
    GOAL_BUILT: 'goal_built',
    STAGE: 'stage',
    BOSS_SPAWNED: 'boss_spawned',
    ENEMY_KILLED: 'enemy_killed',
    PLAYER_DEATH: 'player_death',
    QUIT: 'quit',
    RELOAD: 'reload',
    BASE_RETURN: 'base_return',
    ACT_TRANSITION: 'act_transition'
});

export const MILESTONE_BOSS_IDS = Object.freeze({
    O2_BUBBLE: 'milestone:ring-1-gate:o2Bubble',
    HULL_EXPANSION: 'milestone:ring-2-gate:hullExpansion',
    RADAR_NODE: 'milestone:ring-3-gate:radarNode',
    REACTOR_COMPRESSOR: 'milestone:ring-4-gate:reactorCompressor'
});

export const MILESTONE_BOSS_DEFINITIONS = Object.freeze([
    Object.freeze({
        milestoneId: MILESTONE_BOSS_IDS.O2_BUBBLE,
        goalKey: 'o2Bubble',
        ringCrossingId: 'ring-1-gate',
        presentationEnemyType: 'boss_cybersnail',
        legacyTierBossId: 'sentinel'
    }),
    Object.freeze({
        milestoneId: MILESTONE_BOSS_IDS.HULL_EXPANSION,
        goalKey: 'hullExpansion',
        ringCrossingId: 'ring-2-gate',
        presentationEnemyType: 'boss_cryosnail',
        legacyTierBossId: 'warden'
    }),
    Object.freeze({
        milestoneId: MILESTONE_BOSS_IDS.RADAR_NODE,
        goalKey: 'radarNode',
        ringCrossingId: 'ring-3-gate',
        presentationEnemyType: 'boss_sporesnail',
        legacyTierBossId: 'broodmother'
    }),
    Object.freeze({
        milestoneId: MILESTONE_BOSS_IDS.REACTOR_COMPRESSOR,
        goalKey: 'reactorCompressor',
        ringCrossingId: 'ring-4-gate',
        presentationEnemyType: 'boss_sporesnail',
        legacyTierBossId: 'praetorian'
    })
]);

const DEFINITIONS_BY_ID = new Map(MILESTONE_BOSS_DEFINITIONS.map((definition) => [definition.milestoneId, definition]));
const IDS_BY_GOAL = new Map(MILESTONE_BOSS_DEFINITIONS.map((definition) => [definition.goalKey, definition.milestoneId]));
const IDS_BY_CROSSING = new Map(MILESTONE_BOSS_DEFINITIONS.map((definition) => [definition.ringCrossingId, definition.milestoneId]));
const IDS_BY_LEGACY_TIER_LABEL = new Map(MILESTONE_BOSS_DEFINITIONS.map((definition) => [definition.legacyTierBossId, definition.milestoneId]));
const VALID_STATES = new Set(Object.values(MILESTONE_BOSS_STATES));

function toStringSet(value) {
    if (value instanceof Set || Array.isArray(value)) {
        return new Set([...value].filter((entry) => typeof entry === 'string'));
    }
    return new Set();
}

function extractBuiltGoalKeys(raw, supplied) {
    if (supplied !== undefined) return toStringSet(supplied);
    for (const value of [raw?.builtGoalKeys, raw?.unlockedGoalKeys, raw?.completedGoals, raw?.builtGoals]) {
        if (value instanceof Set || Array.isArray(value)) return toStringSet(value);
    }
    const unlocks = raw?.unlocks ?? raw?.bank?.unlocks;
    if (unlocks && typeof unlocks === 'object') {
        return new Set(Object.entries(unlocks).filter(([, built]) => Boolean(built)).map(([goalKey]) => goalKey));
    }
    return new Set();
}

function emptyMilestone(definition) {
    return {
        milestoneId: definition.milestoneId,
        goalKey: definition.goalKey,
        ringCrossingId: definition.ringCrossingId,
        presentationEnemyType: definition.presentationEnemyType,
        status: MILESTONE_BOSS_STATES.NOT_READY,
        stageAttempt: 0,
        activeEncounterId: null,
        lastEncounterId: null
    };
}

function cloneState(state) {
    return {
        version: MILESTONE_BOSS_LIFECYCLE_VERSION,
        revision: state.revision,
        milestones: Object.fromEntries(MILESTONE_BOSS_DEFINITIONS.map(({ milestoneId }) => [
            milestoneId,
            { ...state.milestones[milestoneId] }
        ]))
    };
}

function clampCount(value) {
    return Math.max(0, Math.floor(Number(value) || 0));
}

function statusFromLegacyEntry(entry) {
    if (typeof entry === 'string' && VALID_STATES.has(entry)) return entry;
    if (typeof entry === 'boolean') {
        return entry ? MILESTONE_BOSS_STATES.DEFEATED : MILESTONE_BOSS_STATES.NOT_READY;
    }
    if (!entry || typeof entry !== 'object') return MILESTONE_BOSS_STATES.NOT_READY;
    if (entry.defeated === true) return MILESTONE_BOSS_STATES.DEFEATED;
    if (entry.active === true) return MILESTONE_BOSS_STATES.ACTIVE;
    if (entry.ready === true) return MILESTONE_BOSS_STATES.READY_TO_STAGE;
    const status = entry.status ?? entry.state;
    return VALID_STATES.has(status) ? status : MILESTONE_BOSS_STATES.NOT_READY;
}

function identifyPersistedEntry(key, entry) {
    const candidates = [entry?.milestoneId, entry?.id, key];
    for (const candidate of candidates) {
        if (DEFINITIONS_BY_ID.has(candidate)) return candidate;
    }
    for (const goalKey of [entry?.goalKey, key]) {
        if (IDS_BY_GOAL.has(goalKey)) return IDS_BY_GOAL.get(goalKey);
    }
    for (const crossingId of [entry?.ringCrossingId, entry?.crossingId, key]) {
        if (IDS_BY_CROSSING.has(crossingId)) return IDS_BY_CROSSING.get(crossingId);
    }
    return migrateLegacyMilestoneIdentifier(entry?.legacyTierLabel ?? key);
}

function persistedEntries(raw) {
    if (Array.isArray(raw?.milestones)) {
        return raw.milestones.map((entry, index) => [String(index), entry]);
    }
    if (raw?.milestones && typeof raw.milestones === 'object') return Object.entries(raw.milestones);
    return [];
}

function eventMilestoneId(event) {
    if (DEFINITIONS_BY_ID.has(event?.milestoneId)) return event.milestoneId;
    if (IDS_BY_GOAL.has(event?.goalKey)) return IDS_BY_GOAL.get(event.goalKey);
    const crossingId = event?.ringCrossingId ?? event?.crossingId;
    if (IDS_BY_CROSSING.has(crossingId)) return IDS_BY_CROSSING.get(crossingId);
    return null;
}

function transitionToReady(entry) {
    if (entry.status === MILESTONE_BOSS_STATES.DEFEATED || entry.status === MILESTONE_BOSS_STATES.READY_TO_STAGE) {
        return false;
    }
    entry.status = MILESTONE_BOSS_STATES.READY_TO_STAGE;
    entry.activeEncounterId = null;
    return true;
}

function interruptActiveMilestones(state, effects, reason) {
    let changed = false;
    for (const definition of MILESTONE_BOSS_DEFINITIONS) {
        const entry = state.milestones[definition.milestoneId];
        if (entry.status !== MILESTONE_BOSS_STATES.ACTIVE) continue;
        entry.status = MILESTONE_BOSS_STATES.READY_TO_STAGE;
        entry.activeEncounterId = null;
        effects.push({ type: 'milestone_ready', milestoneId: entry.milestoneId, reason });
        changed = true;
    }
    return changed;
}

export function getMilestoneBossDefinition(milestoneId) {
    return DEFINITIONS_BY_ID.get(milestoneId) ?? null;
}

export function getMilestoneById(milestoneId) {
    return getMilestoneBossDefinition(milestoneId);
}

export function getMilestoneBossIdForGoal(goalKey) {
    return IDS_BY_GOAL.get(goalKey) ?? null;
}

export function getMilestoneForGoal(goalKey) {
    return getMilestoneById(getMilestoneBossIdForGoal(goalKey));
}

export function getMilestoneBossIdForCrossing(crossingId) {
    return IDS_BY_CROSSING.get(crossingId) ?? null;
}

export function getMilestoneForCrossing(crossingId) {
    return getMilestoneById(getMilestoneBossIdForCrossing(crossingId));
}

// Canonical means canonical: this intentionally does not accept a goal,
// crossing, legacy tier label, enemy type, or biome key.
export function getCanonicalMilestoneBossId(value) {
    return DEFINITIONS_BY_ID.has(value) ? value : null;
}

// This narrowly-scoped migration helper accepts the four historical
// mazeTiers labels.  Presentation enemy types and biome kill keys are never
// aliases, including boss_sporesnail (which presents two milestones).
export function migrateLegacyMilestoneIdentifier(value) {
    return IDS_BY_LEGACY_TIER_LABEL.get(value) ?? null;
}

export function createMilestoneBossLifecycleState({ builtGoalKeys = [] } = {}) {
    const built = toStringSet(builtGoalKeys);
    const milestones = Object.fromEntries(MILESTONE_BOSS_DEFINITIONS.map((definition) => {
        const entry = emptyMilestone(definition);
        if (built.has(definition.goalKey)) entry.status = MILESTONE_BOSS_STATES.READY_TO_STAGE;
        return [definition.milestoneId, entry];
    }));
    return { version: MILESTONE_BOSS_LIFECYCLE_VERSION, revision: 0, milestones };
}

/**
 * Migrates absent, current, and legacy save shapes into the version-1 store.
 *
 * `defeatedBosses` is the old mazeTiers conceptual-label field and is mapped
 * explicitly. `killedBosses` is deliberately ignored because the shipped
 * runtime fills it with biome keys, while enemy-type-only arrays are equally
 * unable to identify a milestone reliably.
 */
export function migrateMilestoneBossLifecycleState(rawState, { builtGoalKeys } = {}) {
    const raw = rawState && typeof rawState === 'object' ? rawState : {};
    const built = extractBuiltGoalKeys(raw, builtGoalKeys);
    const state = createMilestoneBossLifecycleState({ builtGoalKeys: built });
    state.revision = clampCount(raw.revision);

    for (const [key, persisted] of persistedEntries(raw)) {
        const milestoneId = identifyPersistedEntry(key, persisted);
        if (!milestoneId) continue;
        const entry = state.milestones[milestoneId];
        const status = statusFromLegacyEntry(persisted);
        entry.status = status;
        entry.stageAttempt = clampCount(persisted?.stageAttempt);
        entry.activeEncounterId = status === MILESTONE_BOSS_STATES.ACTIVE && typeof persisted?.activeEncounterId === 'string'
            ? persisted.activeEncounterId
            : null;
        entry.lastEncounterId = typeof persisted?.lastEncounterId === 'string'
            ? persisted.lastEncounterId
            : entry.activeEncounterId;
    }

    for (const milestoneId of toStringSet(raw.defeatedMilestoneIds)) {
        if (DEFINITIONS_BY_ID.has(milestoneId)) state.milestones[milestoneId].status = MILESTONE_BOSS_STATES.DEFEATED;
    }
    for (const legacyLabel of toStringSet(raw.defeatedBosses)) {
        const milestoneId = migrateLegacyMilestoneIdentifier(legacyLabel);
        if (milestoneId) state.milestones[milestoneId].status = MILESTONE_BOSS_STATES.DEFEATED;
    }

    for (const entry of Object.values(state.milestones)) {
        if (built.has(entry.goalKey) && entry.status === MILESTONE_BOSS_STATES.NOT_READY) {
            entry.status = MILESTONE_BOSS_STATES.READY_TO_STAGE;
        }
        if (entry.status !== MILESTONE_BOSS_STATES.ACTIVE) entry.activeEncounterId = null;
    }
    return state;
}

export function serializeMilestoneBossLifecycleState(rawState) {
    return cloneState(migrateMilestoneBossLifecycleState(rawState));
}

/**
 * Reconciles persisted state against durable goals and currently live bosses.
 * Omit `activeMilestoneIds` when the caller cannot observe loaded encounters;
 * pass an empty collection on load/base return to restage every missing boss.
 */
export function reconcileMilestoneBossLifecycle(rawState, {
    builtGoalKeys,
    activeMilestoneIds
} = {}) {
    const state = migrateMilestoneBossLifecycleState(rawState);
    const before = JSON.stringify(state);
    const effects = [];
    const built = extractBuiltGoalKeys(rawState, builtGoalKeys);

    for (const definition of MILESTONE_BOSS_DEFINITIONS) {
        const entry = state.milestones[definition.milestoneId];
        if (built.has(definition.goalKey) && entry.status === MILESTONE_BOSS_STATES.NOT_READY) {
            transitionToReady(entry);
            effects.push({ type: 'milestone_ready', milestoneId: entry.milestoneId, reason: 'goal_built' });
        }
    }

    if (activeMilestoneIds !== undefined) {
        const active = toStringSet(activeMilestoneIds);
        for (const definition of MILESTONE_BOSS_DEFINITIONS) {
            const entry = state.milestones[definition.milestoneId];
            if (entry.status === MILESTONE_BOSS_STATES.ACTIVE && !active.has(entry.milestoneId)) {
                entry.status = MILESTONE_BOSS_STATES.READY_TO_STAGE;
                entry.activeEncounterId = null;
                effects.push({ type: 'milestone_ready', milestoneId: entry.milestoneId, reason: 'active_boss_missing' });
            }
        }
    }

    const changed = before !== JSON.stringify(state);
    if (changed) state.revision += 1;
    return { state, changed, effects };
}

/**
 * Applies one pure lifecycle event and returns adapter effects. The function
 * never spawns or searches for an enemy itself.
 */
export function applyMilestoneBossEvent(rawState, event = {}) {
    const state = migrateMilestoneBossLifecycleState(rawState);
    const effects = [];
    let changed = false;
    const milestoneId = eventMilestoneId(event);
    const entry = milestoneId ? state.milestones[milestoneId] : null;

    switch (event.type) {
        case MILESTONE_BOSS_EVENT_TYPES.GOAL_BUILT:
            if (entry && transitionToReady(entry)) {
                effects.push({ type: 'milestone_ready', milestoneId, reason: 'goal_built' });
                changed = true;
            }
            break;

        case MILESTONE_BOSS_EVENT_TYPES.STAGE:
        case MILESTONE_BOSS_EVENT_TYPES.BOSS_SPAWNED: {
            if (!entry || entry.status !== MILESTONE_BOSS_STATES.READY_TO_STAGE) break;
            entry.stageAttempt += 1;
            const encounterId = typeof event.encounterId === 'string' && event.encounterId.length > 0
                ? event.encounterId
                : `${milestoneId}:encounter:${entry.stageAttempt}`;
            entry.status = MILESTONE_BOSS_STATES.ACTIVE;
            entry.activeEncounterId = encounterId;
            entry.lastEncounterId = encounterId;
            effects.push({
                type: 'milestone_active',
                milestoneId,
                encounterId,
                goalKey: entry.goalKey,
                ringCrossingId: entry.ringCrossingId,
                presentationEnemyType: entry.presentationEnemyType
            });
            changed = true;
            break;
        }

        case MILESTONE_BOSS_EVENT_TYPES.ENEMY_KILLED:
            // A goal/crossing may identify an administrative event, but combat
            // kills must carry the canonical ID attached at spawn time.
            if (!DEFINITIONS_BY_ID.has(event.milestoneId)) break;
            if (entry.status !== MILESTONE_BOSS_STATES.ACTIVE) break;
            if (event.encounterId && entry.activeEncounterId && event.encounterId !== entry.activeEncounterId) break;
            entry.status = MILESTONE_BOSS_STATES.DEFEATED;
            entry.activeEncounterId = null;
            effects.push({ type: 'milestone_defeated', milestoneId, ringCrossingId: entry.ringCrossingId });
            changed = true;
            break;

        case MILESTONE_BOSS_EVENT_TYPES.PLAYER_DEATH:
        case MILESTONE_BOSS_EVENT_TYPES.QUIT:
        case MILESTONE_BOSS_EVENT_TYPES.ACT_TRANSITION:
            changed = interruptActiveMilestones(state, effects, event.type);
            break;

        case MILESTONE_BOSS_EVENT_TYPES.RELOAD:
        case MILESTONE_BOSS_EVENT_TYPES.BASE_RETURN: {
            const reconciled = reconcileMilestoneBossLifecycle(state, {
                builtGoalKeys: event.builtGoalKeys,
                activeMilestoneIds: event.activeMilestoneIds
                    ?? (event.type === MILESTONE_BOSS_EVENT_TYPES.RELOAD ? [] : undefined)
            });
            return reconciled;
        }

        default:
            break;
    }

    if (changed) state.revision += 1;
    return { state, changed, effects };
}

export const advanceMilestoneBossState = applyMilestoneBossEvent;

export function getMilestoneStatus(rawState, milestoneIdOrGoalKey) {
    const state = migrateMilestoneBossLifecycleState(rawState);
    const def = getMilestoneById(milestoneIdOrGoalKey) ?? getMilestoneForGoal(milestoneIdOrGoalKey);
    return def ? (state.milestones[def.milestoneId]?.status ?? MILESTONE_BOSS_STATES.NOT_READY) : null;
}

export function isMilestoneDefeated(rawState, milestoneIdOrGoalKey) {
    return getMilestoneStatus(rawState, milestoneIdOrGoalKey) === MILESTONE_BOSS_STATES.DEFEATED;
}

export function buildMilestoneBossReport(rawState) {
    const state = migrateMilestoneBossLifecycleState(rawState);
    const report = {};
    for (const definition of MILESTONE_BOSS_DEFINITIONS) {
        const entry = state.milestones[definition.milestoneId];
        report[definition.goalKey] = {
            goalKey: definition.goalKey,
            milestoneId: definition.milestoneId,
            ringCrossingId: definition.ringCrossingId,
            bossType: definition.presentationEnemyType,
            status: entry?.status ?? MILESTONE_BOSS_STATES.NOT_READY,
            stageAttempt: entry?.stageAttempt ?? 0,
            activeEncounterId: entry?.activeEncounterId ?? null,
            isUnlocked: entry?.status !== MILESTONE_BOSS_STATES.NOT_READY,
            isDefeated: entry?.status === MILESTONE_BOSS_STATES.DEFEATED
        };
    }
    return report;
}
