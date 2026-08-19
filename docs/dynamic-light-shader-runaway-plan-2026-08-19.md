# Dynamic-Light Shader Runaway — Scoped Plan

Date: 2026-08-19
Follow-up to `docs/log5-dynamic-light-shader-runaway-findings-2026-08-19.md`.
Scopes the three candidate directions that doc named, records what shipped
tonight, and plans the rest for a future session.

## Recap: the mechanism

Three.js compiles a distinct WebGL program per unique combination of
"which lights currently affect a given material" (light count/type/shadow
state are baked into `WebGLPrograms`'s program cache key). Nothing evicts
old combinations as new ones are encountered, so `renderer.info.programs`
climbs for as long as the player keeps running into new spatial light
configurations, and never recovers. Every `MeshStandardMaterial`/
`MeshPhysicalMaterial` object near a changing light set pays this.

## Status

### ✅ Direction #2 — move short-lived effect lights off real `THREE.Light` (DONE, commit `c4c68a8`)

`spawnMuzzleFlash()` (`src/threeGame.js`) added a real `THREE.PointLight`
on literally every shot fired — the single highest-frequency dynamic
light spawn in the game (11 total `PointLight`/`SpotLight` sites exist;
every other one is a persistent, single-instance light created once per
structure/prop, not per-shot). Replaced it with a second, larger,
additive-blended unlit circle mesh reusing the existing flash-fade logic.

**Verified live**, same 65s mixed movement/dash/shoot session used to
find the bug:
- `renderer.info.programs`: 64 → 213+ before the fix, 65 → 93 after —
  growth cut from **+149 to +28, an ~81% reduction**.
- Remaining "physical" (lit-material) cache-key bucket: 112 → 47 after
  the fix — still the largest bucket, but less than half its former size.

The residual +28 growth (down from +149) and the still-nonzero 47
"physical" programs confirm muzzle flash was the *dominant* contributor,
not the *only* one — directions #1 and #3 below are what's left.

### ✅ Direction #1 — cap simultaneous dynamic lights to a small budget (DONE, commit `e59ec04`)

Triggered by a fresh report the same night: `docs/logs/log6.json` showed
~14fps just walking a hallway on the shipped Steam/Electron build, no
combat involved — direct confirmation that #2 alone (muzzle flash) left
real growth on the table, exactly as this doc predicted, since the
remaining contributors here are persistent rather than per-shot and
don't need shooting to accumulate.

Implemented a `registerEnvLight()` registry + `updateEnvLightBudget()`
(`src/threeGame.js`), called from the main render loop every ~0.35s:
sorts registered lights by distance to camera, keeps only the closest
`ENV_LIGHT_BUDGET` (8) visible, hides the rest. Registered: ship
terminal/status lights, the base-defense turret light, the black-box
beacon, the crash-site heat light, and per-prop lore-terminal lights.
Deliberately **not** registered: `playerGlow`/`suitFillLight`/
`playerForwardSpotLight` (always travel with the player, culling them
wouldn't reduce combination variety and would look wrong), and the O2
safe-bubble light specifically (it already has its own semantic
`.visible` toggle tied to whether the bubble is built/active — confirmed
by reading its toggle call sites before wiring anything in; a blind
distance-based override would have fought that state machine and
produced a real visual bug).

**Verified live**: a synthetic 20-light test (spread along a line from
the player, closest-to-farthest) confirms exactly the closest 8 stay
`visible: true`, the other 12 correctly hidden — the mechanism itself is
provably correct. (The natural 65s exploration test didn't cover enough
distance to *naturally* accumulate many env-light encounters in one
run — this is expected; the effect compounds over a full run's worth of
exploration, which is exactly the shape of log6's report after ~90+
seconds of hallway walking, not a short synthetic loop near spawn.)

**Risk note carried into future verification:** toggling lights off at
distance could in principle create visible pop-in/pop-out right at the
budget cutoff edge. Not yet observed in testing, but if a future report
mentions lights flickering near a boundary, add hysteresis (require a
light to be closest-8 for two consecutive budget ticks before toggling
visible, or vice versa) rather than the current hard cutoff.

### Not started — Direction #3: shared materials near light clusters

**Rationale:** this doesn't reduce the number of light *combinations* —
it reduces how many *distinct materials* get multiplied against each
combination. If, say, five different wall-decal or prop materials are
all near the same light cluster, that's five programs for one light
combination instead of one. Lower priority than #1 (which attacks the
combination count directly, the actual unbounded-growth driver) — #3 is
a multiplier reduction, not a growth-cap. Worth a pass afterward: audit
for near-duplicate `MeshStandardMaterial` instantiations (e.g. per-decal
or per-prop materials created with `.clone()` when they could share a
single shared instance) once #1 is in and the combination count itself
is bounded.

**Risk:** low, but low-yield until #1 lands — reducing material count
against an unbounded combination set still leaves the set unbounded.

## Recommended order for the next session

1. ~~**#1 (light budget)** first~~ — done tonight (`e59ec04`).
2. **#3 (shared materials)**, as a multiplier cleanup now that the
   combination count is bounded.
3. Get a real long-duration (multi-minute, real distance covered) live
   trace against the current build to confirm `renderer.info.programs`
   actually *plateaus* now rather than just growing slower — the 65s
   near-spawn synthetic test isn't long/far-ranging enough to prove that
   on its own; log6-shaped reports (extended hallway walking) are the
   real test.
