// CPU-only, deterministic diagnostic; timings are evidence, never a CI gate.
// Run: node scripts/benchmark-wall-raycasts.mjs
import * as THREE from 'three';
import { intersectWallMeshes } from '../src/wallRaycastIndex.js';

const geometry = new THREE.BoxGeometry(1, 2.4, 1);
const material = new THREE.MeshBasicMaterial();
const matrix = new THREE.Matrix4();
const meshes = [];
for (let z = -1; z <= 1; z++) {
    for (let x = -1; x <= 1; x++) {
        const mesh = new THREE.InstancedMesh(geometry, material, 256);
        for (let i = 0; i < mesh.count; i++) {
            mesh.setMatrixAt(i, matrix.makeTranslation(x * 32 + (i % 16) * 2, 1.2, z * 32 + Math.floor(i / 16) * 2));
        }
        mesh.instanceMatrix.needsUpdate = true;
        mesh.updateMatrixWorld();
        meshes.push(mesh);
    }
}
const rays = Array.from({ length: 1000 }, (_, i) => new THREE.Raycaster(
    new THREE.Vector3(0.7 + (i % 13) * 0.1, 1.2, 0.7),
    new THREE.Vector3(Math.sin(i * 2.39996), 0, Math.cos(i * 2.39996)),
    0.05,
    12
));
const cast = () => {
    let hits = 0;
    for (const ray of rays) hits += intersectWallMeshes(ray, meshes).length;
    return hits;
};
for (let i = 0; i < 3; i++) cast();
const timesMs = [];
let hits = 0;
for (let i = 0; i < 7; i++) {
    const start = performance.now();
    hits += cast();
    timesMs.push(performance.now() - start);
}
console.log(JSON.stringify({
    wallInstances: meshes.reduce((sum, mesh) => sum + mesh.count, 0),
    raysPerRound: rays.length,
    rounds: timesMs.length,
    timesMs,
    medianMs: [...timesMs].sort((a, b) => a - b)[3],
    hits
}, null, 2));
for (const mesh of meshes) mesh.dispose();
geometry.dispose();
material.dispose();
