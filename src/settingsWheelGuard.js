// Playtest 2026-09-12 (docs/reports/playtest-issues-2026-09-12.md P1-2): "in the
// settings menu the mouse is moving the scroll too easily on WASD".
//
// The settings popup holds 11 <select> controls and no scroll container of its
// own. A wheel event over a <select> is handled by the browser as a VALUE
// change, not a scroll -- so scrolling the settings list with the pointer
// anywhere near a control silently rewrites a setting, and on a long list the
// pointer is over a control most of the time. That is the reported "too easily":
// not over-eager scrolling, but scrolling that edits.
//
// The guard stops wheel events from reaching a <select> and lets them bubble to
// the scroll container instead, so the wheel always scrolls and never edits.
// Keyboard and click interaction with the select is untouched -- this only
// removes an input path no one deliberately uses.

export const GUARDED_SELECTOR = 'select';

export function shouldBlockWheel(target) {
    if (!target) return false;
    const el = typeof target.closest === 'function' ? target.closest(GUARDED_SELECTOR) : null;
    return Boolean(el);
}

export function handleSettingsWheel(event) {
    if (!shouldBlockWheel(event?.target)) return false;
    // preventDefault stops the value change; the event still bubbles, so the
    // surrounding container scrolls as the player expects.
    event.preventDefault?.();
    // globalThis.document, not bare document: a bare reference throws rather
    // than short-circuiting when this runs outside a browser (tests, Node).
    // A focused select keeps receiving wheel/arrow input on some engines even
    // after the pointer moves away, so drop focus too.
    if (typeof event.target.blur === 'function' && globalThis.document?.activeElement === event.target) {
        event.target.blur();
    }
    return true;
}

export function installSettingsWheelGuard(root = document) {
    const popup = root?.getElementById?.('settings-popup');
    if (!popup) return null;
    // passive:false is required -- preventDefault is a no-op on a passive listener.
    popup.addEventListener('wheel', handleSettingsWheel, { passive: false });
    return () => popup.removeEventListener('wheel', handleSettingsWheel, { passive: false });
}
