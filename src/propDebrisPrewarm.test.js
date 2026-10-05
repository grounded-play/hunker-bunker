import { describe, expect, it, vi } from 'vitest';
import { createPropDebrisPrewarmQueue, propDebrisKey } from './propDebrisPrewarm.js';

function idleHarness() {
    const callbacks = [];
    return {
        requestIdle: (fn) => { callbacks.push(fn); },
        run(timeRemaining) {
            const fn = callbacks.shift();
            fn?.({ timeRemaining: () => timeRemaining });
            return Boolean(fn);
        },
        get waiting() { return callbacks.length; }
    };
}

const prop = (type, extra = {}) => ({ userData: { type, propHp: 3, ...extra } });

describe('prop debris prewarm (lived-in world M3)', () => {
    it('keys like spawnGibsFor: model variant, then type, then scatter key', () => {
        expect(propDebrisKey({ userData: { modelVariant: 'a', type: 'b', scatterKey: 'c' } })).toBe('a');
        expect(propDebrisKey({ userData: { type: 'b', scatterKey: 'c' } })).toBe('b');
        expect(propDebrisKey({ userData: { scatterKey: 'c' } })).toBe('c');
    });

    it('fractures one model family per idle period, and only with enough idle time', () => {
        const idle = idleHarness();
        const prewarm = vi.fn(() => true);
        const queue = createPropDebrisPrewarmQueue({ requestIdle: idle.requestIdle, prewarm });
        queue.enqueue(prop('prop_specimen_tank'), { id: 'root-a' });
        queue.enqueue(prop('prop_conduit_hub'), { id: 'root-b' });
        expect(queue.pending).toBe(2);

        idle.run(10); // a busy frame: skip, try again later
        expect(prewarm).not.toHaveBeenCalled();
        idle.run(45);
        expect(prewarm).toHaveBeenCalledTimes(1);
        expect(prewarm).toHaveBeenLastCalledWith('prop_specimen_tank', { id: 'root-a' });
        idle.run(45);
        expect(prewarm).toHaveBeenCalledTimes(2);
        expect(queue.pending).toBe(0);
        expect(idle.waiting).toBe(0);
        expect(queue.stats).toEqual({ queued: 2, warmed: 2 });
    });

    it('queues each family once and ignores indestructible or model-less props', () => {
        const idle = idleHarness();
        const queue = createPropDebrisPrewarmQueue({ requestIdle: idle.requestIdle, prewarm: () => true });
        expect(queue.enqueue(prop('prop_conduit_hub'), {})).toBe(true);
        expect(queue.enqueue(prop('prop_conduit_hub'), {})).toBe(false);
        expect(queue.enqueue({ userData: { type: 'arch_gate' } }, {})).toBe(false);
        expect(queue.enqueue(prop('prop_x'), null)).toBe(false);
        expect(queue.pending).toBe(1);
    });

    it('does nothing without requestIdleCallback, and stops when disposed', () => {
        const prewarm = vi.fn();
        const noIdle = createPropDebrisPrewarmQueue({ requestIdle: undefined, prewarm });
        noIdle.enqueue(prop('prop_a'), {});
        expect(prewarm).not.toHaveBeenCalled();

        const idle = idleHarness();
        const queue = createPropDebrisPrewarmQueue({ requestIdle: idle.requestIdle, prewarm });
        queue.enqueue(prop('prop_b'), {});
        queue.dispose();
        idle.run(50);
        expect(prewarm).not.toHaveBeenCalled();
    });
});
