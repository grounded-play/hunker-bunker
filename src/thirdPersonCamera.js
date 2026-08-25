import * as THREE from 'three';

export const THIRD_PERSON_CAMERA = Object.freeze({
    fieldOfView: 58,
    focusHeight: 1.18,
    lookAhead: 4.2,
    distance: 3.65,
    lift: 1.55,
    shoulder: 0.58,
    collisionPadding: 0.22,
    minimumDistance: 0.72
});

export function getThirdPersonCameraPose({
    playerPosition,
    planarForward,
    planarRight,
    config = THIRD_PERSON_CAMERA
}) {
    const focus = new THREE.Vector3(
        playerPosition.x,
        playerPosition.y + config.focusHeight,
        playerPosition.z
    );
    const position = new THREE.Vector3(
        focus.x - planarForward.x * config.distance + planarRight.x * config.shoulder,
        focus.y + config.lift,
        focus.z - planarForward.y * config.distance + planarRight.y * config.shoulder
    );
    const lookAt = new THREE.Vector3(
        focus.x + planarForward.x * config.lookAhead,
        focus.y,
        focus.z + planarForward.y * config.lookAhead
    );
    return { focus, position, lookAt };
}

export function clampCameraPositionToHit(focus, desiredPosition, hitDistance, config = THIRD_PERSON_CAMERA) {
    const offset = desiredPosition.clone().sub(focus);
    const desiredDistance = offset.length();
    if (!(hitDistance >= 0) || hitDistance >= desiredDistance) return desiredPosition.clone();

    const safeDistance = THREE.MathUtils.clamp(
        hitDistance - config.collisionPadding,
        config.minimumDistance,
        desiredDistance
    );
    return focus.clone().add(offset.normalize().multiplyScalar(safeDistance));
}
