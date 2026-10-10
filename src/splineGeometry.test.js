import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
    evaluateCatenaryPoints,
    evaluateFilletedManhattanPoints,
    computeParallelTransportFrames,
    buildPrismTubeGeometry,
    buildTerminationCollarGeometry
} from './splineGeometry.js';

describe('splineGeometry math core', () => {
    describe('evaluateCatenaryPoints', () => {
        it('calculates expected endpoints and center sag', () => {
            const p0 = new THREE.Vector3(0, 3, 0);
            const p1 = new THREE.Vector3(10, 3, 0);
            const sag = 0.5;
            const points = evaluateCatenaryPoints(p0, p1, sag, 6);

            expect(points.length).toBe(7);
            expect(points[0].x).toBeCloseTo(0);
            expect(points[0].y).toBeCloseTo(3);
            expect(points[6].x).toBeCloseTo(10);
            expect(points[6].y).toBeCloseTo(3);

            // Midpoint (index 3 out of 6 segments) has maximum sag
            const mid = points[3];
            expect(mid.x).toBeCloseTo(5);
            expect(mid.y).toBeCloseTo(3 - sag); // 3 - 0.5 = 2.5
        });

        it('handles array-based coordinates gracefully', () => {
            const points = evaluateCatenaryPoints([0, 0, 0], [4, 0, 0], 0.2, 4);
            expect(points.length).toBe(5);
            expect(points[2].y).toBeCloseTo(-0.2);
        });
    });

    describe('evaluateFilletedManhattanPoints', () => {
        it('preserves straight 2-point runs without extra vertices', () => {
            const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 0, 0)];
            const filleted = evaluateFilletedManhattanPoints(pts);
            expect(filleted.length).toBe(2);
            expect(filleted[0].x).toBe(0);
            expect(filleted[1].x).toBe(5);
        });

        it('fillets a 90-degree corner with smooth interpolation', () => {
            const pts = [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(5, 0, 0),
                new THREE.Vector3(5, 0, 5)
            ];
            const filleted = evaluateFilletedManhattanPoints(pts, 0.2, 3);
            // 1 start point + (3 + 1 fillet points) + 1 end point = 6 points
            expect(filleted.length).toBe(6);
            expect(filleted[0].x).toBe(0);
            expect(filleted[filleted.length - 1].z).toBe(5);

            // None of the intermediate points should be the exact sharp corner (5, 0, 0)
            const exactCornerHit = filleted.some((p) => Math.abs(p.x - 5) < 1e-4 && Math.abs(p.z) < 1e-4);
            expect(exactCornerHit).toBe(false);
        });
    });

    describe('computeParallelTransportFrames', () => {
        it('produces valid orthonormal frames with zero NaNs on vertical paths', () => {
            // Path rising straight up in Y
            const points = [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, 2, 0),
                new THREE.Vector3(0, 4, 0)
            ];
            const frames = computeParallelTransportFrames(points);
            expect(frames.length).toBe(3);

            for (const frame of frames) {
                expect(Number.isFinite(frame.normal.x)).toBe(true);
                expect(Number.isFinite(frame.normal.y)).toBe(true);
                expect(Number.isFinite(frame.normal.z)).toBe(true);

                expect(frame.normal.length()).toBeCloseTo(1.0, 4);
                expect(frame.binormal.length()).toBeCloseTo(1.0, 4);
                expect(frame.tangent.length()).toBeCloseTo(1.0, 4);

                // Orthogonality: dot products must be 0
                expect(frame.tangent.dot(frame.normal)).toBeCloseTo(0.0, 4);
                expect(frame.tangent.dot(frame.binormal)).toBeCloseTo(0.0, 4);
                expect(frame.normal.dot(frame.binormal)).toBeCloseTo(0.0, 4);
            }
        });
    });

    describe('buildPrismTubeGeometry', () => {
        it('builds a 3-sided low-poly prism tube with correct vertex and triangle counts', () => {
            const points = [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(2, 0, 0),
                new THREE.Vector3(4, 0, 0)
            ];
            const geom = buildPrismTubeGeometry(points, { sides: 3, radius: 0.02 });
            expect(geom).toBeTruthy();

            // 3 points (rings), 3 sides -> (3 + 1) = 4 verts per ring -> 12 verts total
            const posAttr = geom.getAttribute('position');
            expect(posAttr.count).toBe(12);

            // 2 segments between rings * 3 sides * 2 triangles * 3 indices = 36 indices
            const indexAttr = geom.getIndex();
            expect(indexAttr.count).toBe(36);

            // Check UV ranges
            const uvAttr = geom.getAttribute('uv');
            expect(uvAttr.getX(0)).toBe(0); // u starts at 0
            expect(uvAttr.getX(3)).toBe(1); // u ends at 1 on ring wrap
        });

        it('builds a 6-sided industrial pipe geometry without degenerate normals', () => {
            const points = [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, 2, 0),
                new THREE.Vector3(2, 2, 0)
            ];
            const geom = buildPrismTubeGeometry(points, { sides: 6, radius: 0.06 });
            expect(geom).toBeTruthy();

            const posAttr = geom.getAttribute('position');
            const normAttr = geom.getAttribute('normal');

            // 3 rings * 7 verts = 21 verts
            expect(posAttr.count).toBe(21);

            for (let i = 0; i < normAttr.count; i += 1) {
                const nx = normAttr.getX(i);
                const ny = normAttr.getY(i);
                const nz = normAttr.getZ(i);
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
                expect(len).toBeCloseTo(1.0, 4);
            }
        });

        it('maps UV coordinates within specified atlas band offset and scale', () => {
            const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)];
            const geom = buildPrismTubeGeometry(points, {
                sides: 4,
                vAtlasOffset: 0.5,
                vAtlasScale: 0.25
            });
            const uvAttr = geom.getAttribute('uv');

            // V coordinates must be within [0.5, 0.75]
            for (let i = 0; i < uvAttr.count; i += 1) {
                const v = uvAttr.getY(i);
                expect(v).toBeGreaterThanOrEqual(0.5 - 1e-5);
                expect(v).toBeLessThanOrEqual(0.75 + 1e-5);
            }
        });
    });
});

describe('sway attribute', () => {
    const points = [0, 1, 2].map((x) => new THREE.Vector3(x, 2, 0));
    it('writes each point\'s sway weight to its whole ring', () => {
        const geometry = buildPrismTubeGeometry(points, { sides: 4, layer: 0, sway: [0, 1, 0.5] });
        const sway = geometry.getAttribute('splineSway').array;
        expect([...sway.slice(0, 5)]).toEqual([0, 0, 0, 0, 0]);
        expect([...sway.slice(5, 10)]).toEqual([1, 1, 1, 1, 1]);
        expect([...sway.slice(10, 15)]).toEqual([0.5, 0.5, 0.5, 0.5, 0.5]);
    });
    it('gives every layered tube and collar the attribute, zero when fixed, so they merge', () => {
        expect([...buildPrismTubeGeometry(points, { layer: 1 }).getAttribute('splineSway').array].every((v) => v === 0)).toBe(true);
        const collar = buildTerminationCollarGeometry(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), { layer: 4 });
        expect([...collar.getAttribute('splineSway').array].every((v) => v === 0)).toBe(true);
    });
});
