import { createWorld3dModel } from './world3dOverlay.js';

export async function createCarryObjectVisual(object) {
    if (!object?.modelType) return null;
    const root = await createWorld3dModel(object.modelType);
    if (!root) return null;
    root.name = `CarryObject:${object.instanceId}`;
    root.userData.isCarryObjectVisual = true;
    root.userData.instanceId = object.instanceId;
    root.userData.definitionId = object.definitionId;
    root.userData.presentationMode = 'world';
    root.traverse((node) => {
        if (!node.isMesh) return;
        // Cargo is close to the player but small; receive world light without
        // multiplying the existing shadow-map submission budget.
        node.castShadow = false;
        node.receiveShadow = true;
    });
    return root;
}

export function updateCarryObjectVisual(root, {
    mode = 'world',
    x = 0,
    y = 0,
    z = 0,
    yaw = 0,
    elapsedSeconds = 0,
    visible = true
} = {}) {
    if (!root?.userData?.isCarryObjectVisual) return false;
    root.userData.presentationMode = mode;
    root.visible = Boolean(visible);
    root.position.set(x, y + (mode === 'held' ? 0 : 0.045 + Math.sin(elapsedSeconds * 2.2) * 0.025), z);
    root.rotation.y = yaw;
    return true;
}

export function disposeCarryObjectVisual(root) {
    if (!root) return;
    root.userData?.dispose?.();
    root.removeFromParent?.();
}
