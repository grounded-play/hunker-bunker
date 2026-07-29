import { describe, expect, it } from 'vitest';
import { ACTION_SETS, actionSetForAppPhase, createActionRouter } from './inputActions.js';

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

describe('createActionRouter', () => {
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
