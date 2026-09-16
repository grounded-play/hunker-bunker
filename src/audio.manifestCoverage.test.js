import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager } from './audio.js';
import { DebugLogger } from './debugConsole.js';
import { presentationTelemetry } from './presentationTelemetry.js';
import { GAME_SOUNDSETS, GAMEPLAY_FOLEY_MANIFEST } from './data/gameSoundsets.js';
import { GAME_AUDIO_ALIASES } from './data/gameAudioAliases.js';

const root = new URL('../', import.meta.url);
const main = readFileSync(new URL('main.js', root), 'utf8');
const manifestKeys = new Set([
    ...[...main.matchAll(/key: '([^']+)', url: '\/audio\//g)].map((match) => match[1]),
    ...GAMEPLAY_FOLEY_MANIFEST.map(({ key }) => key)
]);
const resolves = (key) => {
    const target = Object.hasOwn(GAME_AUDIO_ALIASES, key) ? GAME_AUDIO_ALIASES[key] : key;
    return target === 'ui_hover' || Object.hasOwn(GAME_SOUNDSETS, target)
        || [...manifestKeys].some((loaded) => loaded === target
            || (loaded.startsWith(target) && /^\d+$/.test(loaded.slice(target.length))));
};

describe('shipped gameplay sound coverage', () => {
    beforeEach(() => {
        AudioManager.buffers = {};
        AudioManager.globalMuted = false;
        AudioManager._missingAudio.clear();
        AudioManager._missingAudioAttempts = 0;
        AudioManager._untrackedMissingAudioAttempts = 0;
        AudioManager._lastSoundsetVariant.clear();
    });
    afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

    it('loads every approved footstep and impact variant from a real shipped asset', () => {
        expect(main).toContain('...GAMEPLAY_FOLEY_MANIFEST');
        expect(GAMEPLAY_FOLEY_MANIFEST).toHaveLength(16);
        expect(new Set(GAMEPLAY_FOLEY_MANIFEST.map(({ key }) => key)).size).toBe(16);
        for (const { url } of GAMEPLAY_FOLEY_MANIFEST) {
            expect(existsSync(new URL(`public${url}`, root)), url).toBe(true);
        }
        for (const soundset of Object.values(GAME_SOUNDSETS)) {
            for (const key of soundset.variants) expect(manifestKeys.has(key), key).toBe(true);
        }
    });

    it('resolves all literal AudioManager.play callers in main and top-level gameplay modules', () => {
        const files = ['main.js', ...readdirSync(new URL('src/', root))
            .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
            .map((name) => `src/${name}`)];
        const missing = [];
        for (const file of files) {
            const source = readFileSync(new URL(file, root), 'utf8');
            // Deliberately scoped to audio calls, not video/animation .play().
            const pattern = file === 'src/audio.js'
                ? /this\.play\(\s*'([^']+)'/g
                : /AudioManager\??\.play(?:\?\.)?\(\s*'([^']+)'/g;
            for (const [, key] of source.matchAll(pattern)) {
                if (!resolves(key)) missing.push({ file, key });
            }
        }
        expect(missing).toEqual([]);
        for (const target of Object.values(GAME_AUDIO_ALIASES)) {
            expect(Object.hasOwn(GAME_AUDIO_ALIASES, target)).toBe(false);
            expect(resolves(target), target).toBe(true);
        }
    });

    it('plays loaded footstep variants without immediately repeating', () => {
        AudioManager.buffers = Object.fromEntries(GAMEPLAY_FOLEY_MANIFEST.map(({ key }) => [key, {}]));
        const first = AudioManager.play('footstep_concrete');
        const second = AudioManager.play('footstep_concrete');
        expect(first?.source.buffer).toBeDefined();
        expect(second?.source.buffer).not.toBe(first.source.buffer);
        expect(AudioManager.getMissingAudioDiagnostics().totalAttempts).toBe(0);
    });

    it('plays aliases through canonical buffers while preserving caller gain and spatial options', () => {
        const spatial = vi.spyOn(AudioManager, 'resolveSpatial').mockReturnValue(null);
        AudioManager.buffers = { weapon_fire_sidearm1: {} };
        const playback = AudioManager.play('turret_fire', { volume: 0.35, playbackRate: 1.1, varyPitch: false, worldX: 2, worldZ: 5 });
        expect(playback?.source.buffer).toBe(AudioManager.buffers.weapon_fire_sidearm1);
        expect(playback.gainNode.gain.value).toBe(0.35);
        expect(playback.source.playbackRate.value).toBe(1.1);
        expect(spatial).toHaveBeenCalledWith(expect.objectContaining({ worldX: 2, worldZ: 5 }));
    });

    it('routes legacy hover to the procedural UI cue without a missing-buffer event', () => {
        const hover = vi.spyOn(AudioManager, 'playProceduralHover').mockImplementation(() => {});
        AudioManager.play('fx_menu_hover');
        expect(hover).toHaveBeenCalledOnce();
        expect(AudioManager.getMissingAudioDiagnostics().totalAttempts).toBe(0);
    });

    it('logs an absent cue once, keeps exact counts in exported sessions, and retries after decode', () => {
        const emit = vi.spyOn(presentationTelemetry, 'emit');
        for (let i = 0; i < 346; i++) expect(AudioManager.play('footstep_concrete')).toBeNull();
        expect(emit.mock.calls.filter(([, event]) => event === 'play-missing')).toHaveLength(1);
        const diagnostics = AudioManager.getMissingAudioDiagnostics();
        expect(diagnostics).toMatchObject({ totalAttempts: 346, keys: [{ key: 'footstep_concrete', count: 346 }] });
        diagnostics.keys[0].count = 0;
        vi.stubGlobal('window', { AudioManager });
        const capture = DebugLogger.prototype.buildSessionCapture.call({
            sessionStartedAt: new Date(), demoMarkers: [], sessionLogs: []
        });
        expect(capture.state.audioMissing.keys[0].count).toBe(346);
        AudioManager.buffers.footstep_concrete_000 = {};
        expect(AudioManager.play('footstep_concrete')).not.toBeNull();
        expect(AudioManager.getMissingAudioDiagnostics().totalAttempts).toBe(346);
    });

    it('bounds invalid-key diagnostics without discarding the total attempt count', () => {
        const emit = vi.spyOn(presentationTelemetry, 'emit');
        for (let i = 0; i < 300; i++) AudioManager.play(`invalid_${i}`);
        expect(AudioManager.getMissingAudioDiagnostics()).toMatchObject({ totalAttempts: 300, untrackedAttempts: 172 });
        expect(AudioManager.getMissingAudioDiagnostics().keys).toHaveLength(128);
        expect(emit.mock.calls.filter(([, event]) => event === 'play-missing')).toHaveLength(128);
    });
});
