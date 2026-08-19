# log4 Combat Perf Regression — Findings

Date: 2026-08-19
Source: `docs/logs/log4.json` (session 2026-08-19T05:46:34.317Z –
05:48:51.287Z, 137s, TANK class, Chrome/Windows client on `localhost:5174`)

User report: "it didn't used to lag out when we shot walls or ever and
now it's like crashing when we try and fight things." This doc records
what the log actually shows before any fix is attempted, per the user's
request to document findings first.

## Headline numbers

- Session wall-clock: 136,970ms. Total long-task time logged: **23,346ms**
  across 249 long tasks — roughly **17% of the entire session** spent in
  main-thread tasks over 50ms.
- Boot itself only accounts for 907ms of that (8 long tasks, all under
  155ms, `id: 39`) — the previously-fixed boot-time shader/cache costs are
  not the story here.
- The overwhelming majority of long-task time (~22,400ms of the 23,346ms
  total) falls inside a single ~29-second combat window: **22:48:07.466 –
  22:48:36.498**, ending at the player's death (`player-death`,
  `reason: "pit-fall"`, logged 22:48:35.538).

## The combat window in detail

From 22:48:12 to 22:48:36 the log shows a **near-continuous stream** of
50–75ms long tasks, one roughly every 100–300ms, i.e. sustained
mid-single-digit FPS for almost half a minute — not occasional stutter,
a chronic frame-budget overrun for the whole fight. Interleaved with that
sustained drip are four severe spikes:

| Time | Duration |
|---|---|
| 22:48:03.892 | 1066ms (just before combat starts, likely still world-gen tail) |
| 22:48:07.466 | 875ms (81ms after the first logged shot) |
| 22:48:16.464 | 1302ms |
| 22:48:26.278 | 1400ms |

## Key clue: the sustained cost outlives the logged clicks

Only 33 discrete `Click -> <canvas>` INPUT events are logged for the
whole session, the last one at **22:48:26.255**. But the 50–75ms long-task
drip continues uninterrupted for another **~10 seconds** past that, all
the way to the death event at 22:48:35.538 (see the raw dump below —
tasks logged at 22:48:28.650 through 22:48:36.498 with no new clicks in
between).

This means the cost is **not** simply "N discrete clicks → N discrete
shader-compile spikes" (the shape of the two perf bugs already fixed
earlier this session — `checkShaderErrors` and missing `compileAsync`
pre-warming, both confirmed still in place in current code,
`src/threeGame.js:1394`). TANK's weapon (Siege-Breaker autocannon) is a
held-fire weapon — the player very likely held the mouse button down
starting around 22:48:21.9, which fires continuously without emitting a
discrete `click` DOM event per shot. The sustained per-frame cost tracks
the *held fire*, not the *click count*.

## Leading suspects in the fire path (not yet proven — needs a live trace)

Traced `fireOne()` in `src/threeGame.js` (~line 17884), which runs on
every shot:

1. **`spawnWallDecal()` (`src/threeGame.js:18309`)** — constructs a brand
   new `THREE.ShaderMaterial` (with inline vertex/fragment GLSL template
   strings), a new `THREE.PlaneGeometry`, and a new `THREE.Mesh` on
   **every single wall hit**, uncapped in rate (only capped in *count*,
   `WALL_DECAL_CAP = 24`, oldest recycled but not until 24 are already
   live). A rapid-fire weapon spraying a wall can create many of these
   per second. Same *shape* of bug as the shader costs already fixed this
   session, even if `checkShaderErrors` no longer makes each one worse —
   worth confirming whether three.js's program cache is actually
   deduping these (should, since the shader source text is identical
   every call) or whether something about per-material uniform setup
   still costs real CPU time at this call rate.
2. **Per-shot raycast against `this.wallMeshes`** (`fireOne`, ~line
   17893) — `this._projRaycaster.intersectObjects(this.wallMeshes, false)`
   runs on every shot with no spatial partitioning visible at this call
   site. If `wallMeshes` has grown large for this run's explored area,
   this is an O(n) scan per shot, done at whatever the weapon's fire rate
   is.
3. Not yet checked: `spawnMuzzleFlash`, `spawnProjectile`,
   `spawnPhysicalBurst`, `damageWall`, and enemy-side hit-reaction/AI
   costs that run in the same frames once actual hostiles (not just
   walls) are involved — the user specifically says it's *worse* "when we
   fight things" vs. just shooting walls, so an enemy-side cost that
   stacks on top of the wall-decal/raycast cost above is likely part of
   this too.

## Not yet done

This doc is the "document findings first" step the user asked for.
Root-causing which of the above (or something else entirely) is the
actual dominant cost requires a live CPU trace of held-fire combat in a
fresh browser tab (the methodology that worked for both perf bugs fixed
earlier this session) — log timestamps alone can show *when* and
*how much*, not *which function*. That trace is the next step before any
fix lands.
