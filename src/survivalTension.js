/**
 * High-Tension Survival Atmosphere and Sensory Feedback.
 * Manages low-oxygen and near-death audio suffocation and pulsing visual states.
 */

export function evaluateSurvivalTension({
    o2 = 100,
    maxO2 = 100,
    hp = 100,
    maxHp = 100
} = {}) {
    const o2Fraction = Math.max(0, o2) / Math.max(1, maxO2);
    const hpFraction = Math.max(0, hp) / Math.max(1, maxHp);

    const isO2Critical = o2Fraction <= 0.20;
    const isHpCritical = hpFraction <= 0.25;
    const isCritical = isO2Critical || isHpCritical;

    // Deep suffocation (380Hz) on O2 deprivation, heavy heartbeat daze (520Hz) on HP critical
    const muffleTargetFreq = isO2Critical ? 380 : (isHpCritical ? 520 : 22000);

    return {
        isCritical,
        isO2Critical,
        isHpCritical,
        muffleTargetFreq,
        o2Fraction,
        hpFraction
    };
}

export function syncSurvivalTension({
    vitals = {},
    audioManager = null,
    targetElement = null
} = {}) {
    const state = evaluateSurvivalTension(vitals);

    if (audioManager && typeof audioManager.setLowPassMuffle === 'function') {
        audioManager.setLowPassMuffle(state.isCritical, state.muffleTargetFreq);
    }

    if (targetElement && targetElement.classList) {
        targetElement.classList.toggle('vitals-critical', state.isCritical);
    }

    return state;
}
