const ECONOMY_ROOT = '/economy';

const item = (itemdefid, name, rarity, desc, tradable, marketable, slug) => Object.freeze({
    itemdefid,
    name,
    rarity,
    desc,
    tradable,
    marketable,
    img: `https://hunkerbunker.netlify.app/economy/${slug}.png`,
    localImg: `${ECONOMY_ROOT}/${slug}.png`,
    localImgLarge: `${ECONOMY_ROOT}/${slug}_large.png`
});

export const STEAM_ITEM_CATALOG = Object.freeze({
    1000: item(1000, 'Common Relic Fragment', 'common', 'A shard of ancient subterranean machinery, used in basic crafting exchanges.', true, false, 'relic_common'),
    1100: item(1100, 'Rare Relic Fragment', 'rare', 'An intact processor core from the deep vaults, used to craft elite cosmetics.', true, false, 'relic_rare'),
    2000: item(2000, 'Scout Victory Patch', 'uncommon', 'Awarded to operators who successfully extract using a Scout frame. Cosmetic equip.', true, true, 'patch_scout'),
    2001: item(2001, 'Tank Victory Patch', 'uncommon', 'Awarded to operators who successfully extract using a Tank frame. Cosmetic equip.', true, true, 'patch_tank'),
    2002: item(2002, 'Engineer Victory Patch', 'uncommon', 'Awarded to operators who successfully extract using an Engineer frame. Cosmetic equip.', true, true, 'patch_engineer'),
    2003: item(2003, 'Queen Slayer Emblem', 'legendary', 'Awarded for defeating the Act 2 queen. Cosmetic equip.', true, true, 'emblem_queen_slayer'),
    2004: item(2004, 'Archivist Emblem', 'epic', 'Awarded for recovering the full bunker archive. Cosmetic equip.', true, true, 'emblem_archivist'),
    2100: item(2100, 'Carbon Fiber Decal', 'rare', 'A high-performance weave finish for your exosuit. Cosmetic equip.', true, true, 'decal_carbon'),
    2200: item(2200, 'Chrome Plated Sidearm', 'epic', 'Polished high-reflectivity chrome finish for the standard sidearm. Cosmetic equip.', true, true, 'finish_chrome'),
    4000: item(4000, 'Deep Relic Cache', 'container', 'A sealed drop container. Requires a Cache Key to open — see the STORE tab for published odds.', true, true, 'cache_deep_relic'),
    4001: item(4001, 'Cache Key', 'key', 'Opens a single Deep Relic Cache. Purchased with real money; never drops for free.', true, true, 'cache_key')
});
