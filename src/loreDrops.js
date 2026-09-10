// ── Findable lore drops ───────────────────────────────────────
// Physical collectibles: the carry-it-home counterpart to the dead-end lore
// terminals. Each drop is keyed to a site family so the world's places tell
// their own stories — ruins hold Horizon wreckage, craters hold impact-era
// relics, camps hold survivor ephemera, hives hold what the brood keeps.
//
// Found keys persist in the same store the terminals use
// (hb_world_memory_v1.logsFound), so a drop found once never respawns.
// Collection dispatches `lore-drop-collected` (achievements count it) and
// `lore-terminal-read` (the existing reader modal + codex feed).

export const LORE_DROP_SITES = Object.freeze(['ruins', 'crater', 'camp', 'hive', 'cave', 'anywhere']);

// Narrative stages. A run's lore should arrive as setup, then development,
// then revelation -- not as a rarity-weighted shuffle that can hand a player
// the queen's moult shard before anything has established that the hive keeps
// records at all. Selection drains a site's earliest unfound stage first.
export const LORE_STAGES = Object.freeze([1, 2, 3]);

// Authored as `body` (what the object is) plus `lead` (what finding it tells
// you to do, fear, or expect). `text` is the two composed, so the lead reaches
// the player through the reader modal the collection path already opens --
// flavour alone is a counter; a lead is a reason to go somewhere.
const LORE_DROP_SOURCE = [
    // Ruins — Horizon Corporation wreckage
    { key: 'drop_horizon_badge', title: 'HORIZON ID BADGE', rarity: 'common', site: 'ruins', stage: 1, body: 'CHEN, A. — GEOTHERMAL DIVISION. ACCESS: CORE STRATA. The lanyard is melted to the clip. Someone wore this running.', lead: 'Core strata clearance was a real thing a real person carried. The doors it opened are still down there, and they were built to be opened.' },
    { key: 'drop_dig_manifest', title: 'EXCAVATION MANIFEST', rarity: 'common', site: 'ruins', stage: 2, body: 'Bore 7 exceeded charter depth by 900m. Foreman signed the variance himself. Margin note, different hand: "IT IS WARM DOWN THERE. ROCK SHOULD NOT BE WARM."', lead: 'Bore 7 is the wound everything else came out of. Every level beneath this one was dug by people who already knew better.' },
    { key: 'drop_security_log', title: 'SECURITY DUTY LOG', rarity: 'rare', site: 'ruins', stage: 3, body: 'Day 61: Perimeter quiet. Day 62: Perimeter quiet. Day 63: The perimeter is not where we left it. Requesting transfer. Requesting anything.', lead: 'The ruins do not hold still. Any route you memorise here is a guess with a shelf life — check your way back before you need it.' },
    // Craters — impact-era relics
    { key: 'drop_survey_probe', title: 'CRACKED SURVEY PROBE', rarity: 'common', site: 'crater', stage: 1, body: 'Pre-Horizon markings. Whatever agency dropped it stopped existing before the bunker was dug. Its last reading is still on the screen: BIOSIGN — POSITIVE — DEPTH UNKNOWN.', lead: 'Something was alive at depth before Horizon ever broke ground. You are not the first expedition down. You are the latest one.' },
    { key: 'drop_meteor_core', title: 'VITRIFIED CORE SAMPLE', rarity: 'rare', site: 'crater', stage: 2, body: 'Glass all the way through. The impact that made this bowl predates the ice. Something in the glass refracts light in a pattern that repeats every eleven seconds, like breathing.', lead: 'Eleven seconds, over and over. Start counting the next time the ice glows at you — the interval is not decoration, and it is not yours.' },
    // Camps — survivor ephemera
    { key: 'drop_ration_ledger', title: 'CONTRACTOR RATION LEDGER', rarity: 'common', site: 'camp', stage: 1, body: 'Forty names. Then thirty-one. Then a single line: "stopped counting mouths, started counting hands."', lead: 'The camps stopped trading in names and started trading in usefulness. Arrive with work in hand and their supply opens up.' },
    { key: 'drop_dogtags', title: 'SECURITY DOG TAGS', rarity: 'common', site: 'camp', stage: 2, body: 'VESPER, K. — the camp kept her name after they lost her. The tags are polished. Someone still handles them daily.', lead: 'Vesper keeps its dead on the roster. Carry her name to their gate and the guns come down a little further than they would for a stranger.' },
    { key: 'drop_child_drawing', title: 'CRAYON DRAWING', rarity: 'rare', site: 'camp', stage: 3, body: 'A stick family under a dome. A yellow scribble labeled SUN, which no one here has seen. On the back, an adult wrote: keep her away from the vents.', lead: 'Keep her away from the vents. Whatever the camps have learned to be afraid of, it comes in through the airways — theirs and yours.' },
    // Hives — what the brood keeps
    { key: 'drop_resin_locket', title: 'RESIN-SEALED LOCKET', rarity: 'rare', site: 'hive', stage: 1, body: 'A human locket, sealed inside amber resin with surgical care. The hive does not discard what its hosts loved. It archives it.', lead: 'The brood keeps what its hosts loved. That is not appetite, it is curation — and it means the hive is studying you back.' },
    { key: 'drop_moult_shard', title: 'QUEEN MOULT SHARD', rarity: 'legendary', site: 'hive', stage: 3, body: 'A palm-sized plate of shed carapace, warm to the touch through the glove. The interior surface is covered in grooves. Under magnification, the grooves are writing.', lead: 'She sheds it deliberately, and the grooves are writing. The queen is leaving records for something that can read them. Assume it is still coming to collect.' },
    // Cave — the source
    { key: 'drop_first_bore_tag', title: 'BORE 7 MARKER TAG', rarity: 'rare', site: 'cave', stage: 1, body: 'The original claim tag from the dig that broke through. Horizon lawyers stamped it VOID. Something else stamped it deeper, in a script of paired punctures.', lead: 'This is the mouth Bore 7 actually opened, whatever the charter says. The cave has not forgotten the intrusion, and it marked the paperwork itself.' },
    { key: 'drop_prayer_stone', title: 'ETCHED PRAYER STONE', rarity: 'legendary', site: 'cave', stage: 3, body: 'Cultist work — the queen had believers before she had hosts. The etching reads, in careful Standard: SHE DREAMS US WARM.', lead: 'She had worshippers before she had hosts. Some of them are still down here keeping faith, and they will not read you as a rescue.' },
    // Anywhere — drift
    { key: 'drop_frozen_letter', title: 'UNSENT LETTER', rarity: 'common', site: 'anywhere', stage: 1, body: '"— and when my contract clears I will buy the orchard plot, the one with the south wall. Hold it for me. Hold everything." Postage was never paid.', lead: 'Nobody on this rock ever cleared their contract. Whatever you are banking toward, bank it somewhere the ice cannot reach.' },
    { key: 'drop_black_flask', title: 'ENGRAVED FLASK', rarity: 'common', site: 'anywhere', stage: 2, body: 'TO THE BEST CREW ON THE WORST ROCK — DAY 1000. It is still half full. Nobody made it to day 1001 to finish it.', lead: 'Day 1000 is the last good day anyone wrote down. Everything you are walking through happened on the other side of it.' }
];

export const LORE_DROPS = Object.freeze(LORE_DROP_SOURCE.map((drop) => Object.freeze({
    ...drop,
    text: `${drop.body} ${drop.lead}`
})));

const WORLD_MEMORY_KEY = 'hb_world_memory_v1';

function getStorage(storage) {
    if (storage) return storage;
    try { return globalThis.localStorage ?? null; } catch { return null; }
}

// Same shape main.js's world-memory helpers use — one shared store, so
// terminals and drops share a single "found" ledger.
export function getFoundLoreKeys(storage = null) {
    const store = getStorage(storage);
    try {
        const mem = JSON.parse(store?.getItem(WORLD_MEMORY_KEY) ?? 'null') ?? {};
        return Array.isArray(mem.logsFound) ? [...mem.logsFound] : [];
    } catch { return []; }
}

export function markLoreDropFound(key, storage = null) {
    const store = getStorage(storage);
    let mem = { logsFound: [], biomesMapped: [] };
    try {
        mem = JSON.parse(store?.getItem(WORLD_MEMORY_KEY) ?? 'null') ?? mem;
    } catch { /* fresh memory */ }
    if (!Array.isArray(mem.logsFound)) mem.logsFound = [];
    if (mem.logsFound.includes(key)) return false;
    mem.logsFound.push(key);
    try { store?.setItem(WORLD_MEMORY_KEY, JSON.stringify(mem)); } catch { /* best-effort */ }
    return true;
}

const RARITY_WEIGHTS = Object.freeze({ common: 6, rare: 3, legendary: 1 });

// Seeded pick for a site. `anywhere` drops pad every site's pool so common
// drift shows up across the map, while site-specific stories stay put.
export function pickLoreDropForSite(random, site, foundKeys = []) {
    const found = new Set(foundKeys);
    const available = LORE_DROPS.filter((d) => !found.has(d.key) && (d.site === site || d.site === 'anywhere'));
    if (!available.length) return null;
    // Setup before payoff: narrow to the earliest stage this site still owes
    // the player, then roll rarity within it as before. Rarity decides which
    // story you get; stage decides when you are ready to hear it.
    const earliestStage = Math.min(...available.map((d) => d.stage));
    const pool = available.filter((d) => d.stage === earliestStage);
    const total = pool.reduce((sum, d) => sum + (RARITY_WEIGHTS[d.rarity] ?? 1), 0);
    let roll = random() * total;
    for (const drop of pool) {
        roll -= RARITY_WEIGHTS[drop.rarity] ?? 1;
        if (roll <= 0) return drop;
    }
    return pool[pool.length - 1];
}

export function getLoreDropByKey(key) {
    return LORE_DROPS.find((d) => d.key === key) ?? null;
}
