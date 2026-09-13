/**
 * Render the authored ending shot scenes to frames, then encode each sequence
 * to the .webm the game already loads.
 *
 * The five endings with no shipped cutscene each have a .blend per shot under
 * art/source/blender-prerenders/endings/<sequence>/<SHOT>.blend, generated from
 * the shot-list brief. This driver turns those into
 * public/cutscenes/ending-<name>.webm, matching the naming the five already
 * shipped endings use.
 *
 * Planning is pure and separate from execution on purpose: `--check` answers
 * "is everything in place to render?" in a second, without spawning Blender.
 * A render is minutes per shot, so discovering a missing .blend at frame 900 is
 * an expensive way to find out.
 *
 *   node scripts/render-ending-shots.mjs --check
 *   node scripts/render-ending-shots.mjs --render MI-01
 *   node scripts/render-ending-shots.mjs --render all --encode
 */

import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

export const MANIFEST = 'scripts/blender/manifests/ending-shots.json';
// Production scenes, NOT art/source/blender-prerenders/endings/<seq>/<SHOT>.blend.
// Those per-shot files are camera shells: 5 objects, no lights, WORLD None --
// verified by rendering one, which produced an exit-0 all-black PNG. The
// production scenes carry the sets, lights, world and every shot camera.
export const SCENE_ROOT = 'art/source/blender-prerenders/scenes';
export const FRAME_ROOT = 'art/source/blender-prerenders/frames';
export const OUTPUT_ROOT = 'public/cutscenes';
export const FPS = 24;

/** `MOTHERSHIP_INFECTION` -> `mothership_infection` (the on-disk folder). */
export function sequenceSlug(sequence) {
    return String(sequence?.id ?? '').toLowerCase();
}

/** `MOTHERSHIP_INFECTION` -> `ending-mothershipinfection.webm`, matching the shipped five. */
export function outputName(sequence) {
    return `ending-${String(sequence?.id ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')}.webm`;
}

export function scenePath(sequence) {
    return path.join(SCENE_ROOT, `ending_${sequenceSlug(sequence)}.blend`);
}

/**
 * `MI-01` -> `CAM_MI_01`. The production scenes name cameras with underscores;
 * the shot ids in the brief use a hyphen. Getting this wrong silently renders
 * whatever camera the scene happened to have active.
 */
export function cameraName(shot) {
    return `CAM_${String(shot?.id ?? '').replace(/-/g, '_')}`;
}

export function frameCount(shot) {
    const start = Number(shot?.startFrame);
    const end = Number(shot?.endFrame);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
    return (end - start) + 1;
}

/**
 * Build the full render plan and report every problem found, rather than
 * throwing on the first. A partial answer here wastes a whole render pass.
 */
export function planRenders(manifest, { exists = existsSync } = {}) {
    const sequences = Array.isArray(manifest?.sequences) ? manifest.sequences : [];
    const shots = [];
    const problems = [];

    for (const sequence of sequences) {
        const list = Array.isArray(sequence.shots) ? sequence.shots : [];
        if (list.length === 0) problems.push(`${sequence.id}: no shots in manifest`);
        for (const shot of list) {
            const blend = scenePath(sequence);
            const frames = frameCount(shot);
            if (!exists(blend)) problems.push(`${shot.id}: missing scene ${blend}`);
            if (frames <= 0) problems.push(`${shot.id}: unusable frame range (${shot.timing ?? 'no timing'})`);
            shots.push({
                id: shot.id,
                sequenceId: sequence.id,
                blend,
                camera: cameraName(shot),
                startFrame: Number(shot.startFrame),
                endFrame: Number(shot.endFrame),
                frames,
                frameDir: path.join(FRAME_ROOT, sequenceSlug(sequence), shot.id),
                lensMm: shot.lensMm ?? null
            });
        }
    }

    const totalFrames = shots.reduce((sum, shot) => sum + shot.frames, 0);
    return {
        sequences: sequences.map((sequence) => ({
            id: sequence.id,
            name: sequence.name,
            output: path.join(OUTPUT_ROOT, outputName(sequence)),
            shotCount: Array.isArray(sequence.shots) ? sequence.shots.length : 0
        })),
        shots,
        totalFrames,
        seconds: Math.round(totalFrames / FPS),
        problems
    };
}

function loadManifest() {
    return JSON.parse(readFileSync(MANIFEST, 'utf8'));
}

function renderShot(shot) {
    mkdirSync(shot.frameDir, { recursive: true });
    const result = spawnSync('blender', [
        '-b', shot.blend,
        '-P', 'scripts/blender/select_shot_camera.py',
        '-o', path.join(shot.frameDir, 'frame-####'),
        '-F', 'PNG',
        '-s', String(shot.startFrame),
        '-e', String(shot.endFrame),
        '-a'
    ], { stdio: 'inherit', env: { ...process.env, HB_SHOT_CAMERA: shot.camera } });
    return result.status === 0;
}

function main(argv) {
    const plan = planRenders(loadManifest());
    const renderArg = argv.includes('--render') ? argv[argv.indexOf('--render') + 1] : null;

    if (!renderArg) {
        console.log(`${plan.shots.length} shots across ${plan.sequences.length} sequences`);
        console.log(`${plan.totalFrames} frames total (~${plan.seconds}s at ${FPS}fps)\n`);
        for (const sequence of plan.sequences) {
            console.log(`  ${sequence.id.padEnd(22)} ${String(sequence.shotCount).padStart(2)} shots -> ${sequence.output}`);
        }
        if (plan.problems.length > 0) {
            console.log(`\n${plan.problems.length} problem(s):`);
            for (const problem of plan.problems) console.log(`  - ${problem}`);
            return 1;
        }
        console.log('\nAll scenes present and every frame range usable.');
        return 0;
    }

    const targets = renderArg === 'all'
        ? plan.shots
        : plan.shots.filter((shot) => shot.id === renderArg);
    if (targets.length === 0) {
        console.error(`No shot matches "${renderArg}".`);
        return 1;
    }
    for (const shot of targets) {
        console.log(`Rendering ${shot.id} (${shot.frames} frames)...`);
        if (!renderShot(shot)) {
            console.error(`  ${shot.id} failed.`);
            return 1;
        }
        const written = existsSync(shot.frameDir) ? readdirSync(shot.frameDir).length : 0;
        console.log(`  ${shot.id}: ${written} frames in ${shot.frameDir}`);
    }
    return 0;
}

if (process.argv[1] && process.argv[1].endsWith('render-ending-shots.mjs')) {
    process.exit(main(process.argv.slice(2)));
}
