/**
 * Audio Juice & Perception Manager
 * Prevents ear fatigue through dynamic pitch modulation and layers biometric
 * tension when the operator is in critical life support states.
 *
 * Designed per Golden Rule #5 in game-dev skill:
 * "Audio Feedback With Pitch Randomization: Repetitive sound effects
 * trigger ear fatigue. Modulate playbackRate by ±8-12% on every trigger."
 */

export const AUDIO_JUICE_CONFIG = Object.freeze({
    DEFAULT_PITCH_VARIANCE: 0.10, // ±10%
    SFX_PITCH_VARIANCE: 0.05,     // the shipped spread on every SFX (audio.js)
    LOW_O2_THRESHOLD: 0.20,       // 20% O2 triggers panic audio
    MIN_LPF_HERTZ: 380,           // 380Hz heavy muffled underwater sound
    // Cutoff at the 20% threshold. Below the deepest fatigue muffle (900 Hz,
    // survivalTension.js) so suffocation always sounds worse than exhaustion.
    CRITICAL_ONSET_HERTZ: 700,
    MAX_LPF_HERTZ: 20000,         // Clean open filter
    HEARTBEAT_MIN_BPM: 65,
    HEARTBEAT_MAX_BPM: 135
});

/**
 * Returns a modulated playbackRate within [base * (1 - variance), base * (1 + variance)].
 */
export function getModulatedPlaybackRate(baseRate = 1.0, variance = AUDIO_JUICE_CONFIG.DEFAULT_PITCH_VARIANCE, random = Math.random) {
    const safeBase = Number.isFinite(Number(baseRate)) ? Number(baseRate) : 1;
    const safeVariance = Number.isFinite(Number(variance)) ? Math.max(0, Number(variance)) : AUDIO_JUICE_CONFIG.DEFAULT_PITCH_VARIANCE;
    const sample = Number(random?.());
    const safeSample = Number.isFinite(sample) ? Math.max(0, Math.min(1, sample)) : 0.5;
    const spread = (safeSample * 2 - 1) * safeVariance;
    return Math.max(0.2, Math.min(2.5, safeBase * (1 + spread)));
}

/**
 * Calculates audio DSP state based on life support O2 percentage.
 * @param {number} o2Percent - Current O2 ratio (0.0 to 1.0).
 * @returns {Object} Audio DSP parameters for music ducking, low-pass filter, and heartbeat tempo.
 */
export function computeBiometricAudioState(o2Percent = 1.0) {
    const numericO2 = Number(o2Percent);
    // Missing/invalid telemetry must fail healthy; propagating NaN into Web
    // Audio parameters can throw and silence the whole graph.
    const clampedO2 = Number.isFinite(numericO2) ? Math.max(0.0, Math.min(1.0, numericO2)) : 1.0;
    const isCritical = clampedO2 <= AUDIO_JUICE_CONFIG.LOW_O2_THRESHOLD;

    if (!isCritical) {
        return {
            isCritical: false,
            cutoffHertz: AUDIO_JUICE_CONFIG.MAX_LPF_HERTZ,
            musicDuckDb: 0,
            heartbeatActive: false,
            heartbeatBpm: 0
        };
    }

    // Ratio from 0.0 (empty) to 1.0 (at 20% threshold)
    const ratio = clampedO2 / AUDIO_JUICE_CONFIG.LOW_O2_THRESHOLD;
    const cutoffHertz = Math.round(
        AUDIO_JUICE_CONFIG.MIN_LPF_HERTZ + ratio * (AUDIO_JUICE_CONFIG.CRITICAL_ONSET_HERTZ - AUDIO_JUICE_CONFIG.MIN_LPF_HERTZ)
    );
    const musicDuckDb = -4.0 - (1.0 - ratio) * 8.0; // -4dB down to -12dB
    const heartbeatBpm = Math.round(
        AUDIO_JUICE_CONFIG.HEARTBEAT_MAX_BPM - ratio * (AUDIO_JUICE_CONFIG.HEARTBEAT_MAX_BPM - AUDIO_JUICE_CONFIG.HEARTBEAT_MIN_BPM)
    );

    return {
        isCritical: true,
        cutoffHertz,
        musicDuckDb,
        heartbeatActive: true,
        heartbeatBpm
    };
}
