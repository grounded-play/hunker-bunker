import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// Owner, 2026-10-08: the CAMP SERVICES menu holds the actions the prompt no
// longer cycles through; a pick re-checks what the camp still offers.
function setup(actions) {
    const events = [];
    globalThis.window = { dispatchEvent: (event) => events.push(event) };
    globalThis.CustomEvent = class CustomEvent {
        constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    };
    const camp = { id: 'camp_meridian', label: 'CAMP MERIDIAN' };
    const game = Object.create(ThreeGame.prototype);
    Object.assign(game, {
        act2: { getPhase: () => 'dormant' },
        player: { position: { x: 0, z: 0 } },
        isGameplayInputActive: () => true,
        getCampActionsAt: () => actions(camp),
        openFieldWorkbench: vi.fn(() => true),
        beginCampRest: vi.fn(() => true),
        playThrottledUiError: vi.fn(),
        // The prompt has already settled on this camp (its cycle index holds).
        _campActionCampId: 'camp_meridian'
    });
    return { game, events, camp };
}

const full = (camp) => ['talk', 'support', 'quest-offer', 'bond', 'field-workbench', 'rest']
    .map((action) => ({ camp, action, label: action.toUpperCase() }));

describe('CAMP SERVICES', () => {
    it('offers three on the prompt and opens the menu with the rest', () => {
        const { game, events } = setup(full);
        const selected = game.getSelectedCampAction(0, 0);
        expect(selected.count).toBe(3);
        game._campActionIndex = 2;
        expect(game.interactWithAct2Camp()).toBe(true);
        const open = events.find((event) => event.type === 'camp-services-open');
        expect(open.detail.actions.map((entry) => entry.action)).toEqual(['support', 'bond', 'rest', 'field-workbench']);
    });

    it('runs a pick that is still on offer', () => {
        const { game } = setup(full);
        game._campActionIndex = 2;
        game.interactWithAct2Camp();
        expect(game.performCampService(3)).toBe(true);
        expect(game.openFieldWorkbench).toHaveBeenCalled();
    });

    it('refuses a pick the camp no longer offers', () => {
        let offered = full;
        const { game } = setup((camp) => offered(camp));
        game._campActionIndex = 2;
        game.interactWithAct2Camp();
        offered = (camp) => full(camp).filter((entry) => entry.action !== 'rest');
        expect(game.performCampService(2)).toBe(false);
        expect(game.beginCampRest).not.toHaveBeenCalled();
        expect(game.playThrottledUiError).toHaveBeenCalled();
    });
});
