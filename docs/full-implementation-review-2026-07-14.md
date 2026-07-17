# Full Implementation Review — 2026-07-14

Branch `dev-sprint-19`. This is a deep pass across the whole repo: what's
solid, what's dangling, what's weak, and what's not connected to anything
else. It draws on direct code reading (not just grep) across four areas —
the Steam economy work from the last two sessions, procedural level
generation, core gameplay-system connectivity, and overall repo health —
plus one concrete fix (the maze/pillar-alcove accessibility bug) made
while writing this.

**Standing caution, confirmed again while writing this doc:** this branch
is actively co-edited by multiple agents in the same working tree. While
researching the maze section below, `src/landforms.js`/`.test.js` and
parts of `src/threeGame.js` were mid-edit (uncommitted, someone else's work
in flight) — already loosening maze density and corridor width in
essentially the same direction this doc recommends. A second doc,
`docs/dev-sprint-19-branch-audit-and-open-work.md`, covers overlapping
ground from a Steam-backend-specific angle and is being actively worked —
its author is separately shipping the session-token auth rail it
recommends. Anyone acting on this review should `git status`/`git diff`
first rather than assuming the tree matches what's described here.

**2026-07-15 pointer:** for the current Steam-readiness checklist (what's
deployed vs. just coded vs. externally blocked), see
[`docs/steam-launch-readiness-master-plan.md`](./steam-launch-readiness-master-plan.md).
This doc's job — dead code, dangling systems, gameplay-connectivity —
stays valid; that one's job is "is it actually a Steam-proven product yet."

## tl;dr — what to fix first

> **UPDATE 2026-07-15: items 1 and 3 below are done.** Kept the original
> text for the record; see the note after each.

1. ~~**`slay_the_queen` achievement + Queen Slayer Emblem Steam grant are
   both currently unreachable.** There is no Queen combat encounter in the
   shipped game. `src/bossPhases.js` (a complete, tested phase-machine for
   exactly this fight) has zero integration into `threeGame.js`. This
   means the emblem I wired up two sessions ago can never actually be
   earned by a player right now — see "Steam Economy" below.~~
   **Fixed 2026-07-15.** `src/bossPhases.js`'s `QUEEN_FIGHT_DEF` is now
   wired into `threeGame.js` (spawn via the Act 1 cave entrance re-
   triggering during Act 2, armor/weakpoint-aware damage routing, phase
   attacks/adds), `slay_the_queen` has a real check, and the combat kill
   satisfies the existing Steam grant listener's `source: 'queen-fight'`
   gate. Code-complete and unit-tested (`src/threeGame.queenFight.test.js`,
   54 files/390 tests green); **not yet gameplay-accepted or Steam-account-
   proven** — see `docs/steam-launch-readiness-master-plan.md`'s "Queen fight
   gameplay acceptance" section for what's still open there.
2. **Dead-end reward alcoves were never widened** — fixed in this pass
   (`widenChunkCorridors`, `src/threeGame.js`). See "Maze & Landform
   Generation."
3. ~~**Confirmed-dead code, partially cleaned up 2026-07-14:** ... two
   fully orphaned engine files (`src/levelManager.js`, `src/game.js`)
   from the Phaser→Three.js migration, the `phaser` npm dependency
   itself, and several unused `bank.js` guard methods ... All confirmed
   zero-import via grep; just waiting on a yes.~~
   **Resolved 2026-07-15** — user gave explicit go-ahead (asked directly
   rather than assumed) for all three: `src/levelManager.js`/`src/game.js`
   deleted, `phaser` removed via `npm uninstall phaser` (plus the
   `README.md`/`index.html`/`jsconfig.json` references this doc's
   original grep missed — those only referenced `phaser` in prose/badges/
   TS path-mapping, not imports), and the four dead `bank.js` guard
   methods removed along with their dead test assertions (the real
   methods they duplicated stay covered).
4. **`src/threeGame.js` is 16,742 lines with zero dedicated test file.**
   Every gameplay-critical function investigated for this doc (collision,
   corridor widening, room classification) lives here, untested in
   isolation, and can currently only be verified by playtesting. Still
   true as of 2026-07-15 — three new focused test files have been added
   (`threeGame.holeTiles`, `threeGame.widenChunkCorridors`,
   `threeGame.queenFight`) using the `ThreeGame.prototype.method.call(fakeThis, ...)`
   pattern, but the class itself remains untested as a whole.

## Steam Economy & Backend

**State:** Fully wired end-to-end and verified live. Real appid/depots in
the VDFs. Auth-ticket → backend trust chain is real, not stubbed. The
crate+key economy (Deep Relic Cache + Cache Key) is Valve's own CS:GO
pattern, not invented from scratch. Drops are tied to genuine gameplay
milestones — victory, flawless extraction, personal best, Daily Ops, queen
kill, two curated achievement grants, and a 15%-gated roll on the existing
in-world loot event — instead of the blind timer this had a session ago.

**Weak / unfinished:**

- **The Queen Slayer Emblem grant is dead on arrival.** It fires off the
  `slay_the_queen` achievement (`src/achievements.js:180-187`), which is
  hard-coded `check: () => false, comingSoon: true` — there is no Queen
  fight to trigger it (see "Boss Phases" below). The plumbing is correct;
  the achievement it's wired to is vaporware. Either build the Queen fight
  or don't ship that specific grant path yet.
- Real money is fully mocked. `HB_STEAM_MICROTXN_ENABLED` defaults off;
  nothing can charge a real card until Valve enables Microtransactions for
  the app (an account-level Steamworks action, not a code gap) and the
  `ISteamMicroTxn` flow is verified against a live sandbox.
- The itemdefid 4002 hidden bundle-resolver (real-mode cache-open target)
  has an unverified Steamworks item type — flagged in code comments.
- No backend is actually deployed. The Fly.io scaffold exists
  (`Dockerfile`, `fly.toml`, `docs/steam-backend-deploy-flyio.md`) but
  `fly deploy` has never been run; packaged builds still default to
  localhost until `HB_STEAM_BACKEND_URL` is baked with a real URL.
- No durable persistence in production: `server/db.js`'s JSON-file store
  has zero concurrency protection and no Fly volume is mounted.
- Belgium/Netherlands loot-box legal exposure is flagged but not
  mitigated (no geo-gate, no direct-purchase fallback).
- Publisher key, CI builder secrets, and Steamworks Microtransactions
  enablement all still block real deployment — external blockers, not
  code gaps.

**Test coverage:** good. Every backend module has a dedicated test file,
each isolated from the others' on-disk state.

## Maze & Landform Generation

`src/landforms.js` (pure grid transforms, well-tested) picks a seeded
archetype per chunk — maze, field, canyon, crater, ruins — and
`threeGame.js` (`buildChunk`, `getChunkLandform`) turns that grid into the
actual level. Investigation found three distinct issues behind the report
that "the ground maze is too close together" and "the pillar maze isn't
accessible and is too tight":

**1. Collision math didn't match player size.** `overlapsWall`
(`src/threeGame.js`) checks the player's position against a wall's
bounding box built from `wallCollisionHalfSize` + `wallCollisionPadding`.
With the historical values (wall half-size effectively 0.5, padding =
`playerRadius` = 0.66), a raw 1-wide DFS corridor (walls 1 world unit
apart) gave **negative clearance** — the player literally could not
stand centered in an un-widened corridor tile. `playerRadius` was tripled
(0.22 → 0.66, commit `fac28e7`) at some point without the collision
constants being re-tuned to match. *(In-flight, uncommitted work found
while researching this already loosens these constants — worth confirming
it lands and actually gives comfortable, not just non-negative, clearance
before calling this closed.)*

**2. "Pillar maze" isn't a separate area — it's flavor text for the
regular maze's dead-end alcoves**, where reward caches are placed
(`ROOM_TYPES.DEAD_END`, `classifyChunkCells`). There's no distinct
generator; "pillar" only appears in dialogue/mission copy
(`'MAP: UNLOGGED PILLAR NETWORK'`, tutorial dead-end lines) plus a purely
decorative pillar mesh at wall corners.

**3. The actual accessibility bug, now fixed:** `widenChunkCorridors` only
widens a floor cell if it has ≥2 open neighbors. A true dead end (exactly
1 open neighbor — precisely where `classifyChunkCells` puts reward caches)
never satisfies that, on any of the 3 widen passes MAZE chunks get. The
wall-trim pass right after has the same `openNeighbors < 2` gate, so dead
ends were triple-protected from ever opening up. **Fixed** in this pass:
`widenChunkCorridors` now also opens the perpendicular neighbors of a true
dead-end cell, turning a permanent 1-wide nub into a small pocket. Verified
with a standalone repro (before/after grid dump) and a new test file,
`src/threeGame.widenChunkCorridors.test.js` (the method only reads
`this.chunkSize`, so it's callable without a full ThreeGame/WebGL
instance — a pattern worth reusing for other pure-logic methods stuck
inside the class).

**Multi-level / verticality — never built, not a regression.** The
comment at the top of `src/landforms.js` says the world "used to be one
texture of terrain... an endless flat field of pillars," and landforms
were the fix for *that* flatness — but everything shipped is still one
Y=0 plane per chunk with fixed wall height; there is no vertical variation
at all. Real prior art exists and is fully orphaned: `src/levelManager.js`
(118 lines, `generateLevel(depth)`, ladder-based depth progression) and
`src/game.js`, both left over from the Phaser→Three.js migration
(`1536acc`) and never imported by anything. **Open question, not
decided here:** is "multi-level" something you actually want built (a
real scope item — depth-based generation, vertical traversal, likely
incompatible with the orphaned prototype given the engine changed
underneath it), or was "basic and flat" just describing the current
maze's flatness, already addressed by the corridor/collision work above?
Worth a direct answer before anyone spends time on it.

**Test coverage:** `landforms.js` (pure functions) is well tested,
including reachability via flood fill. Nothing in `threeGame.js` — the
class holding `widenChunkCorridors`, `classifyChunkCells`, and the
collision math — had any coverage before this pass's one new file.

## Core Gameplay Systems — What's Actually Connected

| System | Status | Note |
|---|---|---|
| Achievements engine | ✅ Solid | All 19 defs have real triggers wired to real events; well tested. One exception below. |
| Unified skill tree | ✅ Solid, with dead leftovers | Fully rendered/interactive, reachable, tested. Old parallel UI it replaced was never deleted (see below). |
| Bank/economy | ✅ Solid | ~~A handful of guard methods (`canUnlock`, `canUpgradeO2Generator`, etc.) are called only by tests~~ — removed 2026-07-15 (see Repo Health). All remaining spend/deposit flows reachable. |
| Hive/humanity/manifest, 10 endings | ✅ Most solid system reviewed | All 10 endings driven by real mutated state, all wired to cutscene/dialogue/achievement on game-over. No dangling branches found. |
| **Boss phases** | ✅ Wired 2026-07-15 | See below. |

**Boss phases — was the clearest disconnect in the repo, now closed.**
`src/bossPhases.js` is a complete, well-designed, fully-tested phase
machine (`createBossFight`, `tickBossFight`, weakpoint/armor gating, a
full 3-phase `QUEEN_FIGHT_DEF`). As of 2026-07-15 it's wired into
`threeGame.js`: `startQueenFight()` spawns her (Act 1 cave entrance,
re-triggerable during Act 2 while `queenStatus === 'aboard'`),
`updateQueenFightTick`/`handleQueenFightEvent` drive phase attacks/adds/
weakpoint windows each frame, and `applyPlayerDamageToEnemy` routes
player hits through `applyBossDamage`'s armor math before the shared
`damageSnail` kill pipeline. `slay_the_queen` in `src/achievements.js`
now has a real check (`state.stats.queenDefeated`, set only on a
combat-sourced `queenKilled` milestone — the narrative boarding-choice
purge/bargain path does *not* unlock it, confirmed by test), and the
combat kill dispatches `act2-milestone` with `source: 'queen-fight'`,
which the pre-existing Steam grant listener in `main.js` was already
gated on. Covered by `src/threeGame.queenFight.test.js` (armor/weakpoint
math, hp lockstep, event dispatch) and an added `achievements.test.js`
case. **Still open:** in-session gameplay acceptance (does the trigger/
arena/pacing actually feel right, can it be abuse-tested for reward
bypass) and, further out, real Steam-account proof that the grant lands
in a real Steam Inventory — see `docs/steam-launch-readiness-master-plan.md`.

**Old weapon/tier2 UI — claimed retired, not actually removed.**
✅ *Removed 2026-07-14.* Commit `76a27fc` ("Add the Bunker Tree") described
the old tier2/weapons action-card sections as retired, but `index.html`
still had `#tier2-section`/`#weapons-section` with full markup and
`threeGame.js` still defined `renderTier2Section()`/`renderWeaponsSection()`
— nothing called either. Deleted both dead DOM sections and both dead
renderer methods; kept `attemptTier2Unlock`/`attemptWeaponUpgrade`, which
are still real — the Bunker Tree calls them directly as purchase delegates.
`index.html` shrank ~6KB; lint/build/test all green after.

## Repo Health

- **Multi-agent history, not single-developer.** Docs literally coordinate
  "Codex lane" / "Gemini lane" / "Claude lane" work on the same branch.
  Several `"Fix ..."` / `"Address ... review feedback"` commits land
  immediately after the feature they patch — normal for this workflow, but
  means nothing here should be assumed reviewed just because it's on the
  branch.
- **`src/threeGame.js` is a 16,742-line god-class** (~406 methods) holding
  rendering, gameplay, UI glue, audio cues, and progression logic in one
  scope, with no dedicated test file. `main.js` (8,622 lines) is large too
  but already has real function-level seams (phase management,
  controller-input handling, dialogue/prompt UI) that would extract far
  more cheaply than anything in `threeGame.js` would.
- ~~**`phaser` is a confirmed-dead dependency**~~ — **removed 2026-07-15**
  (`npm uninstall phaser`), alongside `src/levelManager.js`/`src/game.js`
  (the only other `phaser` references, `window.Phaser` globals in the
  now-deleted `game.js`) and the leftover badge/keyword/TS-path-mapping
  mentions in `README.md`, `index.html`, and `jsconfig.json` that this
  doc's original code-import grep didn't catch. Three.js is now the only
  engine referenced anywhere in the repo.
- **Fog-of-war is fully resolved**, not the "half-applied" state a much
  earlier sprint note flagged — `FOG_OF_WAR_CLEAR_RADIUS`/etc. are defined
  and actively consumed in the overlay-positioning code, no stray
  TODOs anywhere referencing it.
- **Zero `TODO`/`FIXME`/`HACK` markers anywhere in the codebase.** This
  isn't a sign there's nothing incomplete — everything found in this
  review (boss phases, dead UI, orphaned engine files) had to be found by
  reading code, not by grepping markers. Worth normalizing the practice of
  actually leaving a `TODO` when something is intentionally partial.
- **Test/lint were flickering red during this review** — a repo-health
  pass caught `src/landforms.test.js` failing (a distribution assertion
  broken by the in-flight concurrent maze-loosening edit), which had
  already self-resolved by the time this doc was finished (the same
  concurrent edit updated its own test). Confirms the "co-edited live"
  caution above isn't hypothetical — it happened mid-review. Current
  state as of finishing this doc: lint clean, 47 files / 350 tests green.

## Recommendations, roughly in order

1. Decide the Queen fight's fate: either scope `src/bossPhases.js`
   integration into `threeGame.js` (the achievement and the Steam grant
   are both just waiting on this), or explicitly mark `slay_the_queen` and
   its emblem grant as post-launch and say so somewhere visible.
2. **Old weapon/tier2 UI: done.** Remaining dead-code deletions
   (`src/levelManager.js`, `src/game.js`, the `phaser` dependency, unused
   `bank.js` guards) are staged and ready but need an explicit yes first —
   they predate this session and weren't named in the request that
   prompted this cleanup, so deleting them outright wasn't something to
   just do unilaterally.
3. Answer the multi-level question above before anyone builds toward it.
4. Consider a `threeGame.test.js` (or several focused files, following the
   pattern this session's `widenChunkCorridors` test used — call
   `ThreeGame.prototype.method.call(fakeThis, ...)` for anything that
   doesn't truly need a live WebGL context) for the highest-risk pure
   logic still hiding in the class: collision, corridor generation, room
   classification.
5. Steam: get the Fly deploy actually running and the publisher key
   configured before anything else in that system matters — everything
   else there is genuinely ready and waiting on those two external steps.
