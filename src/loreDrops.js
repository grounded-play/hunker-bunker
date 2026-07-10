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

export const LORE_DROPS = Object.freeze([
    // Ruins — Horizon Corporation wreckage
    Object.freeze({ key: 'drop_horizon_badge', title: 'HORIZON ID BADGE', rarity: 'common', site: 'ruins', text: 'CHEN, A. — GEOTHERMAL DIVISION. ACCESS: CORE STRATA. The lanyard is melted to the clip. Someone wore this running.' }),
    Object.freeze({ key: 'drop_dig_manifest', title: 'EXCAVATION MANIFEST', rarity: 'common', site: 'ruins', text: 'Bore 7 exceeded charter depth by 900m. Foreman signed the variance himself. Margin note, different hand: "IT IS WARM DOWN THERE. ROCK SHOULD NOT BE WARM."' }),
    Object.freeze({ key: 'drop_security_log', title: 'SECURITY DUTY LOG', rarity: 'rare', site: 'ruins', text: 'Day 61: Perimeter quiet. Day 62: Perimeter quiet. Day 63: The perimeter is not where we left it. Requesting transfer. Requesting anything.' }),
    // Craters — impact-era relics
    Object.freeze({ key: 'drop_survey_probe', title: 'CRACKED SURVEY PROBE', rarity: 'common', site: 'crater', text: 'Pre-Horizon markings. Whatever agency dropped it stopped existing before the bunker was dug. Its last reading is still on the screen: BIOSIGN — POSITIVE — DEPTH UNKNOWN.' }),
    Object.freeze({ key: 'drop_meteor_core', title: 'VITRIFIED CORE SAMPLE', rarity: 'rare', site: 'crater', text: 'Glass all the way through. The impact that made this bowl predates the ice. Something in the glass refracts light in a pattern that repeats every eleven seconds, like breathing.' }),
    // Camps — survivor ephemera
    Object.freeze({ key: 'drop_ration_ledger', title: 'CONTRACTOR RATION LEDGER', rarity: 'common', site: 'camp', text: 'Forty names. Then thirty-one. Then a single line: "stopped counting mouths, started counting hands."' }),
    Object.freeze({ key: 'drop_child_drawing', title: 'CRAYON DRAWING', rarity: 'rare', site: 'camp', text: 'A stick family under a dome. A yellow scribble labeled SUN, which no one here has seen. On the back, an adult wrote: keep her away from the vents.' }),
    Object.freeze({ key: 'drop_dogtags', title: 'SECURITY DOG TAGS', rarity: 'common', site: 'camp', text: 'VESPER, K. — the camp kept her name after they lost her. The tags are polished. Someone still handles them daily.' }),
    // Hives — what the brood keeps
    Object.freeze({ key: 'drop_resin_locket', title: 'RESIN-SEALED LOCKET', rarity: 'rare', site: 'hive', text: 'A human locket, sealed inside amber resin with surgical care. The hive does not discard what its hosts loved. It archives it.' }),
    Object.freeze({ key: 'drop_moult_shard', title: 'QUEEN MOULT SHARD', rarity: 'legendary', site: 'hive', text: 'A palm-sized plate of shed carapace, warm to the touch through the glove. The interior surface is covered in grooves. Under magnification, the grooves are writing.' }),
    // Cave — the source
    Object.freeze({ key: 'drop_first_bore_tag', title: 'BORE 7 MARKER TAG', rarity: 'rare', site: 'cave', text: 'The original claim tag from the dig that broke through. Horizon lawyers stamped it VOID. Something else stamped it deeper, in a script of paired punctures.' }),
    Object.freeze({ key: 'drop_prayer_stone', title: 'ETCHED PRAYER STONE', rarity: 'legendary', site: 'cave', text: 'Cultist work — the queen had believers before she had hosts. The etching reads, in careful Standard: SHE DREAMS US WARM.' }),
    // Anywhere — drift
    Object.freeze({ key: 'drop_frozen_letter', title: 'UNSENT LETTER', rarity: 'common', site: 'anywhere', text: '"— and when my contract clears I will buy the orchard plot, the one with the south wall. Hold it for me. Hold everything." Postage was never paid.' }),
    Object.freeze({ key: 'drop_black_flask', title: 'ENGRAVED FLASK', rarity: 'common', site: 'anywhere', text: 'TO THE BEST CREW ON THE WORST ROCK — DAY 1000. It is still half full. Nobody made it to day 1001 to finish it.' })
]);

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
    const pool = LORE_DROPS.filter((d) => !found.has(d.key) && (d.site === site || d.site === 'anywhere'));
    if (!pool.length) return null;
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
