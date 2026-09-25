// Three authored Ring 1 tactical formations and their runtime adapter.
// Selection/planning is deterministic; sprite/effect work is isolated in
// spawnEncounterRecipe so the definitions and coordinator stay unit-testable.
import { getEnemyStats } from './data/enemies.js';
import {
    ENCOUNTER_ROLES,
    FORMATION_STATES,
    coordinateEncounter,
    createEncounterCoordinator,
    encounterDamageMultiplier,
    reconcileEncounterStatuses
} from './encounterCoordination.js';
import {
    COOP_ROLE,
    COOP_TRANSITION_EVENTS,
    announcesEncounterFormationState,
    coopRole,
    runsEncounterCoordinationLocally
} from './coopTransitions.js';
import { registerSliceContract } from './sliceContracts.js';
import { getStatus as getLaneStatus } from './statusEffects.js';

export const EXISTING_ENCOUNTER_HOSTILES = Object.freeze([
    'cybersnail',
    'cryosnail',
    'sporesnail',
    'sentinel',
    'crawler',
    'mycelium_stalker',
    'alien_proto_spitter'
]);

const member = (id, type, role, x, z) => Object.freeze({ id, type, role, offset: Object.freeze({ x, z }) });

export const ENCOUNTER_RECIPES = Object.freeze({
    locked_crossfire: Object.freeze({
        id: 'locked_crossfire',
        labelKey: 'ui.encounters.locked_crossfire.name',
        members: Object.freeze([
            member('left-anchor', 'cybersnail', 'anchor', -1.4, 1.1),
            member('right-anchor', 'cybersnail', 'anchor', 1.4, 1.1),
            member('crossfire-suppressor', 'sentinel', 'suppressor', 0, 4.2)
        ])
    }),
    bloom_push: Object.freeze({
        id: 'bloom_push',
        labelKey: 'ui.encounters.bloom_push.name',
        members: Object.freeze([
            member('bloom-suppressor', 'alien_proto_spitter', 'suppressor', 0, 4.6),
            member('bloom-controller', 'sporesnail', 'controller', 0, 2.2),
            member('left-flanker', 'crawler', 'flanker', -3.0, 0.4),
            member('right-flanker', 'crawler', 'flanker', 3.0, 0.4),
            member('bloom-support', 'sporesnail', 'support', 2.2, 3.7)
        ])
    }),
    cold_pincer: Object.freeze({
        id: 'cold_pincer',
        labelKey: 'ui.encounters.cold_pincer.name',
        members: Object.freeze([
            member('cold-anchor', 'cybersnail', 'anchor', 0, 2.0),
            member('cold-controller', 'cryosnail', 'controller', -1.5, 3.6),
            member('pincer-flanker', 'mycelium_stalker', 'flanker', 2.8, -1.2),
            member('cold-support', 'cryosnail', 'support', 1.7, 4.1)
        ])
    })
});

function seedAngle(seed, recipeId) {
    let value = (Number(seed) >>> 0) ^ 0x454e4352;
    for (const char of recipeId) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
    return ((value % 3600) / 3600) * Math.PI * 2;
}

export function planEncounterRecipe(recipeId, origin = {}, { seed = 0 } = {}) {
    const recipe = ENCOUNTER_RECIPES[recipeId];
    if (!recipe || !Number.isFinite(origin?.x) || !Number.isFinite(origin?.z)) return null;
    const angle = seedAngle(seed, recipeId);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        recipeId,
        seed: Number(seed) >>> 0,
        origin: { x: origin.x, z: origin.z },
        members: recipe.members.map((entry) => ({
            ...entry,
            x: origin.x + entry.offset.x * cos - entry.offset.z * sin,
            z: origin.z + entry.offset.x * sin + entry.offset.z * cos,
            scatterKey: `encounter:${Number(seed) >>> 0}:${recipeId}:${entry.id}`
        }))
    };
}

export function encounterRoleCoverage() {
    return Object.fromEntries(ENCOUNTER_ROLES.map((role) => [
        role,
        Object.values(ENCOUNTER_RECIPES)
            .filter((recipe) => recipe.members.some((entry) => entry.role === role))
            .map((recipe) => recipe.id)
    ]));
}

function dispatchEncounterEvent(type, detail) {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
    window.dispatchEvent(new CustomEvent(type, { detail }));
}

function playTelegraph(game, sprite, event) {
    const x = sprite?.position?.x;
    const z = sprite?.position?.z;
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const audio = event.audio ?? {};
    if (audio.cue === 'metal-stress') {
        window.AudioManager?.playMetalStress?.({ volume: 0.5, playbackRate: audio.playbackRate, force: true });
    } else {
        window.AudioManager?.play?.(audio.cue, { volume: 0.42, playbackRate: audio.playbackRate, bus: 'sfx' });
    }
    // A pooled burst is available for every role and remains readable even
    // when a specialized line/tether renderer is not present. Ring roles add
    // the existing expanding ground tell as a second spatial cue.
    game.spawnTextureBurstEffect?.(x, z, {
        textureKey: 'fx_spark_burst',
        color: event.visual?.color ?? 0xffffff,
        count: 5,
        baseScale: 0.55,
        duration: Math.max(0.35, event.windup ?? 0.7),
        speed: 0.12,
        rise: 0.2,
        opacity: 0.9,
        renderOrder: 30
    });
    if (event.visual?.kind === 'ground-ring' || event.visual?.kind === 'hazard-ring') {
        game.spawnFrostShockwaveEffect?.(x, z, event.visual.radius ?? 3);
    }
    dispatchEncounterEvent('encounter-role-telegraph', {
        encounterId: sprite.userData?.encounterId,
        memberId: event.memberId,
        role: event.role,
        attack: event.attack,
        windupMs: Math.round((event.windup ?? 0) * 1000),
        audio: event.audio,
        visual: event.visual
    });
}

function releaseRoleAttack(game, sprite, event, membersById) {
    if (!sprite?.userData || sprite.userData.burstTriggered) return;
    const player = game.player;
    const distance = player
        ? Math.hypot(player.position.x - sprite.position.x, player.position.z - sprite.position.z)
        : Infinity;
    switch (event.role) {
        case 'anchor':
            if (distance <= 2.8) game.takeDamage?.(1, 'encounter-anchor-slam', sprite.position.x, sprite.position.z);
            break;
        case 'suppressor':
            sprite.userData.fireCooldown = 0;
            sprite.userData.attackCooldown = 0;
            break;
        case 'flanker':
            sprite.userData.aiMode = 'hunt';
            sprite.userData.targetType = 'player';
            sprite.userData.pathRetargetTimer = 0;
            break;
        case 'controller':
            sprite.userData.attackCooldown = 0;
            sprite.userData.bossAttackTimer = 0;
            break;
        case 'support': {
            const ally = [...membersById.values()]
                .map((entry) => entry.sprite)
                .find((candidate) => candidate !== sprite && candidate?.parent && !candidate.userData?.burstTriggered
                    && candidate.userData?.hp < candidate.userData?.maxHp);
            if (ally) ally.userData.hp = Math.min(ally.userData.maxHp, ally.userData.hp + 1);
            break;
        }
        default:
            break;
    }
    dispatchEncounterEvent('encounter-role-attack', {
        encounterId: sprite.userData.encounterId,
        memberId: event.memberId,
        role: event.role,
        attack: event.attack
    });
}

/**
 * Spawn a real coordinated pack. The returned handle is deliberately explicit
 * (tick/memberDefeated/dispose/applyRemoteFormation) so callers own lifecycle;
 * it never creates setInterval/setTimeout work that could outlive the room.
 */
export function spawnEncounterRecipe(game, recipeId, origin, { seed = 0, getStatus = null } = {}) {
    const plan = planEncounterRecipe(recipeId, origin, { seed });
    if (!plan || !game || typeof game.spawnEnemyInstance !== 'function') return null;
    const encounterId = `${recipeId}:${plan.seed}:${Math.round(origin.x)},${Math.round(origin.z)}`;
    const membersById = new Map();
    for (const planned of plan.members) {
        const sprite = game.spawnEnemyInstance(planned.type, planned.x, planned.z);
        if (!sprite) continue;
        sprite.userData = sprite.userData ?? {};
        sprite.userData.scatterKey = planned.scatterKey;
        sprite.userData.encounterId = encounterId;
        sprite.userData.encounterRecipeId = recipeId;
        sprite.userData.encounterMemberId = planned.id;
        sprite.userData.encounterRole = planned.role;
        sprite.userData.aiMode = 'hunt';
        sprite.userData.targetType = 'player';
        membersById.set(planned.id, { ...planned, sprite });
    }
    if (membersById.size === 0) return null;

    let state = createEncounterCoordinator({
        encounterId,
        recipeId,
        seed: plan.seed,
        members: [...membersById.values()].map(({ id, type, role }) => ({ id, type, role }))
    });
    let disposed = false;
    let brokenDispatched = false;
    let clearedDispatched = false;

    const detail = () => ({ recipeId, encounterId, formationState: state.formationState, sequence: state.sequence });

    const processEvents = (events, { announce = true } = {}) => {
        for (const event of events) {
            if (event.type === 'role-telegraph') playTelegraph(game, membersById.get(event.memberId)?.sprite, event);
            if (event.type === 'role-attack') releaseRoleAttack(game, membersById.get(event.memberId)?.sprite, event, membersById);
            if (event.type !== 'formation-state') continue;
            if (event.formationState === FORMATION_STATES.BROKEN && !brokenDispatched) {
                brokenDispatched = true;
                dispatchEncounterEvent('encounter-formation-broken', detail());
            }
            if (event.formationState === FORMATION_STATES.CLEARED && !clearedDispatched) {
                clearedDispatched = true;
                dispatchEncounterEvent('encounter-cleared', detail());
            }
            if (announce && announcesEncounterFormationState(coopRole(game))) {
                game.broadcastSharedWorldEvent?.(COOP_TRANSITION_EVENTS.ENCOUNTER_FORMATION_STATE, detail());
            }
        }
    };

    const apply = (action, options) => {
        const result = coordinateEncounter(state, action);
        state = result.state;
        processEvents(result.events, options);
        return result.events;
    };

    const handle = {
        encounterId,
        recipeId,
        plan,
        members: membersById,
        get state() { return state; },
        tick(delta) {
            if (disposed || !runsEncounterCoordinationLocally(coopRole(game))) return [];
            for (const [memberId, entry] of membersById) {
                const coordinated = state.members.find((memberState) => memberState.id === memberId);
                if (!coordinated?.alive) continue;
                const dead = !entry.sprite?.parent || entry.sprite.userData?.burstTriggered || entry.sprite.userData?.hp <= 0;
                if (dead) apply({ type: 'MEMBER_DEFEATED', memberId });
                else if (!coordinated.staggered && entry.sprite.userData?.staggerState?.staggered) {
                    apply({ type: 'MEMBER_STAGGERED', memberId });
                }
            }
            if (state.formationState === FORMATION_STATES.CLEARED) return [];
            // Lane 2 is a read-only consumer of Lane 3's status contract.
            const statusReader = getStatus ?? getLaneStatus;
            const targets = new Map([...membersById].map(([id, entry]) => [id, entry.sprite]));
            const statusResult = reconcileEncounterStatuses(state, targets, statusReader);
            state = statusResult.state;
            processEvents(statusResult.events);
            return apply({ type: 'TICK', delta });
        },
        memberStaggered(memberId, reason = 'runtime-stagger') {
            if (disposed || !runsEncounterCoordinationLocally(coopRole(game))) return [];
            return apply({ type: 'MEMBER_STAGGERED', memberId, reason });
        },
        memberDefeated(memberId) {
            if (disposed || !runsEncounterCoordinationLocally(coopRole(game))) return [];
            return apply({ type: 'MEMBER_DEFEATED', memberId });
        },
        applyRemoteFormation(remote) {
            if (disposed || coopRole(game) !== COOP_ROLE.GUEST || remote?.encounterId !== encounterId) return false;
            const target = remote.formationState;
            if (target === FORMATION_STATES.STAGGERED) apply({ type: 'MEMBER_STAGGERED', memberId: state.members.find((m) => m.alive)?.id }, { announce: false });
            if (target === FORMATION_STATES.BROKEN) {
                const critical = state.members.find((m) => m.alive && ['anchor', 'suppressor', 'support'].includes(m.role));
                if (critical) apply({ type: 'MEMBER_DEFEATED', memberId: critical.id }, { announce: false });
            }
            if (target === FORMATION_STATES.CLEARED) apply({ type: 'CLEAR', reason: 'remote-cleared' }, { announce: false });
            return state.formationState === target;
        },
        dispose() {
            if (disposed) return;
            disposed = true;
            const result = coordinateEncounter(state, { type: 'CLEAR', reason: 'disposed' });
            state = result.state;
            game.coordinatedEncounters?.delete?.(encounterId);
        }
    };
    game.coordinatedEncounters ??= new Map();
    game.coordinatedEncounters.set(encounterId, handle);
    dispatchEncounterEvent('encounter-started', { recipeId, encounterId, memberCount: membersById.size });
    return handle;
}

// Day-one cross-lane contract: Lane 1 can call this without importing Lane 2.
registerSliceContract('spawnEncounterRecipe', spawnEncounterRecipe);

const CLASS_DAMAGE = Object.freeze({ SCOUT: 1, TANK: 2, ENGINEER: 1 });
const FIRE_INTERVAL = 0.55;

/**
 * Deterministic probe model for comparing target priorities. This is not a
 * player-performance claim: it holds aim, cadence, and movement constant so
 * only formation protection/priority changes.
 */
export function simulateEncounterPriority(recipeId, priorityRole, { playerClass = 'SCOUT', maxShots = 500 } = {}) {
    const recipe = ENCOUNTER_RECIPES[recipeId];
    if (!recipe) return null;
    const members = recipe.members.map((entry) => ({
        ...entry,
        hp: getEnemyStats(entry.type).maxHp
    }));
    let state = createEncounterCoordinator({ encounterId: 'probe', recipeId, seed: 1, members });
    const fallback = ['support', 'suppressor', 'anchor', 'controller', 'flanker'];
    const priorities = [priorityRole, ...fallback.filter((role) => role !== priorityRole)];
    const damage = CLASS_DAMAGE[String(playerClass).toUpperCase()] ?? 1;
    let shots = 0;
    while (members.some((entry) => entry.hp > 0) && shots < maxShots) {
        const target = priorities
            .flatMap((role) => members.filter((entry) => entry.role === role && entry.hp > 0))
            .at(0) ?? members.find((entry) => entry.hp > 0);
        const dealt = damage * encounterDamageMultiplier(state, target.id);
        target.hp = Math.max(0, target.hp - dealt);
        shots += 1;
        if (target.hp <= 0) state = coordinateEncounter(state, { type: 'MEMBER_DEFEATED', memberId: target.id }).state;
    }
    return {
        recipeId,
        priorityRole,
        playerClass: String(playerClass).toUpperCase(),
        shots,
        clearTimeSeconds: shots * FIRE_INTERVAL,
        cleared: !members.some((entry) => entry.hp > 0),
        finalFormationState: state.formationState
    };
}
