// ── Codex catalog (data) ──────────────────────────────────────
// doc 11 §3.2 + §3.4 content pipeline. Frozen, read-only entries the Codex
// viewer renders. Voiced in the municipal-decay-bureaucracy register so the
// "learn the world" layer reinforces the bunker's identity. IDs match the
// runtime signals that discover them (enemy `type`, boss type, lore keys).

export const CODEX_CATEGORIES = Object.freeze(['HOSTILE', 'INFRASTRUCTURE', 'PHENOMENON']);

export const CODEX_ENTRIES = Object.freeze([
    // Hostiles — ids match enemy `type` / boss type from enemy-killed & boss events.
    { id: 'cybersnail', name: 'CYBERSNAIL', category: 'HOSTILE', image: '/cybersnail.png',
      blurb: 'Reclassified livestock. Memory-slime carrier. Approaches with the patience of an unpaid invoice.' },
    { id: 'cryosnail', name: 'CRYOSNAIL', category: 'HOSTILE', image: '/cryosnail.png',
      blurb: 'Thermal-negative variant. Leaks a cold that Facilities insists is "ambient comfort loss."' },
    { id: 'sporesnail', name: 'SPORESNAIL', category: 'HOSTILE', image: '/sporesnail.png',
      blurb: 'Fruiting body on legs. Releases spores the air handler has agreed to ignore.' },
    { id: 'sentinel', name: 'SENTINEL DRONE', category: 'HOSTILE', image: '/cutscenes/poster-art/death-combat.png',
      blurb: 'Line-of-sight enforcement unit. Fires on anything exceeding its authorized happiness quota.' },
    { id: 'crawler', name: 'BREACH CRAWLER', category: 'HOSTILE', image: '/cutscenes/poster-art/death-crawler.png',
      blurb: 'Wind-up melee asset. Telegraphs its lunge, as required by the safety manual it then ignores.' },
    { id: 'boss_cybersnail', name: 'MILESTONE RETALIATION', category: 'HOSTILE', image: '/cutscenes/poster-art/death-combat.png',
      blurb: 'Dispatched when an operator improves the facility without filing the correct form.' },
    { id: 'corrupted_operator', name: 'CORRUPTED OPERATOR', category: 'HOSTILE', image: '/boss_corrupted_scout.png',
      blurb: 'A previous contractor, reabsorbed into the workforce. Still following its last mission script.' },

    // Infrastructure — discovered via terminals / O2 / foundry / extraction.
    { id: 'lore_terminal', name: 'BUNKER TERMINAL', category: 'INFRASTRUCTURE', image: '/console.png',
      blurb: 'Haunted memory device. Prints logs from a department that no longer answers.' },
    { id: 'o2_generator', name: 'O₂ FIELD STABILIZER', category: 'INFRASTRUCTURE', image: '/module_o2_generator.png',
      blurb: 'Restores a blue zone of breathable policy. Operation voids your remaining warranty.' },
    { id: 'foundry', name: 'FABRICATION FOUNDRY', category: 'INFRASTRUCTURE', image: '/cutscenes/poster-art/event-foundry-discovered.png',
      blurb: 'Converts salvage into gear by gambling against procurement. House edge: catastrophic.' },
    { id: 'black_box', name: 'OPERATOR BLACK BOX', category: 'INFRASTRUCTURE', image: '/cutscenes/poster-art/event-black-box-recovered.png',
      blurb: 'A dead contractor\'s sealed telemetry. Recoverable. Billable. Faintly accusatory.' },
    { id: 'mimic_terminal', name: 'MIMIC TERMINAL', category: 'INFRASTRUCTURE', image: '/console.png',
      blurb: 'A forged terminal signature. Pays out, then bills you in patrols. Engineers can verify before trusting it.' },
    { id: 'wreckage_scout_tracking', name: 'SCOUT ALPHA BLACK PAYLOAD', category: 'INFRASTRUCTURE', image: '/scout_ship_broken.png',
      blurb: 'The Scout hull carried the tracker. Rescue was never the cleanest word for the operation.' },
    { id: 'wreckage_engineer_relay', name: 'BRAVO ENGINEER RELAY', category: 'INFRASTRUCTURE', image: '/engineer_ship_broken.png',
      blurb: 'The Engineer hull carried the repeater. Someone wanted the signal amplified from inside the ice.' },
    { id: 'wreckage_tank_weapon', name: 'CHARLIE TANK CONTAINMENT WEAPON', category: 'INFRASTRUCTURE', image: '/tank_ship_broken.png',
      blurb: 'The Tank hull carried the weapon. The mission expected a thing to answer before it expected anyone to leave.' },

    // Phenomena — discovered via the Director / hazards / set-pieces.
    { id: 'lights_out', name: 'BREAKER FAULT', category: 'PHENOMENON', image: '/cutscenes/poster-art/death-oxygen.png',
      blurb: 'The lighting budget lapses without warning. Please enjoy the darkness responsibly.' },
    { id: 'compass_corruption', name: 'TELEMETRY DRIFT', category: 'PHENOMENON', image: '/cutscenes/poster-art/death-abyss.png',
      blurb: 'Navigation data reclassified as suggestion. The map is corporate memory, not truth.' },
    { id: 'elevator_down', name: 'THE ELEVATOR DOWN', category: 'PHENOMENON', image: '/door_biomech_v2.webp',
      blurb: 'Ninety seconds of descent. The vents disagree with your presence the entire way.' },
    { id: 'specimen_0047', name: 'SPECIMEN 0047', category: 'PHENOMENON', image: '/cutscenes/poster-art/event-queen-encounter.png',
      blurb: 'THE LINCHPIN. ORIGIN WELD UNLOCKED: ANCIENT SEED-CARRIER RECLASSIFIED AS QUEEN\'S DORMANT CORE. EXOSUIT TELEMETRY INDICATES THE BIO-SIGNAL SHIFTS FOCUS FROM BROADCAST TO THE CARRIER\'S IN-WORLD BODY.' }
]);

export function getCodexEntry(id) {
    return CODEX_ENTRIES.find((e) => e.id === id) ?? null;
}

export function getCodexEntriesByCategory(category) {
    return CODEX_ENTRIES.filter((e) => e.category === category);
}

export const CODEX_TOTAL = CODEX_ENTRIES.length;

// ── Lore Logs Metadata (Sprint 19 Wave 3) ──────────────────────
export const LORE_METADATA = Object.freeze({
    A01: { date: '2047-08-11', coords: 'SECTOR A-9 / BAY C STASIS', group: 'recent' },
    A02: { date: '2047-08-11', coords: 'SECTOR A-9 / BAY C STASIS', group: 'recent' },
    A03: { date: '2047-08-12', coords: 'SECTOR A-9 / ACTIVE SECTOR', group: 'recent' },
    A04: { date: '2047-08-12', coords: 'SECTOR A-9 / ACTIVE SECTOR', group: 'recent' },
    A05: { date: '2047-08-13', coords: 'SECTOR A-9 / BAY C STASIS', group: 'recent' },
    A06: { date: '2047-08-13', coords: 'SECTOR A-9 / SECURITY CONTROL', group: 'recent' },
    A07: { date: '2047-08-14', coords: 'SECTOR A-9 / O2 GENERATOR', group: 'recent' },
    A08: { date: '2047-08-14', coords: 'SECTOR A-9 / COMMUNICATIONS', group: 'recent' },
    A09: { date: '2047-08-14', coords: 'SECTOR A-9 / BAY C STASIS', group: 'recent' },
    A10: { date: '2038-11-18', coords: 'SECTOR A-9 / ARMORY RUINS', group: 'historical' },
    A11: { date: '2038-11-20', coords: 'SECTOR A-9 / MAIN OFFICE', group: 'historical' },
    A12: { date: '2047-08-15', coords: 'SECTOR A-9 / COMMAND BASE', group: 'recent' },
    A13: { date: '2038-11-21', coords: 'SECTOR A-9 / WEAPONS BAY', group: 'historical' },
    A14: { date: '2038-11-21', coords: 'SECTOR A-9 / WEAPONS BAY', group: 'historical' },

    C01: { date: '2047-08-11', coords: 'SECTOR B-4 / BAY C', group: 'recent' },
    C02: { date: '2038-11-12', coords: 'SECTOR B-4 / COOLANT UNIT', group: 'historical' },
    C03: { date: '2038-11-13', coords: 'SECTOR B-4 / POD 312', group: 'historical' },
    C04: { date: '2038-11-14', coords: 'SECTOR B-4 / BAY C STASIS', group: 'historical' },
    C05: { date: '2038-11-14', coords: 'SECTOR B-4 / CRYO LABS', group: 'historical' },
    C06: { date: '2038-11-15', coords: 'SECTOR B-4 / CRYO CORRIDOR', group: 'historical' },
    C07: { date: '2038-11-16', coords: 'SECTOR B-4 / BAY C SEAL', group: 'historical' },
    C08: { date: '2038-11-17', coords: 'SECTOR B-4 / COOLANT DRAIN', group: 'historical' },
    C09: { date: '2038-11-17', coords: 'SECTOR B-4 / POD 0047', group: 'historical' },
    C10: { date: '2038-11-18', coords: 'SECTOR B-4 / VENT SHAFT', group: 'historical' },
    C11: { date: '2038-11-18', coords: 'SECTOR B-4 / OUTPOST HULL', group: 'historical' },
    C12: { date: '2038-11-19', coords: 'SECTOR B-4 / CRYO EXIT', group: 'historical' },

    B01: { date: '2038-11-20', coords: 'SECTOR C-7 / BIO SWARM', group: 'historical' },
    B02: { date: '2047-08-14', coords: 'SECTOR C-7 / NEURAL FILAMENT', group: 'recent' },
    B03: { date: '2047-08-14', coords: 'SECTOR C-7 / CHEN SECTOR OFFICE', group: 'recent' },

    drop_horizon_badge: { date: '2038-11-20', coords: 'SECTOR A-9 / BORE 7 RUINS', group: 'historical' },
    drop_dig_manifest: { date: '2038-11-21', coords: 'SECTOR A-9 / DEEP TUNNELS', group: 'historical' },
    drop_security_log: { date: '2038-11-21', coords: 'SECTOR A-9 / SECURITY POST', group: 'historical' },
    drop_survey_probe: { date: '2038-11-12', coords: 'SECTOR B-4 / CRATER RIM', group: 'historical' },
    drop_meteor_core: { date: '2038-11-13', coords: 'SECTOR B-4 / IMPACT CORE', group: 'historical' },
    drop_ration_ledger: { date: '2047-08-11', coords: 'SECTOR B-4 / REFUGEE OUTPOST', group: 'recent' },
    drop_child_drawing: { date: '2047-08-12', coords: 'SECTOR B-4 / SECTOR FAMILY AREA', group: 'recent' },
    drop_dogtags: { date: '2047-08-13', coords: 'SECTOR B-4 / PERIMETER DEFENSE', group: 'recent' },
    drop_resin_locket: { date: '2047-08-14', coords: 'SECTOR C-7 / BIO SWARM NEST', group: 'recent' },
    drop_moult_shard: { date: '2038-11-20', coords: 'SECTOR C-7 / THE ABYSS HIVE', group: 'historical' },
    drop_first_bore_tag: { date: '2038-11-21', coords: 'SECTOR C-7 / CAVERN ENTRANCE', group: 'historical' },
    drop_prayer_stone: { date: '2038-11-22', coords: 'SECTOR C-7 / CULT SANCTUARY', group: 'historical' },
    drop_frozen_letter: { date: '2047-08-14', coords: 'ACTIVE / DRIFT OUTSIDE OUTPOST', group: 'recent' },
    drop_black_flask: { date: '2047-08-15', coords: 'ACTIVE / CATACOMBS BASEMENT', group: 'recent' }
});

// Class-specific payload wreck logs
export const LORE_CLASS_LOGS = Object.freeze({
    SCOUT: 'SCOUT DEPLOYMENT BRIEF: HULL PAYLOAD — TRACKING BEACON. TARGET LOCKED ON SPECIMEN 0047. IF YOU READ THIS, THE BEACON IS ALIVE AND TRANSMITTING. IT IS THE REASON 0047 IS LISTENING TO YOU NOW. YOU CANNOT HIDE.',
    ENGINEER: 'ENGINEER DEPLOYMENT BRIEF: HULL PAYLOAD — NEURAL FILAMENT UPLINK RELAY. BROADCAST BANDWIDTH SECURED FOR SWARM-INTEGRATED TRANSITIONS. IF THE RELAY IS SEVERED, THE SYSTEM RECONVERGES LOCAL POWER AROUND THE SUIT.',
    TANK: 'TANK DEPLOYMENT BRIEF: HULL PAYLOAD — HEAVY COMBAT WEAPON ORGANS. DESIGNED TO STABILIZE BIO-STRUCTURAL IMPACTS AT THE QUEEN\'S THRONE. USE THE FORCE-FIELDS OF THIS CHASSIS TO ABSORB THE HIVE DEFENSES.'
});

export const CLASS_WRECKAGE_LOGS = Object.freeze({
    SCOUT: Object.freeze({
        classType: 'SCOUT',
        codexId: 'wreckage_scout_tracking',
        title: 'SCOUT ALPHA WRECKAGE',
        hull: 'SCOUT ALPHA',
        date: '2047-08-14T21:12:06Z',
        coords: Object.freeze({ sector: 'ACTIVE', x: -41, z: 33 }),
        payload: LORE_CLASS_LOGS.SCOUT
    }),
    ENGINEER: Object.freeze({
        classType: 'ENGINEER',
        codexId: 'wreckage_engineer_relay',
        title: 'BRAVO ENGINEER WRECKAGE',
        hull: 'BRAVO ENGINEER',
        date: '2047-08-14T21:18:44Z',
        coords: Object.freeze({ sector: 'CRYO', x: 22, z: 97 }),
        payload: LORE_CLASS_LOGS.ENGINEER
    }),
    TANK: Object.freeze({
        classType: 'TANK',
        codexId: 'wreckage_tank_weapon',
        title: 'CHARLIE TANK WRECKAGE',
        hull: 'CHARLIE TANK',
        date: '2047-08-14T21:26:19Z',
        coords: Object.freeze({ sector: 'BIO', x: 8, z: 161 }),
        payload: LORE_CLASS_LOGS.TANK
    })
});
