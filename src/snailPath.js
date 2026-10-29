// Enemy A* on the tile grid (Sprint 52 perf, docs/planning/sprint-52-playthrough-2026-10-07.md).
//
// The long-walk benchmark (tests/e2e/probes/long-walk.spec.js) put enemy
// pathfinding at 15-35 ms of every frame on a desktop, half of it in tile
// walkability lookups. This is the same search as before, step for step --
// the same open-list sort (stable, by f), the same neighbour order, the same
// best-so-far fallback -- so every enemy takes exactly the path it took.
// What changed is only bookkeeping:
// - tiles are numbers, not "x,z" strings parsed back on every visit;
// - the open list's membership is a flag, not a linear includes() scan, and
//   its sort compares typed-array scores rather than Map lookups;
// - each tile's walkability is looked up once per search, not up to three
//   times (as a neighbour and as both corners of a diagonal).
// src/snailPath.test.js holds the old implementation and checks the two agree
// on randomized maps with walls, doors and safe zones.

const DIRECTIONS = Object.freeze([
    Object.freeze({ dx: 1, dz: 0, cost: 1, diagonal: false }),
    Object.freeze({ dx: -1, dz: 0, cost: 1, diagonal: false }),
    Object.freeze({ dx: 0, dz: 1, cost: 1, diagonal: false }),
    Object.freeze({ dx: 0, dz: -1, cost: 1, diagonal: false }),
    Object.freeze({ dx: 1, dz: 1, cost: Math.SQRT2, diagonal: true }),
    Object.freeze({ dx: 1, dz: -1, cost: Math.SQRT2, diagonal: true }),
    Object.freeze({ dx: -1, dz: 1, cost: Math.SQRT2, diagonal: true }),
    Object.freeze({ dx: -1, dz: -1, cost: Math.SQRT2, diagonal: true })
]);

const GOAL_FALLBACK_OFFSETS = Object.freeze([
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [2, 0], [-2, 0], [0, 2], [0, -2]
]);

// Tile coordinates are integers well inside +/-2^20 (the asset museum sits at
// 9000), so a pair packs exactly into one safe integer.
const KEY_OFFSET = 1 << 20;
const KEY_SPAN = 1 << 21;
const keyOf = (x, z) => (x + KEY_OFFSET) * KEY_SPAN + (z + KEY_OFFSET);
const keyX = (key) => Math.floor(key / KEY_SPAN) - KEY_OFFSET;
const keyZ = (key) => (key % KEY_SPAN) - KEY_OFFSET;
const heuristic = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);

/**
 * @param {object} args
 * @param {(x: number, z: number) => boolean} args.isWalkable
 * @param {(from: {x,z}, to: {x,z}) => boolean} args.blocksStep
 * @returns {{x: number, z: number}[]} start ... best tile reached (the goal when found)
 */
export function findTilePath({ startX, startZ, goalX, goalZ, nodeBudget, isWalkable, blocksStep }) {
    const walkable = new Map();
    const canWalk = (x, z) => {
        const key = keyOf(x, z);
        let value = walkable.get(key);
        if (value === undefined) {
            value = Boolean(isWalkable(x, z));
            walkable.set(key, value);
        }
        return value;
    };

    if (!canWalk(startX, startZ)) return [{ x: startX, z: startZ }];

    let resolvedGoalX = goalX;
    let resolvedGoalZ = goalZ;
    if (!canWalk(resolvedGoalX, resolvedGoalZ)) {
        let fallback = null;
        let fallbackDist = Infinity;
        for (const [dx, dz] of GOAL_FALLBACK_OFFSETS) {
            const nx = resolvedGoalX + dx;
            const nz = resolvedGoalZ + dz;
            if (!canWalk(nx, nz)) continue;
            const dist = heuristic(startX, startZ, nx, nz);
            if (dist < fallbackDist) {
                fallback = { x: nx, z: nz };
                fallbackDist = dist;
            }
        }
        if (fallback) {
            resolvedGoalX = fallback.x;
            resolvedGoalZ = fallback.z;
        }
    }

    const startKey = keyOf(startX, startZ);
    const goalKey = keyOf(resolvedGoalX, resolvedGoalZ);
    if (startKey === goalKey) return [{ x: startX, z: startZ }];

    // Every tile the search touches gets a dense id; its scores live in typed
    // arrays, so the open-list sort compares two array reads, not two Map
    // lookups. The open list is still sorted (stably, by f) every step, exactly
    // as before, so ties break the same way and paths are identical.
    let capacity = 1024;
    let fScore = new Float64Array(capacity);
    let gScore = new Float64Array(capacity);
    let cameFrom = new Int32Array(capacity);
    let state = new Uint8Array(capacity); // 1 = open, 2 = closed
    const ids = new Map();
    const keys = [];
    const idOf = (key) => {
        let id = ids.get(key);
        if (id !== undefined) return id;
        id = keys.length;
        if (id >= capacity) {
            capacity *= 2;
            const grow = (Type, old, fill) => {
                const next = new Type(capacity);
                if (fill !== 0) next.fill(fill);
                next.set(old);
                return next;
            };
            fScore = grow(Float64Array, fScore, Infinity);
            gScore = grow(Float64Array, gScore, Infinity);
            cameFrom = grow(Int32Array, cameFrom, -1);
            state = grow(Uint8Array, state, 0);
        }
        ids.set(key, id);
        keys.push(key);
        return id;
    };
    fScore.fill(Infinity);
    gScore.fill(Infinity);
    cameFrom.fill(-1);

    const startId = idOf(startKey);
    gScore[startId] = 0;
    fScore[startId] = heuristic(startX, startZ, resolvedGoalX, resolvedGoalZ);
    const openSet = [startId];
    state[startId] = 1;
    const byF = (a, b) => fScore[a] - fScore[b];
    const from = { x: 0, z: 0 };
    const to = { x: 0, z: 0 };

    let explored = 0;
    let bestId = startId;
    let bestDistance = heuristic(startX, startZ, resolvedGoalX, resolvedGoalZ);

    while (openSet.length > 0 && explored < nodeBudget) {
        openSet.sort(byF);
        const currentId = openSet.shift();
        if (state[currentId] === 2) continue;
        state[currentId] = 0;

        const currentKey = keys[currentId];
        const cx = keyX(currentKey);
        const cz = keyZ(currentKey);
        const distanceToGoal = heuristic(cx, cz, resolvedGoalX, resolvedGoalZ);
        if (distanceToGoal < bestDistance) {
            bestDistance = distanceToGoal;
            bestId = currentId;
        }
        if (currentKey === goalKey) {
            bestId = currentId;
            break;
        }

        state[currentId] = 2;
        explored += 1;
        const currentG = gScore[currentId];

        for (const dir of DIRECTIONS) {
            const nx = cx + dir.dx;
            const nz = cz + dir.dz;
            if (!canWalk(nx, nz)) continue;
            from.x = cx; from.z = cz;
            to.x = nx; to.z = nz;
            if (typeof blocksStep === 'function' && blocksStep(from, to)) continue;
            if (dir.diagonal && (!canWalk(cx + dir.dx, cz) || !canWalk(cx, cz + dir.dz))) continue;

            const neighborKey = keyOf(nx, nz);
            const known = ids.get(neighborKey);
            if (known !== undefined && state[known] === 2) continue;
            const tentativeG = currentG + dir.cost;
            if (known !== undefined && tentativeG >= gScore[known]) continue;

            const neighborId = known ?? idOf(neighborKey);
            cameFrom[neighborId] = currentId;
            gScore[neighborId] = tentativeG;
            fScore[neighborId] = tentativeG + heuristic(nx, nz, resolvedGoalX, resolvedGoalZ);
            if (state[neighborId] !== 1) {
                openSet.push(neighborId);
                state[neighborId] = 1;
            }
        }
    }

    const path = [];
    for (let id = bestId; id !== -1; id = cameFrom[id]) path.push(keys[id]);
    path.reverse();
    return path.map((key) => ({ x: keyX(key), z: keyZ(key) }));
}
