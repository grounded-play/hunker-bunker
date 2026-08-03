const STORAGE_UNLOCKED = 'hb_operator_polishes_v1';
const STORAGE_SELECTED = 'hb_operator_polish_selected_v1';

export const OPERATOR_POLISHES = Object.freeze([
    { id: 0,  name: 'STANDARD ISSUE', color: '#ffffff', hint: 'Issued to every operator.' },
    { id: 1,  name: 'ARCTIC PEARL', color: '#bfe7ff', hint: 'Reach the cave before death learns your name.' },
    { id: 2,  name: 'SIGNAL CYAN', color: '#58efff', hint: 'Grow the signal dish at the foundry.' },
    { id: 3,  name: 'FIELD MINT', color: '#8dffbe', hint: 'Help a survivor camp finish its work.' },
    { id: 4,  name: 'TOXIC LIME', color: '#b8ff62', hint: 'Turn a survivor camp to the brood.' },
    { id: 5,  name: 'REACTOR GOLD', color: '#ffd15a', hint: 'Reach an ending as the Engineer.' },
    { id: 6,  name: 'EMBER BRASS', color: '#ff9a45', hint: 'Sever the Mothership uplink.' },
    { id: 7,  name: 'RESCUE RED', color: '#ff6262', hint: 'Deliver Reyes’ letter to Commander Briggs.' },
    { id: 8,  name: 'RUST ROSE', color: '#d77b83', hint: 'Reach the reveal without harming a hive.' },
    { id: 9,  name: 'HIVE MAGENTA', color: '#ff62d3', hint: 'Reach maximum bond with a hive.' },
    { id: 10, name: 'VOID VIOLET', color: '#b886ff', hint: 'Reject the Queen after carrying her voice.' },
    { id: 11, name: 'ION BLUE', color: '#718cff', hint: 'Reach an ending as the Scout.' },
    { id: 12, name: 'COBALT STEEL', color: '#789bc4', hint: 'Reach an ending as the Tank.' },
    { id: 13, name: 'ASH CHROME', color: '#a9b1b8', hint: 'Defeat the Queen in single combat.' },
    { id: 14, name: 'DARK ALLOY', color: '#69737d', hint: 'Survive one run for twenty minutes.' },
    { id: 15, name: 'BLACK ICE', color: '#45556b', hint: 'Recover an operator Black Box.' }
]);

export const POLISH_UNLOCK_BY_MILESTONE = Object.freeze({
    'achievement:chen_thirteenth': 1,
    'act2:dishBuilt': 2,
    'act2:campAided': 3,
    'act2:campTurned': 4,
    'achievement:chief_engineer': 5,
    'act2:uplinkSilenced': 6,
    'achievement:reyes_courier': 7,
    'achievement:gentle_drill': 8,
    'achievement:kin': 9,
    'act2:queenRejected': 10,
    'achievement:scouts_honor': 11,
    'achievement:tank_commander': 12,
    'act2:queenKilled': 13,
    'achievement:hunkered': 14,
    'black-box-recovered': 15
});

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
    const id = POLISH_UNLOCK_BY_MILESTONE[String(milestone ?? '')];
    if (!Number.isInteger(id)) return { id: null, unlocked: false };
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
