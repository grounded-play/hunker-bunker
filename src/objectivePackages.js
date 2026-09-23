// Per-campaign objective packages for the first ship goal (O2 bubble).
//
// The console build is untouched: every campaign can still build O2 at the
// ship with resources. What changes between campaigns is an OPTIONAL second
// way to earn it, rolled once from the world seed, each with its own route,
// reward and a consequence the campaign keeps:
//
//   regulator_recovery  strip the ring-1 O2 room's regulator   -> half cost,
//                        and that room is left breathing thin air
//   power_reroute        reroute ring power at the ring-1 gate,
//                        then restart the O2 room               -> free build,
//                        and the ring-1 gate approach goes permanently dark
//   camp_supply          buy Meridian's own regulator            -> half cost,
//                        Meridian bond +1, but Meridian is left strained
//
// Pure: state in, state out. threeGame owns placement, prompts and effects.
import { mixRunEntropy } from './runEntropy.js';

export const OBJECTIVE_PACKAGE_STATE_VERSION = 1;

// Where each step happens. Resolved by the runtime against the world plan.
export const PACKAGE_SITES = Object.freeze({
    O2_ROOM: 'o2_room',
    RING1_GATE_CONTROL: 'ring1_gate_control',
    MERIDIAN: 'camp_meridian'
});

export const O2_OBJECTIVE_PACKAGES = Object.freeze({
    regulator_recovery: Object.freeze({
        id: 'regulator_recovery',
        goalKey: 'o2Bubble',
        steps: Object.freeze([
            Object.freeze({ id: 'recover_regulator', site: PACKAGE_SITES.O2_ROOM })
        ]),
        reward: Object.freeze({ costMultiplier: 0.5 }),
        consequence: Object.freeze({ kind: 'thin_air_room', o2DrainMultiplier: 1.3 })
    }),
    power_reroute: Object.freeze({
        id: 'power_reroute',
        goalKey: 'o2Bubble',
        steps: Object.freeze([
            Object.freeze({ id: 'reroute_gate_power', site: PACKAGE_SITES.RING1_GATE_CONTROL }),
            Object.freeze({ id: 'restart_o2_room', site: PACKAGE_SITES.O2_ROOM })
        ]),
        reward: Object.freeze({ costMultiplier: 0 }),
        consequence: Object.freeze({ kind: 'ring1_blackout' })
    }),
    camp_supply: Object.freeze({
        id: 'camp_supply',
        goalKey: 'o2Bubble',
        steps: Object.freeze([
            Object.freeze({ id: 'negotiate_supply', site: PACKAGE_SITES.MERIDIAN, shells: 12 })
        ]),
        reward: Object.freeze({ costMultiplier: 0.5 }),
        consequence: Object.freeze({ kind: 'meridian_strained', bond: 1 })
    })
});

const PACKAGE_ORDER = Object.freeze(['regulator_recovery', 'power_reroute', 'camp_supply']);

/** The campaign's package: fixed for the life of a world seed. */
export function selectObjectivePackageId(worldSeed) {
    const roll = mixRunEntropy(Number(worldSeed) >>> 0, 0x4f325047, 1);
    return PACKAGE_ORDER[roll % PACKAGE_ORDER.length];
}

export function createObjectivePackageState(worldSeed) {
    return {
        version: OBJECTIVE_PACKAGE_STATE_VERSION,
        packageId: selectObjectivePackageId(worldSeed),
        completedSteps: [],
        completed: false
    };
}

/** Accepts only a well-formed saved state for a known package. */
export function normalizeObjectivePackageState(raw, worldSeed) {
    const fallback = createObjectivePackageState(worldSeed);
    const definition = O2_OBJECTIVE_PACKAGES[raw?.packageId];
    if (!raw || raw.version !== OBJECTIVE_PACKAGE_STATE_VERSION || !definition) return fallback;
    const known = new Set(definition.steps.map((step) => step.id));
    const completedSteps = (Array.isArray(raw.completedSteps) ? raw.completedSteps : [])
        .filter((id, index, list) => known.has(id) && list.indexOf(id) === index);
    return {
        version: OBJECTIVE_PACKAGE_STATE_VERSION,
        packageId: definition.id,
        completedSteps,
        completed: definition.steps.every((step) => completedSteps.includes(step.id))
    };
}

export function getObjectivePackage(state) {
    return O2_OBJECTIVE_PACKAGES[state?.packageId] ?? null;
}

/** The next step still to do, or null when the package is complete. */
export function nextPackageStep(state) {
    const definition = getObjectivePackage(state);
    if (!definition || state.completed) return null;
    return definition.steps.find((step) => !state.completedSteps.includes(step.id)) ?? null;
}

/**
 * Complete a step. Steps are ordered: only the next one can be done, so a
 * reroute cannot restart the O2 room before the power is actually routed.
 */
export function completePackageStep(state, stepId) {
    const next = nextPackageStep(state);
    if (!next || next.id !== stepId) return { state, advanced: false, completedNow: false };
    const completedSteps = [...state.completedSteps, stepId];
    const definition = getObjectivePackage(state);
    const completed = definition.steps.every((step) => completedSteps.includes(step.id));
    return { state: { ...state, completedSteps, completed }, advanced: true, completedNow: completed };
}

/** The console cost once the package's reward applies (unchanged until complete). */
export function applyPackageReward(cost, state, goalKey) {
    const definition = getObjectivePackage(state);
    if (!cost || !definition || !state.completed || definition.goalKey !== goalKey) return cost;
    const multiplier = definition.reward.costMultiplier;
    if (multiplier <= 0) return {};
    return Object.fromEntries(Object.entries(cost).map(([key, amount]) => [key, Math.ceil(amount * multiplier)]));
}

/** The consequence the campaign now carries, or null. */
export function activePackageConsequence(state) {
    const definition = getObjectivePackage(state);
    return definition && state.completed ? definition.consequence : null;
}
