import * as THREE from 'three';
import { getArchetypeGripPoint, getWeaponModelFrame } from './data/weaponModelFrames.js';
import { getWeaponScaleForBounds } from './weaponCalibration.js';

// Puts a weapon GLB's scene in its class frame's source frame (see
// src/data/weaponModelFrames.js): turned so the muzzle is on +X and, for the
// hand, slid so its grip lands where the class frame's grip does once both
// are scaled to the calibration's target size. Returns a group to calibrate
// in place of the scene; the scene keeps its own transform underneath.
//
//   matchGrip  false for the free-standing Armory bench, which centres the
//              gun and only needs it facing the same way as in the hand
export function frameWeaponModel(scene, { url, archetypeId, archetypeUrl, context = 'gameplay', matchGrip = true } = {}) {
    const frame = getWeaponModelFrame(url);
    const root = new THREE.Group();
    scene.rotation.y += frame.yaw;
    root.add(scene);
    root.userData.weaponModelFrame = { url, yaw: frame.yaw };
    if (!matchGrip || !archetypeUrl || url === archetypeUrl) return root;

    const reference = getArchetypeGripPoint(archetypeUrl);
    const referenceBounds = getWeaponModelFrame(archetypeUrl).bounds;
    if (!reference || !referenceBounds) return root;

    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) return root;
    const size = box.getSize(new THREE.Vector3());
    const grip = new THREE.Vector3(
        box.min.x + size.x * frame.grip[0],
        box.min.y + size.y * frame.grip[1],
        (box.min.z + box.max.z) / 2
    );
    // Each model is scaled to the same target length, so the class grip is
    // matched in scaled space, then expressed in this model's source units.
    const referenceSize = referenceBounds.max.map((value, i) => value - referenceBounds.min[i]);
    const ratio = getWeaponScaleForBounds(referenceSize, archetypeId, context)
        / getWeaponScaleForBounds(size, archetypeId, context);
    scene.position.add(new THREE.Vector3(...reference).multiplyScalar(ratio).sub(grip));
    return root;
}
