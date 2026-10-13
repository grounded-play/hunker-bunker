import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Web Audio API for test environments
if (typeof globalThis.AudioContext === 'undefined') {
    class MockGainNode {
        constructor() {
            this.gain = {
                value: 1.0,
                setTargetAtTime: vi.fn((val) => { this.gain.value = val; }),
                setValueAtTime: vi.fn((val) => { this.gain.value = val; }),
                linearRampToValueAtTime: vi.fn((val) => { this.gain.value = val; }),
                exponentialRampToValueAtTime: vi.fn((val) => { this.gain.value = val; }),
                cancelScheduledValues: vi.fn()
            };
        }
        connect() {}
    }
    class MockOscillatorNode {
        constructor() {
            this.type = 'sine';
            this.frequency = {
                setValueAtTime: vi.fn(),
                linearRampToValueAtTime: vi.fn(),
                exponentialRampToValueAtTime: vi.fn()
            };
        }
        connect() {}
        start() {}
        stop() {}
    }
    class MockBiquadFilterNode {
        constructor() {
            this.type = 'lowpass';
            this.frequency = {
                value: 12000,
                setValueAtTime: vi.fn((val) => { this.frequency.value = val; }),
                exponentialRampToValueAtTime: vi.fn((val) => { this.frequency.value = val; }),
                linearRampToValueAtTime: vi.fn((val) => { this.frequency.value = val; }),
                setTargetAtTime: vi.fn((val) => { this.frequency.value = val; })
            };
            this.Q = {
                value: 1.0,
                setValueAtTime: vi.fn((val) => { this.Q.value = val; }),
                linearRampToValueAtTime: vi.fn((val) => { this.Q.value = val; }),
                setTargetAtTime: vi.fn((val) => { this.Q.value = val; })
            };
        }
        connect() {}
    }
    class MockStereoPannerNode {
        constructor() {
            this.pan = {
                value: 0,
                setValueAtTime: vi.fn((val) => { this.pan.value = val; }),
                linearRampToValueAtTime: vi.fn((val) => { this.pan.value = val; })
            };
        }
        connect() {}
    }
    class MockAudioContext {
        constructor() {
            this.destination = {};
            this.currentTime = 0;
            this.state = 'running';
        }
        createGain() { return new MockGainNode(); }
        createOscillator() { return new MockOscillatorNode(); }
        createBiquadFilter() { return new MockBiquadFilterNode(); }
        createStereoPanner() { return new MockStereoPannerNode(); }
        createBufferSource() {
            return {
                buffer: null,
                playbackRate: { value: 1.0 },
                detune: { value: 0 },
                connect() {},
                start() {},
                stop() {}
            };
        }
        resume() { return Promise.resolve(); }
    }
    if (typeof window !== 'undefined') {
        window.AudioContext = MockAudioContext;
        window.webkitAudioContext = MockAudioContext;
    }
}

import { AudioManager } from './audio.js';

describe('Advanced Room Tone, Weather & 3D Spatial Audio System', () => {
    beforeEach(() => {
        AudioManager.isUnlocked = true;
        AudioManager.buffers = {
            room_tone_exterior_wind: { duration: 65 },
            room_tone_interior_bunker: { duration: 65 },
            room_tone_cryo_subzero: { duration: 65 },
            room_tone_bio_hive: { duration: 65 },
            room_tone_cathedral_crypt: { duration: 65 },
            room_tone_safe_ship: { duration: 65 },
            music_safe_ship: { duration: 90 },
            music_cryo_explore: { duration: 90 },
            music_bio_explore: { duration: 90 },
            music_active_explore: { duration: 90 },
            music_combat_threatened: { duration: 60 },
            music_interstitial_01: { duration: 90 },
            music_interstitial_12: { duration: 90 },
            music_interstitial_13: { duration: 90 }
        };
        AudioManager.activeRoomTone = null;
        AudioManager.fadingRoomTone = null;
        AudioManager.globalMuted = false;
        AudioManager.setListener(null);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Room Tone Atmosphere System', () => {
        it('initializes room tone gain bus connected to world and master buses', () => {
            expect(AudioManager.roomToneGain).toBeDefined();
            expect(AudioManager.environmentFilter).toBeDefined();
        });

        it('supports all 5 authored room tone atmosphere keys in manifest', () => {
            const expectedTones = [
                'room_tone_exterior_wind',
                'room_tone_interior_bunker',
                'room_tone_cryo_subzero',
                'room_tone_bio_hive',
                'room_tone_cathedral_crypt'
            ];
            for (const tone of expectedTones) {
                expect(AudioManager.ROOM_TONE_MANIFEST[tone]).toBeDefined();
            }
        });

        it('transitions between outside wind and bunker interior with smooth crossfade', () => {
            AudioManager.setRoomTone('room_tone_exterior_wind', { fadeSeconds: 1.0 });
            expect(AudioManager.activeRoomTone).toBeDefined();
            expect(AudioManager.activeRoomTone.key).toBe('room_tone_exterior_wind');

            const prev = AudioManager.activeRoomTone;

            // Crossfade into interior bunker
            AudioManager.setRoomTone('room_tone_interior_bunker', { fadeSeconds: 1.5 });
            expect(AudioManager.activeRoomTone.key).toBe('room_tone_interior_bunker');
            expect(AudioManager.fadingRoomTone).toBe(prev);
        });

        it('dynamically adjusts environment filter between outdoor open air and bunker interior', () => {
            // Outdoors: wide open high cutoff
            AudioManager.setEnvironmentFilter({ cutoff: 18000, type: 'lowpass', resonance: 0.5 });
            expect(AudioManager.environmentFilter.frequency.value).toBe(18000);

            // Indoors deep bunker: dampened acoustic resonance
            AudioManager.setEnvironmentFilter({ cutoff: 3500, type: 'lowpass', resonance: 1.2 });
            expect(AudioManager.environmentFilter.frequency.value).toBe(3500);
        });

        it('mutes and restores room tone cleanly with master/world volume controls', () => {
            AudioManager.setRoomTone('room_tone_exterior_wind');
            AudioManager.setChannelVolume('roomtone', 0);
            expect(AudioManager.roomToneGain.gain.value).toBe(0);

            AudioManager.setChannelVolume('roomtone', 0.75);
            expect(AudioManager.roomToneGain.gain.value).toBe(0.75);
        });
    });

    describe('OST Catalog Triggers and Breathing Room', () => {
        it('has triggers and associations for full soundtrack catalog', () => {
            expect(AudioManager.MUSIC_CONTEXT_PLAYLISTS).toBeDefined();
            expect(AudioManager.MUSIC_CONTEXT_PLAYLISTS.safe_ship).toBeDefined();
            expect(AudioManager.MUSIC_CONTEXT_PLAYLISTS.cryo_explore).toBeDefined();
            expect(AudioManager.MUSIC_CONTEXT_PLAYLISTS.bio_explore).toBeDefined();
            expect(AudioManager.MUSIC_CONTEXT_PLAYLISTS.active_explore).toBeDefined();
            expect(AudioManager.MUSIC_CONTEXT_PLAYLISTS.combat).toBeDefined();
            expect(AudioManager.MUSIC_CONTEXT_PLAYLISTS.boss_cybersnail).toBeDefined();
            expect(AudioManager.MUSIC_CONTEXT_PLAYLISTS.boss_cryosnail).toBeDefined();
            expect(AudioManager.MUSIC_CONTEXT_PLAYLISTS.boss_sporesnail).toBeDefined();
        });

        it('provides playlist rotation with breathing room gaps between songs', () => {
            expect(AudioManager._musicBreathingDuration).toBe(35);
            expect(AudioManager._musicCycleDuration).toBe(110);

            AudioManager.setMusicContext('safe_ship');
            expect(AudioManager.activeMusic).toBeDefined();
            expect(AudioManager.activeMusic.context).toBe('safe_ship');
        });

        it('fades out music cleanly when changing contexts or during room tone pauses', () => {
            AudioManager.setMusicContext('safe_ship');
            expect(AudioManager.activeMusic.context).toBe('safe_ship');

            AudioManager.setMusicContext('combat');
            expect(AudioManager.activeMusic.context).toBe('combat');
        });
    });

    describe('3D Positional Stereo Audio', () => {
        beforeEach(() => {
            // Player at (0, 0), facing north (0, -1), right vector pointing east (+1, 0)
            AudioManager.setListener({
                x: 0,
                z: 0,
                rightX: 1,
                rightZ: 0
            });
        });

        it('pans sounds to the right when emitter is to the right of camera listener', () => {
            const spatial = AudioManager.resolveSpatial({
                worldX: 10,
                worldZ: 0,
                maxDistance: 30
            });

            expect(spatial).not.toBeNull();
            expect(spatial.pan).toBeGreaterThan(0.2);
            expect(spatial.gain).toBeGreaterThan(0);
            expect(spatial.gain).toBeLessThanOrEqual(1.0);
        });

        it('pans sounds to the left when emitter is to the left of camera listener', () => {
            const spatial = AudioManager.resolveSpatial({
                worldX: -10,
                worldZ: 0,
                maxDistance: 30
            });

            expect(spatial).not.toBeNull();
            expect(spatial.pan).toBeLessThan(-0.2);
            expect(spatial.gain).toBeGreaterThan(0);
            expect(spatial.gain).toBeLessThanOrEqual(1.0);
        });

        it('attenuates sounds smoothly over distance and silences beyond maxDistance', () => {
            const near = AudioManager.resolveSpatial({
                worldX: 2,
                worldZ: 0,
                maxDistance: 20
            });

            const far = AudioManager.resolveSpatial({
                worldX: 18,
                worldZ: 0,
                maxDistance: 20
            });

            const beyond = AudioManager.resolveSpatial({
                worldX: 100,
                worldZ: 0,
                maxDistance: 20
            });

            expect(near.gain).toBeGreaterThan(far.gain);
            expect(beyond.audible).toBe(false);
        });

        it('incorporates camera yaw angle rotation into 3D stereo panning', () => {
            // Forward orientation: listener right is (1, 0)
            const spatialA = AudioManager.resolveSpatial({
                worldX: 0,
                worldZ: 10
            });

            // Camera rotated 90 degrees: listener right is now (0, 1)
            AudioManager.setListener({
                x: 0,
                z: 0,
                rightX: 0,
                rightZ: 1
            });

            const spatialB = AudioManager.resolveSpatial({
                worldX: 0,
                worldZ: 10
            });

            expect(spatialA.pan).not.toBe(spatialB.pan);
            expect(spatialB.pan).toBeGreaterThan(0.2);
        });
    });
});
