import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { REST_PHASES, createDayState } from './dayCycle.js';

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
