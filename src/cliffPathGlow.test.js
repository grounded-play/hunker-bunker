import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildCliffPathGlowBatch } from './cliffPathGlow.js';

describe('cliff path glow batch', () => {
    const geometry = new THREE.CircleGeometry(0.62, 20);
    const material = new THREE.MeshBasicMaterial({ transparent: true });

    it('draws every glow cell in one object, placed as the per-cell meshes were', () => {
        const cells = [{ x: 3, z: 4 }, { x: 10, z: -2 }, { x: 11, z: -2 }];
        const batch = buildCliffPathGlowBatch(geometry, material, cells);
        expect(batch.isInstancedMesh).toBe(true);
        expect(batch.count).toBe(3);
        expect(batch.geometry).toBe(geometry);
        expect(batch.material).toBe(material);
        expect(batch.userData.isCliffSecretPath).toBe(true);

        const single = new THREE.Mesh(geometry, material);
        single.rotation.x = -Math.PI / 2;
        single.position.set(10, 0.045, -2);
        single.updateMatrix();
        const m = new THREE.Matrix4();
        batch.getMatrixAt(1, m);
        m.elements.forEach((v, i) => expect(v).toBeCloseTo(single.matrix.elements[i], 6));
        expect(batch.castShadow).toBe(false);
    });

    it('culls as one unit around all its cells', () => {
        const batch = buildCliffPathGlowBatch(geometry, material, [{ x: 0, z: 0 }, { x: 40, z: 0 }]);
        expect(batch.boundingSphere.center.x).toBeCloseTo(20, 0);
        expect(batch.boundingSphere.radius).toBeGreaterThan(20);
    });

    it('builds nothing for a chunk without secret path', () => {
        expect(buildCliffPathGlowBatch(geometry, material, [])).toBeNull();
    });
});
