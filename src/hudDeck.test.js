import { describe, expect, it } from 'vitest';
import { planDeckVisibility } from './hudDeck.js';

// Playthrough 2026-10-07: "the second one is having its lower part cropped".
// The docked deck is capped in height; a card either fits whole or waits.
describe('the docked popup deck never crops a card', () => {
    it('shows whole cards while they fit, and queues the rest', () => {
        expect(planDeckVisibility([98, 108, 129], 176)).toEqual([true, false, false]);
        expect(planDeckVisibility([60, 70, 40], 176)).toEqual([true, true, true]);
        expect(planDeckVisibility([60, 130, 40], 176)).toEqual([true, false, false]);
    });

    it('always shows the top card, even one taller than the cap', () => {
        expect(planDeckVisibility([240, 50], 176)).toEqual([true, false]);
    });

    it('counts the gap between cards', () => {
        expect(planDeckVisibility([80, 80], 170, { gap: 6 })).toEqual([true, true]);
        expect(planDeckVisibility([85, 85], 170, { gap: 6 })).toEqual([true, false]);
    });
});
