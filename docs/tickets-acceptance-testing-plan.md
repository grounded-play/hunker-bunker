# Acceptance Testing Plan: Tickets #45, #51, #52, #53, and #85

Status: maintained acceptance reference · Updated: 2026-09-23 · Evidence review: after each packaged paired run · Current evidence: [Steam Deck evening capture](reports/session-log-analysis-2026-09-23-deck-pvp-session.md)

This plan is the local checklist for release-gate evidence. It distinguishes PvP (#51) from co-op PvE (#85), performance (#52), controller-only Steam Deck acceptance (#53), and the parent ship gate (#45). #86 is log-intake support work, not a substitute for any acceptance run.

## 1. Current ticket state from the latest export

The latest reviewed capture is one 12-minute Steam Deck session from packaged `v2.4.11-beta` commit `aafe429fae34`, branch `dev/sprint-45`. It includes solo play and a Steam-lobby PvP segment, but only the Deck client log is available.

| Ticket | Local status | What the capture adds | What remains required |
| --- | --- | --- | --- |
| #45 | **Open** | Physical packaged evidence exists for one client. | Every dependent gate below, plus Cloud/save and human proof run. |
| #51 — PvP certification | **Partial, one-sided** | Lobby, ready, deploy, remote 3D readiness, inbound damage, one `pvp-rival` death, and respawn. | **P0 first:** align local four-heart code with relay/remote three-heart initialization, then obtain paired hit evidence, full result/reconnect, and all PvP rule gates. |
| #52 — performance | **Open** | Effects sampled 0–64 (final 13); p50 84.7 ms, p95 223.6 ms, p99 519.5 ms, max 4.614 s. | Current source has unit-tested render/shadow mitigations; require fixed-route packaged before/after benchmark. |
| #53 — Deck controller-only | **Open** | Package ran on physical Deck at 1280×800. | Current source adds provenance/action-set diagnostics, but controller-only attestation and route remain required. |
| #85 — two-account co-op PvE | **Open / unaffected** | None; PvP does not qualify as co-op evidence. | Paired host/guest expedition through boss and Act 2 descent. |
| #86 — log intake | Evidence added | This report documents a new capture. | Maintain readable, paired capture workflow; do not infer ticket closure. |

No checkbox may be closed from source inspection, automated tests, or a single-client log alone.

## 2. Common evidence contract

### Required metadata

Every report under `docs/reports/` must record:

- package version, commit/SHA, build time, branch, and dirty state;
- tester, account role (host/guest), platform, display mode/resolution, and controller/input setup;
- session ID, room code, route, route seed where exported, start/end time, and whether the capture is complete;
- local filename and server-upload filename/SHA for every participating client;
- a criterion-by-criterion pass, fail, or not-observed conclusion with links to event IDs/timestamps, screenshots/video, or human notes.

The captured package exports the build identity but exposes a `null` seed and no expedition-index field. Current source adds route/action-set identifiers; record the intended seed/index outside the log until a new packaged capture proves the export.

### Upload and pairing procedure

1. Package the exact candidate, then record its version/SHA before launch.
2. For multiplayer, start both clients from the same package and write down their roles and room code.
3. Near the end of the route—and immediately after a failure worth preserving—open the debug console and run `uploadlogs` on **each client**.
4. Record the two hosted filenames/SHAs. Run `npm run logs:analyze -- <host-log> <guest-log>` and inspect the raw events cited by the report.
5. `exportlogs` saves a local copy. It does not replace `uploadlogs`; retain it only as fallback evidence when an upload fails.

The analyzer's yes/no fields mean that a signal exists in that capture, not that a ticket passes. In particular, its `longTasks` field and `PERF` “Long task window” diagnostics are different signals.

## 3. Ticket #51 — two-account packaged PvP certification

### Objective

Certify a fair, observable PvP lifecycle for two real Steam accounts in a packaged build. The acceptance route must demonstrate both directions of damage and clean resolution; it must not assume that PvP uses co-op downed/crawl behavior.

### Preconditions

- Both clients run the exact recorded packaged build and are authenticated Steam accounts.
- Relay health is checked before the run; record the result in the report.
- The intended PvP HP/loadout policy is written into the report **before** testing. The current source is not certifiable yet: local vitals target four hearts while the relay and fresh remote replicas initialize at three. Align the authority contract before the test, then confirm every participant starts at the same configured maximum even when solo fatigue differs.
- Use a dedicated test room and capture the room code, player roles, chassis/loadouts, and map/ruleset.
- Both clients have `uploadlogs` available and a local `exportlogs` fallback.

### Required PvP cases

| Case | Verification target | Procedure | Pass evidence |
| --- | --- | --- | --- |
| 51-TC01 | Lobby and roster | Host a PvP room; guest joins through Steam; both ready, then guest un-readies/re-readies once. | Both logs agree on roster, ready state, room, and deploy event. |
| 51-TC02 | Remote avatar handoff | Observe the remote chassis during deploy, movement, sprint, turn, and weapon use. | Full 3D readiness timing recorded on both clients. Existing target is ≤200 ms without placeholder fallback; the latest Deck capture recorded about 678 ms fallback and therefore does not pass this case. |
| 51-TC03 | Bidirectional server verdict | A shoots B, then B shoots A under the same controlled weapon/range setup. | Each side logs shot intent, relay/server verdict, recipient health change, and attribution. A local projectile alone is insufficient. |
| 51-TC04 | HP/loadout authority and normalization | Before firing, record local player, remote replica, and relay maximum HP; repeat 51-TC03 with players intentionally carrying different solo fatigue states. | All three authorities use the same written PvP maximum. A four-heart local / three-heart relay or replica mismatch is a fail; no campaign-fatigue advantage. |
| 51-TC05 | Death, kill, and respawn | Reduce each player to zero in turn; observe the configured PvP death flow and respawn. | Both logs agree on killer/victim/reason, respawn location, health, protection timer if intended, and collision-safe placement. PvP direct death is acceptable if it is the specified mode behavior; do not require co-op crawl/downed state. |
| 51-TC06 | Spawn fairness | Immediately after each respawn, test separation, invulnerability/protection timing if designed, and collision/depenetration. | Paired position/timing evidence; no unsupported conclusion that a single death proves camping. |
| 51-TC07 | Rewards and persistence | Perform a PvP death and inspect Black Box, objective XP, season XP, polish, salvage, and save state. Repeat enough times to distinguish an intended one-off from a repeatable loop. | The observed result matches the published PvP reward rule; no accidental campaign reward leakage. |
| 51-TC08 | Leaderboard segregation | End a PvP run that would otherwise produce a score. | The report records the final server disposition and target. PvP must be excluded from or explicitly segregated from generic/PvE-run boards. |
| 51-TC09 | PvP ruleset boundaries | Inspect missions, run cards, environmental damage, doors, and other shared-world systems. | Each item is explicitly allowed, removed, or re-themed; unresolved behavior stays open rather than being assumed a defect or feature. |
| 51-TC10 | Door/event sequencing | Both players interact with the same door in a controlled sequence, including near-simultaneous use. | Paired events establish the actual sequence and final state. Change protocol only after reproduction identifies the failure mode. |
| 51-TC11 | Disconnect and result cleanup | Have host and guest separately leave/restart during an active match, then complete a normal result path. | No hang; the remaining player gets a clear outcome; reconnect/migration behavior matches mode policy; both captures record cleanup. |

### #51 closure package

- both raw hosted captures plus local fallbacks if needed;
- timestamped video/screenshots for avatar presentation and result UI;
- a table mapping 51-TC01 through 51-TC11 to evidence;
- explicit decisions for HP/fatigue, rewards, leaderboard target, PvE systems, and reconnect policy;
- a dated report. Any failed or unobserved case keeps #51 open.

## 4. Ticket #52 — packaged performance and frame pacing

### Objective

Measure and remediate a reproducible packaged performance problem. This is not a request to infer a root cause from one final telemetry snapshot.

### Benchmark contract

Before each run, document one fixed route, package, display mode, quality tier, device/GPU/driver, and timing target. Do not compare unmatched routes or devices.

The prior desktop target remains: 60 FPS nominal, p50 ≤16.6 ms, p95 ≤20 ms, p99 ≤25 ms, no more than three diagnostic windows ≥100 ms, and no unexplained >500 ms frame window over the specified route. A Deck target must explicitly declare the chosen 40 Hz or 60 Hz mode before testing. The current Deck p50 of 84.7 ms and max of 4.614 s fails either candidate frame-cap route.

### Required route and metrics

1. Capture a cold launch, staging, sector entry, combat encounter, game-over/result transition, return to menu, and a second deploy.
2. Repeat on the same package and device after the proposed remediation.
3. Report observed and retained frame-interval counts; p50/p95/p99/max; `PERF` diagnostic-window count and maximum; GPU query average/max/drops; heap; estimated GPU memory; programs/geometries/textures/chunks/effects; and the active quality profile.
4. Trace the candidate path before changing it. Current source keeps the shadow-map key stable and suspends the world-render path on game-over, but the latest capture only made those plausible targets; it does not prove their causality or package benefit.
5. Run the relevant regression suite after a confirmed code fix, then re-run the physical benchmark. Automated coverage does not pass #52 by itself.

### #52 closure package

- matched before/after package captures and settings table;
- precise instrumented cause or an honestly labelled remaining unknown;
- fixed-route metrics meeting the predeclared target;
- video or human observation for visible freezes; and
- a dated report linked from #45.

## 5. Ticket #53 — physical Steam Deck controller-only acceptance

### Objective

Certify that the packaged Steam build is usable at native 1280×800 in Gaming Mode using controller input only. A Deck controller in diagnostics, or pointer/keyboard-style synthesized events, cannot certify this on its own.

### Preconditions

- Steam Deck in Gaming Mode, native 1280×800; record LCD/OLED, SteamOS version, selected refresh cap, and official Steam Input layout.
- No mouse, keyboard, touch, or Desktop Mode assistance. Tester attests to this in the report.
- Log the active Steam Input action set at title, menu, map/pause, gameplay, death/result, and extraction/return. Verify the current source's action-set/input/route diagnostics appear in the uploaded package capture.

### Controller-only route

| Area | Route | Pass evidence |
| --- | --- | --- |
| Boot and menus | Title → main menu → settings → hero selection | Every control is reachable; focus is visible; no pointer assistance. |
| Armory and progression | Armory, loadout, cosmetics, Archives, Fab Bay | Tabs, cards, tooltips, text entry/virtual keyboard, and back paths remain accessible and legible. |
| Deployment and map | Select/deploy, tactical map open/close, pause | Expected action-set transitions recorded; no frozen/pinned controls or focus loops. |
| Core gameplay | Move, aim, fire, reload, sprint, ability, interact, scan, map, dodge | All mapped actions work at the documented layout; accepted-action provenance is available. |
| HUD and modals | Combat, prompts, death/result, extraction/return | Text/readouts are legible at handheld distance; no clipping/overlap; human screenshots/video support the judgment. |
| Lifecycle | Suspend for 30 seconds during combat, resume, exit/relaunch | Expected pause/resume, no crash/context loss/audio corruption, and a captured lifecycle event or explicit observation. |
| Sustained route | Complete the selected 15–30 minute route | Meets the declared Deck performance target; record thermals/battery only if a human measurement is available. |

### #53 closure package

- `uploadlogs` capture plus local fallback;
- tester attestation and 2–3 screenshots/video clips;
- action-set/provenance evidence and the full route matrix; and
- physical performance/lifecycle result. Missing human observations remain unverified rather than inferred from logs.

## 6. Ticket #85 — two-account packaged co-op PvE proof

This is deliberately separate from #51. The current source implementation (`8da53de`) has automated coverage for co-op boss authority and Act 2 descent propagation, but no physical paired co-op expedition evidence.

| Case | Required co-op proof |
| --- | --- |
| 85-TC01 | Host/guest Steam lobby, roster, ready/re-ready, deploy, remote avatar, and loadout agreement. |
| 85-TC02 | Both players damage a boss; host/guest agree on HP, phase, weakpoint, add spawn/cleanup, and milestone outcome. |
| 85-TC03 | Trigger Act 2 descent; logs agree on absolute seed offset, expedition index, sector identity, and spawn state. |
| 85-TC04 | Complete an expedition/return or a controlled failure; verify reconnect/failover policy and no divergent world state. |
| 85-TC05 | Upload both logs; attach a side-by-side evidence table with matching timestamps and build IDs. |

#85 stays open until all five cases have paired packaged evidence. A PvP run cannot satisfy any of them.

## 7. Parent ship gate: ticket #45

#45 may move only when its dependent evidence packages are complete:

- [ ] #51 paired packaged PvP certification, if PvP remains in scope for release.
- [ ] #52 fixed-route packaged performance acceptance on its declared target devices.
- [ ] #53 physical Deck controller-only route and lifecycle acceptance.
- [ ] #85 paired two-account co-op PvE expedition.
- [ ] two-machine Steam Cloud/save round trip, including conflict/offline handling.
- [ ] packaged desktop visual/performance acceptance and a human first-hour proof run.
- [ ] current Steam review/compliance claims, controller support claims, and Linux/SteamOS claims tied to matching evidence.

## 8. Quick reference

```bash
# Package the recorded candidate
npm run steam:package

# Run local checks before distributing it
npm run presubmit
npm test
npm run lint

# In the packaged game console, on each participating client
uploadlogs

# Optional local fallback copy
exportlogs

# Retrieve and compare the hosted logs
npm run logs:fetch -- --latest 5
npm run logs:analyze -- logs/<host-capture>.json logs/<guest-capture>.json
```

Use [the session-log review runbook](session-log-review-runbook.md) for upload, retrieval, and evidence interpretation. Raw logs remain ignored; durable conclusions belong in the dated report and this ticket matrix.
