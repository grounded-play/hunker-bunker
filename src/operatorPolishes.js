const STORAGE_UNLOCKED = 'hb_operator_polishes_v1';
const STORAGE_SELECTED = 'hb_operator_polish_selected_v1';

export const OPERATOR_POLISHES = Object.freeze([
    { id: 0,  name: 'STANDARD ISSUE', color: '#ffffff' },
    { id: 1,  name: 'ARCTIC PEARL', color: '#bfe7ff' },
    { id: 2,  name: 'SIGNAL CYAN', color: '#58efff' },
    { id: 3,  name: 'FIELD MINT', color: '#8dffbe' },
    { id: 4,  name: 'TOXIC LIME', color: '#b8ff62' },
    { id: 5,  name: 'REACTOR GOLD', color: '#ffd15a' },
    { id: 6,  name: 'EMBER BRASS', color: '#ff9a45' },
    { id: 7,  name: 'RESCUE RED', color: '#ff6262' },
    { id: 8,  name: 'RUST ROSE', color: '#d77b83' },
    { id: 9,  name: 'HIVE MAGENTA', color: '#ff62d3' },
    { id: 10, name: 'VOID VIOLET', color: '#b886ff' },
    { id: 11, name: 'ION BLUE', color: '#718cff' },
    { id: 12, name: 'COBALT STEEL', color: '#789bc4' },
    { id: 13, name: 'ASH CHROME', color: '#a9b1b8' },
    { id: 14, name: 'DARK ALLOY', color: '#69737d' },
    { id: 15, name: 'BLACK ICE', color: '#45556b' }
]);

function storageOrDefault(storage) {
    return storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
}

export function getUnlockedPolishIds(storage = null) {
    try {
        const parsed = JSON.parse(storageOrDefault(storage)?.getItem(STORAGE_UNLOCKED) ?? '[]');
        return new Set([0, ...(Array.isArray(parsed) ? parsed : [])].filter((id) => Number.isInteger(id) && id >= 0 && id < 16));
    } catch {
        return new Set([0]);
    }
}

function saveUnlocked(ids, storage = null) {
    storageOrDefault(storage)?.setItem(STORAGE_UNLOCKED, JSON.stringify([...ids].sort((a, b) => a - b)));
}

export function unlockPolish(id, storage = null) {
    if (!Number.isInteger(id) || id < 0 || id >= OPERATOR_POLISHES.length) return false;
    const ids = getUnlockedPolishIds(storage);
    const changed = !ids.has(id);
    ids.add(id);
    saveUnlocked(ids, storage);
    return changed;
}

export function unlockAllPolishes(storage = null) {
    const ids = new Set(OPERATOR_POLISHES.map((polish) => polish.id));
    saveUnlocked(ids, storage);
    return ids;
}

export function unlockMilestonePolish(milestone, storage = null) {
    let hash = 2166136261;
    for (const char of String(milestone ?? '')) {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    const id = 1 + ((hash >>> 0) % (OPERATOR_POLISHES.length - 1));
    return { id, unlocked: unlockPolish(id, storage) };
}

export function getSelectedPolish(storage = null) {
    const store = storageOrDefault(storage);
    const id = Number(store?.getItem(STORAGE_SELECTED) ?? 0);
    const unlocked = getUnlockedPolishIds(store);
    return OPERATOR_POLISHES[unlocked.has(id) ? id : 0];
}

export function selectPolish(id, storage = null) {
    const store = storageOrDefault(storage);
    if (!getUnlockedPolishIds(store).has(id)) return null;
    const polish = OPERATOR_POLISHES[id] ?? null;
    if (!polish) return null;
    store?.setItem(STORAGE_SELECTED, String(id));
    return polish;
}
