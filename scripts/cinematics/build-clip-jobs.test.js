import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AUDIT_DOC, buildClipJobs, parseClipEntries, parseEndingCardRows, sceneOnly } from './build-clip-jobs.mjs';
import { SIDE_STORY_INTERSTITIALS, getSongInterstitial } from '../../src/songInterstitials.js';

const built = buildClipJobs(fs.readFileSync(AUDIT_DOC, 'utf8'));
const byId = Object.fromEntries(built.jobs.map((job) => [job.id, job]));

describe('motion clip jobs from the cinematics audit', () => {
    it('covers every still-only side story, the ending cards and the four sleep styles', () => {
        const stillSides = Object.values(SIDE_STORY_INTERSTITIALS).filter((spec) => spec.status === 'still').map((spec) => spec.id);
        for (const id of stillSides) expect(byId[id]?.kind, id).toBe('side-story');
        for (const id of ['33', '34', '35', '36', '37', '38']) expect(byId[`card_${id}`]?.kind).toBe('song-card');
        for (const id of ['sleep-camp', 'sleep-cryo', 'sleep-hive', 'sleep-squad']) expect(byId[id]?.kind).toBe('sleep');
    });

    it('starts from the key art the game shows and lands where the runtime looks', () => {
        const card = byId.card_33;
        expect(card.firstFrame.image).toBe(getSongInterstitial('33').image);
        expect(card.targets.webm).toBe('/interstitials/motion/int_33_the_cave_was_breathing_motion_v1.webm');
        expect(card.audio).toBe(getSongInterstitial('33').audio);
        expect(byId.kaelen_diagnostic_cradle.firstFrame.image).toBe(SIDE_STORY_INTERSTITIALS.kaelen_diagnostic_cradle.image);
        expect(byId['sleep-cryo'].targets).toEqual({
            webm: '/cutscenes/sleep-cryo.webm', mp4: '/cutscenes/sleep-cryo.mp4', poster: '/cutscenes/sleep-cryo-poster.jpg'
        });
        expect(byId['sleep-cryo'].firstFrame.prompt).toMatch(/cryo pod/);
    });

    it('keeps every prompt free of named artists and carries a usable action', () => {
        for (const job of built.jobs) {
            expect(job.action, job.id).toBeTruthy();
            expect(JSON.stringify(job), job.id).not.toMatch(/Giger/i);
            expect(job.durationSec, job.id).toBeGreaterThanOrEqual(5);
        }
        expect(built.style.prefix).not.toMatch(/Giger/i);
    });

    it('parses the audit entry and table formats', () => {
        const entries = parseClipEntries('**K-1 `kaelen_x`, "Title"** (first frame)\n- **First Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, foo: a bay. Soot-black iron, bone ivory, rest.\n- **Image-to-Video Action Prompt:** Slow push.\n\n**SL-1 `sleep-camp`**\n- **Image-to-Video Action Prompt:** glide; 7 s.\n');
        expect(entries.map((e) => [e.code, e.id, e.title])).toEqual([['K-1', 'kaelen_x', 'Title'], ['SL-1', 'sleep-camp', null]]);
        expect(sceneOnly(entries[0].firstFrame)).toBe('a bay.');
        expect(parseEndingCardRows('| 33 The Cave | the wall | push in; 7 s |')).toEqual([{ id: '33', title: 'The Cave', lastFrame: 'the wall', action: 'push in; 7 s' }]);
    });
});
