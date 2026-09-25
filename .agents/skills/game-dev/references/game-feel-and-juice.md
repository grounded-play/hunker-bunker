# Game Feel & "Juice": Making Mechanics Feel Alive

"Juice" is the non-essential visual, auditory, and tactile feedback that amplifies player actions. Without juice, a game feels like an Excel spreadsheet with 3D models. With juice, pressing a button feels punchy, satisfying, and responsive.

---

## 1. Trauma-Based Screen Shake

Never use pure white noise / `Math.random()` jitter for screen shake. Use **Trauma-Based Shake**:
- **Trauma** is a scalar from `0.0` to `1.0`.
- Shaking intensity is proportional to `trauma * trauma` (or `trauma^2.5`), which feels significantly more violent on big hits while keeping small hits subtle.
- Trauma decays linearly over time.
- Translational offsets (X, Y) and rotational roll (Z) are derived using low-frequency harmonic noise.

```javascript
export class CameraShaker {
  constructor() {
    this.trauma = 0.0;
    this.decayRate = 1.4; // Decay back to 0 in ~0.7 seconds
    this.maxOffset = 0.4;  // World units
    this.maxRoll = 0.05;   // Radians (~3 degrees)
    this.time = 0;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  update(dt, camera) {
    if (this.trauma <= 0) return;

    this.time += dt * 35.0; // Shake frequency
    this.trauma = Math.max(0.0, this.trauma - this.decayRate * dt);

    const shake = this.trauma * this.trauma; // Non-linear response curve

    // Smooth pseudo-noise using trig combinations
    const offsetX = (Math.sin(this.time * 1.1) + Math.cos(this.time * 2.3)) * 0.5 * this.maxOffset * shake;
    const offsetY = (Math.sin(this.time * 1.7) + Math.cos(this.time * 0.9)) * 0.5 * this.maxOffset * shake;
    const roll = Math.sin(this.time * 1.3) * this.maxRoll * shake;

    camera.position.x += offsetX;
    camera.position.y += offsetY;
    camera.rotation.z += roll;
  }
}
```

---

## 2. Hit-Stop (Micro-Freezes on Impact)

When a sword slices an enemy, a bullet strikes armor, or a boss gets staggered, pause game simulation for **30 to 80 milliseconds**.
- Gives the player's brain time to process the significance of the hit.
- Adds palpable physical "weight" to impacts.

---

## 3. Squash and Stretch

When an entity lands on the ground, jumps, or takes a blow, deform its scale temporarily rather than keeping it rigid:

```javascript
export class SquashAndStretch {
  constructor(mesh) {
    this.mesh = mesh;
    this.targetScale = { x: 1, y: 1, z: 1 };
  }

  onJump() {
    // Stretch vertically, compress horizontally
    this.mesh.scale.set(0.8, 1.3, 0.8);
  }

  onLand() {
    // Compress vertically (squash), expand horizontally
    this.mesh.scale.set(1.3, 0.7, 1.3);
  }

  onHit() {
    this.mesh.scale.set(1.2, 0.8, 1.2);
  }

  update(dt) {
    // Exponential recovery back to (1, 1, 1)
    const recoverySpeed = 12.0;
    const factor = 1.0 - Math.exp(-recoverySpeed * dt);
    this.mesh.scale.lerp(this.targetScale, factor);
  }
}
```

---

## 4. Damage Flash (Hit Reaction)

Flash the target white or high-intensity emissive red for 1–2 frames:

```javascript
export function flashMesh(mesh, color = 0xffffff, durationMs = 80) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  
  // Store original emissive
  const originalColors = materials.map((m) => m.emissive ? m.emissive.clone() : null);

  materials.forEach((m) => {
    if (m.emissive) {
      m.emissive.setHex(color);
    }
  });

  setTimeout(() => {
    materials.forEach((m, idx) => {
      if (m.emissive && originalColors[idx]) {
        m.emissive.copy(originalColors[idx]);
      }
    });
  }, durationMs);
}
```

---

## 5. FOV Kick (Recoil & Speed Feedback)

When firing a heavy weapon or dashing, temporarily punch the camera Field of View (FOV):
- Shooting: Punch FOV up by +2° and snap back.
- Dashing / Sprinting: Punch FOV up by +8° and lerp back over 300ms.
