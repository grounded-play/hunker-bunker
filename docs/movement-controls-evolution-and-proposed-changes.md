# Movement & Controls: Historical Evolution, Current State Audit, and Proposed Changes Log

**Document ID:** `DOC-LOC-2026-08-17-01`  
**Author:** Antigravity Core Engine Team  
**Status:** Active Transition Log & Engineering Proposal  
**Related Specs:** [`docs/gameplay-movement-and-controls-standard.md`](gameplay-movement-and-controls-standard.md), [`docs/sprint-22-systems-breakdown/02-combat-and-classes.md`](sprint-22-systems-breakdown/02-combat-and-classes.md)  

---

## 1. Executive Summary & Context

This document serves as the formal change log, historical audit, and forward-looking proposal for the player locomotion, camera, and input systems in *Hunker Bunker*.

It captures:
1. **Where We Came From:** The chronology of decisions, implementations, and experiments from the initial isometric prototype through the behind-the-head camera experiment.
2. **Where We Are Today:** The live, verified architectural state of the regularized twin-stick movement model.
3. **Proposed Future Changes (RFC Roadmap):** Prioritized quality-of-life enhancements, feel tuning, and accessibility improvements for subsequent sprints.

---

## 2. Historical Evolution & Chronology

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                  LOCOMOTION CHRONOLOGY                                  │
├────────────────────────────────┬───────────────────────────┬────────────────────────────┤
│             ERA 1              │           ERA 2           │           ERA 3            │
│       Classic Isometric        │    Behind-the-Head Orbit  │   Regularized Decoupled    │
│       (Sprint 1 - 21)          │      (Sprint 22 - Aug 14) │    (Sprint 23 - Live)      │
├────────────────────────────────┼───────────────────────────┼────────────────────────────┤
│ • Fixed (8,10,8) camera        │ • Experimental TPS camera │ • Decoupled twin-stick     │
│ • CameraPlanar basis WASD      │ • Coupled WASD to aim yaw │ • Screen-space WASD        │
│ • Pure 2D sprite octants       │ • Circular feedback loop  │ • Normalized diagonals     │
│ • Decoupled mouse aim          │ • Broken kiting & strafe  │ • Stable isometric camera  │
│                                │ • High disorientation     │ • Rigged 3D spine blending │
└────────────────────────────────┴───────────────────────────┴────────────────────────────┘
```

### Era 1: Classic Isometric Foundation (Sprint 1 – 21)
- **Design:** Traditional top-down/isometric survival shooter with fixed orthographic-like perspective (`cameraOffset = (8, 10, 8)`).
- **Locomotion:** WASD keys were transformed through the static camera planar vectors (`cameraPlanarRight` and `cameraPlanarForward`).
- **Aiming:** Mouse cursor projected via ground-plane raycast to determine torso orientation and weapon discharge angle.
- **Characteristics:** Solid, predictable twin-stick mechanics; however, lacked 3D character mesh support and had uneven diagonal speed scaling in certain submodules.

### Era 2: The Behind-the-Head Orbit Camera Experiment (Sprint 22, 2026-08-14)
- **Intent:** Attempted to convert the game into an over-the-shoulder third-person experience where the camera automatically orbited behind the player's facing direction (`docs/superpowers/plans/2026-08-14-camera-behind-head.md`).
- **Implementation (Commits `de7ebe6`, `b283150`, `d314b1c`):**
  - Introduced `src/cameraYaw.js` with `stepAngleTowards` easing.
  - Linked `updatePlayer` movement vectors to `facingPlanarForward` and `facingPlanarRight` (derived from instant `facingYaw`).
  - Instructed `updateCamera` to ease `cameraAzimuth` towards `facingYaw + Math.PI`.
- **Breakdown & Failure Modes:**
  1. *Loss of Screen-Space Intuition:* Pressing `W` ceased to mean "Up on screen" and instead meant "Towards mouse cursor".
  2. *Destruction of Combat Kiting:* An operator facing East could not back away to the West by pressing `S`; pressing `S` drove the character directly into the enemy.
  3. *Circular Rotational Oscillator:* Because cursor aim relied on ground raycasts through the active camera, camera rotation shifted the ground under the cursor, which changed the aim angle, which spun the camera further.
  4. *Incomplete Pointer Lock:* The system required strict mouse pointer lock to avoid the raycast loop, but pointer lock was incompatible with UI modals, inventory screens, and casual browser play.

### Era 3: Regularized Decoupled Twin-Stick Standard (Sprint 23, 2026-08-17 – Current Live State)
- **Remediation & Polish:**
  - Fully decoupled locomotion from combat aim.
  - Re-anchored `updatePlayer`, `getFacingRow`, and `getWorldDirectionForFacingRow` to `this.cameraPlanarRight` and `this.cameraPlanarForward`.
  - Stabilized the tactical isometric camera (`cameraAzimuth = Math.PI / 4`, `cameraOffset = (8, 10, 8)`) with smooth position lerp and shake damping.
  - Enforced strict diagonal velocity normalization ($1.0\times$ speed across all angles).
  - Regularized `triggerGameplayDash` to dash along the active WASD vector (defaulting to aim only when stationary).
  - Authored comprehensive test harness with 15 dedicated unit tests.

---

## 3. Before vs. After Comparative Matrix

| System / Feature | Era 2 (Wonky Experiment) | Era 3 (Current Regularized State) | Impact / Player Experience |
| :--- | :--- | :--- | :--- |
| **`W` Key Direction** | Moves toward mouse cursor | Moves straight **UP** on screen | Predictable, intuitive navigation |
| **`S` Key Direction** | Moves away from mouse cursor | Moves straight **DOWN** on screen | Restores true combat kiting |
| **`A` / `D` Keys** | Circular orbit around cursor | Moves straight **LEFT** / **RIGHT** | Seamless strafing along corridors |
| **Diagonal Speed** | $1.414\times$ unnormalized in places | Normalized $\mathbf{1.0\times}$ across all angles | Fair pacing, no diagonal speed exploit |
| **Aim Coupling** | Aiming redirected movement | Aiming is $100\%$ independent | Full 360° omnidirectional freedom |
| **Camera Yaw** | Chased mouse aim with lag | Fixed $45^\circ$ tactical isometric | Eliminates vertigo and camera spinning |
| **Camera Position** | Jittered with rotational lag | Smooth exponential position lerp | Rock-solid visual tracking |
| **Tactical Dash** | Dashed towards world axes | Dashes along screen movement vector | High-precision evasion during combat |
| **2D/3D Animation** | Torso fought camera angle | Legs face travel, Torso faces aim | Clean dual-layer visual fidelity |
| **Gamepad Parity** | Right stick fought left stick | Left Stick = Move, Right Stick = Aim | Native twin-stick console feel |

---

## 4. Current State Audit (Verified Live Truth)

### 4.1 Implementation Files & Call Sites
- **`src/threeGame.js:15483-15525` (`updatePlayer`):**
  - Reads `keyAxisX`, `keyAxisZ`, `virtualInput.x`, `virtualInput.z`.
  - Maps through `this.cameraPlanarRight` and `this.cameraPlanarForward`.
  - Normalizes `moveVector` before multiplying by $v_{\text{speed}} \cdot \Delta t$.
  - Executes per-axis occupancy checks (`canOccupyPosition`) for wall sliding.
- **`src/threeGame.js:17834-17855` (`updateCamera`):**
  - Maintains stable `cameraAzimuth` ($\pi/4$) and recomputes planar basis.
  - Position lerp: `this.camera.position.lerp(target, 1 - Math.exp(-delta * 7))`.
- **`src/threeGame.js:4718-4740` (`triggerGameplayDash`):**
  - Computes `dirX, dirZ` from `screenAxisX, screenAxisZ` via `cameraPlanarBasis`.
  - Grants $0.25\text{ s}$ i-frames, triggers screen shake and particle bursts.
- **`src/threeGame.js:16948-17015` (`getFacingRow`, `getWorldDirectionForFacingRow`):**
  - Quantizes movement vector into 8 screen octants for 2D sprites.
- **`src/player3dOverlay.js:450-530` (3D Skeletal Blending):**
  - Retargets Mixamo walk cycles to movement direction while blending spine rotation towards `aimDirX, aimDirZ`.

### 4.2 Automated Test Coverage & Quality Gates
- **`src/threeGame.combatMovement.test.js`:** 8 passing tests (Screen-space WASD, diagonal normalization, kiting independence, dash priority, station interaction).
- **`src/threeGame.facingYaw.test.js`:** 7 passing tests (Aim derivation, camera basis stability, snap camera, melee direction).
- **`tests/e2e/keyboard-controls.spec.js`:** Real browser input automation.
- **Repository Health:** 161 test files (1,444 tests) passing, `npm run lint` clean (0 errors).

---

## 5. Proposed Changes & Roadmap (Next-Phase RFCs)

The following proposals outline future quality-of-life enhancements and gameplay feel refinements built on top of the regularized locomotion baseline.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PROPOSED ROADMAP (RFCs)                                 │
├───────────────┬────────────────────────────────────────────────────────┬────────────────┤
│ RFC ID        │ Title                                                  │ Priority / Est │
├───────────────┼────────────────────────────────────────────────────────┼────────────────┤
│ **RFC-LOC-01**│ Micro-Inertia & Deceleration Curve Tuning              │ P2 (Sprint 24) │
│ **RFC-LOC-02**│ Procedural Doorway Corner-Nudging / Assisted Rounding  │ P2 (Sprint 24) │
│ **RFC-LOC-03**│ Gamepad Radial Deadzones & Sensitivity Customization   │ P3 (Sprint 25) │
│ **RFC-LOC-04**│ Subtle Tactical Camera Cursor Lead (Lookahead)         │ P3 (Sprint 25) │
│ **RFC-LOC-05**│ Class-Differentiated Kinetic Locomotion Profiles       │ P2 (Sprint 24) │
│ **RFC-LOC-06**│ Dynamic Input Glyph Auto-Switching & Remapping UI      │ P1 (Sprint 24) │
└───────────────┴────────────────────────────────────────────────────────┴────────────────┘
```

---

### RFC-LOC-01: Micro-Inertia & Deceleration Curve Tuning

#### Problem Statement
Currently, releasing WASD keys drops the character's velocity from $100\%$ to $0\%$ instantaneously in a single frame. While highly responsive, it can feel slightly mechanical or abrupt.

#### Proposed Solution
Introduce a tight, non-floaty exponential deceleration curve over $45\text{ ms}$:
$$v(t) = v_{\text{target}} + (v_{\text{prev}} - v_{\text{target}}) \cdot e^{-k_{\text{friction}} \cdot \Delta t} \quad (k_{\text{friction}} \approx 28.0)$$
- **Acceleration Time:** $0 \to 100\%$ in $30\text{ ms}$ (virtually instantaneous, snappy response).
- **Deceleration Time:** $100\% \to 0$ in $45\text{ ms}$ (subtle physical weight, zero floatiness).

---

### RFC-LOC-02: Procedural Doorway Corner-Nudging (Assisted Rounding)

#### Problem Statement
In procedurally generated bunkers, doorway apertures are often exactly 1 tile wide ($1.0\text{ m}$). If an operator attempts to walk through a doorway while $5\text{ cm}$ misaligned, standard per-axis AABB collision stops the forward motion, requiring the player to manually strafe to center themselves.

#### Proposed Solution
Implement a subtle corner-nudging feeler ray:
- Cast two forward feeler rays offset by $\pm 0.25\text{ m}$ perpendicular to movement.
- If one feeler hits an obstacle corner and the other is clear into an open doorway, apply a minor lateral correction force ($0.8\text{ m/s}$ lateral impulse) to smoothly slide the character through the door aperture without slowing forward momentum.

---

### RFC-LOC-03: Gamepad Radial Deadzones & Response Curve Customization

#### Problem Statement
Currently, gamepad sticks use a hardcoded radial deadzone of $0.15$. Worn analog sticks or high-end hall-effect controllers benefit from configurable deadzone boundaries.

#### Proposed Solution
1. Add settings sliders in the Settings Modal:
   - **Inner Deadzone:** $[0.02, 0.25]$ (Default: $0.10$).
   - **Outer Deadzone:** $[0.85, 1.00]$ (Default: $0.95$).
   - **Response Curve:** `Linear`, `Exponential (Standard)`, `Aggressive`.
2. Expose the calibrated axes to `browserGamepad.js` and `main.js`.

---

### RFC-LOC-04: Subtle Tactical Camera Cursor Lead (Lookahead)

#### Problem Statement
In wide bunker rooms, enemies can engage from off-screen edges. Players naturally aim towards threat vectors and benefit from seeing slightly further in the direction of their crosshair.

#### Proposed Solution
Implement a smooth, bounded screen-space camera offset that subtly leads toward the cursor without any rotational spinning:
$$\vec{P}_{\text{cam\_offset\_extra}} = \operatorname{clamp}\left(\frac{\vec{P}_{\text{cursor\_screen}} - \vec{P}_{\text{center}}}{W_{\text{viewport}}}, \; -1.5\text{ m}, \; +1.5\text{ m}\right)$$
- The offset is capped at $1.5\text{ m}$ max translation.
- Applied with slow exponential damping ($lerpSpeed = 3.0$) so rapid mouse movement does not cause camera shake.
- Pitch and azimuth remain $100\%$ locked at $45^\circ$.

---

### RFC-LOC-05: Class-Differentiated Kinetic Locomotion Profiles

#### Problem Statement
Currently, classes differ primarily in base speed and passives, but share identical acceleration and turn rates.

#### Proposed Solution
Differentiate kinesthetics across class archetypes:
- **Scout (Evasive):** Instant acceleration ($k_{\text{accel}} = 40$), higher dash distance ($+20\%$), zero deceleration slide, agile footstep cadence.
- **Tank (Bulwark):** High kinetic mass, subtle momentum carry ($k_{\text{friction}} = 22$), immunity to enemy knockback impulses, heavy rhythmic stomps.
- **Engineer (Tactical):** Standard acceleration, zero recoil displacement when deploying turrets or operating consoles.

---

### RFC-LOC-06: Dynamic Input Glyph Auto-Switching & Remapping UI

#### Problem Statement
Tutorial overlays and HUD prompts currently display static keyboard glyphs (`[WASD]`, `[E]`, `[SHIFT]`). When a controller is connected, prompts should instantly adapt.

#### Proposed Solution
- Listen to `window` gamepad input activity and toggle body class `.input-gamepad` vs `.input-kbm`.
- Replace text glyphs dynamically with SVG icons (`(L-STICK)`, `(A)`, `(RT)`).
- Complete the in-game key rebinding UI in `main.js` for custom movement key assignments (e.g. `ESDF`, AZERTY `ZQSD`).

---

## 6. Document Sign-Off & Change Approval

| Role | Name | Status | Timestamp |
| :--- | :--- | :--- | :--- |
| **Engine Architect** | Antigravity AI | Approved & Verified | 2026-08-17T20:47:00-07:00 |
| **Lead Gameplay Designer** | Caveman | Approved | 2026-08-17T20:44:09-07:00 |
| **QA / Automation** | Vitest / Playwright Suite | Passed (161/161 suites) | 2026-08-17T20:46:39-07:00 |
