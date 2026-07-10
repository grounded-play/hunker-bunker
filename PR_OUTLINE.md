# Sprint 19 PR Outline

Branch context: `dev-sprint-19`

This is the working map for where Hunker Bunker is starting from on sprint 19,
what has already landed, what is still not started, and where the game can be
improved next.

## Source Of Truth

- Current code: `src/act2.js`, `src/threeGame.js`, `main.js`
- Camp and hive presentation: `src/camp.js`, `src/hiveSite.js`
- Tests: `src/act2.test.js`, `src/camp.test.js`, `src/hiveSite.test.js`
- Design docs: `docs/story-arc-endings-design.md`,
  `docs/hive-swarm-camps-and-humanity-system-design.md`,
  `docs/implementation_plan.md`,
  `docs/game-wide-review-questions-and-proposals.md`
- Cutscene pipeline: `scratch/generate_cave_scenes.js`,
  `public/cutscenes/README.md`

## Where We Are Starting From

The current build is already beyond a simple prototype. Sprint 19 starts from a
game that has:

- persistent Act 2 state and migration logic
- camp support, bonding, robbery, culling, recruiting, turning, warning, and
  latent infection paths
- hive sites with rescue, sacrifice, harvest, cure, and network behavior
- human camp and alien hive in-world presentation
- a manifest-based ending picker
- a boarding handoff in runtime
- tests covering the state machine and most of the branch logic

In other words: the core consequence engine is real. Sprint 19 is not about
inventing Act 2 from scratch. It is about finishing the delivery path, making
the branching readable, and tightening the game loop.

## Already Started / Already In Code

### Act 2 state

- `src/act2.js` stores Act 2 in `hb_act2_v1`
- camps already have `alive`, `robbed`, `culled`, `recruited`, and `turned`
  states
- hives already have `dormant`, `mined`, `wounded`, `bonded`, `rescued`,
  `abandoned`, `slain`, `queen_consumed`, and `expired_by_cure`
- humanity, infection stage, cover integrity, suspicion, and networks already
  exist
- `pickAct2Ending()` already evaluates a rich ending vector

### Camp loop

- support/grow is implemented
- bond quests and final-vigil style story beats are implemented
- steal/cull/recruit/turn/warn/latent paths are implemented
- defended culls and cull loot scaling are implemented

### Hive loop

- hive mining and rescue are implemented
- hive bond thresholds and quest flags are implemented
- cure and infection behavior are implemented
- the relay/synapse style network logic exists

### Runtime and visuals

- camp leaders and workers are rendered in-world
- hive sites have visible ambient agents
- the runtime already chooses an ending video base on departure
- `playCutsceneVideo()` already supports fallback behavior when an asset is
  missing

### Tests

- Act 2 migration and ending tests already exist
- camp and hive reducer tests already exist
- class ordering and manifest tests already exist

## Not Started Yet / Still Thin

### Content pipeline gaps

- ending videos for the new branches are not generated yet
- ending posters for the new branches are not fully integrated
- `public/cutscenes/README.md` still lists only the earlier assets

### UX and structure gaps

- there is no dedicated boarding vessel object
- boarding still reads like part of camp interaction instead of a climax space
- the player does not yet get a strong pre-launch manifest forecast
- the game still exposes a lot of state without a compact summary layer

### System gaps

- there is no seeded run director / event deck yet
- route variation is still mostly state-based instead of pressure-based
- the game can still feel like a branching consequence table more than a
  changing run

### Polish backlog still pending

- objective HUD resilience after resets and death
- black box multi-object state
- compass distance feedback
- fabricator determinism
- dialogue panel sizing / presentation
- intro/cutscene overscan and other visual polish

## What Can Improve

### 1. Make the final boarding read clearly

The biggest opportunity is to make the launch feel like a physical decision
space, not just a menu choice. The player should understand:

- who is boarding
- what is blocked
- why it is blocked
- what ending family they are heading toward

### 2. Reduce visible state noise

The internal state can stay complex, but the player should see fewer live meters.
The best next step is to summarize the run in a small number of readable
pressures, not a wall of flags.

### 3. Add run variation that changes decisions

Current variation is strong on consequence, but thinner on route pressure. The
game would benefit from a run director or event deck that changes:

- route order
- encounter pressure
- camp behavior
- hive behavior
- scarcity

### 4. Finish the content handoff

The code already knows about the new endings. The remaining work is to make the
art pipeline and runtime presentation feel equally complete.

### 5. Align docs with code

Some docs still describe future-state items as not built yet even though the
code has already shipped them. Those docs should be refreshed so the next PR
does not waste time rediscovering what is real.

## Recommended Next Work

If we keep momentum, the best order is:

1. Finish the ending asset pipeline for the new branches.
2. Add the missing boarding/readability layer.
3. Tackle the sprint 6 polish backlog.
4. Start a run director or event deck pass.
5. Sync the docs with the current codebase.

## Execution Checklist

### 1. Ending pipeline

- [ ] Add the five ending recordings to `scratch/generate_cave_scenes.js` using
  the existing `recordVideo()` helper.
- [ ] Wire in the optional source PNG fallbacks in `public/` for the ending
  scenes.
- [ ] Update `public/cutscenes/README.md` so the runtime asset contract matches
  the generated files.
- [ ] Verify `main.js` still falls back to `act3-departure` when an ending
  asset is missing.
- [ ] Test coverage: add or update `scratch/smoke_act2.js` for
  `full_brood`, `clean_escape`, `mixed_crew`, `carriers_bargain`, and
  `scorched_sky`.
- [ ] Test coverage: keep `src/act2.test.js` assertions for `pickAct2Ending()`
  and manifest gating.
- [ ] Verification: run `node scratch/generate_cave_scenes.js`,
  `npm run test -- src/act2.test.js`, and `npm run build`.

### 2. Boarding and readability

- [ ] Add a dedicated boarding decision surface so launch reads like a climax
  instead of another camp dialog.
- [ ] Surface a pre-launch summary that shows seats used, passengers, and why
  launch is blocked.
- [ ] Keep the player-facing state summary to a few readable pressures instead
  of raw flags.
- [ ] Test coverage: add a boarding smoke scenario that checks blocked versus
  allowed launch states.
- [ ] Test coverage: expand `src/act2.test.js` for any new manifest summary
  helpers.

### 3. Sprint 6 polish

- [ ] Fix dialogue close paths in `main.js` so input always returns after boss
  or mission text closes.
- [ ] Make objective HUD state re-derive after respawn or reset instead of
  going blank.
- [ ] Expand black box tracking from a single marker to multiple recoverable
  objects.
- [ ] Tighten the compass distance, egg matte, fabricator roll, radar dish, and
  intro overscan issues.
- [ ] Test coverage: add smoke tests for dialogue close, respawn HUD recovery,
  and multiple black boxes.
- [ ] Test coverage: keep visual regressions in `scratch/smoke_camps.js` and
  any existing UI smoke scripts.
- [ ] Verification: run `npm run test`, `npm run build`, and `npm run
  lighthouse`.

### 4. Run variation

- [ ] Add or extend a seeded run director in `src/director.js` or a related
  module.
- [ ] Make at least one modifier influence pressure or route choice, not just
  flavor text.
- [ ] Surface the active modifier in a minimal UI summary so the player can
  read the run state.
- [ ] Test coverage: add deterministic unit tests for modifier selection.
- [ ] Test coverage: add a smoke test that proves one modifier changes an
  encounter or pressure variable.
- [ ] Verification: run the director tests plus one end-to-end smoke run with a
  fixed seed.

### 5. Docs sync

- [ ] Update `docs/hive-swarm-camps-and-humanity-system-design.md` so the
  "already in codebase" and "not built yet" sections match reality.
- [ ] Update `docs/implementation_plan.md` so completed Act 2 items are no
  longer described as future work.
- [ ] Update `docs/game-wide-review-questions-and-proposals.md` with the
  current sprint-19 priorities.
- [ ] Keep `PR_OUTLINE.md` as the living checklist for the PR.
- [ ] Verification: do a final read-through against `src/act2.js`,
  `src/threeGame.js`, and `main.js` to catch any drift.

## Useful References

- `src/act2.js`
- `src/threeGame.js`
- `main.js`
- `docs/implementation_plan.md`
- `docs/game-wide-review-questions-and-proposals.md`
- `docs/hive-swarm-camps-and-humanity-system-design.md`
