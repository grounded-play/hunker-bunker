// One physical press, one action (2026-09-24 Deck QA,
// docs/planning/qa-2026-09-24-deck-pc-coop-game-plan.md):
//
// On a Steam Deck the same button reaches the game twice — through native
// Steam Input snapshots and through Chromium's Gamepad API fallback — each
// with its own edge detection. One B press closed the tactical map and then,
// as the second copy arrived, opened the pause menu; the settings button
// opened settings and closed them again (a "flash"). A button still held when
// a menu closed also carried into gameplay (quitting a menu started a sprint).
//
// The gate sits between every controller source and the action router:
//  - a press is taken once: if another source is still holding the same
//    button, or started it within `windowMs`, this source's copy is masked
//    until released (holding covers a hitch longer than the window);
//  - a button pressed under one action set (menu / gameplay / archive) and
//    still held after the set changes is masked until released, so it cannot
//    act in the new context.
// Pure; `now` is injectable for tests.

const NON_BUTTON_FLAGS = new Set(['active', 'connected']);

function isButtonKey(key, value) {
    return typeof value === 'boolean' && !NON_BUTTON_FLAGS.has(key);
}

export const EQUIVALENT_ACTION_GROUPS = [
    new Set(['menuBack', 'dash', 'archiveBack']),
    new Set(['menuConfirm', 'interact', 'archiveConfirm']),
    new Set(['menuTabLeft', 'sprint']),
    new Set(['toggleMap', 'menuTabRight']),
    new Set(['pause'])
];

export function getEquivalentGroup(key) {
    for (const group of EQUIVALENT_ACTION_GROUPS) {
        if (group.has(key)) return group;
    }
    return null;
}

function hasEquivalentPressed(controller, key) {
    const group = getEquivalentGroup(key);
    if (!group) return false;
    for (const k of group) {
        if (controller[k] === true) return true;
    }
    return false;
}

function findHeldEntry(state, key) {
    if (state.held.has(key)) return { key, ...state.held.get(key) };
    const group = getEquivalentGroup(key);
    if (group) {
        for (const k of group) {
            if (state.held.has(k)) return { key: k, ...state.held.get(k) };
        }
    }
    return null;
}

function isMaskedInState(state, key) {
    if (state.masked.has(key)) return true;
    const group = getEquivalentGroup(key);
    if (group) {
        for (const k of group) {
            if (state.masked.has(k)) return true;
        }
    }
    return false;
}

function isKeyHeldOrMasked(state, key) {
    if (state.held.has(key) || state.masked.has(key)) return true;
    const group = getEquivalentGroup(key);
    if (group) {
        for (const k of group) {
            if (state.held.has(k) || state.masked.has(k)) return true;
        }
    }
    return false;
}

function maskKeyAndEquivalents(state, key) {
    state.masked.add(key);
    const group = getEquivalentGroup(key);
    if (group) {
        for (const k of group) {
            state.masked.add(k);
        }
    }
}

export function createControllerPressGate({ windowMs = 350, staleMs = 2000, now = () => Date.now() } = {}) {
    const handles = new Map();
    const lastEdgeByKey = new Map();

    function recordEdge(key, handle, at) {
        const group = getEquivalentGroup(key);
        if (group) {
            for (const k of group) {
                lastEdgeByKey.set(k, { handle, at });
            }
        } else {
            lastEdgeByKey.set(key, { handle, at });
        }
    }

    function stateFor(handle) {
        if (!handles.has(handle)) handles.set(handle, { held: new Map(), masked: new Set(), seenAt: 0 });
        return handles.get(handle);
    }

    return {
        /**
         * The controller as the router should see it: same shape, with masked
         * buttons reported as released.
         */
        filter(controller, actionSet = 'menu') {
            if (!controller || typeof controller !== 'object') return controller;
            const handle = controller.handle ?? 'default';
            const state = stateFor(handle);
            const at = now();
            state.seenAt = at;
            const out = { ...controller };
            // A button a source stops reporting is released, not still held.
            // If the action name changed across an action-set transition (e.g.
            // menuBack -> dash), don't release while its equivalent counterpart
            // is still held down.
            for (const key of [...state.held.keys()]) {
                if (controller[key] !== true && !hasEquivalentPressed(controller, key)) {
                    state.held.delete(key);
                }
            }
            for (const key of [...state.masked]) {
                if (controller[key] !== true && !hasEquivalentPressed(controller, key)) {
                    state.masked.delete(key);
                }
            }
            for (const [key, value] of Object.entries(controller)) {
                if (!isButtonKey(key, value)) continue;
                if (!value) {
                    if (!hasEquivalentPressed(controller, key)) {
                        state.held.delete(key);
                        state.masked.delete(key);
                    }
                    continue;
                }
                if (isMaskedInState(state, key)) {
                    state.masked.add(key);
                    out[key] = false;
                    continue;
                }
                const heldEntry = findHeldEntry(state, key);
                if (!heldEntry) {
                    // A new press from this source.
                    const previous = lastEdgeByKey.get(key);
                    // A source that stopped reporting (fallback handed back to
                    // native, controller unplugged) is not holding anything.
                    const heldElsewhere = [...handles].some(([other, otherState]) => other !== handle
                        && at - otherState.seenAt < staleMs
                        && isKeyHeldOrMasked(otherState, key));
                    if (heldElsewhere
                        || (previous && previous.handle !== handle && at - previous.at < windowMs)) {
                        maskKeyAndEquivalents(state, key);
                        out[key] = false;
                        continue;
                    }
                    recordEdge(key, handle, at);
                    state.held.set(key, { actionSet });
                    continue;
                }
                if (heldEntry.actionSet !== actionSet) {
                    // Carried across a menu/gameplay switch: ignore until let go.
                    maskKeyAndEquivalents(state, key);
                    out[key] = false;
                    continue;
                }
                state.held.set(key, { actionSet: heldEntry.actionSet });
            }
            return out;
        },
        /**
         * A press consumed outside the router (the tactical map polls the
         * Gamepad API itself): record it so another source's copy of the same
         * physical press is masked instead of acting a second time.
         */
        claim(keys, handle = 'direct-poll') {
            const at = now();
            const state = stateFor(handle);
            state.seenAt = at;
            for (const key of keys ?? []) {
                recordEdge(key, handle, at);
                // Held until `observe` (or `filter`) sees this source let go.
                state.held.set(key, { actionSet: 'claimed' });
                const group = getEquivalentGroup(key);
                if (group) {
                    for (const k of group) {
                        state.held.set(k, { actionSet: 'claimed' });
                    }
                }
            }
        },
        /**
         * Follow a source that is not routed right now (the browser pad while
         * native Steam Input is in charge): releases only. It never starts a
         * press or masks another source by itself -- only presses it acted on
         * (routed or claimed) do.
         */
        observe(controller) {
            if (!controller || typeof controller !== 'object') return;
            const state = stateFor(controller.handle ?? 'default');
            state.seenAt = now();
            for (const key of [...state.held.keys()]) {
                if (controller[key] !== true && !hasEquivalentPressed(controller, key)) {
                    state.held.delete(key);
                }
            }
            for (const key of [...state.masked]) {
                if (controller[key] !== true && !hasEquivalentPressed(controller, key)) {
                    state.masked.delete(key);
                }
            }
        },
        reset() {
            handles.clear();
            lastEdgeByKey.clear();
        }
    };
}
