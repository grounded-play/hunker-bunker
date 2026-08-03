# System Breakdown: Rendering and Performance

Added end of Sprint 21 — this system did not exist as a distinct topic when
the rest of this syllabus was written, because the work that created it
landed in the final ~60 commits before the sprint closed.

## Current Status

A real playtest session log showed the in-game debug overlay reporting
**FPS: 15** (target ~60) during ordinary gameplay, with renderer stats
showing 2,096 draw calls for only 32,776 triangles — the signature of many
small individually-drawn objects rather than a few batched ones. Two
distinct, now-fixed root causes:

1. **Chunk-cache eviction thrash** (`70f4193`) — `getOrCreateChunk`'s
   eviction only protected chunks currently mounted on screen, but AI
   pathing and tile lookups also cache chunks that never get mounted. The
   cap sat below the real resident window, so those lookup-only chunks kept
   getting evicted and regenerated from scratch on repeat visits — wasted
   CPU work, visible in the log as "Chunk generated" firing for areas the
   player had already left.
2. **Wall/door draw-call bloat** (design: `docs/superpowers/specs/2026-08-02-wall-door-instancing-design.md`,
   plan: `docs/superpowers/plans/2026-08-02-wall-door-instancing.md`) —
   floor tiles, rubble, and a few other decorations were already batched
   via `THREE.InstancedMesh`, but wall tiles, standard-wall decorations
   (pillar/bracket/vent/pipe), and door sub-parts (ribs/control panels)
   were each still one individual `THREE.Mesh` per tile. A maze chunk with
   100-250 wall tiles was producing that many-plus individual draw calls on
   its own. This was the dominant remaining cost.

## What Shipped

Extended the existing per-chunk `InstancedMesh` pattern to walls and door
sub-parts, via a new `_wallInstanceIndex` identity map
(`src/threeGame.js`) so damage, destruction, decals, and raycasting keep
working per-tile even though many tiles now share one draw call:

- Standard and damaged wall tiles instance into one `InstancedMesh` pool
  **per distinct room wall style within a chunk** (not one pool for the
  whole chunk) — the shared wall shader reads room style as a uniform
  stamped once per pool's draw call, and different rooms in the same chunk
  can carry different styles, so pools can't mix styles without a silent
  wrong-color bug.
- Standard-wall decorations (pillar/bracket, which share the wall's shader
  and so need the same per-room-style pooling; vent/pipe, which use plain
  materials and don't) are instanced the same way.
- Door ribs and control panels instance into flat per-chunk pools; the door
  slab itself stays an individual mesh (it animates open/close) as do the
  status bar and buttons (their color depends on door state).
- Hazard walls (the pulsing-siren variant) stay individual meshes — rare,
  and carry a live-animated child.
- Damage/destroy/decal/raycast behavior is unchanged from a player's
  perspective: `damageWall`/`destroyWall`/`updateWallDamageColor` branch on
  whether a given wall tile is instanced, using `setColorAt` for per-instance
  damage tint and a zeroed matrix (rather than scene removal) to retire a
  destroyed instance without disturbing its neighbors in the same pool.

**Known accepted gap:** instanced door ribs no longer visually follow a
door's open/close vertical slide (they were true children of the door mesh
before this change; `InstancedMesh` instances can't be Object3D children).
Flagged in-code (search `KNOWN GAP` in `src/threeGame.js` near the door
rib/panel pool construction) as a tracked follow-up, not silently accepted —
candidates are patching the rib pool's matrices per-frame in the existing
door-animation loop, or reverting ribs specifically to individual meshes.

## Sprint 22 Acceptance

- Confirm the draw-call reduction is real in a live build: load into a
  wall-dense maze chunk and compare the renderer stats overlay against the
  original playtest log's 2,096-call baseline.
- Decide on the door-rib animation gap (see above) — ship as-is, patch the
  instance matrices per-frame, or revert ribs to individual meshes.
- No further correctness work is scheduled — this was a performance fix
  with explicit before/after behavior parity as its bar, not a new
  player-facing system.

## Engineering Notes

- Two GPU-buffer-leak items were identified and deliberately deferred (not
  fixed in this pass, not blocking): `InstancedMesh` pools are never
  `.dispose()`d on chunk unmount (a pre-existing pattern shared by the
  floor/void/cliff/rubble pools too, not introduced by this work — this
  pass just added more pool types to the same gap), and `findWallMeshAt`
  now also resolves walls in resident-but-currently-hidden (prefetched)
  chunks, a small behavioral widening that's arguably more correct (it
  matches what the collision grid already knew) but worth a conscious
  sign-off rather than an unnoticed side effect.
- Mid-implementation, this same instancing work was found to have been
  independently started by a different concurrent agent on the same
  branch — coordinated by having that agent pause so only one
  implementation landed, avoiding two incompatible rewrites of the same
  wall-damage/destroy/raycast functions.
