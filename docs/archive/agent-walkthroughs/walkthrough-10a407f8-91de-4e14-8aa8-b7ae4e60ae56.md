# Walkthrough — Verbose Dev Console Telemetry (~)

Comprehensive logging and telemetry interceptors have been integrated across all Hunker Bunker subsystems. Pressing `~` in dev or production builds now displays live diagnostic telemetry for DOM clicks, hotkeys, asset/audio loading, state machine transitions, uncaught errors, network requests, and Steamworks events.

## Key Changes

### 1. Expanded Dev Console & Global Interceptors
- **[debugConsole.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/debugConsole.js)**:
  - **Category Filter Selector**: Added category dropdown (`ALL`, `INPUT`, `LOAD`, `AUDIO`, `GAME`, `STEAM`, `FETCH`, `SYS`, `UNCAUGHT`) to the dev console header bar.
  - **Click Telemetry (`[INPUT]`)**: Global capturing listener logs interactive element clicks (tag name, ID, class, button label).
  - **Hotkey Telemetry (`[INPUT]`)**: Captures non-text input keypresses (`Q`, `F`, `R`, `Space`, `Esc`, `Tab`).
  - **Uncaught Errors (`[UNCAUGHT]`)**: Registered global `window.onerror` and `unhandledrejection` handlers to record background exceptions automatically.
  - **Fetch Interceptor (`[FETCH]`)**: Intercepts HTTP/fetch requests and records method, URL, status code, and millisecond duration.
  - **Capacity Limit**: Increased max log lines limit from 1000 to 2500.
  - **Global Helper**: Exposed `window.hbLog(category, level, message, ...details)` for structured background logging from any module.

### 2. Subsystem Telemetry Integration
- **[audio.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/audio.js)**: Log WebAudio context state changes (`unlocked`, `suspended`), audio asset loading/decoding progress, soundtrack context transitions, and sfx play triggers (`[AUDIO]`).
- **[KeyedVideoSprite.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/KeyedVideoSprite.js)**: Log video sprite initialization, playback, and load errors (`[LOAD]`).
- **[spriteAtlasRuntime.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/spriteAtlasRuntime.js)**: Log sprite atlas repacking and texture grid generation (`[LOAD]`).
- **[threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js)**: Log ability triggers (`Class Ability`, `Radar Scan`, `Dash`), run resets, and engine initialization (`[GAME]`).
- **[achievements.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/achievements.js)**: Log achievement event evaluations and unlock toasts (`[ACH]`).
- **[steamVaultUi.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/steamVaultUi.js)**: Log Steam Vault modal state transitions, store catalog loading, and item interactions (`[STEAM]`).

## Verification Results

### Unit Tests
Executed unit tests:
- `src/debugConsole.test.js`: 6/6 tests passed (including new category filter and log capacity tests).
- All 14 core game & audio test suites (112 tests total) passed 100%.

```bash
✓ src/debugConsole.test.js (6 tests)
✓ src/audio.test.js (5 tests)
✓ src/achievements.test.js (12 tests)
✓ src/threeGame.campQuests.test.js (21 tests)
...
Test Files  14 passed (14)
     Tests  112 passed (112)
```
