# Steam Deck Load Time Optimization

Getting to the initial loading screen quickly is crucial for a good "out-of-box" experience on the Steam Deck. This document details the research into Steamworks best practices and the specific startup sequence optimizations implemented for Hunker Bunker.

## 1. Electron Startup Sequence (Implemented Optimization)

I have modified the Electron startup sequence in `electron/main.cjs` to defer Steamworks initialization. 

**Before:**
`initSteam()` was called synchronously at the root level of the file. Because it must query the local Steam Client via IPC, this could block Node.js from creating the initial `BrowserWindow` by several dozen or hundred milliseconds (depending on system load).

**After:**
`initSteam()` and `enableOverlay()` are now called via a 50ms `setTimeout` inside `app.whenReady()`, *after* the `BrowserWindow` has been instantiated and shown.

### Why this matters for the Steam Deck
SteamOS / Gamescope places a spinning Steam logo overlay over the game while it launches. It removes this overlay when the game maps its first native window surface and optionally provides a hint that it is ready (which Hunker Bunker's `createWindow` already does perfectly with `win.setAlwaysOnTop(true, 'screen-saver')`). 

By deferring Steam initialization, we ensure that Electron passes this "first frame" milestone immediately, getting your HTML `#loading-screen` in front of the player without any artificial delays.

## 2. Content Structuring & SteamPipe (Best Practices)
SteamPipe is the content delivery system for Steam. How you structure your game files directly impacts how quickly the game can read data from the Deck's storage (SSD or MicroSD).

* **Pack Files Efficiently:** Avoid having thousands of loose files. Group assets by level, realm, or feature into their own pack files. 
* **Optimize for SteamPipe Chunks:** SteamPipe chunks files into approximately 1MB pieces. To keep disk reads contiguous and fast:
  * Localize asset changes within specific pack files.
  * Avoid shuffling the order of assets within a pack file between updates.
  * When updating the game, consider adding *new* pack files rather than modifying existing ones if possible.

*Note for Hunker Bunker:* Our `package.json` correctly uses `asar: true` and specifically unpacks `steamworks.js`, which prevents the "portable build" issue where Electron has to extract native `.node` modules to a temporary directory on every launch.

## 3. Eliminate Launchers
> [!IMPORTANT]
> The single biggest delay in getting to the initial loading screen is often a third-party launcher.

Valve strongly discourages the use of separate game launchers for Steam Deck titles. Launchers require extra processing, often prompt for touch screen or trackpad input unnecessarily, and significantly delay the time it takes to get from pressing "Play" in SteamOS to actually seeing your game's engine load. 

*Note for Hunker Bunker:* We are booting directly into the Electron executable without an intermediate launcher script, satisfying this requirement.

## 4. Graphics API and Shaders
* **Use Vulkan:** Valve officially recommends targeting Vulkan as your primary graphics API. It provides the best performance, lowest overhead, and best battery life on SteamOS compared to running DirectX through the Proton translation layer.
* **Shader Pre-Caching:** SteamOS automatically handles shader pre-caching, downloading compiled shaders before the game launches. While this prevents in-game stutter, a poorly optimized pipeline can make these downloads large and delay the *very first* launch. Ensure your shader pipeline is optimized.

## 5. I/O and Proton Compatibility
If your game is running via Proton (the Windows compatibility layer) rather than as a native Linux build:
* **Avoid Inefficient Polling:** Ensure your game's initialization code doesn't rely on aggressive, blocking disk-polling loops or Windows-specific background services. These can translate poorly through Proton and cause significant hangs before the game window even appears.
* **MicroSD Considerations:** A large percentage of Steam Deck users run games from A2 MicroSD cards. Test your initial load sequence specifically on a MicroSD card, not just the internal NVMe SSD, to ensure your I/O requests aren't causing a bottleneck.

## 6. Development and Testing Tools
> [!TIP]
> Use the **SteamOS Devkit Client** to deploy and profile your game builds directly from your development PC to the Steam Deck.

The Devkit client allows you to monitor how the game handles resources, I/O requests, and CPU spikes during the exact initial launch phase on the target hardware.
