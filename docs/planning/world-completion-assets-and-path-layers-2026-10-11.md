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

1. Generate the still from the prompt. The style tail is already part of every prompt. Put the
   negative block in the negative field.
2. Run image-to-3D.
3. Put the GLB in `art/raw/`. It is optimised into `public/3d/runtime/new3ds/` (KTX2 textures,
   `scripts/art/convert_glb_textures_ktx2.py`).
4. Register it in `WORLD_3D_MODELS` (`src/world3dOverlay.js`) with `height`, `yaw` and `maxSpan`,
   plus any `propBehavior`.
5. Check the scale on the museum walk (`tests/e2e/probes/museum-walk.spec.js`).
6. Add it to its placement source (column **Placed by** in the table below).
7. Run `tests/e2e/probes/runtime-errors.spec.js` after integration: a new model must not fail to
   upload or link.

**Prompts and style.** "2D stylized visual prompts" means stills generated in the game's
established style: the same style tail every one of the 300 shipped models was made from.
- *Accent colours:* one per piece. Amber for human machinery, cyan for cryo, green for bio and the
  hive, red for warning; violet stays reserved for the Queen.
- *Triangle budgets:* small props 3–7k, large pieces 8–15k. Everything stays well under the 25k
  hero-prop ceiling.

**Negative block (3D props):**
```text
cropped, cut off, partial object, multiple objects, duplicate, floor, ground plane, cast shadow,
drop shadow, reflection on floor, background scenery, room, environment, gradient background,
vignette, text, letters, numbers, logo, watermark, signature, people, hands, blurry, low detail,
cartoon, flat shading, toy-like, plastic look, oversaturated, fisheye, extreme perspective
```

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

Every prompt is complete on its own (style tail included). Generate at 1:1.

**1. Pallet racking bay** — `life_pallet_racking.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE bay of heavy industrial pallet racking: two tall bolted steel uprights with punched slots, three load beams, three shelves carrying shrink-wrapped supply pallets, dented ration crates, a coiled hose and an empty pallet leaning on the side, a laminated inventory clipboard hanging from a hook, one amber (#f59e0b) bay light clipped to the top beam. Worn yellow paint chipped to bare metal, forklift scrapes at the base. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral bracing, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**2. Server cabinet pair** — `life_server_racks.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE pair of tall server cabinets bolted side by side, one front door hanging open showing stacked blade units with rows of tiny amber (#f59e0b) status lights, bundled ribbon cables spilling from the top, a cracked smoked-glass door on the second cabinet, a taped handwritten-looking label strip with no legible text, frost of dust on the vents. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral cable conduits, black lacquer, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**3. Transformer bank** — `life_transformer_bank.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE high-voltage transformer bank: a heavy finned steel cabinet with three ceramic insulator stacks on top, thick braided bus cables arching between them, a hinged inspection hatch with a scorched lightning-bolt warning plate, a red (#ef4444) fault lamp, oil weeping from one seam, cooling fins caked with soot. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ivory bone-like insulators, ribbed vertebral conduits, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**4. Fire suppression station** — `life_fire_station.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE wall-mounted fire suppression station: a red (#ef4444) steel cabinet with a cracked glass front, a fat extinguisher inside on a bracket, a flat-coiled canvas hose on a swing-out reel beside it, a fire axe clipped below, a small pull lever under a hinged guard, scorch marks and paint blisters around the frame. Backplate designed to sit flush against a wall. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral hose fittings, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**5. Conveyor section** — `life_conveyor_section.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE straight industrial conveyor section on four braced legs: a cracked black rubber belt over exposed steel rollers, a drive motor housing at one end with a belt guard, two dented supply crates stalled on the belt, a pull-cord emergency stop line along the side with an amber (#f59e0b) stop button. Grease drips under the rollers. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, black latex belt, ribbed vertebral roller frame, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**6. Riveted water cistern** — `life_cistern_tank.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE tall riveted cylindrical water cistern on a squat steel stand: banded plates, a sight-glass tube showing pale cyan (#22d3ee) water at half level, a pressure gauge and valve wheel near the base, a rusted ladder up one side to a hatch on top, condensation streaks and mineral crust running down from the seams, a patched leak wrapped in rubber and wire. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral bands, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**7. Repair scaffold tower** — `life_scaffold_tower.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE two-level repair scaffold tower of clamped steel tubes on locking casters, worn plank decks, a tarp tied across one side, a tool bucket and a coil of cable on the upper deck, a work light with an amber (#f59e0b) bulb clamped to the top rail, a hanging harness and a half-finished welded patch panel leaning against it. Someone stopped work mid-job. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral clamps, rough canvas, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**8. Abandoned forklift** — `life_forklift.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE compact industrial forklift abandoned with its forks raised half way, a crushed supply pallet still on the forks, an open roll cage over a torn seat, a cracked amber (#f59e0b) beacon light on the cage roof, one flat tire, hydraulic hoses sagging from the mast, a spill of fluid dried under the engine. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, chipped yellow paint, ribbed vertebral mast rails, black rubber, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**9. Washroom sink row** — `life_sink_row.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE wall-backed row of three stainless steel wash basins on a shared bracket, push taps, one basin cracked and stained, a cracked steel mirror strip above them fogged at the edges, a bar of grey soap, a toothbrush in a tin cup, a towel hung over a pipe, exposed drain pipes beneath joined into one trunk. Backplate designed to sit flush against a wall. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold brushed steel, ribbed vertebral drain pipes, limescale and grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**10. Communal shower stall** — `life_shower_stall.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE open communal shower stall: two tiled half-walls on a raised drain tray, an overhead pipe with two shower heads, one dripping, a stained plastic curtain on a bent rail, a valve cluster on the back wall, a pair of rubber sandals, mold and mineral streaks in the grout. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal pipework, cracked ivory tile, ribbed vertebral conduits, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**11. Laundry machine pair** — `life_laundry_machines.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE pair of heavy front-loading industrial laundry machines side by side on a steel plinth, one round porthole door open with grey jumpsuits spilling out, one closed with a cracked porthole, chunky dials with an amber (#f59e0b) running lamp, a basket of folded towels on top, a flexible drain hose snaking off the back. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral door hinges, black rubber seals, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**12. Weight bench and rack** — `life_weight_bench.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE improvised weight bench and squat rack welded from pipe and armor plate, a padded bench patched with tape, a barbell made from a pipe with mismatched reactor-valve weights on each end, a pair of dumbbells made of cans filled with concrete, a sweat-dark towel draped over the rack. Human, scrappy, determined. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral welds, cracked black vinyl, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**13. Battered arcade cabinet** — `life_arcade_cabinet.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE battered upright arcade cabinet, its CRT screen glowing with a soft abstract amber (#f59e0b) pattern, a joystick and two worn buttons, scratched side art of abstract geometric shapes, a crate dragged in front as a seat, a tally of scores scratched into the side as marks only, a cable patched into a wall socket. Comfort in the dark. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: black lacquer, cold cast gunmetal trim, ribbed vertebral cabinet seams, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**14. Filing cabinet bank** — `life_filing_cabinets.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE bank of three tall steel filing cabinets side by side, two drawers pulled open and overflowing with crumpled folders and loose sheets without legible text, one cabinet dented as if kicked, a padlock bar hanging open, a desk fan and a stack of binders on top. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, olive enamel worn to metal, ribbed vertebral drawer rails, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**15. Overseer's desk** — `life_overseer_desk.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy overseer's desk of riveted steel with a black glass top, a hooded terminal with a softly glowing amber (#f59e0b) screen, a high-backed cracked leather chair pushed back, a cold mug and an overflowing ashtray, a framed photo face-down, a corporate desk plaque with no legible text, a drawer forced open. Authority, abandoned. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, black lacquer and leather, ribbed vertebral legs, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**16. Planning whiteboard** — `life_planning_board.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE rolling double-sided whiteboard on a steel frame with locking casters, covered in smudged diagrams of tunnels, arrows and circled zones drawn as abstract shapes with no legible text, photographs and torn maps pinned along the top edge with magnets, a red (#ef4444) string linking pins, a marker tray with dried-out markers. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal frame, ribbed vertebral uprights, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**17. Algae culture tank** — `life_algae_tank.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE upright glass algae culture tank in a steel frame, filled with glowing green (#22c55e) water and drifting strands of algae, bubbles rising from an air stone, a grow lamp hood on top, feed tubes and a hand pump on the side, a clipboard of readings hanging from a hook, condensation running down the glass. Food and oxygen grown by hand. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal frame, ribbed vertebral tubing, glass, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**18. Surgical lamp arm** — `life_surgical_lamp.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE floor-standing surgical lamp on a heavy weighted base, a jointed steel arm reaching up and over with a round multi-lens lamp head, one lens cracked, a warm amber (#f59e0b) glow in the remaining lenses, a sterile handle wrapped in tape, cables spiraled around the arm. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral joints, ivory enamel, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**19. Ice-locked tracked crawler** — `cryo_ice_crawler.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE small tracked utility crawler vehicle frozen in place, its tracks encased in clear blue ice, an open cab with a frosted windscreen, a cargo bed of ice-crusted drums, a crane arm folded on the back, icicles hanging from every edge, a dead cyan (#22d3ee) headlamp glowing faintly through frost. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral track links, rime ice, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**20. Frozen pipe cascade** — `cryo_frozen_cascade.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE burst wall pipe frozen mid-gush: a ruptured steel pipe elbow near the top spilling a solid frozen waterfall of clear blue ice down to a frozen pool at its base, icicles fringing the pipe, frost feathers spreading on the pipe, a faint cyan (#22d3ee) glow inside the thickest ice. Backplate designed to sit flush against a wall. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral pipe flanges, clear glassy ice, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**21. Snowbound crate stack** — `cryo_snowbound_crates.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE stack of four heavy supply crates half-buried in a windblown snow drift, snow piled on every top surface, frost-locked latches, one crate pried open showing frozen ration packs, a cyan (#22d3ee) cold-chain indicator light on the side, a shovel jammed in the drift. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral crate bands, packed snow and rime, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**22. Radiant heater station** — `cryo_heater_station.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE free-standing radiant heater station: a tall steel post with a parabolic reflector dish holding a glowing amber (#f59e0b) heating coil, a fuel canister strapped to the base, two folding stools and a pair of gloves drying on the post hooks, melted puddle rings frozen again around the feet. Warmth in the cold sector. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral post, grime and frost, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**23. Cut ice-block stack with saw** — `cryo_ice_blocks.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE neat stack of rectangular blocks of cut blue ice on a wooden sledge, saw marks on every face, a long two-handed ice saw and a pair of ice tongs leaning against the stack, a melt bucket with a hose leading off, a faint cyan (#22d3ee) glow through the clearest block. Water harvested by hand. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: clear glassy ice, cold cast gunmetal tools with ribbed vertebral grips, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**24. Resin load pillar** — `hive_resin_pillar.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE organic load-bearing pillar of glossy hardened hive resin, wide at the base and the top like a tendon stretched between floor and ceiling, wrapped around a buckled steel I-beam it has absorbed, translucent amber-green layers with small trapped debris, fine green (#22c55e) veins pulsing under the surface. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: black latex sheen, ivory bone ridges, ribbed vertebral growth rings, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**25. Cocooned crew member** — `hive_cocooned_crew.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE upright cocoon of translucent hive resin fused to a wall panel, the indistinct silhouette of a crew member in a jumpsuit sealed inside, face hidden by the resin, a boot and one gloved hand pressed against the inner wall, strands anchoring the cocoon to the panel, faint green (#22c55e) bioluminescence in the resin. Unsettling, not gory. Backplate designed to sit flush against a wall. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: black latex sheen, ivory bone ridges, ribbed vertebral anchors, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**26. Brood chamber dome** — `hive_brood_dome.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE low brood chamber dome grown from hive resin and chitin plates, a stretched translucent membrane window on one side showing dim shapes inside, ribbed buttress ridges radiating from the crown, a puckered vent opening at the top, a glistening green (#22c55e) glow leaking from the seams. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: black latex sheen, ivory chitin plates, ribbed vertebral buttresses, wet resin, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**27. Hive pheromone node** — `hive_pheromone_node.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE hive pheromone node: a bulbous glowing sac on a short fleshy stalk rooted in a cluster of root-like tendrils, the sac translucent with a bright green (#22c55e) core, small pores on its skin exhaling a faint haze, thin tendrils reaching outward along the ground in two directions like a trail marker. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: black latex sheen, ivory bone nodules, ribbed vertebral stalk, wet resin, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**28. Tendril doorway arch** — `hive_tendril_arch.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE free-standing arch of braided hive tendrils shaped as an overgrown doorway frame, two thick root-like legs rising and knotting together overhead, a buckled steel door lintel caught in the knot, smaller tendrils trailing down like a curtain at the sides, green (#22c55e) veins glowing along the main strands, the opening between the legs completely clear. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: black latex sheen, ivory bone knuckles, ribbed vertebral tendrils, wet resin, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, front three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**29. Assimilated generator** — `hive_assimilated_generator.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE industrial generator being absorbed by the hive: a boxy steel generator with cooling fins and a cracked control panel, half of it overgrown by glossy organic tissue, cables replaced by fleshy veins plugged into its sockets, the exhaust stack sprouting a chitin crest, a green (#22c55e) glow pulsing through the vents where the machine and the growth meet. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, black latex sheen, ivory bone, ribbed vertebral veins, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**30. Torn engine nacelle** — `crash_engine_nacelle.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE torn-off spacecraft engine nacelle lying on its side, a cylindrical cowling ripped open to show turbine blades and burnt coils, a scorched exhaust bell, severed fuel lines and cables trailing from the torn mount, heat-blued metal fading into soot, a faint amber (#f59e0b) ember glow still inside the core. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral cowling, burnt ceramic, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**31. Hull panel debris cluster** — `crash_hull_panels.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE low cluster of torn spacecraft hull panels lying flat and overlapping, curved armor plates with burnt edges and peeled insulation, broken rib struts, a cracked porthole frame, scattered rivets and a twisted antenna, scorched paint in hull colors. Designed to lie on the ground. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral struts, burnt ceramic tiles, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, high three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**32. Tangled drag chute** — `crash_drag_chute.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE deflated spacecraft drag chute lying in a long tangled heap, a red (#ef4444) and grey ribbed canopy fabric folded on itself, dozens of shroud lines snarled into a knot leading to a burnt steel riser fitting, scorch holes in the fabric, dust in the folds. Designed to lie on the ground. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: technical fabric, cold cast gunmetal fitting, ribbed vertebral seams, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, high three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**33. Tagged salvage heap** — `salvage_tagged_heap.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE sorted heap of salvaged parts: a pile of pipes, plates, motors and cable spools sorted into rough groups, each group tied with wire and marked with colored cloth tags (amber, red, cyan) with no text, a crowbar and a wheelbarrow beside it, an amber (#f59e0b) work lamp hanging from a pole stuck in the pile. Scavenging made into an economy. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral scrap, rough canvas, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**34. Stranded cable-car gondola** — `chasm_gondola.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE industrial cable-car gondola hanging from a short section of thick haul cable on a heavy trolley wheel assembly, the cabin a riveted steel box with cracked windows, one sliding door jammed half open, a cargo net hanging from the floor, a dim amber (#f59e0b) cabin light still on, frost and grime streaking down the sides. Stranded mid-crossing. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral hanger arm, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**35. Collapsed catwalk** — `chasm_broken_catwalk.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE length of steel grating catwalk that has snapped and sagged: one end still bolted level to a short ledge bracket, the rest bent sharply downward and hanging, handrails twisted, a few grating panels torn loose and dangling by one bolt, a broken support strut, a cable dragging from the free end. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral handrail posts, rust, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, side three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**36. Rappel anchor and ropes** — `chasm_rappel_anchor.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE rappel anchor rig: a steel stake plate bolted down with three bolts, a carabiner cluster and a descender device, two climbing ropes running from it and dropping straight down into nothing, one rope frayed and cut, a red (#ef4444) marker flag on a short pole beside the anchor, an abandoned helmet next to the plate. Someone went down and did not come back. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral carabiners, braided rope, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**37. Edge warning beacon post** — `chasm_beacon_post.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE edge warning post: a heavy striped red-and-black steel post set in a concrete-filled tire, a caged rotating beacon lamp on top glowing red (#ef4444), a short length of chain railing hooked to it and broken off, a reflector strip, a faded hazard pictogram plate with no text. Marks where the floor ends. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral post collar, black rubber, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**38. Survivor canvas tent** — `camp_canvas_tent.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE survivor canvas wall tent on a frame of bent pipe, patched canvas in faded grey and olive, the front flap tied open showing a bedroll and a hanging amber (#f59e0b) lantern inside, guy ropes pegged with bent rebar, a tarp extension over the entrance, boots and a water canister outside the flap, frost and grime along the bottom edge. A home made from salvage. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: rough canvas, cold cast gunmetal frame, ribbed vertebral pole joints, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**39. Portable diesel generator** — `camp_generator.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE portable diesel generator on a tubular roll frame, a dented fuel tank on top, a short exhaust pipe stained black, a pull-start handle, a power panel with an amber (#f59e0b) running lamp and three heavy cables plugged in and trailing off, two jerry cans beside it, an oil drip tray underneath. The heartbeat of a camp. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, chipped paint, ribbed vertebral frame, black rubber, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**40. Water barrel and wash basin** — `camp_water_barrel.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE rain-and-melt water barrel on a raised stand with a brass tap, a cloth filter tied over the top, a steel wash basin on a crate below the tap with a ladle and a sliver of soap, a small cyan (#22d3ee) purification indicator strapped to the barrel, wet stains on the crate. Clean water, rationed. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral barrel hoops, rough wood, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
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

**Shared tail for surfaces 1–12** (append to each):
```text
Seamless tileable texture, perfectly straight-down orthographic top view, flat even diffuse lighting with no directional light and no cast shadows, no perspective, no horizon, no vignette, no borders, no text, no logos, physically plausible scale, low-frequency variation so it does not show an obvious repeating stamp when tiled 3x3, square 1:1, 2048x2048.
```

**Shared tail for strips and marks 13–20** (append to each):
```text
Top-down orthographic decal, isolated on a solid flat pure magenta (#FF00FF) background, the mark only with no surrounding floor surface, flat even diffuse lighting, no cast shadows, no perspective, no borders, no text, no logos, crisp natural edges that fade softly into the magenta.
```

1. **Boot-polished deck plate.** "Worn steel diamond-plate deck flooring where years of boot
   traffic have polished the raised pattern bright silver along a soft central band, darker
   grime and rust packed into the recesses, faint scuffs and a few scratched gouges, cold grey
   gunmetal tones, one plate seam crossing the tile. Each tile covers 2 metres."
2. **Traffic-polished concrete.** "Industrial concrete floor polished smooth and slightly glossy
   by foot and cart traffic, the aggregate showing through in the worn areas, grey dust and
   grime settled in fine cracks and around a few patched repairs, faint tire scuffs. Each tile
   covers 2 metres."
3. **Packed snow track.** "Snow trampled and packed hard into a firm compacted walkway, layered
   overlapping boot prints softened by frost, pale blue-white with faint cyan shadows in the
   prints, small ice glints, no bare ground. Each tile covers 2 metres."
4. **Slush and meltwater track.** "Grey slush and wet churned snow over a dark metal deck, thin
   meltwater films reflecting soft light, refrozen ridges at the edges of footprints, a few dark
   grit specks. Each tile covers 2 metres."
5. **Compressed resin trail.** "A glossy organic trail of compressed hive resin, smooth worn
   surface in dark amber-green with fine translucent layers, faint embedded veins, drag-smoothed
   patches and tiny bubbles, wet sheen. Each tile covers 2 metres."
6. **Trodden spore carpet.** "A carpet of fine pale green spore dust and soft fungal fuzz
   trampled flat by traffic, crushed tracks revealing darker damp ground beneath, scattered
   bruised spore caps, low dull sheen. Each tile covers 2 metres."
7. **Mud and boot-churn track.** "Dark churned mud track with overlapping boot prints and
   shallow ruts, wet glossy patches and drier cracked areas, a few embedded stones and bits of
   straw-like fibre. Each tile covers 2 metres."
8. **Loose gravel scree path.** "A loose grey-brown gravel and scree path, small angular stones
   packed down along a worn line, finer dust between them, a few larger flat rocks and dark
   mineral flecks. Each tile covers 2 metres."
9. **Swept grit shoulder.** "Fine grey grit, dust and tiny metal flakes swept to the side of a
   walkway and settled into a soft uneven drift over a dark deck, slightly darker than the
   path. Each tile covers 2 metres."
10. **Refrozen ice crust.** "A thin crust of refrozen ice over snow at the edge of a walkway,
    crazed with fine cracks, glassy patches and dusted frost, pale cyan-white with faint blue
    shadows in the cracks. Each tile covers 2 metres."
11. **Resin lip and drips.** "The raised edge of an organic resin trail spreading over metal
    deck, glossy dark amber-green lips and drips with thin branching veins thinning out toward
    clean metal. Each tile covers 2 metres."
12. **Standing-water puddles.** "Irregular shallow puddles of standing water on a dark grimy
    deck, still reflective water surfaces with soft highlights, damp darkened rims around each
    puddle, dry areas between them. Each tile covers 3 metres."
13. **Paired cart wheel ruts.** "Two long parallel wheel ruts worn into a floor by repeated cart
    traffic, polished grooves with black rubber marks and grime in the edges, running straight
    along the length of a tall narrow strip that tiles seamlessly along its vertical axis, 1:4
    aspect."
14. **Heavy drag marks.** "Long heavy drag marks of something hauled across a floor, parallel
    scrapes with gouged lines, smeared dark grime and a few flecks of dried fluid, running along
    the length of a tall narrow strip that tiles seamlessly along its vertical axis, 1:4
    aspect."
15. **Faded painted walkway borders.** "Two faded parallel painted walkway border lines in worn
    industrial yellow, chipped and scuffed by traffic, broken in places, with small paint
    flakes, running along the length of a tall narrow strip that tiles seamlessly along its
    vertical axis, 1:4 aspect."
16. **Wall-side drainage gutter.** "A narrow recessed steel drainage gutter with short slotted
    grate covers along its length, dark water and grime in the channel, rust stains around the
    grate edges, running along the length of a tall narrow strip that tiles seamlessly along its
    vertical axis, 1:4 aspect."
17. **Sled runners and boot tracks.** "Two thin parallel sled runner tracks pressed into snow
    with a line of boot prints between them, pale blue-white with soft cyan shadows in the
    grooves, running along the length of a tall narrow strip that tiles seamlessly along its
    vertical axis, 1:4 aspect."
18. **Hive vein trail.** "A trail of glossy organic veins running across a surface, one thick
    central vein with thinner branches splitting off and thinning out, faint green
    bioluminescent glow along the main vein, running along the length of a tall narrow strip
    that tiles seamlessly along its vertical axis, 1:4 aspect."
19. **Doorway wear apron.** "A worn half-moon of floor in front of a doorway where everyone has
    stepped: the centre polished and scuffed bright, overlapping boot scuffs and grime smeared
    outward in a fan, darker at the outer edge, square image with the flat side of the
    half-moon along the top edge."
20. **Junction turn wear.** "The curved wear pattern where foot traffic turns a corner: an
    arc-shaped band of polished, scuffed floor with grime pushed to the outside of the turn,
    square image, the arc sweeping from the bottom edge to the right edge."

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
