import { describe, expect, it } from 'vitest';
import {
    REST_PHASES, STORY_DEADLINES, DIFFICULTY_CAP,
    createDayState, normalizeDayState, difficultyForDay, threatScaleForDay,
    beginSleep, completeRest, beginExpedition, resolveDeadline,
    openDeadlines, deadlinesClosingTonight
} from './dayCycle.js';

const sleepThrough = (state) => completeRest(beginSleep(state).state).state;

describe('difficulty curve', () => {
    it('starts at 1.0 on day one, so day one is the baseline', () => {
        expect(difficultyForDay(1)).toBe(1);
    });

    it('rises with the day', () => {
        expect(difficultyForDay(5)).toBeGreaterThan(difficultyForDay(2));
    });

    it('caps, so the campaign never reaches an unplayable day', () => {
        expect(difficultyForDay(500)).toBe(DIFFICULTY_CAP);
    });

    it('treats nonsense days as day one rather than going negative', () => {
        expect(difficultyForDay(-9)).toBe(1);
        expect(difficultyForDay(undefined)).toBe(1);
    });
});

describe('threat scale', () => {
    it('multiplies the existing depth scale rather than replacing it', () => {
        const deep = { hp: 1.5, speed: 1.2 };
        expect(threatScaleForDay(10, deep).hp).toBeGreaterThan(deep.hp);
    });

    it('scales speed more gently than hp, since an enemy that outruns you is unfair', () => {
        const s = threatScaleForDay(20, { hp: 1, speed: 1 });
        expect(s.speed).toBeLessThan(s.hp);
    });
});

describe('the cycle', () => {
    it('runs expedition -> sleeping -> resting -> expedition, advancing one day', () => {
        let state = createDayState();
        expect(state.day).toBe(1);
        const slept = beginSleep(state);
        expect(slept.started).toBe(true);
        const rested = completeRest(slept.state);
        expect(rested.advanced).toBe(true);
        expect(rested.state.day).toBe(2);
        expect(beginExpedition(rested.state).state.phase).toBe(REST_PHASES.EXPEDITION);
    });

    it('refuses a second sleep, which would advance the day twice', () => {
        const first = beginSleep(createDayState());
        expect(beginSleep(first.state).started).toBe(false);
    });

    it('refuses to complete a rest that never started', () => {
        expect(completeRest(createDayState()).advanced).toBe(false);
    });

    it('counts rests taken', () => {
        let state = createDayState();
        for (let i = 0; i < 3; i += 1) state = beginExpedition(sleepThrough(state)).state;
        expect(state.restsTaken).toBe(3);
        expect(state.day).toBe(4);
    });
});

describe('story deadlines', () => {
    it('warns which beats close if you sleep tonight', () => {
        const state = { ...createDayState(), day: 3 };
        expect(deadlinesClosingTonight(state).map((d) => d.id)).toContain('meridian_first_contact');
    });

    it('expires a missed beat exactly once, on the day it closes', () => {
        let state = { ...createDayState(), day: 3 };
        const rested = completeRest(beginSleep(state).state);
        expect(rested.expired).toContain('meridian_first_contact');
        // Sleeping again must not re-expire it.
        const again = completeRest(beginSleep(beginExpedition(rested.state).state).state);
        expect(again.expired).not.toContain('meridian_first_contact');
    });

    it('a resolved beat never expires, however long the campaign runs', () => {
        let state = resolveDeadline(createDayState(), 'meridian_first_contact').state;
        for (let i = 0; i < 12; i += 1) state = beginExpedition(sleepThrough(state)).state;
        expect(state.expired).not.toContain('meridian_first_contact');
        expect(state.resolved).toContain('meridian_first_contact');
    });

    it('keeps resolved and expired apart, since they explain different outcomes', () => {
        let state = { ...createDayState(), day: 3 };
        state = resolveDeadline(state, 'tallow_infection_choice').state;
        const rested = completeRest(beginSleep(state).state);
        expect(rested.state.resolved).toContain('tallow_infection_choice');
        expect(rested.state.expired).toContain('meridian_first_contact');
    });

    it('reports what is still open on the current day', () => {
        const open = openDeadlines({ ...createDayState(), day: 1 });
        expect(open.length).toBe(STORY_DEADLINES.length);
    });

    it('ignores an unknown deadline id rather than inventing one', () => {
        expect(resolveDeadline(createDayState(), 'not_a_beat').resolved).toBe(false);
    });
});

describe('state normalisation', () => {
    it('repairs corrupt saved state instead of trusting it', () => {
        const s = normalizeDayState({ day: -5, phase: 'nonsense', resolved: 'no', restsTaken: 'x' });
        expect(s.day).toBe(1);
        expect(s.phase).toBe(REST_PHASES.EXPEDITION);
        expect(s.resolved).toEqual([]);
        expect(s.restsTaken).toBe(0);
    });

    it('survives a missing save entirely', () => {
        expect(normalizeDayState(null).day).toBe(1);
    });
});
