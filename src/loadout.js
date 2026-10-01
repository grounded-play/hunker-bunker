// ── Roster / Loadout v2 ──────────────────────────────────────────
// Manages the operator's per-class combat loadouts: class weapon archetypes,
// weapon skins, tactical charms, rig overclock modules, and exosuit cosmetics.

import { getRecipe } from './fabricator.js';
import { getItemName } from './data/itemCatalog.js';
import { ARCHETYPE_SKINS, CLASS_ARCHETYPES, CLASS_CHASSIS_SKINS, DEFAULT_ARCHETYPES } from './data/classArsenal.js';
import { EQUIPMENT_SCHEMA_VERSION, composeEquipmentModifiers, getEquipmentDefinition, getEquipmentStatus } from './data/equipmentDefinitions.js';
import { decodeChassisChoice, encodeChassisChoice } from './chassisBodies.js';

export const STORAGE_KEY_V2 = 'hb_loadout_v2';
export const STORAGE_KEY_V1 = 'hb_loadout_v1';
export const DEFAULT_WEAPON_LABEL = 'SIDEARM';

export { ARCHETYPE_SKINS, CLASS_ARCHETYPES, CLASS_CHASSIS_SKINS, DEFAULT_ARCHETYPES };

export function isChassisSupportedForClass(classId, itemdefid) {
    if (itemdefid == null) return true;
    return (CLASS_CHASSIS_SKINS[normalizeClassId(classId)] ?? []).map(String).includes(String(itemdefid));
}

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
            chassisBody: null,
            decalId: null
        },
        hudThemeId: null,
        voicePackId: null,
        tracerFxId: null,
        muzzleFxId: null
    };
}

export class LoadoutManager {
    constructor({ storage = null, attunementTierProvider = null } = {}) {
        this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
        this.attunementTierProvider = attunementTierProvider;
        this.activeClassId = 'scout';
        this.state = this.load();
        this.committedState = JSON.parse(JSON.stringify(this.state));
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
                        result.suit.chassisBody = decodeChassisChoice(encodeChassisChoice(result.suit.chassisSkinId, parsed.suit.chassisBody)).body;
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
            this.committedState = JSON.parse(JSON.stringify(this.state));
        } catch (error) {
            this.state = JSON.parse(JSON.stringify(this.committedState ?? createDefaultLoadoutState()));
            throw error;
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
        if (fabricator?.isFabricated(id) && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fabricated-weapon-equipped', { detail: { id, classId: cls } }));
        }
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

    // `itemdefid` may be a picker value with a body (`5001:male`, see
    // src/chassisBodies.js); a body the item does not ship is dropped.
    equipChassisSkin(itemdefid, body = null) {
        const decoded = decodeChassisChoice(itemdefid);
        const choice = decodeChassisChoice(encodeChassisChoice(decoded.id, body ?? decoded.body));
        this.state.suit.chassisSkinId = choice.id;
        this.state.suit.chassisBody = choice.body;
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

    getEquippedChassisBody() {
        return this.state.suit.chassisBody ?? null;
    }

    getEquippedChassisChoice() {
        return encodeChassisChoice(this.state.suit.chassisSkinId, this.state.suit.chassisBody);
    }

    isChassisSupportedForClass(classId = this.activeClassId, itemdefid = this.state.suit.chassisSkinId) {
        return isChassisSupportedForClass(classId, itemdefid);
    }

    getCurrentAttunementTier() {
        const supplied = this.attunementTierProvider?.();
        const live = supplied ?? (typeof window !== 'undefined' ? window.seasonPass?.getCurrentTier?.() : 0);
        const tier = Number(live);
        return Number.isFinite(tier) ? Math.max(0, Math.floor(tier)) : Number.POSITIVE_INFINITY;
    }

    isCharmAttuned(itemdefid, tier = this.getCurrentAttunementTier()) {
        const definition = getEquipmentDefinition(itemdefid);
        if (!definition || definition.family !== 'charm') return true;
        return tier >= (definition.attunementRank ?? Number.POSITIVE_INFINITY);
    }

    getActiveModifiers(classId = this.activeClassId, mode = 'solo') {
        const mods = {
            cryoDurationMultiplier: 1.0,
            scrapMagnetRadiusBonus: 0.0,
            gasDamageReduction: 0.0,
            kineticPierceBonus: 0,
            shieldRechargeDelayMultiplier: 1.0,
            hiddenRoomDetectionRange: 0,
            lowHpSpeedBoostActive: false,
            dashRefundOnMultiKill: false,
            maxHealthBonus: 0,
            moveSpeedMultiplier: 1.0,
            propsDropSalvage: false,
            fireRateMultiplier: 1.0,
            bossDamageMultiplier: 1.0,
            nonBossDamageMultiplier: 1.0,
            loreDropsGrantSalvage: false,
            clipSizeBonus: 0,
            relicRarityTierBonus: 0,
            maxOxygenMultiplier: 1.0,
            duplicateRelicsToShards: false,
            salvageValueMultiplier: 1.0,
            oxygenDrainMultiplier: 1.0,
            healingMultiplier: 1.0,
            ringCrossingFreeO2: false,
            ringCrossingSpawnsElite: false
        };

        const lo = this.getClassLoadout(classId);
        const tier = this.getCurrentAttunementTier();
        const derived = composeEquipmentModifiers([lo.charmId, lo.mod1Id, lo.mod2Id], {
            mode,
            isAttuned: (definition) => this.isCharmAttuned(definition.id, tier)
        });
        for (const [key, value] of Object.entries(derived)) {
            if (typeof value === 'boolean') mods[key] = Boolean(mods[key]) || value;
            else if (key.endsWith('Multiplier')) mods[key] = (mods[key] ?? 1) * value;
            else if (key.endsWith('Range') || key.endsWith('Interval')) mods[key] = Math.max(mods[key] ?? 0, value);
            else mods[key] = (mods[key] ?? 0) + value;
        }
        return mods;
    }

    getActiveEquipmentSnapshot(classId = this.activeClassId, mode = 'solo') {
        const cls = normalizeClassId(classId);
        const loadout = this.getClassLoadout(cls);
        const ids = [loadout.charmId, loadout.mod1Id, loadout.mod2Id];
        const attunementTier = this.getCurrentAttunementTier();
        return Object.freeze({
            schemaVersion: EQUIPMENT_SCHEMA_VERSION,
            classId: cls,
            mode: String(mode || 'solo'),
            charmId: loadout.charmId,
            overclockIds: Object.freeze([loadout.mod1Id, loadout.mod2Id]),
            attunementTier,
            statuses: Object.freeze(ids.map((id) => getEquipmentStatus(id, {
                mode,
                attuned: this.isCharmAttuned(id, attunementTier)
            })).filter(Boolean)),
            modifiers: Object.freeze({ ...this.getActiveModifiers(cls, mode) })
        });
    }

    getEquippedLabel(fabricator, classId = this.activeClassId) {
        const id = this.getEquippedId(classId);
        if (!id) return DEFAULT_WEAPON_LABEL;
        const recipe = getRecipe(id);
        if (!recipe) return DEFAULT_WEAPON_LABEL;
        if (fabricator && !fabricator.isFabricated(id)) return DEFAULT_WEAPON_LABEL;
        return getItemName(recipe.item ?? id) ?? recipe.name;
    }

    /**
     * Strip equipped cosmetics the player no longer owns.
     *
     * The debug UNLOCK ALL override has to be honoured here, not just at the
     * equip gate: without it you could equip a locked chassis in the Armory and
     * have the next inventory refresh silently strip it back off -- which is
     * what "debug doesn't unlock everything" looked like from the outside.
     * steamVaultUi calls this with an empty inventory on sign-out, so that path
     * stripped every slot at once.
     *
     * @param inventory   Owned items, as {itemdefid, quantity}.
     * @param isUnlockAll Override, defaulting to the live ownership store.
     */
    reconcileOwnership(inventory = [], { isUnlockAll = null } = {}) {
        const unlockAll = isUnlockAll ?? (typeof window !== 'undefined'
            ? Boolean(window.itemOwnership?.isUnlockAll?.())
            : false);
        if (unlockAll) return;

        // Prefer the ownership store: it also knows about items that ship
        // unlocked (community chassis skins, earned rig modules) and about
        // achievement/season grants, none of which appear in the Steam
        // inventory array. Checking the array alone stripped all of them --
        // and community skin ids are strings, so Number() made them NaN and
        // they could never match at all.
        const store = typeof window !== 'undefined' ? window.itemOwnership : null;
        const ownedDefIds = new Set(inventory.map((item) => Number(item.itemdefid)));
        const owned = (id) => {
            if (!id) return true;
            if (store?.isOwned) return store.isOwned(id);
            return ownedDefIds.has(Number(id));
        };

        // Suit-wide cosmetics.
        if (!owned(this.state.suit.decalId)) this.state.suit.decalId = null;
        if (!owned(this.state.suit.chassisSkinId)) {
            this.state.suit.chassisSkinId = null;
            this.state.suit.chassisBody = null;
        }

        // UI overlays and the alt-radio voice bank. These went unreconciled
        // before, so an unowned HUD theme, tracer or voice bank stayed equipped
        // indefinitely -- the mirror image of the stripping bug above.
        if (!owned(this.state.hudThemeId)) this.state.hudThemeId = null;
        if (!owned(this.state.tracerFxId)) this.state.tracerFxId = null;
        if (!owned(this.state.voicePackId)) this.state.voicePackId = null;

        // Per-class charms, weapon skins and rig modules.
        for (const cls of ['scout', 'tank', 'engineer']) {
            const lo = this.state.perClass[cls];
            // Charm attunements are an earnable, non-market progression
            // license. Once its rank is reached, the matching visual may be
            // equipped locally even without a tradable Steam copy; buying the
            // cosmetic before that rank never grants its gameplay power.
            if (!owned(lo.charmId) && !this.isCharmAttuned(lo.charmId)) lo.charmId = null;
            if (!owned(lo.weaponSkinId)) lo.weaponSkinId = null;
            if (!owned(lo.mod1Id)) lo.mod1Id = null;
            if (!owned(lo.mod2Id)) lo.mod2Id = null;
        }

        this.save();
    }

    reset() {
        this.state = createDefaultLoadoutState();
        this.save();
    }
}
