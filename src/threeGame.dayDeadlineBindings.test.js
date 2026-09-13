import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDayState } from './dayCycle.js';
import { ThreeGame } from './threeGame.js';

function installWindow() {
    const events = [];
    globalThis.CustomEvent = class CustomEvent {
        constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    };
    globalThis.window = {
        dispatchEvent: (event) => events.push(event),
        AudioManager: { play: vi.fn() }
    };
    return events;
}

function deadlineResolver(game) {
    game.resolveDayDeadline = ThreeGame.prototype.resolveDayDeadline;
    game.persistDayCycleState = vi.fn();
    game.isDayDeadlineExpired = ThreeGame.prototype.isDayDeadlineExpired;
    return game;
}

describe('campaign deadline bindings', () => {
    beforeEach(() => installWindow());

    it('resolves Meridian first contact from the actual first-talk interaction', () => {
        const camp = { id: 'camp_meridian', label: 'MERIDIAN' };
        const game = deadlineResolver({
            dayState: createDayState(),
            isGameplayInputActive: () => true,
            player: { position: { x: 0, z: 0 } },
            act2: {},
            getActionableCampAt: () => ({ camp, action: 'talk' }),
            getCampRecord: () => ({ status: 'alive', bond: 0 }),
            talkToLeader: vi.fn(() => true)
        });

        ThreeGame.prototype.interactWithAct2Camp.call(game);

        expect(game.dayState.resolved).toContain('meridian_first_contact');
        expect(game.persistDayCycleState).toHaveBeenCalledOnce();
    });

    it('does not misreport an already-resolved Meridian contact as missed after reload', () => {
        const events = [];
        window.dispatchEvent = (event) => events.push(event);
        const camp = { id: 'camp_meridian', label: 'MERIDIAN' };
        const game = deadlineResolver({
            dayState: { ...createDayState(), resolved: ['meridian_first_contact'] },
            isGameplayInputActive: () => true,
            player: { position: { x: 0, z: 0 } },
            act2: {},
            getActionableCampAt: () => ({ camp, action: 'talk' }),
            getCampRecord: () => ({ status: 'alive', bond: 0 }),
            talkToLeader: vi.fn(() => true),
            showBunkerLine: vi.fn()
        });

        ThreeGame.prototype.interactWithAct2Camp.call(game);

        expect(events.some((event) => event.type === 'camp-first-contact')).toBe(true);
        expect(game.showBunkerLine).not.toHaveBeenCalled();
    });

    it('resolves Vesper last shelter only when the bunker holdout completes', () => {
        const game = deadlineResolver({
            dayState: createDayState(),
            _activeCampQuest: {
                campId: 'camp_vesper',
                quest: { id: 'bunker_holdout', label: 'BUNKER HOLDOUT' },
                props: []
            },
            act2: { completeCampQuest: vi.fn() },
            getCampQuestBondDelta: () => 1,
            getCampById: () => null,
            syncSurvivorContract: vi.fn()
        });

        ThreeGame.prototype.resolveCampQuestCompletion.call(game);

        expect(game.dayState.resolved).toContain('vesper_last_shelter');
        expect(game._activeCampQuest).toBeNull();
    });

    it('resolves Tallow infection choice on warn and rejects it after expiry', () => {
        const camp = { id: 'camp_tallow', label: 'TALLOW', leaderClassId: 'cultist' };
        let record = { status: 'alive', bond: 3 };
        const game = deadlineResolver({
            dayState: createDayState(),
            getCampRecord: () => record,
            syncCampVisualFromRecord: vi.fn(),
            act2: {},
            resolveDayDeadline: ThreeGame.prototype.resolveDayDeadline
        });

        ThreeGame.prototype.resolveCampStatusAction.call(
            game, camp, 'warn', () => { record = { ...record, status: 'recruited' }; }, 'recruited'
        );
        expect(game.dayState.resolved).toContain('tallow_infection_choice');

        record = { status: 'alive', bond: 3 };
        game.dayState = { ...createDayState(), day: 7, expired: ['tallow_infection_choice'] };
        const mutate = vi.fn();
        ThreeGame.prototype.resolveCampStatusAction.call(game, camp, 'latent', mutate, 'recruited');
        expect(mutate).not.toHaveBeenCalled();
        expect(window.dispatchEvent).toBeDefined();
    });

    it('locks the Host Mercy rite after a missed Suture parley', () => {
        const game = deadlineResolver({
            dayState: { ...createDayState(), day: 9, expired: ['hive_suture_parley'] },
            act2: { getState: () => ({ queenStatus: 'hidden' }) }
        });
        const options = ThreeGame.prototype.buildHiveChoiceOptions.call(game, {
            id: 'hive_suture', status: 'wounded', bond: 3, extractionLevel: 1,
            dialogueStage: 0, questFlags: {}, networked: false
        });
        const rite = options.find((option) => option.questId === 'host_mercy');

        expect(rite).toMatchObject({ disabled: true });
        expect(rite.label).toContain('MISSED');
    });
});
