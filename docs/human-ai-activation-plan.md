# humanAI.js Activation Plan

Date: 2026-07-28. Decision: **activate** (user choice, asked directly —
see `docs/master-implementation-plan-lane-split-2026-07-28.md` status log).
Status: scoped; Slice 1 implemented this session, Slices 2-3 open.

## The actual gap (smaller than the audit implied)

`src/humanAI.js` (`nextHumanState`, `HUMAN_STATES`, `HUMAN_STIMULI`) has
zero callers — that part of the audit is correct. But the audit's framing
("Camp movement, richer hostility responses... are not live systems")
undersold what already exists in `src/camp.js`:

- `createCampWorkers`/`campWorkers` (camp.js:228-242) — two ambient worker
  figures per camp, each with a `home` position, orbit `radius`, `speed`,
  `phase`.
- `SurvivorCamp.update()` (camp.js:842-962) already animates them every
  frame: orbit position, and the orbit already reacts to `this.status`
  (`gather` center when `recruited`, tighter/faster orbit when `turned`,
  a wobble when `robbed`, hidden when `culled`) — camp.js:944-961.
- A separate `npcSprite` (camp.js:902-942) already does real
  station-to-station path-walking between `npcPathNodes` with idle rests.
- `this.suspicion` (0-100, `setSuspicion`, camp.js:513-523) already drives
  a lockdown visual state (`isLockedDown` at suspicion≥50: barricade color,
  warning strobe) — this is the closest existing thing to a "hostility"
  signal and it's already computed every time suspicion changes.

So **movement, idle/work motion, and camp-state reactions were already
live**; what was actually missing was the discrete stimulus/state-machine
layer `humanAI.js` was designed to provide — noise/threat/damage/morale
events driving a *legible, named* psychological state (`unaware → alerted →
armed → panicked → fleeing → infected`) with visible feedback, instead of
the ad-hoc per-field `if (status === 'turned')` branches already scattered
through `update()`.

## Slice 1 (implemented this session) — wire the real state machine in

Rather than adding new detection plumbing (weapon-fire proximity, LOS)
across `threeGame.js`, Slice 1 derives stimuli from signals `camp.js`
*already computes every frame* — `status`, `suspicion` (rising/crossing the
lockdown line), `destroyed` — so it's fully connected on day one instead of
sitting disconnected like before.

New pure module `src/campHumanBehavior.js`:
- `deriveCampWorkerStimulus(campSnapshot)` — turns a status/suspicion/
  destroyed snapshot into a `HUMAN_STIMULI` event (or `null` if nothing
  changed).
- `updateCampWorkerHumanState(worker, campSnapshot)` — calls the *actual*
  `nextHumanState` from `humanAI.js` with that stimulus. This is the literal
  activation: the state machine that had zero callers now has one.
- `campWorkerVisualForHumanState(state)` — tint + speed multiplier per
  state, the "visual state" dimension the master plan asks every reactive
  system to carry.

Wired into `SurvivorCamp.update()`'s existing worker loop: each camp
computes one shared `humanState` per frame (workers in the same camp react
together, matching how `status` already applies uniformly today) and
applies the tint/speed to the existing orbit animation. No new save data —
`humanState` is derived each frame from already-persisted `status`/
`suspicion`, not stored itself, so there is deliberately no streaming/save
schema change in this slice.

Audio feedback is **not** in Slice 1 — camp.js's existing audio is a single
looping fire-crackle bus (camp.js:846-875); a per-state stinger needs a
short sample set that doesn't exist yet (asset work, not code).

## Slice 2 — escalation feeding into gameplay: verified already substantially
true, not a new gap

Re-examined 2026-07-28 rather than left "not started": `deriveCampWorkerStimulus`
escalates to `armed`/`threat_seen` at `suspicion >= 50` — the *exact* same
threshold as `SurvivorCamp.isLockedDown` (`src/camp.js:532-534`) and
`getActionableCampAt`'s real lockdown gate (`src/threeGame.js:9899-9906`),
which already refuses bond/support/quest-offer/aid the moment suspicion
crosses that line. Confirmed by direct call, not just reading the numbers:
`updateCampWorkerHumanState('alerted', { status: 'recruited', suspicion: 50,
previousSuspicion: 49 })` returns `'armed'` — the same frame the real
lockdown gate starts refusing those actions. So the escalation was *never*
purely cosmetic — Slice 1's tint/speed feedback is a visible confirmation of
a state that already has real mechanical teeth via the pre-existing
suspicion/lockdown system, not a decorative layer sitting on top of nothing.

What's still genuinely open: a *distinct* consequence for `panicked`/
`fleeing`/`infected` specifically (states that don't correspond to an
existing suspicion threshold) — e.g. a `fleeing` worker briefly blocking
`recruit`. That's a real, still-undecided design call (which is why it's
still flagged, not guessed at), but it's an *addition* on top of an
already-working feedback loop, not a prerequisite for one to exist.

## Slice 3 (not started) — audio + individual (not per-camp) state

Per-worker (not per-camp-shared) state, so two workers in the same camp can
be in different states (one fled, one still armed) — meaningfully richer,
but needs the pure functions above to take a worker-scoped snapshot instead
of a camp-scoped one, plus the stinger sample set for audio feedback.

## Explicitly out of scope here

Full "ambient human AI" as a standalone population system (humans with
names, individual schedules, escort behavior) — the master plan itself
says escort AI is a separate, not-implied feature. This plan only activates
the *existing* camp-worker layer with the *existing* state machine; it does
not add new NPC types.
