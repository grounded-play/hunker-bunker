# Sprint 20 Work Plan — UI Architecture Decoupling & Completion Pass

**Date:** 2026-07-26  
**Branch:** `dev/sprint-20`  
**Status:** Approved for Implementation  

## Overview

Following our deep audit of branch `dev/sprint-20` and historical documentation, this plan outlines the immediate technical tasks owned and executed by the AI assistant today. The goal is to clean up architectural debt in `main.js`, eliminate missing-asset fallback notices in the RGB mini-game, and harden the core HUD objective engine.

---

## Detailed Task Breakdown

### Task 1: Extract `src/steamVaultUi.js` from `main.js`
- Create `src/steamVaultUi.js`.
- Move `initSteamVaultUI`, `openSteamVaultModal`, `loadVaultData`, `renderVaultItemGrid`, `openDeepRelicCache`, and `openHostedSteamItemStore` from `main.js` into `src/steamVaultUi.js`.
- Export the primary interface methods and import them into `main.js`.

### Task 2: Extract `src/leaderboardUi.js` from `main.js`
- Create `src/leaderboardUi.js`.
- Move game-over leaderboard rendering, score submit button handlers, and rank list population from `main.js` into `src/leaderboardUi.js`.
- Export `initLeaderboardUI` and `renderGameOverLeaderboard` into `main.js`.

### Task 3: Author Vector SVG Placeholders for Missing RGB Inventory Icons
- In `src/minigames/rgb/content.js`, provide crisp, thematic 64x64 SVG data URLs for:
  - `item_temp_badge`
  - `item_phone`
  - `item_wire_cutters`
- Update `ASSET_PROVENANCE.md` under `placeholder-pending-final`.

### Task 4: Clean Dead DOM References in Render Loop
- Remove obsolete `#tier2-section` and `#weapons-section` DOM lookups inside `src/threeGame.js`'s update loop.

### Task 5: Extend `ObjectiveRegistry` Step Mechanics & Coverage
- Add step toggle methods (`toggleStepDone(id, stepIndex)`) in `src/objectiveRegistry.js`.
- Expand unit tests in `src/objectiveRegistry.test.js` to cover step state changes, event dispatching, and priority sorting.

---

## Verification Strategy

1. `npm test` — Ensure all 77+ test files pass cleanly.
2. `npm run lint` — Confirm zero lint failures.
3. `npm run build` — Verify production bundle builds without missing module errors.
