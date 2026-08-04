import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { assetUrl } from './assetUrl.js';

export const WORLD_3D_MODELS = Object.freeze({
    broken_scout_ship: { url: '/3d/runtime/broken-scout-ship.glb', height: 1.35, yaw: 0 },
    broken_tank_ship: { url: '/3d/runtime/broken-tank-ship.glb', height: 1.35, yaw: 0 },
    broken_engineer_ship: { url: '/3d/runtime/broken-engineer-ship.glb', height: 1.35, yaw: 0 },
    base_console: { url: '/3d/runtime/console.glb', height: 1.05, yaw: 0 },
    o2_generator: { url: '/3d/runtime/o2-generator.glb', height: 1.2, yaw: 0 },
    hull_matrix: { url: '/3d/runtime/hull-matrix.glb', height: 1.15, yaw: 0 },
    radar: { url: '/3d/runtime/radar.glb', height: 1.05, yaw: 0 },
    fusion_generator: { url: '/3d/runtime/fusion-generator.glb', height: 1.1, yaw: 0 },
    basic_pile: { url: '/3d/runtime/basic-pile.glb', height: 0.42, yaw: 0 },
    storage_locker: { url: '/3d/runtime/storage-locker.glb', height: 1.25, yaw: 0 },
    frozen_tanker: { url: '/3d/runtime/frozen-tanker.glb', height: 1.05, yaw: 0 }
});

const templates = new Map();

function loadTemplate(url) {
    if (!templates.has(url)) {
        templates.set(url, new GLTFLoader().loadAsync(assetUrl(url)));
    }
    return templates.get(url);
}

export async function createWorld3dModel(type) {
    const config = WORLD_3D_MODELS[type];
    if (!config) return null;
    const gltf = await loadTemplate(config.url);
    const model = cloneSkeleton(gltf.scene);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    model.scale.multiplyScalar(config.height / Math.max(size.y, 1e-6));
    model.updateMatrixWorld(true);
    const scaled = new THREE.Box3().setFromObject(model);
    const center = scaled.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -scaled.min.y, -center.z);
    model.rotation.y = config.yaw;
    model.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
        object.frustumCulled = false;
    });
    const root = new THREE.Group();
    root.name = `World3d:${type}`;
    root.add(model);
    return root;
}

// Keep a replacement attached to the sprite that still owns gameplay state.
// The sprite can move after a GLB request starts (the O2 generator's boot
// animation does exactly that), so copying its transform only once at load
// completion can strand the model below the floor.
export function syncWorld3dReplacement(source, { scale = 1, visible } = {}) {
    const root = source?.userData?.world3dRoot;
    if (!root) return false;
    root.position.copy(source.position);
    root.rotation.y = source.material?.rotation ?? 0;
    root.scale.setScalar(Math.max(0, Number.isFinite(scale) ? scale : 1));
    root.visible = visible ?? Boolean(source.userData.world3dDesiredVisible);
    return true;
}
