import { describe, expect, it } from 'vitest';
import { createXpAggregator, selectXpSound } from './xpFeedback.js';

function aggregatorAt(clock) {
    return createXpAggregator({ windowMs: 900, now: () => clock.t });
}

describe('createXpAggregator', () => {
    it('coalesces gains inside the window into one burst', () => {
        const clock = { t: 0 };
        const xp = aggregatorAt(clock);

        xp.add(5);
        clock.t = 300;
        const burst = xp.add(7);

        expect(burst.amount).toBe(12);
        expect(burst.events).toBe(2);
    });

    it('starts a new burst once the window has passed', () => {
        const clock = { t: 0 };
        const xp = aggregatorAt(clock);

        xp.add(5);
        clock.t = 1200;
        const burst = xp.add(7);

        expect(burst.amount).toBe(7);
        expect(burst.events).toBe(1);
    });

    it('drops the pending burst when the run ends or a blocking menu opens', () => {
        const clock = { t: 0 };
        const xp = aggregatorAt(clock);

        xp.add(5);
        xp.cancel();
        clock.t = 100;
        const burst = xp.add(7);

        expect(burst.amount).toBe(7);
        expect(burst.events).toBe(1);
    });

    it('reports whether anything is pending, so the UI can stay hidden at rest', () => {
        const clock = { t: 0 };
        const xp = aggregatorAt(clock);

        expect(xp.isPending()).toBe(false);
        xp.add(5);
        expect(xp.isPending()).toBe(true);
        xp.cancel();
        expect(xp.isPending()).toBe(false);
    });

    it('flushPending hands over the burst and clears it, so it cannot fire twice', () => {
        const clock = { t: 0 };
        const xp = aggregatorAt(clock);

        xp.add(4);
        xp.add(6);

        expect(xp.flushPending()).toMatchObject({ amount: 10, events: 2 });
        expect(xp.flushPending()).toBe(null);
        expect(xp.isPending()).toBe(false);
    });
});

describe('selectXpSound', () => {
    it('uses the level-up sting when a tier was crossed', () => {
        expect(selectXpSound({ leveledUp: true })).toBe('xp_levelup');
    });

    it('uses the bonus sting for a bonus award', () => {
        expect(selectXpSound({ bonus: true })).toBe('xp_bonus');
    });

    it('uses the ordinary tick otherwise', () => {
        expect(selectXpSound({})).toBe('xp_tick');
    });

    it('ranks a level-up above a bonus when both happen at once', () => {
        expect(selectXpSound({ leveledUp: true, bonus: true })).toBe('xp_levelup');
    });
});
