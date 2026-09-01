import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';
import { MENU_FOCUS_ROOT_IDS } from '../../src/inputActions.js';

// Regression guard for the 2026-08-27 Steam Deck control loss.
//
// syncSteamInputPhase() decides which Steam Input action set the game asks
// Steam to activate. Only the `gameplay` set binds the `move`/`camera` analog
// actions and the gameplay face buttons, so if the game asks for `menu` while
// a run is live, the Deck's sticks report nothing and A resolves to
// menu_confirm — which clicks whatever HUD control is focused (the map)
// instead of Interact.
//
// The regression was that the "is a modal open?" test only looked for the
// `hidden` class, while overlays such as #hb-debug-console are always mounted
// and hide themselves with `display: none`. One such element pinned the game
// in the menu action set forever.
test.describe('Steam Input action set', () => {
    test('a live run requests the gameplay action set', async ({ page }) => {
        test.setTimeout(180_000);
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        const state = await page.evaluate((ids) => ({
            appPhase: window.__hbAppPhase,
            requestedPhase: window.__hbSteamInputPhaseRequest,
            // Any focus root that is in the DOM, lacks `.hidden`, and renders
            // nothing is exactly the shape that used to force the menu set.
            unrenderedRoots: ids.filter((id) => {
                const el = document.getElementById(id);
                return Boolean(el)
                    && !el.classList.contains('hidden')
                    && el.getClientRects().length === 0;
            })
        }), [...MENU_FOCUS_ROOT_IDS]);

        expect(state.appPhase).toBe('gameplay');
        expect(
            state.requestedPhase,
            `gameplay must not be pinned to the menu action set; unrendered focus roots present: ${state.unrenderedRoots.join(', ') || 'none'}`
        ).toBe('gameplay');
    });
});
