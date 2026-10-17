/**
 * HitStopManager: Simulation-time dilation and frame-freeze manager.
 * Provides visceral physical weight to high-impact hits (shotgun blasts, railguns,
 * critical hits, boss staggers, and lethal blows) without stalling rendering or UI.
 *
 * Designed in alignment with the Golden Rules of Game Feel (game-dev skill):
 * freezes or dilates game logic ticks for 30-120ms on impact while preserving
 * accumulator safety to prevent spiral-of-death or movement desyncs.
 */

export const HIT_STOP_PRESETS = Object.freeze({
    LIGHT: 35,       // Standard sidearm / SMG kill
    MEDIUM: 50,      // Scatter / Shotgun blast
    HEAVY: 75,       // Railgun / Sniper penetration / Bio-Charger impact
    BOSS_STAGGER: 120 // Carapace crack / Boss phase transition
});

export class HitStopManager {
    constructor() {
        this.remainingMs = 0;
        this.timeScale = 1.0;
        this.freezeScale = 0.0;
    }

    /**
     * Trigger a hit-stop freeze or dilation window.
     * @param {number} durationMs - Duration of the pause in milliseconds.
     * @param {number} scale - Time dilation factor during hit-stop (default 0.0 for full freeze).
     */
    trigger(durationMs = HIT_STOP_PRESETS.MEDIUM, scale = 0.0) {
        if (durationMs > this.remainingMs) {
            this.remainingMs = durationMs;
            this.freezeScale = Math.max(0.0, Math.min(1.0, scale));
        }
    }

    /**
     * Returns true if hit-stop is currently active.
     */
    isActive() {
        return this.remainingMs > 0;
    }

    /**
     * Update hit-stop counter.
     * @param {number} deltaMs - Unscaled wall-clock delta time in milliseconds.
     * @returns {number} The active time scale multiplier for the simulation (0.0 to 1.0).
     */
    update(deltaMs) {
        if (this.remainingMs <= 0) {
            this.remainingMs = 0;
            this.timeScale = 1.0;
            return 1.0;
        }

        this.remainingMs = Math.max(0, this.remainingMs - deltaMs);
        if (this.remainingMs <= 0) {
            this.timeScale = 1.0;
        } else {
            this.timeScale = this.freezeScale;
        }
        return this.timeScale;
    }

    /**
     * Cancel any active hit-stop immediately.
     */
    reset() {
        this.remainingMs = 0;
        this.timeScale = 1.0;
    }
}

export function createHitStopManager() {
    return new HitStopManager();
}
