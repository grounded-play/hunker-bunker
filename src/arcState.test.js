import { describe, expect, it } from 'vitest';
import {
    ARC_TRANSITION_EVENTS,
    ArcStateManager,
    CAVE_SIGNAL_MIN_BLACK_BOXES,
    CAVE_SIGNAL_MIN_DEPTH,
    CAVE_SIGNAL_MIN_SNAIL_KILLS,
    evaluateArcTransition
} from './arcState.js';

function memoryStorage(initial = {}) {
    const map = new Map(Object.entries(initial));
    return {
        get length() { return map.size; },
        key(index) { return [...map.keys()][index] ?? null; },
        getItem(key) { return map.has(key) ? map.get(key) : null; },
        setItem(key, value) { map.set(key, String(value)); },
        removeItem(key) { map.delete(key); }
    };
}

const readySignals = {
    deepestDepthTier: CAVE_SIGNAL_MIN_DEPTH,
    blackBoxesRecovered: CAVE_SIGNAL_MIN_BLACK_BOXES,
    snailsKilled: 0,
    blockedExtractions: 1
};

describe('evaluateArcTransition', () => {
    it('starts as human_prelude and stays there below threshold', () => {
        expect(evaluateArcTransition('human_prelude', { ...readySignals, deepestDepthTier: CAVE_SIGNAL_MIN_DEPTH - 1 })).toBe('human_prelude');
        expect(evaluateArcTransition('not-real', readySignals)).toBe('cave_signal');
    });

    it('advances to cave_signal only when readiness and ownership beats are met', () => {
        expect(evaluateArcTransition('human_prelude', readySignals)).toBe('cave_signal');
        expect(evaluateArcTransition('human_prelude', { ...readySignals, blackBoxesRecovered: 0, snailsKilled: CAVE_SIGNAL_MIN_SNAIL_KILLS })).toBe('cave_signal');
        expect(evaluateArcTransition('human_prelude', { ...readySignals, blackBoxesRecovered: 0, snailsKilled: CAVE_SIGNAL_MIN_SNAIL_KILLS - 1 })).toBe('human_prelude');
        expect(evaluateArcTransition('human_prelude', { ...readySignals, blockedExtractions: 0 })).toBe('human_prelude');
    });

    it('requires explicit events for the reveal ladder', () => {
        expect(evaluateArcTransition('cave_signal', readySignals)).toBe('cave_signal');
        expect(evaluateArcTransition('cave_signal', { ...readySignals, event: ARC_TRANSITION_EVENTS.CAVE_INTERACTION })).toBe('cave_discovered');
        expect(evaluateArcTransition('cave_discovered', { event: ARC_TRANSITION_EVENTS.REVEAL_BLACKOUT })).toBe('infected_blackout');
        expect(evaluateArcTransition('infected_blackout', { event: ARC_TRANSITION_EVENTS.BLACKOUT_COMPLETE })).toBe('hive_awakened_tease');
        expect(evaluateArcTransition('hive_awakened_tease', { event: ARC_TRANSITION_EVENTS.CAVE_INTERACTION })).toBe('hive_awakened_tease');
    });
});

describe('ArcStateManager', () => {
    it('defaults absent storage to human_prelude with zeroed counters', () => {
        const manager = new ArcStateManager({ storage: memoryStorage() });
        expect(manager.getState()).toMatchObject({
            arcState: 'human_prelude',
            signals: { deepestDepthTier: 0, blackBoxesRecovered: 0, snailsKilled: 0, blockedExtractions: 0 }
        });
    });

    it('round-trips through injected storage', () => {
        const storage = memoryStorage();
        const manager = new ArcStateManager({ storage });
        manager.recordSignal(readySignals);
        manager.evaluate();
        const restored = new ArcStateManager({ storage });
        expect(restored.getState().arcState).toBe('cave_signal');
        expect(restored.getState().signals.blackBoxesRecovered).toBe(CAVE_SIGNAL_MIN_BLACK_BOXES);
    });

    it('falls back to defaults on corrupt JSON', () => {
        const manager = new ArcStateManager({ storage: memoryStorage({ hb_arc_v1: '{bad' }) });
        expect(manager.getState().arcState).toBe('human_prelude');
    });

    it('clamps counters and keeps them monotonic', () => {
        const manager = new ArcStateManager({ storage: memoryStorage() });
        manager.recordSignal({ deepestDepthTier: 4, blackBoxesRecovered: 2, snailsKilled: 3, blockedExtractions: 1, heardCaveSignal: true });
        manager.recordSignal({ deepestDepthTier: 1, blackBoxesRecovered: -4, snailsKilled: Number.NaN, blockedExtractions: 2, sawOrganicAnomaly: true });
        expect(manager.getState().signals).toEqual({
            deepestDepthTier: 4,
            blackBoxesRecovered: 2,
            snailsKilled: 3,
            blockedExtractions: 3,
            heardCaveSignal: true,
            sawOrganicAnomaly: true
        });
    });

    it('emits transitions and forceState never rewinds', () => {
        const transitions = [];
        const manager = new ArcStateManager({ storage: memoryStorage(), onTransition: (from, to) => transitions.push([from, to]) });
        manager.forceState('cave_discovered');
        manager.forceState('human_prelude');
        manager.evaluate(ARC_TRANSITION_EVENTS.REVEAL_BLACKOUT);
        manager.evaluate(ARC_TRANSITION_EVENTS.BLACKOUT_COMPLETE);
        expect(manager.getState().arcState).toBe('hive_awakened_tease');
        expect(transitions).toEqual([
            ['human_prelude', 'cave_discovered'],
            ['cave_discovered', 'infected_blackout'],
            ['infected_blackout', 'hive_awakened_tease']
        ]);
    });
});

// User report 2026-09-09: a fresh profile showed "DEPTH ABYSS". See
// clearUnearnedDepthSignal's comment for why the value got there.
describe('ArcStateManager.clearUnearnedDepthSignal', () => {
    function managerWithDepth(tier) {
        const manager = new ArcStateManager({ storage: memoryStorage() });
        manager.recordSignal({ deepestDepthTier: tier });
        return manager;
    }

    it('clears a depth recorded by a player who has never finished a run', () => {
        const manager = managerWithDepth(3);
        expect(manager.getState().signals.deepestDepthTier).toBe(3);
        manager.clearUnearnedDepthSignal(false);
        expect(manager.getState().signals.deepestDepthTier).toBe(0);
    });

    it('leaves an earned depth alone', () => {
        const manager = managerWithDepth(3);
        manager.clearUnearnedDepthSignal(true);
        expect(manager.getState().signals.deepestDepthTier).toBe(3);
    });

    it('is a no-op when there is nothing to clear', () => {
        const manager = new ArcStateManager({ storage: memoryStorage() });
        expect(manager.clearUnearnedDepthSignal(false).signals.deepestDepthTier).toBe(0);
    });

    it('does not disturb the other signals', () => {
        const manager = managerWithDepth(3);
        manager.recordSignal({ snailsKilled: 4, heardCaveSignal: true });
        manager.clearUnearnedDepthSignal(false);
        const signals = manager.getState().signals;
        expect(signals.deepestDepthTier).toBe(0);
        expect(signals.snailsKilled).toBe(4);
        expect(signals.heardCaveSignal).toBe(true);
    });
});
