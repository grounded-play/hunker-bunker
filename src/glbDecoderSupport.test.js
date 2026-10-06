import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Every runtime GLTFLoader in the game registers the meshopt decoder and
// nothing else (no DRACOLoader, no KTX2Loader, and no decoder files ship in
// public/). A GLB that requires another compression extension cannot load:
// the 80 kit pieces were Draco-compressed and failed with "No DRACOLoader
// instance provided" everywhere, found by the museum QA pass 2026-10-01.
const SUPPORTED_REQUIRED = new Set([
    'EXT_meshopt_compression',
    'KHR_mesh_quantization',
    'KHR_texture_transform',
    'KHR_materials_emissive_strength',
    'EXT_texture_webp'
]);

function glbs(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...glbs(full));
        else if (full.endsWith('.glb')) out.push(full);
    }
    return out;
}

function requiredExtensions(file) {
    const buf = fs.readFileSync(file);
    const jsonLength = buf.readUInt32LE(12);
    const json = JSON.parse(buf.subarray(20, 20 + jsonLength).toString('utf8'));
    return json.extensionsRequired ?? [];
}

describe('GLB decoder support', () => {
    it('ships no GLB that needs a decoder the game does not register', () => {
        const unsupported = [];
        for (const file of glbs('public/3d')) {
            const missing = requiredExtensions(file).filter((ext) => !SUPPORTED_REQUIRED.has(ext));
            if (missing.length) unsupported.push(`${path.relative('public', file)}: ${missing.join(', ')}`);
        }
        expect(unsupported).toEqual([]);
    });
});
