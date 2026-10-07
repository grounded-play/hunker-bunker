// When an enemy plans a new path (Sprint 52 perf). The long walk counted
// searches per frame climbing from 1.7 to 10: every hunting enemy re-planned
// each time the player crossed a tile, ignoring its own 0.24-0.5 s re-plan
// timer, and a search that could not reach the target was simply repeated.
//
// Now an enemy re-plans when:
// - its mode or target kind changes (hunt / wander, player / ship): at once;
// - the target jumped more than a few tiles (teleport, respawn): at once;
// - it has walked its whole path and the target has moved on: at once;
// - it has no path at all: at once, unless its last search failed;
// - its re-plan timer runs out.
// A target that only drifts a tile while the enemy is mid-path waits for the
// timer, and a failed search is retried on the timer, not every frame.
export const REPATH_JUMP_TILES = 3;

export function shouldEnemyRepath({
    modeChanged = false,
    goalDeltaTiles = 0,
    hasPath = false,
    atPathEnd = false,
    timerExpired = false,
    lastSearchFailed = false
} = {}) {
    if (modeChanged) return true;
    if (goalDeltaTiles > REPATH_JUMP_TILES) return true;
    if (timerExpired) return true;
    if (lastSearchFailed) return false;
    if (!hasPath) return true;
    return atPathEnd && goalDeltaTiles > 0;
}
