# Armory UI Redesign & Dynamic Class Theming Specification

**Date:** 2026-08-22  
**Target Screen:** Sector Zero Pre-Mission Armory (`#armory-screen`, `src/armoryUi.js`, `src/armoryScene.js`, `style.css`)  
**Objective:** Eliminate UI element occlusions blocking 3D character and weapon models, establish a clean 3-zone visual hierarchy, and introduce comprehensive, reactive class-specific theming.

---

## 1. Visual Defect Analysis (Current State)

Based on the current Armory screenshot, several critical layout and styling defects degrade visual quality and user experience:

```
+----------------------------------------------------------------------------------------------------+
| ◈ SUB-TERRAN PRE-MISSION ARMORY // SECTOR ZERO                   [SCOUT] [TANK] [★ ENGINEER ★]     |
| SECTOR ZERO TACTICAL BENCH // LOADOUT (Hardcoded Orange)                                          |
+----------------------------------------------------------------------------------------------------+
| [OPERATOR EXOSUIT RIG]      |                                   | [WEAPON 3D PREVIEW BOX]          |
|                             |                                   | (Floating dark cut-out rectangle)|
| (Left panel overlapping     |     [LIVE BENCH PREVIEW]          |                                  |
|  character model torso,     |     (Floating card directly       | [BALLISTIC BENCH & OVERCLOCKS]   |
|  arm, and hex pedestal)     |      blocking operator model)     | (Hardcoded orange borders,       |
|                             |                                   |  amber dropdowns & badges)       |
|                             |                                   |                                  |
+----------------------------------------------------------------------------------------------------+
| [← RETURN TO MAIN MENU]            [STEAM VAULT & FAB BAY]            [EMBARK TO BUNKER >> (Orange)]|
+----------------------------------------------------------------------------------------------------+
```

### Key Issues Identified:

1. **Occluded 3D Character Model & Pedestal:**
   - The left panel (`.suit-bench-panel`) overlaps the left torso, arm, and the glowing hexagonal turntable pedestal of the operator.
   - The `.armory-stage-readout` ("LIVE BENCH PREVIEW") floats right in the middle-left lane, directly covering the operator's waist and weapon mounting points.
2. **Disconnected Weapon 3D Viewport:**
   - The 3D weapon model appears boxed inside a dark, abrupt rectangular viewport in the upper right, clipping unnaturally into the background environment.
3. **Class Theme Inconsistency (Hardcoded Orange vs. Active Class):**
   - When the **Engineer** class is active (phosphor green / emerald identity), the UI still renders with hardcoded orange elements:
     - Header accent `// LOADOUT` (`#ff9f1c`).
     - Main Embark CTA button `EMBARK TO BUNKER >>` (`#ff9f1c`).
     - Panel borders, headers, and glow shadows.
     - Dropdown select borders, arrow icons, and focus outlines.
     - Telemetry box lines and overclock badges.
   - Result: The screen looks visually fragmented (a mix of teal buttons, emerald tabs, and dominant orange borders).

---

## 2. Dynamic Class Theming System

The Armory UI will reactively shift its color tokens based on the active class selected in `[data-class="scout" | "tank" | "engineer"]`.

### Class Color Matrix

| Attribute | Scout (`scout`) | Tank (`tank`) | Engineer (`engineer`) |
| :--- | :--- | :--- | :--- |
| **Theme Identity** | Recon & High-Voltage Cryo | Heavy Siege & Hazard Core | Cyber-Tech & Bio-Phosphor |
| **Primary Accent (`--class-accent`)** | `#00f0ff` (Cyan / Neon Blue) | `#ff9f1c` (Hazard Amber / Orange) | `#10b981` (Phosphor Emerald) |
| **Secondary Accent (`--class-accent-2`)**| `#3b82f6` (Cobalt Blue) | `#ef4444` (Molten Crimson) | `#06d6a0` (Neon Mint) |
| **Ambient Glow (`--class-glow`)** | `rgba(0, 240, 255, 0.25)` | `rgba(255, 159, 28, 0.25)` | `rgba(16, 185, 129, 0.25)` |
| **Panel Surface Border** | `rgba(0, 240, 255, 0.35)` | `rgba(255, 159, 28, 0.35)` | `rgba(16, 185, 129, 0.35)` |
| **CTA Embark Background** | Gradient: `#00f0ff` → `#00a8b5` | Gradient: `#ff9f1c` → `#d97706` | Gradient: `#10b981` → `#059669` |
| **3D Stage Rim & Pedestal Light** | Cryo Cyan Glow (`#00f0ff`) | Thermal Amber Glow (`#ff9f1c`)| Bio-Phosphor Glow (`#10b981`)|

### Cascading UI Elements Themed by Class:
- **Header & Tagline:** Sub-terran armory badge, header accent `// LOADOUT`, and active class indicator.
- **Side Panels:** Left and right panel borders, corner brackets, title badges, and glow shadows.
- **Form Controls:** Custom dropdown borders, arrow SVGs, selected text color, hover states, and focus rings.
- **Telemetry & Overclocks:** Telemetry status headers, status bars, and active modifier chips.
- **Bottom Navigation:** The primary "EMBARK TO BUNKER >>" button and secondary button hover glows.
- **3D Scene:** Pedestal ring light color, ambient rim lighting, and backdrop tint in Three.js.

---

## 3. Screen Layout & De-Cluttering Architecture

To ensure **nothing is blocked**, the viewport is organized into a clean 3-zone layout with dedicated 3D stages.

```
+----------------------------------------------------------------------------------------------------+
| ◈ SUB-TERRAN PRE-MISSION ARMORY                      [ ↗ SCOUT ] [ ▰ TANK ] [ ⚙ ENGINEER (Active) ]|
| SECTOR ZERO TACTICAL BENCH // LOADOUT                                                              |
+----------------------------------------------------------------------------------------------------+
| [LEFT DOCKED PANEL]       |                 [CENTER 3D STAGE]                 | [RIGHT DOCKED PANEL]|
| Width: ~340px             |                                                   | Width: ~360px       |
|                           |  • Fully unobstructed 3D Operator Model           |                     |
| 🛡️ EXOSUIT RIG             |  • 360° Rotating Hexagonal Pedestal               | ⚔️ BALLISTIC BENCH   |
| • Chassis Specification   |  • Floating 3D Weapon Preview seamlessly mounted   | • Weapon Platform   |
| • Exosuit Chassis Skin    |    in upper stage without hard dark borders       | • Tactical Finish   |
| • Shoulder Patch / Decal  |                                                   | • Tactical Charm    |
| • Suit Telemetry Status   |  [SUBTLE BOTTOM READOUT BAR]                      | • Overclock Bay A/B |
|                           |  Chassis: [Standard] | Weapon: [Arc Driver] | Tint| • Active Modifiers  |
+----------------------------------------------------------------------------------------------------+
| [← RETURN TO MAIN MENU]                 [STEAM VAULT & FAB BAY]        [EMBARK TO BUNKER >> [ENTER]]|
+----------------------------------------------------------------------------------------------------+
```

### 1. Left Zone — Operator Exosuit Rig (Docked)
- **Position:** Docked flush left (`left: calc(var(--vu) * 2)`), max width constrained to 320–350px.
- **Clearance:** Pushed far enough left so the 3D character pedestal sits cleanly in the center-left lane without any panel overlap.
- **Content:**
  - Exosuit Chassis selector.
  - Shoulder Patch & Decal selector.
  - Telemetry diagnostics box (Cryo-Mesh, Radiation Seal, Turntable orbit hint).

### 2. Center Zone — Clean 3D Showcase Stage
- **Unobstructed Hero View:** No floating cards or overlays in the center! The operator model is completely visible from helmet to boots on the glowing turntable pedestal.
- **Seamless 3D Weapon Presentation:**
  - Remove the jarring dark square container around the weapon.
  - Render the weapon directly in the upper-right quadrant of the 3D scene with subtle volumetric lighting and particle sparks matching the active class theme.
- **Integrated Stage Readout:**
  - The bulky "LIVE BENCH PREVIEW" center card is replaced with a streamlined, semi-transparent **Bottom Readout Strip** docked above the footer, or integrated cleanly as a sub-header bar.
  - Includes a quick-access button: `[🎨 OPEN SUIT TINT MATRIX]`.

### 3. Right Zone — Ballistic Bench & Overclocks (Docked)
- **Position:** Docked flush right (`right: calc(var(--vu) * 2)`), width ~360px.
- **Content:**
  - Primary Weapon Platform dropdown.
  - Weapon Sheen / Tactical Finish dropdown.
  - Tactical Charm dropdown.
  - Overclock Bays A & B.
  - Active Combat Overclocks telemetry badge grid.

### 4. Top & Bottom HUD Bars
- **Top Header:** Clean alignment with dynamic class switcher tabs (`[Q / E CYCLE]`).
- **Bottom Navigation:**
  - `[← RETURN TO MAIN MENU [ESC]]` (Left)
  - `[STEAM VAULT & FAB BAY [V]]` (Center)
  - `[EMBARK TO BUNKER >> [ENTER / A]]` (Right — dynamically glowing with the active class accent color).

---

## 4. Technical Implementation Plan

### 1. `style.css` Adjustments
- Introduce CSS custom properties dynamically driven by `[data-class="scout|tank|engineer"]`:
  ```css
  .armory-hud[data-class="scout"] {
    --armory-accent: #00f0ff;
    --armory-accent-secondary: #3b82f6;
    --armory-glow: rgba(0, 240, 255, 0.3);
    --armory-border: rgba(0, 240, 255, 0.4);
    --armory-panel-bg: rgba(6, 16, 26, 0.92);
  }
  .armory-hud[data-class="tank"] {
    --armory-accent: #ff9f1c;
    --armory-accent-secondary: #ef4444;
    --armory-glow: rgba(255, 159, 28, 0.3);
    --armory-border: rgba(255, 159, 28, 0.4);
    --armory-panel-bg: rgba(20, 12, 6, 0.92);
  }
  .armory-hud[data-class="engineer"] {
    --armory-accent: #10b981;
    --armory-accent-secondary: #06d6a0;
    --armory-glow: rgba(16, 185, 129, 0.3);
    --armory-border: rgba(16, 185, 129, 0.4);
    --armory-panel-bg: rgba(6, 20, 16, 0.92);
  }
  ```
- Replace hardcoded `#ff9f1c` and `#2ec4b6` across `.armory-panel`, `.armory-select`, `.armory-title-accent`, `.telemetry-box`, `.mod-badge`, and `#armory-embark-btn` with `var(--armory-accent)` and `var(--armory-glow)`.
- Adjust `.armory-main-layout` grid template from overlapping widths to clean columns with adequate 3D scene clearance.
- Relocate `.armory-stage-readout` from center screen obstruction to a subtle bottom toolbar.

### 2. `src/armoryUi.js` Updates
- Set `container.querySelector('.armory-hud').setAttribute('data-class', activeClass.toLowerCase());` on every render.
- Ensure all dropdown arrows, option styling, and button states utilize dynamic CSS variables.
- Streamline the Live Bench preview DOM to prevent model occlusion.

### 3. `src/armoryScene.js` Updates
- Reposition `operatorPedestalGroup` and camera angle so the operator model is fully framed within the center viewing lane.
- Update pedestal ring lights and rim lights to dynamically sync with `activeClass` theme colors.
- Seamlessly blend the 3D weapon bench into the scene background without a boxy container cut-out.

---

## 5. Verification & Acceptance Criteria

1. **Zero Occlusions:**
   - The operator 3D character (head to toe) and the pedestal are completely visible without being clipped or covered by the left suit panel or center cards.
   - The weapon 3D model is visible without clipping into background geometry or UI panels.
2. **Cohesive Class Theming:**
   - Switching between **Scout**, **Tank**, and **Engineer** updates all UI borders, glows, dropdowns, title accents, and the Embark button instantaneously to the respective class theme colors.
3. **Responsive Resolution Support:**
   - UI scales cleanly at 1920x1080 (standard desktop), 1280x800 (Steam Deck), and 2560x1440 without layout overlaps.
4. **Interactive Fidelity:**
   - 360° turntable mouse drag functions cleanly across the center stage.
   - Suit tint matrix modal opens smoothly without disrupting layout state.
