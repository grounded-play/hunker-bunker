import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { buildChunkSplinesMesh, buildSeveredSplineGeometry, disposeSplineMesh, getSplineMaterial, splineLayerFor, splineVRepeat } from './splineDressingRenderer.js';

describe('splineDressingRenderer', () => {
    const dummyManifest = [
        {
            id: 'spline_1',
            points: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(3, 0, 0)],
            radius: 0.04,
            sides: 4,
            collars: [
                { pos: new THREE.Vector3(0, 0, 0), normal: new THREE.Vector3(-1, 0, 0), radius: 0.04, sides: 6 }
            ]
        },
        {
            id: 'spline_2',
            points: [new THREE.Vector3(0, 2, 0), new THREE.Vector3(3, 2, 0)],
            radius: 0.02,
            sides: 3,
            cuttable: true
        }
    ];

    it('merges multiple splines and collars into a single THREE.Mesh with 1 draw call', () => {
        const mesh = buildChunkSplinesMesh(dummyManifest, { theme: 'bunker' });
        expect(mesh).toBeTruthy();
        expect(mesh.isMesh).toBe(true);
        expect(mesh.name).toBe('chunk-splines-batch');
        expect(mesh.userData.isSplineDressing).toBe(true);
        expect(mesh.userData.splineCount).toBe(2);

        // Single merged buffer geometry containing tubes + collars
        const geom = mesh.geometry;
        expect(geom).toBeTruthy();
        expect(geom.getAttribute('position').count).toBeGreaterThan(0);
        expect(geom.getIndex().count).toBeGreaterThan(0);
    });

    it('extracts cuttable splines into separate sub-meshes via onCuttableMesh', () => {
        const cuttableSplinesFound = [];
        const onCuttable = vi.fn((cuttableMesh, item) => {
            cuttableSplinesFound.push({ cuttableMesh, item });
        });

        const staticMesh = buildChunkSplinesMesh(dummyManifest, {
            theme: 'bunker',
            onCuttableMesh: onCuttable
        });

        expect(staticMesh).toBeTruthy();
        expect(onCuttable).toHaveBeenCalledTimes(1);
        expect(cuttableSplinesFound.length).toBe(1);

        const { cuttableMesh, item } = cuttableSplinesFound[0];
        expect(item.id).toBe('spline_2');
        expect(cuttableMesh.isMesh).toBe(true);
        expect(cuttableMesh.userData.isCuttableSpline).toBe(true);
        expect(cuttableMesh.userData.splineId).toBe('spline_2');
    });

    it('returns null for empty or invalid manifests without throwing', () => {
        expect(buildChunkSplinesMesh([])).toBeNull();
        expect(buildChunkSplinesMesh(null)).toBeNull();
    });

    it('draws every area from one shared layered material', () => {
        expect(getSplineMaterial('bunker')).toBe(getSplineMaterial('cryo'));
        expect(splineLayerFor({ layerKind: 'vein' })).toBe(1);
        expect(splineLayerFor({ type: 'coolant_pipe' })).toBe(2);
        expect(splineLayerFor({ type: 'rope' })).toBe(3);
        // One texture repeat spans two circumferences of the tube.
        expect(1 / splineVRepeat(0.05, 0)).toBeCloseTo(2 * 2 * Math.PI * 0.05);
    });

    it('severs a run into two hanging halves with free ends at the cut', () => {
        const points = [0, 1, 2, 3, 4].map((x) => new THREE.Vector3(x, 1.5, 0));
        const severed = buildSeveredSplineGeometry({ points, radius: 0.03, cutPoint: new THREE.Vector3(2, 1.5, 0), layerKind: 'wire' });
        expect(severed.ends).toHaveLength(2);
        for (const end of severed.ends) {
            // The loose ends sag below the run and pull back from the cut.
            expect(end.position.y).toBeLessThan(1.5);
            expect(Math.abs(end.position.x - 2)).toBeGreaterThan(0.01);
        }
        expect(severed.geometry.getAttribute('splineLayer')).toBeTruthy();
    });

    it('safely disposes geometry on chunk unload', () => {
        const mesh = buildChunkSplinesMesh(dummyManifest);
        const group = new THREE.Group();
        group.add(mesh);

        let disposed = false;
        mesh.geometry.addEventListener('dispose', () => { disposed = true; });

        disposeSplineMesh(mesh);
        expect(disposed).toBe(true);
        expect(group.children.length).toBe(0);
    });
});
