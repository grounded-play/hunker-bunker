// Published Steam API names. Keep this CommonJS so the Electron main process
// can validate renderer IPC without importing the browser achievement engine.
// src/steamAchievementCatalog.test.js enforces parity with every live def.
const PUBLISHED_ACHIEVEMENT_KEYS = Object.freeze([
    'quick_study', 'hunkered', 'scouts_honor', 'tank_commander', 'chief_engineer',
    'ending_full_brood', 'ending_clean_escape', 'ending_mixed_crew', 'ending_carriers_bargain',
    'ending_scorched_sky', 'ending_mothership_infection', 'ending_alien_exodus',
    'ending_outed_escape', 'ending_failed_carrier', 'ending_empty_husk', 'cartographer',
    'archivist', 'kin', 'ghost', 'gentle_drill', 'chen_thirteenth', 'reyes_courier', 'hardened'
]);

module.exports = { PUBLISHED_ACHIEVEMENT_KEYS };
