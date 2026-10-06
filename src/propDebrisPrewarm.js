/**
 * Fracture destructible props' debris ahead of time, in idle time only.
 *
 * Lived-in world M3 (docs/planning/sprint-49-lived-in-world-continuation.md).
 * Enemy gibs are fractured during the 3D preload pass (prewarmEnemyGibs), but
 * props were fractured on the frame they broke: ~100 ms on a dense model, the
 * Thursday Deck capture's worst window (`event:destructible-prop-broken`).
 *
 * When a destructible prop's 3D model attaches (that is, its room has
 * streamed in near the player), its model family joins a queue. One family
 * is fractured per idle period, and only when the browser reports at least
 * `minIdleMs` of idle time. There is no timeout fallback: if a frame-bound
 * device never goes idle, nothing runs and the cost stays where it was,
 * rather than landing as a hitch at a random moment.
 */
import { prewarmEnemyGibs } from './enemyGibs.js';

export const PROP_DEBRIS_PREWARM_MIN_IDLE_MS = 30;

/** The cache key spawnGibsFor uses for a broken prop (enemyGibs.js). */
export function propDebrisKey(sprite) {
    const data = sprite?.userData ?? {};
    return data.modelVariant ?? data.type ?? data.scatterKey ?? null;
}

export function createPropDebrisPrewarmQueue({
    requestIdle = globalThis.requestIdleCallback?.bind(globalThis),
    prewarm = prewarmEnemyGibs,
    minIdleMs = PROP_DEBRIS_PREWARM_MIN_IDLE_MS
} = {}) {
    const pending = new Map();
    const seen = new Set();
    let scheduled = false;
    let disposed = false;
    const stats = { queued: 0, warmed: 0 };

    function schedule() {
        if (scheduled || disposed || pending.size === 0 || typeof requestIdle !== 'function') return;
        scheduled = true;
        requestIdle((deadline) => {
            scheduled = false;
            if (disposed) return;
            if ((deadline?.timeRemaining?.() ?? 0) >= minIdleMs) {
                const [key, root] = pending.entries().next().value;
                pending.delete(key);
                if (prewarm(key, root)) stats.warmed += 1;
            }
            schedule();
        });
    }

    /** Queue a destructible prop whose 3D root just attached. */
    function enqueue(sprite, root) {
        if (disposed || !root || !Number.isFinite(sprite?.userData?.propHp)) return false;
        const key = propDebrisKey(sprite);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        pending.set(key, root);
        stats.queued += 1;
        schedule();
        return true;
    }

    function dispose() {
        disposed = true;
        pending.clear();
    }

    return { enqueue, dispose, stats, get pending() { return pending.size; } };
}
