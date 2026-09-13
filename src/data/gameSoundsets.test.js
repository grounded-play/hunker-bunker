import { describe, expect, it, vi } from 'vitest';
import { GAME_SOUNDSETS, selectSoundsetVariant, validateSoundset } from './gameSoundsets.js';

const DOOR_SET = Object.freeze({
    variants: Object.freeze(['door_close1', 'door_close2', 'door_close3']),
    bus: 'world',
    gain: 0.55,
    pitch: Object.freeze([0.96, 1.03]),
    cooldownMs: 90,
    maxVoices: 3,
    retrigger: 'replace-quietest',
    noImmediateRepeat: true,
    fallback: 'door_slide_horiz'
});

describe('game soundset selection', () => {
    it('contains only provenance-approved runtime asset dependencies', () => {
        // This list is a provenance guard, not a snapshot: every entry is a
        // deliberate approval, so adding a soundset must mean editing this test
        // and saying where the audio came from.
        //
        //   door_slide_horiz, hive_webs_sticky  - CC0 intake (opengameart)
        //   footstep_*, prop_impact_*           - Kenney Impact Sounds, CC0,
        //     licence retained at art/source/audio/cinematic-source/kenney/
        expect(Object.keys(GAME_SOUNDSETS)).toEqual([
            'door_slide_horiz', 'hive_webs_sticky',
            'footstep_concrete', 'footstep_snow',
            'prop_impact_metal', 'prop_impact_glass'
        ]);
        expect(Object.values(GAME_SOUNDSETS).every(validateSoundset)).toBe(true);
        expect(Object.isFrozen(GAME_SOUNDSETS)).toBe(true);
    });

    it('selects deterministically and avoids the previous variant', () => {
        const random = vi.fn(() => 0);
        const selected = selectSoundsetVariant(DOOR_SET, { random, lastVariant: 'door_close1' });

        expect(selected).toEqual({
            key: 'door_close2',
            bus: 'world',
            gain: 0.55,
            playbackRate: 0.96
        });
    });

    it('uses the approved fallback when no variant is loaded', () => {
        const selected = selectSoundsetVariant(DOOR_SET, {
            availableKeys: ['door_slide_horiz']
        });

        expect(selected?.key).toBe('door_slide_horiz');
    });

    it('rejects malformed metadata', () => {
        expect(validateSoundset({ variants: [] })).toBe(false);
        expect(validateSoundset({ variants: ['cue'], pitch: [1.1, 0.9] })).toBe(false);
        expect(validateSoundset({ variants: ['cue'], retrigger: 'unbounded' })).toBe(false);
        expect(selectSoundsetVariant({ variants: [] })).toBeNull();
    });
});
