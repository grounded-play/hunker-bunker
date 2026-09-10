import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { beginPerfPhase, measurePerfPhase } from './perfPhases.js';

beforeEach(() => vi.stubGlobal('window', {}));
afterEach(() => vi.unstubAllGlobals());

describe('synchronous performance phases', () => {
    it('restores the parent and closes a throwing operation', () => {
        const outer = beginPerfPhase('outer');
        expect(() => measurePerfPhase('inner', { type: 'prop' }, () => {
            throw new Error('prepare failed');
        })).toThrow('prepare failed');
        expect(window.__hbPerfPhaseStack).toHaveLength(1);
        expect(window.__hbLastPerfPhase).toBe('outer');
        outer.end();
        outer.end();
        expect(window.__hbPerfPhaseHistory.map((span) => span.phase)).toEqual(['inner', 'outer']);
        expect(window.__hbPerfPhaseStack).toHaveLength(0);
    });

    it('bounds retained history while preserving return values', () => {
        for (let i = 0; i < 100; i += 1) {
            expect(measurePerfPhase(`operation:${i}`, {}, () => i)).toBe(i);
        }
        expect(window.__hbPerfPhaseHistory).toHaveLength(64);
        expect(window.__hbPerfPhaseHistory[0].phase).toBe('operation:36');
    });

    it('executes without browser globals', () => {
        vi.stubGlobal('window', undefined);
        expect(measurePerfPhase('server', {}, () => 42)).toBe(42);
    });
});
