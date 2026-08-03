# Wall & Door Instancing: Fixing the FPS-15 Draw-Call Bottleneck — Design

**Date:** 2026-08-02
**Status:** Approved for implementation
**Scope:** Wall tiles (standard + damaged variants) and static door sub-parts
(ribs + corner panels) in `src/threeGame.js`'s `mountChunk`. Hazard walls,
door slabs, decals, and the render pipeline itself are explicitly
out of scope — see "Out of scope" below.

## Problem

A real playtest session log showed the in-game debug overlay reporting
**FPS: 15** (should be ~60) during ordinary gameplay, at two points 116
seconds apart. A renderer stat snapshot from the same session showed 2096
draw calls for only 32,776 triangles — a very high call-count-to-triangle
ratio, the signature of many tiny individually-drawn objects rather than a
few batched ones.

Investigation traced this to `mountChunk()` (`threeGame.js:16115`): floor
tiles, rubble, void patches, cliffs, and (as of a concurrent in-flight
change) terrain steps are all already batched via `THREE.InstancedMesh` —
one draw call per chunk regardless of tile count. But **wall tiles and
door sub-parts are still built as individual `THREE.Mesh` objects, one per
tile**. A maze chunk can have on the order of 100-250 wall tiles, each
tile potentially producing 1 mesh (standard wall) up to several (damaged
wall + rubble — though rubble is already instanced separately) or a door
tile's ~8 meshes (slab + status bar + 3 ribs + 2 panels + 2 buttons). With
several chunks mounted at once, this is the dominant remaining source of
per-frame draw calls.

A related, already-fixed bug (`70f4193`, chunk-cache eviction thrashing)
was contributing wasted CPU work on top of this, but is separate and
already shipped. This spec addresses the draw-call cost itself.

## Why walls aren't a drop-in `InstancedMesh` swap

Unlike floors/rubble/cliffs (pure decoration, created once, never touched
again), walls are referenced by identity throughout the file:

- **`this.wallMeshes`** array backs 4 raycasts: cone-of-vision occlusion
  (`:13556`), light occlusion (`:13702`), projectile-vs-wall hits
  (`:14545`), and the player-hidden-behind-wall check (`:21477`/`:21570`).
- **`findWallMeshAt(worldX, worldZ)`** (`:15816`) looks up one specific
  wall by `userData.wallKey` for damage/removal.
- **`damageWall`/`destroyWall`/`updateWallDamageColor`** (`:15821-15919`)
  mutate a specific wall's HP, clone its material for damage tinting, and
  on death do `wall.parent?.remove(wall)`.
- **`markWallTileDestroyed`** and the `destroyedWallKeys`/
  `destroyedExteriorWallKeys` Sets drive when a specific wall must be
  found and removed.
- **Wall decals** (`spawnWallDecal`/`clearWallDecalsForWall`) are keyed by
  `wallKey`, though positioned by world coordinate, not parented to the
  wall mesh — unaffected by this change.
- **Doors** (`this.proceduralDoorMeshes` Map) need per-door open/close
  Y-position animation.

`InstancedMesh` instances aren't independent `Object3D` nodes — you can't
remove or re-parent one, only update its matrix and per-instance color.
So this is an architecture change, not a find-and-replace.

## Architecture

Extend the existing per-chunk instancing pattern (floors, rubble, void,
cliffs, terrain steps) to walls and door sub-parts. The core mechanism:
replace "a wall *is* its Mesh object" with a lookup table,
`this._wallInstanceIndex: Map<wallKey, { chunkKey, instancedMesh,
instanceId, variant, wallHp, maxWallHp, landform, heightScale, worldX,
worldZ }>`. This record carries what `wall.userData` carries today (there
is no per-instance `userData` on an `InstancedMesh`).

### Wall instancing

Standard and damaged walls already reduce to nothing but a per-instance
matrix — damaged walls' short height and tilt are just matrix values
(`Matrix4.compose(...)`), the same mechanism standard walls already use
for height-scale variance. Both variants share pools of
`InstancedMesh` (`this.wallGeometry`, `this.wallMaterial`).

**Amendment (discovered while writing the implementation plan):**
`wallMaterial` is one shared `MeshStandardMaterial` with a custom shader
(`threeGame.js:1396-1575`) that reads `uLandformId`/`uRoomStyleId` as
plain uniforms. `configureWallMesh` stamps these fresh via each wall's own
`onBeforeRender`, immediately before that wall's individual draw call
(`threeGame.js:15650-15655`) — since different rooms within the same
chunk can carry different wall styles (`uRoomStyleId`), and a single
shared uniform can't hold different values for different instances
batched into one draw call. `landformShaderId` is chunk-constant (derived
once from `getChunkLandform`, unaffected by batching), but `roomStyleId`
varies *within* a chunk by which room a given wall cell belongs to.

Resolution: **pool standard+damaged walls into one `InstancedMesh` per
distinct `roomStyleId` per chunk**, not a single chunk-wide pool. Each
pool's `onBeforeRender` stamps the uniform once (all instances in that
pool share the same `roomStyleId` by construction), reusing the existing
mechanism unmodified — no shader changes, no new regression surface on a
hard-to-unit-test GPU-side system. A chunk typically has a handful of
distinct room styles (not hundreds), so this still collapses ~100-250
individual wall draws down to roughly 5-10 per chunk — the dominant win
is intact even though it's not a single pool.

Hazard walls (the pulsing-siren variant, the smallest of the three bands
in the WFC weighting) **stay as individual `Mesh` objects** — they carry a
live-animated child (the siren dome) and are rare enough that instancing
them isn't worth the added complexity.

**Amendment (discovered while writing the implementation plan):** standard
walls can also carry one decoration as a child — pillar, bracket, vent, or
pipe (12%/12%/8%/6% chance respectively, `threeGame.js:16650-16708`).
Instancing the wall breaks that parenting (`InstancedMesh` instances
aren't `Object3D` nodes, can't have children), so these become chunk-level
instanced pools too, same "purely static, no identity" reasoning already
applied to door ribs/panels. Pillar and bracket use `this.wallMaterial`
directly (the same shared shader as walls) and so need the same
`roomStyleId`-bucketed pooling; vent and pipe use separate plain
`MeshBasicMaterial`s with no custom shader, so each is one flat pool per
chunk, no bucketing needed. None of the four are referenced by identity
anywhere else in the file (no `userData`-based lookup, no damage/destroy
path touches them).

### Doors

The door **slab stays an individual `Mesh`** — it animates open/close and
is the thing `proceduralDoorMeshes` looks up by door id. Of its ~8
attached sub-meshes: the **3 ribs and 2 corner panels are purely static**
(never change color or position after creation) and become chunk-level
`InstancedMesh` pools, same treatment as walls. The **status bar and 2
buttons stay attached to the slab** as individual meshes — they change
color with door state, there are only 3 of them per door, and doors are
numerically rare enough (a handful per map, not hundreds like walls) that
instancing state-dependent, low-count geometry isn't worth it.

### Raycasting

The four existing raycast call sites keep calling
`raycaster.intersectObjects(this.wallMeshes, false)` (now containing a mix
of individual hazard-wall Meshes and per-chunk wall `InstancedMesh`
objects — both are valid `intersectObjects` targets). Three.js's
intersection result includes `instanceId` when the hit object is an
`InstancedMesh`; each call site's hit-handling resolves identity via
`_wallInstanceIndex` when `instanceId` is present, falling back to the
hit object's own `userData` for individual (hazard) walls.

## Lifecycle

- **Mount** (`mountChunk`): two-pass per chunk. First pass walks the grid
  exactly as today, classifying each wall tile into
  standard/damaged/hazard/door and collecting matrices into arrays keyed
  by `roomStyleId` (mirroring the existing `rubbleMatrices`/
  `voidPatchMatrices` pattern, but bucketed per style instead of one flat
  array) instead of creating Meshes inline for standard/damaged walls and
  ribs/panels. Second pass builds one `InstancedMesh` per
  `roomStyleId` bucket from its collected matrices, stamps that pool's
  `onBeforeRender` uniform once, and populates `_wallInstanceIndex`.
- **Damage** (`damageWall`): looks up the instance via
  `_wallInstanceIndex`, calls `instancedMesh.setColorAt(instanceId,
  color)` + `instancedMesh.instanceColor.needsUpdate = true` instead of
  cloning a material.
- **Destroy** (`destroyWall`/`markWallTileDestroyed`): looks up the
  instance, sets its matrix to a zero-scale transform (instantly
  invisible — a degenerate-scale instance also naturally drops out of
  raycast hits, no extra filtering needed), removes the entry from
  `_wallInstanceIndex`. No runtime wall-*addition* case exists (the
  "filled hole" mechanic patches with a floor-material mesh, not a wall
  instance), so the fixed-size buffer allocated at mount time never needs
  to grow — a destroyed index is simply retired, not reused.
- **Unmount**: unchanged — the chunk `group` (including its
  `InstancedMesh`es) is disposed exactly as today; `_wallInstanceIndex`
  entries for that chunk are cleared alongside.
- **Decals**: unaffected — already positioned by world coordinate via
  `wallKey`, not parented to the wall mesh.

## Testing

`threeGame.destructibleWalls.test.js` and `threeGame.holeTiles.test.js`
already use the `ThreeGame.prototype.method.call(fakeThis, ...)` pattern
used throughout this file's tests — no real Three.js renderer needed, the
index bookkeeping and matrix math are directly assertable. New/updated
coverage: index assignment on mount, damage color routing to the correct
instance, destroy zeroing the correct instance without disturbing others,
and raycast-hit-to-`wallKey` resolution. Most of
`destructibleWalls.test.js`'s existing assertions should keep passing with
only their setup adjusted (real Mesh → instanced lookup) — a sign this
preserves current behavior rather than changing it.

## Out of scope

- Hazard walls (stay individual — rare, animated).
- Door slabs and their state-dependent sub-parts (status bar, buttons —
  stay individual, attached to the slab).
- Any change to the render pipeline, materials, or visual appearance.
- Chunk streaming/mounting logic itself (already addressed separately in
  `70f4193`).

## Coordination note

An independently-produced plan from another AI agent (Google
Antigravity/Gemini, working on this same branch) proposed a near-identical
architecture — same instance-index approach, same wall-variant grouping,
same door-part scoping. That agent's work was paused before this spec was
finalized to avoid two concurrent implementations rewriting the same
functions (`mountChunk`, `damageWall`, `destroyWall`, raycasting)
incompatibly.
