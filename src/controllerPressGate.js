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

export function createControllerPressGate({ windowMs = 350, staleMs = 2000, now = () => Date.now() } = {}) {
    const handles = new Map();
    const lastEdgeByKey = new Map();

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
            for (const key of state.held.keys()) if (controller[key] !== true) state.held.delete(key);
            for (const key of state.masked) if (controller[key] !== true) state.masked.delete(key);
            for (const [key, value] of Object.entries(controller)) {
                if (!isButtonKey(key, value)) continue;
                if (!value) {
                    state.held.delete(key);
                    state.masked.delete(key);
                    continue;
                }
                if (state.masked.has(key)) {
                    out[key] = false;
                    continue;
                }
                const heldSince = state.held.get(key);
                if (!heldSince) {
                    // A new press from this source.
                    const previous = lastEdgeByKey.get(key);
                    // A source that stopped reporting (fallback handed back to
                    // native, controller unplugged) is not holding anything.
                    const heldElsewhere = [...handles].some(([other, otherState]) => other !== handle
                        && at - otherState.seenAt < staleMs
                        && (otherState.held.has(key) || otherState.masked.has(key)));
                    if (heldElsewhere
                        || (previous && previous.handle !== handle && at - previous.at < windowMs)) {
                        state.masked.add(key);
                        out[key] = false;
                        continue;
                    }
                    lastEdgeByKey.set(key, { handle, at });
                    state.held.set(key, { actionSet });
                    continue;
                }
                if (heldSince.actionSet !== actionSet) {
                    // Carried across a menu/gameplay switch: ignore until let go.
                    state.masked.add(key);
                    out[key] = false;
                }
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
                lastEdgeByKey.set(key, { handle, at });
                // Held until `observe` (or `filter`) sees this source let go.
                state.held.set(key, { actionSet: 'claimed' });
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
            for (const key of state.held.keys()) if (controller[key] !== true) state.held.delete(key);
            for (const key of state.masked) if (controller[key] !== true) state.masked.delete(key);
        },
        reset() {
            handles.clear();
            lastEdgeByKey.clear();
        }
    };
}
