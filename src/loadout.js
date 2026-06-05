// ── Roster / Loadout ──────────────────────────────────────────
// The loadout half of mothership's roster/loadout flow
// (.claude_work/01-feature-port-from-mothership.md §C), adapted to HB. Lets the
// operator equip a fabricated weapon as their active sidearm. Equipping only
// works for schematics that have actually been fabricated in the Fabrication Bay
// (src/fabricator.js), so this builds directly on that progression.

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
                    return { equippedWeaponId: typeof parsed.equippedWeaponId === 'string' ? parsed.equippedWeaponId : null };
                }
            }
        } catch {
            // fall through
        }
        return { equippedWeaponId: null };
    }

    save() {
        try { this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch { /* best-effort */ }
    }

    getEquippedId() {
        return this.state.equippedWeaponId;
    }

    // Equip a fabricated weapon. Returns true on success. Refuses recipes that
    // aren't weapons or haven't been fabricated yet. Passing null clears it.
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

    // Display label for the in-game weapon panel. Falls back to SIDEARM if the
    // equipped weapon is missing or no longer fabricated (defensive).
    getEquippedLabel(fabricator) {
        const id = this.state.equippedWeaponId;
        if (!id) return DEFAULT_WEAPON_LABEL;
        const recipe = getRecipe(id);
        if (!recipe) return DEFAULT_WEAPON_LABEL;
        if (fabricator && !fabricator.isFabricated(id)) return DEFAULT_WEAPON_LABEL;
        return recipe.name;
    }

    reset() {
        this.state = { equippedWeaponId: null };
        this.save();
    }
}

export { DEFAULT_WEAPON_LABEL };
