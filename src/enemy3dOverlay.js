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
    alien_proto_crawler: { url: '/3d/runtime/new3ds/alien_proto_crawler.glb', height: 0.95, yaw: 0 },
    alien_proto_crawler_A: { url: '/3d/runtime/new3ds/alien_proto_crawler_A.glb', height: 0.95, yaw: 0 },
    alien_proto_spitter: { url: '/3d/runtime/new3ds/alien_proto_crawler_A.glb', height: 0.95, yaw: 0 },
    sentinel: { url: '/3d/runtime/new3ds/sentinel.glb', height: 1.25, yaw: 0 },
    sentinel_A: { url: '/3d/runtime/new3ds/sentinel_A.glb', height: 1.25, yaw: 0 },
    sentinel_B: { url: '/3d/runtime/new3ds/sentinel_B.glb', height: 1.25, yaw: 0 },
    mycelium_stalker: { url: '/3d/runtime/community/scout_xeno_stalker.glb', height: 1.35, yaw: 0 },
    bio_charger: { url: '/3d/runtime/community/scout_xeno_stalker.glb', height: 1.45, yaw: 0 },
    boss_queen: { url: '/3d/runtime/queen.glb', height: 2.35, yaw: Math.PI }
};

const templates = new Map();
const LOCOMOTION_URL = '/3d/scouting-scout/Scout.game.glb';
const RIGGED_LOCOMOTION_TYPES = new Set(['crawler', 'mycelium_stalker', 'bio_charger']);

export function hasEnemy3dModel(type) {
    return Boolean(MODEL_CONFIG[type]);
}

export function usesRiggedEnemyLocomotion(type) {
    return RIGGED_LOCOMOTION_TYPES.has(type);
}

// Boss/queen encounters are rare, once-per-run, and already a big cinematic
// moment -- a lazy-load pause there is far less disruptive than the same
// pause mid-firefight against a common enemy. Preload only the regular
// roster; bosses keep the original lazy path.
const PRELOAD_TYPES = ['cybersnail', 'sporesnail', 'fungal_spore_vent', 'spore_mortar', 'crawler', 'mycelium_stalker'];

// Enemy GLBs used to load lazily on each type's first spawn -- fine on paper
// since it's async, but GLTFLoader's parse step (meshopt decompress, skeleton
// build) runs synchronously once the fetch resolves and can run 2-5s per
// model. Confirmed live via a session log: a bio-stalker.glb fetch finishing
// in 4183ms lined up with a 4086ms main-thread freeze right after, mid-firefight.
//
// Parsing the GLB only gets the model into memory -- the WebGL shader program
// for its material doesn't compile until the model is actually rendered for
// the first time, which is a *separate* stall parsing never touched. Confirmed
// live: even with the model preloaded below, a real spawn's first appearance
// still cost ~9.4s of getProgramParameter self-time in a 5s combat profile
// (docs/log2-ui-transitions-and-menu-isolation-plan-2026-08-19.md #7). Each
// type below now also gets a throwaway visual built and run through
// renderer.compileAsync() -- never added to the live scene graph, passed
// directly as compileAsync's own scene-to-precompile argument with the real
// game scene passed separately for lighting context, so nothing is visible or
// touches gameplay state -- before moving to the next type.
//
// Fired from main.js as a background task once the title screen is already up
// and interactive (see finishBootDiagnostics), never awaited by boot. A real
// delay between models (not just a microtask yield -- tried that first, it
// still left the page feeling frozen between loads) gives the UI thread
// actual breathing room, at the cost of taking longer in wall-clock time to
// finish. setupEnemy3dCosmeticOverlay's existing lazy-load path still covers
// anything not done in time, and all boss types.
export async function preloadEnemy3dTemplates(game = null) {
    const canPrewarmShaders = Boolean(game?.renderer?.compileAsync && game?.camera && game?.scene);
    for (const type of PRELOAD_TYPES) {
        const url = MODEL_CONFIG[type]?.url;
        try {
            if (url) await loadTemplate(url);
            // crawler and stalker monsters fall back to this shared run-cycle when their GLB
            // has no embedded clip (see createEnemy3dVisual) -- preload it too.
            if (type === 'crawler' || type === 'mycelium_stalker') await loadTemplate(LOCOMOTION_URL);
        } catch (err) {
            console.warn(`[enemy-3d-overlay] preload failed for ${type}`, err);
        }

        if (canPrewarmShaders) {
            try {
                const visual = await createEnemy3dVisual(type);
                if (visual?.root) {
                    await game.renderer.compileAsync(visual.root, game.camera, game.scene);
                }
            } catch (err) {
                console.warn(`[enemy-3d-overlay] shader prewarm failed for ${type}`, err);
            }
        }

        await new Promise((resolve) => setTimeout(resolve, 1800));
    }
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
    const isHumanoidMonster = usesRiggedEnemyLocomotion(type);
    const [gltf, locomotion] = await Promise.all([
        loadTemplate(config.url),
        isHumanoidMonster ? loadTemplate(LOCOMOTION_URL) : Promise.resolve(null)
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
    let idleAction = null;
    let locomotionAction = null;

    // The hole-spawned stalker model contains only a "hangingIdle" clip. It
    // shares the player's Mixamo skeleton, so selecting that embedded clip as
    // its locomotion left the legs dangling while the enemy slid at the
    // player. Retarget the same authored idle/run pack used by the player's
    // rig, and blend it from rest to travel based on actual world movement.
    if (isHumanoidMonster && locomotion) {
        try {
            mixer = new THREE.AnimationMixer(model);
            const retarget = (name) => {
                const source = locomotion.animations.find((clip) => clip.name === name);
                if (!source) return null;
                const clip = source.clone();
                for (const track of clip.tracks) {
                    track.name = track.name.replace('mixamorig1', 'mixamorig');
                }
                // Compatible Mixamo rigs can share bone rotations. Source-rig
                // position/scale tracks contain different limb measurements
                // and would stretch or displace the monster mesh.
                clip.tracks = clip.tracks.filter((track) => {
                    const separator = track.name.lastIndexOf('.');
                    const nodeName = separator >= 0 ? track.name.slice(0, separator) : track.name;
                    const property = separator >= 0 ? track.name.slice(separator + 1) : '';
                    return property === 'quaternion' && Boolean(model.getObjectByName(nodeName));
                });
                return clip.tracks.length > 0 ? clip : null;
            };
            const idleClip = retarget('idle') ?? retarget('heroIdle');
            const travelClip = retarget('run') ?? retarget('walk');
            if (idleClip) idleAction = mixer.clipAction(idleClip).setEffectiveWeight(1).play();
            if (travelClip) locomotionAction = mixer.clipAction(travelClip).setEffectiveWeight(0).play();
            if (!idleAction && !locomotionAction) mixer = null;
        } catch {
            mixer = null;
            idleAction = null;
            locomotionAction = null;
        }
    }

    if (!mixer) {
        const embeddedClip = gltf.animations?.find((clip) => /walk|run|idle|layer0/i.test(clip.name)) ?? gltf.animations?.[0];
        if (embeddedClip) {
            try {
                mixer = new THREE.AnimationMixer(model);
                locomotionAction = mixer.clipAction(embeddedClip).play();
            } catch {
                mixer = null;
                locomotionAction = null;
            }
        }
    }
    return {
        root,
        mixer,
        idleAction,
        locomotionAction,
        locomotionWeight: 0,
        age: 0,
        yaw: 0,
        lastX: null,
        lastZ: null,
        hasMixer: Boolean(mixer)
    };
}

export function updateEnemy3dVisual(visual, sprite, delta, time = 0) {
    if (!visual?.root || !sprite?.parent) return;
    if (visual.root.parent !== sprite.parent) sprite.parent.add(visual.root);
    const x = sprite.position.x;
    const z = sprite.position.z;
    let speed = 0;
    if (visual.lastX != null) {
        const dx = x - visual.lastX;
        const dz = z - visual.lastZ;
        const dist = Math.hypot(dx, dz);
        speed = delta > 0 ? dist / delta : 0;
        if (dist > 1e-4) {
            const target = Math.atan2(dx, dz);
            const difference = Math.atan2(Math.sin(target - visual.yaw), Math.cos(target - visual.yaw));
            visual.yaw += difference * (1 - Math.exp(-delta * 12));
        }
    }
    visual.lastX = x;
    visual.lastZ = z;
    visual.age += delta;
    const emerge = THREE.MathUtils.smoothstep(visual.age, 0, 0.65);
    const dead = Boolean(sprite.userData?.burstTriggered);
    const deathScale = dead ? Math.max(0, 1 - (sprite.userData.burstTimer ?? 0) * 2.5) : 1;
    visual.root.visible = deathScale > 0 && (sprite.material?.opacity ?? 1) > 0.03;

    // Procedural run locomotion / stride bob if moving
    const isMoving = speed > 0.1 && !sprite.userData?.holeEmergence;
    if (visual.idleAction && visual.locomotionAction) {
        visual.locomotionWeight = THREE.MathUtils.damp(
            visual.locomotionWeight ?? 0,
            isMoving ? 1 : 0,
            12,
            delta
        );
        visual.idleAction.setEffectiveWeight(1 - visual.locomotionWeight);
        visual.locomotionAction.setEffectiveWeight(visual.locomotionWeight);
        visual.locomotionAction.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / 2.3, 0.7, 1.45));
    }
    visual.mixer?.update(delta);
    const runBounce = isMoving ? Math.abs(Math.sin(visual.age * 12)) * 0.12 : 0;
    const runLean = isMoving ? 0.14 : 0;
    const runTilt = isMoving ? Math.sin(visual.age * 6) * 0.06 : 0;

    visual.root.position.set(x, sprite.position.y - (1 - emerge) * 0.55 + runBounce, z);
    visual.root.rotation.y = visual.yaw;
    visual.root.rotation.x = runLean;
    visual.root.rotation.z = Math.sin(time * 7 + (sprite.userData?.phase ?? 0)) * 0.035 + runTilt;
    visual.root.scale.setScalar(emerge * deathScale);
}

export function disposeEnemy3dVisual(visual) {
    visual?.root?.removeFromParent();
}
