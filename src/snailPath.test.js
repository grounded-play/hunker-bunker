import { describe, expect, it } from 'vitest';
import { findTilePath } from './snailPath.js';
import { createAttackPathBlocker } from './roomContainment.js';

// The enemy A* before Sprint 52, verbatim from threeGame.js findSnailPath
// (only `this` became `self`). The optimized search must take exactly the
// same path on every map.
function legacyFindSnailPath(self, startTileX, startTileZ, goalTileX, goalTileZ, nodeBudget = 360) {
    const keyOf = (x, z) => `${x},${z}`;
    const parseKey = (key) => {
        const [x, z] = key.split(',');
        return { x: Number(x), z: Number(z) };
    };
    const heuristic = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);
    const directions = [
        { dx: 1, dz: 0, cost: 1 },
        { dx: -1, dz: 0, cost: 1 },
        { dx: 0, dz: 1, cost: 1 },
        { dx: 0, dz: -1, cost: 1 },
        { dx: 1, dz: 1, cost: Math.SQRT2, diagonal: true },
        { dx: 1, dz: -1, cost: Math.SQRT2, diagonal: true },
        { dx: -1, dz: 1, cost: Math.SQRT2, diagonal: true },
        { dx: -1, dz: -1, cost: Math.SQRT2, diagonal: true }
    ];
    const containmentOptions = self.getCurrentContainmentOptions?.() ?? {
        containmentZones: self.getActiveContainmentZones?.() ?? [],
        doors: self.getActiveDoors?.() ?? []
    };
    const blocksAttackPath = self.createBlocker(containmentOptions);

    if (!self.isSnailTileWalkable(startTileX, startTileZ)) {
        return [{ x: startTileX, z: startTileZ }];
    }

    let resolvedGoalX = goalTileX;
    let resolvedGoalZ = goalTileZ;
    if (!self.isSnailTileWalkable(resolvedGoalX, resolvedGoalZ)) {
        const fallbackOffsets = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [-1, 1], [1, -1], [-1, -1],
            [2, 0], [-2, 0], [0, 2], [0, -2]
        ];
        let fallback = null;
        let fallbackDist = Infinity;
        for (const [dx, dz] of fallbackOffsets) {
            const nx = resolvedGoalX + dx;
            const nz = resolvedGoalZ + dz;
            if (!self.isSnailTileWalkable(nx, nz)) continue;
            const dist = heuristic(startTileX, startTileZ, nx, nz);
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

    const startKey = keyOf(startTileX, startTileZ);
    const goalKey = keyOf(resolvedGoalX, resolvedGoalZ);
    if (startKey === goalKey) {
        return [{ x: startTileX, z: startTileZ }];
    }

    const openSet = [startKey];
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map([[startKey, 0]]);
    const fScore = new Map([[startKey, heuristic(startTileX, startTileZ, resolvedGoalX, resolvedGoalZ)]]);

    let explored = 0;
    let bestKey = startKey;
    let bestDistance = heuristic(startTileX, startTileZ, resolvedGoalX, resolvedGoalZ);

    while (openSet.length > 0 && explored < nodeBudget) {
        openSet.sort((a, b) => (fScore.get(a) ?? Infinity) - (fScore.get(b) ?? Infinity));
        const currentKey = openSet.shift();
        if (!currentKey) break;
        if (closedSet.has(currentKey)) continue;

        const current = parseKey(currentKey);
        const distanceToGoal = heuristic(current.x, current.z, resolvedGoalX, resolvedGoalZ);
        if (distanceToGoal < bestDistance) {
            bestDistance = distanceToGoal;
            bestKey = currentKey;
        }

        if (currentKey === goalKey) {
            bestKey = currentKey;
            break;
        }

        closedSet.add(currentKey);
        explored += 1;
        const currentG = gScore.get(currentKey) ?? Infinity;

        for (const dir of directions) {
            const nx = current.x + dir.dx;
            const nz = current.z + dir.dz;
            if (!self.isSnailTileWalkable(nx, nz)) continue;
            if (blocksAttackPath(
                { x: current.x, z: current.z },
                { x: nx, z: nz }
            )) continue;
            if (dir.diagonal) {
                if (!self.isSnailTileWalkable(current.x + dir.dx, current.z) || !self.isSnailTileWalkable(current.x, current.z + dir.dz)) {
                    continue;
                }
            }

            const neighborKey = keyOf(nx, nz);
            if (closedSet.has(neighborKey)) continue;
            const tentativeG = currentG + dir.cost;
            if (tentativeG >= (gScore.get(neighborKey) ?? Infinity)) continue;

            cameFrom.set(neighborKey, currentKey);
            gScore.set(neighborKey, tentativeG);
            const nextF = tentativeG + heuristic(nx, nz, resolvedGoalX, resolvedGoalZ);
            fScore.set(neighborKey, nextF);
            if (!openSet.includes(neighborKey)) {
                openSet.push(neighborKey);
            }
        }
    }

    const pathKeys = [bestKey];
    let walkKey = bestKey;
    while (cameFrom.has(walkKey)) {
        walkKey = cameFrom.get(walkKey);
        pathKeys.push(walkKey);
    }
    pathKeys.reverse();

    return pathKeys.map((key) => {
        const point = parseKey(key);
        return { x: point.x, z: point.z };
    });
}


function seeded(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function randomWorld(seed) {
    const random = seeded(seed);
    const size = 28;
    const walls = new Set();
    for (let x = -size; x <= size; x++) {
        for (let z = -size; z <= size; z++) {
            if (random() < 0.24) walls.add(`${x},${z}`);
        }
    }
    const doors = [];
    const containmentZones = [];
    for (let i = 0; i < 4; i++) {
        const x = Math.floor((random() - 0.5) * size * 2);
        const z = Math.floor((random() - 0.5) * size * 2);
        doors.push({ x, z, width: 1, depth: 2, isOpen: random() < 0.4, isLocked: false });
    }
    for (let i = 0; i < 2; i++) {
        const minX = Math.floor((random() - 0.5) * size * 2);
        const minZ = Math.floor((random() - 0.5) * size * 2);
        containmentZones.push({ isSafe: true, bounds: { minX, maxX: minX + 4, minZ, maxZ: minZ + 4 } });
    }
    const isWalkable = (x, z) => Math.abs(x) <= size && Math.abs(z) <= size && !walls.has(`${x},${z}`);
    return { random, size, isWalkable, options: { containmentZones, doors } };
}

describe('the optimized enemy path search', () => {
    it('takes exactly the old path on randomized maps', () => {
        let compared = 0;
        let reachedGoal = 0;
        let blockedSteps = 0;
        for (let seed = 1; seed <= 60; seed++) {
            const world = randomWorld(seed);
            const self = {
                isSnailTileWalkable: world.isWalkable,
                getCurrentContainmentOptions: () => world.options,
                createBlocker: (options) => createAttackPathBlocker(options)
            };
            const realBlocker = createAttackPathBlocker(world.options);
            const blocker = (from, to) => {
                const blocked = realBlocker(from, to);
                if (blocked) blockedSteps += 1;
                return blocked;
            };
            for (let trial = 0; trial < 12; trial++) {
                const pick = () => Math.floor((world.random() - 0.5) * world.size * 2);
                const [sx, sz, gx, gz] = [pick(), pick(), pick(), pick()];
                const budget = trial % 3 === 0 ? 40 : 360;
                const legacy = legacyFindSnailPath(self, sx, sz, gx, gz, budget);
                const fast = findTilePath({ startX: sx, startZ: sz, goalX: gx, goalZ: gz, nodeBudget: budget, isWalkable: world.isWalkable, blocksStep: blocker });
                expect(fast).toEqual(legacy);
                compared += 1;
                const end = legacy.at(-1);
                if (Math.abs(end.x - gx) + Math.abs(end.z - gz) <= 2) reachedGoal += 1;
            }
        }
        expect(compared).toBe(720);
        // The maps are open enough that many searches really reach the goal.
        expect(reachedGoal).toBeGreaterThan(100);
        // Doors and safe zones really do turn searches aside in these maps.
        expect(blockedSteps).toBeGreaterThan(50);
    });

    it('safely handles null or undefined blocksStep without throwing', () => {
        const path = findTilePath({
            startX: 0,
            startZ: 0,
            goalX: 3,
            goalZ: 0,
            nodeBudget: 100,
            isWalkable: () => true,
            blocksStep: null
        });
        expect(path.length).toBeGreaterThan(1);
        expect(path.at(-1)).toEqual({ x: 3, z: 0 });
    });
});
