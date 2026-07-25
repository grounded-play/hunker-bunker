import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    CHAPTER_AMBIENCE,
    HOTSPOT_AUDIO,
    RGB_AUDIO_MANIFEST,
    getDialogueSpeaker,
    hasAuthoredVoice
} from './audio.js';
import { CHAPTERS } from './content.js';

describe('RGB audio content', () => {
    const keys = new Set(RGB_AUDIO_MANIFEST.audio.map((item) => item.key));

    it('ships every declared audio file', () => {
        for (const item of RGB_AUDIO_MANIFEST.audio) {
            expect(existsSync(resolve('public', item.url.slice(1))), item.url).toBe(true);
        }
    });

    it('maps every chapter to a shipped ambience loop', () => {
        expect(Object.keys(CHAPTER_AMBIENCE).sort()).toEqual(Object.keys(CHAPTERS).sort());
        for (const key of Object.values(CHAPTER_AMBIENCE)) expect(keys.has(key)).toBe(true);
    });

    it('only maps real hotspots to shipped cues', () => {
        const hotspots = new Set(
            Object.values(CHAPTERS).flatMap((chapter) => chapter.hotspots.map((hotspot) => hotspot.id))
        );
        for (const [hotspotId, cues] of Object.entries(HOTSPOT_AUDIO)) {
            expect(hotspots.has(hotspotId), hotspotId).toBe(true);
            for (const cue of cues) expect(keys.has(cue), cue).toBe(true);
        }
    });

    it('distinguishes authored voice from auto-spoken dialogue fallback', () => {
        expect(hasAuthoredVoice('listen_voicemail')).toBe(true);
        expect(hasAuthoredVoice('inspect_bottle')).toBe(false);
        expect(getDialogueSpeaker('scan_bottle')).toBe('KIOSK');
        expect(getDialogueSpeaker('inspect_bottle')).toBe('ELIAS');
    });
});
