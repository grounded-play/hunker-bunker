// Weapon sheens — docs/planning/armory-ui-overhaul-2026-09-09.md Phase 3.
//
// The operator has a polish (operatorPolishes.js); the weapon had a field
// *labelled* "sheen" that actually chose a whole different weapon mesh. That
// label is gone, and this is the real thing: a colour tint over whatever weapon
// is fielded, unlocked by the same kind of milestones.
//
// Deliberately the same shape as OPERATOR_POLISHES so both can drive the same
// picker and the same unlock plumbing.

const STORAGE_UNLOCKED = 'hb_weapon_sheens_v1';
const STORAGE_SELECTED = 'hb_weapon_sheen_selected_v1';

export const WEAPON_SHEENS = Object.freeze([
    { id: 0, name: 'GUNMETAL', color: '#ffffff', hint: 'Standard issue on every frame.' },
    { id: 1, name: 'FROST ETCH', color: '#bfe7ff', hint: 'Field a Scout weapon to an ending.' },
    { id: 2, name: 'SIGNAL WASH', color: '#58efff', hint: 'Raise the signal dish at the foundry.' },
    { id: 3, name: 'VERDANT OIL', color: '#8dffbe', hint: 'Finish a survivor camp job.' },
    { id: 4, name: 'ACID BLOOM', color: '#b8ff62', hint: 'Turn a survivor camp to the brood.' },
    { id: 5, name: 'REACTOR WASH', color: '#ffd15a', hint: 'Field an Engineer weapon to an ending.' },
    { id: 6, name: 'EMBER TEMPER', color: '#ff9a45', hint: 'Sever the Mothership uplink.' },
    { id: 7, name: 'RESCUE LACQUER', color: '#ff6262', hint: 'Deliver Reyes’ letter to Commander Briggs.' },
    { id: 8, name: 'OXIDE ROSE', color: '#d77b83', hint: 'Reach the reveal without harming a hive.' },
    { id: 9, name: 'BROOD MAGENTA', color: '#ff62d3', hint: 'Reach maximum bond with a hive.' },
    { id: 10, name: 'VOID ANODIZE', color: '#b886ff', hint: 'Defeat the Queen in single combat.' },
    { id: 11, name: 'BLACK ICE', color: '#45556b', hint: 'Survive one run for twenty minutes.' },
    { id: 12, name: 'DEEP FROST', color: '#a5f3fc', itemdefid: 4204, hint: 'Set piece: Deep Frost weapon sheen.' },
    { id: 13, name: 'RUST & BONE', color: '#ea580c', itemdefid: 4211, hint: 'Set piece: Rust & Bone weapon sheen.' },
    { id: 14, name: 'HIVE CHITIN', color: '#84cc16', itemdefid: 4218, hint: 'Set piece: Hive Chitin weapon sheen.' },
    { id: 15, name: 'HORIZON TEAL', color: '#14b8a6', itemdefid: 4225, hint: 'Set piece: Horizon Corporate weapon sheen.' },
    { id: 16, name: 'BUNKER 404', color: '#d946ef', itemdefid: 4232, hint: 'Set piece: Bunker 404 weapon sheen.' },
    { id: 17, name: 'GRAND MARSHAL', color: '#f59e0b', itemdefid: 4239, hint: 'Set piece: Grand Marshal weapon sheen.' }
]);

export const SHEEN_UNLOCK_BY_MILESTONE = Object.freeze({
    'achievement:scouts_honor': 1,
    'act2:dishBuilt': 2,
    'act2:campAided': 3,
    'act2:campTurned': 4,
    'achievement:chief_engineer': 5,
    'act2:uplinkSilenced': 6,
    'achievement:reyes_courier': 7,
    'achievement:gentle_drill': 8,
    'achievement:kin': 9,
    'act2:queenKilled': 10,
    'achievement:hunkered': 11
});

const MAX_ID = WEAPON_SHEENS.length;

function storageOrDefault(storage) {
    return storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
}

// Sheen 0 is always present: a weapon with no tint is still a valid look, and a
// corrupted or missing record must never leave the player with nothing to equip.
export function getUnlockedSheenIds(storage = null) {
    try {
        const parsed = JSON.parse(storageOrDefault(storage)?.getItem(STORAGE_UNLOCKED) ?? '[]');
        return new Set([0, ...(Array.isArray(parsed) ? parsed : [])]
            .filter((id) => Number.isInteger(id) && id >= 0 && id < MAX_ID));
    } catch {
        return new Set([0]);
    }
}

export function getSheenById(id) {
    return WEAPON_SHEENS.find((sheen) => sheen.id === id) ?? WEAPON_SHEENS[0];
}

export function getSelectedSheen(storage = null) {
    try {
        const raw = Number(storageOrDefault(storage)?.getItem(STORAGE_SELECTED));
        const unlocked = getUnlockedSheenIds(storage);
        return unlocked.has(raw) ? getSheenById(raw) : WEAPON_SHEENS[0];
    } catch {
        return WEAPON_SHEENS[0];
    }
}

// Refuses a locked id rather than equipping it, so this is safe to call from a
// click handler without a second ownership check.
export function selectSheen(id, storage = null) {
    if (!getUnlockedSheenIds(storage).has(id)) return null;
    try {
        storageOrDefault(storage)?.setItem(STORAGE_SELECTED, String(id));
    } catch {
        // Persistence is best-effort; the caller still gets the selection.
    }
    return getSheenById(id);
}

export function unlockSheen(id, storage = null) {
    if (!Number.isInteger(id) || id <= 0 || id >= MAX_ID) return false;
    const unlocked = getUnlockedSheenIds(storage);
    if (unlocked.has(id)) return false;
    unlocked.add(id);
    try {
        storageOrDefault(storage)?.setItem(STORAGE_UNLOCKED, JSON.stringify([...unlocked]));
    } catch {
        return false;
    }
    return true;
}

export function unlockSheenForMilestone(milestoneKey, storage = null) {
    const id = SHEEN_UNLOCK_BY_MILESTONE[milestoneKey];
    return id === undefined ? false : unlockSheen(id, storage);
}

// Existing careers must not have to repeat a one-time achievement to earn a tint.
export function reconcileSheenUnlocks({ achievements = {}, world = {} } = {}, storage = null) {
    const worldFlags = { ...world,
        campAided: world.campAided || world.camps?.some((camp) => camp.aided),
        campTurned: world.campTurned || world.camps?.some((camp) => camp.turned || camp.status === 'turned'),
        queenKilled: world.queenKilled || world.queenStatus === 'killed'
    };
    for (const [milestone, id] of Object.entries(SHEEN_UNLOCK_BY_MILESTONE)) {
        const [kind, key] = milestone.split(':');
        if (kind === 'achievement' ? achievements[key] : worldFlags[key]) unlockSheen(id, storage);
    }
    return getUnlockedSheenIds(storage);
}

export function unlockAllSheens(storage = null) {
    try {
        storageOrDefault(storage)?.setItem(
            STORAGE_UNLOCKED,
            JSON.stringify(WEAPON_SHEENS.map((sheen) => sheen.id))
        );
        return true;
    } catch {
        return false;
    }
}
