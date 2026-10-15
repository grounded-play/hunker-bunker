#!/usr/bin/env node
// Store About-section loops (docs/planning/steam-store-page-v2-copy-and-images-2026-10-14.md §5.2):
// 616 px wide, 4-6 s, seamless, < 3 MB, WebM (VP9) + MP4 (H.264), cut from
// the trailer v4 captures.
//   node scripts/trailer/about-loops.js        -> dist/trailer/v4/about/hb_about_0N_*.{webm,mp4}
// Seamless: the clip runs `dur`, and the `xf` seconds after its end are
// faded over its start, so the last frame flows into the first.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const RAW = path.join(ROOT, 'trailer/raw/v4');
const OUT = path.join(ROOT, 'dist/trailer/v4/about');
const W = 616;
const H = 346;

const LOOPS = [
    { name: 'hb_about_01_combat', shot: 'cold-open-tank', in: 0.3, dur: 3.4, zoom: 1.3, cy: 0.05 },
    { name: 'hb_about_02_bank', shot: 'salvage', in: 0.0, dur: 3.6, zoom: 1.0 },
    { name: 'hb_about_03_lights_out', shot: 'lights-out', in: 0.4, dur: 5.0, zoom: 1.3, cy: 0.05 },
    { name: 'hb_about_04_camp_hive', split: [{ shot: 'camp-siege', in: 0.8 }, { shot: 'hive-pulse', in: 0.6 }], dur: 3.6 }
];

const fileOf = (id) => path.join(RAW, id, `${id}.mkv`);

function graphFor(loop, xf) {
    const total = loop.dur + xf;
    if (loop.split) {
        const [a, b] = loop.split;
        return {
            inputs: ['-ss', String(a.in), '-t', String(total), '-i', fileOf(a.shot), '-ss', String(b.in), '-t', String(total), '-i', fileOf(b.shot)],
            pre: `[0:v]fps=30,crop=ih*${W / 2}/${H}:ih,scale=${W / 2}:${H}:flags=lanczos,setpts=PTS-STARTPTS[l];[1:v]fps=30,crop=ih*${W / 2}/${H}:ih,scale=${W / 2}:${H}:flags=lanczos,setpts=PTS-STARTPTS[r];[l][r]hstack,drawbox=x=${W / 2 - 1}:y=0:w=2:h=${H}:color=black:t=fill[v]`
        };
    }
    const z = loop.zoom ?? 1;
    return {
        inputs: ['-ss', String(loop.in), '-t', String(total), '-i', fileOf(loop.shot)],
        pre: `[0:v]fps=30,crop=iw/${z}:ih/${z}:(iw-iw/${z})*${loop.cx ?? 0.5}:(ih-ih/${z})*${loop.cy ?? 0.5},scale=${W}:${H}:flags=lanczos,setpts=PTS-STARTPTS[v]`
    };
}

fs.mkdirSync(OUT, { recursive: true });
for (const loop of LOOPS) {
    const xf = 0.4;
    const { inputs, pre } = graphFor(loop, xf);
    const graph = `${pre};[v]split[m][t];[t]trim=start=${loop.dur}:end=${loop.dur + xf},setpts=PTS-STARTPTS,format=yuva420p,fade=t=out:st=0:d=${xf}:alpha=1[tail];[m]trim=0:${loop.dur},setpts=PTS-STARTPTS[main];[main][tail]overlay=eof_action=pass,format=yuv420p[out]`;
    const base = path.join(OUT, loop.name);
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-filter_complex', graph, '-map', '[out]', '-an',
        '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', '-deadline', 'good', `${base}.webm`]);
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-filter_complex', graph, '-map', '[out]', '-an',
        '-c:v', 'libx264', '-crf', '24', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}.mp4`]);
    const kb = (f) => Math.round(fs.statSync(f).size / 1024);
    console.log(`${loop.name}: webm ${kb(`${base}.webm`)} KB, mp4 ${kb(`${base}.mp4`)} KB`);
}
