import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { assetUrl } from './assetUrl.js';

// docs/armory-and-class-weapons-worklog.md — gltf-transform's optimize pass applies
// EXT_meshopt_compression; GLTFLoader throws without this registered first.
function createGltfLoader() {
    return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
}

const MODEL_CONFIG = {
    cybersnail: { url: '/3d/runtime/cyber-snail.glb', height: 0.72, yaw: -Math.PI / 2 },
    cryosnail: { url: '/3d/runtime/cyber-snail.glb', height: 0.76, yaw: -Math.PI / 2, tint: 0x9bdcff },
    sporesnail: { url: '/3d/runtime/new3ds/sporesnail.glb', height: 0.78, yaw: -Math.PI / 2 },
    fungal_spore_vent: { url: '/3d/runtime/new3ds/fungal_spore_vent.glb', height: 0.82, yaw: 0 },
    spore_mortar: { url: '/3d/runtime/new3ds/spore_mortar.glb', height: 1.05, yaw: 0 },
    // Boss exports face opposite their travel axis, so turn their model roots
    // 180 degrees relative to the smaller snail variants.
    boss_cybersnail: { url: '/3d/runtime/cyber-snail-boss.glb', height: 1.65, yaw: Math.PI / 2 },
    boss_cryosnail: { url: '/3d/runtime/cryo-snail-boss.glb', height: 1.8, yaw: Math.PI / 2 },
    boss_sporesnail: { url: '/3d/runtime/spore-snail-boss.glb', height: 1.95, yaw: Math.PI / 2 },
    crawler: { url: '/3d/runtime/parasite.glb', height: 1.15, yaw: Math.PI },
    // The stalker export faces backward relative to its movement direction.
    // Rotate it another 180 degrees around the vertical axis from its old PI
    // correction; normalized, that leaves the model-local yaw at zero.
    mycelium_stalker: { url: '/3d/runtime/bio-stalker.glb', height: 1.2, yaw: 0 },
    boss_queen: { url: '/3d/runtime/queen.glb', height: 2.35, yaw: Math.PI }
};

const templates = new Map();
const LOCOMOTION_URL = '/3d/scouting-scout/Scout.game.glb';

export function hasEnemy3dModel(type) {
    return Boolean(MODEL_CONFIG[type]);
}

function loadTemplate(url) {
    if (!templates.has(url)) {
        const promise = createGltfLoader().loadAsync(assetUrl(url)).catch((err) => {
            templates.delete(url);
            throw err;
        });
        templates.set(url, promise);
    }
    return templates.get(url);
}

function normalizeRoot(root, height) {
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = height / Math.max(size.y, 1e-6);
    root.scale.multiplyScalar(scale);
    root.updateMatrixWorld(true);
    const scaled = new THREE.Box3().setFromObject(root);
    const center = scaled.getCenter(new THREE.Vector3());
    root.position.set(-center.x, -scaled.min.y, -center.z);
}

export async function createEnemy3dVisual(type) {
    const config = MODEL_CONFIG[type];
    if (!config) return null;
    const [gltf, locomotion] = await Promise.all([
        loadTemplate(config.url),
        type === 'crawler' ? loadTemplate(LOCOMOTION_URL) : Promise.resolve(null)
    ]);
    const model = cloneSkeleton(gltf.scene);
    const root = new THREE.Group();
    root.name = `Enemy3d:${type}`;
    root.add(model);
    normalizeRoot(model, config.height);
    model.rotation.y = config.yaw;
    model.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = false;
        object.frustumCulled = false;
        if (config.tint && object.material) {
            object.material = object.material.clone();
            object.material.color?.multiply(new THREE.Color(config.tint));
        }
    });
    root.scale.setScalar(0.05);
    let mixer = null;
    const embeddedClip = gltf.animations?.find((clip) => /walk|run|idle/i.test(clip.name)) ?? gltf.animations?.[0];
    if (embeddedClip) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(embeddedClip).play();
    } else if (locomotion) {
        const source = locomotion.animations.find((clip) => clip.name === 'run');
        if (source) {
            const clip = source.clone();
            for (const track of clip.tracks) {
                track.name = track.name.replace('mixamorig1', 'mixamorig');
                if (!/Hips\.position$/i.test(track.name) || track.getValueSize() !== 3) continue;
                const anchorX = track.values[0];
                const anchorY = track.values[1];
                for (let index = 0; index < track.values.length; index += 3) {
                    track.values[index] = anchorX;
                    track.values[index + 1] = anchorY;
                }
            }
            mixer = new THREE.AnimationMixer(model);
            mixer.clipAction(clip).play();
        }
    }
    return { root, mixer, age: 0, yaw: 0, lastX: null, lastZ: null };
}

export function updateEnemy3dVisual(visual, sprite, delta, time = 0) {
    if (!visual?.root || !sprite?.parent) return;
    if (visual.root.parent !== sprite.parent) sprite.parent.add(visual.root);
    const x = sprite.position.x;
    const z = sprite.position.z;
    if (visual.lastX != null) {
        const dx = x - visual.lastX;
        const dz = z - visual.lastZ;
        if (Math.hypot(dx, dz) > 1e-4) {
            const target = Math.atan2(dx, dz);
            const difference = Math.atan2(Math.sin(target - visual.yaw), Math.cos(target - visual.yaw));
            visual.yaw += difference * (1 - Math.exp(-delta * 12));
        }
    }
    visual.lastX = x;
    visual.lastZ = z;
    visual.age += delta;
    visual.mixer?.update(delta);
    const emerge = THREE.MathUtils.smoothstep(visual.age, 0, 0.65);
    const dead = Boolean(sprite.userData?.burstTriggered);
    const deathScale = dead ? Math.max(0, 1 - (sprite.userData.burstTimer ?? 0) * 2.5) : 1;
    visual.root.visible = deathScale > 0 && (sprite.material?.opacity ?? 1) > 0.03;
    visual.root.position.set(x, sprite.position.y - (1 - emerge) * 0.55, z);
    visual.root.rotation.y = visual.yaw;
    visual.root.rotation.z = Math.sin(time * 7 + (sprite.userData?.phase ?? 0)) * 0.035;
    visual.root.scale.setScalar(emerge * deathScale);
}

export function disposeEnemy3dVisual(visual) {
    visual?.root?.removeFromParent();
}
