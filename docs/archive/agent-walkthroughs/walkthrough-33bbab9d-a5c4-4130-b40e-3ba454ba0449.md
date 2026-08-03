# Walkthrough — HB Feature Expansion & Bugfixes

This document summarizes the changes, additions, and verifications completed for the Hunker Bunker game.

## Changes Made

### 1. Spawning Distances & Aggro AI
- **Distance Modifications:**
  - Milestone boss spawning radial distance list changed from `[11, 9, 13, 7, 15]` to `[24, 22, 26, 20, 28]` in `threeGame.js`, ensuring they spawn off-screen.
  - Patrol group spawn radius expanded from `7 + i * 1.6` to `18 + i * 2.2`.
- **Aggro Target Selection:**
  - Added `shotByPlayer` flag. When a snail is damaged by the player, it triggers aggro (`shotByPlayer = true` and `prioritizeShip = false`).
  - In `selectSnailTarget()`, if `shotByPlayer` is true:
    - If the player is within $12.0$ units, the snail hunts the player.
    - If the player runs further than $12.0$ units away, the snail loses aggro (`shotByPlayer = false`), sets `prioritizeShip = true` (forcing them to return to base), and resumes targeting the ship.

### 2. O₂ Stabilizer Firing Zone
- Removed the O₂ stabilizer generator active radius check inside `isInsideNoFireZone()`. Players can now shoot freely while standing inside powered O₂ stabilizer fields. Firing is only blocked inside the ship's immediate radius.

### 3. Rain & Splash Occlusion
- Adjusted the `renderOrder` of the rain particle systems and droplet splash groups in `threeGame.js` from `7` and `20` to `4` (below the player sprite's order of `5`), ensuring falling rain and splashes render behind the player instead of overlaying them.

### 4. Radar Scan Ability [Q] & Entity Pings
- Implemented a Sonar Radar Scan triggered by pressing **[Q]** (keyboard) or tapping the HUD scan button (mobile).
- **Abilities State & Visuals:**
  - Pushes an active radar scan object tracking center coordinates, age, duration ($1.2\text{s}$), and radius ($18.0\text{u}$).
  - Plays a deep sonar sweep sound (`ui_scan_ping` at `0.48` pitch).
  - Renders a cyan expanding Ring on the ground using shared geometry to save memory.
- **Fog of War Integration:**
  - Updated `getFogOfWarVisibility()` to return `1.0` (fully visible) for any coordinates within any active scan's expanding sweep radius, revealing all walls, floor tiles, and items.
- **Entity Pings:**
  - Nearby snails, pickups, terminals, and the foundry hit by the scan ring spawn a temporary floating cyan diamond indicator that remains visible through walls for 5.0 seconds.

### 5. Dialogue / CRT Radio Transmission prompt
- Added a retro CRT diagnostic terminal popup `#radio-transmission-prompt` to `index.html` with animated scanlines, neon blue borders, and typewriter styling.
- Wired a typewriter function `showRadioTransmission(text)` inside `main.js` that parses dialogue text:
  - Supports `> MOTHERSHIP:` (blue/mothership portrait), `> BUNKER:` (amber/bunker portrait), `> SCOUT:`, `> TANK:`, `> ENGINEER:` (class-specific portraits), and `> SYSTEM:` (yellow OS portrait).
  - Plays typewriter click sounds on each character tick.
- Rerouted `showBiomePrompt` warnings, status alerts, and sector entry text to render through this beautiful dialogue prompt.

### 6. Wall Structural Variations
- Pre-allocated shared 3D geometries and materials (cylinders, boxes, vent grids, conduit pipes) in `threeGame.js` constructor to optimize GPU usage.
- In `mountChunk()`, added visual details deterministically based on coordinate hashing:
  - *Pillars:* $12\%$ chance to add corner support cylinders.
  - *Support Brackets:* $12\%$ chance to add thin metal panels.
  - *Vents:* $8\%$ chance to add dark vent grid blocks on upper wall faces.
  - *Pipes:* $6\%$ chance to add dark conduit pipes.

### 7. Game Over Modal Bounding
- Updated `.game-over-content` styling in `style.css` to use percentage constraints (`max-height: 92% !important;`) rather than absolute `vh`/`dvh` window sizes. The failure screen now stays strictly contained within the aspect-ratio constrained `#game-viewport` cabinet container.

### 8. Tactical Terminal Tabs & Visual Skill Trees
- **Tabbed Layout:** Integrated console tabs (`#terminal-tab-base` and `#terminal-tab-skills`) inside the terminal console modal, allowing users to toggle between Base Systems and Class Skills.
- **Dynamic Skill Trees:** Designed and built unique, interactive visual Skill Trees for each class (Scout, Tank, Engineer) in a 7-row x 5-column CSS grid.
- **Connectors:** Generated dynamic vector connection lines (diagonal SVGs inside intermediate grid cells) that change colors to blue when their parent skill node is unlocked.
- **Skill Tree Upgrades Applied:**
  - *Scout Speed:* base speed multiplied by 1.15x when `scout_speed_1` is unlocked.
  - *Scout Magnet:* magnet radius increased to 5.5u (instead of 4.2u) when `scout_magnet_1` is unlocked.
  - *Scout Ammo Capacity:* weapon clip size increased by +3 rounds when `scout_ammo_1` is unlocked.
  - *Tank HP Plating:* player max hp increased by +1 heart when `tank_plating_1` is unlocked.
  - *Tank Damage:* base weapon projectile damage increased by +1 when `tank_damage_1` is unlocked.
  - *Tank O2 Efficiency:* general O2 drain rate reduced by 15% when `tank_o2_efficiency` is unlocked.
  - *Scout Special Upgrades:* Windrunner adds +1.0s to duration and Fast Recovery reduces cooldown by -2.0s.
  - *Tank Special Upgrades:* Iron Wall adds +1.5s to duration, and Aegis Generation increases bubble refill speed by +20% while braced.
  - *Engineer Radar Upgrade:* Extended Scan increases radar scan radius by +30%.
  - *Engineer Magnet Upgrade:* Scrap Magnet increases scrap/med magnet radius to 5.0u.
  - *Engineer Battery Upgrade:* Battery Overhaul reduces general O2 drain rate by 10%.
  - *Engineer Special Upgrades:* System Overclock adds +20% fire rate and +20% projectile speed during Reroute; Safety Standards reduces scan cooldown by 50% during Reroute.

### 9. Sprint Mechanic & Control
- **Controls:** Added standard sprint holding `Shift` on Desktop, or toggling `#touch-sprint-btn` on mobile.
- **No Penalties:** Removed the oxygen drain rate penalty from standard sprint, allowing the player to sprint always.

### 10. Special Ability Gating
- Gated active Exosuit special abilities behind unlocking the respective tree unlock node (`scout_special_unlock`, `tank_special_unlock`, `engineer_special_unlock`) in the Class Skills tab.

### 11. Black Box Corpse Heaps & Inbound Patrols
- Designed class-specific lay-down corpse models next to physical glowing orange Black Box props.
- Picking up a Black Box triggers a Mothership warn transmission and spawns a 3-enemy patrol that immediately targets the player.

### 12. Layout Repositioning & Cutscene Visibility Fix
- **Notifications Sidebar to Left Side:** Repositioned `.hud-left-sidebar` (containing console shop prompt, radio transmission dialog, and mission progress) to the left side of the screen (`left: 4vu`), alignment set to `flex-start` with slide-in from the left.
- **Inventory updates Panel to Right Side:** Moved `.pickup-counter-panel` (current session salvage updates) to the right hand side (`right: 4vu`, `left: auto`) to avoid overlap and present a balanced screen layout.
- **Intro Cutscene Visibility:** Hidden all HUD elements (prompts, touch controls/buttons, sidebar, loop objective bar, biome notifications) under the cutscene overlay during `mission-intro-active`.

### 13. Screen Transition Overlay Fix
- **Visibility Outside Gameplay HUD:** Moved `#transition-overlay` outside of the gameplay HUD container `#ui` (which is hidden during the initial load and menu/briefing phases) to the root body level of [index.html](file:///home/caveman/Desktop/icecave/hunker-bunker/index.html). This ensures transition door animations render correctly on game loading, character selection transitions, and retries.

---

## Verification Results

### Automated Tests
- Ran `npm run test` (Vitest): **89/89 tests passed successfully**!
- Ran `npm run build` (Vite production build): **Vite build compiled cleanly with zero errors**!

### Manual Playtesting
1. **Intro Cutscene:** Verified no HUD elements are visible until the intro crash cutscene completes and gameplay begins.
2. **Left Sidebar:** Verified dialogue alerts and console alerts stack correctly on the left hand side.
3. **Right Pickup Panel:** Verified current session items collected (scrap/meds/coins counters) display on the right hand side without overlapping the settings gear button or transmission dialogue.
4. **Sprinting Always:** Confirmed holding Shift sprints the character at 1.45x speed without incurring any extra oxygen depletion penalty.
5. **Screen Transitions:** Verified that biometric and heavy transit doors close and slide open as expected during load sequences and screen transitions.
