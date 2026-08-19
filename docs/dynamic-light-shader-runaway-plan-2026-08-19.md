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

### Not started — Direction #1: cap simultaneous dynamic lights to a small budget

**What's still contributing:** the 11 `PointLight`/`SpotLight` creation
sites in `src/threeGame.js` that are *not* muzzle flash — player glow
(`playerGlow`, ~line 2990), console/terminal lights (`terminalLight`,
~3362), status lights (`statusLight`, ~3453), base-defense turret light
(~3556), suit fill light (`suitFillLight`, ~3773), player forward
spotlight (~4392), beacons (~6628), the O2-safe light (~13568), the
crash-site heat light (one-time, ruled out as a frequency contributor),
and — the other real candidate alongside muzzle flash — the **lore
terminal light** (~line 22076 pre-fix, now shifted), created once per
`lore_terminal` scatter placement. Unlike muzzle flash these are mostly
persistent rather than per-shot, but there can be *many* of them live
simultaneously across an explored world (one lore terminal per relevant
scatter placement, one terminal/status light per structure encountered),
and as the player moves through the world, standard-lit objects still
encounter a growing set of *which subset of these is currently in
range* — the same combinatorial mechanism, just at a slower rate than
muzzle flash was producing.

**Proposed approach:** a small central light-budget manager — track all
"non-essential" dynamic lights (everything except maybe the sun/ambient
and the player's own always-on lights) in a list, each frame pick the
closest N to the camera (a fixed budget, e.g. 6-8) and toggle `.visible`
(or `intensity = 0`, whichever cleanly removes a light from a material's
lit-set without disposing it) on the rest. This keeps the *set* of
lights any given object can be affected by drawn from a small, bounded
pool instead of the full accumulated set ever created, which caps how
many light combinations three.js can ever encounter — the program count
should plateau instead of climbing indefinitely.

**Risk:** medium. Touches lighting globally, needs verification that
toggling lights off at distance doesn't create visible pop-in/pop-out
for lights near the edge of the budget cutoff (may need a small
hysteresis band, not a hard cutoff, to avoid flicker as the player moves
back and forth across the boundary). Needs its own live-profiling pass
(same before/after `renderer.info.programs` methodology used tonight)
before landing.

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

1. **#1 (light budget)** first — it's the one that actually bounds the
   growth; #2 (shipped tonight) only removed the single worst
   contributor, it didn't cap the mechanism itself.
2. **#3 (shared materials)** after #1, as a multiplier cleanup once the
   combination count is no longer unbounded.
3. Re-run the same 65s live test + `renderer.info.programs` check after
   each step to confirm the number *plateaus* (not just grows slower) —
   that's the real bar for "fixed," not just "reduced."
