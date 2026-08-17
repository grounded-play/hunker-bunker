// ── Roster / Loadout ──────────────────────────────────────────
// Manages the operator's active combat loadout: fabricated sidearms,
// cosmetic skins/decals, tactical weapon charms, and rig overclock modules.

import { getRecipe } from './fabricator.js';

const STORAGE_KEY = 'hb_loadout_v1';
const DEFAULT_WEAPON_LABEL = 'SIDEARM';

export class LoadoutManager {
    constructor({ storage = null } = {}) {
        this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
        this.state = this.load();
    }

    load() {
        try {
            const raw = this.storage?.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    return {
                        equippedWeaponId: typeof parsed.equippedWeaponId === 'string' ? parsed.equippedWeaponId : null,
                        equippedSkinId: typeof parsed.equippedSkinId === 'string' || typeof parsed.equippedSkinId === 'number' ? String(parsed.equippedSkinId) : null,
                        equippedDecalId: typeof parsed.equippedDecalId === 'string' || typeof parsed.equippedDecalId === 'number' ? String(parsed.equippedDecalId) : null,
                        equippedCharmId: typeof parsed.equippedCharmId === 'string' || typeof parsed.equippedCharmId === 'number' ? String(parsed.equippedCharmId) : null,
                        equippedRigModule1: typeof parsed.equippedRigModule1 === 'string' || typeof parsed.equippedRigModule1 === 'number' ? String(parsed.equippedRigModule1) : null,
                        equippedRigModule2: typeof parsed.equippedRigModule2 === 'string' || typeof parsed.equippedRigModule2 === 'number' ? String(parsed.equippedRigModule2) : null,
                        equippedHudThemeId: typeof parsed.equippedHudThemeId === 'string' || typeof parsed.equippedHudThemeId === 'number' ? String(parsed.equippedHudThemeId) : null,
                        equippedVoicePackId: typeof parsed.equippedVoicePackId === 'string' || typeof parsed.equippedVoicePackId === 'number' ? String(parsed.equippedVoicePackId) : null
                    };
                }
            }
        } catch {
            // fall through
        }
        return {
            equippedWeaponId: null,
            equippedSkinId: null,
            equippedDecalId: null,
            equippedCharmId: null,
            equippedRigModule1: null,
            equippedRigModule2: null,
            equippedHudThemeId: null,
            equippedVoicePackId: null
        };
    }

    save() {
        try { this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch { /* best-effort */ }
    }

    getEquippedId() {
        return this.state.equippedWeaponId;
    }

    getEquippedCharmId() {
        return this.state.equippedCharmId;
    }

    getEquippedRigModule(slot = 1) {
        return slot === 2 ? this.state.equippedRigModule2 : this.state.equippedRigModule1;
    }

    getEquippedDecalId() {
        return this.state.equippedDecalId;
    }

    getEquippedSkinId() {
        return this.state.equippedSkinId;
    }

    // Equip a fabricated weapon. Returns true on success.
    equip(id, fabricator) {
        if (id == null) {
            this.state.equippedWeaponId = null;
            this.save();
            return true;
        }
        const recipe = getRecipe(id);
        if (!recipe || recipe.klass !== 'WEAPON') return false;
        if (fabricator && !fabricator.isFabricated(id)) return false;
        this.state.equippedWeaponId = id;
        this.save();
        return true;
    }

    // Equip a Tactical Weapon Charm (e.g. 4130)
    equipCharm(itemdefid) {
        this.state.equippedCharmId = itemdefid != null ? String(itemdefid) : null;
        this.save();
        return true;
    }

    // Equip a Rig Overclock Module into slot 1 or slot 2 (e.g. 4140, 4141)
    equipRigModule(slot = 1, itemdefid) {
        const key = slot === 2 ? 'equippedRigModule2' : 'equippedRigModule1';
        this.state[key] = itemdefid != null ? String(itemdefid) : null;
        this.save();
        return true;
    }

    // Equip a Player Decal / Shoulder Patch (e.g. 2000, 4120)
    equipDecal(itemdefid) {
        this.state.equippedDecalId = itemdefid != null ? String(itemdefid) : null;
        this.save();
        return true;
    }

    // Equip a Player / Weapon Skin (e.g. 2200, 4100)
    equipSkin(itemdefid) {
        this.state.equippedSkinId = itemdefid != null ? String(itemdefid) : null;
        this.save();
        return true;
    }

    // Calculate active aggregate gameplay modifiers from socketed rig overclocks
    getActiveModifiers() {
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

        const activeMods = [this.state.equippedRigModule1, this.state.equippedRigModule2].filter(Boolean);

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

    getEquippedLabel(fabricator) {
        const id = this.state.equippedWeaponId;
        if (!id) return DEFAULT_WEAPON_LABEL;
        const recipe = getRecipe(id);
        if (!recipe) return DEFAULT_WEAPON_LABEL;
        if (fabricator && !fabricator.isFabricated(id)) return DEFAULT_WEAPON_LABEL;
        return recipe.name;
    }

    reset() {
        this.state = {
            equippedWeaponId: null,
            equippedSkinId: null,
            equippedDecalId: null,
            equippedCharmId: null,
            equippedRigModule1: null,
            equippedRigModule2: null,
            equippedHudThemeId: null,
            equippedVoicePackId: null
        };
        this.save();
    }
}

export { DEFAULT_WEAPON_LABEL };

