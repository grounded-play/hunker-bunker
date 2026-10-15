#!/usr/bin/env node
// Trailer FX kit (docs/planning/trailer-v4-capture-edit-and-sound-plan-2026-10-14.md §6.3).
//
//   node scripts/trailer/sfx-kit.js [--out trailer/sfx]
//
// Synthesised here, sample by sample, so the kit is ours, license-free and
// bit-identical on every run (seeded noise, no wall-clock input). 48 kHz
// stereo float WAV. The music-dependent effects (tape stop, glitch stutter)
// are built per use by the assembler, not here.
import fs from 'node:fs';
import path from 'node:path';

const SR = 48000;

function rng(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296 * 2 - 1;
    };
}

const buf = (seconds) => [new Float32Array(Math.round(seconds * SR)), new Float32Array(Math.round(seconds * SR))];

// RBJ biquad with per-sample parameters.
function biquad(type) {
    let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0;
    return (x, freq, q = 0.707) => {
        const w = 2 * Math.PI * Math.min(freq, SR * 0.45) / SR;
        const cos = Math.cos(w);
        const alpha = Math.sin(w) / (2 * q);
        let b0; let b1; let b2;
        if (type === 'lp') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2; }
        else if (type === 'hp') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; }
        else { b0 = alpha; b1 = 0; b2 = -alpha; }
        const a0 = 1 + alpha;
        const a1 = -2 * cos;
        const a2 = 1 - alpha;
        const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
        x2 = x1; x1 = x; y2 = y1; y1 = y;
        return y;
    };
}

// Small Schroeder hall: 4 combs + 2 allpasses per channel, decorrelated.
function reverb([l, r], { mix = 0.3, decay = 0.82, pre = 0.02 } = {}) {
    const out = [new Float32Array(l.length), new Float32Array(r.length)];
    [[l, out[0], 0], [r, out[1], 37]].forEach(([input, output, spread]) => {
        const combs = [1557, 1617, 1491, 1422].map((d) => ({ d: d + spread, b: new Float32Array(d + spread), i: 0, lp: 0 }));
        const aps = [225, 556].map((d) => ({ d: d + spread, b: new Float32Array(d + spread), i: 0 }));
        const preN = Math.round(pre * SR);
        for (let n = 0; n < input.length; n += 1) {
            const x = n >= preN ? input[n - preN] : 0;
            let y = 0;
            for (const c of combs) {
                const v = c.b[c.i];
                c.lp = v * 0.7 + c.lp * 0.3;
                c.b[c.i] = x + c.lp * decay;
                c.i = (c.i + 1) % c.d;
                y += v;
            }
            y *= 0.25;
            for (const a of aps) {
                const v = a.b[a.i];
                const w = y + v * 0.5;
                a.b[a.i] = w;
                a.i = (a.i + 1) % a.d;
                y = v - w * 0.5;
            }
            output[n] = input[n] * (1 - mix) + y * mix;
        }
    });
    return out;
}

function normalize([l, r], peakDb = -1) {
    let peak = 0;
    for (let i = 0; i < l.length; i += 1) peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
    const gain = peak > 0 ? 10 ** (peakDb / 20) / peak : 1;
    for (let i = 0; i < l.length; i += 1) { l[i] *= gain; r[i] *= gain; }
    return [l, r];
}

function fadeEdges([l, r], inS = 0.002, outS = 0.01) {
    const a = Math.round(inS * SR);
    const b = Math.round(outS * SR);
    for (let i = 0; i < a && i < l.length; i += 1) { l[i] *= i / a; r[i] *= i / a; }
    for (let i = 0; i < b && i < l.length; i += 1) { const k = l.length - 1 - i; l[k] *= i / b; r[k] *= i / b; }
    return [l, r];
}

const mixInto = (dst, src, gain = 1, at = 0) => {
    const off = Math.round(at * SR);
    for (let c = 0; c < 2; c += 1) {
        for (let i = 0; i < src[c].length && i + off < dst[c].length; i += 1) dst[c][i + off] += src[c][i] * gain;
    }
    return dst;
};

function writeWav(file, [l, r]) {
    const n = l.length;
    const data = Buffer.alloc(n * 8);
    for (let i = 0; i < n; i += 1) {
        data.writeFloatLE(l[i], i * 8);
        data.writeFloatLE(r[i], i * 8 + 4);
    }
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + data.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(3, 20); // IEEE float
    header.writeUInt16LE(2, 22);
    header.writeUInt32LE(SR, 24);
    header.writeUInt32LE(SR * 8, 28);
    header.writeUInt16LE(8, 32);
    header.writeUInt16LE(32, 34);
    header.write('data', 36);
    header.writeUInt32LE(data.length, 40);
    fs.writeFileSync(file, Buffer.concat([header, data]));
}

// ---- the kit ---------------------------------------------------------------

function whoosh(seconds, seed) {
    const out = buf(seconds);
    const noise = rng(seed);
    const bp = [biquad('bp'), biquad('bp')];
    const n = out[0].length;
    for (let i = 0; i < n; i += 1) {
        const p = i / n;
        // Bell envelope peaking at 60%, centre sweeping 250 -> 3.2 kHz -> 900 Hz.
        const env = p < 0.6 ? Math.sin(Math.PI / 2 * p / 0.6) ** 2 : Math.cos(Math.PI / 2 * (p - 0.6) / 0.4) ** 2;
        const fc = p < 0.6 ? 250 * (3200 / 250) ** (p / 0.6) : 3200 * (900 / 3200) ** ((p - 0.6) / 0.4);
        const x = noise();
        const pan = -0.8 + 1.6 * p;
        out[0][i] = bp[0](x, fc, 1.6) * env * (1 - pan) * 0.5;
        out[1][i] = bp[1](x, fc * 1.03, 1.6) * env * (1 + pan) * 0.5;
    }
    return normalize(fadeEdges(reverb(out, { mix: 0.18, decay: 0.7 })), -3);
}

function riser(seconds, seed) {
    const out = buf(seconds);
    const noise = rng(seed);
    const hp = [biquad('hp'), biquad('hp')];
    const lp = [biquad('lp'), biquad('lp')];
    const n = out[0].length;
    const phases = [0, 0, 0, 0];
    const detune = [1, 1.006, 0.994, 2.003];
    for (let i = 0; i < n; i += 1) {
        const p = i / n;
        const f0 = 70 * 2 ** (p * 2); // two octaves up
        let saw = 0;
        detune.forEach((d, k) => {
            phases[k] = (phases[k] + f0 * d / SR) % 1;
            saw += (phases[k] * 2 - 1) * (k === 3 ? 0.4 : 1);
        });
        const env = p ** 2.2;
        const cutoff = 300 + 7000 * p ** 1.6;
        const nz = noise();
        for (let c = 0; c < 2; c += 1) {
            const tone = lp[c](saw * 0.25, cutoff, 0.9);
            const air = hp[c](nz, 400 + 9000 * p ** 1.3, 0.8) * 0.6;
            out[c][i] = (tone + air) * env;
        }
    }
    // Hard stop at the end (the cut lands on silence); 4 ms declick only.
    return normalize(fadeEdges(reverb(out, { mix: 0.22 }), 0.01, 0.004), -2);
}

function subHit(seconds = 1.2, { f0 = 58, f1 = 30, decay = 0.55, click = 0.5, seed = 7 } = {}) {
    const out = buf(seconds);
    const noise = rng(seed);
    let phase = 0;
    const n = out[0].length;
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const f = f1 + (f0 - f1) * Math.exp(-t / 0.12);
        phase += 2 * Math.PI * f / SR;
        const body = Math.sin(phase) * Math.exp(-t / decay);
        const c = t < 0.004 ? noise() * click * (1 - t / 0.004) : 0;
        const v = Math.tanh((body + c) * 1.6);
        out[0][i] = v;
        out[1][i] = v;
    }
    return normalize(fadeEdges(out, 0.0005, 0.05), -1);
}

function impactMetal(seed = 11) {
    const out = subHit(2.2, { f0: 70, decay: 0.45, click: 0.9, seed });
    const noise = rng(seed + 1);
    const partials = [180, 497, 972, 1610, 2380, 3305];
    const hp = [biquad('hp'), biquad('hp')];
    for (let i = 0; i < out[0].length; i += 1) {
        const t = i / SR;
        let ring = 0;
        partials.forEach((f, k) => { ring += Math.sin(2 * Math.PI * f * (1 + k * 0.0013) * t + k) * Math.exp(-t / (0.5 / (1 + k * 0.4))) / (k + 1); });
        const burst = noise() * Math.exp(-t / 0.03);
        out[0][i] += ring * 0.35 + hp[0](burst, 1500) * 0.6;
        out[1][i] += ring * 0.33 + hp[1](burst, 1500) * 0.6;
    }
    return normalize(fadeEdges(reverb(out, { mix: 0.28, decay: 0.84 })), -1);
}

function braam(seconds = 4) {
    const out = buf(seconds);
    const lp = [biquad('lp'), biquad('lp')];
    const freqs = [[55, 0.5], [55.4, 0.5], [82.4, 0.35], [110.2, 0.2], [27.5, 0.6]];
    const phases = freqs.map(() => 0);
    const n = out[0].length;
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        let v = 0;
        freqs.forEach(([f, g], k) => {
            phases[k] = (phases[k] + f / SR) % 1;
            v += (k === 4 ? Math.sin(phases[k] * 2 * Math.PI) : phases[k] * 2 - 1) * g;
        });
        // Brassy bloom: filter opens fast, closes slowly.
        const cutoff = 180 + 2400 * Math.min(1, t / 0.25) * Math.exp(-Math.max(0, t - 0.25) / 1.1);
        const env = Math.min(1, t / 0.04) * Math.exp(-Math.max(0, t - 0.6) / 1.4);
        out[0][i] = Math.tanh(lp[0](v, cutoff, 1.4) * 1.8) * env;
        out[1][i] = Math.tanh(lp[1](v, cutoff * 1.02, 1.4) * 1.8) * env;
    }
    return normalize(fadeEdges(reverb(out, { mix: 0.35, decay: 0.88, pre: 0.03 }), 0.002, 0.3), -1);
}

function reverseSwell(seconds = 1.6) {
    const hit = impactMetal(23);
    const wet = reverb(hit, { mix: 0.9, decay: 0.9 });
    const n = Math.round(seconds * SR);
    const out = buf(seconds);
    for (let c = 0; c < 2; c += 1) {
        for (let i = 0; i < n; i += 1) out[c][i] = wet[c][Math.min(wet[c].length - 1, n - 1 - i)] * (i / n) ** 1.5;
    }
    return normalize(fadeEdges(out, 0.01, 0.003), -2);
}

function heartbeat(beats = 4, bpm = 60) {
    const period = 60 / bpm;
    const out = buf(beats * period + 0.5);
    const thump = (amp, f) => subHit(0.35, { f0: f, f1: f * 0.7, decay: 0.08, click: 0.05 }).map((ch) => ch.map((v) => v * amp));
    for (let b = 0; b < beats; b += 1) {
        mixInto(out, thump(1, 62), 1, b * period);
        mixInto(out, thump(0.7, 54), 1, b * period + 0.22);
    }
    const lp = [biquad('lp'), biquad('lp')];
    for (let c = 0; c < 2; c += 1) for (let i = 0; i < out[c].length; i += 1) out[c][i] = lp[c](out[c][i], 160);
    return normalize(out, -2);
}

function textSlam() {
    const out = subHit(0.9, { f0: 90, f1: 38, decay: 0.25, click: 1 });
    const noise = rng(5);
    const hp = [biquad('hp'), biquad('hp')];
    for (let i = 0; i < Math.round(0.05 * SR); i += 1) {
        const t = i / SR;
        const tick = noise() * Math.exp(-t / 0.006);
        out[0][i] += hp[0](tick, 3000) * 0.8;
        out[1][i] += hp[1](tick, 3000) * 0.8;
    }
    return normalize(out, -1);
}

function typeTick(seed) {
    const out = buf(0.06);
    const noise = rng(seed);
    const bp = [biquad('bp'), biquad('bp')];
    for (let i = 0; i < out[0].length; i += 1) {
        const t = i / SR;
        const v = noise() * Math.exp(-t / 0.004);
        out[0][i] = bp[0](v, 2600 + seed * 40, 2);
        out[1][i] = bp[1](v, 2600 + seed * 40, 2);
    }
    return normalize(out, -6);
}

function glitchBurst(seconds = 0.25, seed = 31) {
    const out = buf(seconds);
    const noise = rng(seed);
    let hold = 0;
    let value = 0;
    for (let i = 0; i < out[0].length; i += 1) {
        if (hold-- <= 0) { hold = Math.floor(20 + (noise() + 1) * 300); value = noise(); }
        const gate = Math.floor(i / (SR * 0.02)) % 3 !== 1 ? 1 : 0;
        const v = (value * 0.6 + noise() * 0.15) * gate;
        out[0][i] = v;
        out[1][i] = -v * 0.9;
    }
    return normalize(fadeEdges(out, 0.001, 0.005), -6);
}

function drone(seconds = 8) {
    const out = buf(seconds);
    const noise = rng(41);
    const lp = [biquad('lp'), biquad('lp')];
    const n = out[0].length;
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const beat = Math.sin(2 * Math.PI * 0.21 * t);
        const v = Math.sin(2 * Math.PI * 41.2 * t) * 0.6 + Math.sin(2 * Math.PI * 41.7 * t + beat) * 0.5 + Math.sin(2 * Math.PI * 61.7 * t) * 0.2;
        const air = noise() * 0.08;
        const env = Math.min(1, t / 1.5) * Math.min(1, (seconds - t) / 1.5);
        out[0][i] = (v + lp[0](air, 300)) * env;
        out[1][i] = (v * 0.97 + lp[1](air, 320)) * env;
    }
    return normalize(reverb(out, { mix: 0.3 }), -4);
}

export const KIT = {
    whoosh_short: () => whoosh(0.55, 1),
    whoosh_long: () => whoosh(1.3, 2),
    whoosh_alt: () => whoosh(0.7, 3),
    riser_2s: () => riser(2, 4),
    riser_4s: () => riser(4, 5),
    riser_8s: () => riser(8, 6),
    sub_hit: () => subHit(),
    impact_metal: () => impactMetal(),
    braam: () => braam(),
    reverse_swell: () => reverseSwell(),
    heartbeat: () => heartbeat(4, 60),
    heartbeat_fast: () => heartbeat(6, 96),
    ui_text_slam: () => textSlam(),
    type_tick_1: () => typeTick(1),
    type_tick_2: () => typeTick(2),
    type_tick_3: () => typeTick(3),
    glitch_burst: () => glitchBurst(),
    drone_low: () => drone()
};

if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    const outIndex = args.indexOf('--out');
    const out = outIndex >= 0 ? args[outIndex + 1] : 'trailer/sfx';
    fs.mkdirSync(out, { recursive: true });
    for (const [name, make] of Object.entries(KIT)) {
        const file = path.join(out, `${name}.wav`);
        writeWav(file, make());
        console.log(`${file}`);
    }
}
