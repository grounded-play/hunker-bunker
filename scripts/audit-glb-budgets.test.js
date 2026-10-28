import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    BASELINE_PATH,
    GLB_BUDGETS,
    auditRuntimeGlbs,
    budgetFor,
    budgetViolations,
    compareToBaseline,
    measureGlb
} from './audit-glb-budgets.mjs';

// A minimal GLB: one triangle mesh drawn by two nodes, one 64x32 PNG.
function writeGlb(dir) {
    const png = Buffer.alloc(32);
    png.writeUInt32BE(0x89504e47, 0);
    png.writeUInt32BE(64, 16);
    png.writeUInt32BE(32, 20);
    const json = {
        asset: { version: '2.0' },
        accessors: [{ count: 300 }, { count: 600 }],
        meshes: [{ name: 'Crate', primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
        nodes: [{ mesh: 0 }, { mesh: 0 }],
        materials: [{}, {}],
        images: [{ bufferView: 0, mimeType: 'image/png' }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: png.length }]
    };
    let jsonChunk = Buffer.from(JSON.stringify(json));
    jsonChunk = Buffer.concat([jsonChunk, Buffer.alloc((4 - (jsonChunk.length % 4)) % 4, 0x20)]);
    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46546c67, 0);
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + png.length, 8);
    const jsonHeader = Buffer.alloc(8);
    jsonHeader.writeUInt32LE(jsonChunk.length, 0);
    jsonHeader.writeUInt32LE(0x4e4f534a, 4);
    const binHeader = Buffer.alloc(8);
    binHeader.writeUInt32LE(png.length, 0);
    binHeader.writeUInt32LE(0x004e4942, 4);
    const file = path.join(dir, 'crate.glb');
    fs.writeFileSync(file, Buffer.concat([header, jsonHeader, jsonChunk, binHeader, png]));
    return file;
}

describe('runtime GLB budgets', () => {
    it('measures drawn triangles, materials and texture size from the header', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glb-budget-'));
        expect(measureGlb(writeGlb(dir))).toEqual({
            triangles: 400,
            materials: 2,
            textures: 1,
            maxTextureSize: 64,
            hasLod: false
        });
    });

    it('holds kit pieces to a tighter budget than props', () => {
        expect(budgetFor('public/3d/runtime/kits/modular-cave-kit/wall.glb')).toBe(GLB_BUDGETS.kit);
        expect(budgetFor('public/3d/runtime/new3ds/crate.glb')).toBe(GLB_BUDGETS.default);
        expect(budgetViolations({ triangles: 70000, materials: 1, textures: 3, maxTextureSize: 4096 }, GLB_BUDGETS.default))
            .toEqual([{ key: 'triangles', value: 70000, limit: 60000 }, { key: 'maxTextureSize', value: 4096, limit: 2048 }]);
    });

    it('fails a new overage or a baselined model that got heavier', () => {
        const baseline = { 'a.glb': { triangles: 70000 } };
        expect(compareToBaseline({ 'a.glb': { triangles: 70000 } }, baseline)).toEqual([]);
        expect(compareToBaseline({ 'a.glb': { triangles: 80000 } }, baseline)).toHaveLength(1);
        expect(compareToBaseline({ 'b.glb': { maxTextureSize: 4096 } }, baseline)).toEqual([
            { file: 'b.glb', key: 'maxTextureSize', value: 4096, accepted: null }
        ]);
    });

    it('accepts no runtime model that is new over budget or heavier than its baseline', () => {
        const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
        expect(compareToBaseline(auditRuntimeGlbs(), baseline)).toEqual([]);
    });
});
