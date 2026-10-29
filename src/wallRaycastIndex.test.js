import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { intersectWallMeshes } from './wallRaycastIndex.js';

// The index must be invisible: every ray returns exactly what three's own
// intersectObjects(meshes, false) returns.

function rng(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 2 ** 32;
    };
}

function wallField(random) {
    const geometry = new THREE.BoxGeometry(1, 2.4, 1);
    const material = new THREE.MeshStandardMaterial();
    const walls = new THREE.InstancedMesh(geometry, material, 400);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 400; i += 1) {
        const x = Math.floor(random() * 40) - 20;
        const z = Math.floor(random() * 40) - 20;
        const s = 0.6 + random() * 0.8;
        m.compose(new THREE.Vector3(x, 1.2, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * Math.PI), new THREE.Vector3(s, 1, s));
        walls.setMatrixAt(i, m);
    }
    // A destroyed wall: zero scale, as markWallTileDestroyed leaves it.
    walls.setMatrixAt(7, new THREE.Matrix4().makeScale(0, 0, 0));
    walls.instanceMatrix.needsUpdate = true;
    walls.position.set(3, 0, -2);
    walls.updateMatrixWorld(true);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 3), material);
    pillar.position.set(1, 1.5, 1);
    pillar.updateMatrixWorld(true);
    return { walls, pillar };
}

function signature(hits) {
    return hits.map((h) => `${h.object.uuid}:${h.instanceId ?? '-'}:${h.faceIndex}:${h.distance.toFixed(9)}`);
}

function compare(random, meshes, rays = 600) {
    const raycaster = new THREE.Raycaster();
    let hitsSeen = 0;
    for (let i = 0; i < rays; i += 1) {
        const origin = new THREE.Vector3(random() * 40 - 20, 0.2 + random() * 2.2, random() * 40 - 20);
        const angle = random() * Math.PI * 2;
        const dir = new THREE.Vector3(Math.sin(angle), (random() - 0.5) * 0.2, Math.cos(angle)).normalize();
        raycaster.set(origin, dir);
        raycaster.near = random() < 0.5 ? 0 : 0.05;
        raycaster.far = random() < 0.2 ? Infinity : 2 + random() * 14;
        const expected = raycaster.intersectObjects(meshes, false);
        const actual = intersectWallMeshes(raycaster, meshes);
        expect(signature(actual)).toEqual(signature(expected));
        hitsSeen += expected.length;
    }
    return hitsSeen;
}

describe('wall raycasts through the index', () => {
    it('match three exactly: objects, instances, faces, distances and order', () => {
        const random = rng(20260925);
        const { walls, pillar } = wallField(random);
        expect(compare(random, [walls, pillar])).toBeGreaterThan(200);
    });

    it('follow walls that are destroyed, moved or rebuilt after the first query', () => {
        const random = rng(7);
        const { walls, pillar } = wallField(random);
        compare(random, [walls, pillar], 50);
        walls.setMatrixAt(3, new THREE.Matrix4().makeScale(0, 0, 0));
        walls.instanceMatrix.needsUpdate = true;
        compare(random, [walls, pillar], 200);
        walls.position.set(-5, 0, 4);
        walls.updateMatrixWorld(true);
        compare(random, [walls, pillar], 200);
        walls.count = 120;
        compare(random, [walls, pillar], 200);
    });

    it('respects raycaster layers like intersectObjects', () => {
        const random = rng(11);
        const { walls, pillar } = wallField(random);
        pillar.layers.set(3);
        compare(random, [walls, pillar], 200);
    });

    it('keeps short rays originating inside a batch and boundary hits at far', () => {
        const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial(), 2);
        walls.setMatrixAt(0, new THREE.Matrix4().makeTranslation(1, 0, 0));
        walls.setMatrixAt(1, new THREE.Matrix4().makeTranslation(20, 0, 0));
        walls.instanceMatrix.needsUpdate = true;
        walls.updateMatrixWorld();
        const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(1, 0, 0), 0, 0.5);
        expect(signature(intersectWallMeshes(ray, [walls]))).toEqual(signature(ray.intersectObject(walls)));
        expect(intersectWallMeshes(ray, [walls]).length).toBeGreaterThan(0);
    });

    it('matches native rays across nine separated chunks, including vertical and axis-aligned rays', () => {
        const random = rng(20261028);
        const meshes = [];
        for (let x = -1; x <= 1; x++) {
            for (let z = -1; z <= 1; z++) {
                const { walls } = wallField(random);
                walls.position.set(x * 40, 0, z * 40);
                walls.updateMatrixWorld(true);
                meshes.push(walls);
            }
        }
        expect(compare(random, meshes, 200)).toBeGreaterThan(0);
        for (const direction of [[1, 0, 0], [0, 0, -1], [0, -1, 0]]) {
            const ray = new THREE.Raycaster(new THREE.Vector3(0, 1.2, 0), new THREE.Vector3(...direction), 0, 5);
            expect(signature(intersectWallMeshes(ray, meshes))).toEqual(signature(ray.intersectObjects(meshes, false)));
        }
    });
});
