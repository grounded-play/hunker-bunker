/**
 * Deterministic meltable ice barrier and fire gate system.
 *
 * Models staged ice barriers that accumulate heat from fire damage, cool down
 * when unheated, advance through visual melt stages, and disable collision upon
 * melting while guaranteeing reachable return routes.
 */

export const ICE_BARRIER_STATES = Object.freeze({
    FROZEN: 'frozen',
    MELTING: 'melting',
    FRACTURED: 'fractured',
    MELTED: 'melted'
});

export const ICE_BARRIER_DEFAULTS = Object.freeze({
    heatThreshold: 100,
    coolingRate: 12, // heat lost per second when not heated
    stages: 3,       // 0: solid, 1: dripping thaw, 2: fractured, 3: fully melted
    meltCoolingDelay: 1.0 // seconds of grace before cooling starts
});

/**
 * Creates an ice barrier run state.
 */
export function createIceBarrier({
    id,
    worldPosition = { x: 0, z: 0 },
    heatThreshold = ICE_BARRIER_DEFAULTS.heatThreshold,
    coolingRate = ICE_BARRIER_DEFAULTS.coolingRate,
    returnRoute = null,
    propType = 'cryo_frozen_cascade'
} = {}) {
    if (!id) return null;
    return {
        id: String(id),
        propType,
        worldPosition: { x: Number(worldPosition?.x) || 0, z: Number(worldPosition?.z) || 0 },
        state: ICE_BARRIER_STATES.FROZEN,
        heat: 0,
        heatThreshold: Math.max(1, Number(heatThreshold) || ICE_BARRIER_DEFAULTS.heatThreshold),
        coolingRate: Math.max(0, Number(coolingRate) || ICE_BARRIER_DEFAULTS.coolingRate),
        coolingDelayTimer: 0,
        stage: 0,
        collisionActive: true,
        returnRoute: returnRoute ?? { hasReturnRoute: true, type: 'bypass' }
    };
}

/**
 * Applies heat to an ice barrier (e.g. from flamethrower cone or burning damage).
 */
export function applyHeatToBarrier(barrier, heatAmount, { onStageChange = null, onMelted = null } = {}) {
    if (!barrier || barrier.state === ICE_BARRIER_STATES.MELTED) return barrier;

    const heat = Math.max(0, Number(heatAmount) || 0);
    if (heat <= 0) return barrier;

    barrier.heat = Math.min(barrier.heatThreshold, barrier.heat + heat);
    barrier.coolingDelayTimer = ICE_BARRIER_DEFAULTS.meltCoolingDelay;

    const oldStage = barrier.stage;
    const progress = barrier.heat / barrier.heatThreshold;
    const newStage = Math.min(ICE_BARRIER_DEFAULTS.stages, Math.floor(progress * ICE_BARRIER_DEFAULTS.stages));

    if (newStage !== oldStage) {
        barrier.stage = newStage;
        if (newStage >= 2 && barrier.state !== ICE_BARRIER_STATES.MELTED) {
            barrier.state = ICE_BARRIER_STATES.FRACTURED;
        } else if (newStage >= 1) {
            barrier.state = ICE_BARRIER_STATES.MELTING;
        }
        onStageChange?.(barrier, newStage, oldStage);
    }

    if (barrier.heat >= barrier.heatThreshold) {
        barrier.state = ICE_BARRIER_STATES.MELTED;
        barrier.stage = ICE_BARRIER_DEFAULTS.stages;
        barrier.collisionActive = false;
        onMelted?.(barrier);
    }

    return barrier;
}

/**
 * Updates an ice barrier over delta time, cooling down if not continuously heated.
 */
export function tickIceBarrier(barrier, delta, { onCooled = null } = {}) {
    if (!barrier || barrier.state === ICE_BARRIER_STATES.MELTED || delta <= 0) return barrier;

    if (barrier.coolingDelayTimer > 0) {
        barrier.coolingDelayTimer = Math.max(0, barrier.coolingDelayTimer - delta);
        return barrier;
    }

    if (barrier.heat > 0) {
        const cooling = barrier.coolingRate * delta;
        barrier.heat = Math.max(0, barrier.heat - cooling);

        const progress = barrier.heat / barrier.heatThreshold;
        const newStage = Math.floor(progress * ICE_BARRIER_DEFAULTS.stages);

        if (newStage !== barrier.stage) {
            barrier.stage = newStage;
            if (barrier.stage === 0) {
                barrier.state = ICE_BARRIER_STATES.FROZEN;
                onCooled?.(barrier);
            } else if (barrier.stage === 1) {
                barrier.state = ICE_BARRIER_STATES.MELTING;
            }
        }
    }

    return barrier;
}

/**
 * Validates that generation is fair: the fire weapon source is reachable before the gate approach,
 * and an alternate return route exists so a player without a flamethrower cannot be trapped.
 */
export function validateFireGateReachability({
    barriers = [],
    weaponSourceRing = 1,
    gateRing = 2,
    hasReturnPath = true
} = {}) {
    if (barriers.length === 0) return { valid: true };

    // Weapon source must spawn at or before the gate ring
    if (weaponSourceRing > gateRing) {
        return {
            valid: false,
            reason: 'unreachable-weapon-source',
            details: `Weapon source in ring ${weaponSourceRing} is placed after gate in ring ${gateRing}`
        };
    }

    // Every barrier must have a return path or alternate exit
    for (const barrier of barriers) {
        if (!barrier.returnRoute || barrier.returnRoute.hasReturnRoute !== true) {
            return {
                valid: false,
                reason: 'missing-return-route',
                barrierId: barrier.id
            };
        }
    }

    return { valid: true };
}
