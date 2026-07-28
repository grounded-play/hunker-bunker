import { describe, expect, it } from 'vitest';
import { planSafeGates, buildLatticeEdges, reachableNodes } from './mazeGates.js';
import { TILE_CATALOG } from './tileCatalog.js';

describe('safe maze gates', () => {
    it('places a prerequisite on the reachable side of a bridge gate', () => {
        const room = TILE_CATALOG.find((tile) => tile.id === 'room-alcove-e');
        const hall = TILE_CATALOG.find((tile) => tile.id === 'corridor-straight-ew');
        const solid = TILE_CATALOG.find((tile) => tile.id === 'solid-fill');
        const lattice = [room, hall, room, solid, solid, solid, solid, solid, solid];
        const rooms = [
            {
                id: 'r0', latticeIndex: 0,
                doors: [{ id: 'd0', side: 'e', neighborIndex: 1 }]
            },
            {
                id: 'r2', latticeIndex: 2,
                doors: [{ id: 'd2', side: 'w', neighborIndex: 1 }]
            }
        ];
        const result = planSafeGates(lattice, rooms, [
            { id: 'd0', roomId: 'r0' },
            { id: 'd2', roomId: 'r2' }
        ], () => 0, { depthTier: 3, biome: 'active' });
        expect(result.gates).toHaveLength(1);
        expect(result.accessSources).toHaveLength(1);
        expect(result.accessSources[0].roomId).toBe('r0');

        const edges = buildLatticeEdges(lattice);
        edges.delete(result.gates[0].cutEdge);
        expect(reachableNodes(9, edges, 0).has(2)).toBe(false);
    });
});
