import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { SONG_INTERSTITIALS } from '../src/songInterstitials.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const motionDir = path.join(publicDir, 'interstitials', 'motion');

if (!fs.existsSync(motionDir)) {
    fs.mkdirSync(motionDir, { recursive: true });
}

const inputFiles = fs.readdirSync(publicDir)
    .filter(f => f.startsWith('int_') && f.endsWith('.mp4'))
    .sort();

console.log(`Found ${inputFiles.length} MP4 files to process into ${motionDir}`);

const tasks = [];

for (const file of inputFiles) {
    const match = file.match(/^int_(\d+)_/);
    if (!match) continue;
    const id = match[1];
    const spec = SONG_INTERSTITIALS[id];
    if (!spec) {
        console.warn(`Warning: No spec found for ID ${id} (${file})`);
        continue;
    }

    const srcMp4 = path.join(publicDir, file);
    const targetMp4Motion = path.join(motionDir, `int_${id}_${spec.slug || spec.image.split('/int_' + id + '_')[1].split('_key_v1')[0]}_motion_v1.mp4`);
    const targetMp4Key = path.join(motionDir, file);
    const targetWebmMotion = path.join(rootDir, 'public', spec.motion.replace(/^\//, ''));

    // 1. Copy MP4 to preserve original format & audio
    fs.copyFileSync(srcMp4, targetMp4Motion);
    fs.copyFileSync(srcMp4, targetMp4Key);

    tasks.push({
        id,
        title: spec.title,
        srcMp4,
        targetMp4Motion,
        targetWebmMotion
    });
}

console.log(`Prepared ${tasks.length} tasks. Running WebM transcode with audio preserved (4 concurrent workers)...`);

function convertToWebm(task) {
    return new Promise((resolve, reject) => {
        const args = [
            '-y',
            '-i', task.srcMp4,
            '-c:v', 'libvpx-vp9',
            '-crf', '30',
            '-b:v', '0',
            '-c:a', 'libopus',
            '-b:a', '128k',
            task.targetWebmMotion
        ];
        const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = '';
        proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
        proc.on('close', (code) => {
            if (code === 0) {
                console.log(`✓ [${task.id}] ${task.title} -> ${path.basename(task.targetWebmMotion)}`);
                resolve();
            } else {
                console.error(`✗ [${task.id}] Failed: ${stderr.slice(-200)}`);
                reject(new Error(`ffmpeg exited with code ${code}`));
            }
        });
    });
}

async function runPool(items, limit, workerFn) {
    const executing = [];
    for (const item of items) {
        const p = Promise.resolve().then(() => workerFn(item));
        executing.push(p);
        const clean = () => executing.splice(executing.indexOf(p), 1);
        p.then(clean, clean);
        if (executing.length >= limit) {
            await Promise.race(executing);
        }
    }
    return Promise.all(executing);
}

const startTime = Date.now();
await runPool(tasks, 4, convertToWebm);
const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\nAll ${tasks.length} WebM motion files encoded with full audio in ${elapsed}s!`);

// Clean up original root public/*.mp4
for (const file of inputFiles) {
    const p = path.join(publicDir, file);
    if (fs.existsSync(p)) {
        fs.unlinkSync(p);
    }
}
console.log(`Cleaned up root public/ upload files. Video assets live in public/interstitials/motion/`);
