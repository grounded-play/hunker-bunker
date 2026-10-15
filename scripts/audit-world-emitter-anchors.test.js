import { describe, expect, it } from 'vitest';
import { auditWorldEmitterAnchors, glbNodeNames } from './audit-world-emitter-anchors.js';

function glb(nodes) {
    let json = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, nodes }));
    const padding = (4 - (json.length % 4)) % 4;
    json = Buffer.concat([json, Buffer.alloc(padding, 0x20)]);
    const buffer = Buffer.alloc(20 + json.length);
    buffer.writeUInt32LE(0x46546c67, 0);
    buffer.writeUInt32LE(2, 4);
    buffer.writeUInt32LE(buffer.length, 8);
    buffer.writeUInt32LE(json.length, 12);
    buffer.writeUInt32LE(0x4e4f534a, 16);
    json.copy(buffer, 20);
    return buffer;
}

describe('world emitter anchor audit', () => {
    it('reads node names from a binary GLB JSON chunk', () => {
        expect(glbNodeNames(glb([{ name: 'Body' }, { name: 'FX_EMITTER_00' }]))).toEqual(['Body', 'FX_EMITTER_00']);
        expect(glbNodeNames(Buffer.from('not a glb'))).toEqual([]);
    });

    it('keeps every gameplay emitter asset safe through an anchor or explicit fallback', () => {
        const results = auditWorldEmitterAnchors();
        expect(results).toHaveLength(3);
        expect(results.filter((result) => ['missing-profile', 'missing-asset', 'unsafe'].includes(result.status))).toEqual([]);
        expect(results.every((result) => result.status === 'authored' || result.fallback)).toBe(true);
    });
});
