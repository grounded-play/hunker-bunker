/**
 * Shared surface materials for the Kenney modular kit pieces.
 *
 * scripts/blender/texture_kit_pieces.py exports every piece with world-unit
 * box UVs, a grey vertex tint baked from Kenney's palette, and two material
 * slots: `kit_wall` and `kit_floor`. At load those slots are swapped for one
 * shared material per skin and surface, built from the CC0 maps that
 * scripts/build_kit_textures.py writes, so all 80 pieces share four texture
 * sets instead of each carrying its own.
 */
import * as THREE from 'three';
import { assetUrl } from './assetUrl.js';

// Kenney units are metres on a 4-unit socket grid with ~4.2-unit walls. At
// 0.75 a cell is 3 world units and a wall stands about twice an operator
// (1.57) -- the corridor proportion the registry's old 3.0 height aimed at.
export const KIT_SCALE = 0.75;

const TEXTURE_ROOT = '/3d/runtime/kits/textures';
const SURFACES = Object.freeze({
    cave: { wall: { metalness: 0.0 }, floor: { metalness: 0.0 } },
    space: { wall: { metalness: 0.55 }, floor: { metalness: 0.6 } }
});

export function kitSkinForType(type) {
    const match = /^kit_(cave|space)_/.exec(String(type ?? ''));
    return match ? match[1] : null;
}

export function kitTextureUrls(skin, surface) {
    const base = `${TEXTURE_ROOT}/${skin}_${surface}`;
    return { color: `${base}_color.webp`, normal: `${base}_normal.webp`, rough: `${base}_rough.webp` };
}

const materials = new Map();
let defaultLoader = null;

function loadTiling(loader, url, colorSpace) {
    const texture = loader.load(assetUrl(url));
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    if (colorSpace) texture.colorSpace = colorSpace;
    return texture;
}

export function getKitMaterial(skin, surface, loader = null) {
    const key = `${skin}:${surface}`;
    if (materials.has(key)) return materials.get(key);
    const textureLoader = loader ?? (defaultLoader ??= new THREE.TextureLoader());
    const urls = kitTextureUrls(skin, surface);
    const material = new THREE.MeshStandardMaterial({
        name: `kit_${skin}_${surface}`,
        map: loadTiling(textureLoader, urls.color, THREE.SRGBColorSpace),
        normalMap: loadTiling(textureLoader, urls.normal),
        roughnessMap: loadTiling(textureLoader, urls.rough),
        roughness: 1,
        metalness: SURFACES[skin]?.[surface]?.metalness ?? 0,
        vertexColors: true,
        // Kenney pieces are authored double-sided: a corridor wall is one sheet.
        side: THREE.DoubleSide
    });
    materials.set(key, material);
    return material;
}

/** Swap a kit piece's exported slots for the shared materials. Returns the count swapped. */
export function applyKitMaterials(root, type, loader = null) {
    const skin = kitSkinForType(type);
    if (!skin || !root?.traverse) return 0;
    let swapped = 0;
    root.traverse((object) => {
        if (!object.isMesh) return;
        const surface = object.material?.name === 'kit_floor' ? 'floor' : object.material?.name === 'kit_wall' ? 'wall' : null;
        if (!surface) return;
        object.material = getKitMaterial(skin, surface, loader);
        swapped += 1;
    });
    return swapped;
}
