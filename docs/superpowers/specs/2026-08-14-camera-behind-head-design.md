# Behind-the-Head Orbit Camera — Design

**Date:** 2026-08-14
**Status:** Approved for implementation (confirmed with user via interactive design review)
**Scope:** Player aim, movement input mapping, and the gameplay camera. HUD
screen-space systems (compass, hit indicators) are touched only to keep them
correct against the new camera, not redesigned. Enemy/NPC facing logic,
menus, and cutscene camera paths are out of scope.

## Problem

The gameplay camera (`threeGame.js`) is a fixed-offset isometric camera:
`cameraOffset = (8, cameraLift, 8)` is a constant world-space vector added to
the player's position every frame (`updateCamera`, `threeGame.js:17215-17261`),
and the camera always `lookAt`s the player. It never rotates. Aim (mouse and
gamepad alike) is a free-point raycast: `updateAimFromClient` projects the
screen cursor position through the camera onto the y=0 ground plane and
points the player at that world point (`threeGame.js:4354-4372`). Gamepad
aim reuses the same path by driving a synthetic on-screen cursor from the
right stick (`main.js:1486-1519`).

The player wants the camera to rotate around the player to stay behind
whichever way they're aiming, so the room is visible in full 360° as they
turn — an over-the-shoulder third-person camera instead of a fixed
isometric one.

**Why free-point aim can't drive this camera.** Free-point aim only means
something *through a camera projection* — it raycasts a screen pixel onto
the ground. If that same camera is also the thing rotating to chase the
resulting aim direction, the system is circular: rotating the camera moves
the world point under a *stationary* mouse pixel, which changes the aim
direction, which rotates the camera further. Working through the geometry
(orthographic camera, ground-plane raycast, rotation about the vertical axis
through the player) shows this isn't a damping/tuning problem — for any
off-center screen point the loop produces a constant, undamped rotation rate;
the mouse can sit perfectly still and the camera spins forever. The only
mathematically stable configuration is the crosshair sitting dead-center,
which collapses free-point aiming into crosshair-locked aiming anyway. So a
rotating aim-following camera and free-point cursor-raycast aim are mutually
exclusive; this design picks the rotating camera and replaces free-point aim
with a coupled facing/aim/camera model, confirmed with the user.

## Goal

Introduce a single **facing yaw** that both mouse-delta (via pointer lock)
and the gamepad right stick drive directly — a source that does not depend
on the camera's own orientation, so there is no feedback loop. Movement,
aim direction, and the player's sprite facing all read this yaw instantly.
The camera orbits to sit behind it, eased for visual smoothness only (since
nothing reads the camera's position back into the yaw, the easing is pure
polish with zero control-lag risk).

## Architecture

```
mouse (pointer-locked movementX/Y)  ─┐
                                      ├─> facingYaw (radians, instant)
gamepad right-stick angle           ─┘         │
                                                ├─> aimDirX/Z = sin/cos(facingYaw)
                                                ├─> facingPlanarForward/Right (instant basis)
                                                │     ├─> movement axis conversion (WASD/left-stick)
                                                │     ├─> getFacingRow / getWorldDirectionForFacingRow (sprite octant)
                                                │     └─> fire/melee fallback direction
                                                │
                                                └─> cameraAzimuth (eased toward facingYaw + PI)
                                                      ├─> camera position (orbit at existing radius/height)
                                                      ├─> camera.lookAt(player)  [unchanged]
                                                      └─> cameraPlanarForward/Right (render basis)
                                                            ├─> HUD compass (getCampCompassState, getSpawnCompassState, planarAngleTo)
                                                            ├─> directional hit indicator
                                                            └─> player glow offset
```

Two planar bases now exist where there was one, because the codebase's
existing `cameraPlanarForward/Right` is consumed by two genuinely different
kinds of code:

- **Gameplay-relevant** (movement, aim, sprite facing row, fire/melee
  fallback direction) needs to track input *instantly* — third-person games
  don't lag movement responsiveness behind camera smoothing.
- **Screen-space HUD** (compass arrows, hit-direction indicator, glow
  offset) needs to match what's actually *rendered*, i.e. the real,
  currently-eased camera orientation.

So `facingPlanarForward/Right` (new, derived from `facingYaw` every frame,
zero lag) takes over the gameplay call sites, and `cameraPlanarForward/Right`
(existing name kept, but now derived from the live `cameraAzimuth` instead
of a static constant) continues to serve the HUD call sites unchanged.

## Detailed design

### 1. `facingYaw` and derived aim

New state: `this.facingYaw` (radians), initialized to match today's default
aim direction so nothing visually jumps on load. `aimDirX = Math.sin(facingYaw)`,
`aimDirZ = Math.cos(facingYaw)`, matching the `atan2(x, z)` convention already
used elsewhere in the file (flashlight cone, `player3dOverlay.js`).

This replaces the raycast-derived `aimDirX/aimDirZ` for the gameplay firing
path. `hasActiveAim` becomes always-true during gameplay (facing yaw always
has a value) — the existing idle-decay machinery (`mouseAimActive`,
`_aimResetTimer`, the per-frame re-aim in `updateWeaponState`,
`threeGame.js:16443-16460`) is deleted rather than adapted: there is no more
concept of aim "expiring" back to movement-direction, because facing *is*
aim now, always.

`getWorldAimPoint`/`updateAimFromClient` are **not deleted** — they remain
exactly as-is for the non-gameplay pointer interactions that call
`getWorldAimPoint` directly (console/O2/foundry/black-box pointer targets,
`threeGame.js:7049,7095,7132,7148,7156`), which are unrelated to combat aim
and unaffected by this change. Only the gameplay-firing call sites of
`updateAimFromClient` (`handleCanvasPointerDown`, `handleCanvasPointerMove`,
`tryFireWeapon`) are removed/replaced.

### 2. Mouse input (pointer lock)

- On first pointer-down on the gameplay canvas while gameplay input is
  active (`isGameplayInputActive()`), call
  `this.renderer.domElement.requestPointerLock()`.
- `pointerlockchange`/`pointerlockerror` listeners track lock state on
  `this._pointerLocked`.
- While locked, a `mousemove` listener reads `event.movementX` and applies
  `this.facingYaw -= event.movementX * MOUSE_SENSITIVITY` (a new constant,
  starting value `0.0025`, tunable during playtest), wrapped into
  `(-Math.PI, Math.PI]` via a small `wrapAngle` helper. No pitch — camera
  height/tilt stays fixed as today, this is yaw-only.
- Losing lock (Esc, tab-out) shows the existing `hud-action-prompt`-style
  overlay pattern (reusing the DOM/CSS convention at `index.html:1101-1141`,
  not a new modal system) prompting "click to look around"; gameplay
  continues to function without lock (facing yaw simply stops updating from
  mouse — gamepad/last known yaw still works), so losing lock is never a
  hard blocker.
- Pointer lock is only requested while `isGameplayInputActive()` is true,
  and is explicitly released (`document.exitPointerLock()`) whenever a
  blocking overlay from `hasBlockingGameplayOverlay()`
  (`threeGame.js:4749-4776`) opens, so menus/dialogue/cutscenes keep a
  normal cursor.
- The old absolute-cursor gameplay-aim call sites in
  `handleCanvasPointerDown`/`handleCanvasPointerMove` are removed; pointer
  events there continue to handle non-aim concerns (melee trigger on
  right-click, held-fire trigger on left-click/tap, existing console/O2/
  foundry/black-box pointer interactions) unchanged.

### 3. Gamepad input (right stick)

In `main.js`'s `handleSteamGameplayInput` (~1486-1519), replace the
virtual-cursor-move-then-raycast path with a direct read: when the right
stick's magnitude exceeds the existing deadzone
(`BROWSER_GAMEPAD_DEADZONE`, `browserGamepad.js`), set
`window.game.facingYaw = Math.atan2(stick.x, stick.y)` directly (instant
absolute angle — standard twin-stick convention, no accumulation). Below
the deadzone, `facingYaw` holds its last value (stick released = keep
facing, matching today's gamepad deadzone behavior elsewhere in the file).
`browserGamepad.js` itself needs no changes — it already exposes
`camera: {x, y}` right-stick axes; only the consumer in `main.js` changes.

The dead, never-called `setControllerAimVector` (`threeGame.js:4522-4556`)
is deleted — it was a scrapped alternate design for exactly this, now
superseded.

### 4. Camera orbit

New persistent state: `this.cameraAzimuth` (radians), initialized to match
today's fixed isometric angle (`Math.atan2(cameraOffset.x, cameraOffset.z)`)
so the starting view is unchanged.

Each frame in `updateCamera(delta)`:
1. `targetAzimuth = facingYaw + Math.PI` (camera sits opposite the facing
   direction — behind the player).
2. Shortest-path angle ease: `cameraAzimuth += wrapAngle(targetAzimuth - cameraAzimuth) * (1 - Math.exp(-CAMERA_ROT_SPEED * delta))`, a new tunable constant (`CAMERA_ROT_SPEED`, starting value `4.0`, separate from and likely slower than the existing position-lerp rate of `7`).
3. Recompute the horizontal offset at the existing radius
   (`Math.hypot(8, 8) ≈ 11.31`) and existing `cameraLift` height:
   `cameraOffset = (radius * Math.sin(cameraAzimuth), cameraLift, radius * Math.cos(cameraAzimuth))`.
4. Existing position-lerp-to-target and `camera.lookAt(player.x, player.y+0.4, player.z)` logic (`threeGame.js:17215-17261`) is unchanged, just fed the new rotating offset instead of the old constant one. Camera-shake jitter and `snapCameraToPlayer` (teleports) are unchanged in behavior, just also need to snap `cameraAzimuth` directly to `targetAzimuth` (no easing) to match the existing snap semantics.
5. Recompute `cameraPlanarForward/Right` from `cameraAzimuth` (replacing today's one-time static computation at construction) — this keeps every HUD/screen-space consumer listed in the architecture diagram correct against the actually-rendered camera.

### 5. Movement

New `facingPlanarForward/Right`, recomputed every frame from `facingYaw`
(same sin/cos construction as `cameraPlanarForward/Right`, just sourced
from the instant yaw instead of the eased azimuth). `updatePlayer`'s
move-axis conversion (`threeGame.js:14874-14875`) switches from
`cameraPlanarRight/Forward` to `facingPlanarRight/Forward`. WASD/left-stick
now moves relative to the player's actual current facing (run-forward /
strafe / backpedal, the standard TPS scheme), fully decoupled from the
camera's eased visual catch-up.

### 6. Sprite facing row

`getFacingRow`/`getWorldDirectionForFacingRow`
(`threeGame.js:16332-16339, 16392-16401`) switch from
`cameraPlanarRight/Forward` to `facingPlanarRight/Forward`. Confirmed via
grep that `getFacingRow` is only ever called for the player's own
`aimFacingRow`/`currentFacingRow` (`threeGame.js:4367,4539,4600,5685,16294`)
— no enemy/NPC code path depends on it, so this repoint is isolated to the
player character's own torso/leg sprite selection, which should now track
facing yaw instantly (consistent with aim/movement above).

### 7. Fire/melee fallback direction

The fallback-direction reads in `fireWeaponAtCurrentAim`
(`threeGame.js:4595-4596`) and `triggerGameplayMelee`
(`threeGame.js:4632-4633`) switch from `cameraPlanarForward/Right` to
`facingPlanarForward/Right` for consistency — though in practice these
fallbacks become close to unreachable now that aim is always active
(§1), they're kept correct rather than left pointing at a basis that no
longer matches gameplay facing.

### 8. HUD / screen-space systems — unchanged mechanism, just now dynamic

`getCampCompassState`, `getSpawnCompassState`, `planarAngleTo`
(`threeGame.js:4939-4940, 4976-4977, 12748-12749`),
`showDirectionalHitIndicator` (`threeGame.js:13659,13665`), and the
`playerGlow` offset (`threeGame.js:14923,14925`) keep reading
`cameraPlanarForward/Right` exactly as today — no code changes needed at
these call sites beyond the fact that the basis they read is now
recomputed each frame from `cameraAzimuth` instead of being a one-time
constant, which is handled entirely in §4.

## Files touched

- `src/threeGame.js` — camera state/update, new `facingYaw`/`facingPlanarForward/Right`, pointer-lock setup and mouse handlers, deletion of idle-aim-decay machinery and `setControllerAimVector`, `getFacingRow`/`getWorldDirectionForFacingRow`/movement/fire-fallback basis repoints.
- `main.js` — `handleSteamGameplayInput` right-stick handling (~1486-1519): direct yaw write instead of virtual-cursor-move-and-raycast.
- `index.html` — one new `hud-action-prompt`-style element for the pointer-lock prompt, following the existing markup convention.
- `tests/e2e/gameplay-aim-cursor.spec.js` — rewritten; it currently exercises absolute-cursor aim, which no longer exists on the gameplay path. New coverage drives `facingYaw` via simulated `mousemove` deltas after a simulated pointer-lock click, and via direct gamepad-stick-angle assertions.

## Testing / verification

- Existing Playwright e2e suite run in full; `gameplay-aim-cursor.spec.js` rewritten as above; other suites (boot, movement, combat) checked for incidental dependence on the old fixed camera angle or absolute-cursor aim.
- Manual playtest: mouse-look feels responsive (no camera-lag on movement), camera eases smoothly behind facing without jitter at the ±π wrap boundary, gamepad right-stick gives instant facing with left-stick strafing, HUD compass/hit-indicators stay visually correct as the camera orbits, sprite octant selection looks coherent from behind at all facing angles.

## Out of scope

Enemy/NPC facing and sprite selection, menu/cutscene camera behavior,
mouse-sensitivity settings UI (hardcoded constant for now, per YAGNI),
camera pitch/zoom controls (yaw-only orbit, matching the literal ask).
