# Implementation Plan: 3D Pre-Mission Armory Staging Room & Weapon Bench

**Conversation ID**: `6bdf4cbc-6281-41dd-844c-b1d749df8665`

## Goal Description
Build a **fullsize 3D subterranean staging room** (`appPhase='armory'`) where the player's active class operator stands on a staging platform in a subtle looping idle breathing animation, while their class weapon is prominently mounted on an illuminated magnetic workbench rack in front of the camera. The bench provides live visual feedback as players swap weapon finishes, 3D charms (with spring physics), rig overclocks, and exosuit decals, saving changes per class to `LoadoutManager`.

---

## User Vision & Architectural Alignment
1. **Fullsize 3D Staging Environment**:
   - Three.js scene (`src/armoryScene.js`) with industrial bunker lighting, metallic floor, overhead diagnostic spotlamps, and atmospheric fog.
   - **Operator (Left)**: Active class model (`Scout`, `Tank`, `Engineer`) in a procedural breathing/weight-shift idle loop on a 360° turntable platform.
   - **Class Weapon (Center Foreground)**: Prominently mounted on the magnetic workbench wall rack. Rotating/inspecting or socketing attachments triggers real-time visual reactions.
2. **Dynamic Live Modifications**:
   - **Weapon Finish / Skins**: Instant PBR material swap on the weapon frame (`Sub-Zero Frostbite`, `Deep Core Melter`, `Queen's Carapace`, `Void-Walker Beam`).
   - **3D Charms**: Physical attachment to `WeaponSocket_Charm` (`charm_mini_cryo_core.glb`, `charm_spent_50cal.glb`, `charm_golden_sub_bunker_key.glb`, etc.) with secondary spring dangle physics.
   - **Rig Overclock Modules**: Snapping glowing chips into `WeaponSocket_ModA` and `WeaponSocket_ModB` with audio feedback (`sfx_overclock_socket.wav`).
3. **Per-Class Loadouts & Unified Persistence**:
   - Single source of truth in `LoadoutManager` (`src/loadout.js`, key `hb_loadout_v1`).
   - Each class maintains its own unique gun configuration, charms, and modules.
4. **Pre-Run Flow Routing**:
   - Flow: **Title Screen -> Class Select -> Armory Staging Room (`appPhase='armory'`) -> Embark to Bunker -> Gameplay Combat**.

---

## Proposed Changes

### 1. Staging Room 3D Engine & Scene

#### [NEW] [`src/armoryScene.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/src/armoryScene.js)
- Manages the Three.js viewport canvas `#armory-canvas`.
- Creates the bunker room geometry: metallic grating, magnetic weapon mounting rack, floodlights, diagnostic holographic monitors.
- Loads class character meshes and plays procedural breathing/sway idle animation.
- Loads class gun models (`Vector-9 Talon`, `Siege-Breaker 50`, `Tesla-Lock MK-IV`, `Queen's Carapace Carbine`, `Void-Walker Beam`) onto the workbench rack.
- Implements socket attachment nodes (`WeaponSocket_Charm`, `WeaponSocket_ModA`, `WeaponSocket_ModB`) with live mesh replacement and spring physics simulation.
- Supports 360° turntable drag-rotation for inspecting weapon and suit.

---

### 2. Armory UI & HUD Workbench Overlay

#### [NEW] [`src/armoryUi.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/src/armoryUi.js)
- Renders the responsive HUD overlay over `#armory-canvas`:
  - **Suit Bench**: Chassis Skin & Shoulder Decal selectors with operator telemetry.
  - **Weapon Bench**: Gun Archetype, Weapon Finish, Charm Socket, Mod Slot A, Mod Slot B.
  - **Combat Modifiers Card**: Real-time display of active stat perks (`+20% Scrap Magnet Radius`, `+8% Cryo Duration`, `-12% Gas Damage`, `Kinetic Pierce +1`, `Dash Refund`).
  - **Navigation Bar**: `[< Switch Class]`, `[Quartermaster / Crafting]`, `[Embark >>]`.
- Plays acoustic cues (`sfx_overclock_socket.wav`, `sfx_charm_clink_light.wav`, `sfx_trade_shard_dispense.wav`).

---

### 3. DOM & Styles

#### [MODIFY] [`index.html`](file:///home/caveman/Desktop/icecave/hunker-bunker/index.html)
- Adds `<section id="armory-screen" class="hidden">` with `#armory-canvas` and `#armory-hud-overlay`.

#### [MODIFY] [`style.css`](file:///home/caveman/Desktop/icecave/hunker-bunker/style.css)
- Adds Armory workbench styling, glassmorphic HUD panels, socket selector tabs, and glow animations.

---

### 4. Game Flow Routing & Main Loop

#### [MODIFY] [`main.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/main.js)
- Routes **INITIALIZE** and **DAILY OPS** buttons to `enterArmoryScreen(selectedClass)`.
- Implements `appPhase = 'armory'`.
- Wires **EMBARK** button to transition directly into `startRun()` and the mission intro cinematic sequence.

---

## Verification Plan

### Automated Tests
- Unit tests in `src/armoryScene.test.js` and `src/armoryUi.test.js` verifying:
  - Scene creation, camera positioning, and lighting setup.
  - Model and socket attachment logic.
  - Per-class loadout read/write cycles.
  - Perk calculation display accuracy.
- Run `npm test` across all test files.

### Manual Verification
- Launch local dev server (`npm run dev`).
- Select a class (Scout, Tank, Engineer) -> Verify transition to fullsize 3D Armory Room.
- Verify operator idle animation on staging platform and large weapon mounted on the wall workbench.
- Click various weapon finishes, charms, and mod chips -> Verify instant 3D visual update and audio cues.
- Click EMBARK -> Verify seamless transition into bunker descent and gameplay.
