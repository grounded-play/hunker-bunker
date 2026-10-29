// Sprint 23 Phase 4 / Lane B — semantic hallway archetype catalog.
//
// Versioned data only, mirroring src/data/roomBuilds.js's split: this file
// is data, src/hallwayConnector.js is the pure select/realize API. The full
// Ten archetypes cover the ship -> camp -> medical -> O2 -> trap/reward ->
// return-shortcut loop plus biome and hive transition approaches.

export const HALLWAY_BUILD_VERSION = 3;

export const HALLWAY_BUILD_CATALOG = Object.freeze([
    Object.freeze({
        id: 'short_connector',
        lengthRange: [8, 16],
        widthRange: [2, 3],
        maxTurns: 1,
        elevationPolicy: 'flat',
        junctionEligible: false,
        coverBudget: 0,
        lightingRhythm: 'even',
        dressingKit: 'bunker_utility',
        encounterPressure: 'low',
        sightlineBreakFrequency: 'low',
        repetitionCooldown: 1,
        compatibleFamilies: { from: ['entry', 'medical', 'armory', 'o2', 'fabricator', 'cache'], to: ['entry', 'medical', 'armory', 'o2', 'fabricator', 'cache'] }
    }),
    Object.freeze({
        id: 'pressure_corridor',
        lengthRange: [14, 24],
        widthRange: [2, 3],
        maxTurns: 2,
        elevationPolicy: 'flat',
        junctionEligible: false,
        coverBudget: 1,
        lightingRhythm: 'pulsing',
        dressingKit: 'airlock_threshold',
        encounterPressure: 'medium',
        sightlineBreakFrequency: 'medium',
        repetitionCooldown: 2,
        compatibleFamilies: { from: ['o2', 'gate'], to: ['gate', 'armory', 'o2'] }
    }),
    Object.freeze({
        id: 'service_passage',
        lengthRange: [10, 20],
        widthRange: [2, 3],
        maxTurns: 2,
        elevationPolicy: 'flat',
        junctionEligible: true,
        coverBudget: 1,
        lightingRhythm: 'dim',
        dressingKit: 'pipes_and_cable_trays',
        encounterPressure: 'low',
        sightlineBreakFrequency: 'high',
        repetitionCooldown: 2,
        compatibleFamilies: { from: ['camp', 'medical', 'fabricator'], to: ['medical', 'fabricator', 'cache'] }
    }),
    Object.freeze({
        id: 'canyon_causeway',
        lengthRange: [16, 28],
        widthRange: [2, 3],
        maxTurns: 1,
        elevationPolicy: 'exposed',
        junctionEligible: false,
        coverBudget: 0,
        lightingRhythm: 'sparse',
        dressingKit: 'canyon_railing',
        encounterPressure: 'medium',
        sightlineBreakFrequency: 'low',
        repetitionCooldown: 2,
        compatibleFamilies: { from: ['entry', 'gate'], to: ['gate', 'entry'] }
    }),
    Object.freeze({
        id: 'defensive_approach',
        lengthRange: [12, 22],
        widthRange: [3, 4],
        maxTurns: 2,
        elevationPolicy: 'flat',
        junctionEligible: true,
        coverBudget: 2,
        lightingRhythm: 'warning',
        dressingKit: 'barricade_staging',
        encounterPressure: 'high',
        sightlineBreakFrequency: 'medium',
        repetitionCooldown: 2,
        compatibleFamilies: { from: ['o2', 'armory', 'trap'], to: ['gate'] }
    }),
    Object.freeze({
        id: 'camp_approach',
        lengthRange: [10, 20],
        widthRange: [3, 4],
        maxTurns: 2,
        elevationPolicy: 'flat',
        junctionEligible: true,
        coverBudget: 1,
        lightingRhythm: 'warm',
        dressingKit: 'camp_signage',
        encounterPressure: 'low',
        sightlineBreakFrequency: 'medium',
        repetitionCooldown: 2,
        compatibleFamilies: { from: ['entry'], to: ['camp'] }
    }),
    Object.freeze({
        id: 'secret_bypass',
        lengthRange: [8, 18],
        widthRange: [2, 2],
        maxTurns: 3,
        elevationPolicy: 'flat',
        junctionEligible: false,
        coverBudget: 0,
        lightingRhythm: 'dim',
        dressingKit: 'maintenance_hatch',
        encounterPressure: 'low',
        sightlineBreakFrequency: 'high',
        repetitionCooldown: 3,
        compatibleFamilies: { from: ['medical', 'armory', 'fabricator', 'cache'], to: ['entry'] }
    }),
    Object.freeze({
        id: 'boss_staging_approach',
        lengthRange: [14, 24],
        widthRange: [3, 4],
        maxTurns: 1,
        elevationPolicy: 'flat',
        junctionEligible: false,
        coverBudget: 2,
        lightingRhythm: 'warning',
        dressingKit: 'gate_staging',
        encounterPressure: 'high',
        sightlineBreakFrequency: 'low',
        repetitionCooldown: 3,
        compatibleFamilies: { from: ['trap', 'puzzle'], to: ['gate'] }
    }),
    Object.freeze({
        id: 'biome_transition_hall',
        lengthRange: [12, 24],
        widthRange: [3, 4],
        maxTurns: 2,
        elevationPolicy: 'flat',
        junctionEligible: true,
        coverBudget: 1,
        lightingRhythm: 'pulsing',
        dressingKit: 'biome_transition',
        encounterPressure: 'medium',
        sightlineBreakFrequency: 'medium',
        repetitionCooldown: 3,
        compatibleFamilies: { from: ['entry', 'camp', 'medical', 'o2'], to: ['cryo-lab', 'nest', 'hive'] }
    }),
    Object.freeze({
        id: 'hive_warning_approach',
        lengthRange: [12, 22],
        widthRange: [2, 3],
        maxTurns: 3,
        elevationPolicy: 'flat',
        junctionEligible: true,
        coverBudget: 1,
        lightingRhythm: 'warning',
        dressingKit: 'hive_warning',
        encounterPressure: 'high',
        sightlineBreakFrequency: 'high',
        repetitionCooldown: 3,
        compatibleFamilies: { from: ['medical', 'cryo-lab', 'gate'], to: ['nest', 'hive'] }
    })
]);
