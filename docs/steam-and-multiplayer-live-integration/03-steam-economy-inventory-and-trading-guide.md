# 03. Steam Economy, Inventory & Trading Guide

Hunker Bunker features a complete **Steam Inventory Service (Item Economy)** supporting **71 items** ($11 \text{ base} + 60 \text{ seasonal}$). This guide details how items are granted, stored, traded, crafted, and opened without requiring real-money transactions in development or demo builds.

---

## 1. Catalog Architecture ($11 \text{ Base} + 60 \text{ Season 0}$)

The catalog is defined in [`src/data/steamItemCatalog.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/src/data/steamItemCatalog.js) and backed by the Steam Inventory schema [`steam/inventory_schema_hunker_bunker.json`](file:///home/caveman/Desktop/icecave/hunker-bunker/steam/inventory_schema_hunker_bunker.json).

```
Itemdef ID Range  Category                       Item Count  Tradeable / Marketable
──────────────────────────────────────────────────────────────────────────────────
1000–1004         Base Guns & Core Weaponry      5 items     Yes (Standard)
2000–2003         Weapon Charms & Badges         4 items     Yes (Standard)
3000–3001         Base Rig Modules & Perks       2 items     Yes (Standard)
4000              Sub-Terran Relic Cache (Crate) 1 item      Yes (Marketable)
4001              Relic Decryption Key (Key)     1 item      Yes (Marketable)
4100–4111         Season 0 Weapon Skins          12 items    Yes (Tradable / Marketable)
4112–4119         Season 0 Chassis Armors        8 items     Yes (Tradable / Marketable)
4120–4129         Season 0 Cosmetic Decals       10 items    Yes (Tradable / Marketable)
4130–4139         Season 0 Tactical Charms       10 items    Yes (Tradable / Marketable)
4140–4147         Season 0 Rig Overclock Mods    8 items     Yes (Tradable / Marketable)
4148–4153         Season 0 Audio/HUD/VFX Mutators6 items     Yes (Tradable / Marketable)
4154–4159         Season 0 Reagents & Shards     6 items     Yes (Crafting Reagents)
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

### 3. Subterranean Fabricator & Smelting (`fabricator.js`)
- Found at survivor outposts inside the bunker.
- **5:1 Trade-Up Smelting**: Combine 5 lower-tier items/reagents into 1 guaranteed higher-tier reward.
- **Recipe 4100**: Combine Cache (`4000`) + Key (`4001` or `4154`) $\rightarrow$ Roll random weighted Season 0 cosmetic or weapon finish.

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
