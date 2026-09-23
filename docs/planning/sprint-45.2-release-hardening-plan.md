# Sprint 45.2 — Release Hardening & Expedition Proof

Status: active plan · Owner: repository maintainers · Updated: 2026-09-23 · Branch: `dev/sprint-46` (from `mothership` `d12b9c4`, PR #92 merged) · Baseline: `v2.4.11-beta`

## Mission

Produce a reproducible, packaged-build acceptance candidate and fix demonstrated release-critical failures. Keep the new expedition variety, existing campaign saves and permanent account progression; add no competing world generator. Every item ends in one of five states, and the report keeps them apart: **implemented**, **automated**, **browser-verified**, **hardware-verified**, **still open**. Hardware states need real evidence supplied by a tester — logs, video or notes — never a claim.

## Evidence already in hand

| Capture | Build | What it proves | Report |
| --- | --- | --- | --- |
| 2026-09-23 07:01Z, Deck, solo, 34.5 min | `v2.4.9-beta` `2236934` | The pre-Sprint-45.1 failure baseline: 3,277 transient effects, 853 MiB heap, p50 77.6 ms | [morning analysis](../reports/session-log-analysis-2026-09-23-steam-deck-playthrough.md) |
| 2026-09-23 21:29Z, Deck, solo + Steam-lobby PvP, 12 min | `v2.4.11-beta` `aafe429` | Effect cap holds on hardware (≤13); pacing still fails (p50 84.7 ms, max 4.6 s) for new reasons; PvP works end to end with rules defects | [evening analysis](../reports/session-log-analysis-2026-09-23-deck-pvp-session.md) |

Gap IDs below refer to the [master register](../reports/master-known-gaps-and-debt-register-2026-09-23.md) (§0 status, §9 evening findings).

---

## Workstreams (priority order)

### 1. Build and evidence baseline
- Record SHA, package version, platform, resolution, seed, expedition index, route and session-log identifiers for every capture (the log's `diagnostics.identifiers.build` already carries version/commit/branch/dirty; seed and expedition index are null today — **add them to the export**).
- Scripts and instructions for: a 30+ minute physical Deck run; a packaged desktop comparison on the same route; two-account Steam co-op **with both logs uploaded** (`uploadlogs` on each client); a two-machine Steam Cloud round trip.
- The evening PvP capture is one-sided: the rival never uploaded. Paired logs are the acceptance bar for any multiplayer claim.

### 2. Deck performance — now the top blocker
The cap fix worked; the remaining stalls are render-side (evening log):
- **GAP-RN-10 (P0)** — the results/game-over screen renders the full world at 0.5–1.7 s per frame for ~35 s. Stop rendering the world (or drop to the menu path) while it is covered.
- **GAP-RN-09 (P0)** — shader storms: `shadowMap.enabled` flips on every gameplay↔menu switch and is a shader key; chunk and remote-avatar materials are not prewarmed. Fix the shadow key per session on Deck; prewarm new variants off the critical frame.
- **GAP-RN-11 (P1)** — the Deck tier keeps shadows, post-processing and 20 point lights; decide it from measured frame time.
- Still required from the brief: audit every transient-effect spawn path against the cap, shared geometry/texture lifecycle, cleanup at chunk eviction and scene reset, GPU memory, heap and percentiles on matched routes, `v2.4.9-beta` vs current. A unit-tested cap is not proof of a smooth Deck session.

### 3. Multiplayer
- **Done in code (`8da53de`)**: single authority for irreversible beats — boss phases, weakpoints and adds are host-run with shared add keys; milestone defeats reach replica guests; Act 2 descent carries an absolute seed offset (GAP-MP-01 follow-up, GAP-MP-02). Automated in `src/threeGame.coopTransitions.test.js`. Needs a paired packaged host/guest log.
- **PvP rules from the evening log**: fixed symmetric PvP HP, no campaign fatigue (GAP-PV-01, P0); never post PvP runs to PvE leaderboards (GAP-PV-04, P0); no Black Box or objective XP from PvP deaths (GAP-PV-03); respawn protection and spawn separation (GAP-PV-02); outgoing-hit telemetry (GAP-PV-07); a state-based door event instead of a toggle (GAP-PV-06); decide whether PvE missions and run cards belong in PvP (GAP-PV-05).
- Two-account co-op PvE expedition remains unwitnessed (#85).

### 4. Saves and progression
Exercise legacy and generation-2 layouts, new campaign vs retry, persistent narrative choices, objective packages, camp/hive transformations, Black Box replacement, reconnect and Cloud restore. Fail safely rather than silently regenerating an existing world. Note from the evening log: max HP falls 5→4→2 over two deaths from fatigue — confirm that is the intended solo curve before the fix above isolates PvP from it.

### 5. Menus and controller
- Reproduce the pointer-hover focus failure (`controller-focus.spec.js:547`) and find its cause; run the complete applicable E2E suite (112 tests / 42 files), not a selection.
- **GAP-GP-11** — the Deck fired through mouse emulation (607/607 `source: pointer`, `lastInputMode: keyboard` in PvP). Confirm the active layout on device, publish the Steam Input manifest, and log the active action set at deploy.
- Controller-only packaged route: Title, Hero Select, Armory, Archives, Fab Bay, Deployment, tactical map, gameplay, death, return, extraction. Physical Deck sign-off belongs to the hardware tester. First hardware evidence: the tactical map now switches Steam Input to the menu set and back.

### 6. Repetition and unfinished promises (after 1–5)
Measure the first five minutes and the free chunks between authored landmarks across seeds; confirm where WFC layout is discarded for architectural rooms and propose the smallest deterministic connector change. Trace expedition bounty completion and `rewardBonus` to a real transaction. Check optional camp-quest variety and how irreversible ending consequences are communicated. Implement only the highest-value bounded follow-up justified by playtests. Chasm pit-falls are still killing players (evening log, first solo run).

### 7. Hygiene
Log volume (GAP-TS-04): held-fire, reticle and audio entries are ~70% of a 12-minute log — aggregate them so a 30-minute Deck capture stays readable. Missing `terminal_deny` cue (GAP-AU-01).

---

## Deliverables
A dated acceptance report; issue-linked reproductions and fixes; focused regression tests; exact pass/fail commands; performance and seed-comparison evidence; a human QA checklist; one reviewable PR. Do not broaden Steam store claims or close release gates without matching evidence.

## Progress log
- 2026-09-23 — `8da53de`: co-op transition authority (workstream 3). Evening Deck PvP log ingested; register §9 added; this plan written.
