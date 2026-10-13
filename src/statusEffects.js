// Pure status-effect and synergy-resolution engine for Sprint 47 Lane 3
// (docs/planning/gameplay-feature-review-2026-09-24.md, Track B).
//
// The runtime owns rendering, audio, and projectile movement; this module owns
// status effect state, stack accumulation, decay timers, damage-over-time
// ticks, and the cross-lane grantRunDrop contract. Pure and deterministic.

import { SUIT_RELICS, WEAPON_OVERCLOCKS } from './runDrops.js';
import { registerSliceContract } from './sliceContracts.js';

export const STATUS_IDS = Object.freeze({
    FREEZE: 'freeze',
    CRYO: 'cryo',
    CORROSION: 'corrosion',
    CAUSTIC: 'caustic',
    BIO: 'bio',
    BURNING: 'burning',
    FIRE: 'fire',
    CHITIN_VULNERABILITY: 'chitin_vulnerability'
});

export const STATUS_DEFAULTS = Object.freeze({
    maxFreezeStacks: 100,
    freezeThreshold: 100,
    freezeDuration: 2.5,
    freezePerHit: 34,
    freezeDecayDelay: 1.5,
    freezeDecayRate: 20, // stacks decayed per second
    thawRetainedStacks: 50,
    corrosionDuration: 3.0,
    corrosionTickDamage: 2,
    corrosionTickInterval: 0.5,
    burningDuration: 3.5,
    burningMaxStacks: 5,
    burningTickDamage: 3,
    burningTickInterval: 0.5,
    chitinVulnerabilityDuration: 6.0,
    chitinDamageMultiplier: 1.25
});

/**
 * Creates a pristine status-effect state container for an entity.
 */
export function createTargetStatusState(initial = {}) {
    return {
        freezeStacks: Math.max(0, Number(initial.freezeStacks) || 0),
        freezeTimer: Math.max(0, Number(initial.freezeTimer) || 0),
        isFrozen: Boolean(initial.isFrozen),
        decayDelayTimer: Math.max(0, Number(initial.decayDelayTimer) || 0),
        corrosionTimer: Math.max(0, Number(initial.corrosionTimer) || 0),
        corrosionTickTimer: Math.max(0, Number(initial.corrosionTickTimer) || 0),
        corrosionTickDamage: Number(initial.corrosionTickDamage) || STATUS_DEFAULTS.corrosionTickDamage,
        corrosionTickInterval: Number(initial.corrosionTickInterval) || STATUS_DEFAULTS.corrosionTickInterval,
        isCorroded: Boolean(initial.isCorroded),
        corrodedBy: initial.corrodedBy ?? null,
        burningStacks: Math.max(0, Number(initial.burningStacks) || 0),
        burningTimer: Math.max(0, Number(initial.burningTimer) || 0),
        burningTickTimer: Math.max(0, Number(initial.burningTickTimer) || 0),
        burningTickDamage: Number(initial.burningTickDamage) || STATUS_DEFAULTS.burningTickDamage,
        burningTickInterval: Number(initial.burningTickInterval) || STATUS_DEFAULTS.burningTickInterval,
        isBurning: Boolean(initial.isBurning),
        burnedBy: initial.burnedBy ?? null,
        chitinVulnerabilityTimer: Math.max(0, Number(initial.chitinVulnerabilityTimer) || 0),
        chitinDamageMultiplier: Math.max(1, Number(initial.chitinDamageMultiplier) || 1),
        lastChitinVulnerabilityEventId: initial.lastChitinVulnerabilityEventId ?? null
    };
}

/**
 * Resolves or attaches the status container on a target (supports THREE.Sprite or plain objects).
 */
export function getTargetStatusContainer(target) {
    if (!target || typeof target !== 'object') return null;
    if (target.userData && typeof target.userData === 'object') {
        return (target.userData.statusEffects ??= createTargetStatusState());
    }
    return (target.statusEffects ??= createTargetStatusState());
}

/**
 * Applies the bounded bile/chitin vulnerability. Repeated sources refresh the
 * longer remaining duration; a repeated stable event ID is ignored entirely.
 */
export function applyChitinVulnerability(target, options = {}) {
    const state = getTargetStatusContainer(target);
    if (!state) return false;
    const eventId = options.eventId ?? null;
    if (eventId && state.lastChitinVulnerabilityEventId === eventId) return false;

    const duration = Math.max(0, Number(options.duration ?? STATUS_DEFAULTS.chitinVulnerabilityDuration) || 0);
    const multiplier = Math.max(1, Math.min(
        STATUS_DEFAULTS.chitinDamageMultiplier,
        Number(options.multiplier ?? STATUS_DEFAULTS.chitinDamageMultiplier) || 1
    ));
    if (duration <= 0 || multiplier <= 1) return false;

    state.chitinVulnerabilityTimer = Math.max(state.chitinVulnerabilityTimer, duration);
    state.chitinDamageMultiplier = Math.max(state.chitinDamageMultiplier, multiplier);
    state.lastChitinVulnerabilityEventId = eventId;
    if (target.userData && typeof target.userData === 'object') {
        target.userData.chitinVulnerabilityTimer = state.chitinVulnerabilityTimer;
        target.userData.chitinDamageMultiplier = state.chitinDamageMultiplier;
    }
    return true;
}

export function getDamageTakenMultiplier(target) {
    const state = getTargetStatusContainer(target);
    return state?.chitinVulnerabilityTimer > 0 ? state.chitinDamageMultiplier : 1;
}

/**
 * Normalizes status names ('cryo' -> 'freeze', 'caustic'/'bio' -> 'corrosion').
 */
function normalizeStatusId(statusId) {
    const id = String(statusId || '').toLowerCase();
    if (id === STATUS_IDS.FREEZE || id === STATUS_IDS.CRYO) return STATUS_IDS.FREEZE;
    if (id === STATUS_IDS.CORROSION || id === STATUS_IDS.CAUSTIC || id === STATUS_IDS.BIO) return STATUS_IDS.CORROSION;
    if (id === STATUS_IDS.BURNING || id === STATUS_IDS.FIRE) return STATUS_IDS.BURNING;
    return id;
}

/**
 * Applies a status effect (freeze stacks, corrosion, or burning) to a target.
 *
 * @param {object} target - Target enemy sprite or entity
 * @param {string} statusId - 'freeze', 'cryo', 'corrosion', 'caustic', 'bio', 'burning', or 'fire'
 * @param {number} [amount] - Stacks to add (freeze/burning) or duration in seconds (corrosion)
 * @param {object} [options] - Configuration overrides and callbacks
 * @returns {object|null} The updated status container
 */
export function applyStatus(target, statusId, amount = 1, options = {}) {
    const state = getTargetStatusContainer(target);
    if (!state) return null;

    const norm = normalizeStatusId(statusId);

    if (norm === STATUS_IDS.FREEZE) {
        const stacksToAdd = Number(amount) > 0 ? Number(amount) : (options.freezePerHit ?? STATUS_DEFAULTS.freezePerHit);
        const maxStacks = options.maxStacks ?? STATUS_DEFAULTS.maxFreezeStacks;
        const threshold = options.freezeThreshold ?? STATUS_DEFAULTS.freezeThreshold;

        state.freezeStacks = Math.min(maxStacks, state.freezeStacks + stacksToAdd);
        state.decayDelayTimer = Math.max(state.decayDelayTimer, options.decayDelay ?? STATUS_DEFAULTS.freezeDecayDelay);

        if (state.freezeStacks >= threshold) {
            const wasFrozen = state.isFrozen;
            state.isFrozen = true;
            state.freezeTimer = Math.max(state.freezeTimer, options.duration ?? STATUS_DEFAULTS.freezeDuration);
            if (target.userData && typeof target.userData === 'object') {
                target.userData.frozenTimer = state.freezeTimer;
                target.userData.frozen = true;
            }
            if (!wasFrozen) {
                options.onFrozen?.(target, state);
            }
        }
        return state;
    }

    if (norm === STATUS_IDS.CORROSION) {
        const duration = Number(amount) > 0 ? Number(amount) : (options.duration ?? STATUS_DEFAULTS.corrosionDuration);
        state.isCorroded = true;
        state.corrosionTimer = Math.max(state.corrosionTimer, duration);
        state.corrosionTickDamage = options.tickDamage ?? STATUS_DEFAULTS.corrosionTickDamage;
        state.corrosionTickInterval = options.tickInterval ?? STATUS_DEFAULTS.corrosionTickInterval;
        if (state.corrosionTickTimer <= 0) {
            state.corrosionTickTimer = state.corrosionTickInterval;
        }
        state.corrodedBy = options.source ?? 'player';
        if (target.userData && typeof target.userData === 'object') {
            target.userData.corroded = true;
            target.userData.corrosionTimer = state.corrosionTimer;
        }
        options.onCorrosionApplied?.(target, state);
        return state;
    }

    if (norm === STATUS_IDS.BURNING) {
        // Immunity checks: fire-immune entities, machines, or wet volumes
        const isImmune = Boolean(
            target.isFireImmune ||
            target.userData?.isFireImmune ||
            options.tags?.includes('fire_immune') ||
            options.tags?.includes('wet')
        );
        if (isImmune) return state;

        // Fire cancels freeze / thaws frozen targets
        if (state.isFrozen || state.freezeStacks > 0) {
            state.freezeStacks = Math.max(0, state.freezeStacks - 40 * (amount > 0 ? amount : 1));
            if (state.isFrozen && state.freezeStacks < STATUS_DEFAULTS.freezeThreshold) {
                state.isFrozen = false;
                state.freezeTimer = 0;
                if (target.userData && typeof target.userData === 'object') {
                    target.userData.frozen = false;
                    target.userData.frozenTimer = 0;
                }
                options.onThaw?.(target, state);
            }
        }

        const duration = options.duration ?? STATUS_DEFAULTS.burningDuration;
        const maxStacks = options.maxStacks ?? STATUS_DEFAULTS.burningMaxStacks;
        const stacksToAdd = Math.max(1, Number(amount) || 1);

        state.burningStacks = Math.min(maxStacks, state.burningStacks + stacksToAdd);
        state.burningTimer = Math.max(state.burningTimer, duration);
        state.burningTickDamage = (options.tickDamage ?? STATUS_DEFAULTS.burningTickDamage) * Math.max(1, state.burningStacks * 0.75);
        state.burningTickInterval = options.tickInterval ?? STATUS_DEFAULTS.burningTickInterval;
        if (state.burningTickTimer <= 0) {
            state.burningTickTimer = state.burningTickInterval;
        }
        state.burnedBy = options.source ?? 'player';
        state.isBurning = true;

        if (target.userData && typeof target.userData === 'object') {
            target.userData.burning = true;
            target.userData.burningTimer = state.burningTimer;
            target.userData.burningStacks = state.burningStacks;
        }
        options.onBurningApplied?.(target, state);
        return state;
    }

    return state;
}

/**
 * Retrieves the current status details of a target.
 *
 * @param {object} target - Target enemy or entity
 * @param {string} statusId - 'freeze', 'cryo', 'corrosion', 'caustic', or 'bio'
 * @returns {object} Status inspection payload
 */
export function getStatus(target, statusId) {
    const state = getTargetStatusContainer(target);
    const norm = normalizeStatusId(statusId);

    if (norm === STATUS_IDS.FREEZE) {
        if (!state) {
            return { active: false, stacks: 0, isFrozen: false, timer: 0, slowMult: 1.0 };
        }
        const isFrozen = state.isFrozen || state.freezeTimer > 0;
        const slowMult = isFrozen ? 0.0 : (state.freezeStacks >= 30 ? 0.5 : 1.0);
        return {
            active: state.freezeStacks > 0 || isFrozen,
            stacks: state.freezeStacks,
            isFrozen,
            timer: state.freezeTimer,
            slowMult
        };
    }

    if (norm === STATUS_IDS.CORROSION) {
        if (!state) {
            return { active: false, timer: 0, tickDamage: 0, tickInterval: 0 };
        }
        return {
            active: state.isCorroded && state.corrosionTimer > 0,
            timer: state.corrosionTimer,
            tickDamage: state.corrosionTickDamage,
            tickInterval: state.corrosionTickInterval
        };
    }

    if (norm === STATUS_IDS.BURNING) {
        if (!state) {
            return { active: false, timer: 0, stacks: 0, tickDamage: 0, tickInterval: 0, burnedBy: null };
        }
        return {
            active: state.isBurning && state.burningTimer > 0,
            timer: state.burningTimer,
            stacks: state.burningStacks,
            tickDamage: state.burningTickDamage,
            tickInterval: state.burningTickInterval,
            burnedBy: state.burnedBy
        };
    }

    return { active: false };
}

/**
 * Clears a specific status effect from a target.
 */
export function clearStatus(target, statusId) {
    const state = getTargetStatusContainer(target);
    if (!state) return;
    const norm = normalizeStatusId(statusId);

    if (norm === STATUS_IDS.FREEZE) {
        state.freezeStacks = 0;
        state.freezeTimer = 0;
        state.isFrozen = false;
        state.decayDelayTimer = 0;
        if (target.userData && typeof target.userData === 'object') {
            target.userData.frozenTimer = 0;
            target.userData.frozen = false;
        }
    } else if (norm === STATUS_IDS.CORROSION) {
        state.isCorroded = false;
        state.corrosionTimer = 0;
        state.corrosionTickTimer = 0;
        if (target.userData && typeof target.userData === 'object') {
            target.userData.corroded = false;
            target.userData.corrosionTimer = 0;
        }
    } else if (norm === STATUS_IDS.BURNING) {
        state.isBurning = false;
        state.burningStacks = 0;
        state.burningTimer = 0;
        state.burningTickTimer = 0;
        if (target.userData && typeof target.userData === 'object') {
            target.userData.burning = false;
            target.userData.burningTimer = 0;
            target.userData.burningStacks = 0;
        }
    }
}

/**
 * Advances timers, executes corrosion ticks, and decays freeze stacks over delta time.
 *
 * @param {object} target - Target entity
 * @param {number} delta - Elapsed seconds
 * @param {object} [callbacks] - Handlers for { onCorrosionTick, onThaw, onCorrosionExpired, onBurningTick, onBurningExpired }
 * @param {object} [tuning] - Tuning parameter overrides
 * @returns {object} Status tick results summary
 */
export function tickStatusEffects(target, delta, callbacks = {}, tuning = {}) {
    const state = getTargetStatusContainer(target);
    if (!state || delta <= 0) return { isFrozen: false, isCorroded: false, isBurning: false, freezeStacks: 0, burningStacks: 0 };

    const decayRate = tuning.freezeDecayRate ?? STATUS_DEFAULTS.freezeDecayRate;
    const thawStacks = tuning.thawRetainedStacks ?? STATUS_DEFAULTS.thawRetainedStacks;

    if (state.chitinVulnerabilityTimer > 0) {
        state.chitinVulnerabilityTimer = Math.max(0, state.chitinVulnerabilityTimer - delta);
        if (target.userData && typeof target.userData === 'object') {
            target.userData.chitinVulnerabilityTimer = state.chitinVulnerabilityTimer;
        }
        if (state.chitinVulnerabilityTimer <= 0) {
            state.chitinDamageMultiplier = 1;
            state.lastChitinVulnerabilityEventId = null;
            if (target.userData && typeof target.userData === 'object') {
                target.userData.chitinDamageMultiplier = 1;
            }
            callbacks.onChitinVulnerabilityExpired?.(target, state);
        }
    }

    // 1. Freeze & chill handling
    if (state.isFrozen) {
        state.freezeTimer = Math.max(0, state.freezeTimer - delta);
        if (target.userData && typeof target.userData === 'object') {
            target.userData.frozenTimer = state.freezeTimer;
        }
        if (state.freezeTimer <= 0) {
            state.isFrozen = false;
            state.freezeStacks = Math.min(state.freezeStacks, thawStacks);
            state.decayDelayTimer = tuning.freezeDecayDelay ?? STATUS_DEFAULTS.freezeDecayDelay;
            if (target.userData && typeof target.userData === 'object') {
                target.userData.frozen = false;
            }
            callbacks.onThaw?.(target, state);
        }
    } else {
        const decayTime = Math.max(0, delta - state.decayDelayTimer);
        state.decayDelayTimer = Math.max(0, state.decayDelayTimer - delta);
        if (decayTime > 0 && state.freezeStacks > 0) {
            state.freezeStacks = Math.max(0, state.freezeStacks - (decayRate * decayTime));
        }
    }

    // 2. Corrosion DoT handling
    if (state.isCorroded) {
        let remainingDelta = delta;
        while (remainingDelta > 0 && state.isCorroded && state.corrosionTimer > 0) {
            const step = Math.min(remainingDelta, state.corrosionTickTimer > 0 ? state.corrosionTickTimer : state.corrosionTickInterval, state.corrosionTimer);
            if (step <= 0) break;
            state.corrosionTimer = Math.max(0, state.corrosionTimer - step);
            state.corrosionTickTimer -= step;
            remainingDelta -= step;

            if (state.corrosionTickTimer <= 0 && (state.isCorroded || state.corrosionTimer > 0)) {
                state.corrosionTickTimer += state.corrosionTickInterval;
                callbacks.onCorrosionTick?.(target, state.corrosionTickDamage, state);
            }
        }

        if (state.corrosionTimer <= 0) {
            state.isCorroded = false;
            state.corrosionTickTimer = 0;
            if (target.userData && typeof target.userData === 'object') {
                target.userData.corroded = false;
                target.userData.corrosionTimer = 0;
            }
            callbacks.onCorrosionExpired?.(target, state);
        }
    }

    // 3. Burning DoT handling
    if (state.isBurning) {
        let remainingDelta = delta;
        while (remainingDelta > 0 && state.isBurning && state.burningTimer > 0) {
            const step = Math.min(remainingDelta, state.burningTickTimer > 0 ? state.burningTickTimer : state.burningTickInterval, state.burningTimer);
            if (step <= 0) break;
            state.burningTimer = Math.max(0, state.burningTimer - step);
            state.burningTickTimer -= step;
            remainingDelta -= step;

            if (state.burningTickTimer <= 0 && (state.isBurning || state.burningTimer > 0)) {
                state.burningTickTimer += state.burningTickInterval;
                callbacks.onBurningTick?.(target, state.burningTickDamage, state);
                callbacks.onDamage?.(target, state.burningTickDamage, { type: 'burning', source: state.burnedBy });
            }
        }

        if (state.burningTimer <= 0) {
            state.isBurning = false;
            state.burningStacks = 0;
            state.burningTickTimer = 0;
            if (target.userData && typeof target.userData === 'object') {
                target.userData.burning = false;
                target.userData.burningTimer = 0;
                target.userData.burningStacks = 0;
            }
            callbacks.onBurningExpired?.(target, state);
        }
    }

    return {
        isFrozen: state.isFrozen,
        isCorroded: state.isCorroded,
        isBurning: state.isBurning,
        freezeStacks: state.freezeStacks,
        burningStacks: state.burningStacks
    };
}

/**
 * Serializes entity status state into a plain object suitable for save/resume or network sync.
 */
export function serializeTargetStatuses(target) {
    const state = getTargetStatusContainer(target);
    if (!state) return null;
    return {
        freezeStacks: Math.round(state.freezeStacks * 100) / 100,
        freezeTimer: Math.round(state.freezeTimer * 100) / 100,
        isFrozen: state.isFrozen,
        decayDelayTimer: Math.round(state.decayDelayTimer * 100) / 100,
        corrosionTimer: Math.round(state.corrosionTimer * 100) / 100,
        corrosionTickTimer: Math.round(state.corrosionTickTimer * 100) / 100,
        corrosionTickDamage: state.corrosionTickDamage,
        corrosionTickInterval: state.corrosionTickInterval,
        isCorroded: state.isCorroded,
        corrodedBy: state.corrodedBy,
        burningStacks: state.burningStacks,
        burningTimer: Math.round(state.burningTimer * 100) / 100,
        burningTickTimer: Math.round(state.burningTickTimer * 100) / 100,
        burningTickDamage: state.burningTickDamage,
        burningTickInterval: state.burningTickInterval,
        isBurning: state.isBurning,
        burnedBy: state.burnedBy,
        chitinVulnerabilityTimer: Math.round(state.chitinVulnerabilityTimer * 100) / 100,
        chitinDamageMultiplier: state.chitinDamageMultiplier,
        lastChitinVulnerabilityEventId: state.lastChitinVulnerabilityEventId
    };
}

/**
 * Rehydrates status state from a serialized snapshot.
 */
export function deserializeTargetStatuses(target, data) {
    if (!target || !data) return null;
    const state = getTargetStatusContainer(target);
    if (!state) return null;
    Object.assign(state, createTargetStatusState(data));
    if (target.userData && typeof target.userData === 'object') {
        target.userData.frozen = state.isFrozen;
        target.userData.frozenTimer = state.freezeTimer;
        target.userData.corroded = state.isCorroded;
        target.userData.burning = state.isBurning;
        target.userData.burningTimer = state.burningTimer;
        target.userData.burningStacks = state.burningStacks;
        target.userData.chitinVulnerabilityTimer = state.chitinVulnerabilityTimer;
        target.userData.chitinDamageMultiplier = state.chitinDamageMultiplier;
    }
    return state;
}

/**
 * Grants a weapon overclock or suit relic to the player or game container.
 * Required cross-lane contract implementation for Sprint 47 Lane 3.
 *
 * @param {object} game - ThreeGame instance or mock container
 * @param {string} dropId - The catalog ID of the drop
 * @returns {boolean} True if granted successfully
 */
export function grantRunDrop(game, dropId) {
    if (!game || !dropId) return false;
    const allCatalog = [...WEAPON_OVERCLOCKS, ...SUIT_RELICS];
    const drop = allCatalog.find((item) => item.id === dropId);
    if (!drop || drop.implemented === false) return false;

    if (typeof game.equipRunDrop === 'function') {
        return Boolean(game.equipRunDrop(drop));
    }

    // Fallback for mocks and test harnesses
    if (Array.isArray(game.runRelics) || Array.isArray(game.runOverclocks)) {
        const pool = drop.type === 'overclock' ? (game.runOverclocks ??= []) : (game.runRelics ??= []);
        if (pool.some((item) => item.id === drop.id)) return false;
        pool.push(drop);
        if (typeof game.recomputeSynergies === 'function') {
            game.recomputeSynergies();
        }
        return true;
    }

    return false;
}

// Register contract immediately on module load so Lane 1 and 2 can consume it
registerSliceContract('grantRunDrop', grantRunDrop);
