import { describe, expect, it } from 'vitest';
import { SONG_INTERSTITIALS, getSongInterstitial, selectCampInterstitial } from './songInterstitials.js';

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

    it('selects camp state themes before ordinary camp character themes', () => {
        expect(selectCampInterstitial({ campId: 'camp_meridian', campState: { status: 'alive' } }).id).toBe('02');
        expect(selectCampInterstitial({ campId: 'camp_tallow', campState: { status: 'robbed' } }).id).toBe('22');
        expect(selectCampInterstitial({ campId: 'camp_vesper', campState: { status: 'turned' } }).id).toBe('23');
        expect(selectCampInterstitial({ hiveId: 'hive_suture', campState: { status: 'awakened' } }).id).toBe('11');
    });
});
