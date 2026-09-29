import { describe, expect, it } from 'vitest';
import {
    REST_PHASES, STORY_DEADLINES, DIFFICULTY_CAP,
    createDayState, normalizeDayState, difficultyForDay, threatScaleForDay,
    beginSleep, completeRest, beginExpedition, resolveDeadline,
    openDeadlines, deadlinesClosingTonight, canRestNow,
    formatDayCycleViewModel, getDayFactorFromTimeOfDay, getSolarTimeFromTimeOfDay,
    getNextLightTransition
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

describe('deadline enforcement (regressions)', () => {
    it('refuses to resolve a beat whose day has already passed', () => {
        // Expiry only ran at rest, so a beat past its day but not yet slept
        // through was still resolvable -- which defeats the deadline entirely.
        const late = resolveDeadline({ ...createDayState(), day: 99 }, 'meridian_first_contact');
        expect(late.resolved).toBe(false);
        expect(late.reason).toBe('deadline passed');
    });

    it('still allows resolving on the last available day', () => {
        // closesOnDay 4 means days 1-3; day 3 must still work or the boundary
        // is off by one and quietly eats a day of content.
        expect(resolveDeadline({ ...createDayState(), day: 3 }, 'meridian_first_contact').resolved).toBe(true);
    });

    it('drops unknown ids from a loaded save instead of trusting them', () => {
        // A renamed or removed beat would otherwise linger forever, and a
        // corrupt save could mark a beat resolved that never existed --
        // silently unlocking or locking an ending.
        const s = normalizeDayState({ resolved: ['not_a_beat', 'meridian_first_contact'], expired: ['gone'] });
        expect(s.resolved).toEqual(['meridian_first_contact']);
        expect(s.expired).toEqual([]);
    });

    it('deduplicates repeated ids in a save', () => {
        const s = normalizeDayState({ resolved: ['meridian_first_contact', 'meridian_first_contact'] });
        expect(s.resolved).toEqual(['meridian_first_contact']);
    });
});

describe('canRestNow — the single rest rule', () => {
    it('allows rest in a safe space while on expedition', () => {
        const result = canRestNow(createDayState(), { safeSpace: true });
        expect(result.allowed).toBe(true);
        expect(result.nextDay).toBe(2);
    });

    it('refuses outside a safe space, mid-rest, near hostiles, or at a dead site', () => {
        expect(canRestNow(createDayState(), { safeSpace: false }).reason).toBe('not_a_safe_space');
        expect(canRestNow(beginSleep(createDayState()).state, { safeSpace: true }).reason).toBe('already_resting');
        expect(canRestNow(createDayState(), { safeSpace: true, hostileNearby: true }).reason).toBe('hostiles_nearby');
        expect(canRestNow(createDayState(), { safeSpace: true, siteStatus: 'robbed' }).reason).toBe('site_robbed');
    });

    it('withholds rest only while a contract at this site is live', () => {
        expect(canRestNow(createDayState(), { safeSpace: true, hasActiveQuest: true }).allowed).toBe(false);
        expect(canRestNow(createDayState(), { safeSpace: true, hasActiveQuest: false }).allowed).toBe(true);
    });

    // The gate must not depend on Act 2 camp phases: that is what made the
    // SLEEP verb unreachable in ordinary play.
    it('does not care which act or camp phase the world is in', () => {
        const base = createDayState();
        for (const siteStatus of ['alive', undefined, null]) {
            expect(canRestNow(base, { safeSpace: true, siteStatus }).allowed).toBe(true);
        }
    });
});

describe('day cycle view-model and presentation contract', () => {
    it('computes daytime solar calculations at noon and midnight', () => {
        expect(getDayFactorFromTimeOfDay(0.5)).toBeCloseTo(1, 5); // noon = full light
        expect(getDayFactorFromTimeOfDay(0)).toBeCloseTo(0, 5); // midnight = full dark
        expect(getSolarTimeFromTimeOfDay(0.5)).toBe('12:00');
        expect(getSolarTimeFromTimeOfDay(0.75)).toBe('18:00');
        expect(getSolarTimeFromTimeOfDay(0)).toBe('00:00');
    });

    it('predicts the next light transition and countdown accurately', () => {
        // At 0.5 (noon, day), next transition is dusk at 0.75 (cycleFraction = 0.25).
        // With dayCycleSeconds = 600, transitionSeconds = 150 (2m 30s).
        const duskTransition = getNextLightTransition(0.5, 600);
        expect(duskTransition.isDaylight).toBe(true);
        expect(duskTransition.nextPhase).toBe('DUSK');
        expect(duskTransition.transitionSeconds).toBe(150);
        expect(duskTransition.transitionCountdown).toBe('02:30');

        // At 0.8 (night), next transition is dawn at 0.25 (cycleFraction = 0.45).
        // With dayCycleSeconds = 600, transitionSeconds = 270 (4m 30s).
        const dawnTransition = getNextLightTransition(0.8, 600);
        expect(dawnTransition.isDaylight).toBe(false);
        expect(dawnTransition.nextPhase).toBe('DAWN');
        expect(dawnTransition.transitionSeconds).toBe(270);
        expect(dawnTransition.transitionCountdown).toBe('04:30');
    });

    it('formats a complete day cycle view-model preserving campaign day vs solar time separation', () => {
        const dayState = { day: 5, phase: REST_PHASES.EXPEDITION };
        const vm = formatDayCycleViewModel({
            dayState,
            timeOfDay: 0.5,
            dayCycleSeconds: 150
        });

        expect(vm.campaignDay).toBe(5);
        expect(vm.campaignState).toBe('EXPEDITION');
        expect(vm.isDaylight).toBe(true);
        expect(vm.solarTime).toBe('12:00');
        expect(vm.clockLabel).toBe('12:00 · DAY');
        expect(vm.cycleProgress).toBeCloseTo(0.5, 5);
        expect(vm.nextPhase).toBe('DUSK');
        expect(vm.transitionCountdown).toBe('00:38'); // 0.25 * 150 = 37.5s -> 38s
    });
});
