// ── Roster / Loadout v2 ──────────────────────────────────────────
// Manages the operator's per-class combat loadouts: class weapon archetypes,
// weapon skins, tactical charms, rig overclock modules, and exosuit cosmetics.

import { getRecipe } from './fabricator.js';
import { COMMUNITY_CLASS_MAP } from './data/communitySkins.js';

export const STORAGE_KEY_V2 = 'hb_loadout_v2';
export const STORAGE_KEY_V1 = 'hb_loadout_v1';
export const DEFAULT_WEAPON_LABEL = 'SIDEARM';

export const DEFAULT_ARCHETYPES = Object.freeze({
    scout: 'talon',
    tank: 'siege_breaker',
    engineer: 'tesla_lock'
});

export const CLASS_ARCHETYPES = Object.freeze({
    scout: ['talon', 'talon_c'],
    tank: ['siege_breaker'],
    engineer: ['tesla_lock']
});

// Chassis skins with authored runtime meshes. Keep this list class-specific:
// loading a Scout chassis as a Tank would replace the operator silhouette, not
// merely recolor it. Additional catalog chassis can be added here when their
// corresponding runtime GLBs land.
export const CLASS_CHASSIS_SKINS = Object.freeze({
    scout: ['4113', ...(COMMUNITY_CLASS_MAP?.scout || [])],
    tank: ['4114', ...(COMMUNITY_CLASS_MAP?.tank || [])],
    engineer: ['4112', ...(COMMUNITY_CLASS_MAP?.engineer || [])]
});

export const ARCHETYPE_SKINS = Object.freeze({
    talon: ['4100', '4105'],
    talon_c: ['4101', '4104', '4108', '4110'],
    siege_breaker: ['4102', '4106'],
    tesla_lock: ['4103', '4107', '4109', '4111']
});

function normalizeClassId(classId) {
    if (!classId) return 'scout';
    const lower = String(classId).trim().toLowerCase();
    if (lower === 'scout') return 'scout';
    if (lower === 'tank' || lower === 'heavy') return 'tank';
    if (lower === 'engineer' || lower === 'assault') return 'engineer';
    return 'scout';
}

function createDefaultClassLoadout(classId) {
    const normalized = normalizeClassId(classId);
    return {
        archetypeId: DEFAULT_ARCHETYPES[normalized] ?? 'talon',
        weaponSkinId: null,
        charmId: null,
        mod1Id: null,
        mod2Id: null,
        craftedWeaponId: null
    };
}

function createDefaultLoadoutState() {
    return {
        version: 2,
        perClass: {
            scout: createDefaultClassLoadout('scout'),
            tank: createDefaultClassLoadout('tank'),
            engineer: createDefaultClassLoadout('engineer')
        },
        suit: {
            chassisSkinId: null,
            decalId: null
        },
        hudThemeId: null,
        voicePackId: null,
        tracerFxId: null,
        muzzleFxId: null
    };
}

export class LoadoutManager {
    constructor({ storage = null } = {}) {
        this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
        this.activeClassId = 'scout';
        this.state = this.load();
    }

    setActiveClass(classId) {
        this.activeClassId = normalizeClassId(classId);
    }

    load() {
        // 1. Try v2 format
        try {
            const rawV2 = this.storage?.getItem(STORAGE_KEY_V2);
            if (rawV2) {
                const parsed = JSON.parse(rawV2);
                if (parsed && parsed.version === 2 && parsed.perClass) {
                    const result = createDefaultLoadoutState();
                    for (const cls of ['scout', 'tank', 'engineer']) {
                        if (parsed.perClass[cls]) {
                            const p = parsed.perClass[cls];
                            result.perClass[cls] = {
                                archetypeId: p.archetypeId || DEFAULT_ARCHETYPES[cls],
                                weaponSkinId: p.weaponSkinId != null ? String(p.weaponSkinId) : null,
                                charmId: p.charmId != null ? String(p.charmId) : null,
                                mod1Id: p.mod1Id != null ? String(p.mod1Id) : null,
                                mod2Id: p.mod2Id != null ? String(p.mod2Id) : null,
                                craftedWeaponId: p.craftedWeaponId != null ? String(p.craftedWeaponId) : null
                            };
                        }
                    }
                    if (parsed.suit) {
                        result.suit.chassisSkinId = parsed.suit.chassisSkinId != null ? String(parsed.suit.chassisSkinId) : null;
                        result.suit.decalId = parsed.suit.decalId != null ? String(parsed.suit.decalId) : null;
                    }
                    result.hudThemeId = parsed.hudThemeId != null ? String(parsed.hudThemeId) : null;
                    result.voicePackId = parsed.voicePackId != null ? String(parsed.voicePackId) : null;
                    result.tracerFxId = parsed.tracerFxId != null ? String(parsed.tracerFxId) : null;
                    result.muzzleFxId = parsed.muzzleFxId != null ? String(parsed.muzzleFxId) : null;
                    return result;
                }
            }
        } catch {
            // fall through
        }

        // 2. Migration from v1 or raw legacy localStorage keys
        const migrated = createDefaultLoadoutState();
        try {
            const rawV1 = this.storage?.getItem(STORAGE_KEY_V1);
            if (rawV1) {
                const p1 = JSON.parse(rawV1);
                if (p1 && typeof p1 === 'object') {
                    const scout = migrated.perClass.scout;
                    if (p1.equippedWeaponId) scout.craftedWeaponId = p1.equippedWeaponId;
                    if (p1.equippedSkinId) scout.weaponSkinId = String(p1.equippedSkinId);
                    if (p1.equippedCharmId) scout.charmId = String(p1.equippedCharmId);
                    if (p1.equippedRigModule1) scout.mod1Id = String(p1.equippedRigModule1);
                    if (p1.equippedRigModule2) scout.mod2Id = String(p1.equippedRigModule2);
                    if (p1.equippedDecalId) migrated.suit.decalId = String(p1.equippedDecalId);
                    if (p1.equippedHudThemeId) migrated.hudThemeId = String(p1.equippedHudThemeId);
                    if (p1.equippedVoicePackId) migrated.voicePackId = String(p1.equippedVoicePackId);
                }
            }

            // Raw steamVault keys migration
            const rawPatch = this.storage?.getItem('hb_equipped_patch');
            if (rawPatch && !migrated.suit.decalId) migrated.suit.decalId = String(rawPatch);
            const rawDecal = this.storage?.getItem('hb_equipped_decal');
            if (rawDecal && !migrated.suit.decalId) migrated.suit.decalId = String(rawDecal);
            const rawSkin = this.storage?.getItem('hb_equipped_weapon_finish');
            if (rawSkin && !migrated.perClass.scout.weaponSkinId) migrated.perClass.scout.weaponSkinId = String(rawSkin);
        } catch {
            // best-effort migration
        }

        return migrated;
    }

    save() {
        try {
            this.storage?.setItem(STORAGE_KEY_V2, JSON.stringify(this.state));
        } catch {
            // best-effort
        }
    }

    getClassLoadout(classId = this.activeClassId) {
        const cls = normalizeClassId(classId);
        return this.state.perClass[cls] ?? this.state.perClass.scout;
    }

    getActiveArchetype(classId = this.activeClassId) {
        const cls = normalizeClassId(classId);
        return this.state.perClass[cls]?.archetypeId ?? DEFAULT_ARCHETYPES[cls];
    }

    setArchetype(classId, archetypeId) {
        const cls = normalizeClassId(classId);
        const allowed = CLASS_ARCHETYPES[cls] || [];
        if (!allowed.includes(archetypeId)) return false;

        const loadout = this.getClassLoadout(cls);
        loadout.archetypeId = archetypeId;

        // If currently equipped skin does not fit the new archetype, clear it
        if (loadout.weaponSkinId) {
            const validSkins = ARCHETYPE_SKINS[archetypeId] || [];
            if (!validSkins.includes(String(loadout.weaponSkinId))) {
                loadout.weaponSkinId = null;
            }
        }

        this.save();
        return true;
    }

    // Equip a fabricated weapon id (legacy support)
    equip(id, fabricator, classId = this.activeClassId) {
        const cls = normalizeClassId(classId);
        const loadout = this.getClassLoadout(cls);
        if (id == null) {
            loadout.craftedWeaponId = null;
            this.save();
            return true;
        }
        const recipe = getRecipe(id);
        if (!recipe || recipe.klass !== 'WEAPON') return false;
        if (fabricator && !fabricator.isFabricated(id)) return false;
        loadout.craftedWeaponId = id;
        this.save();
        return true;
    }

    // Flexible method signatures to support (classId, itemdefid) or (itemdefid, classId) or (itemdefid)
    equipCharm(arg1, arg2) {
        let cls;
        let itemdefid;
        if (typeof arg1 === 'string' && (arg1 === 'scout' || arg1 === 'tank' || arg1 === 'engineer')) {
            cls = arg1;
            itemdefid = arg2;
        } else {
            itemdefid = arg1;
            cls = arg2 || this.activeClassId;
        }
        cls = normalizeClassId(cls);
        this.state.perClass[cls].charmId = itemdefid != null ? String(itemdefid) : null;
        this.save();
        return true;
    }

    equipRigModule(slotOrClass, slotOrItem, maybeItem) {
        let cls;
        let slot;
        let itemdefid;

        if (typeof slotOrClass === 'string' && (slotOrClass === 'scout' || slotOrClass === 'tank' || slotOrClass === 'engineer')) {
            cls = slotOrClass;
            slot = Number(slotOrItem) || 1;
            itemdefid = maybeItem;
        } else {
            slot = Number(slotOrClass) || 1;
            itemdefid = slotOrItem;
            cls = maybeItem || this.activeClassId;
        }

        cls = normalizeClassId(cls);
        const loadout = this.state.perClass[cls];
        if (slot === 2) {
            loadout.mod2Id = itemdefid != null ? String(itemdefid) : null;
        } else {
            loadout.mod1Id = itemdefid != null ? String(itemdefid) : null;
        }
        this.save();
        return true;
    }

    equipWeaponSkin(arg1, arg2) {
        let cls;
        let itemdefid;
        if (typeof arg1 === 'string' && (arg1 === 'scout' || arg1 === 'tank' || arg1 === 'engineer')) {
            cls = arg1;
            itemdefid = arg2;
        } else {
            itemdefid = arg1;
            cls = arg2 || this.activeClassId;
        }
        cls = normalizeClassId(cls);
        const loadout = this.state.perClass[cls];
        if (itemdefid != null) {
            const currentArchetype = loadout.archetypeId || DEFAULT_ARCHETYPES[cls];
            const allowed = ARCHETYPE_SKINS[currentArchetype] || [];
            if (allowed.includes(String(itemdefid)) || String(itemdefid).startsWith('22')) {
                loadout.weaponSkinId = String(itemdefid);
            } else {
                loadout.weaponSkinId = String(itemdefid);
            }
        } else {
            loadout.weaponSkinId = null;
        }
        this.save();
        return true;
    }

    // Alias for equipWeaponSkin / backwards compatibility
    equipSkin(itemdefid, classId = this.activeClassId) {
        return this.equipWeaponSkin(classId, itemdefid);
    }

    equipDecal(itemdefid) {
        this.state.suit.decalId = itemdefid != null ? String(itemdefid) : null;
        this.save();
        return true;
    }

    equipChassisSkin(itemdefid) {
        this.state.suit.chassisSkinId = itemdefid != null ? String(itemdefid) : null;
        this.save();
        return true;
    }

    equipHudTheme(themeId) {
        this.state.hudThemeId = themeId != null ? String(themeId) : null;
        this.save();
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('loadout-hud-theme-changed', { detail: { themeId: this.state.hudThemeId } }));
        }
        return true;
    }

    equipVoicePack(voicePackId) {
        this.state.voicePackId = voicePackId != null ? String(voicePackId) : null;
        this.save();
        return true;
    }

    // Season 0 Tracer/Muzzle FX Mutators (itemdefs 4152/4153) — read by
    // src/threeGame.js's spawnPlayerShot/spawnProjectile.
    equipTracerFx(tracerFxId) {
        this.state.tracerFxId = tracerFxId != null ? String(tracerFxId) : null;
        this.save();
        return true;
    }

    equipMuzzleFx(muzzleFxId) {
        this.state.muzzleFxId = muzzleFxId != null ? String(muzzleFxId) : null;
        this.save();
        return true;
    }

    // Backwards-compatible getters
    getEquippedId(classId = this.activeClassId) {
        return this.getClassLoadout(classId).craftedWeaponId;
    }

    getEquippedCharmId(classId = this.activeClassId) {
        return this.getClassLoadout(classId).charmId;
    }

    getEquippedRigModule(slot = 1, classId = this.activeClassId) {
        const lo = this.getClassLoadout(classId);
        return slot === 2 ? lo.mod2Id : lo.mod1Id;
    }

    getEquippedDecalId() {
        return this.state.suit.decalId;
    }

    getEquippedSkinId(classId = this.activeClassId) {
        return this.getClassLoadout(classId).weaponSkinId;
    }

    getEquippedChassisSkinId() {
        return this.state.suit.chassisSkinId;
    }

    getActiveModifiers(classId = this.activeClassId) {
        const mods = {
            cryoDurationMultiplier: 1.0,
            scrapMagnetRadiusBonus: 0.0,
            gasDamageReduction: 0.0,
            kineticPierceBonus: 0,
            shieldRechargeDelayMultiplier: 1.0,
            hiddenRoomDetectionRange: 0,
            lowHpSpeedBoostActive: false,
            dashRefundOnMultiKill: false
        };

        const lo = this.getClassLoadout(classId);
        const activeMods = [lo.mod1Id, lo.mod2Id].filter(Boolean);

        for (const id of activeMods) {
            switch (String(id)) {
                case '4140': // Cryo-Capacitor Overclock
                    mods.cryoDurationMultiplier += 0.08;
                    break;
                case '4141': // Magnetic Scavenger Coil
                    mods.scrapMagnetRadiusBonus += 0.20;
                    break;
                case '4142': // Bio-Hazard Filter Vent
                    mods.gasDamageReduction += 0.12;
                    break;
                case '4143': // Kinetic Impact Bushing
                    mods.kineticPierceBonus += 1;
                    break;
                case '4144': // Thermal Heat Exchanger
                    mods.shieldRechargeDelayMultiplier -= 0.10;
                    break;
                case '4145': // Echo-Location Transceiver
                    mods.hiddenRoomDetectionRange = 15;
                    break;
                case '4146': // Symbiotic Adrenaline Pump
                    mods.lowHpSpeedBoostActive = true;
                    break;
                case '4147': // Zero-Point Flux Overdrive
                    mods.dashRefundOnMultiKill = true;
                    break;
            }
        }

        return mods;
    }

    getEquippedLabel(fabricator, classId = this.activeClassId) {
        const id = this.getEquippedId(classId);
        if (!id) return DEFAULT_WEAPON_LABEL;
        const recipe = getRecipe(id);
        if (!recipe) return DEFAULT_WEAPON_LABEL;
        if (fabricator && !fabricator.isFabricated(id)) return DEFAULT_WEAPON_LABEL;
        return recipe.name;
    }

    reconcileOwnership(inventory = []) {
        const ownedDefIds = new Set(inventory.map((item) => Number(item.itemdefid)));

        // Validate suit decals / skins
        if (this.state.suit.decalId && !ownedDefIds.has(Number(this.state.suit.decalId))) {
            this.state.suit.decalId = null;
        }
        if (this.state.suit.chassisSkinId && !ownedDefIds.has(Number(this.state.suit.chassisSkinId))) {
            this.state.suit.chassisSkinId = null;
        }

        // Validate per-class charms & skins & mods
        for (const cls of ['scout', 'tank', 'engineer']) {
            const lo = this.state.perClass[cls];
            if (lo.charmId && !ownedDefIds.has(Number(lo.charmId))) {
                lo.charmId = null;
            }
            if (lo.weaponSkinId && !ownedDefIds.has(Number(lo.weaponSkinId))) {
                lo.weaponSkinId = null;
            }
            if (lo.mod1Id && !ownedDefIds.has(Number(lo.mod1Id))) {
                lo.mod1Id = null;
            }
            if (lo.mod2Id && !ownedDefIds.has(Number(lo.mod2Id))) {
                lo.mod2Id = null;
            }
        }

        this.save();
    }

    reset() {
        this.state = createDefaultLoadoutState();
        this.save();
    }
}
