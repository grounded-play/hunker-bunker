import { describe, expect, it } from 'vitest';
import {
    ATLAS_CONTRACT_V4,
    buildAtlasManifest,
    validateAtlasManifest,
    cellRect,
    frameSequence
} from './spriteAtlasContract.js';

const baseManifest = () => buildAtlasManifest({
    id: 'scout_walk_v4',
    source: 'art/source/mixamo/scout/Scouting-scout-working.blend',
    clip: 'walk',
    imageWidth: 2048,
    imageHeight: 2048
});

describe('ATLAS_CONTRACT_V4', () => {
    it('matches the shipped Tank atlas, which is the reference implementation', () => {
        // Tank.walk_v4.png is 2048x2048 on an 8x8 grid. New atlases must land
        // on the same numbers or the runtime layout cannot read them.
        expect(ATLAS_CONTRACT_V4).toMatchObject({
            columns: 8, rows: 8, cellSize: 256, imageSize: 2048, footstepFrames: [0, 4]
        });
        expect(ATLAS_CONTRACT_V4.columns * ATLAS_CONTRACT_V4.cellSize).toBe(ATLAS_CONTRACT_V4.imageSize);
    });
});

describe('cellRect', () => {
    it('maps direction/frame to pixels, row-major by direction', () => {
        expect(cellRect(0, 0)).toEqual({ x: 0, y: 0, width: 256, height: 256 });
        expect(cellRect(0, 7)).toEqual({ x: 7 * 256, y: 0, width: 256, height: 256 });
        expect(cellRect(7, 0)).toEqual({ x: 0, y: 7 * 256, width: 256, height: 256 });
    });

    it('refuses out-of-grid coordinates rather than returning a wrong cell', () => {
        // A silently wrong rect produces an atlas that looks right and animates
        // wrong, which is far more expensive to debug than a throw.
        expect(() => cellRect(8, 0)).toThrow();
        expect(() => cellRect(0, 8)).toThrow();
        expect(() => cellRect(-1, 0)).toThrow();
    });
});

describe('frameSequence', () => {
    it('samples a clip into exactly the contract frame count', () => {
        const frames = frameSequence({ startFrame: 1, endFrame: 33 });
        expect(frames).toHaveLength(8);
        expect(frames[0]).toBe(1);
    });

    it('never samples the loop endpoint twice', () => {
        // Frame 0 and frame N of a cycle are the same pose; including both
        // makes the walk stutter once per loop.
        const frames = frameSequence({ startFrame: 0, endFrame: 32 });
        expect(frames).toHaveLength(8);
        expect(frames).not.toContain(32);
    });

    it('handles a clip shorter than the frame count without duplicating blindly', () => {
        const frames = frameSequence({ startFrame: 1, endFrame: 5 });
        expect(frames).toHaveLength(8);
        expect(new Set(frames).size).toBeGreaterThan(1);
    });
});

describe('validateAtlasManifest', () => {
    it('accepts a well-formed manifest', () => {
        expect(validateAtlasManifest(baseManifest())).toEqual([]);
    });

    it('rejects an image that is not the contract size', () => {
        const m = { ...baseManifest(), imageWidth: 1024 };
        expect(validateAtlasManifest(m).join(' ')).toMatch(/imageWidth/);
    });

    it('rejects a manifest missing directions', () => {
        const m = baseManifest();
        m.directions = m.directions.slice(0, 4);
        expect(validateAtlasManifest(m).join(' ')).toMatch(/directions/);
    });

    it('rejects duplicate direction rows, which silently reuse a facing', () => {
        // The live Engineer sheet does exactly this -- 7 authored rows reusing
        // one rear direction -- and it is the defect this contract exists to
        // stop recurring.
        const m = baseManifest();
        m.directions[5] = { ...m.directions[4] };
        expect(validateAtlasManifest(m).join(' ')).toMatch(/duplicate/i);
    });

    it('rejects footstep frames outside the grid', () => {
        const m = { ...baseManifest(), footstepFrames: [0, 9] };
        expect(validateAtlasManifest(m).join(' ')).toMatch(/footstep/i);
    });

    it('reports every problem at once rather than the first', () => {
        const m = { ...baseManifest(), imageWidth: 10, imageHeight: 10, footstepFrames: [99] };
        expect(validateAtlasManifest(m).length).toBeGreaterThan(2);
    });

    it('rejects a non-manifest without throwing', () => {
        expect(validateAtlasManifest(null).length).toBeGreaterThan(0);
        expect(validateAtlasManifest({}).length).toBeGreaterThan(0);
    });
});

describe('buildAtlasManifest', () => {
    it('produces all eight directions with distinct yaws covering the circle', () => {
        const m = baseManifest();
        expect(m.directions).toHaveLength(8);
        const yaws = m.directions.map((d) => d.yaw);
        expect(new Set(yaws).size).toBe(8);
        expect(Math.max(...yaws)).toBeLessThan(360);
        expect(Math.min(...yaws)).toBeGreaterThanOrEqual(0);
    });

    it('records provenance so a rebuilt atlas can be traced to its source', () => {
        const m = baseManifest();
        expect(m.source).toContain('.blend');
        expect(m.clip).toBe('walk');
        expect(m.contract).toBe('v4');
    });
});
