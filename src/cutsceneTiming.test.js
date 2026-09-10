import { describe, expect, it } from 'vitest';
import {
    NATURAL_END_EPSILON, OPENING_TRIM_MAX_SECONDS,
    cutsceneCutoffTime, isOpeningCutscene
} from './cutsceneTiming.js';

describe('isOpeningCutscene', () => {
    it('recognises the opening clip by its known names', () => {
        for (const base of ['DoorIntro', 'DoorIntro_v2', 'class-intro', 'intro']) {
            expect(isOpeningCutscene(base), base).toBe(true);
        }
    });

    it('does not mistake ordinary cutscenes for the opening', () => {
        for (const base of [
            'event-boss-encounter-cybersnail',
            'event-o2-generator-upgraded',
            'event-foundry-discovered',
            'event-queen-encounter',
            ''
        ]) {
            expect(isOpeningCutscene(base), base).toBe(false);
        }
    });
});

describe('cutsceneCutoffTime', () => {
    // The regression this file exists to prevent: every non-opening clip was
    // being cut short, truncating authored content.
    it('plays every non-opening cutscene to its end', () => {
        for (const duration of [2, 8.5, 30]) {
            const cutoff = cutsceneCutoffTime('event-boss-encounter-cybersnail', duration);
            expect(cutoff).toBeCloseTo(duration - NATURAL_END_EPSILON, 5);
            // Never lose more than a frame or two.
            expect(duration - cutoff).toBeLessThan(0.1);
        }
    });

    it('keeps the opening trimmed — it is the only clip that is', () => {
        // Long clip: capped by the absolute ceiling.
        expect(cutsceneCutoffTime('DoorIntro', 30)).toBe(OPENING_TRIM_MAX_SECONDS);
        // Short clip: capped by the fraction, so it never runs the whole thing.
        expect(cutsceneCutoffTime('DoorIntro', 4)).toBeCloseTo(1.6, 5);
        expect(cutsceneCutoffTime('DoorIntro', 4)).toBeLessThan(4);
    });

    it('waits when the duration is not known yet', () => {
        for (const bad of [0, -1, NaN, undefined, null, Infinity]) {
            expect(cutsceneCutoffTime('DoorIntro', bad)).toBeNull();
            expect(cutsceneCutoffTime('event-queen-encounter', bad)).toBeNull();
        }
    });

    it('never returns a negative cutoff for a very short clip', () => {
        expect(cutsceneCutoffTime('event-x', 0.01)).toBeGreaterThanOrEqual(0);
    });
});
