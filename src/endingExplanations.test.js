import { describe, expect, it } from 'vitest';
import { ACT2_ENDINGS } from './act2.js';
import { explainEnding, formatManifestBlocker } from './endingExplanations.js';

describe('ending causal explanations (Phase 9.3: a player can explain why an ending occurred)', () => {
    it('gives every declared ending a distinct, non-generic explanation', () => {
        const ids = Object.values(ACT2_ENDINGS);
        expect(ids.length).toBeGreaterThanOrEqual(10);

        const explanations = ids.map(explainEnding);
        for (const [index, text] of explanations.entries()) {
            expect(text, ids[index]).toBeTruthy();
            expect(text.length, ids[index]).toBeGreaterThan(20);
        }
        // no two endings share the same explanation text
        expect(new Set(explanations).size).toBe(explanations.length);
    });

    it('falls back to a generic explanation for an unrecognized ending id', () => {
        expect(explainEnding('not_a_real_ending')).toMatch(/complex legacy/i);
    });
});

describe('manifest boarding-blocker explanations', () => {
    it('explains seat capacity with the actual seat counts', () => {
        expect(formatManifestBlocker('seat_capacity_exceeded', { seatsUsed: 5, seatsMax: 4 }))
            .toBe('OVER CAPACITY (5/4 SEATS)');
    });

    it('explains egg-stability blockers in player-readable terms', () => {
        expect(formatManifestBlocker('egg_requires_nahl')).toMatch(/NAHL/);
        expect(formatManifestBlocker('egg_unstable')).toMatch(/QUEEN OR NAHL/);
    });

    it('falls back to a readable label for an unrecognized reason code', () => {
        expect(formatManifestBlocker('some_new_reason_code')).toBe('SOME NEW REASON CODE');
    });
});
