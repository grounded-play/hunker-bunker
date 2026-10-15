export const FRAGILE_LEDGE_STATE = Object.freeze({
    SOLID: 'solid',
    CRACKED: 'cracked',
    WARNING: 'warning',
    COLLAPSED: 'collapsed'
});

export const FRAGILE_LEDGE_WARNING_MS = 700;

export function fragileLedgeKey(x, z) {
    return `${Math.round(x)},${Math.round(z)}`;
}

export function readFragileLedgeState(states, key) {
    const record = states?.get?.(key);
    if (!record) return { state: FRAGILE_LEDGE_STATE.SOLID, warningDeadline: null };
    if (typeof record === 'string') return { state: record, warningDeadline: null };
    return {
        state: Object.values(FRAGILE_LEDGE_STATE).includes(record.state)
            ? record.state
            : FRAGILE_LEDGE_STATE.SOLID,
        warningDeadline: Number.isFinite(record.warningDeadline) ? record.warningDeadline : null
    };
}

function normalizeRecord(record) {
    return readFragileLedgeState(new Map([['value', record]]), 'value');
}

function writeTransition(states, transitions, key, state, now, warningDeadline = null) {
    if (!key) return;
    const previous = readFragileLedgeState(states, key).state;
    if (previous === state) return;
    const record = { state, warningDeadline };
    states.set(key, record);
    transitions.push({ key, previous, state, at: now, warningDeadline });
}

/**
 * One tile is one small ledge zone. A first traversal can never remove support:
 * it cracks only after exit. Re-entry starts a timed warning; leaving during
 * that warning collapses the tile safely behind the player.
 */
export function advanceFragileLedgeOccupancy(states, {
    previousKey = null,
    currentKey = null,
    now = 0,
    warningDurationMs = FRAGILE_LEDGE_WARNING_MS
} = {}) {
    const transitions = [];
    const store = states ?? new Map();

    if (previousKey && previousKey !== currentKey) {
        const previous = readFragileLedgeState(store, previousKey);
        if (previous.state === FRAGILE_LEDGE_STATE.SOLID) {
            writeTransition(store, transitions, previousKey, FRAGILE_LEDGE_STATE.CRACKED, now);
        } else if (previous.state === FRAGILE_LEDGE_STATE.WARNING) {
            writeTransition(store, transitions, previousKey, FRAGILE_LEDGE_STATE.COLLAPSED, now);
        }
    }

    if (currentKey && currentKey !== previousKey) {
        const current = readFragileLedgeState(store, currentKey);
        if (current.state === FRAGILE_LEDGE_STATE.CRACKED) {
            writeTransition(
                store,
                transitions,
                currentKey,
                FRAGILE_LEDGE_STATE.WARNING,
                now,
                now + Math.max(1, warningDurationMs)
            );
        }
    }

    if (currentKey) {
        const current = readFragileLedgeState(store, currentKey);
        if (current.state === FRAGILE_LEDGE_STATE.WARNING
            && Number.isFinite(current.warningDeadline)
            && now >= current.warningDeadline) {
            writeTransition(store, transitions, currentKey, FRAGILE_LEDGE_STATE.COLLAPSED, now);
        }
    }

    return { activeKey: currentKey, transitions };
}

export function serializeFragileLedgeStates(states) {
    return [...(states?.entries?.() ?? [])]
        .filter(([, record]) => normalizeRecord(record).state !== FRAGILE_LEDGE_STATE.SOLID)
        .map(([key, record]) => {
            const normalized = normalizeRecord(record);
            return [key, normalized.state === FRAGILE_LEDGE_STATE.WARNING
                ? { state: FRAGILE_LEDGE_STATE.CRACKED, warningDeadline: null }
                : normalized];
        });
}

export function restoreFragileLedgeStates(serialized) {
    const states = new Map();
    for (const entry of Array.isArray(serialized) ? serialized : []) {
        if (!Array.isArray(entry) || typeof entry[0] !== 'string') continue;
        const record = normalizeRecord(entry[1]);
        if (record.state === FRAGILE_LEDGE_STATE.SOLID) continue;
        states.set(entry[0], record.state === FRAGILE_LEDGE_STATE.WARNING
            ? { state: FRAGILE_LEDGE_STATE.CRACKED, warningDeadline: null }
            : record);
    }
    return states;
}
