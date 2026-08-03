import { describe, expect, it } from 'vitest';
import {
    buildWorldRouteGraph,
    extractChunkPortals,
    reachableChunkKeys
} from './worldRoutePlanner.js';

describe('world route planner', () => {
    it('extracts edge portals and joins only matching neighboring edges', () => {
        const grid = Array.from({ length: 3 }, () => Array(3).fill('#'));
        grid[1][2] = '.';
        expect(extractChunkPortals(grid)).toEqual({
            north: false,
            east: true,
            south: false,
            west: false
        });
        const graph = buildWorldRouteGraph([
            { key: '0,0', chunkX: 0, chunkY: 0, portals: { east: true } },
            { key: '1,0', chunkX: 1, chunkY: 0, portals: { west: true, south: true } },
            { key: '1,1', chunkX: 1, chunkY: 1, portals: { north: true } }
        ]);
        expect(reachableChunkKeys(graph, '0,0')).toEqual(new Set(['0,0', '1,0', '1,1']));
    });
});
