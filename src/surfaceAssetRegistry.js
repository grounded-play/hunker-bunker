import { DRESSING_KITS, ROLE_DRESSING } from './roomDressingKits.js';

export const SURFACE_ASSET_PLACEMENT = Object.freeze({
    FLOOR: 'floor',
    WALL: 'wall'
});

// A rupture splash is authored to read on either side of the wall/floor seam.
// Everything else must have one unambiguous support plane.
const MULTI_SURFACE_DECALS = new Set(['decal_pod_312_rupture_splatter']);

function collectLayerTypes(layer) {
    const types = new Set();
    for (const catalog of [DRESSING_KITS, ROLE_DRESSING]) {
        for (const kit of Object.values(catalog)) {
            for (const type of kit[layer] ?? []) types.add(type);
        }
    }
    return types;
}

const wallTypes = collectLayerTypes('wallDecals');
const floorTypes = collectLayerTypes('floorDecals');
const profiles = {};

for (const type of new Set([...wallTypes, ...floorTypes])) {
    const allowedPlacement = [];
    if (wallTypes.has(type)) allowedPlacement.push(SURFACE_ASSET_PLACEMENT.WALL);
    if (floorTypes.has(type)) allowedPlacement.push(SURFACE_ASSET_PLACEMENT.FLOOR);
    if (allowedPlacement.length > 1 && !MULTI_SURFACE_DECALS.has(type)) {
        throw new Error(`Surface decal "${type}" is ambiguously registered for wall and floor placement`);
    }
    profiles[type] = Object.freeze({
        type,
        surface: allowedPlacement.length === 1 ? allowedPlacement[0] : 'multi',
        allowedPlacement: Object.freeze(allowedPlacement),
        aspectPolicy: 'preserve',
        localUpAxis: '+Y',
        depthOffset: allowedPlacement.includes(SURFACE_ASSET_PLACEMENT.WALL) ? 0.012 : 0.032,
        renderOrder: 6
    });
}

const SURFACE_ASSET_PROFILES = Object.freeze(profiles);

export function getSurfaceAssetProfile(type) {
    return SURFACE_ASSET_PROFILES[String(type ?? '')] ?? null;
}

export function surfacePlacementForLayer(layer) {
    if (layer === 'wallDecal') return SURFACE_ASSET_PLACEMENT.WALL;
    if (layer === 'floorDecal') return SURFACE_ASSET_PLACEMENT.FLOOR;
    return null;
}

export function isSurfaceAssetPlacementAllowed(type, layer) {
    const placement = surfacePlacementForLayer(layer);
    if (!placement) return true;
    const profile = getSurfaceAssetProfile(type);
    return profile ? profile.allowedPlacement.includes(placement) : true;
}

export function getSurfaceAssetProfiles() {
    return { ...SURFACE_ASSET_PROFILES };
}
