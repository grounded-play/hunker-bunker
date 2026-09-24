import { describe, expect, it } from 'vitest';
import { COMPANION_PATH_LIMITS, findCompanionPath, nextWaypoint } from './companionPath.js';

// A wall at x = 5 from z = -3 to z = 3, open around its ends.
const wall = (x, z) => !(x === 5 && z >= -3 && z <= 3);

describe('companion paths', () => {
    it('walks around a wall instead of into it', () => {
        const path = findCompanionPath({ x: 2, z: 0 }, { x: 8, z: 0 }, wall);
        expect(path).not.toBeNull();
        expect(path[0]).toEqual({ x: 2, z: 0 });
        expect(path.at(-1)).toEqual({ x: 8, z: 0 });
        expect(path.every((tile) => wall(tile.x, tile.z))).toBe(true);
        // It has to go past an end of the wall.
        expect(path.some((tile) => Math.abs(tile.z) >= 4)).toBe(true);
    });

    it('never cuts a wall corner diagonally', () => {
        const blocked = (x, z) => !((x === 1 && z === 0) || (x === 0 && z === 1));
        const path = findCompanionPath({ x: 0, z: 0 }, { x: 1, z: 1 }, blocked);
        // It reaches the goal, but not by squeezing diagonally between the two walls.
        expect(path.at(-1)).toEqual({ x: 1, z: 1 });
        expect(path[1]).not.toEqual({ x: 1, z: 1 });
        for (let i = 1; i < path.length; i += 1) {
            const [a, b] = [path[i - 1], path[i]];
            if (a.x !== b.x && a.z !== b.z) {
                expect(blocked(b.x, a.z) && blocked(a.x, b.z)).toBe(true);
            }
        }
    });

    it('gives up beyond its range, into walls, and when boxed in', () => {
        expect(findCompanionPath({ x: 0, z: 0 }, { x: COMPANION_PATH_LIMITS.maxRange + 5, z: 0 }, () => true)).toBeNull();
        expect(findCompanionPath({ x: 0, z: 0 }, { x: 5, z: 0 }, wall)).toBeNull();
        const box = (x, z) => Math.max(Math.abs(x), Math.abs(z)) !== 3;
        expect(findCompanionPath({ x: 0, z: 0 }, { x: 10, z: 0 }, box)).toBeNull();
    });

    it('heads for the farthest tile it can see along the path', () => {
        const path = findCompanionPath({ x: 2, z: 0 }, { x: 8, z: 0 }, wall);
        const straight = (a, b) => {
            const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.25);
            for (let i = 1; i <= steps; i += 1) {
                const t = i / steps;
                if (!wall(Math.round(a.x + (b.x - a.x) * t), Math.round(a.z + (b.z - a.z) * t))) return false;
            }
            return true;
        };
        const waypoint = nextWaypoint(path, { x: 2, z: 0 }, straight);
        expect(straight({ x: 2, z: 0 }, waypoint)).toBe(true);
        expect(waypoint).not.toEqual(path[0]);
        expect(nextWaypoint([], { x: 0, z: 0 }, straight)).toBeNull();
    });
});
