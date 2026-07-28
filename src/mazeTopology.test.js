import { describe, expect, it } from 'vitest';
import { graphHasCycle, injectBoundedLoops } from './mazeTopology.js';

const neighbors = [
    [{ index: 1 }, { index: 3 }],
    [{ index: 0 }, { index: 2 }, { index: 4 }],
    [{ index: 1 }, { index: 5 }],
    [{ index: 0 }, { index: 4 }, { index: 6 }],
    [{ index: 1 }, { index: 3 }, { index: 5 }, { index: 7 }],
    [{ index: 2 }, { index: 4 }, { index: 8 }],
    [{ index: 3 }, { index: 7 }],
    [{ index: 4 }, { index: 6 }, { index: 8 }],
    [{ index: 5 }, { index: 7 }]
];

describe('bounded loop injection', () => {
    it('adds a meaningful cycle without connecting two rooms', () => {
        const tree = new Set(['0-1', '1-2', '2-5', '5-8', '7-8', '6-7', '3-6', '3-4']);
        const roles = ['room', 'hallway', 'room', 'hallway', 'room', 'hallway', 'room', 'hallway', 'room'];
        const result = injectBoundedLoops(tree, neighbors, roles, () => 0, {
            chance: 1,
            maxLoops: 1,
            minCycleLength: 4
        });
        expect(result.size).toBe(tree.size + 1);
        expect(graphHasCycle(result, 9)).toBe(true);
        for (const key of result) {
            const [a, b] = key.split('-').map(Number);
            expect(roles[a] === 'room' && roles[b] === 'room', key).toBe(false);
        }
    });

    it('respects forbidden gate-cut edges', () => {
        const tree = new Set(['0-1', '1-2', '2-5', '5-8', '7-8', '6-7', '3-6', '3-4']);
        const forbidden = new Set(['4-5', '4-7']);
        const result = injectBoundedLoops(tree, neighbors, Array(9).fill('hallway'), () => 0, {
            chance: 1,
            maxLoops: 2,
            forbiddenEdges: forbidden
        });
        expect(result.has('4-5')).toBe(false);
        expect(result.has('4-7')).toBe(false);
    });
});
