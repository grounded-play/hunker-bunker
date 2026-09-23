import { describe, expect, it } from 'vitest';
import {
    generateRegionalRouteTopology,
    generateRadialMazeExpedition,
    buildTopologyAdjacency,
    validateExpeditionRouteReachability,
    validateRadialMazeExpedition
} from './mazeExpedition.js';

describe('Expedition Route Reachability & Anti-Softlock Guarantees', () => {
    it('builds an adjacency graph from regional route topology edges', () => {
        const topology = generateRegionalRouteTopology(8128);
        const adjacency = buildTopologyAdjacency(topology);

        expect(adjacency).toBeInstanceOf(Map);
        expect(adjacency.has(topology.startChunkKey)).toBe(true);
        expect(adjacency.has(topology.queenChunkKey)).toBe(true);

        const startNeighbors = adjacency.get(topology.startChunkKey);
        expect(startNeighbors.length).toBeGreaterThan(0);
    });

    it('validates guaranteed reachability from start to Queen across seeds', () => {
        for (const seed of [1, 42, 1337, 8128, 9999]) {
            const topology = generateRegionalRouteTopology(seed);
            const reachability = validateExpeditionRouteReachability(topology);

            expect(reachability.valid, `seed ${seed}`).toBe(true);
            expect(reachability.routeCount, `seed ${seed}`).toBeGreaterThanOrEqual(1);
            expect(reachability.routes[0][0]).toBe(topology.startChunkKey);
            expect(reachability.routes[0].at(-1)).toBe(topology.queenChunkKey);
            expect(reachability.errors).toEqual([]);
        }
    });

    it('attaches reachability analysis to generated topology output', () => {
        const topology = generateRegionalRouteTopology(101);
        expect(topology.reachability).toBeDefined();
        expect(topology.reachability.valid).toBe(true);
        expect(topology.reachability.routeCount).toBeGreaterThanOrEqual(1);
    });

    it('flags unreachable topology when critical edges are severed', () => {
        const topology = generateRegionalRouteTopology(55);
        // Sever all edges connected to the queen chunk
        const severedEdges = topology.routeEdges.filter(
            (edge) => !edge.includes(topology.queenChunkKey)
        );
        const brokenTopology = {
            ...topology,
            routeEdges: severedEdges
        };

        const reachability = validateExpeditionRouteReachability(brokenTopology);
        expect(reachability.valid).toBe(false);
        expect(reachability.routeCount).toBe(0);
        expect(reachability.errors[0]).toContain('unreachable');
    });

    it('validates radial expedition plans including topology reachability', () => {
        const plan = generateRadialMazeExpedition(777);
        const validation = validateRadialMazeExpedition(plan);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toEqual([]);

        // Intentionally break the topology in the plan
        const brokenPlan = {
            ...plan,
            topology: {
                ...plan.topology,
                routeEdges: plan.topology.routeEdges.filter(
                    (edge) => !edge.includes(plan.topology.queenChunkKey)
                )
            }
        };
        const brokenValidation = validateRadialMazeExpedition(brokenPlan);
        expect(brokenValidation.valid).toBe(false);
        expect(brokenValidation.errors.some((err) => err.includes('unreachable'))).toBe(true);
    });
});
