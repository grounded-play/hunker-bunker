import { describe, expect, it, vi } from 'vitest';
import { compactPerformanceSnapshot, createLongTaskReporter } from './longTaskDiagnostics.js';

describe('long-task diagnostics', () => {
    it('keeps only bounded scalar performance context', () => {
        const compact = compactPerformanceSnapshot({
            profile: 'gameplay', drawCalls: 12,
            frameIntervals: { profiles: { gameplay: { p95Ms: 30, samples: 4000 } } },
            gpuMemory: { estimatedBytes: 10, texturesByUrl: Array(500).fill('large') },
            hardware: { isSteamDeck: true, renderer: { huge: true } },
            giantSceneGraph: Array(500).fill({})
        });
        expect(compact).toMatchObject({
            profile: 'gameplay', drawCalls: 12,
            frameIntervals: { p95Ms: 30, samples: 4000 },
            gpuMemory: { estimatedBytes: 10 },
            hardware: { isSteamDeck: true }
        });
        expect(compact).not.toHaveProperty('giantSceneGraph');
        expect(compact.gpuMemory).not.toHaveProperty('texturesByUrl');
    });

    it('aggregates reports to at most one per interval', () => {
        let clock = 0;
        const emit = vi.fn();
        const report = createLongTaskReporter({ emit, now: () => clock, intervalMs: 1000 });
        expect(report({ duration: 70, startTime: 10 })).toBe(true);
        clock = 100;
        expect(report({ duration: 80, startTime: 100 })).toBe(false);
        clock = 1100;
        expect(report({ duration: 120, startTime: 1100 })).toBe(true);
        expect(emit).toHaveBeenCalledTimes(2);
        expect(emit.mock.calls[1][1]).toMatchObject({ taskCount: 2, totalDurationMs: 200, maxDurationMs: 120 });
    });
});
