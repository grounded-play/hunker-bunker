# Gameplay Implementation Gap Audit — 2026-09-10

Status: evidence report · Author: Claude · Branch: `dev/sprint-33` ·
Baseline: `93ff756` + working tree · Package `2.3.2-beta` · Node `v22.22.1`

## What this is

A mechanical audit for **gameplay features that are partly built, built and
never connected, or promised in a plan and absent from the code.** It is not a
design critique and it does not restate the roadmap's open acceptance work.

Every claim below was produced by a script and then re-verified with a direct
search. Where my first pass was wrong, the corrected result is what appears
here — three modules I initially flagged as unused (`combatJuice.js`,
`ambientDrift.js`, `lootJuice.js`) turned out to be imported by `threeGame.js`
and were removed from the findings.

**Reproduce it:** `node scripts/audit-unwired-code.mjs` (add `--json` for
machine output). The script is committed alongside this report.

Findings are **candidates for triage, not verdicts**. An intentional extension
point, a harness hook, or a deliberately staged API is a legitimate reason to
appear on these lists. What is not legitimate is a system that reads as
finished — in the test count, in Product State, or in a plan doc — while doing
nothing in the running game.

## The pattern behind most of this

This repository has a recurring, documented failure mode: **a system ships as
a pure module with full unit coverage and no call site.** It reads as complete
everywhere except in the game.

It is not a hypothesis. It has already happened at least five times, each
caught late and by hand:

| System | How it shipped | Caught |
| --- | --- | --- |
| `depthContract.js` | "fully coded and tested with zero call sites anywhere else" — the design-pillars doc says so in its own status note | Sprint 28 review |
| `rollsElite()` | defined, tested, no consumer; Product State carried the gap for weeks | Sprint 33 (`eliteEnemies.js`) |
| `advanceQuest()` | defined, tested, no gameplay caller | Sprint 33 (companion contracts) |
| Run-card effect keys | 10 keys promised in card blurbs, 0 consumers | 2026-09-10 (G10, this sprint) |
| `snailEncounter.js` resolvers | superseded by `universalEncounter.js`; originals left tested and dead | this audit |

The unit-test count cannot catch this class of bug — **it actively hides it**,
because a pure module with no callers is the easiest thing in the codebase to
test to 100%. That is why the check is now a script.

## F1 — Anti-softlock route validation exists and is never run (highest risk)

`src/mazeTiers.js` implements `findDisjointRoutes()` and `hasTwoRoutesToQueen()`
— a guarantee that the player always has two independent routes to the Queen.
**`src/mazeTiers.js` has no production importer at all.** The whole 274-line
module is dead: `getTier`, `getMaxUnlockedTier`, `isTierUnlocked`,
`describeRouteToFinalTier`, `classifySpace`, `profileFootprint`,
`goalsRequiredForTier`, `milestonesRequiredForTier`.

This matters more than the other findings because the astra plan's COMBAT-01
and the roadmap both name **anti-softlock guarantees** as required, and
`docs/design/one-more-ring-design-pillars.md` cites `src/mazeTiers.js` by name
under *"What already exists to build on."* It does not exist in the runtime.

No generation-time route validation is called anywhere:
`validateMazeExpedition()`, `validateRadialMazeExpedition()`,
`validateRoomBuild()`, `validateRoomInstance()`, and `graphHasCycle()` are all
defined, tested, and uncalled.

**Disposition:** either wire route/reachability validation into world
generation, or stop citing it as an existing guarantee. A seeded world
generator with no reachability assertion in the runtime is a softlock waiting
for a bad seed.

## F2 — Eight modules have no production importer

| Module | Lines | What it is |
| --- | --- | --- |
| `src/mazeTiers.js` | 274 | Tier progression + anti-softlock route checks (F1) |
| `src/KeyedVideoSprite.js` | 152 | Video-textured sprites; **no test coverage either** |
| `src/hex.js` | 129 | Complete hex-grid library (7 functions) |
| `src/scene.js` | 97 | `GameScene` class with its own camera/renderer/`UnrealBloomPass` — a second, abandoned renderer |
| `src/gifDuration.js` | 86 | GIF duration probing |
| `src/survivalTension.js` | 49 | `evaluateSurvivalTension` / `syncSurvivalTension` |
| `src/data/humans.js` | 37 | Human archetype lookup |
| `src/minigames/rgb/index.js` | 14 | Barrel whose own header says *"main.js imports from here"* — `main.js` imports `runtime.js`, `save.js`, `content.js` directly and bypasses it |

`scene.js` is worth separate attention: it is a parallel renderer with bloom
that `threeGame.js` does not use, and it is the kind of file that makes future
readers think there are two rendering paths.

## F3 — 74 exported functions have no production caller

Verified: each appears **exactly once** in production code — its own
declaration. 65 are covered by tests; 9 are referenced nowhere at all.

Grouped by what the gap actually is:

**Superseded duplicates — a newer implementation won, the old one was left in place**

- `src/snailEncounter.js`: `createEncounter`, `resolveFight`, `resolveTalk`,
  `resolveFlee`. The snail-diplomacy feature **is live**, but through
  `src/universalEncounter.js` (`createUniversalEncounter` /
  `resolveEncounterAction`, Aug 18), which generalised it to camp NPCs and hive
  leaders. `threeGame.js` still imports `SNAIL_ENCOUNTER_CONSTANTS` from the old
  module, so the file cannot simply be deleted — the constants must move first.
- `src/skillTree.js`: `getAllTreeNodes`, `getBranchConnectors` — the live pair
  is `buildUnifiedSkillTree` / `getTreeConnectors` in the same file.

**Safety nets built but never installed** — F1, plus `roomContainment.js`'s
`shouldClampAreaOfEffect` (AoE containment) and `roomBuilds.js`'s
`computeApproachPoint` (the reserved-approach rule WORLD-01 §3 asks for).

**Feature surface with no runtime or UI**

- `campEconomy.js :: getCampTrades` — a full camp trading economy with class
  affinity discounts, level and bond scaling. Never called. The camp *verb*
  effects beside it (`mergeCampVerbEffects`) **are** live, so this is
  specifically trading that is unbuilt — directly the roadmap's "faction
  economies" gap.
- `campHumanBehavior.js :: updateCampWorkerHumanState` — single-worker state
  update (the plural `updateCampWorkersHumanStates` is live).
- `objectiveTargetResolver.js :: resolveObjectiveTargetPosition` — objective
  compass position resolution.
- `ringCrossings.js`: `getRingCrossing`, `isRingCrossingOpen`,
  `getCrossingStatus`, `getCrossingTraversalState` — the *readers* for crossing
  state. The plan/build side of the module is wired; nothing asks it a question.
- `milestoneBossLifecycle.js`: `isMilestoneDefeated`,
  `getCanonicalMilestoneBossId`, `serializeMilestoneBossLifecycleState`.
- `territoryPlanner.js`: `getTerritoryForChunk`, `getTerritoryBeat`,
  `getRequiredSocketsForChunk` — territory *allocation* is wired via
  `ringManifest.js`; the per-chunk *queries* are not.
- `steamLobbyClient.js`: `checkLobbyProtocolCompatibility` — protocol version
  checking, never performed. Relevant to the open two-account co-op acceptance.

**Content lookups never read** — `data/codex.js :: getCodexEntriesByCategory`,
`data/strains.js :: getStrainForClass`, `data/terminalEvents.js ::
getTerminalEventById`, `data/runModifiers.js :: getRunModifierById`,
`data/humans.js :: getHumanArchetype`, `data/enemies.js :: rollAlienMutation`,
`data/communitySkins.js :: getRandomSurvivorNpc`. Each implies authored content
the game never surfaces; `rollAlienMutation` in particular suggests an enemy
mutation system that was designed and never hooked up.

**Referenced nowhere at all (9)** — `resetAssetLoadTelemetry`,
`getRandomSurvivorNpc`, `rollAlienMutation`, `getGifDurationMs`,
`applyRingRoadSystem` (landform ring roads), `getTier`,
`clearRewardPreviewCache`, `GameScene`, `getTileSockets`.

## F4 — 32 CustomEvents are dispatched into nothing

Dispatched exactly once, with no listener and no other reference:

`base-turret-damaged`, `bunker-door-damaged`, `crawler-detected`,
`elevator-descended`, `enemy-staggered`, `fungal-vent-erupted`,
`gameplay-ready`, `hole-filled`, `in-run-drop-equipped`, `in-run-drops-reset`,
`mayor-tina-transformed`, `maze-access-granted`, `maze-gate-denied`,
`mission-complete`, `noclip-toggled`, `player-downed`, `player-evaded`,
`player-regen`, `player-revived-self`, `radar-scan-triggered`,
`rgb-checkpoint`, `rgb-completed`, `rgb-ending-reached`, `rgb-started`,
`rgb-unlocked`, `ship-damaged`, `snail-befriended`, `song-interstitial-settled`,
`terminal-routes-revealed`, `unlimited-ammo-toggled`, `wall-damaged`,
`wall-destroyed`.

Some are deliberate extension points and some are e2e hooks (`gameplay-ready`,
`enemy-staggered` and `wall-destroyed` are referenced by tests). But several
are load-bearing-sounding and heard by nobody: **`mission-complete`**,
**`player-downed`**, **`snail-befriended`**, and the five `rgb-*` events —
an entire minigame's lifecycle telemetry that nothing records.

**Disposition:** for each, either add the consumer or delete the dispatch. A
dispatch with no listener costs an allocation every time it fires and teaches
the next reader that something is listening.

## F5 — Four permanent feature flags with no off-path

`src/threeGame.js` declares `FEATURE_WALL_DECALS`, `FEATURE_MULTISHOT`,
`FEATURE_MILESTONE_BOSSES`, `FEATURE_WEATHER` — all hardcoded `true`, all with
live branches that can never be taken.

The roadmap's Horizon C item 9 already states the rule: *"A flag must retain a
real off-path, an owner, and a retirement condition or become ordinary code."*
None of these four has one. `src/featureFlags.js` is a separate, real mechanism
(`DEMO_BUILD`) and is not the problem.

## F6 — Contained gaps that are correctly disclosed

Recorded so a future audit does not re-raise them as new:

- **9 of 19 relics/overclocks are inert** (`implemented: false` in
  `src/runDrops.js`): `split_shot`, `cryo_rime`, `plasma_bounce`,
  `caustic_payload`, `shatter_engine`, `bio_vampirism`, `tesla_thrusters`,
  `pheromone_aura`, `chitin_membrane`, `synapse_pulse`. They are excluded from
  the reward roll and kept for the Vault/museum. This is the correct handling —
  the promise was withdrawn rather than faked.
- **Run-card effect keys**: closed 2026-09-10 (G10). Five wired, five removed
  with blurbs rewritten, and a whole-deck test now fails on any unbacked key.
- **Wanderer archetypes**: all six now carry quest templates; the historical
  "only three have contracts" note is stale.

## Recommended order

1. **F1** — decide whether route validation is a guarantee or not. It is the
   only finding here that can end a player's run in an unwinnable state.
2. **F5** — retire the four flags. Cheapest item on the list, removes four dead
   branches from the largest file in the repo.
3. **F3 superseded duplicates** — move `SNAIL_ENCOUNTER_CONSTANTS` into
   `universalEncounter.js` and delete the dead resolvers; same for the
   `skillTree.js` pair. Removes the "which one is real?" question.
4. **F4** — triage the 32 events; delete or connect.
5. **F2** — delete `scene.js` and the unused barrel; decide whether `hex.js`,
   `mazeTiers.js`, `survivalTension.js` and `KeyedVideoSprite.js` are wanted.
   Deleting is a real answer; leaving them is not.
6. **F3 feature surface** — these are product decisions (camp trading, enemy
   mutations, codex, strains), not cleanup. Each needs a build-or-cut call.

## Guardrail

`scripts/audit-unwired-code.mjs` makes this repeatable. Consider running it in
presubmit against a checked-in allowlist, so a **new** unwired system fails the
build while the existing backlog stays visible. That converts this report from
a snapshot into a ratchet — which is the only thing that stops the pattern in
the table at the top from recurring a sixth time.
