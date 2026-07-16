# Steam Item Store Page Plan + Image Prompts

Date: 2026-07-16.

This plan translates the Steamworks Item Store configuration screen into the
specific choices, schema updates, and art prompts Hunker Bunker needs before
the web Item Store should be enabled.

Official docs checked:

- Steam Inventory Item Store:
  https://partner.steamgames.com/doc/features/inventory/itemstore
- Steam Inventory Schema:
  https://partner.steamgames.com/doc/features/inventory/schema
- Steam Inventory Service overview:
  https://partner.steamgames.com/doc/features/inventory

## Goal

Use Steam's hosted Item Store as the external purchase page for priced Steam
Inventory items. The in-game Vault/Store should open this page through the
Steam Overlay when appropriate, while Steam owns checkout, purchase history,
refund rules, trading, and market-facing item visibility.

The first public-safe version should be narrow:

- Sell Cache Keys only.
- Do not sell Deep Relic Caches directly.
- Do not sell achievement emblems or class victory patches at launch.
- Keep gameplay power out of the Item Store.
- Make odds and crate/key language clear before any paid purchase path.

## Immediate Image Handoff

If another agent is producing art, give them this exact priority order:

1. `steam/store/steam_item_store_background_en.png` — 1920x1080, prompt in
   "Background Image Production Prompt" below. This is the one Steamworks needs
   for the Item Store configuration page.
2. `steam/store/item_icons/cache_key_master.png` — 1024x1024 master icon for
   the paid Cache Key.
3. `steam/store/item_icons/deep_relic_cache_master.png` — 1024x1024 master icon
   for the free Deep Relic Cache.
4. Remaining inventory icon masters only after the Cache Key and Cache are
   done: relic fragments, victory patches, emblems, decal, and weapon finish.

Do not ask the image agent to render final tiny text. HUNKER BUNKER branding
should be composited by hand on the background after generation.

## Critical App ID Check

The dashboard text pasted into the task shows:

```text
https://store.steampowered.com/itemstore/4957040/
https://store.steampowered.com/itemstore/4957040/?beta=1
```

The repo schema currently says:

```json
{
  "appid": 1247290
}
```

Before enabling the Item Store, reconcile this mismatch in Steamworks. The Item
Store URL uses the app's Steam ID. If `4957040` is the current real Steam app,
the schema, backend env (`HB_STEAM_APPID`), depot config, and documentation need
to move together. If `1247290` is still the real app, the pasted Item Store URL
is from the wrong app page.

Do not enable live commerce until this is resolved.

## Current Repo State

Relevant files:

- `steam/inventory_schema_hunker_bunker.json`
- `server/steamStore.js`
- `server/lootTables.js`
- `docs/steam-lootbox-odds-disclosure.md`
- `docs/steam-store-asset-checklist.md`
- `docs/steam-store-placeholder-assets-and-prompts.md`

Current item economy shape:

| ItemDef | Item | Current role | Sell in Item Store now? |
| --- | --- | --- | --- |
| `1000` | Common Relic Fragment | crafting material/drop | No |
| `1100` | Rare Relic Fragment | crafting material/drop | No |
| `2000` | Scout Victory Patch | earned cosmetic | No |
| `2001` | Tank Victory Patch | earned cosmetic | No |
| `2002` | Engineer Victory Patch | earned cosmetic | No |
| `2003` | Queen Slayer Emblem | achievement cosmetic | No |
| `2004` | Archivist Emblem | achievement cosmetic | No |
| `2100` | Carbon Fiber Decal | crafted/drop cosmetic | Not at launch |
| `2200` | Chrome Plated Sidearm | crafted/drop cosmetic | Not at launch |
| `3000` | Playtime Drop Generator | hidden generator | No, hidden/internal |
| `4000` | Deep Relic Cache | free drop container | No direct sale |
| `4001` | Cache Key | paid key | Yes |
| `4002` | Deep Relic Cache Contents | hidden resolver | No, hidden/internal |

## Recommended Steamworks Configuration

Use these settings on the Item Store configuration page once the schema is
ready.

| Steamworks field | Recommended value | Notes |
| --- | --- | --- |
| Store name, English | `Hunker Bunker Item Store` | Explicitly set it even though this is the default-style fallback. |
| View items in | `Grid` | Best for icons, keys, and cosmetic cards. |
| Background image | `steam/store/steam_item_store_background_en.png` | Must be 1920x1080. Prompt below. |
| Background color | `0b1116` | Dark bunker blue-black. The background image edges must fade to this exact color. |
| Enable Item Store | Off until beta preview passes | Enable only after app ID, schema, prices, background, and legal/region review are done. |
| Show `featured` ahead of top sellers | On after `store_tags` exists | Lets us control launch merchandising before there are real top sellers. |
| Hide "Items available for this game" on main store page | On for beta/private review | Turn off only when Item Store art and purchase flow are release-quality. |
| Display order | `By name` for launch | Fine if only Cache Key is priced. Revisit after bundles/cosmetics. |

## Visibility Rollout

1. Keep the Item Store disabled while editing schema and uploading art.
2. Upload the background and set background color.
3. Add `store_tags` and pricing to the sellable itemdefs.
4. Preview with the beta URL.
5. Confirm the page shows only intentional priced items.
6. Confirm the in-game Vault opens the Item Store URL through Steam Overlay.
7. Enable Item Store for URL access.
8. Keep "Items available for this game" hidden on the main store page until
   after a full installed-build purchase rehearsal passes.
9. Only then consider showing Item Store items on the main Steam product page.

## Schema Work Required

Steam Item Store tabs use `store_tags`, not the existing `tags` field. The
current schema has gameplay/inventory tags such as:

```text
rarity:uncommon;class:scout;slot:patch
```

Those are useful for item metadata, but top-level Item Store filters need a
separate `store_tags` string on the itemdefs you want filterable.

### Phase 1 Sellable ItemDefs

Start with one priced item:

| ItemDef | Field | Value |
| --- | --- | --- |
| `4001` Cache Key | `store_tags` | `featured;keys;cache_key` |
| `4001` Cache Key | `price_category` | `1;VLV100` |
| `4001` Cache Key | `store_hidden` | `false` or omitted |

`price_category: 1;VLV100` maps to Valve's $0.99-style price category. Use
Steamworks preview to confirm regional prices before publishing.

Do not add a price to `4000` Deep Relic Cache. Caches drop for free. Selling
both cache and key makes the random reward path harder to explain and review.

### Optional Phase 2 Key Bundles

The backend currently has `key_1`, `key_5`, and `key_15` purchase SKUs. The
hosted Steam Item Store lists priced Inventory itemdefs, not backend-only SKU
names. For the hosted page to show key packs with discounts, add sellable bundle
itemdefs that expand into Cache Keys at checkout.

Proposed reserved itemdef range:

| ItemDef | Name | Store tags | Intended price |
| --- | --- | --- | --- |
| `4101` | Cache Key - 1 Pack | `featured;keys;cache_key;bundle` | same as one key |
| `4105` | Cache Key - 5 Pack | `featured;keys;cache_key;bundle;best_value` | existing 5-key price |
| `4115` | Cache Key - 15 Pack | `featured;keys;cache_key;bundle;best_value` | existing 15-key price |

Bundle notes from Steam docs:

- Bundle itemdefs can be listed for sale.
- Any bundle item must have `price` or `price_category`.
- Contained items that should not sell individually can be `store_hidden`.
- If we still want the single Cache Key to sell individually, do not hide
  `4001`.

Do not ship bundle itemdefs until Steamworks preview shows the checkout expands
the bundle into the expected Cache Key quantity.

### Future Cosmetic Store Policy

Only add direct cosmetic sales after the core key flow is stable.

Recommended future tags:

| Category | store_tags |
| --- | --- |
| Class patches | `cosmetics;patches;class_patch` |
| Achievement emblems | Keep unsold; if visible later, `cosmetics;emblems;earned` |
| Suit decals | `cosmetics;decals` |
| Weapon finishes | `cosmetics;weapon_finishes` |
| Containers | `containers;caches` |

Avoid selling earned achievement items. They are better as prestige drops.

## Top-Level Filters

Do not add tabs that show zero items in the current store. For Phase 1:

| Filter name | store_tags field |
| --- | --- |
| Featured | `featured` |
| Keys | `keys;cache_key` |

For Phase 2 with direct cosmetics:

| Filter name | store_tags field |
| --- | --- |
| Featured | `featured` |
| Keys | `keys;cache_key;bundle` |
| Cosmetics | `cosmetics;patches;decals;weapon_finishes` |
| Caches | `containers;caches` |

Keep "Materials" out of the Item Store unless we intentionally sell crafting
materials, which is not recommended for launch.

## In-Game Link Plan

When the hosted page is approved, the in-game Store/Vault flow should open:

```text
https://store.steampowered.com/itemstore/<REAL_APP_ID>/
```

For beta preview and internal review:

```text
https://store.steampowered.com/itemstore/<REAL_APP_ID>/?beta=1
```

Implementation note:

- Use the Steam Overlay, not an external browser.
- Keep the backend MicroTxn route as a fallback/testing rail until the hosted
  Item Store path is fully proven.
- The hosted Item Store link is independently gated by
  `hostedItemStore.enabled`; the backend MicroTxn `purchaseMode` may remain
  disabled if the hosted Steam page becomes the only checkout path.
- Keep the disclosed odds panel next to any Cache Key purchase entry point.

Backend catalog/env support:

| Env var | Purpose |
| --- | --- |
| `HB_STEAM_ITEM_STORE_ENABLED=1` | Allows `/steam/store/catalog` to expose the hosted Item Store URL. |
| `HB_STEAM_ITEM_STORE_BETA=1` | Exposes the `?beta=1` preview URL as the active button URL. |
| `HB_STEAM_ITEM_STORE_APPID=4957040` | Overrides the Item Store app ID without rewriting the whole repo app ID. |
| `HB_STEAM_ITEM_STORE_URL=https://store.steampowered.com/itemstore/4957040/` | Optional explicit public URL override. |
| `HB_STEAM_ITEM_STORE_BETA_URL=https://store.steampowered.com/itemstore/4957040/?beta=1` | Optional explicit beta URL override. |

## Required Item Store Background

Steam's Item Store background must be:

- 1920x1080.
- Include game branding.
- Fade at all edges to the selected solid background color.
- Match the background color configured in Steamworks.

Recommended file:

```text
steam/store/steam_item_store_background_en.png
```

Recommended edge color:

```text
0b1116
```

### Background Image Production Prompt

Use this to generate the art layer. Composite the final HUNKER BUNKER logo in
Figma/Photoshop afterward so text is crisp.

```text
Create a 1920x1080 Steam Item Store background for HUNKER BUNKER.
Retro-futuristic tactical sci-fi illustration, bold clean shape design,
high-contrast but subdued enough for store item cards to sit on top. A grimy
underground bunker corridor opens into a jagged amber-lit cave breach in the
middle distance. Riveted metal floor plates, thick conduit pipes, frost-dark
walls, small cyan status lights, worn hazard stripes, and scattered relic
fragments. The scene should feel like a tactical extraction game about
descending into a sealed bunker and recovering forbidden caches.

Composition: leave the center and lower-middle relatively calm for Steam item
cards. Put the strongest silhouette and cave glow slightly right of center, not
directly behind the card grid. Reserve a darker upper-left safe area for a
composited HUNKER BUNKER logo lockup. All four edges must fade smoothly into
the exact solid color #0b1116, with no bright details touching the border.

Final image should have no generated text, no fake UI, no watermarks, no
readable signage, no character close-up faces, no extra logos. The final logo
will be composited afterward.
```

### Logo Composite Direction

After generation, composite:

```text
HUNKER BUNKER
ITEM STORE
```

Placement:

- Upper-left safe area.
- Warm amber title fill.
- Thin dark outline.
- Small cyan separator line or small cache/key glyph.
- Do not cover the item grid area.

The final uploaded image should include the branding because Steam asks for a
background that can include product branding, but the wordmark should be
hand-composited rather than AI-rendered.

### Negative Prompt

```text
wrong game title, VOID_WALKER, DEEP OPERATIVE, press start, copyright text,
fake studio name, fake year, readable UI text, random letters, watermark,
signature, photorealistic, painterly oil texture, cute cartoon, fantasy castle,
outer space, clean corporate showroom, bright white background, neon rainbow,
purple gradient background, text artifacts, blurry logo
```

## Optional Store Detail Images

Steam schema supports `store_images` for item detail pages. These are not needed
to enable the store, but they make the paid Cache Key page feel real instead of
bare.

Recommended source size: 1920x1080, exported/web-hosted as PNG or JPG.

### Cache Key Detail Image Prompt

```text
1920x1080 product key art for a Steam Inventory item called Cache Key from
HUNKER BUNKER. A heavy brass-and-black steel keycard shaped like a bunker access
slug floats above a dark metal workbench. It has an amber glass core, tiny cyan
diagnostic lights, scratched serial grooves, and a small triangular hazard
notch. Behind it, out of focus, sits a sealed Deep Relic Cache container in an
industrial bunker bay. Retro-futuristic tactical sci-fi, cel-shaded hard edges,
grimy metal texture, warm amber rim light, no text, no logos, no readable
serial numbers, transparent-looking but rendered on a dark bunker background.
```

### Deep Relic Cache Detail Image Prompt

```text
1920x1080 product scene for a Deep Relic Cache from HUNKER BUNKER. A sealed
octagonal metal container sits on a bunker floor, black gunmetal panels, amber
locking seams, frost and rust around the edges, small cyan status light showing
it is armed but unopened. Cables and relic fragments surround it, with a dark
cave breach glowing amber in the far background. The cache must look like a
free drop container that requires a key, not a treasure chest. Tactical sci-fi,
bold shape language, no text, no logo, no readable labels.
```

### Key Bundle Detail Image Prompt

```text
1920x1080 store detail image for a bundle of Cache Keys from HUNKER BUNKER.
Five to fifteen identical bunker access keys arranged in a fan on a black
armored case, amber glass cores glowing faintly, cyan status pinlights, heavy
scratches and industrial grime. Background is a dim quartermaster table inside
a bunker, with a sealed cache crate blurred behind them. Tactical sci-fi,
clean cel-shaded edges, premium but worn, no text, no numbers, no logo.
```

## Item Icon Prompt Pack

If the current economy icon URLs are placeholders or not yet uploaded, generate
1024x1024 masters and export Steam-friendly icon sizes from those masters.
Keep every icon readable at 96x96.

Shared icon style:

```text
Square Steam Inventory item icon, centered object on a dark transparent or
nearly transparent background, HUNKER BUNKER tactical bunker sci-fi style,
bold silhouette, amber rim light, tiny cyan accent only where useful, no text,
no letters, no logo, no UI frame, no watermark, readable at tiny size.
```

Prompts:

| Item | Prompt add-on |
| --- | --- |
| Common Relic Fragment | `A dull gray mechanical shard with chipped ceramic edges and one weak amber line, common material, simple silhouette.` |
| Rare Relic Fragment | `An intact cyan-lit processor core wrapped in cracked amber-black bunker metal, rarer and brighter than the common shard.` |
| Scout Victory Patch | `A cloth-and-metal tactical shoulder patch with a sleek scout helmet silhouette and small cyan speed slash, no letters.` |
| Tank Victory Patch | `A heavy armored shield patch with thick plating and amber impact marks, no letters.` |
| Engineer Victory Patch | `A technical gear-and-circuit patch with a small cyan repair spark, no letters.` |
| Queen Slayer Emblem | `A red-black chitin crown split by an amber blade of light, trophy emblem, legendary feel, no gore, no letters.` |
| Archivist Emblem | `A sealed bunker archive sigil, data core and stacked metal plates, violet-cyan accent kept subtle, no letters.` |
| Carbon Fiber Decal | `A curled strip of carbon weave decal material, black weave pattern with amber edge highlight.` |
| Chrome Plated Sidearm | `A compact sci-fi sidearm cosmetic finish sample, chrome reflective slide, amber grip glow, weapon angled safely, no muzzle flash.` |
| Deep Relic Cache | `A sealed octagonal cache crate with amber lock seams and one cyan status diode, heavy and mysterious.` |
| Cache Key | `A chunky bunker keycard/access slug with amber glass core and black metal casing, iconic simple silhouette.` |

## Asset File Targets

Recommended new files:

```text
steam/store/steam_item_store_background_en.png
steam/store/itemstore_cache_key_detail_01_en.png
steam/store/itemstore_deep_relic_cache_detail_01_en.png
steam/store/itemstore_cache_key_bundle_detail_01_en.png
steam/store/item_icons/cache_key_master.png
steam/store/item_icons/deep_relic_cache_master.png
steam/store/item_icons/common_relic_fragment_master.png
steam/store/item_icons/rare_relic_fragment_master.png
steam/store/item_icons/scout_victory_patch_master.png
steam/store/item_icons/tank_victory_patch_master.png
steam/store/item_icons/engineer_victory_patch_master.png
steam/store/item_icons/queen_slayer_emblem_master.png
steam/store/item_icons/archivist_emblem_master.png
steam/store/item_icons/carbon_fiber_decal_master.png
steam/store/item_icons/chrome_plated_sidearm_master.png
```

Final hosted URLs for `icon_url`, `icon_url_large`, and `store_images` must be
stable HTTPS URLs before upload to Steamworks.

## Launch Checklist

- Resolve app ID mismatch (`4957040` versus `1247290`).
- Decide whether Phase 1 sells only `4001` Cache Key or adds bundle itemdefs.
- Add `price_category` or `price` to sellable itemdefs.
- Add `store_tags` to sellable itemdefs.
- Keep non-sellable/internal items without prices or with `store_hidden: true`.
- Upload the 1920x1080 Item Store background.
- Set background color to `0b1116`.
- Add top-level filters: Featured and Keys.
- Preview `?beta=1`.
- Confirm only intended priced items appear.
- Confirm disclosed odds are accessible before purchasing keys.
- Confirm in-game overlay opens the hosted Item Store URL.
- Confirm failed/disabled backend purchase state hides or disables the link.
- Enable Item Store URL access.
- Keep main store page item strip hidden until final release review.
