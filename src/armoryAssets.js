import { getCatalogEntry } from './itemOwnership.js';
import { WEAPON_ARCHETYPES, WEAPON_SKIN_MESHES, CHASSIS_SKIN_MODELS } from './player3dOverlay.js';
import { CHARM_GLB_MAP, MOD_GLB_MAP } from './armoryScene.js';
import { CLASS_ARCHETYPES, CLASS_CHASSIS_SKINS, ARCHETYPE_SKINS } from './loadout.js';
import { deriveIconFromModelUrl } from './armoryPicker.js';
import { ARMORY_PREVIEWS } from './data/armoryPreviews.js';

export const ARMORY_WEAPON_NAMES = Object.freeze({
    talon: 'Vector-9 Talon SMG', talon_c: 'Talon-C Carbine',
    siege_breaker: 'Siege-Breaker 50 Autocannon', tesla_lock: 'Tesla-Lock MK-IV Arc Driver'
});

export function getArmoryModel(id) {
    const key = String(id);
    if (key.startsWith('frame:')) return WEAPON_ARCHETYPES[key.slice(6)] ?? null;
    return WEAPON_SKIN_MESHES[key] ?? CHARM_GLB_MAP[key] ?? MOD_GLB_MAP[key] ?? CHASSIS_SKIN_MODELS[key] ?? null;
}

export function getArmoryIcon(id, explicitIcon = null) {
    const key = String(id);
    const entry = getCatalogEntry(key);
    return ARMORY_PREVIEWS[key]?.icon ?? explicitIcon ?? entry?.localImg ?? entry?.icon
        ?? deriveIconFromModelUrl(getArmoryModel(key));
}

export function getArmoryOfferedIds() {
    const unique = (lists) => [...new Set(Object.values(lists).flat().map(String))];
    return {
        'weapon frame': unique(CLASS_ARCHETYPES).map((id) => `frame:${id}`),
        weapon: unique(ARCHETYPE_SKINS),
        chassis: unique(CLASS_CHASSIS_SKINS)
    };
}
