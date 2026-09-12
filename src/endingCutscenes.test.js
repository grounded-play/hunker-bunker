import { describe, expect, it } from 'vitest';
import { ACT2_ENDINGS, } from './act2Endings.js';
import { ACT2_ENDING_CUTSCENES, ACT2_ENDING_CUTSCENE_FALLBACKS, resolveEndingCutscene } from './act2.js';

/** The five cutscenes that actually exist in public/cutscenes today. */
const SHIPPED = [
    'ending-fullbrood', 'ending-cleanescape', 'ending-mixedcrew',
    'ending-carriersbargain', 'ending-scorchedsky', 'act3-departure'
];

describe('ending cutscene resolution', () => {
    it('every ending resolves to a video that exists', () => {
        // The gap this closes: five endings mapped to unproduced assets, and
        // playCutsceneVideo fails silently, so they played nothing at all.
        for (const ending of Object.values(ACT2_ENDINGS)) {
            const { base } = resolveEndingCutscene(ending, { availableBases: SHIPPED });
            expect(SHIPPED, `${ending} resolved to missing asset ${base}`).toContain(base);
        }
    });

    it('prefers the bespoke cutscene when it exists', () => {
        const r = resolveEndingCutscene(ACT2_ENDINGS.FULL_BROOD, { availableBases: SHIPPED });
        expect(r).toEqual({ base: 'ending-fullbrood', isFallback: false });
    });

    it('reports when it had to substitute, so gaps stay visible', () => {
        const r = resolveEndingCutscene(ACT2_ENDINGS.ALIEN_EXODUS, { availableBases: SHIPPED });
        expect(r.isFallback).toBe(true);
        expect(r.base).not.toBe('act3-departure');
    });

    it('falls all the way back for an unknown ending rather than throwing', () => {
        expect(resolveEndingCutscene('not_an_ending', { availableBases: SHIPPED }))
            .toEqual({ base: 'act3-departure', isFallback: true });
    });

    it('only maps fallbacks for endings that lack a bespoke asset', () => {
        for (const ending of Object.keys(ACT2_ENDING_CUTSCENE_FALLBACKS)) {
            expect(SHIPPED).not.toContain(ACT2_ENDING_CUTSCENES[ending]);
        }
    });
});
