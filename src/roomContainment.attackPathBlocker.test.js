import { describe, expect, it } from 'vitest';
import { createAttackPathBlocker, shouldBlockAttackPath } from './roomContainment.js';

// Enemy A* asks this for every explored edge; it must answer exactly as
// shouldBlockAttackPath does, only faster.

function rng(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 2 ** 32;
    };
}

function world(random) {
    const box = () => {
        const x = Math.floor(random() * 60) - 30;
        const z = Math.floor(random() * 60) - 30;
        return { minX: x, maxX: x + 1 + Math.floor(random() * 6), minZ: z, maxZ: z + 1 + Math.floor(random() * 6) };
    };
    const containmentZones = [
        { isSafe: true, bounds: box() },
        { type: 'safe', ...box() },
        { containment: { blocksHostiles: true }, bounds: box() },
        { bounds: box() }, // not safe
        { bounds: box(), safeZones: [{ safeZone: true, bounds: box() }], quietZones: [{ bounds: box() }, { isSafe: true, bounds: box() }] },
        { isSafe: true, bounds: { left: 3, right: 9, top: -4, bottom: 2 } }
    ];
    const doors = [
        { state: 'closed', bounds: box() },
        { open: true, bounds: box() },
        { locked: true, cells: [{ x: 4, z: 7 }, [5, 7], { x: 6, y: 7 }] },
        { open: false, x: -6, z: 11, width: 3, depth: 1 },
        { state: 'locked', x: 12, y: -3 },
        { state: 'closed', bounds: { minX: 'nope' } }
    ];
    return { containmentZones, doors };
}

describe('createAttackPathBlocker', () => {
    it('matches shouldBlockAttackPath on every A* edge across mixed zones and doors', () => {
        const random = rng(4242);
        for (let round = 0; round < 12; round += 1) {
            const options = world(random);
            const blocks = createAttackPathBlocker(options);
            let blocked = 0;
            for (let x = -32; x <= 32; x += 1) {
                for (let z = -32; z <= 32; z += 1) {
                    for (const [dx, dz] of [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0]]) {
                        const a = { x, z };
                        const b = { x: x + dx, z: z + dz };
                        const expected = shouldBlockAttackPath(a, b, options);
                        expect(blocks(a, b)).toBe(expected);
                        if (expected) blocked += 1;
                    }
                }
            }
            expect(blocked).toBeGreaterThan(0);
        }
    });

    it('reads door state at call time', () => {
        const door = { open: true, bounds: { minX: 0, maxX: 1, minZ: -2, maxZ: 2 } };
        const blocks = createAttackPathBlocker({ containmentZones: [], doors: [door] });
        expect(blocks({ x: -1, z: 0 }, { x: 2, z: 0 })).toBe(false);
        door.open = false;
        expect(blocks({ x: -1, z: 0 }, { x: 2, z: 0 })).toBe(true);
    });

    it('is a no-op with nothing to block', () => {
        const blocks = createAttackPathBlocker({});
        expect(blocks({ x: 0, z: 0 }, { x: 1, z: 1 })).toBe(false);
    });
});
