#!/usr/bin/env node
// Beat grid for a trailer music track (docs/planning/trailer-v4-capture-edit-and-sound-plan-2026-10-14.md §6.2).
//
//   node scripts/trailer/beat-grid.js "public/audio/ost/Under Siege (Combat Alert).mp3" [--out trailer/edl/under-siege.grid.json]
//
// No librosa/aubio on the box, so it is done here:
//   1. ffmpeg decodes mono 22.05 kHz float PCM;
//   2. spectral-flux onset envelope (1024-point FFT, 256 hop, log magnitude);
//   3. tempo from the onset autocorrelation (60-200 BPM), then refined to
//      0.01 BPM by scoring the whole grid against the envelope;
//   4. the drop = largest rise of short-window RMS (0.2 s after vs 1 s before);
//   5. the grid is phased so a beat lands on the drop, which is a downbeat;
//      bars of 4 count from there.
// Prints BPM and drop time for a listen check; writes the grid JSON.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SR = 22050;
const N = 1024;
const HOP = 256;

export function decodeMono(file, sr = SR) {
    const raw = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
    return new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 4));
}

function fftMag(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i += 1) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
            [re[i], re[j]] = [re[j], re[i]];
            [im[i], im[j]] = [im[j], im[i]];
        }
    }
    for (let len = 2; len <= n; len <<= 1) {
        const ang = -2 * Math.PI / len;
        const wr = Math.cos(ang);
        const wi = Math.sin(ang);
        for (let i = 0; i < n; i += len) {
            let cr = 1;
            let ci = 0;
            for (let k = 0; k < len / 2; k += 1) {
                const ar = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
                const ai = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
                re[i + k + len / 2] = re[i + k] - ar;
                im[i + k + len / 2] = im[i + k] - ai;
                re[i + k] += ar;
                im[i + k] += ai;
                const ncr = cr * wr - ci * wi;
                ci = cr * wi + ci * wr;
                cr = ncr;
            }
        }
    }
    const mag = new Float32Array(n / 2);
    for (let k = 0; k < n / 2; k += 1) mag[k] = Math.hypot(re[k], im[k]);
    return mag;
}

export function onsetEnvelope(samples) {
    const frames = Math.floor((samples.length - N) / HOP);
    const env = new Float32Array(frames);
    const window = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
    let prev = null;
    const re = new Float64Array(N);
    const im = new Float64Array(N);
    for (let f = 0; f < frames; f += 1) {
        for (let i = 0; i < N; i += 1) {
            re[i] = samples[f * HOP + i] * window[i];
            im[i] = 0;
        }
        const mag = fftMag(re, im);
        const log = mag.map((m) => Math.log1p(100 * m));
        if (prev) {
            let flux = 0;
            for (let k = 1; k < log.length; k += 1) flux += Math.max(0, log[k] - prev[k]);
            env[f] = flux;
        }
        prev = log;
    }
    // Remove the slow trend (local mean over ~0.5 s) and half-wave rectify.
    const w = Math.round(0.5 * SR / HOP);
    const out = new Float32Array(frames);
    let acc = 0;
    for (let f = 0; f < frames; f += 1) {
        acc += env[f];
        if (f >= w) acc -= env[f - w];
        out[f] = Math.max(0, env[f] - acc / Math.min(f + 1, w));
    }
    return out;
}

export function rmsDb(samples, sr = SR, win = 0.05) {
    const size = Math.round(sr * win);
    const out = [];
    for (let i = 0; i + size <= samples.length; i += size) {
        let s = 0;
        for (let j = i; j < i + size; j += 1) s += samples[j] * samples[j];
        out.push(10 * Math.log10(s / size + 1e-12));
    }
    return out;
}

export function findDrop(db, win = 0.05) {
    const before = Math.round(1 / win);
    const after = Math.round(0.2 / win);
    let best = { t: 0, rise: -Infinity };
    for (let i = before; i + after < db.length; i += 1) {
        let a = 0;
        let b = 0;
        for (let j = i - before; j < i; j += 1) a += db[j];
        for (let j = i; j < i + after; j += 1) b += db[j];
        const rise = b / after - a / before;
        if (rise > best.rise) best = { t: i * win, rise };
    }
    // Sharpen to the first 50 ms window that clears half the jump.
    const i0 = Math.round(best.t / win);
    const floor = db.slice(i0 - before, i0).reduce((s, v) => s + v, 0) / before;
    for (let i = i0 - 4; i <= i0 + 4; i += 1) {
        if (db[i] > floor + best.rise / 2) return { t: Math.round(i * win * 1000) / 1000, riseDb: Math.round(best.rise * 10) / 10 };
    }
    return { t: best.t, riseDb: Math.round(best.rise * 10) / 10 };
}

// Mean onset strength sampled on a grid of `period` seconds through `anchor`.
function gridScore(env, period, anchor, from, to) {
    const fps = SR / HOP;
    let score = 0;
    let count = 0;
    const k0 = Math.ceil((from - anchor) / period);
    const k1 = Math.floor((to - anchor) / period);
    for (let k = k0; k <= k1; k += 1) {
        const f = (anchor + k * period) * fps;
        const i = Math.floor(f);
        if (i < 1 || i + 1 >= env.length) continue;
        // Best of +/-1 hop absorbs the hop quantisation.
        score += Math.max(env[i - 1], env[i], env[i + 1]);
        count += 1;
    }
    return count ? score / count : 0;
}

export function analyse(file) {
    const samples = decodeMono(file);
    const duration = samples.length / SR;
    const env = onsetEnvelope(samples);
    const fps = SR / HOP;
    const drop = findDrop(rmsDb(samples));
    // Tempo candidates from autocorrelation over the whole track.
    const minLag = Math.floor(fps * 60 / 200);
    const maxLag = Math.ceil(fps * 60 / 60);
    const ac = [];
    for (let lag = minLag; lag <= maxLag; lag += 1) {
        let s = 0;
        for (let i = 0; i + lag < env.length; i += 1) s += env[i] * env[i + lag];
        ac.push({ lag, bpm: 60 * fps / lag, s });
    }
    const peaks = ac.filter((p, i) => i > 0 && i < ac.length - 1 && p.s > ac[i - 1].s && p.s > ac[i + 1].s)
        .sort((a, b) => b.s - a.s).slice(0, 6);
    // Refine each candidate on the grid through the drop over the loud part
    // after it (the grid has to hold where the trailer cuts).
    const from = Math.max(0, drop.t - 40);
    const to = Math.min(duration, drop.t + 60);
    const refined = peaks.map((p) => {
        let best = { bpm: p.bpm, score: -1 };
        for (let bpm = p.bpm - 1.5; bpm <= p.bpm + 1.5; bpm += 0.01) {
            const score = gridScore(env, 60 / bpm, drop.t, from, to);
            if (score > best.score) best = { bpm, score };
        }
        return { coarse: Math.round(p.bpm * 100) / 100, bpm: Math.round(best.bpm * 100) / 100, score: Math.round(best.score * 1000) / 1000 };
    }).sort((a, b) => b.score - a.score);
    // Prefer a tempo in the 80-160 band unless another is clearly stronger.
    let pick = refined[0];
    const inBand = refined.find((r) => r.bpm >= 80 && r.bpm <= 160);
    if (inBand && inBand.score > pick.score * 0.85) pick = inBand;
    // Fine phase: nudge the anchor +/-40 ms around the drop.
    const period = 60 / pick.bpm;
    let anchor = drop.t;
    let bestPhase = -1;
    for (let d = -0.04; d <= 0.04; d += 0.002) {
        const score = gridScore(env, period, drop.t + d, from, to);
        if (score > bestPhase) { bestPhase = score; anchor = drop.t + d; }
    }
    anchor = Math.round(anchor * 1000) / 1000;
    const beats = [];
    for (let k = Math.ceil(-anchor / period); anchor + k * period < duration; k += 1) {
        beats.push(Math.round((anchor + k * period) * 1000) / 1000);
    }
    const dropIndex = beats.findIndex((b) => Math.abs(b - anchor) < 1e-6);
    const downbeats = beats.filter((_, i) => (i - dropIndex) % 4 === 0);
    return {
        file,
        duration: Math.round(duration * 1000) / 1000,
        bpm: pick.bpm,
        period: Math.round(period * 100000) / 100000,
        drop: { t: anchor, rmsT: drop.t, riseDb: drop.riseDb, beatIndex: dropIndex },
        candidates: refined,
        beats,
        downbeats
    };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    const file = args.find((a) => !a.startsWith('--'));
    if (!file) {
        console.error('usage: beat-grid.js <audio file> [--out grid.json]');
        process.exit(2);
    }
    const outIndex = args.indexOf('--out');
    const out = outIndex >= 0 ? args[outIndex + 1]
        : path.join('trailer/edl', `${path.basename(file).replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.grid.json`);
    const grid = analyse(file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(grid, null, 1));
    console.log(`${path.basename(file)}: ${grid.bpm} BPM (period ${grid.period}s), drop at ${grid.drop.t}s (+${grid.drop.riseDb} dB, rms ${grid.drop.rmsT}s)`);
    console.log('tempo candidates:', grid.candidates.map((c) => `${c.bpm}(${c.score})`).join(' '));
    console.log(`wrote ${out}`);
}
