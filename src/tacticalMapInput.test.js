import { describe, expect, it } from 'vitest';
import { actionSetForAppPhase, ACTION_SETS, MENU_FOCUS_ROOT_IDS } from './inputActions.js';

// GAP-GP-01: while the tactical map is open the Deck must be on the menu
// action set, or gameplay polling and the map's own polling both act on the
// same View/Start press. main.js's syncSteamInputPhase derives the phase from
// the open focus roots, so the map has to be one of them.
describe('tactical map Steam Input phase (GAP-GP-01)', () => {
    it('counts the tactical map as a menu focus root', () => {
        expect(MENU_FOCUS_ROOT_IDS).toContain('tactical-map-modal');
    });

    it('maps the menu and gameplay phases to their action sets', () => {
        expect(actionSetForAppPhase('menu')).toBe(ACTION_SETS.MENU);
        expect(actionSetForAppPhase('gameplay')).toBe(ACTION_SETS.GAMEPLAY);
    });
});
