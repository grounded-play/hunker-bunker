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
//  - a press is taken once: if another source already started the same
//    button within `windowMs`, this source's copy is masked until released;
//  - a button pressed under one action set (menu / gameplay / archive) and
//    still held after the set changes is masked until released, so it cannot
//    act in the new context.
// Pure; `now` is injectable for tests.

const NON_BUTTON_FLAGS = new Set(['active', 'connected']);

function isButtonKey(key, value) {
    return typeof value === 'boolean' && !NON_BUTTON_FLAGS.has(key);
}

export function createControllerPressGate({ windowMs = 350, now = () => Date.now() } = {}) {
    const handles = new Map();
    const lastEdgeByKey = new Map();

    function stateFor(handle) {
        if (!handles.has(handle)) handles.set(handle, { held: new Map(), masked: new Set() });
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
            const out = { ...controller };
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
                    if (previous && previous.handle !== handle && at - previous.at < windowMs) {
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
        reset() {
            handles.clear();
            lastEdgeByKey.clear();
        }
    };
}
