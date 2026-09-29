// Companion pathfinding (2026-09-24 QA, docs/planning/qa-2026-09-24-deck-pc-coop-game-plan.md):
// the Meridian recruit steered in a straight line toward the player and stuck
// behind the first wall; its only recovery was a teleport past 16 m. This is a
// bounded A* over the game's own walkable-tile check, so a companion walks
// around walls. Pure: `isWalkable(x, z)` is supplied by the caller.

const NEIGHBORS = Object.freeze([
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]
]);

export const COMPANION_PATH_LIMITS = Object.freeze({
    // Tiles expanded before giving up (keeps a frame's search small).
    maxNodes: 1600,
    // A goal farther than this (tiles) is not searched for; the caller recovers.
    maxRange: 28
});

const key = (x, z) => `${x},${z}`;

/**
 * Tiles from start to goal (both rounded), or null when there is no path within
 * the limits. Diagonal steps are allowed only when both side tiles are
 * walkable, so a companion never cuts a wall corner.
 */
export function findCompanionPath(start, goal, isWalkable, limits = COMPANION_PATH_LIMITS) {
    const sx = Math.round(start.x);
    const sz = Math.round(start.z);
    const gx = Math.round(goal.x);
    const gz = Math.round(goal.z);
    if (Math.hypot(gx - sx, gz - sz) > limits.maxRange) return null;
    if (!isWalkable(gx, gz)) return null;
    if (sx === gx && sz === gz) return [{ x: gx, z: gz }];

    const heuristic = (x, z) => Math.hypot(gx - x, gz - z);
    const open = [{ x: sx, z: sz, g: 0, f: heuristic(sx, sz) }];
    const cameFrom = new Map();
    const best = new Map([[key(sx, sz), 0]]);
    let expanded = 0;

    while (open.length && expanded < limits.maxNodes) {
        // Small open sets: a linear pick is simpler than a heap and fast enough.
        let bestIndex = 0;
        for (let i = 1; i < open.length; i += 1) if (open[i].f < open[bestIndex].f) bestIndex = i;
        const current = open.splice(bestIndex, 1)[0];
        expanded += 1;
        if (current.x === gx && current.z === gz) {
            const path = [{ x: gx, z: gz }];
            let cursor = key(gx, gz);
            while (cameFrom.has(cursor)) {
                const previous = cameFrom.get(cursor);
                path.push(previous);
                cursor = key(previous.x, previous.z);
            }
            return path.reverse();
        }
        for (const [dx, dz, cost] of NEIGHBORS) {
            const nx = current.x + dx;
            const nz = current.z + dz;
            if (!isWalkable(nx, nz)) continue;
            if (dx !== 0 && dz !== 0 && (!isWalkable(current.x + dx, current.z) || !isWalkable(current.x, current.z + dz))) continue;
            const g = current.g + cost;
            const nodeKey = key(nx, nz);
            if (g >= (best.get(nodeKey) ?? Infinity)) continue;
            best.set(nodeKey, g);
            cameFrom.set(nodeKey, { x: current.x, z: current.z });
            open.push({ x: nx, z: nz, g, f: g + heuristic(nx, nz) });
        }
    }
    return null;
}

/**
 * The next point to walk toward along a path: the farthest upcoming tile that
 * can be reached in a straight line (`hasLine`), so movement is smooth rather
 * than tile by tile.
 */
export function nextWaypoint(path, from, hasLine) {
    if (!path?.length) return null;
    let chosen = path[Math.min(1, path.length - 1)];
    for (let i = path.length - 1; i >= 1; i -= 1) {
        if (hasLine(from, path[i])) {
            chosen = path[i];
            break;
        }
    }
    return chosen;
}
