import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from './audio.js';

// Low-O2 panic (AAA plan §2.2, audioJuice.computeBiometricAudioState): there
// is no heartbeat asset, so the beat is synthesized; it follows the tempo
// it is given and stops at 0.
describe('AudioManager heartbeat', () => {
    afterEach(() => {
        AudioManager.setHeartbeat(0);
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('beats at the given tempo, follows tempo changes, and stops at 0', () => {
        vi.useFakeTimers();
        const thump = vi.spyOn(AudioManager, 'playHeartbeatThump').mockImplementation(() => true);
        AudioManager.setHeartbeat(120);
        expect(thump).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(500);
        expect(thump).toHaveBeenCalledTimes(2);
        AudioManager.setHeartbeat(120);
        expect(thump).toHaveBeenCalledTimes(2);
        AudioManager.setHeartbeat(60);
        vi.advanceTimersByTime(500);
        expect(thump).toHaveBeenCalledTimes(3);
        vi.advanceTimersByTime(1000);
        expect(thump).toHaveBeenCalledTimes(4);
        AudioManager.setHeartbeat(0);
        vi.advanceTimersByTime(5000);
        expect(thump).toHaveBeenCalledTimes(4);
    });
});
