import * as THREE from 'three';

const SEGMENT_COUNT = 5;

export function createBaseAtmosphereIndicator() {
    const root = new THREE.Group();
    root.name = 'BaseAtmosphereIndicator';
    root.userData.isBaseAtmosphereIndicator = true;

    const housingMaterial = new THREE.MeshStandardMaterial({
        color: 0x151c24,
        roughness: 0.5,
        metalness: 0.75
    });
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.12, 0.14), housingMaterial);
    housing.position.y = 0.7;
    housing.castShadow = true;
    housing.receiveShadow = true;
    root.add(housing);

    const segments = [];
    for (let index = 0; index < SEGMENT_COUNT; index += 1) {
        const material = new THREE.MeshStandardMaterial({
            color: 0x26313d,
            emissive: 0x000000,
            emissiveIntensity: 0,
            roughness: 0.28,
            metalness: 0.2
        });
        const segment = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.035), material);
        segment.position.set(0, 0.34 + index * 0.18, 0.085);
        root.add(segment);
        segments.push(segment);
    }

    const light = new THREE.PointLight(0xff3b30, 0.34, 3.2, 2);
    light.position.set(0, 0.85, 0.25);
    light.castShadow = false;
    root.add(light);
    root.userData.segments = segments;
    root.userData.statusLight = light;
    return root;
}

export function updateBaseAtmosphereIndicator(root, status, elapsedSeconds = 0, visible = true) {
    if (!root?.userData?.isBaseAtmosphereIndicator || !status) return false;
    root.visible = Boolean(visible);
    const color = new THREE.Color(status.color);
    const activeSegments = Math.ceil(Math.max(0, Math.min(1, status.pressure)) * SEGMENT_COUNT);
    root.userData.segments.forEach((segment, index) => {
        const active = index < activeSegments;
        segment.material.color.set(active ? status.color : 0x26313d);
        segment.material.emissive.set(active ? status.color : 0x000000);
        segment.material.emissiveIntensity = active ? 1.65 : 0;
    });
    const pulse = status.state === 'leaking'
        ? 0.55 + Math.sin(elapsedSeconds * 7.5) * 0.25
        : 0.36 + Math.sin(elapsedSeconds * 2.4) * 0.08;
    root.userData.statusLight.color.copy(color);
    root.userData.statusLight.intensity = Math.max(0.08, pulse);
    root.userData.atmosphereStatus = status.state;
    root.userData.statusLabel = status.label;
    return true;
}

export function disposeBaseAtmosphereIndicator(root) {
    if (!root) return;
    root.traverse((object) => {
        object.geometry?.dispose?.();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material?.dispose?.();
    });
    root.removeFromParent?.();
}
