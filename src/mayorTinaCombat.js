/**
 * Mayor Tina's fight.
 *
 * She is the first story linchpin (see
 * docs/superpowers/specs/2026-09-11-story-linchpins-design.md): shooting her
 * resolves `mayor_tina: killed`, which pleases the camps and closes the three
 * alien-aligned endings.
 *
 * The state machine is kept pure and separate from threeGame so the hit count
 * is testable. An off-by-one here is not a cosmetic bug: it resolves an
 * irreversible choice that permanently locks endings.
 */

/** One warning shot plus three: "you kill them after 3 more hits". */
export const TINA_TOTAL_HITS = 4;

export function isTinaHostile(encounter) {
    return Boolean(encounter?.tinaHostile);
}

/**
 * Apply one hit.
 *
 * Returns `{ outcome, hitsRemaining, hostile }` where outcome is:
 *   'warning'  first hit -- lands damage, she turns hostile and speaks
 *   'damaged'  hits two and three
 *   'killed'   the fourth, reported exactly once
 *   'ignored'  already dead, or nothing to shoot at
 *
 * The first hit deals damage rather than being a free warning: a shot that
 * costs the target nothing reads as the game ignoring the player.
 */
export function registerTinaHit(encounter) {
    if (!encounter?.mayorRoot || encounter.tinaDead) {
        return { outcome: 'ignored', hitsRemaining: encounter?.tinaHitsRemaining ?? 0, hostile: isTinaHostile(encounter) };
    }

    if (!Number.isFinite(encounter.tinaHitsRemaining)) {
        encounter.tinaHitsRemaining = TINA_TOTAL_HITS;
    }

    const wasUntouched = encounter.tinaHitsRemaining === TINA_TOTAL_HITS;
    encounter.tinaHitsRemaining = Math.max(0, encounter.tinaHitsRemaining - 1);
    encounter.tinaHostile = true;

    if (encounter.tinaHitsRemaining <= 0) {
        encounter.tinaDead = true;
        return { outcome: 'killed', hitsRemaining: 0, hostile: true };
    }

    return {
        outcome: wasUntouched ? 'warning' : 'damaged',
        hitsRemaining: encounter.tinaHitsRemaining,
        hostile: true
    };
}
