#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 44100;
const OUTPUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/audio/generated');

function seededNoise(seed) {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return (state / 0xffffffff) * 2 - 1;
    };
}

function envelope(t, duration, attack = 0.01, release = 0.15) {
    const up = Math.min(1, t / Math.max(attack, 0.0001));
    const down = Math.min(1, (duration - t) / Math.max(release, 0.0001));
    return Math.max(0, Math.min(up, down));
}

function pulse(t, start, length) {
    if (t < start || t >= start + length) return 0;
    const local = (t - start) / length;
    return Math.sin(Math.PI * local);
}

function sine(frequency, t, phase = 0) {
    return Math.sin((Math.PI * 2 * frequency * t) + phase);
}

export const PLAN_SFX = Object.freeze({
    camp_worker_alerted: {
        duration: 0.48,
        synth(t, noise) {
            const chirp = sine(760 + t * 980, t) * envelope(t, 0.48, 0.006, 0.18);
            return chirp * 0.5 + noise() * pulse(t, 0.02, 0.05) * 0.12;
        }
    },
    camp_worker_armed: {
        duration: 0.72,
        synth(t, noise) {
            const latch = pulse(t, 0.03, 0.06) + pulse(t, 0.18, 0.045) * 0.7;
            const warning = sine(145, t) * envelope(t, 0.72, 0.015, 0.28);
            return warning * 0.42 + noise() * latch * 0.3;
        }
    },
    camp_worker_panicked: {
        duration: 0.8,
        synth(t, noise) {
            const alarm = sine(520 + Math.sin(t * 34) * 110, t) * envelope(t, 0.8, 0.01, 0.2);
            return alarm * 0.38 + noise() * envelope(t, 0.8, 0.02, 0.35) * 0.12;
        }
    },
    camp_worker_fleeing: {
        duration: 0.9,
        synth(t, noise) {
            const steps = [0.02, 0.19, 0.38, 0.59].reduce((sum, start) => sum + pulse(t, start, 0.07), 0);
            const rush = noise() * envelope(t, 0.9, 0.03, 0.28) * (0.18 + t * 0.12);
            return rush + sine(92, t) * steps * 0.34;
        }
    },
    camp_worker_infected: {
        duration: 1.15,
        synth(t, noise) {
            const wobble = sine(58 + Math.sin(t * 7) * 9, t) * envelope(t, 1.15, 0.08, 0.38);
            const wet = noise() * (pulse(t, 0.18, 0.1) + pulse(t, 0.61, 0.14)) * 0.16;
            return wobble * 0.5 + wet;
        }
    },
    camp_verb_meridian: {
        duration: 0.86,
        synth(t, noise) {
            const bits = [0.02, 0.12, 0.2, 0.34, 0.47].reduce(
                (sum, start, index) => sum + sine(880 + index * 170, t) * pulse(t, start, 0.07),
                0
            );
            return bits * 0.22 + noise() * envelope(t, 0.86, 0.01, 0.3) * 0.05;
        }
    },
    camp_verb_tallow: {
        duration: 1.05,
        synth(t, noise) {
            const rise = sine(280 + t * 430, t) + sine(420 + t * 610, t) * 0.55;
            const organic = noise() * (pulse(t, 0.05, 0.12) + pulse(t, 0.25, 0.1)) * 0.12;
            return rise * envelope(t, 1.05, 0.05, 0.42) * 0.3 + organic;
        }
    },
    camp_verb_vesper: {
        duration: 0.92,
        synth(t, noise) {
            const metal = [0.03, 0.16, 0.31].reduce(
                (sum, start, index) => sum + sine(1800 + index * 620, t) * pulse(t, start, 0.045),
                0
            );
            const mechanism = noise() * (pulse(t, 0.08, 0.09) + pulse(t, 0.46, 0.12)) * 0.24;
            const lock = sine(118, t) * pulse(t, 0.6, 0.18) * 0.42;
            return metal * 0.2 + mechanism + lock;
        }
    },
    sfx_charm_clink_light: {
        duration: 0.28,
        synth(t, noise) {
            const metallic1 = sine(2400 + t * 400, t) * envelope(t, 0.28, 0.002, 0.12);
            const metallic2 = sine(3850, t) * envelope(t, 0.28, 0.001, 0.08) * 0.6;
            const tap = noise() * pulse(t, 0.001, 0.02) * 0.25;
            return (metallic1 + metallic2) * 0.45 + tap;
        }
    },
    sfx_charm_clink_heavy: {
        duration: 0.35,
        synth(t, noise) {
            const brass = sine(980 + Math.sin(t * 40) * 80, t) * envelope(t, 0.35, 0.005, 0.18);
            const ring = sine(1740, t) * envelope(t, 0.35, 0.002, 0.14) * 0.5;
            const clunk = noise() * pulse(t, 0.004, 0.04) * 0.35;
            return (brass + ring) * 0.5 + clunk;
        }
    },
    sfx_overclock_socket: {
        duration: 0.42,
        synth(t, noise) {
            const slide = noise() * pulse(t, 0.01, 0.08) * 0.22;
            const click = sine(1250, t) * pulse(t, 0.09, 0.03) * 0.6;
            const latch = sine(440, t) * envelope(t, 0.42, 0.1, 0.22) * 0.55;
            const sub = sine(110, t) * pulse(t, 0.12, 0.18) * 0.4;
            return slide + click + latch + sub;
        }
    },
    sfx_overclock_hum_cryo: {
        duration: 0.65,
        synth(t, noise) {
            const frostRise = sine(320 + t * 480, t) * envelope(t, 0.65, 0.05, 0.3);
            const shimmer = sine(1600 + Math.sin(t * 50) * 120, t) * envelope(t, 0.65, 0.02, 0.25) * 0.25;
            const air = noise() * envelope(t, 0.65, 0.08, 0.35) * 0.15;
            return frostRise * 0.4 + shimmer + air;
        }
    },
    sfx_overclock_hum_magnetic: {
        duration: 0.55,
        synth(t, noise) {
            const coil = sine(65 + Math.sin(t * 120) * 15, t) * envelope(t, 0.55, 0.04, 0.25);
            const arc = noise() * (pulse(t, 0.06, 0.05) + pulse(t, 0.22, 0.06)) * 0.2;
            const surge = sine(180, t) * pulse(t, 0.08, 0.22) * 0.35;
            return coil * 0.55 + arc + surge;
        }
    },
    sfx_smelt_forge_burst: {
        duration: 0.85,
        synth(t, noise) {
            const blast = noise() * envelope(t, 0.85, 0.01, 0.45) * 0.45;
            const heatDrone = sine(85 + t * 65, t) * envelope(t, 0.85, 0.06, 0.35) * 0.4;
            const anvil = sine(880, t) * pulse(t, 0.04, 0.15) * 0.35;
            return blast + heatDrone + anvil;
        }
    },
    sfx_trade_shard_dispense: {
        duration: 0.75,
        synth(t, noise) {
            const chime1 = sine(1046.5, t) * pulse(t, 0.02, 0.25) * 0.4; // C6
            const chime2 = sine(1318.5, t) * pulse(t, 0.12, 0.3) * 0.45; // E6
            const chime3 = sine(1567.98, t) * pulse(t, 0.24, 0.35) * 0.5; // G6
            const crystal = sine(2093, t) * pulse(t, 0.36, 0.35) * 0.35; // C7
            const mechan = noise() * pulse(t, 0.01, 0.05) * 0.15;
            return chime1 + chime2 + chime3 + crystal + mechan;
        }
    }
});

export function encodeMonoWav(samples, sampleRate = SAMPLE_RATE) {
    const buffer = Buffer.alloc(44 + samples.length * 2);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(buffer.length - 8, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(samples.length * 2, 40);
    samples.forEach((sample, index) => {
        const clamped = Math.max(-1, Math.min(1, sample));
        buffer.writeInt16LE(Math.round(clamped * 32767), 44 + index * 2);
    });
    return buffer;
}

export function renderPlanSfx(name, definition) {
    const sampleCount = Math.round(definition.duration * SAMPLE_RATE);
    const noise = seededNoise([...name].reduce((sum, char) => sum + char.charCodeAt(0), 0));
    const samples = Array.from({ length: sampleCount }, (_, index) => (
        definition.synth(index / SAMPLE_RATE, noise)
    ));
    return encodeMonoWav(samples);
}

export function generatePlanSfx({ outputDir = OUTPUT_DIR, check = false } = {}) {
    const results = [];
    if (!check) fs.mkdirSync(outputDir, { recursive: true });
    for (const [name, definition] of Object.entries(PLAN_SFX)) {
        const target = path.join(outputDir, `${name}.wav`);
        const rendered = renderPlanSfx(name, definition);
        let existing = null;
        try {
            existing = fs.readFileSync(target);
        } catch (err) {
            if (!err || err.code !== 'ENOENT') throw err;
        }
        const matches = Boolean(existing?.equals(rendered));
        results.push({ name, target, matches });
        if (!check && !matches) fs.writeFileSync(target, rendered);
    }
    return results;
}

function main() {
    const check = process.argv.includes('--check');
    const results = generatePlanSfx({ check });
    const stale = results.filter((result) => !result.matches);
    if (check && stale.length) {
        console.error(`[plan-sfx] missing or stale: ${stale.map((item) => item.name).join(', ')}`);
        process.exitCode = 1;
        return;
    }
    console.log(`[plan-sfx] ${check ? 'verified' : 'generated'} ${results.length} original WAV assets`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}

