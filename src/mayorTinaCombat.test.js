import { describe, expect, it } from 'vitest';
import { TINA_TOTAL_HITS, registerTinaHit, isTinaHostile } from './mayorTinaCombat.js';

const fresh = () => ({ phase: 'idle', mayorRoot: {} });

describe('registerTinaHit', () => {
    it('takes four hits in total to kill her', () => {
        // "shoot Tina, they start to attack after a warning, then you kill them
        // after 3 more hits" -- one warning shot plus three.
        const e = fresh();
        const outcomes = [];
        for (let i = 0; i < TINA_TOTAL_HITS; i++) outcomes.push(registerTinaHit(e).outcome);
        expect(outcomes).toEqual(['warning', 'damaged', 'damaged', 'killed']);
    });

    it('turns her hostile on the first hit, not on death', () => {
        const e = fresh();
        expect(isTinaHostile(e)).toBe(false);
        const first = registerTinaHit(e);
        expect(first.outcome).toBe('warning');
        expect(first.hostile).toBe(true);
        expect(isTinaHostile(e)).toBe(true);
    });

    it('the first hit still lands damage', () => {
        // A pure warning shot that costs nothing reads as the game ignoring
        // the player's input.
        const e = fresh();
        const first = registerTinaHit(e);
        expect(first.hitsRemaining).toBe(TINA_TOTAL_HITS - 1);
    });

    it('reports the kill exactly once however many extra shots land', () => {
        const e = fresh();
        for (let i = 0; i < TINA_TOTAL_HITS; i++) registerTinaHit(e);
        const after = registerTinaHit(e);
        expect(after.outcome).toBe('ignored');
        expect(after.hitsRemaining).toBe(0);
    });

    it('ignores hits once she is already dead', () => {
        const e = fresh();
        for (let i = 0; i < TINA_TOTAL_HITS + 3; i++) registerTinaHit(e);
        expect(e.tinaDead).toBe(true);
    });

    it('ignores hits when there is no encounter or no model present', () => {
        expect(registerTinaHit(null).outcome).toBe('ignored');
        expect(registerTinaHit({ phase: 'idle' }).outcome).toBe('ignored');
    });

    it('counts down monotonically', () => {
        const e = fresh();
        let last = TINA_TOTAL_HITS;
        for (let i = 0; i < TINA_TOTAL_HITS; i++) {
            const r = registerTinaHit(e);
            expect(r.hitsRemaining).toBeLessThan(last);
            last = r.hitsRemaining;
        }
        expect(last).toBe(0);
    });
});
