// Special variants (Sprint 53, owner 2026-10-07: "use current models and
// texture or color change them to make them the specials").
//
// Quest objects (src/questObjects.js) and mystery boxes (src/mysteryBoxes.js)
// stand in with shipped models that also appear as ordinary room props. A
// variant makes the special one read as special: its texture is tinted, its
// glowing parts (or, without an emissive map, the whole surface, faintly) take
// the accent colour, and a rim light in that colour outlines it.
//
// Keyed by the A3/A2 model each one stands in for, so when that model ships
// its variant entry can simply be dropped.
//
// Template materials are shared by every clone of a GLB, so a variant works
// on copies -- one copy per (material, variant), shared by every instance.

import * as THREE from 'three';

const RED = 0xef4444;
const CYAN = 0x22d3ee;
const AMBER = 0xf59e0b;
const EMERALD = 0x10b981;

// tint: multiplied into the base colour (white = unchanged).
// glow: emissive colour. rim: rim-light colour; rimStrength 0..1 (thin parts catch the most rim, so keep it low).
export const SPECIAL_VARIANTS = Object.freeze({
    quest_reactor_valves: Object.freeze({ tint: 0xffb09a, glow: RED, rim: RED, rimStrength: 0.6 }),
    quest_lost_probe: Object.freeze({ tint: 0xeaf7ff, glow: CYAN, rim: CYAN, rimStrength: 0.55 }),
    quest_hive_archive_node: Object.freeze({ tint: 0xb9f5da, glow: EMERALD, rim: EMERALD, rimStrength: 0.6 }),
    quest_hive_archive_node_ch2: Object.freeze({ tint: 0xd9f7a8, glow: 0x84cc16, rim: 0x84cc16, rimStrength: 0.6 }),
    quest_hive_archive_node_ch3: Object.freeze({ tint: 0xb4f3ec, glow: 0x2dd4bf, rim: 0x2dd4bf, rimStrength: 0.6 }),
    quest_red_mould_bloom: Object.freeze({ tint: 0xff6b6b, glow: 0xdc2626, rim: RED, rimStrength: 0.55 }),
    quest_cultist_shrine: Object.freeze({ tint: 0xffdca6, glow: AMBER, rim: AMBER, rimStrength: 0.5 }),
    quest_kaelen_ledger_desk: Object.freeze({ tint: 0xffe4b5, glow: AMBER, rim: AMBER, rimStrength: 0.5 }),
    quest_martha_warm_pipe_junction: Object.freeze({ tint: 0xffc49c, glow: 0xf97316, rim: 0xf97316, rimStrength: 0.55 }),
    quest_infested_armory_cabinet: Object.freeze({ tint: 0xd6efe9, glow: CYAN, rim: CYAN, rimStrength: 0.4 }),
    quest_holdout_barricade: Object.freeze({ tint: 0xffe2ad, glow: AMBER, rim: AMBER, rimStrength: 0.5 }),
    quest_briggs_memorial_wall: Object.freeze({ tint: 0xd6dbe4, glow: AMBER, rim: AMBER, rimStrength: 0.4 }),
    mystery_courier_case: Object.freeze({ tint: 0xffe1a8, glow: AMBER, rim: AMBER, rimStrength: 0.55 }),
    mystery_reliquary_pod: Object.freeze({ tint: 0xbff3d9, glow: EMERALD, rim: EMERALD, rimStrength: 0.6 }),
    mystery_quarantine_crate: Object.freeze({ tint: 0xffb3b3, glow: RED, rim: RED, rimStrength: 0.55 }),
    mystery_blacksite_lockbox: Object.freeze({ tint: 0x8c919c, glow: AMBER, rim: AMBER, rimStrength: 0.65 })
});

// Glow across a surface with no emissive map: enough to lift it, not to flatten it.
const FLAT_GLOW_INTENSITY = 0.06;

const variantCopies = new Map();

const LIT = (material) => Boolean(material?.isMeshStandardMaterial || material?.isMeshLambertMaterial || material?.isMeshPhongMaterial);

// One function for every variant, so three compiles one program per material
// type and the colour arrives as a uniform. `this` is the material.
function compileSpecialRim(shader, renderer) {
    this.userData.hbSpecialBaseCompile?.call(this, shader, renderer);
    shader.uniforms.hbSpecialRimColor = { value: this.userData.hbSpecialRimColor };
    shader.uniforms.hbSpecialRimStrength = { value: this.userData.hbSpecialRimStrength };
    shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', 'uniform vec3 hbSpecialRimColor;\nuniform float hbSpecialRimStrength;\nvoid main() {')
        .replace('#include <opaque_fragment>', [
            '{',
            '    vec3 hbSpecialView = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(vViewPosition);',
            '    float hbSpecialRim = pow(1.0 - clamp(dot(normalize(normal), hbSpecialView), 0.0, 1.0), 3.0);',
            '    outgoingLight += hbSpecialRimColor * hbSpecialRim * hbSpecialRimStrength;',
            '}',
            '#include <opaque_fragment>'
        ].join('\n'));
}

function specialCopy(material, key, variant) {
    if (!LIT(material)) return material;
    const id = `${material.uuid}|${key}`;
    const cached = variantCopies.get(id);
    if (cached) return cached;
    const copy = material.clone();
    copy.name = `${material.name || 'material'}:${key}`;
    copy.color?.multiply(new THREE.Color(variant.tint));
    if (copy.emissive) {
        copy.emissive.set(variant.glow);
        copy.emissiveIntensity = copy.emissiveMap ? Math.max(copy.emissiveIntensity ?? 1, 1) : FLAT_GLOW_INTENSITY;
    }
    const baseCompile = material.onBeforeCompile === THREE.Material.prototype.onBeforeCompile ? null : material.onBeforeCompile;
    copy.userData = {
        ...copy.userData,
        hbSpecial: key,
        hbSpecialBaseCompile: baseCompile,
        hbSpecialRimColor: new THREE.Color(variant.rim),
        hbSpecialRimStrength: variant.rimStrength ?? 0.55
    };
    copy.onBeforeCompile = compileSpecialRim;
    const baseKey = baseCompile ? material.customProgramCacheKey() : '';
    copy.customProgramCacheKey = () => `hb-special-rim${baseKey}`;
    variantCopies.set(id, copy);
    return copy;
}

/** Returns how many mesh materials took the variant. */
export function applySpecialVariant(root, key) {
    const variant = Object.hasOwn(SPECIAL_VARIANTS, key) ? SPECIAL_VARIANTS[key] : null;
    if (!root?.traverse || !variant) return 0;
    let changed = 0;
    root.traverse((object) => {
        if (!object.isMesh || !object.material) return;
        if (Array.isArray(object.material)) {
            const next = object.material.map((material) => specialCopy(material, key, variant));
            changed += next.filter((material, index) => material !== object.material[index]).length;
            object.material = next;
        } else {
            const next = specialCopy(object.material, key, variant);
            if (next !== object.material) changed += 1;
            object.material = next;
        }
    });
    root.userData.specialVariant = key;
    return changed;
}
