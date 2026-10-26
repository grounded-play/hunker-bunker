#!/usr/bin/env node
/**
 * Build scripts/cinematics/clip-jobs.json: every motion clip the game is
 * still missing, with its first frame, action prompt, music and targets.
 *
 *     node scripts/cinematics/build-clip-jobs.mjs
 *
 * Prompts come from docs/planning/camp-interaction-and-cinematics-audit-
 * 2026-10-16.md §10 (side stories, cards 33–38, sleep); key art and music
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

// The audit's shared frame-prompt prefix names an artist; generation prompts
// describe the look instead (casting and art rules: no named references).
export const STYLE_PREFIX = 'Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained biomechanical ribbing and bone-ivory machinery:';
export const STYLE_SUFFIX = 'Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.';
export const MOTION_SUFFIX = 'Single continuous shot, cinematic camera, consistent characters and lighting, subtle film grain, no cuts, no text.';
export const NEGATIVE = 'low quality, worst quality, deformed, distorted, disfigured, motion smear, motion artifacts, fused fingers, bad anatomy, extra limbs, flicker, jitter, morphing face, text, watermark, logo, subtitles, cartoon';

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
    const match = /(\d+(?:\.\d+)?)\s*s\b/.exec(action ?? '');
    return match ? Number(match[1]) : fallback;
}

export function buildClipJobs(doc) {
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
            action: entry.action,
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
            action: row.action.replace(/;?\s*\d+(?:\.\d+)?\s*s\s*$/, '').trim(),
            lastFrame: sceneOnly(row.lastFrame),
            durationSec: durationOf(row.action, 6),
            audio: spec.audio,
            targets: {
                webm: `/interstitials/motion/int_${row.id}_${slug}_motion_v1.webm`,
                mp4: `/interstitials/int_${row.id}_${slug}_key_v1.mp4`
            }
        });
    }
    for (const entry of parseClipEntries(section(doc, '### 10.7 ', '## 11.'))) {
        jobs.push({
            id: entry.id,
            kind: 'sleep',
            title: entry.id,
            firstFrame: { prompt: sceneOnly(entry.firstFrame) },
            action: entry.action.replace(/;?\s*\d+(?:\.\d+)?\s*s\s*$/, '').trim(),
            lastFrame: sceneOnly(entry.lastFrame),
            durationSec: durationOf(entry.action, 7),
            audio: SLEEP_AUDIO,
            targets: {
                webm: `/cutscenes/${entry.id}.webm`,
                mp4: `/cutscenes/${entry.id}.mp4`,
                poster: `/cutscenes/${entry.id}-poster.jpg`
            }
        });
    }
    return {
        source: path.relative(ROOT, AUDIT_DOC),
        style: { prefix: STYLE_PREFIX, suffix: STYLE_SUFFIX, motionSuffix: MOTION_SUFFIX, negative: NEGATIVE },
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
