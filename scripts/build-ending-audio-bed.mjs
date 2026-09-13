/**
 * Render a placeholder audio bed per ending, so the first-pass clips are not
 * silent.
 *
 * The 148 acquired CC0 candidates have NOT cleared audition or
 * derivative-provenance review, so none of them is used here and nothing is
 * copied into public/. Instead this synthesises a bed from ffmpeg's own signal
 * generators, using the per-shot cue plan's palette and duration. That is a
 * legitimate placeholder: it carries timing and tone so a cut can be judged,
 * and it carries no licence question at all.
 *
 *   node scripts/build-ending-audio-bed.mjs <SEQUENCE_ID> <out.opus>
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { planAudio } from './build-ending-audio.mjs';

// Each palette gets a different root, so the five endings do not all sound the
// same. Low frequencies: this is a room tone under dialogue-free picture, not a
// score.
export const BED_ROOT_HZ = Object.freeze({
    human_cold: 58,
    alien_alliance: 44,
    exterior_environment: 36,
    room_tone: 52
});

export function bedArgs(sequenceId, seconds, palette, out) {
    const root = BED_ROOT_HZ[palette] ?? BED_ROOT_HZ.room_tone;
    return [
        '-y',
        // Two detuned sines beat against each other, which keeps a long bed from
        // sounding like a test tone held flat.
        '-f', 'lavfi', '-i', `sine=frequency=${root}:duration=${seconds}`,
        '-f', 'lavfi', '-i', `sine=frequency=${(root * 1.503).toFixed(2)}:duration=${seconds}`,
        // Filtered noise is the air in the room; without it the bed is synthetic.
        '-f', 'lavfi', '-i', `anoisesrc=duration=${seconds}:color=brown:amplitude=0.25`,
        '-filter_complex',
        '[0:a]volume=0.30[a];[1:a]volume=0.16[b];[2:a]lowpass=f=420,volume=0.22[c];'
        + '[a][b][c]amix=inputs=3:duration=longest,'
        // Fades so a clip does not start or end on a click.
        + `afade=t=in:st=0:d=1.2,afade=t=out:st=${Math.max(0, seconds - 1.2).toFixed(2)}:d=1.2[out]`,
        '-map', '[out]', '-c:a', 'libopus', '-b:a', '96k', out
    ];
}

function main(argv) {
    const [sequenceId, out] = argv;
    if (!sequenceId || !out) { console.error('usage: <SEQUENCE_ID> <out.opus>'); return 1; }
    const plan = planAudio(JSON.parse(readFileSync('scripts/blender/manifests/ending-shots.json', 'utf8')));
    const cues = plan.cues.filter((c) => c.sequenceId === sequenceId);
    if (!cues.length) { console.error(`no cues for ${sequenceId}`); return 1; }
    const seconds = Number(cues.reduce((s, c) => s + c.seconds, 0).toFixed(2));
    // The dominant palette across the sequence's shots drives the bed.
    const counts = new Map();
    for (const c of cues) counts.set(c.bed, (counts.get(c.bed) ?? 0) + 1);
    const palette = [...counts].sort((a, b) => b[1] - a[1])[0][0];
    const res = spawnSync('ffmpeg', bedArgs(sequenceId, seconds, palette, out), { stdio: 'inherit' });
    if (res.status !== 0) return 1;
    console.log(`${sequenceId}: ${seconds}s bed (${palette}) -> ${out}`);
    return 0;
}

if (process.argv[1] && process.argv[1].endsWith('build-ending-audio-bed.mjs')) {
    process.exit(main(process.argv.slice(2)));
}
