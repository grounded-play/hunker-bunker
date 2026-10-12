/**
 * Draws the lived-in pass 2 stickers (src/stickerPlanner.js) with full PBR:
 * every sticker version is one layer of two BC7 KTX2 arrays built by
 * scripts/art/build_stickers.py (albedo + coverage, normal + roughness +
 * metalness), so a whole chunk's stickers are one instanced draw.
 */
import * as THREE from 'three';
import { STICKER_LAYERS } from './data/stickerLayers.js';
import { LEGACY_DECAL_LAYERS } from './data/legacyDecalLayers.js';
import { stackCompressedLayers } from './floorSplat.js';
import { STICKER_FAMILIES } from './stickerPlanner.js';

const LAYER_INDEX = new Map(STICKER_LAYERS.map((entry, index) => [entry.name, index]));
const LEGACY_INDEX = new Map(LEGACY_DECAL_LAYERS.map((entry, index) => [entry.name, index]));

/** The PBR layer of a room-dressing PNG decal type, or -1 (it stays on the PNG path). */
export function legacyDecalLayerIndex(type, variant = 0) {
    const suffix = ['', '_b', '_c', '_d'][Math.abs(variant) % 4];
    return LEGACY_INDEX.get(`${type}${suffix}`) ?? LEGACY_INDEX.get(type) ?? -1;
}
const VARIANT_LETTERS = 'abcd';

export function stickerLayerIndex(family, variant = 0) {
    return LAYER_INDEX.get(`${family}_${VARIANT_LETTERS[variant % 4]}`) ?? LAYER_INDEX.get(`${family}_a`) ?? -1;
}

export function isStickersEnabled(storage = globalThis.localStorage) {
    try {
        return storage?.getItem?.('hb_stickers') !== '0';
    } catch {
        return true;
    }
}

/** Loads both maps of every sticker layer and stacks them into arrays. */
export async function loadStickerArrays({
    loader,
    resolveUrl = (path) => path,
    yieldTask = () => new Promise((resolve) => setTimeout(resolve, 0)),
    baseUrl = '/3d/runtime/decals/',
    layers = STICKER_LAYERS
}) {
    const albedo = [];
    const detail = [];
    for (const { name } of layers) {
        albedo.push(await loader.loadAsync(resolveUrl(`${baseUrl}${name}_albedo.ktx2`)));
        detail.push(await loader.loadAsync(resolveUrl(`${baseUrl}${name}_detail.ktx2`)));
        await yieldTask();
    }
    try {
        const arrays = {
            albedo: stackCompressedLayers(albedo, THREE.SRGBColorSpace),
            detail: stackCompressedLayers(detail, THREE.NoColorSpace)
        };
        for (const array of Object.values(arrays)) {
            array.wrapS = THREE.ClampToEdgeWrapping;
            array.wrapT = THREE.ClampToEdgeWrapping;
        }
        return arrays;
    } finally {
        for (const texture of [...albedo, ...detail]) texture.dispose();
    }
}

function placeholderArray() {
    const texture = new THREE.DataArrayTexture(new Uint8Array(4), 1, 1, 1);
    texture.needsUpdate = true;
    return texture;
}

/**
 * The one sticker material. Until the arrays load (and for good without
 * BC7) `uStickersReady` stays 0 and every sticker discards.
 */
export function createStickerMaterial() {
    const uniforms = {
        uStickerAlbedo: { value: placeholderArray() },
        uStickerDetail: { value: placeholderArray() },
        uStickersReady: { value: 0 }
    };
    const material = new THREE.MeshStandardMaterial({
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        roughness: 0.8,
        metalness: 0
    });
    material.userData.stickerUniforms = uniforms;
    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
                attribute vec4 aSticker;
                varying vec2 vStickerUv;
                varying vec4 vStickerInfo;
                varying vec3 vStickerTangent;
                varying vec3 vStickerBitangent;`)
            .replace('#include <uv_vertex>', `#include <uv_vertex>
                vStickerUv = uv;
                vStickerInfo = aSticker;
                mat3 stickerBasis = mat3(modelViewMatrix);
                #ifdef USE_INSTANCING
                    stickerBasis = stickerBasis * mat3(instanceMatrix);
                #endif
                vStickerTangent = normalize(stickerBasis * vec3(1.0, 0.0, 0.0));
                vStickerBitangent = normalize(stickerBasis * vec3(0.0, 1.0, 0.0));`);
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
                uniform sampler2DArray uStickerAlbedo;
                uniform sampler2DArray uStickerDetail;
                uniform float uStickersReady;
                varying vec2 vStickerUv;
                varying vec4 vStickerInfo;
                varying vec3 vStickerTangent;
                varying vec3 vStickerBitangent;
                vec4 hbStickerDetail;`)
            .replace('#include <map_fragment>', `
                if (uStickersReady < 0.5) discard;
                // Image space: s right, t down. Flipped stickers mirror s;
                // turned ones were stored 90 degrees clockwise.
                vec2 stickerSt = vec2(vStickerUv.x, 1.0 - vStickerUv.y);
                if (vStickerInfo.z > 0.5) stickerSt.x = 1.0 - stickerSt.x;
                vec2 stickerUv = vStickerInfo.y > 0.5 ? vec2(1.0 - stickerSt.y, stickerSt.x) : stickerSt;
                vec3 stickerUvw = vec3(stickerUv, vStickerInfo.x);
                vec4 stickerAlbedo = texture(uStickerAlbedo, stickerUvw);
                hbStickerDetail = texture(uStickerDetail, stickerUvw);
                diffuseColor *= vec4(stickerAlbedo.rgb * vStickerInfo.w, stickerAlbedo.a);
                if (diffuseColor.a < 0.02) discard;`)
            .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
                roughnessFactor = hbStickerDetail.b;`)
            .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
                metalnessFactor = hbStickerDetail.a;`)
            .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
                vec2 stickerStored = hbStickerDetail.rg * 2.0 - 1.0;
                // Back to the unturned image (x right, y down), then to the quad
                // (x right, y up).
                vec2 stickerImage = vStickerInfo.y > 0.5 ? vec2(stickerStored.y, -stickerStored.x) : stickerStored;
                if (vStickerInfo.z > 0.5) stickerImage.x = -stickerImage.x;
                vec3 stickerNormal = vec3(stickerImage.x, -stickerImage.y, sqrt(max(1.0 - dot(stickerImage, stickerImage), 0.0)));
                normal = normalize(vStickerTangent * stickerNormal.x + vStickerBitangent * stickerNormal.y + normal * stickerNormal.z);`);
    };
    material.customProgramCacheKey = () => 'hb-sticker-decal';
    return material;
}

/** Swaps the loaded arrays into the material and turns stickers on. */
export function setStickerArrays(material, { albedo, detail }) {
    const uniforms = material.userData.stickerUniforms;
    const previous = [uniforms.uStickerAlbedo.value, uniforms.uStickerDetail.value];
    uniforms.uStickerAlbedo.value = albedo;
    uniforms.uStickerDetail.value = detail;
    uniforms.uStickersReady.value = 1;
    for (const texture of previous) texture?.dispose?.();
}

export function disposeStickerMaterial(material) {
    const uniforms = material?.userData?.stickerUniforms;
    uniforms?.uStickerAlbedo?.value?.dispose?.();
    uniforms?.uStickerDetail?.value?.dispose?.();
    material?.dispose?.();
}

const FLAT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

/** Size and placement of one planned sticker, in world units. */
export function stickerTransform(item, layer) {
    const family = STICKER_FAMILIES[item.family];
    const aspect = STICKER_LAYERS[layer]?.aspect ?? 1;
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    if (item.surface === 'wall') {
        const height = item.height ?? family.height;
        const width = item.length ?? height * aspect;
        position.set(item.x, item.bottom + height / 2, item.z);
        quaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.atan2(item.normalX, item.normalZ));
        scale.set(width, height, 1);
    } else {
        const depth = item.depth ?? family.depth;
        const length = item.length ?? depth * aspect;
        position.set(item.x, 0.012 + (item.lift ?? 0), item.z);
        quaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, item.yaw ?? 0).multiply(FLAT);
        scale.set(length, depth, 1);
    }
    return { position, quaternion, scale };
}

/** One instanced mesh for all of a chunk's stickers, or null for none. */
export function buildStickerMesh(items, material) {
    const placed = items
        .map((item) => ({ item, layer: stickerLayerIndex(item.family, item.variant) }))
        .filter(({ layer }) => layer >= 0);
    if (placed.length === 0) return null;
    const info = new Float32Array(placed.length * 4);
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute('aSticker', new THREE.InstancedBufferAttribute(info, 4));
    const mesh = new THREE.InstancedMesh(geometry, material, placed.length);
    const matrix = new THREE.Matrix4();
    placed.forEach(({ item, layer }, index) => {
        // A hair of lift per instance so overlapping floor stickers never z-fight.
        if (item.surface !== 'wall') item.lift = (index % 11) * 0.0011;
        const { position, quaternion, scale } = stickerTransform(item, layer);
        mesh.setMatrixAt(index, matrix.compose(position, quaternion, scale));
        info.set([layer, STICKER_LAYERS[layer].rotated ? 1 : 0, item.flip ? 1 : 0, STICKER_FAMILIES[item.family]?.tint ?? 1], index * 4);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.renderOrder = 6;
    mesh.computeBoundingSphere();
    mesh.name = 'lived-in-stickers';
    mesh.userData.isStickerDecals = true;
    mesh.userData.stickerCount = placed.length;
    return mesh;
}

const LEGACY_FLAT = new THREE.Euler(0, 0, 0, 'YXZ');
const LEGACY_HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * Room-dressing decals drawn from their PBR layers (LEGACY_DECAL_LAYERS), placed
 * exactly as roomDressingRenderer's PNG batches place them, as one draw for
 * the whole room instead of one per decal type. Each item gets its
 * batchInstances entry, so breaking a wall still hides its decals.
 */
export function buildLegacyDecalMesh(items, material) {
    const placed = items
        .map((item, index) => ({ item, layer: legacyDecalLayerIndex(item.type, item.variant ?? index) }))
        .filter(({ layer }) => layer >= 0);
    if (placed.length === 0) return null;
    const info = new Float32Array(placed.length * 4);
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute('aSticker', new THREE.InstancedBufferAttribute(info, 4));
    const mesh = new THREE.InstancedMesh(geometry, material, placed.length);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    placed.forEach(({ item, layer }, index) => {
        item.batchInstances = item.batchInstances || [];
        item.batchInstances.push({ batch: mesh, index });
        info.set([layer, 0, 0, 1], index * 4);
        if (item.isDestroyed) {
            mesh.setMatrixAt(index, LEGACY_HIDDEN);
            return;
        }
        const size = item.size ?? 1;
        const aspect = LEGACY_DECAL_LAYERS[layer].aspect;
        if (item.layer === 'wallDecal') {
            position.set(item.x, item.height ?? 1.4, item.y);
            LEGACY_FLAT.set(0, Math.atan2(item.normal?.x ?? 0, item.normal?.z ?? 1), item.roll ?? 0);
        } else {
            // The same few-millimetre stagger the PNG batches use against z-fighting.
            position.set(item.x, 0.03 + (index % 7) * 0.002, item.y);
            LEGACY_FLAT.set(-Math.PI / 2, item.yaw ?? 0, 0);
        }
        quaternion.setFromEuler(LEGACY_FLAT);
        scale.set(size * aspect, size, 1);
        mesh.setMatrixAt(index, matrix.compose(position, quaternion, scale));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.renderOrder = 6;
    mesh.computeBoundingSphere();
    mesh.name = 'room-dressing-decals';
    mesh.userData.isStickerDecals = true;
    mesh.userData.stickerCount = placed.length;
    return mesh;
}
