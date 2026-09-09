import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { assetUrl } from './assetUrl.js';

function createGltfLoader() {
    return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
}

const templateCache = new Map();

export async function loadWandererGltf(url) {
    if (!url) return null;
    const resolvedUrl = assetUrl(url);
    if (!templateCache.has(resolvedUrl)) {
        const promise = createGltfLoader().loadAsync(resolvedUrl).catch((err) => {
            templateCache.delete(resolvedUrl);
            throw err;
        });
        templateCache.set(resolvedUrl, promise);
    }
    return templateCache.get(resolvedUrl);
}

/**
 * Creates a 3D Wanderer / Companion scene node with animation mixer.
 */
export async function createWanderer3dInstance({
    glbUrl = '/3d/runtime/community/scout_foxhole_shadow.glb',
    actionKey = 'salute',
    scale = 0.85
} = {}) {
    const group = new THREE.Group();
    group.name = 'wanderer_3d_instance';

    try {
        const gltf = await loadWandererGltf(glbUrl);
        if (gltf && gltf.scene) {
            const clonedScene = cloneSkeleton(gltf.scene);
            const ownedMaterials = new Set();
            clonedScene.updateMatrixWorld(true);
            const bounds = new THREE.Box3().setFromObject(clonedScene);
            const height = Math.max(0.001, bounds.max.y - bounds.min.y);
            clonedScene.scale.multiplyScalar((1.8 * scale / 0.85) / height);
            clonedScene.updateMatrixWorld(true);
            bounds.setFromObject(clonedScene);
            const center = bounds.getCenter(new THREE.Vector3());
            clonedScene.position.add(new THREE.Vector3(-center.x, -bounds.min.y, -center.z));

            // Traverse and ensure shadows/materials
            clonedScene.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material) {
                        const cloneMaterial = (source) => {
                            const material = source.clone();
                            ownedMaterials.add(material);
                            return material;
                        };
                        child.material = Array.isArray(child.material)
                            ? child.material.map(cloneMaterial) : cloneMaterial(child.material);
                    }
                }
            });

            group.add(clonedScene);

            // Animation mixer
            let mixer = null;
            let currentAction = null;
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(clonedScene);
                const clip = gltf.animations.find((a) => a.name === actionKey) || gltf.animations[0];
                if (clip) {
                    currentAction = mixer.clipAction(clip);
                    currentAction.play();
                }
            }

            return {
                root: group,
                scene: clonedScene,
                mixer,
                action: currentAction,
                update: (delta) => {
                    if (mixer) mixer.update(delta);
                },
                dispose: () => {
                    if (mixer) mixer.stopAllAction();
                    mixer?.uncacheRoot(clonedScene);
                    for (const material of ownedMaterials) material.dispose();
                    ownedMaterials.clear();
                }
            };
        }
    } catch (err) {
        console.warn('[WANDERER-3D] Failed to load 3D GLB, using fallback mesh:', err);
    }

    // Fallback mesh if GLB fails
    const geom = new THREE.CylinderGeometry(0.3, 0.35, 1.6, 12);
    const mat = new THREE.MeshStandardMaterial({ color: 0x3388aa, roughness: 0.5 });
    const fallbackMesh = new THREE.Mesh(geom, mat);
    fallbackMesh.position.y = 0.8;
    group.add(fallbackMesh);

    return {
        root: group,
        scene: group,
        mixer: null,
        action: null,
        update: () => {},
        dispose: () => {
            geom.dispose();
            mat.dispose();
        }
    };
}
