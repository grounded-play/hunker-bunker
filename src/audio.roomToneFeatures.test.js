import { describe, it, expect, beforeEach } from 'vitest';
import { AudioManager } from './audio.js';

describe('AudioManager Room Tone and Context Features', () => {
    beforeEach(() => {
        AudioManager.init();
        AudioManager.isUnlocked = true;
    });

    it('initializes room tone gain and state properly', () => {
        expect(AudioManager.roomToneGain).toBeDefined();
        expect(AudioManager.activeRoomTone).toBeNull();
    });

    it('sets room tone and stores active room tone state', () => {
        AudioManager.buffers = {
            room_tone_exterior_wind: { sampleRate: 44100, length: 44100, numberOfChannels: 2 }
        };
        AudioManager.setRoomTone('room_tone_exterior_wind', { fadeSeconds: 1.5, volume: 0.35 });
        expect(AudioManager.activeRoomTone).toBeDefined();
        expect(AudioManager.activeRoomTone?.key).toBe('room_tone_exterior_wind');
        expect(AudioManager.activeRoomTone?.targetVolume).toBe(0.35);

        // Stop room tone
        AudioManager.stopRoomTone({ fadeSeconds: 0.5 });
        expect(AudioManager.activeRoomTone).toBeNull();
    });

    it('ignores redundant setRoomTone calls if already active with same key', () => {
        AudioManager.activeRoomTone = { key: 'room_tone_exterior_wind', source: {}, gainNode: {} };
        const prev = AudioManager.activeRoomTone;
        AudioManager.setRoomTone('room_tone_exterior_wind');
        expect(AudioManager.activeRoomTone).toBe(prev);
        AudioManager.activeRoomTone = null;
    });

    it('resolves spatial audio panning and attenuation correctly in 3D', () => {
        AudioManager.setListener({ x: 0, z: 0, rightX: 1, rightZ: 0 });

        // Source to the right at (10, 0)
        const spatialRight = AudioManager.resolveSpatial({
            x: 10,
            z: 0,
            maxDistance: 50,
        });

        expect(spatialRight).not.toBeNull();
        expect(spatialRight.pan).toBeGreaterThan(0.1); // Right speaker
        expect(spatialRight.gain).toBeGreaterThan(0);
        expect(spatialRight.gain).toBeLessThanOrEqual(1);

        // Source to the left at (-10, 0)
        const spatialLeft = AudioManager.resolveSpatial({
            x: -10,
            z: 0,
            maxDistance: 50,
        });

        expect(spatialLeft).not.toBeNull();
        expect(spatialLeft.pan).toBeLessThan(-0.1); // Left speaker

        // Distant source beyond maxDistance
        const spatialDistant = AudioManager.resolveSpatial({
            x: 100,
            z: 100,
            maxDistance: 50,
        });
        expect(spatialDistant.gain).toBe(0);
    });

    it('rotates contextual music playlist indices with advancePlaylistIndex', () => {
        const combatTracks = AudioManager.MUSIC_CONTEXT_PLAYLISTS.combat;
        expect(combatTracks.length).toBeGreaterThan(1);

        const firstTrack = AudioManager.resolveMusicTrackKey('combat');
        expect(firstTrack).toBe(combatTracks[0]);

        AudioManager.advancePlaylistIndex('combat');
        const secondTrack = AudioManager.resolveMusicTrackKey('combat');
        expect(secondTrack).toBe(combatTracks[1]);

        AudioManager.advancePlaylistIndex('combat');
        const thirdTrack = AudioManager.resolveMusicTrackKey('combat');
        expect(thirdTrack).toBe(combatTracks[2]);

        AudioManager.advancePlaylistIndex('combat');
        const loopBackTrack = AudioManager.resolveMusicTrackKey('combat');
        expect(loopBackTrack).toBe(combatTracks[0]);
    });

    it('sets music context when buffer is loaded', () => {
        const dummyBuffer = { duration: 120, numberOfChannels: 2, sampleRate: 44100 };
        AudioManager.buffers['music_combat_threatened'] = dummyBuffer;

        AudioManager.setMusicContext('combat');
        expect(AudioManager.activeMusic?.context).toBe('combat');
        expect(AudioManager.activeMusic?.bufferKey).toBe('music_combat_threatened');
    });
});
