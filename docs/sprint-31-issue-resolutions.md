# Sprint 31 Catch-ups: Issue Resolutions

This document outlines the resolutions and verification findings for the outstanding issues addressed before finalizing the v2.3.1-beta release, incorporating empirical packaged Steam runtime evidence from `docs/logs/log19.json`.

## Issue #50: Reduce retail payload debt and restore meaningful asset-audit guardrails

**Problem:** The `npm run steam:upload` and `npm run build` processes were failing the asset audits because the `PUBLIC_BUDGET` (retail asset payload) exceeded its strict 2700MB limit, and there were over 200 "unknown" assets (budget limit was 160).
**Solution:**
1. **Removed Orphaned Assets:** We identified and deleted several large, unused placeholder assets in the `public/` directory (e.g., `Tank.Intro.gif`, `bio-stalker.glb`), freeing up ~36MB of payload debt.
2. **Fixed Classifications:** We updated the asset categorization regex in `scripts/audit-retail-assets.js` to properly classify the new `ach_` (achievements) and `sky/` (skybox) assets as `runtime-required`. Previously, they were defaulting to `unknown`, which artificially inflated the unknown asset count.
3. **Restored Guardrails:** With the cleanup complete, we reverted the `PUBLIC_BUDGET` back down to `2700 * 1024 * 1024` and the `UNKNOWN_ASSET_BUDGET` back down to `160`.

## Issue #54: Refresh the Electron 44 dependency upgrade from current mothership

**Problem:** The `mothership` branch had advanced to a new Electron major version, but the local dependencies for the release were out of sync.
**Solution:** 
1. We bumped the `electron` version to `^44.0.0` in `package.json` and ran `npm install` to update the lockfile and download the correct native binaries for the upcoming release.
2. **Packaged Verification:** In `docs/logs/log19.json` (recorded 2026-09-02), the game ran on Windows 10 under Electron `44.1.1` (Chrome 152.0.7977.65) installed via Steam (`resources/app.asar`). Steamworks (`Deadman's Hand`, AppID 4957040), Steam Cloud synchronization, WebAudio, video cutscenes (`DoorIntro`, `class-intro-video`, `death-mission-abort`), and the entire game lifecycle executed cleanly without crash or regression.

## Issue #52: Profile and remediate packaged GPU and frame-pacing regression

**Problem:** Initial packaged profiling from Sprint 31 (`docs/logs/log18.json`) reported 1.10 GiB of GPU memory, ~39.6 average FPS, and 45 long tasks over 100 ms on an RTX 2070 SUPER.
**Status & Verification:**
1. **GPU Memory Reduction:** In `docs/logs/log19.json` on the identical hardware (RTX 2070 SUPER, Windows 10), estimated GPU memory fell from **1.10 GiB to 346.1 MB** (a 68.5% decrease), with texture memory dropping from 1.00 GiB to 329.1 MB.
2. **GPU Render Times:** GPU frame render times averaged **2.03 ms** across 1,900 samples during live gameplay/menu rendering.
3. **Long Tasks:** Tasks exceeding 100 ms dropped from 45 down to 19.
4. **Stall Root Cause Attribution:** The log identified a major **8,574 ms freeze** during sector deployment (15:17:08). This was directly attributed to synchronous fetching of 5 props from `app.asar.unpacked/dist/3d/runtime/new3ds/` (`prop_base_defense_turret.glb`, `cybersnail_dead.glb`, `bunker_junk_rare.glb`, `prop_body_human_frozen.glb`, `prop_conduit_hub.glb`) taking ~10.27s. Remediation can now target asynchronous/background pre-staging for these assets.

## Issue #51 & Co-op Certification (#45): Synchronized Steam Multiplayer and Damage Scaling

**Problem:** PvP and co-op sessions required verification of remote 3D models, damage scaling (avoiding instant one-shot kills), and squad end-state behavior.
**Status & Verification:**
1. **Two-Account Steam Co-op:** `docs/logs/log19.json` validated a live two-account Steam relay co-op session (Room `STEAM-109775244259831011`, host `BUNKER-1` Engineer and remote `RAVEN-7` Tank).
2. **Remote 3D Avatar Synchronization:** Remote Tank avatar spawned with sprite fallback and smoothly switched to a fully rendered 3D model in only **108 ms**.
3. **Damage Scaling:** Real gameplay contact damage from `mycelium_stalker` dealt 1 heart per hit (3/3 → 2/3 → 1/3 → 0/3) rather than an instant one-shot kill.
4. **Squad-Wipe Resolution:** When the local player was downed while the teammate was already down, the lack of an automated co-op run termination required manual abort. This directly prompted the fix in commit `b25f40a` (`fix(coop): end run when entire squad is downed` with `squad-wipe` death cause and test coverage).
5. **Next Step:** Keep #51 open until a dedicated two-account PvP combat match is specifically rerun.
