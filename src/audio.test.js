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

import { AudioManager } from './audio.js';

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

    it('generates voice playback for speaker when voice is enabled', () => {
        const result = AudioManager.playVoiceForMessage('MOTHERSHIP COMMAND', 'Agent Scout. You are alive.');
        expect(result).not.toBeNull();
        expect(result.source).toBeDefined();
        expect(result.gainNode).toBeDefined();
    });
});
