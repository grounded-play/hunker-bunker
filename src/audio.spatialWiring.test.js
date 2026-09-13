import { describe, expect, it, beforeEach } from 'vitest';
import { AudioManager } from './audio.js';

describe('AudioManager spatial wiring', () => {
    beforeEach(() => {
        AudioManager.setListener(null);
    });

    it('is non-positional until a listener exists', () => {
        expect(AudioManager.resolveSpatial({ worldX: 10, worldZ: 0 })).toBeNull();
    });

    it('rejects a malformed listener rather than half-applying it', () => {
        expect(AudioManager.setListener({ x: NaN, z: 2 })).toBe(false);
        expect(AudioManager.resolveSpatial({ worldX: 1, worldZ: 1 })).toBeNull();
    });

    it('ignores calls with no world position, so UI sound is untouched', () => {
        AudioManager.setListener({ x: 0, z: 0, rightX: 1, rightZ: 0 });
        expect(AudioManager.resolveSpatial({ volume: 0.5 })).toBeNull();
    });

    it('pans right for an emitter on the camera-right side', () => {
        AudioManager.setListener({ x: 0, z: 0, rightX: 1, rightZ: 0 });
        expect(AudioManager.resolveSpatial({ worldX: 8, worldZ: 0 }).pan).toBeGreaterThan(0);
    });

    it('pans left on the opposite side', () => {
        AudioManager.setListener({ x: 0, z: 0, rightX: 1, rightZ: 0 });
        expect(AudioManager.resolveSpatial({ worldX: -8, worldZ: 0 }).pan).toBeLessThan(0);
    });

    it('follows the camera basis rather than world axes', () => {
        // Camera rotated 90deg: world +Z is now screen-right.
        AudioManager.setListener({ x: 0, z: 0, rightX: 0, rightZ: 1 });
        expect(AudioManager.resolveSpatial({ worldX: 0, worldZ: 8 }).pan).toBeGreaterThan(0);
        expect(AudioManager.resolveSpatial({ worldX: 8, worldZ: 0 }).pan).toBeCloseTo(0, 5);
    });

    it('attenuates with distance and goes inaudible past max range', () => {
        AudioManager.setListener({ x: 0, z: 0, rightX: 1, rightZ: 0 });
        const near = AudioManager.resolveSpatial({ worldX: 2, worldZ: 0 });
        const far = AudioManager.resolveSpatial({ worldX: 20, worldZ: 0 });
        expect(near.gain).toBeGreaterThan(far.gain);
        expect(AudioManager.resolveSpatial({ worldX: 500, worldZ: 0 }).audible).toBe(false);
    });

    it('keeps a critical cue audible where an ordinary one would be lost', () => {
        AudioManager.setListener({ x: 0, z: 0, rightX: 1, rightZ: 0 });
        const plain = AudioManager.resolveSpatial({ worldX: 28, worldZ: 0 });
        const critical = AudioManager.resolveSpatial({ worldX: 28, worldZ: 0, critical: true });
        expect(critical.gain).toBeGreaterThan(plain.gain);
    });

    it('muffles an obstructed emitter instead of only quieting it', () => {
        AudioManager.setListener({ x: 0, z: 0, rightX: 1, rightZ: 0 });
        const open = AudioManager.resolveSpatial({ worldX: 5, worldZ: 0 });
        const blocked = AudioManager.resolveSpatial({ worldX: 5, worldZ: 0, obstructed: true });
        expect(blocked.cutoffHz).toBeLessThan(open.cutoffHz);
        expect(blocked.gain).toBeLessThan(open.gain);
    });
});
