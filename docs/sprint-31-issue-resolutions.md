# Sprint 31 Catch-ups: Issue Resolutions

Status: historical summary with corrected performance interpretation | Owner: repository maintainers | Updated: 2026-09-08 | Review: before release acceptance

The short Log 19 session is evidence for the observed route, not full expedition, Cloud-conflict, or hardware certification. Its earlier GPU-improvement and synchronous-fetch attribution claims were corrected below after inspecting raw entry contexts. See [the corrected analysis](reports/sprint-31-coop-log19-and-performance-analysis-2026-09-02.md) and [the September 8 implementation report](reports/astra-first-implementation-2026-09-08.md) for the current scope. The earlier asset cleanup is historical: September 8 found renewed payload debt and repaired it with two texture-only derivatives.

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
1. **GPU Memory:** The final 346,149,762-byte estimate belongs to performance profile `menu`, at a 480×480 drawing buffer. Gameplay contexts in entry 476 show 1,144,131,122 bytes. A comparable gameplay reduction is not established.
2. **GPU Render Times:** The final 2.03 ms is an exponential moving average in a menu snapshot; the sample counter is 1,900. It is not a session arithmetic mean or an FPS measurement. Earlier gameplay contexts show smoothed values around 25–27 ms.
3. **Long Tasks:** Tasks exceeding 100 ms dropped from 45 down to 19.
4. **Stall Attribution Remains Open:** The 8,574 ms task begins at 62,733 ms, with no active phase and no overlapping recorded chunk span. Several roughly 10.27 s asset completions are correlated with it. The loader already uses asynchronous `loadAsync`; those elapsed durations do not prove synchronous fetch caused the stall. September 8 adds separate load-latency and clone/prepare diagnostics; a packaged CPU trace is still required before selecting a causal fix.

## Issue #51 & Co-op Certification (#45): Synchronized Steam Multiplayer and Damage Scaling

**Problem:** PvP and co-op sessions required verification of remote 3D models, damage scaling (avoiding instant one-shot kills), and squad end-state behavior.
**Status & Verification:**
1. **Two-Account Steam Co-op:** `docs/logs/log19.json` validated a live two-account Steam relay co-op session (Room `STEAM-109775244259831011`, host `BUNKER-1` Engineer and remote `RAVEN-7` Tank).
2. **Remote 3D Avatar Synchronization:** Remote Tank avatar spawned with sprite fallback and smoothly switched to a fully rendered 3D model in only **108 ms**.
3. **Damage Scaling:** Real gameplay contact damage from `mycelium_stalker` dealt 1 heart per hit (3/3 → 2/3 → 1/3 → 0/3) rather than an instant one-shot kill.
4. **Squad-Wipe Resolution:** When the local player was downed while the teammate was already down, the lack of an automated co-op run termination required manual abort. This directly prompted the fix in commit `b25f40a` (`fix(coop): end run when entire squad is downed` with `squad-wipe` death cause and test coverage).
5. **Next Step:** Keep #51 open until a dedicated two-account PvP combat match is specifically rerun.
