# Setpiece asset & lore inventory (2026-09-12)

Status: inventory input for the level-design setpiece plan · Owner: inventory lane ·
Companion to the systems half of the same plan.

Every count below was produced by walking the actual source and `public/` tree on
`dev/sprint-37` at commit `fd761c6`, not estimated. Where a claim is inference
rather than measurement it is labelled **ASSUMED**. Where art or data exists but
no runtime path reaches it, it is labelled **AUTHORED-BUT-UNWIRED**.

---

## 0. The one-paragraph answer

There is a large, healthy dressing vocabulary — **256 addressable placement type
strings**, **227 GLBs in `public/3d/runtime` with zero orphans**, **63 decals**,
**44 signature room props**. The bottleneck is not art. The bottleneck is that
`src/data/roomBuilds.js` holds **8 builds covering 8 families**, while
`src/ringManifest.js` asks for **22 families and 13 named objective anchors**, of
which **14 families and 10 anchors have no authored room at all**. Ten to fourteen
new setpieces can be authored today with zero new assets. The two things that
would otherwise silently break them are documented in §1.4 and §2.3.

---

## 1. Prop / model inventory

### 1.1 How a `type:` string in `roomBuilds.js` actually resolves

The chain, verified end to end:

1. `src/data/roomBuilds.js` anchor `{ id, type, x, y }`
2. → `src/roomBuilds.js:buildRoomInstanceFromBuild` translates anchors to chunk-local coords
3. → `src/roomPopulation.js:planRoomPopulation` (lines 148–203) emits `placements[]`
   carrying `type` verbatim from the anchor, or a per-group default
   (`interaction` → `'console'`, `reward` → `'prop_bunker_supplies'`, `lore` → `'lore_terminal'`)
4. → `src/threeGame.js:~25273–25801` `createScatterSprite`, which branches on the
   *string prefix*:
   - `drop_*`, wall decals (`WALL_DECAL_TYPES`, 32 entries, `threeGame.js:604`),
     floor overlays (`FLOOR_OVERLAY_TYPES`, 38 entries, `threeGame.js:564`)
   - `prop_*` → `threeGame.js:25424`
   - `bunker_junk*` → `:25475`, `lore_terminal` → `:25514`, enemies → `:25632`
   - everything else → generic sprite path at `:25770`
5. In **all** prop/generic branches the first line is
   `const spriteMaterial = this.scatterMaterials[placement.type]; if (!spriteMaterial) return null;`
6. `this.scatterMaterials` is seeded from explicit literals (`threeGame.js:2449`),
   then **auto-filled from every key in `this.scatterTextures`** (`threeGame.js:3049`),
   then from `LORE_DROPS`.
7. `this.scatterTextures` (`threeGame.js:2259`) is a 159-key literal, plus a loop at
   `:2436` that folds in all 44 keys of `GENERATED_ROOM_PROP_PATHS` (`threeGame.js:522`).
8. **Only after** a 2D sprite exists does `deferWorld3dReplacement` swap in a GLB,
   gated on `hasWorld3dModel(type)` → `WORLD_3D_MODELS` in `src/world3dOverlay.js:15`.

**Consequence (this is the important one):** a type needs a **2D texture entry** to
render at all. A 3D-only registration renders *nothing*. See §1.4.

### 1.2 Measured counts

| Registry | File | Keys |
| --- | --- | ---: |
| `scatterTextures` literal | `src/threeGame.js:2259–2435` | 159 |
| `GENERATED_ROOM_PROP_PATHS` | `src/threeGame.js:522–566` | 44 |
| `WORLD_3D_MODELS` | `src/world3dOverlay.js:15–140` | 107 (104 distinct URLs — 3 aliases) |
| **Union of addressable placement types** | | **256** |
| **Types with a 2D sprite (i.e. that actually render)** | | **203** |
| `FLOOR_OVERLAY_TYPES` | `src/threeGame.js:564` | 38 |
| `WALL_DECAL_TYPES` | `src/threeGame.js:604` | 32 |

By prefix, across the 256-type union: `prop_*` 75, `decal_*` 63, `arch_/fixture_/state_*` 24,
`scatter_*` 15, `drop_*` 14, `npc_*` 11, remainder enemies/bodies/ships/modules.

**File existence verified, zero missing:**
- All 104 `WORLD_3D_MODELS` URLs resolve to a real file under `public/3d/`.
- All 44 `GENERATED_ROOM_PROP_PATHS` paths resolve to a real file in `public/`.
- All sprite paths inside the `scatterTextures` literal resolve to a real file.
- 227 GLBs under `public/3d/runtime`; **0** unreferenced anywhere in `src/`, `main.js`, `scripts/`.

### 1.3 The 75 `prop_*` types available today

```
prop_alien_feeding_basin      prop_alien_respiratory_vent   prop_ammo_crate_stack
prop_base_defense_turret      prop_biomech_arch             prop_biomech_flesh_locker
prop_biomech_incubator        prop_biomech_neural_synapse   prop_biomech_pillar_left
prop_biomech_pillar_right     prop_biomech_respirator       prop_biomech_sphincter_trap
prop_biomech_triage_cradle    prop_blood_trail              prop_body_empty_exosuit
prop_body_human_frozen        prop_broken_specimen_tank     prop_bunker_supplies
prop_camp_bedrolls            prop_camp_cookfire            prop_camp_cookfire_doused
prop_camp_cookfire_lit        prop_camp_cot                 prop_camp_crate
prop_camp_crates              prop_camp_sandbags            prop_cave_bones
prop_cave_eggs_hatched        prop_cave_eggs_intact         prop_cave_hive_wounded
prop_cave_lichen              prop_cave_queen_throne        prop_cave_spores
prop_cave_webs                prop_chair_operator_wrecked   prop_conduit_hub
prop_conduit_junction_box     prop_cryo_sleep_pod           prop_cyber_junction
prop_diagnostic_console       prop_engineering_bench        prop_fabricator_workstation
prop_flesh_steel_coffin       prop_flesh_steel_cradle       prop_flesh_steel_inhaler
prop_fungal_mycelium_loom     prop_fungal_resin_basin       prop_fungal_spore_dispenser
prop_fungal_tendril_altar     prop_fusion_generator         prop_hive_resin_sac
prop_icey_frost_manifold      prop_icey_frost_vent          prop_icey_thermal_pod
prop_iron_guild_dogtags       prop_laser_trap_emitter       prop_light_cluster_dripping
prop_locker_bulged            prop_medical_bed              prop_o2_filter_vat
prop_pipe_rupture             prop_ruptured_coolant_pump    prop_security_barricade
prop_security_locker          prop_shrine_plinth_broken     prop_specimen_tank
prop_spore_colony             prop_storage_drum_dented      prop_surgical_cart
prop_terminal_ruptured        prop_tesla_coil_node          prop_torn_warning_poster
prop_valve_wheel_fused        prop_vent_grate_exploded      prop_vital_monitor
```

Plus a non-`prop_` set usable as anchor types: `base_console` (real GLB
`/3d/runtime/console.glb`), `lore_terminal`, `storage_locker`, `o2_generator`,
`hull_matrix`, `radar`, `fusion_generator`, `basic_pile`, `frozen_tanker`,
`broken_{scout,tank,engineer}_ship`, `ship_wreckage`, `pit_hole`, `egg_cluster`-adjacent
cave props, 14 `drop_*` lore collectibles, and 11 `npc_*` character models.

**52 of the 75 `prop_*` types have BOTH a 2D sprite and a 3D GLB** — those are the
highest-fidelity dressing choices and should be preferred in setpiece anchors.

**23 `prop_*` types are 2D-sprite-only** (will render as billboards, never upgrade
to a mesh): `prop_alien_feeding_basin`, `prop_alien_respiratory_vent`,
`prop_biomech_pillar_left/right`, `prop_blood_trail`, `prop_camp_bedrolls`,
`prop_camp_cookfire_doused/lit`, `prop_cave_eggs_hatched/intact`,
`prop_cave_hive_wounded`, `prop_cave_lichen`, `prop_cave_spores`, `prop_cave_webs`,
`prop_cryo_sleep_pod`, `prop_cyber_junction`, `prop_engineering_bench`,
`prop_fusion_generator`, `prop_iron_guild_dogtags`, `prop_ruptured_coolant_pump`,
`prop_security_locker`, `prop_spore_colony`, `prop_torn_warning_poster`.
Fine to use; just don't promise a 3D look.

### 1.4 AUTHORED-BUT-UNWIRED — the 24-piece architecture kit renders nothing in-world

`public/3d/runtime/new3ds/` ships a complete architectural kit, all 24 GLBs present
on disk and all registered in `WORLD_3D_MODELS`:

`arch_bulkhead_frame`, `arch_deco_archway_grand_01..04`, `arch_niche_shrine`,
`arch_pillar_buttress_01..04`, `arch_rib_ceiling_vault_01..03`, `arch_window_stained`,
`fixture_clock_dead`, `fixture_sconce_vine`, `state_column_shattered`,
`state_wall_breached_01..03`, `state_barricade_improvised_1/2`, `state_growth_overrun_1/2`.

**None of them has a `scatterTextures` / `GENERATED_ROOM_PROP_PATHS` entry.**
`src/roomThemes.js` nonetheless references them in **26 places across 11 of 15
themes** (`bunker-standard.largeProps` → `arch_bulkhead_frame`, etc.).
`roomPopulation.js:226` can select one via `propFrom(theme.largeProps, …)`; the
resulting placement reaches `createScatterSprite`'s generic branch at
`threeGame.js:25770`, finds no `scatterMaterials[type]`, and **returns `null`**.
The only place these models are visible today is `src/debugShowroom.js`.

`src/debugMuseum.coverage.test.js` passes because it only asserts showroom
reachability, not in-world renderability — so this has been green while broken.

**Implication for the plan:** every one of those 24 models is one `scatterTextures`
line away from being usable as setpiece architecture. That is the single highest
leverage asset fix available, and it is the difference between "corridors of
crates" and "a hospital with an arcade and a shattered column". Treat it as a
prerequisite task for any setpiece that wants architecture, not as a setpiece task.

*Verification note:* this is a code-path reading, not a browser observation. The
branch is unambiguous (`if (!spriteMaterial) return null;`) and `scatterMaterials`
has exactly three population sources, none containing `arch_*`. Confidence: high.
A 5-minute in-browser check would close it out.

### 1.5 Room-build anchors that do NOT resolve — none

All 15 distinct anchor `type` values used across the 8 catalog builds resolve to a
real 2D texture:

`prop_bunker_supplies` ×7, `prop_security_locker` ×2, `prop_cyber_junction` ×2,
`lore_terminal` ×2, `base_console` ×2, and one each of `prop_vital_monitor`,
`prop_o2_filter_vat`, `prop_medical_bed`, `prop_fabricator_workstation`,
`prop_engineering_bench`, `prop_diagnostic_console`, `prop_conduit_hub`,
`prop_biomech_pillar_left/right`, `prop_ammo_crate_stack`.

The in-file comments about a bare `'console'` placeholder are historical; it is gone.
(`'console'` *does* survive as `roomPopulation.js`'s `defaultType` for a typeless
interaction anchor — and it resolves to nothing. Authored setpieces must always
give interaction anchors an explicit `type`.)

### 1.6 21 faction props exist as art but are NOT addressable from `roomBuilds.js`

These files exist in `public/` and are loaded — but only by hardcoded per-scene
paths in `src/camp.js` and `src/hiveSite.js`, never registered as placement types:

*Meridian:* `prop_camp_meridian_radio`, `_battery_bank`, `_repair_rig`
*Tallow:* `prop_camp_tallow_still`, `_spore_trays`, `_resin_urn`
*Vesper:* `prop_camp_vesper_turret`, `_ammo_press`, `_shield_rack`
*Hive:* `prop_hive_carapace_molt`, `_chitin_hatchery`, `_relay_antenna`, `_suture_organ`, `_synaptic_web`, `_wound_cauterizer`
*Camp generic:* `prop_camp_crates_chained`, `_grave_fresh`, `_grave_old`, `_laundry`, `_shutter_lockdown`, `_warning_placard`

Each needs one `scatterTextures` line to become setpiece-usable. **This is the
entire faction-identity dressing vocabulary** and it is currently unavailable to
any authored room. Second-highest-leverage fix after §1.4.

---

## 2. Theme / dressing vocabulary (`src/roomThemes.js`)

### 2.1 What is defined

- **3 biomes:** `active`, `cryo`, `bio`.
- **15 themes** in `ROOM_THEME_CATALOG`: `bunker-standard`, `bunker-utility`,
  `bunker-medical`, `bunker-security`, `bunker-workshop`, `bunker-armory`,
  `cryo-rough`, `cryo-medical`, `cryo-engineering`, `cryo-recovery`,
  `bio-resin`, `bio-nest`, `bio-feeding-chamber`, `camp-fortified`, `reward-cache`.
- **11 theme roles:** `generic`, `utility`, `medical`, `security`, `engineering`,
  `storage`, `reward`, `nest`, `hive`, `cryo-lab`, `camp`.
- **4 `LIVED_IN_DECALS` sets:** bunker 28, cryo 14, bio 16, camp 15 — all resolve.
- **22 room families** in `ROOM_FAMILY_THEME_ROLES`: medical, rescue, armory,
  security, gate, arena, trap, trap_reward, o2, fabricator, engineering, puzzle,
  objective, mission, cache, salvage, lore, camp, hive, queen, entry, connector.

### 2.2 Real coverage vs named-only

Every theme has genuine prop coverage — no theme is an empty shell. Every family
role maps to at least one theme *in some biome*. But the biome×role matrix has
**10 holes** where `chooseRoomTheme` silently falls back to the biome's `generic`
theme:

| Biome | Roles with no theme |
| --- | --- |
| `active` | `cryo-lab`, `hive`, `nest`, **`storage`** |
| `cryo` | `hive`, `nest` |
| `bio` | `cryo-lab`, **`engineering`**, **`medical`**, **`security`** |

The bolded four matter for setpieces. In particular **a `bio`-biome medical,
security or engineering setpiece gets dressed as `bio-resin` generic** — so a
hospital placed in the bio ring loses its hospital vocabulary entirely. Either
the plan restricts those setpieces' `biomeEligibility`, or the systems lane adds
the four missing themes (pure data, no new art — the props all exist).

### 2.3 `PRESENTATION_STATE_MODIFIERS.propPrefix` is inert

`resolveThemeWithStateVariant` reads only `modifier.decal` and returns
`appliedDecal`. The `propPrefix` field (`'scatter_'`, `'prop_hive_'`, …) on all
11 state modifiers is never read by anything. Setpiece `presentationVariants` /
`stateVariants` therefore change **one decal** and nothing else today. If the plan
promises "the hospital looks different when infested", that is a systems-lane task,
not a free consequence of declaring the variant.

---

## 3. Narrative material available for setpieces

### 3.1 Named places the fiction commits to — with no physical place in the world

`src/data/codex.js:LORE_METADATA` stamps 43 lore entries with explicit sector
coordinates. **None of these named locations exists as an authored room.** They are
the richest untapped setpiece source in the repo.

**SECTOR A-9 (active/bunker):** BAY C STASIS · ACTIVE SECTOR · SECURITY CONTROL ·
O2 GENERATOR · COMMUNICATIONS · ARMORY RUINS · MAIN OFFICE · COMMAND BASE ·
WEAPONS BAY · BORE 7 RUINS · DEEP TUNNELS · SECURITY POST

**SECTOR B-4 (cryo):** BAY C · COOLANT UNIT · **POD 312** · CRYO LABS ·
CRYO CORRIDOR · BAY C SEAL · COOLANT DRAIN · **POD 0047** · VENT SHAFT ·
OUTPOST HULL · CRYO EXIT · CRATER RIM · IMPACT CORE · REFUGEE OUTPOST ·
SECTOR FAMILY AREA · PERIMETER DEFENSE

**SECTOR C-7 (bio):** BIO SWARM · NEURAL FILAMENT · **CHEN SECTOR OFFICE** ·
BIO SWARM NEST · **THE ABYSS HIVE** · CAVERN ENTRANCE · **CULT SANCTUARY**

**ACTIVE (drift):** DRIFT OUTSIDE OUTPOST · **CATACOMBS BASEMENT**

Two of these already have *decal* art with no room to put it in:
`decal_pod_312_breach.png` and `decal_machine_cult_shrine.png`.

`src/loreDrops.js` additionally names six **site families** — `ruins`, `crater`,
`camp`, `hive`, `cave`, `anywhere` — each with authored stage-1/2/3 drops and a
`lead` line that is literally a call to go somewhere. `ruins` and `crater` have
authored lore and **no authored room family at all**.

### 3.2 Factions and characters

| Human camp | Leader | Alien hive | Leader | Resource |
| --- | --- | --- | --- | --- |
| CAMP MERIDIAN (`camp_meridian`) | Overseer Kaelen | SUTURE HIVE (`hive_suture`) | Nahl | `suture_resin` |
| CAMP TALLOW (`camp_tallow`) | Sister Martha | RELAY HIVE (`hive_relay`) | Vey | `neural_filament` |
| CAMP VESPER (`camp_vesper`) | Commander Briggs | CARAPACE HIVE (`hive_carapace`) | Rhun | `living_chitin` |

Other committed named entities: **Horizon Corporation** (badges, manifests, the
`skin_horizon_corporate` line), **Director A. Chen** (geothermal division, sealed
personal terminal, "CHEN SECTOR OFFICE"), **Dr. Okonkwo-Vass** (the specimen
linchpin), **Pvt. M. Reyes** (the letter achievement), **Specimen 0047 / 0047-B
"Aria"**, **Mayor Tina**, **Sister Val**, the **Iron Guild** (`prop_iron_guild_dogtags`),
the **Machine Cult** (`decal_machine_cult_shrine`), the **queen's cultists**
("SHE DREAMS US WARM", `drop_prayer_stone`), **Bore 7**, **K. Vesper** (dead, on
the roster).

All 11 `npc_*` GLBs exist and are registered: `npc_martha`, `npc_kaelen`,
`npc_briggs` (aliases `chassis_trench_warden_heavy.glb` — a reuse, not bespoke),
`npc_val`, `npc_nahl`, `npc_vey`(as `npc_alien_vey`), `npc_alien_rhun`, `npc_aria`,
`npc_queen`, `npc_civilian_miner`, `npc_civilian_researcher`. Plus
`boss_corrupted_briggs.glb` and `boss_corrupted_martha.glb` on disk (registered
via the enemy path, not `WORLD_3D_MODELS`) and `mayor-tina-rigged.glb`.

### 3.3 Story beats with NO physical place to happen in

This is the direct answer to the brief. Measured against `src/ringManifest.js`.

**The ring manifest reserves 22 room families. The catalog covers 8.** Missing
families: `engineering`, `security`, `lore`, `rescue`, `arena`, `camp`, `salvage`,
`hive`, `queen`, `objective`, `mission`, `connector`, `entry`, `trap`.
`buildAuthoredRoomChunkStructure` returns `null` for each and the chunk silently
falls back to a fully procedural maze (`chunkStructure.js:222–224`, documented as
intended). So the beat happens — in an anonymous room.

**3 of 4 `MANDATORY_SHIP_GOALS` have no authored room:**

| Goal | Ring | Family needed | Authored? |
| --- | ---: | --- | :---: |
| `o2Bubble` | 1 | `o2` | ✅ `o2_scrubber` |
| `hullExpansion` | 2 | `engineering` | ❌ |
| `radarNode` | 3 | `security` | ❌ |
| `reactorCompressor` | 4 | `engineering` | ❌ |

**10 of 13 `objectiveAnchorId`s have no build providing them:**
`hull_fabrication_console`, `radar_alignment_console`, `compressor_control`,
`reactor_vent_control`, `hive_archive_terminal`, `stasis_archive_node`,
`incident_archive_core`, `cultist_recovery_point`, `lost_probe`, `barricade_gate`.
(Provided: `o2_control`, `hydro_bed_controls`, `armory_lock`.)

**Every camp signature quest is placeless.** `src/data/campQuests.js` authors 12
quests including three 2-bond signature quests — THE GRID COVENANT (sign Kaelen's
ledger), THE WARM PIPES (Martha's promise), THE IRON LEDGER (Briggs' ledger of the
dead). None has a destination room family in `CAMP_QUEST_DESTINATIONS` and none has
an authored room.

**Every linchpin is placeless.** Nine linchpins in `src/storyLinchpins.js`
(`mayor_tina`, `scientist_specimen`, `queen_offer`, `briggs_oath`, `martha_beacon`,
`kaelen_manifest`, `suture_host`, `relay_chorus`, `carapace_oath`) — the
irreversible turns the whole ending system hangs on — have codex entries written
about them but no authored chamber to happen in.

**Ring-5 finale / queen.** `families 'queen'` and `'hive'` are reserved by the
manifest with no build; `prop_cave_queen_throne` art exists and is registered in
both 2D and 3D.

**`HIVE_TERRITORY_BEATS` and `CAMP_TERRITORY_BEATS`** each define a 6-beat
authored sequence (warning → approach → outer_nest → choice_chamber → consequence →
escape; approach → perimeter → central → service → leader_quest → exit). **Twelve
beat roles, zero authored rooms.** This is the single most explicit, most
plan-shaped setpiece brief already sitting in the codebase.

---

## 4. Prior art — cite, do not repeat

### 4.1 `docs/design/asset-gap-audit-2026-09-11.md`

Concluded, and **still true**:
- No unused-asset problem. 227 GLBs in `public/3d/runtime`, 227 referenced, 0 orphans.
  *(Re-verified today: 227/227/0. The doc's own note that a first pass wrongly
  reported 28 orphans by missing `src/data/` is worth honouring — repeat the
  `src/data/` sweep before claiming any orphan.)*
- **Gap 1 — five endings have no cutscene.** **STILL OPEN.** `public/cutscenes/`
  holds exactly 5 `ending-*.webm`: fullbrood, cleanescape, mixedcrew,
  carriersbargain, scorchedsky. Missing: mothershipinfection, alienexodus,
  outedescape, failedcarrier, emptyhusk. `playCutsceneVideo` resolves silently.

Now **STALE**:
- **Gap 2 — "the 20 new props are not registered."** Closed. `WORLD_3D_MODELS` now
  carries 107 entries including all the `prop_flesh_steel_*`, `prop_fungal_*`,
  `prop_icey_*`, `prop_*_ruptured/bulged/dented` set. *But the doc's framing was
  too narrow:* registration in `WORLD_3D_MODELS` alone is **not** sufficient for a
  type to render — see §1.4, where the `arch_*`/`state_*`/`fixture_*` kit is fully
  registered there and still draws nothing.
- **Gap 3 — "camps have no leader models."** Closed. `npc_martha`, `npc_kaelen`,
  `npc_briggs`, `npc_val` are all registered with real GLBs. Caveat: `npc_briggs`
  aliases `chassis_trench_warden_heavy.glb` rather than a bespoke model.

### 4.2 `docs/planning/asset-gaps-and-world-lore-audit-2026-09-12.md`

Concluded, and **still true**:
- The five ending-cutscene gaps, with full generation prompts per ending. Reuse
  those prompts; do not rewrite them.
- The three camps' faction identity split (Meridian = tech/foundry, Tallow =
  bio-medical, Vesper = heavy defense) with a per-camp 3D prop palette. That
  palette is correct and directly reusable for setpiece dressing.
- The NPC reactive-locomotion / proximity-bark matrix for Briggs, Martha, Kaelen
  across neutral/lockdown/turned/recruited states.

Now **STALE**:
- **§2 "Signature Sprite Art Prompts (Queued Assets)".** All nine camp faction
  sprites it queues (`prop_camp_meridian_radio.jpg`, `_battery_bank`, `_repair_rig`,
  `prop_camp_tallow_still`, `_spore_trays`, `_resin_urn`, `prop_camp_vesper_turret`,
  `_ammo_press`, `_shield_rack`) **now exist in `public/`** and are loaded by
  `src/camp.js`. They are no longer queued — they are shipped-but-unaddressable
  (§1.6). Six hive equivalents shipped the same way via `src/hiveSite.js`.
- **§4.1 "Immediate world-building leverage — registered 3D models."** The specific
  models it lists are indeed registered, but the doc implies registration means
  placeable. For `prop_base_defense_turret` in particular, there is **no 2D sprite**,
  so it cannot be used as a room-build anchor type as-is (it is reached only via
  the dedicated turret path at `threeGame.js:18412`).

### 4.3 What neither prior doc covered

Neither audit examined `src/data/roomBuilds.js`, `src/ringManifest.js`, or the
`scatterMaterials` render gate. The three findings that are new here — the §1.4
architecture-kit dead end, the §1.6 faction-prop addressability gap, and the §3.3
family/anchor deficit — are the ones this plan should lead with.

---

## 5. Proposed setpiece shortlist

Ranked by "dressable today". Ring assignment follows `src/ringManifest.js`
(rings 1–4 + ring 5 finale). Footprint headroom is generous: `CHUNK_SIZE` is 49 and
`stampRoomBuild` allows up to **43×43**; today's largest build is 17×13.

Constraints every entry must respect (from §1, §2):
- every interaction anchor needs an explicit `type` (the `'console'` default is dead);
- `structuralAnchors` must sit on `#` cells, all other anchors on `.`;
- bio-biome medical/security/engineering setpieces must either exclude `bio` from
  `biomeEligibility` or wait for the four missing themes (§2.2);
- no `arch_*`/`state_*`/`fixture_*` until §1.4 is fixed;
- no faction/hive camp props until §1.6 is fixed.

### Tier A — buildable today, 0 new assets, 0 prerequisite fixes

**1. BAY C STASIS — the cryo ward** · *ring 1–2, family `medical`, biome `cryo`*
Hook: forty pods, thirty-one names on the manifest, one pod open from the inside.
Dresses with `prop_cryo_sleep_pod`, `prop_vital_monitor`, `prop_medical_bed`,
`prop_diagnostic_console`, `prop_broken_specimen_tank`, `prop_body_human_frozen`,
`decal_frost_bloom_1/2`, `decal_condensation_run`, `decal_failed_decon_kit`.
Theme `cryo-medical` / `cryo-recovery` already exist and are fully covered.
Lore hooks: C01–C07, `drop_frozen_letter`. **Verdict: buildable today.**

**2. POD 312 — the breach** · *ring 2, family `medical`, biome `cryo`*
Hook: `src/caveReveal.js` already says the line — "Pod 312… opened from the inside."
Small, quiet, one pod, one decal. Dresses with `prop_cryo_sleep_pod`,
`decal_pod_312_breach` (art exists, listed in `cryo-medical.rareProps`, currently
has nowhere to land), `decal_claw_scratches`, `prop_body_empty_exosuit`,
`scatter_cryo_shards`. **Verdict: buildable today. Gives an orphaned decal a home.**

**3. HULL FABRICATION BAY** · *ring 2, family `engineering`, anchor `hull_fabrication_console`*
Hook: the ship goal nobody has a room for. Dresses with `prop_engineering_bench`,
`prop_fabricator_workstation`, `prop_tesla_coil_node`, `prop_conduit_junction_box`,
`prop_pipe_rupture`, `hull_matrix`, `decal_oil_spill_patch`, `decal_hazard_stripes`.
Theme `bunker-workshop`/`cryo-engineering` exist. **Verdict: buildable today —
and it closes a `MANDATORY_SHIP_GOALS` hole.**

**4. SECURITY CONTROL / RADAR ALIGNMENT** · *ring 3, family `security`, anchor `radar_alignment_console`*
Hook: the perimeter is not where we left it (`drop_security_log`, A06).
Dresses with `radar`, `prop_security_barricade`, `prop_security_locker`,
`prop_chair_operator_wrecked`, `prop_terminal_ruptured`, `prop_locker_bulged`,
`decal_bullet_holes`, `decal_barricade_last_stand`, `prop_iron_guild_dogtags`.
Theme `bunker-security` exists. **Verdict: buildable today — closes a second ship-goal hole.**

**5. REACTOR COMPRESSOR HALL** · *ring 4, family `engineering`, anchor `compressor_control`*
Hook: the last thing the ship needs, in the hottest part of the ice.
Dresses with `fusion_generator`, `prop_fusion_generator`, `prop_conduit_hub`,
`prop_valve_wheel_fused`, `prop_ruptured_coolant_pump`, `prop_pipe_rupture`,
`prop_light_cluster_dripping`, `decal_scorch_bloom`, `decal_friction_burn`.
**Verdict: buildable today — closes the third and last ship-goal hole.**

**6. THE ARCHIVE CORE** · *ring 2–4, family `lore`, anchors `hive_archive_terminal` /
`stasis_archive_node` / `incident_archive_core`*
Hook: three camp quests (HIVE ARCHIVE CH. 1/2/3) all demand an archive terminal
and none has a room. One build with three named lore anchors serves all three.
Dresses with `lore_terminal` ×3, `prop_diagnostic_console`, `prop_terminal_ruptured`,
`prop_conduit_hub`, `decal_water_stain`, `decal_graffiti_tally_1/2`,
`prop_torn_warning_poster`. **Verdict: buildable today — closes 3 of the 10 orphan anchors.**

**7. BORE 7 — the wound** · *ring 3–4, family `salvage` (new) or `cache`, biome `bio`/`active`*
Hook: "IT IS WARM DOWN THERE. ROCK SHOULD NOT BE WARM." The dig that broke through.
Dresses with `pit_hole`, `prop_cave_bones`, `prop_cave_lichen`, `prop_storage_drum_dented`,
`scatter_gravel`, `prop_bunker_supplies`, `decal_footprints_mud`, `decal_hazard_stripes`,
plus lore anchors for `drop_dig_manifest` + `drop_first_bore_tag` (both already
authored, both `ruins`/`cave` site). **Verdict: buildable today.**

**8. THE CULT SANCTUARY** · *ring 4, family `lore`/`cache`, biome `bio`*
Hook: "SHE DREAMS US WARM" — she had worshippers before she had hosts.
Dresses with `prop_fungal_tendril_altar`, `prop_shrine_plinth_broken`,
`prop_cave_spores`, `prop_cave_webs`, `decal_tallow_symbol`, `decal_machine_cult_shrine`
(art exists, currently only reachable as a `bunker-utility` rareProp — wrong home),
`prop_hive_resin_sac`, lore anchor for `drop_prayer_stone` (legendary, cave, stage 3).
**Verdict: buildable today. Also rehomes an orphaned decal.**

**9. CHEN SECTOR OFFICE** · *ring 4, family `lore`, biome `bio`*
Hook: the sealed personal terminal. "You are the containment." The single densest
piece of authored prose in the game (`src/matureContentAudit.js:20`) with nowhere
to be read. Dresses with `lore_terminal`, `prop_diagnostic_console`,
`prop_chair_operator_wrecked`, `prop_terminal_ruptured`, `decal_growth_creep_1/2`,
`decal_vine_iron_shadow_1/2`, lore anchor for `drop_horizon_badge` ("CHEN, A. —
GEOTHERMAL DIVISION"). **Verdict: buildable today.**
*Caveat: bio biome has no `lore`/generic-office theme — restrict to `active`, or
accept `bio-resin` dressing, or add the theme (§2.2).*

**10. THE BARRICADE GATE — Vesper holdout arena** · *ring 3, family `arena`, anchor `barricade_gate`*
Hook: BUNKER HOLDOUT — defend the gate from incoming patrols. Briggs' ledger of the dead.
Dresses with `prop_security_barricade`, `prop_camp_sandbags`, `prop_camp_crates`,
`prop_ammo_crate_stack`, `prop_security_locker`, `decal_bullet_holes`,
`decal_barricade_last_stand`, `prop_blood_trail`, `prop_iron_guild_dogtags`.
Theme `camp-fortified` + `bunker-security` both exist. **Verdict: buildable today
— closes an orphan anchor and gives the `arena` family its first room.**

**11. REFUGEE OUTPOST / SECTOR FAMILY AREA** · *ring 1–2, family `camp`, biome `cryo`*
Hook: "stopped counting mouths, started counting hands." A crayon sun nobody has seen.
Dresses with `prop_camp_cot`, `prop_camp_bedrolls`, `prop_camp_crate`,
`prop_camp_cookfire_doused`, `decal_worker_sleep_roll`, `decal_childlike_cave_map`,
`decal_abandoned_meal_tray`, `decal_emergency_oxygen_nest`, lore anchors for
`drop_ration_ledger` + `drop_child_drawing`. Theme `camp-fortified` exists.
**Verdict: buildable today — gives the `camp` family its first authored room.**

### Tier B — buildable after the §1.4 one-line-per-model fix (24 `scatterTextures` lines)

**12. THE MAIN OFFICE / COMMAND BASE** · *ring 3, family `lore`/`objective`, biome `active`*
Hook: Horizon's administration, still filing. Municipal-decay register, straight
from the codex voice. Wants `arch_deco_archway_grand_*`, `arch_window_stained`,
`fixture_clock_dead`, `state_column_shattered` for the "this was once grand"
read that no `prop_*` can deliver. Otherwise fully dressed by
`prop_chair_operator_wrecked`, `prop_terminal_ruptured`, `decal_floor_medallion_01..04`,
`decal_wall_panel_relief`, `decal_mirror_tarnished`, `decal_lacquer_blister_01..03`.
**Verdict: needs 0 new assets, needs 1 wiring fix (~5 of the 24 lines).**

**13. THE ABYSS HIVE — choice chamber** · *ring 4–5, family `hive`, biome `bio`*
Hook: `HIVE_TERRITORY_BEATS.choice_chamber` — the bond-or-harvest turn, which has
a codex entry and no room. Dresses with `prop_cave_queen_throne`,
`prop_biomech_incubator`, `prop_alien_feeding_basin`, `prop_hive_resin_sac`,
`prop_cave_eggs_intact`, `prop_fungal_tendril_altar`, `decal_hive_growth`,
`prop_biomech_pillar_left/right`, `npc_nahl`/`npc_alien_vey`/`npc_alien_rhun`.
Wants `arch_rib_ceiling_vault_02/03` + `state_growth_overrun_1/2` for scale.
**Verdict: needs 0 new assets, needs the §1.4 fix for the ceiling read.**

### Tier C — buildable after the §1.6 fix (21 `scatterTextures` lines)

**14. CAMP MERIDIAN / TALLOW / VESPER territory shells** · *ring 1–3, family `camp`*
Hook: `CAMP_TERRITORY_BEATS` — six authored beat roles, zero rooms, and the three
signature quests (GRID COVENANT / WARM PIPES / IRON LEDGER) that need a place to
be signed, kept and earned. **The faction-identity art already exists** —
`prop_camp_meridian_radio/battery_bank/repair_rig`,
`prop_camp_tallow_still/spore_trays/resin_urn`,
`prop_camp_vesper_turret/ammo_press/shield_rack`, plus
`prop_camp_grave_fresh/old`, `_laundry`, `_warning_placard`, `_shutter_lockdown`,
`_crates_chained`. It is simply not addressable from `roomBuilds.js`.
**Verdict: 0 new assets, needs 21 wiring lines. Highest narrative payoff per
line of code in the whole list.**

### Prerequisite tasks the plan should schedule before Tier B/C

| # | Task | Size | Unblocks |
| --- | --- | --- | --- |
| P1 | Add 24 `scatterTextures` entries for `arch_*`/`state_*`/`fixture_*`, or make `createScatterSprite` construct a 3D-only placement without a sprite | 24 lines or 1 branch | §1.4; setpieces 12, 13; and fixes 26 already-live theme entries that currently render nothing |
| P2 | Add 21 `scatterTextures` entries for the camp/hive faction props | 21 lines | §1.6; setpiece 14 |
| P3 | Add 4 themes: `bio-medical`, `bio-security`, `bio-engineering`, `bunker-storage` | data only, props exist | §2.2; lets any setpiece be biome-agnostic |
| P4 | Decide whether `PRESENTATION_STATE_MODIFIERS.propPrefix` gets implemented or removed | — | §2.3; determines whether `stateVariants` are real |

---

## 6. Evidence index

| Claim | Where verified |
| --- | --- |
| 8 builds, 8 families | `src/data/roomBuilds.js` |
| stamp/rotate/select pipeline; 43×43 max footprint | `src/roomBuilds.js:stampRoomBuild`; `src/tileCatalog.js:CHUNK_SIZE = 49` |
| authored path is live, not shelved | `src/threeGame.js:154` → `src/authoredWorldRuntime.js:1` → `src/chunkStructure.js:269` |
| 256 types / 203 renderable | `threeGame.js:522`, `:2259`, `:3049`; `world3dOverlay.js:15` |
| `!spriteMaterial → return null` | `src/threeGame.js:25425`, `:25771` |
| 227 GLBs, 0 orphans | `find public/3d/runtime -name '*.glb'` vs grep over `src/ main.js scripts/` |
| 15 themes, 10 biome×role holes | `src/roomThemes.js:ROOM_THEME_CATALOG` |
| 22 reserved families, 13 anchors | `src/ringManifest.js:20–56` |
| 5 of 10 endings have cutscenes | `ls public/cutscenes/ending-*` |
| named locations with no room | `src/data/codex.js:LORE_METADATA`; `src/loreDrops.js:LORE_DROP_SITES` |
| 9 linchpins | `src/storyLinchpins.js:STORY_LINCHPINS` |
| 12 camp quests, 3 signature | `src/data/campQuests.js` |
| 8 hallway archetypes (prior art for catalog shape) | `src/data/hallwayBuilds.js` |
