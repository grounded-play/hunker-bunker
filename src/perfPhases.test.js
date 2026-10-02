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

// QA 2026-09-30: a 13.6 s main-thread long task during a co-op deploy came
// back with `activePhases: []`. Each deploy stage now holds a phase open, so a
// stall names the stage it happened in.
describe('deployment stage phases', () => {
    it('keeps exactly one startup stage open and records each stage once', async () => {
        const { trackStartupStages } = await import('./perfPhases.js');
        const stages = trackStartupStages();
        stages.enter('WORLD');
        stages.enter('WORLD');
        expect(window.__hbPerfPhaseStack.map((span) => span.phase)).toEqual(['startup:world']);
        stages.enter('PRESENT');
        expect(window.__hbPerfPhaseStack.map((span) => span.phase)).toEqual(['startup:present']);
        stages.end();
        stages.end();
        expect(window.__hbPerfPhaseStack).toHaveLength(0);
        expect(window.__hbPerfPhaseHistory.map((span) => span.phase)).toEqual(['startup:world', 'startup:present']);
    });
});
