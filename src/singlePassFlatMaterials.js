// Flat decals drawn once, not twice (2026-09-25 render-churn probe).
//
// three draws every transparent DoubleSide material in two passes -- back
// faces, then front faces -- flipping `material.side` and setting
// `needsUpdate` twice per object per frame. That doubled the draw calls of
// every floor decal/puddle/footprint and forced ~60 program re-resolves a
// frame. For a mesh with no thickness the two passes cover the same pixels in
// the same plane, so `forceSinglePass` renders it identically. (Materials that
// are opaque today but made transparent later by fog-of-war get it too.)
//
// Only materials whose every mesh seen here is planar are switched; a material
// that also dresses a solid mesh keeps three's two-pass sort.
import * as THREE from 'three';

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const flatByGeometry = new WeakMap();

function isFlatCached(geometry) {
    if (!geometry) return false;
    const cached = flatByGeometry.get(geometry);
    if (cached && cached.version === geometry.attributes?.position?.version) return cached.flat;
    // Positions moved since the last look: the stored bounds are stale.
    if (cached) geometry.computeBoundingBox();
    const flat = isFlatGeometry(geometry);
    flatByGeometry.set(geometry, { flat, version: geometry.attributes?.position?.version });
    return flat;
}

export function isFlatGeometry(geometry) {
    if (!geometry?.attributes?.position) return false;
    // Morph targets can bend a flat mesh out of its plane.
    if (geometry.morphAttributes?.position?.length) return false;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    _box.copy(geometry.boundingBox);
    if (_box.isEmpty()) return false;
    _box.getSize(_size);
    const extent = Math.max(_size.x, _size.y, _size.z);
    if (!(extent > 0)) return false;
    return Math.min(_size.x, _size.y, _size.z) <= extent * 1e-5;
}

export function useSinglePassForFlatMaterials(root) {
    if (!root?.traverse) return 0;
    const flat = new Map();
    root.traverse((object) => {
        if (!object.isMesh || object.isSkinnedMesh || !object.material) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        const planar = isFlatCached(object.geometry);
        for (const material of materials) {
            if (!material || material.side !== THREE.DoubleSide) continue;
            flat.set(material, (flat.get(material) ?? true) && planar);
        }
    });
    let changed = 0;
    for (const [material, planar] of flat) {
        if (planar && material.userData?.twoPassRequired !== true) {
            if (!material.forceSinglePass) changed += 1;
            material.forceSinglePass = true;
        } else if (!planar && material.userData?.singlePassFlat === true) {
            // Seen on a solid mesh after all: restore three's default.
            material.forceSinglePass = false;
        }
        if (planar) material.userData.singlePassFlat = true;
        else material.userData.twoPassRequired = true;
    }
    return changed;
}

/**
 * The same, for everything added to the scene at runtime (impact rings,
 * markers, effects): a sweep at most every `intervalMs`.
 */
export function createFlatMaterialSweeper({ intervalMs = 500, now = () => performance.now() } = {}) {
    let lastAt = -Infinity;
    return (root) => {
        const at = now();
        if (at - lastAt < intervalMs) return 0;
        lastAt = at;
        return useSinglePassForFlatMaterials(root);
    };
}
