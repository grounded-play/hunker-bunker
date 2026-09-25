# Release PR: v2.4.12-beta — Invisible Essentials, Co-op Parity & Milestone Closures

**Target Branch:** `mothership` ← **Source Branch:** `release/v2.4.12-beta-invisible-essentials`

---

## 🎯 Summary & Tickets Closed

This release delivers **Phase 4 of the Invisible Essentials plan**, resolves critical multiplayer networking and map lifecycle rules identified in the **2026-09-24 Steam Deck + PC co-op QA session**, overhauls the **Minimap Radar Scan, Fog of War, and Wavefront Dissipation**, and automates code-side verification suites across all core milestone tickets.

### 📋 Milestone Tickets Advanced

No ticket is auto-closed by this PR. The owner's brief made closure conditional on a successful QA pass; the 2026-09-24 Deck + PC session did not exercise the #78 and #81 acceptance conditions and found defects in the #80 and #82 areas ([QA game plan](../planning/qa-2026-09-24-deck-pc-coop-game-plan.md)). Close each ticket by hand once its conditions are shown.

- Advances #78
- Advances #80
- Advances #81
- Advances #82

| Ticket / ID | Scope & Domain | Status in this PR | Automated & Runtime Evidence |
| :--- | :--- | :--- | :--- |
| **#78** | **Persistence, Career Telemetry & Campaign Reset** | **Advanced (code acceptance only)** | [`src/ticket78Persistence.verification.test.js`](../../src/ticket78Persistence.verification.test.js): persistence migration, career stats kept on New Campaign, save serialization. **Still to show:** two deaths, a victory, New Game, legacy migration and no duplicated ownership on a real save, and Steam Cloud behaviour. |
| **#80** | **Fabrication Bay & 13 Curated Recipes** | **Advanced — QA found defects** | [`src/ticket80FabBay.verification.test.js`](../../src/ticket80FabBay.verification.test.js): recipe atomicity, deductions, catalog parity. **QA 2026-09-24:** old/wrong models, output not matching the preview, out-of-date UI, trade-up not sticking; in code, six Foundry-only weapons with no model or Armory icon and different items sharing one schematic image. Planned fix: the one-catalog Foundry hub. |
| **#81** | **Hero Selection & Class Preview Presentation** | **Advanced (code acceptance only)** | [`src/ticket81HeroSelection.verification.test.js`](../../src/ticket81HeroSelection.verification.test.js): generation guard, DPR constraints, 3-class switching. **Still to show:** 30 rapid swaps with animation and memory checks, desktop and Deck captures. |
| **#82** | **Armory Presentation, Polish Placement & Equipment Mounts** | **Advanced — QA found defects** | [`src/ticket82Armory.verification.test.js`](../../src/ticket82Armory.verification.test.js): 7 slots, charms, tints, socket calibration. **QA 2026-09-24:** UI out of date with current standards; weapon/item images do not match across Armory, Foundry and hero screen. Planned fix: one card and preview on the Armory base, class-themed. |
| **#85** | **Two-Account Co-op PvE Expedition & Networked State** | **Advanced** | Hardware: the 2026-09-24 packaged session (Deck host + PC guest, two Steam accounts; logs `mug11pto` / `mug11v9w`) proved join, ready, deploy, avatars and redeploy — and exposed the divergences below. **Code (not yet on hardware):** deaths, black box ownership, power-up drops, props, world state across TRY AGAIN, relay budgets, per-deploy maps (`39a7375`, `42c4bbc`, `1dd8056`, `caf5816`). The next two-machine session must confirm each. |
| **PLAN-HUD-MAP** | **Minimap Progressive Radar Reveal, Dissipation & Fog of War** | **Closed (Full Implementation)** | Closes instant-reveal and line truncation defects. Implements progressive wavefront reveal, 400ms dissipation tail with quadratic fade-off, minimap bezel mask, and high-contrast tactical CRT Fog of War pattern (`05c4300`). |
| **PLAN-TERMINAL-CYCLE** | **Terminal Day-Cycle Legibility, Live Clock & Advance Day Status** | **Closed (Full Implementation)** | Closes frozen/broken day cycle UI report. Implements reachable terminal modal refresh in render loop, 'CYCLE HOLD — TERMINAL ACTIVE' header readout, unified presentation view-model (`formatDayCycleViewModel`), cached journal signatures, `CAMPAIGN STATE` labeling, 24h progress bar, and truthful `ADVANCE DAY` card across all 7 locales (`0a3caf6`). |
| **PLAN-CI-LIGHTHOUSE** | **Lighthouse CI Timeout & PAGE_HUNG Resolution** | **Closed (Full Implementation)** | Resolves CI failure on GitHub Actions. Configures desktop preset, modern headless flags (`--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage`), Lighthouse agent detection in boot flow, and cutscene guard timeout (`c030269`). |
| **QA-P0-SPAWN** | **Spawn Void Pit Fall Fatalities** | **Fixed — confirm next session** | All three co-op QA deaths were a walk off an unguarded cliff by the first corridor. Lethal edges within 24 tiles of spawn now block movement (`7480bd9`); checked on the real map in a browser (the three death spots blocked, a far cliff still lethal), not yet on hardware. |
| **QA-P1-MAP-RULE** | **Map & Story Persistence Across Retries** | **Fixed — browser-verified** | Owner's rules: `TRY AGAIN` keeps the map and its changes; `MAIN MENU` starts a new run on a new map; co-op/PvP play a fresh story; the solo story (incl. world changes) carries on with CONTINUE and resets with NEW CAMPAIGN (`caf5816`, `42c4bbc`, `de61860`, `d3ec634`, `fcce193`). The first browser probe caught the solo half not taking effect (respawn reset the map seed; fixed in `fcce193`); the rerun shows TRY AGAIN on the same map seed, MAIN MENU on a new one, same campaign (`docs/reports/assets/qa-2026-09-24/run-maps-probe.json`). Not yet on hardware. |
| **QA-DECK-INPUT** | **Steam Deck double presses and carry-over** | **Fixed — confirm on Deck** | One press reached the game twice (Chromium Gamepad API first, native Steam Input a moment later; the Deck log shows Escapes in pairs ~0.1 s apart): B closed the map and then opened the pause menu, the ☰ settings button flashed open and shut, and a button held while closing a menu carried into gameplay as a sprint. `src/controllerPressGate.js` lets one press act once, in the action set it started in. The browser reproduction probe (`tests/e2e/probes/deck-double-press.spec.js`, fake pad + stubbed native bridge) showed the first version only half-fixed it: the tactical map polls the pad itself, so the gate never saw that press and native's copy opened settings (5/5 runs, before and after). Now a press the map consumes is held in the gate until the pad lets go, however late native's copy arrives; probe: map closes, no dash, no settings in 2/2 runs with native arriving 1.7–3.3 s later ([results](../reports/assets/qa-2026-09-24/deck-double-press-probe.jsonl)). Right-stick camera turning was inverted (right turned the view left, in both camera modes): the stick now uses the same sign as the mouse edge turn, with a test that the view turns right; confirm on Deck. |
| **QA-TITLE-FREEZE** | **Page froze a few seconds after load** | **Fixed** | `05c4300` made the presentation-cursor observer write classes on every call, re-triggering itself forever; bisected and fixed in `6ea3506` (the frozen build runs normally with the fix). |
| **QA-PERF-QUALITY** | **Full visual quality restored; frame time recovered on the CPU** | **Fixed — confirm next session** | `05c4300` had made low FPS (and every Steam Deck run) drop post-processing, freeze shadows, swap 3D enemies to sprites, stop loading 3D props and run player animation at 10 Hz. The 2026-09-25 PC log shows why that could not help: 8.4 ms GPU against ~48 ms frames — the time was main-thread game logic. All cuts reverted (adaptive = resolution only again, as decided 2026-08-26). Replaced with output-identical CPU fixes: wall raycast index (light cone, fog of war, projectiles, camera, audio), A* edge pre-check, single-pass flat decals (three was drawing them twice and re-resolving ~60 programs a frame), menu 30 fps cap. Headless game logic 42.0 → 13.3 ms/frame, program re-resolves 60 → 0 ([report](../reports/perf-quality-restore-2026-09-25.md)); equivalence tests for each. Not yet measured on the owner's PC or Deck. |

In addition, this PR completes the **Master Repository TODO Tree Audit**:
- Evaluated all 175 legacy open checkboxes across 33 historical planning and review documents.
- All 175 are tracked as migrated backlog in [`docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md`](../../docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md).
- Reconciles repository state and brings total passing tests to **4,252 across 478 files** (100% green).

---

## 📜 Commit Ledger (Sprint 46 → Sprint 47 & Release Hardening)

| Commit | Category | Description |
| :--- | :--- | :--- |
| `c030269` | fix(ci) | Resolve Lighthouse CI timeout and PAGE_HUNG in GitHub Actions |
| `c39da5d` | docs(release) | Record PLAN-TERMINAL-CYCLE closure in PR description |
| `0a3caf6` | fix(terminal) | Make bunker tactical terminal day-cycle live and legible |
| `05c4300` | feat(map) | Progressive radar scan wavefront reveal, edge dissipation fade-off, and clear fog of war |
| `a8d45ad` | test(e2e) | Run-maps probe — TRY AGAIN keeps the map, MAIN MENU gets a new one |
| `d3ec634` | feat(campaign) | A solo run started from the menu plays a new map; the story carries over |
| `de61860` | fix(story) | Co-op and PvP runs play a fresh story; the solo campaign is untouched |
| `01e3a59` | docs(qa) | World changes are story; NEW CAMPAIGN resets it (owner) |
| `6ac370f` | docs(qa) | Owner's run and story rules — co-op/PvP fresh story, solo CONTINUE keeps it |
| `0cd3431` | docs(qa) | Status — spawn cliff guard and per-deploy co-op maps |
| `caf5816` | fix(coop) | Each lobby deploy is a new map; TRY AGAIN keeps it |
| `7480bd9` | fix(world) | Lethal edges near spawn block movement instead of killing |
| `8332280` | docs(qa) | Networking status — what is fixed, what is open, nothing hardware-verified yet |
| `1dd8056` | fix(coop) | A co-op run starts without the solo profile's companion |
| `42c4bbc` | fix(coop) | TRY AGAIN keeps the map's changes; broken props break on both screens |
| `39a7375` | fix(coop) | Deaths, black boxes and power-up drops are networked |
| `aa6fe56` | docs(qa) | Claims table; Claude takes the co-op networking fixes |
| `d40fa87` | docs(qa) | Deck + PC co-op QA findings and game plan, checked against the session logs |
| `43726a1` | docs(sprint-47) | Integrated three-lane slice run (9/9) with raw output; logs tracked |
| `d0227a0` | fix(release) | Refine milestone acceptance claims, add solo career stats, and bind transit to boss arenas |
| `aafda5d` | docs | Add release PR description and tonight QA checklist for v2.4.12-beta |
| `e11893a` | feat(release) | Invisible Essentials Phase 4, milestone issue verifications (#78, #80, #81, #82), and v2.4.12-beta release |
| `c93a582` | docs(audit) | Evaluate 173 master items, record backlog, conflicts, and verification evidence |
| `e511e8e` | feat(essentials) | Phase 2 comfort and pressure controls (camera shake, aim assist, reduced pressure) |
| `608d2be` | feat(essentials) | Phase 3 — the results screen says why you died and what to do next |
| `efcb5ae` | feat(sprint-47) | Wire encounters, synergies, reward cache and expedition resume into the runtime |
| `2a7f8fb` | feat(essentials) | Expedition suspend/claim store and the Invisible Essentials plan |
| `1cc7db1` | feat(sprint-47) | Lane 3 status effects, synergy chains and the Ring 1 reward cache |
| `6157ff4` | feat(sprint-47) | Lane 2 coordinated encounters and boss phase conversions |
| `e0ad74b` | feat(sprint-47) | Ring 1 events in the runtime, lane report items |
| `233d2dc` | feat(sprint-46) | Arrival fight, bounties that pay, and an expedition report |

---

## 🔬 System Ownership & Runtime Wiring

| System / Feature | Canonical State Owner | Runtime Consumer | Persistence Boundary | Verification Suite |
| :--- | :--- | :--- | :--- | :--- |
| **Radar Scan Wavefront & Minimap** | `ThreeGame.lastRadarScan` & `TacticalMapOverlay` | `#hud-blueprint-canvas`, `#tactical-map-canvas` | In-run session | `src/mapReveal.test.js`, `src/threeGame.mappingMission.test.js` |
| **Pneumatic Transit Network** | `PneumaticTransitNetwork` (`src/pneumaticTransit.js`) | `ThreeGame.interactWithTransitTerminal` & `getPriorityInteractionCandidates` | In-run state machine | `src/pneumaticTransit.test.js`, `src/threeGame.pneumaticTransit.test.js` |
| **Co-op Networked World & State** | `ThreeGame.socket` & `server/relay.js` | `player-died`, `loot-drop-spawned`, `prop-broken` | Socket.IO relay broadcast | `src/threeGame.coopNetworkedState.test.js`, `server/relaySharedWorldEvents.test.js` |
| **Ticket #78: Persistence** | `CampaignLedger` & `BankManager` (`src/bank.js`) | `startNewCampaign`, death handlers, victory screens | `localStorage` (`hb_campaign_v2`, `hb_bank`) & Steam Cloud | `src/ticket78Persistence.verification.test.js` |
| **Ticket #80: Fab Bay & Recipes** | `FabricatorManager` (`src/fabricator.js`) | Homebase Fab Bay UI, `applyFabricatedRecipeOutput` | `localStorage` (`hb_fabricator_v1`) | `src/ticket80FabBay.verification.test.js` |
| **Ticket #81: Hero Selection** | `scoutHeroPreview` (`src/scoutHeroPreview.js`) | Homebase class hangar cards & `syncHeroPreview` | Session generation guard | `src/ticket81HeroSelection.verification.test.js` |
| **Ticket #82: Armory** | `armoryUi.js`, `charmSockets.js`, `operatorEquipmentSockets.js` | Armory 3D workbench scene & loadout manager | Loadout state | `src/ticket82Armory.verification.test.js` |

---

## 🏆 Evidence Reached & Automated Gates Passed

- [x] **Designed** — Specifications and architecture documented in `docs/planning/invisible-essentials-2026-09-24.md`, `docs/planning/qa-2026-09-24-deck-pc-coop-game-plan.md`, and `docs/planning/minimap-radar-scan-fog-overhaul-2026-09-24.md`.
- [x] **Coded** — All modules and integrations implemented with no dead code.
- [x] **Connected** — Live runtime hooks wired into `ThreeGame`, `MapSystem`, `LoadoutManager`, and Homebase UI.
- [x] **Tested** — **4,242 tests across 477 files pass (100% green)**.
- [x] **Live-verified** — Verified in local runtime development build and production bundle (`vite build`).
- **Packaged-verified (Pending Hardware QA)** — Gated on tonight's hardware QA session on Steam Deck.
- **Accepted (Conditioned on QA)** — Gated on tonight's QA test pass.

### Automated Checks
- `npm run lint`: Clean (0 errors, 0 warnings across all source and test files).
- `npm test`: 4,242 passed (477 files, duration ~20s).
- `npm run i18n:audit`: 572 text + 91 attrs annotated, 0 unlocalized DOM strings across 7 locales.
- `npm run build`: `vite build` completed in 2.57s; required media audited.

---

## 🎮 Tonight's Hardware & Multiplayer QA Testing Plan

Informed by the session findings from the 2026-09-24 Steam Deck + PC session logs (`logs/hunker-bunker-session-2026-09-24T21-11-38-478Z-mug11pto-kmzk.json` and `logs/hunker-bunker-session-2026-09-24T21-11-45-579Z-mug11v9w-lew5.json`):

### 1. Minimap Progressive Wavefront & Edge Dissipation Test
1. Boot into Sector Zero and trigger radar scan.
2. Verify minimap cells reveal progressively as the blue pulse circle expands outward, rather than popping in all at once.
3. Verify that when the wave hits `maxRadius`, the ring completes outward past the edge with a 400ms soft quadratic fade-off instead of cutting off abruptly.
4. Verify clear visual contrast: tactical CRT Fog of War grid vs phosphor survey underglow for scanned territory vs active player proximity aura.

### 2. Two-Account Co-op Relay Synchronization & Parity (Ticket #85)
1. Host (Steam Deck) and guest (PC) join relay room and deploy together.
2. Confirm both players spawn safely without falling off void edges near spawn (spawn cliff guard).
3. Defeat an enemy and verify power-up drop spawns at identical coordinates on both screens.
4. Player death test: verify the surviving player sees the downed body and owner-bound black box marker immediately.
5. Select `TRY AGAIN`: verify both players redeploy into the same map with previously destroyed walls still broken.

### 3. Steam Cloud Cross-Device Save Round-Trip (Ticket #78)
1. Deposit salvage and complete an expedition on Linux Desktop build.
2. Cloud sync to Steam Deck: confirm career telemetry increments, bank salvage is preserved, and no duplicate items or schematics appear in the ledger.
3. Start New Campaign: confirm expedition reset while career bank and permanent unlocks remain intact.

### 4. Controller & Armory Navigation (Tickets #81 & #82)
1. Perform 30 rapid class swaps (Scout ↔ Tank ↔ Engineer) using D-pad/Left Stick on Steam Deck: confirm zero visual artifacting, memory stability, and immediate responsiveness.
2. In Armory Tactical Bench: navigate to Exosuit Rig, select Operator Polish (`#armory-polish-btn`), cycle matrix tints, and confirm focus returns cleanly to the rig dropdown without focus loss.
