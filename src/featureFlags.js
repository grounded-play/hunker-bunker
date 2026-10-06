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

// ── Area room density (lived-in world M3) ─────────────────────────────
// Room object budget scales with floor area (3-8) instead of a fixed five.
// Default OFF until a paired Steam Deck capture shows it does not regress
// presented p95. Rooms are generated on every client from the seed, so a
// co-op peer with a different setting would see different rooms: ThreeGame
// ignores this flag in multiplayer. QA: localStorage.hb_area_room_density = 'on'.
export const AREA_ROOM_DENSITY_STORAGE_KEY = 'hb_area_room_density';

export function isAreaRoomDensityEnabled() {
    if (typeof window !== 'undefined' && typeof window.__AREA_ROOM_DENSITY__ === 'boolean') {
        return window.__AREA_ROOM_DENSITY__;
    }
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage.getItem(AREA_ROOM_DENSITY_STORAGE_KEY) === 'on';
        }
    } catch {
        // Storage unavailable -- default off.
    }
    return false;
}

// ── Modular wall shells (lived-in world M5 spike) ────────────────────
// Swap straight boundary runs of 3+ cells for kit template walls.
// Default OFF: showroom spike only until [Art] sign-off.
export const MODULAR_WALL_SHELLS_STORAGE_KEY = 'hb_modular_wall_shells';

export function isModularWallShellsEnabled() {
    if (typeof window !== 'undefined' && typeof window.__MODULAR_WALL_SHELLS__ === 'boolean') {
        return window.__MODULAR_WALL_SHELLS__;
    }
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage.getItem(MODULAR_WALL_SHELLS_STORAGE_KEY) === 'on';
        }
    } catch {
        // Storage unavailable -- default off.
    }
    return false;
}

export function setModularWallShellsEnabled(enabled) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(MODULAR_WALL_SHELLS_STORAGE_KEY, enabled ? 'on' : 'off');
        }
    } catch {
        // Non-fatal.
    }
    if (typeof window !== 'undefined') window.__MODULAR_WALL_SHELLS__ = Boolean(enabled);
    return Boolean(enabled);
}

