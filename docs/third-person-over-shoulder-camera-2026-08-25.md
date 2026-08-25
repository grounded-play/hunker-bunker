# Third-person over-the-shoulder camera

## Ask

Evaluate whether Hunker Bunker's combat and exploration read better from a closer third-person camera, then ship a reversible vertical slice rather than permanently deleting the established isometric presentation.

## Product hypothesis

A shoulder camera should improve embodiment, weapon feedback, threat scale, and the value of the existing 3D operator/enemy models. The main costs are reduced situational awareness, tighter visibility in one-tile corridors, more demanding camera collision, and less certainty when clicking distant ground targets.

The initial release therefore makes **Third-person — Shoulder** the default gameplay camera and retains **Isometric — Classic** in Gameplay & Accessibility settings. Menu character presentation remains orthographic.

## Implemented slice

- 58-degree perspective gameplay camera, positioned closely behind and to the operator's right.
- Forward look-ahead so the operator occupies the lower-left shoulder composition instead of screen center.
- Wall raycast from the operator focus to the desired camera position. The camera pulls inward before a wall can occlude the operator.
- Fast damped follow plus existing camera shake.
- Perspective-aware resize and post-processing camera handoff.
- Existing screen-relative movement, world-space projectile simulation, mouse/controller aim raycasts, interactions, HUD projection, and classic camera fallback remain wired to the active camera.
- Persistent camera selector (`hb_camera_mode`).

## Control contract

### Third-person — Shoulder

- **Move:** WASD / left stick moves relative to the camera.
- **Turn and aim:** right stick turns the operator. The camera follows the same heading and continuously stays behind the operator; there is no separate camera orbit to manage.
- **Mouse:** point on the world to face that direction. Right-drag also turns the operator and trailing camera as a unit.
- **Fire:** left mouse / right trigger fires along the operator's facing direction. Controller play uses a stable center reticle rather than a second free-floating cursor.
- **Aim speed:** the existing Turn / Aim Speed setting scales third-person turning.

### Isometric — Classic

The prior independent tactical cursor, camera orbit, and aim behavior remain unchanged.

## Acceptance criteria

1. Gameplay uses a perspective shoulder view by default; menus retain their authored isometric showroom.
2. The operator remains visible and offset from center while moving and aiming.
3. Backing into a wall pulls the camera closer rather than putting the wall between camera and operator.
4. WASD/left-stick movement remains camera-relative, and projectiles still use the operator's world aim vector.
5. Mouse/controller reticle and interaction raycasts use the active perspective camera.
6. Switching to Isometric — Classic is immediate and persists across reloads.

## Follow-up playtest questions

- Does close-range combat remain legible with enemies approaching from behind?
- Do corridor walls force the camera inward often enough to feel claustrophobic or unstable?
- Should aiming temporarily tighten field of view or swap shoulders?
- Do tall props need transparency/fade in addition to camera collision?
- Does controller aiming want a fixed center reticle and pitch axis in a second iteration?

## Deliberately out of scope for this slice

This does not rewrite combat as a full twin-stick/third-person shooter. It preserves the current ground-plane aim model and virtual gamepad cursor so balance, projectile trajectories, interactions, multiplayer state, and input glyph work do not all change at once. A fixed-center reticle, vertical aim/pitch, lock-on, aim-down-sights, shoulder swap, and object-fade system should be evaluated after playtesting this camera framing.
