/**
 * What the world does while the player sleeps.
 *
 * Pure and deterministic on purpose: no RNG, no DOM, no Three.js, no storage.
 * The caller passes the day state plus the camps and hives it already owns and
 * gets back deltas to apply. Two reasons for determinism:
 *
 *  1. A player must be able to look at a camp's fortification before resting
 *     and know what tonight will cost. A dice roll makes losing a camp feel
 *     arbitrary; a threshold makes it a decision.
 *  2. It keeps the whole night unit-testable, the same contract dayCycle.js and
 *     fatigue.js follow.
 *
 * This module decides WHAT changed. It does not stamp chunks, move sprites, or
 * write saves -- src/worldProgression.js stays a frozen layout table and the
 * runtime owns application.
 */

export const OVERNIGHT_SIM_VERSION = 1;

/** Creep may spread at most one ring per sleep, and stops at the cap. */
export const CREEP_RINGS_PER_SLEEP = 1;
export const CREEP_RING_CAP = 3;

/** Nights a camp must be left failing before it is lost for good. */
export const ABANDONMENT_NEGLECT_NIGHTS = 3;

/**
 * Camp condition ladder. A camp always walks down this list one step at a
 * time, so the morning report can name the step and the player can see the next
 * one coming.
 */
export const CAMP_CONDITIONS = Object.freeze(['secure', 'strained', 'breached', 'overrun', 'abandoned']);

function clampInt(value, min, max, fallback = min) {
    const numeric = Math.floor(Number(value));
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
}

function conditionIndex(condition) {
    const index = CAMP_CONDITIONS.indexOf(condition);
    return index === -1 ? 0 : index;
}

/**
 * Threat the night brings. Rises with the campaign day; the caller may pass the
 * difficulty dayCycle.js already computed rather than recomputing it here.
 */
export function nightlyThreat(day, difficulty = null) {
    const safeDay = Math.max(1, clampInt(day, 1, 9999, 1));
    const scale = Number.isFinite(Number(difficulty)) && Number(difficulty) > 0
        ? Number(difficulty)
        : 1 + ((safeDay - 1) * 0.085);
    return Math.round(scale * 100) / 100;
}

/**
 * One camp's night. `fortification` is whatever the camp economy already tracks
 * (deliveries of ammo, turret parts, power cells) normalised to 0..1 by the
 * caller; `threat` comes from nightlyThreat().
 *
 * Holding requires fortification to meet the night's threat. Falling short
 * moves the camp exactly one step down the ladder -- never two -- so a neglected
 * camp telegraphs its loss across several nights.
 */
export function resolveCampNight(camp = {}, threat = 1) {
    const condition = CAMP_CONDITIONS.includes(camp.condition) ? camp.condition : 'secure';
    const id = camp.id ?? null;
    const neglectNights = clampInt(camp.neglectNights, 0, 99, 0);
    const fortification = Math.max(0, Math.min(1, Number(camp.fortification) || 0));

    if (condition === 'abandoned') {
        return { id, condition, neglectNights, held: false, changed: false, outcome: 'already_lost' };
    }

    // Threat is expressed as a multiplier starting at 1; a camp needs
    // proportionally more fortification as the campaign wears on.
    const required = Math.min(1, (threat - 1) * 0.5 + 0.25);
    const held = fortification >= required;

    if (held) {
        // A held night repairs one step, so recovery is possible but slow.
        const recovered = Math.max(0, conditionIndex(condition) - 1);
        return {
            id,
            condition: CAMP_CONDITIONS[recovered],
            neglectNights: 0,
            held: true,
            changed: recovered !== conditionIndex(condition),
            outcome: recovered === conditionIndex(condition) ? 'held' : 'repaired'
        };
    }

    const nextNeglect = neglectNights + 1;
    const atOverrun = condition === 'overrun';
    // Abandonment is the only two-step drop, and only after repeated neglect.
    if (atOverrun && nextNeglect >= ABANDONMENT_NEGLECT_NIGHTS) {
        return { id, condition: 'abandoned', neglectNights: nextNeglect, held: false, changed: true, outcome: 'abandoned' };
    }

    const worsened = Math.min(conditionIndex('overrun'), conditionIndex(condition) + 1);
    return {
        id,
        condition: CAMP_CONDITIONS[worsened],
        neglectNights: nextNeglect,
        held: false,
        changed: worsened !== conditionIndex(condition),
        outcome: 'raided'
    };
}

/**
 * One hive's night. A hive the player has purged or made peace with is inert;
 * anything else creeps outward by at most one ring.
 */
export function resolveHiveNight(hive = {}) {
    const id = hive.id ?? null;
    const creepRings = clampInt(hive.creepRings, 0, CREEP_RING_CAP, 0);
    const status = hive.status ?? 'active';
    const settled = status === 'purged' || status === 'bonded' || status === 'parleyed';

    if (settled || creepRings >= CREEP_RING_CAP) {
        return { id, creepRings, grew: false, mutationTier: creepRings, outcome: settled ? 'settled' : 'capped' };
    }

    const nextRings = Math.min(CREEP_RING_CAP, creepRings + CREEP_RINGS_PER_SLEEP);
    return { id, creepRings: nextRings, grew: true, mutationTier: nextRings, outcome: 'spread' };
}

/**
 * The whole night. Returns deltas plus a flat list of ledger lines for the
 * morning report, so the caller can render the debrief without re-deriving what
 * happened.
 */
export function simulateOvernight({ day = 1, difficulty = null, camps = [], hives = [] } = {}) {
    const threat = nightlyThreat(day, difficulty);
    const campResults = (Array.isArray(camps) ? camps : []).map((camp) => resolveCampNight(camp, threat));
    const hiveResults = (Array.isArray(hives) ? hives : []).map((hive) => resolveHiveNight(hive));

    const ledger = [];
    for (const camp of campResults) {
        if (camp.outcome === 'abandoned') ledger.push({ kind: 'camp', id: camp.id, severity: 'critical', text: `${camp.id ?? 'CAMP'} abandoned after ${camp.neglectNights} nights unanswered.` });
        else if (camp.outcome === 'raided') ledger.push({ kind: 'camp', id: camp.id, severity: 'warning', text: `${camp.id ?? 'CAMP'} raided overnight — now ${camp.condition}.` });
        else if (camp.outcome === 'repaired') ledger.push({ kind: 'camp', id: camp.id, severity: 'good', text: `${camp.id ?? 'CAMP'} repelled the swarm and repaired to ${camp.condition}.` });
        else if (camp.outcome === 'held') ledger.push({ kind: 'camp', id: camp.id, severity: 'good', text: `${camp.id ?? 'CAMP'} held through the night.` });
    }
    for (const hive of hiveResults) {
        if (hive.grew) ledger.push({ kind: 'hive', id: hive.id, severity: 'warning', text: `${hive.id ?? 'HIVE'} creep spread one ring (now ${hive.creepRings}).` });
    }

    return {
        version: OVERNIGHT_SIM_VERSION,
        day: Math.max(1, clampInt(day, 1, 9999, 1)),
        threat,
        camps: campResults,
        hives: hiveResults,
        ledger
    };
}
