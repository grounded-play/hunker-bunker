import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileManager, clearSaveData, exportSaveCode, importSaveCode } from './profile.js';

function makeStorage(seed = {}) {
    const map = new Map(Object.entries(seed));
    return {
        get length() { return map.size; },
        key: (i) => Array.from(map.keys())[i] ?? null,
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k),
        _map: map
    };
}

describe('ProfileManager', () => {
    let storage;
    beforeEach(() => { storage = makeStorage(); });

    it('defaults to AGENT with a stable profile id', () => {
        const p = new ProfileManager({ storage });
        expect(p.getCallsign()).toBe('AGENT');
        expect(p.getProfileId()).toMatch(/^op-/);
        // id is stable across reloads
        const id = p.getProfileId();
        expect(new ProfileManager({ storage }).getProfileId()).toBe(id);
    });

    it('sanitizes and persists the callsign', () => {
        const p = new ProfileManager({ storage });
        expect(p.setCallsign('  Ghost-7! <xss> ')).toBe('GHOST-7 XSS');
        expect(new ProfileManager({ storage }).getCallsign()).toBe('GHOST-7 XSS');
    });

    it('falls back to AGENT for empty callsign', () => {
        const p = new ProfileManager({ storage });
        expect(p.setCallsign('!!!')).toBe('AGENT');
    });
});

describe('save codes', () => {
    it('round-trips all hb_ keys and ignores foreign keys', () => {
        const src = makeStorage({
            hb_bank: '{"tech":5}',
            hb_fabricator_v1: '{"fabricated":{"mk1_sidearm":true}}',
            hb_arc_v1: '{"arcState":"cave_signal"}',
            unrelated: 'nope'
        });
        const code = exportSaveCode(src);
        expect(code.startsWith('HBSAVE1:')).toBe(true);

        const dst = makeStorage();
        const written = importSaveCode(code, dst);
        expect(written).toBe(3);
        expect(dst.getItem('hb_bank')).toBe('{"tech":5}');
        expect(dst.getItem('hb_fabricator_v1')).toBe('{"fabricated":{"mk1_sidearm":true}}');
        expect(dst.getItem('hb_arc_v1')).toBe('{"arcState":"cave_signal"}');
        expect(dst.getItem('unrelated')).toBeNull();
    });

    it('rejects malformed codes', () => {
        const dst = makeStorage();
        expect(importSaveCode('garbage', dst)).toBe(-1);
        expect(importSaveCode('HBSAVE1:!!!notb64', dst)).toBe(-1);
        expect(importSaveCode('', dst)).toBe(-1);
    });

    it('clears hb_ save records while keeping preferences', () => {
        const storage = makeStorage({
            hb_bank: '{"tech":5}',
            hb_profile_v1: '{"callsign":"GHOST"}',
            hb_achievements_v1: '{"unlocked":{"quick_study":1}}',
            hb_minigame_rgb_v1: '{"checkpoint":"warehouse","endingsSeen":["open_hand"]}',
            hunker_key_bindings: '{"moveUp":["KeyW","ArrowUp"]}',
            hunker_audio_mix_v1: '{"master":0.7}'
        });

        expect(clearSaveData(storage)).toBe(4);
        expect(storage.getItem('hb_bank')).toBeNull();
        expect(storage.getItem('hb_profile_v1')).toBeNull();
        expect(storage.getItem('hb_achievements_v1')).toBeNull();
        expect(storage.getItem('hb_minigame_rgb_v1')).toBeNull();
        expect(storage.getItem('hunker_key_bindings')).toBe('{"moveUp":["KeyW","ArrowUp"]}');
        expect(storage.getItem('hunker_audio_mix_v1')).toBe('{"master":0.7}');
    });
});
