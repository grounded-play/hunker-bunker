# 3D asset audit: mislabeled, placeholder and missing models (2026-10-01)

Status: audit snapshot | Owner: Claude lane | Updated: 2026-10-01 | Review: when a listed model is replaced

Scope: all 320 runtime GLBs under `public/3d`, every catalog item mapped to a model (106), the enemy and NPC model maps, and the raw sources under `art/source`. Ticket: [S49-37](../planning/sprint-49.md) (art and content completeness through in-game inspection). Checked at `c207bcd6`.

## Method

- **Byte identity:** sha256 of every GLB. The retail report's `duplicateChecksums` lists the pairs.
- **References:** every `/3d/…glb` path in non-test source was resolved against `public/`. None is missing.
- **Mapping:** each catalog item's model, extracted from the data modules (`classArsenal`, `armoryPreviews`, `communitySkins`, `itemOwnership`, `player3dOverlay`, `enemy3dOverlay`).
- **Looking at them:** every catalog, enemy, NPC and prop model was rendered with the game's own three.js and `GLTFLoader` (meshopt decoder registered) in headless Chrome. They were drawn into labelled contact sheets and inspected one by one. Evidence for the key cases: [suspects sheet](assets/3d-audit-2026-10-01-suspects.jpg).

## 1. Placeholders presented as finished items (highest priority)

Commit `3482799b` (2026-09-30, "wire missing achievement 3D cosmetics and key enemy models") flipped five achievement rewards from `pending` to `ready`. It did so by **copying existing models under new names**. That removed a guard in `src/data/armoryPreviews.js` that said "Do not offer an emblem-backed tile that silently renders the factory gun". No raw source for any of the five exists in `art/source`.

| Item | Shown as | Is actually |
| :--- | :--- | :--- |
| **5001** Ghost Runner Recon Rig (scout chassis, legendary) | `chassis_scout_ghost_runner.glb` | Byte-identical to community skin **Scout: Corpo Shadow Runner**: a woman in a leather jacket and heels |
| **5002** Chrono-Drifter Talon-C (epic weapon) | `skin_scout_chrono_drifter.glb` | Byte-identical to the base frame `gun_scout_talon_c.glb`, itself a **grey, untextured 2k-triangle blockout** (see §3) |
| **5006** Bunker Bastion Siege-Breaker (epic weapon) | `skin_tank_bunker_bastion.glb` | Byte-identical to the base `gun_tank_siege_breaker50.glb`, the factory gun |
| **5009** Archival Constructor Arc Driver (legendary weapon) | `skin_engineer_archival_constructor.glb` | Byte-identical to the base `gun_engineer_tesla_lock.glb`, the factory gun |
| **5010** Hive-Weaver Bio-Plasma Emitter (legendary weapon) | `skin_engineer_hive_weaver.glb` | Byte-identical to **4110 Queen's Carapace Carbine** (another item), 321k triangles, modelled on a display plinth |

**Recommendation:** set these five back to `pending` and restore the `armoryPreviews.js` guard until real models exist, or relabel them honestly as palette or variant rewards. Players earning 5002, 5006 or 5009 currently see the gun they already have.

## 2. Enemies and bosses using another character's model

| Enemy | Model used | Problem | Raw source available? |
| :--- | :--- | :--- | :--- |
| `bio_charger` | `new3ds/bio_charger.glb` = community skin `scout_xeno_stalker` | A humanoid **player skin** (female, T-pose) as an enemy. The rename in `3482799b` changed nothing visually | **Yes:** `art/source/new3d/assets/BioStalker.glb` (53 MB, 2026-08-03) is a quadruped alien beast that fits. It has **no animations**, so it needs rigging before it can replace a rigged-locomotion type |
| `mycelium_stalker` | `community/scout_xeno_stalker.glb` directly | Same player skin | Same `BioStalker.glb` candidate |
| `cryosnail` | `cyber-snail.glb` | Renders as the brown mechanical cybersnail. There is **no regular cryosnail model**; only `cryo-snail-boss.glb` has the ice look | No regular cryosnail source found |
| `boss_corrupted_engineer` | `new3ds/boss_corrupted_engineer.glb` = `npc_kaelen.glb` + tint `0xa87766` | The boss is the **friendly camp leader Kaelen**, unchanged | None. A corrupted Kaelen exists only as 2D sprite art (`art/source/art-remaster/sprites-v2/boss_corrupted_engineer_v2.png`). No 3D or FBX |
| `boss_corrupted_tank` | `= boss_corrupted_briggs.glb` | Intended reuse: the corrupted Briggs brute, from `Run To Stop - Corrupted Commander Briggs.fbx`. Correct content | — |
| `boss_corrupted_scout` | `= boss_corrupted_martha.glb` | Intended reuse: corrupted Martha, from `Hip Hop Dancing - Corrupted Sister Martha.fbx`. Correct content | — |
| `alien_proto_spitter` | `new3ds/alien_proto_crawler_A.glb` | Shares the crawler's model (spider crawler); `alien_proto_crawler.glb` and `_A` look identical | — |

The two copied boss files only duplicate bytes (≈5 MB). Pointing `enemy3dOverlay.js` at `boss_corrupted_briggs.glb` / `boss_corrupted_martha.glb` and deleting the copies is a clean saving.

## 3. Low-fidelity or damaged models

- **`gun_scout_talon_c.glb`** (scout base Talon-C frame, committed `09d4a44e` on 2026-08-17 as "Talon-C Carbine 3D mesh") is an untextured 2k-triangle grey blockout. Every scout using the Talon-C frame sees it.
- **The sprint-34 environment set** (`arch_*`, `fixture_*`, `prop_flesh_steel_*`, `prop_fungal_*`, `prop_icey_*`, `state_*`, `prop_pipe_rupture`, `prop_light_cluster_dripping`, `prop_locker_bulged`, about 35 models) was decimated from 27–50 MB sources to about 1k triangles. Several now read as fragments or dark slabs, especially `fixture_sconce_vine`, `prop_conduit_junction_box` (a large green quad), `prop_flesh_steel_cradle`, `prop_fungal_tendril_altar` and `prop_pipe_rupture`. This is a quality and budget trade-off rather than mislabeling; re-export from the sources at a higher budget where they matter.
- **Season and earned items** at 2–7k triangles (4160–4167 rig modules, 4200–4237 season operator/weapon skins and charms) are also heavily decimated, but still readable.
- **Simple-looking charms and mods** (4138 Dark Matter Micro-Singularity, a plain purple sphere; 4142, 4143, 4144) look much flatter than their 50k-triangle siblings. They may be placeholders.
- **Heavy meshes:** 4109 Void-Walker Beam Cannon (372k triangles) and 4110 Queen's Carapace Carbine (321k) are far above every other weapon (25–50k).
- **4106 Biolume Spore Sprayer** has a detached fragment floating above the gun.

## 4. Naming problems

- **4100 "Sub-Zero Frostbite Sidearm"** is a full SMG with stock and suppressor, not a sidearm.
- **4162 Queen's Bane** (a rig module) is modelled as a sci-fi **pistol**.
- **`comm_scount_sil` / `community/scount_sil.glb`:** "scount" is a typo for "scout" in the ID and the file name.
- **"Apex Chrysalis" community skins:** the Scout and Tank versions are ordinary human characters (hacker, military officer), while "Toxic Apex Chrysalis" versions are creature-like. Low confidence: these are creative names.
- **Duplicate prop concepts at two qualities:** `body_empty_exosuit` (3k) and `prop_body_empty_exosuit` (20k); `body_frozen_human` (3k) and `prop_body_human_frozen` (25k).
- **`arch_rib_ceiling_vault_01..03`** render as upright pillars with flared tops. They may simply be meant to hang, so confirm orientation in place.

## 5. Content flag

- **4237 Grand Marshal Charm** shows what appears to be the real-world Russian double-headed-eagle coat of arms. Confirm that this real-world emblem is intended and cleared.

## 6. What is not wrong

- No referenced GLB path is missing (320 references checked, tests excluded).
- Every other catalog weapon skin, chassis, charm and mod renders content consistent with its name. That covers 4101–4119, 4130–4137, 4139–4141, 4145–4147, 5003–5005, 5007, 5008, 5011, 5012 and the other community skins.
- Raw-to-runtime coverage for the season FBX sources (Itemdef 4104, 4111, 4115–4119, 4145, 4146, 5003–5012) is complete. Only 5001, 5002, 5006, 5009 and 5010 have no source.

## Raw assets never imported

- `art/source/new3d/assets/BioStalker.glb`: the best candidate for `bio_charger` and `mycelium_stalker` (needs a rig).
- `art/source/new3d/Ch11_nonPBR.fbx`, `Ch44_nonPBR.fbx`, `Vanguard By T. Choonyung.fbx`, `Tank.glb`: no obvious runtime counterpart by name. Check provenance before use ([ASSET_PROVENANCE](../ASSET_PROVENANCE.md)).
