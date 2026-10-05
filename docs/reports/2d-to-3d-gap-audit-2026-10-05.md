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

## Still 2D: no 3D model exists (art requests)

Ranked by how many were visible across the six sampled areas. These are the
remaining 2D props players see:

| Type | Visible in audit |
|---|---|
| prop_cave_eggs_hatched | 45 |
| prop_cave_spores | 39 |
| prop_cave_webs | 38 |
| prop_cave_eggs_intact | 38 |
| prop_cave_hive_wounded | 37 |
| prop_spore_colony | 32 |
| prop_cyber_junction | 31 |
| prop_biomech_pillar_left / _right | 25 / 25 |
| scatter_bio_pod | 20 |
| prop_cave_lichen | 19 |
| hive-signature-prop | 6 |
| scatter_cryo_icicle, scatter_ice_stalagmite | 5, 5 |
| prop_cryo_sleep_pod, prop_alien_respiratory_vent | 2, 2 |
| prop_camp_meridian_radio | 2 |
| prop_fusion_generator, prop_camp_meridian_repair_rig, prop_camp_warning_placard, prop_camp_shutter_lockdown, prop_camp_cookfire_lit, prop_camp_laundry | 1 each |

Other 2D-only types in the sprite registry that did not appear in this sample but
can spawn:

- **Camp:** `prop_camp_cookfire_doused`, `_grave_fresh`, `_grave_old`,
  `_meridian_battery_bank`, `_tallow_resin_urn`, `_tallow_spore_trays`,
  `_tallow_still`, `_vesper_ammo_press`, `_vesper_shield_rack`, `_vesper_turret`.
- **Hive:** `prop_hive_carapace_molt`, `_chitin_hatchery`, `_relay_antenna`,
  `_suture_organ`, `_synaptic_web`, `_wound_cauterizer`.
- **Scatter:** `scatter_biomech_debris`, `scatter_broken_drone`, `scatter_camp_supplies`,
  `scatter_cryo_shards`, `scatter_hive_eggs`.
- **Other:** `door_biomechanical`, `lore_terminal` (sprite plus light), and the
  enemy corpses `cybersnail_dead`, `cryosnail_dead`, `boss_*_dead`, which are
  billboards even though the living enemies are 3D.

Enemies, bosses and NPCs are covered by `ENEMY_3D_MODELS` and the NPC GLBs; their
sprites are hidden gameplay owners.

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
