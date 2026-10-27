#!/usr/bin/env node
/**
 * Build scripts/cinematics/clip-jobs.json: every motion clip the game is
 * still missing, with its first frame, action prompt, music and targets.
 *
 *     node scripts/cinematics/build-clip-jobs.mjs
 *
 * Every cut is the grindhouse cut (docs/design/art-style-bible.md): first
 * frame, last frame, action, LoRA trigger and model add-ons come from
 * scripts/cinematics/cut-prompts.json. Side stories and cards 33–38 use
 * their key art as the frames' reference image; sleep films use the player
 * class model (camp, cryo and hive once per class, plus the squad). Lengths
 * come from docs/planning/camp-interaction-and-cinematics-audit-2026-10-16.md
 * §10, key art, music and targets from the runtime registries
 * (src/songInterstitials.js), so a clip always lands where the game looks
 * for it. scripts/cinematics/comfy_clips.py renders the jobs
 * (docs/cinematics-comfyui-pipeline.md).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SIDE_STORY_INTERSTITIALS, getSongInterstitial } from '../../src/songInterstitials.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const AUDIT_DOC = path.join(ROOT, 'docs/planning/camp-interaction-and-cinematics-audit-2026-10-16.md');
const OUT = path.join(ROOT, 'scripts/cinematics/clip-jobs.json');
export const CUT_PROMPTS = path.join(ROOT, 'scripts/cinematics/cut-prompts.json');

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
export function sleepJobs(cut) {
    const job = (id, shot, classes, prompt) => ({
        id,
        kind: 'sleep',
        title: id,
        soundDesign: `sleep-${shot}`,
        firstFrame: { prompt, references: classes.map((cls) => cut.classes[cls].reference), model: 'flux' },
        identityLock: cut.style.characterLock,
        action: cut.sleep[shot].action,
        lastFrame: cut.sleep[shot].lastFrame,
        trigger: cut.sleep[shot].trigger,
        loras: cut.loras,
        durationSec: cut.sleep[shot].durationSec,
        audio: SLEEP_AUDIO,
        targets: { webm: `/cutscenes/${id}.webm`, mp4: `/cutscenes/${id}.mp4`, poster: `/cutscenes/${id}-poster.jpg` }
    });
    const jobs = [];
    for (const [shot, spec] of Object.entries(cut.sleep)) {
        if (spec.classes) {
            const prompt = spec.classes.reduce((text, cls, index) => text.replace(`{${cls}}`, `the ${cut.classes[cls].name} from reference image ${index + 1}, ${cut.classes[cls].look},`), spec.firstFrame);
            jobs.push(job(`sleep-${shot}`, shot, spec.classes, prompt));
            continue;
        }
        for (const [cls, look] of Object.entries(cut.classes)) {
            jobs.push(job(`sleep-${shot}-${cls}`, shot, [cls], spec.firstFrame.replace('{operator}', `the ${look.name} from the reference image, ${look.look},`)));
        }
    }
    return jobs;
}

/** A key-art cut: the scene's frames and action, with the key art as the frames' reference image. */
function sceneJob(cut, id, kind, spec, extra) {
    const scene = cut.scenes[id];
    if (!scene) throw new Error(`no grindhouse cut for ${id} in scripts/cinematics/cut-prompts.json`);
    return {
        id,
        kind,
        title: spec.title,
        // Z-Image holds the look and the explicit brief; the key art rides along for the last frame.
        firstFrame: { prompt: scene.firstFrame, references: [`public${spec.image}`], model: 'zimage' },
        action: scene.action,
        lastFrame: scene.lastFrame,
        trigger: scene.trigger,
        loras: cut.loras,
        audio: spec.audio,
        ...extra
    };
}

export function buildClipJobs(doc, cut = JSON.parse(fs.readFileSync(CUT_PROMPTS, 'utf8'))) {
    const jobs = [];
    for (const entry of parseClipEntries(section(doc, '### 10.1 ', '### 10.6 '))) {
        const spec = SIDE_STORY_INTERSTITIALS[entry.id];
        if (!spec) throw new Error(`audit clip ${entry.code} has no side-story spec: ${entry.id}`);
        jobs.push(sceneJob(cut, entry.id, 'side-story', spec, {
            durationSec: durationOf(entry.action, 6),
            targets: { webm: `/interstitials/motion/int_${entry.id}_motion_v1.webm` }
        }));
    }
    for (const row of parseEndingCardRows(section(doc, '### 10.6 ', '### 10.7 '))) {
        const spec = getSongInterstitial(row.id);
        if (!spec) throw new Error(`song card ${row.id} missing from the registry`);
        const slug = spec.image.replace(/^\/interstitials\/int_\d+_/, '').replace(/_key_v1\.webp$/, '');
        jobs.push(sceneJob(cut, `card_${row.id}`, 'song-card', spec, {
            durationSec: durationOf(row.action, 6),
            targets: {
                webm: `/interstitials/motion/int_${row.id}_${slug}_motion_v1.webm`,
                mp4: `/interstitials/int_${row.id}_${slug}_key_v1.mp4`
            }
        }));
    }
    for (const job of sleepJobs(cut)) jobs.push(job);
    return { source: path.relative(ROOT, CUT_PROMPTS), style: cut.style, jobs };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const built = buildClipJobs(fs.readFileSync(AUDIT_DOC, 'utf8'));
    fs.writeFileSync(OUT, `${JSON.stringify(built, null, 2)}\n`);
    const kinds = {};
    for (const job of built.jobs) kinds[job.kind] = (kinds[job.kind] ?? 0) + 1;
    console.log(`[clip-jobs] ${built.jobs.length} jobs -> ${path.relative(ROOT, OUT)}`, kinds);
}
