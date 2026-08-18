# 03. Steam Economy, Inventory & Trading Guide

Hunker Bunker features a complete **Steam Inventory Service (Item Economy)** supporting **71 items** ($11 \text{ base} + 60 \text{ seasonal}$). This guide details how items are granted, stored, traded, crafted, and opened without requiring real-money transactions in development or demo builds.

---

## 1. Catalog Architecture ($11 \text{ Base} + 60 \text{ Season 0}$)

The catalog is defined in [`src/data/steamItemCatalog.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/src/data/steamItemCatalog.js) and backed by the Steam Inventory schema [`steam/inventory_schema_hunker_bunker.json`](file:///home/caveman/Desktop/icecave/hunker-bunker/steam/inventory_schema_hunker_bunker.json).

**Corrected against the real schema** (`steam/inventory_schema_hunker_bunker.json`) — the
original version of this table described a plausible-sounding but fabricated 1000-3001 range;
verified 2026-08-17 against `python3 -c "import json; ..."` reading the actual file:

```
Itemdef ID        Category                       Item Count  Tradeable / Marketable
──────────────────────────────────────────────────────────────────────────────────
1000, 1100        Relic Fragments (Common/Rare)  2 items     No (crafting material)
2000–2004         Victory Patches & Emblems      5 items     Yes (cosmetic patch)
2100               Carbon Fiber Decal            1 item      Yes (cosmetic decal)
2200               Chrome Plated Sidearm         1 item      Yes (weapon finish)
3000              Playtime Drop Generator        1 item      No (internal loot resolver)
4000              Deep Relic Cache (Crate)       1 item      Yes (Marketable)
4001              Cache Key (paid, never drops)  1 item      Yes (Marketable)
4100–4111         Season 0 Weapon Skins          12 items    Yes (Tradable / Marketable)
4112–4119         Season 0 Chassis Armors        8 items     Yes (Tradable / Marketable)
4120–4129         Season 0 Cosmetic Decals       10 items    Yes (Tradable / Marketable)
4130–4139         Season 0 Tactical Charms       10 items    Yes (Tradable / Marketable)
4140–4147         Season 0 Rig Overclock Mods    8 items     Yes (Tradable / Marketable)
4148–4153         Season 0 Audio/HUD/VFX Mutators6 items     Yes (Tradable / Marketable)
4154–4159         Season 0 Reagents & Shards     6 items     Yes (crafting reagent);
                                                              4154 = F2P-earned Relic Key,
                                                              intentionally distinct from 4001
──────────────────────────────────────────────────────────────────────────────────
TOTAL             Full Deep Crust Catalog        71 items    100% Asset Compliant
```

---

## 2. Dev Demo & Sandbox Economy (No Real Money)

In development and demo environments:
- **No Credit Cards or Real Cash**: Key purchases and crate unboxings use mock Steam microtransaction purchase receipts (`initSteamPurchase` $\rightarrow$ `finalizeSteamPurchase`) with zero billing.
- **Sandbox Fallback Roster**: If running outside Steam, [`src/steamVaultUi.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/src/steamVaultUi.js) injects starter sandbox items (`sandbox_4000` cache, `sandbox_4001` key, `sandbox_2000` charm, etc.) so testing can proceed offline.
- **Battle Pass Leveling**: Earn XP during expeditions to unlock all 50 tiers of the Deep Crust Protocol track in [`src/seasonPassUi.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/src/seasonPassUi.js).

---

## 3. The 4 Economy Surfaces

### 1. Steam Vault (`steamVaultUi.js`)
- Access via keybind `[V]` or the main menu button.
- Grid view with rarity color-coding (Common $\rightarrow$ Uncommon $\rightarrow$ Rare $\rightarrow$ Epic $\rightarrow$ Legendary).
- **Inspect Window**: Shows 3D turntable model for weapon skins/charms/mods, and 2D high-res master art for badges.
- **Decryption Bay**: Select a **Sub-Terran Relic Cache** (`4000`) and a **Relic Decryption Key** (`4001`) to trigger the crate unboxing reel with acoustic fanfare.

### 2. Pre-Mission Armory Bench (`armoryUi.js` & `armoryScene.js`)
- Access prior to embarking on a mission.
- Select your primary weapon archetype $\rightarrow$ apply unlocked skins $\rightarrow$ attach 3D weapon charms $\rightarrow$ socket Rig Overclock chips into Bay A and Bay B.
- Updates combat modifiers (e.g. `+20% Scrap Magnet`, `+8% Cryo Duration`) stored in `LoadoutManager`.

### 3. Three separate real systems, previously conflated here — corrected 2026-08-17

This section originally described one fictional "Recipe 4100" that blended three genuinely
distinct, separately-implemented systems. They are:

- **Cache + Key unboxing** (`steamVaultUi.js`'s `openDeepRelicCache()`): consume 1 Deep Relic
  Cache (`4000`) + 1 Cache Key (`4001` or the F2P `4154`) → roll one random weighted item from
  the drop table. This is the Steam Vault's Decryption Bay, not a "fabricator" recipe.
- **5:1 Trade-Up Smelting & Deep Core Shard Dispensary** (`src/craftingMatrix.js`, new
  `SMELTER & DISPENSARY` tab in the Steam Vault): combine 5 owned items of the same rarity for
  1 guaranteed item at the next tier, or spend Deep Core Shards (earned from duplicate
  unboxings) to redeem a specific item directly. Unrelated to Cache+Key — operates on whatever
  is already in inventory.
- **Base weapon crafting** (`src/fabricator.js`, `FabricatorManager`, `getRecipe()`): the
  in-game Fabrication Bay's base weapon unlock recipes (itemdefs below 4000, e.g. `2200` Chrome
  Plated Sidearm's `exchange: "1000x10,1100x2"` — spends Relic Fragments, not Season 0 items).
  A third, separate system from the two above.

### 4. Player-to-Player Barter & Trading (`playerTrade.js`)
- In multiplayer lobbies or survivor camps, interact with a teammate to open the barter exchange.
- Both players place items in the lockbox; trade executes only when both click **CONFIRM TRADE**.

---

## 4. Steamworks Inventory Schema Synchronization

To publish or update the inventory schema in the Steamworks Partner Portal:
1. Generate the JSON schema:
   ```bash
   python3 scripts/gen-season-schema-entries.py
   ```
2. Verify all asset hashes:
   ```bash
   node scripts/audit-steam-inventory-assets.js
   ```
3. In the Steamworks Partner Dashboard:
   - Navigate to **Economy** $\rightarrow$ **Item Definitions**.
   - Click **Upload Inventory Schema** and select `steam/inventory_schema_hunker_bunker.json`.
   - Click **Publish Schema Changes**.
