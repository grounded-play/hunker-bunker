import { describe, expect, it } from 'vitest';
import { advanceHitStop, extendHitStop, HIT_STOP_PRESETS } from './hitStop.js';

describe('hit-stop rules (the one freeze: ThreeGame.hitstopTimer)', () => {
    it('keeps the feel the game shipped with', () => {
        expect(HIT_STOP_PRESETS).toEqual({ HIT_CONFIRM: 60, KILL: 45, BOSS_KILL: 90 });
    });

    it('never shortens a freeze that is already running', () => {
        expect(extendHitStop(60, HIT_STOP_PRESETS.KILL)).toBe(60);
        expect(extendHitStop(10, HIT_STOP_PRESETS.KILL)).toBe(45);
        expect(extendHitStop(0, HIT_STOP_PRESETS.BOSS_KILL)).toBe(90);
        expect(extendHitStop(undefined, 30)).toBe(30);
        expect(extendHitStop(Number.NaN, -5)).toBe(0);
    });

    it('runs out on wall-clock time and never goes negative', () => {
        expect(advanceHitStop(60, 16.7)).toBeCloseTo(43.3);
        expect(advanceHitStop(10, 16.7)).toBe(0);
        expect(advanceHitStop(0, 16.7)).toBe(0);
    });
});
