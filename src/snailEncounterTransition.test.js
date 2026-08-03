import { describe, it, expect, vi } from 'vitest';
import { startEncounterTransition, TRANSITION_PATTERNS } from './snailEncounterTransition.js';

describe('snailEncounterTransition', () => {
    it('exports supported transition patterns', () => {
        expect(TRANSITION_PATTERNS).toContain('spiral');
        expect(TRANSITION_PATTERNS).toContain('mosaic');
        expect(TRANSITION_PATTERNS).toContain('diamond');
    });

    it('handles missing or invalid canvas gracefully', () => {
        const onComplete = vi.fn();
        const cancel = startEncounterTransition({ canvas: null, onComplete });
        expect(typeof cancel).toBe('function');
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('runs transition framing with mock canvas and calls onComplete when done', async () => {
        const mockCtx = {
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            closePath: vi.fn()
        };

        const mockCanvas = {
            getContext: vi.fn().mockReturnValue(mockCtx),
            width: 800,
            height: 600,
            style: {}
        };

        const onComplete = vi.fn();

        let currentCallback = null;
        vi.stubGlobal('requestAnimationFrame', (cb) => {
            currentCallback = cb;
            return 1;
        });

        startEncounterTransition({
            canvas: mockCanvas,
            pattern: 'spiral',
            durationMs: 500,
            onComplete
        });

        expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');

        // Step frame 1 (start)
        if (currentCallback) currentCallback(100);
        expect(mockCtx.clearRect).toHaveBeenCalled();

        // Step frame 2 (completion)
        if (currentCallback) currentCallback(800);

        // Fast-forward timeout for opacity animation completion
        await new Promise((r) => setTimeout(r, 100));
        expect(onComplete).toHaveBeenCalled();

        vi.unstubAllGlobals();
    });
});
