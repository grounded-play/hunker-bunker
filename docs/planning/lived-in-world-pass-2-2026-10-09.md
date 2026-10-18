# Lived-in world, pass 2: props, stickers, textures and blended edges — 2026-10-09

> [!NOTE]
> **Consolidation Notice (2026-10-17):** Remaining asset deliveries (Prop 80), VRAM optimizations, and Steam Deck frame-pacing captures from this pass have been consolidated into the canonical [Sprint 53 Master Verification & Execution Plan (2026-10-17)](sprint-53-master-verification-and-execution-plan-2026-10-17.md).

Owner, 2026-10-09: "I feel the world still feels too empty, what can we do to make it more lived in, in terms of assets and graphics overlays ... a list of 40 new unique assets in the visual style of the last 20 but for various areas and 20 more that we will put over a chroma green to like sticker on top of textures ... some more textures and instead of hard lines where one area ends and another begins we brush and blend the edges between things, let's plan this all out first, what do games use to make the world more lived in?"

This is a plan. Phases 0 and 1 are built (see **Status** below); the rest is not.

## Status

**2026-10-09: Phases 0 and 1 are done.**

- **Phase 0.** `tests/e2e/probes/floor-blend-captures.spec.js` pins the map (fixed run entropy, seed offset 424242) and captures the same floor boundaries before and after a change. It fails on any shader compile error.
- **Phase 1.** `src/floorSplat.js` gives each chunk one floor material.
  - **What it replaces:**
    - the room, hallway, door-threshold and crash-room overlays;
    - the exterior ground's separate rock material.
  - **What it does:**
    - Surfaces meet in a noise-broken, height-resolved brush edge.
    - The biome blends per fragment.
    - Grime collects along every wall foot.
  - **What it keeps:**
    - each surface's look: the ground keeps its normal map, including the sRGB decode that makes it dark;
    - the rooms' wet patches;
    - the base plates' softened specular, which applies only to their share.
  - **Opt-out:** `localStorage.hb_floor_splat = '0'` brings back the old overlays.
  - **Results on the pinned map:**
    - draw calls at a room door fell from 342 to 312;
    - compiled programs fell from 154 to 135;
    - lifting the ground ledges flush removed a bright crack that ran along every corridor edge.
  - **Not measured yet:** GPU cost on the Deck. The floor shader gains 4 texel fetches, up to 2 array samples and some value noise per fragment.

**2026-10-09 (later): Phases 3, 4 and 5 are done, with the owner's art.**

The owner uploaded 39 GLBs, 80 sticker renders and 56 texture renders without names. Each was identified by eye against Parts 2–4. The mapping from upload name to asset name is `scripts/art/manifests/lived-in-pass-2-sources.json`, and the raw files moved out of `public/` into ignored `art/source/`.
- **Missing:** prop 80, the smouldering hull shard, was not in the upload.
- **Extra:** stained concrete (T2) came in eight versions; everything else came in four.

- **Props (Phase 3).** `scripts/blender/ingest_lived_in_props_20261009.py`.
  - **Changed from this plan:** each prop keeps **25k triangles**, not the 3k–14k in Part 2. Cut that low, the organic curves faceted visibly (the intercom's ear ring, the pew's bones); at 25k they match the 50k source.
  - **Textures:** 2048 px WebP (the sources are 4096).
  - **Geometry:** gltfpack meshopt compression, so each file is 1.5–3.2 MB.
  - **Registered in:** `WORLD_3D_MODELS`, `DRESSING_TRIANGLES` and the showroom.
- **Floor textures (Phase 3).** `scripts/art/build_floor_surfaces.py`.
  - **The bake:**
    - divides the baked lighting out;
    - makes each texture seamless with a ragged half-offset cut;
    - derives height, normal, roughness, AO and metalness.
  - **Review copies:** the full PBR set is written as PNGs to `art/source/textures/lived-in-pass-2/pbr/`.
  - **What ships:** two BC7 KTX2 files per version (`_albedo`, `_detail`) with zstd supercompression, 95 MB in all. KTX2 was decision O2.
    - All 44 versions stay compressed on the GPU, about 120 MB against about 470 MB as plain images.
    - `src/floorSplat.js` loads them with three's KTX2Loader and stacks them into two arrays.
  - **Where each surface goes:**
    - the hallway takes T1;
    - room themes map through `ROOM_THEME_SURFACE`;
    - field and crater ground take T4, and ruins take T5;
    - every room, hallway and chunk picks one of the versions.
  - **The utility maps:** T11 (macro grime over 32 m) and T12 (edge breakup) ship as WebP, and the blend shader reads them.
  - **Fallback:** without BC7 support, each new surface draws the older surface it replaced.
- **Stickers (Phases 3 and 4).** `scripts/art/build_stickers.py`.
  - **Keying:** a soft difference matte against the key colour read from each image's border.
    - D3 and D9 are keyed on magenta.
    - Spill is removed, and edge colour comes from the nearest solid part of the sticker.
  - **Shaping:** each sticker is trimmed to its content, and tall stickers are turned on their side to keep their resolution.
  - **What ships:** 84 BC7 KTX2 layers (80 stickers plus the T13 wall band), 74 MB.
  - **Placement:** `src/stickerPlanner.js` places them per chunk:
    - grime strips along wall feet;
    - the T13 band on the walls of bunker rooms;
    - frost, resin and dust strips, or a cracked seam, where surface families meet;
    - tracked mud on both sides of doors;
    - story stickers by room theme;
    - scuffs, rust and tracks in halls and on open ground;
    - contact grime under props.
  - **Rendering:** `src/stickerDecals.js` draws every sticker in a chunk with full PBR (colour, coverage, normal, roughness, metalness) as one instanced draw.
  - **Opt-out:** `localStorage.hb_stickers = '0'`.
- **Placement (Phase 5).**
  - **Kits** take the Part 6.3 additions.
  - **Camps** get the lookout perch, smoking rack and training dummy, plus the barber chair and devotion tree.
  - **`src/worldDressing.js`** dresses the corridors (wall fixtures on straight runs, vignettes at dead ends, a wayfinding totem at wide crossings) and the open landforms (a landmark 40% of the time, plus 2–5 working props).
  - **Budgets:** 125k triangles per maze chunk and 150k per outdoor chunk, so at 25k a prop that is a handful each.
  - **Reachability:** a placement may never split a connected floor region.
  - **Lights:** lamp-carrying props get pooled practical lights.
- **Pinned-map probe:** 183 world props and about 18k stickers across the 49 mounted chunks, with no shader errors. Draw calls at a maze door rose from 331 to 372.
- **Retail budget:** raised to 3400 MiB, measured at 3357 MiB. KTX2 joins `.glb` in `asarUnpack` and in `src/assetUrl.js`.

**Still open** (updated 2026-10-10):
- [x] the crash-site seat row (79): hand-placed west of the wreck by the console, in ship-relative slots that clear the modules, the spawn ring, the arrival-wreckage slots and the door hall (`planWorldDressing({ crashSite })`). The crash room had been getting random field props (a seismic drill on the radar dish, a trestle on the reactor) because the wreck and modules are scene sprites the occupied scan never saw; it now gets only its hand-placed set;
- [x] prop 80, the hull shard: pending external asset delivery; consolidated into [Sprint 53 Master Plan](sprint-53-master-verification-and-execution-plan-2026-10-17.md#asset-pipeline--content-status);
- [x] ambient motion (Part 7). Shipped: dust motes in practical light cones (`createDustMotes` in `src/propFx.js` wired in `src/threeGame.js`), cable sway vertex shader with instancing support (`src/cableSway.js` wired in `src/world3dOverlay.js`), paper skitter (`src/paperSkitter.js`), cloth flutter (`src/clothFlutter.js`), drips under 67/62/D17 (`src/roomPresentation.js`), and corridor lamp/sign emissive flicker (`src/propExperience.js` & `src/propFx.js`);
- [x] a Deck p95 capture: consolidated into [Sprint 53 Master Verification Plan](sprint-53-master-verification-and-execution-plan-2026-10-17.md#2-performance--frame-pacing-deck--pc);
- [x] model textures to KTX2: every GLB texture ships as Basis UASTC (`36be2b26`); GPU texture memory 3737 → 1717 MiB in the census probe;
- [x] room-dressing PNG decals to KTX2: 68 baked layers, one draw per room (`5966fb49`);
- [x] the 2D sprites: every runtime-keyed sprite is baked ahead of time with the game's own keyer and loads as mipmapped UASTC KTX2 (`src/keyedSpriteBakes.js`; bake with `tests/e2e/probes/keyed-sprite-bake.spec.js` then `scripts/art/build_keyed_sprite_ktx2.py`; `hb_sprite_ktx2=0` keys at runtime again). 199 sprites, 55 MiB on disk; in the census run sprite textures fell 449 -> 333 MiB and all textures 1717 -> 1560 MiB. A rerun in misses mode found nothing left unbaked on that path;
- [x] the remaining sprite canvases: plain-PNG scatter sprites (`loadScatterTexture`, ~43 MiB), the enemy animation atlases (`layout` sprites, shared across instances) and the camp/hive site keyers (`camp.js`, `hiveSite.js`), mostly hidden behind their 3D models; consolidated into [Sprint 53 Master Plan](sprint-53-master-verification-and-execution-plan-2026-10-17.md#asset-pipeline--content-status);
- [x] V8: the museum walk for props 41–79 (Sprint 53): all load at their configured sizes.


- **Part 0:** why the world still reads as empty, taken from the code.
- **Part 1:** the techniques games use to make a world feel lived in, mapped to what we already have.
- **Part 2:** forty new 3D props, numbered 41–80. They continue the 1–40 sheet in [`cutscene-and-lived-in-asset-prompts-2026-10-08.md`](cutscene-and-lived-in-asset-prompts-2026-10-08.md) and use the Part 3 (biomechanical, anatomical) register from that sheet.
- **Part 3:** twenty chroma-green stickers (decals), D1–D20. Ten blend the edges between surfaces; ten add story detail.
- **Part 4:** thirteen new seamless textures, T1–T13.
- **Part 5:** the technical plan for brushed, blended edges.
- **Part 6:** dressing for corridors and outdoor ground, which get almost none today.
- **Part 7:** ambient motion.
- **Part 8:** phases, budgets, verification and open decisions.

---

## Part 0 — Why it still reads as empty

The first lived-in pass (`5cab35a0`, then the 40 `life_*` props in `55015f04`) dresses **room interiors only**.

1. **Corridors and outdoor ground get no dressing.**
   - `ThreeGame.addRoomDressing` (`src/threeGame.js`) loops over `metadata.roomInstances` and nothing else.
   - Hallway cells, and the open FIELD, CANYON, CRATER and RUINS landforms (`src/landforms.js`), get only the 2D scatter sprites.
   - Those spaces are where the player spends most of their travel time.
2. **Every surface change is a hard 1 m line.**
   - Room floors are a separate instanced overlay of 1 m tiles (`addRoomSurfaceOverlays`, y = 0.009). Each style samples a different atlas quadrant.
   - Hallways are another overlay (`addHallwaySurfaceOverlay`, y = 0.006), and only on MAZE chunks.
   - Door thresholds are a third (`addDoorThresholdSurfaceOverlay`).
   - Where two of these meet, the texture switches on a cell edge with no transition.
3. **The biome changes at the chunk border on the exterior ground.**
   - The base floor shader blends bunker, cryo and bio by distance from the ship, with a 20 m `smoothstep` (`BIOME_BLEND_HALF_WIDTH = 10`).
   - The exterior ground ledges (`O` cells) instead take one rock material per chunk, chosen at the chunk centre (`getBiomeKeyForWorldPosition(centerX, centerZ)`). Inside the blend ring, a straight 49 m chunk edge shows, and the ground can disagree with its own walls.
   - Corrected 2026-10-09: the first draft blamed the room overlays. Their atlas textures never varied by biome.
4. **Few floor surfaces, low resolution and visible tiling.**
   - Room floors use two 1254 px atlases of four quadrants each: eight surfaces in total.
   - Each quadrant is 627 px stretched across 4 m (about 157 px per metre) and repeats every 4 m.
   - There is no large-scale variation to break up the repeat.
5. **Nothing grounds the walls and props.**
   - There is no grime, dust or damp where a wall meets the floor.
   - Props have no contact stain beneath them, so they read as placed rather than settled.
6. **The green-screen keyer cuts hard edges.**
   - `applyGreenChromaKey` (`src/textureKeying.js`) is a binary flood fill from the image border.
   - Any soft, feathered sticker edge therefore becomes either a green fringe or a hard cut. Part 3 fixes this offline.

---

## Part 1 — What games use to make a world feel lived in

These are the standard tools, roughly in order of impact per effort. "Have" means it is already in the game.

| Technique | What it is | Status here |
|---|---|---|
| **Set dressing with intent** | Props placed as if someone used them: a chair pushed back, a mug left beside the console. | Have, in rooms. Missing in corridors and outdoors (Part 6). |
| **Vignettes and environmental storytelling** | Small, deliberate scenes that tell a story without words: a last stand, a meal abandoned mid-bite. | Have (vignette layer). Extend to corridors and outdoors. |
| **Clutter density gradient** | Dense along walls and in corners, sparse in the centre. The paths people walked stay clear. | Partly: the clutter ring. Add path awareness (Part 5.5). |
| **Decals** | Flat stickers projected onto surfaces: stains, scuffs, posters, cracks, tracks. Cheap, and they turn generic surfaces into specific places. | Have 60, room-only. Add 20 (Part 3). |
| **Edge and contact grime** | Dirt where the wall meets the floor, a dark ring under every heavy object, drip streaks under pipes. The single biggest "this is real" cue. | Missing (Part 5.3). |
| **Material blending (splat maps)** | One floor shader holds several surfaces plus a painted weight map that says how much of each to show. Edges are mixed rather than cut. | Missing. The core of Part 5. |
| **Height-based blending** | The blend uses each surface's height map, so mud fills the cracks first and stones poke through. It produces a brushed edge instead of a fuzzy one. | Missing (Part 5.2). |
| **Transition strips** | Purpose-made edge decals along a boundary, such as frost creeping onto metal or resin crawling over the floor. | Missing (D1–D4, D9). |
| **Tiling breakup** | A large, low-frequency variation map multiplied over the tiled surface, plus random rotation or offset per tile, so the repeat stops showing. | Partly: the base floor has three scales. Missing on room floors (T11). |
| **Path wear** | Polished, cleaner lanes where feet travel between doors, and grime everywhere else. | Missing (Part 5.5). |
| **Ambient motion** | Dust in light beams, drips, steam puffs, cables swaying, flickering signs, paper skittering past vents. A still world reads as dead. | Partly: steam, drips and some flicker exist. Part 7. |
| **Practical light pools** | Light that comes from the props themselves (lamps, stoves, screens), leaving the gaps between them dark. | Have (env-light pool, `life_*` heaters). |
| **Landmarks** | One big, unique silhouette per area, so players know where they are. | Partly: Sprint 53 landmarks. Add outdoor landmarks (Part 6). |
| **Room tone** | A sound bed per space: hum, wind, distant machinery. | Out of scope here; noted for audio. |

---

## Part 2 — Forty new lived-in props (41–80)

These follow the style of the last twenty (1–40 sheet, Part 3): sensual, anatomical biomechanics turned into furniture, fixtures and tools. There is no nudity or sexual act. The weighting changes: most of this batch goes where the first forty could not, in corridors, outdoors, cryo, hive, cave, chapel, camps, engineering and the crash site.

None of these duplicates a model in `WORLD_3D_MODELS` (267 keys as of today), the 27 Sprint 53 §A requests, or `life_*` 1–40. Near misses were checked and replaced:
- the fallen rib arch already exists, so 51 is a shed limb instead;
- the resin debris knot already exists, so 62 is a dew funnel instead;
- the camp graves already exist, so 53 is a guide-rope line instead.

**Pipeline** (unchanged):
1. Generate the studio-lit image.
2. Run image-to-3D.
3. Drop the GLB in `art/raw/`.
4. Run an ingest script copied from `scripts/blender/ingest_lived_in_props_20261008.py`, which builds the runtime GLBs into `public/3d/runtime/new3ds/`.
5. Register each prop in `WORLD_3D_MODELS`, give it a `propBehavior`, and check it in the showroom.

Use the **Negative block (3D props)** from [Sprint 53 §A](sprint-53-world-variety-night-and-sleep-2026-10-07.md) in the negative field.

**Behaviour key:**
- **wall:** a wall fixture whose flat back plate sits against the wall and which reaches at most 0.5 m out. It is nonblocking.
- **low:** nonblocking clutter.
- **solid:** has a collider.
- **light:** can feed one practical light through the env-light pool.

Corridor props must leave at least one clear cell, so in single-cell hallways only **wall** and **low** props are allowed.

| # | Asset | File | Where | Size | Tris | Accent | Behaviour |
|---|---|---|---|---|---|---|---|
| **Corridors and bunker halls** |||||||
| 41 | Cochlear intercom station | `life_cochlear_intercom.glb` | hall walls, outside doors | 0.9 m tall, 0.35 m deep | 3k | amber | wall |
| 42 | Collapsed ceiling-panel heap | `life_ceiling_collapse.glb` | wide halls, junctions | 0.6 m tall, 1.6 m across | 5k | none | solid, low profile |
| 43 | Ribcage rescue cabinet | `life_ribcage_rescue_cabinet.glb` | hall walls | 1.4 m tall, 0.4 m deep | 4k | red | wall |
| 44 | Checkpoint stool and log podium | `life_checkpoint_post.glb` | dead ends, beside doors | 1.3 m tall | 5k | amber | solid, light |
| 45 | Pneumatic message-tube junction | `life_pneumatic_tube_node.glb` | hall walls | 1.8 m tall, 0.4 m deep | 5k | amber | wall |
| 46 | Jaw-wringer janitor cart | `life_janitor_cart.glb` | halls, decon | 1.0 m tall | 4k | none | solid |
| 47 | Vertebral wayfinding totem | `life_wayfinding_totem.glb` | junctions | 2.0 m tall, 0.5 m wide | 4k | amber | solid, thin, light |
| 48 | Dropped kit pile | `life_dropped_kit_pile.glb` | anywhere | 0.35 m tall, 1.0 m across | 3k | none | low |
| **Outdoor ground (FIELD, CANYON, CRATER, RUINS)** |||||||
| 49 | Seismic charge drill rig | `life_seismic_drill.glb` | field, crater | 2.2 m tall | 6k | amber | solid, light |
| 50 | Half-buried supply drop pod | `life_supply_drop_pod.glb` | crater, field | 1.6 m tall, 2.4 m long | 8k | amber | solid |
| 51 | Colossal shed limb (landmark) | `life_colossal_limb.glb` | ruins, canyon | 3.5 m tall, 7 m long | 14k | green | solid, landmark |
| 52 | Windsock sensor mast | `life_wind_mast.glb` | field, crater rim | 3.0 m tall | 4k | red | solid, thin |
| 53 | Guide-rope stake line | `life_guide_rope_stakes.glb` | field, canyon | 1.1 m tall, 3 m long | 3k | amber | low |
| 54 | Fallen comm dish | `life_fallen_comm_dish.glb` | crater, ruins | 1.8 m tall, 3.2 m across | 9k | none | solid |
| 55 | Tarp lean-to shelter | `life_tarp_leanto.glb` | field, canyon | 1.5 m tall, 2.2 m long | 6k | amber | solid |
| 56 | Pipeline trestle segment | `life_pipeline_trestle.glb` | field, canyon | 2.0 m tall, 4 m long | 8k | none | solid |
| **Cryo** |||||||
| 57 | Ice-sled hauling rig | `life_ice_sled.glb` | cryo halls, storage | 0.9 m tall, 2.0 m long | 5k | cyan | solid |
| 58 | Ice-core sample rack | `life_ice_core_rack.glb` | cryo lab | 1.6 m tall | 6k | cyan | solid |
| 59 | Ice-bore winch tripod | `life_ice_bore_winch.glb` | cryo rooms, frozen outdoor ground | 2.1 m tall | 6k | cyan | solid |
| 60 | Parka hooks and warmer tin | `life_parka_hooks.glb` | cryo walls, airlocks | 1.7 m tall, 0.35 m deep | 4k | amber | wall |
| **Bio and hive** |||||||
| 61 | Brood comb wall | `life_brood_comb.glb` | hive and bio walls | 1.8 m tall, 1.4 m wide, 0.4 m deep | 7k | green | wall |
| 62 | Hive dew funnel | `life_hive_dew_funnel.glb` | hive, bio | 1.5 m tall | 5k | green | solid |
| 63 | Hive feeding bladder | `life_hive_feeding_bladder.glb` | hive | 1.0 m tall, 1.2 m across | 5k | green | solid |
| 64 | Assimilated workstation | `life_assimilated_desk.glb` | bio lab, hive edges | 1.3 m tall, 1.6 m wide | 7k | green | solid |
| 65 | Fungal cable bundle | `life_fungal_cable_bundle.glb` | bio halls | 1.2 m tall, 0.4 m deep | 4k | green | wall, light |
| **Cave** |||||||
| 66 | Ore cart on a rail stub | `life_ore_cart.glb` | cave, canyon | 1.0 m tall, 1.6 m long | 6k | amber | solid |
| 67 | Drip-collector bucket ring | `life_drip_buckets.glb` | cave, leaking rooms | 0.5 m tall, 1.2 m across | 3k | none | low |
| 68 | Rope-bridge anchor post | `life_rope_anchor_post.glb` | canyon edges, cave | 1.4 m tall | 4k | amber | solid |
| **Chapel and cathedral** |||||||
| 69 | Biomechanical confessional | `life_confessional.glb` | chapel, cathedral | 2.3 m tall, 1.4 m wide | 8k | amber | solid |
| 70 | Devotional wire tree | `life_devotion_tree.glb` | chapel, camps | 1.9 m tall | 5k | amber | solid, light |
| 71 | Pew segment with kneeler | `life_pew_segment.glb` | chapel, cathedral | 1.0 m tall, 2.2 m long | 6k | none | solid |
| **Camps** |||||||
| 72 | Field barber chair | `life_barber_chair.glb` | all three camps | 1.3 m tall | 6k | amber | solid |
| 73 | Meat smoking rack | `life_meat_smoking_rack.glb` | Tallow | 1.8 m tall | 6k | amber | solid, light |
| 74 | Exosuit training dummy | `life_training_dummy.glb` | Vesper | 1.9 m tall | 6k | none | solid |
| 75 | Lookout perch | `life_lookout_perch.glb` | Meridian | 2.6 m tall | 6k | amber | solid |
| **Engineering** |||||||
| 76 | Spinal welding station | `life_welding_station.glb` | engineering, workshop | 1.4 m tall | 6k | amber | solid |
| 77 | Exosuit teardown bench | `life_exosuit_teardown.glb` | engineering, armory | 1.1 m tall, 2.0 m long | 8k | amber | solid |
| 78 | Jury-rigged fuse bypass | `life_fuse_bypass_panel.glb` | engineering walls, halls | 1.6 m tall, 0.3 m deep | 4k | red | wall |
| **Crash site** |||||||
| 79 | Escape-pod seat row | `life_pod_seat_row.glb` | crash site | 1.4 m tall, 2.2 m wide | 7k | red | solid |
| 80 | Smouldering hull shard | `life_hull_shard_smoldering.glb` | crash site, crater | 1.8 m tall, 3.0 m long | 8k | amber | solid, light |

The total is about 230k triangles, close to the first forty (227k).

The style tail is identical on every block, so each prompt is complete on its own.

### Corridors and bunker halls

**41. Cochlear intercom station** — `life_cochlear_intercom.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE wall-mounted corridor intercom station on a flat gunmetal back plate: a spiralled cochlear speaker horn of ivory bone and ribbed cartilage coiling out of the plate, a black-latex larynx-like microphone sac on a braided cable hanging from a hook below, a worn push-to-talk lever polished bright by thumbs, a cracked glass call lamp glowing dull amber (#f59e0b), dust in the speaker grille. Used every day, then left calling into nothing. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**42. Collapsed ceiling-panel heap** — `life_ceiling_collapse.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE low heap of fallen ceiling debris lying on its own: three buckled gunmetal ceiling panels stacked at angles, a snapped vertebral cable-tray segment with ribbed black-latex cables spilling out like torn tendons, shattered light-diffuser glass, crumbled insulation and plaster dust, one dangling fluorescent tube cracked in half. Recent, heavy, blocking half a corridor. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**43. Ribcage rescue cabinet** — `life_ribcage_rescue_cabinet.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE wall-mounted emergency rescue cabinet on a flat gunmetal back plate: its door is a hinged cage of curved ivory-bone ribs swung half open, behind them an emptied black-latex lined cavity with the outlines of missing tools, one fire axe still clipped in place, a torn first-aid pouch hanging out, a smashed break-glass panel, and a red (#ef4444) alarm bead glowing at the top. Someone needed it in a hurry. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**44. Checkpoint stool and log podium** — `life_checkpoint_post.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE small guard checkpoint on one shared footprint: a tall gunmetal stool whose seat is a worn black-latex saddle on a vertebral column, a slim podium beside it shaped like a sternum holding a thick water-swollen logbook with a pen on a chain, a dented thermos, a ration-can ashtray full of butts, and a hooded work lamp clamped to the podium glowing warm amber (#f59e0b). Long, bored night shifts. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no readable writing, no people, 1:1 aspect ratio.
```

**45. Pneumatic message-tube junction** — `life_pneumatic_tube_node.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE wall-mounted pneumatic message-tube junction on a flat gunmetal back plate: three translucent amber-tinted glass tubes descending into a bulbous ribbed receiving chamber shaped like a pair of lungs, a brass-and-bone hinged hatch hanging open, a jammed message canister wedged in one tube, a pressure gauge with a cracked face, and a small amber (#f59e0b) arrival lamp. Messages that never got answered. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**46. Jaw-wringer janitor cart** — `life_janitor_cart.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE janitor's cleaning cart: a wheeled gunmetal mop bucket of grey-brown water with a wringer shaped like a hinged bony jaw with ribbed latex gums, a stringy mop leaning in it, a rack of dented spray bottles and a coiled black-latex hose, a torn bin bag hanging from the handle, a wet-floor tripod folded on the side. Someone kept this place clean until the end. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**47. Vertebral wayfinding totem** — `life_wayfinding_totem.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE free-standing wayfinding totem: a tall column of stacked gunmetal vertebrae on a weighted floor plate, four ivory-bone arrow blades fanning out at different heights pointing different ways, each blade inset with a thin amber (#f59e0b) light strip, one blade snapped and hanging by its cable, tally scratches and survivor chalk marks on the column, no letters. A corridor junction everyone stopped at. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no readable writing, no people, 1:1 aspect ratio.
```

**48. Dropped kit pile** — `life_dropped_kit_pile.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE low pile of dropped personal kit lying on its own: a slumped canvas duffel bag half unzipped, a cracked helmet with a black-latex chin cup, a spilled roll of grey bandage, a dented canteen, a single glove, and a rosary of tiny bone beads tangled in the strap. Dropped mid-run and never picked up. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

### Outdoor ground

**49. Seismic charge drill rig** — `life_seismic_drill.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE portable seismic survey drill on three splayed vertebral legs: a ribbed gunmetal drill column with a spiralled bone auger bit half sunk into a mound of grey regolith around its base, a black-latex hydraulic bladder pump strapped to one leg, a coil of detonator cable, a crate of capped charge tubes, and a beacon lamp on top glowing amber (#f59e0b). A survey crew's last job. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**50. Half-buried supply drop pod** — `life_supply_drop_pod.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE supply drop pod lying tilted and half buried in a small mound of grey regolith: a scorched, egg-shaped gunmetal capsule with ablative plates peeled back like petals, its hatch split open showing black-latex padded cradles with some supply canisters still strapped in and others missing, a tangled drogue chute of torn fabric trailing out, and one amber (#f59e0b) locator light still blinking. Help that arrived too late. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**51. Colossal shed limb** — `life_colossal_limb.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE colossal shed alien limb lying on its side as a landmark: one enormous segmented chitin leg, many times human size, bent at a knee joint and half sunk into a drift of grey regolith, its hollow translucent shell cracked open to show ribbed cartilage tendons and dried resin inside, scavenged plates pried off one segment with a ladder of human rope and pitons climbing it, faint green (#22c55e) bioluminescence pooled in the joint. Something huge moulted here and walked on. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering in the chitin, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**52. Windsock sensor mast** — `life_wind_mast.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE tall thin weather mast on a guyed tripod foot: a vertebral gunmetal pole, a torn striped windsock streaming sideways, a spinning cup anemometer with one cup missing, a ribbed black-latex sensor pod like a swollen gland strapped halfway up, frayed guy wires with bone tensioners, and a red (#ef4444) aircraft warning light at the tip. A lonely instrument still reporting. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**53. Guide-rope stake line** — `life_guide_rope_stakes.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE short line of three storm guide stakes on one shared footprint: thick gunmetal stakes driven at slight angles, each topped with a knuckled bone eyelet, a heavy braided rope sagging between them, faded reflective tags tied along the rope, and a small amber (#f59e0b) reflector disc on each stake head. How people found their way home in the dust storms. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**54. Fallen comm dish** — `life_fallen_comm_dish.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE toppled communications dish lying on its rim: a large cracked parabolic dish of ribbed gunmetal panels shaped like a flared ear, its bony feed-horn arm snapped and bent, black-latex waveguide cables torn from the hub like severed nerves, a buckled lattice mount still bolted to its broken base, and dust drifted into the bowl. The colony's voice, gone silent. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**55. Tarp lean-to shelter** — `life_tarp_leanto.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE improvised lean-to shelter: a stained, patched tarp stretched over two curved ivory rib-bone poles and lashed to a gunmetal crate, a rolled bedroll and a dented pot underneath, a ring of stones around a dead cookfire in front, a hand-crank lantern hanging from the ridge glowing amber (#f59e0b). One person's whole life out in the open. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**56. Pipeline trestle segment** — `life_pipeline_trestle.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE segment of overland pipeline on two trestle supports: a thick ribbed pipe of black latex over gunmetal, segmented like a trachea, resting on two A-frame supports with bone-knuckle clamps, one joint leaking a frozen drip, a maintenance valve wheel, frost and dust caked on the top side, and the pipe ends cut clean so the segment can repeat. Infrastructure crossing an empty world. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

### Cryo

**57. Ice-sled hauling rig** — `life_ice_sled.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE hauling sled: long curved runners of ivory bone shod with gunmetal, a cargo bed of frost-rimed black-latex straps holding two coolant canisters and a frozen tarp bundle, a padded harness yoke lying in front where a person pulled it, icicles on the runners, and a small cyan (#22d3ee) canister status light. Hard labour in the cold. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering in the ice, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**58. Ice-core sample rack** — `life_ice_core_rack.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE upright sample rack of gunmetal ribs: rows of long clear tubes each holding a cylindrical ice core with dark banded layers and tiny trapped specks, some tubes frosted over, two missing and one shattered on the base, black-latex insulation sleeves on the top row, and a cyan (#22d3ee) chiller light along the base. Patient science, abandoned. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering in the ice, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**59. Ice-bore winch tripod** — `life_ice_bore_winch.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE ice-bore winch: a tripod of three frost-crusted vertebral legs over a round bore hole ringed with chipped ice, a hand-crank drum winch wound with black-latex cable dropping into the hole, a bucket of ice chips, a folded camp stool, and a cyan (#22d3ee) depth lamp on the crown. Someone fished for water here every day. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering in the ice, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**60. Parka hooks and warmer tin** — `life_parka_hooks.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE wall-mounted coat rail on a flat gunmetal back plate: a row of curved bone hooks holding two heavy frost-stiffened parkas with fur-lined hoods and a black-latex thermal undersuit, mittens clipped on strings, a shelf above holding a dented hand-warmer tin glowing warm amber (#f59e0b) through its vents, and boots below standing in a meltwater tray. The ritual of going out into the cold. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

### Bio and hive

**61. Brood comb wall** — `life_brood_comb.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE wall-mounted section of alien brood comb with a flat back: a slab of hexagonal translucent chitin cells grown over a gunmetal wall panel, some cells sealed with glistening membrane caps, some empty and torn open, a few holding curled dark shapes, wet resin threads drooping between them, and a faint green (#22c55e) bioluminescence deep inside the cells. The hive nursing its young in human architecture. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering in the chitin, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**62. Hive dew funnel** — `life_hive_dew_funnel.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE hive-grown water collector: a tall flared funnel of thin translucent chitin like an opening flower or an ear, ribbed veins running down its throat into a swollen glistening bladder at the base, a dangling stalactite of resin, a human tin cup someone left under the drip, and green (#22c55e) bioluminescence in the bladder. The hive drinks, and so did the survivors. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering in the chitin, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**63. Hive feeding bladder** — `life_hive_feeding_bladder.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE alien feeding bladder resting on a root-like base of ribbed cartilage: a large swollen translucent sac veined with dark vessels, several soft nipple-like feeding teats around its upper curve beading thick fluid, wet resin pooling at the base, and a slow green (#22c55e) glow inside. A grotesque but tender nursery fixture. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering in the sac, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**64. Assimilated workstation** — `life_assimilated_desk.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE human office workstation being absorbed by the hive: a gunmetal desk with a cracked monitor, a keyboard and a coffee mug, all half engulfed in a creeping overgrowth of glistening resin and translucent chitin plates, cartilage ribs fused into the desk legs, the chair melted into the floor growth, papers fossilised under resin, and green (#22c55e) bioluminescent veins crawling across the dark screen. The workday the hive took over. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**65. Fungal cable bundle** — `life_fungal_cable_bundle.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE wall-mounted cable bundle on a flat gunmetal back plate: a thick braid of ribbed black-latex power cables running out of a cracked junction box and arcing back into the plate, colonised along its length by pale shelf fungus, translucent gill-like frills and tiny glowing green (#22c55e) caps, damp spore dust under every bracket. The station's nerves growing something new. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering in the fungus, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

### Cave

**66. Ore cart on a rail stub** — `life_ore_cart.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE mining ore cart sitting on a short buckled section of rail: a riveted gunmetal tub on bone-spoked wheels, heaped with dark rubble and pale mineral crystals, a pickaxe and a black-latex hose slung over the rim, a hooked chain dangling, a dented miner's helmet with an amber (#f59e0b) headlamp hung on the cart handle. A shift that never clocked out. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**67. Drip-collector bucket ring** — `life_drip_buckets.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE low cluster of mismatched drip-catching vessels on one shared footprint: a dented steel bucket, a split helmet, a cut-down canister and a bone-white bowl arranged in a rough ring, each half full of cloudy water with mineral scum, a black-latex hose siphoning from the largest into a jerry can, and a rag laid over the rim of one. Patient survival, one drop at a time. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**68. Rope-bridge anchor post** — `life_rope_anchor_post.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE rope-bridge anchor on its own: a heavy gunmetal post driven into a block of rock, braced by a curved bone strut, with two thick braided ropes knotted around it and cut off short as if the bridge fell, a ratchet tensioner, a hanging carabiner chain, and a hooded amber (#f59e0b) marker lamp on top. Where a crossing used to be. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

### Chapel and cathedral

**69. Biomechanical confessional** — `life_confessional.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE tall two-stall confession booth: a narrow cabinet of dark gunmetal and polished ivory bone with a curved vaulted top like a ribcage, two hinged doors with ribbed black-latex padded panels, a pierced bone lattice screen between the stalls, worn kneeling pads, a small amber (#f59e0b) lamp in a skull-like niche on top, and a curtain of beaded vertebrae across one doorway. Where survivors unburdened themselves. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no crosses, no people, 1:1 aspect ratio.
```

**70. Devotional wire tree** — `life_devotion_tree.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE devotional tree made by survivors: a twisted trunk of braided gunmetal wire and cable rising from a cracked bone base, branching into fine wire twigs hung with hundreds of small offerings — dog-tags, tiny bone charms, ribbons of torn fabric, keys, a child's shoe — with stub candles in welded cups at the base glowing warm amber (#f59e0b). Grief turned into something shared. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no crosses, no people, 1:1 aspect ratio.
```

**71. Pew segment with kneeler** — `life_pew_segment.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE short pew bench: a seat and high back carved from interlocking ivory vertebrae and gunmetal ribs, a cushion of cracked black latex worn shiny in two places, a hinged kneeler rail below, a worn prayer book and a pair of reading glasses left on the seat, candle wax drips down one arm. Someone sat here every evening. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no crosses, no people, 1:1 aspect ratio.
```

### Camps

**72. Field barber chair** — `life_barber_chair.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE improvised barber's chair: an old reclining operator seat of cracked black latex on a hydraulic vertebral pedestal, a cracked mirror shard wired to a pole beside it, a crate table holding clippers, a straight razor, a tin of lather and a towel, clumps of cut hair on the footrest, and a hanging bulb glowing warm amber (#f59e0b). Small dignity in a ruined world. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**73. Meat smoking rack** — `life_meat_smoking_rack.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE smoking rack: a tall frame of lashed bone poles and gunmetal pipe over a smouldering pit of embers glowing amber (#f59e0b), strips of dark smoked alien meat and pale chitin-skinned cuts hanging on wire hooks, a sheet of scorched tin as a smoke hood, a wooden paddle and a bucket of wood chips at its foot. Tallow camp's grim, practical larder. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**74. Exosuit training dummy** — `life_training_dummy.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE combat training dummy: an empty dented exosuit torso and helmet bolted onto a vertebral post on a weighted base, its chest plate pocked with bullet dents and slash marks, sandbag padding strapped to the arms, black-latex seals torn at the joints, a target ring painted on the chest, and one arm hanging from a single cable. Vesper camp drills every morning. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**75. Lookout perch** — `life_lookout_perch.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE raised lookout perch: a small platform on four splayed vertebral stilts with a bone-rung ladder, a padded black-latex seat, a tripod-mounted pair of heavy binoculars, a rolled radio antenna whip, a thermos and a blanket, and a hooded amber (#f59e0b) signal lamp on a swing arm. Meridian camp never stops watching. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

### Engineering

**76. Spinal welding station** — `life_welding_station.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE welding station: a heavy gunmetal work table with a vice, two gas cylinders strapped to a vertebral rack behind it, coiled black-latex gas hoses like veins running to a welding torch, a cracked welding mask hanging on a bone hook, scorch marks and spatter beads across the table, and a half-welded patch plate still glowing dull amber (#f59e0b) at its seam. Repairs that kept everyone alive. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**77. Exosuit teardown bench** — `life_exosuit_teardown.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE long repair bench with an exosuit laid out on it in pieces: the opened chest shell, a detached arm with its ribbed black-latex muscle sleeve peeled back to show bone-like actuators, a helmet with its visor removed, trays of bolts and servos, a work lamp on a jointed arm glowing amber (#f59e0b), and an empty drink can among the tools. Mid-repair, abandoned. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**78. Jury-rigged fuse bypass** — `life_fuse_bypass_panel.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE wall-mounted fuse cabinet on a flat gunmetal back plate: its door torn off, rows of ceramic fuses with several burnt black, a jury-rigged bypass of bare copper and ribbed black-latex jumper cables clamped across the gaps with bone clips, electrical tape everywhere, scorch marks fanning up the plate, and one red (#ef4444) overload lamp glowing. A dangerous fix that kept the lights on. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

### Crash site

**79. Escape-pod seat row** — `life_pod_seat_row.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE row of three escape-pod crash seats torn from their floor rail and lying tilted: curved seat shells of gunmetal and bone with padded black-latex cradles, harness straps cut and dangling, one oxygen mask swinging from its hose, a scorched floor-rail stub still bolted under them, and a red (#ef4444) emergency strip light flickering along the base. Three people got out of these. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

**80. Smouldering hull shard** — `life_hull_shard_smoldering.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE large curved shard of starship hull lying on its edge: layered gunmetal armour plate torn like a broken rib, its inner face showing ribbed black-latex insulation and bone-like structural struts, edges melted and buckled from re-entry, glowing amber (#f59e0b) embers smouldering in the torn layers, soot streaks and a few dangling cables. A piece of the ship that brought you here. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no people, 1:1 aspect ratio.
```

---

## Part 3 — Twenty chroma-green stickers (D1–D20)

These are flat decals: generated on chroma green, keyed, and laid over floors and walls. **D1–D10 are the blend kit**: edge strips and soft patches whose job is to hide where one surface meets another (Part 5). **D11–D20 are detail stickers** that add story.

None duplicates the 60 `decal_*` PNGs already in `public/`.

### How to make them key cleanly

The runtime keyer is a hard flood fill, so soft edges will not survive it. Each sticker therefore goes through an offline matte instead:

1. Generate the image on pure `#00FF00`.
2. Run a new `scripts/art/key_decals.py`. It computes alpha from each pixel's distance to the key colour (a difference matte, not a cut), removes green spill from the edge pixels, trims the result, and writes a WebP with real alpha.
3. The runtime loader sees real alpha and skips its own keyer (`loadKeyedDecalTexture` only keys images that have no alpha).

Three rules in the prompts help the matte:

- **Edges break up into grains, specks and droplets**, not a smooth blur. Grit keys cleanly; a long soft gradient over green turns murky.
- **No green in the subject.** Bio and hive stickers would lose their green to the key, so D3 and D9 are generated on **magenta (`#FF00FF`)** instead. This is the one exception to the green rule; decision O1 in Part 8.
- **Strips tile left to right.** D1–D4, D7, D8, D16 and D18 run edge to edge and are generated wide (4:1, or 2:1 if the tool caps the ratio). They repeat along a wall or boundary without a visible join.

| # | Sticker | File | Use | Shape | Key |
|---|---|---|---|---|---|
| **Blend kit** ||||||
| D1 | Wall-base grime strip | `decal_edge_wallbase_grime` | every wall–floor edge, floor side | strip | green |
| D2 | Frost creep strip | `decal_edge_frost_creep` | cryo ↔ bunker boundaries | strip | green |
| D3 | Resin creep strip | `decal_edge_resin_creep` | bio/hive ↔ bunker boundaries | strip | **magenta** |
| D4 | Dust drift strip | `decal_edge_dust_drift` | outdoor ↔ indoor thresholds, airlocks | strip | green |
| D5 | Tracked-mud doorway fan | `decal_blend_mud_fan` | both sides of every door | patch | green |
| D6 | Rust bloom | `decal_blend_rust_bloom` | breaking up metal-floor tiling | patch | green |
| D7 | Worn traffic path | `decal_blend_scuff_path` | door-to-door lanes | strip | green |
| D8 | Cracked material seam | `decal_blend_cracked_seam` | over any floor material change | strip | green |
| D9 | Spore dust drift | `decal_blend_spore_dusting` | bio ring edges, around hive props | patch | **magenta** |
| D10 | Contact grime ring | `decal_contact_grime` | under every grounded prop | patch | green |
| **Detail stickers** ||||||
| D11 | Worn lane chevrons | `decal_floor_lane_chevrons` | hangars, wide halls, engineering | patch | green |
| D12 | Cigarette butts and ash | `decal_butts_and_ash` | beside seating, checkpoints, camps | patch | green |
| D13 | Burst ration pack | `decal_spilled_rations` | mess, quarters, camps | patch | green |
| D14 | Loose damp paperwork | `decal_paper_scatter` | offices, ops, halls | patch | green |
| D15 | Spent casings | `decal_spent_casings` | last-stand spots, armory, security | patch | green |
| D16 | Soot plume (wall) | `decal_wall_soot_plume` | above heaters, vents, burnt panels | strip, vertical | green |
| D17 | Mineral drip streaks (wall) | `decal_wall_mineral_streaks` | below pipes and fixtures | patch, vertical | green |
| D18 | Taped cable run | `decal_floor_taped_cables` | across floors to lamps and stoves | strip | green |
| D19 | Faded home mural (wall) | `decal_wall_home_mural` | quarters, camps, mess | patch | green |
| D20 | Alien three-toed tracks | `decal_alien_tracks` | hive edges, outdoor ground, through halls | strip | green |

### Prompts

**D1. Wall-base grime strip** — `decal_edge_wallbase_grime`
```text
Photorealistic top-down orthographic decal texture, camera pointing perfectly straight down, no perspective, flat even shadowless lighting with no baked highlights: a long horizontal band of accumulated grime where a wall meets a metal floor — dense black-brown oily dirt, dust, rust flakes and grit packed thick along the top edge, thinning downward into scattered specks, crumbs and dried drip marks, with a few cigarette-butt-sized bits of debris caught in it. The band runs from the left edge of the frame to the right edge and tiles seamlessly left to right. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro grit, photoreal PBR albedo. Isolated on a solid flat pure chroma green (#00FF00) background filling everything above and below the band; the lower edge breaks up into scattered grains and specks, not a smooth blurred fade; no green anywhere in the decal, no green reflections or spill, no cast shadow, no floor texture outside the decal, no border, no text, no logos, 4:1 aspect ratio.
```

**D2. Frost creep strip** — `decal_edge_frost_creep`
```text
Photorealistic top-down orthographic decal texture, camera pointing perfectly straight down, no perspective, flat even shadowless lighting with no baked highlights: a long horizontal band of frost creeping across a floor — solid white-blue rime and clear ice thick along the top edge, branching downward into feathered frost crystals, fern-like ice dendrites and isolated frozen droplets, a faint cyan (#22d3ee) tint in the thickest ice. The band runs from the left edge of the frame to the right edge and tiles seamlessly left to right. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail, photoreal PBR albedo. Isolated on a solid flat pure chroma green (#00FF00) background filling everything above and below the band; the lower edge breaks up into individual crystals and specks, not a smooth blurred fade; no green anywhere in the decal, no green reflections or spill, no cast shadow, no floor texture outside the decal, no border, no text, no logos, 4:1 aspect ratio.
```

**D3. Resin creep strip** — `decal_edge_resin_creep` (magenta key)
```text
Photorealistic top-down orthographic decal texture, camera pointing perfectly straight down, no perspective, flat even shadowless lighting with no baked highlights: a long horizontal band of alien hive resin creeping across a floor — thick glistening amber-brown resin and translucent chitin plates along the top edge, reaching downward in ropy veins, branching tendrils and isolated wet beads, with faint green (#22c55e) bioluminescent flecks in the thickest resin. The band runs from the left edge of the frame to the right edge and tiles seamlessly left to right. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail, photoreal PBR albedo. Isolated on a solid flat pure magenta (#FF00FF) background filling everything above and below the band; the lower edge breaks up into tendrils and droplets, not a smooth blurred fade; no magenta or pink anywhere in the decal, no magenta reflections or spill, no cast shadow, no floor texture outside the decal, no border, no text, no logos, 4:1 aspect ratio.
```

**D4. Dust drift strip** — `decal_edge_dust_drift`
```text
Photorealistic top-down orthographic decal texture, camera pointing perfectly straight down, no perspective, flat even shadowless lighting with no baked highlights: a long horizontal band of wind-blown grey-ochre regolith dust and fine grit drifted against a doorway sill — thick and rippled along the top edge with small wind ripples and a few pebbles, thinning downward into scattered grains and the faint print of a boot heel. The band runs from the left edge of the frame to the right edge and tiles seamlessly left to right. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro grit, photoreal PBR albedo. Isolated on a solid flat pure chroma green (#00FF00) background filling everything above and below the band; the lower edge breaks up into scattered grains, not a smooth blurred fade; no green anywhere in the decal, no green reflections or spill, no cast shadow, no floor texture outside the decal, no border, no text, no logos, 4:1 aspect ratio.
```

**D5. Tracked-mud doorway fan** — `decal_blend_mud_fan`
```text
Photorealistic top-down orthographic decal texture, camera pointing perfectly straight down, no perspective, flat even shadowless lighting with no baked highlights: a fan-shaped spread of tracked dark mud, grey regolith and wet grime spreading out from a straight top edge where a doorway would be — dense overlapping boot prints and drag marks near the top, fading outward into fewer and fainter prints, smears and scattered crumbs of dirt. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro grit, photoreal PBR albedo. Isolated on a solid flat pure chroma green (#00FF00) background filling everything around the fan; the outer edge breaks up into individual prints, specks and crumbs, not a smooth blurred fade; no green anywhere in the decal, no green reflections or spill, no cast shadow, no floor texture outside the decal, no border, no text, no logos, 1:1 aspect ratio.
```

**D6. Rust bloom** — `decal_blend_rust_bloom`
```text
Photorealistic top-down orthographic decal texture, camera pointing perfectly straight down, no perspective, flat even shadowless lighting with no baked highlights: a large irregular bloom of rust and corrosion on bare metal — deep orange-brown flaking scale and pitted crust in an off-centre core, spreading outward through blistered paint, orange tide lines and powdery rust dust, breaking into isolated pits and specks at the rim. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail, photoreal PBR albedo. Isolated on a solid flat pure chroma green (#00FF00) background filling everything around the bloom; the outer edge breaks up into isolated pits and specks, not a smooth blurred fade; no green anywhere in the decal, no green reflections or spill, no cast shadow, no metal texture outside the decal, no border, no text, no logos, 1:1 aspect ratio.
```

**D7. Worn traffic path** — `decal_blend_scuff_path`
```text
Photorealistic top-down orthographic decal texture, camera pointing perfectly straight down, no perspective, flat even shadowless lighting with no baked highlights: a long horizontal lane of floor wear where people walked for years — polished bright scuffs, overlapping rubber heel marks, fine parallel scratches, grime worn away in the middle and packed darker along both sides, a few dropped crumbs. The lane runs from the left edge of the frame to the right edge and tiles seamlessly left to right. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail, photoreal PBR albedo. Isolated on a solid flat pure chroma green (#00FF00) background filling everything above and below the lane; both long edges break up into scattered scuffs and specks, not a smooth blurred fade; no green anywhere in the decal, no green reflections or spill, no cast shadow, no floor texture outside the decal, no border, no text, no logos, 4:1 aspect ratio.
```

**D8. Cracked material seam** — `decal_blend_cracked_seam`
```text
Photorealistic top-down orthographic decal texture, camera pointing perfectly straight down, no perspective, flat even shadowless lighting with no baked highlights: a long horizontal seam where two floor materials meet and have broken — a jagged crack line filled with packed grime, crumbled grout, rust flakes and small chips, hairline cracks branching off both sides, dust and pale lichen-like specks settled in the gaps. The seam runs from the left edge of the frame to the right edge and tiles seamlessly left to right. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail, photoreal PBR albedo. Isolated on a solid flat pure chroma green (#00FF00) background filling everything above and below the seam; both edges break up into hairline cracks, chips and specks, not a smooth blurred fade; no green anywhere in the decal, no green reflections or spill, no cast shadow, no floor texture outside the decal, no border, no text, no logos, 4:1 aspect ratio.
```

**D9. Spore dust drift** — `decal_blend_spore_dusting` (magenta key)
```text
Photorealistic top-down orthographic decal texture, camera pointing perfectly straight down, no perspective, flat even shadowless lighting with no baked highlights: an irregular drift of fallen alien spores and fungal dust — a dense core of pale ochre and bone-white powder with tiny round spore pods and a few curled translucent filaments, faint green (#22c55e) glowing specks among them, thinning outward into a fine scattered dusting of individual grains. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail, photoreal PBR albedo. Isolated on a solid flat pure magenta (#FF00FF) background filling everything around the drift; the outer edge breaks up into individual grains, not a smooth blurred fade; no magenta or pink anywhere in the decal, no magenta reflections or spill, no cast shadow, no floor texture outside the decal, no border, no text, no logos, 1:1 aspect ratio.
```

**D10. Contact grime ring** — `decal_contact_grime`
```text
Photorealistic top-down orthographic decal texture, camera pointing perfectly straight down, no perspective, flat even shadowless lighting with no baked highlights: a roughly rectangular patch of dark settled grime as left under heavy furniture standing for years — a dense black-brown oily core, a darker rim line where the edge sat, a tide mark of dried spills around it, and dust and grit thinning outward into scattered specks. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro grit, photoreal PBR albedo. Isolated on a solid flat pure chroma green (#00FF00) background filling everything around the patch; the outer edge breaks up into grains and specks, not a smooth blurred fade; no green anywhere in the decal, no green reflections or spill, no cast shadow, no floor texture outside the decal, no border, no text, no logos, 1:1 aspect ratio.
```

**D11. Worn lane chevrons** — `decal_floor_lane_chevrons`
```text
Photorealistic top-down orthographic decal texture, camera pointing perfectly straight down, no perspective, flat even shadowless lighting with no baked highlights: a section of painted industrial floor markings — three bold amber-yellow (#f59e0b) and black chevrons pointing the same way, the paint heavily worn, chipped and scuffed through by traffic and wheels, grime packed into the chips, flakes of paint scattered at the edges. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail, photoreal PBR albedo. Isolated on a solid flat pure chroma green (#00FF00) background filling everything around the markings; edges break up into paint chips and flakes, not a smooth blurred fade; no green anywhere in the decal, no green reflections or spill, no cast shadow, no floor texture outside the decal, no border, no text, no letters, no numbers, no logos, 1:1 aspect ratio.
```

**D12. Cigarette butts and ash** — `decal_butts_and_ash`
```text
Photorealistic top-down orthographic decal texture, camera pointing perfectly straight down, no perspective, flat even shadowless lighting with no baked highlights: a small loose scatter of crushed cigarette butts, a bent hand-rolled stub, a burnt match, grey ash smudges and a few scorch dots where butts were ground out, clustered where someone stood waiting for a long time. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail, photoreal PBR albedo. Isolated on a solid flat pure chroma green (#00FF00) background filling everything around the scatter; the edge breaks up into individual ash flecks, not a smooth blurred fade; no green anywhere in the decal, no green reflections or spill, no cast shadow, no floor texture outside the decal, no border, no text, no logos, 1:1 aspect ratio.
```

**D13. Burst ration pack** — `decal_spilled_rations`
```text
Photorealistic top-down orthographic decal texture, camera pointing perfectly straight down, no perspective, flat even shadowless lighting with no baked highlights: a trampled, burst foil ration pouch with its brown paste smeared out in a boot-print smear, scattered dry biscuit crumbs, a torn wrapper, a bent plastic spoon and a few dried drips. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail, photoreal PBR albedo. Isolated on a solid flat pure chroma green (#00FF00) background filling everything around the spill; the edge breaks up into crumbs and specks, not a smooth blurred fade; no green anywhere in the decal, no green reflections or spill, no cast shadow, no floor texture outside the decal, no border, no text, no logos, no readable writing, 1:1 aspect ratio.
```

**D14. Loose damp paperwork** — `decal_paper_scatter`
```text
Photorealistic top-down orthographic decal texture, camera pointing perfectly straight down, no perspective, flat even shadowless lighting with no baked highlights: a loose scatter of water-stained paper lying flat — overlapping printed forms with unreadable grey blocks of type, a curled punched data card, a bleached photograph too faded to read, a boot print across one sheet, corners curled and soggy. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail, photoreal PBR albedo. Isolated on a solid flat pure chroma green (#00FF00) background filling everything around the papers; crisp paper edges, no smooth blurred fade; no green anywhere in the decal, no green reflections or spill, no cast shadow, no floor texture outside the decal, no border, no readable text, no logos, 1:1 aspect ratio.
```

**D15. Spent casings** — `decal_spent_casings`
```text
Photorealistic top-down orthographic decal texture, camera pointing perfectly straight down, no perspective, flat even shadowless lighting with no baked highlights: a scatter of spent brass rifle casings and a few heavier shotgun hulls lying flat on their sides, densest in one cluster where someone stood and fired, thinning outward, with tiny powder-burn scorch dots, a dropped empty magazine and a snapped bone-white charging handle. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail, photoreal PBR albedo. Isolated on a solid flat pure chroma green (#00FF00) background filling everything around the scatter; crisp object edges, no smooth blurred fade; no green anywhere in the decal, no green reflections or spill, no cast shadow, no floor texture outside the decal, no border, no text, no logos, 1:1 aspect ratio.
```

**D16. Soot plume** — `decal_wall_soot_plume`
```text
Photorealistic orthographic wall decal texture, camera facing the wall perfectly straight on, no perspective, flat even shadowless lighting with no baked highlights: a vertical plume of soot and smoke staining rising from the bottom edge of the frame — a dense black scorched base, rising and widening into layered brown-grey smoke stains with darker tide lines, blistered paint flecks and a few hand-wipe smears, thinning into scattered soot specks at the top. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail, photoreal PBR albedo. Isolated on a solid flat pure chroma green (#00FF00) background filling everything around the plume; the outer edge breaks up into soot specks and flecks, not a smooth blurred fade; no green anywhere in the decal, no green reflections or spill, no cast shadow, no wall texture outside the decal, no border, no text, no logos, 1:2 portrait aspect ratio.
```

**D17. Mineral drip streaks** — `decal_wall_mineral_streaks`
```text
Photorealistic orthographic wall decal texture, camera facing the wall perfectly straight on, no perspective, flat even shadowless lighting with no baked highlights: a cluster of long vertical drip streaks running down from the top edge of the frame — white-grey mineral crust and orange rust trails of different lengths and widths, with crystal beads at their tips, a darker wet core in the longest streak, and fine side runs. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail, photoreal PBR albedo. Isolated on a solid flat pure chroma green (#00FF00) background filling everything around the streaks; the edges break up into beads and flecks, not a smooth blurred fade; no green anywhere in the decal, no green reflections or spill, no cast shadow, no wall texture outside the decal, no border, no text, no logos, 1:2 portrait aspect ratio.
```

**D18. Taped cable run** — `decal_floor_taped_cables`
```text
Photorealistic top-down orthographic decal texture, camera pointing perfectly straight down, no perspective, flat even shadowless lighting with no baked highlights: two ribbed black-latex power cables lying flat side by side and crossing the frame, held down every so often with strips of scuffed grey gaffer tape and one amber-yellow hazard tape strip, the tape edges peeling and grimy, a little dust caught along the cables. The run goes from the left edge of the frame to the right edge and tiles seamlessly left to right. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail, photoreal PBR albedo. Isolated on a solid flat pure chroma green (#00FF00) background filling everything above and below the cables; crisp edges, no smooth blurred fade; no green anywhere in the decal, no green reflections or spill, no cast shadow, no floor texture outside the decal, no border, no text, no logos, 4:1 aspect ratio.
```

**D19. Faded home mural** — `decal_wall_home_mural`
```text
Photorealistic orthographic wall decal texture, camera facing the wall perfectly straight on, no perspective, flat even shadowless lighting with no baked highlights: a hand-painted mural made by survivors on a metal wall — a simple naive landscape of blue sky, a yellow sun, green-free ochre hills, a little house and stick-figure family, painted in chalky house paint, badly faded, flaking and water-damaged, with rust bleeding through the sky and scrape marks across it. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail, photoreal PBR albedo. Isolated on a solid flat pure chroma green (#00FF00) background filling everything around the mural; the edge breaks up into paint flakes and chips, not a smooth blurred fade; no green anywhere in the decal, no green paint, no green reflections or spill, no cast shadow, no wall texture outside the decal, no border, no text, no letters, no logos, 3:2 landscape aspect ratio.
```

**D20. Alien three-toed tracks** — `decal_alien_tracks`
```text
Photorealistic top-down orthographic decal texture, camera pointing perfectly straight down, no perspective, flat even shadowless lighting with no baked highlights: a line of alien footprints crossing the frame left to right — large three-toed clawed prints pressed in a wet film of dark resin and grime, claw drag scratches between steps, droplets flicked from each print, and a faint tail-drag line weaving between them. The track runs from the left edge of the frame to the right edge and tiles seamlessly left to right. In the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail, photoreal PBR albedo. Isolated on a solid flat pure chroma green (#00FF00) background filling everything around the prints; edges break up into droplets and flecks, not a smooth blurred fade; no green anywhere in the decal, no green reflections or spill, no cast shadow, no floor texture outside the decal, no border, no text, no logos, 4:1 aspect ratio.
```

---

## Part 4 — Thirteen new textures (T1–T13)

Today there are eight room-floor surfaces at about 157 px per metre, plus three biome base sets. These textures add new surfaces at 2048 px over 4 m (512 px per metre), plus the two utility maps the blend shader needs.

- Each surface ships as albedo plus a height map. The height map drives the height blend (Part 5.2).
- The ingest script derives height, roughness and normal maps from the albedo: a luminance high-pass for height, then a Sobel filter for the normal. That is good enough for blending and for low-angle light. A real bake can replace any of them later.
- Every surface texture must tile in both directions. The ingest script checks the seam by offsetting the image by half its size and rejects any texture with a visible cross.

| # | Texture | File stem | Replaces or adds | Where |
|---|---|---|---|---|
| T1 | Riveted deck plate with drain channels | `tex_floor_deck_drain` | new hallway surface | corridors |
| T2 | Stained poured concrete | `tex_floor_concrete_stained` | adds | utility, storage, camps |
| T3 | Chitin plates in resin | `tex_floor_chitin_resin` | upgrades `site:hive` | hive, bio edges |
| T4 | Regolith and rock | `tex_ground_regolith` | adds | outdoor FIELD and CRATER ground, cave |
| T5 | Packed dirt with ruts | `tex_ground_rutted_dirt` | adds | outdoor paths, camp grounds |
| T6 | Slush over ice | `tex_floor_slush_ice` | adds | cryo rooms, frozen outdoor ground |
| T7 | Bone terrazzo with gunmetal tracery | `tex_floor_bone_terrazzo` | adds | chapel, cathedral |
| T8 | Ribbed latex anti-slip mat | `tex_floor_latex_mat` | upgrades `medical` | medical, decon |
| T9 | Planks and tarps over metal | `tex_floor_camp_planks` | upgrades `site:camp` | camps |
| T10 | Grating over pipe trench | `tex_floor_grate_trench` | adds | engineering |
| T11 | Macro grime variation (greyscale) | `tex_macro_grime` | new utility map | all floors, tiled over 32 m |
| T12 | Blend breakup noise (greyscale) | `tex_blend_breakup` | new utility map | the brush shape of every blended edge |
| T13 | Wall kick-plate grime band | `tex_wall_kickplate_band` | adds | bottom 0.6 m of every wall |

### Prompts

The tail is the same for T1–T10.

**T1. Riveted deck plate with drain channels**
```text
Seamless tileable photorealistic PBR surface texture of a riveted gunmetal deck floor: large worn plates with countersunk rivets, two narrow drain channels with perforated grates running across, scuffed paint, oily grime in every seam, faint rust at the rivet heads, in the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail. Camera pointing perfectly straight down, orthographic, no perspective, flat even diffuse lighting with no cast shadows, no specular hotspots and no vignette, uniform detail density edge to edge so it tiles seamlessly in both directions, no single focal object, no text, no logos, 1:1 aspect ratio, 2048x2048.
```

**T2. Stained poured concrete**
```text
Seamless tileable photorealistic PBR surface texture of old poured concrete flooring: hairline cracks, expansion joints, darker oil and water stains, embedded grit and small aggregate stones, scuffed patches and faded paint traces, in the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail. Camera pointing perfectly straight down, orthographic, no perspective, flat even diffuse lighting with no cast shadows, no specular hotspots and no vignette, uniform detail density edge to edge so it tiles seamlessly in both directions, no single focal object, no text, no logos, 1:1 aspect ratio, 2048x2048.
```

**T3. Chitin plates in resin**
```text
Seamless tileable photorealistic PBR surface texture of an alien hive floor: overlapping translucent chitin plates in amber-brown and bone tones set in glistening dark resin, ribbed cartilage ridges between them, wet veins and small pores, faint dark green tint deep in the resin, in the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail. Camera pointing perfectly straight down, orthographic, no perspective, flat even diffuse lighting with no cast shadows, no specular hotspots and no vignette, uniform detail density edge to edge so it tiles seamlessly in both directions, no single focal object, no text, no logos, 1:1 aspect ratio, 2048x2048.
```

**T4. Regolith and rock**
```text
Seamless tileable photorealistic PBR surface texture of alien ground: grey-ochre regolith dust and gravel with half-buried flat dark rocks, small wind ripples, pale mineral crust in hollows and tiny glints of crystal, in the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail. Camera pointing perfectly straight down, orthographic, no perspective, flat even diffuse lighting with no cast shadows, no specular hotspots and no vignette, uniform detail density edge to edge so it tiles seamlessly in both directions, no single focal object, no text, no logos, 1:1 aspect ratio, 2048x2048.
```

**T5. Packed dirt with ruts**
```text
Seamless tileable photorealistic PBR surface texture of packed dark dirt ground used as a path: compacted earth with shallow wheel ruts and overlapping old boot prints, small stones pressed in, dried puddle cracks and grit, in the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail. Camera pointing perfectly straight down, orthographic, no perspective, flat even diffuse lighting with no cast shadows, no specular hotspots and no vignette, uniform detail density edge to edge so it tiles seamlessly in both directions, no single focal object, no text, no logos, 1:1 aspect ratio, 2048x2048.
```

**T6. Slush over ice**
```text
Seamless tileable photorealistic PBR surface texture of a frozen floor: cloudy blue-white ice with trapped bubbles and cracks, grey slush and meltwater pooled in shallow hollows, rime crystals and grit frozen into the surface, faint cyan tint in the deepest ice, in the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail. Camera pointing perfectly straight down, orthographic, no perspective, flat even diffuse lighting with no cast shadows, no specular hotspots and no vignette, uniform detail density edge to edge so it tiles seamlessly in both directions, no single focal object, no text, no logos, 1:1 aspect ratio, 2048x2048.
```

**T7. Bone terrazzo with gunmetal tracery**
```text
Seamless tileable photorealistic PBR surface texture of an ornate floor: polished ivory-bone terrazzo with flecks of bone, chitin and dark stone, divided by thin inlaid gunmetal tracery in flowing vertebral and rib-like curves, worn dull along a walking line, hairline cracks and old wax drips, in the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail. Camera pointing perfectly straight down, orthographic, no perspective, flat even diffuse lighting with no cast shadows, no specular hotspots and no vignette, uniform detail density edge to edge so it tiles seamlessly in both directions, no single focal object, no crosses, no text, no logos, 1:1 aspect ratio, 2048x2048.
```

**T8. Ribbed latex anti-slip mat**
```text
Seamless tileable photorealistic PBR surface texture of a medical-bay floor covering: ribbed black latex anti-slip matting in large interlocking tiles with raised ridges, worn grey along the ridge tops, dried disinfectant rings, a few scuffs and grit in the grooves, in the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail. Camera pointing perfectly straight down, orthographic, no perspective, flat even diffuse lighting with no cast shadows, no specular hotspots and no vignette, uniform detail density edge to edge so it tiles seamlessly in both directions, no single focal object, no text, no logos, 1:1 aspect ratio, 2048x2048.
```

**T9. Planks and tarps over metal**
```text
Seamless tileable photorealistic PBR surface texture of a survivor camp floor: mismatched scavenged wooden planks and crate slats laid over gunmetal deck plate, gaps showing the metal underneath, patches of stained canvas tarp nailed down, scuffs, mud and spilled ash, in the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail. Camera pointing perfectly straight down, orthographic, no perspective, flat even diffuse lighting with no cast shadows, no specular hotspots and no vignette, uniform detail density edge to edge so it tiles seamlessly in both directions, no single focal object, no text, no logos, 1:1 aspect ratio, 2048x2048.
```

**T10. Grating over pipe trench**
```text
Seamless tileable photorealistic PBR surface texture of an engineering-deck floor: heavy diamond-pattern steel grating panels over a dark trench of ribbed black-latex pipes and cables visible through the holes, bolted frames, oil stains and rust bloom on the grating, in the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail. Camera pointing perfectly straight down, orthographic, no perspective, flat even diffuse lighting with no cast shadows, no specular hotspots and no vignette, uniform detail density edge to edge so it tiles seamlessly in both directions, no single focal object, no text, no logos, 1:1 aspect ratio, 2048x2048.
```

**T11. Macro grime variation**
```text
Seamless tileable greyscale texture map of large-scale grime variation for breaking up floor tiling: broad soft clouds of darker and lighter value with large irregular stain shapes, water tide marks and wide scuffed areas, very low detail frequency with no small features, mid-grey average, full value range, camera straight down, flat, no perspective, no lighting, tiles seamlessly in both directions, no text, 1:1 aspect ratio, 2048x2048.
```

**T12. Blend breakup noise**
```text
Seamless tileable greyscale height-like texture of organic breakup patterns for blending terrain edges: a mix of medium cracks, clumped grit, splatter clusters and rough brush-stroke shapes with sharp grainy edges, white for raised areas and black for hollows, mid-grey average, high contrast, no smooth gradients, camera straight down, flat, no perspective, no lighting, tiles seamlessly in both directions, no text, 1:1 aspect ratio, 2048x2048.
```

**T13. Wall kick-plate grime band**
```text
Seamless horizontally tileable photorealistic PBR texture of the bottom band of an industrial wall, viewed perfectly straight on: a scuffed gunmetal kick-plate with boot scuffs, mop-water tide lines, rust bleeding up from the floor joint, splash grime thick at the bottom edge and thinning upward, in the grimy gunmetal, ivory bone and black latex world of H.R. Giger biomechanical deep-space industrial horror, razor-sharp micro detail. Orthographic, flat even diffuse lighting with no cast shadows, no specular hotspots and no vignette, tiles seamlessly left to right, no text, no logos, 4:1 aspect ratio, 2048x512.
```

---

## Part 5 — Brushed, blended edges (technical plan)

The goal is that no surface change shows a straight 1 m line. Every boundary should read as painted with a rough brush: material A breaks into material B over 0.3–0.8 m, following cracks and grit. This is what the splat-map and height-blend techniques in Part 1 do.

### 5.1 One splat floor per chunk instead of three overlays

Replace `addRoomSurfaceOverlays`, `addHallwaySurfaceOverlay` and the per-cell part of `addDoorThresholdSurfaceOverlay` with **one floor mesh per chunk** that uses a splat material.

- **Layers.**
  - The floor surfaces become one `THREE.DataArrayTexture` (WebGL2 texture array) at 1024 px per layer.
  - Layers: the eight existing atlas quadrants, cut out, plus T1–T10.
  - A second array of the same size holds each layer's height in its red channel.
  - Using KTX2/Basis compression keeps about 18 layers × 2 arrays near 25 MB of GPU memory with mips. Uncompressed RGBA8 would be about 200 MB, which is too much for the Deck; decision O2.
- **Per-chunk data texture.** A 49×49 RGBA8 `DataTexture`, built when the chunk is built, with one texel per cell:
  - **R:** the layer index, taken from the room's `floorStyle`, hallway, threshold, camp or landform.
  - **G:** the distance to the nearest wall, from 0 to 3 m. It drives wall-base grime and the darkening where wall meets floor (5.3).
  - **B:** path wear, from 0 to 1 (5.5).
  - **A:** a wetness override, so the `ROOM_FLOOR_WETNESS` behaviour carries over per cell.
- **Fragment shader.**
  1. Find the four cell centres around the fragment and fetch their layer indices with `texelFetch`.
  2. Shift the bilinear weights by T12 breakup noise sampled in world space, so the boundary wanders and breaks up instead of running straight.
  3. When all four cells share one layer (most of the floor), take a single sample: the cheap, coherent branch.
  4. Otherwise sample at most the two dominant layers and height-blend them (5.2).
- **Biome.** Compute the cryo and bio mix per fragment with the same `smoothstep` of distance from the ship that the base floor already uses. Do not pick one biome per chunk; this removes the chunk-border seam in Part 0, item 3.
- **No runtime recompiles.**
  - Every chunk's material shares one `customProgramCacheKey`. Only the uniforms differ: the chunk's data texture and its origin.
  - The `#define`s are fixed, so loading new chunks never compiles a shader. This follows the point-light trap in `docs/planning/qa-2026-10-07-no-damage-and-stalls.md`.
- **Draw calls go down.** Today a chunk with N floor styles draws up to N + 2 overlay batches. After this change it draws one mesh.
- **Code location.**
  - The new module is `src/floorSplat.js`. It holds the data-texture builder, a pure function with unit tests.
  - The shader chunk lives there too.
  - `threeGame.js` only swaps the calls, which keeps the diff in that 43k-line file small while other agents work in it.

### 5.2 Height blend (the "brush")

For two layers A and B with bilinear weight `w` (B's share):

```glsl
float ha = heightA + (1.0 - w);
float hb = heightB + w;
float depth = 0.12;                       // brush softness in height units
float ma = max(ha, hb) - depth;
float wa = max(ha - ma, 0.0);
float wb = max(hb - ma, 0.0);
vec3 albedo = (colA * wa + colB * wb) / (wa + wb);
```

This is the common height-lerp. The material whose surface stands higher wins first: grit and resin fill the cracks of metal plate before they cover the plate tops. That is what makes the edge look brushed rather than blurred.

T12 also offsets `w`, so the overall shape of the boundary is irregular as well.

### 5.3 Contact and edge grime

- **Wall–floor junction, floor side.**
  - The G channel (distance to wall) darkens the albedo and raises roughness over the first 0.4 m, modulated by T11.
  - On top, D1 is laid as instanced strips along every wall edge, with random offset and flip so it does not repeat.
- **Wall–floor junction, wall side.**
  - The wall shader blends T13 into the bottom 0.6 m of each wall face, using world height.
  - This needs a small edit to the existing wall material's `onBeforeCompile`: one more texture, no new program variants.
- **Under props.** The renderer adds a D10 decal, scaled to 1.3× the prop's footprint, under every grounded dressing item and every `life_*` prop. It is batched with the existing decal instancing in `roomDressingRenderer.js`.
- **Under wall fixtures.** Below pipes, boxes and every `wall` prop:
  - D17 goes under wet fixtures;
  - D16 goes over heat sources and the "light" props.

### 5.4 Transition strips at biome and material boundaries

Some boundaries are worth marking with a strip on top of the shader blend. When the chunk is built, any pair of neighbouring cells with different layers or biomes gets a strip decal along their shared edge:

- cryo meets anything else: D2;
- bio or hive meets anything else: D3 plus D9 patches;
- outdoor ground meets an indoor floor: D4;
- any other material change: D8 at 30% chance, so not every seam is marked;
- door cells: D5 fans on both sides.

All of these are instanced quads, one draw per decal type per chunk.

### 5.5 Path wear

- When the chunk is built, run the existing grid pathfinder between every pair of doors in each room, and along hallway centre lines.
- Splat the paths into the B channel with a 1-cell falloff.
- The shader polishes the paths (lower roughness, grime removed) and leaves grime off them, the opposite of the wall-base grime. D7 strips go down along long straight runs.

### 5.6 Tiling breakup

- Multiply every floor layer by T11 sampled at world scale ÷ 32. This adds about ±12% value change and some roughness change.
- Rotate the per-cell UV by a hashed multiple of 90° on layers marked rotation-safe: concrete, regolith, chitin and slush. Directional surfaces such as planks, grating and chevrons are not rotation-safe.

---

## Part 6 — Dressing corridors and outdoor ground

### 6.1 Corridor planner

The new `planCorridorDressing(grid, chunk)` sits next to `planRoomDressing` in `src/roomDressing.js`. It uses the same deterministic seeding by id.

- **Fixtures on long runs.** Along every straight hallway run of at least 5 cells, place a `wall` prop every 6–9 m, alternating sides: 41, 43, 45, 60, 65 or 78, chosen by biome.
- **Junctions.** A T or X junction gets 47 (the wayfinding totem) at one corner, if the corridor is at least 2 cells wide there. Otherwise it gets a wall decal cluster.
- **Dead ends.** A dead end gets a vignette: 44, 48, 42, or a D15 + D12 + 48 "last stand" cluster.
- **Low clutter.** Place 48, 67 and the Sprint 53 `filler_*` props, nonblocking only, in at most 1 of every 8 cells.
- **Reachability.** Corridors are never narrowed below one clear cell, and the reachability check that rooms use (`roomDressing.test.js`) runs on corridors too.

### 6.2 Outdoor ground per landform

The new `planLandformDressing(landform, chunk)`:

| Landform | Landmark (at most 1 per chunk, 40% chance) | Mid props (2–5) | Ground |
|---|---|---|---|
| FIELD | 56 pipeline trestle run (2–4 segments) | 49, 52, 53, 55 | T4 with T5 paths between camps and hatches |
| CANYON | 51 colossal limb | 66, 68, 53, 55 | T4, darker; D4 at the canyon walls |
| CRATER | 54 fallen dish or 50 drop pod | 49, 52, 80 | T4 with T6 in hollows |
| RUINS | 51 colossal limb | 79, 80, 42 | T2 with T4 drifts (D4) over it |
| MAZE | none | the corridor planner (6.1) | T1 |

The 53 guide-rope stakes chain along the T5 path cells, so the paths visibly lead somewhere.

### 6.3 New props in rooms and camps

- **Kits** (`src/roomDressingKits.js`):
  - cryo: 57, 58, 59, 60;
  - bio: 61–65;
  - cathedral: 69, 70, 71;
  - engineering and workshop: 76, 77, 78;
  - security: 44;
  - storage: 46, 57.
- **Camps** (`src/camp.js`):
  - Meridian: 75;
  - Tallow: 73;
  - Vesper: 74;
  - all three camps: 72 and 70.
- **Crash site** (chunk 0,0): 79 and 80 placed around `broken_*_ship`.
- **Practical lights:** 44, 47, 49, 65, 70, 73 and 80 can carry a `practicalLight` through `registerEnvLight`, keeping the existing one-practical-per-room cap.

---

## Part 7 — Ambient motion

A world that holds still reads as dead. These all use effects that already exist or are cheap. **No light is ever toggled with `.visible`**; flicker works by changing emissive or light intensity.

| Effect | How | Where |
|---|---|---|
| Dust motes in light | One static `THREE.Points` cloud per practical light cone, about 60 points, drifting in the vertex shader | under every practical lamp, in light shafts |
| Drips | Reuse the room drip-pool system; add drips under 67, 62 and the D17 decals | cave, cryo, leaking rooms |
| Steam and breath | Reuse the existing steam puffs on 59, 73 and the vent props | cryo, camps, engineering |
| Cable sway | Vertex-shader sine sway on the hanging parts of 42, 52, 65 and the Sprint 53 cable props | corridors, outdoors |
| Paper skitter | 2–3 small paper quads that tumble a short way when the player passes or a vent puffs | offices, halls with D14 |
| Sign and lamp flicker | Emissive-intensity flicker on 41, 43, 78 and broken fixtures | corridors |
| Windsock and tarp flutter | Vertex wobble on the cloth parts of 52 and 55 | outdoors |

---

## Part 8 — Phases, budgets, verification and open decisions

### Phases

| Phase | Work | Who | Depends on |
|---|---|---|---|
| 0 | **Baseline captures** at five spots: a corridor run, a room–hall boundary, a chunk biome border in the blend ring, a FIELD chunk, and a camp. The same spots are re-captured after every phase. | Claude | — |
| 1 | **Blend tech** with the existing surfaces: `src/floorSplat.js`, the data texture, the height blend (with the derived heights of today's atlas), biome per fragment, and wall-distance grime. It removes the hard lines before any new art exists. | Claude | 0 |
| 2 | **Art generation:** 40 prop images, then image-to-3D; 20 stickers; 13 textures. | Owner | — (can run alongside 1) |
| 3 | **Ingest:**<br>• `scripts/blender/ingest_lived_in_props_20261009.py` for props 41–80;<br>• `scripts/art/key_decals.py` for D1–D20;<br>• `scripts/art/build_floor_layers.py` for T1–T13, which builds the KTX2 arrays and derived maps and runs the seam check. | Claude | 2 |
| 4 | **Grime and strips:** D1/T13 at wall bases, D10 under props, the D2–D9 transition strips, and path wear. | Claude | 1, 3 |
| 5 | **Placement:** the corridor planner, the landform planner, kit and camp additions, the showroom catalog. | Claude | 3 |
| 6 | **Ambient motion** (Part 7). | Claude | 5 |

Phase 1 can start now; the art can be swapped in later.

### Budgets

Each budget is checked by a test, as `src/data/dressingTriangles.js` already does.

- **Corridors:** at most 40k dressing triangles per chunk.
- **Outdoor:** at most 60k triangles per chunk, including at most one landmark of 14k or less.
- **Rooms:** the current caps are unchanged (clutter ≤ 12k, fixtures ≤ 18k, 120k + 60k per room).
- **Floor GPU memory:** about 25 MB with KTX2, if decision O2 approves it.
- **Draw calls:** the floor overlays shrink from up to N + 2 per chunk to 1. Decal strips add about 1 per decal type per chunk, so the net change should be flat or lower. Measure it.
- **Quality:** nothing is cut for frame rate. If the Deck p95 frame time gets worse, find the cost in a profile and fix it without changing the output, per the standing rule.

### Verification for each phase

- **Unit tests** for:
  - the splat data builder: layer indices, wall distance and path wear on fixture grids;
  - the corridor and landform planners: deterministic, reachability unchanged, budgets held;
  - the decal keying script: the alpha edge has no pixels where green dominates.
- **A GPU probe** (on the `playwright.gpu.config.mjs` setup) that re-captures the five Phase 0 spots, plus a close-up of a room–hall boundary. Compare before and after side by side.
- **No compiles at runtime:** load 20 chunks and assert that `renderer.info.programs` is the same length before and after.
- **Deck p95 frame-time capture** before and after Phases 1, 4 and 5.

### Open decisions for the owner

- **O1. Magenta key for green-content stickers (D3, D9).** Recommended. The green accent of bio and hive cannot survive a green key; the alternative is to drop green from those two stickers.
- **O2. KTX2/Basis for the floor layer arrays.** Recommended. Without it, the new layers cost about 200 MB of GPU memory, which is risky on the Deck. Compression is lossy, but at 512 px per metre it is still about three times sharper than today's 157 px per metre.
- **O3. Blocking props in corridors.** The default is no: in corridors only `wall` and `low` props, except at junctions at least 2 cells wide. Saying yes gives denser halls but adds combat chokepoints.
- **O4. Prop prompts in the anatomical register.** 63 (the feeding bladder) is the closest to the line in this batch. It stays non-sexual, with "tender nursery fixture" framing. Strike or soften it if it goes further than the game wants.
