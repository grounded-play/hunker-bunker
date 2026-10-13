import * as THREE from 'three';
import { createWorld3dModel } from './world3dOverlay.js';

function attachMissionCargoBeacon(root) {
    const material = new THREE.MeshBasicMaterial({
        color: 0xf6c453,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.44, 0.57, 24), material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    const pillarMaterial = material.clone();
    pillarMaterial.opacity = 0.24;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.07, 2.8, 8, 1, true), pillarMaterial);
    pillar.position.y = 1.4;
    const beacon = new THREE.Group();
    beacon.name = 'MissionCargoBeacon';
    beacon.userData = { ring, pillar };
    beacon.add(ring, pillar);
    root.add(beacon);
    root.userData.missionCargoBeacon = beacon;
    root.userData.disposeMissionCargoBeacon = () => {
        ring.geometry.dispose();
        material.dispose();
        pillar.geometry.dispose();
        pillarMaterial.dispose();
        beacon.removeFromParent();
    };
}

export async function createCarryObjectVisual(object) {
    if (!object?.modelType) return null;
    const root = await createWorld3dModel(object.modelType);
    if (!root) return null;
    root.name = `CarryObject:${object.instanceId}`;
    root.userData.isCarryObjectVisual = true;
    root.userData.instanceId = object.instanceId;
    root.userData.definitionId = object.definitionId;
    root.userData.presentationMode = 'world';
    if (object.missionId) attachMissionCargoBeacon(root);
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
    const beacon = root.userData.missionCargoBeacon;
    if (beacon) {
        beacon.visible = mode === 'world' && Boolean(visible);
        const pulse = 0.86 + Math.sin(elapsedSeconds * 4.2) * 0.14;
        beacon.scale.setScalar(pulse);
        beacon.rotation.y = -yaw;
    }
    return true;
}

export function disposeCarryObjectVisual(root) {
    if (!root) return;
    root.userData?.disposeMissionCargoBeacon?.();
    root.userData?.dispose?.();
    root.removeFromParent?.();
}
