/**
 * Split raw VO session takes into individual clips, and group them by line.
 *
 * The artist delivered three long session files -- 6 lines per bank, roughly 6
 * freestyle takes each, recorded continuously. This finds the takes by silence
 * and clusters them into lines.
 *
 * Clustering is by DURATION, because takes of the same line are close in length
 * while different lines usually are not. That is a heuristic, not
 * transcription: it gets the grouping right often enough to be worth labelling
 * by hand afterwards, and the manifest it writes is designed for exactly that.
 * Nothing downstream trusts the cluster names until a human confirms them.
 *
 *   node scripts/segment-vo-takes.mjs --bank commander
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { bankForSourceFile, getVoiceBank } from '../src/data/voiceBanks.js';

export const RAW_DIR = 'art/source/audio/vo/raw';
export const OUT_DIR = 'art/source/audio/vo/segments';

// -42dB over 0.7s: quiet enough to ignore breath, long enough that a natural
// mid-sentence pause does not split a line in half.
export const SILENCE_DB = -42;
export const SILENCE_SEC = 0.7;
// Anything shorter is a breath, a false start or a lip noise, not a take.
export const MIN_TAKE_SEC = 0.55;
// The delivered lines are short combat callouts ("Reloading", "Shield low").
// Anything much longer is the artist slating or chatting between takes -- both
// session files open with a 20s+ block of exactly that. Kept, but not treated
// as a line take, so it never pollutes the line grouping.
export const MAX_TAKE_SEC = 4.0;

export function parseSilences(stderr) {
    const starts = [...stderr.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) => Number(m[1]));
    const ends = [...stderr.matchAll(/silence_end:\s*([\d.]+)/g)].map((m) => Number(m[1]));
    return { starts, ends };
}

/** Speech spans are the gaps BETWEEN silences. */
export function speechSpans({ starts, ends }, duration) {
    const spans = [];
    let cursor = 0;
    for (let i = 0; i < starts.length; i += 1) {
        if (starts[i] > cursor) spans.push({ start: cursor, end: starts[i] });
        cursor = ends[i] ?? starts[i];
    }
    if (duration > cursor) spans.push({ start: cursor, end: duration });
    return spans
        .map((s) => ({ ...s, duration: Number((s.end - s.start).toFixed(3)) }))
        .filter((s) => s.duration >= MIN_TAKE_SEC);
}

/**
 * Split takes into lines by the longest pauses, preserving recording order.
 *
 * The artist records all takes of one line back to back, then pauses longer
 * before moving to the next line. So the line boundaries are the N-1 longest
 * silences, in time order -- NOT clusters of similar duration. (Duration
 * clustering fails outright here: the callouts are all short and similar, so
 * "Reloading" and "Shield low" are indistinguishable by length.)
 *
 * The split is still a heuristic about pacing, so every clip lands in the
 * manifest with `label: null` for a human to confirm by ear.
 */
export function classifySpans(spans) {
    return spans.map((span) => ({
        ...span,
        kind: span.duration > MAX_TAKE_SEC ? 'chatter' : 'take'
    }));
}

export function splitIntoLines(spans, expectedLines = 6) {
    if (spans.length === 0) return [];
    if (spans.length <= expectedLines) return spans.map((s) => [s]);

    // Gap between consecutive takes = the silence separating them.
    const gaps = spans.slice(1).map((span, i) => ({
        index: i + 1,
        gap: span.start - spans[i].end
    }));
    const cuts = gaps
        .slice()
        .sort((a, b) => b.gap - a.gap)
        .slice(0, Math.max(0, expectedLines - 1))
        .map((g) => g.index)
        .sort((a, b) => a - b);

    const groups = [];
    let start = 0;
    for (const cut of [...cuts, spans.length]) {
        if (cut > start) groups.push(spans.slice(start, cut));
        start = cut;
    }
    return groups;
}

function probeDuration(file) {
    return Number(execFileSync('ffprobe', [
        '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file
    ]).toString().trim());
}

function detectSilence(file) {
    // silencedetect writes to stderr, and `-f null -` exits 0 -- so neither a
    // throw nor execFileSync's stdout return would carry the result. spawnSync
    // is the only one of the three that hands back stderr on success.
    const result = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af',
        `silencedetect=noise=${SILENCE_DB}dB:d=${SILENCE_SEC}`, '-f', 'null', '-'],
        { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return result.stderr ?? '';
}

function main(argv) {
    const bank = argv.includes('--bank') ? argv[argv.indexOf('--bank') + 1] : null;
    const files = readdirSync(RAW_DIR).filter((f) => f.endsWith('.wav') && (!bank || f.includes(bank)));
    if (!files.length) { console.error(`no raw takes for ${bank ?? 'any bank'}`); return 1; }

    const manifest = [];
    for (const file of files) {
        const full = path.join(RAW_DIR, file);
        const duration = probeDuration(full);
        const classified = classifySpans(speechSpans(parseSilences(detectSilence(full)), duration));
        const takes = classified.filter((s) => s.kind === 'take');
        const chatter = classified.filter((s) => s.kind === 'chatter');
        const groups = splitIntoLines(takes);
        const bank = bankForSourceFile(file);
        const stem = file.replace(/\.wav$/, '');
        const outDir = path.join(OUT_DIR, stem);
        mkdirSync(outDir, { recursive: true });

        console.log(`${file}: ${duration.toFixed(1)}s -> ${takes.length} takes in ${groups.length} lines (+${chatter.length} chatter)`);
        groups.forEach((group, gi) => {
            const avg = group.reduce((s, t) => s + t.duration, 0) / group.length;
            console.log(`  line_${gi + 1}: ${group.length} takes, ~${avg.toFixed(2)}s each`);
            group.forEach((take, ti) => {
                const name = `${stem}__line_${gi + 1}__take_${ti + 1}.wav`;
                execFileSync('ffmpeg', ['-y', '-i', full,
                    '-ss', String(take.start), '-to', String(take.end),
                    '-c', 'copy', path.join(outDir, name)], { stdio: 'ignore' });
                manifest.push({
                    source: file, bank: bank?.itemdefid ?? null, clip: name,
                    line: `line_${gi + 1}`, take: ti + 1,
                    kind: 'take', start: take.start, end: take.end, duration: take.duration,
                    // Filled in by a human after listening. Nothing downstream
                    // uses a clip until this is set.
                    label: null
                });
            });
        });

        chatter.forEach((span, ci) => {
            const name = `${stem}__chatter_${ci + 1}.wav`;
            execFileSync('ffmpeg', ['-y', '-i', full,
                '-ss', String(span.start), '-to', String(span.end),
                '-c', 'copy', path.join(outDir, name)], { stdio: 'ignore' });
            manifest.push({
                source: file, bank: bank?.itemdefid ?? null, clip: name,
                line: null, take: null, kind: 'chatter',
                start: span.start, end: span.end, duration: span.duration, label: null
            });
        });
    }

    mkdirSync(OUT_DIR, { recursive: true });
    const manifestPath = path.join(OUT_DIR, 'vo-takes.json');
    // The slots are the labelling key: each is one of the 6 lines the artist
    // recorded, and `label` on a take should be set to the slot key it belongs
    // to. Nothing is installed into the game until that mapping exists.
    const banks = [...new Set(manifest.map((t) => t.bank).filter(Boolean))]
        .map((id) => {
            const bank = getVoiceBank(id);
            return { itemdefid: id, prefix: bank.prefix, name: bank.name, slots: bank.slots };
        });
    writeFileSync(manifestPath, JSON.stringify({
        generated: new Date().toISOString(), banks, takes: manifest
    }, null, 2));
    console.log(`\n${manifest.length} clips -> ${OUT_DIR}\nmanifest: ${manifestPath} (label: null until confirmed by ear)`);
    return 0;
}

if (process.argv[1] && process.argv[1].endsWith('segment-vo-takes.mjs')) {
    process.exit(main(process.argv.slice(2)));
}
