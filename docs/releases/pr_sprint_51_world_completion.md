## 🌟 Summary: Sprint 51 World Completion

This pull request completes **Sprint 51 (World Completion)**, fulfilling the asset, surface, path-layer, and gameplay dressing requirements specified in [`docs/planning/world-completion-assets-and-path-layers-2026-10-11.md`](docs/planning/world-completion-assets-and-path-layers-2026-10-11.md).

It introduces **39 high-detail game-ready 3D models** (zero-faceting 25k triangle budget with meshopt and KTX2 compression), **80 interchangeable PBR texture variants** (48 dual-array floor surfaces and 32 chroma-keyed route/decal strips), organic **multi-layer floor texture blending**, and enforces the **mandatory gameplay pairing rule** for life support water stations (`camp_water_barrel` paired with `life_cistern_tank` near sinks and showers).

---

## 🎯 Tickets & Specifications Closed

- **`docs/planning/world-completion-assets-and-path-layers-2026-10-11.md`**: Fully implemented and validated.
- **Sprint 51 Milestone**: World Completion (Lived-In Props, Floor Surfaces, and Path Layers).
- **Lane B (Lived-In Dressing)**: 39 high-detail models integrated with collision, scale, yaw, and museum registration.
- **Lane H (Floor Surfaces & Paths)**: 48 interchangeable PBR floor textures across 12 prompts, 4 variants (`_a`, `_b`, `_c`, `_d`), and organic 2x2m cluster blending.
- **Mandatory Water Logistics Pairing**: Sinks and showers paired with cistern tanks and water barrels across all procedural rooms.

---

## 📦 Detailed Breakdown of Changes

### 1. 3D Asset Pipeline (39 High-Detail Models @ 25k Triangles)
- **Zero Loss / No Faceting**: Ingested at a strict 25,000 triangle ceiling to preserve sinuous Giger ridges, delicate pipe conduits, and machine silhouettes without low-poly faceting.
- **PBR & Compression Optimization**: Pre-processed through `gltfpack` with meshopt vertex compression and Basis Universal KTX2 textures (`KHR_texture_basisu`). Saved to `public/3d/runtime/new3ds/<id>.glb`.
- **System Registrations**:
  - Registered in `WORLD_3D_MODELS` (`src/world3dOverlay.js`) with metric dimensions, heights, spans, yaws, and interaction profiles.
  - Triangle budget table synchronized in `src/data/dressingTriangles.js`.
  - Museum & Showroom categorized in `src/debugMuseumPlan.js` and `src/debugShowroom.js` under `LIVED_IN_PROPS`.
- **Catalog Breakdown**:
  - **Bunker Operations (8)**: `life_pallet_racking`, `life_server_racks`, `life_fire_station`, `life_transformer_bank`, `life_conveyor_section`, `life_cistern_tank`, `life_scaffold_tower`, `life_forklift`.
  - **Daily Life & Amenities (9)**: `life_sink_row`, `life_shower_stall`, `life_laundry_machines`, `life_weight_bench`, `life_arcade_cabinet`, `life_filing_cabinets`, `life_overseer_desk`, `life_planning_board`, `life_surgical_lamp`.
  - **District Landmarks & Vistas (20)**:
    - *Cryo District (5)*: `cryo_ice_crawler`, `cryo_frozen_cascade`, `cryo_snowbound_crates`, `cryo_heater_station`, `cryo_ice_blocks`.
    - *Hive Overrun (6)*: `hive_resin_pillar`, `hive_cocooned_crew`, `hive_brood_dome`, `hive_pheromone_node`, `hive_tendril_arch`, `hive_assimilated_generator`.
    - *Crash Site (4)*: `crash_engine_nacelle`, `crash_hull_panels`, `crash_drag_chute`, `salvage_tagged_heap`.
    - *Chasm Depths (4)*: `chasm_cable_gondola`, `chasm_collapsed_catwalk`, `chasm_rappel_anchor`, `chasm_edge_beacon`.
    - *Survivor Outposts (2)*: `camp_canvas_tent`, `camp_water_barrel`.

### 2. Hard Gameplay Pairing: Water Logistics Rule
- **Enforcement**: In real operations, sinks and showers cannot function without water supply and cistern buffering.
  - `camp_water_barrel` is **always paired** with `life_cistern_tank` near sinks (`life_sink_row`), showers (`life_shower_stall`), and laundry facilities (`life_laundry_machines`).
  - Standalone sinks and showers removed from random wall prop generation.
  - Authored into dedicated station vignettes:
    - `['life_cistern_tank', 'camp_water_barrel', 'life_sink_row']`
    - `['life_cistern_tank', 'camp_water_barrel', 'life_shower_stall']`
    - `['life_cistern_tank', 'camp_water_barrel', 'life_laundry_machines']`
  - Integrated across bunker, cryo, medical, and camp room dressing.

### 3. Interchangeable PBR Floor Surfaces (48 Maps)
- **12 Prompts $\times$ 4 Variants (`_a`, `_b`, `_c`, `_d`)**:
  - Delighted, edge-tiled, and baked into dual-array BC7 KTX2 textures:
    - Array 0: sRGB Albedo + Metalness
    - Array 1: Linear Normal + Roughness + Height
  - Saved in `public/3d/runtime/surfaces/<id>_<var>_albedo.ktx2` and `detail.ktx2`.
  - Registered in `FLOOR_SURFACES` and `ROOM_THEME_SURFACES` in `src/floorSplat.js`.
- **Organic Multi-Layer Blending**:
  - Implemented 2x2m cluster spatial hashing (`${room.id}:${cell.x >> 1}:${cell.y >> 1}`) to shuffle variants across the floor.
  - Rooms no longer have monotonous repeating tiles; textures vary naturally between workstations and corridors.
  - 4-tap height-map shader blending with noise breakup jitter blends room interiors and room-to-corridor transitions.
  - Deterministic BFS shortest-path traffic wear writes to DataTexture Channel B, polishing high-traffic centers and depositing shoulder grit.

### 4. Chroma-Keyed Route Strips & Decals (32 Maps)
- **8 Prompts $\times$ 4 Variants (`_a`, `_b`, `_c`, `_d`)**:
  - Chroma-keyed from pure magenta (`#FF00FF`) with despill processing.
  - Retained in `art/source/decals/world-expansion-2026-10/keyed/` and `public/`.
  - Assets include:
    - `strip_cart_ruts`: 1m x 4m paired wheel ruts in cargo & conveyor bays.
    - `strip_drag_marks`: Heavy gouged hauling marks.
    - `strip_walkway_borders`: Worn yellow painted border lines.
    - `strip_drain_gutter`: Recessed steel drainage gutters.
    - `strip_sled_tracks`: Dual sled runner marks in snow.
    - `strip_hive_veins`: Glossy bio-vein trails.
    - `decal_door_wear_apron`: Polished half-moon doorway wear patterns.
    - `decal_junction_turn_wear`: High-traffic cornering wear arcs.

### 5. Documentation & Test Suite Hardening
- Updated `README.md` with release notes and 3D & Surface Pipeline architecture overview.
- Updated `src/world3dOverlay.test.js` to assert the expanded catalog (97 `life_` models).
- Preserved legacy array isolation in `src/stickerPlanner.test.js`.
- Seed-compatible role vignette order in `src/roomDressingKits.js` to ensure deterministic vertical-slice tests pass.
- All test suites green.

---

## 🔍 Work to be QA'd from this Point in Time

Please run through the following QA checklist:

### Phase 1: 3D Museum & Showroom Inspection
1. **Launch Local Game**:
   ```bash
   npm run dev
   ```
2. **Open Dev Console (`~`)**:
   - Run `window.__DEBUG__.openMuseum()`
   - **Verification**: Walk the 3D museum floor. Verify that all 39 new models render with their full silhouette, high-frequency pipe/spine ridges, and correct PBR materials (no missing textures or black fallback meshes).
   - Run `window.__DEBUG__.openShowroom('LIVED_IN_PROPS')`
   - **Verification**: Cycle through each model; verify camera framing, bounds, and that triangle counts display correctly.

### Phase 2: Water Logistics Pairing Verification
1. **Launch a Tactical Expedition**:
   - Generate seeded runs in bunker, cryo-lab, and medical sectors.
2. **Inspect Ablution & Hygiene Stations**:
   - Locate any room containing a sink (`life_sink_row`) or shower (`life_shower_stall`).
   - **Verification**: Confirm that **every sink and shower is accompanied by both a `life_cistern_tank` and `camp_water_barrel`**. Confirm there are no orphaned, free-floating sinks without water supplies.

### Phase 3: Multi-Layer Floor Blending & Variant Shuffling
1. **Inspect Room Floors in Perspective & Isometric Views**:
   - Enter large rooms (hangars, maintenance halls, cryo bays, hive chambers).
   - **Verification**:
     - Check that floor textures are not identical repeating tiles across the room.
     - Observe that variants `_a`, `_b`, `_c`, `_d` cluster into natural 2x2m patches.
     - Inspect the boundary between rooms and corridors: height-map blending should eliminate hard seams.

### Phase 4: Route Strips & Traffic Wear
1. **Inspect Doorways & Intersections**:
   - Check doorway thresholds for `decal_door_wear_apron` (scuffed fan shape).
   - Check L-turn hallway junctions for `decal_junction_turn_wear` (curved arc).
   - Check conveyor and storage halls for `strip_cart_ruts` and `strip_drag_marks`.
   - **Verification**: Confirm that magenta backgrounds are completely transparent with zero magenta halo/fringe on edges.

### Phase 5: Destructibles, Collision & Pacing
1. **Physical Obstacle Check**:
   - Walk your player character against pallet racking, forklifts, server racks, and cistern tanks.
   - **Verification**: Player should collide properly without clipping through.
2. **Destruction Check**:
   - Shoot or melee destructible props.
   - **Verification**: Confirm props take damage, track HP, and break into debris.
3. **GPU Performance**:
   - Open telemetry (`~` → `window.__DEBUG__.perfReport()`).
   - **Verification**: Confirm 60 FPS maintained and KTX2 texture memory remains well within budget.
