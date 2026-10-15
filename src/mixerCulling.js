import * as THREE from 'three';

// World prop animations (S53-02). Every animated world model's mixer used to
// step every frame, on screen or not. A mixer now steps only while its model
// can show: in the camera frustum, or close enough to the player to cast into
// the key-light shadow that follows them (its 32 m frustum reaches ~23 m).
// A skipped mixer banks the time it missed and applies it on its next step,
// so a model comes back into view in the pose continuous stepping would have
// given it.
export const MIXER_SHADOW_REACH_M = 26;
const SPHERE_PADDING_M = 1;

const _box = new THREE.Box3();

function poseSphere(mixer) {
    if (mixer._hbPoseSphere) return mixer._hbPoseSphere;
    const root = mixer.getRoot?.();
    if (!root?.isObject3D) return null;
    root.updateWorldMatrix(true, true);
    _box.setFromObject(root);
    if (_box.isEmpty()) return null;
    const sphere = _box.getBoundingSphere(new THREE.Sphere());
    sphere.radius += SPHERE_PADDING_M;
    mixer._hbPoseSphere = sphere;
    return sphere;
}

function shown(root) {
    for (let node = root; node; node = node.parent) if (node.visible === false) return false;
    return true;
}

export function shouldStepMixer(mixer, { frustum = null, playerPosition = null, shadowReach = MIXER_SHADOW_REACH_M } = {}) {
    const root = mixer.getRoot?.();
    if (root?.isObject3D && !shown(root)) return false;
    const sphere = poseSphere(mixer);
    if (!sphere) return true;
    if (frustum?.intersectsSphere(sphere)) return true;
    if (playerPosition && sphere.center.distanceTo(playerPosition) - sphere.radius <= shadowReach) return true;
    return !frustum && !playerPosition;
}

export function stepMixer(mixer, delta, context) {
    if (!shouldStepMixer(mixer, context)) {
        mixer._hbBankedDelta = (mixer._hbBankedDelta ?? 0) + delta;
        return false;
    }
    const banked = mixer._hbBankedDelta ?? 0;
    mixer._hbBankedDelta = 0;
    mixer.update(delta + banked);
    return true;
}

const _projScreen = new THREE.Matrix4();
export function cameraFrustum(camera, target = new THREE.Frustum()) {
    if (!camera?.projectionMatrix || !camera.matrixWorldInverse) return null;
    _projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    return target.setFromProjectionMatrix(_projScreen);
}
