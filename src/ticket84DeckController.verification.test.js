import { describe, expect, it } from 'vitest';
import {
    MENU_FOCUS_ROOT_IDS,
    ACTION_SETS,
    actionSetForAppPhase,
    spatialFocusIndex,
    hasControllerContinuePress,
    createActionRouter,
    shouldPreferBrowserGamepad
} from './inputActions.js';

describe('Ticket #84 — Steam Deck Controller-Only Menu Flow Verification', () => {
    it('verifies all required surfaces (Homebase, Armory, Archives, Fab Bay, Deployment) are registered in MENU_FOCUS_ROOT_IDS', () => {
        const requiredSurfaces = [
            'menu',                      // Homebase hero selection & root menu
            'armory-screen',             // Armory tactical stage
            'armory-picker-modal',       // Armory weapon/attachment pickers
            'operator-polish-modal',     // Armory exosuit rig polish modal
            'archive-modal',             // Bunker Archive console
            'archive-log-detail-modal',  // Recovered archive detail modal
            'fabrication-modal',         // Fab Bay foundry & craft queue
            'multiplayer-modal'          // Deployment console & ledger
        ];

        for (const surfaceId of requiredSurfaces) {
            expect(MENU_FOCUS_ROOT_IDS).toContain(surfaceId);
        }
    });

    it('verifies transient child modals and overlays precede their parent screens in the focus hierarchy', () => {
        const detailIdx = MENU_FOCUS_ROOT_IDS.indexOf('archive-log-detail-modal');
        const archiveIdx = MENU_FOCUS_ROOT_IDS.indexOf('archive-modal');
        expect(detailIdx).toBeLessThan(archiveIdx);

        const pickerIdx = MENU_FOCUS_ROOT_IDS.indexOf('armory-picker-modal');
        const polishIdx = MENU_FOCUS_ROOT_IDS.indexOf('operator-polish-modal');
        const armoryIdx = MENU_FOCUS_ROOT_IDS.indexOf('armory-screen');
        expect(pickerIdx).toBeLessThan(armoryIdx);
        expect(polishIdx).toBeLessThan(armoryIdx);

        const multiIdx = MENU_FOCUS_ROOT_IDS.indexOf('multiplayer-modal');
        const menuIdx = MENU_FOCUS_ROOT_IDS.indexOf('menu');
        expect(multiIdx).toBeLessThan(menuIdx);
        expect(archiveIdx).toBeLessThan(menuIdx);
    });

    it('proves 2D spatial focus routing navigates cleanly across grid buttons without DOM order coupling', () => {
        // 2x2 grid representing menu cards (e.g. Hero Select or Armory tabs)
        // [0: Top-Left ]  [1: Top-Right ]
        // [2: Bottom-Left] [3: Bottom-Right]
        const rects = [
            { left: 100, top: 100, width: 80, height: 40 }, // 0
            { left: 300, top: 100, width: 80, height: 40 }, // 1
            { left: 100, top: 250, width: 80, height: 40 }, // 2
            { left: 300, top: 250, width: 80, height: 40 }  // 3
        ];

        // Move right from 0 -> 1
        expect(spatialFocusIndex(rects, 0, 'right')).toBe(1);
        // Move down from 0 -> 2
        expect(spatialFocusIndex(rects, 0, 'down')).toBe(2);
        // Move left from 1 -> 0
        expect(spatialFocusIndex(rects, 1, 'left')).toBe(0);
        // Move up from 3 -> 1
        expect(spatialFocusIndex(rects, 3, 'up')).toBe(1);

        // Edge wrapping:
        // Moving right from 1 wraps to opposite edge (index 0 or 2, preferring row neighbor 0)
        expect(spatialFocusIndex(rects, 1, 'right')).toBe(0);
        // Moving down from 2 wraps to top edge (index 0)
        expect(spatialFocusIndex(rects, 2, 'down')).toBe(0);
    });

    it('proves action router translates gamepad presses with edge-triggering and bumper tabs', () => {
        const router = createActionRouter();
        expect(router.getActionSet()).toBe(ACTION_SETS.MENU);

        // First frame: D-pad down pressed
        let result = router.deriveActions({ menuDown: true });
        expect(result.actions.down).toBe(true);

        // Second frame: D-pad down still held -> edge-triggered, returns false to prevent runaway scrolling
        result = router.deriveActions({ menuDown: true });
        expect(result.actions.down).toBe(false);

        // Release and press A / Confirm
        result = router.deriveActions({ menuDown: false, menuConfirm: true });
        expect(result.actions.confirm).toBe(true);

        // Bumper tabs (LB / RB)
        result = router.deriveActions({ menuTabLeft: true });
        expect(result.actions.tabLeft).toBe(true);
        result = router.deriveActions({ menuTabRight: true });
        expect(result.actions.tabRight).toBe(true);
    });

    it('verifies controller cutscene skip detection and browser gamepad fallback rescue', () => {
        // Controller continue press recognizes all standard face buttons and navigation
        expect(hasControllerContinuePress({ confirm: true })).toBe(true);
        expect(hasControllerContinuePress({ back: true })).toBe(true);
        expect(hasControllerContinuePress({ tabRight: true })).toBe(true);
        expect(hasControllerContinuePress({})).toBe(false);

        // Browser gamepad rescue when native Steam Input produces no actions
        expect(shouldPreferBrowserGamepad({
            nativeAvailable: true,
            nativeControllerCount: 1,
            nativeAnyInput: false,
            browserAnyInput: true
        })).toBe(true);

        // Retains native Steam Input when native input is actively firing
        expect(shouldPreferBrowserGamepad({
            nativeAvailable: true,
            nativeControllerCount: 1,
            nativeAnyInput: true,
            browserAnyInput: true
        })).toBe(false);

        // App phase to action set mapping
        expect(actionSetForAppPhase('gameplay')).toBe(ACTION_SETS.GAMEPLAY);
        expect(actionSetForAppPhase('archive')).toBe(ACTION_SETS.ARCHIVE);
        expect(actionSetForAppPhase('menu')).toBe(ACTION_SETS.MENU);
        expect(actionSetForAppPhase('splash')).toBe(ACTION_SETS.MENU);
    });
});
