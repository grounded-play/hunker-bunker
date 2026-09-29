// Wall raycasts at full fidelity, without walking the whole map
// (2026-09-25 PC log + headless profile: the suit-light cone's 22 rays and the
// fog-of-war line-of-sight checks were ~93% of updatePlayer and most of
// updateScatter).
//
// three's InstancedMesh.raycast multiplies and tests every instance for every
// ray: ~2,300 wall instances x ~22 cone rays x each fog check, per frame. Here
// each instance's world-space bounding sphere is cached (rebuilt only when the
// instance matrices, count, geometry or the mesh's world matrix change), a ray
// skips every instance whose sphere it cannot reach, and the instances left go
// through three's own Mesh.raycast against the real geometry. The culling is
// conservative, so the hits are exactly those of
// `raycaster.intersectObjects(meshes, false)`: same objects, instanceIds,
// points and order. Nothing is approximated; the cone and fog look identical.
import * as THREE from 'three';

const _instanceLocal = new THREE.Matrix4();
const _instanceWorld = new THREE.Matrix4();
const _sphere = new THREE.Sphere();
const _mesh = new THREE.Mesh();
const _instanceHits = [];
const spheresByMesh = new WeakMap();

function sameElements(a, b) {
    for (let i = 0; i < 16; i += 1) if (a[i] !== b[i]) return false;
    return true;
}

function instanceSpheres(mesh) {
    const version = mesh.instanceMatrix?.version ?? 0;
    const count = mesh.count ?? 0;
    const world = mesh.matrixWorld.elements;
    const cached = spheresByMesh.get(mesh);
    if (cached
        && cached.version === version
        && cached.count === count
        && cached.geometry === mesh.geometry
        && sameElements(cached.world, world)) {
        return cached;
    }
    const geometry = mesh.geometry;
    if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
    const data = new Float64Array(count * 4);
    for (let id = 0; id < count; id += 1) {
        mesh.getMatrixAt(id, _instanceLocal);
        _instanceWorld.multiplyMatrices(mesh.matrixWorld, _instanceLocal);
        _sphere.copy(geometry.boundingSphere).applyMatrix4(_instanceWorld);
        const o = id * 4;
        data[o] = _sphere.center.x;
        data[o + 1] = _sphere.center.y;
        data[o + 2] = _sphere.center.z;
        data[o + 3] = _sphere.radius;
    }
    const entry = { version, count, geometry, world: Float64Array.from(world), data };
    spheresByMesh.set(mesh, entry);
    return entry;
}

function raycastInstanced(mesh, raycaster, intersects) {
    if (mesh.material === undefined) return;
    const { data, count } = instanceSpheres(mesh);
    const { origin, direction } = raycaster.ray;
    const reach = raycaster.far;
    for (let id = 0; id < count; id += 1) {
        const o = id * 4;
        // Padded so float rounding can only keep an instance, never drop one.
        const r = data[o + 3] * 1.0001 + 1e-6;
        const vx = data[o] - origin.x;
        const vy = data[o + 1] - origin.y;
        const vz = data[o + 2] - origin.z;
        const t = vx * direction.x + vy * direction.y + vz * direction.z;
        // Entirely behind the origin, or beyond `far`: three rejects these.
        if (t < -r || t - r > reach) continue;
        // The ray line passes outside the sphere.
        if (vx * vx + vy * vy + vz * vz - t * t > r * r) continue;
        mesh.getMatrixAt(id, _instanceLocal);
        _instanceWorld.multiplyMatrices(mesh.matrixWorld, _instanceLocal);
        _mesh.geometry = mesh.geometry;
        _mesh.material = mesh.material;
        _mesh.matrixWorld = _instanceWorld;
        _instanceHits.length = 0;
        _mesh.raycast(raycaster, _instanceHits);
        for (const hit of _instanceHits) {
            hit.instanceId = id;
            hit.object = mesh;
            intersects.push(hit);
        }
    }
    _instanceHits.length = 0;
}

/**
 * Drop-in for `raycaster.intersectObjects(meshes, false)` over wall meshes.
 */
export function intersectWallMeshes(raycaster, meshes, intersects = []) {
    // Stand-ins that are not a THREE.Raycaster (tests, tools) keep their own
    // intersectObjects contract.
    if (!raycaster?.ray || !raycaster.layers) {
        return raycaster.intersectObjects(meshes, false, intersects);
    }
    for (const mesh of meshes ?? []) {
        if (!mesh || !mesh.layers.test(raycaster.layers)) continue;
        if (mesh.isInstancedMesh) raycastInstanced(mesh, raycaster, intersects);
        else mesh.raycast(raycaster, intersects);
    }
    intersects.sort((a, b) => a.distance - b.distance);
    return intersects;
}
