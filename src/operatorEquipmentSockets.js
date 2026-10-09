import * as THREE from 'three';
import { assetUrl } from './assetUrl.js';
import { getEquipmentDefinition } from './data/equipmentDefinitions.js';
import { MOD_GLB_MAP } from './data/operatorModelUrls.js';
import { createGltfLoader } from './gltfLoaderFactory.js';

// Defined in data/operatorModelUrls.js (Three.js-free); re-exported for existing importers.
export { MOD_GLB_MAP };


const cache = new Map();
const loader = createGltfLoader();
const SOCKETS = Object.freeze({
    chest_center: { bones: ['Spine2', 'Spine1', 'Spine'], offset: [0, 0.04, 0.20], rotation: [0, 0, 0], size: .35 },
    back_upper: { bones: ['Spine2', 'Spine1', 'Spine'], offset: [0, 0.05, -0.22], rotation: [0, Math.PI, 0], size: .32 },
    helmet_side: { bones: ['Head'], offset: [.16, 0.02, .04], rotation: [0, 0, 0], size: .27 },
    shoulder_left: { bones: ['LeftShoulder', 'LeftArm'], offset: [0, .05, .09], rotation: [0, 0, 0], size: .29 },
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
// Since Sprint 51 modules sit on the surface (fitEquipmentToSurface), so these
// trims only tune size; their offsets are no longer applied.
// These final item trims prevent a large plate and a small lens mounted to the
// same bone from being treated as if they occupied identical volume.
const ITEM_SOCKET_CALIBRATION = Object.freeze({
    '4140': { scale: 0.95, offset: [0, 0.012, 0.012] },
    '4141': { scale: 0.92, offset: [0, 0, -0.012] },
    '4142': { scale: 0.90, offset: [0, 0.006, 0.018] },
    '4143': { scale: 0.82, offset: [0, 0.008, 0.01] },
    '4144': { scale: 0.88, offset: [0, 0.018, -0.018] },
    '4145': { scale: 0.9, offset: [0.012, 0.006, 0.008] },
    '4146': { scale: 0.86, offset: [0, -0.006, 0.018] },
    '4147': { scale: 0.80, offset: [0, 0.006, 0.012] },
    '4160': { scale: 1.08, offset: [0, 0, 0.028] },
    '4161': { scale: 0.96, offset: [0, 0.012, -0.025] },
    '4162': { scale: 0.82, offset: [0, 0.008, 0.012] },
    '4163': { scale: 0.9, offset: [0.014, 0.008, 0.01] },
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

// Sprint 51: where each mount faces, in the operator's own frame (it faces
// +Z; its left is +X), how high above the bone to aim, and the body depth a
// module at that mount is sized for. Modules sit on the model's actual surface
// (fitEquipmentToSurface): bone-local offsets buried shoulder, forearm and
// helmet modules inside bulky chassis and floated them off slim ones.
// `dir`: where the module sits relative to the bone; `face`: which way its
// front points (defaults to `dir`); `reach`: how far out the surface search
// starts, so a shoulder pauldron is not mistaken for the side of the helmet.
const MOUNT_FITS = Object.freeze({
    chest_center: { dir: [0, 0, 1], lift: 0.04, refDepth: 0.2, reach: 0.7 },
    back_upper: { dir: [0, 0, -1], lift: 0.05, refDepth: 0.22, reach: 0.7 },
    waist_back: { dir: [0, 0, -1], lift: 0.09, refDepth: 0.19, reach: 0.6 },
    helmet_side: { dir: [1, 0, 0], face: [1, 0, 0.45], lift: 0.02, refDepth: 0.16, reach: 0.3 },
    shoulder_left: { dir: [0.55, 1, 0], face: [1, 0.25, 0.45], lift: 0, refDepth: 0.12, reach: 0.4 },
    forearm_left: { dir: [1, 0, 0.25], face: [1, 0, 0.6], lift: 0, refDepth: 0.07, reach: 0.3 },
    forearm_right: { dir: [-1, 0, 0.25], face: [-1, 0, 0.6], lift: 0, refDepth: 0.07, reach: 0.3 }
});
const BULK_SCALE_RANGE = Object.freeze([0.85, 1.45]);
// How much of a module's depth sinks into the surface, so it reads as
// attached rather than hovering.
const SURFACE_EMBED = 0.3;
const EXCLUDED_NAME = /weapon|charm|muzzle/i;

function surfaceMeshes(root) {
    const meshes = [];
    const visit = (object) => {
        if (object.userData?.equipmentId || EXCLUDED_NAME.test(object.name ?? '')) return;
        if (object.isMesh && object.visible !== false) meshes.push(object);
        for (const child of object.children ?? []) visit(child);
    };
    visit(root);
    return meshes;
}

/**
 * Where a module goes on this model: the surface point a ray finds along the
 * mount's outward direction, the module facing out, sized up on bulkier bodies.
 * Returns world-space { worldPosition, quaternion, size, direction, hit }.
 */
export function fitEquipmentToSurface({ root, bone, mount = 'chest_center', size = 0.3, model }) {
    const fit = MOUNT_FITS[mount] ?? MOUNT_FITS.chest_center;
    root.updateMatrixWorld(true);
    const rootQuaternion = root.getWorldQuaternion(new THREE.Quaternion());
    const toWorld = (vector) => new THREE.Vector3().fromArray(vector).normalize().applyQuaternion(rootQuaternion).normalize();
    const direction = toWorld(fit.dir);
    const facing = toWorld(fit.face ?? fit.dir);
    const anchorPoint = bone.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, fit.lift, 0));

    const raycaster = new THREE.Raycaster(anchorPoint.clone().addScaledVector(direction, fit.reach), direction.clone().negate(), 0, fit.reach);
    const hits = raycaster.intersectObjects(surfaceMeshes(root), false);
    const hit = hits.length > 0;
    const depth = hit ? Math.max(0, fit.reach - hits[0].distance) : fit.refDepth;
    const surfacePoint = anchorPoint.clone().addScaledVector(direction, depth);

    const bulk = THREE.MathUtils.clamp(depth / fit.refDepth, BULK_SCALE_RANGE[0], BULK_SCALE_RANGE[1]);
    const finalSize = size * bulk;

    const bounds = new THREE.Box3().setFromObject(model);
    const dims = bounds.getSize(new THREE.Vector3());
    const maxDim = Math.max(dims.x, dims.y, dims.z, 0.001);
    const moduleDepth = dims.z * (finalSize / maxDim);
    const worldPosition = surfacePoint.addScaledVector(direction, moduleDepth * (0.5 - SURFACE_EMBED));

    // The module's front (+Z) faces out, its up stays up where it can.
    const up = Math.abs(facing.y) > 0.95 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
    const basis = new THREE.Matrix4().lookAt(facing, new THREE.Vector3(), up);
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(basis);
    return { worldPosition, quaternion, size: finalSize, direction, hit };
}

// The first listed name that exists wins: the tree walk reaches a parent
// (RightArm) before its child (RightForeArm), so matching any name in walk
// order put forearm modules on the upper arm.
function findBone(root, suffixes) {
    for (const suffix of suffixes) {
        let found = null;
        root.traverse((object) => {
            if (!found && object.isBone && object.name.endsWith(suffix)) found = object;
        });
        if (found) return found;
    }
    return root;
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
            if (mounted[index]) {
                const oldAnchor = mounted[index];
                oldAnchor.parent?.remove(oldAnchor);
                oldAnchor.traverse((obj) => {
                    obj.geometry?.dispose?.();
                    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                    for (const m of mats) m?.dispose?.();
                });
            }
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
            const anchor = new THREE.Group();
            anchor.name = `OperatorOverclockSocket${index + 1}`;
            anchor.userData.equipmentId = String(itemId);
            const model = gltf.scene.clone(true);
            const bounds = new THREE.Box3().setFromObject(model);
            const maxDim = Math.max(...bounds.getSize(new THREE.Vector3()).toArray(), .001);
            // On this model's surface, in the bone's frame so it moves with it.
            const fit = fitEquipmentToSurface({ root, bone, mount, size: socket.size, model });
            const world = new THREE.Matrix4().compose(fit.worldPosition, fit.quaternion, new THREE.Vector3(1, 1, 1));
            new THREE.Matrix4().copy(bone.matrixWorld).invert().multiply(world)
                .decompose(anchor.position, anchor.quaternion, anchor.scale);
            model.scale.setScalar(fit.size / maxDim);
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
            for (const anchor of mounted) {
                if (anchor) {
                    anchor.parent?.remove(anchor);
                    anchor.traverse((obj) => {
                        obj.geometry?.dispose?.();
                        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                        for (const m of mats) m?.dispose?.();
                    });
                }
            }
            mounted[0] = null;
            mounted[1] = null;
        }
    };
}
