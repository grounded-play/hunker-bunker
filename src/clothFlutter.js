/**
 * Cloth that flutters in the wind (lived-in pass 2, Part 7): the windsock on
 * its mast, the tarp over a lean-to. scripts/blender/flutter_recipes.py cuts
 * the cloth into an HB_FLUTTER node and bakes, per vertex, how freely it moves
 * (COLOR_0 red: 0 where held, 1 free) and how far it is from its holds (green,
 * the wave's phase). Here the cloth gets a material that waves those vertices
 * on one shared clock: a travelling wave from the holds outward, across the
 * wind for a sock (hb_axis) or along the surface normal for a sheet.
 *
 * Everything stays shared: one patched material per source material and
 * motion, the weights moved once onto the cached geometry, so the static
 * instanced batch draws every copy in one call. Instances drift out of step
 * by their position.
 */
import * as THREE from 'three';

const FLUTTER_TIME = { value: 0 };
const patchedMaterials = new Map();
const isPatched = new WeakSet();

/** Advances every fluttering cloth; called once a frame. */
export function setClothFlutterTime(seconds) {
    FLUTTER_TIME.value = seconds;
}

function flutterExtras(node, root) {
    for (let current = node; current; current = current.parent) {
        if (current.userData?.hb_motion === 'flutter') return current.userData;
        if (current === root) break;
    }
    return null;
}

// The weights arrive as COLOR_0; three would multiply them into the base
// colour, so they move to their own attribute once per (shared) geometry.
function prepareGeometry(geometry) {
    if (geometry.userData.hbFlutterPrepared) return Boolean(geometry.getAttribute('hbFlutter'));
    geometry.userData.hbFlutterPrepared = true;
    const color = geometry.getAttribute('color');
    if (!color) return false;
    const weights = new Float32Array(color.count * 2);
    for (let i = 0; i < color.count; i += 1) {
        weights[i * 2] = color.getX(i);
        weights[i * 2 + 1] = color.getY(i);
    }
    geometry.setAttribute('hbFlutter', new THREE.BufferAttribute(weights, 2));
    geometry.deleteAttribute('color');
    return true;
}

function flutterMaterial(source, extras) {
    const [x = 0, y = 0, z = 0] = extras.hb_axis ?? [];
    const amp = Number(extras.hb_amp) || 0.02;
    const speed = Number(extras.hb_speed) || 2;
    const key = `${source.uuid}|${amp}|${speed}|${x},${y},${z}`;
    if (patchedMaterials.has(key)) return patchedMaterials.get(key);
    const material = source.clone();
    material.name = `${source.name || 'material'}:flutter`;
    material.vertexColors = false;
    const uniforms = {
        uFlutterTime: FLUTTER_TIME,
        uFlutterAmp: { value: amp },
        uFlutterSpeed: { value: speed },
        uFlutterAxis: { value: new THREE.Vector3(x, y, z) }
    };
    material.userData.flutterUniforms = uniforms;
    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
                attribute vec2 hbFlutter;
                uniform float uFlutterTime;
                uniform float uFlutterAmp;
                uniform float uFlutterSpeed;
                uniform vec3 uFlutterAxis;`)
            .replace('#include <begin_vertex>', `#include <begin_vertex>
                #ifdef USE_INSTANCING
                    vec2 hbOrigin = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
                #else
                    vec2 hbOrigin = vec2(modelMatrix[3][0], modelMatrix[3][2]);
                #endif
                float hbPhase = dot(hbOrigin, vec2(0.71, 1.13));
                float hbT = uFlutterTime * uFlutterSpeed + hbPhase;
                // A wave running out from the holds, with a quicker ripple on top.
                float hbWave = sin(hbT - hbFlutter.y * 6.0) * 0.7 + sin(hbT * 2.3 - hbFlutter.y * 11.0 + 1.3) * 0.3;
                vec3 hbDirection = dot(uFlutterAxis, uFlutterAxis) > 0.0 ? uFlutterAxis : objectNormal;
                transformed += hbDirection * (uFlutterAmp * hbFlutter.x * hbWave);`);
    };
    material.customProgramCacheKey = () => `hb-cloth-flutter:${source.customProgramCacheKey?.() ?? ''}`;
    patchedMaterials.set(key, material);
    isPatched.add(material);
    return material;
}

/** Patches a prepared model's flutter cloth; returns how many meshes flutter. */
export function applyClothFlutter(model) {
    let count = 0;
    model?.traverse?.((node) => {
        if (!node.isMesh || !node.geometry) return;
        const extras = flutterExtras(node, model);
        if (!extras || !prepareGeometry(node.geometry)) return;
        // Clones of a patched model already carry the patched material.
        if (!isPatched.has(node.material)) node.material = flutterMaterial(node.material, extras);
        count += 1;
    });
    return count;
}
