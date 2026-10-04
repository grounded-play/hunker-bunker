/**
 * Shared surface materials for the Kenney modular kit pieces.
 *
 * scripts/blender/texture_kit_pieces.py exports every piece with world-unit
 * box UVs, a grey vertex tint baked from Kenney's palette, and two material
 * slots: `kit_wall` and `kit_floor`. At load those slots are swapped for one
 * shared material per skin and surface.
 *
 * Supports both classic and custom Nordic Cathedral Biomech skins:
 * - `cave`: Classic CC0 damp rock and brown mud rocks (Poly Haven)
 * - `space`: Classic CC0 dark corporate metal plate (Poly Haven)
 * - `cathedral`: Custom Nordic Cathedral granite ashlar with blackened iron strap bindings & crypt flagstones
 * - `bunker`: Custom heavy industrial bulkhead with rivets, conduits & hexagonal anti-slip drainage grating
 * - `biomech`: Custom Synthesis living infestation with Giger tracheal ribs & pulsating bioluminescent mycelium veins
 *
 * All sets can be used together dynamically across sectors, biomes, and room variations.
 */
import * as THREE from 'three';
import { assetUrl } from './assetUrl.js';

// Kenney units are metres on a 4-unit socket grid with ~4.2-unit walls. At
// 0.75 a cell is 3 world units and a wall stands about twice an operator
// (1.57) -- the corridor proportion the registry's old 3.0 height aimed at.
export const KIT_SCALE = 0.75;

export const KIT_THEMES = Object.freeze({
    CAVE: 'cave',
    SPACE: 'space',
    CATHEDRAL: 'cathedral',
    BUNKER: 'bunker',
    BIOMECH: 'biomech',
    GIGER: 'giger',
    RELIQUARY: 'reliquary',
    CRYO_DECK: 'cryo_deck'
});

const TEXTURE_ROOT = '/3d/runtime/kits/textures';
const SURFACES = Object.freeze({
    cave: { wall: { metalness: 0.0 }, floor: { metalness: 0.0 } },
    space: { wall: { metalness: 0.55 }, floor: { metalness: 0.6 } },
    cathedral: { wall: { metalness: 0.15 }, floor: { metalness: 0.2 } },
    bunker: { wall: { metalness: 0.65 }, floor: { metalness: 0.7 } },
    biomech: { wall: { metalness: 0.2 }, floor: { metalness: 0.15 } },
    giger: { wall: { metalness: 0.45 }, floor: { metalness: 0.50 } },
    reliquary: { wall: { metalness: 0.50 }, floor: { metalness: 0.55 } },
    cryo_deck: { wall: { metalness: 0.60 }, floor: { metalness: 0.65 } }
});

export function kitSkinForType(type) {
    const match = /^kit_(cave|space|cathedral|bunker|biomech|giger|reliquary|cryo_deck)_/.exec(String(type ?? ''));
    return match ? match[1] : null;
}

export function kitTextureUrls(skin, surface) {
    const base = `${TEXTURE_ROOT}/${skin}_${surface}`;
    const urls = {
        color: `${base}_color.webp`,
        normal: `${base}_normal.webp`,
        rough: `${base}_rough.webp`
    };
    if (skin === 'biomech' || skin === 'giger' || skin === 'reliquary' || skin === 'cryo_deck') {
        urls.emissive = `${base}_emissive.webp`;
    }
    return urls;
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
    const matConfig = {
        name: `kit_${skin}_${surface}`,
        map: loadTiling(textureLoader, urls.color, THREE.SRGBColorSpace),
        normalMap: loadTiling(textureLoader, urls.normal),
        roughnessMap: loadTiling(textureLoader, urls.rough),
        roughness: 1,
        metalness: SURFACES[skin]?.[surface]?.metalness ?? 0,
        vertexColors: true,
        // Kenney pieces are authored double-sided: a corridor wall is one sheet.
        side: THREE.DoubleSide
    };
    if (urls.emissive) {
        matConfig.emissiveMap = loadTiling(textureLoader, urls.emissive);
        matConfig.emissive = new THREE.Color(0xffffff);
        matConfig.emissiveIntensity = 1.0;
    }
    const material = new THREE.MeshStandardMaterial(matConfig);
    materials.set(key, material);
    return material;
}

/**
 * Dynamic pulsing for bioluminescent emissive channels.
 * Called in the animation tick to breathe life into biomech and synthesis spaces.
 */
export function updateKitMaterials(elapsedSeconds) {
    const time = Number(elapsedSeconds) || 0;
    const wall = materials.get('biomech:wall');
    const floor = materials.get('biomech:floor');
    if (wall?.emissiveMap) {
        wall.emissiveIntensity = 1.0 + 0.35 * Math.sin(time * 2.2);
    }
    if (floor?.emissiveMap) {
        floor.emissiveIntensity = 0.9 + 0.25 * Math.sin(time * 2.2 + 1.2);
    }
}

/**
 * Swap a kit piece's exported slots for shared materials. Returns the count swapped.
 *
 * Supports dynamic combinations:
 * - Direct skin / theme override: options.skinOverride / options.theme (e.g. 'cathedral', 'bunker', 'biomech', 'cave', 'space')
 * - Dynamic variations:
 *   - In cave mode: variation pieces (_variation) can upgrade to 'cathedral' (sacred alcoves) or 'biomech' (infection)
 *   - In space mode: variation pieces can upgrade to 'bunker' (heavy industrial machinery) or 'biomech'
 */
export function applyKitMaterials(root, type, loader = null, options = {}) {
    let skin = options.skinOverride || options.theme || kitSkinForType(type);
    if (!skin || !root?.traverse) return 0;

    const isVariation = options.isVariation || type?.endsWith('_variation');
    if (options.dynamicVariations && isVariation) {
        if (options.variantTheme) {
            skin = options.variantTheme;
        } else if (skin === 'cave') {
            skin = options.biome === 'bio' ? 'biomech' : 'cathedral';
        } else if (skin === 'space') {
            skin = options.biome === 'bio' ? 'biomech' : 'bunker';
        }
    }

    let swapped = 0;
    root.traverse((object) => {
        if (!object.isMesh) return;
        const name = object.material?.name || '';
        const match = /^kit_(?:.*_)?(floor|wall)$/.exec(name);
        const surface = match ? match[1] : null;
        if (!surface) return;
        object.material = getKitMaterial(skin, surface, loader);
        swapped += 1;
    });
    return swapped;
}
