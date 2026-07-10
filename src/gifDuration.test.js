import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { gifDurationFromBytes } from './gifDuration.js';

describe('gifDurationFromBytes', () => {
    it('reads real durations from the class intro gifs', () => {
        for (const file of ['Scout.Intro.gif', 'Tank.Intro.gif', 'Eng.Intro.gif']) {
            const bytes = new Uint8Array(readFileSync(new URL(`../public/${file}`, import.meta.url)));
            const ms = gifDurationFromBytes(bytes);
            expect(ms, file).toBeGreaterThan(500);
            expect(ms, file).toBeLessThan(60000);
        }
    });

    it('returns null for garbage and static inputs', () => {
        expect(gifDurationFromBytes(null)).toBeNull();
        expect(gifDurationFromBytes(new Uint8Array([1, 2, 3]))).toBeNull();
        expect(gifDurationFromBytes(new Uint8Array(200))).toBeNull();
    });
});
