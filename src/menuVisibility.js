// Menu render/visibility snapshot (Sprint 29 plan §1 and §16), Lane A.
//
// log16 could not tell a hidden menu from a missing one: main.js's
// captureMenuRenderSnapshot() returned null unless the game was already in the
// 'menu' performance profile, so every gameplay-time menu question came back
// empty. This module answers the question the log could not -- for each named
// surface, is it absent, present-but-hidden, or actually on screen, and if
// hidden, why.

function resolveHiddenReason(style, rect) {
    if (style.display === 'none') return 'display-none';
    if (style.visibility === 'hidden' || style.visibility === 'collapse') return 'visibility-hidden';
    if (Number(style.opacity) === 0) return 'transparent';
    if (!rect || rect.width <= 0 || rect.height <= 0) return 'zero-size';
    return null;
}

export function captureMenuVisibilitySnapshot({
    surfaceIds = [],
    getElement,
    computeStyle,
    measure
} = {}) {
    const surfaces = surfaceIds.map((id) => {
        const element = getElement?.(id) ?? null;
        if (!element) {
            return { id, present: false, visible: false, hiddenReason: 'absent' };
        }
        const style = computeStyle?.(element, id) ?? {};
        const rect = measure?.(element, id) ?? null;
        const hiddenReason = resolveHiddenReason(style, rect);
        return {
            id,
            present: true,
            visible: hiddenReason === null,
            hiddenReason,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            width: rect?.width ?? null,
            height: rect?.height ?? null
        };
    });

    return { surfaces };
}

/**
 * Did a blocking overlay just open or close?
 *
 * Menu open/close is derived from the single gate that already decides whether
 * world input is suppressed, rather than instrumenting all 49 modals by hand.
 * A first observation counts as an open if something is already up, but never
 * as a close -- there was no menu to close.
 */
export function describeOverlayTransition(previous, next) {
    const was = previous === true;
    const is = next === true;
    if (was === is) return null;
    return is ? 'open' : 'close';
}
