# Game Loop Architecture: Fixed Timestep & Accumulator

A naive game loop passes variable delta time (`requestAnimationFrame` delta) directly into movement and physics. This leads to erratic tunneling through walls on frame drops, inconsistent jump heights, and non-deterministic behavior across 60Hz, 120Hz, and 240Hz monitors.

---

## 1. The Fixed-Timestep Pattern

Decouple **simulation logic** (runs at a steady 60Hz or 50Hz) from **rendering** (runs at the monitor's native refresh rate):

```javascript
export class GameLoop {
  constructor({ onFixedUpdate, onRender, fixedDt = 1 / 60, maxSubSteps = 5 }) {
    this.onFixedUpdate = onFixedUpdate;
    this.onRender = onRender;
    this.fixedDt = fixedDt;
    this.maxSubSteps = maxSubSteps;
    this.maxAccumulator = fixedDt * maxSubSteps; // Prevent "spiral of death"

    this.accumulator = 0;
    this.lastTime = performance.now();
    this.isRunning = false;
    this.rafId = null;

    this.tick = this.tick.bind(this);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  tick(currentTime) {
    if (!this.isRunning) return;
    this.rafId = requestAnimationFrame(this.tick);

    // 1. Calculate actual elapsed time in seconds
    let frameTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // 2. Clamp frameTime to avoid the "spiral of death"
    // If the browser tab was suspended or suffered a massive lag spike,
    // we drop excess simulation steps rather than freezing the browser trying to catch up.
    if (frameTime > this.maxAccumulator) {
      frameTime = this.maxAccumulator;
    }

    this.accumulator += frameTime;

    // 3. Consume accumulated time in discrete, deterministic slices
    while (this.accumulator >= this.fixedDt) {
      this.onFixedUpdate(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }

    // 4. Alpha represents the fractional progress toward the next physics step [0.0, 1.0)
    // Pass alpha to rendering for smooth visual interpolation between states
    const alpha = this.accumulator / this.fixedDt;
    this.onRender(alpha, frameTime);
  }
}
```

---

## 2. Hit-Stop / Freeze Frame Integration

To implement "hit-stop" (momentarily freezing physics for dramatic impact), pause or slow the accumulator without stopping the render loop:

```javascript
let hitStopDuration = 0;

export function triggerHitStop(durationSeconds = 0.06) {
  hitStopDuration = Math.max(hitStopDuration, durationSeconds);
}

// In the tick method before consuming the accumulator:
if (hitStopDuration > 0) {
  hitStopDuration -= frameTime;
  // Discard accumulator progression while frozen so physics doesn't leap forward afterwards
  this.accumulator = 0;
} else {
  // Normal fixed update processing
}
```
