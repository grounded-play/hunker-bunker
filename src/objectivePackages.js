// Per-campaign objective packages for the four ship goals.
//
// The console build is untouched: every campaign can still build each goal at
// the ship with resources. What changes between campaigns is an OPTIONAL
// second way to earn each goal, rolled once per goal from the world seed, with
// its own route through that goal's ring, a reward on the console price and a
// consequence the campaign keeps. Only the next unbuilt goal's package is in
// play at a time (the runtime decides that; this module is pure).
import { mixRunEntropy } from './runEntropy.js';

export const OBJECTIVE_PACKAGE_STATE_VERSION = 2;

export const PACKAGE_GOAL_ORDER = Object.freeze(['o2Bubble', 'hullExpansion', 'radarNode', 'reactorCompressor']);

// Step sites. `key` is what the runtime matches prompts and interactions on.
const goalRoom = (goalKey) => Object.freeze({ kind: 'goal_room', goalKey, key: `goal_room:${goalKey}` });
const gateControl = (ring) => Object.freeze({ kind: 'gate_control', ring, key: `gate_control:${ring}` });
const camp = (campId) => Object.freeze({ kind: 'camp', campId, key: `camp:${campId}` });
const hiveNursery = (hiveId) => Object.freeze({ kind: 'hive_nursery', hiveId, key: `hive_nursery:${hiveId}` });

function pkg(id, goalKey, steps, reward, consequence) {
    return Object.freeze({
        id,
        goalKey,
        steps: Object.freeze(steps.map((step) => Object.freeze(step))),
        reward: Object.freeze(reward),
        consequence: Object.freeze(consequence)
    });
}

const HALF = { costMultiplier: 0.5 };
const FREE = { costMultiplier: 0 };

export const OBJECTIVE_PACKAGES = Object.freeze({
    // Ring 1 -- O2 bubble.
    regulator_recovery: pkg('regulator_recovery', 'o2Bubble',
        [{ id: 'recover_regulator', site: goalRoom('o2Bubble') }],
        HALF, { kind: 'thin_air_room', goalKey: 'o2Bubble', o2DrainMultiplier: 1.3 }),
    power_reroute: pkg('power_reroute', 'o2Bubble',
        [{ id: 'reroute_gate_power', site: gateControl(1) }, { id: 'restart_o2_room', site: goalRoom('o2Bubble') }],
        FREE, { kind: 'gate_blackout', ring: 1 }),
    camp_supply: pkg('camp_supply', 'o2Bubble',
        [{ id: 'negotiate_supply', site: camp('camp_meridian'), shells: 12 }],
        HALF, { kind: 'camp_strained', campId: 'camp_meridian', bond: 1 }),
    // Ring 2 -- hull expansion.
    hull_plate_salvage: pkg('hull_plate_salvage', 'hullExpansion',
        [{ id: 'cut_hull_plates', site: goalRoom('hullExpansion') }],
        HALF, { kind: 'gate_infested', ring: 2 }),
    tallow_resin_seal: pkg('tallow_resin_seal', 'hullExpansion',
        [{ id: 'buy_resin_seal', site: camp('camp_tallow'), shells: 18 }],
        HALF, { kind: 'camp_strained', campId: 'camp_tallow', bond: 1 }),
    suture_chitin_graft: pkg('suture_chitin_graft', 'hullExpansion',
        [{ id: 'harvest_chitin', site: hiveNursery('hive_suture') }],
        FREE, { kind: 'hive_creep', hiveId: 'hive_suture', rings: 1 }),
    // Ring 3 -- radar node.
    mast_power_reroute: pkg('mast_power_reroute', 'radarNode',
        [{ id: 'tap_gate_power', site: gateControl(3) }, { id: 'align_radar_mast', site: goalRoom('radarNode') }],
        FREE, { kind: 'gate_blackout', ring: 3 }),
    vesper_scope_trade: pkg('vesper_scope_trade', 'radarNode',
        [{ id: 'trade_for_scope', site: camp('camp_vesper'), shells: 24 }],
        HALF, { kind: 'camp_strained', campId: 'camp_vesper', bond: 1 }),
    relay_signal_tap: pkg('relay_signal_tap', 'radarNode',
        [{ id: 'splice_relay_nerve', site: hiveNursery('hive_relay') }],
        HALF, { kind: 'hive_creep', hiveId: 'hive_relay', rings: 1 }),
    // Ring 4 -- reactor compressor.
    core_scavenge: pkg('core_scavenge', 'reactorCompressor',
        [{ id: 'pull_compressor_core', site: goalRoom('reactorCompressor') }],
        HALF, { kind: 'thin_air_room', goalKey: 'reactorCompressor', o2DrainMultiplier: 1.3 }),
    carapace_heat_siphon: pkg('carapace_heat_siphon', 'reactorCompressor',
        [{ id: 'siphon_brood_heat', site: hiveNursery('hive_carapace') }],
        FREE, { kind: 'hive_creep', hiveId: 'hive_carapace', rings: 1 }),
    gate_capacitor_draw: pkg('gate_capacitor_draw', 'reactorCompressor',
        [{ id: 'drain_gate_capacitors', site: gateControl(4) }, { id: 'charge_compressor', site: goalRoom('reactorCompressor') }],
        HALF, { kind: 'gate_infested', ring: 4 })
});

// Kept for callers that only care about ring 1.
export const O2_OBJECTIVE_PACKAGES = Object.freeze(Object.fromEntries(
    Object.entries(OBJECTIVE_PACKAGES).filter(([, entry]) => entry.goalKey === 'o2Bubble')
));

export function packagesForGoal(goalKey) {
    return Object.values(OBJECTIVE_PACKAGES).filter((entry) => entry.goalKey === goalKey);
}

/** The campaign's package for one goal: fixed for the life of a world seed. */
export function selectObjectivePackageId(worldSeed, goalKey = 'o2Bubble') {
    const options = packagesForGoal(goalKey);
    if (!options.length) return null;
    const goalIndex = Math.max(0, PACKAGE_GOAL_ORDER.indexOf(goalKey));
    const roll = mixRunEntropy(Number(worldSeed) >>> 0, 0x4f325047, goalIndex + 1);
    return options[roll % options.length].id;
}

function freshGoalState(worldSeed, goalKey) {
    return { packageId: selectObjectivePackageId(worldSeed, goalKey), completedSteps: [], completed: false };
}

export function createObjectivePackageState(worldSeed) {
    return {
        version: OBJECTIVE_PACKAGE_STATE_VERSION,
        goals: Object.fromEntries(PACKAGE_GOAL_ORDER.map((goalKey) => [goalKey, freshGoalState(worldSeed, goalKey)]))
    };
}

function normalizeGoalState(raw, worldSeed, goalKey) {
    const definition = OBJECTIVE_PACKAGES[raw?.packageId];
    if (!definition || definition.goalKey !== goalKey) return freshGoalState(worldSeed, goalKey);
    const known = new Set(definition.steps.map((step) => step.id));
    const completedSteps = (Array.isArray(raw.completedSteps) ? raw.completedSteps : [])
        .filter((id, index, list) => known.has(id) && list.indexOf(id) === index);
    return {
        packageId: definition.id,
        completedSteps,
        completed: definition.steps.every((step) => completedSteps.includes(step.id))
    };
}

/**
 * Accepts a well-formed saved state. Version 1 saves (O2 only, one package)
 * are carried into version 2 so a campaign keeps its O2 progress.
 */
export function normalizeObjectivePackageState(raw, worldSeed) {
    const base = createObjectivePackageState(worldSeed);
    if (!raw || typeof raw !== 'object') return base;
    if (raw.version === 1) {
        base.goals.o2Bubble = normalizeGoalState(raw, worldSeed, 'o2Bubble');
        return base;
    }
    if (raw.version !== OBJECTIVE_PACKAGE_STATE_VERSION || !raw.goals) return base;
    for (const goalKey of PACKAGE_GOAL_ORDER) {
        base.goals[goalKey] = normalizeGoalState(raw.goals[goalKey], worldSeed, goalKey);
    }
    return base;
}

export function getObjectivePackage(state, goalKey = 'o2Bubble') {
    return OBJECTIVE_PACKAGES[state?.goals?.[goalKey]?.packageId] ?? null;
}

/** The next step still to do for a goal, or null when its package is complete. */
export function nextPackageStep(state, goalKey = 'o2Bubble') {
    const goal = state?.goals?.[goalKey];
    const definition = getObjectivePackage(state, goalKey);
    if (!goal || !definition || goal.completed) return null;
    return definition.steps.find((step) => !goal.completedSteps.includes(step.id)) ?? null;
}

/**
 * Complete a goal's step. Steps are ordered: only the next one can be done, so
 * a reroute cannot restart a room before the power is actually routed.
 */
export function completePackageStep(state, goalKey, stepId) {
    const next = nextPackageStep(state, goalKey);
    if (!next || next.id !== stepId) return { state, advanced: false, completedNow: false };
    const goal = state.goals[goalKey];
    const completedSteps = [...goal.completedSteps, stepId];
    const completed = getObjectivePackage(state, goalKey).steps.every((step) => completedSteps.includes(step.id));
    return {
        state: { ...state, goals: { ...state.goals, [goalKey]: { ...goal, completedSteps, completed } } },
        advanced: true,
        completedNow: completed
    };
}

/** The console cost once that goal's package pays out (unchanged until complete). */
export function applyPackageReward(cost, state, goalKey) {
    const definition = getObjectivePackage(state, goalKey);
    if (!cost || !definition || !state.goals[goalKey].completed) return cost;
    const multiplier = definition.reward.costMultiplier;
    if (multiplier <= 0) return {};
    return Object.fromEntries(Object.entries(cost).map(([key, amount]) => [key, Math.ceil(amount * multiplier)]));
}

/** Every consequence the campaign now carries, from completed packages. */
export function activePackageConsequences(state) {
    return PACKAGE_GOAL_ORDER
        .filter((goalKey) => state?.goals?.[goalKey]?.completed)
        .map((goalKey) => getObjectivePackage(state, goalKey)?.consequence)
        .filter(Boolean);
}

/** One goal's consequence, or null until its package is complete. */
export function activePackageConsequence(state, goalKey = 'o2Bubble') {
    return state?.goals?.[goalKey]?.completed ? getObjectivePackage(state, goalKey)?.consequence ?? null : null;
}
