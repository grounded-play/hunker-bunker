import { CHUNK_SIZE } from './tileCatalog.js';
import { describe, expect, it } from 'vitest';
import {
    MAZE_EXPEDITION_EDGES,
    MAZE_EXPEDITION_NODES,
    MAZE_GENERATION_RULES,
    MAZE_ROOM_TILES,
    RADIAL_RING_RADII,
    RADIAL_SITE_RULES,
    computeReachableRings,
    computeRingWalkDistances,
    computeTopologyDistances,
    clampPositionToUnlockedRing,
    isChunkOnRingBarrier,
    findConflictingChunkReservations,
    generateRadialMazeExpedition,
    generateRegionalRouteTopology,
    getLockedRingBoundaryRadius,
    getMaxUnlockedRing,
    projectPlanToChunkReservations,
    validateRadialMazeExpedition,
    validateRingProgression,
    validateMazeExpedition,
    worldToChunkCoords
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
    }, 20_000);

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

describe('authoritative regional snake-and-rings topology', () => {
    function adjacency(topology) {
        const graph = new Map(topology.routeChunks.map((chunk) => [`${chunk.chunkX},${chunk.chunkY}`, new Set()]));
        for (const edge of topology.routeEdges) {
            const [a, b] = edge.split('|');
            graph.get(a)?.add(b);
            graph.get(b)?.add(a);
        }
        return graph;
    }

    it('builds one connected Manhattan route from the crash site to the mother hive', () => {
        const topology = generateRegionalRouteTopology(8128);
        const graph = adjacency(topology);
        const seen = new Set([topology.startChunkKey]);
        const queue = [topology.startChunkKey];
        while (queue.length) {
            const current = queue.shift();
            for (const next of graph.get(current) ?? []) {
                const [ax, ay] = current.split(',').map(Number);
                const [bx, by] = next.split(',').map(Number);
                expect(Math.abs(ax - bx) + Math.abs(ay - by)).toBe(1);
                if (seen.has(next)) continue;
                seen.add(next);
                queue.push(next);
            }
        }
        expect(seen.has(topology.queenChunkKey)).toBe(true);
        expect(seen.size).toBe(graph.size);
        expect(topology.spineChunkKeys.length).toBeGreaterThan(35);
        expect(computeTopologyDistances(topology).get(topology.queenChunkKey)).toBeGreaterThan(80);
    });

    it('wraps all five levels of the snake in substantial ring routes', () => {
        const topology = generateRegionalRouteTopology(1441);
        expect(topology.rings.map((ring) => ring.ring)).toEqual([1, 2, 3, 4, 5]);
        for (const ring of topology.rings) {
            expect(ring.chunkKeys.length, `ring ${ring.ring}`).toBeGreaterThanOrEqual(12);
            expect(ring.chunkKeys.every((key) => topology.routeChunks.some(
                (chunk) => `${chunk.chunkX},${chunk.chunkY}` === key
            ))).toBe(true);
        }
    });

    it('places every camp, hive, blocker, and Queen on the physical route graph', () => {
        for (let seed = 1; seed <= 100; seed += 1) {
            const plan = generateRadialMazeExpedition(seed);
            const routeKeys = new Set(plan.topology.routeChunks.map((chunk) => `${chunk.chunkX},${chunk.chunkY}`));
            for (const site of [...plan.nodes, ...plan.blockers]) {
                expect(routeKeys.has(`${site.chunkX ?? 0},${site.chunkY ?? 0}`), `${seed}:${site.id}`).toBe(true);
            }
            const queen = plan.nodes.find((node) => node.id === 'queen_chamber');
            expect(`${queen.chunkX},${queen.chunkY}`).toBe(plan.topology.queenChunkKey);
        }
    });

    it('varies the labyrinth by seed while preserving its structural contract', () => {
        const a = generateRegionalRouteTopology(11, { phase: 0.3 });
        const b = generateRegionalRouteTopology(12, { phase: 1.7 });
        expect(a.routeEdges).not.toEqual(b.routeEdges);
        expect(a.rings.length).toBe(b.rings.length);
        expect(a.startChunkKey).toBe('0,0');
        expect(b.startChunkKey).toBe('0,0');
    });
});

describe('chunk reservation projection (Phase 6.1 foundation)', () => {
    it('matches threeGame.js\'s own world-to-chunk convention (Math.floor(coord / CHUNK_SIZE))', () => {
        expect(worldToChunkCoords(0, 0)).toEqual({ chunkX: 0, chunkY: 0 });
        expect(worldToChunkCoords(CHUNK_SIZE, CHUNK_SIZE * 2)).toEqual({ chunkX: 1, chunkY: 2 });
        expect(worldToChunkCoords(-1, -(CHUNK_SIZE + 1))).toEqual({ chunkX: -1, chunkY: -2 });
    });

    it('reserves a chunk for every node, room cluster, and blocker with finite coordinates', () => {
        const plan = generateRadialMazeExpedition(1);
        const reservations = projectPlanToChunkReservations(plan);
        const totalSites = [...reservations.values()].reduce((sum, entry) => sum + entry.sites.length, 0);
        const expectedSites = plan.nodes.length + plan.roomClusters.length + plan.blockers.length;
        expect(totalSites).toBe(expectedSites);
    });

    it('places o2_ship at chunk (0,0), matching worldRoutePlanner\'s reachability start key', () => {
        const plan = generateRadialMazeExpedition(1);
        const reservations = projectPlanToChunkReservations(plan);
        const shipChunk = [...reservations.values()].find((entry) => entry.sites.some((site) => site.id === 'o2_ship'));
        expect(shipChunk?.chunkX).toBe(0);
        expect(shipChunk?.chunkY).toBe(0);
    });

    it('flags it when two required (node/blocker) sites land in the same chunk', () => {
        const plan = generateRadialMazeExpedition(1);
        const collided = {
            ...plan,
            nodes: plan.nodes.map((node, index) => (index === 1 ? { ...node, x: plan.nodes[0].x, z: plan.nodes[0].z } : node))
        };
        const conflicts = findConflictingChunkReservations(collided);
        expect(conflicts.length).toBeGreaterThan(0);
        expect(conflicts[0].siteIds).toContain(plan.nodes[0].id);
    });

    it('quantifies the current macro-plan spacing gap across 2,000 seeds (documents reality, does not silently hide it)', () => {
        // Known, minor gap: RADIAL_SITE_RULES/RING_BLOCKER_FEATURES placement
        // doesn't check chunk-grid separation, only angular separation
        // (generateRadialMazeExpedition's per-ring angle retry loop). A future
        // Phase 6.1/6.3 chunk-generation integration needs to either merge a
        // colliding node+blocker into one chunk's purpose or extend the
        // angle-retry loop to also check chunk distance -- this test exists
        // so that work starts from a measured number, not a guess, and so a
        // regression (a much higher collision rate) gets caught.
        let seedsWithConflicts = 0;
        for (let seed = 1; seed <= 2000; seed += 1) {
            const plan = generateRadialMazeExpedition(seed);
            if (findConflictingChunkReservations(plan).length > 0) seedsWithConflicts += 1;
        }
        const conflictRate = seedsWithConflicts / 2000;
        expect(conflictRate).toBeLessThan(0.05);
    });
});

describe('live ring-lock enforcement (Phase 6.2 soft boundary, no physical geometry yet)', () => {
    it('ring 1 is always unlocked with zero goals unlocked', () => {
        expect(getMaxUnlockedRing(new Set())).toBe(1);
    });

    it('unlocks the next ring for each base goal in order', () => {
        expect(getMaxUnlockedRing(new Set(['o2Bubble']))).toBe(2);
        expect(getMaxUnlockedRing(new Set(['o2Bubble', 'hullExpansion']))).toBe(3);
        expect(getMaxUnlockedRing(new Set(['o2Bubble', 'hullExpansion', 'radarNode']))).toBe(4);
        expect(getMaxUnlockedRing(new Set(['o2Bubble', 'hullExpansion', 'radarNode', 'reactorCompressor']))).toBe(5);
    });

    it('does not skip ahead out of order -- a later goal alone does not unlock earlier rings', () => {
        expect(getMaxUnlockedRing(new Set(['reactorCompressor']))).toBe(1);
    });

    it('every locked-ring boundary sits strictly beyond its own ring radius and before the next ring', () => {
        for (let ring = 1; ring <= 4; ring += 1) {
            const boundary = getLockedRingBoundaryRadius(ring);
            expect(boundary, `ring ${ring}`).toBeGreaterThan(RADIAL_RING_RADII[ring]);
        }
    });

    it('has no boundary (Infinity) once every ring is unlocked', () => {
        expect(getLockedRingBoundaryRadius(5)).toBe(Infinity);
    });

    it('does not move a position that is already within the unlocked radius', () => {
        const result = clampPositionToUnlockedRing(10, 10, { x: 0, z: 0 }, 1);
        expect(result).toEqual({ x: 10, z: 10, blocked: false });
    });

    it('pulls a position beyond the boundary back onto the boundary circle, preserving direction', () => {
        const boundary = getLockedRingBoundaryRadius(1);
        const result = clampPositionToUnlockedRing(1000, 0, { x: 0, z: 0 }, 1);
        expect(result.blocked).toBe(true);
        expect(result.x).toBeCloseTo(boundary, 5);
        expect(result.z).toBeCloseTo(0, 5);
    });

    it('clamps relative to a non-origin anchor', () => {
        const boundary = getLockedRingBoundaryRadius(1);
        const result = clampPositionToUnlockedRing(1000, 50, { x: 0, z: 50 }, 1);
        expect(result.blocked).toBe(true);
        expect(result.x).toBeCloseTo(boundary, 5);
        expect(result.z).toBeCloseTo(50, 5);
    });

    it('never blocks a camp/hive site actually on its planned ring, given the +/-22 placement tolerance', () => {
        // isSiteOnPlannedRing (threeGame.js) allows a site up to 22 units off
        // its nominal ring radius. The boundary for the ring the site's own
        // goal unlocks must stay outside that band, or legitimate camp
        // access could get clamped.
        for (let ring = 1; ring <= 4; ring += 1) {
            const maxToleratedRadius = RADIAL_RING_RADII[ring] + 22;
            const boundary = getLockedRingBoundaryRadius(ring);
            expect(boundary, `ring ${ring}`).toBeGreaterThan(maxToleratedRadius);
        }
    });
});

describe('isChunkOnRingBarrier (Phase 6.2 visible barrier tell, docs/phase6-wfc-ring-barrier-integration-plan.md)', () => {
    // Must be the real chunk size: RADIAL_RING_RADII derives from CHUNK_SIZE, so
    // feeding a different size here compares chunk centres against radii scaled
    // for a world that is not the one being generated.
    const chunkSize = CHUNK_SIZE;
    const anchor = { x: 0, z: 0 };

    it('defaults to a half-chunk-wide band (live-measured: a full-chunk band over-flagged nearby terrain, see the function comment)', () => {
        // ring 4 radius = 413; chunk (8,0) center = 49*8+24.5 = 416.5, |416.5-413| = 3.5 <= (chunkSize/2)/2
        expect(isChunkOnRingBarrier(8, 0, chunkSize, anchor)).toBe(true);
        // chunk (7,0) center = 367.5, closest radius 304 or 413 both > half-band away
        expect(isChunkOnRingBarrier(7, 0, chunkSize, anchor)).toBe(false);
    });

    it('flags the chunk whose center sits closest to a nominal ring radius, with an explicit wider band', () => {
        // ring 1 radius = 42; chunk (2,0) center = 19*2+9.5 = 47.5, |47.5-42| = 5.5 <= chunkSize/2
        expect(isChunkOnRingBarrier(2, 0, chunkSize, anchor, chunkSize)).toBe(true);
    });

    it('does not flag a chunk clearly between two ring radii', () => {
        // chunk (1,0) center = 28.5, closest radius is 42 (distance 13.5) -- outside any reasonable band
        expect(isChunkOnRingBarrier(1, 0, chunkSize, anchor, chunkSize)).toBe(false);
    });

    it('does not flag the origin/crash-site chunk', () => {
        expect(isChunkOnRingBarrier(0, 0, chunkSize, anchor)).toBe(false);
    });

    it('is anchor-relative, not world-origin-relative', () => {
        const shiftedAnchor = { x: 100, z: 0 };
        // Same relative offset from the shifted anchor as the ring-1 case above
        expect(isChunkOnRingBarrier(Math.round(100 / chunkSize) + 2, 0, chunkSize, shiftedAnchor, chunkSize)).toBe(true);
    });

    it('flags a plausible, non-trivial fraction of a coordinate grid -- not none, not everything', () => {
        let flagged = 0;
        let total = 0;
        for (let cx = -15; cx <= 15; cx += 1) {
            for (let cy = -15; cy <= 15; cy += 1) {
                total += 1;
                if (isChunkOnRingBarrier(cx, cy, chunkSize, anchor)) flagged += 1;
            }
        }
        const fraction = flagged / total;
        expect(flagged, 'at least some chunks should be flagged').toBeGreaterThan(0);
        expect(fraction, 'should not flag the majority of chunks').toBeLessThan(0.5);
    });
});
