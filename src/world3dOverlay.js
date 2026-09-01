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
    frozen_tanker: { url: '/3d/runtime/frozen-tanker.glb', height: 1.05, yaw: 0 },
    bunker_junk_rare: { url: '/3d/runtime/new3ds/bunker_junk_rare.glb', height: 0.48, yaw: 0 },
    bunker_junk_uncommon: { url: '/3d/runtime/new3ds/bunker_junk_uncommon.glb', height: 0.42, yaw: 0 },
    prop_bunker_supplies: { url: '/3d/runtime/new3ds/prop_bunker_supplies.glb', height: 0.72, yaw: 0 },
    prop_specimen_tank: { url: '/3d/runtime/new3ds/prop_specimen_tank.glb', height: 1.35, yaw: 0 },
    prop_broken_specimen_tank: { url: '/3d/runtime/new3ds/prop_broken_specimen_tank.glb', height: 1.15, yaw: 0 },
    prop_surgical_cart: { url: '/3d/runtime/new3ds/prop_surgical_cart.glb', height: 0.8, yaw: 0 },
    prop_medical_bed: { url: '/3d/runtime/new3ds/prop_medical_bed.glb', height: 0.7, yaw: 0 },
    prop_diagnostic_console: { url: '/3d/runtime/new3ds/prop_diagnostic_console.glb', height: 1.05, yaw: 0 },
    prop_security_barricade: { url: '/3d/runtime/new3ds/prop_security_barricade.glb', height: 0.82, yaw: 0 },
    prop_conduit_hub: { url: '/3d/runtime/new3ds/prop_conduit_hub.glb', height: 0.78, yaw: 0 },
    prop_cave_bones: { url: '/3d/runtime/new3ds/prop_cave_bones.glb', height: 0.34, yaw: 0 },
    prop_cave_queen_throne: { url: '/3d/runtime/new3ds/prop_cave_queen_throne.glb', height: 2.0, yaw: 0 },
    prop_biomech_arch: { url: '/3d/runtime/new3ds/prop_biomech_arch.glb', height: 2.35, yaw: 0 },
    prop_ammo_crate_stack: { url: '/3d/runtime/new3ds/prop_ammo_crate_stack.glb', height: 0.85, yaw: 0 },
    prop_biomech_flesh_locker: { url: '/3d/runtime/new3ds/prop_biomech_flesh_locker.glb', height: 1.35, yaw: 0 },
    prop_biomech_incubator: { url: '/3d/runtime/new3ds/prop_biomech_incubator.glb', height: 1.45, yaw: 0 },
    prop_biomech_neural_synapse: { url: '/3d/runtime/new3ds/prop_biomech_neural_synapse.glb', height: 1.40, yaw: 0 },
    prop_biomech_respirator: { url: '/3d/runtime/new3ds/prop_biomech_respirator.glb', height: 1.30, yaw: 0 },
    prop_biomech_sphincter_trap: { url: '/3d/runtime/new3ds/prop_biomech_sphincter_trap.glb', height: 0.80, yaw: 0 },
    prop_biomech_triage_cradle: { url: '/3d/runtime/new3ds/prop_biomech_triage_cradle.glb', height: 0.95, yaw: 0 },
    prop_fabricator_workstation: { url: '/3d/runtime/new3ds/prop_fabricator_workstation.glb', height: 1.20, yaw: 0 },
    prop_laser_trap_emitter: { url: '/3d/runtime/new3ds/prop_laser_trap_emitter.glb', height: 0.75, yaw: 0 },
    prop_o2_filter_vat: { url: '/3d/runtime/new3ds/prop_o2_filter_vat.glb', height: 1.40, yaw: 0 },
    prop_tesla_coil_node: { url: '/3d/runtime/new3ds/prop_tesla_coil_node.glb', height: 1.45, yaw: 0 },
    prop_vital_monitor: { url: '/3d/runtime/new3ds/prop_vital_monitor.glb', height: 1.10, yaw: 0 },
    prop_base_defense_turret: { url: '/3d/runtime/new3ds/prop_base_defense_turret.glb', height: 1.25, yaw: 0 },
    prop_body_empty_exosuit: { url: '/3d/runtime/new3ds/prop_body_empty_exosuit.glb', height: 0.75, yaw: 0 },
    prop_body_human_frozen: { url: '/3d/runtime/new3ds/prop_body_human_frozen.glb', height: 0.55, yaw: 0 },
    cybersnail_dead: { url: '/3d/runtime/new3ds/cybersnail_dead.glb', height: 0.50, yaw: 0 },
    npc_alien_rhun: { url: '/3d/runtime/new3ds/npc_alien_rhun.glb', height: 1.95, yaw: 0 },
    npc_alien_vey: { url: '/3d/runtime/new3ds/npc_alien_vey.glb', height: 1.70, yaw: 0 },
    npc_civilian_miner: { url: '/3d/runtime/new3ds/npc_civilian_miner.glb', height: 1.80, yaw: 0 },
    npc_civilian_researcher: { url: '/3d/runtime/new3ds/npc_civilian_researcher.glb', height: 1.75, yaw: 0 },
    npc_martha: { url: '/3d/runtime/new3ds/npc_martha.glb', height: 1.75, yaw: 0 },
    npc_kaelen: { url: '/3d/runtime/new3ds/npc_kaelen.glb', height: 1.80, yaw: 0 },
    npc_briggs: { url: '/3d/runtime/new3ds/chassis_trench_warden_heavy.glb', height: 1.85, yaw: 0 },
    npc_val: { url: '/3d/runtime/new3ds/npc_val.glb', height: 1.75, yaw: 0 },
    npc_nahl: { url: '/3d/runtime/new3ds/npc_nahl.glb', height: 1.75, yaw: 0 },
    npc_aria: { url: '/3d/runtime/new3ds/npc_aria.glb', height: 1.80, yaw: 0 },
    npc_queen: { url: '/3d/runtime/new3ds/npc_queen.glb', height: 2.10, yaw: 0 },
    prop_camp_cookfire: { url: '/3d/runtime/new3ds/prop_fabricator_workstation.glb', height: 0.85, yaw: 0 },
    prop_camp_crates: { url: '/3d/runtime/new3ds/prop_bunker_supplies.glb', height: 0.75, yaw: 0 },
    prop_camp_sandbags: { url: '/3d/runtime/new3ds/prop_security_barricade.glb', height: 0.82, yaw: 0 }
});

const templates = new Map();
export const WORLD_3D_FACING_YAW = Math.PI;

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
        // Unlike camera-facing billboard sprites elsewhere in this codebase
        // (whose bounding-sphere math against a THREE.Sprite is unreliable,
        // hence their frustumCulled = false), these are static-position GLB
        // meshes with a bounding box already computed above via
        // Box3().setFromObject(). Frustum culling is safe here and matters
        // at scale: as more chunks/camps/hives populate authored-room and
        // signature-prop GLBs (see docs/sprint-23-room-juice-and-dressing-
        // assets.md), leaving every one of them permanently submitted to
        // the renderer regardless of camera visibility compounds badly.
        if (!object.geometry.boundingSphere) object.geometry.computeBoundingSphere();
        object.frustumCulled = true;
    });
    const root = new THREE.Group();
    root.name = `World3d:${type}`;
    root.add(model);
    return root;
}

export function hasWorld3dModel(type) {
    return Boolean(WORLD_3D_MODELS[type]);
}

export const COMMON_WORLD_3D_MODEL_TYPES = Object.freeze([
    'broken_scout_ship',
    'broken_tank_ship',
    'broken_engineer_ship',
    'base_console',
    'o2_generator',
    'hull_matrix',
    'radar',
    'fusion_generator',
    'basic_pile',
    'storage_locker',
    'frozen_tanker',
    'bunker_junk_rare',
    'bunker_junk_uncommon',
    'prop_bunker_supplies',
    'prop_security_barricade',
    'prop_conduit_hub',
    'prop_specimen_tank',
    'prop_ammo_crate_stack',
    'prop_base_defense_turret',
    'prop_body_empty_exosuit',
    'prop_body_human_frozen',
    'cybersnail_dead',
    'npc_martha',
    'npc_kaelen',
    'npc_briggs',
    'npc_alien_rhun',
    'npc_alien_vey',
    'npc_nahl',
    'npc_val',
    'npc_queen'
]);

export async function preloadWorld3dModels(types = COMMON_WORLD_3D_MODEL_TYPES) {
    const promises = [];
    for (const type of types) {
        const config = WORLD_3D_MODELS[type];
        if (config?.url) {
            promises.push(loadTemplate(config.url).catch(() => null));
        }
    }
    await Promise.allSettled(promises);
}

// Keep a replacement attached to the sprite that still owns gameplay state.
// The sprite can move after a GLB request starts (the O2 generator's boot
// animation does exactly that), so copying its transform only once at load
// completion can strand the model below the floor.
export function syncWorld3dReplacement(source, { scale = 1, visible } = {}) {
    const root = source?.userData?.world3dRoot;
    if (!root) return false;
    root.position.copy(source.position);
    root.rotation.y = (source.material?.rotation ?? 0) + WORLD_3D_FACING_YAW;
    root.scale.setScalar(Math.max(0, Number.isFinite(scale) ? scale : 1));
    root.visible = visible ?? Boolean(source.userData.world3dDesiredVisible);
    return true;
}

