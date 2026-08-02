# Walkthrough — Biopunk Noir Gameplay & Scene Building Fixes

We completed the implementation and validation of Phase 1 (Shared Foundation) and Phase 3 (Hunker Bunker VR) gameplay loops:

1. **Procedural Map Generator (`MapGenerator.cs`)**:
   - Seeded Depth-First Search (DFS) dungeon grid generation (9x9 chunks of 3x3x3m cells).
   - Color-coded bioluminescent rooms mapping to COMMAND (Cyan), BIOTECH (Green), PLASMA (Orange), and VOID (Purple) suits.
   - Dynamic Fog-of-War rendering that activates lights as the player navigates the corridors.

2. **Player Survival Loop (`SurvivalSystem.cs` & `SurvivalPickup.cs`)**:
   - Vitals trackers for Health and Oxygen depletion.
   - Low-O2 breathing audio cues below 30% capacity.
   - Collectable item pickups scattered dynamically in room centers (Oxygen canisters, Health kits, and Scrap).

3. **World Space UIs & Upgrades (`WristDisplay.cs` & `EnvironmentTerminal.cs`)**:
   - Diegetic wrist UI canvas updating vitals and scrap values.
   - Terminal interaction system supporting O2 refilling using collected scrap and triggering extraction back to the main menu.

4. **Game Loop Orchestrator (`GameSceneManager.cs` & `GameSceneBuilder.cs`)**:
   - Instantiates random seeds, maps player start/end slots, scatters pickups, and triggers scene fades on death or exit.

5. **Edit Mode Bug Fixes & Scene Rebuilding**:
   - **HangarDoor Edit-Mode Fix**: Safe-initialized `MaterialPropertyBlock` in `ApplyGlow()` to prevent `NullReferenceException` when set during editor build script execution.
   - **SplashSceneBuilder Playmode-Check Fix**: Wrapped `Object.DontDestroyOnLoad()` inside a playmode check to avoid exceptions during splash sequence instantiation in editor scripts.
   - **SetupMainMenuTransition Warning Light Fix**: Re-created the `DoorWarningLight` dynamically to ensure points lights have correct components.
   - Rebuilt `Splash.unity`, `MainMenu.unity`, and `SampleScene.unity` using Roslyn compilation scripts.

## Automated Security Scanner
- Checked for `SecureCoder` API port sidecar/environment configuration. The extension was not active in this terminal instance, so security scans were skipped per scanner guidelines.
