# Gameplay world: current build versus visual target

**Date:** 2026-09-29  
**Branch:** `dev/sprint-48`  
**Scope:** the rendered play space behind the HUD. HUD layout is deliberately out of scope for this pass.

## Visual benchmark

The comparison uses the supplied annotated gameplay capture (`gameplay_ui_blueprint_annotated.png`) and the supplied slim-dock concept (`ui_concept_slim_dock_1790353835137.jpg`). The second image is treated as an environment target, not as a request to copy its HUD.

The target fantasy is a readable isometric bunker: deep negative space around rooms, lit interiors, visible door thresholds, low foreground walls, wet metal surfaces and localized cyan, amber and phosphor-green light. The pre-pass game had the correct general camera but presented the world as a uniformly fogged outdoor field with full-height walls and mostly global lighting.

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

### Phase 3A — default-isometric room cutaway

- East and south walls that directly border an authored room interior are treated as foreground walls for the default `+X/+Z` camera.
- Those walls render at `0.82 m`, keep their original collision footprint, and receive a batched dark cap.
- The room silhouette takes precedence over random holes, hazard walls and rubble on this edge. Random wall variants remain active on back walls and non-room terrain.
- Cutaway caps add one batched draw for a chunk, not one mesh per wall.

## Next work, in priority order

### P0 — hardware and real-play acceptance

Use the released `v2.4.12-beta` baseline for the already-planned Deck + PC regression session, then test this branch build separately. Capture the same interior at 1280×800 on Deck and 1920×1080 on PC.

Acceptance:

- the operator, enemies and pickups remain readable without lifting global ambient light;
- light count remains constant while crossing chunk boundaries;
- no new ≥500 ms shader-compilation stall appears;
- default Deck settings hold the agreed 30 fps floor with even pacing;
- cutaway walls do not expose voids, detach caps, change collision or hide door controls.

### P1 — camera-quadrant-aware cutaways

Phase 3A matches the default camera. Camera rotation can make a different pair of walls foreground. Update only when the camera crosses a 90-degree quadrant, and update the existing instance matrices in place. Do not remount chunks or change draw-call count while the camera turns.

Acceptance: each quadrant cuts the two near room edges, restores the two far edges, and produces no visible wall pop while the camera remains inside a quadrant.

### P1 — threshold light grammar

Add warm amber emissive headers to important portals and keep red/green state lamps for lock state. Use emissive batches for the visible hardware and at most one pooled proxy at a major portal. Ordinary doors must not each become a live Three.js light.

Acceptance: a player can distinguish ordinary room light, a route portal and a locked door by color and shape without reading text.

### P2 — wet floor response

Add a world-space roughness mask to room floor materials. Keep the base floor opaque and vary roughness/metalness in the shader; avoid layered transparent puddle planes across whole rooms.

Acceptance: practical lights produce narrow reflected highlights, dry routes remain readable, and the effect can be reduced by the adaptive performance profile without changing collision or gameplay state.

### P2 — corridor kit and authored rhythm

Instance a limited kit: hazard sill, cable run, ceiling rib, wall monitor and occasional drip. Select pieces deterministically from room role/theme so medical, utility, security, cryo and bio spaces read differently.

Acceptance: a screenshot without HUD identifies at least three room roles, while the normal gameplay view remains below the existing draw-call budget.

## Verification matrix

| Gate | Automated evidence | Hardware evidence still required |
| --- | --- | --- |
| Fixture planning | Unit tests cover compact/large rooms, axis and biome palette | Bloom/readability on PC and Deck panels |
| Light safety | Existing fixed-light-budget tests plus runtime assertion that room sources stay hidden | Frame-time and shader-program telemetry across chunk boundaries |
| Cutaway selection | Unit tests cover near/far edges and the 0.82 m contract | Four camera quadrants after P1 implementation |
| Integrated world | Browser test requires fixtures, caps and sources in real generated visible chunks and captures a HUD-free frame | Packaged-build capture and controller playthrough |

## Explicit non-goals for this pass

- HUD dock geometry, notification placement and objective-drawer behavior.
- Talking portraits and wear-overlay art.
- Replacing the camera or level generator.
- Adding unrestricted dynamic lights, real-time point-light shadows or per-tile meshes.
