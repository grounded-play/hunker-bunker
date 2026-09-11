/**
 * Spawn-point validation.
 *
 * Spawn coordinates in this game are chosen from fixed offset tables
 * (multiplayerCrashPlanner) that know nothing about the terrain actually
 * generated for a seed. A point can therefore land over a void or inside a
 * prop. In the 2026-09-11 session that produced a repeating death loop: a
 * player was placed at (47,47), fell, respawned at (47,47), and fell again --
 * nothing in the path ever asked whether the destination had a floor.
 *
 * The game already answers that question every frame, via
 * threeGame's isPlayerOverAnyHole(). This module reuses that same authority
 * rather than inventing a second notion of "safe": a spawn point should have
 * to pass the exact test that keeps a walking player alive.
 *
 * Pure and dependency-injected so it can be tested without a world.
 */

/** Rings are searched outward in whole units; ~24 covers a room and a bit. */
export const SAFE_SPAWN_MAX_RADIUS = 24;
export const SAFE_SPAWN_MIN_SEPARATION = 4;

/**
 * Find the nearest point to `origin` that passes `isBlocked`.
 *
 * Returns `{ x, z, moved, exhausted }`. When nothing safe is found the ORIGINAL
 * point comes back with `exhausted: true` -- a visibly bad spawn is recoverable
 * and reportable, whereas refusing to spawn, or searching without bound, is not.
 */
export function resolveSafeSpawn(origin, { isBlocked, maxRadius = SAFE_SPAWN_MAX_RADIUS, step = 1 } = {}) {
    const x0 = Number.isFinite(origin?.x) ? origin.x : 0;
    const z0 = Number.isFinite(origin?.z) ? origin.z : 0;
    const fallback = { x: x0, z: z0, moved: false, exhausted: false };

    if (typeof isBlocked !== 'function') return fallback;

    // The blocked-test reaches into chunk state that may not be mounted yet at
    // spawn time. A throw there must not strand the player at no position.
    const blocked = (x, z) => {
        try {
            return Boolean(isBlocked(x, z));
        } catch {
            return false;
        }
    };

    if (!blocked(x0, z0)) return fallback;

    for (let radius = step; radius <= maxRadius; radius += step) {
        // Sample the ring at a density that scales with its circumference, so
        // small rings are not oversampled and large ones do not develop gaps.
        const samples = Math.max(8, Math.round((2 * Math.PI * radius) / step));
        for (let i = 0; i < samples; i++) {
            const angle = (i / samples) * Math.PI * 2;
            const x = x0 + Math.cos(angle) * radius;
            const z = z0 + Math.sin(angle) * radius;
            if (!blocked(x, z)) {
                return { x, z, moved: true, exhausted: false };
            }
        }
    }

    return { x: x0, z: z0, moved: false, exhausted: true };
}

/**
 * Push spawn points apart so players do not materialize inside one another.
 *
 * The first point is treated as an anchor and never moves: in a co-op deploy
 * that is the host, and a host whose spawn drifted from the plan would
 * disagree with what every peer was told.
 */
export function separateSpawns(points = [], { minDistance = SAFE_SPAWN_MIN_SEPARATION } = {}) {
    if (!Array.isArray(points) || points.length < 2) return points.map((p) => ({ ...p }));

    const out = points.map((p) => ({ ...p }));
    for (let i = 1; i < out.length; i++) {
        for (let attempt = 0; attempt < 16; attempt++) {
            let clash = null;
            for (let j = 0; j < i; j++) {
                const d = Math.hypot(out[i].x - out[j].x, out[i].z - out[j].z);
                if (d < minDistance) {
                    clash = { other: out[j], d };
                    break;
                }
            }
            if (!clash) break;

            // Identical points have no direction to push along; fan them out by
            // index so repeated collisions do not all resolve the same way.
            const dx = out[i].x - clash.other.x;
            const dz = out[i].z - clash.other.z;
            const len = Math.hypot(dx, dz);
            if (len < 1e-6) {
                const angle = (i / out.length) * Math.PI * 2;
                out[i].x = clash.other.x + Math.cos(angle) * minDistance;
                out[i].z = clash.other.z + Math.sin(angle) * minDistance;
            } else {
                out[i].x = clash.other.x + (dx / len) * minDistance;
                out[i].z = clash.other.z + (dz / len) * minDistance;
            }
        }
    }
    return out;
}
