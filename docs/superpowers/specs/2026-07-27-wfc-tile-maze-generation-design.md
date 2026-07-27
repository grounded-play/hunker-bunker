# WFC Tile-Based Maze Generation — Design (Phase 1)

> **For agentic workers:** This is a brainstorm spec, not an implementation
> plan. The next step is `superpowers:writing-plans` against this document.

**Goal:** Replace the MAZE landform's ad-hoc generation (recursive-backtracker
DFS carve → 4-rule Markov smoothing → single-cell ellipse/diamond/cross
"plaza" carving → probabilistic erosion widen/trim) with a **WFC macro-tile
layout**: an authored catalog of room/corridor/canyon meta-tiles placed by
Wave Function Collapse constraint propagation, then detailed by an extended
version of the existing MarkovJr-style rewrite engine. This targets four
concrete complaints from actual play: rooms reading as uniform blobs, the
crash-site exit corridor not reliably connecting to the next chunk, tiles
feeling too small/thin, and walls/gaps sitting too close together as a side
effect of erosion passes. **Phase 2** (a separate future spec) adds real
vertical traversal — ramps, bridges, ladders, and a genuinely impassable
canyon tile — on top of the tile vocabulary this phase establishes.

**Architecture:** No change to the grid representation (`'#'`/`'.'` character
grid), chunk size (`this.chunkSize = 19`, `src/threeGame.js:693`), or the
downstream consumers of that grid (collision, rendering, radar, pickups,
`applyRingRoadSystem`, `clearDoorways`) — this is a drop-in replacement for
*how* the MAZE landform's grid gets filled, not a new rendering or collision
system. `buildChunk` (`src/threeGame.js:19822`) still returns the same
19×19 array of `'#'`/`'.'` (plus existing special chars like `'D'`) it does
today.

## Global Constraints

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

## 1. Meta-tile lattice

Each 19×19 chunk is subdivided into a **3×3 lattice of 7×7 meta-tiles**,
adjacent tiles overlapping by 1 cell on their shared border
(`7 + 7 + 7 - 2×1 = 19`, so this fits the existing chunk size exactly with no
change to `chunkSize`). Lattice slot `(mx, my)` for `mx, my ∈ {0,1,2}`
occupies local grid origin `(mx*6, my*6)` through `(mx*6+6, my*6+6)`.

This is the direct fix for "tiles need to be bigger": a room is now a whole
authored 7×7 (or larger, multi-slot) shape instead of a single erosion-eaten
cell.

## 2. Tile catalog

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

## 3. WFC collapse

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

## 4. Portal alignment (crash-site door fix)

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

## 5. Tutorial ring around the crash site

The 8 chunks at Chebyshev distance 1 from (0,0) get a `tutorial: true`
catalog filter applied during weighting: only `room`/`corridor-straight`/
`corridor-turn` tiles flagged `tutorial: true` (bigger, single-branch,
generously spaced — no `canyon-impassable`, no `corridor-cross`) are eligible
there. Implemented the same way `getChunkLandform`
(`src/threeGame.js:19953`) already special-cases `(0,0)`: a Chebyshev-distance
check added right beside it, no new landform enum needed since this only
changes catalog weighting, not the landform itself.

## 6. MarkovJr detail pass

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

## Testing

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

## Out of scope (explicitly deferred to Phase 2, not forgotten)

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
