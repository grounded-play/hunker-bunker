import { createFreshRunEntropy, mixRunEntropy } from './runEntropy.js';

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

// Terrain uses the campaign seed. Encounters can use a different reproducible
// stream each deployment without moving camps, objectives, or opened routes.
export function deriveExpeditionSeed(seed, expeditionIndex = 0) {
    return mixRunEntropy(seed, 0x45585044, expeditionIndex + 1);
}

function normalize(raw) {
    if (!raw || raw.version !== CAMPAIGN_WORLD_VERSION || !isSeed(raw.seed)) return null;
    const expeditionIndex = Number.isSafeInteger(raw.expeditionIndex) && raw.expeditionIndex >= 0
        ? raw.expeditionIndex
        : 0;
    return {
        version: CAMPAIGN_WORLD_VERSION,
        seed: raw.seed,
        expeditionIndex,
        expeditionSeed: deriveExpeditionSeed(raw.seed, expeditionIndex),
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
        return write({
            version: CAMPAIGN_WORLD_VERSION,
            seed: campaignSeed,
            expeditionIndex: 0,
            expeditionSeed: deriveExpeditionSeed(campaignSeed, 0),
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
            return write({
                ...current,
                expeditionIndex,
                expeditionSeed: deriveExpeditionSeed(current.seed, expeditionIndex)
            });
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
