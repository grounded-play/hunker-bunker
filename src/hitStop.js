/**
 * Hit-stop: the short frame-freeze that gives a hit weight.
 *
 * The game's one freeze is ThreeGame.hitstopTimer (the frame loop skips the
 * simulation while it is above zero). This module owns its lengths and its
 * rules, so there is a single hit-stop system (AAA plan §11; the first draft
 * of this file was a second, unwired freeze manager that would have doubled
 * the pause if wired alongside the timer).
 */

export const HIT_STOP_PRESETS = Object.freeze({
    HIT_CONFIRM: 60,  // any damaging hit on an enemy
    KILL: 45,         // an ordinary enemy's death burst
    BOSS_KILL: 90     // a boss's death burst
});

/**
 * A new freeze never shortens one already running: a kill landing during a
 * hit's freeze used to cut it from 60 ms to 45 ms.
 */
export function extendHitStop(remainingMs = 0, durationMs = HIT_STOP_PRESETS.HIT_CONFIRM) {
    const current = Number.isFinite(remainingMs) ? Math.max(0, remainingMs) : 0;
    const next = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
    return Math.max(current, next);
}

/** Time left after one frame of wall-clock time. */
export function advanceHitStop(remainingMs = 0, deltaMs = 0) {
    return Math.max(0, (Number(remainingMs) || 0) - Math.max(0, Number(deltaMs) || 0));
}
