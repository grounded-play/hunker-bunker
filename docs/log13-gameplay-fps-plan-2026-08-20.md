# Gameplay FPS Investigation — log13.json

Date: 2026-08-20. Source: `docs/logs/log13.json`, a real packaged Steam build
playtest (`HunkerBunker/2.2.0`, Electron 43, Windows) reporting
"it's not really running well".

This continues the perf work in `docs/perf-chunk-mount-plan-2026-08-20.md`.
That plan's Track A fix **worked** and is not the problem any more: log13
contains only 18 chunk mounts totalling 518ms (30ms median, 38ms worst),
versus the up-to-996ms single mounts that motivated it. The remaining
slowness is somewhere else.

## What the log actually says

The session is 145.3s long and contains **189 long tasks totalling 15,915ms —
11.0% of the entire session spent with the main thread blocked.**

Every one of those long tasks is tagged `lastPhase: "frame:render"` with
`activePhases: []`. That combination is not "rendering is slow"; it means the
stall happened while *no instrumented phase was open*. `renderWithPerf()`
(`src/threeGame.js`) only ever wrapped the GPU submit:

```js
renderWithPerf(label = 'frame:render') {
    const span = beginPerfPhase(label, this.getPerformanceDiagnosticsSnapshot());
    try {
        if (this.composer && this.performanceProfile === 'gameplay') this.composer.render();
        else this.renderer.render(this.scene, this.camera);
    } finally { span.end(); }
}
```

So the log could prove *that* frames were slow but had no vocabulary for
*why*. Reconstructing every `frame:render` sample carried in the long tasks'
`recentPhases` windows and splitting each long task into "time inside
frame:render" vs "time not inside it" gives:

| | ms | share |
|---|---|---|
| Long-task time inside `frame:render` | 5,254 | 37.3% |
| Long-task time in uninstrumented update code | 8,825 | 62.7% |

Two separate problems, and the bigger one was invisible.

**Caveat on the frame-interval numbers:** frame samples only exist inside the
64-entry history captured *when a long task fires*, so the reconstructed
"52ms median interval / 19 FPS" is biased toward bad periods and is not the
session's true average. The unbiased figure is `state.renderer.frame` = 3,791
frames over 145.3s, but that mixes in the deliberately frame-capped menu.
Treat the 11%-blocked figure as the trustworthy headline.

## Root cause #1 (confirmed): a shader recompilation storm

The worst individual frames in the log are these five, all within a 2.1-second
window just after gameplay starts:

```
t=107314   208.4ms  programs=56  activeChunks=10
t=108114   592.5ms  programs=71  activeChunks=11
t=108743   225.6ms  programs=77  activeChunks=11
t=109004   382.2ms  programs=82  activeChunks=11
t=109453   253.6ms  programs=88  activeChunks=11
```

`programs` climbs 56 → 71 → 77 → 82 → 88 while each frame stalls for hundreds
of milliseconds: **~1.66 seconds of frozen gameplay, and the freeze is
literally the GPU driver compiling new shader programs.**

The cause is `updateEnvLightBudget()` (`src/threeGame.js`), which runs every
0.35s and does:

```js
withDistance.sort((a, b) => a.distSq - b.distSq);
withDistance.forEach(({ light }, index) => {
    light.visible = index < budget;   // ENV_LIGHT_BUDGET = 8
});
```

That looks like a pure culling optimisation. It is not, because of how
three.js keys its shader program cache. Verified by reading the installed
r185 source rather than from memory:

1. `WebGLRenderer.js:1833` — `projectObject()` starts with
   `if ( object.visible === false ) return;`, so a light with `visible=false`
   is never pushed into the render state's light list.
2. `WebGLPrograms.js:338-340` — the program parameters include
   `numPointLights: lights.point.length` (plus `numDirLights`,
   `numSpotLights`).
3. `WebGLPrograms.js:472-481` — `getProgramCacheKeyParameters()` pushes
   `numDirLights`, `numPointLights`, `numSpotLights`, `numPointLightShadows`,
   … straight into the program cache key.

So **the number of currently-visible lights is part of every material's
shader cache key.** Each time `updateEnvLightBudget` changes how many env
lights are visible, every material in view needs a program it has never
compiled before, and compiles it synchronously, mid-frame. Walking around a
lit area flips that count constantly.

This also explains why the existing warm-up doesn't help. The staging code
does call `this.renderer.compile(this.scene, this.camera)` behind the loading
screen — but it compiles for whatever light count happened to be live at that
instant. The moment the budget shifts, every one of those programs is a cache
miss again.

The cost is bounded (once counts 0..8 have all been seen, the programs are
cached), which matches the shape in the log: a violent stutter storm in the
first seconds of a run that gradually settles. It is exactly the window a
player experiences as "it's not really running well".

### The fix

Keep the *count* of lights the renderer sees constant, instead of keeping the
set of lights constant. Replace visibility-toggling with a fixed-size pool of
`ENV_LIGHT_BUDGET` `PointLight`s that are created once, added to the scene
once, and **never** have `.visible` changed. Each budget tick, the N nearest
registered env lights are copied into the pool slots (world position, colour,
intensity, distance); unused slots are parked at `intensity = 0` rather than
hidden.

`lights.point.length` then never changes, so the program cache key never
changes, so no material ever recompiles because the player walked somewhere.
Culled lights still cost nothing meaningful — an intensity-0 point light
contributes nothing and the shader loop over 8 lights was already being paid.

## Root cause #2 (confirmed): the warm-up compiles the wrong programs

There is already a GPU warm-up behind the loading screen, and it could never
have worked. It called `renderer.compile()` and `renderer.render()` straight
to the canvas, but gameplay renders through `EffectComposer`, i.e. always into
a render target. In three r185:

- `WebGLPrograms.js:212` — `outputColorSpace` is `renderer.outputColorSpace`
  only when `currentRenderTarget === null`; otherwise it is the working
  colour space.
- `WebGLPrograms.js:176-186` — `toneMapping` is `renderer.toneMapping` only
  when `currentRenderTarget === null`; otherwise `NoToneMapping`.
- Both are pushed into the cache key (`:441`, `:484`).

So every program compiled by the warm-up carried a different cache key from
the one gameplay would ask for, and every material compiled again — on screen,
on its first composer-rendered frame. That is the same 2.1s window above.

**Fix:** `warmUpShaderPrograms()` now warms through the composer when the
composer is what gameplay will use (twice, since the composer ping-pongs
between two render targets and one pass leaves the second buffer's programs
uncompiled), falling back to a direct render otherwise.

Combined with the constant light count, the warm-up now compiles programs
whose cache key actually matches gameplay's, which is what moves the stalls
behind the loading screen instead of into the player's first seconds.

The log's own timeline corroborates this exactly. The warm-up reports
completion at t=96,516 (`RENDER — WARMING MATERIALS AND LIGHTING... 100%`) and
the first sector frame is presented at t=96,937. The compile storm does not
happen there. It happens at **t=107,314-109,453** — eleven seconds later,
immediately after `SKIP INTRO` is clicked at t=104,507 and real gameplay
rendering begins. A warm-up that had actually warmed the programs gameplay
uses would have absorbed that cost at t=96,516, behind the loader, where it
was designed to land.

### Tradeoff accepted, deliberately

Holding the pool at `ENV_LIGHT_BUDGET` (8) means sparse areas now pay the same
per-fragment lighting cost as dense ones — three's shader loops over
`NUM_POINT_LIGHTS` with no early-out for zero intensity. That is a real, small,
*constant* GPU cost traded for the removal of 200-600ms CPU stalls, and
constant frame cost is worth more than a lower average with spikes in it.
`ENV_LIGHT_BUDGET` is unchanged at 8, so nothing looks different; lowering it
would cut the steady-state cost further but is a visual decision, not a
performance one.

## Root cause #3 (in progress): the uninstrumented 62.7%

Nothing in the codebase measured the ~50 per-frame subsystem calls at the
bottom of `render()`, so 8.8 seconds of blocked main thread in this log has no
attribution at all.

Fixed by adding `src/frameProfiler.js` — a deliberately cheap per-subsystem
accumulator (a `Map`, two `performance.now()` calls per section, and *one
boolean test* per section while disabled, which is the shipping default). It
is wired around every update call in `render()`, and `render()` itself is now
a thin wrapper over `renderFrameBody()` so that the profiler sees frames that
take any of the ~8 early-return paths.

This is instrumentation, not a fix: it exists so the next log can name the
expensive subsystem instead of shrugging at `lastPhase: "frame:render"`.

### Hypotheses already tested and rejected

Recorded so they don't get re-litigated:

- **"The per-frame wall raycasts are the bottleneck."** `updatePlayerConeOcclusion()`
  fires 23 rays/frame (`SUIT_CONE_SEGMENTS = 22`, +1), each an
  `intersectObjects()` over all 222 wall meshes — ~5,100 mesh tests per frame,
  which *looks* damning. Benchmarked against a matching synthetic scene
  (222 box meshes, 23 rays, 300 frames) on three r185: **0.37 ms/frame.**
  Not the problem. Worth noting `hasWallBetween()` already has a cheap
  tile-grid pre-check and the cone path does not, but the measurement says
  adding one would buy nothing.

## Verification

- `src/frameProfiler.test.js` — unit coverage for the profiler itself.
- `src/threeGame.envLightBudget.test.js` — asserts the visible-light *count*
  is invariant across budget updates, which is the actual property that
  protects the shader cache.
- `tests/e2e/frame-profile.spec.js` — diagnostic Playwright spec that starts a
  real run and prints the ranked per-subsystem frame cost, plus
  `renderer.info.programs` growth across a movement session.

  The shared helper now drives the Armory embark/deployment gates and verifies
  a visible, input-enabled, unpaused gameplay canvas. The spec is enabled and
  has completed three consecutive browser measurements on this worktree.

## Remaining acceptance work

The update-loop culprit is now measured and fixed below. The remaining gate is
a packaged Steam/Steam Deck playtest: the headless SwiftShader browser is useful
for controlled before/after attribution, but it cannot establish Deck thermals,
GPU pacing, or two-player packaged-build feel.


## Interaction found with the concurrent adaptive-quality work

`src/threeGame.js` is being edited by a second agent session on this branch at
the same time as this pass. Its `setAdaptiveGameplayPerformanceMode()` reacts
to sustained low FPS by (a) switching `renderWithPerf()` from `composer.render()`
to `renderer.render()` and (b) toggling `renderer.shadowMap.enabled`.

Both of those are program-cache-key changes, by the same mechanism this
document is about:

- composer -> canvas flips `outputColorSpace` and `toneMapping`
  (`WebGLPrograms.js:176-186`, `:212`);
- `shadowMapEnabled` is a cache-key layer in its own right
  (`WebGLPrograms.js:359`, `:567`).

So the quality-drop path recompiles **every material in view**, synchronously,
at the exact moment the game has already been judged to be running badly — and
again on the way back up if it ever toggles off. The latch in that function
means it is once per transition rather than per frame, but a mode that
oscillates around its FPS threshold would thrash.

Not changed here: it is another session's in-flight work. Flagged for whoever
owns it. The cheap mitigation, if that design stays, is to warm both variants
during staging so neither transition is a first-use compile.

## Reconciliation decision — 2026-08-21

The adaptive system stays, but staging will warm every shader variant it can
select later:

1. Direct renderer with shadows disabled (Steam Deck / adaptive fallback).
2. Composer render targets with the configured gameplay shadow state (normal
   desktop gameplay).

The original postprocessing and shadow flags are restored before the loading
screen clears. Therefore a sustained-low-FPS transition still removes the
expensive passes, but no longer asks Three.js to compile that variant for the
first time during an already-slow frame. Steam Deck enters adaptive mode before
staging and only warms the variant it will actually use.

The shared `tests/e2e/helpers.js` run-start helper will also own the Armory
embark step. The diagnostic spec will stop duplicating that transition and can
be unskipped once the helper proves it reaches a visible gameplay canvas. This
is test infrastructure only; it does not alter the production run-start flow.

The stricter helper exposed one production cleanup race: after skipped nested
intro videos, the HUD and input could be live with no blocking overlay while
`game.loadingPaused` remained true, leaving a black/frozen world. The mission
intro's existing `finally` cleanup now explicitly releases that rendering pause
alongside its input and cinematic locks.

## Active-gameplay measurement — 2026-08-21

The repaired helper reached a real, input-enabled gameplay canvas and produced
the first trustworthy browser profile for this branch. Across a movement loop:

| Section | Average cost |
|---|---:|
| Whole frame | 44.62 ms (22.4 FPS) |
| `updateScatter` | 18.07 ms/frame |
| `renderFrame` | 11.08 ms/frame |
| `updatePlayer` | 4.43 ms/frame |
| `updateProceduralDoors` | 4.25 ms/frame |
| `syncVisibleChunks` | 2.06 ms/frame |

The shader fixes held under movement: `renderer.info.programs` stayed at
102 -> 102, and the dynamic-light pool stayed at its fixed budget. This closes
the shader-growth diagnosis while exposing the remaining CPU problem.

The scene contained 465 scatter objects but only 28 enemies. A temporary
per-object fog probe measured `getFogOfWarVisibility` plus opacity application
at only 0.37 ms/frame total, rejecting fog as the explanation. That probe is
removed because its roughly 39,000 calls to `performance.now()` during the
sample distorted the inclusive `updateScatter` result.

The next diagnostic uses Chromium's sampled CPU profiler around the same
movement loop. It attributes leaf execution time without inserting timers into
each scatter iteration. No scatter behavior will be reduced or cadence-limited
until that sample names the expensive operation; the wall-raycast and fog
results show why an attractive source-level guess is not enough.

## Root cause #3 resolved — containment rebuilds and DOM traversal

The sampled profile named `normalizeContainmentBounds` as the dominant
JavaScript leaf: 1,044.1ms during the movement sample. Scatter AI repeatedly
rebuilt active safe-zone/door descriptors, defeating the existing WeakMap
because each call produced new object identities. A* then called normalization
again for each explored edge.

The fix takes one immutable containment snapshot at the start of
`updateScatter`, shares it across every enemy/path in that frame, restores the
previous snapshot in `finally`, and returns already-canonical numeric bounds
directly. Collision, safe-zone, door, and pathfinding rules are unchanged.

The same sample exposed `hasBlockingGameplayOverlay`'s compound
`document.querySelector` at 580.8ms. This gate is checked by gameplay and input,
so it now uses the browser's indexed class collections and direct IDs while
preserving the exact active/hidden/closing rules.

Controlled headless results using the same movement script:

| Measurement | Before | Final |
|---|---:|---:|
| Frame time | 51.40ms | 29.80ms |
| Effective FPS | 19.5 | 33.6 |
| `updateScatter` | 20.74ms/frame | 2.84ms/frame |
| `normalizeContainmentBounds` sampled self-time | 1,044.1ms | 15.1ms |
| Overlay DOM lookup sampled self-time | 580.8ms | 33.1ms |
| Shader programs during movement | 100 -> 100 | 100 -> 100 |

That is a 42% reduction in measured frame time and a 72% effective-FPS gain
in the diagnostic browser. The final scene still contained 488 scatter objects
and 34 enemies, so the result did not come from reducing world population.

Final verification on 2026-08-21:

- `npx vitest run`: 239 files, 1,941 tests passed.
- `npm run build`: production Vite build and required-media audit passed.
- `tests/e2e/frame-profile.spec.js`: passed three measured gameplay runs;
  final run completed in 2.1 minutes with zero shader-program growth.
