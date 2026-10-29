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
// 08 (Suture first contact), 12 (boarding offer) and 24 (departure) play
// inside their own flows via director.claim().
const LIVE_ELSEWHERE = ['01', '02', '04', '06', '08', '12', '13', '22', '23', '24', '26', '27'];

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
        expect(matchBeat('ship-module-activated', {})?.card).toBe('05');
        // Every deploy reports player-respawned; 09 is the redeploy after a death.
        expect(matchBeat('player-respawned', {})).toBeNull();
        expect(matchBeat('player-respawned', { afterDeath: true })?.card).toBe('09');
        // The Queen fight opens on its own authored video; the departure on
        // the ending sequence: no event beat may stack a card on either.
        expect(matchBeat('queen-fight-started', {})).toBeNull();
        expect(matchBeat('act2-departed', {})).toBeNull();
        expect(matchBeat('hive-first-contact', { hiveId: 'hive_suture' })).toBeNull();
        expect(matchBeat('hive-choice-resolved', { action: 'hive-tend' })?.card).toBe('16');
        expect(matchBeat('hive-choice-resolved', { action: 'hive-harvest', bond: 3 })).toBeNull();
        // hive-talk opens a conversation; a card would cover the window.
        expect(matchBeat('hive-choice-resolved', { action: 'hive-talk', bond: 3 })).toBeNull();
        expect(matchBeat('act2-milestone', { key: 'queenKilled', combat: true })?.card).toBe('31');
        // A boarding purge/bargain is not the kill; departure follows it.
        expect(matchBeat('act2-milestone', { key: 'queenKilled', source: 'boarding-choice', combat: false })).toBeNull();
        expect(CINEMATIC_BEAT_EVENTS).toContain('queen-hallucination');
        expect(CINEMATIC_BEAT_EVENTS).toContain('ship-module-activated');
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

    it('waits while another cutscene or window is up, then plays once it clears', () => {
        const play = vi.fn();
        let busy = true;
        const director = new CinematicBeatDirector({ play, storage: memoryStorage(), isBusy: () => busy });
        expect(director.handle('player-respawned', { afterDeath: true })).toBe('deferred');
        expect(director.retryPending()).toBeNull();
        busy = false;
        expect(director.retryPending()).toBe('played');
        expect(play.mock.calls[0][0].card).toBe('09');
        expect(director.retryPending()).toBeNull();
    });

    it('lets a flow claim its own card once per save (and never in co-op)', () => {
        const storage = memoryStorage();
        const director = new CinematicBeatDirector({ play: vi.fn(), storage });
        expect(director.claim('queen_offer')).toBe(true);
        expect(director.claim('queen_offer')).toBe(false);
        expect(new CinematicBeatDirector({ play: vi.fn(), storage }).claim('queen_offer')).toBe(false);
        const coop = new CinematicBeatDirector({ play: vi.fn(), storage: memoryStorage(), isMultiplayer: () => true });
        expect(coop.claim('act2_departure')).toBe(false);
    });
});
