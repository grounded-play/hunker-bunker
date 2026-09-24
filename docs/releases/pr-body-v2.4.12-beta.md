# Release PR: v2.4.12-beta — Invisible Essentials & Milestone Closures

**Target Branch:** `mothership` ← **Source Branch:** `release/v2.4.12-beta-invisible-essentials`

---

## 🎯 Summary

This release delivers **Phase 4 of the Invisible Essentials plan** (pure pneumatic transit network, milestone boss defeat extraction terminal unlocking, sanctuary return teleportation, tactical map landmarks, and objective breadcrumbs) and provides comprehensive verification test suites proving closure readiness for 4 core milestone tickets:
- Fixes #78 (Persistence & Campaign Reset)
- Fixes #80 (Fabrication Bay & 13 Curated Recipes)
- Fixes #81 (Hero Selection & Class Preview Presentation)
- Fixes #82 (Armory Presentation, Polish Placement & Equipment Mounts)

Also merges all staged work from `dev/sprint-46` and `dev/sprint-47`, reconciling the repository state and bringing total passing tests to **4,201 across 469 files** (100% green).

---

## 🔬 System Ownership & Runtime Wiring

| System / Feature | Canonical State Owner | Runtime Consumer | Persistence Boundary | Verification Suite |
| :--- | :--- | :--- | :--- | :--- |
| **Pneumatic Transit Network** | `PneumaticTransitNetwork` (`src/pneumaticTransit.js`) | `ThreeGame.interactWithTransitTerminal` & `getPriorityInteractionCandidates` | In-run state machine | `src/pneumaticTransit.test.js`, `src/threeGame.pneumaticTransit.test.js` |
| **Tactical Map Landmarks & Breadcrumbs** | `MapSystem` (`src/mapSystem.js`) | Tactical map overlay & navigation HUD | Active expedition session | `src/mapSystem.test.js` |
| **Ticket #78: Persistence** | `CampaignLedger` & `BankManager` (`src/bank.js`) | `startNewCampaign`, death handlers, victory screens | `localStorage` (`hb_campaign_v2`, `hb_bank`) & Steam Cloud | `src/ticket78Persistence.verification.test.js` |
| **Ticket #80: Fab Bay & Recipes** | `FabricatorManager` (`src/fabricator.js`) | Homebase Fab Bay UI, `applyFabricatedRecipeOutput` | `localStorage` (`hb_fabricator_v1`) | `src/ticket80FabBay.verification.test.js` |
| **Ticket #81: Hero Selection** | `scoutHeroPreview` (`src/scoutHeroPreview.js`) | Homebase class hangar cards & `syncHeroPreview` | Session generation guard | `src/ticket81HeroSelection.verification.test.js` |
| **Ticket #82: Armory** | `armoryUi.js`, `charmSockets.js`, `operatorEquipmentSockets.js` | Armory 3D workbench scene & loadout manager | Loadout state | `src/ticket82Armory.verification.test.js` |

---

## 🏆 Evidence Reached & Automated Gates Passed

- [x] **Designed** — Specifications and architecture documented in `docs/planning/invisible-essentials-2026-09-24.md` and feature worklogs.
- [x] **Coded** — All modules and integrations implemented with no dead code.
- [x] **Connected** — Live runtime hooks wired into `ThreeGame`, `MapSystem`, `LoadoutManager`, and Homebase UI.
- [x] **Tested** — **4,201 tests across 469 files pass (100% green)**.
- [x] **Live-verified** — Verified in local runtime development build.
- [ ] **Packaged-verified** — Pending tonight's hardware QA session on Steam Deck.
- [ ] **Accepted** — Conditioned on tonight's QA test pass.

### Automated Checks
- `npm run lint`: Clean (0 errors, 0 warnings across all source and test files).
- `npm test`: 4,201 passed (469 files, duration ~21s).
- `npm run audit:docs`: 12 canonical files, 375 Markdown files passed.
- `npm run audit:dependencies`: 100% production dependencies matched.

---

## 🎮 Tonight's Hardware & Multiplayer QA Testing Plan

Informed by the session findings from the 2026-09-23 Steam Deck session log analysis (`docs/reports/session-log-analysis-2026-09-23-deck-pvp-session.md`):

### 1. Steam Deck Frame Pacing & Thermals (Target: Steady 60 FPS)
- **Context:** Yesterday's evening log recorded long task diagnostic windows during intense transitions. Commit `2d0032a` / `4da77cc` suspended world rendering under modal overlays, and transient effects were capped at 64.
- **Tonight's Tests:**
  1. Boot into Sector Zero on physical Steam Deck (1280×800, DPR capped at 1.0/2.0 max).
  2. Engage Sector Boss. Confirm frame rate remains at steady 60 FPS without thermal throttling over a 30-minute test.
  3. Activate pneumatic transit terminal at `(45, 0, 18)`: confirm camera fade and teleportation to Sanctuary `(9, 0, 5)` completes smoothly without stutters.

### 2. Two-Account Co-op & Relay Synchronization
- **Context:** Yesterday's co-op hardening unified boss hit reporting to host authority.
- **Tonight's Tests:**
  1. Host and client join Socket.IO relay lobby.
  2. Complete milestone boss encounter. Confirm boss phase lines and defeat trigger consistently on both host and guest.
  3. Guest initiates pneumatic transit: verify both players teleport safely to Sanctuary without desync or duplicate event churn.

### 3. Steam Cloud Cross-Device Save Round-Trip (Ticket #78)
- **Tonight's Tests:**
  1. Execute two deaths and deposit salvage on Linux Desktop build.
  2. Cloud sync to Steam Deck: confirm career telemetry increments, bank salvage is preserved, and no duplicate items or schematics appear in the ledger.
  3. Start New Campaign: confirm expedition reset while career bank and permanent unlocks remain intact.

### 4. Controller & Armory Navigation (Tickets #81 & #82)
- **Tonight's Tests:**
  1. Perform 30 rapid class swaps (Scout ↔ Tank ↔ Engineer) using D-pad/Left Stick on Steam Deck: confirm zero visual artifacting, memory stability, and immediate responsiveness.
  2. In Armory Tactical Bench: navigate to Exosuit Rig, select Operator Polish (`#armory-polish-btn`), cycle matrix tints, and confirm focus returns cleanly to the rig dropdown without focus loss.
