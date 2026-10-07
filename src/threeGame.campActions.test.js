import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// Session 2026-10-06 (solo): "I should be able to talk to the camp members ...
// I couldn't talk to people at the camp". A camp offered one action at a
// time, so a companion to settle (or the workbench) hid TALK entirely.
beforeEach(() => vi.stubGlobal('window', { dispatchEvent: vi.fn(), AudioManager: { play: vi.fn() } }));
afterEach(() => vi.unstubAllGlobals());

function campGame({ companion = true, beat = { type: 'loop' } } = {}) {
    const camp = { id: 'camp_meridian', label: 'Camp Meridian', leaderName: 'Kaelen', status: 'alive', hasWorkbench: true, isWithinInteractRange: () => true };
    const game = {
        camps: [camp],
        companions: companion ? [{ isWanderer: true }] : [],
        player: { position: { x: 0, z: 0 } },
        getCampRecord: () => ({ id: 'camp_meridian', status: 'alive' }),
        isAct2Active: () => false,
        peekDialogueBeat: () => beat,
        getPromptKeyGlyph: () => 'C',
        showBunkerLine: vi.fn(),
        canRestAt: () => ({ allowed: false }),
        getNextCampQuest: () => null,
        getCampSupportCost: () => 10,
        getCampFavorCost: () => 5,
        getCampCondition: () => 'intact',
        getPendingPackageStep: () => null,
        fatigueState: {}
    };
    for (const name of ['getActionableCampAt', 'getCampActionsAt', 'getSelectedCampAction', 'cycleCampAction', 'getNearbyCampResident']) game[name] = ThreeGame.prototype[name];
    return game;
}

describe('a camp offers everything it can, and talk is always one of them', () => {
    it('lists settle, the workbench and talk instead of only the first', () => {
        const actions = campGame().getCampActionsAt(0, 0, 'dormant').map((entry) => entry.action);
        expect(actions[0]).toBe('settle-companion');
        expect(actions).toEqual(expect.arrayContaining(['talk', 'field-workbench']));
    });

    it('still offers small talk once the story beats are used up', () => {
        const actions = campGame({ companion: false }).getCampActionsAt(0, 0, 'dormant').map((entry) => entry.action);
        expect(actions).toContain('talk');
        expect(campGame({ companion: false, beat: null }).getCampActionsAt(0, 0, 'dormant').map((entry) => entry.action)).not.toContain('talk');
    });

    it('steps through the actions with the cycle button and shows where you are', () => {
        const game = campGame();
        expect(game.getSelectedCampAction(0, 0, 'dormant')).toMatchObject({ action: 'settle-companion', index: 0 });
        expect(game.cycleCampAction(1)).toBe(true);
        const next = game.getSelectedCampAction(0, 0, 'dormant');
        expect(next.index).toBe(1);
        expect(next.count).toBeGreaterThanOrEqual(3);
    });

    it('keeps an exclusive state the only option', () => {
        const game = campGame();
        game.isAct2Active = () => true;
        game.getCampRecord = () => ({ id: 'camp_meridian', status: 'alive', suspicion: 60 });
        game.getCampVerbRuntimeEffects = () => ({});
        // Settle comes first; the lockdown behind it ends the list.
        const actions = game.getCampActionsAt(0, 0, 'reveal').map((entry) => entry.action);
        expect(actions).not.toContain('lockdown');
        expect(actions).not.toContain('talk');
    });
});

describe('the people at a camp', () => {
    const residentCamp = () => {
        const game = campGame({ companion: false });
        const camp = game.camps[0];
        const near = { getWorldPosition: () => ({ x: 0.5, z: 0 }), visible: true, position: { x: 0.5, z: 0 } };
        camp.campWorkers = [{ mesh: near, resident: { name: 'Rook', role: 'mechanic' } }];
        game.getNearbyCampResident = ThreeGame.prototype.getNearbyCampResident;
        game.talkToCampResident = ThreeGame.prototype.talkToCampResident;
        const record = { id: 'camp_meridian', status: 'alive' };
        game.getCampRecord = () => record;
        return { game, camp, record };
    };

    it('puts talking to the resident beside you first', () => {
        const { game } = residentCamp();
        const [first] = game.getCampActionsAt(0, 0, 'dormant');
        expect(first).toMatchObject({ action: 'talk-resident', workerIndex: 0 });
        expect(first.label).toContain('ROOK');
    });

    it('says the next line each time and remembers it in the camp record', () => {
        const { game, camp, record } = residentCamp();
        expect(game.talkToCampResident(camp, 0)).toBe(true);
        expect(game.showBunkerLine).toHaveBeenLastCalledWith(expect.stringContaining('ROOK'));
        const first = game.showBunkerLine.mock.lastCall[0];
        game.talkToCampResident(camp, 0);
        expect(game.showBunkerLine.mock.lastCall[0]).not.toBe(first);
        expect(record.residentTalks.Rook).toBe(2);
    });
});
