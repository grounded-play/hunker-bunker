# Chunk-Mount Performance Plan

Date: 2026-08-20. Traces the "recurring chunk-mount long-task warnings
(50–996ms)" item already flagged in `docs/sprint26-master-plan-2026-08-19.md`'s
open backlog and reconfirmed live in `docs/logs/log8.json` (a real Steam
build playtest — dozens of `Long task` warnings tagged
`lastPhase: "chunk-mount:X,Y"`, several over 500ms, one at 996ms, mostly
during initial world streaming and again during the second run's chunk
staging).

**Correction, same day, after live-testing this plan's own fix:** Track A
below (the scheduling fix) is real, implemented, and unit-tested — but a
live Playwright session against a real running instance turned up
something the original analysis got wrong. Read "Track C — the
attribution bug this investigation actually found" before trusting the
`chunk-mount:X,Y` tag on any long task that happened while the game was
sitting idle (menu, loadout, armory) rather than actively streaming
chunks — that specific attribution was a diagnostic artifact, not a real
repeated chunk-mount. The underlying long tasks are real (one was 6.5
seconds), just not caused by what they were tagged with. That's now
fixed (the tag can no longer report stale), but **what's actually
causing multi-second freezes on an idle menu screen is a new, still-open
question** -- see Track C's own open item.

## Root cause, read directly from the code (not guessed)

`ThreeGame.mountChunk(chunkX, chunkY)` (`src/threeGame.js:20437` as of
this pass -- line numbers throughout this section shift slightly with
each edit to the file; treat them as approximate signposts, not pinned
references) is a single fully-synchronous function that builds an entire
49×49-tile chunk's geometry, decorations, enemies, loot, and lighting in
one call, with **zero yield points**. `CHUNK_SIZE = LATTICE * (TILE_SIZE-1)
+ 1 = 3 * 16 + 1 = 49`, so every chunk mount walks a 2,401-cell grid at
least twice (once for terrain/walls, once again for `getRoomTypeGrid`'s
dead-end/chamber light pass), plus several more passes for scatter/prop/
pickup placement.

Concrete cost centers found in that one function, in the order they run:

1. **Main tile loop** (`src/threeGame.js:20684`, 49×49 cells): every wall
   tile (`#`) creates a brand-new seeded RNG (`this.createSeededRandom(...)`,
   cheap per call — confirmed it's a plain xorshift32 closure, not a hash —
   but still real allocation + branch cost repeated hundreds of times per
   chunk) to decide hole/hazard/pillar/bracket/vent/pipe/standard variant,
   with several branches allocating a full individual `THREE.Mesh` +
   `THREE.MeshStandardMaterial` (hazard walls, every procedural door and
   its status bar / control buttons / ribs) instead of going through the
   instance-matrix pools the comment at `src/threeGame.js:20545` already
   explains was a deliberate optimization for pit/hole tiles specifically
   — doors and hazard walls never got the same treatment.
2. **Conditional `createScatterInstance()` calls inline in that same loop**
   (`src/threeGame.js:20873`, ~40% of hole tiles spawn a
   `fungal_spore_vent`) — a real sprite/material/userData construction,
   not just a matrix push.
3. **Three more full placement passes after the tile loop**:
   `createChunkScatterPlacements` + one `createScatterInstance()` per
   result (`src/threeGame.js:21222`), `createChunkSetPiecePlacements` +
   `createScatterInstance()` again (`:21231`), `createChunkPickupPlacements`
   + `createPickupInstance()` (`:21239`) — each its own placement-generation
   algorithm plus per-placement object construction.
4. **A second full 49×49 loop** for dead-end/chamber reward-glow placement
   (`src/threeGame.js:21260`).
5. **12-20+ separate `new THREE.InstancedMesh(...)` allocations at the end**
   of the function (floors, ledges, void patches, cliffs × N biomes present,
   cliff-edges × N biomes, canyon-drop-skirts × N biomes, rubble, walls × N
   room-styles, pillars × N room-styles, brackets × N room-styles, vents,
   pipes, door panels) — each allocates a `Float32Array` sized by instance
   count and uploads it to the GPU. A "large-room" maze chunk (the
   architecture type in every slow entry in `log8.json`) can plausibly hit
   double digits of these per single chunk.

None of this is a leak or an accident — it's a genuinely large amount of
real, necessary work for a fully-destructible, richly-decorated procedural
chunk. The problem is entirely **where it runs**: all of it happens inside
one synchronous call with nothing to yield control back to the browser
between chunks, or even between the expensive phases within one chunk.

## The scheduling bug that turns this into a 900ms+ spike

`processPendingChunkMounts(limit = 1)` (`src/threeGame.js`, near line
19444 as of this pass) mounts up
to `limit` chunks in a tight loop with no yield between them.
`prepareVisibleChunksForGameplay` (`:19426`, the initial-deploy chunk
staging path — where every slow entry in `log8.json` came from) calls it
with `batchSize = 3`, `await`ing a `requestAnimationFrame` only *between*
batches of 3, not between the 3 individual chunk mounts inside one batch.
So a single reported "long task" can be the sum of up to three
`mountChunk` calls stacked back-to-back with no yield at all — this is
**structurally provable from the code as written**, independent of any
live profiling, and is very likely why the measured spikes (up to 996ms)
run several times larger than mountChunk's own previously-measured
20-50ms/chunk baseline (see the comment at `src/threeGame.js:20548`,
written when only the pit/hole tiles were pooled) — that number predates
both the doors/hazard-walls-still-individual-Mesh gap and the
fixed-`batchSize=3`-with-no-inner-yield scheduling.

## Plan, in two tracks

### Track A — scheduling fix (low risk, this pass)

Replace the fixed `batchSize = 3` chunk-count budget with a **time
budget**: keep mounting chunks in the current batch only while the elapsed
wall-clock time since the batch started is under a threshold (something
like 8ms, leaving headroom in a 16.6ms frame for the rest of the render
loop), then yield via `requestAnimationFrame` regardless of how many
chunks that ends up being. This doesn't reduce the total work `mountChunk`
does — it caps how much of it can ever land in one uninterrupted script
execution, which is what actually produces a "long task" warning and a
visible hitch. Lower risk than touching `mountChunk`'s internals: the
change is entirely in the scheduling loop, `mountChunk` itself is
untouched, and the existing per-chunk correctness (nothing here is order-
dependent) doesn't change.

### Track B — reduce mountChunk's own constant-factor cost (larger, staged)

Not attempted this pass — each of these needs to be profiled with real
before/after numbers (live in a browser, not guessed), staged as separate
changes so a regression in one is isolable:

1. Route hazard walls and procedural doors' fixed decoration meshes
   (status bar, control buttons) through the same instance-matrix-pool
   pattern already used for pits/holes, rather than individual `THREE.Mesh`
   + fresh `MeshStandardMaterial` per instance. Doors already build
   `doorPanelMatrices` for their control panels — the door slab itself and
   its status bar don't get the same treatment yet.
2. Investigate whether the dead-end/chamber light pass (`getRoomTypeGrid`,
   the second full grid walk) can reuse data already computed during the
   main tile loop instead of re-deriving room types from scratch.
3. Investigate consolidating the InstancedMesh pool count per chunk --
   e.g., whether cliff/cliff-edge/canyon-drop-skirt pools split by biome
   need to be separate GPU objects when a chunk typically sits in one
   biome, or whether a single-biome fast path could skip the per-biome
   bucketing entirely for the common case.
4. The largest-scope option, genuinely a separate initiative: move the
   *data-only* parts of chunk generation (grid classification, matrix
   computation as plain typed arrays, RNG-driven placement decisions) into
   a Web Worker, leaving the main thread only the actual
   `new THREE.InstancedMesh(...)` + `scene.add()` calls (WebGL objects
   can't be touched off-thread). This is the AAA-polish plan's own
   "move heavy world/chunk work off the critical frame" recommendation
   (`docs/design/aaa-polish-and-studio-strategy.md`) -- real, but a
   multi-day redesign of the chunk-generation data flow, not a
   same-session fix.

### Track C — the attribution bug this investigation actually found

Live-tested Track A against the running dev server via Playwright (title
screen → new run → loadout → armory, with realistic pauses between
clicks, not just reasoning about the code) to confirm it actually reduces
long-task spikes during real chunk streaming. It does. But the same
session, just sitting idle on the menu/loadout screen doing nothing,
produced its own long tasks -- including a real 3.9-second one and a real
6.5-second one -- and every single one was reported as
`lastPhase: "chunk-mount:100,100"`.

That looked at first like a real, severe bug: (100,100) is the real,
deliberate spawn coordinate `getSpawnTile()` (`src/threeGame.js:28635`)
uses while `performanceProfile === 'menu'`, specifically chosen "to keep
the showcase completely blank" behind the menu UI. Dozens of multi-hundred-
ms "chunk-mount:100,100" entries looked like that supposedly-blank chunk
being repeatedly, wastefully re-mounted while the player just sat on a
menu screen.

**It wasn't.** Traced it fully before writing anything else down:

- `window.__hbLastPerfPhase` (the tag the longtask observer reads) has
  exactly two writers in the whole codebase (confirmed by grep): the
  chunk-mount site and `spawnGearPoofEffect`. Neither fires while sitting
  idle on a menu screen -- confirmed by reading `render()`'s `menu` branch
  (`src/threeGame.js:6484` onward), which never calls
  `syncVisibleChunks()` at all.
- Queried the live page directly (`window.game.pendingChunkMounts`,
  `.chunkMeshes`) while idle on the menu: exactly one chunk had ever been
  mounted (the initial (100,100) from the constructor's one-time
  `syncVisibleChunks(true)` boot call), and its 8 immediate neighbors sat
  in `pendingChunkMounts` completely untouched, this whole time -- nothing
  was draining that queue. No repeated mounting was happening at all.
- So the tag was simply never updated again after that single boot-time
  mount, and every unrelated long task from then on -- for as long as the
  tab stayed idle -- silently inherited that stale label. The original
  design comment at the tag's write site even names the assumption this
  breaks: "since JS is single-threaded, by the time this callback runs it
  still names whichever [phase] was most recently active" -- true only if
  *something* tagged ran recently, which nothing does during idle menu
  time.

**Fixed:** `tagPerfPhase()` (`src/threeGame.js`, replacing both direct
writes) now timestamps the tag; `startGameplayLongTaskDiagnostics()`
(`main.js`) rejects it as unattributed (`lastPhase: null`) once it's more
than 500ms stale instead of trusting it unconditionally. Live-reverified
after the fix: the same idle-menu long tasks (310ms, 53ms in the
verification run) now correctly report `lastPhase: null` instead of a
false chunk-mount blame.

**Still open -- a real, separate finding, not resolved by the fix above:**
something genuinely freezes the main thread for multiple seconds while
the game is sitting completely idle on the menu/loadout/armory screens,
with nothing tagged running at all. The fix here makes this diagnosable
going forward (a real session log will now show `lastPhase: null` for
these instead of a misleading chunk-mount label) but doesn't identify the
actual cause. Candidates worth checking next, roughly in order of
likelihood: shader/texture compilation stutter the first time a given
material combination is used (classic one-big-spike-then-smaller-repeats
pattern, which is what was observed: one 3.9s/6.5s outlier, then a tail of
~100-300ms ones), GC pressure from `updateMenuShowcase`'s continuous
particle/trail spawning while idle (`_spawnSprintTrail()`,
`src/threeGame.js:6407` onward -- fires on ~28% of animation-cycle frames,
unbounded over an arbitrarily long idle period), or something in the
menu's own render path unrelated to gameplay systems entirely. This is
exactly the kind of thing Sprint 26's own backlog flagged as a suspected-
but-never-confirmed "6-second freeze / GC-pressure hypothesis" --
plausibly the same freeze, now reproduced live and with real numbers
instead of a hypothesis.

## What ships this pass

- **Track A**: the time-budget scheduling fix in
  `processPendingChunkMounts`/`prepareVisibleChunksForGameplay`, unit-
  tested and live-verified against the running dev server.
- **Track C's fix**: `tagPerfPhase()` timestamping + the 500ms staleness
  check in `startGameplayLongTaskDiagnostics()`, live-verified to correctly
  reject a stale tag instead of misattributing.
- **Not shipped**: Track B (mountChunk's own constant-factor cost) stays
  documented as follow-up backlog. Track C's open item (what's actually
  causing multi-second idle-menu freezes) is a new, real, unsolved
  question for the next investigation -- now armed with trustworthy
  attribution data instead of a false lead.
