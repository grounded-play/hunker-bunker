export const ACHIEVEMENT_STORAGE_KEY = 'hb_achievements_v1';
export const ACHIEVEMENT_SCHEMA_VERSION = 3;
export const ARCHIVIST_TARGET = 12;

const CLASS_IDS = Object.freeze(['SCOUT', 'TANK', 'ENGINEER']);
const ENDING_FAMILIES = Object.freeze([
    ['full_brood', 'FULL BROOD'],
    ['clean_escape', 'CLEAN ESCAPE'],
    ['mixed_crew', 'MIXED CREW'],
    ['carriers_bargain', 'CARRIERS BARGAIN'],
    ['scorched_sky', 'SCORCHED SKY'],
    ['mothership_infection', 'MOTHERSHIP INFECTION'],
    ['alien_exodus', 'ALIEN EXODUS'],
    ['outed_escape', 'OUTED ESCAPE'],
    ['failed_carrier', 'FAILED CARRIER'],
    ['empty_husk', 'EMPTY HUSK']
]);

const freezeDeep = (value) => {
    if (!value || typeof value !== 'object') return value;
    Object.freeze(value);
    for (const child of Object.values(value)) freezeDeep(child);
    return value;
};

const uniqueStrings = (values = []) => [...new Set(
    (Array.isArray(values) ? values : [])
        .map((value) => String(value ?? '').trim())
        .filter(Boolean)
)];

const normalizeClass = (value = '') => {
    const key = String(value ?? '').trim().toUpperCase();
    return CLASS_IDS.includes(key) ? key : null;
};

const normalizeEnding = (value = '') => String(value ?? '').trim().toLowerCase();

function makeEndingDef([ending, title]) {
    return {
        key: `ending_${ending}`,
        title,
        blurb: `Reach the ${title} ending family.`,
        icon: `ending_${ending}`,
        secret: true,
        check: (_state, event) => {
            if (!['run-end', 'ending-reached'].includes(event.name)) return false;
            return normalizeEnding(event.detail?.ending) === ending;
        }
    };
}

export const ACHIEVEMENT_DEFS = freezeDeep([
    {
        key: 'quick_study',
        title: 'QUICK STUDY',
        blurb: 'Lose a run within five seconds of deployment.',
        icon: 'quick_study',
        check: (_state, event) => event.name === 'run-end'
            && event.detail?.outcome === 'death'
            && Number(event.detail?.runMs ?? Infinity) <= 5000
    },
    {
        key: 'hunkered',
        title: 'HUNKERED',
        blurb: 'Survive a single run past twenty minutes.',
        icon: 'hunkered',
        check: (_state, event) => event.name === 'run-end'
            && Number(event.detail?.runMs ?? 0) >= 20 * 60 * 1000
    },
    {
        key: 'scouts_honor',
        title: "SCOUT'S HONOR",
        blurb: 'Reach any ending as the Scout.',
        icon: 'victory_scout',
        check: (_state, event) => ['run-end', 'ending-reached'].includes(event.name)
            && event.detail?.outcome === 'victory'
            && normalizeClass(event.detail?.classType) === 'SCOUT'
    },
    {
        key: 'tank_commander',
        title: 'TANK COMMANDER',
        blurb: 'Reach any ending as the Tank.',
        icon: 'victory_tank',
        check: (_state, event) => ['run-end', 'ending-reached'].includes(event.name)
            && event.detail?.outcome === 'victory'
            && normalizeClass(event.detail?.classType) === 'TANK'
    },
    {
        key: 'chief_engineer',
        title: 'CHIEF ENGINEER',
        blurb: 'Reach any ending as the Engineer.',
        icon: 'victory_engineer',
        check: (_state, event) => ['run-end', 'ending-reached'].includes(event.name)
            && event.detail?.outcome === 'victory'
            && normalizeClass(event.detail?.classType) === 'ENGINEER'
    },
    ...ENDING_FAMILIES.map(makeEndingDef),
    {
        key: 'cartographer',
        title: 'CARTOGRAPHER',
        blurb: 'Discover all three survivor camps in one run.',
        icon: 'cartographer',
        progress: (state) => ({
            current: Math.min(3, state.currentRun.discoveredCampIds.length),
            target: 3
        }),
        check: (state) => state.currentRun.discoveredCampIds.length >= 3
    },
    {
        key: 'archivist',
        title: 'ARCHIVIST',
        blurb: `Collect ${ARCHIVIST_TARGET} lore drops.`,
        icon: 'archivist',
        progress: (state) => ({
            current: Math.min(ARCHIVIST_TARGET, state.stats.loreDropIds.length || state.stats.loreDrops || 0),
            target: ARCHIVIST_TARGET
        }),
        check: (state) => (state.stats.loreDropIds.length || state.stats.loreDrops || 0) >= ARCHIVIST_TARGET
    },
    {
        key: 'kin',
        title: 'KIN',
        blurb: 'Reach maximum bond with any hive.',
        icon: 'kin',
        progress: (state) => ({
            current: Math.min(5, state.stats.maxHiveBond),
            target: 5
        }),
        check: (state) => state.stats.maxHiveBond >= 5
    },
    {
        key: 'ghost',
        title: 'GHOST',
        blurb: 'Reach the reveal with zero suspicion gained.',
        icon: 'ghost',
        secret: true,
        check: (state, event) => event.name === 'reveal-reached'
            && (state.currentRun.suspicionGained ?? 0) <= 0
    },
    {
        key: 'gentle_drill',
        title: 'GENTLE DRILL',
        blurb: 'Reach the reveal without harming a hive site.',
        icon: 'gentle_drill',
        secret: true,
        check: (state, event) => event.name === 'reveal-reached'
            && !state.currentRun.hiveHarmed
            && !event.detail?.hiveHarmed
    },
    {
        key: 'chen_thirteenth',
        title: "CHEN'S THIRTEENTH",
        blurb: 'Reach the cave reveal before any operator death is recorded.',
        icon: 'chen_thirteenth',
        secret: true,
        check: (state, event) => event.name === 'reveal-reached'
            && Number(event.detail?.totalDeathsBeforeReveal ?? state.stats.totalDeaths ?? 0) <= 0
    },
    {
        key: 'reyes_courier',
        title: 'REYES COURIER',
        blurb: 'Carry Pvt. Reyes\' letter to Commander Briggs.',
        icon: 'reyes_courier',
        secret: true,
        check: (_state, event) => event.name === 'reyes-letter-delivered'
    },
    {
        key: 'hardened',
        title: 'HARDENED',
        blurb: 'Die five times and keep coming back.',
        icon: 'hardened',
        progress: (state) => ({
            current: Math.min(5, state.stats.totalDeaths),
            target: 5
        }),
        check: (state) => state.stats.totalDeaths >= 5
    },
    {
        key: 'slay_the_queen',
        title: 'SLAY THE QUEEN',
        blurb: 'Defeat the Queen in single combat.',
        icon: 'slay_the_queen',
        secret: true,
        comingSoon: true,
        check: (state) => Boolean(state.stats.queenDefeated)
    }
]);

export function createDefaultRunState() {
    return {
        startedAt: 0,
        classType: null,
        suspicionGained: 0,
        discoveredCampIds: [],
        loreDropIds: [],
        maxHiveBond: 0,
        runCards: [],
        hiveHarmed: false,
        deathsAtStart: 0
    };
}

export function createDefaultAchievementState() {
    return {
        schemaVersion: ACHIEVEMENT_SCHEMA_VERSION,
        stats: {
            totalDeaths: 0,
            totalKills: 0,
            maxKillsOneRun: 0,
            deepTierReachedAlive: false,
            runCount: 0,
            victories: 0,
            maxRunMs: 0,
            loreDrops: 0,
            loreDropIds: [],
            maxHiveBond: 0,
            maxCampsDiscoveredOneRun: 0,
            endings: {},
            classesCompleted: {},
            shellsCollected: 0,
            deathlessReveal: false,
            hiveHarmFreeReveal: false,
            reyesLetterDelivered: false,
            queenDefeated: false
        },
        currentRun: createDefaultRunState(),
        unlocked: {}
    };
}

export function migrateAchievements(raw = null, now = Date.now()) {
    const base = createDefaultAchievementState();
    if (!raw || typeof raw !== 'object') return base;

    if (Number(raw.schemaVersion) >= 2 && raw.stats && raw.currentRun && raw.unlocked) {
        return {
            ...base,
            ...raw,
            schemaVersion: ACHIEVEMENT_SCHEMA_VERSION,
            stats: {
                ...base.stats,
                ...raw.stats,
                loreDropIds: uniqueStrings(raw.stats.loreDropIds),
                endings: { ...base.stats.endings, ...(raw.stats.endings ?? {}) },
                classesCompleted: { ...base.stats.classesCompleted, ...(raw.stats.classesCompleted ?? {}) }
            },
            currentRun: {
                ...base.currentRun,
                ...raw.currentRun,
                discoveredCampIds: uniqueStrings(raw.currentRun.discoveredCampIds),
                loreDropIds: uniqueStrings(raw.currentRun.loreDropIds),
                runCards: Array.isArray(raw.currentRun.runCards) ? raw.currentRun.runCards : [],
                hiveHarmed: Boolean(raw.currentRun.hiveHarmed),
                deathsAtStart: Math.max(0, Number(raw.currentRun.deathsAtStart) || 0)
            },
            unlocked: { ...(raw.unlocked ?? {}) }
        };
    }

    const totalDeaths = Math.max(0, Number(raw.totalDeaths) || 0);
    const migrated = {
        ...base,
        stats: {
            ...base.stats,
            totalDeaths,
            totalKills: Math.max(0, Number(raw.totalKills) || 0),
            maxKillsOneRun: Math.max(0, Number(raw.maxKillsOneRun) || 0),
            deepTierReachedAlive: Boolean(raw.deepTierReachedAlive)
        }
    };

    if (raw.unlockedHardened) {
        migrated.unlocked.hardened = { unlockedAt: now, migrated: true };
    }
    return migrated;
}

export function getSecretGateState(rawState = null) {
    const state = migrateAchievements(rawState);
    return {
        noHiveHarmThisRun: !state.currentRun.hiveHarmed,
        deathlessReveal: Boolean(state.stats.deathlessReveal),
        hiveHarmFreeReveal: Boolean(state.stats.hiveHarmFreeReveal),
        reyesLetterDelivered: Boolean(state.stats.reyesLetterDelivered),
        totalDeaths: state.stats.totalDeaths,
        deathsThisRun: Math.max(0, state.stats.totalDeaths - (state.currentRun.deathsAtStart ?? state.stats.totalDeaths))
    };
}

function getStorage(storage) {
    return storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
}

export function loadAchievements(storage = null) {
    const store = getStorage(storage);
    try {
        return migrateAchievements(JSON.parse(store?.getItem(ACHIEVEMENT_STORAGE_KEY) ?? 'null'));
    } catch {
        return createDefaultAchievementState();
    }
}

export function saveAchievements(state, storage = null) {
    const store = getStorage(storage);
    try {
        store?.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify(state));
    } catch {
        // best effort
    }
}

function markMapValue(map, key) {
    if (!key) return;
    map[key] = true;
}

function updateStatsForEvent(state, name, detail = {}) {
    switch (name) {
        case 'run-start': {
            state.currentRun = {
                ...createDefaultRunState(),
                startedAt: Number(detail.startedAt) || Date.now(),
                classType: normalizeClass(detail.classType),
                deathsAtStart: state.stats.totalDeaths
            };
            break;
        }
        case 'act2-milestone': {
            if (detail.key === 'campDiscovered' && detail.campId) {
                state.currentRun.discoveredCampIds = uniqueStrings([
                    ...state.currentRun.discoveredCampIds,
                    detail.campId
                ]);
                state.stats.maxCampsDiscoveredOneRun = Math.max(
                    state.stats.maxCampsDiscoveredOneRun,
                    state.currentRun.discoveredCampIds.length
                );
            }
            if (detail.key === 'queenKilled' && detail.combat === true) {
                state.stats.queenDefeated = true;
            }
            break;
        }
        case 'player-suspicion-changed': {
            state.currentRun.suspicionGained += Math.max(1, Number(detail.gain) || 1);
            break;
        }
        case 'hive-choice-resolved': {
            const bond = Math.max(0, Number(detail.bond) || 0);
            state.currentRun.maxHiveBond = Math.max(state.currentRun.maxHiveBond, bond);
            state.stats.maxHiveBond = Math.max(state.stats.maxHiveBond, bond);
            if (['hive-harvest', 'hive-sacrifice'].includes(detail.action)) {
                state.currentRun.hiveHarmed = true;
            }
            break;
        }
        case 'hive-mined':
        case 'hive-harmed': {
            state.currentRun.hiveHarmed = true;
            break;
        }
        case 'reyes-letter-delivered': {
            state.stats.reyesLetterDelivered = true;
            break;
        }
        case 'reveal-reached': {
            if (!state.currentRun.hiveHarmed && !detail.hiveHarmed) {
                state.stats.hiveHarmFreeReveal = true;
            }
            if (Number(detail.totalDeathsBeforeReveal ?? state.stats.totalDeaths ?? 0) <= 0) {
                state.stats.deathlessReveal = true;
            }
            break;
        }
        case 'run-cards-drawn': {
            state.currentRun.runCards = Array.isArray(detail.cards) ? detail.cards : [];
            break;
        }
        case 'shell-collected': {
            state.stats.shellsCollected += Math.max(0, Number(detail.amount ?? detail.gained) || 1);
            break;
        }
        case 'lore-drop-collected': {
            const id = detail.id ?? detail.key ?? detail.loreId;
            if (id) {
                state.currentRun.loreDropIds = uniqueStrings([...state.currentRun.loreDropIds, id]);
                state.stats.loreDropIds = uniqueStrings([...state.stats.loreDropIds, id]);
                state.stats.loreDrops = Math.max(state.stats.loreDrops, state.stats.loreDropIds.length);
            } else {
                state.stats.loreDrops += 1;
            }
            break;
        }
        case 'ending-reached': {
            const ending = normalizeEnding(detail.ending);
            const classType = normalizeClass(detail.classType);
            if (ending) markMapValue(state.stats.endings, ending);
            if (classType) markMapValue(state.stats.classesCompleted, classType);
            break;
        }
        case 'run-end': {
            state.stats.runCount += 1;
            const kills = Math.max(0, Number(detail.snailsKilled ?? detail.kills) || 0);
            state.stats.totalKills += kills;
            state.stats.maxKillsOneRun = Math.max(state.stats.maxKillsOneRun, kills);
            state.stats.maxRunMs = Math.max(state.stats.maxRunMs, Math.max(0, Number(detail.runMs) || 0));
            if ((Number(detail.depthTier) || 0) >= 2) state.stats.deepTierReachedAlive = true;
            if (detail.outcome === 'death') state.stats.totalDeaths += 1;
            if (detail.outcome === 'victory') state.stats.victories += 1;
            const ending = normalizeEnding(detail.ending);
            const classType = normalizeClass(detail.classType ?? state.currentRun.classType);
            if (ending) markMapValue(state.stats.endings, ending);
            if (classType) markMapValue(state.stats.classesCompleted, classType);
            break;
        }
        default:
            break;
    }
}

function definitionUnlocked(state, def) {
    if (def.comingSoon || state.unlocked[def.key]) return false;
    try {
        return Boolean(def.check?.(state, state._lastEvent));
    } catch {
        return false;
    }
}

export function applyAchievementEvent(rawState, name, detail = {}, now = Date.now()) {
    const state = migrateAchievements(rawState, now);
    const event = { name, detail, at: now };
    state._lastEvent = event;
    updateStatsForEvent(state, name, detail);

    const newUnlocks = [];
    for (const def of ACHIEVEMENT_DEFS) {
        if (!definitionUnlocked(state, def)) continue;
        state.unlocked[def.key] = { unlockedAt: now };
        newUnlocks.push(def);
        if (typeof window !== 'undefined' && window.hbLog) {
            window.hbLog('ACH', 'info', `🏆 ACHIEVEMENT UNLOCKED: ${def.title} (${def.key})`);
        }
    }

    delete state._lastEvent;
    if (name === 'run-end') state.currentRun = createDefaultRunState();
    return { state, newUnlocks };
}

export function recordEvent(name, detail = {}, { storage = null, now = Date.now() } = {}) {
    if (typeof window !== 'undefined' && window.hbLog) {
        window.hbLog('ACH', 'debug', `Achievement event recorded: ${name}`, detail);
    }
    const store = getStorage(storage);
    const current = loadAchievements(store);
    const result = applyAchievementEvent(current, name, detail, now);
    saveAchievements(result.state, store);
    return result;
}

export function recordRunEnd(stats = {}, options = {}) {
    return recordEvent('run-end', stats, options);
}

export function getAchievementProgress(def, state) {
    if (typeof def?.progress !== 'function') return null;
    try {
        const progress = def.progress(migrateAchievements(state));
        if (!progress || !Number.isFinite(progress.target)) return null;
        return {
            current: Math.max(0, Number(progress.current) || 0),
            target: Math.max(1, Number(progress.target) || 1)
        };
    } catch {
        return null;
    }
}

export function hasAnyUnlock(state) {
    return Object.keys(migrateAchievements(state).unlocked).length > 0;
}

export class AchievementEngine {
    constructor({ storage = null, now = () => Date.now() } = {}) {
        this.storage = getStorage(storage);
        this.now = now;
        this.state = loadAchievements(this.storage);
        saveAchievements(this.state, this.storage);
    }

    refresh() {
        this.state = loadAchievements(this.storage);
        return this.state;
    }

    getState() {
        return this.refresh();
    }

    recordEvent(name, detail = {}) {
        const result = recordEvent(name, detail, { storage: this.storage, now: this.now() });
        this.state = result.state;
        return result;
    }

    recordRunEnd(stats = {}) {
        return this.recordEvent('run-end', stats);
    }
}
