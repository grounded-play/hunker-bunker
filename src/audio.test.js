import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Web Audio API for test environments
if (typeof globalThis.AudioContext === 'undefined') {
    class MockGainNode {
        constructor() {
            this.gain = {
                value: 1.0,
                setTargetAtTime: vi.fn((val) => { this.gain.value = val; }),
                setValueAtTime: vi.fn(),
                linearRampToValueAtTime: vi.fn(),
                exponentialRampToValueAtTime: vi.fn()
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
            this.frequency = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
            this.Q = { setValueAtTime: vi.fn() };
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

import { AudioManager, audioCtx } from './audio.js';

describe('AudioManager Voice Channel & Soundsets Toggle', () => {
    beforeEach(() => {
        AudioManager.init();
        AudioManager.isUnlocked = true;
        AudioManager.globalMuted = false;
        AudioManager.voiceEnabled = true;
        AudioManager.setChannelVolume('voice', 1.0);
    });

    it('initializes voiceGain channel node', () => {
        expect(AudioManager.voiceGain).toBeDefined();
        expect(AudioManager.voiceVolume).toBe(1.0);
        expect(AudioManager.voiceEnabled).toBe(true);
    });

    it('sets voice channel volume independently', () => {
        AudioManager.setChannelVolume('voice', 0.6);
        expect(AudioManager.voiceVolume).toBe(0.6);
    });

    it('updates mix via setMix including voice volume and toggle state', () => {
        AudioManager.setMix({ voice: 0.4, voiceEnabled: false });
        expect(AudioManager.voiceVolume).toBe(0.4);
        expect(AudioManager.voiceEnabled).toBe(false);
    });

    it('returns null for playVoiceForMessage when voice is disabled or muted', () => {
        AudioManager.voiceEnabled = false;
        const resultDisabled = AudioManager.playVoiceForMessage('MOTHERSHIP COMMAND', 'Agent Scout.');
        expect(resultDisabled).toBeNull();

        AudioManager.voiceEnabled = true;
        AudioManager.globalMuted = true;
        const resultMuted = AudioManager.playVoiceForMessage('MOTHERSHIP COMMAND', 'Agent Scout.');
        expect(resultMuted).toBeNull();
    });

    it('routes an explicitly requested foley cue to the foley gain node', () => {
        const connect = vi.fn();
        const gainNode = { gain: { value: 1 }, connect };
        const createGainSpy = vi.spyOn(audioCtx, 'createGain').mockReturnValueOnce(gainNode);
        AudioManager.buffers.foley_route_test = {};

        const result = AudioManager.play('foley_route_test', { bus: 'FoLeY', varyPitch: false });

        expect(result?.gainNode).toBe(gainNode);
        expect(connect).toHaveBeenCalledWith(AudioManager.foleyGain);
        createGainSpy.mockRestore();
        delete AudioManager.buffers.foley_route_test;
    });

    it('generates voice playback for speaker when voice is enabled', () => {
        const result = AudioManager.playVoiceForMessage('MOTHERSHIP COMMAND', 'Agent Scout. You are alive.');
        expect(result).not.toBeNull();
        expect(result.source).toBeDefined();
        expect(result.gainNode).toBeDefined();
    });

    it('plays situational voice callouts based on equipped voice pack', () => {
        AudioManager.buffers['voice_commander_reloading'] = {};
        AudioManager.buffers['voice_aura_reloading'] = {};

        // Mock window.loadout
        globalThis.window = globalThis.window || {};
        globalThis.window.loadout = {
            state: { voicePackId: '4148' }
        };

        const resultCommander = AudioManager.playVoiceCallout('reload');
        expect(resultCommander).not.toBeNull();

        globalThis.window.loadout.state.voicePackId = '4149';
        const resultAura = AudioManager.playVoiceCallout('reload');
        expect(resultAura).not.toBeNull();

        globalThis.window.loadout.state.voicePackId = null;
        const resultNone = AudioManager.playVoiceCallout('reload');
        expect(resultNone).toBeNull();
    });

    it('rotates mapped takes without immediately repeating a line', () => {
        AudioManager.buffers.voice_aura_reloading = {};
        AudioManager.buffers.voice_aura_reloading2 = {};
        AudioManager._lastVoiceTake.clear();
        globalThis.window = globalThis.window || {};
        globalThis.window.loadout = { state: { voicePackId: '4149' } };
        const playback = vi.spyOn(AudioManager, 'playVoiceTrack').mockImplementation((key) => key);
        const random = vi.spyOn(Math, 'random').mockReturnValue(0);

        expect(AudioManager.playVoiceCallout('reload')).toBe('voice_aura_reloading');
        expect(AudioManager.playVoiceCallout('reload')).toBe('voice_aura_reloading2');

        random.mockRestore();
        playback.mockRestore();
    });
});


describe('elite suit warning', () => {
    it('respects mute and audio-unlock settings', () => {
        AudioManager.init();
        AudioManager.isUnlocked = false;
        expect(AudioManager.playEliteWarning()).toBe(false);
        AudioManager.isUnlocked = true; AudioManager.globalMuted = true;
        expect(AudioManager.playEliteWarning()).toBe(false);
        AudioManager.globalMuted = false;
        expect(AudioManager.playEliteWarning()).toBe(true);
    });
});
