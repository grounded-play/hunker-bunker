import { describe, expect, it, vi, beforeEach } from 'vitest';

// The shipped registry is intentionally empty, so the only way to prove the
// wiring resolves a soundset is to stand one up here.
vi.mock('./data/gameSoundsets.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        GAME_SOUNDSETS: {
            footstep: {
                variants: ['footstep_a', 'footstep_b'],
                noImmediateRepeat: true,
                bus: 'foley',
                gain: 0.5
            }
        }
    };
});

const { AudioManager } = await import('./audio.js');

describe('AudioManager soundset wiring', () => {
    beforeEach(() => {
        AudioManager._lastSoundsetVariant.clear();
        AudioManager.globalMuted = false;
        AudioManager.buffers = { footstep_a: {}, footstep_b: {}, plain_key: {} };
    });

    it('resolves a registered soundset to one of its variants', () => {
        const spy = vi.spyOn(AudioManager, 'play');
        AudioManager.play('footstep');
        const resolved = spy.mock.calls.map(([k]) => k);
        expect(resolved.some((k) => k === 'footstep_a' || k === 'footstep_b')).toBe(true);
        spy.mockRestore();
    });

    it('records the chosen variant so noImmediateRepeat has history', () => {
        AudioManager.play('footstep');
        expect(['footstep_a', 'footstep_b']).toContain(AudioManager._lastSoundsetVariant.get('footstep'));
    });

    it('alternates rather than repeating the same variant back to back', () => {
        AudioManager.play('footstep');
        const first = AudioManager._lastSoundsetVariant.get('footstep');
        AudioManager.play('footstep');
        expect(AudioManager._lastSoundsetVariant.get('footstep')).not.toBe(first);
    });

    it('leaves an unregistered key on the original numbered-variant path', () => {
        const spy = vi.spyOn(AudioManager, 'play');
        AudioManager.play('plain_key');
        // Exactly one call: no soundset indirection happened.
        expect(spy).toHaveBeenCalledTimes(1);
        spy.mockRestore();
    });
});
