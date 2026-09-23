/**
 * Adapter between the live Act 2 world and the overnight simulation.
 *
 * `src/overnightSim.js` is deliberately ignorant of this game's vocabulary: it
 * takes camps with a condition and a 0..1 fortification, and hives with a creep
 * ring count. The real world speaks in act2 statuses, camp levels and bonds.
 * This module translates in both directions and owns the state the sim needs
 * that act2 does not already store.
 *
 * It keeps that state under its own key rather than extending the act2 save
 * schema: overnight condition is a property of the campaign clock, not of the
 * faction record, and act2's normalizer is shared with systems that have
 * nothing to do with resting.
 *
 * Pure module: no DOM, no Three.js, no storage.
 */
import { CAMP_CONDITIONS, simulateOvernight } from './overnightSim.js';

export const OVERNIGHT_BRIDGE_VERSION = 1;
export const OVERNIGHT_STATE_KEY = 'hb_overnight_v1';

/** Camp levels run 0..3 in act2; this is the denominator for fortification. */
const CAMP_MAX_LEVEL = 3;

/** Statuses where a camp is still a camp that can be defended. */
const DEFENSIBLE_CAMP_STATUSES = Object.freeze(['alive', 'robbed', 'recruited']);

/**
 * Hive statuses that end the story one way or another. A hive the player has
 * killed, bonded with, rescued or taken aboard has stopped expanding; only an
 * unresolved hive creeps.
 */
const SETTLED_HIVE_STATUSES = Object.freeze(['bonded', 'rescued', 'aboard', 'slain', 'abandoned']);

function clamp01(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(1, numeric));
}

function clampInt(value, min, max, fallback = min) {
    const numeric = Math.floor(Number(value));
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
}

export function createOvernightState() {
    return { version: OVERNIGHT_BRIDGE_VERSION, camps: {}, hives: {} };
}

export function normalizeOvernightState(raw) {
    const base = createOvernightState();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;

    for (const [id, entry] of Object.entries(raw.camps ?? {})) {
        if (typeof id !== 'string' || !entry || typeof entry !== 'object') continue;
        base.camps[id] = {
            condition: CAMP_CONDITIONS.includes(entry.condition) ? entry.condition : 'secure',
            neglectNights: clampInt(entry.neglectNights, 0, 99, 0)
        };
    }
    for (const [id, entry] of Object.entries(raw.hives ?? {})) {
        if (typeof id !== 'string' || !entry || typeof entry !== 'object') continue;
        base.hives[id] = { creepRings: clampInt(entry.creepRings, 0, 3, 0) };
    }
    return base;
}

/**
 * How well a camp is dug in, 0..1.
 *
 * Built from what the player actually invested: the camp's level (turret parts,
 * power cells, ammo deliveries the camp economy already tracks) plus a smaller
 * bump for having been aided at all. Bond is deliberately excluded -- being
 * liked is not the same as being fortified.
 */
export function campFortification(record = {}) {
    const level = clampInt(record.level, 0, CAMP_MAX_LEVEL, 0);
    const aided = record.aided ? 0.2 : 0;
    return clamp01((level / CAMP_MAX_LEVEL) * 0.8 + aided);
}

export function isCampDefensible(record = {}) {
    return DEFENSIBLE_CAMP_STATUSES.includes(record.status ?? 'alive');
}

export function isHiveSettled(record = {}) {
    return SETTLED_HIVE_STATUSES.includes(record.status ?? 'dormant');
}

/**
 * Turn live records plus stored overnight state into simulation input. Camps
 * that are gone (culled, turned) are dropped rather than simulated: a razed
 * camp has no night to resolve.
 */
export function toSimInputs({ campRecords = [], hiveRecords = [], overnightState = null } = {}) {
    const stored = normalizeOvernightState(overnightState);
    const camps = (Array.isArray(campRecords) ? campRecords : [])
        .filter((record) => record?.id && isCampDefensible(record))
        .map((record) => ({
            id: record.id,
            condition: stored.camps[record.id]?.condition ?? 'secure',
            neglectNights: stored.camps[record.id]?.neglectNights ?? 0,
            fortification: campFortification(record)
        }));
    const hives = (Array.isArray(hiveRecords) ? hiveRecords : [])
        .filter((record) => record?.id)
        .map((record) => ({
            id: record.id,
            creepRings: stored.hives[record.id]?.creepRings ?? 0,
            // The sim's own vocabulary for "stop growing".
            status: isHiveSettled(record) ? 'purged' : 'active'
        }));
    return { camps, hives };
}

/** Fold a night's result back into the stored overnight state. */
export function applyOvernight(overnightState, result) {
    const next = normalizeOvernightState(overnightState);
    for (const camp of result?.camps ?? []) {
        if (!camp?.id) continue;
        next.camps[camp.id] = {
            condition: camp.condition,
            neglectNights: clampInt(camp.neglectNights, 0, 99, 0)
        };
    }
    for (const hive of result?.hives ?? []) {
        if (!hive?.id) continue;
        next.hives[hive.id] = { creepRings: clampInt(hive.creepRings, 0, 3, 0) };
    }
    return next;
}

/**
 * Run one night end to end: translate, simulate, fold back. Returns the new
 * stored state plus the raw result, whose `ledger` is the morning debrief.
 */
export function runOvernight({ day = 1, difficulty = null, campRecords = [], hiveRecords = [], overnightState = null } = {}) {
    const inputs = toSimInputs({ campRecords, hiveRecords, overnightState });
    const result = simulateOvernight({ day, difficulty, ...inputs });
    return { state: applyOvernight(overnightState, result), result };
}
