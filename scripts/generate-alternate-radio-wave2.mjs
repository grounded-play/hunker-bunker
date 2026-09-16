#!/usr/bin/env node
/* global console, fetch */

import { execFileSync } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..');
const SCRIPT_PATH = resolve(ROOT, 'docs/planning/alternate-radio-wave-2-recording-script-2026-09-15.md');
const SOURCE_DIR = resolve(ROOT, 'art/source/audio/vo/elevenlabs-wave2');
const GAME_DIR = resolve(ROOT, 'public/audio/generated');
const API_BASE = 'https://api.elevenlabs.io';
const VOICES = Object.freeze({
    commander: { id: 'pNInz6obpgDQGcFmaJgB', direction: '[Russian accent, clipped, restrained] ' },
    aura: { id: 'EXAVITQu4vr4xnSDxMaL', direction: '[calm, precise, smooth authority] ' }
});

function cleanCell(value) {
    return value.trim().replaceAll('**', '').replaceAll('`', '');
}

export function parseRecordingJobs(markdown) {
    const jobs = [];
    for (const line of markdown.split(/\r?\n/)) {
        if (!/^\|\s*`[a-z0-9_]+`\s*\|/.test(line)) continue;
        const cells = line.split('|').slice(1, -1).map(cleanCell);
        if (cells.length < 4) continue;
        const cue = cells[0];
        for (const [bank, text] of [['commander', cells[2]], ['aura', cells[3]]]) {
            if (!text || /^Already delivered:/i.test(text)) continue;
            for (const take of [1, 2]) {
                const baseKey = `voice_${bank}_${cue}`;
                jobs.push({
                    bank,
                    cue,
                    take,
                    text,
                    prompt: `${VOICES[bank].direction}${text}`,
                    voiceId: VOICES[bank].id,
                    outputKey: `${baseKey}${take === 1 ? '' : '2'}`,
                    sourceKey: `${baseKey}_take_${String(take).padStart(2, '0')}`
                });
            }
        }
    }
    return jobs;
}

function readDotEnv() {
    const envPath = resolve(ROOT, '.env');
    if (!existsSync(envPath)) return new Map();
    const values = new Map();
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
        if (!match) continue;
        values.set(match[1].toLowerCase(), match[2].trim().replace(/^(['"])(.*)\1$/, '$2'));
    }
    return values;
}

function apiKeys() {
    const env = readDotEnv();
    const keys = ['11_labs_2', '11_labs_3', '11_labs_4', '11_labs_5']
        .map((name) => env.get(name))
        .filter(Boolean);
    if (process.env.ELEVENLABS_API_KEY) keys.push(process.env.ELEVENLABS_API_KEY);
    return [...new Set(keys)];
}

async function apiError(response) {
    const body = await response.text();
    try {
        const parsed = JSON.parse(body);
        return parsed?.detail?.message || parsed?.detail?.status || parsed?.message || `HTTP ${response.status}`;
    } catch {
        return `HTTP ${response.status}`;
    }
}

function processForGame(source, destination, bank) {
    mkdirSync(dirname(destination), { recursive: true });
    const tone = bank === 'commander'
        ? 'highpass=f=180,lowpass=f=5200,acompressor=threshold=-18dB:ratio=2.5:attack=8:release=90'
        : 'highpass=f=120,lowpass=f=6800,acompressor=threshold=-20dB:ratio=2:attack=6:release=100';
    execFileSync('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-y', '-i', source,
        '-af', `${tone},loudnorm=I=-16:TP=-1.5:LRA=7,afade=t=in:st=0:d=0.03,apad=pad_dur=0.18`,
        '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', destination
    ]);
}

async function synthesize(job, keys, startIndex) {
    let lastError = 'No usable API key';
    for (let offset = 0; offset < keys.length; offset += 1) {
        const keyIndex = (startIndex + offset) % keys.length;
        const response = await fetch(`${API_BASE}/v1/text-to-speech/${job.voiceId}?output_format=mp3_44100_128`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'xi-api-key': keys[keyIndex] },
            body: JSON.stringify({
                text: job.prompt,
                model_id: 'eleven_v3',
                seed: 41000 + job.cue.length * 31 + job.take * 997 + (job.bank === 'aura' ? 17 : 0),
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.78,
                    style: 0.2,
                    use_speaker_boost: true,
                    speed: job.take === 1 ? 1.04 : 0.98
                }
            })
        });
        if (response.ok) return { audio: Buffer.from(await response.arrayBuffer()), keyIndex };
        lastError = await apiError(response);
        if (![401, 402, 429].includes(response.status)) throw new Error(`${job.outputKey}: ${lastError}`);
        console.warn(`key ${keyIndex + 1} unavailable; rotating (${response.status})`);
    }
    throw new Error(`${job.outputKey}: ${lastError}`);
}

export async function main(argv = process.argv.slice(2)) {
    const planOnly = argv.includes('--plan');
    const force = argv.includes('--force');
    const jobs = parseRecordingJobs(readFileSync(SCRIPT_PATH, 'utf8'));
    const pending = force ? jobs : jobs.filter((job) => !existsSync(resolve(GAME_DIR, `${job.outputKey}.wav`)));
    const promptCharacters = pending.reduce((total, job) => total + job.prompt.length, 0);
    console.log(`Wave 2 plan: ${pending.length}/${jobs.length} clips, ${promptCharacters} submitted characters${force ? ' (overwrite enabled)' : ''}`);
    if (planOnly) return;

    const keys = apiKeys();
    if (!keys.length) throw new Error('Missing ElevenLabs key: set 11_Labs_2 (or later) in .env or ELEVENLABS_API_KEY.');
    mkdirSync(SOURCE_DIR, { recursive: true });
    mkdirSync(GAME_DIR, { recursive: true });

    let activeKey = 0;
    let generated = 0;
    for (const job of pending) {
        const source = resolve(SOURCE_DIR, `${job.sourceKey}.mp3`);
        const destination = resolve(GAME_DIR, `${job.outputKey}.wav`);
        const result = await synthesize(job, keys, activeKey);
        activeKey = result.keyIndex;
        writeFileSync(source, result.audio);
        processForGame(source, destination, job.bank);
        generated += 1;
        console.log(`[${generated}/${pending.length}] ${job.outputKey}`);
    }
    console.log(`complete: ${generated} clips generated with ${keys.length} configured key(s)`);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath || fileURLToPath(import.meta.url) === process.argv[1]) {
    main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
