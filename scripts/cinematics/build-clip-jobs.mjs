#!/usr/bin/env node
/**
 * Build scripts/cinematics/clip-jobs.json: every motion clip the game is
 * still missing, with its first frame, action prompt, music and targets.
 *
 *     node scripts/cinematics/build-clip-jobs.mjs
 *
 * Prompts come from docs/planning/camp-interaction-and-cinematics-audit-
 * 2026-10-16.md §10 (side stories, cards 33–38) and scripts/cinematics/
 * sleep-frames.json (sleep: one clip per player class, the class model as
 * the first frame's reference image, plus the squad); key art and music
 * from the runtime registries (src/songInterstitials.js), so a clip always
 * lands where the game looks for it. scripts/cinematics/comfy_clips.py
 * renders the jobs (docs/cinematics-comfyui-pipeline.md).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SIDE_STORY_INTERSTITIALS, getSongInterstitial } from '../../src/songInterstitials.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const AUDIT_DOC = path.join(ROOT, 'docs/planning/camp-interaction-and-cinematics-audit-2026-10-16.md');
const OUT = path.join(ROOT, 'scripts/cinematics/clip-jobs.json');
export const SLEEP_FRAMES = path.join(ROOT, 'scripts/cinematics/sleep-frames.json');

// Named-artist shorthand and literal anatomy made earlier generations feel derivative
// and blunt. These locks express the house language and travel with every take.
export const STYLE_PREFIX = 'Hunker Bunker cinematic, 16:9, mature Nordic cathedral biomechanical horror: monumental stepped granite, disciplined blackened-iron bindings, carved bone arches and restrained Jugendstil interlace invaded from seams by an internal living system;';
export const STYLE_SUFFIX = 'near-black exposure, one motivated amber practical, sparse teal diagnostics, cold floor fog, wet reflections, bruised maroon only inside ruptures, tactile film grain, severe graphic composition; intimate unease through scale, rhythm and surface tension rather than literal anatomy; all depicted humans are adults; no readable text, logos or watermarks.';
export const CHARACTER_LOCK = 'IDENTITY LOCK: preserve the reference character exactly—helmet silhouette, visor shape and colour, armour proportions, plate layout, material colours, knee lights, tools and body scale; helmet remains sealed; do not expose a face or redesign the suit.';
export const CONTINUITY_LOCK = 'CONTINUITY LOCK: preserve subject count, screen direction, set geometry, costume damage, prop placement, palette and key-light direction from the approved first frame; only described actions may change state.';
export const MOTION_SUFFIX = 'Single continuous shot with one camera move and one primary action. Natural weight and restrained secondary motion. Hold the resolved final composition for twelve frames. No cuts, no new subjects, no camera teleport, no text.';
export const NEGATIVE = 'low quality, deformed anatomy, extra limbs, fused fingers, duplicated subject, identity drift, different armour, open helmet, bare face, costume colour shift, prop spawning, disappearing objects, melting geometry, rubber motion, motion smear, flicker, jitter, morphing face, exposure pumping, camera jump, text, watermark, logo, subtitles, cartoon, literal genital anatomy, explicit sexual activity';

const SLEEP_AUDIO = '/cutscenes/sleep-bunker.webm';

function section(doc, start, end) {
    const from = doc.indexOf(start);
    if (from < 0) throw new Error(`audit section not found: ${start}`);
    const to = end ? doc.indexOf(end, from + start.length) : -1;
    return doc.slice(from, to < 0 ? undefined : to);
}

function field(block, label) {
    const match = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`).exec(block);
    return match ? match[1].trim() : null;
}

/** Strip the audit's artist-naming prefix and shared suffix from a frame prompt. */
export function sceneOnly(prompt) {
    return String(prompt ?? '')
        .replace(/^Hunker Bunker key art, 16:9 cinematic still,[^:]*:\s*/i, '')
        .replace(/\s*Soot-black iron, bone ivory.*$/i, '')
        .trim();
}

/** Entries shaped `**K-1 `id`, "Title"**` followed by prompt bullets. */
export function parseClipEntries(text) {
    const entries = [];
    const heading = /^\*\*([A-Z]+-\d+) `([^`]+)`(?:, "([^"]+)")?\*\*/gm;
    const marks = [...text.matchAll(heading)];
    marks.forEach((mark, index) => {
        const block = text.slice(mark.index, marks[index + 1]?.index ?? text.length);
        entries.push({
            code: mark[1],
            id: mark[2],
            title: mark[3] ?? null,
            firstFrame: field(block, 'First Frame Prompt'),
            lastFrame: field(block, 'Last Frame Prompt'),
            action: field(block, 'Image-to-Video Action Prompt')
        });
    });
    return entries;
}

/** The 10.6 table: `| 33 Title | last frame | action |`. */
export function parseEndingCardRows(text) {
    return [...text.matchAll(/^\|\s*(3[3-8]) ([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/gm)]
        .map(([, id, title, lastFrame, action]) => ({ id, title, lastFrame, action }));
}

function durationOf(action, fallback) {
    const match = /(\d+(?:\.\d+)?)\s*(?:s|secs?|seconds?)\b/.exec(action ?? '');
    return match ? Number(match[1]) : fallback;
}

/** The action without its trailing length note ("Single shot, 7 seconds." / "; 7 s"). */
export function actionOnly(action) {
    return String(action ?? '')
        .replace(/\s*Single (?:continuous )?shot, \d+(?:\.\d+)? seconds?\.?\s*$/i, '')
        .replace(/;?\s*\d+(?:\.\d+)?\s*s\.?\s*$/, '')
        .trim();
}

/** Sleep clips: camp/cryo/hive once per player class, the squad once with every class. */
export function sleepJobs(frames) {
    const job = (id, shot, classes, prompt) => ({
        id,
        kind: 'sleep',
        title: id,
        soundDesign: `sleep-${shot}`,
        firstFrame: {
            prompt,
            references: classes.map((cls) => frames.classes[cls].reference)
        },
        identityLock: CHARACTER_LOCK,
        action: frames.shots[shot].action,
        lastFrame: frames.shots[shot].lastFrame,
        durationSec: frames.shots[shot].durationSec,
        audio: SLEEP_AUDIO,
        targets: { webm: `/cutscenes/${id}.webm`, mp4: `/cutscenes/${id}.mp4`, poster: `/cutscenes/${id}-poster.jpg` }
    });
    const jobs = [];
    for (const [shot, spec] of Object.entries(frames.shots)) {
        if (spec.classes) {
            const prompt = spec.classes.reduce((text, cls, index) => text.replace(`{${cls}}`, `the ${frames.classes[cls].name} from reference image ${index + 1}, ${frames.classes[cls].look},`), spec.firstFrame);
            jobs.push(job(`sleep-${shot}`, shot, spec.classes, prompt));
            continue;
        }
        for (const [cls, look] of Object.entries(frames.classes)) {
            jobs.push(job(`sleep-${shot}-${cls}`, shot, [cls], spec.firstFrame.replace('{operator}', `the ${look.name} from the reference image, ${look.look},`)));
        }
    }
    return jobs;
}

export function buildClipJobs(doc, sleepFrames = JSON.parse(fs.readFileSync(SLEEP_FRAMES, 'utf8'))) {
    const jobs = [];
    const sides = parseClipEntries(section(doc, '### 10.1 ', '### 10.6 '));
    for (const entry of sides) {
        const spec = SIDE_STORY_INTERSTITIALS[entry.id];
        if (!spec) throw new Error(`audit clip ${entry.code} has no side-story spec: ${entry.id}`);
        jobs.push({
            id: entry.id,
            kind: 'side-story',
            title: spec.title,
            firstFrame: { image: spec.image },
            action: actionOnly(entry.action),
            lastFrame: sceneOnly(entry.lastFrame),
            durationSec: durationOf(entry.action, 6),
            audio: spec.audio,
            targets: { webm: `/interstitials/motion/int_${entry.id}_motion_v1.webm` }
        });
    }
    for (const row of parseEndingCardRows(section(doc, '### 10.6 ', '### 10.7 '))) {
        const spec = getSongInterstitial(row.id);
        if (!spec) throw new Error(`song card ${row.id} missing from the registry`);
        const slug = spec.image.replace(/^\/interstitials\/int_\d+_/, '').replace(/_key_v1\.webp$/, '');
        jobs.push({
            id: `card_${row.id}`,
            kind: 'song-card',
            title: spec.title,
            firstFrame: { image: spec.image },
            action: actionOnly(row.action),
            lastFrame: sceneOnly(row.lastFrame),
            durationSec: durationOf(row.action, 6),
            audio: spec.audio,
            targets: {
                webm: `/interstitials/motion/int_${row.id}_${slug}_motion_v1.webm`,
                mp4: `/interstitials/int_${row.id}_${slug}_key_v1.mp4`
            }
        });
    }
    for (const job of sleepJobs(sleepFrames)) jobs.push(job);
    return {
        source: path.relative(ROOT, AUDIT_DOC),
        style: {
            prefix: STYLE_PREFIX,
            suffix: STYLE_SUFFIX,
            characterLock: CHARACTER_LOCK,
            continuityLock: CONTINUITY_LOCK,
            motionSuffix: MOTION_SUFFIX,
            negative: NEGATIVE
        },
        jobs
    };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const built = buildClipJobs(fs.readFileSync(AUDIT_DOC, 'utf8'));
    fs.writeFileSync(OUT, `${JSON.stringify(built, null, 2)}\n`);
    const kinds = {};
    for (const job of built.jobs) kinds[job.kind] = (kinds[job.kind] ?? 0) + 1;
    console.log(`[clip-jobs] ${built.jobs.length} jobs -> ${path.relative(ROOT, OUT)}`, kinds);
}
