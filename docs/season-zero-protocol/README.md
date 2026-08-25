# Season 0: Deep Crust Protocol — Master Documentation Index

## Overview
**Season 0: Deep Crust Protocol** is the comprehensive master design and implementation specification for *Hunker Bunker's* inaugural seasonal content expansion, F2P loot box economy, battle pass progression, and tactical attachables system.

---

## Document Index & Roadmap

1. [01. Executive Summary & Economy Architecture](./01-season-zero-executive-summary.md)
   - High-level vision, industry benchmark analysis (CS2, TF2, Helldivers 2, Hunt: Showdown).
   - Dual-loop economy model (In-Game Fabrication Bay vs Steam Vault Seasons).
   - Player trust, transparency, and fair play pillars.

2. [02. Steam Vault Catalog & Itemdef Schema](./02-steam-vault-catalog-and-itemdefs.md)
   - 60-item seasonal catalog across 7 categories (`itemdefs 4100–4159`).
   - Rarity distribution, drop weights, and published odds matrix.
   - Steam Inventory Service schema and tag contracts.

3. [03. Tactical Attachables & Gameplay Modifiers](./03-tactical-attachables-and-gameplay-modifiers.md)
   - 3D Weapon Charms, Socket hierarchy, and secondary spring physics.
   - Rig Overclock Modules and runtime gameplay calculation hooks.
   - HUD CRT themes and radio voiceover mutators.

4. [04. Tactical Battle Pass & Progression Tiers](./04-battle-pass-and-progression-tiers.md)
   - 50-tier progression schedule (Free Track vs Classified Dossier).
   - XP pacing, leveling curve, and daily/weekly bounty contracts.
   - Dual Legendary capstone rewards at Tier 50.

5. [05. Crafting Matrix, Smelting & Salvage Economy](./05-crafting-matrix-and-salvage-economy.md)
   - Trade-Up Smelting contracts (5:1 tier promotion).
   - Deep Core Shard duplicate protection dispensary.
   - Material forging formulas for seasonal overclocks and skins.

6. [06. Asset Production & Prompt Manifest](./06-asset-production-and-prompt-manifest.md)
   - Technical 3D `.glb` polygon budgets, PBR texture formats, and LODs.
   - Complete prompt manifest for AI image, 3D mesh, and audio generation.

7. [07. The Armory & Weapon Bench](./07-armory-and-weapon-bench.md)
   - New mandatory pre-run screen (`appPhase='armory'`) where mods, charms, skins, and patches get equipped.
   - Locks Season 0 to the shipped 3-class roster (Scout/Tank/Engineer) with named class-unique weapons (*Vector-9 Talon*, *Siege-Breaker 50*, *Tesla-Lock MK-IV*).
   - Unifies the two divergent cosmetic-equip systems into a single per-class `LoadoutManager` data model.
   - (`07-pre-mission-armory-and-class-weapons.md` is a concurrent-draft doc merged into this one — kept as a pointer.)
   - **Build tracking**: [`docs/armory-and-class-weapons-worklog.md`](../armory-and-class-weapons-worklog.md) is the live task board/status log for implementation — check it before starting any code work on this doc.

8. [08. Complete Asset Audit & Render Gaps](./08-asset-audit-and-gaps.md)
   - **100% Complete & Verified**: File-by-file cross-reference of all 60 itemdefs against 2D art, 4-file compliance sets, and Steam catalog registration.
   - All 60 Season 0 items (4100–4159) plus 11 baseline items (**71 total**) are registered in `steam/inventory_schema_hunker_bunker.json` and `src/data/steamItemCatalog.js`, with verified transparent-alpha production art across all UI surfaces.
   - All 4 discovered naming and class conflicts are resolved.

9. [09. Economy Asset Generation & Full In-Game Wiring Plan](./09-economy-assets-generation-and-wiring-plan.md)
   - Actionable batch-by-batch asset generation plan for all 38 remaining Season 0 items.
   - Automated conversion pipeline for the 4-file compliance standard (`256px local`, `512px large`, `1254px master`, `1254px chroma`).
   - Registration into Steam inventory schema, catalog synchronization, and Armory / Battle Pass UI integration.

10. [10. Season Rewards, Skin Catalog Review & Achievement-Unlocked Class Skins Manifest](../season-rewards-skins-and-achievement-unlocks.md)
    - Full audit of all 71 existing catalog items, 2D art, 3D meshes, and runtime engine wiring.
    - Master prompt manifest for all missing 3D models, shaders, and synthesized voice callouts.
    - 12 brand-new achievement-unlocked class skins (4 Scout, 4 Tank, 4 Engineer) with full lore, 2D/3D prompts, and technical engine wiring plan.


