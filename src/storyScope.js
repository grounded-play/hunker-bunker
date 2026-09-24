// Which story a run plays in (owner's rules, 2026-09-24,
// docs/planning/qa-2026-09-24-deck-pc-coop-game-plan.md):
//
// - Solo: the campaign story — kept with CONTINUE, reset by NEW CAMPAIGN.
// - Co-op and PvP: every run starts the story fresh and never writes to the
//   solo campaign.
//
// The story managers (arc, act 2, side stories, wanderers/companions) each
// persist their own state through `this.storage` and read it with `load()`.
// Entering a session story points every registered manager at throwaway
// in-memory storage and loads it fresh; leaving points them back at the real
// save and reloads it. Before this, a co-op run read the solo story (the solo
// Meridian recruit followed the host into co-op) and wrote back into it.

const managers = new Set();
let sessionActive = false;

/** In-memory storage with the Web Storage methods the managers use. */
export function createMemoryStorage() {
    const items = new Map();
    return {
        getItem: (key) => (items.has(key) ? items.get(key) : null),
        setItem: (key, value) => { items.set(key, String(value)); },
        removeItem: (key) => { items.delete(key); },
        clear: () => { items.clear(); },
        key: (index) => [...items.keys()][index] ?? null,
        get length() { return items.size; }
    };
}

function reload(manager) {
    manager.state = manager.load();
    manager.notifyChange?.();
}

/** A story manager that follows the current scope. */
export function registerStoryManager(manager) {
    if (!manager || typeof manager.load !== 'function' || !('storage' in manager)) return false;
    managers.add(manager);
    if (sessionActive) enterManager(manager);
    return true;
}

export function unregisterStoryManager(manager) {
    if (!managers.has(manager)) return false;
    leaveManager(manager);
    managers.delete(manager);
    return true;
}

function enterManager(manager) {
    if (!Object.prototype.hasOwnProperty.call(manager, '__campaignStorage')) {
        manager.__campaignStorage = manager.storage;
    }
    manager.storage = createMemoryStorage();
    reload(manager);
}

function leaveManager(manager) {
    if (!Object.prototype.hasOwnProperty.call(manager, '__campaignStorage')) return;
    manager.storage = manager.__campaignStorage;
    delete manager.__campaignStorage;
    reload(manager);
}

/** Co-op/PvP run start: every story manager starts fresh, off the campaign save. */
export function enterSessionStory() {
    sessionActive = true;
    for (const manager of managers) enterManager(manager);
    return managers.size;
}

/** Leaving co-op/PvP: every story manager returns to the campaign save. */
export function leaveSessionStory() {
    if (!sessionActive) return 0;
    sessionActive = false;
    for (const manager of managers) leaveManager(manager);
    return managers.size;
}

export function isSessionStoryActive() {
    return sessionActive;
}
