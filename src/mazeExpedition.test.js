import { describe, expect, it } from 'vitest';
import {
    MAZE_EXPEDITION_EDGES,
    MAZE_EXPEDITION_NODES,
    MAZE_GENERATION_RULES,
    MAZE_ROOM_TILES,
    RADIAL_SITE_RULES,
    computeReachableRings,
    computeRingWalkDistances,
    generateRadialMazeExpedition,
    validateRadialMazeExpedition,
    validateRingProgression,
    validateMazeExpedition
} from './mazeExpedition.js';

describe('long maze expedition plan', () => {
    it('has a valid guaranteed route from the O2 ship to the Queen', () => {
        expect(validateMazeExpedition()).toEqual({ valid: true, errors: [] });
    });

    it('keeps the O2 exit north-facing and the Queen deepest', () => {
        expect(MAZE_ROOM_TILES.o2_ship.doors).toEqual(['n']);
        expect(MAZE_ROOM_TILES.o2_ship.orientationLocked).toBe(true);
        const queen = MAZE_EXPEDITION_NODES.find((node) => node.id === 'queen_chamber');
        expect(queen.depth).toBe(Math.max(...MAZE_EXPEDITION_NODES.map((node) => node.depth)));
    });

    it('contains three camps, three hives, loops, and vertical travel', () => {
        expect(MAZE_EXPEDITION_NODES.filter((node) => node.kind === 'camp')).toHaveLength(3);
        expect(MAZE_EXPEDITION_NODES.filter((node) => node.kind === 'hive_threshold')).toHaveLength(3);
        expect(MAZE_EXPEDITION_EDGES.some((edge) => edge.kind === 'shortcut')).toBe(true);
        expect(MAZE_EXPEDITION_EDGES.some((edge) => edge.vertical)).toBe(true);
        expect(MAZE_GENERATION_RULES.canyonOutsideWalkableTiles).toBe(true);
    });

    it('rejects an accidental early Queen bypass or missing critical segment', () => {
        const broken = MAZE_EXPEDITION_EDGES.filter((edge) => (
            !(edge.from === 'final_shelter' && edge.to === 'queen_chamber')
        ));
        const result = validateMazeExpedition(MAZE_EXPEDITION_NODES, broken);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('queen_chamber is not on the guaranteed critical route');
    });

    it('generates deterministic radial rings with the required camp and hive distribution', () => {
        const a = generateRadialMazeExpedition(8128);
        const b = generateRadialMazeExpedition(8128);
        const c = generateRadialMazeExpedition(8129);
        expect(a).toEqual(b);
        expect(c).not.toEqual(a);
        expect(validateRadialMazeExpedition(a)).toEqual({ valid: true, errors: [] });
        for (const [id, rule] of Object.entries(RADIAL_SITE_RULES)) {
            expect(a.nodes.find((node) => node.id === id)?.ring).toBe(rule.ring);
        }
    });

    it('fills every ring with room clusters and gates outward rings with missions', () => {
        for (let seed = 1; seed <= 100; seed += 1) {
            const plan = generateRadialMazeExpedition(seed);
            expect(validateRadialMazeExpedition(plan), `seed ${seed}`).toEqual({ valid: true, errors: [] });
            expect(plan.blockers).toHaveLength(4);
            expect(plan.blockers.every((blocker) => blocker.locked && blocker.missionId)).toBe(true);
            for (let ring = 1; ring <= 5; ring += 1) {
                expect(plan.roomClusters.filter((cluster) => cluster.ring === ring).length)
                    .toBeGreaterThanOrEqual(8);
            }
        }
    });
});

describe('radial ring crossing gates are provably non-bypassable', () => {
    it('reaches only ring 0 and 1 with every blocker locked', () => {
        const plan = generateRadialMazeExpedition(1);
        expect(computeReachableRings(plan, new Set())).toEqual(new Set([0, 1]));
    });

    it('unlocking a blocker opens exactly its own ring, never an ahead-of-schedule one', () => {
        const plan = generateRadialMazeExpedition(1);
        const reachableAfterFirst = computeReachableRings(plan, new Set(['ring-1-gate']));
        expect(reachableAfterFirst).toEqual(new Set([0, 1, 2]));
        const reachableAfterFirstTwo = computeReachableRings(plan, new Set(['ring-1-gate', 'ring-2-gate']));
        expect(reachableAfterFirstTwo).toEqual(new Set([0, 1, 2, 3]));
    });

    it('reaches every ring once all blockers are unlocked', () => {
        const plan = generateRadialMazeExpedition(1);
        const allBlockerIds = new Set(plan.blockers.map((blocker) => blocker.id));
        expect(computeReachableRings(plan, allBlockerIds)).toEqual(new Set([0, 1, 2, 3, 4, 5]));
    });

    it('increases shortest walk distance strictly outward by ring', () => {
        const plan = generateRadialMazeExpedition(1);
        const distances = computeRingWalkDistances(plan);
        for (let ring = 1; ring <= 5; ring += 1) {
            expect(distances.get(ring), `ring ${ring}`).toBeGreaterThan(distances.get(ring - 1));
        }
    });

    it('holds ring-progression non-bypass and distance invariants across 2,000 seeds', () => {
        for (let seed = 1; seed <= 2000; seed += 1) {
            const plan = generateRadialMazeExpedition(seed);
            expect(validateRingProgression(plan), `seed ${seed}`).toEqual({ valid: true, errors: [] });
        }
    });

    it('flags a plan whose blocker fails to gate its ring', () => {
        const plan = generateRadialMazeExpedition(1);
        const broken = {
            ...plan,
            edges: plan.edges.map((edge) => (edge.blockerId === 'ring-2-gate' ? { ...edge, blockerId: null } : edge))
        };
        const result = validateRingProgression(broken);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('ring 3 reachable before ring-2-gate is unlocked');
    });
});
