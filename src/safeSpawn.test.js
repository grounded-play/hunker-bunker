import { describe, expect, it } from 'vitest';
import { resolveSafeSpawn, separateSpawns, SAFE_SPAWN_MAX_RADIUS } from './safeSpawn.js';

describe('resolveSafeSpawn', () => {
    const allSafe = () => false;

    it('returns the requested point when it is already safe', () => {
        const r = resolveSafeSpawn({ x: 12, z: -4 }, { isBlocked: allSafe });
        expect(r).toMatchObject({ x: 12, z: -4, moved: false });
    });

    it('finds the nearest safe tile when the point is over a hole', () => {
        // The reported bug: (47,47) was void. Anything within 1 unit is too.
        const isBlocked = (x, z) => Math.hypot(x - 47, z - 47) < 1.5;
        const r = resolveSafeSpawn({ x: 47, z: 47 }, { isBlocked });
        expect(r.moved).toBe(true);
        expect(isBlocked(r.x, r.z)).toBe(false);
        // "Nearest" matters -- a player must not be flung across the map.
        expect(Math.hypot(r.x - 47, r.z - 47)).toBeLessThan(4);
    });

    it('searches outward in rings so the result is the closest safe point', () => {
        // Safe only to one side, but within the radius budget -- the resolver
        // must keep widening rather than stopping at the first ring.
        const isBlocked = (x) => x < 15;
        const r = resolveSafeSpawn({ x: 0, z: 0 }, { isBlocked });
        expect(r.moved).toBe(true);
        expect(r.x).toBeGreaterThanOrEqual(15);
    });

    it('does not fling a player across the map to find floor', () => {
        // The budget is deliberate: a spawn 40 units away is not a rescue, it
        // is a teleport into someone else's fight.
        const r = resolveSafeSpawn({ x: 0, z: 0 }, { isBlocked: (x) => x < 40 });
        expect(r.exhausted).toBe(true);
        expect(r).toMatchObject({ x: 0, z: 0 });
    });

    it('gives up rather than looping forever when everything is blocked', () => {
        const r = resolveSafeSpawn({ x: 5, z: 5 }, { isBlocked: () => true });
        // Falls back to the original point: a visible bad spawn beats a hang.
        expect(r).toMatchObject({ x: 5, z: 5, moved: false, exhausted: true });
    });

    it('never searches beyond its radius budget', () => {
        let maxSeen = 0;
        resolveSafeSpawn({ x: 0, z: 0 }, {
            isBlocked: (x, z) => {
                maxSeen = Math.max(maxSeen, Math.hypot(x, z));
                return true;
            }
        });
        expect(maxSeen).toBeLessThanOrEqual(SAFE_SPAWN_MAX_RADIUS + 1);
    });

    it('survives a throwing blocked-test rather than aborting the spawn', () => {
        // isPlayerOverAnyHole reaches into chunk state that may not be mounted
        // yet at spawn time; a throw there must not strand the player.
        const r = resolveSafeSpawn({ x: 3, z: 3 }, {
            isBlocked: () => { throw new Error('chunk not mounted'); }
        });
        expect(r).toMatchObject({ x: 3, z: 3 });
    });

    it('treats a missing blocked-test as everything-safe', () => {
        expect(resolveSafeSpawn({ x: 1, z: 2 }, {})).toMatchObject({ x: 1, z: 2, moved: false });
    });
});

describe('separateSpawns', () => {
    it('leaves already-separated points alone', () => {
        const pts = [{ x: 0, z: 0 }, { x: 30, z: 0 }];
        expect(separateSpawns(pts, { minDistance: 4 })).toEqual(pts);
    });

    it('pushes overlapping players apart', () => {
        // The reported "spawning on top of one another" case.
        const out = separateSpawns([{ x: 9, z: 9 }, { x: 9, z: 9 }], { minDistance: 4 });
        const d = Math.hypot(out[0].x - out[1].x, out[0].z - out[1].z);
        expect(d).toBeGreaterThanOrEqual(4);
    });

    it('keeps the first player anchored so the host does not drift', () => {
        const out = separateSpawns([{ x: 9, z: 9 }, { x: 9, z: 9 }], { minDistance: 4 });
        expect(out[0]).toMatchObject({ x: 9, z: 9 });
    });

    it('handles a single player and an empty list', () => {
        expect(separateSpawns([{ x: 1, z: 1 }])).toEqual([{ x: 1, z: 1 }]);
        expect(separateSpawns([])).toEqual([]);
    });
});
