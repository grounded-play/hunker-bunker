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

## Track D -- idle-menu freeze investigation, and a hard environment limit

Followed Track C's open item directly: took a live Playwright session
sitting idle on the loadout/roster screen (the same `.map-box` character-
selection view the original 3.9s/6.5s freezes were seen on) and captured
real evidence three different ways -- a CDP `Profiler` CPU sample (200us
interval), a full CDP `Tracing` capture (devtools.timeline/blink/v8
categories), and the browser's own native `PerformanceObserver({type:
'longtask'})` plus a per-frame `requestAnimationFrame` timer, matching the
exact mechanism the original bug report used.

**Critical finding, discovered mid-investigation:** this sandbox's Chrome
renders WebGL through **SwiftShader** -- confirmed via
`WEBGL_debug_renderer_info` on the game's own live `renderer.getContext()`,
returning `ANGLE (... SwiftShader Device ... SwiftShader driver)`. That's
pure software rasterization, not the real GPU a player's machine uses.
Every absolute timing number gathered live in this sandbox this pass --
here and in the rest of this document's Track C verification -- carries
that caveat: draw-call and shader-program-switch costs on SwiftShader are
inflated by an unknown, likely large factor versus real hardware. This
doesn't invalidate *relative* findings (below), but it means **the exact
3.9s/6.5s freeze magnitude was not reproduced or explained by this
investigation**, and no fix here should be read as confirmed against real
hardware.

What the live evidence did show, hands-off (no Playwright tool calls
mid-capture, ruling out automation overhead as the cause):

- The loadout/roster screen ran at a **sustained ~7fps** (125-155ms per
  animation frame, continuously, not as an occasional spike) for the
  entire time it was open and idle -- not the discrete rare freeze the
  original report described, but a persistently degraded baseline. The
  3.9s/6.5s outliers previously logged are plausibly just the tail of this
  same distribution, not a separate mechanism.
- A CDP `Tracing` capture confirmed ~92% of a clean 30-second window was
  spent in `GPUTask` on the GPU process thread, not JS. The CPU profiler's
  JS-only view was consistent: `(program)` (the profiler's "not JS, not
  idle" bucket) dominated at ~32s of a 45s window, while every actual JS
  function's self-time summed to a few hundred ms at most.
- Monkey-patching `WebGL2RenderingContext.prototype.drawElements` /
  `useProgram` per-canvas and capturing real JS stacks traced the cost
  conclusively back to `ThreeGame.render()` (`src/threeGame.js:6535` at
  the time) via the normal `renderer.setAnimationLoop` path -- not a
  duplicate renderer, not a leaked second loop. The existing
  `menuFrameIntervalMs = 1000 / 30` throttle (`src/threeGame.js:1446`) was
  confirmed present and working correctly -- call *frequency* was never
  the problem; individual `render()` calls were themselves taking
  4-5x their throttled budget to finish.
- Ruled out two live hypotheses with direct evidence rather than leaving
  them speculative: `this.transientEffects.length` stayed at 2 across the
  whole idle session (no leak from `_spawnSprintTrail()`'s unbounded
  spawning -- each particle's own `dispose()` is working), and a
  JS-level `readPixels` patch caught zero real calls across 45s+ of pure
  idle wait (an earlier apparent GPU-readback storm during active
  Playwright tool use was self-inflicted automation overhead, not a game
  bug -- caught and corrected before it became a false lead).
- One concrete, unambiguous waste found and fixed regardless of the
  SwiftShader caveat: `#game-container` was observed, live, sitting at
  `getBoundingClientRect()` `0x0` (reparented into a closed/hidden
  `.map-box` preview slot) while `ThreeGame.render()` kept doing its full
  per-frame update-and-draw pass every tick anyway. A canvas nobody can
  see should never cost render time, on any hardware -- this is fixed
  now (see below), independent of whether it explains the original
  freeze.

**Fix shipped this pass:** `render()` (`src/threeGame.js`) now returns
immediately when `this.container` has collapsed to `0x0`, before touching
any shader uniforms, scene updates, or `renderer.render()`. Unit-tested in
`src/threeGame.menuRenderContainerGuard.test.js` (verified to fail without
the guard, passes with it). This is a real, safe efficiency fix, not a
speculative one -- but be honest that it was not confirmed to be *the*
cause of the original 3.9s/6.5s freezes; it's a genuine waste this
investigation happened to catch along the way.

**Still open, and now instrumented for next time:** what actually causes
the multi-second freezes remains unconfirmed on real hardware. Rather than
ship a speculative fix based on confounded software-rendering data (the
same mistake this document already caught itself making once with the
false chunk-mount lead), `startGameplayLongTaskDiagnostics()` (`main.js`)
now attaches a `menuRenderSnapshot` (draw calls, triangles, container
size, scene object count, transient-effect count) to any long task that's
still unattributed (`lastPhase: null`) while `performanceProfile ===
'menu'`. The next real playtest session log that catches one of these will
carry the exact context needed to confirm or rule out the render-cost
hypothesis above -- without another blind live-debugging pass. Testing
against the packaged Electron build (real GPU, not this dev-server
sandbox) is the recommended next step before attempting any further fix
here.

## What ships this pass

- **Track A**: the time-budget scheduling fix in
  `processPendingChunkMounts`/`prepareVisibleChunksForGameplay`, unit-
  tested and live-verified against the running dev server.
- **Track C's fix**: `tagPerfPhase()` timestamping + the 500ms staleness
  check in `startGameplayLongTaskDiagnostics()`, live-verified to correctly
  reject a stale tag instead of misattributing.
- **Track D's fix**: `render()`'s 0x0-container guard
  (`src/threeGame.js`), unit-tested, plus the `menuRenderSnapshot`
  diagnostic addition to `startGameplayLongTaskDiagnostics()` for the next
  real-hardware investigation.
- **Not shipped**: Track B (mountChunk's own constant-factor cost) stays
  documented as follow-up backlog. The actual root cause of the
  multi-second idle-menu freezes remains unconfirmed -- this sandbox's
  SwiftShader (software) rendering makes it unsuitable for measuring the
  exact magnitude, and shipping a fix without real-hardware evidence risks
  repeating the false-lead mistake Track C already corrected once. Testing
  the packaged Electron build on real hardware is the recommended next
  step.

## Lane F attribution instrumentation (2026-08-20)

The first Lane F implementation slice is now in place. `ThreeGame` records
bounded nested phase history for frame rendering, chunk mounts, wall damage,
wall destruction, and `gear-poof` effect creation. Each span includes its
duration and small context payload; history is capped so diagnostics cannot
become a new unbounded allocation source. The game also exposes renderer
draw calls/triangles, scene and transient-effect counts, wall/chunk counts,
renderer memory counters, and available JS heap usage through
`getPerformanceDiagnosticsSnapshot()`.

`main.js` includes the active/recent phase history and counters with long-task
diagnostics. This completes Lane F's attribution prerequisite and is covered
by `src/threeGame.performanceDiagnostics.test.js` plus the existing chunk,
wall, and render-guard suites. It does not claim a performance fix: the next
required evidence is a packaged Windows rerun of the log10 reproduction
matrix, using the new nested phase/counter data to identify whether wall
destruction, VFX allocation, streaming, or renderer/asset first-use work is
responsible before changing those systems.
