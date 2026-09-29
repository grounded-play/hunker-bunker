import { createFreshRunEntropy } from './runEntropy.js';
import { continueExpeditionProfile, deriveExpeditionSeed, createExpeditionProfile, normalizeExpeditionProfile } from './expeditionSystem.js';
import { LEGACY_ROUTE_LAYOUT_VERSION, ROUTE_LAYOUT_VERSION } from './mazeExpedition.js';

export const CAMPAIGN_WORLD_STORAGE_KEY = 'hb_campaign_world_v1';
export const CAMPAIGN_WORLD_VERSION = 1;

function isSeed(value) {
    return Number.isInteger(value) && value >= 0 && value <= 0xffffffff;
}

function clone(value) {
    return value == null ? null : JSON.parse(JSON.stringify(value));
}

function getStorage(storage) {
    if (storage) return storage;
    try { return globalThis.window?.localStorage ?? null; } catch { return null; }
}

// Re-export deriveExpeditionSeed for backward compatibility
export { deriveExpeditionSeed };

function validTransformationId(id) {
    return typeof id === 'string' && id.length > 0
        && !['__proto__', 'constructor', 'prototype'].includes(id);
}

function normalizeWorldTransformations(raw) {
    const ids = (values) => Array.isArray(values) ? [...new Set(values.filter(validTransformationId))] : [];
    const hivesTransformed = {};
    const hiveRecords = raw?.hivesTransformed && typeof raw.hivesTransformed === 'object'
        && !Array.isArray(raw.hivesTransformed) ? raw.hivesTransformed : {};
    for (const [id, details] of Object.entries(hiveRecords)) {
        if (validTransformationId(id) && details && typeof details === 'object' && !Array.isArray(details)) {
            hivesTransformed[id] = clone(details);
        }
    }
    return {
        bridgesConstructed: ids(raw?.bridgesConstructed),
        campsFortified: ids(raw?.campsFortified),
        hivesTransformed,
        shortcutsOpened: ids(raw?.shortcutsOpened)
    };
}

/**
 * The parts of a saved maze that are story rather than map: milestone bosses,
 * ring access and crossings, completed crossing missions and ship-goal
 * progress. Destroyed walls, doors, explored areas and the old map's authored
 * identity are dropped with the map. Pure.
 */
export function carryStoryToNewMap(mazeState) {
    if (!mazeState || typeof mazeState !== 'object' || Array.isArray(mazeState)) return null;
    const kept = clone(mazeState);
    delete kept.doors;
    kept.worldChanges = {
        destroyedWalls: [],
        destroyedExteriorWalls: [],
        discoveredChunks: [],
        discoveredRooms: [],
        discoveredCells: []
    };
    if (kept.authoredWorld && typeof kept.authoredWorld === 'object') {
        kept.authoredWorld = { ...kept.authoredWorld, seed: null, version: null };
    }
    return kept;
}

function normalize(raw) {
    if (!raw || raw.version !== CAMPAIGN_WORLD_VERSION || !isSeed(raw.seed)) return null;
    const expeditionIndex = Number.isSafeInteger(raw.expeditionIndex) && raw.expeditionIndex >= 0
        ? raw.expeditionIndex
        : 0;
    const expeditionSeed = deriveExpeditionSeed(raw.seed, expeditionIndex);
    const activeExpedition = normalizeExpeditionProfile(raw.activeExpedition, raw.seed, expeditionIndex);
    const worldTransformations = normalizeWorldTransformations(raw.worldTransformations);
    return {
        version: CAMPAIGN_WORLD_VERSION,
        seed: raw.seed,
        // The map the current run is played on. Saves from before per-run maps
        // keep the campaign's map until their next run starts.
        mapSeed: isSeed(raw.mapSeed) ? raw.mapSeed : raw.seed,
        // Saves from before layout generations were recorded were built
        // with the legacy generator, and must keep that geography.
        layoutVersion: Number.isSafeInteger(raw.layoutVersion) && raw.layoutVersion >= LEGACY_ROUTE_LAYOUT_VERSION
            ? raw.layoutVersion
            : LEGACY_ROUTE_LAYOUT_VERSION,
        expeditionIndex,
        expeditionSeed,
        activeExpedition,
        worldTransformations,
        mazeState: raw.mazeState && typeof raw.mazeState === 'object' && !Array.isArray(raw.mazeState)
            ? clone(raw.mazeState)
            : null
    };
}

/**
 * One identity and the existing maze persistence snapshot per solo campaign.
 * No progression flags are duplicated here: the runtime remains their owner.
 * Every read observes storage so a long-lived game instance follows imported
 * saves and campaign resets rather than resurrecting its previous campaign.
 */
export function createCampaignWorldStore({
    storage = null,
    storageKey = CAMPAIGN_WORLD_STORAGE_KEY,
    createSeed = createFreshRunEntropy
} = {}) {
    const store = getStorage(storage);
    let volatileState = null;
    let pendingWrite = false;
    let lastStoredValue = null;

    function read() {
        if (!store) return clone(volatileState);
        let serialized;
        try {
            serialized = store.getItem(storageKey);
        } catch {
            return clone(volatileState);
        }
        // If saving failed (e.g. quota), retain progress for this session. An
        // external replacement still wins, including import and key removal.
        if (pendingWrite && serialized === lastStoredValue) return clone(volatileState);
        pendingWrite = false;
        lastStoredValue = serialized;
        try {
            volatileState = serialized ? normalize(JSON.parse(serialized)) : null;
        } catch {
            volatileState = null;
        }
        return clone(volatileState);
    }

    function write(state) {
        volatileState = clone(state);
        if (!store) return clone(state);
        const serialized = JSON.stringify(state);
        try {
            store.setItem(storageKey, serialized);
            lastStoredValue = serialized;
            pendingWrite = false;
        } catch {
            pendingWrite = true;
        }
        return clone(state);
    }

    function getOrCreate({ seed } = {}) {
        const current = read();
        if (current) return current;
        const candidate = isSeed(seed) ? seed : createSeed();
        const campaignSeed = isSeed(candidate) ? candidate : createFreshRunEntropy();
        const activeExpedition = createExpeditionProfile(campaignSeed, 0);
        return write({
            version: CAMPAIGN_WORLD_VERSION,
            seed: campaignSeed,
            mapSeed: campaignSeed,
            layoutVersion: ROUTE_LAYOUT_VERSION,
            expeditionIndex: 0,
            expeditionSeed: activeExpedition.expeditionSeed,
            activeExpedition,
            worldTransformations: {
                bridgesConstructed: [],
                campsFortified: [],
                hivesTransformed: {},
                shortcutsOpened: []
            },
            mazeState: null
        });
    }

    function saveMazeState(seed, mazeState) {
        const current = read();
        // A delayed event from an old campaign cannot recreate or overwrite
        // the current world after NEW CAMPAIGN or a save-code import.
        if (!current || current.seed !== seed) return false;
        if (mazeState !== null && (typeof mazeState !== 'object' || Array.isArray(mazeState))) return false;
        try {
            write({ ...current, mazeState: clone(mazeState) });
            return true;
        } catch {
            return false;
        }
    }

    return {
        getState: read,
        getOrCreate,
        ensure: getOrCreate,
        // A run started from the menu plays a new map (owner's rule,
        // 2026-09-24: MAIN MENU resets the run; TRY AGAIN keeps the map).
        // The story carries over — bank, goals, unlocks, milestone bosses,
        // ring access and the world transformations (bridges, camps, hives,
        // shortcuts), all keyed by what they are, not where. What belongs to
        // the old map (destroyed walls, doors, explored areas, the authored
        // world's identity) does not.
        beginNewRun({ mapSeed = null } = {}) {
            const current = getOrCreate();
            const next = isSeed(mapSeed) ? mapSeed : createSeed(current.mapSeed);
            return write({
                ...current,
                mapSeed: isSeed(next) ? next : createFreshRunEntropy(current.mapSeed),
                layoutVersion: ROUTE_LAYOUT_VERSION,
                mazeState: carryStoryToNewMap(current.mazeState)
            });
        },
        beginExpedition() {
            const current = getOrCreate();
            const expeditionIndex = current.expeditionIndex + 1;
            const activeExpedition = continueExpeditionProfile(current.seed, expeditionIndex, current.activeExpedition);
            return write({
                ...current,
                expeditionIndex,
                expeditionSeed: activeExpedition.expeditionSeed,
                activeExpedition
            });
        },
        recordWorldTransformation(type, id, details = {}) {
            const current = read();
            if (!current || !validTransformationId(id)) return null;
            const transformations = normalizeWorldTransformations(current.worldTransformations);
            const listKey = type === 'bridge' ? 'bridgesConstructed'
                : type === 'camp_fortified' ? 'campsFortified'
                    : type === 'shortcut' ? 'shortcutsOpened' : null;
            if (listKey) {
                if (transformations[listKey].includes(id)) return clone(transformations);
                transformations[listKey].push(id);
            } else if (type === 'hive_transformed') {
                let savedDetails;
                try { savedDetails = clone(details); } catch { return null; }
                if (!savedDetails || typeof savedDetails !== 'object' || Array.isArray(savedDetails)) return null;
                delete savedDetails.timestamp;
                const previousDetails = { ...transformations.hivesTransformed[id] };
                delete previousDetails.timestamp;
                if (JSON.stringify(previousDetails) === JSON.stringify(savedDetails)
                    && Object.hasOwn(transformations.hivesTransformed, id)) return clone(transformations);
                transformations.hivesTransformed[id] = { ...savedDetails, timestamp: Date.now() };
            } else {
                return null;
            }
            write({ ...current, worldTransformations: transformations });
            return clone(transformations);
        },
        getWorldTransformations() {
            const current = read();
            return clone(current?.worldTransformations ?? {
                bridgesConstructed: [],
                campsFortified: [],
                hivesTransformed: {},
                shortcutsOpened: []
            });
        },
        getActiveExpedition() {
            const current = read();
            return clone(current?.activeExpedition ?? null);
        },
        saveMazeState,
        saveProgress: saveMazeState,
        getProgress(seed) {
            const current = read();
            return current?.seed === seed ? clone(current.mazeState) : null;
        },
        reset() {
            read();
            volatileState = null;
            pendingWrite = false;
            try {
                store?.removeItem(storageKey);
                lastStoredValue = null;
            } catch {
                pendingWrite = true;
            }
        }
    };
}

export const campaignWorldStore = createCampaignWorldStore();
