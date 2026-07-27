import { describe, expect, it } from 'vitest';
import { cappedPixelRatio } from './renderScale.js';

describe('cappedPixelRatio', () => {
    it('keeps the requested DPR when the framebuffer is within budget', () => {
        expect(cappedPixelRatio({
            width: 1600,
            height: 1000,
            devicePixelRatio: 1.25,
            maxFramebufferPixels: 5_000_000
        })).toBe(1.25);
    });

    it('reduces fullscreen 4K rendering to the framebuffer budget', () => {
        const ratio = cappedPixelRatio({
            width: 3840,
            height: 2160,
            devicePixelRatio: 2,
            maxFramebufferPixels: 5_000_000
        });
        expect(ratio).toBeCloseTo(Math.sqrt(5_000_000 / (3840 * 2160)));
    });

    it('never returns an unusably small scale', () => {
        expect(cappedPixelRatio({
            width: 7680,
            height: 4320,
            maxFramebufferPixels: 1
        })).toBe(0.65);
    });
});
