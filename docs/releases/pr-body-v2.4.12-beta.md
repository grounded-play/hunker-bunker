# Release PR: v2.4.12-beta — Invisible Essentials & Milestone Closures

**Target Branch:** `mothership` ← **Source Branch:** `release/v2.4.12-beta-invisible-essentials`

---

## 🎯 Summary

This release delivers **Phase 4 of the Invisible Essentials plan** (pure pneumatic transit network with seeded boss arena coordinate binding, milestone boss defeat extraction terminal unlocking, sanctuary return teleportation, tactical map landmarks, and objective breadcrumbs) and provides code-side automated verification test suites for 4 core milestone tickets:

> [!IMPORTANT]
> **Milestone Status:** Implements and automates the code-side acceptance for #78, #80, #81, and #82. Do not close until their required packaged/hardware acceptance evidence is attached. Close each individually after tonight's QA where applicable.

- **Advances #78** (Persistence & Campaign Reset) — automated persistence, migration, and solo career telemetry suites.
- **Advances #80** (Fabrication Bay & 13 Curated Recipes) — automated recipe execution, deductions, and debug override suites.
- **Advances #81** (Hero Selection & Class Preview Presentation) — generation-guard contract and DPR constraint suites.
- **Advances #82** (Armory Presentation, Polish Placement & Equipment Mounts) — 7 equipment slots, charm hanging paths, and socket calibration suites.

In addition, this PR completes the **Master Repository TODO Tree Audit**:
- Evaluated all 175 legacy open checkboxes across 33 historical planning and review documents.
- All 175 are now tracked as migrated backlog in [docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md](../planning/todo-audit-backlog-and-conflicts-2026-09-24.md); each source document's line is closed with a link to it, and the ledger links back to the source.
- The first pass marked 50 items completed and 9 as design conflicts. A [verification review](../planning/todo-audit-backlog-and-conflicts-2026-09-24.md#verification-review) found 7 of the 9 conflicts and 16 of the "completed" items unsupported by the repository (reopened there, with reasons), 8 supported by automated tests only, 4 needing a Steamworks dashboard check, and the rest not re-checked. **No TODO is closed by this PR on the strength of the first pass alone.**

Merges all staged work from `dev/sprint-46` and `dev/sprint-47`, reconciling the repository state and bringing total passing tests to **4,202 across 469 files** (100% green).

---

## 📜 Commit Ledger (Sprint 46 → Sprint 47)

| Commit | Category | Description |
| :--- | :--- | :--- |
| `aafda5d` | docs | Add release PR description and tonight QA checklist for v2.4.12-beta |
| `e11893a` | feat(release) | Invisible Essentials Phase 4, milestone issue verifications (#78, #80, #81, #82), and v2.4.12-beta release |
| `c93a582` | docs(audit) | Evaluate 173 master items, record backlog, conflicts, and verification evidence |
| `db472c0` | docs(essentials) | Claim Phase 6 (in-expedition build decisions) for Claude |
| `2a1dab4` | docs(essentials) | Phase 3 state and browser evidence |
| `382994b` | docs(essentials) | Claim Phase 4 (Navigation friction and return network) for Gemini Antigravity |
| `8647c94` | docs(essentials) | Record Phase 2 completion by Gemini Antigravity (`e511e8e`) |
| `e511e8e` | feat(essentials) | Phase 2 comfort and pressure controls (camera shake, aim assist, reduced pressure) |
| `fe8b7b2` | fix(essentials) | Field-loss line names salvage like the HUD; death-report probe |
| `608d2be` | feat(essentials) | Phase 3 — the results screen says why you died and what to do next |
| `78208b1` | docs(essentials) | Claim Phase 2 (Comfort and pressure controls) for Gemini Antigravity |
| `7338967` | docs(essentials) | Lane claims table; Claude takes Phase 3 (legible death) |
| `efcb5ae` | feat(sprint-47) | Wire encounters, synergies, reward cache and expedition resume into the runtime |
| `2a7f8fb` | feat(essentials) | Expedition suspend/claim store and the Invisible Essentials plan |
| `1cc7db1` | feat(sprint-47) | Lane 3 status effects, synergy chains and the Ring 1 reward cache |
| `6157ff4` | feat(sprint-47) | Lane 2 coordinated encounters and boss phase conversions |
| `aeea96e` | docs(sprint-47) | Ring 1 slice probe report with raw output; unopposed breach says so |
| `d7551dd` | docs(sprint-47) | Evaluate all three lanes; localized drop names in event rewards |
| `e1d47fd` | fix(sprint-47) | Event modal above the HUD stack, one state event per phase; slice probe |
| `42eae4f` | docs(planning) | Record the slice contract registry and report item kinds |
| `e0ad74b` | feat(sprint-47) | Ring 1 events in the runtime, lane report items |
| `a12028f` | feat(sprint-47) | Ring 1 event pool, cross-lane contract registry, repetition guard |
| `030d773` | docs(planning) | Three-agent lane split for the Ring 1 slice |
| `df2bd38` | docs(planning) | Gameplay feature review — ten standards, three priorities |
| `cf4132a` | feat(gaps) | Crash-site wreckage per landing; GP-02 on evidence; GP-14 measured |
| `233d2dc` | feat(sprint-46) | Arrival fight, bounties that pay, and an expedition report |
| `59564d1` | fix(pvp) | Align authoritative 4-heart contract across relay and remote replicas (GAP-PV-01) |
| `7abf13a` | fix(e2e,foundry) | Boot budget in the helpers, stale fixtures, Foundry floor drift |
| `f28b9f8` | docs | Qualify Sprint 45.2 evidence and PvP authority gap |
| `a5b4e84` | feat(telemetry) | Aggregate high-frequency diagnostics, trace input provenance, and bypass PvE cards in PvP |
| `4da77cc` | fix(pvp,render,input) | PvP spawn protection, hit telemetry, blast door sequencing, and title hover focus |
| `0956b2e` | docs | Correct Deck PvP evidence and acceptance gates |
| `2d0032a` | fix(deck,pvp) | No world render behind results, fixed shadow key, fair PvP hearts, PvP off leaderboards |
| `57588c5` | docs | Ingest the evening Deck PvP log; register §9; Sprint 45.2 plan |
| `8da53de` | fix(coop) | One authority for boss beats, milestone defeats and Act 2 descent |

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
- [x] **Tested** — **4,202 tests across 469 files pass (100% green)**.
- [x] **Live-verified** — Verified in local runtime development build.
- **Packaged-verified (Pending QA)** — Gated on tonight's hardware QA session on Steam Deck.
- **Accepted (Conditioned on QA)** — Gated on tonight's QA test pass.

### Automated Checks
- `npm run lint`: Clean (0 errors, 0 warnings across all source and test files).
- `npm test`: 4,202 passed (469 files, duration ~21s).
- `npm run audit:docs`: 12 canonical files, 376 Markdown files passed.
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
