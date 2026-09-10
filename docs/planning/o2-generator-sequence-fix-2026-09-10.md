# O₂ Generator Build — Stall and Sequence Fix Plan

Status: proposed fix plan · Date: 2026-09-10 · Branch: `dev/sprint-33`
Evidence: `docs/logs/log20.json` (session `2026-09-10T16:13:08Z`, 379s,
3,345 entries, Chrome 152 on Windows, `localhost:5173` dev build)

## 1. What the player reported

Triggering the O₂ generator build (`REPAIR GENERATOR`) lags the game out. The
console modal stays open instead of closing. The intended beat sequence —
menu closes → doors close (hiding the load) → video → in-game generator rise →
screen shake → boss video — does not happen in that order. The wrong video
plays, and text over video is hard to read because it has no framed backing.

## 2. What the log actually shows

The whole event is 21.4 seconds of blocked main thread, in two stalls.

| Elapsed | Event |
| --- | --- |
| 210,231 ms | Click `#terminal-objective-buy-btn` "REPAIR GENERATOR" |
| 210,233 ms | `foundry-discovered` dispatched |
| 210,235 ms | `o2-bubble-activated` dispatched |
| **210,817 ms** | **Long task begins — 10,859 ms** |
| 221,404 ms | Queued `ui_click` finally processes |
| **221,416 ms** | `[MENU] close` — *11.2 s after the click* |
| **221,986 ms** | **Long task begins — 10,510 ms** |
| 231,944–231,970 ms | Player clicking `#game-viewport`, `#loading-screen`, pressing Escape — inputs queued during the freeze, then Escape opens Settings |
| 233,536 ms | `ui_boot1` — generator popup phase completes |
| 235,938 ms | `event-boss-encounter-cybersnail` video plays |

Both long tasks report `"activePhases": []` with `lastPhase: "frame:render"`
(itself only 36 ms). **The stall is entirely outside instrumented code**, which
is the same signature as the unexplained 8.574 s deployment stall recorded as
F06 in the astra plan.

Scene state at the stall:

```
uniqueMaterials: 2139      programs:      191
uniqueTextures:   204      textureBytes:  1,119,875,662  (1.12 GB)
drawCalls:       2485      jsHeapUsed:      808,858,819  (809 MB)
adaptiveGameplayPerformanceMode: true    gameplayPostProcessingEnabled: false
```

The session was *already* in degraded performance mode before the build.

### The player's "menu stays open" is a symptom, not a separate bug

`closeConsoleModal()` is called inside `startO2StartupSequence()`, which is
scheduled `setTimeout(..., 100)` after the event. The main thread was blocked
from 210,817 ms, so that timer could not run until 221,676 ms. The menu closes
late **because the thread is frozen**, not because the close is missing.
Fixing the stall fixes the ordering complaint. The stray Settings popup at
231,968 ms is the player's Escape key landing after the freeze.

## 3. Root cause: two synchronous whole-scene shader recompiles

### Stall 1 — an explicit `renderer.compile()` that cannot help

`src/threeGame.js:5720`, inside the `o2-generator-upgraded` handler:

```js
setTimeout(() => {
    try { this.renderer?.compile?.(this.scene, this.camera); } catch { /* best effort */ }
}, 50);
```

`renderer.compile()` is synchronous and links every program the scene needs.
With 2,139 unique materials that is expensive on its own — but the deeper
problem is that **it runs before the base lights are added.** It compiles the
*current* program set, and the light change moments later invalidates it. The
call pays the full cost and prevents nothing.

### Stall 2 — `BaseLights.build()` adds 8 PointLights mid-sequence

`baseLights.ignite()` (`src/baseLights.js:102`) calls `build()` on first use,
which adds `FIXTURE_COUNT = 8` `THREE.PointLight`s to the scene. three.js bakes
light count and type into its program cache key, so **every lit material in the
scene needs a new program.** That is the second 10.5 s stall, paid on the next
render after ignition.

The irony is that `baseLights.js` already documents this exact hazard:

> *"Keeping the scene's light COUNT stable means the one-time lit-material
> shader recompile is paid once when the grid is built — not incrementally as
> each fixture wakes — avoiding a stuttering hitch across the sweep."*

The insight is right; the timing is wrong. `build()` is deferred until
`ignite()`, so the "one-time" cost lands in the middle of a cinematic beat
instead of during world setup.

This is the same class of defect as the per-shot `PointLight` removal recorded
at `src/threeGame.js:20315` — **changing the scene's light set during gameplay
is never free.**

## 4. Fixes

### LAG-01 — build the flood-light grid during world setup (P0)

Call `baseLights.build()` once while the world is being constructed, with every
fixture at `intensity 0` and `visible = true` (the module already supports
exactly this — it is what the header comment intends). `ignite()` then only
ramps intensities on lights that already exist, so the light *set* never
changes and no recompile is triggered at the milestone.

Acceptance: a build-time light-count assertion; no long task above 100 ms
between `o2-bubble-activated` and the boss video in a fresh capture.

### LAG-02 — delete or relocate the milestone `renderer.compile()` (P0)

Remove the `setTimeout(50)` compile at `src/threeGame.js:5720`. Once LAG-01
lands there is no new program set to warm, so the call is pure cost. If a warm
is still wanted, it must run **behind the closed doors** (see SEQ-01), after the
light set is final, and never on a timer racing the player's input.

Acceptance: no `renderer.compile()` reachable from a gameplay input handler.

### LAG-03 — instrument the gap (P1)

Both stalls reported `activePhases: []`, so the profiler could not attribute
21 s of blocking. Wrap `renderer.compile()`, `BaseLights.build()`, and cinematic
video preparation in named phases. Without this, the next stall of this class is
diagnosed by hand again.

Acceptance: a deliberately triggered recompile appears in `recentPhases` with a
name.

## 5. Sequence rework (SEQ-01)

The intended beat order is not implemented. `threeGame.startO2StartupSequence()`
runs popup → bubble → dialogue → boss, while `main.js` independently reacts to
`o2-startup-sequence-started` and `milestone-boss-warning`. Nobody owns the
whole beat, and there is no door transition and no screen shake in it at all
(`grep` for shake across the sequence returns nothing).

`main.js` already has the pieces: `showRunLoadingScreen(..., { overDoor: true })`
with the `over-door-loader` CSS class, the `#map-box-door` panel element, and
`queueCinematicEvent()`. They are simply not composed for this beat.

Proposed owner: a single orchestrator in `main.js`, triggered with the existing
`orchestrated: true` flag that `threeGame.js:5725` already honours by standing
down.

1. **Close the console modal synchronously** on the click, before any heavy
   work — the player's input must be acknowledged in the same frame.
2. **Close the doors** and show the over-door loader.
3. **Behind the doors**, do the expensive work: light-set finalisation and any
   shader warm. This is the load the doors exist to hide.
4. **Play the establishing video.**
5. **Open the doors** onto the in-game generator-rise animation (the existing
   `popup` → `bubble` phases, 1.2 s + 1.8 s).
6. **Screen shake** — `triggerCameraShake()` exists and is used elsewhere
   (`0.3, 0.7` at `src/threeGame.js:11976` is a good reference); the sequence
   currently calls it zero times.
7. **Boss video**, then dialogue, then spawn.

Acceptance: the beats fire in the listed order in a fresh log, each with a
timestamp, and no beat overlaps another.

## 6. The video (VID-01)

**The boss video in this session was correct.** The log shows
`event-boss-encounter-cybersnail` at 235,938 ms, and `MILESTONE_BOSS_FOR_GOAL`
maps `o2Bubble` → `boss_cybersnail`. That mapping is right.

The likely source of "wrong video" is a **race between two cinematics**:
`foundry-discovered` fires at 210,233 ms — two milliseconds *before*
`o2-bubble-activated` — and `main.js:7623` queues `event-foundry-discovered`
from it. Both land in the same `cinematicEventQueue` promise chain, foundry
first. In this capture the foundry cinematic did not play (it was already in
`seenSessionCinematicEvents`), but on a first run it would play **before** the
O₂ beat, which would read exactly as "the wrong video".

Marked as a hypothesis: it is consistent with the code and the ordering, but
this log does not contain a frame where the wrong video actually played.

Fix: the orchestrator owns which cinematic plays for this milestone and in what
order. Independent listeners must not race into a shared queue.

There is also a real fallback hazard at `main.js:11220`:

```js
const suffix = MILESTONE_BOSS_CINEMATIC_SUFFIXES.has(bossType) ? bossType : 'cryosnail';
```

Any unrecognised boss silently plays the cryosnail video. That should warn
loudly rather than quietly showing the wrong monster.

## 7. Text legibility over video (UI-01)

`showTacticalOverlay()` (`main.js:6720`) writes into the **loading screen**
(`loaderTitle`, `loaderStatus`) with the `tactical-mode` class — confirmed by
the log, where the player clicked `<div#loading-screen.tactical-mode>`. Over a
video there is no backing plate, so light frames wash the text out.

Fix: give tactical-mode text a framed backing — a bounded panel with an opaque
or heavily-tinted ground, a hairline border consistent with the terminal UI, and
enough padding that descenders clear the edge. It must hold up over both the
brightest and darkest frame of the cinematic, so the panel cannot rely on the
video being dark. Add a `cinematic-caption` variant rather than restyling every
loading-screen use, so ordinary loading is untouched.

Acceptance: captured stills over the brightest frame of
`event-boss-encounter-cybersnail.webm` at 1280×800 and 1920×1080.

## 8. Order of work

1. **LAG-01** — the light-set fix. Largest win, smallest change, unblocks
   honest measurement of everything else.
2. **LAG-02** — remove the misplaced compile.
3. **LAG-03** — instrument, then re-capture a log to confirm the stall is gone
   before touching presentation.
4. **SEQ-01** — compose the beat once the frame budget is real.
5. **UI-01** and **VID-01** — presentation, verified against the new capture.

Do not start SEQ-01 before LAG-01/02 are measured: sequencing work judged
against a 21-second stall will be tuned to the wrong timings.

## 9. What this plan does not claim

No fix here is implemented or verified yet. The stall attribution is inferred
from the code path plus `activePhases: []` and the scene's material count; it
has **not** been confirmed with a profiler capture that names the compile
frames. LAG-03 exists so that confirmation is possible. The "wrong video"
finding is a hypothesis, labelled as such in §6.
