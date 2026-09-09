import * as THREE from 'three';

// Geometry/textures stay cached. Only materials belong to the fitted weapon.
const instances = new WeakMap();

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
    for (const { material, baseColor } of materials) {
        if (baseColor) material.color.copy(baseColor).multiply(tint);
    }
    root.userData.weaponSheen = `#${tint.getHexString()}`;
}

export function disposeWeaponSheen(root) {
    for (const { material } of instances.get(root) ?? []) material.dispose();
    instances.delete(root);
}
