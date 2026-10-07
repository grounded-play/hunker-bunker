// What an item does, in the player's language (Sprint 51): the Foundry
// LOADOUT tab, the hero strip and the slot picker all read it here.
// Charms and Rig Modules: their gameplay effect (src/data/equipmentDefinitions.js
// holds the numbers the game applies; these are the same numbers in words).
// Foundry weapon profiles: how they fire. Everything else is cosmetic.
// Keys are written out so the locale audit can see each one in use.
import { ITEM_KIND } from './data/itemCatalog.js';
import { t } from './i18n.js';

const EQUIPMENT_EFFECT_KEYS = Object.freeze({
    4130: 'ui.equipment.effect.4130',
    4131: 'ui.equipment.effect.4131',
    4132: 'ui.equipment.effect.4132',
    4133: 'ui.equipment.effect.4133',
    4134: 'ui.equipment.effect.4134',
    4135: 'ui.equipment.effect.4135',
    4136: 'ui.equipment.effect.4136',
    4137: 'ui.equipment.effect.4137',
    4138: 'ui.equipment.effect.4138',
    4139: 'ui.equipment.effect.4139',
    4140: 'ui.equipment.effect.4140',
    4141: 'ui.equipment.effect.4141',
    4142: 'ui.equipment.effect.4142',
    4143: 'ui.equipment.effect.4143',
    4144: 'ui.equipment.effect.4144',
    4145: 'ui.equipment.effect.4145',
    4146: 'ui.equipment.effect.4146',
    4147: 'ui.equipment.effect.4147',
    4160: 'ui.equipment.effect.4160',
    4161: 'ui.equipment.effect.4161',
    4162: 'ui.equipment.effect.4162',
    4163: 'ui.equipment.effect.4163',
    4164: 'ui.equipment.effect.4164',
    4165: 'ui.equipment.effect.4165',
    4166: 'ui.equipment.effect.4166',
    4167: 'ui.equipment.effect.4167',
});

const WEAPON_PROFILE_KEYS = Object.freeze({
    mk1_sidearm: 'ui.equipment.weapon_profile.mk1_sidearm',
    pulse_carbine: 'ui.equipment.weapon_profile.pulse_carbine',
    scatter_rep: 'ui.equipment.weapon_profile.scatter_rep',
    rail_marksman: 'ui.equipment.weapon_profile.rail_marksman',
    neon_smg: 'ui.equipment.weapon_profile.neon_smg',
    cryo_lance: 'ui.equipment.weapon_profile.cryo_lance',
});

/** The i18n key for what an item does, or null for an empty slot. */
export function itemEffectKey(view) {
    if (!view) return null;
    const id = String(view.id);
    if (EQUIPMENT_EFFECT_KEYS[id]) return EQUIPMENT_EFFECT_KEYS[id];
    if (WEAPON_PROFILE_KEYS[id]) return WEAPON_PROFILE_KEYS[id];
    if (view.kind === ITEM_KIND.FRAME) return 'ui.equipment.frame';
    return 'ui.equipment.cosmetic';
}

export function itemEffectText(view) {
    const key = itemEffectKey(view);
    return key ? t(key) : '';
}

/** True when the item changes play, not just the look. */
export function itemAffectsPlay(view) {
    const key = itemEffectKey(view);
    return Boolean(key) && key !== 'ui.equipment.cosmetic';
}
