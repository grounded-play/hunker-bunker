import { describe, it, expect, vi } from 'vitest';

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
import { GAME_AUDIO_ALIASES } from './data/gameAudioAliases.js';
import { GAME_SOUNDSETS } from './data/gameSoundsets.js';

describe('OST Track Coverage and Resolution', () => {
    it('returns all 43 available OST tracks (5 core + 38 numbered OST tracks)', () => {
        const tracks = AudioManager.getAvailableOSTTracks();
        expect(tracks).toHaveLength(43);
        const coreTracks = tracks.filter((t) => t.type === 'core');
        const numberedTracks = tracks.filter((t) => t.type === 'interstitial_ost');
        expect(coreTracks).toHaveLength(5);
        expect(numberedTracks).toHaveLength(38);
    });

    it('resolves OST track specifications across all numbering, key, and title formats', () => {
        // By track number
        const track1 = AudioManager.resolveOSTTrackSpec(1);
        expect(track1).toBeDefined();
        expect(track1.trackNumber).toBe(1);
        expect(track1.id).toBe('01');
        expect(track1.title).toBe('Someone Is Still Alive');

        // By string number
        const track13 = AudioManager.resolveOSTTrackSpec('13');
        expect(track13).toBeDefined();
        expect(track13.trackNumber).toBe(13);
        expect(track13.title).toBe('A Snail Blocks the Hallway');

        // By boss title
        const trackQueen = AudioManager.resolveOSTTrackSpec('Mother of the Last World');
        expect(trackQueen).toBeDefined();
        expect(trackQueen.trackNumber).toBe(31);

        // By music key
        const track32 = AudioManager.resolveOSTTrackSpec('music_interstitial_32');
        expect(track32).toBeDefined();
        expect(track32.title).toBe('Black Box Stain');

        // Core theme resolution
        const coreCryo = AudioManager.resolveOSTTrackSpec('music_cryo_explore');
        expect(coreCryo).toBeDefined();
        expect(coreCryo.type).toBe('core');
    });

    it('returns null for nonexistent tracks gracefully', () => {
        expect(AudioManager.resolveOSTTrackSpec(999)).toBeNull();
        expect(AudioManager.resolveOSTTrackSpec('nonexistent_track_title')).toBeNull();
    });
});

describe('Enemy Walking, Crawling, and Noise Wiring', () => {
    const requiredEnemyAudioKeys = [
        'enemy_crawl_snail',
        'enemy_crawl_boss',
        'enemy_idle_snail',
        'enemy_idle_crawler',
        'enemy_walk_crawler',
        'enemy_skitter_crawler',
        'enemy_alert_crawler',
        'enemy_alert_snail',
        'enemy_alert_boss',
        'enemy_attack_sporesnail',
        'enemy_shockwave_cryosnail',
        'enemy_break_wall'
    ];

    it.each(requiredEnemyAudioKeys)('has valid routing in audio aliases or soundsets for %s', (key) => {
        const hasSoundset = Boolean(GAME_SOUNDSETS[key]);
        const hasAlias = Boolean(GAME_AUDIO_ALIASES[key]);
        expect(hasSoundset || hasAlias).toBe(true);
    });

    it('executes procedural creature alert without throwing', () => {
        AudioManager.init();
        expect(() => AudioManager.playProceduralCreatureAlert('cybersnail')).not.toThrow();
        expect(() => AudioManager.playProceduralCreatureAlert('boss_cryosnail')).not.toThrow();
        expect(() => AudioManager.playProceduralCreatureAlert('crawler')).not.toThrow();
    });

    it('executes procedural crawler skitter and snail slither without throwing', () => {
        AudioManager.init();
        expect(() => AudioManager.playProceduralCrawlerSkitter({ volume: 0.3 })).not.toThrow();
        expect(() => AudioManager.playProceduralSnailSlither({ volume: 0.25 })).not.toThrow();
    });
});
