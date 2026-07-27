# WFC Tile-Based Maze Generation & Verticality — Design

> **For agentic workers:** This is a brainstorm spec, not an implementation
> plan. It covers two sequential phases — Phase 1 (below) and Phase 2
> (verticality + pocket-world overhaul, further down this document). The
> next step is `superpowers:writing-plans`, run once per phase against its
> own section.

## Phase 1: Tile-Based Generation

**Goal:** Replace the MAZE landform's ad-hoc generation (recursive-backtracker
DFS carve → 4-rule Markov smoothing → single-cell ellipse/diamond/cross
"plaza" carving → probabilistic erosion widen/trim) with a **WFC macro-tile
layout**: an authored catalog of room/corridor/canyon meta-tiles placed by
Wave Function Collapse constraint propagation, then detailed by an extended
version of the existing MarkovJr-style rewrite engine. This targets four
concrete complaints from actual play: rooms reading as uniform blobs, the
crash-site exit corridor not reliably connecting to the next chunk, tiles
feeling too small/thin, and walls/gaps sitting too close together as a side
effect of erosion passes. **Phase 2** (below, in this same document) adds
real vertical traversal — Ramp, Bridge, and Ladder tiles that let a player
actually cross the `canyon-impassable` tile this phase introduces — on top
of the socket vocabulary established here.

**Architecture:** No change to the grid representation (`'#'`/`'.'` character
grid), chunk size (`this.chunkSize = 19`, `src/threeGame.js:693`), or the
downstream consumers of that grid (collision, rendering, radar, pickups,
`applyRingRoadSystem`, `clearDoorways`) — this is a drop-in replacement for
*how* the MAZE landform's grid gets filled, not a new rendering or collision
system. `buildChunk` (`src/threeGame.js:19822`) still returns the same
19×19 array of `'#'`/`'.'` (plus existing special chars like `'D'`) it does
today.

### Global Constraints

- Every new seeded-random call folds in `runEntropy` the same way
  `buildChunk` already does (`(this.hashTile(...) ^ this.runEntropy) >>> 0`,
  `src/threeGame.js:19830`) — WFC and the detail pass must use
  `createSeededRandom` (`src/threeGame.js:20191`), never `Math.random`.
- Generation must stay fast enough for synchronous mid-gameplay chunk
  streaming: `syncVisibleChunks` (`src/threeGame.js:13976`) calls
  `getOrCreateChunk` → `buildChunk` (`src/threeGame.js:19748`,
  `src/threeGame.js:19765`) on the main thread as the player moves. The
  meta-lattice is only 9 cells (see below) with a catalog on the order of
  10-20 tiles — collapse + propagation is trivially sub-millisecond, no
  backtracking search required.
- Deterministic for a fixed seed (reproducible for Daily Ops, same pattern
  `chunkVariation.test.js` already asserts for `buildChunk`).
- **Scope boundary:** this phase touches only the `LANDFORMS.MAZE` path and
  chunk (0,0). `FIELD`/`CANYON`/`CRATER`/`RUINS` (`src/landforms.js:41-366`)
  keep their existing dedicated functions, unchanged. They were not the
  source of the "square rooms" complaint — only the MAZE landform's plaza
  carving is.

---

### 1. Meta-tile lattice

Each 19×19 chunk is subdivided into a **3×3 lattice of 7×7 meta-tiles**,
adjacent tiles overlapping by 1 cell on their shared border
(`7 + 7 + 7 - 2×1 = 19`, so this fits the existing chunk size exactly with no
change to `chunkSize`). Lattice slot `(mx, my)` for `mx, my ∈ {0,1,2}`
occupies local grid origin `(mx*6, my*6)` through `(mx*6+6, my*6+6)`.

This is the direct fix for "tiles need to be bigger": a room is now a whole
authored 7×7 (or larger, multi-slot) shape instead of a single erosion-eaten
cell.

### 2. Tile catalog

New file `src/tileCatalog.js`, structurally parallel to `src/landforms.js`.
Each entry:

```js
{
    id: 'room-alcove-a',
    category: 'room' | 'corridor-straight' | 'corridor-turn' | 'corridor-t'
             | 'corridor-cross' | 'deadend' | 'canyon-impassable',
    tutorial: false,          // see §5
    pattern: [ /* 7 rows of 7 chars, '#' or '.' */ ],
    sockets: { n: 'CLOSED' | 'OPEN3', e: ..., s: ..., w: ... }
}
```

Sockets are deliberately just two types — `CLOSED` (7 wall cells along that
edge) or `OPEN3` (a centered 3-wide opening: `# # . . . # #`), reusing the
width-3 gap convention `applyCanyonLandform` already established
(`src/landforms.js:82-88`, `[at-1, at, at+1]`). Two facing sockets are
compatible only if they're byte-identical (`OPEN3`↔`OPEN3` or
`CLOSED`↔`CLOSED`), so the shared border row/column is always written
consistently no matter which neighboring tile "wins" the overwrite — this
makes compatibility checking (and authoring new tiles) trivial, at the cost
of giving up per-portal offset variety within a tile (see §4's explicit
trade-off note).

The catalog must include at least one tile compatible with `CLOSED` on all
four sides (a self-contained room with no forced exits) and at least one
`corridor-cross` compatible with `OPEN3` on all four sides, so a solvable
lattice always exists for any combination of fixed border constraints — this
is what makes the bounded-retry fallback in §3 essentially unreachable in
practice rather than a real failure path.

`Canyon-impassable`: interior is solid wall, sockets `OPEN3` on the two
edges parallel to its axis and `CLOSED` perpendicular — it chains into a
corridor-like run but has zero floor inside. This is a real, selectable tile
in Phase 1 (so a maze chunk can now roll a genuine dead-end/detour feature
instead of the old canyon-gap erosion accidentally carving through), but
nothing crosses it yet — that's Phase 2's ramp/bridge/ladder tiles, added
into this same socket vocabulary later.

### 3. WFC collapse

New file `src/wfcGenerator.js`, exporting `collapseChunkLattice(random,
borderConstraints)`:

1. Each of the 9 lattice cells starts with the full catalog, filtered to
   tiles whose outward-facing sockets on the chunk border match
   `borderConstraints`. Each chunk edge has 3 lattice cells along it; only
   the **middle** one carries a real outward constraint (`OPEN3` if that
   edge is open, `CLOSED` if not — see §4). The other 2 cells on that edge
   are always corner cells, always `CLOSED` outward on both their
   chunk-border-facing sides, matching today's behavior of the chunk border
   staying walled except at portals (`ensureChunkPortals`,
   `src/threeGame.js:19984`).
2. Standard WFC loop: pick the lowest-entropy undetermined cell (seeded
   random tie-break), collapse it to one tile (weighted by a per-tile
   weight, same shape as `LANDFORM_WEIGHTS`, `src/landforms.js:23-27`),
   propagate the resulting socket constraints to its up-to-4 lattice
   neighbors, repeat until every cell is resolved.
3. On contradiction (a cell's domain empties), retry the full 9-cell
   collapse with a re-derived seed, up to 5 attempts.
4. If still unresolved after 5 attempts, fall back to a hardcoded
   known-good 3×3 arrangement (corridor-cross through the center row/column,
   plain rooms in the 4 corners) — same fallback philosophy as
   `ensureChunkPortals`'s "no edges open → force east"
   (`src/threeGame.js:19992-19994`).

Resolved tiles are stamped into the chunk grid by writing each tile's 7×7
`pattern` at its lattice origin; compatible shared borders are byte-identical
by construction (§2), so last-write-wins on the overlap is safe.

Connectivity is now a cheap **9-node graph BFS** (an edge exists between two
adjacent lattice cells iff their shared socket is `OPEN3`) confirmed reachable
from every open chunk-border socket, replacing the current full 361-cell
`reachableFloorCells` flood (`src/landforms.js:106-124`) for this landform.

### 4. Portal alignment (crash-site door fix)

Today, `ensureChunkPortals` (`src/threeGame.js:19984`) picks a portal offset
anywhere across the 9-cell-wide border via `getEdgeOpening`
(`src/threeGame.js:20021`), while `clearSpawnArea`'s "blast doorway corridor"
(`src/threeGame.js:20149-20164`) independently carves a **fixed** column
range (`localX 4..13`) — the two have no relationship, so the door frequently
opens onto a wall.

Under the tile system, a chunk border's opening is only ever `CLOSED` or
`OPEN3` **centered on the middle lattice slot** of that edge (lattice index
1 of 0/1/2). This is an explicit simplification versus today's 9-position
offset — call it out plainly: **portals lose fine-grained offset variety in
exchange for every open edge being trivially predictable** (always centered),
which is what makes a hardcoded doorway corridor able to reliably target it.
`getEdgeOpening` keeps deciding open/closed per edge (unchanged seeded
roll); only the *position* becomes fixed-center instead of
`offset * 2 + 1` — its returned `offset` field is no longer consumed for
placement under this system and becomes dead weight the implementation plan
should either drop or repurpose (e.g. as an extra seed input), not silently
leave half-wired.

Chunk (0,0) itself becomes an **authored fixed layout**, not WFC-random —
a new `buildCrashSiteChunk()` alongside `buildChunk`. Its south doorway is
carved *from* the resolved south border constraint (always center-lattice
per the paragraph above) rather than the old fixed `localX 4..13` — single
source of truth, can't drift out of alignment. A regression test asserts the
carved doorway always contains the true south portal's local X.

### 5. Tutorial ring around the crash site

The 8 chunks at Chebyshev distance 1 from (0,0) get a `tutorial: true`
catalog filter applied during weighting: only `room`/`corridor-straight`/
`corridor-turn` tiles flagged `tutorial: true` (bigger, single-branch,
generously spaced — no `canyon-impassable`, no `corridor-cross`) are eligible
there. Implemented the same way `getChunkLandform`
(`src/threeGame.js:19953`) already special-cases `(0,0)`: a Chebyshev-distance
check added right beside it, no new landform enum needed since this only
changes catalog weighting, not the landform itself.

### 6. MarkovJr detail pass

The existing `MarkovGenerator` (`src/generator.js`), already used as a
4-rule smoothing pass in `runMarkovPass` (`src/threeGame.js:20029-20043`),
runs **after** WFC stamping as the texture/detail layer: additional rewrite
rules (wall-thickness variation, small alcove nibbles, rubble texture) apply
only inside each tile's interior, never on the 1-cell border ring where
sockets live. Border protection reuses the exact `protectedCells`/halo
pattern already established for this purpose in `openMazeTerrain`
(`src/landforms.js:163`, `241-250`) and `widenChunkCorridors`
(`src/threeGame.js:20045-20053`) — mark every lattice-boundary cell
protected before running detail rules. This is the direct fix for "holes and
walls too close together": spacing is now guaranteed by tile authoring, and
the detail pass is structurally forbidden from eroding it away.

The old single-cell `openMazeTerrain` plaza carving and the `widenChunkCorridors`
erosion passes are no longer run for the MAZE landform — the tile catalog is
the new source of room/corridor shape and width. Both functions stay in the
codebase for `RUINS` and other landforms that still use them
(`src/threeGame.js:19905-19925`).

---

### Testing

Following this repo's established `ThreeGame.prototype.method.call(fakeThis,
...)` pattern (`src/threeGame.chunkVariation.test.js`,
`src/threeGame.widenChunkCorridors.test.js`) and the plain-function pattern
in `src/generator.test.js`/`src/landforms.test.js`:

- **Catalog self-consistency**: every tile's declared sockets match its
  actual `pattern` border cells (an `OPEN3` socket really is `# # . . . # #`
  in the pattern, not just a label).
- **Compatibility completeness**: for every socket type pairing that can
  occur at a chunk border, at least one catalog tile exists that satisfies
  it on all constrained sides (guarantees §3's fallback path is untested
  dead code, not a silent common case).
- **Full-chunk reachability** for N seeded chunk coordinates: every floor
  cell reachable from every open chunk-border portal, mirroring the
  existing `chunkVariation.test.js` model.
- **Determinism**: same seed/coordinates → identical grid; different
  `runEntropy` → different grid (same assertions `chunkVariation.test.js`
  already makes for `buildChunk`).
- **Crash-site door regression**: `buildCrashSiteChunk()`'s carved south
  doorway column range always contains the live south portal's local X
  (the exact bug this phase fixes — must never regress silently).
- **Tutorial ring**: chunks at Chebyshev distance 1 from (0,0) never select
  a non-`tutorial` tile.

### Out of scope (explicitly deferred to Phase 2 below, not forgotten)

- **Ramp, Bridge, and Ladder tiles**, and any real player-facing crossing of
  a `canyon-impassable` tile. Phase 1 only reserves the socket vocabulary
  for these; none are built here.
- **Per-floor-cell elevation.** Today's heightmap
  (`generateHeightmapGrid`, `src/landforms.js:442`) only colors *wall* mesh
  height for visual variety — `getTerrainHeightAt`
  (`src/threeGame.js:3423`) is never consulted for floor traversal. Phase 2
  needs floor cells to carry real elevation and the player's Y to auto-step
  along it (per the chosen "auto-step, no jump input" feel, consistent with
  the existing orthographic top-down camera and the complete absence of any
  jump mechanic today).
- **Replacing FIELD/CANYON/CRATER/RUINS generation.** Their existing
  dedicated functions in `src/landforms.js` are untouched — the complaints
  driving this phase were specifically about the MAZE landform and the
  crash site.
- **Portal offset variety.** Deliberately traded away (see §4) in favor of
  predictable, always-centered openings. Could be revisited later if it
  reads as too uniform in practice, but isn't a stated goal here.

---

## Phase 2: Verticality & Pocket World Overhaul

**Goal:** Build the real vertical traversal Phase 1 deferred — Ramp,
Bridge, and Ladder tiles that let a player cross a `canyon-impassable` gap
by going up and over — and, bundled into the same phase because it's the
same underlying gap, fix the existing pocket-world feature
(`src/threeGame.js:14508-14626`, `19776-19819`), which investigation during
this design pass found to be broken in three concrete, confirmed ways (not
just "feels bad"):

1. **Surface simulation bleeds into pockets.** `takeDamage`
   (`src/threeGame.js:10798`) and `getTileType`
   (`src/threeGame.js:19443-19470`) are the *only* two places in the entire
   file that check `this.isInPocket`. Every other proximity/AI/interaction
   check — enemy chase and attack ranges, corpse touch-collect
   (`src/threeGame.js:17080`), pickup magnetism (`16629`), console/O2/
   foundry prompt ranges (`3739`, `5167`, `10241`), boss aggro tracking
   inside `updateScatter` (`18823-18840`) — is an inline
   `Math.hypot(this.player.position.x - thing.x, this.player.position.z -
  thing.z)` that never looks at Y or `isInPocket`. Since `enterPocket`
   (`14578-14603`) only ever changes `player.position.y` (X/Z stay
   identical to the hole's surface coordinates, by design — see the
   `2026-07-25` pockets spec), every one of those X/Z-only checks still
   fires against surface enemies and hazards sitting directly above a
   player who is visually and mechanically supposed to be somewhere else.
   `takeDamage`'s pocket bail-out means the player can't actually be hurt
   by this, which is exactly why the symptom reads as "enemies/layout still
   affecting the pocket" rather than "the player keeps dying in pockets" —
   prompts, corpse pickups, and AI aggro state still fire, damage just
   silently doesn't land.
2. **The pocket's only pickup is uncollectable.** Every other call site
   that creates a pickup immediately registers it —
   `this.pickupMeshes.push(pickup)` (`10134`, `11042`, `16866`, `16874`,
   `18077`, `18093`, `18110`, `19148`) — because `updatePickups`
   (`16619-16623`) only iterates `this.pickupMeshes`, never scene children
   generally. `mountPocket`'s pickup (`14561-14565`) is created and added to
   the pocket's THREE.Group but is the **only** call site in the file that
   skips the `pickupMeshes.push` — it is permanently visible and
   permanently uncollectable. This is very plausibly the concrete thing
   behind "isn't really exists."
3. **The layout itself is the thinnest, least-developed space in the
   game.** `generatePocket` (`19776-19819`) is a raw recursive-backtracker
   DFS maze on an 11×11 grid (`POCKET_CELL_COUNT = 5`, `src/threeGame.js:203`)
   — the *same* primitive `buildChunk` starts from, but with none of
   `buildChunk`'s follow-on passes (no `runMarkovPass`, no
   `openMazeTerrain` plaza carving, no `widenChunkCorridors`, no landform
   texture). Every corridor is exactly 1 cell wide with no rooms — the
   "super narrow" complaint is architecturally accurate, not a matter of
   taste.

**Architecture:** Two independent-but-adjacent tracks under one phase.
Track A (surface elevation) extends the Phase 1 tile/socket system in
place. Track B (pocket fixes) reuses Phase 1's tile catalog and WFC solver
at a smaller scale, plus a single centralized simulation-pause gate. They
share the tile catalog and WFC solver as their only common dependency —
neither blocks the other's implementation order.

### Global Constraints

- Same seeded-random/`runEntropy` discipline as Phase 1
  (`src/threeGame.js:19830`-style folding, `createSeededRandom`).
- No new collision axis: elevation stays cosmetic/positional (bridges,
  ramps) exactly as Phase 1 committed to for the tile system generally —
  `canOccupyPosition` (`19316-19402`) keeps doing X/Z-only collision. This
  also matches the existing `2026-07-25-survivable-falls-and-pockets-design.md`
  precedent, which made the same call for the fall/pocket mechanic.
- No jump input, per the Phase 1 brainstorm decision: auto-step elevation
  only, consistent with the orthographic top-down camera
  (`src/threeGame.js:973`) and the total absence of a jump mechanic today.

---

### Track A: Ramp, Bridge, and Ladder tiles

1. **Elevation tag on sockets.** Extend the tile-catalog socket model
   (Phase 1 §2) so a single edge can carry **up to two independent
   sockets** — one per elevation layer (`ground`, `elevated`), each still
   typed `CLOSED`/`OPEN3`. Every Phase-1 tile implicitly declares only a
   `ground` socket per edge (nothing changes for them). Two facing sockets
   are compatible only if both their layer and their open/closed type
   match, so `ground`-only tiles simply never connect to `elevated`-only
   ones — no separate compatibility rules needed beyond what Phase 1
   already specified, just one more axis on the same comparison.
   `Canyon-impassable` keeps its axis-parallel `ground` `OPEN3` sockets
   unchanged from Phase 1, and its perpendicular edges (the gap itself, a
   `ground` `CLOSED` pair) additionally gain an `elevated` `OPEN3` pair
   spanning the same gap — reachable only by tiles that also declare an
   `elevated` socket there, which before this track existed was no tile at
   all.
2. **New tiles:** `Ramp` (one `ground` socket, one `elevated` socket,
   opposite edges, pattern rises across the tile's interior) and `Bridge`
   (both sockets `elevated`, spans a `canyon-impassable` gap — a `Room`/
   `Corridor` shape authored at height, no new mechanic beyond what Ramp
   already provides). `Ladder` is a `Ramp` authored at a steeper
   width-1 footprint rather than a new socket/mechanic — same transition,
   different authored slope.
3. **Real floor elevation.** `generateHeightmapGrid`
   (`src/landforms.js:442-468`) currently only assigns heights where
   `grid[y][x] === '#'` (wall mesh height only) — floor cells always fall
   through to `TERRAIN_HEIGHTS.GROUND`. Extend it to also assign
   `TERRAIN_HEIGHTS.TERRACE`-equivalent values to floor cells stamped by
   `Ramp`/`Bridge`/`Ladder` tiles (a smooth gradient across a ramp's
   interior, not just a flat step, so movement across it reads as sloped
   rather than a stair-step). `getTerrainHeightAt`
   (`src/threeGame.js:3423-3435`) already reads `chunk.heightmap` generically
   for any world X/Z — no change needed there, floor elevation flows
   through for free once the heightmap carries it.
4. **Auto-step movement.** In `updatePlayer`, lerp `player.position.y`
   toward `this.getTerrainHeightAt(player.position.x, player.position.z)`
   each frame (`THREE.MathUtils.lerp` at a fixed rate, same pattern already
   used for camera following at `src/threeGame.js:13949`) instead of
   holding it at a constant `0`. This is additive: the existing fall
   animation's temporary Y override (`src/threeGame.js:11166-11187`,
   per the pockets spec) still wins while active; auto-step only governs Y
   when the player isn't mid-fall.

### Track B: Pocket world overhaul

1. **Fix the simulation-bleed bug (finding 1 above).** In `render()`
   (`src/threeGame.js:4482-4507`), wrap the surface-only per-frame calls —
   `updateBunkerBlastDoor`, `updateBiomeEnvironment`, `updateScatter`,
   `updatePickups`, `updateCorpses`, `updateLoreDrops`,
   `updateBuildSiteBeacon`, `updateConsoles`, `updateLoreTerminals` — in
   `if (!this.isInPocket)`, and add a new `updatePocketContent(delta, now)`
   call gated `if (this.isInPocket)` (see point 3). This is a single,
   centralized gate rather than patching the 10+ scattered `Math.hypot`
   call sites individually — lower risk in a 20k-line file, and it follows
   an existing precedent in the same function: `hasBlockingGameplayOverlay`
   (`4458-4464`) already short-circuits most of this exact call list for
   cinematics. `updatePlayer`, `updateWeaponState`, `updateProjectiles`,
   `updateCamera`, and `syncVisibleChunks` stay unconditional — the player
   must still move/fight/see the camera follow, and surface chunks must
   keep streaming in the background so the world is ready the instant the
   player climbs out.
   - **Companions**: for v1, have them wait at the hole's surface position
     while the player is in a pocket (skip their pocket-following) rather
     than redesigning companion pathing for a second Y-layer — an explicit
     scope call, not a silent gap.
2. **Fix the uncollectable pickup (finding 2 above).** Add the missing
   `this.pickupMeshes.push(pickup)` right after `mountPocket` creates its
   pickup (`src/threeGame.js:14564`) — a one-line, isolated, already-diagnosed
   fix, bundled here since it's the same code path this track is already
   rewriting.
3. **Rebuild pocket generation on the Phase 1 tile system (finding 3
   above).** Replace `generatePocket`'s raw DFS carve
   (`19776-19819`) with the same `src/wfcGenerator.js` +
   `src/tileCatalog.js` from Phase 1, at a smaller **2×2 lattice** of the
   same 7×7 tiles (`7 + 7 − 1 = 13`, so `POCKET_CELL_COUNT`/size grows from
   11×11 to 13×13 — modestly bigger, matching Phase 1's bigger-tile
   philosophy). A pocket has no neighboring chunks, so all 4 outward
   lattice sockets are forced `CLOSED` — self-contained by construction,
   and the §3 fallback arrangement from Phase 1 (rare on the surface)
   becomes the routine, always-cheap case here. Use the existing
   `tutorial: true` catalog filter (Phase 1 §5) for pocket tile selection
   too — calmer, roomier shapes suit a small bonus space better than a
   `corridor-cross`/`canyon-impassable`-heavy roll.
   - **Real content:** place 1-2 pocket-native enemies using the existing
     enemy-spawn helpers (no new enemy type needed — reuse a simple,
     stationary/short-range archetype already in the roster), positioned
     with the same local-to-world offset `mountPocket` already uses for
     walls (`worldX: holeWorldX + (x - pocket.centerCell.x)`,
     `src/threeGame.js:14536`). These are driven by the new
     `updatePocketContent` call from point 1, not `updateScatter` — they
     never enter `this.scatterSprites`, so they can't be seen or targeted
     from the surface (the isolation this track is fixing, applied in the
     other direction too).

---

### Testing

Following the same `ThreeGame.prototype.method.call(fakeThis, ...)` pattern
as Phase 1 and `src/threeGame.holeTiles.test.js`:

- **Simulation pause**: with `isInPocket = true`, `updateScatter`/
  `updatePickups`/`updateCorpses`/`updateConsoles` are never called from
  `render()`'s dispatch (spy/mock the methods, assert zero calls); with
  `isInPocket = false`, they're called exactly as before.
- **Pickup registration**: after `mountPocket`, the created pickup is
  present in `this.pickupMeshes` (regression test for finding 2 — must
  fail against the old code, pass against the fix).
- **Pocket layout**: the rebuilt `generatePocket` produces a fully
  reachable 13×13 grid (BFS from `centerCell`, same reachability model as
  Phase 1's tests) with at least one multi-cell-wide room, not a uniformly
  1-wide maze.
- **Elevation continuity**: for a chunk containing a `Ramp` tile,
  `getTerrainHeightAt` returns a monotonic gradient (no discontinuous
  jumps) walking across the ramp's footprint from its `ground` to its
  `elevated` socket.
- **Bridge/canyon crossing**: a chunk with `canyon-impassable` +
  `Ramp`/`Bridge` tiles is reachable end-to-end via the elevated-socket
  graph, where it was provably unreachable via ground-only sockets alone
  (regression-style test proving the crossing actually requires the new
  tiles, not an accidental ground-level gap).

### Out of scope (explicitly deferred, not forgotten)

- **Falling off a ramp/bridge as a hazard.** Auto-step elevation has no
  fail state in v1 — walking off the side of an elevated tile isn't
  possible because `canOccupyPosition` collision (unchanged, X/Z-only)
  keeps the player on authored floor cells exactly as it does everywhere
  else today.
- **Ladder climb animation / distinct input feel.** Ladders are a Ramp
  variant at the tile-authoring level only (§Track A, point 2) — no new
  climbing verb, camera behavior, or input handling.
- **Companions following into pockets**, and **multi-level pockets**
  (a pocket reachable from within another pocket). Both are natural
  follow-ups once this track's core fixes are proven, not required for it.
- **New enemy archetypes authored specifically for pockets.** Track B
  reuses an existing simple enemy type; a bespoke "pocket dweller" enemy
  is a content task, not part of this design.
- **Revisiting the fall-damage/`fallHardening` mechanics** from the
  `2026-07-25-survivable-falls-and-pockets-design.md` spec — those are
  unchanged by this phase; only the pocket's *contents* and *isolation*
  are in scope here.
