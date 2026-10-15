import * as THREE from 'three';

// Geometry/textures stay cached. Only materials belong to the fitted weapon.
const instances = new WeakMap();

// How far a sheen pulls the paintwork toward its hue, and how much of a dark
// sheen's darkness it keeps. A straight multiply by the sheen colour zeroed
// whole channels (magenta has almost no green) and buried detail under the
// dark sheens, so a gun lost its paintwork to one flat wash.
const SHEEN_STRENGTH = 0.5;
const SHEEN_DARKEN = 0.35;

// The colour a sheen multiplies the weapon's own material colour by: the
// sheen's hue at full brightness, part-way from white, dimmed a little for
// dark sheens. White (GUNMETAL) is exactly white, the factory finish.
export function sheenFactor(color = 0xffffff) {
    const tint = new THREE.Color(color);
    const peak = Math.max(tint.r, tint.g, tint.b, 1e-4);
    const hue = tint.clone().multiplyScalar(1 / peak);
    return new THREE.Color(1, 1, 1)
        .lerp(hue, SHEEN_STRENGTH)
        .multiplyScalar(1 - (1 - Math.min(peak, 1)) * SHEEN_DARKEN);
}

export function applyWeaponSheen(root, color = 0xffffff) {
    if (!root) return;
    let materials = instances.get(root);
    if (!materials) {
        const clones = new Map();
        materials = [];
        root.traverse((mesh) => {
            if (!mesh.isMesh || !mesh.material) return;
            const clone = (source) => {
                if (!clones.has(source)) {
                    const material = source.clone();
                    clones.set(source, material);
                    materials.push({ material, baseColor: source.color?.clone() });
                }
                return clones.get(source);
            };
            mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clone) : clone(mesh.material);
        });
        instances.set(root, materials);
    }
    const tint = new THREE.Color(color);
    const factor = sheenFactor(tint);
    for (const { material, baseColor } of materials) {
        if (baseColor) material.color.copy(baseColor).multiply(factor);
    }
    root.userData.weaponSheen = `#${tint.getHexString()}`;
}

export function disposeWeaponSheen(root) {
    for (const { material } of instances.get(root) ?? []) material.dispose();
    instances.delete(root);
}
