import { describe, expect, it, vi } from 'vitest';
import { createGpuFrameTimer } from './gpuFrameTimer.js';

function createMockGl({ extension = true } = {}) {
    let nextId = 1;
    let disjoint = false;
    const states = new Map();
    const ext = { TIME_ELAPSED_EXT: 0x88BF, GPU_DISJOINT_EXT: 0x8FBB };
    const gl = {
        QUERY_RESULT_AVAILABLE: 0x8867,
        QUERY_RESULT: 0x8866,
        getExtension: vi.fn(() => extension ? ext : null),
        createQuery: vi.fn(() => {
            const query = { id: nextId++ };
            states.set(query, { available: false, result: 0 });
            return query;
        }),
        beginQuery: vi.fn(),
        endQuery: vi.fn(),
        deleteQuery: vi.fn(),
        getParameter: vi.fn(() => disjoint),
        getQueryParameter: vi.fn((query, parameter) => {
            const state = states.get(query);
            return parameter === gl.QUERY_RESULT_AVAILABLE ? state.available : state.result;
        })
    };
    return {
        gl,
        states,
        setDisjoint: (value) => { disjoint = value; }
    };
}

describe('createGpuFrameTimer', () => {
    it('degrades safely when timer queries are unavailable', () => {
        const { gl } = createMockGl({ extension: false });
        const timer = createGpuFrameTimer(gl);

        expect(timer.supported).toBe(false);
        expect(timer.beginFrame()).toBe(false);
        expect(timer.endFrame()).toBe(false);
        expect(timer.snapshot()).toMatchObject({ supported: false, samples: 0 });
    });

    it('collects completed query time asynchronously and smooths samples', () => {
        const { gl, states } = createMockGl();
        const timer = createGpuFrameTimer(gl, { smoothingAlpha: 0.5 });

        expect(timer.beginFrame()).toBe(true);
        expect(timer.endFrame()).toBe(true);
        const first = [...states.keys()][0];
        states.set(first, { available: true, result: 8_000_000 });
        expect(timer.snapshot()).toMatchObject({ latestMs: 8, averageMs: 8, samples: 1 });

        timer.beginFrame();
        timer.endFrame();
        const second = [...states.keys()][1];
        states.set(second, { available: true, result: 12_000_000 });
        expect(timer.snapshot()).toMatchObject({ latestMs: 12, averageMs: 10, maxMs: 12, samples: 2 });
    });

    it('bounds queued queries rather than stalling for GPU results', () => {
        const { gl } = createMockGl();
        const timer = createGpuFrameTimer(gl, { maxPendingQueries: 1 });

        timer.beginFrame();
        timer.endFrame();
        expect(timer.beginFrame()).toBe(false);
        expect(timer.snapshot()).toMatchObject({ pendingQueries: 1, droppedFrames: 1 });
    });

    it('discards invalid results after a GPU disjoint event', () => {
        const { gl, setDisjoint } = createMockGl();
        const timer = createGpuFrameTimer(gl);
        timer.beginFrame();
        timer.endFrame();
        setDisjoint(true);

        expect(timer.snapshot()).toMatchObject({ samples: 0, pendingQueries: 0, disjointEvents: 1 });
        expect(gl.deleteQuery).toHaveBeenCalledTimes(1);
    });
});
