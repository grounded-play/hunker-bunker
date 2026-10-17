/**
 * Cable sway (lived-in pass 2, Part 7 ambient motion): hanging cables, severed
 * conduits, and umbilical lines sway gently in the draft on one shared clock.
 *
 * Supported props:
 *   - 42: life_ceiling_collapse (snapped cables spilling from ceiling panel)
 *   - 52: life_wind_mast (guy wires / cables)
 *   - 65: life_fungal_cable_bundle (bio wall/ceiling hanging cables)
 *   - prop_wall_cable_tray_swag (sagging corridor cable run)
 *   - prop_vertebral_cable_riser (vertical riser with loose cables)
 *   - prop_biomech_spore_umbilical_cable & rigged variant (hanging umbilical)
 *   - kit_space_cables (modular space kit hanging cable run)
 *   - Any node with userData.hb_motion === 'sway'
 *
 * Everything stays shared: one patched material per source material and
 * sway profile, the weights stored once on the cached geometry attribute (hbSway),
 * so instanced batches draw in a single call. Instances drift out of phase by
 * their world position so multiple copies do not sway in lockstep.
 */
import * as THREE from 'three';

const CABLE_SWAY_TIME = { value: 0 };
const patchedMaterials = new Map();
const isPatched = new WeakSet();

/** Known models that feature hanging or loose cables. */
export const CABLE_SWAY_PROPS = Object.freeze(new Set([
    'life_ceiling_collapse',
    'life_wind_mast',
    'life_fungal_cable_bundle',
    'prop_wall_cable_tray_swag',
    'prop_vertebral_cable_riser',
    'prop_biomech_spore_umbilical_cable',
    'prop_biomech_spore_umbilical_cable_rigged',
    'kit_space_cables'
]));

/** Advances every swaying cable; called once a frame. */
export function setCableSwayTime(seconds) {
    CABLE_SWAY_TIME.value = Number(seconds) || 0;
}

export function isCableSwayType(type) {
    return typeof type === 'string' && CABLE_SWAY_PROPS.has(type);
}

function swayExtras(node, root, type) {
    for (let current = node; current; current = current.parent) {
        if (current.userData?.hb_motion === 'sway') return current.userData;
        if (current === root) break;
    }
    if (isCableSwayType(type)) {
        return { hb_motion: 'sway', type };
    }
    return null;
}

/**
 * Derives per-vertex sway weights (0 = rigid anchor, 1 = maximum free sway)
 * for a geometry based on its bounds and prop morphology.
 */
function deriveSwayWeights(geometry, type) {
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const minY = box.min.y;
    const maxY = box.max.y;
    const height = Math.max(0.01, maxY - minY);
    const positions = geometry.getAttribute('position');
    const count = positions.count;
    const weights = new Float32Array(count);

    if (type === 'prop_wall_cable_tray_swag') {
        // Catenary sag: the top brackets are fixed (maxY); the lowest points hang freest.
        for (let i = 0; i < count; i += 1) {
            const y = positions.getY(i);
            const sag = Math.max(0, (maxY - y) / height);
            weights[i] = Math.min(1, sag * 1.2);
        }
    } else if (type === 'life_fungal_cable_bundle' || type === 'prop_biomech_spore_umbilical_cable' || type === 'prop_biomech_spore_umbilical_cable_rigged' || type === 'kit_space_cables') {
        // Wall/ceiling mounted fixture hanging down: upper portion is anchored, lower ends sway.
        const anchorThreshold = minY + height * 0.70;
        for (let i = 0; i < count; i += 1) {
            const y = positions.getY(i);
            if (y >= anchorThreshold) {
                weights[i] = 0;
            } else {
                const fraction = Math.max(0, (anchorThreshold - y) / (anchorThreshold - minY));
                // Smooth cubic ease-in so the root transitions smoothly without a crease
                weights[i] = fraction * fraction * (3 - 2 * fraction);
            }
        }
    } else if (type === 'life_ceiling_collapse' || type === 'prop_vertebral_cable_riser') {
        // Rubble/conduit cluster with loose cables extending into lower perimeter
        const lowerHalf = minY + height * 0.45;
        for (let i = 0; i < count; i += 1) {
            const y = positions.getY(i);
            if (y > lowerHalf) {
                weights[i] = 0;
            } else {
                const fraction = Math.max(0, (lowerHalf - y) / (lowerHalf - minY));
                weights[i] = fraction * 0.85;
            }
        }
    } else if (type === 'life_wind_mast') {
        // Guy wires hanging from upper mast
        for (let i = 0; i < count; i += 1) {
            const y = positions.getY(i);
            const fraction = Math.max(0, Math.min(1, (maxY - y) / height));
            // Mid-span of guy wires sways most
            weights[i] = Math.sin(fraction * Math.PI) * 0.65;
        }
    } else {
        // Generic hanging fallback: lower vertices sway more
        for (let i = 0; i < count; i += 1) {
            const y = positions.getY(i);
            weights[i] = Math.max(0, Math.min(1, (maxY - y) / height));
        }
    }

    return weights;
}

function prepareSwayGeometry(geometry, type) {
    if (geometry.userData.hbSwayPrepared) return Boolean(geometry.getAttribute('hbSway'));
    geometry.userData.hbSwayPrepared = true;

    // If authoring baked COLOR_0 or user specified hbSway attribute, preserve it
    if (geometry.getAttribute('hbSway')) return true;

    const weights = deriveSwayWeights(geometry, type);
    geometry.setAttribute('hbSway', new THREE.BufferAttribute(weights, 1));
    return true;
}

function cableSwayMaterial(source, extras = {}) {
    const amp = Number(extras.hb_amp) || 0.035;
    const speed = Number(extras.hb_speed) || 1.15;
    const key = `${source.uuid}|${amp}|${speed}`;
    if (patchedMaterials.has(key)) return patchedMaterials.get(key);

    const material = source.clone();
    material.name = `${source.name || 'material'}:cableSway`;
    const uniforms = {
        uCableSwayTime: CABLE_SWAY_TIME,
        uCableSwayAmp: { value: amp },
        uCableSwaySpeed: { value: speed }
    };
    material.userData.cableSwayUniforms = uniforms;

    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
                attribute float hbSway;
                uniform float uCableSwayTime;
                uniform float uCableSwayAmp;
                uniform float uCableSwaySpeed;`)
            .replace('#include <begin_vertex>', `#include <begin_vertex>
                if (hbSway > 0.0) {
                    #ifdef USE_INSTANCING
                        vec2 hbOrigin = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
                    #else
                        vec2 hbOrigin = vec2(modelMatrix[3][0], modelMatrix[3][2]);
                    #endif
                    float hbPhase = dot(hbOrigin, vec2(0.23, 0.41)) + dot(position.xz, vec2(0.13, 0.09));
                    float hbT = uCableSwayTime * uCableSwaySpeed + hbPhase;
                    transformed.x += sin(hbT) * uCableSwayAmp * hbSway;
                    transformed.z += sin(hbT * 0.82 + 1.3) * (uCableSwayAmp * 0.8) * hbSway;
                    transformed.y += sin(hbT * 1.65 + 0.8) * (uCableSwayAmp * 0.22) * hbSway;
                }`);
    };

    material.customProgramCacheKey = () => `hb-cable-sway:${source.customProgramCacheKey?.() ?? ''}`;
    patchedMaterials.set(key, material);
    isPatched.add(material);
    return material;
}

/** Patches a prepared model's cable sway; returns how many meshes sway. */
export function applyCableSway(model, type) {
    let count = 0;
    model?.traverse?.((node) => {
        if (!node.isMesh || !node.geometry) return;
        const extras = swayExtras(node, model, type);
        if (!extras) return;
        if (!prepareSwayGeometry(node.geometry, extras.type ?? type)) return;
        if (isPatched.has(node.material)) {
            count += 1;
            return;
        }
        node.material = cableSwayMaterial(node.material, extras);
        count += 1;
    });
    return count;
}
