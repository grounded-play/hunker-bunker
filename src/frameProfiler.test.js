import { describe, expect, it } from 'vitest';
import { createFrameProfiler } from './frameProfiler.js';

describe('createFrameProfiler', () => {
    it('is inert until enabled so shipping frames pay no measurement cost', () => {
        const profiler = createFrameProfiler();
        let ran = 0;
        profiler.measure('updatePickups', () => { ran += 1; });
        expect(ran).toBe(1);
        expect(profiler.snapshot()).toBeNull();
    });

    it('accumulates per-section totals, call counts and worst frame once enabled', () => {
        let clock = 0;
        const profiler = createFrameProfiler({ now: () => clock });
        profiler.enable();

        profiler.beginFrame();
        profiler.measure('updatePickups', () => { clock += 4; });
        profiler.measure('updateScatter', () => { clock += 1; });
        profiler.endFrame();

        profiler.beginFrame();
        profiler.measure('updatePickups', () => { clock += 10; });
        profiler.endFrame();

        const snap = profiler.snapshot();
        expect(snap.frames).toBe(2);
        const pickups = snap.sections.find((s) => s.name === 'updatePickups');
        expect(pickups).toMatchObject({ calls: 2, totalMs: 14, maxMs: 10 });
        expect(pickups.avgMsPerFrame).toBe(7);
    });

    it('ranks sections by total cost so the worst offender reads first', () => {
        let clock = 0;
        const profiler = createFrameProfiler({ now: () => clock });
        profiler.enable();
        profiler.beginFrame();
        profiler.measure('cheap', () => { clock += 1; });
        profiler.measure('expensive', () => { clock += 20; });
        profiler.measure('middling', () => { clock += 5; });
        profiler.endFrame();

        expect(profiler.snapshot().sections.map((s) => s.name))
            .toEqual(['expensive', 'middling', 'cheap']);
    });

    it('returns the wrapped function result and still records a throwing section', () => {
        let clock = 0;
        const profiler = createFrameProfiler({ now: () => clock });
        profiler.enable();
        profiler.beginFrame();
        expect(profiler.measure('ok', () => { clock += 2; return 'value'; })).toBe('value');
        expect(() => profiler.measure('boom', () => { clock += 3; throw new Error('x'); })).toThrow('x');
        profiler.endFrame();

        const names = profiler.snapshot().sections.map((s) => s.name);
        expect(names).toContain('boom');
    });

    it('reset clears history so a new capture window starts clean', () => {
        let clock = 0;
        const profiler = createFrameProfiler({ now: () => clock });
        profiler.enable();
        profiler.beginFrame();
        profiler.measure('a', () => { clock += 5; });
        profiler.endFrame();
        profiler.reset();
        expect(profiler.snapshot()).toEqual({ frames: 0, totalMs: 0, sections: [] });
    });
});
