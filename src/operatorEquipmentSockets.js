import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { assetUrl } from './assetUrl.js';
import { getEquipmentDefinition } from './data/equipmentDefinitions.js';

export const MOD_GLB_MAP = Object.freeze({
    '4140': '/3d/runtime/new3ds/mod_cryo_capacitor.glb', '4141': '/3d/runtime/new3ds/mod_magnetic_scavenger.glb',
    '4142': '/3d/runtime/new3ds/mod_bio_hazard_filter.glb', '4143': '/3d/runtime/new3ds/mod_kinetic_impact.glb',
    '4144': '/3d/runtime/new3ds/mod_thermal_heat_exchanger.glb', '4145': '/3d/runtime/new3ds/mod_echo_location_transceiver.glb',
    '4146': '/3d/runtime/new3ds/mod_symbiotic_adrenaline_pump.glb', '4147': '/3d/runtime/new3ds/mod_zero_point_flux.glb',
    '4160': '/3d/runtime/new3ds/mod_ballast_plating.glb', '4161': '/3d/runtime/new3ds/mod_scrap_furnace.glb',
    '4162': '/3d/runtime/new3ds/mod_queens_bane.glb', '4163': '/3d/runtime/new3ds/mod_archivist_lens.glb',
    '4164': '/3d/runtime/new3ds/mod_shard_conduit.glb', '4165': '/3d/runtime/new3ds/mod_duplicate_refiner.glb',
    '4166': '/3d/runtime/new3ds/mod_pressure_seal.glb', '4167': '/3d/runtime/new3ds/mod_deep_anchor.glb'
});

const cache = new Map();
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const SOCKETS = Object.freeze({
    chest_center: { bones: ['Spine2', 'Spine1', 'Spine'], offset: [0, 0.04, 0.20], rotation: [0, 0, 0], size: .35 },
    back_upper: { bones: ['Spine2', 'Spine1', 'Spine'], offset: [0, 0.05, -0.22], rotation: [0, Math.PI, 0], size: .32 },
    helmet_side: { bones: ['Head'], offset: [.16, 0.02, .04], rotation: [0, 0, 0], size: .22 },
    shoulder_left: { bones: ['LeftShoulder', 'LeftArm'], offset: [0, .05, .09], rotation: [0, 0, 0], size: .24 },
    forearm_left: { bones: ['LeftForeArm', 'LeftArm'], offset: [0, .03, .07], rotation: [0, 0, 0], size: .22 },
    forearm_right: { bones: ['RightForeArm', 'RightArm'], offset: [0, .03, .07], rotation: [0, 0, 0], size: .22 },
    waist_back: { bones: ['Hips', 'Spine'], offset: [0, .09, -.19], rotation: [0, Math.PI, 0], size: .26 }
});

const CLASS_SOCKET_CALIBRATION = Object.freeze({
    SCOUT: Object.freeze({
        chest_center: { offset: [0, 0, 0.025], scale: 0.90 },
        back_upper: { offset: [0, 0.01, -0.018], scale: 0.90 },
        shoulder_left: { offset: [-0.006, 0.01, 0.018], scale: 0.86 },
        waist_back: { offset: [0, 0, -0.015], scale: 0.88 }
    }),
    TANK: Object.freeze({
        chest_center: { offset: [0, 0.015, 0.055], scale: 1.08 },
        back_upper: { offset: [0, 0.025, -0.05], scale: 1.06 },
        shoulder_left: { offset: [-0.015, 0.025, 0.045], scale: 1.02 },
        waist_back: { offset: [0, 0.025, -0.04], scale: 1.04 }
    }),
    ENGINEER: Object.freeze({
        chest_center: { offset: [0, 0.008, 0.035], scale: 0.94 },
        back_upper: { offset: [0, 0.035, -0.032], scale: 0.96 },
        helmet_side: { offset: [0.018, 0.018, 0.012], scale: 0.90 },
        waist_back: { offset: [0, 0.012, -0.025], scale: 0.94 }
    })
});

// Meshes have materially different authored bounds even after normalization.
// These final item trims prevent a large plate and a small lens mounted to the
// same bone from being treated as if they occupied identical volume.
const ITEM_SOCKET_CALIBRATION = Object.freeze({
    '4140': { scale: 0.88, offset: [0, 0.012, 0.012] },
    '4141': { scale: 0.92, offset: [0, 0, -0.012] },
    '4142': { scale: 0.90, offset: [0, 0.006, 0.018] },
    '4143': { scale: 0.82, offset: [0, 0.008, 0.01] },
    '4144': { scale: 0.88, offset: [0, 0.018, -0.018] },
    '4145': { scale: 0.78, offset: [0.012, 0.006, 0.008] },
    '4146': { scale: 0.86, offset: [0, -0.006, 0.018] },
    '4147': { scale: 0.80, offset: [0, 0.006, 0.012] },
    '4160': { scale: 1.08, offset: [0, 0, 0.028] },
    '4161': { scale: 0.96, offset: [0, 0.012, -0.025] },
    '4162': { scale: 0.82, offset: [0, 0.008, 0.012] },
    '4163': { scale: 0.74, offset: [0.014, 0.008, 0.01] },
    '4164': { scale: 0.94, offset: [0, 0.016, -0.02] },
    '4165': { scale: 0.90, offset: [0, 0.005, -0.016] },
    '4166': { scale: 0.98, offset: [0, 0.004, 0.024] },
    '4167': { scale: 1.02, offset: [0, 0.014, -0.022] }
});

export function getOperatorEquipmentTransform({ classType = 'SCOUT', itemId, mount = 'chest_center' } = {}) {
    const base = SOCKETS[mount] ?? SOCKETS.chest_center;
    const classTrim = CLASS_SOCKET_CALIBRATION[String(classType).toUpperCase()]?.[mount] ?? {};
    const itemTrim = ITEM_SOCKET_CALIBRATION[String(itemId)] ?? {};
    const add = (index) => (base.offset[index] ?? 0)
        + (classTrim.offset?.[index] ?? 0)
        + (itemTrim.offset?.[index] ?? 0);
    return {
        bones: [...base.bones],
        offset: [add(0), add(1), add(2)],
        rotation: [...base.rotation],
        size: base.size * (classTrim.scale ?? 1) * (itemTrim.scale ?? 1)
    };
}

function findBone(root, suffixes) {
    let found = null;
    root.traverse((object) => {
        if (!found && object.isBone && suffixes.some((suffix) => object.name.endsWith(suffix))) found = object;
    });
    return found ?? root;
}

async function template(url) {
    if (!cache.has(url)) cache.set(url, loader.loadAsync(assetUrl(url)).catch((error) => { cache.delete(url); throw error; }));
    return cache.get(url);
}

export function createOperatorEquipmentController(root, { classType = 'SCOUT' } = {}) {
    const mounted = [null, null];
    const generations = [0, 0];
    return {
        async set(slot, itemId) {
            const index = Number(slot) === 2 ? 1 : 0;
            const generation = ++generations[index];
            if (mounted[index]) mounted[index].parent?.remove(mounted[index]);
            mounted[index] = null;
            const definition = getEquipmentDefinition(itemId);
            const url = MOD_GLB_MAP[String(itemId)];
            if (!definition?.mount?.startsWith('operator.') || !url) return;
            const mount = definition.mount.slice('operator.'.length);
            const socket = getOperatorEquipmentTransform({ classType, itemId, mount });
            const gltf = await template(url);
            if (generation !== generations[index]) return;
            const bone = findBone(root, socket.bones);
            root.updateMatrixWorld(true);
            const worldScale = bone.getWorldScale(new THREE.Vector3());
            const inverseScale = 1 / Math.max(Math.abs(worldScale.x), Math.abs(worldScale.y), Math.abs(worldScale.z), 1e-6);
            const anchor = new THREE.Group();
            anchor.name = `OperatorOverclockSocket${index + 1}`;
            anchor.userData.equipmentId = String(itemId);
            anchor.position.fromArray(socket.offset).multiplyScalar(inverseScale);
            anchor.rotation.fromArray(socket.rotation);
            anchor.scale.setScalar(inverseScale);
            const model = gltf.scene.clone(true);
            const bounds = new THREE.Box3().setFromObject(model);
            const maxDim = Math.max(...bounds.getSize(new THREE.Vector3()).toArray(), .001);
            model.scale.setScalar(socket.size / maxDim);
            model.updateMatrixWorld(true);
            const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
            model.position.sub(center);
            model.traverse((object) => { if (object.isMesh) { object.castShadow = true; object.frustumCulled = false; } });
            anchor.add(model);
            bone.add(anchor);
            mounted[index] = anchor;
        },
        dispose() {
            generations[0]++; generations[1]++;
            for (const anchor of mounted) anchor?.parent?.remove(anchor);
        }
    };
}
