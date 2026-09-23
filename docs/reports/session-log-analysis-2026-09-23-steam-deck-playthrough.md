# Session Log Analysis & Steam Deck Playthrough Intake: 2026-09-23

**Log File:** `logs/hunker-bunker-session-2026-09-23T07-01-39-493Z-mudr8s7p-bect.json`  
**Capture Timestamp:** 2026-09-23T06:27:04.224Z to 2026-09-23T07:01:39.427Z (2,075.2 seconds / 34.5 minutes elapsed)  
**Total Log Entries:** 9,986 entries  
**Analyzed Date:** 2026-09-23  
**Target Platform:** Steam Deck (Valve Neptune / SteamOS Linux)  
**Host Build:** HunkerBunker `v2.4.9-beta` (`commit: 22369342f38e`, Electron 44.3.0, Chrome 152.0.7977.78)  

---

## 1. Executive Summary & Telemetry Overview

During a full 34.5-minute playthrough on the physical Steam Deck, the user encountered 6 specific issues across gameplay, input, world generation, and engine performance:

1. **Near-Player Survivor Camp is Invisible:** Camp audio loops (`amb_camp_rain_loop`, `camp_fire_loop`) played loudly within 20m of the player, but neither camp NPCs nor props appeared.
2. **Steam Deck Controls Glitching & Missing Secondary Attack:** Pressing Start (Menu) and Map (View / D-pad Up / RB) glitched between menus and gameplay; over 100 `ui_error` sounds fired; no secondary fire or attack is mapped on Steam Deck.
3. **Inability to Reach Camps/Hives, No Dynamic Bridge Building & Stuck After 3rd Boss:** Player repeatedly died to `pit-fall` in canyon chasms, expected to be able to build bridges over chasms, and got completely stuck with no extraction waypoint or objective guidance after slaying Boss 3 (Sporesnail).
4. **Repetitive Map Topology & Invisible Room Obstacles:** Starting room in Chunk (0,0) and the surrounding Chebyshev 1-ring (`isInTutorialRing`) generate identical layouts every run; invisible collision hulls block the player in open rooms.
5. **Severe Gameplay Lag / CPU Hitching Near Ship (Main Thread Freeze at 60 FPS Compositor):** JS heap surged to **853 MiB**, `transientEffects` climbed to **3,277 active effects**, `uniqueMaterials` hit **6,363**, and frame intervals degraded to an average of **113.8 ms (~8.8 FPS)** with spikes up to **7.4 seconds**.
6. **Steam Deck FPS Counter Stays at 60 FPS:** Clarification on SteamOS Gamescope Performance Overlay vs. internal game loop frame pacing.

### Core Metrics Table

| Metric | Measured Session Value | Baseline / Expected Range | Status / Diagnosis |
|---|---|---|---|
| **Compositor Display FPS** | 60 FPS constant | 60 FPS | Managed by SteamOS Gamescope |
| **JS Frame Interval (p50)** | 77.6 ms (~12.8 FPS) | 16.6 ms (60 FPS) | **CRITICAL: Engine CPU Stalling** |
| **JS Frame Interval (p95)** | 297.2 ms (~3.3 FPS) | < 33.3 ms | **CRITICAL: Severe Hitching** |
| **Max Frame Hitch** | 7,438 ms (7.44 s) | < 50 ms | **P0 Freeze during combat/clearing** |
| **Active Transient Effects** | **3,277** | < 48 | **P0 Leak / Uncapped Accumulation** |
| **Unique Materials** | **6,363** | < 150 | **P0 Memory Bloat (No Material Reuse)** |
| **Unique Geometries** | **4,346** | < 300 | **P0 Geometry Reallocation Per Frame** |
| **GPU Frame Time (EMA)** | 0.4 ms – 21.0 ms | < 14 ms | GPU has head-room; CPU is the bottleneck |
| **Controller Type** | `SteamDeckController` | `SteamDeckController` | Identified properly |

---

## 2. Issue-by-Issue Log Evidence & Root Cause Analysis

### Issue 1: Invisible Camp Near the Player
- **Log Evidence:**
  - `23:29:20.033Z`: `play amb_camp_rain_loop` (bus: world)
  - `23:29:20.072Z`: `play camp_fire_loop` (bus: world)
  - `23:29:20.077Z`: `play camp_fire_loop`
  - In `src/camp.js` lines 1171-1182, `camp_fire_loop` volume is modulated between `dist <= 2.0` (maxVol) and `dist < 20.0`. The player was inside the 20-meter perimeter of the camp, heard the crackling fire, but saw empty terrain.
- **Root Cause in Code:**
  1. **Visibility Property Mismatch:** In [src/threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L6170):
     ```javascript
     root.visible = owner ? Boolean(owner.isVisible) : source.visible;
     ...
     source.userData.world3dDesiredVisible = source.visible;
     source.userData.replacedBy3d = true;
     source.visible = false;
     ```
     When `ensureAct2Camps()` registers 3D models for camp leaders and props via `setupWorld3dReplacement(camp.npcSprite, modelType, { owner: camp, ownerKey: 'npc3d' })`, it checks `owner.isVisible`. In [src/camp.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/camp.js#L1150), `SurvivorCamp` defines `get isRevealed()`, but does **NOT** define `isVisible`! `camp.isVisible` is `undefined`, so `Boolean(owner.isVisible)` evaluates to `false`. Line 6176 then sets `source.visible = false`. As a result, **both the 2D billboard sprite and the 3D GLB model are made invisible**.
  2. **Initial Terrain Ground Anchoring:** When camps are constructed at `(x, z)` before the underlying terrain chunk heightmap is completely mounted, `sampleTerrainHeight` returns `{ height: 0, anchored: false }`. If the procedural terrain is elevated, the camp sits buried below the visual mesh until `reanchorUnanchoredCamps` executes.

### Issue 2: Steam Deck Controls Wonky (Start & Map Glitching, No Secondary Attack)
- **Log Evidence:**
  - `23:27:04.824Z`: `Steam Input state changed: controllerCount: 1, primaryControllerType: "SteamDeckController"`
  - Over 100 occurrences of `ui_error` audio triggers (`ui_error1`, `ui_error2`, `ui_error3`) across the session.
  - Repeated switches between `gameplay` and `menu` phases when pressing Start or Map.
- **Root Cause in Code:**
  1. **Dual Polling Loop Conflict for Tactical Map:**
     When `toggleTacticalMapModal()` is invoked (via Start, View, or D-pad Up), it initiates an independent requestAnimationFrame loop in [main.js:11340-11351](file:///home/caveman/Desktop/icecave/hunker-bunker/main.js#L11340) running `pollTacticalMapGamepadInput()`. Simultaneously, the main loop in [main.js:2307](file:///home/caveman/Desktop/icecave/hunker-bunker/main.js#L2307) continues polling `pollGamepads()`. Because `toggleTacticalMapModal` does not notify Steam Input to switch the active action set from `gameplay` to `menu`, both systems read the same physical button presses. Pressing Start or Map triggers both closing and reopening in the same tick.
  2. **Start / Pause Button Handler Glitch:**
     [main.js:1771](file:///home/caveman/Desktop/icecave/hunker-bunker/main.js#L1771) (`triggerControllerPauseAction`) falls back to `document.querySelector('.open-settings-btn')?.click()`. If the settings popup is opened without synchronizing modal focus and disabling gameplay inputs, inputs leak through, producing repeated `ui_error` sounds.
  3. **No Secondary Attack Mapped on Controller:**
     In [scripts/build-steam-input-configs.js:201-227](file:///home/caveman/Desktop/icecave/hunker-bunker/scripts/build-steam-input-configs.js#L201), the Steam Deck controller configuration maps:
     - Left Trigger (LT): `sprint`
     - Right Trigger (RT): `fire`
     - Face Y: `ability` (Melee / Smash)
     - Left Bumper (LB): `scan`
     - Right Bumper (RB): `toggle_map`
     There is no `secondary_fire` or `secondary_attack` action in the action manifest. On mouse/keyboard, right click was solely used for camera orbit (`event.button === 2`), leaving no secondary weapon attack on Steam Deck.

### Issue 3: Unable to Reach Camps/Hives, Bridge Building Confusion & Stuck After 3rd Boss
- **Log Evidence:**
  - Multiple black box death records: `Cause: pit-fall` into canyon chasms.
  - Slaying Boss 1 (Cybersnail) at `23:39:47Z`, Boss 2 (Cryosnail) at `23:52:02Z`, and Boss 3 (Sporesnail) at `23:53:46Z`.
  - Final State: `snailsKilled: 6, missionStatus: "objective_complete", missionLabel: "CONTAINMENT: CLEAR SIX HOSTILES"`.
- **Root Cause in Code:**
  1. **No Dynamic Bridge Building System:**
     Chasms display inspect badges stating `CHASM // GLACIAL CANYON CHASM EDGE // SUB-LEVEL VOID // FALL HAZARD` ([src/threeGame.js:11029](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L11029)). Because players construct base turrets and modules at the ship fabricator, players logically assumed bridges can be constructed across chasms. In reality, bridges are purely static room features generated during world creation by [src/verticalWfc.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/verticalWfc.js) (`applyVerticalBridgeFeature`). If a procedural canyon cuts between rings without an authored WFC bridge tile, that passage is permanently impassable.
  2. **Missing Post-Boss Objective / Extraction Flow:**
     In [src/threeGame.js:27610-27625](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L27610), there are only 3 milestone bosses (`boss_cybersnail`, `boss_cryosnail`, `boss_sporesnail`). Once all three are defeated, `killedBosses.size === 3`, but no extraction beacon, bunker evacuation route, or return prompt is displayed. The player is left wandering in bio-caves with no indication of what to do next.

### Issue 4: Map Layout Repetition & Invisible Room Colliders
- **Log Evidence:**
  - Seed: `expedition-86397316`, Active Biome: `BIO SECTOR`, Depth Tier: 1.
- **Root Cause in Code:**
  1. **Hardcoded Crash Site & Tutorial Ring:**
     - In [src/threeGame.js:35221-35257](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L35221) (`clearSpawnArea`), Chunk (0,0) is hardcoded to a fixed rectangle `{ left: 2, right: 16, top: 4, bottom: 17 }` with a single centered north door.
     - In [src/threeGame.js:34919](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L34919) (`isInTutorialRing`), all 8 surrounding chunks (`Math.max(|x|, |y|) === 1`) are forced to use the restricted "tutorial-flagged" tile subset. As a result, the entire opening quadrant is structurally identical across all runs.
  2. **Invisible Collision Hulls for Replaced 3D Props:**
     In [src/threeGame.js:32946](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L32946) (`canOccupyPosition`):
     ```javascript
     if (prop.visible === false && !prop.userData.replacedBy3d) continue;
     ```
     When a scatter prop is replaced by a 3D model, `prop.userData.replacedBy3d` is set to `true`. If the 3D model fails to load, is culled, or has visibility disabled (such as during the camp leader / prop bug above), `prop` still blocks player movement via `isSolidProp`. The player bumps into an invisible collider in an apparently empty space.

### Issue 5: Severe Lag / CPU Stall Near Ship (3,277 Transient Effects & 6,363 Materials)
- **Log Evidence:**
  - Transient effects climbed exponentially:
    - `23:27:16Z` (Boot): 0 effects
    - `23:32:54Z` (Mid-run): 28 effects
    - `23:39:31Z` (Boss 1): 537 effects
    - `23:57:34Z` (Boss 3): 1,762 effects
    - `23:58:20Z` (Clearing near ship): **3,277 effects, 4,346 geometries, 6,363 unique materials, 853 MiB heap**.
  - Frame interval reached `averageMs: 113.8 ms` (~8.8 FPS), with `p95: 297 ms` and `max: 7,438 ms`.
  - Meanwhile, GPU frame time remained low at `latestMs: 19.7 ms`, proving this is a **JavaScript CPU thread bottleneck**, not a GPU fillrate issue.
- **Root Cause in Code:**
  1. **Uncapped Transient Effect Accumulation:**
     Wall destruction (`destroyWall` -> `spawnPhysicalBurst`, `spawnTextureBurstEffect`), projectile impacts, snail trails (`spawnVisualSnailTrail`), and damage floating text (`spawnDamageNumber`) push into `this.transientEffects` without an overall pool cap.
  2. **Per-Frame Traversal of 3,000+ Objects:**
     In [src/threeGame.js:32774-32838](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L32774) (`updateTransientEffects`), the loop processes all 3,277 items every frame, updating transforms and calling `applyFogOfWarOpacity`, which traverses child hierarchies and inspects materials.
  3. **Per-Frame Geometry Allocation in Shockwaves:**
     In [src/threeGame.js:31928-31929](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L31928):
     ```javascript
     ring.geometry.dispose();
     ring.geometry = new THREE.RingGeometry(Math.max(0.1, r - 0.25), r + 0.05, 32);
     ```
     Shockwave rings allocate a brand new `RingGeometry` on the GPU **every single frame** of their lifetime instead of scaling an existing geometry.
  4. **Canvas Texture & Material Leak in Damage Numbers:**
     In [src/threeGame.js:29778](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L29778), each hit creates a `new THREE.CanvasTexture(canvas)` and `new THREE.SpriteMaterial()`. `material.dispose()` does not dispose the underlying texture, leaking WebGL textures until garbage collected.

### Issue 6: Steam Deck FPS Counter (SteamOS Gamescope vs Game Loop)
- **Explanation:**
  The FPS counter visible in the top corner of the Steam Deck screen is the **SteamOS Gamescope Performance Overlay**, toggled via the physical `...` (Quick Access) button on the right edge of the Steam Deck -> Battery/Performance tab -> **Performance Overlay Level (Off / 1 / 2 / 3 / 4)**.
- **Why it showed 60 FPS while the game lagged:**
  Gamescope is the Wayland compositor that composites Electron's window onto the physical 60Hz display. When Electron submits frames or keeps its compositor thread ticking at VSync, Gamescope reports 60 FPS. However, the game's internal JavaScript game loop was taking 80ms - 300ms per frame. The display flipped at 60Hz displaying duplicated frames, causing severe visual stutter and input latency while the SteamOS counter reported 60 FPS.

---

## 3. Required Engineering Fixes & Remediation Plan

### Fix 1: Camp & 3D Replacement Visibility
- In [src/camp.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/camp.js), expose an explicit `isVisible` getter:
  ```javascript
  get isVisible() {
      return Boolean(this.revealed && this.group && this.group.visible);
  }
  ```
- In [src/threeGame.js:6170](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L6170), make replacement visibility check both `isRevealed` and `isVisible`:
  ```javascript
  const ownerVisible = owner ? Boolean(owner.isVisible ?? owner.isRevealed ?? true) : source.visible;
  root.visible = ownerVisible;
  ```
- In `canOccupyPosition` ([src/threeGame.js:32946](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L32946)), verify that if `prop.userData.replacedBy3d` is true, the 3D model root is actually attached and visible before blocking player movement:
  ```javascript
  const root = prop.userData.world3dRoot;
  if (prop.visible === false) {
      if (!prop.userData.replacedBy3d || !root || !root.visible || !root.parent) continue;
  }
  ```

### Fix 2: Steam Deck Controls & Action Sets
- **Tactical Map Modal Isolation:**
  When `toggleTacticalMapModal(true)` opens, set `appPhase = 'menu'` and set Steam Input action set to `menu`. When closed, restore `appPhase = 'gameplay'` and set action set to `gameplay`.
  Prevent `pollGamepads()` and `pollTacticalMapGamepadInput()` from simultaneously reacting to the same inputs.
- **Secondary Attack Definition:**
  Add a secondary attack binding (e.g., LT for secondary aim/fire or LB for secondary utility, and decouple melee/smash).

### Fix 3: Transient Effects & Performance Guardrails
- **Hard Cap on `transientEffects`:** Enforce a maximum of 64 active transient effects. If `transientEffects.length > 64`, immediately expire and dispose the oldest effects.
- **Remove Per-Frame RingGeometry Allocations:** In shockwave rings, allocate a single static `RingGeometry(0.8, 1.0, 32)` and simply animate `ring.scale.setScalar(r)` instead of reconstructing geometries every frame.
- **Damage Number Texture Pool:** Pool 20 CanvasTextures for damage numbers rather than instantiating new textures and materials per damage event.
- **Skip Fog of War Traversal for Dead Effects:** Only evaluate `applyFogOfWarOpacity` on transient effects that are within the active camera frustum.

### Fix 4: Procedural Map Variation & Post-Boss Guidance
- **Crash Site Variation:** Parameterize `clearSpawnArea` using the run seed so chunk (0,0) varies in room shape, door placement, and debris scatter.
- **Post-Boss Extraction Beacon:** When all 3 milestone bosses are defeated (`killedBosses.size >= 3`), trigger an alert: `OBJECTIVE COMPLETE: SECTOR PURGED // RETURN TO EXTRACTION AIRLOCK`, and spawn a pulsing compass indicator and map marker pointing back to the ship airlock.
- **Clarify Chasm Hazards:** Update chasm tooltip text to `IMPASSABLE CHASM // NATURAL BRIDGE REQUIRED` to clarify that bridges cannot be hand-built over chasms.
