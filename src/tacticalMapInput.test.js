import { describe, expect, it } from 'vitest';
import { actionSetForAppPhase, ACTION_SETS, MENU_FOCUS_ROOT_IDS } from './inputActions.js';
import { createControllerPressGate, EQUIVALENT_ACTION_GROUPS } from './controllerPressGate.js';

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

describe('tactical map Deck B-button and sprint control isolation', () => {
    it('defines physical equivalence between menuBack and dash', () => {
        const bGroup = EQUIVALENT_ACTION_GROUPS.find((group) => group.has('menuBack'));
        expect(bGroup).toBeDefined();
        expect(bGroup?.has('dash')).toBe(true);
    });

    it('defines physical equivalence between menuTabLeft and sprint', () => {
        const lbGroup = EQUIVALENT_ACTION_GROUPS.find((group) => group.has('menuTabLeft'));
        expect(lbGroup).toBeDefined();
        expect(lbGroup?.has('sprint')).toBe(true);
    });

    it('prevents B press used to close map from executing a dash or reopening settings in gameplay', () => {
        let clock = 1000;
        const gate = createControllerPressGate({ windowMs: 350, now: () => clock });

        // Map is open: native Steam Input reports menuBack: true
        const menuFiltered = gate.filter({ handle: 'steam:1', menuBack: true }, 'menu');
        expect(menuFiltered.menuBack).toBe(true);

        // Map closes: direct poll or menu close claims menuBack and dash
        gate.claim(['menuBack', 'dash'], 'browser-gamepad:0');

        clock += 50;
        // Native snapshot arrives 50ms later under gameplay action set with dash: true
        const gameplayFiltered = gate.filter({ handle: 'steam:1', dash: true }, 'gameplay');
        expect(gameplayFiltered.dash).toBe(false);

        clock += 50;
        // Even if still held, it remains masked
        expect(gate.filter({ handle: 'steam:1', dash: true }, 'gameplay').dash).toBe(false);

        // Only after full release and re-pressing in gameplay does dash activate
        gate.filter({ handle: 'steam:1', dash: false }, 'gameplay');
        gate.observe({ handle: 'browser-gamepad:0', dash: false, menuBack: false });
        clock += 400;
        expect(gate.filter({ handle: 'steam:1', dash: true }, 'gameplay').dash).toBe(true);
    });

    it('prevents LB held while zooming map from starting a sprint on return to gameplay', () => {
        let clock = 1000;
        const gate = createControllerPressGate({ windowMs: 350, now: () => clock });

        // Player was holding zoom out (menuTabLeft) on map
        expect(gate.filter({ handle: 'steam:1', menuTabLeft: true }, 'menu').menuTabLeft).toBe(true);

        clock += 20;
        // Map closed, transitioning to gameplay while LB is still held
        const gameplayFiltered = gate.filter({ handle: 'steam:1', sprint: true }, 'gameplay');
        expect(gameplayFiltered.sprint).toBe(false);

        // Release and press again
        gate.filter({ handle: 'steam:1', sprint: false }, 'gameplay');
        clock += 20;
        expect(gate.filter({ handle: 'steam:1', sprint: true }, 'gameplay').sprint).toBe(true);
    });
});

