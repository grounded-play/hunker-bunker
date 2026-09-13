/**
 * Concatenate each ending's per-shot clips into the single .webm the game loads.
 *
 * Concat demuxer with -c copy: the shots were just encoded with identical
 * settings, so re-encoding here would be a second generation loss for no gain.
 * Shot order comes from the manifest, which is story order -- sorting filenames
 * would work today and break the first time a shot id stops sorting
 * lexicographically.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { planRenders, outputName, OUTPUT_ROOT } from './render-ending-shots.mjs';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('scripts/blender/manifests/ending-shots.json', 'utf8'));
const plan = planRenders(manifest);

mkdirSync(OUTPUT_ROOT, { recursive: true });
let failures = 0;

for (const sequence of manifest.sequences) {
    const shots = plan.shots.filter((s) => s.sequenceId === sequence.id);
    const clips = shots.map((s) => path.resolve(s.frameDir, `${s.id}.webm`));
    const missing = clips.filter((c) => !existsSync(c));
    if (missing.length) {
        console.error(`${sequence.id}: missing ${missing.length} shot clip(s); skipping`);
        failures += 1;
        continue;
    }
    const listFile = path.join(shots[0].frameDir, '..', `${sequence.id}.concat.txt`);
    // ffconcat needs each path quoted; single quotes inside are escaped per spec.
    writeFileSync(listFile, clips.map((c) => `file '${c.replace(/'/g, "'\\''")}'`).join('\n'));
    const out = path.join(OUTPUT_ROOT, outputName(sequence));
    const res = spawnSync('ffmpeg', [
        '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', out
    ], { stdio: 'inherit' });
    if (res.status !== 0) { console.error(`${sequence.id}: concat failed`); failures += 1; continue; }
    console.log(`${sequence.id} -> ${out}`);
}
process.exit(failures ? 1 : 0);
