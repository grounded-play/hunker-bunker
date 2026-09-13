import { localizeCatalog } from '../i18nCatalog.js';

// Each camp closes with a SIGNATURE quest, mirroring the alien hives -- every
// hive already had one (host_mercy, false_clearance, guard_oath) while the camps
// carried only generic chores, which is why the human side of the story read
// thinner than the alien side. Named for what each leader actually wants in
// their authored dialogue, and worth 2 bond rather than 1: they are the
// relationship, not an errand.
//
// APPENDED, never inserted. This catalog is keyed by array index
// (narrative.campQuests.camp_meridian.0.label), so adding an entry anywhere but
// the end silently reassigns every existing translation to the wrong string.
export const CAMP_QUESTS = localizeCatalog('narrative.campQuests', Object.freeze({
    camp_meridian: [
        { id: 'reactor_venting', label: 'REACTOR VENTING', bond: 1, desc: 'DEFUSE PRESSURE BUILD-UP IN REACTOR VENTING GRID' },
        { id: 'hive_archive_ch1', label: 'HIVE ARCHIVE CH. 1', bond: 1, desc: 'RECOVER RGB ARCHIVE DATA FROM NEARBY ALIEN HIVE TERMINAL', chapterId: 'parking_lot' },
        { id: 'lost_probe', label: 'THE LOST PROBE', bond: 1, desc: 'RECOVER LOST Horizon Corp METRIC PROBE FROM FROST BIOME' },
        { id: 'grid_covenant', label: 'THE GRID COVENANT', bond: 2, signature: true, desc: 'SIGN KAELEN\'S LEDGER AND PUT MERIDIAN\'S POWER UNDER YOUR NAME' }
    ],
    camp_tallow: [
        { id: 'spore_cleansing', label: 'SPORE CLEANSING', bond: 1, desc: 'PURGE RED INVASIVE MOLD FROM HYDRO-BED CHANNELS' },
        { id: 'hive_archive_ch2', label: 'HIVE ARCHIVE CH. 2', bond: 1, desc: 'EXTRACT ARCHIVE DATA FROM BIOMECHANICAL STASIS NODE', chapterId: 'warehouse' },
        { id: 'lost_cultist', label: 'THE LOST CULTIST', bond: 1, desc: 'RECOVER AND ESCORT LOST CULTIST FROM VENTILATION TUNNELS' },
        { id: 'warm_pipes', label: 'THE WARM PIPES', bond: 2, signature: true, desc: 'KEEP MARTHA\'S PROMISE: RETURN TO TALLOW BEFORE THE HEART SINGS' }
    ],
    camp_vesper: [
        { id: 'armory_breach', label: 'ARMORY BREACH', bond: 1, desc: 'CLEAR CYBER-SNAILS INFESTING WEAPONS CABINET' },
        { id: 'hive_archive_ch3', label: 'HIVE ARCHIVE CH. 3', bond: 1, desc: 'DECRYPT INCIDENT LOGS FROM ANCIENT BUNKER ARCHIVE CORE', chapterId: 'incident_review' },
        { id: 'bunker_holdout', label: 'BUNKER HOLDOUT', bond: 1, desc: 'DEFEND THE BARRICADE GATE FROM INCOMING ATTACK PATROLS' },
        { id: 'iron_ledger', label: 'THE IRON LEDGER', bond: 2, signature: true, desc: 'EARN A LINE IN BRIGGS\' LEDGER OF THE DEAD WITHOUT BEING IN IT' }
    ]
}), { skip: ['id', 'chapterId'] });

