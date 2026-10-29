#!/usr/bin/env node
/* global console, process */
// Runtime GLB budget gate (docs/planning/definitive-first-expedition-
// improvement-program-2026-10-27.md P0-B): no model reaches the game without
// its triangles, materials, textures and LODs measured against a budget.
//
// Reads only each file's glTF JSON chunk and the first bytes of each embedded
// image, so all ~700 runtime models audit in well under a second.
//
//   node scripts/audit-glb-budgets.mjs            report every model over budget
//   node scripts/audit-glb-budgets.mjs --write    re-baseline the accepted overages
//
// Models already over budget are listed in glb-budget-baseline.json and may
// not grow; a new model, or a baselined one that gets heavier, fails.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BASELINE_PATH = path.join(ROOT, 'scripts/glb-budget-baseline.json');

// Per model. A prop is one placed object; kit pieces repeat by the hundred.
// Measured 2026-10-28: the median prop is 25k triangles, 1-2 materials, 3
// textures at 1024 px. The engine has no LOD system yet (no THREE.LOD, no
// impostors), so authored LODs are not demanded: lodAboveTriangles stays off
// until something consumes them, and the triangle cap stands in.
export const GLB_BUDGETS = Object.freeze({
    default: Object.freeze({ triangles: 60000, materials: 8, textures: 12, maxTextureSize: 2048, lodAboveTriangles: Infinity }),
    kit: Object.freeze({ triangles: 12000, materials: 4, textures: 8, maxTextureSize: 2048, lodAboveTriangles: Infinity })
});

export function budgetFor(relativePath) {
    return relativePath.includes('/kits/') ? GLB_BUDGETS.kit : GLB_BUDGETS.default;
}

function readChunk(fd, position, length) {
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, position);
    return buffer;
}

function imageSize(bytes) {
    if (bytes.length >= 24 && bytes.readUInt32BE(0) === 0x89504e47) {
        return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    }
    // KTX2: «KTX 20» identifier, pixelWidth/pixelHeight at 20/24.
    if (bytes.length >= 28 && bytes[1] === 0x4b && bytes[2] === 0x54 && bytes[3] === 0x58 && bytes[5] === 0x32) {
        return { width: bytes.readUInt32LE(20), height: bytes.readUInt32LE(24) };
    }
    if (bytes.length >= 30 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
        const kind = bytes.toString('ascii', 12, 16);
        if (kind === 'VP8X') return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
        if (kind === 'VP8 ') return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
        if (kind === 'VP8L') {
            const bits = bytes.readUInt32LE(21);
            return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
        }
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
        for (let i = 2; i + 9 < bytes.length;) {
            if (bytes[i] !== 0xff) { i += 1; continue; }
            const marker = bytes[i + 1];
            const length = bytes.readUInt16BE(i + 2);
            if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
                return { width: bytes.readUInt16BE(i + 7), height: bytes.readUInt16BE(i + 5) };
            }
            i += 2 + length;
        }
    }
    return null;
}

/** Measure one GLB from its JSON chunk and image headers. */
export function measureGlb(file) {
    const fd = fs.openSync(file, 'r');
    try {
        const header = readChunk(fd, 0, 20);
        if (header.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
        const jsonLength = header.readUInt32LE(12);
        const json = JSON.parse(readChunk(fd, 20, jsonLength).toString('utf8'));
        const binStart = 20 + jsonLength + 8;
        // Triangles drawn: each node that uses a mesh draws it again.
        const meshUses = new Map();
        for (const node of json.nodes ?? []) {
            if (Number.isInteger(node.mesh)) meshUses.set(node.mesh, (meshUses.get(node.mesh) ?? 0) + 1);
        }
        let drawnTriangles = 0;
        (json.meshes ?? []).forEach((mesh, index) => {
            let meshTriangles = 0;
            for (const primitive of mesh.primitives ?? []) {
                if ((primitive.mode ?? 4) !== 4) continue;
                const accessor = json.accessors?.[primitive.indices ?? primitive.attributes?.POSITION];
                meshTriangles += Math.floor((accessor?.count ?? 0) / 3);
            }
            drawnTriangles += meshTriangles * Math.max(1, meshUses.get(index) ?? 0);
        });
        let maxTextureSize = 0;
        for (const image of json.images ?? []) {
            const view = json.bufferViews?.[image.bufferView];
            if (!view) continue;
            const size = imageSize(readChunk(fd, binStart + (view.byteOffset ?? 0), Math.min(view.byteLength, 4096)));
            if (size) maxTextureSize = Math.max(maxTextureSize, size.width, size.height);
        }
        const names = [...(json.nodes ?? []), ...(json.meshes ?? [])].map((entry) => String(entry.name ?? ''));
        return {
            triangles: drawnTriangles,
            materials: json.materials?.length ?? 0,
            textures: json.images?.length ?? 0,
            maxTextureSize,
            hasLod: names.some((name) => /(^|[_\-. ])LOD\d/i.test(name)) || Boolean(json.extensionsUsed?.includes('MSFT_lod'))
        };
    } finally {
        fs.closeSync(fd);
    }
}

/** Each budget a measured model breaks, as { key, value, limit }. */
export function budgetViolations(measure, budget) {
    const violations = [];
    for (const key of ['triangles', 'materials', 'textures', 'maxTextureSize']) {
        if (measure[key] > budget[key]) violations.push({ key, value: measure[key], limit: budget[key] });
    }
    if (measure.triangles > budget.lodAboveTriangles && !measure.hasLod) {
        violations.push({ key: 'lod', value: measure.triangles, limit: budget.lodAboveTriangles });
    }
    return violations;
}

export function listRuntimeGlbs(root = ROOT) {
    const out = [];
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith('.glb')) out.push(path.relative(root, full).split(path.sep).join('/'));
        }
    };
    walk(path.join(root, 'public'));
    return out.sort();
}

/** Every model over budget: { file: { key: value } } for its broken keys. */
export function auditRuntimeGlbs(root = ROOT) {
    const report = {};
    for (const file of listRuntimeGlbs(root)) {
        const violations = budgetViolations(measureGlb(path.join(root, file)), budgetFor(file));
        if (violations.length) report[file] = Object.fromEntries(violations.map(({ key, value }) => [key, value]));
    }
    return report;
}

/** Overages that are new, or heavier than the baseline accepted. */
export function compareToBaseline(report, baseline) {
    const failures = [];
    for (const [file, keys] of Object.entries(report)) {
        for (const [key, value] of Object.entries(keys)) {
            const accepted = baseline[file]?.[key];
            if (accepted === undefined || value > accepted) failures.push({ file, key, value, accepted: accepted ?? null });
        }
    }
    return failures;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const report = auditRuntimeGlbs();
    if (process.argv.includes('--write')) {
        fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(report, null, 2)}\n`);
        console.log(`[glb-budgets] baselined ${Object.keys(report).length} over-budget models -> ${path.relative(ROOT, BASELINE_PATH)}`);
        process.exit(0);
    }
    const baseline = fs.existsSync(BASELINE_PATH) ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) : {};
    const failures = compareToBaseline(report, baseline);
    console.log(`[glb-budgets] ${listRuntimeGlbs().length} models, ${Object.keys(report).length} over budget, ${failures.length} new or grown`);
    for (const f of failures) console.log(`  ${f.file}: ${f.key} ${f.value}${f.accepted === null ? ' (new)' : ` (was ${f.accepted})`}`);
    process.exit(failures.length ? 1 : 0);
}
