import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { REST_PHASES, createDayState } from './dayCycle.js';
import { createFatigueState, recordExpedition } from './fatigue.js';

function installBrowserStubs() {
    const events = [];
    const values = new Map();
    globalThis.CustomEvent = class CustomEvent {
        constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    };
    globalThis.window = { dispatchEvent: (event) => events.push(event) };
    globalThis.localStorage = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value)
    };
    return { events, values };
}

describe('ThreeGame day-cycle runtime bridge', () => {
    beforeEach(() => installBrowserStubs());

    it('persists a camp sleep and opens the safe rest phase on the next day', () => {
        const events = [];
        window.dispatchEvent = (event) => events.push(event);
        const game = {
            dayState: createDayState(),
            setInputEnabled: vi.fn(),
            persistDayCycleState: ThreeGame.prototype.persistDayCycleState
        };

        const started = ThreeGame.prototype.beginCampRest.call(game, {
            id: 'camp_meridian', label: 'MERIDIAN CAMP'
        });

        expect(started).toBe(true);
        expect(game.dayState.day).toBe(2);
        expect(game.dayState.phase).toBe(REST_PHASES.RESTING);
        expect(game.setInputEnabled).toHaveBeenCalledWith(false);
        expect(events.some((event) => event.type === 'day-rest-open')).toBe(true);
        expect(JSON.parse(localStorage.getItem('hb_day_cycle')).day).toBe(2);
    });

    it('moves rest into the authored Foundry interior when it is available', () => {
        const events = [];
        window.dispatchEvent = (event) => events.push(event);
        const game = {
            dayState: createDayState(),
            enterFoundryInterior: vi.fn(() => true),
            setInputEnabled: vi.fn(),
            persistDayCycleState: ThreeGame.prototype.persistDayCycleState
        };

        ThreeGame.prototype.beginCampRest.call(game, { id: 'camp_tallow', label: 'TALLOW' });

        expect(game.enterFoundryInterior).toHaveBeenCalledOnce();
        expect(game.setInputEnabled).toHaveBeenLastCalledWith(false);
        expect(events.find((event) => event.type === 'day-rest-open')?.detail.safeSpace)
            .toBe('foundry-interior');
    });

    it('returns to expedition only when the rest UI closes', () => {
        const game = {
            dayState: { ...createDayState(), day: 4, phase: REST_PHASES.RESTING },
            setInputEnabled: vi.fn(),
            persistDayCycleState: ThreeGame.prototype.persistDayCycleState
        };

        expect(ThreeGame.prototype.finishCampRest.call(game)).toBe(true);
        expect(game.dayState.phase).toBe(REST_PHASES.EXPEDITION);
        expect(game.setInputEnabled).toHaveBeenCalledWith(true);
    });

    it('requires explicit confirmation before sleep closes an unresolved story signal', () => {
        const events = [];
        window.dispatchEvent = (event) => events.push(event);
        const game = {
            dayState: { ...createDayState(), day: 3 },
            setInputEnabled: vi.fn(),
            persistDayCycleState: ThreeGame.prototype.persistDayCycleState,
            beginCampRest: ThreeGame.prototype.beginCampRest
        };

        expect(game.beginCampRest({ id: 'camp_meridian', label: 'MERIDIAN' })).toBe(true);
        expect(game.dayState).toMatchObject({ day: 3, phase: REST_PHASES.EXPEDITION });
        const warning = events.find((event) => event.type === 'day-rest-warning');
        expect(warning.detail.deadlines).toContainEqual(expect.objectContaining({
            id: 'meridian_first_contact', label: 'MERIDIAN FIRST CONTACT'
        }));
        expect(events.some((event) => event.type === 'day-rest-open')).toBe(false);

        warning.detail.onConfirm();

        expect(game.dayState).toMatchObject({ day: 4, phase: REST_PHASES.RESTING });
        expect(game.dayState.expired).toContain('meridian_first_contact');
        expect(events.some((event) => event.type === 'day-rest-open')).toBe(true);
    });

    it('loads and repairs persisted campaign state', () => {
        localStorage.setItem('hb_day_cycle', JSON.stringify({ day: 6, phase: 'broken', restsTaken: 5 }));
        const state = ThreeGame.prototype.loadDayCycleState.call({});
        expect(state.day).toBe(6);
        expect(state.phase).toBe(REST_PHASES.EXPEDITION);
        expect(state.restsTaken).toBe(5);
    });
});

describe('sleeping moves the sky, and one rule governs every bed', () => {
    beforeEach(() => installBrowserStubs());

    // The two clocks used to be unrelated: timeOfDay is a short visual loop and
    // dayState.day is the campaign day, so a night's sleep left the sky
    // wherever it happened to be.
    it('pins the sky to morning when the day advances', () => {
        const game = {
            dayState: createDayState(),
            timeOfDay: 0.87, // deep night when the player bedded down
            setInputEnabled: vi.fn(),
            updateSky: vi.fn(),
            updateDayNightCycle: vi.fn(),
            persistDayCycleState: ThreeGame.prototype.persistDayCycleState,
            setTimeOfDayToMorning: ThreeGame.prototype.setTimeOfDayToMorning
        };

        ThreeGame.prototype.beginCampRest.call(game, { id: 'camp_tallow', label: 'TALLOW' });

        expect(game.dayState.day).toBe(2);
        expect(game.timeOfDay).toBeGreaterThan(0.15);
        expect(game.timeOfDay).toBeLessThan(0.45);
        // Recomputed at once, so the morning is on screen as the overlay lifts.
        expect(game.updateSky).toHaveBeenCalled();
        expect(game.updateDayNightCycle).toHaveBeenCalled();
    });

    it('asks dayCycle for permission rather than an inline Act 2 gate', () => {
        const game = { dayState: createDayState(), _activeCampQuest: null };
        const allowed = ThreeGame.prototype.canRestAt.call(game, { id: 'camp_vesper' }, { status: 'alive' });
        expect(allowed.allowed).toBe(true);
        expect(allowed.nextDay).toBe(2);

        // A live contract at the site is the one story reason rest is withheld.
        const busy = { dayState: createDayState(), _activeCampQuest: { id: 'quest' } };
        expect(ThreeGame.prototype.canRestAt.call(busy, { id: 'camp_vesper' }, { status: 'alive' }).allowed).toBe(false);

        // A dead or robbed site is not a bed.
        const robbed = { dayState: createDayState(), _activeCampQuest: null };
        expect(ThreeGame.prototype.canRestAt.call(robbed, { id: 'camp_vesper' }, { status: 'robbed' }).allowed).toBe(false);
    });
});

describe('fatigue runtime wiring', () => {
    beforeEach(() => installBrowserStubs());

    const gameWith = (fatigueState) => ({
        fatigueState,
        persistFatigueState: ThreeGame.prototype.persistFatigueState,
        recordExpeditionEnded: ThreeGame.prototype.recordExpeditionEnded
    });

    it('counts an ended expedition and persists it under its own key', () => {
        const game = gameWith(createFatigueState());
        game.recordExpeditionEnded();
        expect(game.fatigueState.expeditionsSinceSleep).toBe(1);
        expect(JSON.parse(localStorage.getItem('hb_fatigue')).expeditionsSinceSleep).toBe(1);
        // The campaign day is untouched: only sleeping moves the clock.
        expect(localStorage.getItem('hb_day_cycle')).toBe(null);
    });

    it('announces the stage so the HUD can read it without owning it', () => {
        const events = [];
        window.dispatchEvent = (event) => events.push(event);
        const game = gameWith(createFatigueState());
        game.recordExpeditionEnded();
        const change = events.find((event) => event.type === 'fatigue-changed');
        expect(change).toBeTruthy();
        expect(change.detail.stageId).toBe('ALERT');
    });

    it('clears the ladder on sleep and reports the scar the night cost', () => {
        const events = [];
        window.dispatchEvent = (event) => events.push(event);
        let fatigueState = createFatigueState();
        for (let i = 0; i < 4; i += 1) fatigueState = recordExpedition(fatigueState);

        const game = {
            dayState: createDayState(),
            fatigueState,
            setInputEnabled: vi.fn(),
            persistDayCycleState: ThreeGame.prototype.persistDayCycleState,
            persistFatigueState: ThreeGame.prototype.persistFatigueState
        };
        ThreeGame.prototype.beginCampRest.call(game, { id: 'camp_tallow', label: 'TALLOW' });

        expect(game.fatigueState.expeditionsSinceSleep).toBe(0);
        expect(game.fatigueState.scars.length).toBe(1);
        const restOpen = events.find((event) => event.type === 'day-rest-open');
        expect(restOpen.detail.gainedScar).toBe(game.fatigueState.scars[0].id);
    });

    it('leaves no scar when the operator slept before it got bad', () => {
        const events = [];
        window.dispatchEvent = (event) => events.push(event);
        const game = {
            dayState: createDayState(),
            fatigueState: recordExpedition(createFatigueState()),
            setInputEnabled: vi.fn(),
            persistDayCycleState: ThreeGame.prototype.persistDayCycleState,
            persistFatigueState: ThreeGame.prototype.persistFatigueState
        };
        ThreeGame.prototype.beginCampRest.call(game, { id: 'camp_meridian', label: 'MERIDIAN' });
        expect(game.fatigueState.scars).toEqual([]);
        expect(events.find((event) => event.type === 'day-rest-open').detail.gainedScar).toBe(null);
    });
});
