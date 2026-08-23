# Complete Placeholder Asset & Generation Prompt Catalog

**Date:** 2026-08-21  
**Status:** Production audit and prompt manifest  
**Style anchor:** `public/title_key_art_v2.png`  
**Runtime:** 2D sprite fallback today; promote approved assets to `public/3d/runtime/new3ds/` when a GLB is specified.

This is the canonical list of reward cosmetics and gameplay objects that still need a bespoke 3D asset, or remain represented by a flat 2D sprite/PNG/SVG. It also contains production-ready prompts for generating replacement art. Existing GLBs are explicitly removed from the outstanding queue even when a legacy sprite is still retained as the gameplay-state owner.

## Audit correction: existing 3D coverage

The following assets were previously at risk of being listed twice, but already have a valid GLB and runtime route:

- `prop_bunker_supplies` and its `storage_locker` variant.
- `prop_cave_bones`.
- `prop_cave_queen_throne`.
- `prop_specimen_tank` and `prop_broken_specimen_tank`.
- `prop_surgical_cart`.
- `prop_medical_bed`.
- `prop_diagnostic_console`.
- `prop_security_barricade`.
- `prop_conduit_hub`.
- `prop_fabricator_workstation`.
- `prop_ammo_crate_stack`.
- The biomechanical facility props, O2 filter vat, Tesla coil node, vital monitor, laser trap emitter, and related 3D room-dressing props.

`prop_camp_sandbags` is also already remastered as a high-quality 2D asset. It is not a missing art asset for the current 2D presentation, but it has no bespoke 3D GLB yet and therefore remains in the optional 3D conversion queue.

## Global generation rules

Use these rules for every prompt below:

> Dark biomechanical sci-fi survival-horror, grounded industrial construction, Gigeresque organic engineering, worn charcoal and bone-metal materials, restrained cyan/amber/violet emissive accents, high-detail PBR surfaces, strong readable silhouette, isolated asset, no text, no logo, no watermark, no extra objects, transparent or neutral dark-grey background, studio three-quarter lighting, production game asset, clean edges.

For 2D inventory art: square 1:1 composition, centered object, transparent background, 1254x1254 master, readable at 128px.

For 3D props: isolated single object, orthographic three-quarter view, neutral dark-grey background, real-world scale reference, clean underside, no floating fragments, watertight geometry, PBR materials, GLB-ready.

For 3D characters: symmetrical T-pose, arms horizontal, feet shoulder-width apart, neutral A/T-pose rig, no weapon, no scenery, full-body silhouette, GLB-ready.

For 3D weapons: side profile, muzzle pointing left, grip and trigger clearly separated, charm mounting point, no character or background props, GLB-ready.

## A. Season reward assets missing 3D production files

### A1. Weapon skins

These are present in the catalog and have 2D economy art. Missing files fall back to the base weapon at runtime.

#### Itemdef 4104 — Rust & Bone Trench Carbine

- **Target GLB:** `public/3d/runtime/new3ds/skin_rust_bone_trench.glb`
- **Archetype:** Scout `talon_c`
- **Prompt:**

> Full side-profile 3D game weapon asset of a weathered subterranean trench carbine, muzzle pointing left. Pitted rusted cast-iron receiver, smooth carved ivory alien-bone stock and foregrip, subtle green bioluminescent fossil veins inside the bone, wrapped leather cord, worn iron sights with tiny green tritium dots, scratched top rail and a reinforced charm mounting ring. Heavy salvage construction, believable mechanical joints, no character, no ammunition, no text, isolated neutral background, high-detail PBR metal, bone and leather, GLB-ready.

#### Itemdef 4111 — Solar Flare Antimatter Rifle

- **Target GLB:** `public/3d/runtime/new3ds/skin_solar_flare_antimatter.glb`
- **Archetype:** Engineer `tesla_lock`
- **Prompt:**

> Full side-profile 3D game weapon asset of an experimental antimatter rifle, muzzle pointing left. Long precision barrel surrounded by concentric gold-brass containment rings, dark ceramic receiver, small contained orange-white solar plasma chamber, heat-scorched vents, cyan diagnostic conduits, insulated grips, and a reinforced charm mounting ring. Premium but field-worn engineering, emissive energy kept controlled and readable, no explosion, no character, no text, isolated neutral background, high-detail PBR, GLB-ready.

### A2. Chassis skins

#### Itemdef 4115 — Void Commando Recon

- **Target GLB:** `public/3d/runtime/new3ds/chassis_void_commando_recon.glb`
- **Class:** Scout
- **Prompt:**

> Full-body futuristic Scout exosuit operator in a perfect symmetrical T-pose. Matte pitch-black nano-carbon stealth fibers, slim faceted chest armor, ultraviolet visor slit, acoustic-dampening panels, compact hip stabilizers, narrow tactical backpack with dim purple power conduits, silent rubberized boots, restrained refractive edge shimmer. No weapon, no helmet floating separately, no scenery, no text, isolated neutral dark-grey background, PBR hard-surface and fabric materials, riggable GLB-ready character.

#### Itemdef 4116 — Bio-Synthesizer Harness

- **Target GLB:** `public/3d/runtime/new3ds/chassis_bio_synthesizer_medic.glb`
- **Class:** Universal chassis slot
- **Prompt:**

> Full-body biomechanical support exosuit in a symmetrical T-pose. Lean operator silhouette, dark medical harness, translucent amber fluid ampoules, flexible organic tubing integrated into rib and shoulder plates, surgical tool ports, small cyan vital monitors, worn bone-white polymer armor, subtle wet biological seams. Functional field medic design, no weapon, no blood, no scenery, no text, isolated neutral dark-grey background, PBR hard-surface, rubber, glass and organic materials, riggable GLB-ready character.

#### Itemdef 4117 — Dreadnought Exo-Juggernaut

- **Target GLB:** `public/3d/runtime/new3ds/chassis_dreadnought_exo_juggernaut.glb`
- **Class:** Tank
- **Prompt:**

> Full-body heavy Tank exosuit in a symmetrical T-pose. Broad armored shoulders, oversized chest reactor, layered tungsten plates, hydraulic forearms, reinforced knees, thick industrial boots, deep impact dents, muted orange thermal warning lights, cables protected inside ribbed conduits. Massive but believable proportions, no weapon, no scenery, no text, isolated neutral dark-grey background, PBR metal and rubber, riggable GLB-ready character.

#### Itemdef 4118 — Cyber-Spectre Infiltrator

- **Target GLB:** `public/3d/runtime/new3ds/chassis_cyber_spectre_infiltrator.glb`
- **Class:** Scout
- **Prompt:**

> Full-body cyber-infiltrator Scout chassis in a symmetrical T-pose. Sleek graphite armor, segmented flexible joints, translucent smoky visor, thin cyan circuit traces, compact sensor fins, asymmetrical but balanced stealth plating, low-glow violet signal nodes, worn edges and field repair marks. No weapon, no scenery, no text, isolated neutral dark-grey background, sharp readable silhouette, PBR GLB-ready character.

#### Itemdef 4119 — Hive-Lord Symbiote Exosuit

- **Target GLB:** `public/3d/runtime/new3ds/chassis_hive_lord_symbiote.glb`
- **Class:** Universal/heavy chassis slot
- **Prompt:**

> Full-body alien-human symbiotic heavy exosuit in a symmetrical T-pose. Segmented dark chitin fused with forged tungsten hydraulic framing, emerald bioluminescent vascular tubes along spine and limbs, horned helm with small multifaceted green eyes, biological sinew cables crossing mechanical joints, broad threatening silhouette, restrained organic gloss, no weapon, no scenery, no text, isolated neutral dark-grey background, PBR metal, chitin and subsurface organic materials, riggable GLB-ready character.

### A3. Rig overclock modules

#### Itemdef 4145 — Echo-Location Transceiver

- **Target GLB:** `public/3d/runtime/new3ds/mod_echo_location_transceiver.glb`
- **Prompt:**

> Small military avionics cartridge, approximately 60 by 40 by 8 millimeters. Brushed dark titanium casing, exposed concave acoustic sensor dish, miniature cyan sonar ring emitter, two gold-plated docking pins, recessed toggle switch, tiny scratched maintenance markings without readable text. Clean compact silhouette, no hand, no background props, isolated neutral dark-grey background, PBR GLB-ready prop.

#### Itemdef 4146 — Symbiotic Adrenaline Pump

- **Target GLB:** `public/3d/runtime/new3ds/mod_symbiotic_adrenaline_pump.glb`
- **Prompt:**

> Small biomechanical medical overdrive cartridge, approximately 60 by 40 by 8 millimeters. Reinforced dark housing, clear ampoule filled with crimson fluid, tiny piston pumps, synthetic alien muscle fibers wrapping the casing, gold-plated docking pins, subtle warning illumination, no readable text, isolated neutral dark-grey background, detailed PBR glass, metal and organic materials, GLB-ready prop.

## B. Achievement skins designed but not yet implemented

Itemdefs `5001–5012` are design-only. They need catalog entries, Steam schema entries, achievement-grant wiring, loadout compatibility, 2D icons, and 3D meshes.

| ID | Name | Type | Achievement | 3D target |
|---|---|---|---|---|
| 5001 | Ghost Runner | Scout chassis | `ghost` | `chassis_scout_ghost_runner.glb` |
| 5002 | Chrono-Drifter | Scout weapon | `quick_study` | `skin_scout_chrono_drifter.glb` |
| 5003 | Subterranean Cartographer | Scout chassis | `cartographer` | `chassis_scout_cartographer.glb` |
| 5004 | Pioneer Courier | Scout chassis | `reyes_courier` | `chassis_scout_pioneer_courier.glb` |
| 5005 | Old Iron | Tank chassis | `hardened` | `chassis_tank_old_iron.glb` |
| 5006 | Bunker Bastion | Tank weapon | `hunkered` | `skin_tank_bunker_bastion.glb` |
| 5007 | Colossus of the Hive | Tank chassis | `ending_full_brood` | `chassis_tank_colossus_hive.glb` |
| 5008 | Gentle Titan | Tank chassis | `gentle_drill` | `chassis_tank_gentle_titan.glb` |
| 5009 | Archival Constructor | Engineer weapon | `archivist` | `skin_engineer_archival_constructor.glb` |
| 5010 | Hive-Weaver | Engineer weapon | `kin` | `skin_engineer_hive_weaver.glb` |
| 5011 | Chen’s Undying | Engineer chassis | `chen_thirteenth` | `chassis_engineer_chen_undying.glb` |
| 5012 | Exodus Vanguard | Engineer chassis | `ending_alien_exodus` | `chassis_engineer_exodus_vanguard.glb` |

Use the existing achievement-skin prompts in [season-rewards-skins-and-achievement-unlocks.md](season-rewards-skins-and-achievement-unlocks.md), then create matching 1:1 icons using the global inventory-art rules above.

## C. World objects still using 2D sprites or flat images

These are gameplay objects, not reward catalog items. This section contains only objects that do not already have an exact active world-3D route. Legacy sprites may remain in the scene as the gameplay-state owner while a GLB replacement is displayed over them; that does not mean the object is still visually 2D.

### C1. Survivor camp

| Object | Current asset family | Suggested GLB |
|---|---|---|
| Camp cot | `prop_camp_cot.svg/png` | `prop_camp_cot.glb` |
| Supply crate | `prop_camp_crate.svg/png` | `prop_camp_crate.glb` |
| Lit cookfire | `prop_camp_cookfire_lit.png` | `prop_camp_cookfire_lit.glb` |
| Doused cookfire | `prop_camp_cookfire_doused.png` | `prop_camp_cookfire_doused.glb` |
| Bedrolls | `prop_camp_bedrolls.png` | `prop_camp_bedrolls.glb` |
| Crate stack | `prop_camp_crates.png` | `prop_camp_crates.glb` |
| Chained crate stack | `prop_camp_crates_chained.png` | `prop_camp_crates_chained.glb` |
| Sandbag barricade | `prop_camp_sandbags.png` | Optional `prop_camp_sandbags.glb`; current remastered 2D asset is accepted |
| Fresh grave | `prop_camp_grave_fresh.png` | `prop_camp_grave_fresh.glb` |
| Old grave | `prop_camp_grave_old.png` | `prop_camp_grave_old.glb` |
| Laundry line | `prop_camp_laundry.png` | `prop_camp_laundry.glb` |
| Lockdown shutter | `prop_camp_shutter_lockdown.png` | `prop_camp_shutter_lockdown.glb` |
| Warning placard | `prop_camp_warning_placard.png` | `prop_camp_warning_placard.glb` |

**Shared camp prompt for the genuinely unmodeled camp objects:**

> Isolated 3D biomechanical survivor-camp prop: [INSERT OBJECT]. Built from scavenged bunker steel, bone-white composite, worn canvas and dark rubber, with subtle cyan or amber utility lights, chipped paint, dust, field repairs and believable contact points. Dark subterranean refuge atmosphere, readable game silhouette, no people, no text, no extra objects, neutral dark-grey studio background, high-detail PBR, GLB-ready.

### C2. Cave and hive organisms

| Object | Current asset family | Suggested GLB |
|---|---|---|
| Cave lichen | `prop_cave_lichen.png` | `prop_cave_lichen.glb` |
| Intact egg cluster | `prop_cave_eggs_intact.png` | `prop_cave_eggs_intact.glb` |
| Hatched egg shells | `prop_cave_eggs_hatched.png` | `prop_cave_eggs_hatched.glb` |
| Spore pod emitter | `prop_cave_spores.png` | `prop_cave_spores.glb` |
| Organic web canopy | `prop_cave_webs.png` | `prop_cave_webs.glb` |
| Wounded hive wall | `prop_cave_hive_wounded.png` | `prop_cave_hive_wounded.glb` |
| Hive resin sac | `prop_hive_resin_sac.svg/png` | `prop_hive_resin_sac.glb` |

Already covered and removed from this queue: `prop_cave_bones` and `prop_cave_queen_throne`.

**Shared hive prompt:**

> Isolated 3D alien hive prop: [INSERT OBJECT]. Wet biomechanical organism fused with mineral cave growth, layered chitin, pale bone ridges, translucent membrane, restrained emerald bioluminescence, small organic imperfections, believable grounded contact area, dark Gigeresque survival-horror style. No characters, no gore splashes, no text, no extra objects, neutral dark-grey studio background, PBR organic materials, GLB-ready.

### C3. Floor scatter, debris and liquids

Still sprite/flat-decal based:

- Coolant puddle
- Gravel scatter
- Slime puddle
- Ice stalagmite
- Bio pod
- Cryo icicle
- Cryo shards
- Bio moss
- Cable coil
- Metal bolts
- Camp supplies
- Hive eggs
- Blood trail
- Broken drone
- Biomechanical debris
- Horizon black box
- Iron Guild dogtags

**Shared scatter prompt:**

> Isolated 3D ground scatter asset: [INSERT OBJECT]. Small scale, low center of gravity, believable contact shadow and underside, worn bunker or alien-hive materials, readable silhouette from a three-quarter top-down camera, restrained cyan/amber/green emissive detail where appropriate, no text, no extra objects, neutral dark-grey background, optimized PBR GLB-ready prop.

Liquids should be generated as shallow mesh decals with transparent edges and a baked contact shadow; do not generate floating blobs.

### C4. Utility and facility props without exact 3D counterparts

- Engineering bench (`prop_engineering_bench`); the related `prop_fabricator_workstation` is already 3D, but is not an exact replacement.
- Cryo sleep pod (`prop_cryo_sleep_pod`).
- Ruptured coolant pump (`prop_ruptured_coolant_pump`).
- Alien feeding basin (`prop_alien_feeding_basin`).
- Torn warning poster (`prop_torn_warning_poster`).

Already covered and removed from this queue: security locker via `storage_locker.glb`, alien respiratory equipment via `prop_biomech_respirator.glb`, diagnostic console via `prop_diagnostic_console.glb`, medical bed, surgical cart, security barricade, and all exact world-map biomechanical props.

## F. Complete GLB utilization audit

Audited recursively under `public/3d/**/*.glb` and compared against all source references and runtime catalogs.

- **122 GLB files present.**
- **121 are referenced by source or runtime catalogs.**
- **1 appears unused:** `public/3d/runtime/engineer-vanguard.glb`.
- **5 runtime references point to files that do not exist:**
  - `skin_rust_bone_trench.glb` — itemdef 4104.
  - `skin_solar_flare_antimatter.glb` — itemdef 4111.
  - `chassis_bio_synthesizer_medic.glb` — itemdef 4116.
  - `chassis_dreadnought_exo_juggernaut.glb` — itemdef 4117.
  - `chassis_cyber_spectre_infiltrator.glb` — itemdef 4118.

The missing 3D files for chassis 4115, chassis 4119, modules 4145/4146, and achievement skins 5001–5012 are not yet referenced by code, so they are design backlog rather than broken runtime routes.

`engineer-vanguard.glb` should either be assigned to a live engineer character route, documented as a deliberate legacy asset, or removed from the shipped asset set after confirming no external build pipeline consumes it.

**Shared facility prompt:**

> Isolated 3D subterranean facility prop: [INSERT OBJECT]. Heavy industrial construction with dark painted steel, exposed conduits, bone-like biomechanical growth at seams, small functional status lights, dust and maintenance wear, physically believable scale and floor contact, no characters, no readable text, neutral dark-grey studio background, high-detail PBR, GLB-ready.

## D. 2D effects that need particle or mesh replacements

### Steam puff

- Current: `fx_steam_puff.svg`
- Target: `fx_steam_puff.glb` or procedural billboard particle system
- Prompt:

> Stylized but physically grounded subterranean steam burst, layered translucent vapor volume with soft edge breakup, brief amber-lit particles, no smoke face, no text, isolated VFX reference on transparent background, suitable for a Three.js billboard or sprite-sheet animation.

### Spark burst

- Current: `fx_spark_burst.svg`
- Target: procedural GPU particle burst
- Prompt:

> Short industrial electrical arc burst from a damaged bunker conduit, bright white-blue core, cyan branching sparks, tiny hot orange fragments, asymmetric radial timing, transparent background, no text, suitable for a Three.js particle effect and sprite-sheet animation.

### Season FX items

- Itemdef 4152: Emerald Void Tracer Rounds — shader/tracer ribbon still not wired.
- Itemdef 4153: Cryo Shockwave Muzzle Flare — muzzle particle/shockwave system still not wired.

These need effect implementation rather than static 3D meshes. Preserve the existing design specs in [season-rewards-skins-and-achievement-unlocks.md](season-rewards-skins-and-achievement-unlocks.md).

## E. 2D-only assets that are acceptable by design

These are not missing 3D work unless the product direction changes:

- Decals and emblems `2000–2004`, `2100`, `4120–4129`.
- Inventory icons for reagents, cache keys, cache containers and economy tokens.
- HUD themes `4150–4151`.
- Voice-pack icons `4148–4149`; the missing work is audio banks and trigger hooks.
- Charmed item inventory icons; their actual in-world charm meshes are already complete.

## Production acceptance checklist

For each generated asset:

1. Confirm the exact filename and item/object ID.
2. Check silhouette at native gameplay scale.
3. Check floor, hand, weapon or chassis alignment as applicable.
4. Verify transparent materials, emissive values and shadow behavior.
5. Optimize to the project’s GLB budget and run the media audit.
6. Add the path to the runtime map before calling the asset complete.
7. Keep the 2D icon and 3D model visually consistent with the same material language.

The source-of-truth runtime maps are [player3dOverlay.js](../src/player3dOverlay.js), [armoryScene.js](../src/armoryScene.js), and [world3dOverlay.js](../src/world3dOverlay.js).
