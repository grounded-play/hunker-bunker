import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { playPropDebrisImpact, PROP_DEBRIS_MIN_GAP_MS } from './enemyGibs.js';

let played;
beforeEach(() => {
    played = [];
    globalThis.window = { AudioManager: { playMetalStress: (o) => played.push(o) } };
});
afterEach(() => { delete globalThis.window; });

const sprite = { position: { x: 4, y: 0, z: -2 } };

describe('prop debris impact audio', () => {
    it('plays positionally through the game helper', () => {
        const game = { audioAt: (x, z, extra) => ({ ...extra, worldX: x, worldZ: z, obstructed: false }) };
        expect(playPropDebrisImpact(game, sprite)).toBe(true);
        expect(played[0]).toMatchObject({ worldX: 4, worldZ: -2 });
    });

    it('carries the rate limit, so a destroyed crate stack is not a wall of noise', () => {
        playPropDebrisImpact({}, sprite);
        expect(played[0].minGapMs).toBe(PROP_DEBRIS_MIN_GAP_MS);
        expect(played[0].force).toBe(false);
    });

    it('varies pitch so repeated impacts do not sound cloned', () => {
        for (let i = 0; i < 12; i += 1) playPropDebrisImpact({}, sprite);
        const rates = new Set(played.map((o) => o.playbackRate));
        expect(rates.size).toBeGreaterThan(1);
        for (const r of rates) expect(r).toBeGreaterThanOrEqual(0.85);
    });

    it('still plays when the game has no audioAt, for headless callers', () => {
        expect(playPropDebrisImpact({}, sprite)).toBe(true);
        expect(played[0].worldX).toBeUndefined();
    });

    it('is inert when AudioManager is absent rather than throwing', () => {
        globalThis.window = {};
        expect(playPropDebrisImpact({}, sprite)).toBe(false);
    });
});
