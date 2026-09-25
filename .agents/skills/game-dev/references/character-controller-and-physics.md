# Kinematic Character Controllers & Collision

Physics engines (Cannon, Rapier, PhysX) are great for ragdolls, tumbling barrels, and debris. However, dynamic rigid bodies make character movement feel loose, unresponsive, and difficult to tune. A custom **Kinematic Character Controller (KCC)** provides crisp, arcade-quality responsiveness.

---

## 1. Wall Sliding & Velocity Projection

When a player runs into a wall at an angle, they should slide smoothly along the wall rather than coming to a dead stop:

```javascript
import * as THREE from 'three';

const normalWork = new THREE.Vector3();

/**
 * Projects a velocity vector along a collision plane tangent.
 * @param {THREE.Vector3} velocity - Entity current velocity
 * @param {THREE.Vector3} wallNormal - Unit normal of colliding wall
 */
export function slideAlongPlane(velocity, wallNormal) {
  // Dot product represents component of velocity directed into the wall
  const dot = velocity.dot(wallNormal);
  if (dot < 0) {
    // Subtract normal component: v = v - (v . n) * n
    normalWork.copy(wallNormal).multiplyScalar(dot);
    velocity.sub(normalWork);
  }
}
```

---

## 2. Coyote Time & Jump Buffering

These two game-feel mechanics eliminate input frustration and missed jumps:

```javascript
export class JumpMechanics {
  constructor() {
    this.coyoteTimeMax = 0.12; // 120ms window after leaving ground
    this.jumpBufferMax = 0.10; // 100ms window before hitting ground

    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.isGrounded = false;
  }

  update(dt, currentlyGrounded) {
    this.isGrounded = currentlyGrounded;

    if (this.isGrounded) {
      this.coyoteTimer = this.coyoteTimeMax;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
  }

  pressJump() {
    this.jumpBufferTimer = this.jumpBufferMax;
  }

  canExecuteJump() {
    return this.jumpBufferTimer > 0 && this.coyoteTimer > 0;
  }

  consumeJump() {
    this.jumpBufferTimer = 0;
    this.coyoteTimer = 0;
  }
}
```

---

## 3. Step-Climbing (Auto-Stair Assist)

Small obstacles, curbs, and staircases should not block movement:
1. Cast a low ray forward at knee height (e.g. `y = 0.2`).
2. If hit, cast a second high ray at maximum step height (e.g. `y = 0.6`).
3. If low ray hits but high ray does NOT hit, smoothly pop or step the character up onto the surface.
