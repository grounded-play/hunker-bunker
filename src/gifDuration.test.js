import { describe, it, expect } from 'vitest';

import { gifDurationFromBytes } from './gifDuration.js';

describe('gifDurationFromBytes', () => {
    it('calculates duration correctly from valid gif blocks', () => {
        const bytes = new Uint8Array([
            0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0, 0, // header
            0x21, 0xF9, 0x04, 0x00, 0x32, 0x00, 0x00, 0x00, // frame 1 (50)
            0x21, 0xF9, 0x04, 0x00, 0x14, 0x00, 0x00, 0x00, // frame 2 (20)
            0x3B // trailer
        ]);
        const ms = gifDurationFromBytes(bytes);
        expect(ms).toBe(700);
    });

    it('returns null for garbage and static inputs', () => {
        expect(gifDurationFromBytes(null)).toBeNull();
        expect(gifDurationFromBytes(new Uint8Array([1, 2, 3]))).toBeNull();
        expect(gifDurationFromBytes(new Uint8Array(200))).toBeNull();
    });
});
