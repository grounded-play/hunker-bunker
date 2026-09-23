import { describe, expect, it, vi } from 'vitest';
import { evaluateSurvivalTension, syncSurvivalTension } from './survivalTension.js';

describe('Survival Tension System', () => {
    it('evaluates normal vitals as non-critical with open audio pass', () => {
        const state = evaluateSurvivalTension({ o2: 100, maxO2: 100, hp: 100, maxHp: 100 });
        expect(state.isCritical).toBe(false);
        expect(state.isO2Critical).toBe(false);
        expect(state.isHpCritical).toBe(false);
        expect(state.muffleTargetFreq).toBe(22000);
    });

    it('triggers deep suffocation muffle when oxygen drops to 20% or below', () => {
        const state = evaluateSurvivalTension({ o2: 20, maxO2: 100, hp: 100, maxHp: 100 });
        expect(state.isCritical).toBe(true);
        expect(state.isO2Critical).toBe(true);
        expect(state.muffleTargetFreq).toBe(380);
    });

    it('triggers daze muffle when hp drops to 25% or below', () => {
        const state = evaluateSurvivalTension({ o2: 80, maxO2: 100, hp: 24, maxHp: 100 });
        expect(state.isCritical).toBe(true);
        expect(state.isHpCritical).toBe(true);
        expect(state.muffleTargetFreq).toBe(520);
    });

    it('synchronizes tension to audio manager and DOM element', () => {
        const audioManager = { setLowPassMuffle: vi.fn() };
        const targetElement = { classList: { toggle: vi.fn() } };

        const state = syncSurvivalTension({
            vitals: { o2: 15, maxO2: 100, hp: 100, maxHp: 100 },
            audioManager,
            targetElement
        });

        expect(state.isCritical).toBe(true);
        expect(audioManager.setLowPassMuffle).toHaveBeenCalledWith(true, 380);
        expect(targetElement.classList.toggle).toHaveBeenCalledWith('vitals-critical', true);
    });
});

describe('fatigue muffling', () => {
    it('leaves the mix alone at baseline and at the first step past it', () => {
        for (const fatigueStageId of [null, 'RESTED', 'ALERT', 'STRAINED']) {
            const state = evaluateSurvivalTension({ o2: 100, maxO2: 100, hp: 100, maxHp: 100, fatigueStageId });
            expect(state.muffleTargetFreq).toBe(22000);
            expect(state.isFatigueMuffled).toBe(false);
        }
    });

    it('dulls the world as exhaustion deepens, without deafening', () => {
        const ragged = evaluateSurvivalTension({ o2: 100, maxO2: 100, hp: 100, maxHp: 100, fatigueStageId: 'RAGGED' });
        const dark = evaluateSurvivalTension({ o2: 100, maxO2: 100, hp: 100, maxHp: 100, fatigueStageId: 'LONG_DARK' });
        expect(ragged.isFatigueMuffled).toBe(true);
        expect(dark.muffleTargetFreq).toBeLessThan(ragged.muffleTargetFreq);
        // Still well above the suffocation cutoff: tired is not drowning.
        expect(dark.muffleTargetFreq).toBeGreaterThan(380);
    });

    // Exhaustion must never make a suffocating operator sound CLEARER.
    it('lets the most muffled state win when both apply', () => {
        const state = evaluateSurvivalTension({ o2: 5, maxO2: 100, hp: 100, maxHp: 100, fatigueStageId: 'LONG_DARK' });
        expect(state.muffleTargetFreq).toBe(380);
    });

    it('opens the filter for fatigue even when vitals are fine', () => {
        const audioManager = { setLowPassMuffle: vi.fn() };
        syncSurvivalTension({
            vitals: { o2: 100, maxO2: 100, hp: 100, maxHp: 100 },
            audioManager,
            fatigueStageId: 'RAGGED'
        });
        expect(audioManager.setLowPassMuffle).toHaveBeenCalledWith(true, 1400);
    });

    it('does not paint the critical class for fatigue alone', () => {
        const targetElement = { classList: { toggle: vi.fn() } };
        syncSurvivalTension({
            vitals: { o2: 100, maxO2: 100, hp: 100, maxHp: 100 },
            targetElement,
            fatigueStageId: 'LONG_DARK'
        });
        expect(targetElement.classList.toggle).toHaveBeenCalledWith('vitals-critical', false);
    });
});
