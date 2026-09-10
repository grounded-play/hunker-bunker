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
