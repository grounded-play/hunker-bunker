/**
 * Per-shot audio cue planning for the ending cinematics, and the ffmpeg mux
 * that lays the result over a rendered clip.
 *
 * Deliberately split the way the render driver is: planning is pure and runs in
 * milliseconds, execution needs ffmpeg and real files. `--plan` answers "what
 * does every shot need, and what is missing" without touching a source file.
 *
 * On sources: 148 CC0 candidates are acquired under art/source/audio/ but have
 * NOT cleared audition or derivative-provenance review. They are therefore not
 * referenced here by filename and nothing is copied into public/. This builds
 * the cue structure so the moment a source is approved it has a slot to land
 * in -- the same shape as the empty GAME_SOUNDSETS registry, and for the same
 * licensing reason.
 *
 *   node scripts/build-ending-audio.mjs --plan
 *   node scripts/build-ending-audio.mjs --mux <sequence> <video> <out>
 */

import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

export const SHOT_MANIFEST = 'scripts/blender/manifests/ending-shots.json';
export const FPS = 24;

/** Every ending shot gets these three layers. Missing any one is what makes a cut feel unfinished. */
export const CUE_LAYERS = Object.freeze(['bed', 'spot', 'transition']);

/**
 * Derive cue requirements from what the brief already says about a shot.
 *
 * The shot list's own `assets` and `transition` fields carry the sound design
 * in prose -- "`human_cold` dominant", "Hard cut on scanner sweep completion".
 * Parsing them keeps the audio plan tied to the brief instead of inventing a
 * parallel spec that can drift from it.
 */
export function deriveCues(shot, sequence) {
    const assets = String(shot?.assets ?? '');
    const action = String(shot?.action ?? '');
    const transition = String(shot?.transition ?? '');
    const haystack = `${assets} ${action}`.toLowerCase();

    // A backticked token in `assets` is the brief's own palette name.
    const palette = (assets.match(/`([a-z0-9_]+)`/i) ?? [])[1] ?? null;

    const spots = [];
    const hints = [
        [/scan|scanner/, 'scanner_sweep'],
        [/ramp|door|hatch|bulkhead/, 'door_movement'],
        [/engine|thrust|plume|shuttle/, 'engine'],
        [/monitor|vital|readout|console/, 'monitor_tone'],
        [/resin|spore|biomech|infect/, 'organic_wet'],
        [/ice|frost|cryo|coolant/, 'ice_stress'],
        [/walk|step|operator/, 'footsteps'],
        [/pipe|rupture|vent|steam/, 'pressure_release']
    ];
    for (const [pattern, cue] of hints) {
        if (pattern.test(haystack)) spots.push(cue);
    }

    return {
        shotId: shot.id,
        sequenceId: sequence.id,
        startFrame: Number(shot.startFrame),
        endFrame: Number(shot.endFrame),
        seconds: Number(((Number(shot.endFrame) - Number(shot.startFrame) + 1) / FPS).toFixed(2)),
        // The bed runs the whole shot; it is what stops a cut sounding like a
        // slideshow of unrelated moments.
        bed: palette ?? 'room_tone',
        spot: spots,
        // A hard cut wants its sound to land ON the cut; a dissolve wants the
        // tail to carry across it. The brief already says which.
        transition: /hard cut/i.test(transition) ? 'hard_cut' : (transition ? 'carry_over' : null)
    };
}

export function planAudio(manifest) {
    const sequences = Array.isArray(manifest?.sequences) ? manifest.sequences : [];
    const cues = [];
    const problems = [];
    for (const sequence of sequences) {
        for (const shot of (sequence.shots ?? [])) {
            const cue = deriveCues(shot, sequence);
            if (!(cue.seconds > 0)) problems.push(`${cue.shotId}: unusable duration`);
            if (cue.spot.length === 0) problems.push(`${cue.shotId}: no spot cue derivable from the brief`);
            cues.push(cue);
        }
    }
    const bySequence = new Map();
    for (const cue of cues) {
        if (!bySequence.has(cue.sequenceId)) bySequence.set(cue.sequenceId, []);
        bySequence.get(cue.sequenceId).push(cue);
    }
    return {
        cues,
        sequences: [...bySequence].map(([id, list]) => ({
            id,
            shots: list.length,
            seconds: Number(list.reduce((sum, c) => sum + c.seconds, 0).toFixed(2)),
            beds: [...new Set(list.map((c) => c.bed))]
        })),
        totalSeconds: Number(cues.reduce((sum, c) => sum + c.seconds, 0).toFixed(2)),
        problems
    };
}

/** Mux a prepared audio track onto a rendered clip without re-encoding video. */
export function muxArgs(video, audio, out) {
    return [
        '-y', '-i', video, '-i', audio,
        // Copy the video stream: the render is the expensive artifact and must
        // not be re-encoded to attach sound.
        '-c:v', 'copy', '-c:a', 'libopus', '-b:a', '128k',
        // Clip to the shorter input so a long bed cannot extend the picture.
        '-shortest', out
    ];
}

function main(argv) {
    const plan = planAudio(JSON.parse(readFileSync(SHOT_MANIFEST, 'utf8')));
    if (argv[0] === '--mux') {
        const [, video, audio, out] = argv;
        if (!video || !audio || !out) { console.error('--mux <video> <audio> <out>'); return 1; }
        if (!existsSync(audio)) { console.error(`No audio track at ${audio}.`); return 1; }
        const res = spawnSync('ffmpeg', muxArgs(video, audio, out), { stdio: 'inherit' });
        return res.status ?? 1;
    }
    console.log(`${plan.cues.length} shots, ${plan.totalSeconds}s of cues\n`);
    for (const seq of plan.sequences) {
        console.log(`  ${seq.id.padEnd(22)} ${String(seq.shots).padStart(2)} shots  ${String(seq.seconds).padStart(6)}s  beds: ${seq.beds.join(', ')}`);
    }
    for (const cue of plan.cues) {
        console.log(`    ${cue.shotId}  ${String(cue.seconds).padStart(5)}s  bed=${cue.bed.padEnd(12)} spot=[${cue.spot.join(', ')}]  ${cue.transition ?? '-'}`);
    }
    if (plan.problems.length) {
        console.log(`\n${plan.problems.length} gap(s):`);
        for (const p of plan.problems) console.log(`  - ${p}`);
    }
    return 0;
}

if (process.argv[1] && process.argv[1].endsWith('build-ending-audio.mjs')) {
    process.exit(main(process.argv.slice(2)));
}
