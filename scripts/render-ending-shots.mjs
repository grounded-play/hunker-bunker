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

/**
 * ffmpeg args to assemble one sequence's shot frames into the .webm the game
 * loads. Shots are concatenated in manifest order, which is story order.
 *
 * VP9 rather than VP8: the five shipped ending clips are already .webm, and
 * VP9 at the same bitrate is visibly better on the dark, low-contrast material
 * these endings are made of, where VP8 bands badly in near-black gradients.
 */
export const GLARE_STRENGTH = 0.55;
export const CHROMATIC_ABERRATION = 0.0022;

/**
 * The look pass, applied at encode time rather than in Blender.
 *
 * A scene compositing node group blacked every frame under Blender 5.x, so the
 * look moved here -- and this is the better home regardless: retuning costs one
 * re-encode (seconds) rather than a re-render (hours across 893 frames).
 *
 * Two effects, both motivated by what these sets are:
 *  - bloom, so emissive practicals read as light sources rather than flat
 *    bright patches. Built from a blurred, thresholded copy screened back over
 *    the original, which is what `glare` does in a compositor.
 *  - chromatic aberration, scaling the red and blue planes a hair apart so
 *    frame edges fringe the way a real lens does. Deliberately just-perceptible:
 *    CA reads as cheap the moment a viewer can name it.
 */
export function lookFilter({ glare = GLARE_STRENGTH, ca = CHROMATIC_ABERRATION } = {}) {
    return [
        // Split for the bloom branch, threshold the highlights, blur, screen back.
        `[0:v]split=3[base][bloom][ca]`,
        `[bloom]lutrgb=r='max(0,val-150)*3':g='max(0,val-150)*3':b='max(0,val-150)*3',gblur=sigma=18[bl]`,
        `[base][bl]blend=all_mode=screen:all_opacity=${glare}[lit]`,
        // CA: scale one plane up fractionally and overlay centred, so the shift
        // grows toward the frame edge instead of being a uniform offset.
        `[ca]scale=iw*${(1 + ca).toFixed(5)}:ih*${(1 + ca).toFixed(5)},crop=iw/${(1 + ca).toFixed(5)}:ih/${(1 + ca).toFixed(5)}[cashift]`,
        `[lit][cashift]blend=all_mode='addition':all_opacity=0.10[looked]`
    ].join(';');
}

export function encodeArgs(frameGlobDir, out, { fps = FPS, draft = false, look = true } = {}) {
    return [
        '-y',
        '-framerate', String(fps),
        // %04d matches Blender's -o frame-#### padding exactly.
        '-i', path.join(frameGlobDir, 'frame-%04d.png'),
        ...(look ? ['-filter_complex', lookFilter(), '-map', '[looked]'] : []),
        '-an',
        '-c:v', 'libvpx-vp9',
        // A placeholder pass is for timing and composition, so bitrate is the
        // cheapest thing to give up; a delivery pass should not use draft.
        '-b:v', draft ? '1200k' : '4000k',
        '-pix_fmt', 'yuv420p',
        // Even GOP so seeking in review tools lands where the reviewer clicked.
        '-g', '48',
        out
    ];
}

function encodeSequence(plan, sequenceId, { draft = false } = {}) {
    const sequence = plan.sequences.find((s) => s.id === sequenceId);
    if (!sequence) {
        console.error(`No sequence "${sequenceId}".`);
        return 1;
    }
    const shots = plan.shots.filter((shot) => shot.sequenceId === sequenceId);
    const missing = shots.filter((shot) => !existsSync(shot.frameDir));
    if (missing.length > 0) {
        console.error(`Not rendered yet: ${missing.map((s) => s.id).join(', ')}`);
        return 1;
    }
    // One encode per shot, then concat -- rather than one pass over a merged
    // directory, which would renumber frames and silently reorder the cut.
    for (const shot of shots) {
        const out = path.join(shot.frameDir, `${shot.id}.webm`);
        const res = spawnSync('ffmpeg', encodeArgs(shot.frameDir, out, { draft }), { stdio: 'inherit' });
        if (res.status !== 0) {
            console.error(`Encode failed for ${shot.id}.`);
            return 1;
        }
        console.log(`  ${shot.id} -> ${out}`);
    }
    console.log(`\n${shots.length} shot clips written for ${sequenceId}.`);
    console.log(`Concat them into ${sequence.output} once the cut is approved.`);
    return 0;
}

function main(argv) {
    const plan = planRenders(loadManifest());
    const renderArg = argv.includes('--render') ? argv[argv.indexOf('--render') + 1] : null;
    if (argv.includes('--encode')) {
        return encodeSequence(plan, argv[argv.indexOf('--encode') + 1], { draft: argv.includes('--draft') });
    }

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

    const draft = argv.includes('--draft');
    if (draft) {
        // Passed through to select_shot_camera.py, which applies them per scene.
        process.env.HB_DRAFT_SAMPLES = process.env.HB_DRAFT_SAMPLES ?? '64';
        process.env.HB_DRAFT_SCALE = process.env.HB_DRAFT_SCALE ?? '50';
        console.log(`Draft pass: ${process.env.HB_DRAFT_SAMPLES} samples at ${process.env.HB_DRAFT_SCALE}%\n`);
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
