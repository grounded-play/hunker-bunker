/* global process */
// Steam trailer assembly. Data-driven from scripts/trailer-edl.json: takes
// the raw Playwright-captured clips in trailer/raw/clips/ (+ the existing
// cave-reveal cutscene asset), builds one silent Ken-Burns'd/door-wiped
// video timeline, mixes a separate audio bed (OST tail + rotated SFX
// one-shots so the reused door transition doesn't repeat identically), and
// muxes the two into a Steam-spec 1080p30 H.264/AAC .mp4. See
// docs/superpowers/specs/2026-08-07-steam-trailer-capture-and-assembly-design.md.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EDL = JSON.parse(readFileSync(join(ROOT, 'scripts/trailer-edl.json'), 'utf8'));
const { width: W, height: H } = EDL.resolution;
const FPS = EDL.fps;
const OUT_DIR = join(ROOT, 'dist/trailer');
const SFX_DIR = join(ROOT, 'public/audio/vg2');
const DOOR_CLIP = join(ROOT, 'trailer/raw/clips/door-transition.webm');
const DOOR_TAIL_SECONDS = 4.2;
const FFMPEG = process.env.HB_FFMPEG || 'ffmpeg';
const FFPROBE = process.env.HB_FFPROBE || 'ffprobe';

function run(args, label) {
    const result = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
    if (result.status !== 0) throw new Error(`ffmpeg failed (${label}): exit ${result.status}`);
}

function probeDuration(file) {
    const result = spawnSync(FFPROBE, [
        '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', file
    ], { encoding: 'utf8' });
    return Number.parseFloat(result.stdout.trim());
}

function sfxPath(name) {
    const candidate = join(SFX_DIR, `${name}.wav`);
    if (!existsSync(candidate)) throw new Error(`SFX not found: ${candidate}`);
    return candidate;
}

// --- Video shot builders -----------------------------------------------

function buildClipShot(shot, outPath) {
    const src = join(ROOT, shot.src);
    // Two addressing modes: tailStart/tailEnd (offset back from EOF -- what
    // the short automated Playwright takes used) or start/duration
    // (absolute offset -- more natural for the long real-played captures).
    let start;
    let duration;
    if (shot.start !== undefined) {
        start = shot.start;
        duration = shot.duration;
    } else {
        const total = probeDuration(src);
        duration = shot.tailStart - shot.tailEnd;
        start = Math.max(0, total - shot.tailStart);
    }

    // Real played gameplay (raw: true) is already full-res/full-fps --
    // zoompan's synthetic push was reading as sluggish against genuinely
    // smooth 60fps footage, so skip it there and just crop-to-fill at
    // native speed. Ken Burns is reserved for shots that explicitly ask
    // for it (stills, cutscene-style clips).
    let filter = [
        `scale=${W}:${H}:force_original_aspect_ratio=increase`,
        `crop=${W}:${H}`
    ].join(',');
    if (!shot.raw && shot.kenBurns) {
        const totalFrames = Math.round(duration * FPS);
        const { zoomFrom, zoomTo } = shot.kenBurns;
        const zExpr = zoomFrom === zoomTo
            ? `${zoomFrom}`
            : `${zoomFrom}+(${zoomTo}-${zoomFrom})*on/${totalFrames}`;
        filter += `,zoompan=z='${zExpr}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${FPS}`;
    }

    run([
        '-ss', String(start), '-t', String(duration), '-i', src,
        '-vf', filter, '-an',
        '-c:v', 'libx264', '-b:v', '16M', '-maxrate', '16M', '-bufsize', '32M',
        '-pix_fmt', 'yuv420p', '-r', String(FPS),
        outPath
    ], `clip:${shot.id}`);
    return duration;
}

function buildDoorTransitionShot(shot, outPath) {
    const total = probeDuration(DOOR_CLIP);
    const start = Math.max(0, total - DOOR_TAIL_SECONDS);
    // Each reuse gets a slightly different crop window (variant index ->
    // zoom + offset) so the same source clip doesn't read as an obviously
    // repeated shot.
    const variant = shot.cropVariant ?? 0;
    const zoom = 1.0 + variant * 0.035;
    const cropW = Math.round(W / zoom);
    const cropH = Math.round(H / zoom);
    const offsetX = Math.round((W - cropW) / 2 + variant * 14);
    const offsetY = Math.round((H - cropH) / 2 - variant * 8);
    const filter = [
        `crop=${cropW}:${cropH}:${offsetX}:${offsetY}`,
        `scale=${W}:${H}`
    ].join(',');
    run([
        '-ss', String(start), '-t', String(DOOR_TAIL_SECONDS), '-i', DOOR_CLIP,
        '-vf', filter, '-an',
        '-c:v', 'libx264', '-b:v', '16M', '-maxrate', '16M', '-bufsize', '32M',
        '-pix_fmt', 'yuv420p', '-r', String(FPS),
        outPath
    ], `door:${shot.id}`);
    return DOOR_TAIL_SECONDS;
}

function buildColorCardShot(shot, outPath) {
    const font = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
    const drawtext = `drawtext=fontfile=${font}:text='${shot.text}':fontcolor=white:fontsize=${shot.fontSize}:x=(w-text_w)/2:y=(h-text_h)/2`;
    run([
        '-f', 'lavfi', '-i', `color=c=${shot.color}:s=${W}x${H}:d=${shot.duration}:rate=${FPS}`,
        '-vf', drawtext, '-an',
        '-c:v', 'libx264', '-b:v', '16M', '-maxrate', '16M', '-bufsize', '32M',
        '-pix_fmt', 'yuv420p', '-r', String(FPS),
        outPath
    ], `card:${shot.id}`);
    return shot.duration;
}

// Styled like the game's own song-interstitial cards (style.css
// .song-interstitial__caption): a small tracked-out monospace caption line
// above a large bold uppercase title, over real key art instead of a flat
// color card.
function buildImageCardShot(shot, outPath) {
    const bold = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
    const image = join(ROOT, shot.image);
    const filters = [
        `scale=${W}:${H}:force_original_aspect_ratio=increase`,
        `crop=${W}:${H}`,
        `drawbox=x=0:y=0:w=${W}:h=${H}:color=black@0.42:t=fill`
    ];
    if (shot.caption) {
        filters.push(`drawtext=fontfile=${bold}:text='${shot.caption}':fontcolor=0x65efe8:fontsize=28:` +
            `x=(w-text_w)/2:y=h*0.62:box=0`);
    }
    filters.push(`drawtext=fontfile=${bold}:text='${shot.text}':fontcolor=white:fontsize=${shot.fontSize}:` +
        `x=(w-text_w)/2:y=h*0.67`);
    run([
        '-loop', '1', '-i', image, '-t', String(shot.duration),
        '-vf', filters.join(','), '-an',
        '-c:v', 'libx264', '-b:v', '16M', '-maxrate', '16M', '-bufsize', '32M',
        '-pix_fmt', 'yuv420p', '-r', String(FPS),
        outPath
    ], `imageCard:${shot.id}`);
    return shot.duration;
}

// --- Audio ---------------------------------------------------------------

function buildAudioMix(shotTimeline, work, outPath) {
    const inputs = [];
    const filters = [];

    const music = EDL.music;
    const musicDuration = music.climaxLullEnd - music.climaxLullStart;
    const musicStartOffset = shotTimeline.find((s) => s.id === music.climaxLullEntersAtShot)?.start ?? 0;
    inputs.push(['-ss', String(music.climaxLullStart), '-t', String(musicDuration), '-i', join(ROOT, music.file)]);
    filters.push(
        `[${inputs.length - 1}:a]afade=t=in:st=0:d=2,afade=t=out:st=${musicDuration - 3}:d=3,` +
        `adelay=${Math.round(musicStartOffset * 1000)}|${Math.round(musicStartOffset * 1000)}[a${inputs.length - 1}]`
    );

    const sfxCues = [];
    for (const shot of shotTimeline) {
        if (shot.type === 'doorTransition' && shot.sfx) {
            sfxCues.push({ file: sfxPath(shot.sfx), at: shot.start });
        }
    }
    const beatSfx = EDL.sfx;
    const beatStart = (id) => shotTimeline.find((s) => s.id === id)?.start ?? 0;
    for (const name of beatSfx.coldOpen) sfxCues.push({ file: sfxPath(name), at: beatStart('cold-open') + 0.3 * beatSfx.coldOpen.indexOf(name) });
    for (const name of beatSfx.pressure) sfxCues.push({ file: sfxPath(name), at: beatStart('pressure') + 0.4 * beatSfx.pressure.indexOf(name) });
    for (const name of beatSfx.escalation) sfxCues.push({ file: sfxPath(name), at: beatStart('escalation') + 0.4 * beatSfx.escalation.indexOf(name) });

    for (const cue of sfxCues) {
        inputs.push(['-i', cue.file]);
        const idx = inputs.length - 1;
        const ms = Math.max(0, Math.round(cue.at * 1000));
        filters.push(`[${idx}:a]adelay=${ms}|${ms}[a${idx}]`);
    }

    const mixLabels = filters.map((_, i) => `[a${i}]`).join('');
    const totalDuration = shotTimeline.at(-1).start + shotTimeline.at(-1).duration;
    filters.push(`${mixLabels}amix=inputs=${filters.length}:duration=longest:dropout_transition=0,apad=whole_dur=${totalDuration}[mix]`);

    const args = [];
    for (const input of inputs) args.push(...input);
    args.push('-filter_complex', filters.join(';'), '-map', '[mix]', '-ac', '2', outPath);
    run(args, 'audio-mix');
}

// --- Main ------------------------------------------------------------------

async function main() {
    mkdirSync(OUT_DIR, { recursive: true });
    const work = mkdtempSync(join(tmpdir(), 'hb-trailer-'));
    const shotTimeline = [];
    const concatPaths = [];
    let cursor = 0;

    try {
        for (const shot of EDL.shots) {
            const outPath = join(work, `${shot.id}.mp4`);
            let duration;
            if (shot.type === 'clip') duration = buildClipShot(shot, outPath);
            else if (shot.type === 'doorTransition') duration = buildDoorTransitionShot(shot, outPath);
            else if (shot.type === 'colorCard') duration = buildColorCardShot(shot, outPath);
            else if (shot.type === 'imageCard') duration = buildImageCardShot(shot, outPath);
            else throw new Error(`Unknown shot type: ${shot.type}`);

            shotTimeline.push({ id: shot.id, type: shot.type, sfx: shot.sfx, start: cursor, duration });
            cursor += duration;
            concatPaths.push(outPath);
            process.stdout.write(`built shot ${shot.id} (${duration.toFixed(2)}s)\n`);
        }

        const concatList = join(work, 'concat.txt');
        writeFileSync(concatList, concatPaths.map((p) => `file '${p}'`).join('\n'));
        const silentVideo = join(work, 'video_silent.mp4');
        run(['-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', silentVideo], 'concat');

        const audioMix = join(work, 'audio_mix.wav');
        buildAudioMix(shotTimeline, work, audioMix);

        const finalOut = join(OUT_DIR, 'hunker-bunker-trailer.mp4');
        run([
            '-i', silentVideo, '-i', audioMix,
            '-c:v', 'copy',
            '-c:a', 'aac', '-b:a', '192k', '-ac', '2',
            '-movflags', '+faststart',
            '-shortest',
            finalOut
        ], 'final-mux');

        process.stdout.write(`\nBuilt ${finalOut}\n`);
        verifyOutput(finalOut);
    } finally {
        rmSync(work, { recursive: true, force: true });
    }
}

function verifyOutput(file) {
    const result = spawnSync(FFPROBE, [
        '-v', 'error', '-show_entries',
        'format=duration,bit_rate,format_name:stream=codec_name,width,height,r_frame_rate,channels',
        '-of', 'json', file
    ], { encoding: 'utf8' });
    const info = JSON.parse(result.stdout);
    process.stdout.write(`\n${JSON.stringify(info, null, 2)}\n`);

    const bitrateKbps = Number(info.format.bit_rate) / 1000;
    const container = info.format.format_name;
    const videoStream = info.streams.find((s) => s.width);
    const audioStream = info.streams.find((s) => s.channels);
    const warnings = [];
    if (!container.includes('mp4')) warnings.push(`container is "${container}", expected mp4`);
    if (videoStream?.width !== W || videoStream?.height !== H) warnings.push(`resolution ${videoStream?.width}x${videoStream?.height}, expected ${W}x${H}`);
    if (videoStream?.codec_name !== 'h264') warnings.push(`video codec ${videoStream?.codec_name}, expected h264`);
    if (audioStream?.codec_name !== 'aac') warnings.push(`audio codec ${audioStream?.codec_name}, expected aac`);
    if (audioStream?.channels !== 2) warnings.push(`audio channels ${audioStream?.channels}, expected 2 (stereo)`);
    if (bitrateKbps < 5000) warnings.push(`bitrate ${bitrateKbps.toFixed(0)}kbps, Steam wants 5,000+`);

    if (warnings.length) {
        process.stdout.write(`\nWARNINGS vs Steam spec:\n${warnings.map((w) => `  - ${w}`).join('\n')}\n`);
    } else {
        process.stdout.write('\nMeets Steam trailer spec (container/codec/resolution/audio/bitrate).\n');
    }
}

main().catch((error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
});
