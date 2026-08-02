# Steam Deck Load Time Optimization

## Changes Implemented

I have modified the Electron startup sequence in `electron/main.cjs` to defer Steamworks initialization. 

**Before:**
`initSteam()` was called synchronously at the root level of the file. Because it must query the local Steam Client via IPC, this could block Node.js from creating the initial `BrowserWindow` by several dozen or hundred milliseconds (depending on system load).

**After:**
`initSteam()` and `enableOverlay()` are now called via a 50ms `setTimeout` inside `app.whenReady()`, *after* the `BrowserWindow` has been instantiated and shown.

### Why this matters for the Steam Deck
SteamOS / Gamescope places a spinning Steam logo overlay over the game while it launches. It removes this overlay when the game maps its first native window surface and optionally provides a hint that it is ready (which Hunker Bunker's `createWindow` already does perfectly with `win.setAlwaysOnTop(true, 'screen-saver')`). 

By deferring Steam initialization, we ensure that Electron passes this "first frame" milestone immediately, getting your HTML `#loading-screen` in front of the player without any artificial delays.

## Verification
You can test this change by running your standard dev script:
```bash
npm run electron:dev
```
Verify that:
1. The game boots up cleanly.
2. You can still unlock achievements or trigger Steam functions (this confirms the deferred `steamworks.js` initialization completed correctly).
3. The Steam Overlay still works.
