# Hunker Bunker — Steam v1 Product Brief & Scope Lock

Date: 2026-07-25
Status: Approved Product Brief (v1 Full Economy & Steamworks Integration)

---

## 1. Release Vehicle

**Target Strategy**: **Private Steam Playtest → Free Public Demo (Steam Next Fest) → 1.0 Full Release**

- **Why 1.0 Full Release?** The game's core architecture, 3 classes, 5 branching endings, lore system, camp bonding quests, vertical Bunker Tree progression, and Steam Inventory / Microtransaction infrastructure are implemented in code.
- **Milestone sequence**:
  1. *Private Steam Beta/Playtest*: Prove the installed Steam build, trusted Fly.io backend, live Steam Microtransactions (Sandbox), Steam Inventory item drops/exchanges, and Steam Deck controller feel with real Steam accounts.
  2. *Steam Next Fest / Public Demo*: Feature a 15-minute 1-tier extraction loop, baseline Bunker Tree upgrades, and a drop test of the Common Relic Fragment.
  3. *1.0 Launch*: Complete single-player narrative extraction roguelite with live Steam Vault, Item Store, Cache Key purchases, and Steam Community Market trading.

---

## 2. Core Commercial Promise

> *"Hunker Bunker is an atmospheric top-down extraction roguelite where operators brave freezing sectors, manage dying suit oxygen, make permanent narrative choices with survivor camps, and extract tradable Steam Relic Caches to customize their gear or trade on the Steam Community Market."*

### Key Player Hooks
1. **Tense Oxygen Pressure**: Every meter moved away from the ship consumes oxygen; O₂ havens and camp discoveries create tactical pacing.
2. **Consequence & Survival**: Faction camp decisions (aid, betray, recruit, or cull) permanently alter ending vectors and vessel boarding seat availability.
3. **Black Box & Steam Relic Extraction**: Death telemetry yields Black Boxes, while successful deep extractions drop rare Steam Inventory items (Relic Fragments & Caches).
4. **Deep Tactical Customization**: Class-specific verbs (Scout sprint, Tank shockwave, Engineer turret hack) paired with the downward Bunker Tree skill graph and cosmetic weapon/suit finishes.
5. **Live Steam Economy**: Players collect, trade, open, and buy/sell items on the Steam Community Market and Steam Item Store.

---

## 3. v1 Scope Boundary

| System | v1 Status | Rationale |
| --- | --- | --- |
| Single-Player Extraction Loop | **Must-Have (In Scope)** | Core gameplay loop |
| 3 Operator Classes (Scout, Tank, Engineer) | **Must-Have (In Scope)** | Replayability foundation |
| Unified Bunker Tree & Class Skill Graph | **Must-Have (In Scope)** | Shipped & integrated |
| Unified Objective Framework & Tracker | **Must-Have (In Scope)** | Shipped (July 2026) |
| 5 Branching Endings & Cutscenes | **Must-Have (In Scope)** | Narrative payoff complete |
| Camp Bonding Quests & Faction Choices | **Must-Have (In Scope)** | Humanity/consequence system |
| RGB Archive Sim Story Minigame | **Must-Have (In Scope)** | Unlocked narrative reward |
| Trusted Backend (Leaderboards, Auth, Store & Inventory) | **Must-Have (In Scope)** | Prevents client score & inventory spoofing |
| Steam Deck 16:10 (1280x800) & Steam Input | **Must-Have (In Scope)** | Hardware parity target |
| Steam Inventory Service & Drops | **Must-Have (In Scope)** | Core economy integration |
| Real-Money Cache Key Store / Microtransactions | **Must-Have (In Scope)** | Paid keys (`ISteamMicroTxn`) & Vault Store |
| Steam Community Market Item Trading | **Must-Have (In Scope)** | Player trading & marketability |
| Live Multi-Player / Co-op | **Out of Scope** | Single-player design focus |

---

## 4. Monetization & Economy Stance

- **Launch Model**: **Premium Game ($14.99–$19.99 USD baseline target) + Steam Item Store & Steam Community Market**.
- **In-Game Cosmetics & Relics**: Steam Vault UI operates in **live connected mode** supporting item equips, exchanges, drops, and store purchases.
- **Microtransactions & Item Store**: Server flags `HB_STEAM_STORE_ENABLED=1` and `HB_STEAM_MICROTXN_ENABLED=1` are **MUST-HAVE launch features**.
- **Paid Cache Keys**: Deep Relic Caches drop via extraction; Cache Keys purchased via `ISteamMicroTxn` unlock random cosmetic rewards with server-disclosed odds (`server/lootTables.js`).
- **Steam Community Market**: Weapon skins, decals, class emblems, and caches are flagged tradable/marketable via Steam Inventory Item Schema.

---

## 5. First-Hour Acceptance Gates

- **5-Minute Gate**: Player launches, moves via WASD or Controller stick, fires sidearm, manages initial O₂ drain, and navigates toward the first flare/camp using the compass without external documentation.
- **15-Minute Gate**: Player completes first extraction/bank deposit, receives initial Relic Fragment drop notification, spends salvage in the vertical Bunker Tree, unlocks a class node, and defeats a tier-1 threat.
- **60-Minute Gate**: Player accepts a camp bonding quest, encounters a boss threat (e.g. Cybersnail), experiences an exosuit failure, recovers a Black Box, opens the Steam Vault to inspect drops/caches, and observes live progress toward one of the 5 narrative endings.

---

## 6. Platform Feature Claims Policy

| Claim | Policy | Proof Required Before Store Page Tag |
| --- | --- | --- |
| **Steam Achievements** | Mandatory | 20+ achievement keys verified live in Steamworks + recorded in installed build |
| **Steam Leaderboards** | Mandatory | Deployed Fly.io backend verifying auth tickets + writing trusted scores |
| **Steam Cloud** | Mandatory | Two-machine save sync test recorded with no JSON corruption |
| **Steam Deck Playable** | Mandatory | 5-minute full controller playtest recorded on physical hardware with zero mouse requirement |
| **Full Controller Support** | Mandatory | Complete menu/skill-tree spatial navigation & Steam Input glyph verification |
| **In-App Purchases** | **Mandatory** | `ISteamMicroTxn` Init/Finalize sandbox purchase verified live in installed build |
| **Steam Economy / Trading** | **Mandatory** | Item schema active in Steamworks with tradable/marketable items verified |

---

## 7. Operational Ownership Matrix

- **Project Owner**:
  - Steamworks partner dashboard configuration, app secrets, item schema definition upload.
  - Deployed Fly.io backend setup (`fly deploy` & persistent volume setup).
  - Steam Microtransactions setup & Valve banking/tax authorization.
  - Physical Steam Deck hardware playtesting & final store page copy approval.
- **Engineering Agents**:
  - SQLite backend storage migration ([server/db-sqlite.js](file:///home/caveman/Desktop/icecave/hunker-bunker/server/db-sqlite.js)).
  - Automated UI acceptance tests (Playwright & Vitest) covering Store, Inventory, and Vault UI.
  - Steam Microtransaction init/finalize flow testing and odds UI verification ([server/steamStore.js](file:///home/caveman/Desktop/icecave/hunker-bunker/server/steamStore.js)).
  - Objective & UI polish (RGB minigame runtime, Queen's Ledger HUD chip).
  - Local packaging scripts ([scripts/steam-drm-wrap.js](file:///home/caveman/Desktop/icecave/hunker-bunker/scripts/steam-drm-wrap.js)).

