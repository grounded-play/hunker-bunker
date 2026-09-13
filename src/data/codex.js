import { localizeCatalog } from '../i18nCatalog.js';

// ── Codex catalog (data) ──────────────────────────────────────
// doc 11 §3.2 + §3.4 content pipeline. Frozen, read-only entries the Codex
// viewer renders. Voiced in the municipal-decay-bureaucracy register so the
// "learn the world" layer reinforces the bunker's identity. IDs match the
// runtime signals that discover them (enemy `type`, boss type, lore keys).

export const CODEX_CATEGORIES = Object.freeze(['HOSTILE', 'INFRASTRUCTURE', 'PHENOMENON']);

export const CODEX_ENTRIES = localizeCatalog('narrative.codexEntries', Object.freeze([
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
    { id: 'corrupted_operator', name: 'CORRUPTED OPERATOR', category: 'HOSTILE', image: '/boss_corrupted_scout_v2.png',
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
    { id: 'elevator_down', name: 'THE ELEVATOR DOWN', category: 'PHENOMENON', image: '/door_biomech_keyart_v2.webp',
      blurb: 'Ninety seconds of descent. The vents disagree with your presence the entire way.' },
    { id: 'specimen_0047', name: 'SPECIMEN 0047', category: 'PHENOMENON', image: '/cutscenes/poster-art/event-queen-encounter.png',
      blurb: 'THE LINCHPIN. ORIGIN WELD UNLOCKED: ANCIENT SEED-CARRIER RECLASSIFIED AS QUEEN\'S DORMANT CORE. EXOSUIT TELEMETRY INDICATES THE BIO-SIGNAL SHIFTS FOCUS FROM BROADCAST TO THE CARRIER\'S IN-WORLD BODY.' },

    // Story linchpins. Written after the fact, never before: the choice stays
    // irreversible and uncomfortable, but the player gets a record of what it
    // closed instead of silently losing endings they can never account for.
    { id: 'linchpin_tina_killed', name: 'THE MAYOR, ENDED', category: 'PHENOMENON', image: '/lore_portraits/mayor_tina.webp',
      blurb: 'You put the thing wearing the Mayor down. The camps will thank you for it, loudly and for a long time. Something under the ice recorded the debt and will not be settling it. Roads that are now closed: the exodus, the full brood, the quiet flight home.' },
    { id: 'linchpin_tina_joined', name: 'THE MAYOR, ACCEPTED', category: 'PHENOMENON', image: '/lore_portraits/mayor_tina.webp',
      blurb: 'You took what was offered and something in your chest agreed to it. The camps can smell the difference now. Roads that are now closed: the clean break, the scorched sky. Neither was ever going to be yours.' },
    { id: 'linchpin_specimen_proved', name: 'THE SPECIMEN, HEARD', category: 'PHENOMENON', image: '/cybersnail.png',
      blurb: 'You stood still in front of a thing built to kill you and it did not. Okonkwo-Vass has two years of notes calling them vermin and has started a new page. Nothing closed today. That is rarer than it sounds.' },
    { id: 'linchpin_specimen_dismissed', name: 'THE SPECIMEN, ENDED', category: 'PHENOMENON', image: '/cybersnail.png',
      blurb: 'She asked for one. You gave her a body instead. The only human who would have spoken for the hives has stopped taking notes. Road now closed: the exodus. There is no one left to vouch for it.' },
    { id: 'linchpin_queen_accepted', name: 'THE QUEEN, ABOARD', category: 'PHENOMENON', image: '/cutscenes/poster-art/event-queen-encounter.png',
      blurb: 'She takes two seats. You did the arithmetic and said yes anyway. Roads now closed: the clean break, the quiet smuggle. Whatever leaves the ice with you, most of it will be her.' },
    { id: 'linchpin_queen_refused', name: 'THE QUEEN, REFUSED', category: 'PHENOMENON', image: '/cutscenes/poster-art/event-queen-encounter.png',
      blurb: 'You left her under the ice with three seats still in your hand. Road now closed: the full brood. She was always going to cost more than she offered.' },

    // Faction Leader Linchpins
    { id: 'linchpin_briggs_oath_honored', name: "COMMANDER BRIGGS, HONORED", category: 'PHENOMENON', image: '/tank_ship_broken.png',
      blurb: "You stood with Vesper's garrison. The trench shields held and the soldier's faith was rewarded. Roads now closed: the full brood, the scorched sky." },
    { id: 'linchpin_briggs_oath_broken', name: "COMMANDER BRIGGS, ABANDONED", category: 'PHENOMENON', image: '/tank_ship_broken.png',
      blurb: "You severed Vesper's supply lines and left the frontline to freeze. The garrison fell in silence. Road now closed: the clean break." },
    { id: 'linchpin_martha_beacon_broadcast', name: "THE SISTER'S BEACON, BROADCAST", category: 'PHENOMENON', image: '/scout_ship_broken.png',
      blurb: "Sister Martha's transmission lit every receiver in the ice. The lost hear hope, and the swarm hears prey. Road now closed: the mothership infection." },
    { id: 'linchpin_martha_beacon_silenced', name: "THE SISTER'S BEACON, SILENCED", category: 'PHENOMENON', image: '/scout_ship_broken.png',
      blurb: "You cut the cables and forced Tallow into quiet boots. Stealth was bought with civilian despair. Roads now closed: the clean break, the alien exodus." },
    { id: 'linchpin_kaelen_manifest_disclosed', name: "THE FOUNDRY MANIFEST, DISCLOSED", category: 'PHENOMENON', image: '/engineer_ship_broken.png',
      blurb: "Overseer Kaelen published the unaltered flight manifests. No corporate privileges survived. Roads now closed: the mothership infection, the carrier's bargain." },
    { id: 'linchpin_kaelen_manifest_falsified', name: "THE FOUNDRY MANIFEST, FALSIFIED", category: 'PHENOMENON', image: '/engineer_ship_broken.png',
      blurb: "The passenger manifest was altered behind locked bulkheads. Corporate lies outlive the colony. Road now closed: the clean break." },

    // Hive Ally Linchpins
    { id: 'linchpin_suture_cured_human', name: "THE SUTURE HOST, CURED", category: 'PHENOMENON', image: '/module_o2_generator.png',
      blurb: "Nahl's surgical extraction purged the spore from your blood. You walk as pure human once more. Roads now closed: the full brood, the mothership infection, the alien exodus." },
    { id: 'linchpin_suture_symbiotic_carrier', name: "THE SUTURE HOST, EMBRACED", category: 'PHENOMENON', image: '/module_o2_generator.png',
      blurb: "You allowed the hive spore to graft into your marrow. You are carrier and vessel in one flesh. Road now closed: the clean break." },
    { id: 'linchpin_relay_jammed_camps', name: "THE RELAY CHORUS, JAMMED", category: 'PHENOMENON', image: '/console.png',
      blurb: "You severed human radio frequencies to protect the hive's acoustic sanctuary. Camp communications shattered. Road now closed: the outed escape." },
    { id: 'linchpin_relay_bridge_synapse', name: "THE RELAY CHORUS, BRIDGED", category: 'PHENOMENON', image: '/console.png',
      blurb: "Vey opened the neural synapse bridge between hive and human minds. Thoughts bleed across the spectrum. Road now closed: the clean break." },
    { id: 'linchpin_carapace_shield_queen', name: "THE CARAPACE OATH, TO THE QUEEN", category: 'PHENOMENON', image: '/cutscenes/poster-art/event-queen-encounter.png',
      blurb: "Rhun's chitin fortress pledged eternal defense to the Brood Mother. Human shuttles must pierce its bulk. Roads now closed: the alien exodus, the clean break." },
    { id: 'linchpin_carapace_shield_operator', name: "THE CARAPACE OATH, TO THE OPERATOR", category: 'PHENOMENON', image: '/cutscenes/poster-art/event-queen-encounter.png',
      blurb: "The living shield bound its vow to you, walking beside human survivors as guardian. Road now closed: the full brood." }
]), { skip: ['id', 'category', 'image'] });

export function getCodexEntry(id) {
    return CODEX_ENTRIES.find((e) => e.id === id) ?? null;
}

export function getCodexEntriesByCategory(category) {
    return CODEX_ENTRIES.filter((e) => e.category === category);
}

export const CODEX_TOTAL = CODEX_ENTRIES.length;

// ── Lore Logs Metadata (Sprint 19 Wave 3) ──────────────────────
export const LORE_METADATA = localizeCatalog('narrative.loreMetadata', Object.freeze({
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
}), { skip: ['date', 'coords', 'group'] });

// Class-specific payload wreck logs
export const LORE_CLASS_LOGS = localizeCatalog('narrative.loreClassLogs', Object.freeze({
    SCOUT: 'SCOUT DEPLOYMENT BRIEF: HULL PAYLOAD — TRACKING BEACON. TARGET LOCKED ON SPECIMEN 0047. IF YOU READ THIS, THE BEACON IS ALIVE AND TRANSMITTING. IT IS THE REASON 0047 IS LISTENING TO YOU NOW. YOU CANNOT HIDE.',
    ENGINEER: 'ENGINEER DEPLOYMENT BRIEF: HULL PAYLOAD — NEURAL FILAMENT UPLINK RELAY. BROADCAST BANDWIDTH SECURED FOR SWARM-INTEGRATED TRANSITIONS. IF THE RELAY IS SEVERED, THE SYSTEM RECONVERGES LOCAL POWER AROUND THE SUIT.',
    TANK: 'TANK DEPLOYMENT BRIEF: HULL PAYLOAD — HEAVY COMBAT WEAPON ORGANS. DESIGNED TO STABILIZE BIO-STRUCTURAL IMPACTS AT THE QUEEN\'S THRONE. USE THE FORCE-FIELDS OF THIS CHASSIS TO ABSORB THE HIVE DEFENSES.'
}));

export const CLASS_WRECKAGE_LOGS = localizeCatalog('narrative.classWreckageLogs', Object.freeze({
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
}), { skip: ['classType', 'codexId', 'date', 'hull', 'sector'] });
