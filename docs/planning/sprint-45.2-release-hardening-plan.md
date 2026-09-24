# Sprint 45.2 — Release Hardening & Expedition Proof

Status: proposed evidence-backed follow-up · Owner: repository maintainers · Updated: 2026-09-23 · Review: after the next paired packaged run · Candidate branch: `dev/sprint-46` · Source baseline: `mothership` `d12b9c4`; follow-ups `8da53de`, `2d0032a`, `4da77cc`, `a5b4e84` · Package evidence baseline: `v2.4.11-beta` `aafe429fae34`

This is a follow-up plan, not a replacement for the repository's currently designated active planning document. It turns the latest hardware log into bounded acceptance work and must be revised when paired evidence arrives.

## Mission

Produce a reproducible packaged-build acceptance candidate and fix demonstrated release-critical failures without replacing the current expedition generator, invalidating campaign saves, or turning code/CI outcomes into hardware claims. Every conclusion must be labelled **implemented**, **automated**, **hardware-observed**, or **still open**.

## Evidence in hand

| Capture | Build | What it establishes | What it does not establish |
| --- | --- | --- | --- |
| 2026-09-23 morning Deck solo capture | `v2.4.9-beta` `2236934` | Earlier Deck performance baseline documented in the [morning analysis](../reports/session-log-analysis-2026-09-23-steam-deck-playthrough.md). | A matched before/after route or current-package acceptance. |
| 2026-09-23 evening Deck solo + PvP | `v2.4.11-beta` `aafe429fae34` | One physical Deck client; sampled transient effects from 0–64 (final 13); gameplay p50 84.7 ms / max 4.614 s; local Steam-lobby PvP ready/deploy, inbound damage, one death, and respawn. | Opponent-side hit receipt, match completion, co-op PvE, controller-only operation, and performance pass. See the [evening analysis](../reports/session-log-analysis-2026-09-23-deck-pvp-session.md). |

## Evidence rules

- Record package version/SHA, platform, resolution, run seed where available, intended route, session ID, room code, account role, and test outcome for every capture. The captured package exports a `null` seed and no expedition-index field; current source adds `getSessionRouteIdentifiers()` and input/route diagnostics, which the next package must verify before it is relied on.
- For multiplayer, run `uploadlogs` on **both** clients and retain the two returned filenames/SHAs. `exportlogs` is local export only and is useful as a fallback, not evidence that a server upload occurred.
- Treat a one-client event as one-client evidence. Paired logs must share build and route before comparing state.
- Performance comparisons use the same packaged route, settings, and device. A final-state average or a unit-test cap cannot erase earlier stalls.

## Workstreams, in priority order

### 1. Performance and Deck frame pacing

| Gap | Priority | Evidence | Bounded work | Acceptance evidence |
| --- | ---: | --- | --- | --- |
| `GAP-RN-10` | P0 | 84.7 ms p50, 4.614 s maximum; program/frame-render changes correlate with deploy and transition windows. | `2d0032a` keeps the shadow-map key stable after first gameplay and uses `autoUpdate` for profile changes. Treat it as a unit-tested mitigation, not a proven stall cure; retain the causal trace until the next package is measured. | Fixed-route packaged before/after capture with percentile and diagnostic-window comparison. |
| `GAP-RN-11` | P1 | Game-over remains on the gameplay profile with 28 chunks during 11 816–1,679 ms diagnostic windows. | `2d0032a`/`4da77cc` suspend the world-render path on game-over; direct show/hide paths now set the flag. The guard is unit-tested, not a package/UI-flow proof. | Capture plus instrumentation showing the transition's cost and resulting frame metrics. |
| `GAP-RN-12` | P1 | Adaptive quality reports 0.85 pixel ratio, visible-chunk radius 1, shadows and post-processing enabled. | Define a Deck tier from measured frame time, including shadow/post-processing policy and recovery behavior. | A documented tier and repeatable Deck route meeting the agreed #52/#53 target. |

Continue the existing transient-effect, geometry/texture lifecycle, scene-reset, GPU-memory, and heap audits. The evening session sampled no effect count above 64, but that is not a global performance pass.

### 2. Multiplayer correctness and PvP rules

- **Co-op implementation evidence:** `8da53de` centralizes irreversible boss beats, shared add keys, milestone-defeat propagation, and absolute Act 2 descent state. It is automated by the co-op transition test suite. It is **not hardware-verified** until a packaged host and guest complete the named acceptance route with paired logs (`GAP-MP-01`, `GAP-MP-02`, #85).
- **`GAP-PV-01` (P0):** the local client now targets four fixed hearts and excludes fatigue, but the authoritative relay and fresh remote replicas still initialize at three. Align one shared HP contract, add an authority/integration test, then test both accounts from differing solo fatigue states. Do not package-certify the current mismatch.
- **`GAP-PV-04` (P0):** current source skips client submission and server validation rejects PvP with `pvp_run_not_ranked`; keep the regression test and verify a deployed backend and packaged final disposition.
- **`GAP-PV-02` / `GAP-PV-03` (P1):** source adds a 3.0-second local spawn-protection timer and omits Black Box creation for PvP death. Exercise both repeatedly on paired clients; the log does not prove camping or a repeatable farm.
- **`GAP-PV-07` (P1):** source adds `pvp-hit-dealt` and `pvp-hit-confirmed`; a paired run must prove intent, server verdict, recipient state, and kill attribution all agree.
- **`GAP-PV-05` / `GAP-PV-06` (P2):** source bypasses PvE missions/cards in PvP and adds local door sequence/debounce handling. Verify the intended ruleset and multi-client door ordering in a package before calling either resolved.
- A Steam-lobby PvP capture never substitutes for a full two-account **co-op PvE** expedition (#85).

### 3. Saves, Cloud, and progression

Exercise legacy and generation-2 layouts, new campaign versus retry, persistent narrative choices, objective packages, camp/hive transformations, Black Box replacement, restart/reconnect, and a two-machine Steam Cloud round trip. Fail safely rather than silently regenerating an existing world. Record the before/after save identifiers and route state in the evidence report.

### 4. Controller and menus

- **`GAP-GP-13` (P1):** source now records active-action-set, requested action set, input mode, controller type, route identifiers, and accepted-action provenance. Pointer/keyboard events on a Deck still do not prove the active Steam Input layout or non-controller use; verify the new fields in a controller-only package.
- Run the controller-only packaged route: title, hero select, Armory, Archives, Fab Bay, deployment, tactical map, gameplay, death, return, extraction, and suspend/resume. No keyboard, mouse, or touch assistance; capture a tester attestation plus log/video/screenshots.
- Reproduce controller focus failures and run the complete relevant E2E suite, but keep browser results distinct from hardware sign-off.

### 5. Repetition, navigation, and hygiene

After release blockers have an evidence path, compare the first five minutes and free chunks across controlled seeds; trace bounty completion/reward transactions; verify optional camp-quest variety and irreversible-ending communication. The evening `pit-fall` and depenetration events merit reproducible navigation/collision checks. `a5b4e84` adds windowed sampling for high-frequency `WEAPON`, `RETICLE`, and `AUDIO` events (`GAP-TS-04`) plus a `terminal_deny` alias (`GAP-AU-01`); verify export readability and package audio.

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
- 2026-09-23 — source follow-ups `2d0032a`, `4da77cc`, and `a5b4e84` add unit-tested render/shadow mitigations, local spawn/Black Box/leaderboard/door/input/logging changes, PvE-card bypass, audio aliasing, and pointer-focus work. The full suite passes (441 files / 4,018 tests); that is automated evidence only.
- 2026-09-23 — **P0 follow-up found in source review:** the local PvP four-heart path is not shared with `server/relay.js` or new remote-player replicas, which still use three hearts. Align the authority contract and add an integration test before treating the PvP-health work as implemented end-to-end.
- 2026-09-23 — all current source changes remain hardware-open pending physical Deck and paired packaged runs.
