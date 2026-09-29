// One authority for the multiplayer beats that cannot be undone.
//
// Plain enemy hits and positions already flow host -> peers (enemyDamage and
// enemyState). What did not: a boss fight's phases, weakpoint windows and adds
// ran on every client independently, so a guest fought adds the host never
// spawned; a milestone boss's defeat never reached a guest whose copy was a
// snapshot replica, so the crossing stayed locked there; and Act 2 descent
// bumped globalSeedOffset on whichever client chose it, splitting the world.
//
// The rule: the host (or a solo player) runs these beats and announces each
// through the relay's worldEvent channel with a deterministic key; a guest
// suppresses its own copy and applies the announcement. Applying twice is a
// no-op, so the relay's echo and a late duplicate are both harmless.

export const COOP_ROLE = Object.freeze({ SOLO: 'solo', HOST: 'host', GUEST: 'guest' });

export const COOP_TRANSITION_EVENTS = Object.freeze({
    MILESTONE_DEFEATED: 'milestone-defeated',
    ELEVATOR_DESCENDED: 'elevator-descended',
    BOSS_FIGHT_EVENT: 'boss-fight-event',
    BOSS_ADDS: 'boss-adds',
    ENCOUNTER_FORMATION_STATE: 'encounter-formation-state'
});

// Boss beats that change shared state. Attacks stay local: each client's boss
// swings at that client's own operator.
const HOST_AUTHORITATIVE_BOSS_EVENTS = new Set(['phase', 'adds', 'weakpoint-open', 'weakpoint-close']);

// The per-descent step the single-player game has always used.
export const DESCENT_SEED_STEP = 7919;

/** PvP keeps private worlds, so each side is its own authority there. */
export function coopRole(game) {
    if (!game?.isMultiplayer || !game.netSocket || game.multiplayerMode === 'pvp') return COOP_ROLE.SOLO;
    return game.isMultiplayerHost ? COOP_ROLE.HOST : COOP_ROLE.GUEST;
}

/** Whether this client should run a boss event it simulated itself. */
export function runsBossEventLocally(role, eventType) {
    return role !== COOP_ROLE.GUEST || !HOST_AUTHORITATIVE_BOSS_EVENTS.has(eventType);
}

/** Whether the host should announce a boss event it just ran. */
export function announcesBossEvent(role, eventType) {
    return role === COOP_ROLE.HOST && HOST_AUTHORITATIVE_BOSS_EVENTS.has(eventType) && eventType !== 'adds';
}

/** Formation cadence and irreversible state changes belong to the host. */
export function runsEncounterCoordinationLocally(role) {
    return role !== COOP_ROLE.GUEST;
}

export function announcesEncounterFormationState(role) {
    return role === COOP_ROLE.HOST;
}

export function shouldApplyEncounterFormationState(localSequence, detail = {}) {
    return typeof detail.encounterId === 'string'
        && detail.encounterId.length > 0
        && ['staggered', 'broken', 'cleared'].includes(detail.formationState)
        && Number.isInteger(detail.sequence)
        && detail.sequence > (localSequence ?? 0);
}

/** Adds share keys across clients, so hits and snapshots match them. */
export function bossAddScatterKey(bossKey, sequence) {
    return `${bossKey}:add:${sequence}`;
}

/**
 * The seed offset after `descentIndex` descents from `baseOffset`. Absolute
 * rather than `+= step`, so every client lands on the same world however many
 * times the announcement arrives. Matches the old cumulative single-player
 * values exactly.
 */
export function descentSeedOffset(baseOffset, descentIndex) {
    return ((baseOffset | 0) + Math.imul(DESCENT_SEED_STEP, Math.max(0, descentIndex | 0))) | 0;
}

export function shouldApplyDescent(localDescentIndex, detail) {
    const index = Number(detail?.descentIndex);
    return Number.isInteger(index) && index > (localDescentIndex ?? 0) && Number.isFinite(Number(detail?.seedOffset));
}

/** The relay dedupe key for a transition, or null for any other world event. */
export function coopTransitionDedupeKey(event, detail = {}) {
    switch (event) {
        case COOP_TRANSITION_EVENTS.MILESTONE_DEFEATED:
            return detail.milestoneId ? `${event}:${detail.milestoneId}` : null;
        case COOP_TRANSITION_EVENTS.ELEVATOR_DESCENDED:
            return Number.isInteger(detail.descentIndex) ? `${event}:${detail.descentIndex}` : null;
        case COOP_TRANSITION_EVENTS.BOSS_FIGHT_EVENT:
        case COOP_TRANSITION_EVENTS.BOSS_ADDS:
            return detail.bossKey && Number.isInteger(detail.sequence) ? `${event}:${detail.bossKey}:${detail.sequence}` : null;
        case COOP_TRANSITION_EVENTS.ENCOUNTER_FORMATION_STATE:
            return detail.encounterId && Number.isInteger(detail.sequence)
                ? `${event}:${detail.encounterId}:${detail.sequence}`
                : null;
        default:
            return null;
    }
}
