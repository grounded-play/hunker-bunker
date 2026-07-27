# Survivable Falls & Under-Layer Pockets — Design

> **For agentic workers:** This is a brainstorm spec, not an implementation
> plan. The next step is `superpowers:writing-plans` against this document.

**Goal:** Turn the existing "step on a hole, fall, instant-die" hazard into a
real verticality mechanic: falling through a hole drops the player into a
small, procedurally-generated pocket beneath that spot, dealing real
(whole-number) fall damage instead of an unconditional kill. A run upgrade
reduces fall damage enough to survive a second fall in the same run. Players
climb back up through a fixed point in the pocket, or avoid the fall entirely
by repairing the hole (reusing the existing fill mechanic, reframed as
"bridging").

**Architecture:** No new rendering pipeline, no new camera system, no new
collision axis. Pockets are ordinary chunk-shaped grids rendered as ordinary
THREE.js geometry, positioned at a fixed, constant lower Y in world space
directly beneath their parent hole's X/Z coordinates. The player's own
`position.y` is set to that depth instead of being destroyed — since
`updateCamera` already follows `player.position.y + cameraOffset.y`
(`src/threeGame.js:13426-13442`) and `canOccupyPosition`/collision are
already X/Z-only, dropping the player's Y and swapping which grid/mesh set is
"active" is enough to make the isometric camera, movement, and combat all
keep working unmodified. This is a deliberately small, bounded first
sub-project — a full mirrored second world layer, or camps/hives that
physically span both layers, are explicitly out of scope here (see "Out of
scope" below).

## Global Constraints

- Whole-number damage everywhere (already enforced repo-wide as of this
  branch's last stabilization pass — new fall damage must follow the same
  `Math.max(1, Math.round(...))` pattern, never a raw multiplier result).
- Every new seeded-random call must fold in `runEntropy` the same way the
  existing chunk/landform/template generators do
  (`(this.hashTile(...) ^ this.runEntropy) >>> 0`), so pocket layouts vary
  per run, not just per location.
- No new persistent collision/render axis: pockets reuse the existing X/Z
  collision (`canOccupyPosition`, `isSnailTileWalkable`) and the existing
  wall/floor mesh conventions (`this.wallMaterial`, `this.floorMaterial`,
  `configureWallMesh`).
- Follow the existing `ThreeGame.prototype.method.call(fakeThis, ...)` unit
  test pattern already used throughout `src/threeGame.*.test.js` for testing
  new methods without a real WebGL context.

---

## 1. Fall damage & the survive-a-second-fall upgrade

**Current behavior** (`src/threeGame.js:11166-11187`, `updatePlayer`):
falling sets `isPlayerFalling = true`, animates the player sprite shrinking
and sinking from `y=0` to `y=-2.5` over ~0.7s
(`position.y -= 3.5 * delta`), then at `y <= -2.5` calls
`this.takeDamage(999, 'abyss')` — an unconditional, iFrame-bypassing kill
(`takeDamage`'s iFrame guard at `src/threeGame.js:10233` explicitly excepts
`reason === 'abyss'`).

**New behavior:**
- Replace the `999` with a new constant, `FALL_DAMAGE_BASE = 2` (tunable;
  matches the scale of existing whole-number damage values like
  `PROJECTILE_DAMAGE = 1`). Checked against `BASE_HEARTS = 3`
  (`src/threeGame.js:131`, the default max HP): a base fall costs 2 of 3
  hearts — a genuine, meaningful hit, not a non-event — and with the
  upgrade halving it to 1, two falls in one run cost 2 of 3 hearts total,
  so "survive a second fall" is a real, non-trivial claim rather than
  something that was already true regardless of the upgrade.
- Add a new persistent, cross-run upgrade — **not** class-specific, since
  fall survival isn't a class trait — in the existing "ship systems" tier-2
  track (`src/bank.js:285-316`, `TIER2_UPGRADE_ORDER` /
  `TIER2_UPGRADE_CONFIGS`), following the exact shape of `stimCache`:
  ```js
  // TIER2_UPGRADE_ORDER: add 'fallHardening'
  fallHardening: Object.freeze({
      key: 'fallHardening',
      label: 'IMPACT DAMPENERS',
      desc: 'Halves fall damage, making a second fall in the same run survivable.',
      cost: Object.freeze({ tech: 70, coin: 18 }),
      prereq: 'reactorCompressor'
  })
  ```
- In `updatePlayer`'s fall-resolution branch, read the unlock the same way
  `suitThermal`/`deconFilters` are already read elsewhere
  (`src/threeGame.js:11224-11229`, `this.bank?.getState?.()?.tier2Unlocks`):
  ```js
  const fallDamage = this.bank?.getState?.()?.tier2Unlocks?.fallHardening
      ? Math.max(1, Math.round(FALL_DAMAGE_BASE / 2))
      : FALL_DAMAGE_BASE;
  this.takeDamage(fallDamage, 'fall');
  ```
- `'fall'` is a new `takeDamage` reason (distinct from `'abyss'`), so it
  **does** respect `iFrameTimer` — a player shouldn't be able to be juggled
  by repeated falls through the same animation window. `'abyss'` itself
  (the old unconditional-kill reason) stays defined and unused by this
  feature — it remains available for any other genuinely instant-kill hazard
  that might exist or get added later.
- Damage is dealt at the bottom of the existing fall animation, not
  instead of it — the shrink/spin/sink is now "falling to the pocket," not
  "falling to your death," and needs no visual changes.

## 2. Pocket generation

**Identity & caching.** Each hole tile already has a stable key via
`getWallKey(worldX, worldZ)` (`src/threeGame.js:13753`). A pocket is
generated once per hole, the first time a player falls through it, and
cached in a new `Map` (`this.pocketCache`, mirroring `this.chunkCache`'s
lazy `getOrCreateChunk` pattern at `src/threeGame.js:18447-18463`) keyed by
that same wall key — so re-falling through the same hole later in the run
returns the same pocket, not a freshly rolled one.

**Layout.** A pocket is a small fixed-size grid — 9×9 tiles (much smaller
than a full 19×19 chunk) — generated with the same recursive-backtracker
carve already used for surface chunks (`this.carveCell`/`carvePassage`/
`shuffleDirections`, `src/threeGame.js:18625-18640`,
`src/threeGame.js:18795-18810`), seeded via
`createSeededRandom((this.hashTile(holeWorldX, holeWorldZ) ^ this.runEntropy) >>> 0)`
— the same runEntropy-folding pattern this branch's last stabilization pass
already established for chunk/landform/template generation. No new landform
archetypes for v1 — pockets always use the plain maze carve, reskinned
visually via the existing per-landform wall shader tint (a new
`LANDFORM_SHADER_ID` entry, e.g. `POCKET: 5`, added alongside
`MAZE`/`FIELD`/`CANYON`/`CRATER`/`RUINS` in `src/threeGame.js`, so pockets
read as visually distinct from the surface without new textures).

**Content.** A modest loot bump only for v1 — 1-2 scatter pickups placed on
seeded-random open floor cells, using the existing scatter-instance/pickup
spawning helpers already used for chunk content. No enemies, no camps, no
hive content in a pocket for v1 (see "Out of scope").

**World placement.** Pockets render as an ordinary child group added to
`this.scene` (or a dedicated `this.pocketGroups` Map mirroring
`this.chunkMeshes`), offset so the pocket's **center cell** (the same DFS
carve-start convention `buildChunk` already uses,
`centerCell = Math.floor(this.chunkCellCount / 2)`,
`src/threeGame.js:18475-18483`) sits directly below the hole's world X/Z —
this is also where the player is placed on arrival, and it's guaranteed open
floor since the carve always starts there. The pocket sits at a fixed world
Y (e.g. `y = -6`, comfortably below the `-2.5` the fall animation already
ends at, with a short buffer as finishing floor). Surface chunk meshes are
**not** unmounted while a player is in a pocket — they're simply out of
camera view below the current render distance, which needs a one-line
visibility/culling check verified during implementation (surface content at
`y=0` shouldn't visibly bleed through the pocket's ceiling).

## 3. Climbing back up

The player arrives at the pocket's center cell (see "World placement"
above). The climb point is the **single floor cell farthest from the
center cell by carved-path distance** — a BFS over the pocket's floor
tiles from the center, same walk already used by `reachableFloorCells`
in `src/landforms.js:106-124`, keeping the farthest cell found. Picking the
farthest cell (rather than, say, the center itself, or an arbitrary random
floor tile) is what makes this "traverse" rather than "climb out where you
stand" — it guarantees the player has to cross the pocket to leave it.

That cell carries an interact prompt, following the exact existing pattern
of `interactWithHoleTile`/`fillHoleAt`'s "PRESS E" flow
(`src/threeGame.js:18746-18763`, and the `#hole-hud-prompt` HUD element
already added to `index.html`). Its visual marker reuses the existing wall
vent mesh/material (`this.ventGeometry`/`this.ventMaterial`, already used as
a wall-decoration attachment, `src/threeGame.js:13979-13993`) rather than
new art — consistent with this feature shipping without depending on the
in-progress visual remaster. Interacting there restores
`player.position.y` to `0` and repositions X/Z back to the hole's surface
coordinates — mirroring `snapCameraToPlayer`'s existing teleport pattern
(`src/threeGame.js:13444-13452`) rather than replaying the fall animation
in reverse.

## 4. Bridging (avoiding the fall)

No new prop or mechanic for v1: the existing `fillHoleAt` action
(`src/threeGame.js:18686-18744`) already turns a hole into permanent safe
floor via the same "PRESS E" prompt, and `filledHoleKeys` already persists
that for the rest of the run. This is reframed in copy/UI as "bridging" the
gap rather than introduced as new code. A dedicated gangway/catwalk visual
reskin of the same interaction is a natural follow-up once the
visual-remaster prop kit (`docs/biomechanical-visual-remaster-rundown.md`)
reaches its prop-kit tier — not required for this feature to ship.

## Testing

Following this repo's established `ThreeGame.prototype.method.call(fakeThis,
...)` pattern (see `src/threeGame.holeTiles.test.js`,
`src/threeGame.chunkVariation.test.js`):

- Fall damage is a whole number, respects the `fallHardening` unlock (halved,
  still whole via `Math.max(1, Math.round(...))`), and uses `iFrameTimer`
  gating (reason `'fall'`, not `'abyss'`).
- Pocket generation is deterministic for a fixed `runEntropy` (reproducible)
  and differs across `runEntropy` values for the same hole (per-run
  variation), mirroring the existing `chunkVariation.test.js` assertions.
- Falling through the same hole twice in one run returns the cached pocket
  (`pocketCache` hit), not a freshly generated layout.
- The climb point is the floor cell at maximum BFS distance from the
  pocket's center cell, not the center cell itself or an arbitrary tile.
- The climb-up interaction restores `position.y` to `0` and to the correct
  surface X/Z.
- `fillHoleAt` on a hole the player could otherwise fall through prevents
  the fall state from triggering afterward (already covered by existing
  `isHoleTile`/`filledHoleKeys` tests — confirm no regression).

## Out of scope (explicitly deferred, not forgotten)

- **Camps, hives, and doors physically spanning both layers.** This is the
  natural next sub-project once the core fall/climb/bridge loop is proven —
  e.g. a camp with an optional pocket beneath it for a bonus cache, or a
  hive tunnel that connects a pocket back to a different surface location
  instead of straight up. Needs its own design pass once this lands and
  feels good in play.
- **A full mirrored second explorable layer.** Explicitly rejected in favor
  of localized pockets (see chat decision log) — much larger scope
  (doubling world generation, enemy placement, and depth-tier logic), not
  pursued now.
- **New bridge/gangway art or a dedicated bridging verb.** Deferred to the
  visual remaster's prop-kit tier; v1 reuses `fillHoleAt` as-is.
- **A third fall / further stacked upgrades.** Not requested; "one base,
  two with the upgrade" is the full scope of the ask.

## Resolved side-investigations (from this session, not part of this feature)

- **Daily Ops** was suspected to always regenerate an identical world
  regardless of date. Investigated and confirmed **already correct**:
  `globalSeedOffset` is set from `getDailySeedInt(today's date)` on click,
  and `fixedRunEntropy` pins `runEntropy` to a constant specifically so every
  player gets the *same* world *that day* (fair leaderboard competition) —
  not a bug. No changes made or needed.
