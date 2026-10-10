# World floor, decal, and room-layout expansion plan — 2026-10-10

> Spatial design authority now lives in
> [`world-design-doctrine-n64-lessons-2026-10-10.md`](world-design-doctrine-n64-lessons-2026-10-10.md).
> This document remains the supporting floor, decal, asset-intake, and delivery plan.

## Decision

Do not start by adding a large undirected texture dump. The project already has enough
surface art to make every room distinct; its next constraint is composition and semantic
placement. First repair intake and review coverage, then retrofit the 20 authored rooms
with readable traversal and interaction zones, then generate a focused 24-image source
batch, and only then add six new room builds.

The target is a world where the floor explains where to walk, decals explain what happened,
props explain what the room does, and animation confirms what the player changed.

## Audit baseline

### What exists now

| System | Current inventory | Runtime path |
| --- | ---: | --- |
| Authored room builds | 20: 12 original + 8 cathedral/biomech builds | `src/data/roomBuilds.js`, `src/data/cathedralBlueprints.js` |
| Generated floor source renders | 56 JPGs | `art/source/textures/lived-in-pass-2/` |
| Shipped high-resolution floor layers | 44 albedo/detail pairs across 10 surface families | `public/3d/runtime/surfaces/` |
| Lived-in sticker source renders | 80 JPGs, 20 families × 4 variants | `art/source/decals/lived-in-pass-2/` |
| Lived-in sticker runtime layers | 84 albedo/detail pairs, including four kickplate layers | `public/3d/runtime/decals/` |
| Room-dressing source decals | 72 PNGs | `public/decal_*.png` |
| Room-dressing compressed layers | 68 albedo/detail pairs | `public/3d/runtime/decals/legacy/` |

The floor renderer is already architecturally sound: one splat floor per chunk, deterministic
surface variants, wall-distance grime, wetness, and compressed BC7 texture-array layers.
The lived-in stickers are one instanced draw per chunk, and room-dressing decals are one
PBR instanced draw per room when their compressed layer exists. Preserve those batching
contracts.

### Intake status update (2026-10-10)

The four transparent 512 × 512 decals have been successfully baked and integrated:
- `decal_bio_spore_vent` (albedo & detail KTX2 baked)
- `decal_camp_map` (albedo & detail KTX2 baked)
- `decal_cathedral_runic` (albedo & detail KTX2 baked)
- `decal_giger_relief` (albedo & detail KTX2 baked)

All 72 runtime decal layers are registered in `src/data/legacyDecalLayers.js`. `npx vitest run src/stickerPlanner.test.js` passes cleanly (11/11 tests).

### Architectural reference and active lane index
For the N64 precedent study, chunk-world diagnosis, and lane ownership, see
[`n64-architectural-level-design-overhaul-2026-10-10.md`](n64-architectural-level-design-overhaul-2026-10-10.md).
The world-design doctrine linked at the top of this document remains authoritative when the two
overlap. Lane A is active on flat authored-room proofs, beginning with `medical_triage`.

This integrates classic Nintendo 64 level design principles (*The Legend of Zelda: Ocarina of Time*, *GoldenEye 007*, *Super Mario 64*, *Perfect Dark*):
1. **Layered depth**: visual sumps, raised-looking plinths, overhead catwalk silhouettes, and
   grates over visible depth; walkable tiers wait for the vertical-room contract.
2. **Broken Orthogonality**: $45^\circ$ corner chamfers converting rectangular boxes into octagonal rotundas, cruciform halls, and curved apses.
3. **The "Hero Landmark" Rule**: Every room must center on an unmistakable monumental centerpiece (e.g. 4m pulsating turbine, colossal ruptured cryo-obelisk, breathing spore well).
4. **Proscenium Sightlines**: Doorways act as proscenium arches framing the hero focal point in the mid-ground and the exit in the background.
5. **Paved Circulation vs. Hazardous Margins**: Floor splatting guides subconscious navigation along quiet traction roads while relegating hazards to recessed gutters and fringes.
- `scripts/build_substation_and_permafrost_textures.py` currently reads one master from an
  absolute `.gemini/antigravity-ide/brain/...` path. Copy the approved raw master into
  `art/source/`, record its provenance, and make the build reproducible without machine-local
  state.

### Review-probe gap found and corrected

The furnished-room showroom requested obsolete `*_diffuse.webp` kit filenames for the eight
newer room builds, while the shipped files use `*_color.webp`. The tests could pass with black
materials because readiness only asserted prop/decal counts. The fixture now uses the real
paths and the eight-room replay passes. Add request-failure assertions so a missing material
can never masquerade as a valid room review again.

### Visual read from the 20-room replay

- The original 12 rooms read clearly as bounded gameplay spaces, but many share the same
  saturated bio floor and uniformly distributed wall dressing. Their silhouettes differ more
  than their purposes do.
- The eight larger rooms have stronger architecture and better bays/aisles. Their bespoke kit
  floors are frequently high-frequency across the entire room, especially giger, reliquary,
  and cryo-deck materials. Small props, pickups, and interaction anchors lose contrast.
- Most room plans expose only one or two authored decals even when dressing adds many objects.
  Decals feel like isolated decoration instead of connected evidence trails.
- The green signature practical is useful, but repeated green illumination makes unrelated
  objectives feel alike. Light colour should communicate room state, not only biome.
- Wall perimeter dressing is richer than the centre. Some large rooms therefore read as an
  empty patterned floor ringed by unrelated objects rather than a functioning place.
- The best compositions already present a central obstruction and a clean circulation ring.
  That topology should remain; the improvement is hierarchy, not more blockage.

## Source-art and chroma intake contract

### Canonical source locations

New generated art should not first appear as an unexplained file in `public/`.

- Raw floor renders: `art/source/textures/world-expansion-2026-10/`
- Raw decal renders: `art/source/decals/world-expansion-2026-10/raw/`
- Reviewable keyed RGBA: `art/source/decals/world-expansion-2026-10/keyed/`
- Public compatibility PNG: `public/decal_<id>.png`
- Compressed runtime output: `public/3d/runtime/{surfaces,decals}/`

Add a manifest beside the raw art. Each entry should declare `id`, `kind`, `surface`,
`keyMode`, `aspect`, `roughness`, `metalness`, `normalStrength`, `worldScale`, room tags,
and allowed placement surfaces. This replaces filename heuristics as the long-term source of
PBR and placement truth.

### Keying rules

1. Prefer genuine transparent RGBA for isolated decals.
2. Use green key only when the subject contains no meaningful green or cyan.
3. Use magenta key for bio, toxic, coolant, green-light, and cyan-light assets.
4. Never use black key for soot, dark resin, cables, shadows, or gunmetal silhouettes.
5. Flood from image edges, preserve enclosed same-colour details, despill edge pixels, bleed
   opaque colour into transparent texels before mip generation, and fail the bake if keyed
   colour still dominates any visible edge pixel.

The lived-in builder currently knows two magenta families through a hard-coded set, while the
legacy builder supports real alpha, green, and near-black only. Before generating more bio art,
move key mode into the manifest and teach both paths the same `alpha | green | magenta | black`
contract.

### Floor import rules

- Generate square, straight-down, shadowless, low-directionality colour sources.
- Four variants per hero family; two are enough for a pilot family.
- Keep large-scale identity in geometry and material response, not one unmistakable mark that
  repeats every four metres.
- Run delighting and seam repair, then inspect albedo, normal, roughness, height, AO, and
  metallic outputs before KTX2 packing.
- Reject a layer when opposite-edge error exceeds the existing script threshold, when a
  repeated 3 × 3 preview exposes a focal stamp, or when the texture swallows a grey prop at
  gameplay camera height.
- Register source, bake settings, runtime family, theme mapping, scale, and fallback in the
  same change. A source file alone is not integrated content.

### Decal import rules

- Floor decals are top-down orthographic; wall decals are front orthographic.
- No baked surface outside the mark, no cast shadow, no border, and no legible generated text.
- Store narrative text separately as authored UI or approved texture typography. The camp-map
  source needs a readability and lore review before use because its generated labels are
  prominent.
- Preserve real aspect ratio instead of stretching every source to a square in world space.
- Every decal declares one of `floor`, `wall`, `wall-base`, `threshold`, or `prop-contact`.
- Every new room-dressing PNG must pass the compressed-layer completeness test before merge.

## Placement grammar: from decoration to evidence

Every authored room should be planned as four connected zones:

1. **Threshold:** one clean first read, with a boundary strip or state mark; never place clutter
   in the first two walkable cells.
2. **Route:** a two-cell-wide primary path from required entry to interaction and onward to the
   optional exit or reward. Use lower-frequency floor treatment and directional wear here.
3. **Work cluster:** one hero prop, two to four functional supports, one contact decal, one
   practical light, and at most one ambient loop. Cluster these instead of spreading them.
4. **Story pocket:** a dead corner or wall bay containing a small cause-and-effect vignette;
   it may reward inspection but must not compete with the primary interaction.

Placement must be deterministic from the world seed. Decals should bind to semantic anchors:

- `terminal` -> hand grime, chair arc, cable route, service halo
- `drill` -> bore dust, cuttings fan, coolant drip, scrape direction
- `pod/hatch` -> landing abrasion ring, hydraulic seep, boot arc
- `medical bed` -> clean mat, trolley wheel tracks, fluid cleanup edge
- `confessional/shrine` -> kneeling wear, wax/tallow pool, touched-wall grime
- `water/dew/slime vessel` -> damp radius, drip path, bubbles/foam at the source

Do not spend RNG globally as decals are added. Give each room and semantic anchor an independent
seed so adding a stain cannot reshuffle its props.

## Existing-room retrofit

### Pass A — the original 12 rooms

- **Medical and recovery:** create a calm latex or worn-concrete path from entry to bed; confine
  bio infestation to perimeter incursions and one contaminated work bay.
- **Armory and reward:** clarify the cage/reward axis; concentrate casings, scratches, and boot
  wear near the access control rather than across the whole room.
- **O2 and engineering:** form a readable process line from intake to machine to control to
  exhaust. Use leak decals and conduits to connect the pieces visually.
- **Fabrication and reactor:** keep the central service aisle clear; put swarf, scorch, oil, and
  tool clutter at machines, never evenly around walls.
- **Radar, puzzle, and trap:** reserve a defendable interaction circle and show hazard direction
  with floor language before enemies or damage begin.

### Pass B — the eight cathedral/biomech rooms

- Reduce full-footprint floor competition with a low-frequency route mask or quieter inset lane.
- Use architectural bays as authored work/story clusters instead of allowing generic dressing to
  occupy all perimeter cells equally.
- **Machine nave:** retain a strong central procession line; pair each buttress with one repeated
  functional family and keep the apse as the only bright focal point.
- **Executive crypt:** protect the reliquary axis with calmer bone/gunmetal flooring; move minor
  clutter into side alcoves.
- **Incubation cloister:** make the central hazard legible as a contained wet field and use a dry
  circulation loop outside it.
- **Cryo exchanger:** connect manifolds with a continuous service lane, frost fans at failures,
  and coolant only downhill/from an actual source.
- **Surgical ward:** separate clean bay, fabrication bay, and contaminated transition through
  floor value and light colour.
- **Astrogation apse:** organize stations in an audience/console arc; avoid identical wall props
  around the perimeter.
- **Stasis sepulcher:** create pod rows plus a central inspection lane; use opened/failed states
  to break repetition.
- **Quarantine threshold:** make the clean/dirty boundary unmistakable before the player crosses.

### Density budget

Per room, before biome-wide ambient dressing:

- 1 hero interaction cluster
- 1 secondary story pocket
- 2–4 support props per cluster
- 1 threshold mark
- 1–3 semantic decal trails, each with a source and destination
- 1 primary practical light; a second non-shadowed accent only in large rooms
- at least 35% of walkable floor visually quiet
- primary route never narrower than two cells except authored doors

## Recommended image-generation batch

Image generation is useful here for colour source art, masks, decals, and concept targets. It
should not be treated as the final PBR bake, animation system, or GLB authoring step. Generation
is one output per call, and review/cleanup is the bottleneck. A 16-image pilot is comfortable in
one focused pass; 24 reviewed source images is the recommended production wave. Larger batches
should be split so bad scale, key colour, or visual noise is caught before it multiplies.

### Wave 0 — ingest existing art, zero generation calls

- Bake and register the four pending transparent decals.
- Use `bio_spore_vent` near living ventilation or nursery machinery.
- Use `giger_relief` and `cathedral_runic` sparingly as hero wall/floor medallions.
- Hold `camp_map` until its readable generated labels are replaced or deliberately approved.

### Wave 1 — 24 generated images

| Calls | Family | Intended use | Key/output |
| ---: | --- | --- | --- |
| 4 | `tex_floor_service_lane` a–d | subdued worn gunmetal/concrete traversal lane | opaque square |
| 4 | `tex_floor_decon_rubber` a–d | quieter ribbed clean/dirty boundary surface | opaque square |
| 2 | `decal_terminal_service_halo` a–b | chair arc, hand wear, cable access around terminals | alpha |
| 2 | `decal_pod_hatch_abrasion` a–b | circular seal wear, boot arcs, hydraulic residue | alpha |
| 2 | `decal_drill_bore_cuttings` a–b | radial swarf, ice chips, dust thrown by a drill | alpha |
| 2 | `decal_confessional_kneel_wear` a–b | worn knee marks, wax/tallow, touched threshold | alpha |
| 2 | `decal_decon_boundary` a–b | clean/dirty threshold strip without text | alpha |
| 2 | `decal_dragged_coolant` a–b | directional glossy trail with source droplets | magenta/raw -> alpha |
| 2 | `decal_repair_patch_quilt` a–b | bolted plates, tape, sealant, welded edge | alpha |
| 2 | `decal_water_foam_edge` a–b | foam/bubble edge mask for basins and leaks | magenta/raw -> alpha |

Each prompt should state use case, exact orthographic view, material scale, flat lighting, key or
transparent background, absence of cast shadows/text/logos, and the intended runtime surface.
Do not ask the generator for combined normal/roughness sheets; derive those consistently in the
existing build tools.

### Optional Wave 2 — only after in-game review

Generate 16 more sources if the first wave proves useful: four variants each for a quiet bone
processional floor, a matte bio-cuticle walkway, frost scrape fans, and wall condensation crowns.
Do not authorize this wave merely because generation capacity exists.

## Six new room builds

1. **Decontamination wash lock** — two-stage clean/dirty threshold, shower/eyewash, drainage
   sump, suit rack, purge control. Interaction changes red/amber to cyan/green and starts mist.
2. **Ice-bore operations pit** — bore winch and drill as the hero, core rack and sled at the
   perimeter, radial cuttings decal. `E` starts drill rotation, work light, dust/ice particles,
   and machine audio.
3. **Lived-in mess and galley** — mess table, hotplate, vending machine, still, laundry and
   ration spill clustered into human routines. Small safe-room warmth without blocking routes.
4. **Confessional data chapel** — confessional, pews, devotion tree, memorial board, and one
   terminal. Door and privacy panel articulate; candles/gel flames remain pooled VFX.
5. **Drop-pod recovery bay** — articulated pod hatch, cargo pallet, teardown rig, checkpoint,
   abrasion ring and tool scatter. Opening the pod changes light colour and releases vapor.
6. **Hive dew nursery** — dew funnel, feeding bladder, resin basin, brood comb, wet perimeter.
   Water surface scrolls, bubbles rise near emitters, and flow stops or changes after interaction.

Build these from existing props first. New 3D modeling is allowed only where the room lacks a
functional silhouette after kitbashing. Each room needs authored sockets, interaction/reward/
lore anchors, a two-cell route, state variants, and one screenshot at active/cryo/bio where
eligible.

## Motion, water, and VFX integration

- Use rigid child pivots and short clips for doors, drawers, pod hatches, valves, drills, fans,
  and shutters. Keep collision and interaction on a stable parent root.
- Use shader time for water UV flow, normal scrolling, emissive pulse, and small surface wobble.
- Use pooled instanced particles for bubbles, sparks, droplets, steam, and embers. Do not create
  new meshes or materials per frame.
- Water basins use a shallow opaque/alpha-tested surface where possible; reserve blended
  transparency for hero liquids to avoid sorting cost.
- Only nearby/visible ambient loops update. Stop mixers and particle emitters outside the active
  room.
- Lights express state: dormant low amber, usable cyan/white, hazardous red, bio-active sickly
  green. Avoid giving every signature prop the same green practical.
- Small props, decals, bubbles, and particles do not cast shadows. At most one hero point light
  in a normal room, two in a large authored room, and only one shadow-casting local light.

## Delivery phases

### Phase 0 — restore trustworthy intake and review

- Bake/register the four pending decals or remove them from public intake.
- Add missing-request assertions to the furnished-room showroom.
- Add manifest-driven chroma mode and PBR settings.
- Capture all 20 rooms with the corrected material paths.

Exit: decal completeness passes; a renamed/missing material fails the probe; all current rooms
have a reviewable screenshot.

### Phase 1 — retrofit layout without new art

- Add semantic anchor clusters and independent seeded decal placement.
- Reserve the two-cell route and 35% quiet-floor budget.
- Recompose the 12 original rooms, then the eight large rooms.
- Reuse current 44 floors, 84 sticker layers, 68 baked room decals, and existing pass-2 props.

Exit: each room reads as its role in silhouette and greyscale; interaction/reward routes remain
reachable; draw calls do not regress.

### Phase 2 — generate and ingest the 24-image wave

- Generate in groups of four, review before continuing, retain raw and keyed sources.
- Bake PBR/KTX2, register placement tags, and add deterministic tests.
- Introduce only the two quieter floor families first, then interaction decals.

Exit: no chroma fringe, no obvious 3 × 3 repetition, no missing compressed layer, and no decal
without a semantic placement rule.

### Phase 3 — build the six expansion rooms

- Implement two rooms at a time: decon + bore, mess + chapel, recovery + nursery.
- Wire existing prop articulation and VFX into room state transitions.
- Play entry, interaction, combat/obstruction, save/load, and revisit states.

Exit: every new room has a unique route/hero silhouette, deterministic population, working
interaction, changed post-interaction presentation, and performance parity with existing rooms.

## Validation matrix

### Automated

- `npx vitest run src/floorSplat.test.js src/stickerPlanner.test.js`
- room-build connectivity, rotation, anchor, and reserved-route tests
- deterministic placement snapshots using room/anchor-local seeds
- chroma audit plus visible-alpha edge-colour test
- KTX2 layer dimension/format/mipmap checks
- browser request-failure assertion for every showroom texture/model
- save/load tests for articulated and stateful room objects

### Visual/play

- 3 × 3 tile preview for each floor source and derived material
- decal preview on light, mid, dark, wet, and emissive backgrounds
- overview and interaction-height capture for every authored room
- greyscale check: route, hero prop, hazard, and exit must remain separable
- walk all door lanes and circle every mandatory interaction with the largest player/collision
  footprint
- compare dormant, active, resolved, abandoned, and infested states without changing topology

### Performance contracts

- one splat-floor draw per chunk
- one lived-in sticker draw per chunk
- one compressed room-decal draw per room
- instance repeated static props; keep articulated hero props separate
- no per-frame allocations in water, bubble, particle, or articulation updates
- no shadows on decals or small ambient effects
- measure `renderer.info.render.calls`, texture memory, and frame time before and after each pair
  of new rooms; reject unexplained regressions rather than relying on a theoretical budget

## First implementation slice

1. Finish the four pending decal intakes and reference only the three approved non-text-heavy
   assets.
2. Add failed-request detection to the showroom and keep the corrected texture paths.
3. Implement semantic placement for terminal, drill, pod, confessional, and water-source anchors.
4. Retrofit `medical_triage`, `hull_fabrication_bay`, `room_biomech_machine_nave`, and
   `room_quarantine_airlock_threshold` as the four representative layout cases.
5. Generate the first eight sources only: four `tex_floor_service_lane` variants plus two each
   of terminal halo and drill cuttings. Review them in those four rooms before completing the
   remaining 16 calls.

That slice tests every risky assumption—floor quieting, chroma/alpha intake, semantic placement,
large/small room composition, and generated-art usefulness—without committing the whole world
to a weak art direction.
