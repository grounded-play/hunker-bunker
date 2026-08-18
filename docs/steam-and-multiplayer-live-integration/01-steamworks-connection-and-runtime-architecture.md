# 01. Steamworks Connection & Runtime Architecture

This guide explains how **Hunker Bunker** interfaces with Steamworks natively on Desktop (Electron) and gracefully degrades in Web / Sandbox environments.

---

## 1. Core Architecture & Configuration

### App ID Configuration
- **Primary App ID**: `4957040` (Assigned in Steamworks Partner Portal)
- **Configuration Files**:
  - [`electron/steam-config.json`](file:///home/caveman/Desktop/icecave/hunker-bunker/electron/steam-config.json):
    ```json
    {
      "backendUrl": "https://steam.tuesdaycinema.club",
      "appId": 4957040,
      "authIdentity": "hunker-bunker-backend"
    }
    ```
  - **Environment Override**: Setting `HB_STEAM_APPID=4957040` overrides the App ID without rebuilding.
  - **Steam AppId Marker**: For local dev without packaging, `steam_appid.txt` containing `4957040` placed in the project root allows the Steam client to associate the running process with your developer account.

---

## 2. Boot Sequence & Native Initialization

When the desktop shell launches ([`electron/main.cjs`](file:///home/caveman/Desktop/icecave/hunker-bunker/electron/main.cjs)):

```
[Main Process Boot]
      │
      ├── Load steamworks.js native binary (via require('steamworks.js'))
      │     ├── SUCCESS ──► Call steam.init(4957040)
      │     │                 ├── Steam Client Running & App Owned ──► steamClient Active
      │     │                 └── Steam Client Offline / Not Owned ──► Safe Fallback (Dev Mode)
      │     └── FAIL ─────► Catch error, set steamClient = null, game boots cleanly
      │
      ├── Register Save Bridge (localStorage <──► userData/save.json)
      │
      └── Initialize Steam Input API (Action sets: 'menu', 'gameplay', 'archive')
```

### Key Safety Guarantees
1. **Strictly Non-Blocking**: If Steam is not running, the module is missing, or the App ID is unassigned, `steamClient` remains `null`. The game client **never crashes** and functions completely in sandbox mode.
2. **IPC Security Boundary**: The renderer window runs with `contextIsolation: true` and `nodeIntegration: false`. The main process exposes only whitelisted APIs through [`electron/preload.cjs`](file:///home/caveman/Desktop/icecave/hunker-bunker/electron/preload.cjs) via `window.electronAPI`.

---

## 3. The Save & Auto-Cloud Bridge

Hunker Bunker utilizes **Steam Auto-Cloud** to synchronize player progression, profiles, and unlocks across devices (PC, Mac, Linux, Steam Deck).

### Save Flow
1. The game renderer writes progression state to `window.localStorage` (keys prefixed with `hb_*`, such as `hb_profile_v1`, `hb_loadout_v1`, `hb_achievements_v1`, `hb_steam_vault_v1`).
2. An inline mutation observer in [`index.html`](file:///home/caveman/Desktop/icecave/hunker-bunker/index.html) notifies the preload script via `window.electronAPI.onSaveDataChanged(key, value)`.
3. The Electron main process writes the synchronized snapshot atomically to:
   - **Linux/Steam Deck**: `~/.config/Hunker Bunker/save.json`
   - **Windows**: `%APPDATA%\Hunker Bunker\save.json`
   - **macOS**: `~/Library/Application Support/Hunker Bunker/save.json`
4. When the game launches, `electron/preload.cjs` pre-populates `localStorage` from `save.json` *before* any game script runs, ensuring instantaneous load without async race conditions.

---

## 4. Steam Input API Integration

The desktop build provides native hardware-level controller support via Steam Input:

| Action Set | Supported Modes / Screens | Digital Actions | Analog Actions |
| :--- | :--- | :--- | :--- |
| **`menu`** | Title, Class Select, Armory, Dossier, Settings | `menu_up`, `menu_down`, `menu_left`, `menu_right`, `menu_confirm`, `menu_back`, `menu_tab_left`, `menu_tab_right` | `menu_pointer`, `menu_pointer_mouse` |
| **`gameplay`** | Sub-terran Expedition & Combat | `fire`, `interact`, `reload`, `ability`, `dash`, `scan`, `sprint`, `toggle_map`, `pause` | `move` (WASD/Left Stick), `camera` (Right Stick/Mouse) |
| **`archive`** | Tactical Dossier, Lore Terminals, Mini-games | `archive_confirm`, `archive_inventory`, `archive_back`, `archive_reveal` | `archive_focus` |

---

## 5. Live Runtime vs. Dev Demo Modes

| Feature Surface | Live Steam Build (`steamClient.active = true`) | Dev Demo / Sandbox Mode (`steamClient = null`) |
| :--- | :--- | :--- |
| **Player Identity** | Fetches live Steam persona name & avatar | Displays `SANDBOX OPERATOR` or custom callsign |
| **Steam Vault Inventory** | Syncs with Steam Inventory Service via backend session tickets | Populates sandbox inventory items (`sandbox_4000`, etc.) |
| **Achievements** | Native Steam popups & Steam Community profile unlocks | Stored locally in `hb_achievements_v1` with in-game notifications |
| **Leaderboards** | Posts encrypted run scores to Steamworks Leaderboards | Stored locally in `hb_leaderboards_local` |
| **Steam Overlay** | `Shift+Tab` opens Steam community overlay & web links | Opens system browser fallback |
