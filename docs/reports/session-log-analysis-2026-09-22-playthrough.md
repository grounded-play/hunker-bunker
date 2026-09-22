# Session Log Analysis: 2026-09-22 Playthrough Intake

**File:** `logs/hunker-bunker-session-2026-09-22T22-38-41-679Z-mud99ymc-c2sm.json`  
**Capture timestamp:** 2026-09-22T22:19:48.380Z to 2026-09-22T22:38:41.671Z (1,133.3 seconds elapsed)  
**Entry count:** 1,878 entries  
**Analyzed date:** 2026-09-22  
**Linked ticket:** [#86](https://github.com/grounded-play/hunker-bunker/issues/86) (P0 Evidence Intake) / Sprint 43 [#77](https://github.com/grounded-play/hunker-bunker/issues/77)

---

## 1. Environment & Client Identity

- **Application / Package:** HunkerBunker `v2.4.8-beta` (Electron 44.3.0, Chrome 152.0.7977.78, Windows NT 10.0 Win64)
- **Steam Integration:** Active (`greenworks` loaded, Steam Cloud enabled)
- **Steam Persona:** `Deadman's Hand` (Steam App ID: `4957040`)
- **Stage Resolution:** 2304 × 1440
- **Input Hardware:** Keyboard / Mouse (`controller=none`, 0 gamepads connected during this session)
- **Active Class:** `ENGINEER`

---

## 2. Session Flow & Lifecycle Milestones

| Timestamp (UTC) | Category | Event / Phase | Details |
|---|---|---|---|
| `22:19:48.380Z` | `BOOT` | Initialization | Electron environment booted, Steamworks initialized |
| `22:20:01.442Z` | `PHASE` | Menu -> Armory | Operator Exosuit Rig & Ballistic Bench activated |
| `22:27:24`–`22:30:21` | `MENU` | Dossier Inspections | Multiple open/close cycles of `season-pass-modal` (`input-blocked: true`) |
| `22:32:14.799Z` | `PHASE` | Armory -> Gameplay | Live deployment initiated (`solo` operation) |
| `22:32:37`–`22:36:12` | `AUDIO` | 10× `ui_error` SFX | Blocked/invalid menu interactions (`ui_error1`, `ui_error2`, `ui_error3`) |
| `22:33:53`–`22:35:50` | `GAME` | Combat & Movement | Active radar scans, dash (-0.42, 0.91), vitals updates |
| `22:35:58.272Z` | `EVENT` | `player-death` | Reason: `queens-milk-backlash`; Black Box spawned at `(-25.26, 4.88)` |
| `22:36:04.191Z` | `PHASE` | Gameplay -> Gameover | Run complete telemetry recorded |
| `22:36:23.482Z` | `PHASE` | Gameover -> Armory | Returned to Pre-Mission Armory loadout |
| `22:38:41.671Z` | `SESSION` | Log Upload | `uploadlogs` triggered via dev console to hosted log server |

---

## 3. Playthrough Correlation to Sprint 43 Backlog

| Issue / Ticket | Code System | Log Finding & Evidence Correlation |
|---|---|---|
| **#78 (P0)** Persistence Contract | `src/profile.js`, `src/seasonPass.js` | Player toggled `season-pass-modal` 13+ times across menu, deployment, and post-death. Confirms high player reliance on Tactical Dossier continuity. |
| **#80 (P1)** Fabrication Bay & 13 Recipes | `src/fabricator.js`, `src/bank.js` | Bank and fabricator state carried through gameplay loop; verified 13 static recipes in code. QA debug toggle needed for demo season testing. |
| **#81 (P1)** Hero Preview & Class Swap | `src/scoutHeroPreview.js` | Session ran on `ENGINEER`. Jitter and model loading stalls occur during dynamic 3D class preview swaps. |
| **#82 (P1)** Armory Layout & Sockets | `src/armoryUi.js`, `src/charmSockets.js` | 10 `ui_error` SFX plays during armory interaction; screenshot verifies overflowing text in active combat overclocks box. |
| **#83 (P1)** Deployment & Single Black Box | `src/blackBox.js`, `src/multiplayerLobby.js` | Single death at 22:35:58 created active Black Box at (-25.26, 4.88). Verified integration requirement: second death must destroy old world salvage marker. |
| **#84 (P0)** Steam Deck Navigation | `src/inputActions.js` | Log confirms desktop test (`controller=none`). Real physical Deck D-pad/arrow focus pass remains mandatory for release certification. |
| **#85 (P0)** Co-Op Diagnostic | `src/steamLobbyClient.js` | Session was 100% solo (`twoPlayerRoster=no`). Co-op failure requires dual-client host/guest log reproduction. |

---

## 4. Performance & Telemetry Baseline

- **Average GPU Frame Time:** 7.01 ms
- **Max GPU Frame Time:** 123.05 ms
- **Samples Captured:** 176
- **Dropped Frames:** 0
- **JavaScript Heap Memory:** 391.5 MiB
- **Long Tasks (>= 100ms):** 0
