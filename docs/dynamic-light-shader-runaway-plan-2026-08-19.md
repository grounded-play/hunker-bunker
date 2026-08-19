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

### ✅ Direction #3 (partial) — shared materials near light clusters: wall damage (DONE, commit `4133eef`)

Triggered by a fresh, specific report: "there is still a slow down when
an object hits the wall... it shouldn't crash the game to shoot a bullet
and hit something." This is exactly the shape #3 predicted (distinct
material instances multiplying program count) and #1/#2 didn't cover it
at all — it's not about light combinations, it's about material variety.

`updateWallDamageColor()` cloned `this.wallMaterial` into a brand new
`MeshStandardMaterial` for every non-instanced wall the first time it
took *any* damage, permanently — no disposal, not even on wall
destruction. The instanced-wall fast path
(`wall.instancedMesh.setColorAt(...)`) already existed right next to it,
but confirmed live that **106/106 walls in a fresh run are
non-instanced** — the expensive clone path is the *only* one ever
exercised, not an edge case.

Fixed by pooling: `WALL_HP_STANDARD=8` already means standard walls only
ever show 8 distinct damage ratios regardless of which/how many walls
get hit, so `getWallDamageTierMaterial()` shares one material object per
damage tier (`WALL_DAMAGE_TIER_COUNT=8`) across every wall at that
ratio, instead of cloning fresh per wall.

**Verified live, decisively**: damaging 60 distinct walls once each grew
`renderer.info.programs` by +26 before the fix, +7 after. More
importantly, five full damage passes over every wall in the level
(~630 total hits, cycling through every tier as walls take damage and
some get destroyed) show `renderer.info.programs` **plateau at 124 from
the first pass onward** — the pool itself only ever grew to 6 of its 8
possible entries. This is the real bar this doc set for "fixed": growth
*stops*, not just slows.

### Still open — Direction #3, general audit

Wall damage was one concrete, high-value instance, found because the
user reported it specifically. The general rationale from the original
scoping still stands and hasn't been swept broadly: any other
`.clone()`-per-instance `MeshStandardMaterial`/`MeshPhysicalMaterial`
pattern (per-decal materials, per-prop materials, per-effect materials)
is a candidate for the same fix. Worth a dedicated audit pass — grep for
`.clone()` calls on lit materials specifically — rather than assuming
wall damage was the only instance.

## Recommended order for the next session

1. ~~**#1 (light budget)**~~ — done (`e59ec04`).
2. ~~**#2 (muzzle flash)**~~ — done (`c4c68a8`).
3. ~~**#3, wall damage**~~ — done (`4133eef`).
4. **#3, general audit** — grep the codebase for other `.clone()`-per-hit
   patterns on lit materials; wall damage is unlikely to be the only one.
5. Get a real long-duration (multi-minute, real distance covered) live
   trace against the current build to confirm `renderer.info.programs`
   actually *plateaus* in real gameplay now, combining all three fixes —
   the synthetic tests each prove their own mechanism in isolation, but
   a real session is the final word.
