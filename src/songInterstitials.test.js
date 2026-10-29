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
        // Hive first contact: Nahl's Suture has its own song; 11 belongs to
        // Aria's first whisper (src/cinematicBeats.js); other hives have none.
        expect(selectCampInterstitial({ hiveId: 'hive_suture', campState: { status: 'awakened' } }).id).toBe('08');
        expect(selectCampInterstitial({ hiveId: 'hive_relay', campState: { status: 'awakened' } })).toBeNull();
        expect(selectCampInterstitial({ hiveId: 'hive_relay', campState: { status: 'turned' } }).id).toBe('23');
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

    it('plays above the host stage doors without its own panels or bookend', async () => {
        vi.useFakeTimers();
        const classes = new Set(['hidden']);
        const root = {
            classList: {
                add: (...names) => names.forEach((name) => classes.add(name)),
                remove: (...names) => names.forEach((name) => classes.delete(name)),
                toggle: (name, force) => force ? classes.add(name) : classes.delete(name),
                contains: (name) => classes.has(name)
            },
            setAttribute() {}
        };
        const controller = new SongInterstitialController({ root, reducedMotion: false });
        controller.loadStill = async () => true;
        controller.loadMotion = async () => false;
        controller.startSong = async () => true;

        const transition = controller.show(1, { holdMs: 100, stageDoors: true });
        // The stage doors are already shut: the card opens at once.
        await vi.advanceTimersByTimeAsync(0);
        expect(classes.has('uses-stage-doors')).toBe(true);
        expect(classes.has('is-open')).toBe(true);
        await vi.advanceTimersByTimeAsync(100);
        const result = await transition;
        expect(result).toMatchObject({ shown: true });
        expect(result.behindDoors).toBeUndefined();
        expect(classes.has('is-closing-out')).toBe(false);
        expect(classes.has('hidden')).toBe(true);
        expect(classes.has('uses-stage-doors')).toBe(false);
    });

    it('closes the doors again and mounts the next scene behind them before revealing gameplay', async () => {
        vi.useFakeTimers();
        const classes = new Set(['hidden']);
        const root = {
            classList: {
                add: (...names) => names.forEach((name) => classes.add(name)),
                remove: (...names) => names.forEach((name) => classes.delete(name)),
                toggle: (name, force) => force ? classes.add(name) : classes.delete(name),
                contains: (name) => classes.has(name)
            },
            setAttribute() {}
        };
        const controller = new SongInterstitialController({ root, reducedMotion: false });
        controller.loadStill = async () => true;
        controller.loadMotion = async () => false;
        controller.startSong = async () => true;
        const behind = vi.fn(() => {
            // The conversation must mount while the doors fully cover the screen.
            expect(classes.has('is-closing-out')).toBe(true);
        });

        const transition = controller.show(1, { holdMs: 100, onBehindDoors: behind });
        await vi.advanceTimersByTimeAsync(540 + 100);
        expect(classes.has('is-closing-out')).toBe(true);
        expect(behind).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(539);
        expect(behind).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(behind).toHaveBeenCalledTimes(1);
        expect(classes.has('is-revealing')).toBe(true);
        expect(classes.has('is-closing-out')).toBe(false);
        expect(classes.has('hidden')).toBe(false);
        await vi.advanceTimersByTimeAsync(540);
        const result = await transition;
        expect(result).toMatchObject({ shown: true, behindDoors: true });
        expect(classes.has('hidden')).toBe(true);
        expect(classes.has('is-revealing')).toBe(false);
    });

    it('plays one card at a time: a card requested mid-reveal waits for the first to finish', async () => {
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
        const title = { textContent: '' };
        const controller = new SongInterstitialController({ root, title, reducedMotion: false });
        controller.loadStill = async () => true;
        controller.loadMotion = async () => false;
        controller.startSong = async () => true;
        let second = null;
        const first = controller.show(2, {
            holdMs: 100,
            // The conversation that mounts behind the doors asks for another card.
            onBehindDoors: () => { second = controller.show(19, { holdMs: 100 }); }
        });
        await vi.advanceTimersByTimeAsync(540 + 100 + 540);
        expect(second).toBeTruthy();
        expect(classes.has('is-revealing')).toBe(true);
        expect(title.textContent).toBe(getSongInterstitial(2).title);
        await vi.advanceTimersByTimeAsync(540);
        await first;
        expect(classes.has('is-revealing')).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        expect(title.textContent).toBe(getSongInterstitial(19).title);
        expect(classes.has('is-closing')).toBe(true);
        await vi.runAllTimersAsync();
        await expect(second).resolves.toMatchObject({ shown: true });
    });

    it('owns its skip keys: captured before menus, swallowed, and kept across other keys', async () => {
        vi.useFakeTimers();
        const listeners = [];
        const previousWindow = globalThis.window;
        globalThis.window = {
            addEventListener: (type, fn, opts) => listeners.push({ type, fn, opts }),
            removeEventListener: (type, fn) => {
                const index = listeners.findIndex((entry) => entry.type === type && entry.fn === fn);
                if (index >= 0) listeners.splice(index, 1);
            }
        };
        try {
            const root = {
                classList: { add() {}, remove() {}, toggle() {} },
                setAttribute() {},
                addEventListener() {},
                removeEventListener() {}
            };
            const controller = new SongInterstitialController({ root, reducedMotion: false });
            controller.loadStill = async () => true;
            controller.loadMotion = async () => false;
            controller.startSong = async () => true;
            let done = false;
            const transition = controller.show(1, { holdMs: 60_000 }).then(() => { done = true; });
            await vi.advanceTimersByTimeAsync(600);
            const keydown = listeners.find((entry) => entry.type === 'keydown');
            expect(keydown?.opts?.capture).toBe(true);
            const key = (code) => ({ type: 'keydown', code, preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() });
            const walk = key('KeyW');
            keydown.fn(walk);
            expect(walk.stopImmediatePropagation).not.toHaveBeenCalled();
            expect(listeners.some((entry) => entry.type === 'keydown')).toBe(true);
            const escape = key('Escape');
            keydown.fn(escape);
            expect(escape.preventDefault).toHaveBeenCalled();
            expect(escape.stopImmediatePropagation).toHaveBeenCalled();
            await vi.advanceTimersByTimeAsync(400);
            await transition;
            expect(done).toBe(true);
            expect(listeners.some((entry) => entry.type === 'keydown')).toBe(false);
        } finally {
            globalThis.window = previousWindow;
        }
    });

    it('labels a side-story card by character and camp, not as a track number', async () => {
        vi.useFakeTimers();
        const root = { classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {} };
        const track = { textContent: '' };
        const controller = new SongInterstitialController({ root, track, reducedMotion: true });
        controller.loadStill = async () => true;
        controller.loadMotion = async () => false;
        controller.startSong = async () => true;
        const transition = controller.show('kaelen_frequency_overclock');
        await vi.advanceTimersByTimeAsync(1);
        expect(track.textContent).toBe('Overseer Kaelen // Camp Meridian');
        await vi.runAllTimersAsync();
        await transition;
    });

    it('still reveals gameplay when the behind-doors callback throws', async () => {
        vi.useFakeTimers();
        const classes = new Set();
        const root = {
            classList: {
                add: (...names) => names.forEach((name) => classes.add(name)),
                remove: (...names) => names.forEach((name) => classes.delete(name)),
                toggle: (name, force) => force ? classes.add(name) : classes.delete(name)
            },
            setAttribute() {}
        };
        const controller = new SongInterstitialController({ root, reducedMotion: true });
        controller.loadStill = async () => true;
        controller.loadMotion = async () => false;
        controller.startSong = async () => true;
        const transition = controller.show(1, { onBehindDoors: () => { throw new Error('boom'); } });
        await vi.runAllTimersAsync();
        await expect(transition).resolves.toMatchObject({ shown: true, behindDoors: true });
        expect(classes.has('hidden')).toBe(true);
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
            expect(spec.image).toMatch(/^\/interstitials\/int_.*_key_v[12]\.webp$/);
            expect(spec.audio).toMatch(/^\/audio\/ost\/.*\.mp3$/);
            expect(spec.musicKey).toMatch(/^music_interstitial_\d\d$/);
            expect(getSideStoryInterstitial(key)).toBe(spec);
        }
    });
});
