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
    let runNumber = 0;
    beforeEach(() => {
        AudioManager.init();
        AudioManager.beginVoiceRun(`audio-test-${++runNumber}`);
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

    it('scales and silences layered sfx, world, and foley channels via the vfx mixer control', () => {
        AudioManager.setMix({ vfx: 0.35 });
        expect(AudioManager.sfxGain.gain.value).toBe(0.35);
        expect(AudioManager.worldGain.gain.value).toBe(0.35);
        expect(AudioManager.foleyGain.gain.value).toBe(0.35);

        // Turning VFX completely down to 0 silences all 3 Foley & mechanism layers
        AudioManager.setMix({ vfx: 0 });
        expect(AudioManager.sfxGain.gain.value).toBe(0);
        expect(AudioManager.worldGain.gain.value).toBe(0);
        expect(AudioManager.foleyGain.gain.value).toBe(0);
    });

    it('allows independent channel control for world and foley when explicitly provided', () => {
        AudioManager.setMix({ vfx: 0.8, world: 0.25, foley: 0.5 });
        expect(AudioManager.sfxGain.gain.value).toBe(0.8);
        expect(AudioManager.worldGain.gain.value).toBe(0.25);
        expect(AudioManager.foleyGain.gain.value).toBe(0.5);
    });

    it('mutes and restores master audio bus correctly', () => {
        AudioManager.toggleMute(true);
        expect(AudioManager.globalMuted).toBe(true);
        expect(AudioManager.masterGain.gain.value).toBe(0);

        AudioManager.toggleMute(false);
        expect(AudioManager.globalMuted).toBe(false);
        expect(AudioManager.masterGain.gain.value).toBe(1.0);
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

        AudioManager.stopActiveVoice(0);
        globalThis.window.loadout.state.voicePackId = '4149';
        const resultAura = AudioManager.playVoiceCallout('reload');
        expect(resultAura).not.toBeNull();

        globalThis.window.loadout.state.voicePackId = null;
        const resultNone = AudioManager.playVoiceCallout('reload');
        expect(resultNone).toBeNull();
    });

    it('auditions mapped takes without immediately repeating a line', () => {
        AudioManager.buffers.voice_aura_reloading = {};
        AudioManager.buffers.voice_aura_reloading2 = {};
        AudioManager._lastVoiceTake.clear();
        globalThis.window = globalThis.window || {};
        globalThis.window.loadout = { state: { voicePackId: '4149' } };
        const playback = vi.spyOn(AudioManager, 'playVoiceTrack').mockImplementation((key) => key);
        const random = vi.spyOn(Math, 'random').mockReturnValue(0);

        expect(AudioManager.playVoiceCallout('reload', { audition: true })).toBe('voice_aura_reloading');
        expect(AudioManager.playVoiceCallout('reload', { audition: true })).toBe('voice_aura_reloading2');

        random.mockRestore();
        playback.mockRestore();
    });

    it('plays a semantic gameplay callout once per expedition and resets on a new run', () => {
        AudioManager.buffers.voice_aura_reloading = {};
        globalThis.window = globalThis.window || {};
        globalThis.window.loadout = { state: { voicePackId: '4149' } };
        const playback = vi.spyOn(AudioManager, 'playVoiceTrack').mockReturnValue({ source: {} });

        expect(AudioManager.playVoiceCallout('reload')).not.toBeNull();
        expect(AudioManager.playVoiceCallout('reload')).toBeNull();
        AudioManager.beginVoiceRun('next-expedition');
        expect(AudioManager.playVoiceCallout('reload')).not.toBeNull();
        expect(playback).toHaveBeenCalledTimes(2);
        playback.mockRestore();
    });

    it('holds field callouts until gameplay while letting the run-end card speak', () => {
        AudioManager.buffers.voice_aura_reloading = {};
        globalThis.window = globalThis.window || {};
        globalThis.window.loadout = { state: { voicePackId: '4149' } };
        const previousPhase = globalThis.window.isGameplayPhase;
        globalThis.window.isGameplayPhase = () => false;
        AudioManager.beginVoiceRun('deployment-gate');
        const playback = vi.spyOn(AudioManager, 'playVoiceTrack').mockReturnValue({ source: {} });

        expect(AudioManager.playVoiceCallout('reload')).toBeNull();
        expect(AudioManager.playVoiceCallout('reload', { allowOutsideGameplay: true })).not.toBeNull();

        playback.mockRestore();
        globalThis.window.isGameplayPhase = previousPhase;
    });

    it('keeps unsupported contexts silent instead of borrowing unrelated speech', () => {
        AudioManager.buffers.voice_commander_low_health = {};
        AudioManager.buffers.voice_aura_shield_critical = {};
        globalThis.window = globalThis.window || {};
        globalThis.window.loadout = { state: { voicePackId: '4148' } };
        expect(AudioManager.playVoiceCallout('shield_critical')).toBeNull();
        globalThis.window.loadout.state.voicePackId = '4149';
        expect(AudioManager.playVoiceCallout('low_health')).toBeNull();
    });

    it('does not play voice_mothership_01_alive for mission_active or victory on default comms', () => {
        AudioManager.buffers['voice_mothership_01_alive'] = { duration: 5.0 };
        globalThis.window = globalThis.window || {};
        globalThis.window.loadout = { state: { voicePackId: null } };

        expect(AudioManager.playVoiceCallout('mission_active')).toBeNull();
        expect(AudioManager.playVoiceCallout('victory')).toBeNull();
    });

    it('does not fall back to voice_mothership_01_alive for arbitrary Mothership lines', () => {
        AudioManager.buffers['voice_mothership_01_alive'] = { duration: 5.0 };
        const playSpy = vi.spyOn(AudioManager, 'playVoiceTrack');

        AudioManager.playVoiceForMessage('MOTHERSHIP', 'APEX BIO-ENTITY DOWN.');
        expect(playSpy).not.toHaveBeenCalledWith('voice_mothership_01_alive', expect.anything());

        AudioManager.playVoiceForMessage('MOTHERSHIP', 'CONFIRMED. DISPLAYING OPERATIONAL BRIEFING NOW.');
        expect(playSpy).not.toHaveBeenCalledWith('voice_mothership_01_alive', expect.anything());

        playSpy.mockRestore();
    });

    it('lets an authored keyword clip win over a generated code line, and catalog lines win over both', () => {
        const previousLines = AudioManager.voiceLines;
        AudioManager.buffers.voice_queen_01_two_heartbeats = { duration: 3 };
        const recorded = vi.spyOn(AudioManager, '_playVoiceLineUrl').mockReturnValue({ source: {} });
        const track = vi.spyOn(AudioManager, 'playVoiceTrack').mockReturnValue({ source: {} });

        AudioManager.voiceLines = { resolve: () => ({ key: 'code.queen.abc', url: '/x.mp3', source: 'code' }) };
        AudioManager.playVoiceForMessage('QUEEN', 'TWO HEARTBEATS. ONE PURPOSE.', { semanticId: 'test:authored' });
        expect(track).toHaveBeenCalledWith('voice_queen_01_two_heartbeats', expect.anything());
        expect(recorded).not.toHaveBeenCalled();

        AudioManager.voiceLines = { resolve: () => ({ key: 'code.tina.abc', url: '/t.mp3', source: 'code' }) };
        AudioManager.playVoiceForMessage('MAYOR TINA', 'PUT THAT DOWN. I AM ASKING ONCE.', { semanticId: 'test:code' });
        expect(recorded).toHaveBeenCalledWith('code.tina.abc', '/t.mp3', expect.anything());

        recorded.mockClear();
        AudioManager.voiceLines = { resolve: () => ({ key: 'narrative.q.0', url: '/q.mp3', source: 'catalog' }) };
        AudioManager.playVoiceForMessage('QUEEN', 'TWO HEARTBEATS. ONE PURPOSE.', { semanticId: 'test:catalog' });
        expect(recorded).toHaveBeenCalledWith('narrative.q.0', '/q.mp3', expect.anything());

        recorded.mockRestore();
        track.mockRestore();
        delete AudioManager.buffers.voice_queen_01_two_heartbeats;
        AudioManager.voiceLines = previousLines;
    });

    it('logs each unvoiced on-screen line once, never typewriter chirps', () => {
        const previousLines = AudioManager.voiceLines;
        AudioManager.voiceLines = { resolve: () => null };
        globalThis.window = globalThis.window || {};
        const previousLog = globalThis.window.hbLog;
        globalThis.window.hbLog = vi.fn();

        AudioManager.playVoiceForMessage('BUNKER', 'A LINE NOBODY RECORDED.');
        AudioManager.playVoiceForMessage('BUNKER', 'A LINE NOBODY RECORDED.');
        AudioManager.playVoiceForMessage('BUNKER', 'A L', { isChirp: true });

        expect(globalThis.window.hbLog).toHaveBeenCalledTimes(1);
        expect(globalThis.window.hbLog).toHaveBeenCalledWith('VOICE', 'info', 'unvoiced-line', { speaker: 'BUNKER', text: 'A LINE NOBODY RECORDED.' });
        globalThis.window.hbLog = previousLog;
        AudioManager.voiceLines = previousLines;
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

describe('stalker hiss telegraph', () => {
    it('respects mute and audio-unlock settings', () => {
        AudioManager.init();
        AudioManager.isUnlocked = false;
        expect(AudioManager.playStalkerHiss()).toBe(false);
        AudioManager.isUnlocked = true;
        AudioManager.globalMuted = true;
        expect(AudioManager.playStalkerHiss()).toBe(false);
        AudioManager.globalMuted = false;
        expect(AudioManager.playStalkerHiss()).toBe(true);
    });
});
