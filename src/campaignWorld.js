import { createFreshRunEntropy } from './runEntropy.js';
import { deriveExpeditionSeed, createExpeditionProfile } from './expeditionSystem.js';
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

function normalize(raw) {
    if (!raw || raw.version !== CAMPAIGN_WORLD_VERSION || !isSeed(raw.seed)) return null;
    const expeditionIndex = Number.isSafeInteger(raw.expeditionIndex) && raw.expeditionIndex >= 0
        ? raw.expeditionIndex
        : 0;
    const expeditionSeed = deriveExpeditionSeed(raw.seed, expeditionIndex);
    const activeExpedition = raw.activeExpedition && typeof raw.activeExpedition === 'object'
        ? clone(raw.activeExpedition)
        : createExpeditionProfile(raw.seed, expeditionIndex);
    const worldTransformations = raw.worldTransformations && typeof raw.worldTransformations === 'object'
        ? {
            bridgesConstructed: Array.isArray(raw.worldTransformations.bridgesConstructed) ? [...raw.worldTransformations.bridgesConstructed] : [],
            campsFortified: Array.isArray(raw.worldTransformations.campsFortified) ? [...raw.worldTransformations.campsFortified] : [],
            hivesTransformed: (raw.worldTransformations.hivesTransformed && typeof raw.worldTransformations.hivesTransformed === 'object') ? clone(raw.worldTransformations.hivesTransformed) : {},
            shortcutsOpened: Array.isArray(raw.worldTransformations.shortcutsOpened) ? [...raw.worldTransformations.shortcutsOpened] : []
        }
        : {
            bridgesConstructed: [],
            campsFortified: [],
            hivesTransformed: {},
            shortcutsOpened: []
        };
    return {
        version: CAMPAIGN_WORLD_VERSION,
        seed: raw.seed,
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
        beginExpedition() {
            const current = getOrCreate();
            const expeditionIndex = current.expeditionIndex + 1;
            const activeExpedition = createExpeditionProfile(current.seed, expeditionIndex);
            return write({
                ...current,
                expeditionIndex,
                expeditionSeed: activeExpedition.expeditionSeed,
                activeExpedition
            });
        },
        recordWorldTransformation(type, id, details = {}) {
            const current = getOrCreate();
            const transformations = clone(current.worldTransformations) || {
                bridgesConstructed: [],
                campsFortified: [],
                hivesTransformed: {},
                shortcutsOpened: []
            };
            if (type === 'bridge' && !transformations.bridgesConstructed.includes(id)) {
                transformations.bridgesConstructed.push(id);
            } else if (type === 'camp_fortified' && !transformations.campsFortified.includes(id)) {
                transformations.campsFortified.push(id);
            } else if (type === 'hive_transformed') {
                transformations.hivesTransformed[id] = { ...details, timestamp: Date.now() };
            } else if (type === 'shortcut' && !transformations.shortcutsOpened.includes(id)) {
                transformations.shortcutsOpened.push(id);
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
