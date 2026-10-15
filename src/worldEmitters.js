export const EMITTER_PHASE = Object.freeze({
    IDLE: 'idle',
    TELEGRAPH: 'telegraph',
    ACTIVE: 'active',
    COOLDOWN: 'cooldown',
    DESTROYED: 'destroyed'
});

export const EMITTER_TRIGGER = Object.freeze({
    AMBIENT: 'ambient',
    CYCLE: 'cycle',
    PROXIMITY: 'proximity',
    INTERACTION: 'interaction',
    DAMAGE: 'damage'
});

const profile = (value) => Object.freeze({
    ...value,
    source: Object.freeze({ ...(value.source ?? {}) }),
    trigger: Object.freeze({ ...(value.trigger ?? {}) }),
    volume: Object.freeze({ ...(value.volume ?? {}) }),
    payload: Object.freeze((value.payload ?? []).map((entry) => Object.freeze({ ...entry }))),
    onDestroy: Object.freeze({ kind: 'stop', ...(value.onDestroy ?? {}) })
});

export const PROP_EMITTER_PROFILES = Object.freeze({
    prop_pipe_rupture: profile({
        substance: 'steam',
        source: { anchor: 'FX_EMITTER_00', fallbackDirection: [1, 0.15, 0] },
        trigger: { kind: EMITTER_TRIGGER.CYCLE, telegraph: 0.65, active: 1.1, cooldown: [5, 9], startsEnabled: true },
        volume: { shape: 'capsule', length: 2.4, radius: 0.45, tickInterval: 0.6 },
        payload: [{ kind: 'damage', amount: 1, reason: 'steam-burn' }],
        onDestroy: { kind: 'rupture_then_stop', duration: 1.5, payloadScale: 1.5 }
    }),
    geo_steam_manifold_actuator: profile({
        substance: 'steam',
        source: { anchor: 'FX_EMITTER_00', fallbackDirection: [0.7, 0.45, 0] },
        trigger: { kind: EMITTER_TRIGGER.CYCLE, telegraph: 0.7, active: 1.2, cooldown: [5.5, 8.5], startsEnabled: true },
        volume: { shape: 'capsule', length: 2.2, radius: 0.5, tickInterval: 0.6 },
        payload: [{ kind: 'damage', amount: 1, reason: 'steam-burn' }],
        onDestroy: { kind: 'rupture_then_stop', duration: 1.5, payloadScale: 1.5 }
    }),
    fungal_spore_vent: profile({
        substance: 'spores',
        source: { fallbackDirection: [0, 1, 0] },
        trigger: {
            kind: EMITTER_TRIGGER.PROXIMITY,
            enterRange: 3.25,
            exitRange: 4,
            telegraph: 0.8,
            active: 1.8,
            cooldown: [4.5, 6.5],
            startsEnabled: true
        },
        volume: { shape: 'sphere', radius: 1.6, tickInterval: 0.75 },
        payload: [
            { kind: 'infect', amount: 2, reason: 'spore-vent' },
            { kind: 'poison', duration: 2.5, reason: 'spore-vent' }
        ],
        onDestroy: { kind: 'spill', substance: 'bio_slime', radius: 0.8, duration: 5 }
    })
});

export function getWorldEmitterProfile(type) {
    return PROP_EMITTER_PROFILES[String(type ?? '')] ?? null;
}

function hashUnit(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967296;
}

function cooldownFor(state) {
    const range = state.profile.trigger.cooldown ?? [0, 0];
    const min = Math.max(0, Number(Array.isArray(range) ? range[0] : range) || 0);
    const max = Math.max(min, Number(Array.isArray(range) ? range[1] : range) || min);
    return min + (max - min) * hashUnit(`${state.id}:${state.activationCount}`);
}

export function validateWorldEmitterProfile(value) {
    const problems = [];
    if (!value?.substance) problems.push('substance is required');
    if (!Object.values(EMITTER_TRIGGER).includes(value?.trigger?.kind)) problems.push('trigger.kind is invalid');
    if (!['sphere', 'capsule', 'cone', 'pool'].includes(value?.volume?.shape)) problems.push('volume.shape is invalid');
    if (!(Number(value?.volume?.tickInterval) > 0)) problems.push('volume.tickInterval must be positive');
    for (const entry of value?.payload ?? []) {
        if (!['damage', 'infect', 'heal', 'poison', 'cleanse'].includes(entry.kind)) problems.push(`payload kind ${entry.kind} is invalid`);
    }
    return problems;
}

export function createWorldEmitterState(profileValue, { id, enabled } = {}) {
    if (!profileValue || !id) return null;
    const startsEnabled = enabled ?? profileValue.trigger.startsEnabled ?? true;
    const ambient = profileValue.trigger.kind === EMITTER_TRIGGER.AMBIENT;
    return {
        id: String(id),
        profile: profileValue,
        enabled: Boolean(startsEnabled),
        phase: startsEnabled && ambient ? EMITTER_PHASE.ACTIVE : EMITTER_PHASE.IDLE,
        phaseTime: 0,
        activationCount: 0,
        proximityLatched: false,
        damageTriggered: false,
        charges: profileValue.trigger.charges ?? null,
        exposureTimers: new Map()
    };
}

function enterPhase(state, phase, events) {
    if (state.phase === phase) return;
    state.phase = phase;
    state.phaseTime = 0;
    events.push({ type: 'phase', id: state.id, phase });
    if (phase === EMITTER_PHASE.ACTIVE) state.activationCount += 1;
}

function beginActivation(state, events) {
    const telegraph = Math.max(0, Number(state.profile.trigger.telegraph) || 0);
    enterPhase(state, telegraph > 0 ? EMITTER_PHASE.TELEGRAPH : EMITTER_PHASE.ACTIVE, events);
}

export function applyWorldEmitterAction(state, action) {
    if (!state || state.phase === EMITTER_PHASE.DESTROYED) return false;
    if (action === 'enable') state.enabled = true;
    else if (action === 'disable') state.enabled = false;
    else if (action === 'toggle') state.enabled = !state.enabled;
    else if (action === 'pulse') {
        if (state.charges != null && state.charges <= 0) return false;
        if (state.charges != null) state.charges -= 1;
        state.enabled = true;
        state.phase = EMITTER_PHASE.TELEGRAPH;
        state.phaseTime = 0;
    } else return false;
    if (!state.enabled) {
        state.phase = EMITTER_PHASE.IDLE;
        state.phaseTime = 0;
        state.exposureTimers.clear();
    }
    return true;
}

export function updateWorldEmitterState(state, delta, context = {}) {
    const events = [];
    if (!state || state.phase === EMITTER_PHASE.DESTROYED) return events;
    const dt = Math.min(0.1, Math.max(0, Number(delta) || 0));
    if (!state.enabled) return events;
    const trigger = state.profile.trigger;
    const nearDistance = Number(context.distance);
    if (trigger.kind === EMITTER_TRIGGER.PROXIMITY && Number.isFinite(nearDistance)) {
        if (!state.proximityLatched && nearDistance <= trigger.enterRange) state.proximityLatched = true;
        else if (state.proximityLatched && nearDistance >= trigger.exitRange) state.proximityLatched = false;
    }
    if (trigger.kind === EMITTER_TRIGGER.AMBIENT) {
        if (state.phase !== EMITTER_PHASE.ACTIVE) enterPhase(state, EMITTER_PHASE.ACTIVE, events);
        return events;
    }
    if (trigger.kind === EMITTER_TRIGGER.DAMAGE && !state.damageTriggered
        && Number(context.healthRatio) <= Number(trigger.healthRatio ?? 0.5)) {
        state.damageTriggered = true;
        beginActivation(state, events);
    }
    state.phaseTime += dt;
    if (state.phase === EMITTER_PHASE.IDLE) {
        if (trigger.kind === EMITTER_TRIGGER.CYCLE && state.phaseTime >= cooldownFor(state)) beginActivation(state, events);
        else if (trigger.kind === EMITTER_TRIGGER.PROXIMITY && state.proximityLatched) beginActivation(state, events);
    } else if (state.phase === EMITTER_PHASE.TELEGRAPH && state.phaseTime >= (trigger.telegraph ?? 0)) {
        enterPhase(state, EMITTER_PHASE.ACTIVE, events);
    } else if (state.phase === EMITTER_PHASE.ACTIVE && state.phaseTime >= (trigger.active ?? 0)) {
        enterPhase(state, EMITTER_PHASE.COOLDOWN, events);
    } else if (state.phase === EMITTER_PHASE.COOLDOWN && state.phaseTime >= cooldownFor(state)) {
        if (trigger.kind === EMITTER_TRIGGER.CYCLE) beginActivation(state, events);
        else enterPhase(state, EMITTER_PHASE.IDLE, events);
    }
    return events;
}

export function tickWorldEmitterExposure(state, targetId, delta) {
    if (!state || state.phase !== EMITTER_PHASE.ACTIVE || !targetId) return false;
    const interval = state.profile.volume.tickInterval;
    const remaining = (state.exposureTimers.get(targetId) ?? 0) - Math.max(0, Number(delta) || 0);
    if (remaining > 0) {
        state.exposureTimers.set(targetId, remaining);
        return false;
    }
    state.exposureTimers.set(targetId, interval);
    return true;
}

export function destroyWorldEmitterState(state) {
    if (!state || state.phase === EMITTER_PHASE.DESTROYED) return [];
    state.enabled = false;
    state.phase = EMITTER_PHASE.DESTROYED;
    state.phaseTime = 0;
    state.exposureTimers.clear();
    const policy = state.profile.onDestroy;
    if (policy.kind === 'stop') return [];
    const children = [];
    if (policy.kind.includes('rupture') || policy.kind.includes('burst')) {
        children.push({ ...policy, policyKind: policy.kind, id: `${state.id}:destroyed:jet:0`, kind: 'jet' });
    }
    if (policy.kind.includes('spill')) {
        children.push({ ...policy, policyKind: policy.kind, id: `${state.id}:destroyed:pool:0`, kind: 'pool' });
    }
    return children;
}
