import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { SPLINE_PAINT, buildChunkSplinesMesh, buildSeveredSplineGeometry, disposeSplineMesh, getSplineMaterial, setSplineTime, splineLayerFor, splineVRepeat } from './splineDressingRenderer.js';

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

    describe('sway', () => {
        const hanging = {
            id: 'swag',
            points: [0, 1, 2, 3, 4].map((x) => new THREE.Vector3(x, 2.42 - Math.sin((x / 4) * Math.PI) * 0.2, 0)),
            radius: 0.03,
            layerKind: 'wire',
            sway: [0, 0.7, 1, 0.7, 0],
            collars: [{ pos: new THREE.Vector3(0, 2.42, 0), normal: new THREE.Vector3(0, 0, 1), radius: 0.03 }]
        };
        const sways = (geometry) => [...geometry.getAttribute('splineSway').array];

        it('carries each hanging span\'s sway weight on its vertices, and zero on everything fixed', () => {
            const mesh = buildChunkSplinesMesh([hanging, dummyManifest[0]]);
            const values = sways(mesh.geometry);
            expect(Math.max(...values)).toBe(1);
            expect(Math.min(...values)).toBe(0);
            // Collars and the fixed run merge into the same draw with zero sway.
            expect(values.filter((value) => value === 0).length).toBeGreaterThan(values.length / 2);
        });

        it('lets a cut cable\'s free ends swing while the anchored ends hold', () => {
            const points = [0, 1, 2, 3, 4].map((x) => new THREE.Vector3(x, 1.5, 0));
            const severed = buildSeveredSplineGeometry({ points, radius: 0.03, cutPoint: new THREE.Vector3(2, 1.5, 0), layerKind: 'wire' });
            const values = sways(severed.geometry);
            expect(Math.max(...values)).toBe(1);
            expect(values[0]).toBe(0);
        });

        it('swings the swaying vertices from one shared clock', () => {
            const material = getSplineMaterial();
            const shader = {
                uniforms: {},
                vertexShader: '#include <common>\n#include <uv_vertex>\n#include <begin_vertex>',
                fragmentShader: '#include <common>\n#include <map_fragment>\n#include <roughnessmap_fragment>\n#include <metalnessmap_fragment>\n#include <normal_fragment_maps>'
            };
            material.onBeforeCompile(shader);
            expect(shader.vertexShader).toContain('attribute float splineSway;');
            expect(shader.vertexShader).toMatch(/transformed\.[xz] \+=/);
            setSplineTime(12.5);
            expect(shader.uniforms.uSplineTime.value).toBe(12.5);
        });
    });

    describe('area finish', () => {
        const run = (layerKind, extra = {}) => ({
            id: `${layerKind}-run`,
            layerKind,
            points: [new THREE.Vector3(0, 1, 0), new THREE.Vector3(2, 1, 0)],
            radius: 0.05,
            collars: [{ pos: new THREE.Vector3(0, 1, 0), normal: new THREE.Vector3(1, 0, 0), radius: 0.05 }],
            ...extra
        });
        const layers = (mesh) => new Set(mesh.geometry.getAttribute('splineLayer').array);

        it('paints the bunker\'s collars and brackets with hazard stripes, and nobody else\'s', () => {
            expect(layers(buildChunkSplinesMesh([run('wire')]))).toContain(SPLINE_PAINT.hazardMetal);
            for (const kind of ['vein', 'pipe', 'vine']) expect(layers(buildChunkSplinesMesh([run(kind)]))).not.toContain(SPLINE_PAINT.hazardMetal);
        });

        it('hangs a work bulb on a drop cord wherever a run asks for one', () => {
            const mesh = buildChunkSplinesMesh([run('vine', { bulbs: [new THREE.Vector3(1, 2.2, 0)] })]);
            expect(layers(mesh)).toContain(SPLINE_PAINT.bulb);
            const positions = mesh.geometry.getAttribute('position');
            const layer = mesh.geometry.getAttribute('splineLayer');
            let lowest = Infinity;
            for (let i = 0; i < positions.count; i += 1) if (layer.getX(i) === SPLINE_PAINT.bulb) lowest = Math.min(lowest, positions.getY(i));
            // The bulb hangs below the run it is clipped to.
            expect(lowest).toBeLessThan(2.2 - 0.1);
        });

        it('pulses the veins, frosts the pipes, stripes the hazard metal and lights the bulbs in the one material', () => {
            const shader = {
                uniforms: {},
                vertexShader: '#include <common>\n#include <uv_vertex>\n#include <begin_vertex>',
                fragmentShader: '#include <common>\n#include <map_fragment>\n#include <roughnessmap_fragment>\n#include <metalnessmap_fragment>\n#include <normal_fragment_maps>\n#include <emissivemap_fragment>'
            };
            getSplineMaterial().onBeforeCompile(shader);
            expect(shader.vertexShader).toMatch(/hbVeinPulse/);
            expect(shader.fragmentShader).toMatch(/hbFrost/);
            expect(shader.fragmentShader).toMatch(/hbHazard/);
            expect(shader.fragmentShader).toMatch(/totalEmissiveRadiance/);
        });
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
