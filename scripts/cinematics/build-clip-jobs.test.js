import fs from 'node:fs';
import path from 'node:path';
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
        for (const shot of ['camp', 'cryo', 'hive']) {
            for (const cls of ['scout', 'tank', 'engineer']) expect(byId[`sleep-${shot}-${cls}`]?.kind).toBe('sleep');
        }
        expect(byId['sleep-squad']?.kind).toBe('sleep');
    });

    it('redraws from the key art the game shows and lands where the runtime looks', () => {
        const card = byId.card_33;
        expect(card.firstFrame.plate).toBe(`public${getSongInterstitial('33').image}`);
        expect(card.targets.webm).toBe('/interstitials/motion/int_33_the_cave_was_breathing_motion_v1.webm');
        expect(card.audio).toBe(getSongInterstitial('33').audio);
        expect(byId.kaelen_diagnostic_cradle.firstFrame.plate).toBe(`public${SIDE_STORY_INTERSTITIALS.kaelen_diagnostic_cradle.image}`);
        expect(byId['sleep-cryo-tank'].targets).toEqual({
            webm: '/cutscenes/sleep-cryo-tank.webm', mp4: '/cutscenes/sleep-cryo-tank.mp4', poster: '/cutscenes/sleep-cryo-tank-poster.jpg'
        });
        expect(byId['sleep-cryo-tank'].firstFrame.prompt).toMatch(/cryo pod.*the Tank from reference image 2/);
    });

    it('puts the player\'s own class model in every sleep frame', () => {
        for (const job of built.jobs.filter((entry) => entry.kind === 'sleep')) {
            expect(job.firstFrame.prompt, job.id).not.toMatch(/\{\w+\}/);
            expect(job.firstFrame.references.length, job.id).toBeGreaterThan(0);
            for (const reference of job.firstFrame.references) expect(reference, job.id).toMatch(/front-idle-master\.png$/);
        }
        expect(byId['sleep-hive-scout'].firstFrame.references).toEqual(['art/source/art-remaster/sprite-v4/scout/identity/Scout.front-idle-master.png']);
        expect(byId['sleep-squad'].firstFrame.references).toHaveLength(3);
    });

    it('makes every cut the grindhouse cut: first frame, last frame, action, trigger and adult add-ons', () => {
        for (const job of built.jobs.filter((entry) => entry.kind !== 'opening')) {
            expect(job.action, job.id).toBeTruthy();
            expect(job.lastFrame, job.id).toBeTruthy();
            expect(job.firstFrame.prompt, job.id).toBeTruthy();
            expect(job.trigger, job.id).toMatch(/^(m15510n4ry|c0wg1rl|d0gg1e|bl0wj0b|d0ubl3_bj)$/);
            expect(job.loras.wan.length, job.id).toBeGreaterThan(0);
            expect(job.loras[job.firstFrame.model].length, job.id).toBeGreaterThan(0);
            expect(job.durationSec, job.id).toBeGreaterThanOrEqual(5);
        }
        expect(built.style.prefix).toMatch(/photoreal biomechanical corporate hardware/);
        expect(built.style.prefix).toMatch(/grindhouse/);
        expect(built.style.suffix).toMatch(/consenting adult/);
        expect(built.style.negative).toMatch(/child, minor/);
        expect(built.style.characterLock).toMatch(/helmet silhouette/);
        expect(built.style.continuityLock).toMatch(/subject count/);
        for (const job of built.jobs.filter((entry) => entry.kind === 'sleep')) {
            expect(job.identityLock, job.id).toBe(built.style.characterLock);
        }
    });

    it('reshoots the opening per class from the art bible, with its references in order', () => {
        const bible = fs.readFileSync(path.join(path.dirname(AUDIT_DOC), '../design/art-style-bible.md'), 'utf8');
        for (const shot of ['launch', 'flight', 'crash']) {
            for (const cls of ['scout', 'tank', 'engineer']) {
                const job = byId[`opening-${shot}-${cls}`];
                expect(job?.kind, `${shot}-${cls}`).toBe('opening');
                expect(job.firstFrame.prompt).toMatch(/^Reference images: image 1 is /);
                // The props set the look of the launch; flight and crash lead with the ship.
                if (shot === 'launch') expect(job.firstFrame.references[0]).toBe('art/source/style-refs/biomech_props_style.png');
                else expect(job.firstFrame.prompt).toMatch(/^Reference images: image 1 is the ship/);
                expect(job.lastFrame && job.action, job.id).toBeTruthy();
                expect(job.loras, job.id).toBeUndefined();
            }
        }
        // The opening speaks the bible's production style (§5b), matched to the world props.
        expect(bible).toContain('## 5b. Production style: biomech corporate hardware, the explicit cut');
        expect(byId['opening-crash-tank'].style.prefix).toContain('photoreal biomechanical corporate hardware');
        expect(byId['opening-crash-tank'].style.negative).toMatch(/child, minor/);
        expect(byId['opening-launch-scout'].targets.webm).toBe('/cutscenes/scout-class-intro.webm');
        expect(byId['opening-flight-tank'].targets.webm).toBe('/cutscenes/tank-intro.webm');
        expect(byId['opening-crash-engineer'].targets.webm).toBe('/cutscenes/engineer-crash.webm');
        expect(byId['opening-launch-tank'].firstFrame.references).toContain('art/source/cinematics/operator-identities/factory/tank/identity_sheet_3x3.png');
        expect(byId['opening-launch-tank'].identityLock).toMatch(/nine views/);
    });

    it('parses the audit entry and table formats', () => {
        const entries = parseClipEntries('**K-1 `kaelen_x`, "Title"** (first frame)\n- **First Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, foo: a bay. Soot-black iron, bone ivory, rest.\n- **Image-to-Video Action Prompt:** Slow push.\n\n**SL-1 `sleep-camp`**\n- **Image-to-Video Action Prompt:** glide; 7 s.\n');
        expect(entries.map((e) => [e.code, e.id, e.title])).toEqual([['K-1', 'kaelen_x', 'Title'], ['SL-1', 'sleep-camp', null]]);
        expect(sceneOnly(entries[0].firstFrame)).toBe('a bay.');
        expect(parseEndingCardRows('| 33 The Cave | the wall | push in; 7 s |')).toEqual([{ id: '33', title: 'The Cave', lastFrame: 'the wall', action: 'push in; 7 s' }]);
    });

    it('gives every clip a sound design whose layers fit inside the clip', () => {
        const design = JSON.parse(fs.readFileSync(path.join(path.dirname(AUDIT_DOC), '../../scripts/cinematics/sound-layers.json'), 'utf8'));
        for (const job of built.jobs) {
            const spec = design.jobs[job.soundDesign ?? job.id];
            expect(spec, job.id).toBeTruthy();
            expect(spec.layers.length, job.id).toBeGreaterThanOrEqual(3);
            const ids = new Set();
            for (const layer of spec.layers) {
                expect(layer.prompt, `${job.id}.${layer.id}`).toMatch(/\w{3,}/);
                expect(ids.has(layer.id), `${job.id}.${layer.id} duplicated`).toBe(false);
                ids.add(layer.id);
                expect(layer.start ?? 0, `${job.id}.${layer.id}`).toBeLessThan(job.durationSec - 0.5);
                expect(layer.gainDb, `${job.id}.${layer.id}`).toBeLessThanOrEqual(0);
            }
        }
        expect(Object.keys(design.jobs).sort()).toEqual([...new Set(built.jobs.map((job) => job.soundDesign ?? job.id))].sort());
    });
});

describe('shipped motion clips', () => {
    it('only lists encoded clips, and the registries play each one', async () => {
        const { SHIPPED_MOTION_CLIPS } = await import('../../src/cinematics/shippedMotionClips.js');
        const { SHIPPED_SLEEP_CUTSCENES } = await import('../../src/sleepCutscene.js');
        for (const id of SHIPPED_MOTION_CLIPS) {
            const job = byId[id];
            expect(job, id).toBeTruthy();
            for (const target of Object.values(job.targets)) {
                expect(fs.existsSync(path.join(process.cwd(), 'public', target)), `${id} -> ${target}`).toBe(true);
            }
            if (job.kind === 'side-story') {
                expect(SIDE_STORY_INTERSTITIALS[id].status, id).toBe('final');
                expect(SIDE_STORY_INTERSTITIALS[id].motionWebm, id).toBe(job.targets.webm);
            } else if (job.kind === 'song-card') {
                expect(getSongInterstitial(id.replace('card_', '')).motionWebm, id).toBe(job.targets.webm);
            } else {
                expect(SHIPPED_SLEEP_CUTSCENES.has(id), id).toBe(true);
            }
        }
    });
});
