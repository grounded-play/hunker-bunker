// Builds the option descriptors behind every Armory dropdown.
//
// docs/armory-vault-progression-audit-2026-08-23.md requirement A1: show all
// candidates, but disable and label the ones the player has not earned. Kept
// as a pure function separate from src/armoryUi.js so the equip-gating rules
// are testable without a DOM, and so Vault rendering can reuse the same
// labelling instead of growing a third opinion about it.
import { getCatalogEntry } from './itemOwnership.js';

const LOCKED_SUFFIX = '🔒 LOCKED';
const DEV_SUFFIX = '🔓 DEV UNLOCK';

export function buildEquipOptions({
    ids = [],
    selectedId = null,
    ownership,
    ownedFirst = false
} = {}) {
    if (!ownership) throw new Error('buildEquipOptions requires an ownership store');

    const selected = selectedId === null || selectedId === undefined || selectedId === ''
        ? null
        : Number(selectedId);

    const options = [];
    for (const rawId of ids) {
        const entry = getCatalogEntry(rawId);
        // An id with no catalog entry is a data bug, not something to render as
        // a bare number the way the old hardcoded lists did.
        if (!entry) continue;

        const id = entry.itemdefid;
        const owned = ownership.isOwned(id);
        const equippable = ownership.canEquip(id);
        const isSelected = selected !== null && selected === id;

        const rarity = entry.rarity ? entry.rarity.toUpperCase() : '';
        let label = rarity ? `${entry.name} (${rarity})` : entry.name;
        if (!owned) {
            // Distinguish "you don't have this" from "you don't have this but
            // dev mode is letting you wear it anyway", so a dev session can
            // never be mistaken for real entitlement.
            label += equippable ? ` — ${DEV_SUFFIX}` : ` — ${LOCKED_SUFFIX}`;
        }

        options.push({
            id,
            name: entry.name,
            rarity: entry.rarity ?? null,
            type: entry.type ?? null,
            label,
            owned,
            // An item already equipped stays selectable even if ownership
            // lapsed, otherwise the dropdown would misreport what the operator
            // is actually wearing.
            disabled: !equippable && !isSelected,
            selected: isSelected
        });
    }

    if (ownedFirst) {
        options.sort((a, b) => Number(b.owned) - Number(a.owned));
    }
    return options;
}
