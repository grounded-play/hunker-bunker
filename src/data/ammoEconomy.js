// Single source of truth for starting-ammo economy constants. Split out of
// main.js so combat-economy acceptance tests (docs/master-implementation-plan-2026-07-28.md
// Phase 10.2) can validate boss HP against real ammo numbers without
// importing main.js itself (which touches document.* at module scope).
export const STARTING_RUN_AMMO = 30;

export const CLASS_AMMO_CAPACITY = Object.freeze({
    SCOUT: 36,
    TANK: 42,
    ENGINEER: 30
});
