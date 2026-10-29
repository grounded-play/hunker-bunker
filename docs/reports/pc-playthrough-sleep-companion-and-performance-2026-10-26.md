# PC playthrough: sleep, companion, commerce, and performance review

Date: 2026-10-26  
Branch reviewed: `dev/sprint-53`  
Status: four player-facing fixes implemented in source; packaged verification required  
Primary log: `logs/hunker-bunker-session-2026-10-26T05-11-11-681Z-mvostu7n-2d9u.json`

## Evidence boundary

The four 2026-10-26 server exports are progressive snapshots of one Windows
Steam session beginning at `2026-10-26T04:46:37.463Z`; they are not four
independent runs. The final export contains 3,699 records over 1,474 seconds.
The player aborted the first mission and used **TRY AGAIN**, so the session
contains two deployments in one application lifetime.

Build and environment:

- Hunker Bunker `2.4.17-beta`, Electron `44.4.4`, Windows 10 x64
- Steam active as `Deadman's Hand`; Steam Cloud available
- Engineer, solo, keyboard/mouse, 2304×1440
- No controller, remote player, PvP, reconnect, suspend/resume, or extraction

Raw hosted logs are intentionally kept out of version control according to the
session-log runbook. Reproduce the analysis with:

```bash
npm run logs:analyze -- logs/hunker-bunker-session-2026-10-26T05-11-11-681Z-mvostu7n-2d9u.json
```

## Findings and remediation

| ID | Finding | Runtime evidence and diagnosis | Source disposition |
| --- | --- | --- | --- |
| OCT26-01 | Sleeping wakes the player in the isolated Foundry, under/near the fabricator, rather than beside the bed. | First sleep: `foundry-entered` at 21:55:41.472, then `sleep-bunker` at 21:55:41.476. Second sleep: the same pair at 22:09:54.929 and 22:09:54.933. Both are four milliseconds apart. `beginCampRest()` deliberately called `enterFoundryInterior()` before opening sleep. | **Fixed in source.** Rest no longer enters the Foundry. The pre-sleep position is retained and restored on morning completion. |
| OCT26-02 | The cot placement action plays the rest/sit presentation too early; the desired order is E at the bed → rest animation → doors close → sleep video. | Cot installation directly launched `base_cot_first_night`, while the actual rest path immediately opened the video. | **Fixed in source.** Installation no longer starts the cot sequence. E-triggered rest starts `rest_recovery`; after its readable opening beat, the base doors close, the sleep video plays behind them, morning state is prepared, and the doors reopen beside the bed. |
| OCT26-03 | Engineer companion follows while seated/hovering. | Recruited `Engineer: Foxhole Shadow` at 21:51:44.057. Its GLB contains only the `sittingAngry` animation, and `wanderer3d` looped that clip during translation. Repeated repath/relocate records also occur throughout the run. | **Fixed in source.** Moving companions stop the seated action and use a lightweight procedural Mixamo-rig walk/run cycle; idle presentation resumes when movement stops. No second 10–14 MB character asset is loaded. |
| OCT26-04 | Companion gunfire has no visible bullets. | Companion basic and assist fire applied damage immediately and spawned only a muzzle flash; no projectile or tracer existed. | **Fixed in source.** Basic and assist shots now render a short-lived line-of-fire tracer without adding a second damaging projectile. |
| OCT26-05 | Packaged performance remains far outside the Sprint 53 release target. | Presented gameplay averaged 24.54 ms with p95 47.6 ms (~40.7 FPS). GPU telemetry averaged 7.85 ms but peaked at 4,359.85 ms with 2,147 dropped samples. Final estimated GPU memory was 3,879.2 MiB; timeline peak was 4,098.8 MiB GPU / 3,585.8 MiB heap. There were 5,963 long-task records, 91 sampled windows at or above 100 ms, and a 39,135 ms maximum. Initial composer compilation took about 13.1 s and the first companion/video-model fetch window about 39.4 s. | **Confirmed open.** This is not a fixed-route before/after benchmark, but it is strong regression evidence for issue #52 and the no-unexplained-stalls gate in #45. |
| OCT26-06 | The deployment loader reaches 100% and appears frozen while substantial work continues. | `prepareVisibleChunksForGameplay()` mapped only the visible-chunk fraction directly to 0–100%, then awaited lighting setup, three composer shader phases, common world models, corpse templates, kill-effect shaders, deployment validation, and the first rendered frame after the callback already reported 100%. | **Fixed in source.** Progress is now weighted across the complete transaction: world 5–52%, lighting 54%, shaders 56–74%, models 76–84%, corpse/effect preparation 84–97%, first-frame presentation 98%, and ready 100%. The bar shows its numeric value, continuously scans while a stage is active, yields before shader work, and exposes shader sub-phase completion. |

The repeated `companion-repath` / `companion-relocated` events corroborate a
path-following quality problem, but they do not alone prove every relocation
was invalid. The pose defect and missing tracer are independently confirmed by
the runtime implementation and do not depend on that inference.

## Positive route evidence

- Companion recruitment reached the live runtime.
- Steam commerce completed `purchase-start` → `purchase-awaiting_sandbox` →
  `purchase-completed` for `key_1` between 21:57:10 and 21:57:23.
- A salvage cache opened at 22:09:30 and granted 12 TECH / 8 COIN.
- A later item grant/claim completed successfully.
- Abort → game over → **TRY AGAIN** produced a second deployment in the same
  application session.

These are useful smoke checks, not economy acceptance: debug `give all` was
used, and the log does not establish clean-save balances, entitlement
persistence across restart, extraction, or a full purchase-to-use audit.

## Open issue / Sprint 53 acceptance mapping

| Issue | What this session establishes | Disposition |
| --- | --- | --- |
| #106 mobile Lighthouse | Nothing: this was packaged desktop gameplay, not the web mobile Lighthouse route. The master plan already records separate 93/93 clearance evidence. | No new evidence; issue remains administratively open. |
| #85 two-account packaged co-op | Nothing: analyzer reports solo, zero joins, zero remote avatars. | Remains open. |
| #77 Sprint 43 remediation parent | Deployment/retry and several solo systems ran, but its sole documented closure blocker is #85. | Remains open; this run cannot close the parent. |
| #51 two-account PvP | No PvP, remote player, PvP damage, round result, or reconnect. | Remains open. |
| #53 physical Deck/controller-only | Windows desktop, no controller detected, no suspend/resume. | Remains open. |
| #52 packaged GPU/frame pacing | p95 47.6 ms misses the Windows target of ≤16.7 ms; multi-second stalls and ~3.9 GiB final estimated GPU memory remain. | **Failure/regression confirmed; remains open.** |
| #45 premium-release ship gates | Provides a valuable human playthrough and confirms a release-blocking sleep-flow defect plus performance failure, but not the prescribed new-player first-hour route, Cloud round trip, co-op, Deck, or extraction. | **No checkbox closes.** “No unexplained release-blocking gameplay stalls” remains failed. |

No pull request is currently associated with `dev/sprint-53`; the branch is
ahead of `origin/dev/sprint-53`. Therefore this report maps evidence to the
branch and open issues rather than claiming PR acceptance.

## Packaged re-test

On the next Windows package containing these source changes:

1. Place the cot. Confirm placement gives build feedback only—no sit/rest
   animation or sleep transition.
2. Stand at the cot and press E. Confirm the player starts the rest animation,
   the base doors close, and only then the sleep video appears.
3. Let the video finish and repeat once with skip. Both times, close the
   morning/Foundry UI and confirm the player is beside the same cot, in the
   surface camp, with free movement.
4. Recruit Engineer: Foxhole Shadow. Observe idle, walking, and catch-up run;
   confirm it never translates in the seated pose.
5. Observe at least ten basic shots and one assist. Confirm a tracer is visible
   from companion to target and each attack applies damage only once.
6. Export a fresh log and re-run the analyzer. These functional fixes do not
   close #52; performance still requires its prescribed fixed-route benchmark.
7. During both fresh deploy and **TRY AGAIN**, confirm the percentage never
   moves backward or reaches 100 before the first rendered sector frame. The
   status should advance through WORLD, LIGHTING, SHADERS, MODELS, CORPSES,
   EFFECTS, VERIFY, PRESENT, and READY rather than sitting at 100 during work.
