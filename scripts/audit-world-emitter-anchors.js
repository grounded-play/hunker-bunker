#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { getWorldEmitterProfile } from '../src/worldEmitters.js';

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const EMITTER_ASSET_CANDIDATES = Object.freeze([
    { type: 'prop_pipe_rupture', asset: 'public/3d/runtime/new3ds/prop_pipe_rupture.glb' },
    { type: 'geo_steam_manifold_actuator', asset: 'public/3d/runtime/new3ds/geo_steam_manifold_actuator.glb' },
    { type: 'decon_exosuit_scrubber_station', asset: 'public/3d/runtime/new3ds/decon_exosuit_scrubber_station.glb' },
    { type: 'prop_coolant_drum_leaking_pool', asset: 'public/3d/runtime/new3ds/prop_coolant_drum_leaking_pool.glb' },
    { type: 'fungal_spore_vent', asset: 'public/3d/runtime/new3ds/fungal_spore_vent.glb' }
]);

export function glbNodeNames(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 20 || buffer.readUInt32LE(0) !== GLB_MAGIC) return [];
    let offset = 12;
    while (offset + 8 <= buffer.length) {
        const length = buffer.readUInt32LE(offset);
        const type = buffer.readUInt32LE(offset + 4);
        const start = offset + 8;
        const end = start + length;
        if (end > buffer.length) return [];
        if (type === JSON_CHUNK) {
            const json = JSON.parse(buffer.subarray(start, end).toString('utf8').replace(/\0+$/g, '').trim());
            return (json.nodes ?? []).map((node) => String(node?.name ?? '')).filter(Boolean);
        }
        offset = end;
    }
    return [];
}

export function auditEmitterAsset(candidate, { readFile = fs.readFileSync } = {}) {
    const profile = getWorldEmitterProfile(candidate.type);
    const absolute = path.resolve(root, candidate.asset);
    if (!profile) return { ...candidate, status: 'missing-profile', anchors: [], fallback: false };
    if (!fs.existsSync(absolute)) return { ...candidate, status: 'missing-asset', anchors: [], fallback: false };
    const names = glbNodeNames(readFile(absolute));
    const anchors = names.filter((name) => /^FX_(?:EMITTER|STEAM|SPORES|WATER|BUBBLE)/.test(name));
    const expected = profile.source.anchor ?? 'FX_EMITTER_00';
    const authored = anchors.includes(expected) || anchors.includes('FX_STEAM_00') || anchors.includes('FX_SPORES_00');
    const fallback = Array.isArray(profile.source.fallbackDirection) && profile.source.fallbackDirection.length === 3;
    return {
        ...candidate,
        expected,
        anchors,
        fallback,
        status: authored ? 'authored' : fallback ? 'fallback' : 'unsafe'
    };
}

export function auditWorldEmitterAnchors(candidates = EMITTER_ASSET_CANDIDATES) {
    return candidates.map((candidate) => auditEmitterAsset(candidate));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    const results = auditWorldEmitterAnchors();
    if (process.argv.includes('--json')) {
        process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
    } else {
        console.log('World emitter outlet audit');
        for (const result of results) {
            const detail = result.anchors.length ? result.anchors.join(', ') : 'no authored outlet';
            console.log(`- ${result.type}: ${result.status} (${detail}; ${result.asset})`);
        }
    }
    const unsafe = results.filter((result) => ['missing-profile', 'missing-asset', 'unsafe'].includes(result.status));
    const missingAuthored = results.filter((result) => result.status !== 'authored');
    if (unsafe.length || (process.argv.includes('--strict') && missingAuthored.length)) process.exitCode = 1;
}
