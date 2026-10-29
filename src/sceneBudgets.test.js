import { describe, expect, it } from 'vitest';
import { SCENE_BUDGETS, evaluateSceneBudget } from './sceneBudgets.js';

describe('scene budgets', () => {
    it('flags the October 27 PvE scene on both platforms', () => {
        const snapshot = { visibleChunks: 16, drawCalls: 1078, triangles: 4_064_181, programs: 216 };
        expect(evaluateSceneBudget(snapshot).map(({ key }) => key)).toEqual(['visibleChunks', 'drawCalls', 'triangles']);
        expect(evaluateSceneBudget(snapshot, { isSteamDeck: true }).map(({ key }) => key))
            .toEqual(['visibleChunks', 'drawCalls', 'triangles', 'programs']);
    });

    it('holds the Deck tighter than the PC and passes a scene inside budget', () => {
        expect(SCENE_BUDGETS.deck.drawCalls).toBeLessThan(SCENE_BUDGETS.pc.drawCalls);
        expect(evaluateSceneBudget({ visibleChunks: 9, drawCalls: 400, triangles: 900_000, programs: 120 }, { isSteamDeck: true })).toEqual([]);
    });

    it('ignores counters the renderer did not report', () => {
        expect(evaluateSceneBudget({ visibleChunks: null, drawCalls: undefined })).toEqual([]);
    });
});
