# Sprint 45.2 — Release Hardening & Expedition Proof

Status: proposed evidence-backed follow-up · Owner: repository maintainers · Updated: 2026-09-23 · Review: after the next paired packaged run · Candidate branch: `dev/sprint-46` · Source baseline: `mothership` `d12b9c4`, co-op follow-up `8da53de` · Package evidence baseline: `v2.4.11-beta` `aafe429fae34`

This is a follow-up plan, not a replacement for the repository's currently designated active planning document. It turns the latest hardware log into bounded acceptance work and must be revised when paired evidence arrives.

## Mission

Produce a reproducible packaged-build acceptance candidate and fix demonstrated release-critical failures without replacing the current expedition generator, invalidating campaign saves, or turning code/CI outcomes into hardware claims. Every conclusion must be labelled **implemented**, **automated**, **hardware-observed**, or **still open**.

## Evidence in hand

| Capture | Build | What it establishes | What it does not establish |
| --- | --- | --- | --- |
| 2026-09-23 morning Deck solo capture | `v2.4.9-beta` `2236934` | Earlier Deck performance baseline documented in the [morning analysis](../reports/session-log-analysis-2026-09-23-steam-deck-playthrough.md). | A matched before/after route or current-package acceptance. |
| 2026-09-23 evening Deck solo + PvP | `v2.4.11-beta` `aafe429fae34` | One physical Deck client; sampled transient effects from 0–64 (final 13); gameplay p50 84.7 ms / max 4.614 s; local Steam-lobby PvP ready/deploy, inbound damage, one death, and respawn. | Opponent-side hit receipt, match completion, co-op PvE, controller-only operation, and performance pass. See the [evening analysis](../reports/session-log-analysis-2026-09-23-deck-pvp-session.md). |

## Evidence rules

- Record package version/SHA, platform, resolution, run seed where available, intended route, session ID, room code, account role, and test outcome for every capture. Current diagnostics export a `null` seed and no expedition-index field; add the missing route metadata before claiming a repeatable benchmark.
- For multiplayer, run `uploadlogs` on **both** clients and retain the two returned filenames/SHAs. `exportlogs` is local export only and is useful as a fallback, not evidence that a server upload occurred.
- Treat a one-client event as one-client evidence. Paired logs must share build and route before comparing state.
- Performance comparisons use the same packaged route, settings, and device. A final-state average or a unit-test cap cannot erase earlier stalls.

## Workstreams, in priority order

### 1. Performance and Deck frame pacing

| Gap | Priority | Evidence | Bounded work | Acceptance evidence |
| --- | ---: | --- | --- | --- |
| `GAP-RN-10` | P0 | 84.7 ms p50, 4.614 s maximum; program/frame-render changes correlate with deploy and transition windows. | Add a causal render/asset trace around profile changes, chunk mounts, remote-avatar materials, and shader compilation; fix the measured dominant path. `shadowMap.enabled` is a candidate because it is a shader key, not a concluded cause. | Fixed-route packaged before/after capture with percentile and diagnostic-window comparison. |
| `GAP-RN-11` | P1 | Game-over remains on the gameplay profile with 28 chunks during 11 816–1,679 ms diagnostic windows. | Trace the game-over transition; suspend or lower the relevant work only if the trace confirms it is on the critical path. | Capture plus instrumentation showing the transition's cost and resulting frame metrics. |
| `GAP-RN-12` | P1 | Adaptive quality reports 0.85 pixel ratio, visible-chunk radius 1, shadows and post-processing enabled. | Define a Deck tier from measured frame time, including shadow/post-processing policy and recovery behavior. | A documented tier and repeatable Deck route meeting the agreed #52/#53 target. |

Continue the existing transient-effect, geometry/texture lifecycle, scene-reset, GPU-memory, and heap audits. The evening session sampled no effect count above 64, but that is not a global performance pass.

### 2. Multiplayer correctness and PvP rules

- **Co-op implementation evidence:** `8da53de` centralizes irreversible boss beats, shared add keys, milestone-defeat propagation, and absolute Act 2 descent state. It is automated by the co-op transition test suite. It is **not hardware-verified** until a packaged host and guest complete the named acceptance route with paired logs (`GAP-MP-01`, `GAP-MP-02`, #85).
- **`GAP-PV-01` (P0):** decide a normalized PvP health/loadout policy and exclude campaign fatigue if symmetric PvP is the product rule. Test both accounts from differing solo fatigue states.
- **`GAP-PV-04` (P0):** prevent PvP mode from posting to generic/PvE-run leaderboard targets; add a server-side regression test and record the final submission disposition.
- **`GAP-PV-02` (P1):** exercise spawn separation, protection timing, and respawn collision with both clients. The current log does not prove camping; it identifies a fairness test.
- **`GAP-PV-03` (P1):** decide Black Box/XP/polish behavior after PvP deaths and test it repeatedly. One Black Box → +50 XP sequence is an exploit risk, not repeatability proof.
- **`GAP-PV-07` (P1):** log local shot intent, server/relay verdict, recipient state change, and kill attribution so a paired run can prove both directions.
- **`GAP-PV-05` / `GAP-PV-06` (P2):** make an explicit PvP ruleset decision for PvE missions/run cards, and reproduce door event churn before choosing state/sequence changes.
- A Steam-lobby PvP capture never substitutes for a full two-account **co-op PvE** expedition (#85).

### 3. Saves, Cloud, and progression

Exercise legacy and generation-2 layouts, new campaign versus retry, persistent narrative choices, objective packages, camp/hive transformations, Black Box replacement, restart/reconnect, and a two-machine Steam Cloud round trip. Fail safely rather than silently regenerating an existing world. Record the before/after save identifiers and route state in the evidence report.

### 4. Controller and menus

- **`GAP-GP-13` (P1):** add active-action-set and accepted-action provenance to session diagnostics. Pointer/keyboard events on a Deck do not prove the active Steam Input layout or non-controller use.
- Run the controller-only packaged route: title, hero select, Armory, Archives, Fab Bay, deployment, tactical map, gameplay, death, return, extraction, and suspend/resume. No keyboard, mouse, or touch assistance; capture a tester attestation plus log/video/screenshots.
- Reproduce controller focus failures and run the complete relevant E2E suite, but keep browser results distinct from hardware sign-off.

### 5. Repetition, navigation, and hygiene

After release blockers have an evidence path, compare the first five minutes and free chunks across controlled seeds; trace bounty completion/reward transactions; verify optional camp-quest variety and irreversible-ending communication. The evening `pit-fall` and depenetration events merit reproducible navigation/collision checks. Reduce high-frequency `WEAPON`, `RETICLE`, and `AUDIO` log noise (`GAP-TS-04`) and add/alias `terminal_deny` (`GAP-AU-01`).

## Non-goals

- Do not close #45, #51, #52, #53, or #85 from source review, a unit test, or this one-sided log.
- Do not claim a performance root cause, controller-only route, or bidirectional PvP hit registration without matching evidence.
- Do not introduce a competing world generator, reset existing campaign saves, or expand the PvP ruleset beyond decisions needed to make the observed flow fair and measurable.

## Exit criteria

1. A dated report under `docs/reports/` maps each target ticket criterion to raw events, metrics, video/screenshots, or an explicit human observation.
2. The paired PvP run contains same-build client logs and proves both hit directions, result/cleanup behavior, and the final leaderboard/XP disposition.
3. The paired co-op PvE run proves boss and Act 2 state alignment separately from PvP.
4. Performance uses a controlled packaged route and reports p50/p95/p99/max, diagnostic-window count, GPU/heap/scene metrics, and the selected Deck quality tier.
5. Controller-only and Cloud/save routes have their own physical evidence. Any unmet item remains open in the master register and ticket plan.

## Deliverables and review

- Dated evidence reports linked from the [master register](../reports/master-known-gaps-and-debt-register-2026-09-23.md), with exact build/session identifiers.
- Focused fixes with regression tests where a cause is confirmed.
- Updated #45 dependency status and no ticket closure without its complete evidence package.
- Review this plan after the next paired packaged run; replace hypotheses with confirmed findings or explicitly retain them as open.

## Progress log

- 2026-09-23 — `8da53de`: co-op transition authority implementation and automated coverage; paired packaged proof still open.
- 2026-09-23 — evening Deck PvP capture ingested as one-client evidence; ticket plan and master register updated with bounded follow-ups.
- 2026-09-23 — Sprint 45.2 implementation on `dev/sprint-46`:
  - World render suspension behind `#game-over-modal` (`GAP-RN-10`, `GAP-RN-11`).
  - Sticky shadow shader key (`shadowMap.enabled = true`) on Steam Deck with `autoUpdate` toggle (`GAP-RN-10`).
  - Fair PvP suite (`GAP-PV-01` to `GAP-PV-07`): symmetric 4 hearts ignoring fatigue, 3.0s spawn protection, Black Box farm suppression, client/server leaderboard blocks, monotonic 400ms debounced blast door sequencing, and outgoing hit telemetry.
  - PvE mission and modifier bypass in PvP (`GAP-PV-05`).
  - Controller trigger fire provenance (`source: 'controller'`), `shot-accepted` provenance, active action set logging on deploy and mode change, and input diagnostics (`GAP-GP-13`).
  - High-frequency telemetry windowed sampling via `sessionLogSampler.js` (`GAP-TS-04`).
  - Audio alias for `terminal_deny` (`GAP-AU-01`).
  - Pointer hover focus race condition fix in `main.js` controller navigation.
  - Verification: 441/441 test files (4,018 tests) passing; Playwright E2E focus and Steam Input tests passing. Hardware verification remains open pending physical Deck runs.
