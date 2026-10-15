import { describe, expect, it } from 'vitest';
import {
    FRAGILE_LEDGE_STATE,
    advanceFragileLedgeOccupancy,
    readFragileLedgeState,
    restoreFragileLedgeStates,
    serializeFragileLedgeStates
} from './fragileLedges.js';

describe('fragile ledge lifecycle', () => {
    it('keeps the first traversal solid, then cracks only after the player exits', () => {
        const states = new Map();
        expect(advanceFragileLedgeOccupancy(states, { currentKey: '4,5', now: 0 }).transitions).toEqual([]);
        expect(readFragileLedgeState(states, '4,5').state).toBe(FRAGILE_LEDGE_STATE.SOLID);

        const result = advanceFragileLedgeOccupancy(states, { previousKey: '4,5', currentKey: null, now: 100 });
        expect(result.transitions).toEqual([expect.objectContaining({ state: FRAGILE_LEDGE_STATE.CRACKED })]);
        expect(readFragileLedgeState(states, '4,5').state).toBe(FRAGILE_LEDGE_STATE.CRACKED);
    });

    it('warns on re-entry and collapses only after grace or a safe exit', () => {
        const states = new Map([['4,5', { state: FRAGILE_LEDGE_STATE.CRACKED }]]);
        advanceFragileLedgeOccupancy(states, { currentKey: '4,5', now: 200, warningDurationMs: 700 });
        expect(readFragileLedgeState(states, '4,5')).toEqual({
            state: FRAGILE_LEDGE_STATE.WARNING,
            warningDeadline: 900
        });

        expect(advanceFragileLedgeOccupancy(states, {
            previousKey: '4,5', currentKey: '4,5', now: 899
        }).transitions).toEqual([]);
        expect(advanceFragileLedgeOccupancy(states, {
            previousKey: '4,5', currentKey: '4,5', now: 900
        }).transitions).toEqual([expect.objectContaining({ state: FRAGILE_LEDGE_STATE.COLLAPSED })]);
    });

    it('collapses behind a player who retreats during the warning', () => {
        const states = new Map([['4,5', { state: FRAGILE_LEDGE_STATE.WARNING, warningDeadline: 900 }]]);
        const result = advanceFragileLedgeOccupancy(states, {
            previousKey: '4,5', currentKey: null, now: 400
        });
        expect(result.transitions[0]).toMatchObject({ state: FRAGILE_LEDGE_STATE.COLLAPSED });
    });

    it('persists cracked/collapsed states and restores an in-flight warning as cracked', () => {
        const states = new Map([
            ['1,1', { state: FRAGILE_LEDGE_STATE.SOLID }],
            ['2,2', { state: FRAGILE_LEDGE_STATE.CRACKED }],
            ['3,3', { state: FRAGILE_LEDGE_STATE.WARNING, warningDeadline: 1234 }],
            ['4,4', { state: FRAGILE_LEDGE_STATE.COLLAPSED }]
        ]);
        const restored = restoreFragileLedgeStates(serializeFragileLedgeStates(states));
        expect([...restored.keys()]).toEqual(['2,2', '3,3', '4,4']);
        expect(readFragileLedgeState(restored, '3,3').state).toBe(FRAGILE_LEDGE_STATE.CRACKED);
        expect(readFragileLedgeState(restored, '4,4').state).toBe(FRAGILE_LEDGE_STATE.COLLAPSED);
    });
});
