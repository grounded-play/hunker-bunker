// ── Codex catalog (data) ──────────────────────────────────────
// doc 11 §3.2 + §3.4 content pipeline. Frozen, read-only entries the Codex
// viewer renders. Voiced in the municipal-decay-bureaucracy register so the
// "learn the world" layer reinforces the bunker's identity. IDs match the
// runtime signals that discover them (enemy `type`, boss type, lore keys).

export const CODEX_CATEGORIES = Object.freeze(['HOSTILE', 'INFRASTRUCTURE', 'PHENOMENON']);

export const CODEX_ENTRIES = Object.freeze([
    // Hostiles — ids match enemy `type` / boss type from enemy-killed & boss events.
    { id: 'cybersnail', name: 'CYBERSNAIL', category: 'HOSTILE',
      blurb: 'Reclassified livestock. Memory-slime carrier. Approaches with the patience of an unpaid invoice.' },
    { id: 'cryosnail', name: 'CRYOSNAIL', category: 'HOSTILE',
      blurb: 'Thermal-negative variant. Leaks a cold that Facilities insists is "ambient comfort loss."' },
    { id: 'sporesnail', name: 'SPORESNAIL', category: 'HOSTILE',
      blurb: 'Fruiting body on legs. Releases spores the air handler has agreed to ignore.' },
    { id: 'sentinel', name: 'SENTINEL DRONE', category: 'HOSTILE',
      blurb: 'Line-of-sight enforcement unit. Fires on anything exceeding its authorized happiness quota.' },
    { id: 'crawler', name: 'BREACH CRAWLER', category: 'HOSTILE',
      blurb: 'Wind-up melee asset. Telegraphs its lunge, as required by the safety manual it then ignores.' },
    { id: 'boss_cybersnail', name: 'MILESTONE RETALIATION', category: 'HOSTILE',
      blurb: 'Dispatched when an operator improves the facility without filing the correct form.' },
    { id: 'corrupted_operator', name: 'CORRUPTED OPERATOR', category: 'HOSTILE',
      blurb: 'A previous contractor, reabsorbed into the workforce. Still following its last mission script.' },

    // Infrastructure — discovered via terminals / O2 / foundry / extraction.
    { id: 'lore_terminal', name: 'BUNKER TERMINAL', category: 'INFRASTRUCTURE',
      blurb: 'Haunted memory device. Prints logs from a department that no longer answers.' },
    { id: 'o2_generator', name: 'O₂ FIELD STABILIZER', category: 'INFRASTRUCTURE',
      blurb: 'Restores a blue zone of breathable policy. Operation voids your remaining warranty.' },
    { id: 'foundry', name: 'FABRICATION FOUNDRY', category: 'INFRASTRUCTURE',
      blurb: 'Converts salvage into gear by gambling against procurement. House edge: catastrophic.' },
    { id: 'black_box', name: 'OPERATOR BLACK BOX', category: 'INFRASTRUCTURE',
      blurb: 'A dead contractor\'s sealed telemetry. Recoverable. Billable. Faintly accusatory.' },
    { id: 'mimic_terminal', name: 'MIMIC TERMINAL', category: 'INFRASTRUCTURE',
      blurb: 'A forged terminal signature. Pays out, then bills you in patrols. Engineers can verify before trusting it.' },

    // Phenomena — discovered via the Director / hazards / set-pieces.
    { id: 'lights_out', name: 'BREAKER FAULT', category: 'PHENOMENON',
      blurb: 'The lighting budget lapses without warning. Please enjoy the darkness responsibly.' },
    { id: 'compass_corruption', name: 'TELEMETRY DRIFT', category: 'PHENOMENON',
      blurb: 'Navigation data reclassified as suggestion. The map is corporate memory, not truth.' },
    { id: 'elevator_down', name: 'THE ELEVATOR DOWN', category: 'PHENOMENON',
      blurb: 'Ninety seconds of descent. The vents disagree with your presence the entire way.' }
]);

export function getCodexEntry(id) {
    return CODEX_ENTRIES.find((e) => e.id === id) ?? null;
}

export function getCodexEntriesByCategory(category) {
    return CODEX_ENTRIES.filter((e) => e.category === category);
}

export const CODEX_TOTAL = CODEX_ENTRIES.length;
