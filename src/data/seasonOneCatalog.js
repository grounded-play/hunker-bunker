/** Beta Season 1 placements. Names, rarity and art come from the generated catalog. */
import { STEAM_ITEM_CATALOG } from './steamItemCatalog.js';
import { ARMORY_PREVIEWS } from './armoryPreviews.js';

const placements = [
    [4120, 'free', 1, 'decal', 'all'],
    [4130, 'free', 3, 'charm', 'all'],
    [4100, 'free', 6, 'weapon_finish', 'talon'],
    [4122, 'free', 9, 'decal', 'all'],
    [4132, 'free', 12, 'charm', 'all'],
    [4112, 'free', 15, 'chassis', 'ENGINEER'],
    [4113, 'free', 15, 'chassis', 'SCOUT'],
    [4114, 'free', 15, 'chassis', 'TANK'],
    [4104, 'free', 18, 'weapon_finish', 'talon_c'],
    [4135, 'free', 21, 'charm', 'all'],
    [4125, 'free', 25, 'decal', 'all'],
    [4110, 'free', 30, 'weapon_finish', 'talon_c'],
    [4101, 'premium', 'purchase', 'weapon_finish', 'talon_c'],
    [4121, 'premium', 3, 'decal', 'all'],
    [4131, 'premium', 6, 'charm', 'all'],
    [4103, 'premium', 9, 'weapon_finish', 'tesla_lock'],
    [4124, 'premium', 12, 'decal', 'all'],
    [4116, 'premium', 15, 'chassis', 'ENGINEER'],
    [4134, 'premium', 18, 'charm', 'all'],
    [4115, 'premium', 21, 'chassis', 'SCOUT'],
    [4138, 'premium', 25, 'charm', 'all'],
    [4119, 'premium', 30, 'chassis', 'TANK'],
    [2100, 'workshop', 'workshop', 'decal', 'all'],
    [2200, 'workshop', 'workshop', 'weapon_finish', 'talon']
];

export const SEASON_ONE_COSMETICS = Object.freeze(placements.map(([itemdefid, track, rank, category, compatibility]) => Object.freeze({
    ...STEAM_ITEM_CATALOG[itemdefid], itemdefid, track, rank, category, compatibility,
    preview: ARMORY_PREVIEWS[itemdefid] ?? null,
    ownershipRule: 'cosmetic-only; base equipment is separate',
    ...(track === 'workshop' ? { recipe: Object.freeze({ commonFragments: itemdefid === 2100 ? 5 : 10, rareFragments: itemdefid === 2100 ? 0 : 2 }) } : {})
})));
export const SEASON_ONE_CLASS_CHOICES = Object.freeze([4112, 4113, 4114]);
const byId = new Map(SEASON_ONE_COSMETICS.map(item => [item.itemdefid, item]));
export function getSeasonOneCosmetic(itemdefid) { return byId.get(Number(itemdefid)) ?? null; }
export function isValidSeasonOneCosmetic(itemdefid) { return byId.has(Number(itemdefid)); }
export function getSeasonOneCatalog() { return [...SEASON_ONE_COSMETICS]; }
