import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { stackCompressedLayers } from './floorSplat.js';
import { buildPrismTubeGeometry, buildTerminationCollarGeometry } from './splineGeometry.js';

/**
 * Conduit surfaces, one texture-array layer each, baked from bands of the
 * owner's sticker art by scripts/art/build_spline_textures.py: the bunker's
 * taped rubber cable, the hive's braided sinew, cryo's frost-sheathed coolant
 * pipe, the camp's tangled vine roots and the gunmetal of the wall collars.
 * `turns` is how many circumferences of length one texture repeat covers, so
 * the art keeps its proportions on any radius. `fallback` is the flat colour
 * drawn until the arrays load (or for good on a GPU without BC7).
 */
export const SPLINE_LAYERS = Object.freeze([
    Object.freeze({ kind: 'wire', turns: 2, fallback: 0x2a2f36 }),
    Object.freeze({ kind: 'vein', turns: 2, fallback: 0x4a2414 }),
    Object.freeze({ kind: 'pipe', turns: 2, fallback: 0xbfd8e4 }),
    Object.freeze({ kind: 'vine', turns: 2, fallback: 0x5a3a1c }),
    Object.freeze({ kind: 'metal', turns: 1, fallback: 0x4b5563 })
]);
const LAYER_BY_KIND = new Map(SPLINE_LAYERS.map((layer, index) => [layer.kind, index]));
const KIND_ALIASES = Object.freeze({
    wire: 'wire', cable: 'wire', power: 'wire', data: 'wire',
    vein: 'vein', sinew: 'vein', trachea: 'vein',
    coolant_pipe: 'pipe', pipe: 'pipe', coolant: 'pipe',
    vine: 'vine', rope: 'vine'
});

/** The conduit layer a planned spline draws with. */
export function splineLayerFor(item) {
    const kind = item?.layerKind ?? KIND_ALIASES[item?.type] ?? 'wire';
    return LAYER_BY_KIND.get(kind) ?? 0;
}

/** Texture repeats per metre, so one repeat spans `turns` circumferences. */
export function splineVRepeat(radius, layer) {
    const turns = SPLINE_LAYERS[layer]?.turns ?? 2;
    return 1 / (turns * 2 * Math.PI * Math.max(0.005, radius));
}

export function isSplineArraysEnabled(storage = globalThis.localStorage) {
    try {
        return storage?.getItem?.('hb_spline_textures') !== '0';
    } catch {
        return true;
    }
}

export async function loadSplineArrays({ loader, resolveUrl = (path) => path, baseUrl = '/3d/runtime/splines/' }) {
    const albedo = [];
    const detail = [];
    for (const { kind } of SPLINE_LAYERS) {
        albedo.push(await loader.loadAsync(resolveUrl(`${baseUrl}spline_${kind}_albedo.ktx2`)));
        detail.push(await loader.loadAsync(resolveUrl(`${baseUrl}spline_${kind}_detail.ktx2`)));
    }
    try {
        return {
            albedo: stackCompressedLayers(albedo, THREE.SRGBColorSpace),
            detail: stackCompressedLayers(detail, THREE.NoColorSpace)
        };
    } finally {
        for (const texture of [...albedo, ...detail]) texture.dispose();
    }
}

function placeholderArray() {
    const texture = new THREE.DataArrayTexture(new Uint8Array(4), 1, 1, 1);
    texture.needsUpdate = true;
    return texture;
}

let sharedMaterial = null;

/**
 * The one conduit material: every run in a chunk merges into one mesh and one
 * draw, each vertex picking its layer. Normals come from the detail map in a
 * screen-space tangent frame (u around the tube, v along it).
 */
function createSplineMaterial() {
    const uniforms = {
        uSplineAlbedo: { value: placeholderArray() },
        uSplineDetail: { value: placeholderArray() },
        uSplineReady: { value: 0 },
        uSplineFallback: { value: SPLINE_LAYERS.map((layer) => new THREE.Color(layer.fallback)) }
    };
    // A 1x1 map switches on three's UV path (vMapUv); the shader replaces its use.
    const unit = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    unit.needsUpdate = true;
    const material = new THREE.MeshStandardMaterial({ map: unit, roughness: 0.6, metalness: 0.2 });
    material.name = 'splineMat:layered';
    material.userData.splineUniforms = uniforms;
    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
                attribute float splineLayer;
                varying float vSplineLayer;`)
            .replace('#include <uv_vertex>', `#include <uv_vertex>
                vSplineLayer = splineLayer;`);
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
                uniform sampler2DArray uSplineAlbedo;
                uniform sampler2DArray uSplineDetail;
                uniform float uSplineReady;
                uniform vec3 uSplineFallback[${SPLINE_LAYERS.length}];
                varying float vSplineLayer;
                vec4 hbSplineDetail;
                mat3 hbSplineTangentFrame(vec3 eyePos, vec3 surfNormal, vec2 uv) {
                    vec3 q0 = dFdx(eyePos);
                    vec3 q1 = dFdy(eyePos);
                    vec2 st0 = dFdx(uv);
                    vec2 st1 = dFdy(uv);
                    vec3 q1perp = cross(q1, surfNormal);
                    vec3 q0perp = cross(surfNormal, q0);
                    vec3 T = q1perp * st0.x + q0perp * st1.x;
                    vec3 B = q1perp * st0.y + q0perp * st1.y;
                    float det = max(dot(T, T), dot(B, B));
                    float scale = det == 0.0 ? 0.0 : inversesqrt(det);
                    return mat3(T * scale, B * scale, surfNormal);
                }`)
            .replace('#include <map_fragment>', `
                float splineLayerIndex = floor(vSplineLayer + 0.5);
                hbSplineDetail = vec4(0.5, 0.5, 0.6, 0.2);
                if (uSplineReady > 0.5) {
                    vec3 splineUvw = vec3(vMapUv, splineLayerIndex);
                    diffuseColor.rgb *= texture(uSplineAlbedo, splineUvw).rgb;
                    hbSplineDetail = texture(uSplineDetail, splineUvw);
                } else {
                    vec3 fallbackColor = uSplineFallback[0];
                    for (int i = 1; i < ${SPLINE_LAYERS.length}; i++) {
                        if (abs(splineLayerIndex - float(i)) < 0.5) fallbackColor = uSplineFallback[i];
                    }
                    diffuseColor.rgb *= fallbackColor;
                }`)
            .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
                roughnessFactor = hbSplineDetail.b;`)
            .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
                metalnessFactor = hbSplineDetail.a;`)
            .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
                if (uSplineReady > 0.5) {
                    vec2 splineXY = hbSplineDetail.rg * 2.0 - 1.0;
                    vec3 splineNormal = vec3(splineXY, sqrt(max(1.0 - dot(splineXY, splineXY), 0.0)));
                    normal = normalize(hbSplineTangentFrame(-vViewPosition, normal, vMapUv) * splineNormal);
                }`);
    };
    material.customProgramCacheKey = () => 'hb-spline-layered';
    return material;
}

/** The shared conduit material (every theme draws from the same layers). */
export function getSplineMaterial() {
    if (!sharedMaterial) sharedMaterial = createSplineMaterial();
    return sharedMaterial;
}

export function setSplineArrays({ albedo, detail }) {
    const uniforms = getSplineMaterial().userData.splineUniforms;
    const previous = [uniforms.uSplineAlbedo.value, uniforms.uSplineDetail.value];
    uniforms.uSplineAlbedo.value = albedo;
    uniforms.uSplineDetail.value = detail;
    uniforms.uSplineReady.value = 1;
    for (const texture of previous) texture?.dispose?.();
}

function tubeGeometry(points, item, layer) {
    const radius = item.radius ?? 0.035;
    return buildPrismTubeGeometry(points, {
        radius,
        sides: item.sides ?? 4,
        vRepeat: splineVRepeat(radius, layer),
        layer
    });
}

function collarGeometry(collar, item) {
    return buildTerminationCollarGeometry(collar.pos, collar.normal, {
        radius: collar.radius ?? item.radius ?? 0.035,
        sides: collar.sides ?? 6,
        layer: LAYER_BY_KIND.get('metal')
    });
}

function itemGeometries(item) {
    const geometries = [];
    if (item.category === 'termination_collar') {
        const collar = collarGeometry({ pos: item.pos, normal: item.normal, radius: item.radius, sides: item.sides }, item);
        if (collar) geometries.push(collar);
        return geometries;
    }
    if (item.points && item.points.length >= 2) {
        const tube = tubeGeometry(item.points, item, splineLayerFor(item));
        if (tube) geometries.push(tube);
    }
    for (const collar of item.collars ?? []) {
        const geometry = collarGeometry(collar, item);
        if (geometry) geometries.push(geometry);
    }
    return geometries;
}

function mergeOwned(geometries) {
    if (geometries.length === 0) return null;
    if (geometries.length === 1) return geometries[0];
    const merged = mergeGeometries(geometries, false);
    for (const geometry of geometries) geometry.dispose();
    return merged;
}

/**
 * Merges a list of spline definitions into a single THREE.Mesh using at most 1 draw call,
 * with optional extraction of cuttable sub-meshes so they can be severed independently.
 *
 * @param {Array<object>} splineManifest  List of splines and collars from splineRouter
 * @param {object} [options]
 * @param {Function} [options.onCuttableMesh=null] Callback (cuttableMesh, splineItem) => void
 * @returns {THREE.Mesh|null}
 */
export function buildChunkSplinesMesh(splineManifest, { onCuttableMesh = null } = {}) {
    if (!splineManifest || splineManifest.length === 0) return null;

    const staticGeometries = [];
    const material = getSplineMaterial();

    for (const item of splineManifest) {
        if (item.cuttable && typeof onCuttableMesh === 'function') {
            const geometry = mergeOwned(itemGeometries(item));
            if (geometry) {
                const cuttableMesh = new THREE.Mesh(geometry, material);
                cuttableMesh.name = `cuttable-spline-${item.id}`;
                cuttableMesh.castShadow = true;
                cuttableMesh.receiveShadow = true;
                cuttableMesh.userData = {
                    isSplineDressing: true,
                    isCuttableSpline: true,
                    splineId: item.id
                };
                onCuttableMesh(cuttableMesh, item);
            }
            continue;
        }
        staticGeometries.push(...itemGeometries(item));
    }

    const mergedGeometry = mergeOwned(staticGeometries);
    if (!mergedGeometry) return null;

    const mesh = new THREE.Mesh(mergedGeometry, material);
    mesh.name = 'chunk-splines-batch';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
        isSplineDressing: true,
        blocking: false,
        destructible: false,
        splineCount: splineManifest.length
    };

    return mesh;
}

/**
 * A severed run: the two halves either side of the cut, each still fastened
 * at its anchored end, with the free end sagging under its own weight (a
 * parabola growing toward the cut). Returns the merged geometry and the two
 * free ends, where the cut keeps sparking, oozing or venting.
 */
export function buildSeveredSplineGeometry(item) {
    const points = (item.points ?? []).map((point) => (point.isVector3 ? point.clone() : new THREE.Vector3(point.x, point.y, point.z)));
    if (points.length < 3) return null;
    let cut = Math.floor(points.length / 2);
    if (item.cutPoint) {
        let best = Infinity;
        points.forEach((point, index) => {
            const distance = point.distanceToSquared(item.cutPoint);
            if (distance < best && index > 0 && index < points.length - 1) {
                best = distance;
                cut = index;
            }
        });
    }
    const gap = 0.06;
    const halves = [points.slice(0, cut + 1), points.slice(cut).reverse()];
    const geometries = [];
    const ends = [];
    const layer = splineLayerFor(item);
    for (const half of halves) {
        if (half.length < 2) continue;
        const lengths = [0];
        for (let i = 1; i < half.length; i += 1) lengths.push(lengths[i - 1] + half[i].distanceTo(half[i - 1]));
        const total = lengths[lengths.length - 1] || 1;
        const freeEnd = half[half.length - 1];
        // How far the loose end can fall: a third of its length, never through the floor.
        const drop = Math.max(0, Math.min(total * 0.35, freeEnd.y - 0.04));
        const pull = half[half.length - 1].clone().sub(half[half.length - 2]).setY(0).normalize().multiplyScalar(gap);
        const sagged = half.map((point, index) => {
            const t = lengths[index] / total;
            return point.clone().add(new THREE.Vector3(0, -drop * t * t, 0)).addScaledVector(pull, -t);
        });
        const tube = tubeGeometry(sagged, item, layer);
        if (tube) geometries.push(tube);
        const tip = sagged[sagged.length - 1];
        ends.push({ position: tip.clone(), direction: tip.clone().sub(sagged[sagged.length - 2]).normalize() });
    }
    for (const collar of item.collars ?? []) {
        const geometry = collarGeometry(collar, item);
        if (geometry) geometries.push(geometry);
    }
    const geometry = mergeOwned(geometries);
    return geometry ? { geometry, ends } : null;
}

/**
 * Cleanly disposes a spline mesh's GPU buffer geometry on chunk unload.
 * @param {THREE.Mesh} mesh
 */
export function disposeSplineMesh(mesh) {
    if (!mesh) return;
    if (mesh.geometry) {
        mesh.geometry.dispose();
    }
    if (mesh.parent) {
        mesh.parent.remove(mesh);
    }
}
