# World completion: 40 new 3D assets and 20 path layers — 2026-10-11

**Owner, 2026-10-11:** "what can we do to improve the world? I'd like another list of 40 3D assets to
be made via 2D stylized visual in-world prompts, of items we don't have, that will make it more
complete and actualized, and 20 textures that we layer over textures so it's not just one repeating
floor, but paths and more. Let's plan it all in a document."

**Status:** plan. Nothing in this document is generated or implemented yet.

**Related documents:**
- [N64 world design](n64-architectural-level-design-overhaul-2026-10-10.md) (lanes;
  floor surfaces are lane H);
- [Floor, decal and layout expansion](world-floor-decals-layout-expansion-2026-10-10.md) (intake and
  keying rules, which this document follows);
- the [lived-in prompts](cutscene-and-lived-in-asset-prompts-2026-10-08.md) and
  [3D gap prompts](3d-gap-generation-prompts-2026-10-05.md) (house style, earlier lists).

## What the world is missing

There are 305 shipped models, of which 80 are lived-in props. They cover:
- rooms that do one thing each: medical, armory, chapel, reactor;
- personal life: bunks, mess, latrine, laundry line, memorial;
- the hive's organs.

Walking a run shows three gaps.

1. **The bunker does not look like a place that ever worked.** Nothing explains how things moved
   or were stored. There is no warehouse racking, forklift, conveyor or cistern; no server room or
   transformer; no fire station; no scaffold where someone was fixing something.
2. **Daily life stops at sleep and food.** Nobody washed at a sink, did laundry in a machine, lifted
   weights, played a game, filed a report or planned on a whiteboard.
3. **The places between rooms say nothing:**
   - *the chasm:* about 40% of a maze chunk is void, and the new landmarks are its only content;
   - *the crash site:* one wreck and a seat row;
   - *camps:* bedrolls and fire, but no tent;
   - *bio:* only scattered hive organs, nothing that grows *through* the architecture.

On the floor, every surface is one tiled material per room or district. The splat floor blends
families at their borders, and stickers scatter marks, but **nothing records where people
actually walk**. N64 levels read their paths at a glance: OoT's dirt roads across Hyrule Field,
the worn stone of the Temple of Time. Our floors don't.

Still outstanding from earlier lists, not repeated here:
- `door_biomechanical`;
- `prop_camp_grave_fresh` and `prop_camp_grave_old`;
- `scatter_biomech_debris` and `scatter_broken_drone`;
- `scatter_cryo_icicle`, `scatter_cryo_shards` and `scatter_ice_stalagmite`.

---

## Part 1 — Forty 3D assets

### Pipeline (unchanged)

1. **Generate the still.** Paste the asset's block below as-is. Each block is complete: subject,
   story, accent light, style, render, chroma background and exclusions. Nothing goes in a separate
   negative field (if your tool has one, the block's "Exclude" list can be copied there too).
2. **Key it.** Remove the chroma background (see "Processing the renders" below) to get an RGBA PNG
   with a clean edge. Keep the raw and the keyed image.
3. **Image-to-3D** from the keyed image.
4. **Put the GLB in `art/raw/`.** It is optimised into `public/3d/runtime/new3ds/` (KTX2
   textures, `scripts/art/convert_glb_textures_ktx2.py`).
5. **Register it** in `WORLD_3D_MODELS` (`src/world3dOverlay.js`) with `height`, `yaw` and
   `maxSpan`, plus any `propBehavior`.
6. **Check the scale** on the museum walk (`tests/e2e/probes/museum-walk.spec.js`).
7. **Add it to its placement source** (column **Placed by** in the table below).
8. **Run `tests/e2e/probes/runtime-errors.spec.js`** after integration: a new model must not fail
   to upload or link.

**Style.** The prompts use the game's established style, the one every shipped model was made
from: H.R. Giger biomechanical sensuality fused with corporate industrial horror. That means
sinuous, ribbed, organic forms grown into cold machinery. It stays non-explicit.
- *Accent colours:* exactly one light per piece. Amber for human machinery, cyan for cryo, green
  for bio and the hive, red for warning; violet stays reserved for the Queen.
- *Triangle budgets:* small props 3–7k, large pieces 8–15k. Everything stays well under the 25k
  hero-prop ceiling.

**Batch file.** Every prompt in this document (40 assets, then 20 floor layers) is also in
[`world-completion-prompts-2026-10-11.tsv`](world-completion-prompts-2026-10-11.tsv) (next to this document), one row each:
`n, id, kind, key, size, prompt`. The `key` column tells the keyer which screen to remove:
`green`, `magenta`, or `none` for the opaque floor surfaces.

### Processing the renders (chroma)

Every asset is rendered on a flat chroma screen so it can be keyed automatically. Which screen it
gets follows the intake rule in the floor/decal doc:

| Screen | Assets | Why |
|---|---|---|
| Green `#00FF00` | 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 15, 16, 18, 22, 30, 31, 32, 33, 34, 35, 36, 37, 39 | No green or cyan in the object. |
| Magenta `#FF00FF` | 6, 14, 17, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 38, 40 | The object has cyan, green, hive tissue or olive tones; a green key would eat them. |

Rules the blocks already enforce, and that the keyer relies on:
- **The background:** uniform, edge to edge, with no floor, horizon, gradient or shadow on it.
- **No spill:** no screen colour in or on the object (no reflections, rim light or tinted edges).
  Glossy metal is the usual offender; if a render shows spill, regenerate rather than despill
  heavily.
- **Connected and framed:** every part is connected to the main body, the whole object is in
  frame, and there's a 10% margin. Image-to-3D handles floating parts and cropped objects badly.
- **Thin parts stay solid.** Ropes, cables and grating are kept thick and solid in the prompt,
  because keying eats hairline detail.

**Keying:**
1. Flood-key from the image edges.
2. Despill the edge pixels toward the object's own colour.
3. Bleed opaque colour into transparent texels (the same steps as
   `scripts/art/build_keyed_sprite_ktx2.py`).
4. Reject the render if key colour still shows on any visible edge.
5. Record the key colour in the asset's manifest entry (`keyMode: green` or `magenta`).

### The list

| # | Asset | File | District / room | Size | Tris | Accent | Behaviour | Placed by |
|---|---|---|---|---|---|---|---|---|
| **A. A bunker that worked** |||||||||
| 1 | Pallet racking bay | `life_pallet_racking.glb` | storage, cargo halls | 2.6 m tall, 2.8 m long | 9k | amber | solid | storage room kit |
| 2 | Server cabinet pair | `life_server_racks.glb` | ops, astrogation, security | 2.1 m | 7k | amber | solid, glow | room kit |
| 3 | Transformer bank | `life_transformer_bank.glb` | power, reactor | 2.2 m | 8k | amber | solid | room kit |
| 4 | Fire suppression station | `life_fire_station.glb` | corridors, every room's wall | 1.8 m, wall-mounted | 5k | red | solid, E: break glass | hallway dressing |
| 5 | Conveyor section | `life_conveyor_section.glb` | fabrication, process lines | 0.9 m tall, 3.0 m long | 8k | amber | solid; rollers turn (HB_ rig) | room kit |
| 6 | Riveted water cistern | `life_cistern_tank.glb` | utility, camp | 2.8 m | 8k | cyan | solid, landmark-scale | room kit, camp |
| 7 | Repair scaffold tower | `life_scaffold_tower.glb` | anywhere damaged | 2.7 m | 8k | amber | solid | chunk dressing near damaged walls |
| 8 | Abandoned forklift | `life_forklift.glb` | storage, cargo, cryo | 2.2 m, 2.6 m long | 10k | amber | solid; forks lift (HB_ rig) | room kit |
| **B. Daily life** |||||||||
| 9 | Washroom sink row | `life_sink_row.glb` | quarters, decon | 1.1 m, 2.4 m long | 6k | none | solid, thin | room kit (quarters) |
| 10 | Communal shower stall | `life_shower_stall.glb` | quarters, decon | 2.2 m | 6k | none | solid | room kit |
| 11 | Laundry machine pair | `life_laundry_machines.glb` | quarters, camp | 1.2 m | 6k | amber | solid; drum spins (HB_ rig) | room kit, camp |
| 12 | Weight bench and rack | `life_weight_bench.glb` | quarters, rec | 1.4 m | 6k | none | solid | room kit |
| 13 | Battered arcade cabinet | `life_arcade_cabinet.glb` | rec, mess | 1.8 m | 6k | amber | solid, glow; E: power on | room kit |
| 14 | Filing cabinet bank | `life_filing_cabinets.glb` | ops, admin, crypt | 1.4 m, 1.8 m long | 5k | none | solid; drawers open (HB_ rig) | room kit |
| 15 | Overseer's desk | `life_overseer_desk.glb` | ops, executive crypt | 1.2 m, 2.0 m wide | 7k | amber | solid | room kit |
| 16 | Planning whiteboard | `life_planning_board.glb` | ops, engineering | 1.9 m | 4k | none | solid, thin | room kit |
| 17 | Algae culture tank | `life_algae_tank.glb` | hydro, medical, camp | 1.6 m | 6k | green | solid, glow, water shader | room kit |
| 18 | Surgical lamp arm | `life_surgical_lamp.glb` | medical, surgical ward | 2.3 m | 5k | amber | solid; arm swings (HB_ rig) | medical kit |
| **C. Cryo district** |||||||||
| 19 | Ice-locked tracked crawler | `cryo_ice_crawler.glb` | cryo halls, ledges | 2.0 m, 3.2 m long | 12k | cyan | solid | chunk dressing (cryo) |
| 20 | Frozen pipe cascade | `cryo_frozen_cascade.glb` | cryo walls | 2.8 m tall | 7k | cyan | solid, wall-hugging | wall dressing (cryo) |
| 21 | Snowbound crate stack | `cryo_snowbound_crates.glb` | cryo storage | 1.6 m | 6k | cyan | solid | room kit (cryo) |
| 22 | Radiant heater station | `cryo_heater_station.glb` | cryo camps, airlocks | 1.7 m | 5k | amber | solid, light (pooled) | camp, airlock |
| 23 | Cut ice-block stack with saw | `cryo_ice_blocks.glb` | cryo water harvesting | 1.2 m | 6k | cyan | solid | room kit (cryo) |
| **D. Bio and hive** |||||||||
| 24 | Resin load pillar | `hive_resin_pillar.glb` | hive, bio rooms | 2.8 m (floor to wall top) | 7k | green | solid | wall dressing (bio) |
| 25 | Cocooned crew member | `hive_cocooned_crew.glb` | hive walls | 2.0 m | 7k | green | solid, wall-hugging | hive site, story pocket |
| 26 | Brood chamber dome | `hive_brood_dome.glb` | hive nests | 1.8 m, 2.6 m wide | 9k | green | solid; membrane breathes | hive site |
| 27 | Hive pheromone node | `hive_pheromone_node.glb` | hive trails | 1.3 m | 5k | green | solid, glow | hive trail (route strips, §2) |
| 28 | Tendril doorway arch | `hive_tendril_arch.glb` | bio doorways | 3.2 m wide, 3.0 m tall | 10k | green | non-blocking frame around a door | door frames (bio) |
| 29 | Assimilated generator | `hive_assimilated_generator.glb` | bio engineering | 1.9 m | 9k | green | solid, glow | room kit (bio) |
| **E. Crash site and salvage** |||||||||
| 30 | Torn engine nacelle | `crash_engine_nacelle.glb` | crash site | 2.0 m, 4.0 m long | 12k | amber | solid | crash-site slots |
| 31 | Hull panel debris cluster | `crash_hull_panels.glb` | crash site, impact trails | 1.0 m, 3.0 m spread | 7k | none | solid, low | crash-site slots, scatter |
| 32 | Tangled drag chute | `crash_drag_chute.glb` | crash site | 0.6 m, 4.0 m spread | 6k | red | walkable, low | crash-site slots |
| 33 | Tagged salvage heap | `salvage_tagged_heap.glb` | crash site, camps, base | 1.4 m | 8k | amber | solid | base, camp |
| **F. The chasm, seen from the ledges** |||||||||
| 34 | Stranded cable-car gondola | `chasm_gondola.glb` | in the void | 3.0 m car, cable spans the gap | 10k | amber | void only (chasm sites) | `src/chasmLandmarks.js` sites |
| 35 | Collapsed catwalk | `chasm_broken_catwalk.glb` | ledge edge, drooping into void | 5.0 m long | 8k | amber | void only; base at the ledge | chasm sites facing a ledge |
| 36 | Rappel anchor and ropes | `chasm_rappel_anchor.glb` | ledges | 1.2 m, ropes 6 m down | 5k | red | solid on the ledge cell | ledge dressing |
| 37 | Edge warning beacon post | `chasm_beacon_post.glb` | ledges near void | 1.8 m | 4k | red | solid, rotating light (emissive) | ledge dressing |
| **G. Camps** |||||||||
| 38 | Survivor canvas tent | `camp_canvas_tent.glb` | camps | 2.0 m, 3.0 m long | 8k | amber | solid; flaps flutter (`clothFlutter.js`) | camp courts |
| 39 | Portable diesel generator | `camp_generator.glb` | camps, field work | 1.0 m | 6k | amber | solid; idles (vibration) | camp courts |
| 40 | Water barrel and wash basin | `camp_water_barrel.glb` | camps | 1.2 m | 5k | cyan | solid | camp courts |

**Why these forty:**
- **A** makes the bunker an *operation*: storage, data, power, process, maintenance.
- **B** makes it a *home*: hygiene, laundry, exercise, play, paperwork, planning.
- **C** and **D** give the two districts objects only they have: frozen *machines* and an
  architecture that grows *through* things.
- **E** turns the crash site into an event with debris, not a single object.
- **F** fills the void with stories you see from the ledges. They reuse the landmark site picker,
  so they cost no navigation.
- **G** gives camps the one thing a camp must have: shelter.

Ten of them carry a cut-out rig or a shader motion. Articulation follows the existing
`scripts/blender/articulation_recipes.py` (HB_ nodes) and `flutter_recipes.py`.

### Prompts

One block per asset. Copy the whole block. The background colour is already set in it.

**1. Pallet racking bay** — `life_pallet_racking.glb` — green screen
```text
Pallet racking bay: one single isolated 3D game prop for image-to-3D reconstruction, about 2.6 m tall and 2.8 m long, taller than a person. Subject: one bay of heavy warehouse pallet racking: two tall bolted steel uprights punched with slots, three orange-yellow load beams, three shelves stacked with shrink-wrapped supply pallets, dented ration crates and a coiled rubber hose, an empty wooden pallet leaning against one upright, a clipboard on a hook, forklift scrape marks and chipped paint at the base. Story it tells: a warehouse that was stocked carefully and then looted in a hurry. Exactly one accent light: amber work light clipped to the top beam (#f59e0b); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**2. Server cabinet pair** — `life_server_racks.glb` — green screen
```text
Server cabinet pair: one single isolated 3D game prop for image-to-3D reconstruction, about 2.1 m tall, two cabinets side by side. Subject: a pair of tall black server cabinets bolted together: the left door hanging open on bent hinges to show stacked blade units with rows of tiny status lights, a waterfall of grey ribbon cables spilling from the roof, the right door of cracked smoked glass, a blank taped label strip, thick dust on the intake vents. Story it tells: the colony's memory, still humming faintly. Exactly one accent light: amber status lights (#f59e0b); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**3. Transformer bank** — `life_transformer_bank.glb` — green screen
```text
Transformer bank: one single isolated 3D game prop for image-to-3D reconstruction, about 2.2 m tall, a heavy box with three tall insulators on top. Subject: a high-voltage transformer bank: a heavy finned steel cabinet with three tall ribbed ivory ceramic insulator stacks on top, thick braided bus cables arching between them, a hinged inspection hatch with a scorched lightning-bolt pictogram plate, oil weeping from one seam, soot caked in the cooling fins. Story it tells: the power room's heart, scorched by an old fault. Exactly one accent light: red fault lamp (#ef4444); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**4. Fire suppression station** — `life_fire_station.glb` — green screen
```text
Fire suppression station: one single isolated 3D game prop for image-to-3D reconstruction, about 1.8 m tall, flat back made to sit against a wall. Subject: a wall-mounted fire suppression station: a red steel cabinet with a cracked glass front, a fat extinguisher on a bracket inside, a flat-coiled canvas hose on a swing-out reel beside it, a fire axe clipped below, a pull lever under a hinged guard, blistered paint and scorch marks around the frame. Story it tells: the last line against a fire nobody fought. Exactly one accent light: red cabinet glow (#ef4444); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**5. Conveyor section** — `life_conveyor_section.glb` — green screen
```text
Conveyor section: one single isolated 3D game prop for image-to-3D reconstruction, about 0.9 m tall and 3 m long, waist height. Subject: a straight industrial conveyor section on four braced legs: a cracked black rubber belt over exposed steel rollers, a drive motor housing with a belt guard at one end, two dented supply crates stalled on the belt, a pull-cord emergency stop line along the side ending in a stop button, grease dripping under the rollers. Story it tells: a production line that stopped mid-shift. Exactly one accent light: amber stop button (#f59e0b); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**6. Riveted water cistern** — `life_cistern_tank.glb` — magenta screen
```text
Riveted water cistern: one single isolated 3D game prop for image-to-3D reconstruction, about 2.8 m tall, a big upright cylinder. Subject: a tall riveted cylindrical water cistern on a squat steel stand: banded plates, a vertical sight-glass tube showing water at half level, a pressure gauge and a valve wheel near the base, a rusted ladder up one side to a hatch on top, mineral crust and condensation streaks running down from the seams, one leak patched with rubber and wire. Story it tells: the colony's water, rationed and guarded. Exactly one accent light: pale cyan water in the sight glass (#22d3ee); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma magenta (#FF00FF) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no magenta or pink reflections, no magenta rim light and no magenta colour spill anywhere on the object, and no magenta or pink anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**7. Repair scaffold tower** — `life_scaffold_tower.glb` — green screen
```text
Repair scaffold tower: one single isolated 3D game prop for image-to-3D reconstruction, about 2.7 m tall, two decks on casters. Subject: a two-level repair scaffold tower of clamped steel tubes on locking casters: worn plank decks, a grey tarp tied across one side, a tool bucket and a coil of cable on the upper deck, a hanging safety harness, a half-welded patch panel leaning against the frame. Story it tells: someone stopped work mid-job and never came back. Exactly one accent light: amber work light clamped to the top rail (#f59e0b); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**8. Abandoned forklift** — `life_forklift.glb` — green screen
```text
Abandoned forklift: one single isolated 3D game prop for image-to-3D reconstruction, about 2.2 m tall and 2.6 m long. Subject: a compact industrial forklift abandoned with its forks raised halfway and a crushed pallet still on them: an open roll cage over a torn seat, one flat tire, hydraulic hoses sagging from the mast, chipped yellow paint, dried fluid stains under the engine. Story it tells: dropped where the alarm caught its driver. Exactly one accent light: amber beacon on the cage roof, cracked (#f59e0b); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**9. Washroom sink row** — `life_sink_row.glb` — green screen
```text
Washroom sink row: one single isolated 3D game prop for image-to-3D reconstruction, about 1.1 m tall and 2.4 m long, flat back made to sit against a wall. Subject: a row of three stainless steel wash basins on a shared wall bracket: push taps, one basin cracked and stained, a cracked steel mirror strip above them fogged at the edges, a bar of grey soap, a toothbrush in a tin cup, a towel hung over a pipe, exposed drain pipes joining into one trunk beneath. Story it tells: where the crew washed off another shift. No glowing parts at all. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**10. Communal shower stall** — `life_shower_stall.glb` — green screen
```text
Communal shower stall: one single isolated 3D game prop for image-to-3D reconstruction, about 2.2 m tall. Subject: an open communal shower stall: two cracked ivory tile half-walls on a raised drain tray, an overhead pipe with two shower heads, one dripping, a stained translucent curtain on a bent rail, a valve cluster on the back wall, a pair of rubber sandals, mould and mineral streaks in the grout. Story it tells: a scrap of privacy in a steel world. No glowing parts at all. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**11. Laundry machine pair** — `life_laundry_machines.glb` — green screen
```text
Laundry machine pair: one single isolated 3D game prop for image-to-3D reconstruction, about 1.2 m tall, two machines side by side. Subject: a pair of heavy front-loading industrial laundry machines on a steel plinth: one round porthole door open with grey jumpsuits spilling out, the other closed with a cracked porthole, chunky dials, a basket of folded towels on top, a flexible drain hose snaking off the back. Story it tells: the most ordinary chore, kept going to the end. Exactly one accent light: amber running lamp (#f59e0b); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**12. Weight bench and rack** — `life_weight_bench.glb` — green screen
```text
Weight bench and rack: one single isolated 3D game prop for image-to-3D reconstruction, about 1.4 m tall. Subject: an improvised weight bench and squat rack welded from pipe and armour plate: a padded bench patched with tape, a barbell made from a pipe with mismatched valve-wheel weights, two dumbbells made from concrete-filled cans, a sweat-dark towel over the rack. Story it tells: keeping strong when everything else fell apart. No glowing parts at all. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**13. Battered arcade cabinet** — `life_arcade_cabinet.glb` — green screen
```text
Battered arcade cabinet: one single isolated 3D game prop for image-to-3D reconstruction, about 1.8 m tall. Subject: a battered upright arcade cabinet: a glowing screen showing an abstract geometric pattern, a joystick and two worn buttons, scratched side art of abstract shapes, a crate dragged in front as a seat, score tallies scratched into the side as marks only, a power cable taped into a wall socket. Story it tells: comfort in the dark. Exactly one accent light: amber screen glow (#f59e0b); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**14. Filing cabinet bank** — `life_filing_cabinets.glb` — magenta screen
```text
Filing cabinet bank: one single isolated 3D game prop for image-to-3D reconstruction, about 1.4 m tall and 1.8 m long. Subject: a bank of three tall steel filing cabinets side by side: two drawers pulled open and overflowing with crumpled folders and loose blank sheets, one cabinet dented as if kicked, a padlock bar hanging open, a desk fan and a stack of binders on top, battleship-grey enamel worn to bare metal. Story it tells: records someone tried to destroy. No glowing parts at all. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma magenta (#FF00FF) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no magenta or pink reflections, no magenta rim light and no magenta colour spill anywhere on the object, and no magenta or pink anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**15. Overseer's desk** — `life_overseer_desk.glb` — green screen
```text
Overseer's desk: one single isolated 3D game prop for image-to-3D reconstruction, about 1.2 m tall and 2 m wide. Subject: a heavy overseer's desk of riveted steel with a black glass top: a hooded terminal, a high-backed cracked leather chair pushed back, a cold mug and an overflowing ashtray, a framed photo lying face down, a blank corporate desk plaque, one drawer forced open. Story it tells: authority, abandoned. Exactly one accent light: amber terminal screen (#f59e0b); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**16. Planning whiteboard** — `life_planning_board.glb` — green screen
```text
Planning whiteboard: one single isolated 3D game prop for image-to-3D reconstruction, about 1.9 m tall, on casters. Subject: a rolling double-sided whiteboard on a steel frame with locking casters: smudged diagrams of tunnels, arrows and circled zones drawn as abstract shapes with no writing, photographs and torn maps pinned along the top with magnets, pins linked by red string, a tray of dried-out markers. Story it tells: the last plan to get everyone out. Exactly one accent light: red string between the pins (#ef4444); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**17. Algae culture tank** — `life_algae_tank.glb` — magenta screen
```text
Algae culture tank: one single isolated 3D game prop for image-to-3D reconstruction, about 1.6 m tall. Subject: an upright glass algae culture tank in a steel frame: glowing water with drifting strands of algae, bubbles rising from an air stone, a grow-lamp hood on top, feed tubes and a hand pump on the side, a clipboard of readings on a hook, condensation running down the glass. Story it tells: food and oxygen grown by hand. Exactly one accent light: green glow in the water (#22c55e); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma magenta (#FF00FF) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no magenta or pink reflections, no magenta rim light and no magenta colour spill anywhere on the object, and no magenta or pink anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**18. Surgical lamp arm** — `life_surgical_lamp.glb` — green screen
```text
Surgical lamp arm: one single isolated 3D game prop for image-to-3D reconstruction, about 2.3 m tall, an arm reaching up and over. Subject: a floor-standing surgical lamp on a heavy weighted base: a jointed steel arm reaching up and over with a round multi-lens lamp head, one lens cracked, a sterile handle wrapped in tape, cables spiralled around the arm, ivory enamel chipped at the joints. Story it tells: the light over the last operation. Exactly one accent light: warm amber glow in the lenses (#f59e0b); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**19. Ice-locked tracked crawler** — `cryo_ice_crawler.glb` — magenta screen
```text
Ice-locked tracked crawler: one single isolated 3D game prop for image-to-3D reconstruction, about 2 m tall and 3.2 m long. Subject: a small tracked utility crawler vehicle frozen in place: tracks encased in clear blue ice, an open cab with a frosted windscreen, a cargo bed of ice-crusted drums, a crane arm folded on the back, icicles hanging from every edge. Story it tells: caught by the freeze on its last run. Exactly one accent light: faint cyan headlamp through the frost (#22d3ee); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma magenta (#FF00FF) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no magenta or pink reflections, no magenta rim light and no magenta colour spill anywhere on the object, and no magenta or pink anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**20. Frozen pipe cascade** — `cryo_frozen_cascade.glb` — magenta screen
```text
Frozen pipe cascade: one single isolated 3D game prop for image-to-3D reconstruction, about 2.8 m tall, flat back made to sit against a wall. Subject: a burst wall pipe frozen mid-gush: a ruptured steel pipe elbow near the top spilling a solid frozen waterfall of clear blue ice down to a frozen pool at its base, icicles fringing the pipe, frost feathers spreading along the metal. Story it tells: a leak the cold turned into sculpture. Exactly one accent light: cyan glow inside the thickest ice (#22d3ee); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma magenta (#FF00FF) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no magenta or pink reflections, no magenta rim light and no magenta colour spill anywhere on the object, and no magenta or pink anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**21. Snowbound crate stack** — `cryo_snowbound_crates.glb` — magenta screen
```text
Snowbound crate stack: one single isolated 3D game prop for image-to-3D reconstruction, about 1.6 m tall. Subject: a stack of four heavy supply crates half-buried in a windblown snow drift: snow piled on every top, frost-locked latches, one crate pried open to show frozen ration packs, a shovel jammed into the drift. Story it tells: supplies nobody could reach in time. Exactly one accent light: cyan cold-chain indicator light (#22d3ee); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma magenta (#FF00FF) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no magenta or pink reflections, no magenta rim light and no magenta colour spill anywhere on the object, and no magenta or pink anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**22. Radiant heater station** — `cryo_heater_station.glb` — green screen
```text
Radiant heater station: one single isolated 3D game prop for image-to-3D reconstruction, about 1.7 m tall. Subject: a free-standing radiant heater station: a tall steel post with a parabolic reflector dish around a glowing heating coil, a fuel canister strapped to the base, two folding stools, gloves drying on hooks on the post, rings of refrozen meltwater around the feet. Story it tells: warmth in the cold sector. Exactly one accent light: amber glowing coil (#f59e0b); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**23. Cut ice-block stack with saw** — `cryo_ice_blocks.glb` — magenta screen
```text
Cut ice-block stack with saw: one single isolated 3D game prop for image-to-3D reconstruction, about 1.2 m tall. Subject: a neat stack of rectangular blocks of cut blue ice on a wooden sledge: saw marks on every face, a long two-handed ice saw and a pair of ice tongs leaning on the stack, a melt bucket with a hose leading off. Story it tells: water harvested by hand. Exactly one accent light: cyan glow through the clearest block (#22d3ee); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma magenta (#FF00FF) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no magenta or pink reflections, no magenta rim light and no magenta colour spill anywhere on the object, and no magenta or pink anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**24. Resin load pillar** — `hive_resin_pillar.glb` — magenta screen
```text
Resin load pillar: one single isolated 3D game prop for image-to-3D reconstruction, about 2.8 m tall, floor to wall top. Subject: an organic load-bearing pillar of glossy hardened hive resin, flaring wide at the base and the top like a tendon stretched between floor and ceiling, grown around a buckled steel I-beam it has absorbed, translucent amber layers with small trapped debris, ivory bone ridges spiralling up it. Story it tells: the hive rebuilding the bunker in its own flesh. Exactly one accent light: green veins pulsing under the surface (#22c55e); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma magenta (#FF00FF) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no magenta or pink reflections, no magenta rim light and no magenta colour spill anywhere on the object, and no magenta or pink anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**25. Cocooned crew member** — `hive_cocooned_crew.glb` — magenta screen
```text
Cocooned crew member: one single isolated 3D game prop for image-to-3D reconstruction, about 2 m tall, flat back made to sit against a wall. Subject: an upright cocoon of translucent hive resin fused to a wall panel: the indistinct silhouette of a crew member in a jumpsuit sealed inside with the face hidden by the resin, one boot and one gloved hand pressed against the inner wall, resin strands anchoring the cocoon to the panel. Unsettling but not gory. Story it tells: taken, not killed. Exactly one accent light: faint green glow in the resin (#22c55e); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma magenta (#FF00FF) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no magenta or pink reflections, no magenta rim light and no magenta colour spill anywhere on the object, and no magenta or pink anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**26. Brood chamber dome** — `hive_brood_dome.glb` — magenta screen
```text
Brood chamber dome: one single isolated 3D game prop for image-to-3D reconstruction, about 1.8 m tall and 2.6 m wide. Subject: a low brood chamber dome grown from hive resin and ivory chitin plates: a stretched translucent membrane window on one side showing dim shapes inside, ribbed buttress ridges radiating from the crown, a puckered vent at the top. Story it tells: the hive's nursery, breathing. Exactly one accent light: green glow leaking from the seams (#22c55e); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma magenta (#FF00FF) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no magenta or pink reflections, no magenta rim light and no magenta colour spill anywhere on the object, and no magenta or pink anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**27. Hive pheromone node** — `hive_pheromone_node.glb` — magenta screen
```text
Hive pheromone node: one single isolated 3D game prop for image-to-3D reconstruction, about 1.3 m tall. Subject: a hive pheromone node: a bulbous translucent sac on a short fleshy stalk rooted in a cluster of root-like tendrils, small pores on its skin exhaling a faint haze, thin tendrils reaching out along the ground in two directions like a trail marker. Story it tells: a signpost the hive leaves for its own. Exactly one accent light: bright green core in the sac (#22c55e); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma magenta (#FF00FF) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no magenta or pink reflections, no magenta rim light and no magenta colour spill anywhere on the object, and no magenta or pink anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**28. Tendril doorway arch** — `hive_tendril_arch.glb` — magenta screen
```text
Tendril doorway arch: one single isolated 3D game prop for image-to-3D reconstruction, about 3 m tall and 3.2 m wide, with a clear opening to walk through. Subject: a free-standing arch of braided hive tendrils shaped like an overgrown doorway frame: two thick root-like legs rising and knotting together overhead around a buckled steel door lintel, thinner tendrils trailing down the sides like a curtain, the opening between the legs completely clear. Story it tells: the hive framing its own doorways. Exactly one accent light: green veins glowing along the main strands (#22c55e); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma magenta (#FF00FF) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no magenta or pink reflections, no magenta rim light and no magenta colour spill anywhere on the object, and no magenta or pink anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**29. Assimilated generator** — `hive_assimilated_generator.glb` — magenta screen
```text
Assimilated generator: one single isolated 3D game prop for image-to-3D reconstruction, about 1.9 m tall. Subject: an industrial generator half absorbed by the hive: a boxy steel generator with cooling fins and a cracked control panel, half of it overgrown by glossy organic tissue, cables replaced by fleshy veins plugged into its sockets, the exhaust stack sprouting an ivory chitin crest. Story it tells: a machine being eaten and kept running. Exactly one accent light: green glow pulsing through the vents (#22c55e); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma magenta (#FF00FF) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no magenta or pink reflections, no magenta rim light and no magenta colour spill anywhere on the object, and no magenta or pink anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**30. Torn engine nacelle** — `crash_engine_nacelle.glb` — green screen
```text
Torn engine nacelle: one single isolated 3D game prop for image-to-3D reconstruction, about 2 m tall and 4 m long, lying on its side. Subject: a torn-off spacecraft engine nacelle lying on its side: the cylindrical cowling ripped open to show turbine blades and burnt coils, a scorched exhaust bell, severed fuel lines and cables trailing from the torn mount, heat-blued metal fading into soot. Story it tells: ripped from the ship on impact. Exactly one accent light: amber ember glow still inside the core (#f59e0b); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**31. Hull panel debris cluster** — `crash_hull_panels.glb` — green screen
```text
Hull panel debris cluster: one single isolated 3D game prop for image-to-3D reconstruction, about 1 m tall and 3 m across, lying low on the ground. Subject: a low cluster of torn spacecraft hull panels lying flat and overlapping: curved armour plates with burnt edges and peeled insulation, broken rib struts, a cracked porthole frame, scattered rivets and a twisted antenna, scorched grey paint. Story it tells: the crash written on the ground. No glowing parts at all. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**32. Tangled drag chute** — `crash_drag_chute.glb` — green screen
```text
Tangled drag chute: one single isolated 3D game prop for image-to-3D reconstruction, about 0.6 m tall and 4 m across, lying on the ground. Subject: a deflated spacecraft drag chute lying in a long tangled heap: red and grey ribbed canopy fabric folded on itself, dozens of shroud lines snarled into a knot leading to a burnt steel riser fitting, scorch holes in the fabric, dust in the folds. Story it tells: the landing that almost worked. Exactly one accent light: red canopy fabric (#ef4444); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**33. Tagged salvage heap** — `salvage_tagged_heap.glb` — green screen
```text
Tagged salvage heap: one single isolated 3D game prop for image-to-3D reconstruction, about 1.4 m tall. Subject: a sorted heap of salvaged parts: pipes, plates, motors and cable spools sorted into rough groups, each group tied with wire and marked with amber and red cloth tags with no writing, a crowbar and a wheelbarrow beside it, a work lamp hanging from a pole stuck in the pile. Story it tells: scavenging turned into an economy. Exactly one accent light: amber work lamp (#f59e0b); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**34. Stranded cable-car gondola** — `chasm_gondola.glb` — green screen
```text
Stranded cable-car gondola: one single isolated 3D game prop for image-to-3D reconstruction, a cabin about 3 m long hanging from a short length of thick cable. Subject: an industrial cable-car gondola hanging from a short section of thick haul cable on a heavy trolley wheel assembly: a riveted steel box cabin with cracked windows, one sliding door jammed half open, a cargo net hanging from the floor, frost and grime streaking down the sides. Story it tells: stranded mid-crossing over the chasm. Exactly one accent light: dim amber cabin light still on (#f59e0b); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**35. Collapsed catwalk** — `chasm_broken_catwalk.glb` — green screen
```text
Collapsed catwalk: one single isolated 3D game prop for image-to-3D reconstruction, about 5 m long, one end level and the rest hanging down. Subject: a length of steel grating catwalk that has snapped and sagged: one end still bolted level to a short ledge bracket, the rest bent sharply downward and hanging, handrails twisted, a few grating panels torn loose and dangling by one bolt, a broken support strut, a cable dragging from the free end. Story it tells: the way across, gone. No glowing parts at all. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**36. Rappel anchor and ropes** — `chasm_rappel_anchor.glb` — green screen
```text
Rappel anchor and ropes: one single isolated 3D game prop for image-to-3D reconstruction, a 1.2 m anchor rig with ropes hanging about 6 m straight down. Subject: a rappel anchor rig: a steel stake plate bolted down with three bolts, a carabiner cluster and a descender device, two climbing ropes running from it and dropping straight down, one rope frayed and cut, a marker flag on a short pole beside the anchor, an abandoned helmet next to the plate. Story it tells: someone went down and did not come back. Exactly one accent light: red marker flag (#ef4444); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**37. Edge warning beacon post** — `chasm_beacon_post.glb` — green screen
```text
Edge warning beacon post: one single isolated 3D game prop for image-to-3D reconstruction, about 1.8 m tall. Subject: an edge warning post: a heavy red-and-black striped steel post set in a concrete-filled tyre, a caged rotating beacon lamp on top, a short length of broken chain railing hooked to it, a reflector strip, a faded hazard pictogram plate with no writing. Story it tells: it marks where the floor ends. Exactly one accent light: red beacon lamp (#ef4444); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**38. Survivor canvas tent** — `camp_canvas_tent.glb` — magenta screen
```text
Survivor canvas tent: one single isolated 3D game prop for image-to-3D reconstruction, about 2 m tall and 3 m long. Subject: a survivor canvas wall tent on a frame of bent pipe: patched canvas in faded grey and tan, the front flap tied open showing a bedroll inside, guy ropes pegged with bent rebar, a tarp extension over the entrance, boots and a water canister by the flap, frost and grime along the bottom edge. Story it tells: a home made from salvage. Exactly one accent light: amber lantern hanging inside (#f59e0b); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma magenta (#FF00FF) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no magenta or pink reflections, no magenta rim light and no magenta colour spill anywhere on the object, and no magenta or pink anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**39. Portable diesel generator** — `camp_generator.glb` — green screen
```text
Portable diesel generator: one single isolated 3D game prop for image-to-3D reconstruction, about 1 m tall. Subject: a portable diesel generator on a tubular roll frame: a dented fuel tank on top, a short exhaust pipe stained black, a pull-start handle, a power panel with three heavy cables plugged in and trailing off, two jerry cans beside it, an oil drip tray underneath. Story it tells: the heartbeat of a camp. Exactly one accent light: amber running lamp (#f59e0b); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma green (#00FF00) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no green reflections, no green rim light and no green colour spill anywhere on the object, and no green anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**40. Water barrel and wash basin** — `camp_water_barrel.glb` — magenta screen
```text
Water barrel and wash basin: one single isolated 3D game prop for image-to-3D reconstruction, about 1.2 m tall. Subject: a melt-water barrel on a raised stand with a brass tap and a cloth filter tied over the top, a steel wash basin on a crate below the tap with a ladle and a sliver of soap, wet stains on the crate. Story it tells: clean water, rationed. Exactly one accent light: small cyan purification indicator strapped to the barrel (#22d3ee); every other surface is unlit material colour. Style: H.R. Giger biomechanical sensuality fused with brutal deep-space corporate industrial horror; sinuous ribbed vertebral forms and organic curves grown into cold machinery; grimy cast gunmetal, ivory bone, black latex sheen; heavy wear, grime and scratches; razor-sharp micro-detail on every surface; nothing explicit. Render: photorealistic PBR materials, octane render, soft even studio light from all sides, gentle specular highlights, crisp readable silhouette, every part solidly connected to the main body with no floating pieces, three-quarter view from slightly above, the whole object in frame with a 10% margin on every side. Background: perfectly flat pure chroma magenta (#FF00FF) filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no magenta or pink reflections, no magenta rim light and no magenta colour spill anywhere on the object, and no magenta or pink anywhere in the object itself. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

### Order of production

Generate in waves of eight, reviewing each wave in the museum walk before the next, the same
cadence the decal doc uses for texture batches.

1. **Wave 1, biggest visible change:**
   - 1 pallet racking, 6 cistern, 8 forklift, 38 tent;
   - 34 gondola, 35 collapsed catwalk, 28 tendril arch, 19 ice crawler.
2. **Wave 2, daily life:** 9, 10, 11, 12, 13, 14, 15, 16.
3. **Wave 3, districts:** 20, 21, 22, 23, 24, 25, 26, 29.
4. **Wave 4, the rest:** 2, 3, 4, 5, 7, 17, 18, 27, 30, 31, 32, 33, 36, 37, 39, 40.

---

## Part 2 — Twenty floor layers: paths and more

### The idea

Today a floor is one tiled material per room or district, with families blending at their
borders and stickers scattered by rules (wall-base grime, mud fans at doors, contact grime under
props). Nothing knows where people walk.

The splat floor's data texture already has an unused channel. `src/floorSplat.js` reads R as
the surface layer, G as distance to the nearest wall, B as "**reserved for path wear**", and A as
wetness. This plan fills it.

### How paths are computed (deterministic, no new draws)

1. **Traffic.** On chunk build, for every pair of the chunk's doors and portals (plus room
   interaction anchors as destinations), take the shortest walkable path on the cell grid (BFS,
   4-neighbour, the same grid collision uses). Add 1 to every cell on it.
2. **Smooth.** Blur the traffic field by one cell and normalise to 0–255. The result is the
   **path weight**, written into B.
3. **Seed.** Everything is a pure function of the chunk grid, so co-op peers and TRY AGAIN get
   the same paths.
4. **Shade.** The floor shader blends the district's **path surface** (layers 1–8 below) over the
   base surface by the path weight, and the **shoulder** layer (9–12) where the weight is falling
   off: the edge of the path, and under the wall-distance falloff that already exists. The path
   texture index comes from the surface family (bunker / cryo / bio / camp / ledge), the same way
   family colours are chosen today.
5. **Route strips.** The heaviest path cells are reduced to straight segments (cell runs of 3 or
   more). Strip stickers (13–18) are laid along them with the sticker system's existing `yaw` and
   `length`: cart ruts in storage and cargo, drag marks from crates to doors, painted walkway
   borders in corridors, gutters along wall-side runs, sled tracks in cryo, vein trails in bio.
   They stay one instanced sticker draw per chunk.
6. **Landing marks.** The two square marks (19–20) go where traffic concentrates:
   - in front of every door, where everyone steps;
   - at turns and junctions, where traffic pivots.

The cost is one texture-array layer per path surface in the existing floor material, plus a few
more instanced sticker quads. That's no new draws, and memory stays inside the KTX2 budget.

### Intake rules (from the floor/decal doc, unchanged)

- **Raw sources** go in `art/source/textures/world-expansion-2026-10/` (surfaces) and
  `art/source/decals/world-expansion-2026-10/raw/` (strips and marks), with a manifest entry
  each: id, kind, surface, keyMode, worldScale, room tags, placement.
- **Surfaces:** straight down, shadowless, low directionality, seamless. Reject a surface if a
  3×3 tiled preview shows an obvious repeating stamp.
- **Strips and marks:** top-down orthographic on solid magenta for keying. Never black-keyed
  (several are dark). No borders, shadows or legible text.
- **Shipping:** delight, seam-repair, derive normal and roughness, then pack to KTX2 like the
  existing 44 floor layers.

### The list

| # | Layer | Id | Kind | Used where | World scale | Key |
|---|---|---|---|---|---|---|
| **Path surfaces (B channel, by district)** |||||||
| 1 | Boot-polished deck plate | `tex_path_worn_deck` | surface | bunker corridors and rooms | 2 m tile | opaque |
| 2 | Traffic-polished concrete | `tex_path_polished_concrete` | surface | bunker utility, storage, crash site | 2 m | opaque |
| 3 | Packed snow track | `tex_path_packed_snow` | surface | cryo | 2 m | opaque |
| 4 | Slush and meltwater track | `tex_path_slush_track` | surface | cryo near heat, airlocks | 2 m | opaque |
| 5 | Compressed resin trail | `tex_path_resin_trail` | surface | bio, hive | 2 m | opaque |
| 6 | Trodden spore carpet | `tex_path_trodden_spores` | surface | bio fringes, cave | 2 m | opaque |
| 7 | Mud and boot-churn track | `tex_path_mud_track` | surface | camps, exterior ground | 2 m | opaque |
| 8 | Loose gravel scree path | `tex_path_gravel_scree` | surface | ledges (`O`), canyons | 2 m | opaque |
| **Shoulders (where a path fades out)** |||||||
| 9 | Swept grit shoulder | `tex_shoulder_swept_grit` | surface | bunker path edges | 2 m | opaque |
| 10 | Refrozen ice crust | `tex_shoulder_ice_crust` | surface | cryo path edges | 2 m | opaque |
| 11 | Resin lip and drips | `tex_shoulder_resin_lip` | surface | bio path edges | 2 m | opaque |
| 12 | Standing-water puddles | `tex_overlay_puddles` | surface | low spots, near drains (with A, wetness) | 3 m | opaque |
| **Route strips (stickers along segments; tile along their length)** |||||||
| 13 | Paired cart wheel ruts | `strip_cart_ruts` | strip 1:4 | storage, cargo, conveyor lines | 1 m × 4 m | magenta |
| 14 | Heavy drag marks | `strip_drag_marks` | strip 1:4 | crates and bodies to doors | 1 m × 4 m | magenta |
| 15 | Faded painted walkway borders | `strip_walkway_borders` | strip 1:4 | bunker corridors | 1.5 m × 6 m | magenta |
| 16 | Wall-side drainage gutter | `strip_drain_gutter` | strip 1:4 | wall-side runs in wet rooms | 0.6 m × 4 m | magenta |
| 17 | Sled runners and boot tracks | `strip_sled_tracks` | strip 1:4 | cryo routes | 1 m × 4 m | magenta |
| 18 | Hive vein trail | `strip_hive_veins` | strip 1:4 | bio routes, toward pheromone nodes | 1 m × 4 m | magenta |
| **Landing marks (where traffic concentrates)** |||||||
| 19 | Doorway wear apron | `decal_door_wear_apron` | square | in front of every door | 3 m | magenta |
| 20 | Junction turn wear | `decal_junction_turn_wear` | square | corridor turns and junctions | 2.5 m | magenta |

None of these repeat a shipped layer:
- the existing `scuff_path` and `lane_chevrons` stickers are small accents, not route-following;
- `evac_treads` is tank treads;
- the decal doc's Wave 1 covers terminals, pods, drills, decon, coolant, repair patches and water
  foam.

### Prompts

One block per layer. Copy the whole block.
- **Surfaces 1–12** are opaque and seamless, with no chroma.
- **Strips and marks 13–20** are on magenta for keying. Strips are 1:4 portrait and tile top to
  bottom; marks are square.

**1. Boot-polished deck plate** — `tex_path_worn_deck` — opaque, seamless
```text
Boot-polished deck plate: a seamless tileable floor texture for a game, one image covers 2 x 2 metres of floor. Surface: worn steel diamond-plate deck flooring. Detail: years of boot traffic have polished the raised pattern bright silver along a soft wandering band, dark grime and rust packed into the recesses, faint scuffs, a few scratched gouges, one plate seam crossing the tile, cold grey gunmetal tones. View: exactly straight down, orthographic, perfectly flat, no perspective and no horizon. Light: flat even diffuse light, no directional light, no cast shadows, no ambient-occlusion vignette. Tiling: seamless on all four edges; low-frequency variation spread evenly so no single feature repeats as an obvious stamp when tiled 3 x 3; consistent brightness across the whole image. Exclude: objects, props, debris larger than a hand, people, text, letters, numbers, logos, borders, frames, chroma background. Square 1:1, 2048x2048.
```

**2. Traffic-polished concrete** — `tex_path_polished_concrete` — opaque, seamless
```text
Traffic-polished concrete: a seamless tileable floor texture for a game, one image covers 2 x 2 metres of floor. Surface: industrial concrete floor. Detail: polished smooth and slightly glossy by foot and cart traffic, aggregate stones showing through in the worn areas, grey dust and grime settled into fine cracks and around a few patched repairs, faint tyre scuffs. View: exactly straight down, orthographic, perfectly flat, no perspective and no horizon. Light: flat even diffuse light, no directional light, no cast shadows, no ambient-occlusion vignette. Tiling: seamless on all four edges; low-frequency variation spread evenly so no single feature repeats as an obvious stamp when tiled 3 x 3; consistent brightness across the whole image. Exclude: objects, props, debris larger than a hand, people, text, letters, numbers, logos, borders, frames, chroma background. Square 1:1, 2048x2048.
```

**3. Packed snow track** — `tex_path_packed_snow` — opaque, seamless
```text
Packed snow track: a seamless tileable floor texture for a game, one image covers 2 x 2 metres of floor. Surface: snow trampled and packed hard into a firm walkway. Detail: layered overlapping boot prints softened by frost, pale blue-white with faint cyan shadows inside the prints, small ice glints, no bare ground showing. View: exactly straight down, orthographic, perfectly flat, no perspective and no horizon. Light: flat even diffuse light, no directional light, no cast shadows, no ambient-occlusion vignette. Tiling: seamless on all four edges; low-frequency variation spread evenly so no single feature repeats as an obvious stamp when tiled 3 x 3; consistent brightness across the whole image. Exclude: objects, props, debris larger than a hand, people, text, letters, numbers, logos, borders, frames, chroma background. Square 1:1, 2048x2048.
```

**4. Slush and meltwater track** — `tex_path_slush_track` — opaque, seamless
```text
Slush and meltwater track: a seamless tileable floor texture for a game, one image covers 2 x 2 metres of floor. Surface: grey slush and wet churned snow over a dark metal deck. Detail: thin meltwater films reflecting soft light, refrozen ridges at the edges of footprints, a few dark grit specks. View: exactly straight down, orthographic, perfectly flat, no perspective and no horizon. Light: flat even diffuse light, no directional light, no cast shadows, no ambient-occlusion vignette. Tiling: seamless on all four edges; low-frequency variation spread evenly so no single feature repeats as an obvious stamp when tiled 3 x 3; consistent brightness across the whole image. Exclude: objects, props, debris larger than a hand, people, text, letters, numbers, logos, borders, frames, chroma background. Square 1:1, 2048x2048.
```

**5. Compressed resin trail** — `tex_path_resin_trail` — opaque, seamless
```text
Compressed resin trail: a seamless tileable floor texture for a game, one image covers 2 x 2 metres of floor. Surface: a glossy organic trail of compressed hive resin. Detail: smooth worn surface in dark amber-green with fine translucent layers, faint embedded veins, drag-smoothed patches, tiny trapped bubbles, wet sheen, sinuous organic flow lines. View: exactly straight down, orthographic, perfectly flat, no perspective and no horizon. Light: flat even diffuse light, no directional light, no cast shadows, no ambient-occlusion vignette. Tiling: seamless on all four edges; low-frequency variation spread evenly so no single feature repeats as an obvious stamp when tiled 3 x 3; consistent brightness across the whole image. Exclude: objects, props, debris larger than a hand, people, text, letters, numbers, logos, borders, frames, chroma background. Square 1:1, 2048x2048.
```

**6. Trodden spore carpet** — `tex_path_trodden_spores` — opaque, seamless
```text
Trodden spore carpet: a seamless tileable floor texture for a game, one image covers 2 x 2 metres of floor. Surface: a carpet of fine pale green spore dust and soft fungal fuzz. Detail: trampled flat by traffic, crushed tracks revealing darker damp ground beneath, scattered bruised spore caps, low dull sheen. View: exactly straight down, orthographic, perfectly flat, no perspective and no horizon. Light: flat even diffuse light, no directional light, no cast shadows, no ambient-occlusion vignette. Tiling: seamless on all four edges; low-frequency variation spread evenly so no single feature repeats as an obvious stamp when tiled 3 x 3; consistent brightness across the whole image. Exclude: objects, props, debris larger than a hand, people, text, letters, numbers, logos, borders, frames, chroma background. Square 1:1, 2048x2048.
```

**7. Mud and boot-churn track** — `tex_path_mud_track` — opaque, seamless
```text
Mud and boot-churn track: a seamless tileable floor texture for a game, one image covers 2 x 2 metres of floor. Surface: dark churned mud track. Detail: overlapping boot prints and shallow ruts, wet glossy patches and drier cracked areas, a few embedded stones and bits of fibre. View: exactly straight down, orthographic, perfectly flat, no perspective and no horizon. Light: flat even diffuse light, no directional light, no cast shadows, no ambient-occlusion vignette. Tiling: seamless on all four edges; low-frequency variation spread evenly so no single feature repeats as an obvious stamp when tiled 3 x 3; consistent brightness across the whole image. Exclude: objects, props, debris larger than a hand, people, text, letters, numbers, logos, borders, frames, chroma background. Square 1:1, 2048x2048.
```

**8. Loose gravel scree path** — `tex_path_gravel_scree` — opaque, seamless
```text
Loose gravel scree path: a seamless tileable floor texture for a game, one image covers 2 x 2 metres of floor. Surface: a loose grey-brown gravel and scree path. Detail: small angular stones packed down along a worn line, finer dust between them, a few larger flat rocks and dark mineral flecks. View: exactly straight down, orthographic, perfectly flat, no perspective and no horizon. Light: flat even diffuse light, no directional light, no cast shadows, no ambient-occlusion vignette. Tiling: seamless on all four edges; low-frequency variation spread evenly so no single feature repeats as an obvious stamp when tiled 3 x 3; consistent brightness across the whole image. Exclude: objects, props, debris larger than a hand, people, text, letters, numbers, logos, borders, frames, chroma background. Square 1:1, 2048x2048.
```

**9. Swept grit shoulder** — `tex_shoulder_swept_grit` — opaque, seamless
```text
Swept grit shoulder: a seamless tileable floor texture for a game, one image covers 2 x 2 metres of floor. Surface: fine grey grit, dust and tiny metal flakes over a dark deck. Detail: swept to the side of a walkway and settled into soft uneven drifts, slightly darker overall than a clean path. View: exactly straight down, orthographic, perfectly flat, no perspective and no horizon. Light: flat even diffuse light, no directional light, no cast shadows, no ambient-occlusion vignette. Tiling: seamless on all four edges; low-frequency variation spread evenly so no single feature repeats as an obvious stamp when tiled 3 x 3; consistent brightness across the whole image. Exclude: objects, props, debris larger than a hand, people, text, letters, numbers, logos, borders, frames, chroma background. Square 1:1, 2048x2048.
```

**10. Refrozen ice crust** — `tex_shoulder_ice_crust` — opaque, seamless
```text
Refrozen ice crust: a seamless tileable floor texture for a game, one image covers 2 x 2 metres of floor. Surface: a thin crust of refrozen ice over snow. Detail: crazed with fine cracks, glassy patches and dusted frost, pale cyan-white with faint blue shadows in the cracks. View: exactly straight down, orthographic, perfectly flat, no perspective and no horizon. Light: flat even diffuse light, no directional light, no cast shadows, no ambient-occlusion vignette. Tiling: seamless on all four edges; low-frequency variation spread evenly so no single feature repeats as an obvious stamp when tiled 3 x 3; consistent brightness across the whole image. Exclude: objects, props, debris larger than a hand, people, text, letters, numbers, logos, borders, frames, chroma background. Square 1:1, 2048x2048.
```

**11. Resin lip and drips** — `tex_shoulder_resin_lip` — opaque, seamless
```text
Resin lip and drips: a seamless tileable floor texture for a game, one image covers 2 x 2 metres of floor. Surface: the spreading edge of an organic resin trail over metal deck. Detail: glossy dark amber-green lips and drips with thin branching veins thinning out toward clean grimy metal, sinuous organic shapes. View: exactly straight down, orthographic, perfectly flat, no perspective and no horizon. Light: flat even diffuse light, no directional light, no cast shadows, no ambient-occlusion vignette. Tiling: seamless on all four edges; low-frequency variation spread evenly so no single feature repeats as an obvious stamp when tiled 3 x 3; consistent brightness across the whole image. Exclude: objects, props, debris larger than a hand, people, text, letters, numbers, logos, borders, frames, chroma background. Square 1:1, 2048x2048.
```

**12. Standing-water puddles** — `tex_overlay_puddles` — opaque, seamless
```text
Standing-water puddles: a seamless tileable floor texture for a game, one image covers 3 x 3 metres of floor. Surface: irregular shallow puddles of standing water on a dark grimy deck. Detail: still reflective water surfaces with soft highlights, damp darkened rims around each puddle, dry deck between them. View: exactly straight down, orthographic, perfectly flat, no perspective and no horizon. Light: flat even diffuse light, no directional light, no cast shadows, no ambient-occlusion vignette. Tiling: seamless on all four edges; low-frequency variation spread evenly so no single feature repeats as an obvious stamp when tiled 3 x 3; consistent brightness across the whole image. Exclude: objects, props, debris larger than a hand, people, text, letters, numbers, logos, borders, frames, chroma background. Square 1:1, 2048x2048.
```

**13. Paired cart wheel ruts** — `strip_cart_ruts` — magenta, 1:4 strip
```text
Paired cart wheel ruts: a top-down floor decal for a game, to be chroma-keyed. Mark: two long parallel wheel ruts worn into a floor by repeated cart traffic: polished grooves with black rubber marks and grey grime along their edges, running straight from the top edge to the bottom edge. View: exactly straight down, orthographic, no perspective. Light: flat even diffuse, no cast shadows. Edges: crisp where the mark is solid, fading naturally into the background where it thins; no outline, no border. Background: perfectly flat pure chroma magenta (#FF00FF) everywhere outside the mark, completely uniform, no floor surface, no texture, no gradient; no magenta or pink anywhere inside the mark and no magenta colour spill on its edges. Exclude: text, letters, numbers, logos, objects, people, shadows, frames. Shape: a tall narrow strip that tiles seamlessly from top to bottom, the mark touching the top and bottom edges and centred left to right with magenta on both sides. Portrait 1:4, 1024x4096.
```

**14. Heavy drag marks** — `strip_drag_marks` — magenta, 1:4 strip
```text
Heavy drag marks: a top-down floor decal for a game, to be chroma-keyed. Mark: long heavy drag marks of something hauled across a floor: parallel scrapes and gouged lines, smeared dark grey-brown grime and a few dark brown dried flecks, running from the top edge to the bottom edge. View: exactly straight down, orthographic, no perspective. Light: flat even diffuse, no cast shadows. Edges: crisp where the mark is solid, fading naturally into the background where it thins; no outline, no border. Background: perfectly flat pure chroma magenta (#FF00FF) everywhere outside the mark, completely uniform, no floor surface, no texture, no gradient; no magenta or pink anywhere inside the mark and no magenta colour spill on its edges. Exclude: text, letters, numbers, logos, objects, people, shadows, frames. Shape: a tall narrow strip that tiles seamlessly from top to bottom, the mark touching the top and bottom edges and centred left to right with magenta on both sides. Portrait 1:4, 1024x4096.
```

**15. Faded painted walkway borders** — `strip_walkway_borders` — magenta, 1:4 strip
```text
Faded painted walkway borders: a top-down floor decal for a game, to be chroma-keyed. Mark: two faded parallel painted walkway border lines in worn industrial yellow: chipped and scuffed by traffic, broken in places, small paint flakes, running from the top edge to the bottom edge. View: exactly straight down, orthographic, no perspective. Light: flat even diffuse, no cast shadows. Edges: crisp where the mark is solid, fading naturally into the background where it thins; no outline, no border. Background: perfectly flat pure chroma magenta (#FF00FF) everywhere outside the mark, completely uniform, no floor surface, no texture, no gradient; no magenta or pink anywhere inside the mark and no magenta colour spill on its edges. Exclude: text, letters, numbers, logos, objects, people, shadows, frames. Shape: a tall narrow strip that tiles seamlessly from top to bottom, the mark touching the top and bottom edges and centred left to right with magenta on both sides. Portrait 1:4, 1024x4096.
```

**16. Wall-side drainage gutter** — `strip_drain_gutter` — magenta, 1:4 strip
```text
Wall-side drainage gutter: a top-down floor decal for a game, to be chroma-keyed. Mark: a narrow recessed steel drainage gutter: short slotted grate covers along its length, dark water and grime in the channel, brown rust stains around the grate edges, running from the top edge to the bottom edge. View: exactly straight down, orthographic, no perspective. Light: flat even diffuse, no cast shadows. Edges: crisp where the mark is solid, fading naturally into the background where it thins; no outline, no border. Background: perfectly flat pure chroma magenta (#FF00FF) everywhere outside the mark, completely uniform, no floor surface, no texture, no gradient; no magenta or pink anywhere inside the mark and no magenta colour spill on its edges. Exclude: text, letters, numbers, logos, objects, people, shadows, frames. Shape: a tall narrow strip that tiles seamlessly from top to bottom, the mark touching the top and bottom edges and centred left to right with magenta on both sides. Portrait 1:4, 1024x4096.
```

**17. Sled runners and boot tracks** — `strip_sled_tracks` — magenta, 1:4 strip
```text
Sled runners and boot tracks: a top-down floor decal for a game, to be chroma-keyed. Mark: two thin parallel sled-runner tracks pressed into snow with a line of boot prints between them: pale blue-white snow with soft cyan shadows in the grooves, running from the top edge to the bottom edge. View: exactly straight down, orthographic, no perspective. Light: flat even diffuse, no cast shadows. Edges: crisp where the mark is solid, fading naturally into the background where it thins; no outline, no border. Background: perfectly flat pure chroma magenta (#FF00FF) everywhere outside the mark, completely uniform, no floor surface, no texture, no gradient; no magenta or pink anywhere inside the mark and no magenta colour spill on its edges. Exclude: text, letters, numbers, logos, objects, people, shadows, frames. Shape: a tall narrow strip that tiles seamlessly from top to bottom, the mark touching the top and bottom edges and centred left to right with magenta on both sides. Portrait 1:4, 1024x4096.
```

**18. Hive vein trail** — `strip_hive_veins` — magenta, 1:4 strip
```text
Hive vein trail: a top-down floor decal for a game, to be chroma-keyed. Mark: a trail of glossy organic veins: one thick sinuous central vein with thinner branches splitting off and tapering, a faint green bioluminescent glow along the main vein, running from the top edge to the bottom edge. View: exactly straight down, orthographic, no perspective. Light: flat even diffuse, no cast shadows. Edges: crisp where the mark is solid, fading naturally into the background where it thins; no outline, no border. Background: perfectly flat pure chroma magenta (#FF00FF) everywhere outside the mark, completely uniform, no floor surface, no texture, no gradient; no magenta or pink anywhere inside the mark and no magenta colour spill on its edges. Exclude: text, letters, numbers, logos, objects, people, shadows, frames. Shape: a tall narrow strip that tiles seamlessly from top to bottom, the mark touching the top and bottom edges and centred left to right with magenta on both sides. Portrait 1:4, 1024x4096.
```

**19. Doorway wear apron** — `decal_door_wear_apron` — magenta, square
```text
Doorway wear apron: a top-down floor decal for a game, to be chroma-keyed. Mark: a worn half-moon of floor in front of a doorway where everyone has stepped: the centre polished and scuffed bright, overlapping boot scuffs and grey grime smeared outward in a fan, darker at the outer edge, the flat side of the half-moon along the top edge of the image. View: exactly straight down, orthographic, no perspective. Light: flat even diffuse, no cast shadows. Edges: crisp where the mark is solid, fading naturally into the background where it thins; no outline, no border. Background: perfectly flat pure chroma magenta (#FF00FF) everywhere outside the mark, completely uniform, no floor surface, no texture, no gradient; no magenta or pink anywhere inside the mark and no magenta colour spill on its edges. Exclude: text, letters, numbers, logos, objects, people, shadows, frames. Shape: one isolated mark centred with a 5% magenta margin on every side. Square 1:1, 2048x2048.
```

**20. Junction turn wear** — `decal_junction_turn_wear` — magenta, square
```text
Junction turn wear: a top-down floor decal for a game, to be chroma-keyed. Mark: the curved wear band where foot traffic turns a corner: an arc of polished, scuffed floor with grime pushed to the outside of the turn, the arc sweeping from the bottom edge to the right edge of the image. View: exactly straight down, orthographic, no perspective. Light: flat even diffuse, no cast shadows. Edges: crisp where the mark is solid, fading naturally into the background where it thins; no outline, no border. Background: perfectly flat pure chroma magenta (#FF00FF) everywhere outside the mark, completely uniform, no floor surface, no texture, no gradient; no magenta or pink anywhere inside the mark and no magenta colour spill on its edges. Exclude: text, letters, numbers, logos, objects, people, shadows, frames. Shape: one isolated mark centred with a 5% magenta margin on every side. Square 1:1, 2048x2048.
```

### Order of production

1. **Pilot (prove the system before the art):**
   - fill the B channel and shade a path, using an *existing* surface (`tex_floor_concrete_stained`)
     as a placeholder, to judge route quality in captures;
   - then generate 1 (deck), 3 (snow), 5 (resin), 19 (door apron).
2. **Wave A:** 2, 4, 6, 7, 8, 9, 10, 11.
3. **Wave B:** 12–18 and 20.

**Acceptance** for each wave:
- the floor still renders in one draw per chunk;
- no chroma fringe;
- no obvious 3×3 repetition;
- `runtime-errors` probe green;
- a before/after capture with the world-look probe;
- paths read along the routes the player actually takes, not across the whole floor.

---

## Owner decisions

1. **Which waves to generate first.** Recommended: asset Wave 1 and the path pilot (B channel
   with a placeholder texture) together. The pilot proves the paths before any path art is made.
2. **Production lead.** Who generates (the owner, as with earlier batches), and who integrates:
   - the 3D models: the asset lane;
   - the path system: lane H, the floor and decal owner;
   - the vista props: lane F, through `src/chasmLandmarks.js` sites.
