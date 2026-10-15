#!/usr/bin/env node
// Trailer v4 assembler (docs/planning/trailer-v4-capture-edit-and-sound-plan-2026-10-14.md §6).
//
//   node scripts/trailer/build-v4.js gameplay-trailer      -> dist/trailer/v4/hunker-bunker-gameplay-trailer.mp4
//   node scripts/trailer/build-v4.js cutdown-30 --draft    faster encode for review
//
// Reads trailer/edl/<name>.json. The picture is rendered clip by clip: ffmpeg
// decodes the 1.35x capture (static punch-in crop, scaled to output or 1.25x
// headroom), Node picks the source frame for every output frame (speed
// ramps, freezes) and applies animated zoom/shake/whip, and a second ffmpeg
// grades and encodes. Clips are concatenated, then text, letterbox and grain
// go on in one final pass. Sound is mixed in Node at 48 kHz on five buses
// (music, dialogue, game SFX from the capture event logs, kit FX, ambience)
// and loudness-normalised with two-pass loudnorm. QA runs at the end.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { placeGrid, resolveDuration, resolveTime, snap } from './edl-time.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const RAW = path.join(ROOT, 'trailer/raw/v4');
const SR = 48000;
const args = process.argv.slice(2);
const NAME = args.find((a) => !a.startsWith('--')) ?? 'gameplay-trailer';
const DRAFT = args.includes('--draft');
const EDL_FILE = path.join(ROOT, 'trailer/edl', `${NAME}.json`);
const WORK = path.join(RAW, 'build', NAME);
const OUT_DIR = path.join(ROOT, 'dist/trailer/v4');

const log = (...m) => console.log(`[trailer:${NAME}]`, ...m);
const sh = (cmd, argv, opts = {}) => execFileSync(cmd, argv, { maxBuffer: 1 << 30, ...opts });
// ffmpeg's analysis filters report on stderr; run it without a shell and read that.
const ffmpegLog = (argv) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...argv], { encoding: 'utf8', maxBuffer: 1 << 30 }).stderr ?? '';

// ---------------------------------------------------------------- EDL ------

function loadEdl() {
    const edl = JSON.parse(fs.readFileSync(EDL_FILE, 'utf8'));
    edl.fps ??= 60;
    edl.size ??= [1920, 1080];
    const ctx = { fps: edl.fps, grid: null };
    if (edl.music) {
        const grid = JSON.parse(fs.readFileSync(path.join(ROOT, edl.music.grid), 'utf8'));
        ctx.grid = placeGrid(grid, edl.music);
    }
    const T = (v) => snap(resolveTime(v, ctx), edl.fps);
    const D = (v) => resolveDuration(v, ctx);
    // Sequential video track: each clip starts where the last ended.
    let cursor = 0;
    edl.video = edl.video.map((clip, index) => {
        const start = cursor;
        const end = clip.until !== undefined ? T(clip.until) : snap(start + D(clip.dur), edl.fps);
        if (!(end > start)) throw new Error(`clip ${index} (${clip.shot ?? clip.kind}) ends before it starts: ${start} -> ${end}`);
        cursor = end;
        return { ...clip, index, start, end, frames: Math.round((end - start) * edl.fps) };
    });
    edl.duration = cursor;
    return { edl, ctx, T, D };
}

function shotMeta(id) {
    const file = path.join(RAW, id, `${id}.mkv`);
    if (!fs.existsSync(file)) throw new Error(`missing capture ${file}`);
    const meta = JSON.parse(fs.readFileSync(path.join(RAW, id, `${id}.meta.json`), 'utf8'));
    const events = JSON.parse(fs.readFileSync(path.join(RAW, id, `${id}.events.json`), 'utf8'));
    const [w, h] = sh('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim().split(',').map(Number);
    return { id, file, fps: meta.fps, frames: meta.frames, w, h, events };
}

// ------------------------------------------------------------- picture -----

// Output frame k -> source time (s), from speed keyframes and freezes.
function frameMap(clip, src, fps) {
    const keys = Array.isArray(clip.speed) ? clip.speed : [[0, clip.speed ?? 1]];
    const speedAt = (t) => {
        if (t <= keys[0][0]) return keys[0][1];
        for (let i = 1; i < keys.length; i += 1) {
            if (t <= keys[i][0]) {
                const [t0, s0] = keys[i - 1];
                const [t1, s1] = keys[i];
                return s0 + (s1 - s0) * ((t - t0) / (t1 - t0));
            }
        }
        return keys[keys.length - 1][1];
    };
    const freezes = (clip.freeze ? [].concat(clip.freeze) : []).map((f) => ({ from: Math.round(f.at * fps), frames: f.frames }));
    const times = [];
    let s = clip.in ?? 0;
    for (let k = 0; k < clip.frames; k += 1) {
        times.push(s);
        if (clip.hold) continue;
        // A freeze holds the source still for `frames` output frames.
        if (freezes.some((f) => k >= f.from && k < f.from + f.frames - 1)) continue;
        s += speedAt(k / fps) / fps;
    }
    const maxT = (src.frames - 1) / src.fps;
    const over = times.filter((t) => t > maxT).length;
    if (over > 0) log(`WARNING clip ${clip.index} (${clip.shot}) runs ${over} frames past the end of its take (in ${clip.in ?? 0}, take ${maxT.toFixed(2)} s): it will hold`);
    return times.map((t) => Math.min(maxT, Math.max(0, t)));
}

const GRADES = {
    cold: 'colorbalance=rs=-0.06:bs=0.07:rm=-0.03:bm=0.04,eq=contrast=1.06:saturation=0.92',
    hot: 'colorbalance=rs=0.08:gs=0.02:bs=-0.07:rh=0.05:bh=-0.04,eq=contrast=1.1:saturation=1.12',
    sick: 'colorbalance=rs=-0.08:gs=0.06:bs=-0.03:gm=0.05,eq=contrast=1.08:saturation=0.75:gamma=0.95',
    night: 'colorbalance=rs=-0.05:bs=0.08,eq=contrast=1.08:brightness=-0.02:saturation=0.9',
    dark: 'colorbalance=rs=-0.06:bs=0.1,eq=contrast=1.12:brightness=-0.09:saturation=0.8:gamma=0.9',
    neutral: 'eq=contrast=1.04:saturation=1.04'
};

function encodeFilters(clip, fps) {
    const f = [];
    const dur = clip.frames / fps;
    if (clip.grade && GRADES[clip.grade]) f.push(GRADES[clip.grade]);
    for (const g of [].concat(clip.glitch ?? [])) {
        const at = typeof g === 'number' ? 0 : g.at ?? 0;
        const frames = typeof g === 'number' ? g : g.frames ?? 3;
        const a = at.toFixed(4);
        const b = (at + frames / fps).toFixed(4);
        f.push(`rgbashift=rh=-18:bh=18:gv=4:enable='between(t,${a},${b})'`);
        f.push(`noise=alls=38:allf=t:enable='between(t,${a},${b})'`);
    }
    // Power-cut flicker: three short brightness drops, then `after` grades the rest of the clip.
    for (const fl of [].concat(clip.flicker ?? [])) {
        const a = fl.at;
        const win = [[0, 0.05], [0.1, 0.13], [0.2, 0.3]].map(([x, y]) => `between(t,${(a + x).toFixed(4)},${(a + y).toFixed(4)})`).join('+');
        f.push(`eq=brightness=-0.45:contrast=0.8:enable='${win}'`);
        if (fl.after && GRADES[fl.after]) f.push(...GRADES[fl.after].split(',').map((g) => `${g}:enable='gte(t,${(a + 0.3).toFixed(4)})'`));
    }
    if (clip.flash) f.push(`fade=t=in:st=0:d=${(clip.flash / fps).toFixed(4)}:color=white`);
    if (clip.fadeIn) f.push(`fade=t=in:st=0:d=${(clip.fadeIn / fps).toFixed(4)}:color=black`);
    if (clip.fadeOut) f.push(`fade=t=out:st=${(dur - clip.fadeOut / fps).toFixed(4)}:d=${(clip.fadeOut / fps).toFixed(4)}:color=black`);
    if (clip.flashOut) f.push(`fade=t=out:st=${(dur - clip.flashOut / fps).toFixed(4)}:d=${(clip.flashOut / fps).toFixed(4)}:color=white`);
    return f.length ? f.join(',') : 'null';
}

function startEncoder(file, w, h, fps, filters) {
    const proc = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${w}x${h}`, '-r', String(fps), '-i', '-',
        '-vf', filters, '-c:v', 'libx264', '-preset', DRAFT ? 'veryfast' : 'medium', '-crf', DRAFT ? '20' : '12',
        '-pix_fmt', 'yuv420p', '-r', String(fps), file], { stdio: ['pipe', 'ignore', 'pipe'] });
    let err = '';
    proc.stderr.on('data', (d) => { err += d; });
    const done = new Promise((resolve, reject) => proc.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`encode ${file}: ${err}`)))));
    return {
        write: (buf) => new Promise((resolve) => (proc.stdin.write(buf) ? resolve() : proc.stdin.once('drain', resolve))),
        end: async () => { proc.stdin.end(); await done; }
    };
}

// Sequential raw-frame reader over an ffmpeg decode.
function startDecoder(src, startFrame, vf, w, h) {
    const proc = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error',
        '-ss', (startFrame / src.fps).toFixed(5), '-i', src.file, '-vf', vf,
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { stdio: ['ignore', 'pipe', 'pipe'] });
    const size = w * h * 3;
    let chunks = [];
    let have = 0;
    let ended = false;
    let waiting = null;
    proc.stdout.on('data', (d) => {
        chunks.push(d);
        have += d.length;
        if (have >= size * 3) proc.stdout.pause();
        if (waiting) waiting();
    });
    proc.stdout.on('end', () => { ended = true; if (waiting) waiting(); });
    let index = startFrame - 1;
    let current = null;
    const nextFrame = async () => {
        while (have < size && !ended) {
            proc.stdout.resume();
            await new Promise((r) => { waiting = r; });
            waiting = null;
        }
        if (have < size) return null;
        const all = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks);
        const frame = Buffer.from(all.subarray(0, size));
        chunks = [all.subarray(size)];
        have -= size;
        if (have < size * 2) proc.stdout.resume();
        return frame;
    };
    return {
        frameAt: async (i) => {
            while (index < i) {
                const f = await nextFrame();
                if (!f) break;
                current = f;
                index += 1;
            }
            return current;
        },
        close: () => proc.kill('SIGKILL')
    };
}

// Bilinear resample of a (zoom, centre, offset) window of `src` (sw x sh) to w x h.
function resample(srcBuf, sw, sh, w, h, zoom, cx, cy, blurPx = 0) {
    const out = Buffer.allocUnsafe(w * h * 3);
    const vw = sw / zoom;
    const vh = sh / zoom;
    const x0 = Math.min(sw - vw, Math.max(0, cx * sw - vw / 2));
    const y0 = Math.min(sh - vh, Math.max(0, cy * sh - vh / 2));
    const sx = vw / w;
    const sy = vh / h;
    const taps = blurPx > 0 ? 5 : 1;
    for (let y = 0; y < h; y += 1) {
        const fy = y0 + (y + 0.5) * sy - 0.5;
        const iy = Math.max(0, Math.min(sh - 2, Math.floor(fy)));
        const ty = Math.min(1, Math.max(0, fy - iy));
        for (let x = 0; x < w; x += 1) {
            let r = 0; let g = 0; let b = 0;
            for (let k = 0; k < taps; k += 1) {
                const fx = x0 + (x + 0.5) * sx - 0.5 + (taps > 1 ? (k - 2) * blurPx / 2 : 0);
                const ix = Math.max(0, Math.min(sw - 2, Math.floor(fx)));
                const tx = Math.min(1, Math.max(0, fx - ix));
                const p00 = (iy * sw + ix) * 3;
                const p10 = p00 + 3;
                const p01 = p00 + sw * 3;
                const p11 = p01 + 3;
                const w00 = (1 - tx) * (1 - ty); const w10 = tx * (1 - ty); const w01 = (1 - tx) * ty; const w11 = tx * ty;
                r += srcBuf[p00] * w00 + srcBuf[p10] * w10 + srcBuf[p01] * w01 + srcBuf[p11] * w11;
                g += srcBuf[p00 + 1] * w00 + srcBuf[p10 + 1] * w10 + srcBuf[p01 + 1] * w01 + srcBuf[p11 + 1] * w11;
                b += srcBuf[p00 + 2] * w00 + srcBuf[p10 + 2] * w10 + srcBuf[p01 + 2] * w01 + srcBuf[p11 + 2] * w11;
            }
            const o = (y * w + x) * 3;
            out[o] = r / taps; out[o + 1] = g / taps; out[o + 2] = b / taps;
        }
    }
    return out;
}

// Deterministic shake offset (fraction of frame) at clip time t.
const shakeAt = (t, amp, seed) => [
    amp * (Math.sin(t * 61 + seed) * 0.6 + Math.sin(t * 97 + seed * 2) * 0.4),
    amp * (Math.sin(t * 71 + seed * 3) * 0.6 + Math.sin(t * 113 + seed) * 0.4)
];

async function renderShotClip(clip, src, file, edl) {
    const [W, H] = edl.size;
    const fps = edl.fps;
    const times = frameMap(clip, src, fps);
    const indices = times.map((t) => Math.round(t * src.fps));
    // Static punch-in crop on the capture (1.35x device pixels).
    // Largest window of the output aspect in the source (9:16 for the
    // vertical cut), divided by the punch-in.
    const z = clip.zoom?.z ?? 1;
    const aspect = W / H;
    const baseW = Math.min(src.w, src.h * aspect);
    const cw = Math.round(baseW / z / 2) * 2;
    const ch = Math.round(baseW / aspect / z / 2) * 2;
    const cx = Math.round(Math.min(src.w - cw, Math.max(0, (clip.zoom?.cx ?? 0.5) * src.w - cw / 2)));
    const cy = Math.round(Math.min(src.h - ch, Math.max(0, (clip.zoom?.cy ?? 0.5) * src.h - ch / 2)));
    const animated = Boolean(clip.push || clip.shake || clip.shakeAt || clip.whipIn || clip.whipOut);
    const headroom = animated ? 1.25 : 1;
    const dw = Math.round(W * headroom / 2) * 2;
    const dh = Math.round(H * headroom / 2) * 2;
    const vf = `crop=${cw}:${ch}:${cx}:${cy},scale=${dw}:${dh}:flags=lanczos`;
    const decoder = startDecoder(src, Math.max(0, indices[0]), vf, dw, dh);
    const encoder = startEncoder(file, W, H, fps, encodeFilters(clip, fps));
    const seed = clip.index * 7.31;
    try {
        for (let k = 0; k < clip.frames; k += 1) {
            const frame = await decoder.frameAt(indices[k]);
            if (!frame) throw new Error(`decoder ran out at ${clip.shot} frame ${indices[k]}`);
            if (!animated) {
                await encoder.write(frame);
                continue;
            }
            const t = k / fps;
            const p = clip.frames > 1 ? k / (clip.frames - 1) : 0;
            // The decode carries 1.25x headroom, so zooms up to 1.25 never
            // upscale. Shake and whip get 4% overscan so no edge shows.
            let zoom = (clip.shake || clip.shakeAt || clip.whipIn || clip.whipOut) ? 1.04 : 1;
            let ccx = 0.5;
            let ccy = 0.5;
            if (clip.push) {
                const e = p * p * (3 - 2 * p);
                zoom *= (clip.push.from ?? 1) + ((clip.push.to ?? 1.15) - (clip.push.from ?? 1)) * e;
                ccx += ((clip.push.cx ?? 0.5) - 0.5) * e;
                ccy += ((clip.push.cy ?? 0.5) - 0.5) * e;
            }
            let amp = clip.shake ?? 0;
            for (const s of clip.shakeAt ?? []) {
                const dt = t - s.at;
                if (dt >= 0 && dt < (s.len ?? 0.25)) amp = Math.max(amp, (s.amp ?? 0.012) * (1 - dt / (s.len ?? 0.25)));
            }
            const [sx, sy] = shakeAt(t, amp, seed);
            ccx += sx;
            ccy += sy;
            let blur = 0;
            if (clip.whipOut && k >= clip.frames - clip.whipOut) {
                const q = (k - (clip.frames - clip.whipOut) + 1) / clip.whipOut;
                ccx += 0.22 * q * q;
                blur = 40 * q;
            }
            if (clip.whipIn && k < clip.whipIn) {
                const q = 1 - k / clip.whipIn;
                ccx -= 0.22 * q * q;
                blur = 40 * q;
            }
            await encoder.write(resample(frame, dw, dh, W, H, zoom, ccx, ccy, blur));
        }
    } finally {
        decoder.close();
    }
    await encoder.end();
    return { times };
}

function renderBlack(clip, file, edl) {
    const [W, H] = edl.size;
    sh('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${edl.fps}:d=${(clip.frames / edl.fps).toFixed(5)}`,
        '-frames:v', String(clip.frames), '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', file]);
}

// Three panels side by side, sliding in staggered.
function renderSplit3(clip, file, edl) {
    const [W, H] = edl.size;
    const fps = edl.fps;
    const dur = (clip.frames / fps).toFixed(5);
    const pw = Math.floor(W / 3);
    const inputs = [];
    const chains = [];
    clip.panels.forEach((panel, i) => {
        const src = shotMeta(panel.shot);
        const cw = Math.round((src.h * pw / H) / (panel.z ?? 1) / 2) * 2;
        const ch = Math.round(src.h / (panel.z ?? 1) / 2) * 2;
        const cx = Math.round(Math.min(src.w - cw, Math.max(0, (panel.cx ?? 0.5) * src.w - cw / 2)));
        const cy = Math.round(Math.min(src.h - ch, Math.max(0, (panel.cy ?? 0.5) * src.h - ch / 2)));
        // speed < 1 stretches a short take over the panel; a take that still
        // runs out holds its last frame instead of dropping to black.
        const speed = panel.speed ?? 1;
        inputs.push('-ss', String(panel.in ?? 0), '-t', (Number(dur) * speed + 0.1).toFixed(4), '-i', src.file);
        chains.push(`[${i}:v]setpts=(PTS-STARTPTS)/${speed},fps=${fps},crop=${cw}:${ch}:${cx}:${cy},scale=${pw}:${H}:flags=lanczos,tpad=stop_mode=clone:stop_duration=${dur}${panel.grade && GRADES[panel.grade] ? `,${GRADES[panel.grade]}` : ''}[p${i}]`);
    });
    const stagger = (clip.stagger ?? 4) / fps;
    let graph = `color=c=black:s=${W}x${H}:r=${fps}:d=${dur}[bg];${chains.join(';')}`;
    let last = 'bg';
    clip.panels.forEach((_, i) => {
        const d = (i * stagger).toFixed(4);
        // Ease-out slide from below, 0.18 s.
        graph += `;[${last}][p${i}]overlay=x=${i * pw}:y='if(lt(t,${d}),H,H*pow(max(0,1-(t-${d})/0.18),3))':eof_action=pass[o${i}]`;
        last = `o${i}`;
    });
    graph += `;[${last}]drawbox=x=${pw - 2}:y=0:w=4:h=${H}:color=black@1:t=fill,drawbox=x=${2 * pw - 2}:y=0:w=4:h=${H}:color=black@1:t=fill${clip.flash ? `,fade=t=in:st=0:d=${(clip.flash / fps).toFixed(4)}:color=white` : ''}[v]`;
    sh('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-filter_complex', graph, '-map', '[v]',
        '-frames:v', String(clip.frames), '-c:v', 'libx264', '-crf', DRAFT ? '20' : '12', '-preset', DRAFT ? 'veryfast' : 'medium', '-pix_fmt', 'yuv420p', '-r', String(fps), file]);
    return clip.panels.map((panel) => {
        const src = shotMeta(panel.shot);
        const speed = panel.speed ?? 1;
        return { shot: panel.shot, src, times: Array.from({ length: clip.frames }, (_, k) => (panel.in ?? 0) + (k / fps) * speed), gain: panel.sfxGain ?? -6 };
    });
}

// ------------------------------------------------------------- overlays ----

const FONT = {
    black: path.join(ROOT, 'trailer/fonts/Outfit-Black.ttf'),
    bold: path.join(ROOT, 'trailer/fonts/Outfit-Bold.ttf'),
    mono: path.join(ROOT, 'trailer/fonts/SpaceMono-Bold.ttf'),
    monoRegular: path.join(ROOT, 'trailer/fonts/SpaceMono-Regular.ttf')
};

// drawtext text, escaped in one pass: a backslash doubles twice (filtergraph
// then drawtext), the separators get one backslash, and an apostrophe becomes
// a typographic one so it cannot close the quoted option.
const DRAWTEXT_ESCAPES = { '\\': '\\\\\\\\', ':': '\\:', '%': '\\%', ',': '\\,', "'": '\u2019' };
const esc = (s) => String(s).replace(/[\\:%,']/g, (c) => DRAWTEXT_ESCAPES[c]);

// Text styles: kinetic (slam-in word), type (typed terminal line), title, cta, small.
function textFilters(item, T, D) {
    const at = T(item.at);
    const dur = D(item.dur ?? 1.2);
    const end = at + dur;
    const style = item.style ?? 'kinetic';
    const out = [];
    const enable = `enable='between(t,${at.toFixed(4)},${end.toFixed(4)})'`;
    const fadeOut = `if(gt(t,${(end - 0.12).toFixed(4)}),max(0,(${end.toFixed(4)}-t)/0.12),1)`;
    const y = item.y ?? '(h-text_h)/2';
    if (style === 'kinetic') {
        // Slam: starts 1.35x and settles to 1x over 6 frames, with a shadow.
        const size = item.size ?? 150;
        const scale = `(1+0.35*max(0,1-(t-${at.toFixed(4)})/0.1))`;
        out.push(`drawtext=fontfile='${FONT.black}':text='${esc(item.text)}':fontsize='${size}*${scale}':fontcolor=${item.color ?? 'white'}:x=(w-text_w)/2:y=${y}:shadowcolor=black@0.6:shadowx=6:shadowy=6:alpha='${fadeOut}':${enable}`);
    } else if (style === 'type') {
        const size = item.size ?? 56;
        const chars = [...item.text];
        const cps = item.cps ?? 28;
        chars.forEach((_, i) => {
            const from = at + i / cps;
            const to = i === chars.length - 1 ? end : at + (i + 1) / cps;
            out.push(`drawtext=fontfile='${FONT.mono}':text='${esc(chars.slice(0, i + 1).join(''))}${i === chars.length - 1 ? '' : '_'}':fontsize=${size}:fontcolor=${item.color ?? '0x7fe8ff'}:x=${item.x ?? '(w-text_w)/2'}:y=${y}:shadowcolor=black@0.7:shadowx=3:shadowy=3:enable='between(t,${from.toFixed(4)},${to.toFixed(4)})'`);
        });
    } else if (style === 'title') {
        const size = item.size ?? 190;
        out.push(`drawtext=fontfile='${FONT.black}':text='${esc(item.text)}':fontsize=${size}:fontcolor=white:x=(w-text_w)/2:y=${y}:shadowcolor=0x39d0ff@0.55:shadowx=0:shadowy=0:borderw=2:bordercolor=0x9feaff@0.35:alpha='min(1,(t-${at.toFixed(4)})/0.05)':${enable}`);
    } else if (style === 'cta') {
        const size = item.size ?? 84;
        out.push(`drawtext=fontfile='${FONT.bold}':text='${esc(item.text)}':fontsize=${size}:fontcolor=white:x=(w-text_w)/2:y=${y}:box=1:boxcolor=0x0b1820@0.85:boxborderw=28:alpha='min(1,(t-${at.toFixed(4)})/0.15)':${enable}`);
    } else {
        const size = item.size ?? 30;
        out.push(`drawtext=fontfile='${FONT.monoRegular}':text='${esc(item.text)}':fontsize=${size}:fontcolor=${item.color ?? 'white@0.8'}:x=${item.x ?? '(w-text_w)/2'}:y=${y}:alpha='min(1,(t-${at.toFixed(4)})/0.2)':${enable}`);
    }
    return out;
}

function letterboxFilters(edl, T) {
    const [, H] = edl.size;
    const bar = Math.round((H - edl.size[0] / 2.39) / 2);
    return (edl.letterbox ?? []).map((lb) => {
        const a = T(lb.from).toFixed(4);
        const b = T(lb.to).toFixed(4);
        const slide = `min(1,(t-${a})/0.25)`;
        return [
            `drawbox=x=0:y=0:w=iw:h='${bar}*${slide}':color=black@1:t=fill:enable='between(t,${a},${b})'`,
            `drawbox=x=0:y='ih-${bar}*${slide}':w=iw:h='${bar}*${slide}':color=black@1:t=fill:enable='between(t,${a},${b})'`
        ];
    }).flat();
}

// --------------------------------------------------------------- sound -----

const decodeCache = new Map();
function decodeAudio(file, filters = null) {
    const key = `${file}|${filters}`;
    if (decodeCache.has(key)) return decodeCache.get(key);
    const argv = ['-hide_banner', '-loglevel', 'error', '-i', file];
    if (filters) argv.push('-af', filters);
    argv.push('-ac', '2', '-ar', String(SR), '-f', 'f32le', '-');
    const raw = sh('ffmpeg', argv);
    const all = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
    const n = all.length / 2;
    const L = new Float32Array(n);
    const R = new Float32Array(n);
    for (let i = 0; i < n; i += 1) { L[i] = all[2 * i]; R[i] = all[2 * i + 1]; }
    const out = [L, R];
    decodeCache.set(key, out);
    return out;
}

const dbToGain = (db) => 10 ** (db / 20);

function mixInto(bus, src, at, { gain = 1, pan = 0, rate = 1, from = 0, len = null, fadeIn = 0.003, fadeOut = 0.01 } = {}) {
    const start = Math.round(at * SR);
    const srcFrom = Math.round(from * SR);
    const srcLen = src[0].length - srcFrom;
    const outLen = Math.floor((len !== null ? Math.min(len * SR * rate, srcLen) : srcLen) / rate);
    const gl = gain * Math.min(1, 1 - pan);
    const gr = gain * Math.min(1, 1 + pan);
    const fi = Math.max(1, Math.round(fadeIn * SR));
    const fo = Math.max(1, Math.round(fadeOut * SR));
    for (let i = 0; i < outLen; i += 1) {
        const o = start + i;
        if (o < 0) continue;
        if (o >= bus[0].length) break;
        const p = srcFrom + i * rate;
        const j = Math.floor(p);
        const f = p - j;
        if (j + 1 >= src[0].length) break;
        let env = 1;
        if (i < fi) env = i / fi;
        if (outLen - i < fo) env = Math.min(env, (outLen - i) / fo);
        bus[0][o] += (src[0][j] * (1 - f) + src[0][j + 1] * f) * gl * env;
        bus[1][o] += (src[1][j] * (1 - f) + src[1][j + 1] * f) * gr * env;
    }
}

function biquadLP() {
    let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0;
    return (x, freq) => {
        const w = 2 * Math.PI * Math.min(freq, SR * 0.45) / SR;
        const cos = Math.cos(w);
        const alpha = Math.sin(w) / (2 * 0.707);
        const a0 = 1 + alpha;
        const y = (((1 - cos) / 2) * x + (1 - cos) * x1 + ((1 - cos) / 2) * x2 + 2 * cos * y1 - (1 - alpha) * y2) / a0;
        x2 = x1; x1 = x; y2 = y1; y1 = y;
        return y;
    };
}

// Resolve a game sound key (the buffer key the capture logged) to a file.
let audioIndex = null;
function resolveGameSound(key) {
    if (!audioIndex) {
        audioIndex = new Map();
        const mainJs = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
        for (const m of mainJs.matchAll(/key:\s*'([^']+)',\s*url:\s*'([^']+)'/g)) audioIndex.set(m[1], path.join(ROOT, 'public', m[2]));
        const walk = (dir) => {
            for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                const p = path.join(dir, e.name);
                if (e.isDirectory()) walk(p);
                else if (/\.(ogg|wav|mp3)$/.test(e.name)) {
                    const k = e.name.replace(/\.(ogg|wav|mp3)$/, '');
                    if (!audioIndex.has(k) || e.name.endsWith('.wav')) audioIndex.set(k, audioIndex.get(k) && !e.name.endsWith('.wav') ? audioIndex.get(k) : p);
                }
            }
        };
        walk(path.join(ROOT, 'public/audio'));
    }
    const file = audioIndex.get(key);
    return file && fs.existsSync(file) ? file : null;
}

const VO_FX = {
    radio: 'highpass=f=320,lowpass=f=3300,acrusher=bits=11:mix=0.25:mode=log,acompressor=threshold=0.1:ratio=4:attack=5:release=80,volume=2.2',
    pa: 'highpass=f=170,lowpass=f=5200,aecho=0.85:0.55:75|140:0.28|0.14,acompressor=threshold=0.12:ratio=3:attack=5:release=120,volume=1.6',
    queen: 'asplit=2[a][b];[b]asetrate=48000*0.5,aresample=48000,atempo=2.0,lowpass=f=1800,volume=0.32[low];[a][low]amix=inputs=2:normalize=0,aecho=0.8:0.7:180|360:0.32|0.18,volume=1.4',
    system: 'highpass=f=120,acompressor=threshold=0.15:ratio=3:attack=5:release=100,volume=1.3',
    dry: 'highpass=f=90'
};

function buildMix(edl, T, D, clipSounds) {
    const n = Math.ceil((edl.duration + 0.5) * SR);
    const bus = () => [new Float32Array(n), new Float32Array(n)];
    const music = bus();
    const dialogue = bus();
    const sfx = bus();
    const kit = bus();
    const amb = bus();
    const report = { sfxPlaced: 0, sfxMissing: new Set() };

    // Dialogue.
    for (const line of edl.dialogue ?? []) {
        const chain = VO_FX[line.fx ?? 'dry'];
        const src = decodeAudio(path.join(ROOT, line.file), chain.includes('[') ? null : chain);
        let s = src;
        if (chain.includes('[')) {
            // Filter graphs with labels go through -filter_complex.
            const raw = sh('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', path.join(ROOT, line.file), '-filter_complex', `[0:a]aresample=48000,${chain}[out]`, '-map', '[out]', '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-']);
            const all = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
            const L = new Float32Array(all.length / 2); const R = new Float32Array(all.length / 2);
            for (let i = 0; i < L.length; i += 1) { L[i] = all[2 * i]; R[i] = all[2 * i + 1]; }
            s = [L, R];
        }
        const [a, b] = line.trim ?? [0, s[0].length / SR];
        mixInto(dialogue, s, T(line.at), { gain: dbToGain(line.gain ?? 0), from: a, len: b - a, fadeIn: 0.02, fadeOut: 0.06 });
    }

    // Music: one continuous read of the track from its in-point.
    if (edl.music) {
        const m = edl.music;
        const src = decodeAudio(path.join(ROOT, m.file));
        const start = T(m.start ?? 0);
        const end = T(m.end ?? edl.duration);
        const grid = placeGrid(JSON.parse(fs.readFileSync(path.join(ROOT, m.grid), 'utf8')), m);
        const srcIn = start - grid.offset;
        const tmp = [new Float32Array(Math.round((end - start) * SR)), new Float32Array(Math.round((end - start) * SR))];
        mixInto(tmp, src, 0, { from: srcIn, len: end - start, fadeIn: 0.01, fadeOut: 0.005 });
        // Low-pass automation [[t, hz], ...] in trailer time.
        if (m.lowpass?.length) {
            const keys = m.lowpass.map(([t, f]) => [T(t) - start, f]);
            const fl = biquadLP(); const fr = biquadLP();
            for (let i = 0; i < tmp[0].length; i += 1) {
                const t = i / SR;
                let f = keys[keys.length - 1][1];
                for (let k = 1; k < keys.length; k += 1) {
                    if (t <= keys[k][0]) {
                        const [t0, f0] = keys[k - 1];
                        const [t1, f1] = keys[k];
                        const q = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
                        f = f0 * (f1 / f0) ** q;
                        break;
                    }
                }
                if (t < keys[0][0]) f = keys[0][1];
                if (f < 19000) { tmp[0][i] = fl(tmp[0][i], f); tmp[1][i] = fr(tmp[1][i], f); }
            }
        }
        // Tape stop: the last `len` seconds decelerate to zero.
        if (m.tapeStop) {
            const len = m.tapeStop.len ?? 0.8;
            const from = Math.max(0, tmp[0].length - Math.round(len * SR));
            const L = tmp[0].slice(); const R = tmp[1].slice();
            let p = from;
            for (let i = from; i < tmp[0].length; i += 1) {
                const q = (i - from) / (tmp[0].length - from);
                const j = Math.floor(p);
                tmp[0][i] = (L[j] ?? 0) * (1 - q * 0.3);
                tmp[1][i] = (R[j] ?? 0) * (1 - q * 0.3);
                p += (1 - q) ** 1.6;
            }
        }
        mixInto(music, tmp, start, { gain: dbToGain(m.gain ?? -2), fadeIn: (m.fadeIn ?? 0.01), fadeOut: 0.004 });
        // Extra music pieces (the end sting): [{file, at, from, len, gain}]
        for (const piece of m.pieces ?? []) {
            const s = decodeAudio(path.join(ROOT, piece.file));
            mixInto(music, s, T(piece.at), { gain: dbToGain(piece.gain ?? -2), from: piece.from ?? 0, len: piece.len ?? null, fadeIn: piece.fadeIn ?? 0.01, fadeOut: piece.fadeOut ?? 0.5 });
        }
    }

    // Kit FX (synthesized on demand: trailer/sfx is generated, not stored).
    if ((edl.kit ?? []).some((fx) => !fs.existsSync(path.join(ROOT, 'trailer/sfx', `${fx.fx}.wav`)))) {
        sh('node', [path.join(ROOT, 'scripts/trailer/sfx-kit.js'), '--out', path.join(ROOT, 'trailer/sfx')]);
    }
    for (const fx of edl.kit ?? []) {
        const file = path.join(ROOT, 'trailer/sfx', `${fx.fx}.wav`);
        const src = decodeAudio(file);
        const len = src[0].length / SR;
        const at = fx.end !== undefined ? T(fx.end) - len : T(fx.at);
        mixInto(kit, src, at, { gain: dbToGain(fx.gain ?? -6), pan: fx.pan ?? 0, fadeIn: 0.001, fadeOut: 0.02 });
    }

    // Ambience beds.
    for (const a of edl.ambience ?? []) {
        const src = decodeAudio(path.join(ROOT, a.file));
        const from = T(a.from);
        const to = T(a.to);
        mixInto(amb, src, from, { gain: dbToGain(a.gain ?? -14), len: to - from, fadeIn: a.fade ?? 0.25, fadeOut: a.fade ?? 0.25 });
    }

    // Game SFX from the capture event logs, placed on the frames they fired.
    const mute = new Set(edl.game_sfx?.mute ?? []);
    const busGain = dbToGain(edl.game_sfx?.gain ?? -4);
    for (const cs of clipSounds) {
        const { clip, src, times, gain } = cs;
        if (!src.events?.length) continue;
        for (const e of src.events) {
            if (e.kind !== 'sfx' || !e.played || !e.buffer) continue;
            // The game's own VO and barks stay out: the trailer's dialogue bus owns speech.
            if (/^(line:|voice_|vo_|music_|mainbg_)/.test(e.buffer) || /^(line:|voice_|music_)/.test(e.key)) continue;
            if (mute.has(e.key) || mute.has(e.buffer) || (clip.sfx?.mute ?? []).includes(e.key)) continue;
            const ts = e.t / 1000;
            // First output frame showing source time >= ts.
            const k = times.findIndex((t) => t >= ts - 1e-6);
            if (k < 0) continue;
            if (k === 0 && ts < times[0] - 0.05) continue;
            const local = k + 1 < times.length ? Math.max(0.05, (times[k + 1] - times[k]) * edl.fps) : 1;
            const file = resolveGameSound(e.buffer);
            if (!file) { report.sfxMissing.add(e.buffer); continue; }
            const s = decodeAudio(file);
            const at = clip.start + k / edl.fps;
            const until = clip.end + (clip.sfxTail ?? 0.35);
            mixInto(sfx, s, at, {
                gain: busGain * dbToGain(gain ?? clip.sfx?.gain ?? 0) * (e.gain ?? 1),
                pan: e.pan ?? 0,
                rate: (e.rate ?? 1) * (clip.sfx?.pitchWithSpeed === false ? 1 : Math.min(1, local)),
                len: Math.max(0.01, until - at)
            });
            report.sfxPlaced += 1;
        }
    }

    // Duck music and game SFX under dialogue (envelope follower).
    const duckDb = edl.mix?.duckDb ?? 8;
    const env = new Float32Array(n);
    let e = 0;
    const att = Math.exp(-1 / (0.012 * SR));
    const rel = Math.exp(-1 / (0.35 * SR));
    for (let i = 0; i < n; i += 1) {
        const x = Math.max(Math.abs(dialogue[0][i]), Math.abs(dialogue[1][i]));
        e = x > e ? att * e + (1 - att) * x : rel * e + (1 - rel) * x;
        env[i] = e;
    }
    const busDb = { music: 0, dialogue: 0, sfx: 0, kit: 0, amb: 0, ...(edl.mix?.buses ?? {}) };
    const master = bus();
    for (let i = 0; i < n; i += 1) {
        const duck = Math.min(1, env[i] / 0.05);
        const gm = dbToGain(busDb.music - duckDb * duck);
        const gs = dbToGain(busDb.sfx - duckDb * 0.6 * duck);
        for (let c = 0; c < 2; c += 1) {
            const v = music[c][i] * gm + sfx[c][i] * gs + dialogue[c][i] * dbToGain(busDb.dialogue)
                + kit[c][i] * dbToGain(busDb.kit) + amb[c][i] * dbToGain(busDb.amb);
            master[c][i] = Math.tanh(v * 0.9) / 0.9; // gentle safety clip; loudnorm sets the level
        }
    }
    report.sfxMissing = [...report.sfxMissing];
    return { master, report };
}

function writeWav(file, [L, R]) {
    const n = L.length;
    const data = Buffer.alloc(n * 8);
    for (let i = 0; i < n; i += 1) { data.writeFloatLE(L[i], i * 8); data.writeFloatLE(R[i], i * 8 + 4); }
    const h = Buffer.alloc(44);
    h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
    h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24);
    h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
    fs.writeFileSync(file, Buffer.concat([h, data]));
}

function loudnorm(input, output, target = -14) {
    // TP -3 plus a -3 dBFS limiter: the AAC encoder overshoots the PCM peak
    // by ~1.2 dB on this mix (measured), and the delivered file must stay under -1 dBTP.
    const first = ffmpegLog(['-i', input, '-af', `loudnorm=I=${target}:TP=-3:LRA=11:print_format=json`, '-f', 'null', '-']);
    const json = JSON.parse(first.slice(first.lastIndexOf('{'), first.lastIndexOf('}') + 1));
    sh('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-af',
        `loudnorm=I=${target}:TP=-3:LRA=11:measured_I=${json.input_i}:measured_TP=${json.input_tp}:measured_LRA=${json.input_lra}:measured_thresh=${json.input_thresh}:offset=${json.target_offset}:linear=true,aresample=48000,alimiter=limit=0.708:attack=1:release=60:level=false`,
        '-c:a', 'pcm_f32le', output]);
    // Short, dense cuts cannot reach the target linearly under the ceiling:
    // make up the remaining gain into the limiter, re-measure, up to 3 times.
    const measure = (file) => {
        const out = ffmpegLog(['-i', file, '-af', 'ebur128', '-f', 'null', '-']);
        return Number(out.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)?.[0]);
    };
    for (let pass = 0; pass < 3; pass += 1) {
        const I = measure(output);
        if (!(I < target - 0.4)) break;
        const tmp = `${output}.makeup.wav`;
        sh('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', output, '-af',
            `volume=${(target - I).toFixed(2)}dB,alimiter=limit=0.708:attack=1:release=60:level=false`, '-c:a', 'pcm_f32le', tmp]);
        fs.renameSync(tmp, output);
        json.makeupPasses = pass + 1;
    }
    return json;
}

// ------------------------------------------------------------------ QA -----

function qa(file, edl, T) {
    const run = (vf, af) => ffmpegLog(['-i', file, ...(vf ? ['-vf', vf] : ['-vn']), ...(af ? ['-af', af] : ['-an']), '-f', 'null', '-']);
    const probe = JSON.parse(sh('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }));
    const v = probe.streams.find((s) => s.codec_type === 'video');
    const a = probe.streams.find((s) => s.codec_type === 'audio');
    const black = [...run('blackdetect=d=0.05:pix_th=0.06', null).matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const freeze = [...run('freezedetect=n=0.001:d=0.5', null).matchAll(/freeze_start: ([\d.]+)[\s\S]*?freeze_end: ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const silence = [...run(null, 'silencedetect=n=-50dB:d=0.4').matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const loud = run(null, 'ebur128=peak=true');
    const I = Number(loud.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)?.[0]);
    const TP = Number(loud.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()?.match(/-?[\d.]+/)?.[0]);
    const allowedBlack = (edl.qa?.black ?? []).map(([s, e]) => [T(s), T(e)]);
    const unexpectedBlack = black.filter(([s, e]) => !allowedBlack.some(([as, ae]) => s >= as - 0.1 && e <= ae + 0.1));
    const checks = {
        codec: v.codec_name === 'h264' && v.profile === 'High',
        size: v.width === edl.size[0] && v.height === edl.size[1],
        fps: v.r_frame_rate === `${edl.fps}/1`,
        audio: a?.codec_name === 'aac' && Number(a.sample_rate) === SR && a.channels === 2,
        duration: Math.abs(Number(probe.format.duration) - edl.duration) < 0.1,
        loudness: Math.abs(I - (edl.mix?.lufs ?? -14)) <= 1,
        truePeak: TP <= -1.0,
        noUnexpectedBlack: unexpectedBlack.length === 0,
        // Planned black and planned holds (freeze frames, title cards) may read as freezes.
        noFreeze: freeze.every(([s, e]) => [...(edl.qa?.freeze ?? []), ...(edl.qa?.black ?? [])].some(([as, ae]) => s >= T(as) - 0.1 && e <= T(ae) + 0.1))
    };
    return {
        file,
        bitrateMbps: Math.round(Number(probe.format.bit_rate) / 1e5) / 10,
        duration: Number(probe.format.duration),
        integratedLufs: I,
        truePeakDb: TP,
        black, unexpectedBlack, freeze, silence, checks,
        pass: Object.values(checks).every(Boolean)
    };
}

// ----------------------------------------------------------------- main ----

async function main() {
    const { edl, ctx, T, D } = loadEdl();
    fs.mkdirSync(WORK, { recursive: true });
    fs.mkdirSync(OUT_DIR, { recursive: true });
    log(`${edl.video.length} clips, ${edl.duration.toFixed(2)} s${ctx.grid ? `, drop at ${ctx.grid.dropAt}s, ${ctx.grid.bpm} BPM` : ''}`);
    const listFile = path.join(WORK, 'concat.txt');
    const list = [];
    const clipSounds = [];
    const cut = [];
    for (const clip of edl.video) {
        const file = path.join(WORK, `clip-${String(clip.index).padStart(3, '0')}.mkv`);
        const label = clip.shot ?? clip.kind ?? (clip.black ? 'black' : 'clip');
        const t0 = Date.now();
        if (clip.black) {
            renderBlack(clip, file, edl);
        } else if (clip.kind === 'split3') {
            for (const s of renderSplit3(clip, file, edl)) clipSounds.push({ clip, ...s });
        } else {
            const src = shotMeta(clip.shot);
            const { times } = await renderShotClip(clip, src, file, edl);
            clipSounds.push({ clip, shot: clip.shot, src, times, gain: clip.sfx?.gain ?? 0 });
        }
        list.push(`file '${file}'`);
        cut.push({ i: clip.index, label, start: clip.start, end: clip.end, frames: clip.frames });
        log(`clip ${clip.index} ${label} ${clip.start.toFixed(3)}-${clip.end.toFixed(3)} (${clip.frames}f) ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
    fs.writeFileSync(listFile, `${list.join('\n')}\n`);
    const body = path.join(WORK, 'body.mkv');
    sh('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', body]);

    log('mixing sound');
    const { master, report } = buildMix(edl, T, D, clipSounds);
    const mixRaw = path.join(WORK, 'mix-raw.wav');
    const mix = path.join(WORK, 'mix.wav');
    writeWav(mixRaw, master);
    const loud = loudnorm(mixRaw, mix, edl.mix?.lufs ?? -14);
    log(`mix: ${report.sfxPlaced} game sounds placed, input ${loud.input_i} LUFS${report.sfxMissing.length ? `, missing: ${report.sfxMissing.join(' ')}` : ''}`);

    const overlay = [
        ...letterboxFilters(edl, T),
        ...(edl.text ?? []).flatMap((item) => textFilters(item, T, D)),
        ...(edl.grain ? [`noise=alls=${edl.grain}:allf=t`] : [])
    ];
    const vfFile = path.join(WORK, 'final.vf');
    fs.writeFileSync(vfFile, overlay.length ? overlay.join(',\n') : 'null');
    const outFile = path.join(OUT_DIR, `hunker-bunker-${NAME}.mp4`);
    log('final encode');
    sh('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', body, '-i', mix,
        '-filter_script:v', vfFile,
        '-map', '0:v', '-map', '1:a', '-t', edl.duration.toFixed(5),
        '-c:v', 'libx264', '-profile:v', 'high', '-preset', DRAFT ? 'veryfast' : 'slow', '-b:v', '40M', '-maxrate', '50M', '-bufsize', '80M',
        '-pix_fmt', 'yuv420p', '-r', String(edl.fps), '-g', String(edl.fps), '-movflags', '+faststart',
        '-c:a', 'aac', '-b:a', '320k', '-ar', String(SR), '-ac', '2', outFile]);

    // Review aids: muted first 10 s (how Steam autoplays it) and a 1 fps sheet.
    const muted = path.join(OUT_DIR, `hunker-bunker-${NAME}.muted-first-10s.mp4`);
    sh('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', outFile, '-t', '10', '-an', '-c:v', 'copy', muted]);
    const sheet = path.join(OUT_DIR, `hunker-bunker-${NAME}.sheet.jpg`);
    const cols = 10;
    const rows = Math.ceil(edl.duration / cols);
    sh('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', outFile, '-vf', `fps=1,scale=384:-1,tile=${cols}x${rows}`, '-frames:v', '1', '-q:v', '4', sheet]);

    // Stills for the Steam movie thumbnail and social posts: "thumbnails": [{ "at": <time>, "name": "..." }].
    for (const thumb of edl.thumbnails ?? []) {
        const still = path.join(OUT_DIR, `hunker-bunker-${NAME}.thumb-${thumb.name}.png`);
        sh('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', T(thumb.at).toFixed(4), '-i', outFile, '-frames:v', '1', still]);
    }

    const result = qa(outFile, edl, T);
    const cutFile = path.join(OUT_DIR, `hunker-bunker-${NAME}.cutlist.json`);
    fs.writeFileSync(cutFile, JSON.stringify({ name: NAME, builtAt: new Date().toISOString(), draft: DRAFT, duration: edl.duration, grid: ctx.grid ? { bpm: ctx.grid.bpm, dropAt: ctx.grid.dropAt } : null, sound: report, loudnorm: loud, qa: result, cut }, null, 1));
    log(`QA ${result.pass ? 'PASS' : 'FAIL'}`, JSON.stringify(result.checks));
    if (result.unexpectedBlack.length) log('unexpected black:', JSON.stringify(result.unexpectedBlack));
    log(`wrote ${path.relative(ROOT, outFile)} (${result.bitrateMbps} Mbps, ${result.integratedLufs} LUFS, TP ${result.truePeakDb} dB)`);
    if (!result.pass && !DRAFT) process.exitCode = 1;
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
