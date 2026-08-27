import { describe, expect, it } from 'vitest';
import { createFreshRunEntropy, mixRunEntropy } from './runEntropy.js';

describe('run entropy', () => {
    it('mixes sequence into otherwise identical launches', () => {
        const first = mixRunEntropy(123, 456, 1);
        const second = mixRunEntropy(123, 456, 2);
        expect(first).not.toBe(second);
        expect(first).toBeGreaterThan(0);
        expect(second).toBeGreaterThan(0);
    });

    it('creates a non-zero world seed for each deployment', () => {
        const seeds = new Set(Array.from({ length: 8 }, () => createFreshRunEntropy()));
        expect(seeds.size).toBe(8);
        expect([...seeds].every((seed) => seed > 0)).toBe(true);
    });

    it('never repeats the explicitly supplied previous deployment seed', () => {
        let previous = createFreshRunEntropy();
        for (let i = 0; i < 32; i += 1) {
            const next = createFreshRunEntropy(previous);
            expect(next).not.toBe(previous);
            previous = next;
        }
    });
});
