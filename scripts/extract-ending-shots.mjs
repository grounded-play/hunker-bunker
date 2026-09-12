#!/usr/bin/env node
/**
 * Extract the ending shot list from the production brief into a machine
 * manifest that Blender can consume.
 *
 *   node scripts/extract-ending-shots.mjs [--doc <path>] [--out <path>]
 *
 * The brief is the source of truth and is actively authored by hand. This
 * parses it on every run rather than copying its contents, so a change to a
 * lens, a frame range or the visual language flows into the generated .blend
 * files without anyone re-typing it into a second place that can drift.
 *
 * Parsing targets structure only -- headings, the "Primary sets" line, and the
 * shot table's leading columns -- so prose edits inside a cell cannot break it.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DEFAULT_DOC = 'docs/planning/blender-ending-scene-blocks-and-shot-list-2026-09-12.md';
const DEFAULT_OUT = 'scripts/blender/manifests/ending-shots.json';

/** "1:18-3:06 / 43-78" -> { startFrame: 43, endFrame: 78 } */
export function parseFrameRange(cell) {
    const m = /(\d+)\s*[-–]\s*(\d+)\s*$/.exec(String(cell).split('/').pop() ?? '');
    if (!m) return null;
    const startFrame = Number(m[1]);
    const endFrame = Number(m[2]);
    if (!Number.isFinite(startFrame) || !Number.isFinite(endFrame) || endFrame < startFrame) return null;
    return { startFrame, endFrame };
}

/** "28 mm-equivalent wide, low track right" -> 28 */
export function parseLensMm(cell) {
    const m = /(\d+(?:\.\d+)?)\s*mm/i.exec(String(cell));
    return m ? Number(m[1]) : null;
}

/** "**Primary sets:** SET-D then SET-A." -> ['SET-D','SET-A'] */
export function parseSets(line) {
    return [...String(line).matchAll(/SET-([A-Z])/g)].map((m) => `SET-${m[1]}`);
}

export function extractShots(markdown) {
    const lines = String(markdown).split('\n');
    const sequences = [];
    let current = null;

    for (const line of lines) {
        const seq = /^##\s+Sequence\s+(\d+)\s+[—-]\s+(.+?)\s*$/.exec(line);
        if (seq) {
            current = {
                index: Number(seq[1]),
                name: seq[2].trim(),
                id: seq[2].trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
                sets: [],
                shots: []
            };
            sequences.push(current);
            continue;
        }
        if (!current) continue;

        if (/^\*\*Primary sets?:\*\*/.test(line)) {
            current.sets = parseSets(line);
            continue;
        }

        // Shot rows look like: | MI-01 | 0:00-1:18 / 0-42 | 28 mm ... |
        const row = /^\|\s*([A-Z]{2,3}-\d{2})\s*\|(.+)\|\s*$/.exec(line);
        if (!row) continue;
        const cells = row[2].split('|').map((c) => c.trim());
        const [timing = '', camera = '', action = '', assets = '', transition = ''] = cells;
        const range = parseFrameRange(timing);
        current.shots.push({
            id: row[1],
            sequenceId: current.id,
            timing,
            startFrame: range?.startFrame ?? null,
            endFrame: range?.endFrame ?? null,
            lensMm: parseLensMm(camera),
            camera,
            action,
            assets,
            transition
        });
    }

    return sequences;
}

/** Problems that would produce a wrong .blend rather than a failed one. */
export function validateShots(sequences) {
    const problems = [];
    const seen = new Set();
    for (const seq of sequences) {
        if (!seq.shots.length) problems.push(`${seq.id}: no shots parsed`);
        if (!seq.sets.length) problems.push(`${seq.id}: no primary set declared`);
        for (const shot of seq.shots) {
            if (seen.has(shot.id)) problems.push(`${shot.id}: duplicate shot id`);
            seen.add(shot.id);
            if (shot.startFrame === null) problems.push(`${shot.id}: unparsable frame range "${shot.timing}"`);
            if (shot.lensMm === null) problems.push(`${shot.id}: no lens found in "${shot.camera}"`);
        }
    }
    return problems;
}

function main() {
    const argv = process.argv.slice(2);
    const arg = (name, fallback) => {
        const i = argv.indexOf(name);
        return i >= 0 ? argv[i + 1] : fallback;
    };
    const docPath = arg('--doc', DEFAULT_DOC);
    const outPath = arg('--out', DEFAULT_OUT);

    const markdown = readFileSync(docPath, 'utf8');
    const sequences = extractShots(markdown);
    const problems = validateShots(sequences);

    const manifest = {
        schemaVersion: 1,
        // Every generated scene carries this back-reference, so a .blend can
        // always be traced to the brief section that specified it.
        sourceDoc: docPath,
        generatedFrom: `${sequences.length} sequences`,
        sequences
    };

    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);

    const shotCount = sequences.reduce((n, s) => n + s.shots.length, 0);
    console.log(`[shots] ${sequences.length} sequences, ${shotCount} shots -> ${outPath}`);
    for (const p of problems) console.warn(`[shots] WARN ${p}`);
    return problems.length ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main());
