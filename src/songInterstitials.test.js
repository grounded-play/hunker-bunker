import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    SONG_INTERSTITIALS,
    SIDE_STORY_INTERSTITIALS,
    SongInterstitialController,
    getSongInterstitial,
    getSideStoryInterstitial,
    selectCampInterstitial
} from './songInterstitials.js';

describe('song interstitial manifest', () => {
    afterEach(() => vi.useRealTimers());

    it('provides stable first-frame and music slots for all 38 songs', () => {
        expect(Object.keys(SONG_INTERSTITIALS)).toHaveLength(38);
        expect(getSongInterstitial(11)).toMatchObject({
            id: '11',
            image: '/interstitials/int_11_her_voice_inside_your_helmet_key_v1.webp',
            motion: '/interstitials/motion/int_11_her_voice_inside_your_helmet_motion_v1.webm',
            audio: '/audio/ost/Her Voice Inside Your Helmet.mp3',
            musicKey: 'music_interstitial_11'
        });
    });

    it('resolves still, motion, and song assets inside a packaged Electron build', async () => {
        const previousDocument = globalThis.document;
        globalThis.document = { baseURI: 'file:///opt/hunker-bunker/resources/app.asar/dist/index.html' };
        const image = {};
        const video = {
            load() {},
            set src(value) {
                this._src = value;
                this.onerror?.();
            },
            get src() { return this._src; }
        };
        const decoded = [];
        const controller = new SongInterstitialController({
            image,
            video,
            AudioManager: {
                buffers: {},
                async decodeAudioAsset(url) { decoded.push(url); return {}; },
                play() { return { source: {}, gainNode: {} }; }
            }
        });
        const spec = getSongInterstitial(1);
        const stillPromise = controller.loadStill(spec);
        expect(image.src).toBe('file:///opt/hunker-bunker/resources/app.asar/dist/interstitials/int_01_someone_is_still_alive_key_v1.webp');
        image.onload();
        await stillPromise;
        await controller.loadMotion(spec);
        await controller.startSong(spec);
        expect(video.src).toBe('file:///opt/hunker-bunker/resources/app.asar.unpacked/dist/interstitials/motion/int_01_someone_is_still_alive_motion_v1.webm');
        expect(decoded).toEqual(['file:///opt/hunker-bunker/resources/app.asar.unpacked/dist/audio/ost/Someone%20Is%20Still%20Alive.mp3']);
        globalThis.document = previousDocument;
    });

    it('selects camp state themes before ordinary camp character themes', () => {
        expect(selectCampInterstitial({ campId: 'camp_meridian', campState: { status: 'alive' } }).id).toBe('02');
        expect(selectCampInterstitial({ campId: 'camp_tallow', campState: { status: 'robbed' } }).id).toBe('22');
        expect(selectCampInterstitial({ campId: 'camp_vesper', campState: { status: 'turned' } }).id).toBe('23');
        expect(selectCampInterstitial({ hiveId: 'hive_suture', campState: { status: 'awakened' } }).id).toBe('11');
    });

    it('keeps the incoming scene covered until the doors finish closing', async () => {
        vi.useFakeTimers();
        const classes = new Set(['hidden']);
        const root = {
            classList: {
                add: (...names) => names.forEach((name) => classes.add(name)),
                remove: (...names) => names.forEach((name) => classes.delete(name)),
                toggle: (name, force) => force ? classes.add(name) : classes.delete(name)
            },
            setAttribute() {}
        };
        const controller = new SongInterstitialController({ root, reducedMotion: false });
        controller.loadStill = async () => true;
        controller.loadMotion = async () => false;
        controller.startSong = async () => true;

        const transition = controller.show(1, { holdMs: 10 });
        await vi.advanceTimersByTimeAsync(539);
        expect(classes.has('is-closing')).toBe(true);
        expect(classes.has('is-open')).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        expect(classes.has('is-closing')).toBe(false);
        expect(classes.has('is-open')).toBe(true);
        await vi.runAllTimersAsync();
        await transition;
    });

    it('provides 15 authored companion side-story interstitials with key art and audio cues', () => {
        expect(Object.keys(SIDE_STORY_INTERSTITIALS)).toHaveLength(15);

        const expectedKeys = [
            'val_hearth_warmth', 'val_spore_communion', 'val_eternal_hearth',
            'briggs_scorched_rig', 'briggs_scar_tissue', 'briggs_vanguard_fire',
            'kaelen_diagnostic_cradle', 'kaelen_frequency_overclock', 'kaelen_supercharged_matrix',
            'aria_whispers_abyss', 'aria_silk_trance', 'aria_queens_mark',
            'nahl_mind_link', 'nahl_co_evolution', 'nahl_transcendence'
        ];

        for (const key of expectedKeys) {
            const spec = getSongInterstitial(key);
            expect(spec).toBeTruthy();
            expect(spec.id).toBe(key);
            expect(spec.image).toMatch(/^\/interstitials\/int_.*_key_v1\.webp$/);
            expect(spec.audio).toMatch(/^\/audio\/ost\/.*\.mp3$/);
            expect(spec.musicKey).toMatch(/^music_interstitial_\d\d$/);
            expect(getSideStoryInterstitial(key)).toBe(spec);
        }
    });
});
