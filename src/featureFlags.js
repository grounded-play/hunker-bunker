export const DEMO_BUILD = false;

export function isDemoBuild() {
    if (typeof window !== 'undefined' && typeof window.__DEMO_BUILD__ === 'boolean') {
        return window.__DEMO_BUILD__;
    }
    return DEMO_BUILD;
}

// ── Gore ──────────────────────────────────────────────────────────────
// Enemy dismemberment is on by default but has to be switchable: age-rating
// boards in some of the locales we now ship treat gore separately from
// violence, and the gib burst is the most expensive per-death effect we have,
// so it doubles as a performance escape hatch on low-end hardware.
export const GORE_STORAGE_KEY = 'hb_gore';

export function isGoreEnabled() {
    if (typeof window !== 'undefined' && typeof window.__GORE_ENABLED__ === 'boolean') {
        return window.__GORE_ENABLED__;
    }
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const saved = window.localStorage.getItem(GORE_STORAGE_KEY);
            if (saved === 'off') return false;
        }
    } catch {
        // Storage unavailable (private window, blocked site data) -- default on.
    }
    return true;
}

export function setGoreEnabled(enabled) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(GORE_STORAGE_KEY, enabled ? 'on' : 'off');
        }
    } catch {
        // Non-fatal: the setting simply will not persist this session.
    }
    if (typeof window !== 'undefined') window.__GORE_ENABLED__ = Boolean(enabled);
    return Boolean(enabled);
}
