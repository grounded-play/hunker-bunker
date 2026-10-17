import { describe, expect, it } from 'vitest';
import {
    AUDIO_JUICE_CONFIG,
    computeBiometricAudioState,
    getModulatedPlaybackRate
} from './audioJuice.js';

describe('audioJuice', () => {
    describe('pitch randomization', () => {
        it('modulates playback rate around base with ±10% spread', () => {
            const minRate = getModulatedPlaybackRate(1.0, 0.10, () => 0.0);
            expect(minRate).toBeCloseTo(0.90);

            const midRate = getModulatedPlaybackRate(1.0, 0.10, () => 0.5);
            expect(midRate).toBeCloseTo(1.00);

            const maxRate = getModulatedPlaybackRate(1.0, 0.10, () => 1.0);
            expect(maxRate).toBeCloseTo(1.10);
        });

        it('respects non-1.0 base playback rates', () => {
            const highBase = getModulatedPlaybackRate(1.5, 0.10, () => 0.0);
            expect(highBase).toBeCloseTo(1.35);
        });

        it('contains invalid or out-of-range modulation inputs', () => {
            expect(getModulatedPlaybackRate(Number.NaN, -1, () => 2)).toBe(1);
            expect(getModulatedPlaybackRate(1, 0.1, () => Number.NaN)).toBe(1);
        });
    });

    describe('biometric audio state', () => {
        it('returns clean un-ducked audio state when O2 > 20%', () => {
            const healthy = computeBiometricAudioState(0.85);
            expect(healthy.isCritical).toBe(false);
            expect(healthy.cutoffHertz).toBe(AUDIO_JUICE_CONFIG.MAX_LPF_HERTZ);
            expect(healthy.musicDuckDb).toBe(0);
            expect(healthy.heartbeatActive).toBe(false);
        });

        it('triggers low-pass filter and heartbeat when O2 <= 20%', () => {
            const low = computeBiometricAudioState(0.10);
            expect(low.isCritical).toBe(true);
            expect(low.cutoffHertz).toBeLessThan(1000);
            expect(low.musicDuckDb).toBeLessThan(-4);
            expect(low.heartbeatActive).toBe(true);
            expect(low.heartbeatBpm).toBeGreaterThan(65);
        });

        it('reaches maximum muffling and heartbeat rate at 0% O2', () => {
            const empty = computeBiometricAudioState(0.0);
            expect(empty.isCritical).toBe(true);
            expect(empty.cutoffHertz).toBe(AUDIO_JUICE_CONFIG.MIN_LPF_HERTZ);
            expect(empty.musicDuckDb).toBe(-12.0);
            expect(empty.heartbeatBpm).toBe(AUDIO_JUICE_CONFIG.HEARTBEAT_MAX_BPM);
        });

        it('fails healthy when telemetry is missing or invalid', () => {
            expect(computeBiometricAudioState(Number.NaN).isCritical).toBe(false);
            expect(computeBiometricAudioState(undefined).cutoffHertz).toBe(AUDIO_JUICE_CONFIG.MAX_LPF_HERTZ);
        });
    });
});

describe('one SFX pitch spread (audio.js uses this module)', () => {
    it('keeps the shipped ±5% spread', () => {
        expect(AUDIO_JUICE_CONFIG.SFX_PITCH_VARIANCE).toBe(0.05);
        expect(getModulatedPlaybackRate(1, AUDIO_JUICE_CONFIG.SFX_PITCH_VARIANCE, () => 0)).toBeCloseTo(0.95);
        expect(getModulatedPlaybackRate(1, AUDIO_JUICE_CONFIG.SFX_PITCH_VARIANCE, () => 0.999999)).toBeCloseTo(1.05);
    });
});
