import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
    CHASM_LANDMARK,
    chasmLandmarkForm,
    chasmLandmarkMapEntry,
    chasmLandmarkYaw,
    isChasmLandmarksEnabled,
    createChasmLandmarkGeometry,
    createChasmLandmarkMaterial,
    pickChasmLandmarkSite,
    pickChasmLandmarkSites
} from './chasmLandmarks.js';

const SIZE = 49;

// A chunk whose west part is walkable ledge and the rest void, like the
// survey's maze chunks (40% void).
function ledgeAndVoid(ledgeColumns = 18) {
    return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, (_, x) => (x < ledgeColumns ? '.' : 'X')));
}

function nearestWalkable(grid, x, y) {
    let best = Infinity;
    for (let yy = 0; yy < SIZE; yy += 1) {
        for (let xx = 0; xx < SIZE; xx += 1) {
            if (grid[yy][xx] === '.' || grid[yy][xx] === 'O') best = Math.min(best, Math.hypot(xx - x, yy - y));
        }
    }
    return best;
}

describe('pickChasmLandmarkSite', () => {
    it('stands in solid void, a few cells off the ledge, clear of the chunk edge', () => {
        const grid = ledgeAndVoid();
        const site = pickChasmLandmarkSite(grid, { chunkX: 2, chunkY: -1 });
        expect(site).not.toBeNull();
        for (let dy = -CHASM_LANDMARK.clearance; dy <= CHASM_LANDMARK.clearance; dy += 1) {
            for (let dx = -CHASM_LANDMARK.clearance; dx <= CHASM_LANDMARK.clearance; dx += 1) {
                expect(grid[site.y + dy][site.x + dx]).toBe('X');
            }
        }
        const reach = nearestWalkable(grid, site.x, site.y);
        expect(reach).toBeGreaterThanOrEqual(CHASM_LANDMARK.minReach);
        expect(reach).toBeLessThanOrEqual(CHASM_LANDMARK.maxReach);
        expect(site.x).toBeGreaterThanOrEqual(CHASM_LANDMARK.border);
        expect(site.y).toBeLessThan(SIZE - CHASM_LANDMARK.border);
    });

    it('faces the ledge it is seen from', () => {
        const site = pickChasmLandmarkSite(ledgeAndVoid(), { chunkX: 0, chunkY: 0 });
        // The ledge lies west (-x): the facing points that way.
        expect(Math.cos(site.facing)).toBeLessThan(-0.9);
    });

    it('is deterministic per chunk and varies between chunks', () => {
        const grid = ledgeAndVoid();
        const a = pickChasmLandmarkSite(grid, { chunkX: 4, chunkY: 7 });
        expect(pickChasmLandmarkSite(grid, { chunkX: 4, chunkY: 7 })).toEqual(a);
        const sites = new Set();
        for (let i = 0; i < 12; i += 1) {
            const site = pickChasmLandmarkSite(grid, { chunkX: i, chunkY: -i });
            sites.add(`${site.x},${site.y}`);
        }
        expect(sites.size).toBeGreaterThan(3);
    });

    it('declines a chunk with no void, or void nowhere near a ledge', () => {
        const solid = Array.from({ length: SIZE }, () => Array(SIZE).fill('.'));
        expect(pickChasmLandmarkSite(solid, { chunkX: 0, chunkY: 0 })).toBeNull();
        const allVoid = Array.from({ length: SIZE }, () => Array(SIZE).fill('X'));
        expect(pickChasmLandmarkSite(allVoid, { chunkX: 0, chunkY: 0 })).toBeNull();
    });

    it('never changes the grid it reads', () => {
        const grid = ledgeAndVoid();
        const before = JSON.stringify(grid);
        pickChasmLandmarkSite(grid, { chunkX: 1, chunkY: 1 });
        expect(JSON.stringify(grid)).toBe(before);
    });
});

describe('pickChasmLandmarkSites', () => {
    it('raises up to three per chunk, well apart, each a valid site', () => {
        const grid = ledgeAndVoid(10);
        const sites = pickChasmLandmarkSites(grid, { chunkX: 3, chunkY: 5 });
        expect(sites.length).toBeGreaterThan(1);
        expect(sites.length).toBeLessThanOrEqual(CHASM_LANDMARK.perChunk);
        for (let i = 0; i < sites.length; i += 1) {
            const reach = nearestWalkable(grid, sites[i].x, sites[i].y);
            expect(reach).toBeGreaterThanOrEqual(CHASM_LANDMARK.minReach);
            expect(reach).toBeLessThanOrEqual(CHASM_LANDMARK.maxReach);
            for (let j = 0; j < i; j += 1) {
                expect(Math.hypot(sites[i].x - sites[j].x, sites[i].y - sites[j].y)).toBeGreaterThanOrEqual(CHASM_LANDMARK.spacing);
            }
        }
        expect(sites[0]).toEqual(pickChasmLandmarkSite(grid, { chunkX: 3, chunkY: 5 }));
    });
});

describe('chasm landmark forms', () => {
    it('follows the district', () => {
        expect(chasmLandmarkForm('active')).toBe('mast');
        expect(chasmLandmarkForm('cryo')).toBe('spire');
        expect(chasmLandmarkForm('bio')).toBe('arch');
        expect(chasmLandmarkForm(undefined)).toBe('mast');
    });

    it('rises 7-8.5 m above the rim (framed by the isometric camera) from deep in the chasm, inside its void footprint, body and glow apart', () => {
        for (const form of ['mast', 'spire', 'arch']) {
            const geometry = createChasmLandmarkGeometry(form);
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            expect(box.max.y, form).toBeGreaterThanOrEqual(7);
            expect(box.max.y, form).toBeLessThanOrEqual(8.6);
            expect(box.min.y, form).toBeLessThan(-4);
            const reach = CHASM_LANDMARK.clearance + 0.5;
            for (const v of [box.min.x, box.max.x, box.min.z, box.max.z]) expect(Math.abs(v), form).toBeLessThanOrEqual(reach);
            // One material, one draw: the glow rides on a per-vertex attribute.
            expect(geometry.groups.length, form).toBe(0);
            const glow = geometry.getAttribute('hbGlow');
            expect(glow, form).toBeTruthy();
            const values = new Set(Array.from(glow.array));
            expect([...values].sort(), form).toEqual([0, 1]);
            expect(geometry.getAttribute('normal')).toBeTruthy();
            expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
        }
    });
});

describe('chasm landmark switch and facing', () => {
    it('is on unless hb_landmarks is 0', () => {
        const store = (value) => ({ getItem: () => value });
        expect(isChasmLandmarksEnabled(store(null))).toBe(true);
        expect(isChasmLandmarksEnabled(store('0'))).toBe(false);
        expect(isChasmLandmarksEnabled({ getItem: () => { throw new Error('blocked'); } })).toBe(true);
    });

    it('turns the arch\'s span across the line to the ledge', () => {
        for (const facing of [0, 1, Math.PI, -2]) {
            const span = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), chasmLandmarkYaw(facing));
            const toLedge = new THREE.Vector3(Math.cos(facing), 0, Math.sin(facing));
            expect(Math.abs(span.dot(toLedge))).toBeLessThan(1e-9);
        }
    });
});

describe('chasmLandmarkMapEntry', () => {
    it('names each form for the tactical map, one id per site', () => {
        expect(chasmLandmarkMapEntry('mast', 10, -4)).toEqual({ id: 'chasm_10,-4', x: 10, z: -4, label: 'RADIO MAST', type: 'chasm_mast' });
        expect(chasmLandmarkMapEntry('spire', 1, 2).label).toBe('ICE SPIRE');
        expect(chasmLandmarkMapEntry('arch', 1, 2).type).toBe('chasm_arch');
    });
});

describe('createChasmLandmarkMaterial', () => {
    it('draws body and glow in one material, the glow as emissive in the district colour', () => {
        const material = createChasmLandmarkMaterial('spire');
        expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
        const shader = {
            uniforms: {},
            vertexShader: '#include <common>\nvoid main() {\n#include <begin_vertex>\n}',
            fragmentShader: '#include <common>\nvoid main() {\n#include <emissivemap_fragment>\n}'
        };
        material.onBeforeCompile(shader);
        expect(shader.vertexShader).toContain('attribute float hbGlow;');
        expect(shader.fragmentShader).toContain('totalEmissiveRadiance');
        expect(shader.uniforms.uGlowColor.value.b).toBeGreaterThan(shader.uniforms.uGlowColor.value.r);
        expect(material.customProgramCacheKey()).toContain('spire');
    });
});
