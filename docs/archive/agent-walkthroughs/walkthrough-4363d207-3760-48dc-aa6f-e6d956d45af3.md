# Walkthrough: Pre-Mission Armory & Tactical Bench Layout Audit

**Conversation ID**: `4363d207-3760-48dc-aa6f-e6d956d45af3`

The **Pre-Mission Armory & Tactical Bench** UI ([`src/armoryUi.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/src/armoryUi.js) & [`style.css`](file:///home/caveman/Desktop/icecave/hunker-bunker/style.css)) has undergone a complete aesthetic, layout, and controller audit to match the cybernetic design language of the **Steam Vault** and **Tactical Dossier** (commit `543fe41`).

---

## 1. Key Layout & Visual Enhancements

### 1. Cybernetic Header & Class Telemetry
* **Header Tag Kicker**: `◈ SUB-TERRAN PRE-MISSION ARMORY // SECTOR ZERO` with wide monospace tracking.
* **Volumetric Title**: `SECTOR ZERO TACTICAL BENCH // LOADOUT` in Rajdhani/Outfit font with cyan drop-glow text shadows.
* **Operator Status Badge**:
  * Displays active operator class (`SCOUT` cyan, `TANK` amber, `ENGINEER` emerald).
  * Includes the controller quick-cycle indicator: `[Q / E CYCLE]`.

### 2. Framed Workbench Panels
* **Glassmorphic Chassis**: Both Suit and Weapon benches use dark midnight glassmorphism (`rgba(8, 14, 22, 0.92)`), glowing borders (`rgba(46, 196, 182, 0.35)`), and neon lateral indicator accents (Cyan left border for Suit Rig, Amber right border for Weapon Bench).
* **Scanlines & CRT Sheen**: Full CRT scanlines overlay across the workbench HUD without blocking the central 3D character staging view.

### 3. Equipment Controls & Modifiers Box
* **Upgraded Selects (`.armory-select`)**:
  * Styled in dark navy cockpit backgrounds (`rgba(14, 23, 36, 0.95)`) with glowing cyan hover/focus borders.
  * Clear hierarchy: Weapon Archetype $\rightarrow$ Weapon Finish $\rightarrow$ Rail Charm $\rightarrow$ Rig Overclock Bays A & B.
* **Active Combat Overclocks Cockpit**:
  * Real-time badges for Scrap Magnet, Cryo Freeze, Kinetic Pierce, Gas Resistance, and Zero-Point Dash Refund.

### 4. Navigation & Controller Actions
* Footer buttons equipped with clear key/button prompts:
  * `< SWITCH CLASS [ESC]` (Secondary)
  * `STEAM VAULT & FAB BAY [V]` (Tertiary Cyan Glow)
  * `EMBARK TO BUNKER >> [ENTER / A]` (Pulsing Amber Primary)
* High-contrast `:focus-visible` outlines tailored for Steam Deck (1280x800) and controller WASD/Arrow navigation.

---

## 2. Verification
* **Unit Test Suite (`npm test`)**: All **194 test files (1,636 tests)** passing green.
* **Linter (`npm run lint`)**: 0 errors, 0 warnings.
* **Git Status**: Clean working tree on `dev/sprint23`.
