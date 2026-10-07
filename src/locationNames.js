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

const SITE_NOUNS = Object.freeze({
    impact_site: 'ui.location.site.impact_site',
    foundry: 'ui.location.site.foundry',
    cave_mouth: 'ui.location.site.cave_mouth',
    o2_generator: 'ui.location.site.o2_generator'
});

const WRECK_SUBTITLES = Object.freeze({
    scout: 'ui.location.site.wreck.scout',
    tank: 'ui.location.site.wreck.tank',
    engineer: 'ui.location.site.wreck.engineer',
    infiltrator: 'ui.location.site.wreck.infiltrator'
});

const ROLE_SUBTITLES = Object.freeze({
    generic: 'ui.location.role.generic',
    utility: 'ui.location.role.utility',
    medical: 'ui.location.role.medical',
    security: 'ui.location.role.security',
    engineering: 'ui.location.role.engineering',
    storage: 'ui.location.role.storage',
    reward: 'ui.location.role.reward',
    camp: 'ui.location.role.camp',
    hive: 'ui.location.role.hive',
    nest: 'ui.location.role.nest',
    'cryo-lab': 'ui.location.role.cryo_lab',
    foundry: 'ui.location.role.foundry',
    cave: 'ui.location.role.cave',
    life_support: 'ui.location.role.life_support',
    transit: 'ui.location.role.transit',
    home: 'ui.location.role.home'
});

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

/** { kind, nounKey, designator, subtitleKey } or { kind, label, subtitle } for an authored territory room. */
export function roomLocationName(room, chunkKey = room?.chunkKey ?? '') {
    if (!room) return null;
    const territory = room.siteId && room.territoryBeatKey ? getTerritoryLocation(room.siteId, room.territoryBeatKey) : null;
    if (territory) {
        return {
            kind: 'room',
            label: `${territory.siteLabel} · ${territory.beatLabel}`,
            siteId: room.siteId,
            beatKey: room.territoryBeatKey,
            family: territory.family,
            role: room.role ?? 'camp',
            subtitle: territory.beatLabel
        };
    }
    const nouns = ROOM_NOUNS[room.role] ?? ROOM_NOUNS.generic;
    const seed = `${chunkKey}|${room.id}`;
    return {
        kind: 'room',
        nounKey: nouns[hash(`noun|${seed}`) % nouns.length],
        designator: designator(seed),
        role: room.role ?? 'generic',
        theme: room.theme ?? null,
        subtitleKey: ROLE_SUBTITLES[room.role] ?? ROLE_SUBTITLES.generic
    };
}

export function hallwayLocationName(chunkKey) {
    const value = hash(`hall|${chunkKey}`);
    if ((value % 1000) / 1000 < UNMARKED_HALL_SHARE) {
        return {
            kind: 'hall',
            nounKey: UNMARKED_HALL_KEY,
            designator: '',
            subtitleKey: ROLE_SUBTITLES.transit
        };
    }
    return {
        kind: 'hall',
        nounKey: HALL_NOUNS[(value >>> 4) % HALL_NOUNS.length],
        designator: designator(`hall-id|${chunkKey}`, 'C'),
        subtitleKey: ROLE_SUBTITLES.transit
    };
}

export function crashSiteLocationName(seed = 0, shipType = 'SCOUT') {
    const normalizedShip = String(shipType || 'scout').toLowerCase();
    const wreckKey = WRECK_SUBTITLES[normalizedShip] ?? WRECK_SUBTITLES.scout;
    return {
        kind: 'crash_site',
        siteId: 'crash_site',
        nounKey: SITE_NOUNS.impact_site,
        designator: designator(`crash|${seed}`, 'K'),
        wreckKey,
        subtitleKey: ROLE_SUBTITLES.home
    };
}

export function foundryLocationName(seed = 0) {
    return {
        kind: 'landmark',
        siteId: 'foundry',
        nounKey: SITE_NOUNS.foundry,
        designator: designator(`foundry|${seed}`, 'F'),
        subtitleKey: ROLE_SUBTITLES.foundry
    };
}

export function caveMouthLocationName(seed = 0) {
    return {
        kind: 'landmark',
        siteId: 'cave_mouth',
        nounKey: SITE_NOUNS.cave_mouth,
        designator: designator(`cave|${seed}`, 'X'),
        subtitleKey: ROLE_SUBTITLES.cave
    };
}

export function o2SiteLocationName(seed = 0) {
    return {
        kind: 'landmark',
        siteId: 'o2_generator',
        nounKey: SITE_NOUNS.o2_generator,
        designator: designator(`o2|${seed}`, 'O'),
        subtitleKey: ROLE_SUBTITLES.life_support
    };
}

export function formatLocationName(location, translate) {
    if (!location) return '';
    if (location.label) return String(location.label).toUpperCase();
    if (location.kind === 'crash_site') {
        const site = `${translate(location.nounKey)} ${location.designator}`;
        const wreck = translate(location.wreckKey);
        return `${site} · ${wreck}`;
    }
    const noun = translate(location.nounKey);
    return location.designator ? `${noun} ${location.designator}` : noun;
}

export function formatLocationSubtitle(location, translate) {
    if (!location) return '';
    if (location.subtitle) return String(location.subtitle).toUpperCase();
    if (location.subtitleKey) return translate(location.subtitleKey);
    return '';
}

export const ROOM_SCAN_KEY = (chunkKey, roomId) => `room:${chunkKey}:${roomId}`;
export const HALL_SCAN_KEY = (chunkKey) => `hall:${chunkKey}`;
export const CRASH_SITE_SCAN_KEY = () => 'site:crash_site';
export const FOUNDRY_SCAN_KEY = () => 'site:foundry';
export const CAVE_MOUTH_SCAN_KEY = () => 'site:cave_mouth';
export const O2_SITE_SCAN_KEY = () => 'site:o2_generator';

/** Every i18n key this module can produce, for the locale audit. */
export function locationNameKeys() {
    return [
        ...new Set(Object.values(ROOM_NOUNS).flat()),
        ...HALL_NOUNS,
        UNMARKED_HALL_KEY,
        ...Object.values(SITE_NOUNS),
        ...Object.values(WRECK_SUBTITLES),
        ...Object.values(ROLE_SUBTITLES)
    ];
}
