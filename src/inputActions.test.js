import { describe, expect, it } from 'vitest';
import {
    ACTION_SETS,
    MENU_FOCUS_ROOT_IDS,
    POINTER_MODE_MOVEMENT_THRESHOLD_PX,
    shouldPointerRestoreMouseMode,
    actionSetForAppPhase,
    createActionRouter,
    hasControllerContinuePress,
    menuKeyboardDirection,
    MENU_REPEAT_DELAY_MS,
    MENU_REPEAT_INTERVAL_MS,
    spatialFocusIndex,
    wrapMenuIndex,
    shouldPreferBrowserGamepad
} from './inputActions.js';

describe('menu focus surface registry', () => {
    it('lets every surface Settings opens own the controller over Settings', () => {
        // QA 2026-10-01 (S49-10): the Content Guide opened from Settings drew
        // on top, but the D-pad kept moving focus through Settings behind it,
        // because the first open root in this list wins.
        const openedFromSettings = [
            'audio-mixer-popup', 'commentary-list-modal', 'controls-popup',
            'crosshair-color-popup', 'language-select-popup', 'mature-content-audit-modal',
            'progression-walkthrough-modal', 'quit-confirm-modal', 'reset-save-confirm-modal',
            'save-data-popup'
        ];
        for (const id of openedFromSettings) {
            expect(MENU_FOCUS_ROOT_IDS.indexOf(id), id).toBeGreaterThanOrEqual(0);
            expect(MENU_FOCUS_ROOT_IDS.indexOf(id), id).toBeLessThan(MENU_FOCUS_ROOT_IDS.indexOf('settings-popup'));
        }
    });

    it('has unique roots ordered with transient reveals before parent menus', () => {
        expect(new Set(MENU_FOCUS_ROOT_IDS).size).toBe(MENU_FOCUS_ROOT_IDS.length);
        expect(MENU_FOCUS_ROOT_IDS.indexOf('progression-reward-overlay'))
            .toBeLessThan(MENU_FOCUS_ROOT_IDS.indexOf('season-pass-modal'));
        expect(MENU_FOCUS_ROOT_IDS.indexOf('vault-reveal-overlay'))
            .toBeLessThan(MENU_FOCUS_ROOT_IDS.indexOf('steam-vault-modal'));
        expect(MENU_FOCUS_ROOT_IDS.indexOf('operator-polish-modal'))
            .toBeLessThan(MENU_FOCUS_ROOT_IDS.indexOf('armory-screen'));
        expect(MENU_FOCUS_ROOT_IDS.indexOf('steam-vault-modal'))
            .toBeLessThan(MENU_FOCUS_ROOT_IDS.indexOf('armory-screen'));
        expect(MENU_FOCUS_ROOT_IDS.indexOf('settings-popup'))
            .toBeLessThan(MENU_FOCUS_ROOT_IDS.indexOf('armory-screen'));
        // The dropdown picker opens on top of whichever surface owns the
        // <select> it was opened for -- including the on-screen keyboard's
        // parent modals -- so it has to win the focus-root search outright.
        expect(MENU_FOCUS_ROOT_IDS[0]).toBe('select-picker-overlay');
        expect(MENU_FOCUS_ROOT_IDS.indexOf('select-picker-overlay'))
            .toBeLessThan(MENU_FOCUS_ROOT_IDS.indexOf('virtual-keyboard-overlay'));
        expect(MENU_FOCUS_ROOT_IDS.indexOf('virtual-keyboard-overlay'))
            .toBeLessThan(MENU_FOCUS_ROOT_IDS.indexOf('player-chat-modal'));
        expect(MENU_FOCUS_ROOT_IDS.indexOf('player-chat-modal'))
            .toBeLessThan(MENU_FOCUS_ROOT_IDS.indexOf('settings-popup'));
    });

    it.each([
        'splash',
        'menu',
        'settings-popup',
        'controls-popup',
        'armory-screen',
        'multiplayer-modal',
        'season-pass-modal',
        'progression-reward-overlay',
        'npc-dialogue-modal',
        'wanderer-encounter-modal',
        'hb-debug-console',
        'rgb-root'
    ])('registers the %s interactive surface', (id) => {
        expect(MENU_FOCUS_ROOT_IDS).toContain(id);
    });
});

function padSnapshot(overrides = {}) {
    return {
        handle: 'browser-gamepad:0',
        type: 'XBoxOneController',
        active: true,
        move: { x: 0, y: 0 },
        camera: { x: 0, y: 0 },
        fire: false,
        interact: false,
        reload: false,
        ability: false,
        scan: false,
        sprint: false,
        pause: false,
        menuUp: false,
        menuDown: false,
        menuLeft: false,
        menuRight: false,
        menuConfirm: false,
        menuBack: false,
        menuTabLeft: false,
        menuTabRight: false,
        ...overrides
    };
}

describe('hasControllerContinuePress', () => {
    it.each(['confirm', 'back', 'pause', 'tabLeft', 'tabRight', 'up', 'down', 'left', 'right'])(
        'accepts the %s action as a cinematic continue press',
        (action) => expect(hasControllerContinuePress({ [action]: true })).toBe(true)
    );

    it('does not skip from right-stick pointer motion alone', () => {
        expect(hasControllerContinuePress({ pointer: { x: 1, y: 0 } })).toBe(false);
    });

    it.each(['interact', 'dash', 'reload', 'ability', 'fire', 'scan', 'toggleMap'])(
        'accepts the gameplay-shaped %s button while a movie owns field input',
        (action) => expect(hasControllerContinuePress({ [action]: true })).toBe(true)
    );
});

describe('createActionRouter', () => {
    it('maps WASD and arrows onto linear menu focus movement', () => {
        for (const code of ['KeyW', 'KeyA', 'ArrowUp', 'ArrowLeft']) {
            expect(menuKeyboardDirection(code)).toBe(-1);
        }
        for (const code of ['KeyS', 'KeyD', 'ArrowDown', 'ArrowRight']) {
            expect(menuKeyboardDirection(code)).toBe(1);
        }
        expect(menuKeyboardDirection('Enter')).toBe(0);
    });

    it('wraps menu and select choices in both directions', () => {
        expect(wrapMenuIndex(0, -1, 4)).toBe(3);
        expect(wrapMenuIndex(3, 1, 4)).toBe(0);
        expect(wrapMenuIndex(-1, 1, 4)).toBe(1);
        expect(wrapMenuIndex(0, 1, 0)).toBe(0);
    });

    // Controller nav remap 2026-10-14: holding the stick or D-pad in a menu
    // walks a list like every console does, instead of moving once.
    it('repeats a held menu direction after a delay, then steadily', () => {
        let clock = 0;
        const router = createActionRouter({ now: () => clock });
        const down = padSnapshot({ menuDown: true });
        expect(router.deriveActions(down).actions.down).toBe(true);
        clock = 200;
        expect(router.deriveActions(down).actions.down).toBe(false);
        clock = MENU_REPEAT_DELAY_MS + 1;
        expect(router.deriveActions(down).actions.down).toBe(true);
        clock += 10;
        expect(router.deriveActions(down).actions.down).toBe(false);
        clock += MENU_REPEAT_INTERVAL_MS;
        expect(router.deriveActions(down).actions.down).toBe(true);
        // Releasing resets: the next press fires at once.
        expect(router.deriveActions(padSnapshot({})).actions.down).toBe(false);
        expect(router.deriveActions(down).actions.down).toBe(true);
    });

    it('never repeats confirm, back or the bumpers while held', () => {
        let clock = 0;
        const router = createActionRouter({ now: () => clock });
        const held = padSnapshot({ menuConfirm: true, menuBack: true, menuTabRight: true });
        expect(router.deriveActions(held).actions.confirm).toBe(true);
        clock = 5_000;
        const { actions } = router.deriveActions(held);
        expect(actions.confirm || actions.back || actions.tabRight).toBe(false);
    });

    it('starts in the menu set and switches sets explicitly', () => {
        const router = createActionRouter();
        expect(router.getActionSet()).toBe(ACTION_SETS.MENU);
        router.setActionSet(ACTION_SETS.ARCHIVE);
        expect(router.getActionSet()).toBe(ACTION_SETS.ARCHIVE);
        router.setActionSet('nonsense');
        expect(router.getActionSet()).toBe(ACTION_SETS.ARCHIVE);
    });

    it('derives neutral actions from a missing pad', () => {
        const router = createActionRouter();
        router.setActionSet(ACTION_SETS.ARCHIVE);
        const { set, actions } = router.deriveActions(null);
        expect(set).toBe(ACTION_SETS.ARCHIVE);
        expect(actions.confirm).toBe(false);
        expect(actions.focus).toEqual({ x: 0, y: 0 });
    });

    it('maps archive actions from the semantic pad snapshot', () => {
        const router = createActionRouter();
        router.setActionSet(ACTION_SETS.ARCHIVE);
        const { actions } = router.deriveActions(padSnapshot({
            interact: true,
            ability: true,
            menuBack: true,
            reload: true,
            move: { x: 0.5, y: -0.25 }
        }));
        expect(actions.confirm).toBe(true);
        expect(actions.inventory).toBe(true);
        expect(actions.back).toBe(true);
        expect(actions.reveal).toBe(true);
        expect(actions.focus).toEqual({ x: 0.5, y: -0.25 });
    });

    it('lets the D-pad drive archive focus when the stick is idle', () => {
        const router = createActionRouter();
        router.setActionSet(ACTION_SETS.ARCHIVE);
        const { actions } = router.deriveActions(padSnapshot({ menuLeft: true, menuDown: true }));
        expect(actions.focus).toEqual({ x: -1, y: 1 });
    });

    it('edge-triggers discrete archive buttons but keeps reveal level-held', () => {
        const router = createActionRouter();
        router.setActionSet(ACTION_SETS.ARCHIVE);
        const held = padSnapshot({ interact: true, reload: true });
        const first = router.deriveActions(held).actions;
        const second = router.deriveActions(held).actions;
        expect(first.confirm).toBe(true);
        expect(second.confirm).toBe(false);
        expect(first.reveal).toBe(true);
        expect(second.reveal).toBe(true);
        const released = router.deriveActions(padSnapshot()).actions;
        expect(released.confirm).toBe(false);
        const again = router.deriveActions(held).actions;
        expect(again.confirm).toBe(true);
    });

    it('maps menu navigation with edge triggering and bumper tabs', () => {
        const router = createActionRouter();
        const held = padSnapshot({ menuUp: true, menuConfirm: true, menuTabLeft: true, menuTabRight: true });
        const first = router.deriveActions(held).actions;
        expect(first.up).toBe(true);
        expect(first.confirm).toBe(true);
        expect(first.tabLeft).toBe(true);
        expect(first.tabRight).toBe(true);
        const second = router.deriveActions(held).actions;
        expect(second.up).toBe(false);
        expect(second.confirm).toBe(false);
    });

    it('treats right-trigger fire as menu confirm for fallback layouts', () => {
        const router = createActionRouter();
        const held = padSnapshot({ fire: true });
        expect(router.deriveActions(held).actions.confirm).toBe(true);
        expect(router.deriveActions(held).actions.confirm).toBe(false);
    });

    it('does not treat back/scan as tab navigation, since they share a physical button in the browser fallback', () => {
        // mapBrowserGamepad's east face button (index 1) drives both `scan` and
        // `menuBack` at once. Tab navigation must stay off dedicated bumper
        // fields so a single back press can't also flip the active tab.
        const router = createActionRouter();
        const { actions } = router.deriveActions(padSnapshot({ menuBack: true, scan: true }));
        expect(actions.back).toBe(true);
        expect(actions.tabLeft).toBe(false);
        expect(actions.tabRight).toBe(false);
    });

    it('forwards the right stick and left stick to menu actions for handleSteamMenuInput to drive the cursor', () => {
        // handleSteamMenuInput (main.js) reads actions.camera/actions.move
        // directly and applies its own deadzone against resting-stick drift;
        // this layer's job is just to pass the raw vectors through, not to
        // zero them out itself.
        const router = createActionRouter();
        const { actions } = router.deriveActions(padSnapshot({ camera: { x: 0.8, y: -0.6 }, move: { x: -0.3, y: 0.2 } }));
        expect(actions.camera).toEqual({ x: 0.8, y: -0.6 });
        expect(actions.move).toEqual({ x: -0.3, y: 0.2 });
        // Discrete d-pad-style focus navigation is unaffected by stick position.
        expect(actions.up).toBe(false);
        expect(actions.down).toBe(false);
    });

    it('passes the gameplay snapshot through untouched in the gameplay set', () => {
        const router = createActionRouter();
        router.setActionSet(ACTION_SETS.GAMEPLAY);
        const pad = padSnapshot({ fire: true, sprint: true, move: { x: 1, y: 0 } });
        const { actions } = router.deriveActions(pad);
        expect(actions).toBe(pad);
    });

    it('clears edge state when the action set changes', () => {
        const router = createActionRouter();
        router.setActionSet(ACTION_SETS.ARCHIVE);
        const held = padSnapshot({ interact: true });
        router.deriveActions(held);
        router.setActionSet(ACTION_SETS.MENU);
        router.setActionSet(ACTION_SETS.ARCHIVE);
        expect(router.deriveActions(held).actions.confirm).toBe(true);
    });
});

describe('deterministic spatial focus routing', () => {
    const rect = (left, top, width = 40, height = 30) => ({ left, top, width, height });
    const grid = [rect(0, 0), rect(100, 0), rect(0, 100), rect(100, 100)];

    it('moves through a two-dimensional grid instead of DOM order', () => {
        expect(spatialFocusIndex(grid, 0, 'right')).toBe(1);
        expect(spatialFocusIndex(grid, 0, 'down')).toBe(2);
        expect(spatialFocusIndex(grid, 3, 'left')).toBe(2);
        expect(spatialFocusIndex(grid, 3, 'up')).toBe(1);
    });

    it('stops at the edge by default instead of jumping across the screen', () => {
        expect(spatialFocusIndex(grid, 1, 'right')).toBe(1);
        expect(spatialFocusIndex(grid, 2, 'down')).toBe(2);
        expect(spatialFocusIndex(grid, 0, 'up')).toBe(0);
    });

    it('wraps to the opposite visual edge only when asked', () => {
        expect(spatialFocusIndex(grid, 1, 'right', { wrap: true })).toBe(0);
        expect(spatialFocusIndex(grid, 2, 'down', { wrap: true })).toBe(0);
    });

    it('prefers a nearby row over a diagonally distant control', () => {
        expect(spatialFocusIndex([rect(0, 0), rect(80, 10), rect(60, 200)], 0, 'right')).toBe(1);
    });

    // Controller nav map 2026-10-14, F12: anything 0.5 px lower counted as
    // "below", so Down on the Foundry's STASH tab picked the LOADOUT tab next to it.
    it('never treats a control on the same row as below or above', () => {
        const tabs = [rect(0, 0, 100, 40), rect(110, 1, 100, 40), rect(0, 80, 200, 30)];
        expect(spatialFocusIndex(tabs, 0, 'down')).toBe(2);
        expect(spatialFocusIndex(tabs, 1, 'up')).toBe(1);
    });

    // F12: Right from the Foundry search box picked a tab up and to the right
    // over the filter dropdown right beside it.
    it('prefers an aligned neighbour over a nearer diagonal one', () => {
        const search = rect(0, 100, 230, 30);
        const filter = rect(240, 100, 140, 30);
        const tab = rect(232, 40, 100, 40);
        expect(spatialFocusIndex([search, filter, tab], 0, 'right')).toBe(1);
        const from = rect(0, 0, 100, 30);
        const diagonal = rect(300, 40, 100, 30);
        const below = rect(0, 200, 100, 30);
        expect(spatialFocusIndex([from, diagonal, below], 0, 'down')).toBe(2);
    });

    // Settings > Profile at 1280x720: Right from the callsign field picked the
    // CAMERA & HUD tab two rows up (it overlapped horizontally, so its gap
    // counted as zero) over SAVE DATA's OPEN one row down on the right.
    it('weighs sideways drift heavily on left / right moves', () => {
        const callsign = rect(449, 248, 158, 37);
        const cameraTab = rect(571, 101, 139, 44);
        const open = rect(1005, 318, 101, 31);
        expect(spatialFocusIndex([callsign, cameraTab, open], 0, 'right')).toBe(2);
    });

    // Commentary list: Right from a full-width entry went to ✕, which overlaps
    // it horizontally rather than lying to its right.
    it('only takes a diagonal control that lies fully past the current one', () => {
        const entry = rect(87, 196, 1099, 104);
        const close = rect(1135, 49, 40, 40);
        expect(spatialFocusIndex([entry, close], 0, 'right')).toBe(0);
    });

    it('falls back to the nearest control in that direction when none is aligned', () => {
        expect(spatialFocusIndex([rect(0, 0), rect(100, 100)], 0, 'down')).toBe(1);
        // Mostly-sideways (far right, barely lower) loses to the one clearly below.
        expect(spatialFocusIndex([rect(0, 0), rect(300, 60), rect(80, 200)], 0, 'down')).toBe(2);
    });

    it('moves along a vertical list and stops at its ends', () => {
        const list = [rect(0, 0, 200, 30), rect(0, 40, 200, 30), rect(0, 80, 200, 30)];
        expect(spatialFocusIndex(list, 0, 'down')).toBe(1);
        expect(spatialFocusIndex(list, 1, 'up')).toBe(0);
        expect(spatialFocusIndex(list, 2, 'down')).toBe(2);
        // Left / right on a single-column list go nowhere rather than stepping it.
        expect(spatialFocusIndex(list, 1, 'right')).toBe(1);
        expect(spatialFocusIndex(list, 1, 'left')).toBe(1);
    });
});

describe('actionSetForAppPhase', () => {
    it('maps field play and archive phases to their semantic action sets', () => {
        expect(actionSetForAppPhase('gameplay')).toBe(ACTION_SETS.GAMEPLAY);
        expect(actionSetForAppPhase('archive')).toBe(ACTION_SETS.ARCHIVE);
    });

    it.each(['loading', 'boot', 'splash', 'menu', 'gameover', 'demo-end', undefined])(
        'keeps %s in the menu action set',
        (phase) => {
            expect(actionSetForAppPhase(phase)).toBe(ACTION_SETS.MENU);
        }
    );
});

describe('shouldPreferBrowserGamepad', () => {
    it('uses the browser mapping when native Steam Input is unavailable or has no controller', () => {
        expect(shouldPreferBrowserGamepad()).toBe(true);
        expect(shouldPreferBrowserGamepad({ nativeAvailable: true })).toBe(true);
    });

    it('rescues input when Steam sees a controller but its action configuration emits nothing', () => {
        expect(shouldPreferBrowserGamepad({
            nativeAvailable: true,
            nativeControllerCount: 1,
            browserAnyInput: true
        })).toBe(true);
    });

    it('keeps native Steam Input authoritative while it is producing actions', () => {
        expect(shouldPreferBrowserGamepad({
            nativeAvailable: true,
            nativeControllerCount: 1,
            nativeAnyInput: true,
            browserAnyInput: true
        })).toBe(false);
    });

    it('allows one neutral browser frame to release edge-triggered menu actions', () => {
        expect(shouldPreferBrowserGamepad({
            nativeAvailable: true,
            nativeControllerCount: 1,
            browserEngaged: true
        })).toBe(true);
    });
});

describe('pointer movement restores mouse mode', () => {
    const move = (overrides = {}) => ({
        isTrusted: true, pointerType: 'mouse', clientX: 100, clientY: 100, ...overrides
    });

    it('hands control back to the mouse on a real first move', () => {
        expect(shouldPointerRestoreMouseMode(move(), null)).toBe(true);
    });

    // The Deck trackpad moves the pointer without ever clicking, which is why
    // pointerdown alone was not enough.
    it('accepts movement past the jitter threshold', () => {
        const last = { x: 100, y: 100 };
        expect(shouldPointerRestoreMouseMode(move({ clientX: 100 + POINTER_MODE_MOVEMENT_THRESHOLD_PX }), last)).toBe(true);
    });

    it('ignores sub-threshold drift so the mode cannot flap', () => {
        const last = { x: 100, y: 100 };
        expect(shouldPointerRestoreMouseMode(move({ clientX: 101, clientY: 101 }), last)).toBe(false);
        expect(shouldPointerRestoreMouseMode(move({ clientX: 100, clientY: 100 }), last)).toBe(false);
    });

    it('ignores touch, which the Deck screen emits while a finger rests on it', () => {
        expect(shouldPointerRestoreMouseMode(move({ pointerType: 'touch', clientX: 400 }), { x: 100, y: 100 })).toBe(false);
    });

    it('ignores synthetic events', () => {
        expect(shouldPointerRestoreMouseMode(move({ isTrusted: false, clientX: 400 }), { x: 100, y: 100 })).toBe(false);
    });

    it('survives malformed events', () => {
        expect(shouldPointerRestoreMouseMode(null, null)).toBe(false);
        expect(shouldPointerRestoreMouseMode(move({ clientX: Number.NaN }), null)).toBe(false);
    });
});
