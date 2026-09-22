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
    chest_center: { bones: ['Spine2', 'Spine1', 'Spine'], offset: [0, 0.03, 0.16], rotation: [0, 0, 0], size: .34 },
    back_upper: { bones: ['Spine2', 'Spine1', 'Spine'], offset: [0, 0.04, -0.18], rotation: [0, Math.PI, 0], size: .30 },
    helmet_side: { bones: ['Head'], offset: [.13, 0, .02], rotation: [0, 0, 0], size: .20 },
    shoulder_left: { bones: ['LeftShoulder', 'LeftArm'], offset: [0, .02, .06], rotation: [0, 0, 0], size: .20 },
    forearm_left: { bones: ['LeftForeArm', 'LeftArm'], offset: [0, .02, .04], rotation: [0, 0, 0], size: .18 },
    forearm_right: { bones: ['RightForeArm', 'RightArm'], offset: [0, .02, .04], rotation: [0, 0, 0], size: .18 },
    waist_back: { bones: ['Hips', 'Spine'], offset: [0, .08, -.16], rotation: [0, Math.PI, 0], size: .25 }
});

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

export function createOperatorEquipmentController(root) {
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
            const socket = SOCKETS[definition.mount.slice('operator.'.length)] ?? SOCKETS.chest_center;
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
