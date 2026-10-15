// The name of the gun the operator is holding, for the HUD weapon panel (it
// used to read SIDEARM unless a Foundry weapon was equipped).
//
//   1. a field weapon picked up this run (PULSE CARBINE, M-70 FLAMETHROWER)
//   2. a fabricated weapon from the Foundry
//   3. a finish with its own gun model (Queen's Carapace Carbine); set-piece
//      paints named "... Weapon Skin" are not gun names, so they fall through
//   4. the class frame (Vector-9 Talon SMG, Siege-Breaker 50 Autocannon)
import { FRAME_PREFIX, getItemName } from './data/itemCatalog.js';
import { DEFAULT_ARCHETYPES } from './data/classArsenal.js';
import { WEAPON_SKIN_MESHES } from './data/operatorModelUrls.js';
import { getFieldWeaponLabel } from './fieldWeapon.js';
import { DEFAULT_WEAPON_LABEL } from './loadout.js';

const PAINT_ONLY_NAME = /\bweapon skin$/i;

export function getHeldWeaponLabel({ loadout = null, fabricator = null, classId = null, fieldWeaponId = null } = {}) {
    if (fieldWeaponId) {
        const name = getItemName(fieldWeaponId) ?? getFieldWeaponLabel(fieldWeaponId);
        if (name) return name;
    }
    const cls = String(classId ?? loadout?.activeClassId ?? 'scout').toLowerCase();
    const fabricated = loadout?.getEquippedLabel?.(fabricator, cls);
    if (fabricated && fabricated !== DEFAULT_WEAPON_LABEL) return fabricated;

    const skinId = loadout?.getEquippedSkinId?.(cls) ?? null;
    if (skinId && WEAPON_SKIN_MESHES[skinId]) {
        const name = getItemName(skinId);
        if (name && !PAINT_ONLY_NAME.test(name)) return name;
    }
    const archetype = loadout?.getActiveArchetype?.(cls) ?? DEFAULT_ARCHETYPES[cls];
    return getItemName(`${FRAME_PREFIX}${archetype}`) ?? DEFAULT_WEAPON_LABEL;
}
