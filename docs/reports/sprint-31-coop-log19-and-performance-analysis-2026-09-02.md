# Sprint 31 Co-op Log 19 and Performance Analysis

Status: historical evidence report with corrected interpretation · Owner: repository maintainers · Updated: 2026-09-08 · Review: Sprint 31 release certification and performance audit

**September 8 correction:** The original report compared menu and gameplay measurements and over-attributed a loading stall. Corrected values and limits are recorded below. This 194-second session supports the events observed; it does not certify a full expedition, Steam Cloud conflict recovery, or sustained Deck performance. See [the follow-up implementation report](astra-first-implementation-2026-09-08.md).

## Outcome

The packaged Steam session in `docs/logs/log19.json` provides critical verification evidence across multiple open release gates:

1. **Electron 44 Packaged Smoke Acceptance (#54):** Successfully validated on Windows 10 x64 running Electron 44.1.1 (Chrome 152.0.7977.65) installed via Steam (`resources/app.asar`). Steamworks identity (`Deadman's Hand`, AppID 4957040), Steam Cloud synchronization, WebAudio, video cutscene playback (`DoorIntro`, `class-intro-video`, `death-mission-abort`), and full lifecycle (boot → title → lobby → gameplay → death → game over → main menu) functioned cleanly with zero crashes or errors.
2. **Packaged Co-op Session & Remote 3D Synchronization (#45, #51):** Local host (`BUNKER-1`, Engineer) and remote peer (`RAVEN-7`, Tank) connected via Steam relay room `STEAM-109775244259831011`. The remote Tank avatar was instantiated with a transient sprite fallback and promoted to full 3D avatar in 108 ms (`remote-avatar-3d-ready`).
3. **Enemy Damage Scaling & Downed Squad Wipe Discovery (#51, #45):** Live gameplay damage from `mycelium_stalker` cleanly removed 1 heart per hit (3/3 → 2/3 → 1/3 → 0/3) rather than causing an immediate 3-heart one-shot. When the player was downed, the inability for the co-op run to auto-terminate when both squadmates were down prompted the `b25f40a` commit implementing automatic `squad-wipe` resolution.
4. **Packaged GPU Measurements (#52):** The final 346,149,762-byte estimate and 2.03 ms smoothed GPU timing belong to a `menu` profile snapshot with a 480×480 drawing buffer. Gameplay contexts in zero-based entry 476 show 1,144,131,122 estimated bytes and GPU moving averages around 25–27 ms. These are not evidence of the previously claimed 68.5% gameplay memory reduction or 12× speedup.
5. **Release-Blocking Stall, Cause Open (#52, #45):** Entry 216 records an **8,574 ms main-thread task** starting at 62,733 ms. Its `lastPhase` is null, its active phase list is empty, and its last recorded chunk mount ends before the task. Several ~10,271 ms GLB completions are correlated; the existing `loadAsync` path means elapsed loading time alone does not prove synchronous fetch caused the freeze.

---

## Source and Baseline

- **Evidence:** `docs/logs/log19.json` (30.7 MB session log, 5,100 frames recorded).
- **Runtime:** Steam-installed packaged Electron build on Windows 10 x64, Steam AppID 4957040 (`HunkerBunker/2.3.1-beta`, Electron 44.1.1, Chrome 152.0.7977.65).
- **Hardware:** 64 logical cores, 32 GB RAM, NVIDIA GeForce RTX 2070 SUPER (Direct3D11 via ANGLE).
- **Session Duration:** 194.047 seconds (~3m 14s).
- **Mode:** Co-op (Room `STEAM-109775244259831011`, local host `BUNKER-1` Engineer vs remote peer `RAVEN-7` Tank).

---

## Timeline of Significant Events

| Session Time | Event / Category | Description & Impact |
| --- | --- | --- |
| 0.490s | `[SYS] Steamworks ACTIVE` | Steamworks linked as `Deadman's Hand` (AppID 4957040, SteamID64 76561197969321156). Cloud sync enabled. |
| 1.655s | `[AUDIO] load-complete` | Asset manifest finished loading (60/60 core assets). |
| 4.739s | `[AUDIO] Playing cutscene video` | `DoorIntro` cutscene played smoothly under Electron 44.1.1. |
| 8.632s | `[PHASE] loading -> splash` | Title screen reached cleanly (`TITLE READY`). |
| 11.997s | `[INPUT] NEW RUN` | New run initiated. |
| 35.524s | `[MULTIPLAYER] relay-join-sent` | Host joined Steam relay room `STEAM-109775244259831011`. |
| 50.050s | `[MULTIPLAYER] relay-ready` | Remote player `RAVEN-7` (Tank) joined and readied up. |
| 54.438s | `[MULTIPLAYER] relay-ready` | Local player readied up. |
| 59.855s | `[MULTIPLAYER] remote-avatar-created` | Remote Tank spawned with sprite fallback at (37, 9). |
| 59.963s | `[MULTIPLAYER] remote-avatar-3d-ready` | Remote 3D Tank model loaded and swapped in after **108 ms**. |
| **71.278s** | **`[PERF] 8,574 ms Long Task`** | **Deployment stall:** task begins at 62.733s. Several GLB completions occur nearby, but the recorded spans do not establish the cause. |
| 72.009s | `[STARTUP] READY` | Sector frame presented and control transferred to player. |
| 163.147s | `[EVENT] player-damaged` | Stalker contact: 1 damage taken (HP 2/3). |
| 164.801s | `[EVENT] player-damaged` | Stalker contact: 1 damage taken (HP 1/3). |
| 166.598s | `[EVENT] player-damaged` | Stalker contact: 1 damage taken (HP 0/3). Downed state entered. |
| 174.254s | `[EVENT] player-death` | Mission manually aborted (`reason: mission-abort`). Motivated squad-wipe fix. |
| 174.254s | `[AUDIO] Playing cutscene video` | Death cutscene `death-mission-abort` rendered without issue. |
| 179.881s | `[PHASE] gameplay -> gameover` | Run finalized with score 400. Main menu return succeeded. |

---

## Metric Comparison: Log 18 vs Log 19 (Packaged RTX 2070 SUPER)

| Metric | Log 18 (2026-08-27) | Log 19 (2026-09-02) | Delta / Assessment |
| --- | --- | --- | --- |
| **Electron Version** | 43.x | **44.1.1** | Upgraded and verified on Steam |
| **Estimated GPU Memory** | ~1.10 GiB, previously reported | **1,144,131,122 bytes in gameplay; 346,149,762 in final menu snapshot** | Match phase, scene and drawing buffer before comparing; no established improvement |
| **Texture GPU Memory** | ~1.00 GiB, previously reported | **329,078,136 bytes in final menu snapshot** | Not a gameplay comparison |
| **Geometry GPU Memory** | N/A | **11,689,482 bytes in final menu snapshot** | Menu-only context |
| **Smoothed GPU Frame Time** | 25.26 ms, previously reported | **~25–27 ms in gameplay contexts; 2.03 ms in final menu snapshot** | EMA, not session arithmetic mean or measured FPS; sample counter 1,900 is not an averaging window |
| **Tasks >= 100 ms** | 45, previously reported | **19, previously reported** | Different session exposure/workload prevents a controlled rate comparison |
| **Peak Main Thread Stall** | ~475 ms (boot), previously reported | **8,574 ms** (deployment) | Root cause remains open |
| **Remote 3D Avatar Swap** | ~26 ms | **108 ms** | Fast acceptable transient fallback |
| **Enemy Contact Damage** | N/A | **1 heart / hit** | Proportional scaling verified |

---

## Action Items for Release Gates

1. **Issue #54 (Electron 44):** Retain the observed packaged Windows smoke route as evidence. Check the issue's full acceptance criteria before closing it.
2. **Issue #52 (GPU & Frame Pacing):** Capture a packaged CPU trace through deployment and matched gameplay snapshots with resolution, profile, scene and hardware. Separate request/parse/decode latency, synchronous clone/prepare work, shader/upload work, and first render. September 8 instrumentation adds the first two categories without claiming the cause is fixed.
3. **Issue #51 (PvP Certification):** Retain the short co-op damage and remote-model observations; run the separate two-account PvP test and a full co-op expedition before claiming those gates.
4. **Issue #45 (Ship Gates):** Keep deployment-stall remediation and all unexercised acceptance paths open. Apply the corrected interpretation to release notes and status summaries before promotion.
