# 2D → 3D gap audit (2026-10-05)

Status: current | Branch: `dev/sprint-49`

The game is 3D. This audit measured what still renders or loads as 2D, removed
the 2D stand-ins that already have 3D models, and lists what has none.

## Method

A runtime probe booted the game, started a run, streamed six areas, and recorded:

- every image requested at boot and during the run;
- every *visible* sprite or billboard in the scene, by type.

Decals (floor and wall), particles (steam, spores), terrain textures, sky layers
and UI art are 2D by nature and are not gaps.

## Fixed in this change

- **Props with a 3D model never draw their 2D sprite.** Before, a prop showed its
  billboard until a 28-unit, three-at-a-time swap queue reached it, so streamed-in
  areas were full of flat props (up to 73 supply-crate billboards at once). Now the
  sprite's own material is hidden from the start. The sprite still owns gameplay
  (collision, HP, co-op state) and reappears only if its model fails to load. After
  the change, visible billboards of GLB-backed types dropped to **1**
  (`prop_camp_crates_chained`, created by the camp path).
- **Aliases** for 2D types whose subject ships as a GLB under another name:
  `body_human_frozen_suit`, `prop_camp_crates_chained` and `bunker_junk_legendary`
  (`WORLD_3D_MODEL_ALIASES` in `src/world3dOverlay.js`). The lit cookfire is
  deliberately not aliased, because the GLB has no flames.

## Still drawn 2D: mostly a wiring gap, not an art gap

**Correction (re-checked the same day).** The first version of this section said
these types had "no 3D model". That came from matching type names, not art. The
game ships 128 non-kit world GLBs, every one referenced in code, including **26
hive/biomech/fungal props, 21 camp/survival props and 6 cryo props**. Hive sites
and camp centres also build their core pieces from code primitives
(`src/hiveSite.js`, `src/camp.js`). What is missing is the link: the 2D prop
types below spawn under names the GLB registry does not know, so they keep their
billboard. Fixing most of them is one `WORLD_3D_MODEL_ALIASES` entry each, after a
side-by-side look confirms the model reads as the same object.

Visible counts are from the six sampled areas.

| 2D type (visible) | Existing GLB candidate | Fit |
|---|---|---|
| prop_cyber_junction (31) | prop_conduit_junction_box, prop_conduit_hub | direct |
| prop_alien_respiratory_vent (2) | prop_biomech_respirator, prop_biomech_sphincter_hatch_vent | direct |
| prop_fusion_generator (1) | fusion_generator (registered under the short key) | direct |
| prop_camp_cookfire_doused | prop_camp_cookfire (the GLB has no flames) | direct |
| prop_camp_vesper_turret | prop_base_defense_turret | direct |
| scatter_camp_supplies | prop_camp_crate, prop_bunker_supplies | direct |
| prop_cave_spores (39), prop_spore_colony (32) | prop_fungal_spore_dispenser | check look |
| prop_cave_lichen (19) | state_growth_overrun_1/2 | check look |
| prop_biomech_pillar_left / _right (25/25) | arch_pillar_buttress_01–04, prop_biomech_arch | check look |
| scatter_bio_pod (20), prop_hive_chitin_hatchery | prop_biomech_incubator | check look |
| prop_cryo_sleep_pod (2) | prop_icey_thermal_pod, prop_flesh_steel_coffin | check look |
| prop_cave_hive_wounded (37) | prop_hive_resin_sac | check look |
| prop_hive_synaptic_web | prop_biomech_neural_synapse | check look |
| prop_hive_suture_organ | prop_flesh_steel_inhaler | check look |
| prop_hive_wound_cauterizer | prop_biomech_triage_cradle | check look |
| prop_hive_relay_antenna | prop_vertebral_cable_riser | check look |
| prop_camp_tallow_resin_urn | prop_fungal_resin_basin | check look |
| prop_camp_tallow_spore_trays | prop_fungal_mycelium_loom | check look |
| prop_camp_tallow_still | prop_pipe_organ_heat_exchanger | check look |
| prop_camp_vesper_ammo_press | prop_fabricator_workstation | check look |
| prop_camp_vesper_shield_rack | prop_security_barricade | check look |
| prop_camp_meridian_repair_rig (1) | prop_maintenance_tool_cart | check look |
| prop_camp_meridian_battery_bank | prop_oxygen_bottle_cascade_rack | check look |
| lore_terminal | prop_terminal_ruptured, prop_liturgical_terminal_lectern | check look |
| cybersnail_dead | cybersnail_dead.glb is registered, but the corpse path still draws the sprite | wiring |

**Genuinely no model yet** (art requests): cave eggs intact/hatched (45+38
visible) and scatter_hive_eggs, cave webs (38), hive carapace molt, hive-signature
prop, camp graves (fresh/old), laundry, warning placard, lockdown shutter,
meridian radio, cryo icicle/stalagmite/shards, broken drone, biomech debris,
`door_biomechanical`, and the boss/cryosnail corpses.

The lit cookfire stays 2D until the GLB gets flames (or particles are added on top).

## Loaded but not drawn in 3D play

Boot requests 319 images. Of these, 43 are the legacy 2D character sheets, which
3D play keeps only as hidden gameplay owners:

- player class walk/full sheets (`Tank.walk_v4`, `Tank.full_v2`, `Scout.full_v2`, `Eng.walk_v4`);
- snail and boss walk cycles and corpses (`*-walk-v5`, `boss_*`, `*_dead`);
- alien and NPC walk sheets (`alien_*_walk`, `civilian_*_walk`, `kaelen`/`martha_camp_walk_v2`).

Plan: give the sprite system a 1×1 placeholder texture for owners that will be
replaced by 3D, and fetch a sheet only if its 3D model fails (or for the corpse
types above until they get models). This needs a pass over `playerSpriteLayouts.js`,
`enemySpriteLayouts.js` and the atlas repacker. Another agent is converting these
sheets to WebP in parallel; if they stop loading, that conversion is moot, so
coordinate first.

## Lighthouse plan (remaining)

| Item | Plan | Owner and status |
|---|---|---|
| Next-gen images | WebP for title and door key art (UI, legitimately 2D) at visually lossless quality. Character sheets should stop loading (above) rather than be re-encoded. | Another agent's in-progress WebP pass covers part of this |
| Deferred 3D and cutscenes | **Done (`1755f90e`):** `Scout.game.glb` (7.7 MB) was fetched and parsed twice at boot, now once through `gltfTemplateCache.js`. **Done:** boot no longer warms the class intro WebMs; a boot probe now records only `DoorIntro.webm`, the boot cinematic itself, which must stay preloaded. `tank-class-intro` and `tank-intro` start loading on title → menu entry (and on class pick), well before New Run plays them. **Open:** create the player 3D overlay (`tank-rigged.glb`, `Scout.game.glb`) on Armory entry instead of in the `ThreeGame` constructor. | Overlay part open |
| Mobile fonts and tap targets | **Done (splash).** On a 360px Moto G4 the 16:10 stage is 225px tall, so NEW RUN and MULTIPLAYER were clipped off the top and the Steam badge covered ACHIEVEMENTS (9px status text). A `max-width: 768px` rule (never matches the 1280-wide Deck) scrolls the title column inside the stage and shrinks the badge to a 44px icon. Probe result: no visible text under 12px, every button 44px high with 8px gaps and hit-testable, no horizontal scroll. Other screens still assume 16:10 and touch input was removed 2026-07-24, so the game itself is not phone-playable. | Splash done; rest needs a mobile-web decision |
| Non-composited title animations | Move `.title-menu-btn` hover colour and glow, and the `.splash-title` text-shadow pulse, onto opacity and transform of pseudo-elements, keeping the same look. | After the other agent's `style.css` edits land |

Re-run: `HB_PROBES=1` with the audit recipe in this report (boot, start run,
teleport six times, traverse visible sprites).
