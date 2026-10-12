// Ship and base progress is shared by a co-op squad (owner, 2026-10-07: "if
// one player unlocks O2 both get it"). PvP squads do not share. Only
// progression travels -- never resources or anything that costs -- and a merge
// only ever raises a level or turns an unlock on, so a late or repeated
// message can never take progress away.

const LEVEL_FIELDS = Object.freeze(['o2GeneratorLevel', 'hullExpansionLevel', 'radarNodeLevel', 'reactorCompressorLevel', 'baseTurretLevel']);
const FLAG_FIELDS = Object.freeze(['foundryActivated', 'baseTurretUnlocked']);
const FLAG_GROUPS = Object.freeze(['unlocks', 'tier2Unlocks']);

export function extractSquadProgress(bank = {}) {
    const progress = {};
    for (const field of LEVEL_FIELDS) progress[field] = Math.max(0, Math.floor(Number(bank[field]) || 0));
    for (const field of FLAG_FIELDS) progress[field] = Boolean(bank[field]);
    for (const group of FLAG_GROUPS) {
        progress[group] = Object.fromEntries(Object.entries(bank[group] ?? {}).map(([key, value]) => [key, Boolean(value)]));
    }
    return progress;
}

export function squadProgressSignature(bank = {}) {
    return JSON.stringify(extractSquadProgress(bank));
}

/** Merge a squadmate's progress into a bank state: { state, changed }. */
export function mergeSquadProgress(bank = {}, incoming = {}) {
    const state = { ...bank };
    let changed = false;
    for (const field of LEVEL_FIELDS) {
        const theirs = Math.max(0, Math.floor(Number(incoming[field]) || 0));
        if (theirs > (Number(state[field]) || 0)) {
            state[field] = theirs;
            changed = true;
        }
    }
    for (const field of FLAG_FIELDS) {
        if (incoming[field] === true && state[field] !== true) {
            state[field] = true;
            changed = true;
        }
    }
    for (const group of FLAG_GROUPS) {
        const mine = { ...(state[group] ?? {}) };
        for (const [key, value] of Object.entries(incoming[group] ?? {})) {
            if (value === true && mine[key] !== true && Object.hasOwn(mine, key)) {
                mine[key] = true;
                changed = true;
            }
        }
        state[group] = mine;
    }
    return { state, changed };
}
