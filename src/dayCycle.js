/**
 * The rest/day cycle: the frame that turns a sequence of runs into a campaign.
 *
 * A run currently ends and the next begins identically. That makes the world
 * static -- there is no reason to hurry, nothing changes while you are away, and
 * a story beat you skipped is still sitting there next time. This adds the
 * clock the fiction needs.
 *
 *   RUN -> reach camp -> SLEEP -> REST PHASE -> next RUN
 *                                  day += 1
 *                                  difficulty rises
 *                                  deadlines advance, some close forever
 *
 * Pure module: no DOM, no Three.js, no storage. The caller owns persistence and
 * presentation, which keeps the whole cycle unit-testable and lets the rest
 * phase be a lit camp rather than a menu.
 */

export const DAY_CYCLE_VERSION = 1;

/** Storage key. New key: the bank and skill-tree keys are frozen. */
export const DAY_STATE_KEY = 'hb_day_cycle';

export const REST_PHASES = Object.freeze({
    EXPEDITION: 'expedition',
    SLEEPING: 'sleeping',
    RESTING: 'resting'
});

/**
 * Difficulty per day. Deliberately sub-linear and capped.
 *
 * Linear scaling makes early days trivial and late days impossible, and an
 * uncapped curve means the campaign has a day beyond which it cannot be played.
 * The cap is what lets a player who is behind still catch up.
 */
export const DIFFICULTY_PER_DAY = 0.085;
export const DIFFICULTY_CAP = 2.25;

export function difficultyForDay(day) {
    const d = Math.max(1, Math.floor(Number(day) || 1));
    return Math.min(DIFFICULTY_CAP, 1 + ((d - 1) * DIFFICULTY_PER_DAY));
}

/**
 * Story deadlines. A beat not reached by its day closes permanently.
 *
 * `closesOnDay` is the first day the beat is NO LONGER available, so a deadline
 * of 4 means days 1-3 inclusive. Expressed that way because "you have until day
 * 4" is how a player reads it, and off-by-one here silently eats content.
 */
export const STORY_DEADLINES = Object.freeze([
    Object.freeze({
        id: 'meridian_first_contact', closesOnDay: 4, linchpin: 'camp_meridian',
        label: 'MERIDIAN FIRST CONTACT', consequence: 'Kaelen closes the grid to unknown operators.'
    }),
    Object.freeze({
        id: 'tallow_infection_choice', closesOnDay: 7, linchpin: 'camp_tallow',
        label: 'TALLOW INFECTION CHOICE', consequence: 'Tallow chooses its fate without your warning.'
    }),
    Object.freeze({
        id: 'vesper_last_shelter', closesOnDay: 11, linchpin: 'camp_vesper',
        label: 'VESPER LAST SHELTER', consequence: 'The final holdout falls before you answer it.'
    }),
    Object.freeze({
        id: 'hive_suture_parley', closesOnDay: 9, linchpin: 'hive_suture',
        label: 'SUTURE HIVE PARLEY', consequence: 'Nahl withdraws the Host Mercy rite.'
    })
]);

const DEADLINE_IDS = new Set(STORY_DEADLINES.map((d) => d.id));

function knownIds(list) {
    if (!Array.isArray(list)) return [];
    return [...new Set(list.filter((v) => typeof v === 'string' && DEADLINE_IDS.has(v)))];
}


export function createDayState() {
    return {
        version: DAY_CYCLE_VERSION,
        day: 1,
        phase: REST_PHASES.EXPEDITION,
        restsTaken: 0,
        // Beats the player resolved, and beats that expired unresolved. Kept
        // apart on purpose: "did it" and "can never do it" are different states
        // and collapsing them loses the reason an ending is unavailable.
        resolved: [],
        expired: []
    };
}

export function normalizeDayState(raw) {
    const base = createDayState();
    if (!raw || typeof raw !== 'object') return base;
    const day = Math.max(1, Math.floor(Number(raw.day) || 1));
    const phase = Object.values(REST_PHASES).includes(raw.phase) ? raw.phase : base.phase;
    return {
        ...base,
        day,
        phase,
        restsTaken: Math.max(0, Math.floor(Number(raw.restsTaken) || 0)),
        // Only ids that are still real deadlines survive. A renamed or removed
        // beat would otherwise linger in a save forever, and a corrupt save
        // could mark the player as having resolved something that never
        // existed -- which silently unlocks or locks an ending.
        resolved: knownIds(raw.resolved),
        expired: knownIds(raw.expired)
    };
}

/** Beats still open on a given day, given what has already been resolved. */
export function openDeadlines(state) {
    const s = normalizeDayState(state);
    const done = new Set([...s.resolved, ...s.expired]);
    return STORY_DEADLINES.filter((d) => !done.has(d.id) && s.day < d.closesOnDay);
}

/** Beats that close if the player sleeps tonight -- the warning before rest. */
export function deadlinesClosingTonight(state) {
    const s = normalizeDayState(state);
    const done = new Set([...s.resolved, ...s.expired]);
    return STORY_DEADLINES.filter((d) => !done.has(d.id) && d.closesOnDay === s.day + 1);
}

/**
 * The single rule for "can the player sleep here, right now".
 *
 * Both the camp rest verb and any other bed (bunker cot, outpost pod) ask this
 * one question, so rest cannot be reachable at one and silently unreachable at
 * another. Before this existed the camp verb carried its own inline gate that
 * also required an Act 2 `dormant` camp, which is why `SLEEP UNTIL DAY N`
 * almost never appeared in normal play.
 *
 * `safeSpace` is the caller's assertion that this spot is somewhere a person
 * could actually sleep; everything else is campaign state this module owns.
 */
export function canRestNow(state, {
    safeSpace = false,
    hostileNearby = false,
    hasActiveQuest = false,
    siteStatus = 'alive'
} = {}) {
    const s = normalizeDayState(state);
    if (!safeSpace) return { allowed: false, reason: 'not_a_safe_space' };
    if (s.phase !== REST_PHASES.EXPEDITION) return { allowed: false, reason: 'already_resting' };
    if (hostileNearby) return { allowed: false, reason: 'hostiles_nearby' };
    if (siteStatus && siteStatus !== 'alive') return { allowed: false, reason: `site_${siteStatus}` };
    // An active contract at this site is the one story reason to withhold rest:
    // sleeping through it would advance the day past a beat the player is
    // mid-way through.
    if (hasActiveQuest) return { allowed: false, reason: 'active_quest' };
    return { allowed: true, reason: null, nextDay: s.day + 1 };
}

/**
 * Begin the sleep that ends a day.
 *
 * Separate from completeRest so the caller can play a sequence between them.
 * Refuses unless the player is on expedition: sleeping twice would advance the
 * day twice and silently expire a beat the player never had a chance at.
 */
export function beginSleep(state) {
    const s = normalizeDayState(state);
    if (s.phase !== REST_PHASES.EXPEDITION) {
        return { state: s, started: false, reason: `cannot sleep while ${s.phase}` };
    }
    return {
        state: { ...s, phase: REST_PHASES.SLEEPING },
        started: true,
        closing: deadlinesClosingTonight(s).map((d) => d.id)
    };
}

/**
 * Finish the rest: advance the day, expire missed beats, raise difficulty.
 */
export function completeRest(state) {
    const s = normalizeDayState(state);
    if (s.phase !== REST_PHASES.SLEEPING) {
        return { state: s, advanced: false, reason: `not sleeping (${s.phase})` };
    }
    const day = s.day + 1;
    const done = new Set([...s.resolved, ...s.expired]);
    // Anything whose deadline has now passed expires here, once.
    const newlyExpired = STORY_DEADLINES
        .filter((d) => !done.has(d.id) && day >= d.closesOnDay)
        .map((d) => d.id);

    return {
        state: {
            ...s,
            day,
            phase: REST_PHASES.RESTING,
            restsTaken: s.restsTaken + 1,
            expired: [...s.expired, ...newlyExpired]
        },
        advanced: true,
        expired: newlyExpired,
        difficulty: difficultyForDay(day)
    };
}

/** Leave the rest area and start the next expedition. */
export function beginExpedition(state) {
    const s = normalizeDayState(state);
    if (s.phase !== REST_PHASES.RESTING) {
        return { state: s, started: false, reason: `not resting (${s.phase})` };
    }
    return { state: { ...s, phase: REST_PHASES.EXPEDITION }, started: true };
}

/** Mark a story beat resolved so it can no longer expire. */
export function resolveDeadline(state, id) {
    const s = normalizeDayState(state);
    const deadline = STORY_DEADLINES.find((d) => d.id === id);
    if (!deadline) return { state: s, resolved: false, reason: 'unknown deadline' };
    if (s.resolved.includes(id)) return { state: s, resolved: false, reason: 'already resolved' };
    if (s.expired.includes(id)) return { state: s, resolved: false, reason: 'expired' };
    // The deadline has to bind here too, not only at rest. Expiry runs when the
    // player sleeps, so a beat whose day has passed but who has not slept since
    // was still resolvable -- which defeats the entire point of a deadline.
    if (s.day >= deadline.closesOnDay) {
        return { state: s, resolved: false, reason: 'deadline passed' };
    }
    return { state: { ...s, resolved: [...s.resolved, id] }, resolved: true };
}

/**
 * Combined threat scale for a position on a given day.
 *
 * Multiplies the existing depth scale rather than replacing it, so depth still
 * dominates within a run and the day is what makes each run harder than the
 * last. The two are different pressures and should not be collapsed.
 */
export function threatScaleForDay(day, depthScale) {
    const factor = difficultyForDay(day);
    const base = depthScale ?? { hp: 1, speed: 1 };
    return {
        hp: (Number(base.hp) || 1) * factor,
        // Speed scales at a third of HP: an enemy that outruns the player is
        // unfair in a way that a tougher one is not.
        speed: (Number(base.speed) || 1) * (1 + ((factor - 1) / 3))
    };
}
