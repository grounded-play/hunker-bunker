#!/usr/bin/env node
/* global console, fetch */

import { execFileSync } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_DIR = resolve(ROOT, 'art/source/audio/vo/elevenlabs-wave2');
const GAME_DIR = resolve(ROOT, 'public/audio/generated');
const API_BASE = 'https://api.elevenlabs.io';

// These are deliberately ordered to spend a small quota on broad semantic
// coverage before creating alternate takes of a cue that already works.
const JOBS = Object.freeze([
    { key: 'voice_commander_shield_critical', voiceId: 'pNInz6obpgDQGcFmaJgB', text: 'Shield failing. Take cover.', bank: 'commander' },
    { key: 'voice_aura_low_health', voiceId: 'EXAVITQu4vr4xnSDxMaL', text: 'Operator vitals critical.', bank: 'aura' },
    { key: 'voice_commander_target_down', voiceId: 'pNInz6obpgDQGcFmaJgB', text: 'Heavy target destroyed.', bank: 'commander' },
    { key: 'voice_aura_killstreak', voiceId: 'EXAVITQu4vr4xnSDxMaL', text: 'Combat efficiency rising.', bank: 'aura' },
    { key: 'voice_commander_overdrive_ready', voiceId: 'pNInz6obpgDQGcFmaJgB', text: 'Overdrive charged. Move.', bank: 'commander' },
    { key: 'voice_aura_breached', voiceId: 'EXAVITQu4vr4xnSDxMaL', text: 'Structural breach confirmed.', bank: 'aura' },
    { key: 'voice_commander_sector_cleared', voiceId: 'pNInz6obpgDQGcFmaJgB', text: 'Sector secure. Return to ship.', bank: 'commander' },
    { key: 'voice_aura_victory', voiceId: 'EXAVITQu4vr4xnSDxMaL', text: 'Extraction confirmed. Mission complete.', bank: 'aura' }
]);

function envValue(name) {
    const envPath = resolve(ROOT, '.env');
    if (!existsSync(envPath)) return '';
    const source = readFileSync(envPath, 'utf8');
    const line = source.split(/\r?\n/).find((candidate) => candidate.trimStart().startsWith(`${name}=`));
    if (!line) return '';
    return line.slice(line.indexOf('=') + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
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

function processForGame(source, destination) {
    mkdirSync(dirname(destination), { recursive: true });
    execFileSync('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-y', '-i', source,
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7,afade=t=in:st=0:d=0.03,apad=pad_dur=0.18',
        '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', destination
    ]);
}

async function main() {
    const apiKey = envValue('11_Labs') || process.env.ELEVENLABS_API_KEY || '';
    if (!apiKey) throw new Error('Missing ElevenLabs key: set 11_Labs in .env or ELEVENLABS_API_KEY.');
    mkdirSync(SOURCE_DIR, { recursive: true });
    mkdirSync(GAME_DIR, { recursive: true });

    let generated = 0;
    let characters = 0;
    for (const job of JOBS) {
        const source = resolve(SOURCE_DIR, `${job.key}_take_01.mp3`);
        const destination = resolve(GAME_DIR, `${job.key}.wav`);
        if (existsSync(destination)) {
            console.log(`skip ${job.key} (game asset already exists)`);
            continue;
        }

        const response = await fetch(`${API_BASE}/v1/text-to-speech/${job.voiceId}?output_format=mp3_44100_128`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'xi-api-key': apiKey },
            body: JSON.stringify({
                text: job.text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: job.bank === 'commander'
                    ? { stability: 0.62, similarity_boost: 0.78, style: 0.28, use_speaker_boost: true, speed: 1.08 }
                    : { stability: 0.75, similarity_boost: 0.8, style: 0.1, use_speaker_boost: true, speed: 1.04 }
            })
        });
        if (!response.ok) {
            const message = await apiError(response);
            if (response.status === 401 || response.status === 402 || response.status === 429) {
                console.warn(`stopped at ${job.key}: ${message}`);
                break;
            }
            throw new Error(`${job.key}: ${message}`);
        }

        writeFileSync(source, Buffer.from(await response.arrayBuffer()));
        processForGame(source, destination);
        generated += 1;
        characters += job.text.length;
        console.log(`generated ${job.key} (${job.text.length} characters)`);
    }
    console.log(`complete: ${generated} clips generated, ${characters} characters submitted`);
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
