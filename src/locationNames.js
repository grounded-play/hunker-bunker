// Names for every room and most hallways, so the world reads as places.
//
// A name is deterministic for a chunk and room (the same seed always gives the
// same "PUMP HOUSE B-07"), and the player only learns it once a radar pulse has
// reached it; until then it reads as unknown (threeGame.scannedLocationKeys).
// Authored compound rooms (camps, hives) keep their own territory titles.
import { getTerritoryLocation } from './territoryStructures.js';

// Full i18n keys, written out so the locale audit can see them in use.
const ROOM_NOUNS = Object.freeze({
    generic: ['ui.location.room.junction_hall', 'ui.location.room.bulkhead_room', 'ui.location.room.survey_office', 'ui.location.room.mess_hall', 'ui.location.room.crew_quarters', 'ui.location.room.relay_room'],
    utility: ['ui.location.room.pump_house', 'ui.location.room.boiler_room', 'ui.location.room.switch_room', 'ui.location.room.filtration_plant'],
    medical: ['ui.location.room.med_bay', 'ui.location.room.triage_ward', 'ui.location.room.quarantine_cell'],
    security: ['ui.location.room.guard_post', 'ui.location.room.checkpoint', 'ui.location.room.armory', 'ui.location.room.holding_cells'],
    engineering: ['ui.location.room.reactor_annex', 'ui.location.room.fab_shop', 'ui.location.room.servo_lab', 'ui.location.room.turbine_hall'],
    storage: ['ui.location.room.supply_depot', 'ui.location.room.cold_store', 'ui.location.room.cargo_hold'],
    reward: ['ui.location.room.strongroom', 'ui.location.room.vault', 'ui.location.room.relic_cache'],
    camp: ['ui.location.room.camp_commons'],
    hive: ['ui.location.room.brood_chamber', 'ui.location.room.hive_gallery'],
    nest: ['ui.location.room.brood_chamber', 'ui.location.room.hive_gallery'],
    'cryo-lab': ['ui.location.room.cryo_lab']
});

const HALL_NOUNS = Object.freeze(['ui.location.hall.service_corridor', 'ui.location.hall.maintenance_tunnel', 'ui.location.hall.spine_passage', 'ui.location.hall.cable_run', 'ui.location.hall.drainage_cut', 'ui.location.hall.access_way']);

// "Mostly named": about one chunk in seven keeps an unmarked passage.
const UNMARKED_HALL_SHARE = 1 / 7;
const UNMARKED_HALL_KEY = 'ui.location.hall.unmarked';
const SECTOR_LETTERS = 'ABCDEFGHJKLMNPRSTUVWXZ';

function hash(text) {
    let value = 2166136261;
    for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
    return value >>> 0;
}

function designator(seedText, prefix = null) {
    const value = hash(seedText);
    const letter = prefix ?? SECTOR_LETTERS[value % SECTOR_LETTERS.length];
    return `${letter}-${String((value >>> 8) % 100).padStart(2, '0')}`;
}

/** { kind, nounKey, designator } or { kind, label } for an authored territory room. */
export function roomLocationName(room, chunkKey = room?.chunkKey ?? '') {
    if (!room) return null;
    const territory = room.siteId && room.territoryBeatKey ? getTerritoryLocation(room.siteId, room.territoryBeatKey) : null;
    if (territory) return { kind: 'room', label: `${territory.siteLabel} · ${territory.beatLabel}` };
    const nouns = ROOM_NOUNS[room.role] ?? ROOM_NOUNS.generic;
    const seed = `${chunkKey}|${room.id}`;
    return {
        kind: 'room',
        nounKey: nouns[hash(`noun|${seed}`) % nouns.length],
        designator: designator(seed)
    };
}

export function hallwayLocationName(chunkKey) {
    const value = hash(`hall|${chunkKey}`);
    if ((value % 1000) / 1000 < UNMARKED_HALL_SHARE) return { kind: 'hall', nounKey: UNMARKED_HALL_KEY, designator: '' };
    return {
        kind: 'hall',
        nounKey: HALL_NOUNS[(value >>> 4) % HALL_NOUNS.length],
        designator: designator(`hall-id|${chunkKey}`, 'C')
    };
}

export function formatLocationName(location, translate) {
    if (!location) return '';
    if (location.label) return String(location.label).toUpperCase();
    const noun = translate(location.nounKey);
    return location.designator ? `${noun} ${location.designator}` : noun;
}

export const ROOM_SCAN_KEY = (chunkKey, roomId) => `room:${chunkKey}:${roomId}`;
export const HALL_SCAN_KEY = (chunkKey) => `hall:${chunkKey}`;

/** Every i18n key this module can produce, for the locale audit. */
export function locationNameKeys() {
    return [...new Set(Object.values(ROOM_NOUNS).flat()), ...HALL_NOUNS, UNMARKED_HALL_KEY];
}
