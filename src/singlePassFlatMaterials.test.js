import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { isFlatGeometry, useSinglePassForFlatMaterials } from './singlePassFlatMaterials.js';

const doubleSided = () => new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });

describe('single-pass flat decals', () => {
    it('knows flat geometry from solid geometry', () => {
        expect(isFlatGeometry(new THREE.PlaneGeometry(2, 1))).toBe(true);
        expect(isFlatGeometry(new THREE.CircleGeometry(1, 12))).toBe(true);
        expect(isFlatGeometry(new THREE.BoxGeometry(1, 0.02, 1))).toBe(false);
        expect(isFlatGeometry(new THREE.SphereGeometry(1))).toBe(false);
        expect(isFlatGeometry(new THREE.BufferGeometry())).toBe(false);
    });

    it('draws a flat double-sided decal once and leaves solids to three', () => {
        const decal = doubleSided();
        const glass = doubleSided();
        const front = new THREE.MeshBasicMaterial({ transparent: true });
        const root = new THREE.Group();
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), decal);
        plane.rotation.x = -Math.PI / 2; // lying on the floor: still flat in its own space
        root.add(plane, new THREE.Mesh(new THREE.SphereGeometry(1), glass), new THREE.Mesh(new THREE.PlaneGeometry(1, 1), front));
        expect(useSinglePassForFlatMaterials(root)).toBe(1);
        expect(decal.forceSinglePass).toBe(true);
        expect(glass.forceSinglePass).toBe(false);
        expect(front.forceSinglePass).toBe(false);
    });

    it('keeps two passes for a material shared with a solid mesh, even one seen later', () => {
        const shared = doubleSided();
        const a = new THREE.Group();
        a.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shared));
        useSinglePassForFlatMaterials(a);
        expect(shared.forceSinglePass).toBe(true);
        const b = new THREE.Group();
        b.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), shared));
        useSinglePassForFlatMaterials(b);
        expect(shared.forceSinglePass).toBe(false);
        useSinglePassForFlatMaterials(a);
        expect(shared.forceSinglePass).toBe(false);
    });
});

describe('runtime sweep', () => {
    it('catches flat effects added later, at most once per interval', async () => {
        const { createFlatMaterialSweeper } = await import('./singlePassFlatMaterials.js');
        let clock = 0;
        const sweep = createFlatMaterialSweeper({ intervalMs: 500, now: () => clock });
        const scene = new THREE.Scene();
        expect(sweep(scene)).toBe(0);
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.3, 24), doubleSided());
        scene.add(ring);
        clock = 100;
        expect(sweep(scene)).toBe(0);
        clock = 600;
        expect(sweep(scene)).toBe(1);
        expect(ring.material.forceSinglePass).toBe(true);
    });

    it('re-reads bounds when a geometry is reshaped', () => {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = doubleSided();
        const root = new THREE.Group();
        root.add(new THREE.Mesh(geometry, material));
        useSinglePassForFlatMaterials(root);
        expect(material.forceSinglePass).toBe(true);
        geometry.attributes.position.setZ(0, 0.5);
        geometry.attributes.position.needsUpdate = true;
        useSinglePassForFlatMaterials(root);
        expect(material.forceSinglePass).toBe(false);
    });
});
