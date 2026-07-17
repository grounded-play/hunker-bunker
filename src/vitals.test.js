import { describe, expect, it } from 'vitest';
import { humanityDecayProgress } from './vitals.js';

describe('humanityDecayProgress', () => {
    it('scales ambient humanity decay with camp stabilizers', () => {
        expect(humanityDecayProgress(12)).toBe(1);
        expect(humanityDecayProgress(12, { multiplier: 0.5 })).toBe(0.5);
        expect(humanityDecayProgress(-4)).toBe(0);
    });
});
