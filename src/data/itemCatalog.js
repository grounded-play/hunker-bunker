// One item catalog for every surface that shows an item: the Armory, the
// Foundry, the hero screen and the Vault (Sprint 48 P2; QA 2026-09-24 "weapon
// and item images do not match").
//
// Before this, each surface had its own opinion. The Armory named 13 items by
// a shortened hand-kept name, drew model renders, and graded achievement
// rewards a flat `rare` under generated names; the Vault drew the older Steam
// economy art (a generic class chassis for every community skin); the Foundry
// defined its own names, rarities and numbered schematic cards for the items
// it grants (the Sporesnail Pearl printed as LEGENDARY and arrived as
// uncommon). Now:
//
//   * identity (name, rarity, kind) comes from itemOwnership's merged catalog:
//     the Steam schema, authored achievement rewards, community skins and
//     earned rig modules;
//   * the icon is the transparent render of the model the player will see
//     (armoryPreviews.js), falling back to the Steam economy art;
//   * weapon frames and the Foundry's fabricated weapons are entries here too.
//
// A fabricated weapon is a firing profile fitted to the class's own gun
// (loadout.equip stores it as `craftedWeaponId`; the model in hand stays the
// class frame), so its icon and model are the frame's, resolved per class.
import { getCatalogEntry, getCatalogIds, ITEM_TYPE } from '../itemOwnership.js';
import { ARMORY_PREVIEWS } from './armoryPreviews.js';
import { ARCHETYPE_SKINS, CLASS_ARCHETYPES, CLASS_CHASSIS_SKINS, DEFAULT_ARCHETYPES } from './classArsenal.js';
import { COMMUNITY_SKINS } from './communitySkins.js';
import { STEAM_ITEM_CATALOG } from './steamItemCatalog.js';
import { hasKey, t } from '../i18n.js';

export const ITEM_KIND = Object.freeze({
    ...ITEM_TYPE,
    FRAME: 'frame',
    WEAPON_PROFILE: 'weapon_profile'
});

export const RARITY_ORDER = Object.freeze(['common', 'uncommon', 'rare', 'epic', 'legendary']);

export const FRAME_PREFIX = 'frame:';

export const FRAME_NAMES = Object.freeze({
    talon: 'Vector-9 Talon SMG',
    talon_c: 'Talon-C Carbine',
    siege_breaker: 'Siege-Breaker 50 Autocannon',
    tesla_lock: 'Tesla-Lock MK-IV Arc Driver'
});

// The Foundry's fabricated weapons (src/fieldWeapon.js holds their firing
// numbers). Rarity here is the one the Foundry rolls against and shows.
export const WEAPON_PROFILES = Object.freeze({
    mk1_sidearm: Object.freeze({ name: 'Mark-I Sidearm', rarity: 'common' }),
    pulse_carbine: Object.freeze({ name: 'Pulse Carbine', rarity: 'rare' }),
    scatter_rep: Object.freeze({ name: 'Scatter Repeater', rarity: 'common' }),
    rail_marksman: Object.freeze({ name: 'Rail Marksman', rarity: 'epic' }),
    neon_smg: Object.freeze({ name: 'Neon SMG', rarity: 'rare' }),
    cryo_lance: Object.freeze({ name: 'Cryo Lance', rarity: 'epic' })
});

const CLASS_IDS = Object.freeze(['scout', 'tank', 'engineer']);

function normalizeClassId(classId) {
    const lower = String(classId ?? '').trim().toLowerCase();
    if (lower === 'tank' || lower === 'heavy') return 'tank';
    if (lower === 'engineer' || lower === 'assault') return 'engineer';
    return 'scout';
}

function classOfFrame(archetypeId) {
    return CLASS_IDS.find((cls) => CLASS_ARCHETYPES[cls]?.includes(archetypeId)) ?? null;
}

function classOfItem(id) {
    const key = String(id);
    for (const [archetypeId, skins] of Object.entries(ARCHETYPE_SKINS)) {
        if (skins.includes(key)) return classOfFrame(archetypeId);
    }
    for (const cls of CLASS_IDS) {
        if ((CLASS_CHASSIS_SKINS[cls] ?? []).map(String).includes(key)) return cls;
    }
    return null;
}

// The Steam schema stores "container" and "key" in the rarity field of the
// relic cache (4000) and its key (4001); cards need a real grade.
function normalizeRarity(value) {
    const rarity = String(value ?? '').toLowerCase();
    return RARITY_ORDER.includes(rarity) ? rarity : 'common';
}

function steamNameKey(id) {
    return STEAM_ITEM_CATALOG[id] ? `narrative.steamItems.${id}.name` : null;
}

const COMMUNITY_BY_ID = new Map(COMMUNITY_SKINS.map((skin) => [skin.id, skin]));

function iconFor(id, base = null) {
    const preview = ARMORY_PREVIEWS[String(id)];
    return preview?.icon ?? base?.localImg ?? null;
}

function modelFor(id, base = null) {
    const preview = ARMORY_PREVIEWS[String(id)];
    return preview?.model ?? base?.glbUrl ?? null;
}

let entries = null;

// Built on first use, not at import, so modules that import each other
// through the loadout never read a half-initialized table.
function build() {
    if (entries) return entries;
    entries = new Map();
    for (const rawId of getCatalogIds()) {
        const base = getCatalogEntry(rawId);
        const id = base.itemdefid;
        const community = COMMUNITY_BY_ID.get(id);
        entries.set(id, Object.freeze({
            id,
            name: base.name,
            nameKey: steamNameKey(id),
            rarity: normalizeRarity(base.rarity),
            kind: base.type ?? null,
            class: base.classId ?? community?.classId ?? classOfItem(id),
            modelUrl: modelFor(id, base),
            iconUrl: iconFor(id, base),
            source: base.source ?? null
        }));
    }
    for (const [archetypeId, name] of Object.entries(FRAME_NAMES)) {
        const id = `${FRAME_PREFIX}${archetypeId}`;
        entries.set(id, Object.freeze({
            id,
            name,
            nameKey: `narrative.items.frame.${archetypeId}`,
            rarity: 'common',
            kind: ITEM_KIND.FRAME,
            class: classOfFrame(archetypeId),
            modelUrl: modelFor(id),
            iconUrl: iconFor(id),
            source: 'class'
        }));
    }
    for (const [id, profile] of Object.entries(WEAPON_PROFILES)) {
        entries.set(id, Object.freeze({
            id,
            name: profile.name,
            nameKey: `narrative.items.weaponProfile.${id}`,
            rarity: profile.rarity,
            kind: ITEM_KIND.WEAPON_PROFILE,
            class: null,
            modelUrl: null,
            iconUrl: null,
            source: 'foundry'
        }));
    }
    return entries;
}

function toKey(id) {
    if (id === null || id === undefined || id === '') return null;
    if (typeof id === 'number') return id;
    const text = String(id).trim();
    return /^-?\d+$/.test(text) ? Number(text) : text;
}

/**
 * The item as every surface should show it, or null for an unknown id.
 * `classId` (and optionally the class's current `frameId`) picks the gun a
 * fabricated weapon profile is fitted to; other items ignore it.
 */
export function getItem(id, { classId = null, frameId = null } = {}) {
    const entry = build().get(toKey(id));
    if (!entry) return null;
    if (entry.kind !== ITEM_KIND.WEAPON_PROFILE) return entry;
    const cls = normalizeClassId(classId);
    const frame = build().get(frameId && String(frameId).startsWith(FRAME_PREFIX)
        ? String(frameId)
        : `${FRAME_PREFIX}${DEFAULT_ARCHETYPES[cls]}`);
    return Object.freeze({ ...entry, class: cls, modelUrl: frame?.modelUrl ?? null, iconUrl: frame?.iconUrl ?? null, frameId: frame?.id ?? null });
}

export function getItemIds() {
    return [...build().keys()];
}

/** The localized name, falling back to the catalog's English name. */
export function getItemName(id, options) {
    const item = getItem(id, options);
    if (!item) return null;
    return item.nameKey && hasKey(item.nameKey) ? t(item.nameKey) : item.name;
}

export function compareRarity(a, b) {
    return RARITY_ORDER.indexOf(String(a).toLowerCase()) - RARITY_ORDER.indexOf(String(b).toLowerCase());
}

/**
 * What a surface draws for an item: localized name, rarity, icon. The Armory,
 * Foundry, hero screen and Vault all go through this, so one id always shows
 * the same card (src/data/itemCatalog.test.js checks each surface against it).
 */
export function getItemView(id, options) {
    const item = getItem(id, options);
    if (!item) return null;
    return Object.freeze({
        id: item.id,
        name: getItemName(id, options),
        rarity: item.rarity,
        kind: item.kind,
        class: item.class,
        icon: item.iconUrl
    });
}
