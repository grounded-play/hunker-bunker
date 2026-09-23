# Session Log Analysis: Steam Deck Solo + One-Sided PvP Capture, 2026-09-23 (evening)

Status: evidence report · Updated: 2026-09-23 · Feeds: [master gaps register](master-known-gaps-and-debt-register-2026-09-23.md) §9, the [ticket acceptance plan](../tickets-acceptance-testing-plan.md), and the [Sprint 45.2 follow-up](../planning/sprint-45.2-release-hardening-plan.md)

## Provenance and evidence boundary

| Field | Value |
| --- | --- |
| Log | `logs/hunker-bunker-session-2026-09-23T21-41-56-139Z-muemotn6-gfn2.json` |
| Capture | 2026-09-23 21:29:47Z → 21:41:56Z (728.447 s, 3,726 entries, 0 dropped) |
| Packaged build | `v2.4.11-beta`, commit `aafe429fae34`, branch `dev/sprint-45`, clean, built 2026-09-23 21:11:59Z, Steam install (`app.asar`) |
| Runtime | Electron 44.4.4, Chrome 152 |
| Hardware | Steam Deck (AMD Custom GPU 0405, radeonsi/ACO via ANGLE-GL), 16 GB, stage 1280×800, drawing buffer 1086×678 (pixel ratio 0.85) |
| Steam | active; AppID 4957040; Cloud enabled for app and account; backend auth configured |
| Route | Solo deploy → `pit-fall` death → second solo run and mission abort → Armory → PvP room `STEAM-109775242580143121` against `AGENT` (TANK) → export |

The diagnostics seed is `null`; no expedition-index field is exported. Event-scoped run identifiers exist, but they are not enough to reconstruct a controlled benchmark route. The reviewed material contains **one client capture only**. It can prove what occurred on that Deck client, not the rival's health, damage receipt, death, input device, or final match state.

Throughout this report, **observed** means an event or final diagnostic in this capture; **traced** means a relevant source path was inspected; and **hypothesis** is a follow-up to test rather than a concluded cause.

## 1. Performance — capture fails the release-performance gate

The final gameplay interval history reports 4,706 observed intervals, of which the 3,600-entry retained ring buffer produced these percentiles (1,106 older intervals were overwritten):

| Profile | Observed / retained intervals | p50 | p95 | p99 | Max |
| --- | ---: | ---: | ---: | ---: | ---: |
| gameplay | 4,706 / 3,600 | **84.7 ms** | 223.6 ms | 519.5 ms | **4,613.7 ms** |

Final GPU telemetry is 18.77 ms average and 56.32 ms maximum across 1,772 samples, with 18 dropped GPU queries/frames. Estimated GPU memory is 1,416.7 MiB; final heap is 239 MB; final scene counts are 1,946 geometries, 338 textures, 434 programs, and 16 chunks. Those final values do not erase the recorded stalls or establish a memory-leak conclusion.

- **Observed:** 428 `PERF` diagnostic windows are labelled “Long task window”; 331 are at least 100 ms, 35 at least 500 ms, 25 at least 700 ms, and 16 at least 1,000 ms (largest 2,655 ms). The analyzer separately reports `longTasks=0`, so these are diagnostic windows, not an asserted browser Long Task trace.
- **Observed:** transient-effect snapshots range from 0 to 64, never above 64 in the 428 `PERF` snapshots; the final snapshot is 13. This is evidence that the sampled session did not exceed the existing 64-effect ceiling, not proof that effects stayed at 13 or that the cap alone resolves performance.
- **Observed association, not cause:** program counts and frame-render windows rise around deploy/transition periods. `shadowMap.enabled` is a shader-cache key in `threeGame.js`, so profile switching and newly introduced materials are reasonable trace targets, but this capture does not prove a shader-compilation root cause.
- **Observed association, not cause:** during game-over, the profile remains `gameplay` with 28 chunks while 11 diagnostic windows record 816–1,679 ms over roughly 34 seconds. Trace whether the world continues to render under that state and whether the profile should change; do not treat this log as proof of the exact rendering work.
- **Observed:** adaptive gameplay quality reports pixel ratio 0.85, visible-chunk radius 1, shadows enabled, and post-processing enabled. The correct Deck tier remains a measurement and product decision.

**Ticket result:** no performance ticket closes from this capture. The effect ceiling has sampled hardware evidence; frame pacing does not meet release acceptance. See `GAP-RN-10` through `GAP-RN-12` in the register.

## 2. PvP — one incoming-damage lifecycle is proven

The Deck joined a Steam PvP room, completed ready/deploy, created a remote avatar, received inbound `pvp-rival` damage, died once, and respawned. The remote avatar used a sprite fallback before 3D readiness for about 678 ms; that misses the existing #51 target of a sub-200 ms full-3D handoff without placeholder fallback.

| ID | Finding | Evidence in this capture | Evidence state / next test |
| --- | --- | --- | --- |
| P1 | Campaign fatigue affects the local PvP maximum HP. | The local player moved from 5/5 to 4/4 after the first solo death and entered PvP at 2/2 after the mission-abort run. `composeFatigueIntoLoadoutMods` and `fatigueMaxHealthPenalty` are applied without a PvP exclusion. | observed + traced; decide and test a normalized/symmetric PvP HP rule (`GAP-PV-01`). Rival HP is not known. |
| P2 | One PvP death and respawn occurred at/near the local spawn flow. | Two inbound hits reduced the Deck from 2/2 to 0/2 177 ms apart; one `player-death` has reason `pvp-rival`. Respawn starts at (9, 3), then a relocation/depenetration event is recorded. | observed; this does **not** prove spawn camping or absence of protection. Run a paired spawn/protection test (`GAP-PV-02`). |
| P3 | A PvP death can lead to local Black Box recovery and objective XP. | The Deck recovered a Black Box about 8 seconds after respawn and then received +50 objective XP. `handleDeath` has no PvP guard for that flow. | observed + traced; one occurrence is an exploit risk, not proof of a repeatable farm (`GAP-PV-03`). |
| P4 | A PvP score was accepted by a generic run leaderboard submission path. | The capture records PvP mode, score 400, and `leaderboard payload accepted`. The client/server target builders do not filter on multiplayer mode. | observed + traced; block generic/PvE-run leaderboard contamination (`GAP-PV-04`). |
| P5 | PvE-shaped systems remain active in PvP. | A mapping objective and `camp_paranoia` run cards appear during the PvP segment. | observed; decide whether this is intentional ruleset design (`GAP-PV-05`). |
| P6 | Door-state event churn needs a paired reproduction. | Ten `bunker-door-toggled` events occur in 19 seconds, including repeated remote event traffic. | observed; one client cannot attribute player actions or prove a ping-pong cause. Test absolute state/sequence handling (`GAP-PV-06`). |
| P7 | Outgoing hit confirmation is not present in this capture. | The PvP segment has 117 fire attempts: 21 accepted shot/projectile events and 96 blocked attempts. There is no locally logged relay verdict or rival health change; `rivalKills` is 0. | observed instrumentation gap; paired capture plus `pvp-hit-dealt`/`pvp-hit-confirmed` telemetry required (`GAP-PV-07`). |

The tester's account that shots landed is valuable playtest context, but it is not independently verified by this one-sided log. The capture proves incoming damage to the Deck, not bidirectional damage, remote kill credit, or a completed PvP match.

## 3. Controller/input evidence

- Across the whole capture, all 607 `fire-input` events are `source: pointer`; 117 belong to the PvP segment. The final `lastInputMode` is `keyboard`.
- A physical Steam Deck controller is present in diagnostics, but those facts do **not** prove the tester used mouse emulation, that the Steam Input manifest was inactive, or that no other input was used. Steam Input can synthesize keyboard/mouse events.
- The follow-up is an instrumentation and procedure gap: record the active Steam Input action set at deploy, record input provenance per accepted action, verify the chosen Deck layout on the device, and run the controller-only route with no alternate input (`GAP-GP-13`).
- `WEAPON` (1,321), `RETICLE` (445), and `AUDIO` (882) entries total 2,648 / 3,726 entries (71.1%). Aggregate high-frequency diagnostics so long acceptance captures remain reviewable (`GAP-TS-04`).

## 4. Other observations

- The first solo run ended in `pit-fall`; this is evidence for the existing pit-fall/navigation backlog, not a proof that the route was a chasm.
- `terminal_deny` is missing three times (`GAP-AU-01`).
- Two depenetration warnings occur near a broken prop in the solo route; another accompanies the PvP respawn flow. Reproduce before declaring a collision regression.
- There are no error-level log entries and no dropped entries. The capture does not contain lifecycle evidence sufficient to pass suspend/resume.

## 5. What this capture does not establish

This evidence must not be used to close the following requirements:

- opponent-side health, hit receipt, death, kill attribution, avatar presentation, or final match result;
- PvP reconnect, clean match completion/extraction, host migration, or a two-client state comparison;
- a full two-account **co-op PvE** expedition, including boss/Act 2 sync;
- controller-only operation, active Steam Input layout, readability, thermals, or suspend/resume;
- a fixed-route performance pass, a causal stall diagnosis, or a memory-leak verdict;
- Steam Cloud/save round trip.

## 6. Ticket status update

| Ticket / gap | Updated local status from this capture |
| --- | --- |
| #45 | **Open.** Parent release gate; no dependent acceptance gate passes here. |
| #51 / PvP certification | **Partial, one-sided.** Lobby/ready/deploy, remote 3D readiness, inbound damage, one death, and respawn are observed. The fallback timing, fatigue/HP, Black Box/XP, leaderboard, spawn, door, outbound telemetry, reconnect, and paired-evidence gates remain open. |
| #52 / performance | **Open.** Sampled effect count never exceeded 64, but p50 is 84.7 ms and max is 4.614 s. The capture is not a matched benchmark or causal diagnosis. |
| #53 / Deck controller-only | **Open.** This is a physical Deck package capture, but pointer/keyboard event provenance cannot certify a controller-only route. |
| #85 / two-account co-op proof | **Open and unaffected.** This was PvP and only one client capture is available; it is not co-op PvE acceptance. |
| #86 / log intake | Additional evidence ingested. This report does not alter the ticket's prior intake status. |

New and updated local gaps are registered in §9 of the [master register](master-known-gaps-and-debt-register-2026-09-23.md). The executable protocol is in the [acceptance plan](../tickets-acceptance-testing-plan.md).
