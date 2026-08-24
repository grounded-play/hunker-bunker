# Sprint 29 — Cross-Lane Completion Audit

**Date:** 2026-08-24 · **Branch:** `dev/sprint-29` (v2.3.1-beta)
**Scope:** verify all three lanes against the plan's §15 Definition of Done, and close whatever is still open.

## Method

Rather than trusting each lane's own status table, every claim was checked against the code:

- **Orphan check** — is each new module actually imported by a non-test file? (This repo has shipped authored-but-unwired code before.) All eight new modules are wired.
- **Telemetry completeness** — is every event declared in `src/presentationTelemetry.js` actually emitted somewhere? §16's "instrumentation gaps to close" is a DoD item, and a declared-but-silent event closes nothing.
- **Consumer/producer check** — for each value a module reads, does anything write it?
- **Command check** — `npm test`, `npm run build`, `npm run lint`, `npm run presubmit`.

## Gaps found and closed

### 1. The walk cycle never knew how fast the player was moving (P1, §10)

`src/player3dOverlay.js` read `state.speedMultiplier` to drive the mixer's `timeScale` — but **nothing anywhere set it**, so it always fell back to `1.0` and the clip played at a fixed rate. Lane C had wired the consumer and not the producer.

This matters more than a missing multiplier suggests: the three classes move at **SCOUT 4.8, ENGINEER 3.6, TANK 2.6** units/s and all three played the same walk cadence. At least two could not have matched the ground. log16's session was TANK — the slowest, and therefore the worst slide.

Added `computeLocomotionTimeScale()` (6 tests) driving cadence from real ground speed against a documented reference, with sprint cadence layered on top and a clamp so an extreme speed cannot shred or freeze the clip. `src/threeGame.js` now passes `groundSpeed`.

### 2. Six declared telemetry events were never emitted

`RETICLE hidden-reason`, `RETICLE target`, `RETICLE screen-pos`, `MENU input-blocked`, `XP ui-hide`, `LIGHTING light-dropped` — plus `MENU open` and `MENU close`, which an earlier check missed because those words appear generically elsewhere.

- Reticle events now fire through `diffReticleTelemetry()` (6 tests), which emits **on transitions only**. Reticle state is recomputed on every pointer move and refresh tick; emitting per evaluation would bury the log it exists to make readable — log16 was already 2,108 PERF entries out of 2,875.
- Menu open/close/input-blocked derive from `describeOverlayTransition()` (6 tests) against the single gate that already decides input suppression, covering all 49 modals at once and carrying the visibility snapshot log16 could not produce.
- `XP ui-hide` fires when the toast is actually gone, making "hidden at rest" checkable from the log rather than only by eye.

All 30 declared events now have emission sites.

### 3. The lighting report never recorded the lights (P0, §2)

`emitLightingTelemetry()` captured renderer settings but not the lights themselves, so "lighting turns off after I move" could be neither confirmed nor ruled out from a log. Added `src/lightingReport.js` (8 tests): counts lights that are actually contributing — present, visible, non-zero intensity — and emits `LIGHT_DROPPED` when a type's count falls. Snapshot now also carries exposure and tone mapping.

Deliberately counts only contributing lights: a light left in the graph but switched off or dimmed to nothing would otherwise mask exactly the regression this exists to catch.

### 4. `THREE.Clock` deprecation still fired at boot

`src/leaderConversation3d.js` was the last `THREE.Clock`, producing log16's 9ms warning. Migrated to `THREE.Timer`, which also clamps the delta spike a tab-switch hands the animation mixer.

### 5. Charms had no gameplay mount (§9)

`charmSockets.js` was wired into the armory and the reward preview but not into gameplay, though Lane B's own plan scoped it "across armory, gameplay, and season-pass reward preview contexts". Gameplay weapons now carry a named `CharmSocket`.

This needed care: the armory hangs its socket off an **unscaled pivot**, whereas a gameplay socket is a child of the weapon, which has already been scaled to fit the hand. Applying the same numbers would displace the charm by exactly that factor. `resolveGameplayCharmSocket()` (5 tests) divides the weapon scale back out.

### 6. All ten charms shared one hardcoded offset (Lane B's own open item)

Every charm used `model.position.set(0, -0.05, 0)` — a blanket constant standing in for per-model normalization, the same class of mistake as the single shared weapon socket it replaced, and the thing Lane B's design rule explicitly forbids. `resolveCharmModelOffset()` (4 tests) derives the offset from each charm's own scaled bounds so it hangs from its own top edge; a tall charm now drops further than a squat one.

### 7. Weapon telemetry bypassed its own contract

Lane C emitted `WEAPON` events as raw `window.hbLog` strings, so a typo would enter the log silently — defeating the point of a closed contract. Routed all eight call sites through `presentationTelemetry`. That flattened warn-level refusals to info, so the contract now takes an explicit level (3 tests) and `no_fire_zone` / `out_of_ammo` / `invalid_aim` keep their severity.

## Definition of Done

| # | Item | State |
|---|---|---|
| 1 | Reticle visible and reactive | Code complete; live pixels are a human check |
| 2 | Menus visible, layered, isolate input | Isolation was already correct; now proven by telemetry. "NIO menu" unresolved — see below |
| 3 | Lighting stable across movement route | Shadow type fixed, report complete; route walk is a human check |
| 4 | Distinct reward-family endings | Complete |
| 5 | Burst in front of object, behind card | Complete |
| 6 | Chroma-green removed | Complete, audit in `presubmit` |
| 7 | XP hidden at rest, event-driven, styled, audible | Complete |
| 8 | Season-pass collection reveal | Complete |
| 9 | Weapon scale calibrated | Complete across gameplay, armory, preview |
| 10 | Charms use correct per-weapon transforms | Complete, now including gameplay |
| 11 | Walking grounded at all speeds | Complete |
| 12 | Desktop and Steam Deck visual checks | Human — Gemini's Phase 4 |
| 13 | Tests and audits pass | `npm test` 255 files / 2,148 tests; build, lint, presubmit green |

## What cannot be closed by code

- **"NIO menu"** still has no counterpart in `index.html`, `main.js`, or `style.css`. Plan §1 says to reconcile the term rather than assume a DOM ID. Needs the user to name or screenshot the surface.
- **Whether the green box is the season-pass toast.** Evidence points there (`.achievement-toast`, `.season-pass-toast` riding it, 4.2s auto-dismiss ⇒ saturation not stickiness), but a screenshot would confirm it is not a different green panel.
- **Every "does it look right" acceptance** — reticle legibility against real scenes, burst impact, reward hold time, 1280x800 sign-off, foot-slide judged on a 10-second fixed-camera capture. These are Gemini's Phase 4 and need a person.
- **The stale pointer-lock e2e test.** `tests/e2e/gameplay-aim-cursor.spec.js:12` asserts `document.pointerLockElement !== null`, but `requestPointerLock` was removed from the repo in `e4ec7ec` when the game moved to the tactical-cursor model. It fails identically at `e8ed5fa`, before any Sprint 29 work. It needs retiring or rewriting, not fixing.
