# Gameplay Movement & Controls Standard Specification

**Document Version:** 2.2.0  
**Status:** Approved & Implemented Architectural Standard  
**Last Updated:** 2026-08-17  
**Applies To:** Core Player Controller, Input Pipeline, Isometric Camera, Locomotion Physics, 2D/3D Dual-Layer Animation, Gamepad/KBM Parity  

---

## 1. Architectural Overview & Design Philosophy

*Hunker Bunker* is a high-stakes, tactical survival shooter set in an atmospheric, procedural underground research facility. Gameplay balances intense resource scarcity (oxygen, ammunition, health) with fast-paced tactical combat against biomechanical threats.

The core locomotion model is built upon the **Decoupled Twin-Stick Standard**:
- **Locomotion (WASD / Left Stick):** Directly moves the operator relative to the screen and camera viewport.
- **Combat Posture & Aim (Mouse Cursor / Right Stick):** Freely directs weapon aim, flashlight illumination, and upper-body orientation in 360° without altering the movement vector.

```
+---------------------------------------------------------------------------------------+
|                                    INPUT SUBSYSTEM                                    |
|   Keyboard (WASD/Arrows)  Touch Joystick   Gamepad Left Stick   Mouse Cursor   Gamepad Right Stick |
+---------------------------+------------------------------------+--------------+-------------------+
                            |                                                   |
                            v                                                   v
           +----------------------------------+               +----------------------------------+
           |     LOCOMOTION PIPELINE          |               |         AIM PIPELINE             |
           | • Raw input vector (Ax, Az)      |               | • World raycast / stick angle    |
           | • Screen-to-World Camera Basis   |               | • Aim vector (aimDirX, aimDirZ)  |
           | • Vector Normalization (1.0x)    |               | • Facing yaw & Octant resolver   |
           | • Speed multipliers & status     |               | • Upper-body spine / torso angle |
           | • Per-axis collision & slide     |               | • Flashlight & projectile path   |
           +----------------------------------+               +----------------------------------+
                            |                                                   |
                            +--------------------+------------------------------+
                                                 |
                                                 v
                               +----------------------------------+
                               |     RENDER & ANIMATION MESH      |
                               | • Lower Body: Walk cycle (Move)  |
                               | • Upper Body: Aim posture (Aim)  |
                               | • Tactical Camera: Smooth Lerp   |
                               +----------------------------------+
```

---

## 2. Historic Problem Teardown & Root Cause Analysis

### 2.1 The "Behind-the-Head" Experiment
During earlier feature iterations, an attempt was made to introduce a third-person "behind-the-head orbit camera" model. This system coupled character locomotion to the player's facing yaw (`facingYaw`) and instructed the camera azimuth to chase that yaw with exponential smoothing:

$$\theta_{\text{cam}} \gets \text{stepAngleTowards}(\theta_{\text{cam}}, \theta_{\text{aim}} + \pi, \omega_{\text{rot}}, \Delta t)$$

$$\vec{M}_{\text{world}} = \mathbf{R}(\theta_{\text{aim}} + \pi) \cdot \vec{M}_{\text{input}}$$

### 2.2 Mathematical & Mechanical Defects
This produced three critical gameplay breakdowns:

1. **Coupled Movement & Crosshair Direction:**
   Because `facingYaw` was derived from screen-space mouse raycasting, pressing `W` (intended as "Move Up on Screen") caused the character to walk towards the cursor. If an operator aimed at an enemy approaching from the East while attempting to back away, pressing `S` directed the character towards the enemy, destroying kiting ability.

2. **The Rotational Circular Feedback Loop:**
   Mouse raycasting calculates world-space hit points through the camera projection matrix:
   $$\vec{P}_{\text{world\_aim}} = \operatorname{Raycast}(\text{Cursor}_{\text{ndc}}, \mathbf{M}_{\text{cam\_proj}})$$
   As the camera rotated to follow $\theta_{\text{aim}}$, the terrain under a stationary mouse cursor shifted across the viewport. This caused the raycast hit point to drift, altering $\theta_{\text{aim}}$, which induced further camera rotation. The system acted as an undamped positive feedback oscillator, producing severe camera spinning, vertigo, and control inversion.

3. **Camera Lag vs. Input Disconnect:**
   Because the camera rotated with an easing delay ($\omega_{\text{rot}} = 4.0\text{ rad/s}$), the on-screen visual frame was constantly skewed relative to the player's instant facing yaw. The player lost all sense of cardinal orientation inside complex procedural bunker corridors.

---

## 3. Coordinate Systems & Mathematical Specification

### 3.1 World & Camera Coordinate Reference Frames

- **World Space $(X, Y, Z)$:**
  - $+X$: World East
  - $-X$: World West
  - $+Y$: World Up (Vertical altitude)
  - $+Z$: World South
  - $-Z$: World North
- **Camera Configuration:**
  - Fixed isometric viewpoint at offset $(X_{\text{off}}, Y_{\text{off}}, Z_{\text{off}}) = (8.0, 10.0, 8.0)$ relative to the player anchor.
  - Orbit Radius: $R_{\text{orbit}} = \sqrt{8^2 + 8^2} = \sqrt{128} \approx 11.3137\text{ m}$.
  - Camera Azimuth: $\theta_{\text{azimuth}} = \operatorname{atan2}(8, 8) = \frac{\pi}{4}\text{ rad } (45^\circ)$.
  - Look-at Target: Player center of mass $(P_x, P_y + 0.4, P_z)$.

### 3.2 Planar Basis Vectors
On the horizontal gameplay plane ($Y = 0$), the screen-aligned camera projection vectors are defined by:

$$\vec{F}_{\text{cam}} = \begin{pmatrix} -\sin(\theta_{\text{azimuth}}) \\ -\cos(\theta_{\text{azimuth}}) \end{pmatrix} = \begin{pmatrix} -\frac{1}{\sqrt{2}} \\ -\frac{1}{\sqrt{2}} \end{pmatrix} \approx \begin{pmatrix} -0.7071 \\ -0.7071 \end{pmatrix} \quad (\text{Screen UP})$$

$$\vec{R}_{\text{cam}} = \begin{pmatrix} -\vec{F}_{\text{cam}, y} \\ \vec{F}_{\text{cam}, x} \end{pmatrix} = \begin{pmatrix} \frac{1}{\sqrt{2}} \\ -\frac{1}{\sqrt{2}} \end{pmatrix} \approx \begin{pmatrix} +0.7071 \\ -0.7071 \end{pmatrix} \quad (\text{Screen RIGHT})$$

### 3.3 Movement Transform Equation
Given raw screen axes $A_x \in [-1, 1]$ (Right $-$ Left) and $A_z \in [-1, 1]$ (Down $-$ Up):

$$\vec{M}_{\text{raw}} = A_x \cdot \vec{R}_{\text{cam}} + (-A_z) \cdot \vec{F}_{\text{cam}}$$

$$\vec{V}_{\text{final}} = \begin{cases} 
\frac{\vec{M}_{\text{raw}}}{\|\vec{M}_{\text{raw}}\|} \cdot v_{\text{speed}} \cdot \Delta t & \text{if } \|\vec{M}_{\text{raw}}\| > 0 \\ 
\vec{0} & \text{otherwise} 
\end{cases}$$

### 3.4 Cardinal & Diagonal Input Matrix

| Input Key(s) | Screen Input Vector $(A_x, A_z)$ | Normalized World Vector $\vec{M}$ | Compass Direction | Screen Motion |
| :--- | :--- | :--- | :--- | :--- |
| **`W` / Up** | $(0, -1)$ | $(-0.7071, -0.7071)$ | North-West in World | Straight **UP** |
| **`S` / Down** | $(0, +1)$ | $(+0.7071, +0.7071)$ | South-East in World | Straight **DOWN** |
| **`A` / Left** | $(-1, 0)$ | $(-0.7071, +0.7071)$ | South-West in World | Straight **LEFT** |
| **`D` / Right** | $(+1, 0)$ | $(+0.7071, -0.7071)$ | North-East in World | Straight **RIGHT** |
| **`W + D`** | $(+1, -1)$ | $(0, -1.0000)$ | True North in World | Diagonal **UP-RIGHT** |
| **`W + A`** | $(-1, -1)$ | $(-1.0000, 0)$ | True West in World | Diagonal **UP-LEFT** |
| **`S + D`** | $(+1, +1)$ | $(+1.0000, 0)$ | True East in World | Diagonal **DOWN-RIGHT** |
| **`S + A`** | $(-1, +1)$ | $(0, +1.0000)$ | True South in World | Diagonal **DOWN-LEFT** |

---

## 4. Locomotion Physics, Collisions & Modifiers

### 4.1 Speed Modifiers & Stacking Rules
Base character speed $v_{\text{base}}$ is determined by class identity ($3.6\text{ m/s}$ for Tank, $4.2\text{ m/s}$ for Scout, $3.8\text{ m/s}$ for Engineer).

Speed multipliers apply multiplicatively/additively according to the following precedence:
1. **Sprint Multiplier ($\mu_{\text{sprint}}$):** $1.40\times$ base speed when holding `Shift` / Left Stick Click (consumes $O_2$ at $1.2\times$ rate).
2. **Adrenaline Perk ($\mu_{\text{perk}}$):** $+10\%$ bonus ($1.10\times$) when `vesper_vanguard_adrenaline` is active.
3. **Hazard Slowdown ($\mu_{\text{slow}}$):** $-45\%$ penalty ($0.55\times$) during Cryo/Spore status debuffs. (Sprint overrides slow duration upon active trigger).

$$v_{\text{effective}} = v_{\text{base}} \cdot \mu_{\text{sprint}} \cdot \mu_{\text{perk}} \cdot \mu_{\text{slow}}$$

### 4.2 Axis-Aligned Collision & Wall Sliding
To ensure smooth traversal through claustrophobic procedural corridors and tight bunker bulkheads:

```javascript
const current = this.player.position.clone();
const nextX = new THREE.Vector3(current.x + moveVector.x, current.y, current.z);
const nextZ = new THREE.Vector3(current.x, current.y, current.z + moveVector.z);

// Per-axis occupancy test prevents corner snagging
if (this.canOccupyPosition(nextX.x, nextX.z)) {
    this.player.position.x = nextX.x;
}
if (this.canOccupyPosition(nextZ.x, nextZ.z)) {
    this.player.position.z = nextZ.z;
}
```

If an operator moves diagonally into a cardinal wall, the blocked axis drops to zero while the unblocked axis continues at full speed, producing seamless wall sliding without snagging or deceleration.

---

## 5. Dual-Layer Animation & Rendering Contracts

The game features dual render modes: legacy 2D 8-directional sprite sheets and modern 3D rigged Mixamo mesh overlays (`src/player3dOverlay.js`).

### 5.1 2D Sprite Octant Quantization
For 2D rendering, the world movement vector and aim vector are independently projected into screen-space octants via `getDirectionIndexFromWorldVector`:

```
                    Screen UP (Row 2)
                           ▲
             (Row 1)  NW   │   NE (Row 3)
                        \  │  /
                         \ │ /
     Screen LEFT ──────────┼────────── Screen RIGHT
       (Row 0)           / │ \         (Row 4)
                        /  │  \
             (Row 7) SW    │   SE (Row 5)
                           ▼
                   Screen DOWN (Row 6)
```

- **Lower Body (Legs):** Rendered using `currentFacingRow = getFacingRow(moveDirX, moveDirZ)` when `isMoving === true`.
- **Upper Body (Torso):** Rendered using `torsoFacingRow = aimFacingRow` when `hasActiveAim === true`.

### 5.2 3D Skeletal Mesh Multi-Axis Blending
For rigged 3D models (`Scout.game.glb`, `tank-rigged.glb`, `engineer-rigged-gestures.glb`):
- Root armature rotates towards movement direction $\vec{M}$.
- Spine bones (`Spine`, `Spine1`, `Spine2`) blend turning angles towards $\vec{D}_{\text{aim}}$ up to a maximum torsion limit of $\pm 85^\circ$.
- Leg locomotion blend trees execute forward walk, strafe-left, strafe-right, or backpedal walk cycles depending on the angle difference $\Delta \theta = \theta_{\text{aim}} - \theta_{\text{move}}$.

---

## 6. Combat Verbs & Movement Interactions

### 6.1 Tactical Dash
- **Trigger:** Tap `Shift` (Keyboard) / `B` button / `LB` (Gamepad).
- **Duration:** $0.22\text{ s}$ burst duration, $1.10\text{ s}$ cooldown.
- **Invulnerability Frames (i-Frames):** $0.25\text{ s}$ complete damage mitigation.
- **Directional Priority:**
  1. If any movement keys ($W, A, S, D$) or left stick inputs are active, dash travels in the **screen-space movement direction**.
  2. If stationary, dash travels in the **crosshair aim direction**.

### 6.2 Manual Smash / Melee
- **Trigger:** Right Mouse Button (`RMB`) / `Space` / `RB` (Gamepad).
- **Execution:** Instant $180^\circ$ frontal arc cone check ($2.2\text{ m}$ radius) in the aim direction $\vec{D}_{\text{aim}}$ with micro-lunge impulse $(+0.5\text{ m})$.

---

## 7. Quality Assurance & Continuous Integration Matrix

Every build pipeline must pass the following validation suites in Vitest and Playwright:

| Test Suite | File | Verified Invariant |
| :--- | :--- | :--- |
| **WASD Cardinal Screen Motion** | `src/threeGame.combatMovement.test.js` | Pressing `W` yields $\Delta X < 0, \Delta Z < 0$ along $\vec{F}_{\text{cam}}$ |
| **Diagonal Normalization** | `src/threeGame.combatMovement.test.js` | $\|\vec{V}_{\text{diagonal}}\| = \|\vec{V}_{\text{cardinal}}\| = v_{\text{speed}} \cdot \Delta t$ |
| **True Kiting Independence** | `src/threeGame.combatMovement.test.js` | Moving South while aiming North maintains true South movement |
| **Dash Directional Parity** | `src/threeGame.combatMovement.test.js` | Dash vector mirrors active WASD keys over aim fallback |
| **Camera Basis Stability** | `src/threeGame.facingYaw.test.js` | `updateCamera` preserves fixed $\theta_{\text{azimuth}}$ without yaw feedback |
| **End-to-End Control Invariance** | `tests/e2e/keyboard-controls.spec.js` | Browser input events correctly drive player position across ticks |
