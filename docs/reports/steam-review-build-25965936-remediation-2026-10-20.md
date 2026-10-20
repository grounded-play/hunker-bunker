# Steam Build Review Failure & Remediation Report: Build 25965936

**Date:** 2026-10-20  
**Application:** Hunker Bunker (AppID: `4957040`)  
**Tested BuildID:** `25965936` (Branch: `public` / `beta`, Oct 15 @ 10:06 AM)  
**Latest Auto-Submit BuildID:** `26062229` (Branch: `beta`, Oct 19 @ 2:25 PM)  
**Current Repo Branch / Commit:** `dev/sprint-53` (`869a5c6a`)  
**Status:** Review Blocked — Requires Code Fixes, Store Metadata Updates, and Resubmission  

---

## 1. Executive Summary & Build Comparison

Valve review tested **BuildID 25965936** on October 15, 2026, which was flagged with **1 Caution** and **2 Blocking Failures**:
1. **Caution:** Steam Overlay does not appear upon pressing <kbd>Shift</kbd>+<kbd>Tab</kbd>.
2. **Failure (Metadata):** "Multiplayer" category is selected without specifying supported mode categories (Online Co-op, Online PvP).
3. **Failure (Commerce Block):** In-app purchases / Steam Wallet integration cannot be verified because the purchase approval dialog in the Steam Overlay never appeared.

### Version Comparison Table

| Dimension | Tested Version (Valve) | Current Latest Uploaded Build | Current Local Repository |
| :--- | :--- | :--- | :--- |
| **BuildID** | **`25965936`** | **`26062229`** | Pre-build (`HEAD`) |
| **Date & Time** | Oct 15, 2026 @ 10:06 AM | Oct 19, 2026 @ 2:25 PM | Oct 20, 2026 |
| **Branch** | `public` & `beta` | `beta` | `dev/sprint-53` |
| **Release Tag / Description** | `Release v2.4.17-beta-preRelease` (`v2.4.17-beta`) | Auto-Submit (`26062229`) | Sprint 53 / 54 post-release |
| **Commits Relative to Tested** | Baseline (`401e51d5`) | +18 Steam pipe builds | **+82 commits** ahead of tested build |
| **Overlay Hook State** | Broken (deferred post-ready hook) | Broken (deferred post-ready hook) | Root-cause identified in `electron/main.cjs` |
| **Public Branch State** | Set live on `public` on Oct 15 | Not promoted to `public` | Awaiting clean build and promotion |

> [!IMPORTANT]
> The `public` branch on Steam is **still set to BuildID 25965936** (the rejected build). The 18 auto-submit builds generated between Oct 15 and Oct 19 were uploaded only to the `beta` branch. To pass review, fixes must be deployed to the branch submitted for review.

---

## 2. Root Cause Analysis

### Issue 1 & Issue 3: Steam Overlay Failure & Steam Wallet Verification Block
- **Valve Report:**
  > *Caution:* The Steam Overlay doesn't appear when pressing Shift+Tab.  
  > *Failure:* Your build's review has been blocked because your game appears to have in-app purchases, but we were unable to verify their Steam Wallet integration. After selecting an item to buy, a message is shown: *"Approve the purchase in the Steam overlay to receive your keys"*, however, the Steam overlay doesn't appear to be enabled in your app.

- **Root Cause in Code (`electron/main.cjs`):**
  1. **Timing of Chromium Command-Line Switches:**  
     Electron/Chromium requires `--in-process-gpu` and `--disable-direct-composition` to be appended **before** the `app.whenReady()` lifecycle event. In `electron/main.cjs` (lines 1333–1337):
     ```javascript
     // CURRENT FLAWED IMPLEMENTATION:
     setTimeout(() => {
         initSteam();
         enableOverlay(); // <-- TOO LATE: Chromium GPU process already spawned!
         startSteamInputPolling();
     }, 50);
     ```
     Because `enableOverlay()` was deferred inside a `setTimeout` *after* window creation, Chromium had already spawned an out-of-process GPU subprocess. Steam's overlay DLL (`gameoverlayrenderer64.dll`) injects into the main executable process (`hunker-bunker.exe`), so it was completely decoupled from the rendering pipeline.
  2. **Frame Invalidation Disabled:**  
     In `enableOverlay()` line 573:
     ```javascript
     steam.electronEnableSteamOverlay(true);
     ```
     The parameter `true` sets `disableEachFrameInvalidation = true`. This suppressed `attachFrameInvalidator`, meaning Electron did not regularly invalidate frames for WebGL canvas swaps, preventing Steam's hook from drawing over DirectX/OpenGL presentation calls.
  3. **Direct Cause of Steam Wallet Block:**  
     In `server/steamStore.js`, `InitTxn/v3/` is called with `usersession: 'client'`. With `usersession=client`, Steam's client natively triggers the purchase approval modal inside the game's Steam Overlay. Because the overlay was completely non-functional, no modal appeared, leaving the reviewer stuck on the awaiting approval prompt.

---

### Issue 2: Missing Multiplayer Mode Categories
- **Valve Report:**
  > *Failure:* If your app uses the "Multiplayer" category, please also include one or more multiplayer mode categories (Online, LAN, or Local PvP/Co-op) so users know which kind(s) of multiplayer your app supports.

- **Root Cause in Steamworks Store Settings:**  
  On the Steamworks Partner store page ("Edit Store Page" -> "Basic Info" -> "Supported Features"), the top-level checkbox **Multiplayer** was checked, but neither **Online Co-op** nor **Online PvP** had their individual checkboxes ticked. Valve's automated store ingestion rejects this configuration.

---

## 3. Comprehensive Action Plan

### Step 1: Fix Steam Overlay Hook in `electron/main.cjs`
1. Move `steam.electronEnableSteamOverlay(false)` to top-level initialization before `app.whenReady()`:
   ```javascript
   // At the top of electron/main.cjs (before app.whenReady)
   if (process.platform === 'win32') {
       try {
           const steamworks = require('steamworks.js');
           steamworks.electronEnableSteamOverlay(false); // Enable frame invalidation
       } catch (err) {
           console.warn('[steam] early overlay setup failed:', err);
       }
   }
   ```
2. Ensure command-line flags are appended unconditionally before `app.whenReady()`:
   ```javascript
   if (process.platform === 'win32') {
       app.commandLine.appendSwitch('in-process-gpu');
       app.commandLine.appendSwitch('disable-direct-composition');
   }
   ```
3. Initialize `steamworks.init(STEAM_APPID)` synchronously or immediately before window creation so the Steam API client is active when the renderer loads.

---

### Step 1: Fix Steam Overlay Hook in `electron/main.cjs` (Status: Completed)
1. **Early Hook Bootstrap:**  
   In `electron/main.cjs`, `steamworks.electronEnableSteamOverlay(false)` is now called synchronously at module load time on Windows / overlay-enabled sessions *before* `app.whenReady()`:
   - Appends `--in-process-gpu` and `--disable-direct-composition` before Chromium GPU process creation.
   - Attaches `browser-window-created` listener to invalidate frames at 60Hz (`disableEachFrameInvalidation: false`).
2. **IPC Dialog Activation:**  
   Added `hb:activateSteamOverlay` and `hb:activateSteamStore` handlers in `electron/main.cjs` and exposed them via `window.electronAPI` in `electron/preload.cjs`.

---

### Step 2: Implement In-Game Overlay Fallback & Store Safeguards (Status: Completed)
1. **Window-Level Shift+Tab Listener:**  
   In `main.js`, added a global capture listener for <kbd>Shift</kbd>+<kbd>Tab</kbd> that directly invokes `window.electronAPI.activateSteamOverlay('friends')` if the OS-level hook does not capture the keystroke.
2. **Settings Steam Overlay Row:**  
   Added a dedicated `STEAM OVERLAY (SHIFT+TAB)` action row in Settings -> SESSION & DISPLAY with an `OPEN` button that triggers the Steam Overlay dialog. Full i18n support added across all 7 supported locales (`en`, `de`, `es-419`, `ja`, `pt-BR`, `ru`, `zh-CN`).
3. **Interactive Purchase Fallback:**  
   In `src/steamVaultUi.js`, when a key purchase enters `awaiting_approval` or `awaiting_sandbox`, the status indicator becomes clickable and immediately activates the Steam Overlay (or opens `confirmUrl` if provided) if the dialog is not already focused.
4. **Automated Test Coverage:**  
   - Added unit test suite `tests/steam-overlay-integration.test.js` covering Shift+Tab triggering, dialog maps, and purchase fallback behavior.
   - Added test in `src/steamStorePurchase.test.js` validating transaction metadata forwarding.
   - Verified with `npm run i18n:audit` (0 unannotated strings, 0 runtime regressions).

---

### Step 3: Update Steamworks Store Page Metadata
1. Log into [Steamworks Partner Portal](https://partner.steamgames.com) for App `4957040` (Hunker Bunker).
2. Go to **Landing Page** -> **Edit Store Page** -> **Basic Info** tab.
3. Scroll down to **Supported Features**.
4. Keep **Multiplayer** checked, and check:
   - [x] **Online Co-op** (Cooperative expedition play via Steam Lobbies & Relay)
   - [x] **Online PvP** (Tactical Net combat via Steam Lobbies & Relay)
   *(Ensure Local Multi-Player / LAN remain unchecked if not supported offline).*
5. Click **Save Changes**, then navigate to the **Publish** tab and publish store changes to review.

---

### Step 4: Verify Steam Wallet Sandbox & Production Configuration
1. Verify Steamworks Partner Microtransaction settings:
   - Ensure Web API Publisher Key has permissions for `ISteamMicroTxn`.
   - Confirm backend environment has `HB_STEAM_STORE_ENABLED=1` and `HB_STEAM_MICROTXN_ENABLED=1`.
2. Test end-to-end purchase with a real Steam account or Sandbox test account:
   - Go to Foundry / Vault -> **STORE** tab.
   - Click **BUY** on Key pack.
   - Confirm Steam Overlay appears with Steam Wallet checkout.
   - Authorize transaction; verify keys are granted and balance updates immediately.

---

### Step 5: Package, Deploy, and Promote Build for Re-Review
1. Build retail bundle:
   ```bash
   npm run build
   ```
2. Package Windows & Linux Steam executables.
3. Upload new build to Steam via SteamPipe (Auto-Submit).
4. Set the new build live on the **`public`** (or designated review) branch in Steamworks -> Builds.
5. In the resubmission note to Valve reviewers, provide clear testing instructions:
   > **Reviewer Instructions:**  
   > - **Steam Overlay:** Press <kbd>Shift</kbd>+<kbd>Tab</kbd> anywhere in-game to access friends/chat/browser.  
   > - **Multiplayer:** From the Title Menu, click **MULTIPLAYER** to open the Tactical Net console and test **Online Co-op** and **Online PvP** via Steam Lobbies.  
   > - **Steam Wallet / Microtransactions:** Open the Vault / Foundry menu -> **STORE** tab -> Click **BUY** on any Key pack. The Steam Wallet authorization modal will appear in the overlay.
