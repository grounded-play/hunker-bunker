# Gameplay world: current build versus visual target

**Date:** 2026-09-29 · **Updated:** 2026-09-30
**Branch:** `dev/sprint-48`  
**Scope:** the rendered play space behind the HUD. HUD layout is deliberately out of scope for this pass.

## Visual benchmark

The comparison uses the supplied annotated gameplay capture (`gameplay_ui_blueprint_annotated.png`) and the supplied slim-dock concept (`ui_concept_slim_dock_1790353835137.jpg`). The second image is treated as an environment target, not as a request to copy its HUD.

The target fantasy is a readable isometric bunker: deep negative space around rooms, lit interiors, visible door thresholds, low foreground walls, wet metal surfaces and localized cyan, amber and phosphor-green light. The pre-pass game had the correct general camera but presented the world as a uniformly fogged outdoor field with full-height walls and mostly global lighting.

Automated current-build captures: [default camera](../reports/assets/gameplay-room-presentation-default-2026-09-30.png) and [camera rotated 180°](../reports/assets/gameplay-room-presentation-rotated-2026-09-30.png). These are diagnostic captures, not final marketing frames.

## Gap analysis

| Dimension | Before this pass | Target | Engineering implication |
| --- | --- | --- | --- |
| Silhouette | Gray playfield with weak room boundaries | Rooms cut sharply out of black space | Preserve dark background and make room edges intentional |
| Visibility | Fog began inside the normal camera-to-player distance | Player, enemies and the current room remain crisp | Keep fog outside the combat/readability radius |
| Light grammar | Global ambient/sun did most of the work | Pools of cool room light, warm thresholds and green terminals | Author visible fixtures; route illumination through the fixed light pool |
| Occlusion | Full-height foreground walls hid room contents | Camera-facing walls stop near waist height | Cut only authored foreground room walls; retain collision and back walls |
| Materials | Broadly dry, diffuse floors | Wet plates and puddles catch practical lights | Add a bounded roughness-breakup layer, not transparent puddle meshes everywhere |
| Dressing | Props existed but did not establish a repeated corridor rhythm | Hazard sills, cables, screens and fixtures lead the eye | Establish a small reusable kit and instance it |

## Implemented in this branch

### Phase 1 — atmosphere and contrast

- Fog moved from `10–28` to `18–40`, keeping the immediate combat space clear.
- Ambient and hemisphere contribution were reduced so unlit areas can become black rather than gray.
- Bloom was recalibrated and door state emissives now cross its threshold.
- The crash console gained a localized green phosphor treatment.

### Phase 2 — practical room lighting

- Every authored procedural room receives one or two deterministic ceiling-strip fixtures along its long axis.
- Fixtures are `InstancedMesh` batches grouped by the active, cryo or bio palette. A room does not add one draw call per fixture.
- Each room contributes one hidden point-light proxy. The existing eight-slot environmental light pool selects the nearest sources, so chunk streaming never changes the renderer's visible point-light count.
- The crash-console light now uses that same pool and belongs to the ship's visibility/cleanup collection. It no longer creates an extra renderer light or survives a class presentation change.

### Phase 3 — camera-aware room cutaway

- The two authored room edges nearest the camera are selected from its current world quadrant.
- Those walls render at `0.82 m`, keep their original collision footprint, and receive a batched dark cap.
- Crossing a 90-degree camera quadrant updates existing wall and cap instance matrices in place. It does not remount chunks or change instance counts.
- Every room boundary remains a full-strength gameplay wall. Visual cutaway height no longer changes wall HP, and rotating the camera cannot resurrect a destroyed wall or cap.
- The room silhouette takes precedence over random holes, hazard walls and rubble on room boundaries. Random wall variants remain active on non-room terrain.
- Cutaway caps add one batched draw for a chunk, not one mesh per wall.

### Phase 4A — portal light grammar

- Procedural doorways receive a batched warm-amber header, visually separate from their red/green/amber lock-state lamps.
- A chunk can contribute at most one amber point-light proxy for an important locked portal. It uses the same fixed environmental-light pool as room and terminal lights.
- Ordinary doors add emissive geometry only; they do not add renderer-visible point lights.

### Phase 5A — wet room-floor response

- Authored room and hallway materials now derive broad, deterministic wet patches from world position.
- Wet areas darken the base plate slightly and blend roughness toward `0.1`, allowing existing practical lights and the environment map to produce tighter reflections.
- Utility and bio spaces receive more wetness than medical, cryo and camp floors.
- The effect is part of the existing room-floor shader: no transparent puddle meshes, texture fetches or added draw calls.

## Next work, in priority order

### P0 — hardware and real-play acceptance

Use the released `v2.4.12-beta` baseline for the already-planned Deck + PC regression session, then test this branch build separately. Capture the same interior at 1280×800 on Deck and 1920×1080 on PC.

Acceptance:

- the operator, enemies and pickups remain readable without lifting global ambient light;
- light count remains constant while crossing chunk boundaries;
- no new ≥500 ms shader-compilation stall appears;
- default Deck settings hold the agreed 30 fps floor with even pacing;
- cutaway walls do not expose voids, detach caps, change collision or hide door controls.

### P1 — finish threshold light grammar

Connect header emphasis to route importance and door state so an ordinary threshold, route portal and locked gate have distinct intensity without allocating new materials or lights.

Status: **Implemented.** Ordinary doors now use a thin, low-emission cyan header; campaign/ring route portals use a medium amber header; locked gates use a thicker red header and remain the only class eligible for the chunk's pooled portal-light proxy. Headers are still batched by importance and do not allocate per-door lights.

Acceptance: a player can distinguish ordinary room light, a route portal and a locked door by color and shape without reading text.

### P2 — corridor kit and authored rhythm

Instance a limited kit: hazard sill, cable run, ceiling rib, wall monitor and occasional drip. Select pieces deterministically from room role/theme so medical, utility, security, cryo and bio spaces read differently.

Status: **Phases 6A–6C implemented.** Every authored room now receives a deterministic back-wall display. Medical uses a three-segment cyan diagnostic strip, engineering a two-segment amber console, security a compact paired red panel, logistics a warm single screen, cryo a pale-blue triple strip and bio a tall green organic readout. Proportions and segmentation carry the distinction when colour alone cannot. The hallway catalog's previously passive `dressingKit` and `lightingRhythm` now drive physical frames or causeway rails, cable trays and segmented route signals. Room roles also paint matching diagonal threshold bars, while one shared animated shader supplies sparse condensation or leak drips to service, medical, cryo and bio spaces. Every layer uses fixed instanced pools per chunk with no new dynamic lights or navigation colliders. Hardware readability and performance validation remain required.

Acceptance: a screenshot without HUD identifies at least three room roles, while the normal gameplay view remains below the existing draw-call budget.

## Verification matrix

| Gate | Automated evidence | Hardware evidence still required |
| --- | --- | --- |
| Fixture planning | Unit tests cover compact/large rooms, axis and biome palette | Bloom/readability on PC and Deck panels |
| Light safety | Existing fixed-light-budget tests plus runtime assertion that room sources stay hidden | Frame-time and shader-program telemetry across chunk boundaries |
| Cutaway selection | Unit tests cover all four quadrants, the 0.82 m contract, restoration and destroyed-wall persistence | Controller-driven rotation on Deck and PC |
| Wet floors | Shader-source regression verifies world-space mask, darkening and roughness response; browser test compiles the material on WebGL | Reflection/readability check on Deck and PC panels |
| Integrated world | Browser test requires fixtures, caps, portal headers and pooled sources in real generated chunks; it rotates 180° and proves cut/restore with stable instance counts | Packaged-build capture and controller playthrough |
| Role displays | Unit tests cover role palette, proportions, segmentation, wall choice and deterministic fallback; browser test requires housing and screen pools in generated rooms | Confirm at least three room families remain recognizable on Deck at gameplay scale |
| Hallway rhythm | Unit tests cover axis/width derivation, every fallback contract, rail/frame selection, cables and signal rhythm; source regression requires all three bounded instance pools | Traverse connector chunks on Deck and PC and confirm frames remain outside the navigation lane |
| Thresholds and drips | Unit tests cover role palette, sill orientation, deterministic sparse selection and biome tint; browser test compiles and requires both instance pools | Confirm markings read at Deck resolution and transparent drips do not disturb frame pacing |

## Explicit non-goals for this pass

- HUD dock geometry, notification placement and objective-drawer behavior.
- Talking portraits and wear-overlay art.
- Replacing the camera or level generator.
- Adding unrestricted dynamic lights, real-time point-light shadows or per-tile meshes.
