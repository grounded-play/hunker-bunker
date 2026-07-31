import { describe, expect, it } from 'vitest';
import {
    SONG_INTERSTITIALS,
    SongInterstitialController,
    getSongInterstitial,
    selectCampInterstitial
} from './songInterstitials.js';

describe('song interstitial manifest', () => {
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
        expect(video.src).toBe('file:///opt/hunker-bunker/resources/app.asar/dist/interstitials/motion/int_01_someone_is_still_alive_motion_v1.webm');
        expect(decoded).toEqual(['file:///opt/hunker-bunker/resources/app.asar/dist/audio/ost/Someone%20Is%20Still%20Alive.mp3']);
        globalThis.document = previousDocument;
    });

    it('selects camp state themes before ordinary camp character themes', () => {
        expect(selectCampInterstitial({ campId: 'camp_meridian', campState: { status: 'alive' } }).id).toBe('02');
        expect(selectCampInterstitial({ campId: 'camp_tallow', campState: { status: 'robbed' } }).id).toBe('22');
        expect(selectCampInterstitial({ campId: 'camp_vesper', campState: { status: 'turned' } }).id).toBe('23');
        expect(selectCampInterstitial({ hiveId: 'hive_suture', campState: { status: 'awakened' } }).id).toBe('11');
    });
});
