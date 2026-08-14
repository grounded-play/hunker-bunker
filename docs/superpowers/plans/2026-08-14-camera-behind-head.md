# Behind-the-Head Orbit Camera Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed isometric gameplay camera with an over-the-shoulder
camera that orbits to stay behind the player's facing direction, driven by a
single `facingYaw` that pointer-locked mouse deltas and the gamepad right
stick both feed directly — with movement, aim, and sprite facing reading that
yaw instantly, and the camera itself easing toward it purely for visual
smoothness.

**Architecture:** A new pure-math module (`src/cameraYaw.js`) provides
angle-wrapping, angle-easing, and yaw-to-basis conversion. `ThreeGame` gains
`facingYaw` (instant, input-driven) and `cameraAzimuth` (eased, camera-only)
plus two derived 2D bases — `facingPlanarForward/Right` for gameplay
(movement, aim, sprite facing) and `cameraPlanarForward/Right` (unchanged
name, now dynamic) for screen-space HUD systems. Mouse input switches from
absolute-cursor raycasting to pointer-lock relative deltas; gamepad right
stick switches from driving a virtual cursor to setting yaw directly.

**Tech Stack:** Vanilla JS, Three.js, Vitest (`*.test.js`, prototype-call
mocking pattern already used throughout `src/threeGame.*.test.js`),
Playwright (`tests/e2e/*.spec.js`).

**Spec:** `docs/superpowers/specs/2026-08-14-camera-behind-head-design.md`

## Global Constraints

- Yaw-only camera (no pitch/zoom) — matches the literal ask.
- Movement/aim/sprite-facing must be instantly responsive to input; only the
  camera's own position/orientation is allowed to lag (eased).
- `getWorldAimPoint`/`updateAimFromClient` remain unchanged and still power
  the non-combat pointer interactions (console/O2/foundry/black-box) — only
  their *gameplay-firing* call sites are removed.
- No settings UI for sensitivity — hardcoded tunable constants (YAGNI).
- Follow existing repo conventions: Vitest unit tests colocated as
  `*.test.js` next to the file under test, testing via
  `ThreeGame.prototype.method.call(mockObject, ...)` against a minimal mock,
  exactly as `src/threeGame.combatMovement.test.js` already does.

---

## File Structure

- **Create** `src/cameraYaw.js` — pure yaw/basis math, no THREE.js
  dependency, fully unit-testable in isolation.
- **Create** `src/cameraYaw.test.js` — unit tests for the above.
- **Modify** `src/threeGame.js` — camera state/update, facing-yaw state,
  pointer-lock input wiring, movement/facing/fire-fallback basis repoints,
  idle-aim-decay removal.
- **Create** `src/threeGame.facingYaw.test.js` — prototype-call unit tests
  for `updateFacingYaw`, `getFacingRow`, `getWorldDirectionForFacingRow`,
  and the camera azimuth easing in `updateCamera`/`snapCameraToPlayer`.
- **Modify** `main.js` — gamepad right-stick and trackpad/gyro-delta aim
  paths, both repointed from cursor+raycast to direct yaw.
- **Modify** `index.html` — one pointer-lock prompt element (reusing the
  existing `hud-action-prompt` markup convention) and one fixed-center
  gameplay crosshair element.
- **Modify** `tests/e2e/gameplay-aim-cursor.spec.js` — rewritten for
  pointer-lock mouse-delta and gamepad-yaw flows; the old absolute-cursor
  behavior it tests no longer exists on the gameplay path.

---

### Task 1: Pure yaw/basis math module

**Files:**
- Create: `src/cameraYaw.js`
- Test: `src/cameraYaw.test.js`

**Interfaces:**
- Produces: `wrapAngle(angle): number`, `stepAngleTowards(current, target, rate, delta): number`, `planarBasisFromOffsetAzimuth(azimuth): { forward: {x,y}, right: {x,y} }`, `aimVectorFromYaw(yaw): {x, z}` — all consumed by Task 2+ in `threeGame.js`.

- [ ] **Step 1: Write the failing tests**

```js
// src/cameraYaw.test.js
import { describe, expect, it } from 'vitest';
import { wrapAngle, stepAngleTowards, planarBasisFromOffsetAzimuth, aimVectorFromYaw } from './cameraYaw.js';

describe('wrapAngle', () => {
    it('leaves angles already in (-PI, PI] untouched', () => {
        expect(wrapAngle(0.5)).toBeCloseTo(0.5, 10);
        expect(wrapAngle(Math.PI)).toBeCloseTo(Math.PI, 10);
    });

    it('wraps angles outside the range back into it', () => {
        expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 5);
        expect(wrapAngle(-Math.PI * 3)).toBeCloseTo(Math.PI, 5);
        expect(wrapAngle(Math.PI * 2 + 0.1)).toBeCloseTo(0.1, 5);
    });
});

describe('stepAngleTowards', () => {
    it('eases along the shorter arc, never overshooting the target', () => {
        const result = stepAngleTowards(0, Math.PI / 2, 4, 0.1);
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThan(Math.PI / 2);
    });

    it('crosses the +-PI boundary via the short way, not the long way', () => {
        // current just past +PI-ish, target just past -PI-ish: shortest arc is forward, not a big backward sweep.
        const result = stepAngleTowards(Math.PI - 0.1, -Math.PI + 0.1, 4, 0.1);
        expect(result).toBeGreaterThan(Math.PI - 0.1);
    });

    it('converges to the target over many steps', () => {
        let angle = 0;
        for (let i = 0; i < 500; i += 1) {
            angle = stepAngleTowards(angle, Math.PI / 2, 4, 0.016);
        }
        expect(angle).toBeCloseTo(Math.PI / 2, 3);
    });
});

describe('planarBasisFromOffsetAzimuth', () => {
    it('reproduces the legacy fixed isometric basis for azimuth = atan2(8, 8)', () => {
        const azimuth = Math.atan2(8, 8);
        const { forward, right } = planarBasisFromOffsetAzimuth(azimuth);
        expect(forward.x).toBeCloseTo(-0.70710678, 5);
        expect(forward.y).toBeCloseTo(-0.70710678, 5);
        expect(right.x).toBeCloseTo(0.70710678, 5);
        expect(right.y).toBeCloseTo(-0.70710678, 5);
    });

    it('keeps forward and right perpendicular and unit-length for an arbitrary azimuth', () => {
        const { forward, right } = planarBasisFromOffsetAzimuth(1.234);
        expect(Math.hypot(forward.x, forward.y)).toBeCloseTo(1, 5);
        expect(Math.hypot(right.x, right.y)).toBeCloseTo(1, 5);
        expect(forward.x * right.x + forward.y * right.y).toBeCloseTo(0, 5);
    });
});

describe('aimVectorFromYaw', () => {
    it('matches the legacy default aim direction (aimDirX=1, aimDirZ=0) at yaw = PI/2', () => {
        const { x, z } = aimVectorFromYaw(Math.PI / 2);
        expect(x).toBeCloseTo(1, 5);
        expect(z).toBeCloseTo(0, 5);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/cameraYaw.test.js`
Expected: FAIL — `Cannot find module './cameraYaw.js'`

- [ ] **Step 3: Write the implementation**

```js
// src/cameraYaw.js

export function wrapAngle(angle) {
    let a = angle % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    return a;
}

export function stepAngleTowards(current, target, rate, delta) {
    const diff = wrapAngle(target - current);
    const t = 1 - Math.exp(-rate * delta);
    return wrapAngle(current + diff * t);
}

export function planarBasisFromOffsetAzimuth(offsetAzimuth) {
    const offsetX = Math.sin(offsetAzimuth);
    const offsetY = Math.cos(offsetAzimuth);
    const forward = { x: -offsetX, y: -offsetY };
    const right = { x: -forward.y, y: forward.x };
    return { forward, right };
}

export function aimVectorFromYaw(yaw) {
    return { x: Math.sin(yaw), z: Math.cos(yaw) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/cameraYaw.test.js`
Expected: PASS (all 8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/cameraYaw.js src/cameraYaw.test.js
git commit -m "feat: add pure yaw/basis math for the orbit camera"
```

---

### Task 2: `facingYaw` state and `updateFacingYaw()` on ThreeGame

**Files:**
- Modify: `src/threeGame.js:1049-1052` (camera basis construction), `src/threeGame.js:1166` (`hasActiveAim` init), `src/threeGame.js:4787-4790`, `src/threeGame.js:13789-13791` (input-reset blocks)
- Test: Create `src/threeGame.facingYaw.test.js`

**Interfaces:**
- Consumes: `wrapAngle`, `planarBasisFromOffsetAzimuth`, `aimVectorFromYaw` from `./cameraYaw.js` (Task 1).
- Produces: `this.facingYaw` (number, radians), `this.cameraAzimuth` (number, radians), `this.cameraOrbitRadius` (number), `this.facingPlanarForward`/`this.facingPlanarRight` (`THREE.Vector2`), `this.updateFacingYaw(yaw)` (method) — consumed by Task 3 (camera), Task 4 (movement/facing row), Task 5 (mouse), Task 7 (gamepad).

- [ ] **Step 1: Write the failing test**

```js
// src/threeGame.facingYaw.test.js
import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('updateFacingYaw', () => {
    it('derives aim direction and facing basis from yaw, and marks aim active', () => {
        const game = {
            facingPlanarForward: { set: vi.fn() },
            facingPlanarRight: { set: vi.fn() },
            getFacingRow: vi.fn(() => 3),
            hasActiveAim: false
        };

        ThreeGame.prototype.updateFacingYaw.call(game, Math.PI / 2);

        expect(game.facingYaw).toBeCloseTo(Math.PI / 2, 5);
        expect(game.aimDirX).toBeCloseTo(1, 5);
        expect(game.aimDirZ).toBeCloseTo(0, 5);
        const forwardArgs = game.facingPlanarForward.set.mock.calls[0];
        expect(forwardArgs[0]).toBeCloseTo(1, 5);
        expect(forwardArgs[1]).toBeCloseTo(0, 5);
        expect(game.getFacingRow).toHaveBeenCalledWith(game.aimDirX, game.aimDirZ);
        expect(game.aimFacingRow).toBe(3);
        expect(game.hasActiveAim).toBe(true);
    });

    it('wraps yaw into (-PI, PI]', () => {
        const game = {
            facingPlanarForward: { set: vi.fn() },
            facingPlanarRight: { set: vi.fn() },
            getFacingRow: vi.fn(() => 0)
        };

        ThreeGame.prototype.updateFacingYaw.call(game, Math.PI * 3);

        expect(game.facingYaw).toBeCloseTo(Math.PI, 5);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/threeGame.facingYaw.test.js`
Expected: FAIL — `game.updateFacingYaw is not a function` (`ThreeGame.prototype.updateFacingYaw` is undefined)

- [ ] **Step 3: Implement**

Add the import near the top of `src/threeGame.js`, immediately after the existing `import { assetUrl } from './assetUrl.js';` line:

```js
import { wrapAngle, planarBasisFromOffsetAzimuth, aimVectorFromYaw } from './cameraYaw.js';
```

(Only these three — `stepAngleTowards` isn't used until Task 3's `updateCamera`, and this project's `npm run lint` fails the build on unused imports, so each task's commit must only import what it actually uses. Task 3 adds `stepAngleTowards` to this same import line when it needs it.)

Do not add `CAMERA_ROT_SPEED`/`MOUSE_LOOK_SENSITIVITY` yet — same reason: they're unused until Task 3 and Task 5 respectively. Task 3 adds `CAMERA_ROT_SPEED`; Task 5 adds `MOUSE_LOOK_SENSITIVITY`. Skip straight to the camera-basis block below.

Replace the camera-basis construction block (current lines 1049-1052):

```js
        this.cameraLift = 10;
        this.cameraOffset = new THREE.Vector3(8, this.cameraLift, 8);
        this.cameraPlanarForward = new THREE.Vector2(-this.cameraOffset.x, -this.cameraOffset.z).normalize();
        this.cameraPlanarRight = new THREE.Vector2(-this.cameraPlanarForward.y, this.cameraPlanarForward.x).normalize();
```

with:

```js
        this.cameraLift = 10;
        this.cameraOrbitRadius = Math.hypot(8, 8);
        this.cameraAzimuth = Math.atan2(8, 8);
        this.cameraOffset = new THREE.Vector3(
            this.cameraOrbitRadius * Math.sin(this.cameraAzimuth),
            this.cameraLift,
            this.cameraOrbitRadius * Math.cos(this.cameraAzimuth)
        );
        const initialCameraBasis = planarBasisFromOffsetAzimuth(this.cameraAzimuth);
        this.cameraPlanarForward = new THREE.Vector2(initialCameraBasis.forward.x, initialCameraBasis.forward.y);
        this.cameraPlanarRight = new THREE.Vector2(initialCameraBasis.right.x, initialCameraBasis.right.y);
        this.facingPlanarForward = new THREE.Vector2(0, 0);
        this.facingPlanarRight = new THREE.Vector2(0, 0);
        this.updateFacingYaw(Math.PI / 2);
```

(`Math.PI / 2` reproduces the legacy default aim direction `aimDirX=1, aimDirZ=0` — verified in Task 1's tests.)

Change the `hasActiveAim` init at the current line 1166 from `this.hasActiveAim = false;` to a comment-free removal — delete that line entirely, since `updateFacingYaw` (called above, during construction) now sets it.

Remove the line `this.hasActiveAim = false;` from the two input-reset blocks (current lines 4788 and 13790) — leave every other line in those blocks (`mouseAimActive`, `_aimResetTimer`, etc.) untouched for now; they're cleaned up in Task 4.

Add the new method anywhere among the other `updateAimFromClient`-adjacent methods (e.g. directly above `getWorldAimPoint`):

```js
    updateFacingYaw(yaw) {
        this.facingYaw = wrapAngle(yaw);
        const aim = aimVectorFromYaw(this.facingYaw);
        this.aimDirX = aim.x;
        this.aimDirZ = aim.z;
        const basis = planarBasisFromOffsetAzimuth(this.facingYaw + Math.PI);
        this.facingPlanarForward.set(basis.forward.x, basis.forward.y);
        this.facingPlanarRight.set(basis.right.x, basis.right.y);
        this.aimFacingRow = this.getFacingRow(this.aimDirX, this.aimDirZ);
        this.hasActiveAim = true;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/threeGame.facingYaw.test.js`
Expected: PASS (both tests)

- [ ] **Step 5: Run the full unit suite to check nothing else broke**

Run: `npx vitest run`
Expected: PASS. (`getFacingRow` still reads `cameraPlanarRight/Forward` at this point — unchanged until Task 4 — so this is expected to be a no-op for existing tests.)

- [ ] **Step 6: Commit**

```bash
git add src/threeGame.js src/threeGame.facingYaw.test.js
git commit -m "feat: add facingYaw state driving aim direction and facing basis"
```

---

### Task 3: Camera orbit easing

**Files:**
- Modify: `src/threeGame.js:17215-17272` (`updateCamera`, `snapCameraToPlayer`)
- Test: Modify `src/threeGame.facingYaw.test.js`

**Interfaces:**
- Consumes: `stepAngleTowards`, `planarBasisFromOffsetAzimuth`, `wrapAngle` from `./cameraYaw.js` (Task 1); `this.facingYaw`, `this.cameraAzimuth`, `this.cameraOrbitRadius` (Task 2).
- Produces: `this.cameraAzimuth` now updates every frame; `this.cameraOffset`/`this.cameraPlanarForward`/`this.cameraPlanarRight` now track it. Nothing outside this task reads a new symbol.

- [ ] **Step 1: Write the failing test**

At the top of `src/threeGame.facingYaw.test.js`, add two more imports to the existing import block so it reads:

```js
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { wrapAngle } from './cameraYaw.js';
```

Then append to the file:

```js
describe('updateCamera orbit', () => {
    function makeCameraGame(facingYaw, cameraAzimuth) {
        return {
            facingYaw,
            cameraAzimuth,
            cameraOrbitRadius: Math.hypot(8, 8),
            cameraLift: 10,
            cameraOffset: new THREE.Vector3(),
            cameraPlanarForward: new THREE.Vector2(),
            cameraPlanarRight: new THREE.Vector2(),
            player: { position: new THREE.Vector3(0, 0, 0) },
            camera: {
                position: new THREE.Vector3(0, 10, 11.31),
                lookAt: () => {}
            },
            performanceProfile: 'gameplay',
            _menuParallaxX: 0,
            _menuParallaxY: 0,
            _cameraShakeTimer: 0,
            updateTiltShiftAndBokeh: () => {}
        };
    }

    it('eases cameraAzimuth toward facingYaw + PI without snapping instantly', () => {
        const game = makeCameraGame(0, Math.PI); // target = facingYaw+PI = PI, already equal on purpose for a baseline...
        game.facingYaw = Math.PI / 2; // now target = 3PI/2 (wrapped), azimuth starts at PI
        const before = game.cameraAzimuth;
        ThreeGame.prototype.updateCamera.call(game, 0.1);
        expect(game.cameraAzimuth).not.toBe(before);
        // one 0.1s step at CAMERA_ROT_SPEED=4 should not have fully arrived
        const target = wrapAngle(game.facingYaw + Math.PI);
        expect(Math.abs(wrapAngle(target - game.cameraAzimuth))).toBeGreaterThan(0.01);
    });

    it('converges over many frames and recomputes cameraOffset/basis to match', () => {
        const game = makeCameraGame(0, 0);
        game.facingYaw = Math.PI / 2;
        for (let i = 0; i < 300; i += 1) {
            ThreeGame.prototype.updateCamera.call(game, 0.016);
        }
        const target = wrapAngle(game.facingYaw + Math.PI);
        expect(game.cameraAzimuth).toBeCloseTo(target, 2);
        expect(game.cameraOffset.x).toBeCloseTo(game.cameraOrbitRadius * Math.sin(game.cameraAzimuth), 3);
        expect(game.cameraOffset.z).toBeCloseTo(game.cameraOrbitRadius * Math.cos(game.cameraAzimuth), 3);
    });
});

describe('snapCameraToPlayer orbit', () => {
    it('snaps cameraAzimuth instantly, with no easing lag', () => {
        const game = {
            facingYaw: Math.PI / 2,
            cameraAzimuth: 0,
            cameraOrbitRadius: Math.hypot(8, 8),
            cameraLift: 10,
            cameraOffset: new THREE.Vector3(),
            cameraPlanarForward: new THREE.Vector2(),
            cameraPlanarRight: new THREE.Vector2(),
            player: { position: new THREE.Vector3(1, 0, 2) },
            camera: { position: new THREE.Vector3(), lookAt: () => {} },
            updateTiltShiftAndBokeh: () => {}
        };

        ThreeGame.prototype.snapCameraToPlayer.call(game);

        expect(game.cameraAzimuth).toBeCloseTo(wrapAngle(Math.PI / 2 + Math.PI), 5);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/threeGame.facingYaw.test.js`
Expected: FAIL — `cameraAzimuth` stays at its initial value (updateCamera doesn't touch it yet).

- [ ] **Step 3: Implement**

First, add `stepAngleTowards` to the `cameraYaw.js` import Task 2 added near the top of `src/threeGame.js` (it currently reads `import { wrapAngle, planarBasisFromOffsetAzimuth, aimVectorFromYaw } from './cameraYaw.js';` — add `stepAngleTowards` to that list). Then add `const CAMERA_ROT_SPEED = 4.0;` on its own line immediately before `export class ThreeGame {`, right after the existing `const keyedSpriteTextureCache = new Map();` line. This project's `npm run lint` fails the build on unused symbols, so this constant must land in the same commit as its first use, below.

Replace the top of `updateCamera` (current lines 17215-17220) — insert the azimuth-easing block before the existing `target` construction, and change `target` to use the freshly recomputed `this.cameraOffset`:

```js
    updateCamera(delta) {
        const targetAzimuth = this.facingYaw + Math.PI;
        this.cameraAzimuth = stepAngleTowards(this.cameraAzimuth, targetAzimuth, CAMERA_ROT_SPEED, delta);
        const camBasis = planarBasisFromOffsetAzimuth(this.cameraAzimuth);
        this.cameraPlanarForward.set(camBasis.forward.x, camBasis.forward.y);
        this.cameraPlanarRight.set(camBasis.right.x, camBasis.right.y);
        this.cameraOffset.set(
            this.cameraOrbitRadius * Math.sin(this.cameraAzimuth),
            this.cameraLift,
            this.cameraOrbitRadius * Math.cos(this.cameraAzimuth)
        );

        const target = new THREE.Vector3(
            this.player.position.x + this.cameraOffset.x,
            this.player.position.y + this.cameraOffset.y,
            this.player.position.z + this.cameraOffset.z
        );
```

Everything from the existing `if (this.performanceProfile === 'menu') {` line through the end of the function (`this.updateTiltShiftAndBokeh(delta);`) is unchanged.

Replace `snapCameraToPlayer` (current lines 17263-17272):

```js
    snapCameraToPlayer() {
        if (!this.player || !this.camera) return;
        this.cameraAzimuth = wrapAngle(this.facingYaw + Math.PI);
        const camBasis = planarBasisFromOffsetAzimuth(this.cameraAzimuth);
        this.cameraPlanarForward.set(camBasis.forward.x, camBasis.forward.y);
        this.cameraPlanarRight.set(camBasis.right.x, camBasis.right.y);
        this.cameraOffset.set(
            this.cameraOrbitRadius * Math.sin(this.cameraAzimuth),
            this.cameraLift,
            this.cameraOrbitRadius * Math.cos(this.cameraAzimuth)
        );
        this.camera.position.set(
            this.player.position.x + this.cameraOffset.x,
            this.player.position.y + this.cameraOffset.y,
            this.player.position.z + this.cameraOffset.z
        );
        this.camera.lookAt(this.player.position.x, this.player.position.y + 0.4, this.player.position.z);
        this.updateTiltShiftAndBokeh(0.016);
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/threeGame.facingYaw.test.js`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Run the full unit suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/threeGame.js src/threeGame.facingYaw.test.js
git commit -m "feat: orbit the gameplay camera behind facingYaw with eased azimuth"
```

---

### Task 4: Repoint movement/facing-row/fire-fallback to the instant facing basis; remove idle-aim-decay

**Files:**
- Modify: `src/threeGame.js:14874-14875` (`updatePlayer` move axis), `src/threeGame.js:16332-16339` (`getFacingRow`), `src/threeGame.js:16392-16401` (`getWorldDirectionForFacingRow`), `src/threeGame.js:4594-4602` (`fireWeaponAtCurrentAim` fallback), `src/threeGame.js:4632-4638` (`triggerGameplayMelee` fallback), `src/threeGame.js:4522-4556` (delete `setControllerAimVector`), `src/threeGame.js:16443-16460` (`updateWeaponState` decay block)
- Test: Modify `src/threeGame.facingYaw.test.js`

**Interfaces:**
- Consumes: `this.facingPlanarForward`/`this.facingPlanarRight` (Task 2).
- Produces: nothing new — this task finishes wiring gameplay code onto what Task 2 introduced.

- [ ] **Step 1: Write the failing tests**

Append to `src/threeGame.facingYaw.test.js`:

```js
describe('getFacingRow / getWorldDirectionForFacingRow use the instant facing basis', () => {
    it('getFacingRow reads facingPlanarRight/Forward, ignoring a divergent camera basis', () => {
        const game = {
            facingPlanarRight: { x: 1, y: 0 },
            facingPlanarForward: { x: 0, y: -1 },
            cameraPlanarRight: { x: 0, y: 1 },
            cameraPlanarForward: { x: 1, y: 0 }
        };

        const row = ThreeGame.prototype.getFacingRow.call(game, 1, 0);

        expect(row).toBe(0);
    });

    it('getWorldDirectionForFacingRow round-trips through the facing basis', () => {
        const game = {
            facingPlanarRight: { x: 1, y: 0 },
            facingPlanarForward: { x: 0, y: -1 }
        };

        const dir = ThreeGame.prototype.getWorldDirectionForFacingRow.call(game, 0);

        expect(dir.x).toBeCloseTo(1, 5);
        expect(dir.z).toBeCloseTo(0, 5);
    });
});

describe('fire/melee direction no longer falls back to the camera basis', () => {
    it('triggerGameplayMelee normalizes aimDirX/Z directly, with no hasActiveAim branch', () => {
        const game = {
            isGameplayInputActive: () => true,
            player: { position: { x: 0, z: 0 } },
            isPlayerDead: false,
            meleeCooldownTimer: 0,
            isInsideNoFireZone: () => false,
            aimDirX: 0,
            aimDirZ: 1,
            scatterSprites: []
        };

        ThreeGame.prototype.triggerGameplayMelee.call(game, {});

        // Function should run past the direction computation without throwing
        // even though cameraPlanarForward is undefined on this mock.
        expect(game.aimDirX).toBe(0);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/threeGame.facingYaw.test.js`
Expected: FAIL — `getFacingRow`/`getWorldDirectionForFacingRow` still read `cameraPlanarRight/Forward`, so the divergent-basis test returns the camera-basis answer instead of 0.

- [ ] **Step 3: Implement**

In `getFacingRow` (current lines 16332-16339), replace `this.cameraPlanarRight`/`this.cameraPlanarForward` with `this.facingPlanarRight`/`this.facingPlanarForward`:

```js
    getFacingRow(worldX, worldZ) {
        return getDirectionIndexFromWorldVector(
            worldX,
            worldZ,
            this.facingPlanarRight,
            this.facingPlanarForward
        );
    }
```

In `getWorldDirectionForFacingRow` (current lines 16392-16401), same substitution for both reads:

```js
    getWorldDirectionForFacingRow(row = this.currentFacingRow) {
        const facingRow = Number.isInteger(row) ? row : PLAYER_DEFAULT_DIRECTION_INDEX;
        const angle = facingRow * (Math.PI / 4);
        const screenAxisX = Math.cos(angle);
        const screenAxisZ = Math.sin(angle);
        const worldX = (this.facingPlanarRight.x * screenAxisX) + (this.facingPlanarForward.x * -screenAxisZ);
        const worldZ = (this.facingPlanarRight.y * screenAxisX) + (this.facingPlanarForward.y * -screenAxisZ);
        const length = Math.hypot(worldX, worldZ) || 1;
        return { x: worldX / length, z: worldZ / length };
    }
```

In `updatePlayer`'s move-axis conversion (current lines 14874-14875):

```js
        const moveAxisX = (this.facingPlanarRight.x * screenAxisX) + (this.facingPlanarForward.x * -screenAxisZ);
        const moveAxisZ = (this.facingPlanarRight.y * screenAxisX) + (this.facingPlanarForward.y * -screenAxisZ);
```

In `fireWeaponAtCurrentAim`, delete the now-unreachable fallback block (current lines 4594-4602, the `if (!this.hasActiveAim) { ... }` block) entirely — `hasActiveAim` is permanently true from Task 2 onward, so `normX`/`normZ` can read `aimDirX`/`aimDirZ` directly:

```js
        const normX = this.aimDirX;
        const normZ = this.aimDirZ;
        if (!Number.isFinite(normX) || !Number.isFinite(normZ)) return false;
```

In `triggerGameplayMelee` (current lines 4632-4638), simplify to drop the now-dead fallback branch:

```js
        const directionLength = Math.hypot(this.aimDirX, this.aimDirZ) || 1;
        const aimX = this.aimDirX / directionLength;
        const aimZ = this.aimDirZ / directionLength;
```

Delete the entire `setControllerAimVector(x, y) { ... }` method (current lines 4522-4556) — confirmed dead code (zero call sites repo-wide), now fully superseded by `updateFacingYaw`.

In `updateWeaponState` (current lines 16443-16460), delete the two idle-aim-decay blocks, keeping the cooldown decrement and the trailing calls:

```js
    updateWeaponState(delta) {
        if (this.weaponFireCooldown > 0) {
            this.weaponFireCooldown = Math.max(0, this.weaponFireCooldown - delta);
        }

        this.updateWeaponAmmoRefill(delta);
        this.updateHeldFire();
```

(the rest of the function, starting from whatever followed `this.updateHeldFire();` in the original, is unchanged.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/threeGame.facingYaw.test.js`
Expected: PASS (all tests)

- [ ] **Step 5: Run the full unit suite**

Run: `npx vitest run`
Expected: PASS. If `src/threeGame.combatMovement.test.js`'s "keeps legs on movement and torso on mouse aim" test fails, check whether it depends on `cameraPlanarForward/Right` — it doesn't (it mocks `getFacingRow` directly), so it should be unaffected.

- [ ] **Step 6: Commit**

```bash
git add src/threeGame.js src/threeGame.facingYaw.test.js
git commit -m "refactor: repoint movement/facing-row/fire-fallback onto facingYaw basis, drop idle-aim-decay"
```

---

### Task 5: Mouse pointer-lock input

**Files:**
- Modify: `src/threeGame.js:4177-4235` (`handleCanvasPointerDown`/`handleCanvasPointerMove`), `src/threeGame.js:4333-4338` (listener registration), `src/threeGame.js:26528-26530` (listener teardown), `src/threeGame.js:17215` area (`updateCamera`, add overlay-exit check)
- Modify: `index.html` (new prompt element near the existing `hud-action-prompt` block, `index.html:1101-1141`)

**Interfaces:**
- Consumes: `this.updateFacingYaw(yaw)` (Task 2), `this.isGameplayInputActive()`, `this.hasBlockingGameplayOverlay()` (existing, unmodified).
- Produces: `this._pointerLocked` (boolean), `this.requestMouseLook()` (method), `this.updateMouseLookPrompt()` (method) — consumed by Task 6.

This task is DOM/browser-API-driven (pointer lock isn't implemented in
Vitest's jsdom environment), so it has no unit test — it's verified by the
Playwright e2e suite in Task 8 and by manual playtest.

- [ ] **Step 1: Add pointer-lock state and the prompt element**

In `index.html`, add a new prompt element right after the existing block at `index.html:1101-1141` (following the `hud-action-prompt` convention used by e.g. `#lore-hud-prompt`):

```html
      <div id="mouse-look-prompt" class="hud-action-prompt hidden">
        <span class="prompt-key">CLICK</span>
        <span class="prompt-text">TO LOOK AROUND</span>
      </div>
```

In `src/threeGame.js`, add `this._pointerLocked = false;` immediately after the `this.updateFacingYaw(Math.PI / 2);` line added in Task 2 (inside the constructor).

- [ ] **Step 2: Wire pointer-lock request into pointerdown, remove old absolute-cursor aim calls**

Replace `handleCanvasPointerDown` (current lines 4177-4219):

```js
        this.handleCanvasPointerDown = (event) => {
            const pointerType = event.pointerType || 'mouse';
            if (pointerType === 'mouse' && event.button === 2) {
                event.preventDefault();
                this.triggerGameplayMelee();
                return;
            }
            if (pointerType === 'mouse' && event.button !== 0) return;
            this._canvasTapStartX = event.clientX;
            this._canvasTapStartY = event.clientY;
            this._canvasPointerType = pointerType;
            try {
                this.renderer.domElement.setPointerCapture?.(event.pointerId);
            } catch { /* Pointer capture is a browser affordance; gameplay still works without it. */ }
            if (this._canvasPointerType === 'mouse') {
                this.lastMouseClientX = event.clientX;
                this.lastMouseClientY = event.clientY;
            }

            if (!this.isGameplayInputActive()) return;

            if (this.tryInteractWithConsolePointer(event.clientX, event.clientY)) return;
            if (this.tryInteractWithO2Pointer(event.clientX, event.clientY)) return;
            if (this.tryInteractWithFoundryPointer(event.clientX, event.clientY)) return;
            if (this.tryInteractWithBlackBoxPointer(event.clientX, event.clientY)) return;

            if (pointerType === 'mouse' && !this._pointerLocked) {
                this.requestMouseLook();
            }
            this.beginHeldFire(event.clientX, event.clientY, pointerType);
        };
```

Replace `handleCanvasPointerMove` (current lines 4221-4235):

```js
        this.handleCanvasPointerMove = (event) => {
            if (!this.isGameplayInputActive()) return;
            const pointerType = event.pointerType || this._canvasPointerType || 'mouse';
            if (this.isPointerFireHeld) {
                this.heldFireClientX = event.clientX;
                this.heldFireClientY = event.clientY;
            }
            if (pointerType !== 'mouse') return;
            this.lastMouseClientX = event.clientX;
            this.lastMouseClientY = event.clientY;
        };
```

- [ ] **Step 3: Add pointer-lock lifecycle methods and listeners**

First, add `const MOUSE_LOOK_SENSITIVITY = 0.0025;` on its own line immediately before `export class ThreeGame {`, next to the `CAMERA_ROT_SPEED` constant Task 3 added there. This project's `npm run lint` fails the build on unused symbols, so this constant must land in the same commit as its first use, in `handleMouseLookMove` below.

Add these methods near `handleCanvasPointerDown`/`handleCanvasPointerMove`:

```js
        this.requestMouseLook = () => {
            this.renderer.domElement.requestPointerLock?.();
        };

        this.updateMouseLookPrompt = () => {
            const prompt = document.getElementById('mouse-look-prompt');
            if (!prompt) return;
            const shouldShow = !this._pointerLocked && this.isGameplayInputActive();
            prompt.classList.toggle('hidden', !shouldShow);
        };

        this.handlePointerLockChange = () => {
            this._pointerLocked = document.pointerLockElement === this.renderer.domElement;
            this.updateMouseLookPrompt();
        };

        this.handlePointerLockError = () => {
            this._pointerLocked = false;
            this.updateMouseLookPrompt();
        };

        this.handleMouseLookMove = (event) => {
            if (!this._pointerLocked) return;
            this.updateFacingYaw(this.facingYaw - (event.movementX || 0) * MOUSE_LOOK_SENSITIVITY);
        };
```

Register the new listeners immediately after the existing block at current lines 4333-4338:

```js
        document.addEventListener('pointerlockchange', this.handlePointerLockChange);
        document.addEventListener('pointerlockerror', this.handlePointerLockError);
        document.addEventListener('mousemove', this.handleMouseLookMove);
```

Add matching teardown next to the existing `removeEventListener` calls at current lines 26528-26530:

```js
        document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
        document.removeEventListener('pointerlockerror', this.handlePointerLockError);
        document.removeEventListener('mousemove', this.handleMouseLookMove);
```

- [ ] **Step 4: Release pointer lock when a blocking overlay opens**

At the very top of `updateCamera(delta)` (before the azimuth-easing block added in Task 3), add:

```js
        if (this._pointerLocked && this.hasBlockingGameplayOverlay?.()) {
            document.exitPointerLock?.();
        }
```

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`, open the game, start a run, click the canvas.
Expected: cursor disappears (pointer-locked), the `#mouse-look-prompt` element hides, moving the mouse turns the character and the camera eases in behind them. Pressing Esc releases lock and the prompt reappears.

- [ ] **Step 6: Commit**

```bash
git add src/threeGame.js index.html
git commit -m "feat: drive facingYaw from pointer-locked mouse-look during gameplay"
```

---

### Task 6: Fixed-center gameplay crosshair; freeze the old mouse cursor during lock

**Files:**
- Modify: `index.html` (new crosshair element)
- Modify: `src/threeGame.js` (`updateMouseLookPrompt`-adjacent show/hide)
- Modify: `main.js` (`initTacticalCursor`'s `mousemove` listener)

**Interfaces:**
- Consumes: `this.isGameplayInputActive()`, `this._pointerLocked` (Task 5).
- Produces: nothing new — pure UI correctness follow-on.

- [ ] **Step 1: Add the crosshair element**

In `index.html`, add near the `#mouse-look-prompt` element added in Task 5:

```html
      <div id="gameplay-crosshair" class="hidden" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:6px;height:6px;border-radius:50%;background:var(--crosshair-color);pointer-events:none;z-index:500;"></div>
```

(Reuses the existing `--crosshair-color` CSS variable already set by the crosshair-color settings in `main.js:1780`.)

- [ ] **Step 2: Show it during gameplay, hide it otherwise**

In `src/threeGame.js`, extend `updateMouseLookPrompt` (added in Task 5) to also drive the crosshair — rename its body to cover both:

```js
        this.updateMouseLookPrompt = () => {
            const prompt = document.getElementById('mouse-look-prompt');
            const crosshair = document.getElementById('gameplay-crosshair');
            const gameplayActive = this.isGameplayInputActive();
            if (prompt) prompt.classList.toggle('hidden', this._pointerLocked || !gameplayActive);
            if (crosshair) crosshair.classList.toggle('hidden', !gameplayActive);
        };
```

Call `this.updateMouseLookPrompt();` once per frame from inside `updateCamera(delta)`, right after the pointer-lock-release check added in Task 5, so the crosshair tracks `isGameplayInputActive()` continuously (menus/dialogue hide it, resuming gameplay shows it) rather than only on lock-state changes:

```js
        if (this._pointerLocked && this.hasBlockingGameplayOverlay?.()) {
            document.exitPointerLock?.();
        }
        this.updateMouseLookPrompt();
```

- [ ] **Step 3: Freeze the legacy tactical cursor while pointer-locked**

In `main.js`'s `initTacticalCursor`, inside the existing `window.addEventListener('mousemove', (e) => { ... })` handler, add a guard immediately after the existing `if (e.isControllerSynthetic) return;` line:

```js
        if (document.pointerLockElement) return;
```

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`, start a run.
Expected: a small centered dot (in the player's chosen crosshair color) is visible during gameplay and does not move as the camera orbits. Opening a menu hides it; the old mechanical cursor no longer jumps/lags around the screen once pointer lock is engaged.

- [ ] **Step 5: Commit**

```bash
git add index.html src/threeGame.js main.js
git commit -m "feat: fixed-center gameplay crosshair, freeze legacy cursor under pointer lock"
```

---

### Task 7: Gamepad right-stick and trackpad/gyro-delta aim → direct yaw

**Files:**
- Modify: `main.js:1449-1484` (`applyControllerCursorAim`), `main.js:1486-1519` (`handleSteamGameplayInput`'s aim block), `main.js:1435` (new sensitivity constant)

**Interfaces:**
- Consumes: `window.game.updateFacingYaw(yaw)`, `window.game.facingYaw` (Task 2).
- Produces: nothing new for later tasks.

No unit test — `main.js` has no existing unit-test harness (it's the app
bootstrap with module-load-time DOM side effects); verified via Task 8's
e2e coverage and manual controller testing.

- [ ] **Step 1: Add the yaw sensitivity constant**

Immediately after `const CONTROLLER_CURSOR_SENSITIVITY = 1;` (current line 1435):

```js
const CONTROLLER_YAW_SENSITIVITY = 0.0025;
```

- [ ] **Step 2: Repoint the trackpad/gyro delta path**

Replace `applyControllerCursorAim` (current lines 1449-1484):

```js
function applyControllerCursorAim(controller) {
    const deltaX = Number(controller.cameraDelta?.x) || 0;
    const deltaY = Number(controller.cameraDelta?.y) || 0;
    // Sub-pixel motion is sensor noise, not a gesture.
    if (Math.hypot(deltaX, deltaY) < 1) return false;
    if (typeof window.game?.updateFacingYaw !== 'function') return false;

    const sensitivity = state.settings.aimSensitivity ?? 1.0;
    const currentYaw = Number(window.game.facingYaw) || 0;
    window.game.updateFacingYaw(currentYaw - deltaX * CONTROLLER_YAW_SENSITIVITY * sensitivity);
    return true;
}
```

- [ ] **Step 3: Repoint the absolute right-stick path**

Replace the block spanning current lines 1497-1519 in `handleSteamGameplayInput`:

```js
    const cursorAimed = applyControllerCursorAim(controller);

    if (!cursorAimed && (aimX || aimY)) {
        window.game?.updateFacingYaw?.(Math.atan2(aimX, aimY));
        updateVirtualGamepadCursorPosition(0, 0, false);
    }
```

(This drops the `anchor`/`lastPlayerAnchor` cursor-drift bookkeeping entirely — it existed only to keep an absolute on-screen cursor glued to the player as they moved, which no longer applies once aim is a yaw rather than a screen position. `getAimCursorAnchor`/`lastPlayerAnchor` stay defined for `handleSteamMenuInput`'s unrelated menu-cursor use — do not delete their declarations.)

- [ ] **Step 4: Manual smoke test**

Connect a gamepad (or use Steam Input / browser Gamepad API dev tooling already in the project), start a run.
Expected: right stick immediately sets facing direction (no cursor visible), left stick moves relative to that facing, camera eases in behind.

- [ ] **Step 5: Commit**

```bash
git add main.js
git commit -m "feat: drive facingYaw directly from gamepad right-stick/trackpad delta"
```

---

### Task 8: Rewrite the aim e2e spec; full-suite regression pass

**Files:**
- Modify: `tests/e2e/gameplay-aim-cursor.spec.js`

**Important — this spec currently enforces an earlier, now-superseded
goal.** The existing file boots to gameplay via `bootToOperatorMenu`/
`startRunAndSkipIntro` (from `./helpers.js`), fakes a right-stick push
through `navigator.getGamepads`, and asserts `#virtual-gamepad-cursor` is
**visible and tracks the stick position** while `#tactical-cursor` stays
suppressed — this was written to verify a prior `/goal`: "when we move the
right joystick, show the mouse cursor icon... so aiming is easier to read."
Task 7 of this plan deliberately removes that moving cursor
(`updateVirtualGamepadCursorPosition(0, 0, false)`) because aim is no longer
a screen position under the coupled facing/camera model — there is nothing
for a cursor to track. The readability goal that test protected is still
met, just by the fixed-center crosshair from Task 6 instead of a moving
dot. This task replaces the old cursor-tracking assertions with assertions
against the new crosshair/yaw model; it does not silently delete coverage
of "is aim visually readable during controller play," it re-targets it.

- [ ] **Step 1: Replace the spec**

```js
import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

test.describe('gameplay facing yaw (mouse + gamepad)', () => {
    test('clicking the game canvas engages pointer lock and hides the mouse-look prompt', async ({ page }) => {
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        await page.locator('#game-container canvas').click();
        await expect(page.locator('#mouse-look-prompt')).toHaveClass(/hidden/);
        const locked = await page.evaluate(() => document.pointerLockElement !== null);
        expect(locked).toBe(true);
    });

    test('mouse movement while locked turns facingYaw', async ({ page }) => {
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        await page.locator('#game-container canvas').click();
        const initialYaw = await page.evaluate(() => window.game.facingYaw);

        await page.mouse.move(400, 300);
        await page.mouse.move(700, 300);
        await page.waitForTimeout(100);

        const turnedYaw = await page.evaluate(() => window.game.facingYaw);
        expect(turnedYaw).not.toBeCloseTo(initialYaw, 2);
    });

    test('gamepad right-stick sets facingYaw directly, and the fixed crosshair stays put while the old drifting cursor stays suppressed', async ({ page }) => {
        test.setTimeout(180_000);
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        const pushStick = (x, y) => page.evaluate(([sx, sy]) => {
            const fakeGamepad = {
                id: 'Xbox Wireless Controller (STANDARD GAMEPAD)',
                index: 0,
                connected: true,
                mapping: 'standard',
                axes: [0, 0, sx, sy],
                buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }))
            };
            navigator.getGamepads = () => [fakeGamepad];
        }, [x, y]);

        const readState = () => {
            const crosshair = document.getElementById('gameplay-crosshair');
            const tacticalCursor = document.getElementById('tactical-cursor');
            const crosshairRect = crosshair.getBoundingClientRect();
            return {
                controllerMode: document.body.classList.contains('controller-mode'),
                crosshairHidden: crosshair.classList.contains('hidden'),
                crosshairCenterX: crosshairRect.left + crosshairRect.width / 2,
                tacticalDisplay: getComputedStyle(tacticalCursor).display,
                facingYaw: window.game.facingYaw
            };
        };

        const yawBefore = await page.evaluate(() => window.game.facingYaw);
        await pushStick(0.7, -0.7);
        await page.waitForTimeout(500);
        const rightUp = await page.evaluate(readState);
        await pushStick(-0.7, 0.7);
        await page.waitForTimeout(500);
        const leftDown = await page.evaluate(readState);
        await page.evaluate(() => { navigator.getGamepads = () => []; });

        expect(rightUp.controllerMode).toBe(true);
        expect(rightUp.crosshairHidden, 'the fixed gameplay crosshair should be visible').toBe(false);
        expect(rightUp.facingYaw).not.toBeCloseTo(yawBefore, 2);
        expect(leftDown.facingYaw).not.toBeCloseTo(rightUp.facingYaw, 2);
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        expect(Math.abs(leftDown.crosshairCenterX - viewportWidth / 2)).toBeLessThan(2);
        expect(Math.abs(rightUp.crosshairCenterX - viewportWidth / 2)).toBeLessThan(2);
    });

    test('WASD movement is relative to the current facing direction', async ({ page }) => {
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        await page.locator('#game-container canvas').click();
        await page.keyboard.press('Escape');
        await page.evaluate(() => window.game.updateFacingYaw(0));

        const startPos = await page.evaluate(() => ({ x: window.game.player.position.x, z: window.game.player.position.z }));
        await page.keyboard.down('KeyW');
        await page.waitForTimeout(300);
        await page.keyboard.up('KeyW');
        const endPos = await page.evaluate(() => ({ x: window.game.player.position.x, z: window.game.player.position.z }));

        expect(Math.hypot(endPos.x - startPos.x, endPos.z - startPos.z)).toBeGreaterThan(0.05);
    });
});
```

- [ ] **Step 2: Run the rewritten spec**

Run: `npx playwright test tests/e2e/gameplay-aim-cursor.spec.js`
Expected: PASS (all 4 tests)

- [ ] **Step 3: Run the full e2e suite for regressions**

Run: `npm run test:e2e`
Expected: PASS. Investigate any failures in other specs that assumed the
old fixed-camera angle or absolute-cursor aim (search the failing spec for
`updateAimFromClient`, `cameraOffset`, or literal camera-position assertions
tied to the old constant `(8, 10, 8)` offset).

- [ ] **Step 4: Run the full unit suite one more time**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/gameplay-aim-cursor.spec.js
git commit -m "test: rewrite aim e2e coverage for pointer-lock mouse-look and gamepad yaw"
```
