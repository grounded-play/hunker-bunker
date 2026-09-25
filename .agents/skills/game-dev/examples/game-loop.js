/**
 * Production-ready Fixed Timestep Game Loop
 * Features:
 * - Deterministic physics simulation ticks (e.g. 60Hz)
 * - Variable-rate rendering with fractional alpha interpolation
 * - Lag spike clamping (spiral-of-death protection)
 * - Hit-stop / dramatic freeze frame support
 */
export class ProductionGameLoop {
  constructor({
    onFixedUpdate,
    onRender,
    fixedDt = 1 / 60,
    maxAccumulator = 0.25,
  }) {
    this.onFixedUpdate = onFixedUpdate;
    this.onRender = onRender;
    this.fixedDt = fixedDt;
    this.maxAccumulator = maxAccumulator;

    this.accumulator = 0;
    this.lastTime = performance.now();
    this.isRunning = false;
    this.rafId = null;
    this.hitStopSeconds = 0;

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

  triggerHitStop(durationSeconds = 0.05) {
    this.hitStopSeconds = Math.max(this.hitStopSeconds, durationSeconds);
  }

  tick(currentTime) {
    if (!this.isRunning) return;
    this.rafId = requestAnimationFrame(this.tick);

    let frameDelta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Clamp huge frame deltas (e.g. background tab switch)
    if (frameDelta > this.maxAccumulator) {
      frameDelta = this.maxAccumulator;
    }

    // Handle hit-stop micro-freeze
    if (this.hitStopSeconds > 0) {
      this.hitStopSeconds -= frameDelta;
      this.accumulator = 0;
      this.onRender(1.0, frameDelta);
      return;
    }

    this.accumulator += frameDelta;

    // Consume deterministic simulation slices
    while (this.accumulator >= this.fixedDt) {
      this.onFixedUpdate(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }

    // Fraction of time remaining toward next fixed tick
    const alpha = this.accumulator / this.fixedDt;
    this.onRender(alpha, frameDelta);
  }
}
