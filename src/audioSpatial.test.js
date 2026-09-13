import { describe, expect, it } from 'vitest';
import { AUDIO_SPATIAL_DEFAULTS, calculateScreenSpaceAudio } from './audioSpatial.js';

describe('screen-space audio placement', () => {
    it('keeps a nearby centered source full-volume and centered', () => {
        const result = calculateScreenSpaceAudio({
            source: { x: 0, z: 2 },
            listener: { x: 0, z: 0 }
        });

        expect(result.pan).toBe(0);
        expect(result.gain).toBe(1);
        expect(result.cutoffHz).toBe(AUDIO_SPATIAL_DEFAULTS.openCutoffHz);
        expect(result.audible).toBe(true);
    });

    it('projects displacement onto a normalized camera-right vector', () => {
        const right = calculateScreenSpaceAudio({
            source: { x: 16, z: 0 }, listener: { x: 0, z: 0 }, cameraRight: { x: 4, z: 0 }
        });
        const left = calculateScreenSpaceAudio({
            source: { x: 0, z: 16 }, listener: { x: 0, z: 0 }, cameraRight: { x: 0, z: -2 }
        });

        expect(right.pan).toBeCloseTo(0.36);
        expect(left.pan).toBeCloseTo(-0.36);
    });

    it('clamps stereo width and becomes silent at the distance boundary', () => {
        const result = calculateScreenSpaceAudio({
            source: { x: 1000, z: 0 }, listener: { x: 0, z: 0 }
        });

        expect(result.pan).toBe(AUDIO_SPATIAL_DEFAULTS.maxPan);
        expect(result.distanceGain).toBe(0);
        expect(result.gain).toBe(0);
        expect(result.audible).toBe(false);
    });

    it('falls smoothly between reference and maximum distance', () => {
        const near = calculateScreenSpaceAudio({ source: { x: 4, z: 0 }, listener: { x: 0, z: 0 } });
        const middle = calculateScreenSpaceAudio({ source: { x: 16, z: 0 }, listener: { x: 0, z: 0 } });
        const far = calculateScreenSpaceAudio({ source: { x: 28, z: 0 }, listener: { x: 0, z: 0 } });

        expect(near.gain).toBeGreaterThan(middle.gain);
        expect(middle.gain).toBeGreaterThan(far.gain);
        expect(far.gain).toBeGreaterThan(0);
    });

    it('applies obstruction gain and cutoff without changing position', () => {
        const open = calculateScreenSpaceAudio({ source: { x: 8, z: 0 }, listener: { x: 0, z: 0 } });
        const blocked = calculateScreenSpaceAudio({
            source: { x: 8, z: 0 }, listener: { x: 0, z: 0 }, obstructed: true
        });

        expect(blocked.pan).toBe(open.pan);
        expect(blocked.distanceGain).toBe(open.distanceGain);
        expect(blocked.gain).toBeCloseTo(open.gain * AUDIO_SPATIAL_DEFAULTS.obstructionGain);
        expect(blocked.cutoffHz).toBe(AUDIO_SPATIAL_DEFAULTS.obstructedCutoffHz);
    });

    it('preserves a minimum audible floor for critical telegraphs', () => {
        const result = calculateScreenSpaceAudio({
            source: { x: 80, z: 0 }, listener: { x: 0, z: 0 }, obstructed: true, critical: true
        });

        expect(result.distanceGain).toBe(0);
        expect(result.gain).toBe(AUDIO_SPATIAL_DEFAULTS.criticalMinGain);
        expect(result.audible).toBe(true);
    });

    it('supports two-dimensional y coordinates and sanitizes unsafe tuning', () => {
        const result = calculateScreenSpaceAudio({
            source: { x: 0, y: 2 },
            listener: { x: 0, y: 0 },
            cameraRight: { x: 0, y: 0 },
            refDistance: -4,
            maxDistance: -8,
            maxPan: 4,
            obstructionGain: -2,
            obstructed: true
        });

        expect(result.distance).toBe(2);
        expect(result.pan).toBe(0);
        expect(result.gain).toBe(0);
        expect(Number.isFinite(result.gain)).toBe(true);
    });
});
