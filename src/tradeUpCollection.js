// Which items the Smelter and Dispensary work on (decision 9, Sprint 48): the
// Season 0 cosmetic collection, as CS2-style trade-ups draw from one
// collection. Derived from the shared catalogs; scripts/build-trade-up-catalog.js
// writes the result into server/tradeUpCatalog.js for the backend.
import { STEAM_ITEM_CATALOG } from './data/steamItemCatalog.js';
import { EQUIPPABLE_ITEM_TYPES, getCatalogEntry } from './itemOwnership.js';

export const TRADE_UP_COLLECTION_RANGE = Object.freeze([4100, 4153]);
const TIERS = Object.freeze(['uncommon', 'rare', 'epic', 'legendary']);

export function deriveTradeUpItems() {
    const [from, to] = TRADE_UP_COLLECTION_RANGE;
    const items = {};
    for (const id of Object.keys(STEAM_ITEM_CATALOG).map(Number).sort((a, b) => a - b)) {
        if (id < from || id > to) continue;
        const entry = getCatalogEntry(id);
        if (!EQUIPPABLE_ITEM_TYPES.includes(entry?.type)) continue;
        if (!TIERS.includes(entry.rarity)) continue;
        items[id] = entry.rarity;
    }
    return items;
}
