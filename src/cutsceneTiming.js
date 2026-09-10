// When a cutscene video should hand control back.
//
// This rule has been rewritten inline twice and got it wrong both times: once
// truncating every clip half a second early, then once playing every clip in
// full and losing the opening's deliberate trim. It is a product decision, not
// an implementation detail, so it lives here with tests.
//
// The rule:
//   - The opening/intro plays behind the closing blast doors and is meant to be
//     a short stab, not the whole clip. It is the ONLY clip that is trimmed.
//   - Every other cutscene is authored to be watched to the end. Cutting it
//     early truncates content someone made on purpose.

// The opening runs under the door transition, so it only needs to cover the
// door animation. Whichever comes first: 40% of the clip, or 3.2 seconds.
export const OPENING_TRIM_FRACTION = 0.40;
export const OPENING_TRIM_MAX_SECONDS = 3.2;

// A hair before the true end, so `timeupdate` fires the handoff rather than
// waiting on `ended` (which some browsers delay). Small enough not to clip
// content.
export const NATURAL_END_EPSILON = 0.04;

/** Is this the opening/intro cutscene -- the one clip that is meant to be trimmed? */
export function isOpeningCutscene(base) {
    const name = String(base ?? '');
    if (!name) return false;
    return name === 'DoorIntro' || name.includes('DoorIntro') || /\bintro\b|intro/i.test(name);
}

/**
 * The playback position at which a cutscene should hand back control.
 * Returns null when the duration is not yet known, so callers keep waiting.
 */
export function cutsceneCutoffTime(base, duration) {
    if (!Number.isFinite(duration) || duration <= 0) return null;
    if (isOpeningCutscene(base)) {
        return Math.min(duration * OPENING_TRIM_FRACTION, OPENING_TRIM_MAX_SECONDS);
    }
    // Everything else plays in full.
    return Math.max(0, duration - NATURAL_END_EPSILON);
}
