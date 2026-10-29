/**
 * High-Tension Survival Atmosphere and Sensory Feedback.
 * Manages low-oxygen and near-death audio suffocation and pulsing visual states.
 */

import { computeBiometricAudioState } from './audioJuice.js';

/**
 * How muffled the world sounds at each fatigue stage.
 *
 * Exhaustion dulls hearing; it does not deafen. These sit well above the
 * suffocation and daze cutoffs so a critical state is always the louder signal,
 * and STRAINED is deliberately absent -- the first step past baseline should be
 * felt in the stats, not in the mix.
 */
export const FATIGUE_MUFFLE_HZ = Object.freeze({
    RAGGED: 1400,
    LONG_DARK: 900
});

export function evaluateSurvivalTension({
    o2 = 100,
    maxO2 = 100,
    hp = 100,
    maxHp = 100,
    fatigueStageId = null
} = {}) {
    const o2Fraction = Math.max(0, o2) / Math.max(1, maxO2);
    const hpFraction = Math.max(0, hp) / Math.max(1, maxHp);

    const isO2Critical = o2Fraction <= 0.20;
    const isHpCritical = hpFraction <= 0.25;
    const isCritical = isO2Critical || isHpCritical;

    // Suffocation deepens as O2 falls (700 Hz at 20% down to 380 Hz empty,
    // src/audioJuice.js) instead of snapping to 380 at the threshold; HP
    // critical is a heavy daze (520 Hz). The most muffled vitals state wins.
    const o2Freq = isO2Critical ? computeBiometricAudioState(o2Fraction).cutoffHertz : 22000;
    const vitalsFreq = Math.min(o2Freq, isHpCritical ? 520 : 22000);
    const fatigueFreq = FATIGUE_MUFFLE_HZ[fatigueStageId] ?? 22000;
    // The most muffled state wins, so exhaustion can never make a suffocating
    // operator sound clearer than they did a moment ago.
    const muffleTargetFreq = Math.min(vitalsFreq, fatigueFreq);
    const isFatigueMuffled = fatigueFreq < 22000;

    return {
        isCritical,
        isO2Critical,
        isHpCritical,
        isFatigueMuffled,
        muffleTargetFreq,
        o2Fraction,
        hpFraction
    };
}

export function syncSurvivalTension({
    vitals = {},
    audioManager = null,
    targetElement = null,
    fatigueStageId = null
} = {}) {
    const state = evaluateSurvivalTension({ ...vitals, fatigueStageId });

    if (audioManager && typeof audioManager.setLowPassMuffle === 'function') {
        audioManager.setLowPassMuffle(state.isCritical || state.isFatigueMuffled, state.muffleTargetFreq);
    }
    // Suffocation also brings a heartbeat that quickens as O2 runs out.
    if (audioManager && typeof audioManager.setHeartbeat === 'function') {
        audioManager.setHeartbeat(state.isO2Critical ? computeBiometricAudioState(state.o2Fraction).heartbeatBpm : 0);
    }

    if (targetElement && targetElement.classList) {
        targetElement.classList.toggle('vitals-critical', state.isCritical);
    }

    return state;
}
