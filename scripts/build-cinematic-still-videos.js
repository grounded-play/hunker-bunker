/* global process */
import { spawn, spawnSync } from 'node:child_process';
import {
    copyFileSync,
    existsSync,
    mkdtempSync,
    mkdirSync,
    readFileSync,
    rmSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    DEATH_CINEMATICS,
    EVENT_CINEMATICS
} from '../src/cinematicFallback.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const OUT = join(PUBLIC, 'cutscenes');
const WIDTH = 1280;
const HEIGHT = 800;
const FPS = 15;
const DURATION_SECONDS = 3.6;
const FRAME_COUNT = Math.round(FPS * DURATION_SECONDS);
const TRANSITION_FRAMES = 8;
const FFMPEG_CANDIDATES = [
    process.env.HB_FFMPEG,
    'ffmpeg',
    '/home/caveman/.cache/ms-playwright/ffmpeg-1011/ffmpeg-linux'
].filter(Boolean);

const JOBS = [
    ['death-oxygen', DEATH_CINEMATICS.oxygen],
    ['death-abyss', DEATH_CINEMATICS.abyss],
    ['death-crawler', DEATH_CINEMATICS.crawler],
    ['death-queen', DEATH_CINEMATICS.queen],
    ['death-ship', DEATH_CINEMATICS.ship],
    ['death-biohazard', DEATH_CINEMATICS.biohazard],
    ['death-combat', DEATH_CINEMATICS.combat],
    ['death-mission-abort', DEATH_CINEMATICS['mission-abort']],
    ['death-hazard', DEATH_CINEMATICS.hazard],
    ['event-foundry-discovered', EVENT_CINEMATICS.foundry_discovered],
    ['event-black-box-recovered', EVENT_CINEMATICS.black_box_recovered],
    ['event-queen-encounter', EVENT_CINEMATICS.queen_encounter]
];

function hasCommand(command, args = ['-version']) {
    const result = spawnSync(command, args, { stdio: 'ignore' });
    return result.status === 0;
}

function findFfmpeg() {
    const ffmpeg = FFMPEG_CANDIDATES.find((candidate) => (
        candidate === 'ffmpeg' || existsSync(candidate)
    ) && hasCommand(candidate));
    if (!ffmpeg) {
        throw new Error('No compatible ffmpeg found. Set HB_FFMPEG to an ffmpeg executable.');
    }
    return ffmpeg;
}

function convertFrame(input, frameIndex, output) {
    const progress = frameIndex / Math.max(1, FRAME_COUNT - 1);
    const zoom = 1 + progress * 0.075;
    const canvasW = 1408;
    const canvasH = 880;
    const cropW = Math.round(WIDTH / zoom);
    const cropH = Math.round(HEIGHT / zoom);
    const travelX = Math.round(34 * progress);
    const travelY = Math.round(18 * progress);
    const offsetX = Math.max(0, Math.round((canvasW - cropW) / 2 + travelX - 17));
    const offsetY = Math.max(0, Math.round((canvasH - cropH) / 2 + travelY - 9));

    const result = spawnSync('convert', [
        input,
        '-background', '#050708',
        '-alpha', 'background',
        '-resize', `${canvasW}x${canvasH}^`,
        '-gravity', 'center',
        '-extent', `${canvasW}x${canvasH}`,
        '-crop', `${cropW}x${cropH}+${offsetX}+${offsetY}`,
        '+repage',
        '-resize', `${WIDTH}x${HEIGHT}!`,
        '-colorspace', 'sRGB',
        '-quality', '88',
        output
    ], { stdio: 'inherit' });
    if (result.status !== 0) throw new Error(`Image conversion failed: ${input}`);
}

function blendFrames(first, second, amount, output) {
    const secondPct = Math.round(amount * 100);
    const firstPct = 100 - secondPct;
    const result = spawnSync('convert', [
        first,
        second,
        '-define', `compose:args=${firstPct},${secondPct}`,
        '-compose', 'blend',
        '-composite',
        '-quality', '88',
        output
    ], { stdio: 'inherit' });
    if (result.status !== 0) throw new Error('Frame crossfade failed');
}

async function encodeFrames(ffmpeg, work, output) {
    await new Promise((resolvePromise, reject) => {
        const encoder = spawn(ffmpeg, [
            '-y',
            '-f', 'image2pipe',
            '-framerate', String(FPS),
            '-vcodec', 'mjpeg',
            '-i', 'pipe:0',
            '-an',
            '-c:v', 'libvpx',
            '-b:v', '1800k',
            '-deadline', 'good',
            '-cpu-used', '2',
            '-pix_fmt', 'yuv420p',
            output
        ], { stdio: ['pipe', 'ignore', 'pipe'] });
        let errorText = '';
        encoder.stderr.on('data', (chunk) => { errorText += chunk; });
        encoder.on('error', reject);
        encoder.on('close', (code) => {
            if (code === 0) resolvePromise();
                else reject(new Error(`WebM encode failed (${code}): ${errorText}`));
            });
        for (let index = 0; index < FRAME_COUNT; index += 1) {
            encoder.stdin.write(readFileSync(
                join(work, `frame-${String(index).padStart(4, '0')}.jpg`)
            ));
        }
        encoder.stdin.end();
    });
}

async function buildJob(ffmpeg, [name, spec]) {
    const work = mkdtempSync(join(tmpdir(), `hb-${name}-`));
    try {
        const sources = spec.images.map((src) => join(PUBLIC, src));
        const splitAt = Math.floor(FRAME_COUNT / 2);
        const transitionStart = splitAt - Math.floor(TRANSITION_FRAMES / 2);
        const transitionEnd = transitionStart + TRANSITION_FRAMES;
        for (let index = 0; index < FRAME_COUNT; index += 1) {
            const frameName = `frame-${String(index).padStart(4, '0')}.jpg`;
            const framePath = join(work, frameName);
            if (sources.length > 1 && index >= transitionStart && index < transitionEnd) {
                const firstFrame = join(work, `first-${String(index).padStart(4, '0')}.jpg`);
                const secondFrame = join(work, `second-${String(index).padStart(4, '0')}.jpg`);
                convertFrame(sources[0], index, firstFrame);
                convertFrame(sources[1], Math.max(0, index - transitionStart), secondFrame);
                const amount = (index - transitionStart + 1) / (TRANSITION_FRAMES + 1);
                blendFrames(firstFrame, secondFrame, amount, framePath);
            } else {
                const useSecond = sources.length > 1 && index >= splitAt;
                const sourceIndex = useSecond ? 1 : 0;
                const localIndex = useSecond ? index - splitAt : index;
                const tempFrame = join(work, `temp-${sourceIndex}-${String(index).padStart(4, '0')}.jpg`);
                convertFrame(sources[sourceIndex], localIndex, tempFrame);
                copyFileSync(tempFrame, framePath);
            }
        }

        const poster = join(OUT, `${name}-poster.jpg`);
        copyFileSync(join(work, 'frame-0000.jpg'), poster);
        await encodeFrames(ffmpeg, work, join(OUT, `${name}.webm`));
        process.stdout.write(`built ${name}.webm\n`);
    } finally {
        rmSync(work, { recursive: true, force: true });
    }
}

async function main() {
    if (!hasCommand('convert')) throw new Error('Required command unavailable: convert');
    const ffmpeg = findFfmpeg();
    mkdirSync(OUT, { recursive: true });
    for (const job of JOBS) await buildJob(ffmpeg, job);
}

main().catch((error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
});
