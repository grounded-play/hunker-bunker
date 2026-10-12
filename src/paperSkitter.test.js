import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PAPER_SKITTER, createPaperSkitter, planPaperSheets } from './paperSkitter.js';

const paperPatch = { family: 'decal_paper_scatter', surface: 'floor', x: 10, z: 20, yaw: 0.4 };
const open = () => true;

function heightOf(skitter, index) {
    const matrix = new THREE.Matrix4();
    skitter.mesh.getMatrixAt(index, matrix);
    return new THREE.Vector3().setFromMatrixPosition(matrix).y;
}
function positionOf(skitter, index) {
    const matrix = new THREE.Matrix4();
    skitter.mesh.getMatrixAt(index, matrix);
    return new THREE.Vector3().setFromMatrixPosition(matrix);
}
// The player running east past the patch at 4 m/s.
function runPast(skitter, { from = 8.6, speed = 4, seconds = 1.2, z = 20, isOpen = open } = {}) {
    const step = 1 / 60;
    for (let t = 0; t <= seconds; t += step) skitter.update(step, { x: from + speed * t, z }, isOpen);
}

describe('planPaperSheets', () => {
    it('lays a few loose sheets around each paperwork patch, and nothing elsewhere', () => {
        const sheets = planPaperSheets([paperPatch, { family: 'decal_spilled_rations', surface: 'floor', x: 0, z: 0 }]);
        expect(sheets.length).toBe(PAPER_SKITTER.sheetsPerPatch);
        for (const sheet of sheets) {
            expect(Math.hypot(sheet.x - paperPatch.x, sheet.z - paperPatch.z)).toBeLessThanOrEqual(PAPER_SKITTER.scatterRadius);
        }
        expect(planPaperSheets([paperPatch])).toEqual(sheets);
        expect(planPaperSheets([{ ...paperPatch, surface: 'wall' }])).toEqual([]);
    });
});

describe('createPaperSkitter', () => {
    it('draws every sheet of a chunk in one instanced mesh, lying flat', () => {
        const sheets = planPaperSheets([paperPatch, { ...paperPatch, x: 30 }]);
        const skitter = createPaperSkitter(sheets);
        expect(skitter.mesh.isInstancedMesh).toBe(true);
        expect(skitter.mesh.count).toBe(sheets.length);
        for (let i = 0; i < sheets.length; i += 1) expect(heightOf(skitter, i)).toBeLessThanOrEqual(PAPER_SKITTER.restHeight + 1e-6);
    });

    it('stays put while nobody comes near, without touching the GPU buffer', () => {
        const skitter = createPaperSkitter(planPaperSheets([paperPatch]));
        const version = skitter.mesh.instanceMatrix.version;
        for (let i = 0; i < 120; i += 1) skitter.update(1 / 60, { x: 40, z: 40 }, open);
        expect(skitter.mesh.instanceMatrix.version).toBe(version);
        expect(skitter.airborne).toBe(0);
    });

    it('kicks sheets up when the player runs past, and they settle a short way off', () => {
        const skitter = createPaperSkitter(planPaperSheets([paperPatch]));
        const before = Array.from({ length: skitter.mesh.count }, (_, i) => positionOf(skitter, i));
        runPast(skitter, { seconds: 0.5 });
        expect(skitter.airborne).toBeGreaterThan(0);
        const lifted = Array.from({ length: skitter.mesh.count }, (_, i) => heightOf(skitter, i));
        expect(Math.max(...lifted)).toBeGreaterThan(0.08);
        for (let i = 0; i < 300; i += 1) skitter.update(1 / 60, { x: 60, z: 60 }, open);
        expect(skitter.airborne).toBe(0);
        const moved = before.map((position, i) => position.distanceTo(positionOf(skitter, i)));
        expect(Math.max(...moved)).toBeGreaterThan(0.2);
        expect(Math.max(...moved)).toBeLessThan(PAPER_SKITTER.maxTravel);
        for (let i = 0; i < skitter.mesh.count; i += 1) expect(heightOf(skitter, i)).toBeLessThanOrEqual(PAPER_SKITTER.restHeight + 1e-6);
    });

    it('takes a teleport for a teleport, not a run', () => {
        const skitter = createPaperSkitter(planPaperSheets([paperPatch]));
        skitter.update(1 / 60, { x: 200, z: 200 }, open);
        skitter.update(1 / 60, { x: 10, z: 20 }, open);
        expect(skitter.airborne).toBe(0);
    });

    it('ignores someone walking slowly by', () => {
        const skitter = createPaperSkitter(planPaperSheets([paperPatch]));
        runPast(skitter, { speed: 0.8, seconds: 2.5, from: 9 });
        expect(skitter.airborne).toBe(0);
    });

    it('never blows a sheet into a wall', () => {
        const skitter = createPaperSkitter(planPaperSheets([paperPatch]));
        // A wall from x 10.5 east.
        const isOpen = (x) => x < 10.5;
        runPast(skitter, { isOpen, seconds: 0.4 });
        for (let i = 0; i < 300; i += 1) skitter.update(1 / 60, { x: 60, z: 60 }, isOpen);
        for (let i = 0; i < skitter.mesh.count; i += 1) {
            const position = positionOf(skitter, i);
            const start = planPaperSheets([paperPatch])[i];
            // A sheet that started clear of the wall stays clear of it.
            if (start.x < 10.5) expect(position.x).toBeLessThan(10.5);
        }
    });
});
