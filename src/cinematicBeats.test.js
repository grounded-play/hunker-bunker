import { existsSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
    BEAT_SPACING_MS,
    CINEMATIC_BEATS,
    CINEMATIC_BEAT_EVENTS,
    CINEMATIC_STORAGE_KEY,
    CinematicBeatDirector,
    matchBeat
} from './cinematicBeats.js';
import { InteractionSequenceRunner } from './interactionSequenceRunner.js';
import { SONG_INTERSTITIALS } from './songInterstitials.js';

function memoryStorage() {
    const store = new Map();
    return { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), store };
}

// Cards that already play from their own trigger (first contact, snail bosses).
const LIVE_ELSEWHERE = ['01', '02', '04', '06', '13', '22', '23', '26', '27'];

describe('cinematic beat table (audit 2026-10-16 §13.2)', () => {
    it('maps each card once, to a shipped video, and never a card that already plays elsewhere', () => {
        const cards = CINEMATIC_BEATS.map((beat) => beat.card);
        expect(new Set(cards).size).toBe(cards.length);
        for (const beat of CINEMATIC_BEATS) {
            const spec = SONG_INTERSTITIALS[beat.card];
            expect(spec, beat.id).toBeTruthy();
            expect(LIVE_ELSEWHERE).not.toContain(beat.card);
            expect(existsSync(`public${spec.motionWebm}`), `${beat.id} -> ${spec.motionWebm}`).toBe(true);
            expect(['gameplay', 'camp-conversation', 'aria']).toContain(beat.then);
        }
    });

    it('plays int_11 (Her Voice Inside Your Helmet) on the first Queen whisper, then opens Aria', () => {
        const beat = matchBeat('queen-hallucination', { intensity: 0.4 });
        expect(beat).toMatchObject({ card: '11', then: 'aria' });
        expect(SONG_INTERSTITIALS[beat.card].motionWebm).toContain('int_11_her_voice_inside_your_helmet');
    });

    it('matches on the event detail', () => {
        expect(matchBeat('camp-bonded', { campId: 'camp_meridian', bond: 2 })).toBeNull();
        expect(matchBeat('camp-bonded', { campId: 'camp_meridian', bond: 3 })?.card).toBe('03');
        expect(matchBeat('camp-bonded', { campId: 'camp_vesper', bond: 4 })?.card).toBe('07');
        expect(matchBeat('camp-quest-complete', { campId: 'camp_tallow' })?.card).toBe('20');
        expect(matchBeat('depth-tier-changed', { tier: 1, crossing: {} })).toBeNull();
        expect(matchBeat('depth-tier-changed', { tier: 2, crossing: {} })?.card).toBe('14');
        // The tier is re-announced on spawn and respawn (forceEmit, no
        // crossing): that is not the player going deeper.
        expect(matchBeat('depth-tier-changed', { tier: 3 })).toBeNull();
        expect(matchBeat('queen-hallucination', {}, new Set(['aria_voice']))).toBeNull();
        expect(CINEMATIC_BEAT_EVENTS).toContain('queen-hallucination');
    });
});

describe('CinematicBeatDirector', () => {
    it('plays a beat once per save', () => {
        const storage = memoryStorage();
        const play = vi.fn();
        const director = new CinematicBeatDirector({ play, storage });
        expect(director.handle('queen-hallucination', {})).toBe('played');
        expect(director.handle('queen-hallucination', {})).toBeNull();
        const reloaded = new CinematicBeatDirector({ play, storage });
        expect(reloaded.handle('queen-hallucination', {})).toBeNull();
        expect(play).toHaveBeenCalledTimes(1);
    });

    it('waits out a fight, keeping the higher-priority beat', () => {
        const play = vi.fn();
        let fighting = true;
        const director = new CinematicBeatDirector({ play, storage: memoryStorage(), isInCombat: () => fighting });
        expect(director.handle('snail-befriended', {})).toBe('deferred');
        expect(director.handle('act2-console-dead', {})).toBe('deferred');
        expect(director.handle('depth-tier-changed', { tier: 3, crossing: {} })).toBe('deferred');
        expect(play).not.toHaveBeenCalled();
        fighting = false;
        expect(director.onCombatChanged(false)).toBe('played');
        expect(play).toHaveBeenCalledTimes(1);
        expect(play.mock.calls[0][0].card).toBe('10');
    });

    it('plays boss beats at spawn, even mid-fight', () => {
        const play = vi.fn();
        const director = new CinematicBeatDirector({ play, storage: memoryStorage(), isInCombat: () => true });
        expect(director.handle('hive-harvest-boss-spawned', { hiveId: 'hive_suture' })).toBe('played');
        expect(play.mock.calls[0][0].card).toBe('25');
    });

    it('never closes the doors on a co-op squad: a toast instead', () => {
        const play = vi.fn();
        const toast = vi.fn();
        const director = new CinematicBeatDirector({ play, toast, storage: memoryStorage(), isMultiplayer: () => true, titleFor: (beat) => SONG_INTERSTITIALS[beat.card].title });
        expect(director.handle('queen-hallucination', {})).toBe('toast');
        expect(play).not.toHaveBeenCalled();
        expect(toast).toHaveBeenCalledWith('Her Voice Inside Your Helmet');
    });

    it('drops a flavour beat that lands right after another card, without spending it', () => {
        const play = vi.fn();
        let clock = 1_000_000;
        const director = new CinematicBeatDirector({ play, storage: memoryStorage(), now: () => clock });
        director.handle('act2-console-dead', {});
        clock += 5_000;
        expect(director.handle('snail-befriended', {})).toBe('dropped');
        clock += BEAT_SPACING_MS;
        expect(director.handle('snail-befriended', {})).toBe('played');
    });

    it('shares hb_cinematics_v1 with the sequence runner without either wiping the other', async () => {
        const storage = memoryStorage();
        new CinematicBeatDirector({ play: vi.fn(), storage }).handle('queen-hallucination', {});
        const runner = new InteractionSequenceRunner({ findPropAnchor: () => false }, { storage });
        await runner.runSequence('base_cot_first_night');
        new CinematicBeatDirector({ play: vi.fn(), storage }).handle('act2-console-dead', {});
        const record = JSON.parse(storage.getItem(CINEMATIC_STORAGE_KEY));
        expect(record.beats).toEqual(['aria_voice', 'console_dead']);
        expect(record.sequences).toEqual(['base_cot_first_night']);
    });
});
