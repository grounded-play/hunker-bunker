# Sprint 31 Co-op Log 19 and Performance Analysis

Status: evidence report · Owner: repository maintainers · Updated: 2026-09-02 · Review: Sprint 31 release certification and performance audit

## Outcome

The packaged Steam session in `docs/logs/log19.json` provides critical verification evidence across multiple open release gates:

1. **Electron 44 Packaged Smoke Acceptance (#54):** Successfully validated on Windows 10 x64 running Electron 44.1.1 (Chrome 152.0.7977.65) installed via Steam (`resources/app.asar`). Steamworks identity (`Deadman's Hand`, AppID 4957040), Steam Cloud synchronization, WebAudio, video cutscene playback (`DoorIntro`, `class-intro-video`, `death-mission-abort`), and full lifecycle (boot → title → lobby → gameplay → death → game over → main menu) functioned cleanly with zero crashes or errors.
2. **Packaged Co-op Session & Remote 3D Synchronization (#45, #51):** Local host (`BUNKER-1`, Engineer) and remote peer (`RAVEN-7`, Tank) connected via Steam relay room `STEAM-109775244259831011`. The remote Tank avatar was instantiated with a transient sprite fallback and promoted to full 3D avatar in 108 ms (`remote-avatar-3d-ready`).
3. **Enemy Damage Scaling & Downed Squad Wipe Discovery (#51, #45):** Live gameplay damage from `mycelium_stalker` cleanly removed 1 heart per hit (3/3 → 2/3 → 1/3 → 0/3) rather than causing an immediate 3-heart one-shot. When the player was downed, the inability for the co-op run to auto-terminate when both squadmates were down prompted the `b25f40a` commit implementing automatic `squad-wipe` resolution.
4. **Packaged GPU Memory & Performance Profiling (#52):** Estimated GPU memory dropped substantially from ~1.10 GiB in log 18 down to **346.1 MB** (11.7 MB geometry, 329.1 MB textures). GPU render times averaged 2.03 ms over 1,900 samples. 
5. **Release-Blocking Stall Attribution (#52, #45):** The session identified and attributed an **8,574 ms main-thread freeze** during sector deployment (15:17:08) directly to the synchronous loading/fetching of five `.glb` models from `app.asar.unpacked/dist/3d/runtime/new3ds/` (`prop_base_defense_turret.glb`, `cybersnail_dead.glb`, `bunker_junk_rare.glb`, `prop_body_human_frozen.glb`, `prop_conduit_hub.glb`) which took ~10,271 ms to load.

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
| **71.271s** | **`[PERF] 8,574 ms Long Task`** | **Deployment stall:** 5 `.glb` props fetched from `new3ds/` (took 10,271 ms fetch time), locking the main thread for 8.57 seconds. |
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
| **Estimated GPU Memory** | ~1.10 GiB | **346.1 MB** | **-754 MB (-68.5%)** — massive improvement |
| **Texture GPU Memory** | ~1.00 GiB | **329.1 MB** | **-670 MB** reduction |
| **Geometry GPU Memory** | N/A | **11.7 MB** | Slim geometry footprint |
| **Average GPU Frame Time** | 25.26 ms (~39.6 FPS) | **2.03 ms** | **~12x faster** GPU render passes |
| **Tasks >= 100 ms** | 45 | **19** | **-57.8%** reduction |
| **Peak Main Thread Stall** | ~475 ms (boot) | **8,574 ms** (chunk staging) | Identified new blocker: sync `.glb` fetch |
| **Remote 3D Avatar Swap** | ~26 ms | **108 ms** | Fast acceptable transient fallback |
| **Enemy Contact Damage** | N/A | **1 heart / hit** | Proportional scaling verified |

---

## Action Items for Release Gates

1. **Issue #54 (Electron 44):** Mark fully verified in packaged Steam Windows 10 runtime and close issue.
2. **Issue #52 (GPU & Frame Pacing):** Record memory reduction (346 MB) and fast frame rendering (2.03 ms), and add high-priority remediation for the 8.57s synchronous `.glb` fetch during initial chunk staging in `prop_base_defense_turret.glb`, `cybersnail_dead.glb`, `bunker_junk_rare.glb`, `prop_body_human_frozen.glb`, and `prop_conduit_hub.glb`.
3. **Issue #51 (PvP Certification):** Note that Log 19 certified two-account Co-op, damage scaling (1 HP/hit), and remote Tank 3D models, but keep #51 open for a dedicated 2-account PvP match.
4. **Issue #45 (Ship Gates):** Update checkmarks for Electron 44 packaged acceptance and record attribution for the multi-second deployment freeze.
