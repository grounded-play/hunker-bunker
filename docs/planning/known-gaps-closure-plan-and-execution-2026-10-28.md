# Known Gaps Closure Plan and Execution (2026-10-28)

**Status:** Plan Approved & Executing | **Branch:** `dev/sprint-53` | **Owner:** Engineering / Pair Programming  
**Tracking Context:** Closes release candidate known gaps documented in `docs/releases/pr-body-v2.4.18-beta.md` and `docs/planning/definitive-first-expedition-improvement-program-2026-10-27.md`.

---

## 1. Context and Target Known Gaps

The `v2.4.18-beta` release candidate established high-confidence stability across local single-player routes, raycasting performance, and 50 new PBR models/decals. However, the release body and Sprint 53 backlog itemize specific remaining gaps:

1. **Cinematic Doors:** Foundry discovery, Queen encounter, and snail-boss videos still play without doors (song cards use them now).
2. **Daily-Run Phase Timing:** The daily-run launch path still enters the gameplay phase before loading completes.
3. **Co-op & Deployment Readiness:**
   - Co-op / PvP unarmed deployment: Operators deploying into co-op or after tutorial opt-out start without their equipped weapon in hand.
   - 36.5 s deploy stall: Main-thread freeze in `startup:ready` caused by direct canvas presentation bypassing the composer program cache key.
   - Deck 9.4 fps performance: Profiling identified unindexed wall raycasting and main-thread task contention.
4. **Recalibration & World Interaction (S-17):** Visible in-engine recalibration installation presentation at the field workbench.
5. **Provisional Voices & Localization:** Code lines voiced in English only; voice routing fallback hierarchy.
6. **Publisher Release Gates:** Item store, MicroTxn, and refund checks tracked as external partner verification gates.

---

## 2. Technical Design & Implementation Plan

### 2.1 Cinematic Door Transitions for Key Encounters
- **Problem:** While song cards (`showCardThenScene`) use `triggerDoorTransition` to close blast doors before playback and open them on reveal, `foundry-discovered`, `queen-fight-started`, and `goal-milestone-presentation-requested` (snail bosses) invoke `playCutsceneVideo` or `playAuthoredEventOnce` directly.
- **Solution:**
  - Introduce `playCutsceneBehindDoors(videoBase, cutsceneOptions, doorKey)` in `main.js`.
  - Wrap `triggerDoorTransition` with `{ waitForClosedWork: true, openingHoldMs: 300 }`.
  - When the doors close, the cutscene video or still fallback mounts and plays.
  - When the cutscene completes or skips, the blast doors slide open horizontally (`opening-h`), revealing the world scene.
  - Wire `behindDoors: true` into `playCinematicBeat`, `playAuthoredEventOnce`, `foundry-discovered`, `queen-fight-started`, and `goal-milestone-presentation-requested` for all snail boss variants (`boss_cybersnail`, `boss_cryosnail`, `boss_sporesnail`).

### 2.2 Daily-Run Launch Path Phase Correction
- **Problem:** In `beginDailyOpsRun()`, `setAppPhase('gameplay')` was invoked synchronously inside the closed callback *before* `prepareGameplayForDialogue` finished generating sector topology and warming shaders.
- **Solution:**
  - Transition `appPhase` to `'deployment'` immediately upon initiating `beginDailyOpsRun()`.
  - Remove premature `setAppPhase('gameplay')` from the closed stage.
  - Defer `setAppPhase('gameplay')` to `onOpeningStart`, exactly matching `launchStandardRun`.
  - Invoke `notifyGameplayReady()` upon door opening completion.

### 2.3 Co-op & Expedition Armed Deployment Safeguard
- **Problem:** Players deploying into Co-op PvE, PvP, or expeditions with Sector 0 tutorial inactive frequently landed unarmed because the weapon was only staged on the distant tutorial rack without in-hand equipment.
- **Solution:**
  - Implement `equipDeploymentLoadoutWeapon()` on `ThreeGame`.
  - Automatically place the class loadout gun directly into the operator's hand at deployment when `isMultiplayer` (both `coop` and `pvp`) is active or when Sector 0 tutorial is not active.
  - Call `equipDeploymentLoadoutWeapon()` inside `notifyGameplayReady()`.
  - Retain `equipPvpLoadoutWeapon()` for API compatibility.

### 2.4 Deploy Stall Elimination & Deck Frame Performance
- **Problem:** On Windows/D3D11 and Steam Deck, first rendered frames stalled up to 36.5 s due to shader compilation mismatches, and raycasting through hundreds of instanced walls stalled main-thread frames.
- **Solution:**
  - Enforce `game.renderWithPerf('startup:first-frame')` through composer variants (`readBuffer` / `writeBuffer`) behind the loading screen, warming the exact ANGLE/D3D11 shader programs.
  - Broad-phase bounding-box raycast rejection in `src/wallRaycastIndex.js` (already benchmarked reducing wall check duration from 23.6 ms to 16.5 ms).
  - Cleaned up remote motion smoothing and weapon equip telemetry logging (`field-weapon-equipped`).

### 2.5 Recalibration Feedback & External Gates Clarification
- **Solution:**
  - Mark S-17 closed with `src/fieldRecalibrationPresentation.js` and `RECALIBRATION_FEEDBACK_KEYS` integrated into `fieldWorkbenchUi.js`.
  - Document provisional voice status with locale fallback logging.
  - Formalize external partner release gates (Item Store, MicroTxn, Deck physical review) as external acceptance routes in release notes.

---

## 3. Verification & Acceptance Criteria
1. `npm test`: All test suites pass, including new assertions in `src/deploymentSequence.test.js` and `src/threeGame.fieldWeaponRuntime.test.js`.
2. `npm run lint`: Zero ESLint or Ruff errors.
3. `npm run presubmit`: All 8 presubmit gates pass cleanly.
4. Git commit and push to `origin/dev/sprint-53`.
