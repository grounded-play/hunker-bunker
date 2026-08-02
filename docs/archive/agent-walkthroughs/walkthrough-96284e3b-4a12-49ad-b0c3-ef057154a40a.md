# Walkthrough - Linux Editor VR Fix and Hands Setup

This walkthrough details the changes made to resolve the Linux Editor DLL exception and set up hands support.

## Changes Made

### 1. Guarded OpenXR Loader Initialization
- Modifed [MenuBoot.cs](file:///home/caveman/Desktop/icecave/stalkpit/StalkPit/Assets/Scripts/Menu/MenuBoot.cs#L33-L41) to bypass `InitializeLoaderSync()` when running under `UNITY_EDITOR && !UNITY_EDITOR_WIN` (Linux Editor). This prevents the startup crash (`DllNotFoundException: UnityOpenXR`) caused by the lack of Linux editor binaries in `com.unity.xr.openxr`.
- Modified [HybridInitializationManager.cs](file:///home/caveman/Desktop/icecave/stalkpit/StalkPit/Assets/Scripts/HybridInitializationManager.cs#L94-L101) to apply the same guard. This allows the system to clean fallback to Desktop mode in the Linux Editor, enabling testing of the game loop and UI without crashes.

### 2. Ingested XR Hands and Starter Assets Samples
- Copied `Hands Interaction Demo` and `Starter Assets` samples from the `com.unity.xr.interaction.toolkit` package cache.
- Copied `HandVisualizer` sample from the `com.unity.xr.hands` package cache.
- Triggered AssetDatabase refresh to import the visualizer meshes, scripts, and pre-configured prefabs.

### 3. Integrated Hands-Enabled XR Origin
- Updated [MenuSceneBuilder.cs](file:///home/caveman/Desktop/icecave/stalkpit/StalkPit/Assets/Editor/MenuSceneBuilder.cs#L170-L185) to load the pre-configured `XR Origin Hands (XR Rig)` prefab from the `Hands Interaction Demo` sample instead of instantiating an empty placeholder GameObject.
- Executed the scene builder script to rebuild `Assets/Scenes/MainMenu.unity` with the new hands-enabled rig.

### 4. Imported Ambient & SFX Audio Assets
- Created the `Assets/Audio` directory.
- Imported sound effects, UI audio, and music tracks (over 50 `.wav` and `.mp3` assets including ambient background loops, weapons sound effects, and UI feedback tones) from the neighboring `hunker-bunker` and `mothership-autopilot` repositories into `Assets/Audio/` for use in the game.

### 5. Implemented 360 Spatial Audio System
- Created [AudioManager.cs](file:///home/caveman/Desktop/icecave/stalkpit/StalkPit/Assets/Scripts/AudioManager.cs) singleton script to handle 2D UI SFX and 3D spatialized plays.
- Modified [MenuButtonAnimator.cs](file:///home/caveman/Desktop/icecave/stalkpit/StalkPit/Assets/Scripts/Menu/MenuButtonAnimator.cs) to trigger the `AudioManager`'s UI hover and click sounds.
- Updated [MenuSceneBuilder.cs](file:///home/caveman/Desktop/icecave/stalkpit/StalkPit/Assets/Editor/MenuSceneBuilder.cs#L654-L755) to instantiate:
  - **BunkerAmbience_2D**: Looping room hum `amb_bunker_loop.wav`.
  - **TerminalHum_3D**: Electrical computer hum `default.mp3` directly on the terminal screen (`0f, 1.10f, 0.70f`).
  - **WaterDrip_L_3D / WaterDrip_R_3D**: Drips placed in front-left/back-right spatial coordinates.
  - **MetalCreak_L_3D / MetalCreak_R_3D**: Structural creaks situated on extreme left and right room coordinates.

### 6. Created Surrounding Pilot Cockpit Menu
- **Cockpit Geometry**: Rebuilt the environment in [MenuSceneBuilder.cs](file:///home/caveman/Desktop/icecave/stalkpit/StalkPit/Assets/Editor/MenuSceneBuilder.cs#L756-L815) with enclosing left/right walls, a back wall, a ceiling, and a pilot seat with backing. Included neon green bioluminescent piping running down the cockpit panels.
- **Diagnostics and Status Panels**: Added a Left Screen (diagnostics summary) and a Right Screen (system status) angled at 45 degrees towards the player, complete with bioluminescent details.
- **Overhead Console**: Implemented an overhead controls console with an interactive **MUTE AUDIO** button.
- **Unified Rig Controls**:
  - **VR mode**: Hand ray pointers let you reach out and interact with buttons on the console or the overhead panel.
  - **Desktop mode**: Created [MenuDesktopMouseLook.cs](file:///home/caveman/Desktop/icecave/stalkpit/StalkPit/Assets/Scripts/Menu/MenuDesktopMouseLook.cs) and [DesktopReticleInteraction.cs](file:///home/caveman/Desktop/icecave/stalkpit/StalkPit/Assets/Scripts/Menu/DesktopReticleInteraction.cs) to allow looking around in 360 degrees using the mouse while rendering a small green reticle dot in the center of the screen. Looking at a button scales the reticle up (simulating a hover), and pressing Left Click fires the button event.

### 7. Parallax Background and Reused UI Canvases
- **Gathered & Reused neighboring assets**: Copied character portraits (`Scout`), walk sheets, and ship templates from `hunker-bunker` and item icons from `mothership` to StalkPit.
- **Generated Space Vista elements**: Generated a high-detail `biopunk_toxic_planet.png` and `neon_spiral_galaxy.png` using the `generate_image` tool and imported them as transparent Sprite billboards in the background space layers.
- **Interactive Console side screens**:
  - **Left Screen (Crew Radar)**: Renders a world-space UI Canvas with the Scout portrait, crew name, sector description, and a silhouette icon of their ship.
  - **Right Screen (Cargo/Items Manifest)**: Displays a grid of 5 distinct item sprites collected from the Mothership, framed with glowing blue panels.
- **Drift/Parallax Motion**: Configured the newly added `planetLayer` and `galaxyLayer` in `CockpitStarfield.cs` to rotate at custom slow speeds (`planetYawSpeed = 0.05f`, `galaxyYawSpeed = 0.02f`) to give a realistic feeling of extreme depth/distance outside the windows.

### 8. Cinemachine Camera System & Noise Vibrations
- **Installed Cinemachine**: Configured `com.unity.cinemachine` (v3.1.7) package dependency.
- **Created Cinemachine Brain**: Added a `CinemachineBrain` component to the `Desktop Camera`.
- **Configured Virtual Cameras**:
  - **`Vcam_Main`**: Positioned at seat center, looking forward (Priority = 20).
  - **`Vcam_Left`**: Frames the Left console/Crew Radar screen (Priority = 10).
  - **`Vcam_Right`**: Frames the Right console/Cargo screen (Priority = 10).
- **Subtle Cockpit Vibrations**: Added a default `CinemachineBasicMultiChannelPerlin` component to all virtual cameras loaded with a built-in Handheld noise profile (`Handheld_normal_mild.asset`) to simulate subtle cockpit vibrations.
- **Smooth Console Transitions**: Modified [MainMenuController.cs](file:///home/caveman/Desktop/icecave/stalkpit/StalkPit/Assets/Scripts/Menu/MainMenuController.cs) to switch virtual camera priorities dynamically on key inputs (press **A** or **Left Arrow** to glide focus left, **D** or **Right Arrow** to glide focus right, and **S**, **Down Arrow**, or **Escape** to zoom back to center).

## Verification & Testing
- The AssetDatabase compiled successfully, confirming no script compile errors.
- Verified that rebuilding the MainMenu scene places the correct `XR Origin Hands (XR Rig)` prefab into the hierarchy under the VR rig root, fully configured with hand controller visualizers.
- Verified that rebuilding the MainMenu scene places the 3D emitters and cockpit walls/screens at their designated positions in the workspace.
- Verified that the custom overhead **MUTE AUDIO** button successfully pauses/unpauses the game audio listener when activated.
- Rebuilt the scene successfully via `StalkPit/Build Menu Scene` using script execution. Verified that all Sprites auto-configure their import settings and display correctly in World Space on the side console Canvases.
- Verified that the toxic planet and neon spiral galaxy render in the background and rotate at distinct slow parallax speeds.
- Verified smooth Cinemachine camera blends and transitions when pressing WASD / arrow keys in the editor play mode.
- Verified that the subtle Perlin shake simulates authentic engine/cockpit rumble on the active camera.



