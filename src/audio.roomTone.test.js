import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager } from './audio.js';

describe('Room Tone and Ambient Bed System', () => {
    beforeEach(() => {
        AudioManager.isUnlocked = true;
        AudioManager.buffers = {
            room_tone_exterior_wind: { duration: 65 },
            room_tone_interior_bunker: { duration: 65 },
            room_tone_cryo_subzero: { duration: 65 },
            room_tone_bio_hive: { duration: 65 },
            room_tone_cathedral_crypt: { duration: 65 },
            room_tone_safe_ship: { duration: 65 }
        };
        AudioManager.activeRoomTone = null;
        AudioManager.fadingRoomTone = null;
        AudioManager.globalMuted = false;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initializes room tone bus connected to world and master chains', () => {
        expect(AudioManager.roomToneGain).toBeDefined();
        expect(AudioManager.environmentFilter).toBeDefined();
    });

    it('sets and starts a room tone key', () => {
        AudioManager.setRoomTone('room_tone_exterior_wind', { fadeSeconds: 2.0 });

        expect(AudioManager.activeRoomTone).toBeDefined();
        expect(AudioManager.activeRoomTone.key).toBe('room_tone_exterior_wind');
        expect(AudioManager.activeRoomTone.gainNode).toBeDefined();
        expect(AudioManager.activeRoomTone.source).toBeDefined();
    });

    it('does not restart room tone if called with the same key', () => {
        AudioManager.setRoomTone('room_tone_exterior_wind');
        const firstActive = AudioManager.activeRoomTone;
        expect(firstActive).toBeDefined();

        AudioManager.setRoomTone('room_tone_exterior_wind');
        expect(AudioManager.activeRoomTone).toBe(firstActive);
    });

    it('smoothly crossfades between exterior and interior room tones', () => {
        AudioManager.setRoomTone('room_tone_exterior_wind', { fadeSeconds: 1.0 });
        const oldTrack = AudioManager.activeRoomTone;
        expect(oldTrack).toBeDefined();

        AudioManager.setRoomTone('room_tone_interior_bunker', { fadeSeconds: 2.5 });
        expect(AudioManager.activeRoomTone.key).toBe('room_tone_interior_bunker');
        expect(AudioManager.activeRoomTone).not.toBe(oldTrack);
        expect(AudioManager.fadingRoomTone).toBe(oldTrack);
    });

    it('supports stopping room tone with fade', () => {
        AudioManager.setRoomTone('room_tone_exterior_wind');
        expect(AudioManager.activeRoomTone).toBeDefined();

        AudioManager.stopRoomTone({ fadeSeconds: 1.5 });
        expect(AudioManager.activeRoomTone).toBeNull();
    });

    it('adjusts low pass filter muffling when sheltered indoors vs exterior', () => {
        const filter = AudioManager.environmentFilter;
        expect(filter).toBeDefined();

        AudioManager.setLowPassMuffle(true, 14000);
        // Indoor muffled
        expect(filter.frequency.value).toBe(14000);

        AudioManager.setLowPassMuffle(false, 22000);
        // Open outdoor crisp highs
        expect(filter.frequency.value).toBe(22000);
    });
});

describe('OST Track Catalog and Contextual Music System', () => {
    beforeEach(() => {
        AudioManager.isUnlocked = true;
        AudioManager.activeMusic = null;
        AudioManager.buffers = {
            mainbg_music: { duration: 120 },
            music_safe_ship: { duration: 160 },
            music_cryo_explore: { duration: 150 },
            music_bio_explore: { duration: 140 },
            music_interstitial_25: { duration: 180 },
            music_interstitial_26: { duration: 180 },
            music_interstitial_27: { duration: 180 }
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('resolves track for cryo explore context from playlist', () => {
        const track = AudioManager.resolveMusicTrackKey('cryo_explore');
        expect(track).toBeDefined();
        const playlist = AudioManager.MUSIC_CONTEXT_PLAYLISTS.cryo_explore;
        expect(playlist).toContain(track);
    });

    it('resolves track for bio explore context from playlist', () => {
        const track = AudioManager.resolveMusicTrackKey('bio_explore');
        expect(track).toBeDefined();
        const playlist = AudioManager.MUSIC_CONTEXT_PLAYLISTS.bio_explore;
        expect(playlist).toContain(track);
    });

    it('resolves track for safe ship sanctuary context', () => {
        const track = AudioManager.resolveMusicTrackKey('safe_ship');
        expect(track).toBeDefined();
        const playlist = AudioManager.MUSIC_CONTEXT_PLAYLISTS.safe_ship;
        expect(playlist).toContain(track);
    });

    it('resolves dedicated non-rotating main theme track for menu context', () => {
        const track = AudioManager.resolveMusicTrackKey('menu');
        expect(track).toBe('mainbg_music');
        expect(AudioManager.MUSIC_CONTEXT_PLAYLISTS.menu).toEqual(['mainbg_music']);
    });

    it('resolves distinct tracks for alpha specimen bosses', () => {
        const cyber = AudioManager.resolveMusicTrackKey('boss_cybersnail');
        const cryo = AudioManager.resolveMusicTrackKey('boss_cryosnail');
        const spore = AudioManager.resolveMusicTrackKey('boss_sporesnail');

        expect(cyber).toBe('music_interstitial_25'); // Gigawatt Goliath
        expect(cryo).toBe('music_interstitial_26');  // Absolute Zero Has a Shell
        expect(spore).toBe('music_interstitial_27'); // The Bloom That Hunts
    });

    it('cycles sequentially through exploration playlist', () => {
        const playlist = AudioManager.MUSIC_CONTEXT_PLAYLISTS.active_explore;
        expect(playlist.length).toBeGreaterThan(1);

        const t1 = AudioManager.resolveMusicTrackKey('active_explore');
        AudioManager.advancePlaylistIndex('active_explore');
        const t2 = AudioManager.resolveMusicTrackKey('active_explore');

        expect(t1).toBe(playlist[0]);
        expect(t2).toBe(playlist[1]);
    });
});

describe('3D Positional Stereo Spatialization', () => {
    beforeEach(() => {
        AudioManager.setListener({ x: 0, z: 0, rightX: 1, rightZ: 0 }); // listener at (0, 0) facing +Z with camera-right along +X
    });

    it('computes left stereo panning when emitter is to listener left', () => {
        const spatial = AudioManager.resolveSpatial({
            worldX: -10,
            worldZ: 0
        });

        expect(spatial).toBeDefined();
        expect(spatial.pan).toBeLessThan(0);
    });

    it('computes right stereo panning when emitter is to listener right', () => {
        const spatial = AudioManager.resolveSpatial({
            worldX: 10,
            worldZ: 0
        });

        expect(spatial).toBeDefined();
        expect(spatial.pan).toBeGreaterThan(0);
    });

    it('clamps stereo pan strictly within allowed limits', () => {
        const farLeft = AudioManager.resolveSpatial({
            worldX: -500,
            worldZ: 0
        });
        const farRight = AudioManager.resolveSpatial({
            worldX: 500,
            worldZ: 0
        });

        expect(farLeft.pan).toBeGreaterThanOrEqual(-1.0);
        expect(farLeft.pan).toBeLessThanOrEqual(1.0);
        expect(farRight.pan).toBeGreaterThanOrEqual(-1.0);
        expect(farRight.pan).toBeLessThanOrEqual(1.0);
    });

    it('attenuates gain over distance', () => {
        const near = AudioManager.resolveSpatial({
            worldX: 4,
            worldZ: 0
        });
        const far = AudioManager.resolveSpatial({
            worldX: 20,
            worldZ: 0
        });

        expect(near.gain).toBeGreaterThan(far.gain);
    });
});
