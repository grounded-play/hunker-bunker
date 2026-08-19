# log5 Dynamic-Light Shader Runaway — Findings

Date: 2026-08-19
Source: `docs/logs/log5.json` (session 2026-08-19T06:17:00.768Z –
06:19:33.472Z, 152.7s, TANK class), captured immediately after the
`normalizeContainmentBounds` pathfinding fix (commit `0f39d2c`) shipped —
this is a genuinely different, worse issue, not a recurrence of that one.

## Headline numbers

- **84.4s of the 152.7s session (55%) was spent in long tasks** — worse
  than log4's 17%, and unlike log4 (bursty, click-correlated), this one
  is a **sustained near-total freeze**: every 10-second window from
  23:18:10 onward logged 9,000–10,064ms of cumulative long-task time —
  i.e. essentially 0 FPS, continuously, for the last ~80 seconds of the
  session.
- Critically, this is **not input-driven**. Shooting stopped at
  23:18:15.730 (last logged canvas click), but the freeze *continued
  unabated* through dashes, radar scans, interact presses, and idle
  stretches all the way to session export at 23:19:33. Boot itself was
  fine (790ms, 8 long tasks, matches the already-fixed boot costs).

## What it isn't

Ruled out directly:

- **Not the pathfinding cost just fixed.** Confirmed live: with the
  `normalizeContainmentBounds` cache in place, a fresh 8-second profile
  early in a new session shows the `findSnailPath` chain at ~50ms total
  — real, present, but nowhere near dominant.
- **Not click/shot-driven** — the sustained drip persists long after the
  player stops shooting, ruling out per-shot costs (wall decals, muzzle
  flash, projectile raycasts) as the primary driver here.

## What it is: dynamic lights forcing shader recompiles that never stop accumulating

Live reproduction: navigated a fresh session, then drove ~65 seconds of
mixed movement/dashing/shooting (mirroring log5's session shape) while
sampling `renderer.info.programs`:

- Baseline at boot: **64** compiled WebGL programs.
- After 65s of ordinary play (no unusual actions): **213–214** — growing
  continuously, not plateauing.
- Grouped by `cacheKey` prefix: **112 of the 214 are `physical`**
  (three.js's `MeshStandardMaterial`/`MeshPhysicalMaterial` shader
  family) — by far the largest single bucket. Sample cache keys differ
  only in their trailing numeric fields (three.js's light-count/shadow
  bitmask parameters), e.g.:
  `physical,STANDARD,,highp,srgb,...,8388608,8519683,srgb,...` vs
  `physical,STANDARD,,PHYSICAL,,highp,srgb,...,8388672,8521731,srgb,...`

Three.js compiles a **distinct program per unique combination of which
lights currently affect a given material** (light types, counts, and
shadow state are baked into the program cache key, per
`WebGLPrograms.js`'s `getProgramCacheKeyParameters`/
`getProgramCacheKeyBooleans`). The codebase creates dynamic
`THREE.PointLight`/`THREE.SpotLight` instances at 11 separate call
sites in `src/threeGame.js` — player glow, console/terminal lights,
status lights, the O2-safe light, muzzle-flash/impact flashes, decal
cooling glow, beacons, etc. — each transient, each positioned in the
world, each with its own range. As the player explores and fights,
standard/physical-lit objects encounter a combinatorially growing set of
*which subset of these lights is currently in range*, and three.js
compiles a brand-new program for every previously-unseen combination.
Nothing evicts old ones as the set of encountered combinations grows, so
program count — and the GPU-driver compile/link cost paid the first time
each combination is hit — climbs for as long as the player keeps moving
through new spatial light configurations. This matches every observed
symptom: not click-gated, gets worse the longer/further a run goes, and
doesn't recover once triggered (no natural point where the "set of
combinations seen so far" shrinks).

## Not yet fixed

This is a materially different, more architectural problem than the
pathfinding memoization fix, and not something to patch in the same pass
without real budget to verify it doesn't regress lighting/visuals. Real
fixes worth evaluating (in rough order of invasiveness):

1. **Cap simultaneous dynamic lights** — e.g. a small fixed budget of
   "closest N lights to the camera" with the rest culled via
   `light.layers`/manual enable-disable, so the *set* of lights any
   given object can see stays from a small, stable pool instead of every
   possible transient light combination.
2. **Move short-lived effect lights (muzzle flash, impact, decal glow)
   off real `THREE.Light` objects** onto emissive-sprite or
   additive-blend tricks that don't participate in the standard
   lighting model at all — these are exactly the kind of "just needs to
   look bright for 100ms" cases that don't need a real dynamic light.
3. **Physically constrain material variety** near any given light
   cluster (shared materials, fewer unique `MeshStandardMaterial`
   instances) so even if light combinations vary, fewer distinct
   materials multiply against them.

Recommend scoping this as its own follow-up (brainstorm/plan) rather
than a same-session patch, given the blast radius (touches lighting
across the whole game, not one isolated function).
