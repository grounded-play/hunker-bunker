import * as THREE from 'three';

// The secret-path glows on a chunk's cliffs, as one instanced batch. They
// were one Mesh per cell -- 1,500+ objects across a normal view, a quarter of
// every visible chunk's nodes -- and three.js walked each one every frame for
// matrices and frustum culling (S53-02). Same geometry, material, pulse and
// placement (flat, 4.5 cm above the floor at the cell centre).
const GLOW_HEIGHT = 0.045;

export function buildCliffPathGlowBatch(geometry, material, cells) {
    if (!geometry || !material || !cells?.length) return null;
    const batch = new THREE.InstancedMesh(geometry, material, cells.length);
    const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const scale = new THREE.Vector3(1, 1, 1);
    const position = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    cells.forEach(({ x, z }, index) => {
        batch.setMatrixAt(index, matrix.compose(position.set(x, GLOW_HEIGHT, z), rotation, scale));
    });
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingSphere();
    batch.userData = { isCliffSecretPath: true, glowCount: cells.length };
    return batch;
}
