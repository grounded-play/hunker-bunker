# First-Hour Acceptance Plan

Date: 2026-07-28. Status: design/checkpoint script — the actual "watch a
new player" pass is manual and not agent-executable (see
`docs/master-implementation-plan-lane-split-2026-07-28.md`).

Origin: `docs/sprint-19-wave6-punch-list-lane-split.md` named this "the
single highest-value planning doc nobody's written yet" and assigned it to
the Gemini lane on 2026-07-16. It was never written — no Gemini agent has
actually touched this branch. Written now by Claude because it's the design
layer for `docs/master-implementation-plan-2026-07-28.md` Phase 10.1
("Human first-hour script"), which is in the Claude lane.

This is a **checkpoint script for a human observer running a real new
player through the game**, not something a coding agent can execute itself.
What an agent *can* do — and what this doc does — is ground each checkpoint
in the actual code hook that should fire at that moment, so "did this work"
has a concrete, checkable answer instead of a vibe.

## How to run this

Sit a person who has never seen the game in front of a packaged build (or
`npm run dev`, `?e2e=1` disabled — this must be the real onboarding path,
not the automated-test skip path `startRunAndSkipIntro`/`skipAllIntro`
uses). Do not explain controls. Watch, don't help, unless they're stuck for
>60s. Record every row below as pass/fail plus a one-line note.

## First 5 minutes — profile, class, crash, first objective

Existing implementation to verify against, not assume:
`src/dialogue.js`'s tutorial step sequence
(`tutorialStepMovement` → `tutorialStepVitals` → `tutorialStepPickup` →
`tutorialStepHudCounter` → `tutorialStepDeadEnds` →
`tutorialStepEnemyIntel` → `tutorialStepCompass` → `tutorialStepConsole` →
`tutorialStepConsoleAccess` → `tutorialStepDeposit` → `tutorialStepGoals`,
lines 431-461).

| Checkpoint | Pass condition | Code hook to confirm it fired |
| --- | --- | --- |
| Profile/class selection is legible | Player picks a class without asking "what do these do" | class-select UI copy, not code — note confusion verbatim |
| Intro/crash reads as intentional, not a bug | Player doesn't ask "did it crash" | crash cutscene → Mothership dialogue sequence |
| Crash-room door / first move | Player exits the crash room within ~30s of gaining control | `tutorialStepMovement` |
| First objective is never ambiguous | Player can state their current objective if asked, unprompted | `tutorialStepGoals`, `ObjectiveRegistry.getActiveObjectives()` |
| Movement/combat/interact understood | Player fires and picks something up without a tutorial re-read | `tutorialStepPickup`, `MOTHERSHIP_REACTIVE_LINES['first_kill']` (main.js) fires on cue |

## First 15 minutes — generator/banking, first camp/hive signal, first upgrade, death

| Checkpoint | Pass condition | Code hook to confirm it fired |
| --- | --- | --- |
| Generator/banking loop understood | Player deposits without being told what "banking" means | `tutorialStepDeposit`, `MOTHERSHIP_REACTIVE_LINES['first_deposit']` |
| First camp/hive signal read correctly | Player moves toward a signal without confusing it for a threat | camp/hive signal flare (`project_landforms_camp_discovery` per repo history) |
| First upgrade choice is understood | Player can explain what they bought, in their own words | skill tree / bank upgrade UI |
| Death/reset explanation lands | Player understands what they lost vs. kept before starting the next run | `generateDeathReport()` (main.js:2746) |

## First 60 minutes — faction choice, black box/cave, run loop, Act transition

| Checkpoint | Pass condition | Code hook to confirm it fired |
| --- | --- | --- |
| Faction choice feels consequential | Player hesitates/deliberates, doesn't treat it as flavor text | camp-choice modal boarding-manifest forecast (main.js ~7695-7783), `formatManifestBlocker` |
| Black box / cave progression legible | Player pursues it as a goal, not stumbles into it | `MOTHERSHIP_REACTIVE_LINES['objective_found']`, cave reveal controller |
| Run loop comprehended | By run 2-3, player states the loop unprompted ("go out, bank, come back, upgrade") | — behavioral only, no single code hook |
| Act transition is legible | Player notices and can explain the Act 1→2 shift, doesn't think it's a new game | Act 2 manager init, `ACT2_ENDING_CUTSCENES` |

## Record for every session

- Player confusion (verbatim quotes beat paraphrase)
- Time-to-objective for each checkpoint above
- Deaths (and whether the death report explained the cause)
- Skipped dialogue (which lines, and whether skipping lost causal info the
  player needed later — e.g. skipping `tutorialStepGoals` and then not
  knowing the objective)
- Controller problems (if run with a controller — cross-reference
  `docs/master-implementation-plan-2026-07-28.md` Phase 5)
- UI overlaps (HUD elements fighting for the same corner — the repo has a
  known history of this, see `docs/ux-and-game-feel-punch-list-2026-07-16.md`)
- Asset load failures (console errors, missing textures/audio)

## What this doc is not

Not a substitute for the actual session. Not a test an agent can pass/fail
on its own — the pass conditions above are about a specific human's
comprehension, which no automated suite can stand in for. What automated
coverage *can* do (and should, per Phase 18 of the master plan) is prove the
code hooks referenced above actually fire in the right order — that's a
`tests/e2e/` job, not this doc's job.
