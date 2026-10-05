/**
 * Draws a room dressing plan (roomDressing.js) as static instanced batches:
 * one InstancedMesh per (model type x mesh) for 3D pieces and one per decal
 * type for flat decals. Nothing here ticks per frame, collides, or takes
 * damage, so a room stuffed with sixty pieces costs a dozen or so draw calls
 * and no main-thread work after it is built.
 *
 * Shared by ThreeGame.addRoomDressing and the furnished-room showroom, so the
 * review images show exactly what the game draws.
 */
import * as THREE from 'three';
import { applyBlackChromaKey, applyGreenChromaKey } from './textureKeying.js';
import { assetUrl } from './assetUrl.js';

const keyedDecalCache = new Map();

/**
 * A decal PNG keyed the way ThreeGame.loadKeyedSpriteTexture keys sprites:
 * art without its own alpha loses its green screen, then its black backdrop.
 * Several decal PNGs ship on green; drawn raw they are bright green squares.
 * Cached per path; resolves null when the image is missing.
 */
export function loadKeyedDecalTexture(type) {
    if (keyedDecalCache.has(type)) return keyedDecalCache.get(type);
    const pending = new Promise((resolve) => {
        if (typeof Image === 'undefined' || typeof document === 'undefined') { resolve(null); return; }
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            context.drawImage(image, 0, 0);
            const data = context.getImageData(0, 0, canvas.width, canvas.height);
            let hasAlpha = false;
            for (let i = 3; i < data.data.length; i += 4) {
                if (data.data[i] < 255) { hasAlpha = true; break; }
            }
            if (!hasAlpha) {
                applyGreenChromaKey(data);
                applyBlackChromaKey(data, { threshold: 14 });
            }
            context.putImageData(data, 0, 0);
            const texture = new THREE.CanvasTexture(canvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = 4;
            resolve(texture);
        };
        image.onerror = () => resolve(null);
        image.src = assetUrl(`/${type}.png`);
    });
    keyedDecalCache.set(type, pending);
    return pending;
}

const MODEL_LAYERS = new Set(['wallProp', 'clutter', 'corner', 'vignette']);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);
const decalMaterialCache = new Map();

function decalMaterial(texture) {
    if (!decalMaterialCache.has(texture)) {
        decalMaterialCache.set(texture, new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.05,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
            roughness: 0.9,
            metalness: 0
        }));
    }
    return decalMaterialCache.get(texture);
}

const textureAspect = (texture) => {
    const width = Number(texture?.image?.width);
    const height = Number(texture?.image?.height);
    return width > 0 && height > 0 ? width / height : 1;
};

/**
 * @param {object[]} items  dressing items in world units ({ layer, type, x, y, ... })
 * @param {object} deps
 * @param {(type: string) => Promise<THREE.Object3D|null>} deps.loadModel  prepared model root (sized, grounded)
 * @param {(type: string) => THREE.Texture|null|Promise<THREE.Texture|null>} deps.loadDecalTexture
 * @returns {Promise<THREE.Group>} group.userData.drawCalls counts the batches
 */
export async function buildRoomDressingGroup(items, { loadModel, loadDecalTexture }) {
    const group = new THREE.Group();
    group.name = 'room-dressing';
    group.userData.isRoomDressing = true;
    const byType = new Map();
    for (const item of items ?? []) {
        if (!byType.has(item.type)) byType.set(item.type, []);
        byType.get(item.type).push(item);
    }

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    let drawCalls = 0;

    for (const [type, list] of byType) {
        if (MODEL_LAYERS.has(list[0].layer)) {
            const root = await loadModel(type);
            if (!root) continue;
            root.updateMatrixWorld(true);
            const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
            const meshes = [];
            root.traverse((node) => {
                if (node.isMesh && !node.isSkinnedMesh && node.geometry) meshes.push(node);
            });
            for (const mesh of meshes) {
                const local = new THREE.Matrix4().multiplyMatrices(toRoot, mesh.matrixWorld);
                const batch = new THREE.InstancedMesh(mesh.geometry, mesh.material, list.length);
                list.forEach((item, index) => {
                    position.set(item.x, item.mountY ?? 0, item.y);
                    quaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, item.yaw ?? 0);
                    const s = item.scale ?? 1;
                    scale.set(s, s, s);
                    matrix.compose(position, quaternion, scale).multiply(local);
                    batch.setMatrixAt(index, matrix);
                });
                batch.instanceMatrix.needsUpdate = true;
                batch.castShadow = false;
                batch.receiveShadow = true;
                batch.computeBoundingSphere();
                batch.userData.roomDressingType = type;
                group.add(batch);
                drawCalls += 1;
            }
            continue;
        }

        const texture = await loadDecalTexture(type);
        if (!texture) continue;
        const aspect = textureAspect(texture);
        const batch = new THREE.InstancedMesh(UNIT_PLANE, decalMaterial(texture), list.length);
        list.forEach((item, index) => {
            const size = item.size ?? 1;
            if (item.layer === 'wallDecal') {
                position.set(item.x, item.height ?? 1.4, item.y);
                euler.set(0, Math.atan2(item.normal?.x ?? 0, item.normal?.z ?? 1), item.roll ?? 0);
            } else {
                // Stagger floor decals a hair apart so overlapping ones never z-fight.
                position.set(item.x, 0.03 + (index % 7) * 0.002, item.y);
                euler.set(-Math.PI / 2, item.yaw ?? 0, 0);
            }
            quaternion.setFromEuler(euler);
            scale.set(size * aspect, size, 1);
            matrix.compose(position, quaternion, scale);
            batch.setMatrixAt(index, matrix);
        });
        batch.instanceMatrix.needsUpdate = true;
        batch.castShadow = false;
        batch.receiveShadow = true;
        batch.renderOrder = 6;
        batch.computeBoundingSphere();
        batch.userData.roomDressingType = type;
        group.add(batch);
        drawCalls += 1;
    }

    group.userData.drawCalls = drawCalls;
    group.userData.itemCount = items?.length ?? 0;
    return group;
}
