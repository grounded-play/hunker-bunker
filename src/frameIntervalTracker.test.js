import { describe, expect, it } from 'vitest';
import { createFrameIntervalTracker } from './frameIntervalTracker.js';

describe('createFrameIntervalTracker', () => {
    it('reports actual presented-frame percentiles separately per profile', () => {
        const tracker = createFrameIntervalTracker();
        [0, 10, 30, 60, 100].forEach((time) => tracker.record('gameplay', time));
        [0, 33, 66].forEach((time) => tracker.record('menu', time));

        expect(tracker.snapshot().profiles.gameplay).toMatchObject({
            observedIntervals: 4,
            retainedIntervals: 4,
            averageMs: 25,
            p50Ms: 20,
            p95Ms: 40,
            p99Ms: 40,
            maxMs: 40
        });
        expect(tracker.snapshot().profiles.menu).toMatchObject({
            observedIntervals: 2,
            p95Ms: 33,
            maxMs: 33
        });
    });

    it('uses a bounded rolling window and reports overwritten samples', () => {
        const tracker = createFrameIntervalTracker({ maxSamplesPerProfile: 2 });
        [0, 10, 30, 60].forEach((time) => tracker.record('gameplay', time));

        expect(tracker.snapshot().profiles.gameplay).toMatchObject({
            observedIntervals: 3,
            retainedIntervals: 2,
            overwrittenIntervals: 1,
            p50Ms: 20,
            p99Ms: 30
        });
    });

    it('can reset one profile without discarding the others', () => {
        const tracker = createFrameIntervalTracker();
        tracker.record('gameplay', 0);
        tracker.record('gameplay', 16);
        tracker.record('menu', 0);
        tracker.record('menu', 33);
        tracker.reset('gameplay');

        const snapshot = tracker.snapshot();
        expect(snapshot.profiles.gameplay).toBeUndefined();
        expect(snapshot.profiles.menu.observedIntervals).toBe(1);
    });

    it('does not count time spent in another performance profile', () => {
        const tracker = createFrameIntervalTracker();
        tracker.record('gameplay', 0);
        tracker.record('gameplay', 16);
        tracker.record('menu', 1_000);
        tracker.record('menu', 1_033);
        tracker.record('gameplay', 5_000);
        tracker.record('gameplay', 5_020);

        expect(tracker.snapshot().profiles.gameplay).toMatchObject({
            observedIntervals: 2,
            segments: 2,
            p95Ms: 20
        });
    });
});
