# Steam Item Tag Localization

Steamworks reports **25 tag values missing English localization**, so they are
hidden from users. The tags come from `steam/inventory_schema_hunker_bunker.json`
— four categories and 25 values, which matches Steam's count exactly.

Paste these into **Steamworks → Inventory Service → Item Tags → English**.

## Category labels (4)

| Tag internal name | Localized value |
| --- | --- |
| `class` | Class |
| `rarity` | Rarity |
| `season` | Season |
| `slot` | Slot |

## Class (4)

| Tag internal name | Localized value |
| --- | --- |
| `all` | All Classes |
| `engineer` | Engineer |
| `scout` | Scout |
| `tank` | Tank |

## Rarity (6)

Labels are chosen to read as **adjectives**, because the format string below
places them in front of the item name.

| Tag internal name | Localized value | Renders as |
| --- | --- | --- |
| `uncommon` | Uncommon | Uncommon Mini Cryo-Core Charm |
| `rare` | Rare | Rare Trench Whistle |
| `epic` | Epic | Epic Bunker 404 Patch |
| `legendary` | Legendary | Legendary Grand Marshal Patch |
| `container` | Sealed | Sealed Deep Relic Cache |
| `key` | Encrypted | Encrypted Cache Key |

`container` and `key` are rarity values on exactly two items — 4000 Deep Relic
Cache and 4001 Cache Key. Labelling them literally ("Container", "Key") would
produce *"Key Cache Key"*, so they are given adjective forms instead.

## Season (1)

| Tag internal name | Localized value |
| --- | --- |
| `0` | Season 0 |

## Slot (14)

| Tag internal name | Localized value |
| --- | --- |
| `cache` | Cache |
| `cache_key` | Cache Key |
| `chassis_skin` | Operator Chassis |
| `decal` | Decal |
| `hud_theme` | HUD Theme |
| `muzzle_fx` | Muzzle Flare |
| `patch` | Patch |
| `reagent` | Reagent |
| `rig_overclock` | Rig Module |
| `sheen` | Weapon Sheen |
| `tracer_fx` | Tracer Rounds |
| `voice_pack` | Voice Pack |
| `weapon_charm` | Weapon Charm |
| `weapon_finish` | Weapon Finish |

`rig_overclock` is labelled **Rig Module** to match the earned-only track in
[the loadout design](planning/cosmetic-loadout-gameplay-design-2026-09-10.md).
The internal tag name is left alone — renaming it would orphan the tag on every
item definition already carrying it.

## Format strings

Steam's default is `Unique %ITEMNAME%`, which is wrong for this catalog — the
items are not unique instances. Steam uses the **first** format string whose
category tokens all match, so order matters.

| Priority | Format string |
| --- | --- |
| 1 | `%rarity% %ITEMNAME%` |
| 2 | `%ITEMNAME%` |

That is deliberately short. The obvious temptation is to add `%slot%` or
`%class%`, and both make the names worse:

- **`%slot%` duplicates the name.** Items are already named for their slot, so
  `%rarity% %ITEMNAME% (%slot%)` yields *"Rare Deep Frost Sheen (Weapon Sheen)"*.
- **`%class%` duplicates too.** Class-specific items already carry it —
  *"Scout Scout Victory Patch"*.
- **`%season%` reads as noise** in a display name: *"Season 0 Rare Trench Whistle"*.

Every item in the catalog carries a `rarity` tag, so priority 1 matches
everything and priority 2 exists only as a safety net for a future untagged item.

## Verifying after entry

Steamworks should report **0 tags missing localization**. Spot-check one item
per rarity in the in-client inventory:

- 4139 Golden Sub-Bunker Key → *Legendary Golden Sub-Bunker Key*
- 4000 Deep Relic Cache → *Sealed Deep Relic Cache*
- 4001 Cache Key → *Encrypted Cache Key*

If a name renders as *"Unique …"*, the format strings did not save; if a tag
renders as its internal name, that row's localization is still blank.
