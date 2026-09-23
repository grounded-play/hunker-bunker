import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';
import {
    findRouteCutChunks,
    generateRadialMazeExpedition,
    LEGACY_ROUTE_LAYOUT_VERSION,
    ROUTE_LAYOUT_VERSION
} from './mazeExpedition.js';
import { buildWorldPlan } from './ringManifest.js';
import { createMilestoneBossLifecycleState } from './milestoneBossLifecycle.js';
import { planBridgeDeckCells } from './worldTransformations.js';
import { clampPositionToAuthoredRing } from './authoredWorldRuntime.js';

/**
 * Navigation proof for ring crossings, on the stamped tile grid rather than
 * the plan: a valid world plan is not evidence that the player can actually
 * walk through a gate. For every gate across a seed portfolio on both route
 * generations this asserts
 *   - the far side is reachable from the approach through the open door,
 *   - while the gate is locked, the door and its mission console are
 *     reachable inside the live ring boundary (clampPositionToAuthoredRing),
 *     so the gate can always be worked from the near side,
 *   - the chunk beyond the gate is outside that boundary while locked,
 *   - on route generation 2, the gate is a cut point of the route graph, and
 *   - the collapsed bridge's corridor exists to be decked when it opens.
 * The lock itself is that boundary, not the tiles: exterior ledges can run
 * round a gate room, and on generation 1 ring loops can run round a gate
 * (208 of 240 gates across 60 seeds are not cut points), so the clamp is
 * what stops a carrier using them.
 */
function topologyEdgeOpening(worldPlan, axis, edgeX, edgeY) {
    const left = axis === 'horizontal' ? `${edgeX},${edgeY - 1}` : `${edgeX - 1},${edgeY}`;
    const right = `${edgeX},${edgeY}`;
    return {
        open: worldPlan.topology.routeEdges.includes([left, right].sort().join('|')),
        offset: 12
    };
}

function buildCrossingChunk(worldPlan, crossing) {
    const fakeThis = {
        chunkSize: 49,
        chunkCellCount: 24,
        performanceProfile: 'gameplay',
        createSeededRandom: ThreeGame.prototype.createSeededRandom,
        getEdgeOpening: (axis, edgeX, edgeY) => topologyEdgeOpening(worldPlan, axis, edgeX, edgeY),
        ensureChunkPortals: ThreeGame.prototype.ensureChunkPortals,
        widenChunkCorridors: ThreeGame.prototype.widenChunkCorridors,
        runMazeDetailPass: ThreeGame.prototype.runMazeDetailPass,
        clearSpawnArea: ThreeGame.prototype.clearSpawnArea,
        getDepthTier: () => 1,
        isInTutorialRing: () => false,
        getChunkLandform: () => 'maze',
        getLandformType: () => 'maze',
        getWallKey: (x, z) => `${x},${z}`,
        hashTile: ThreeGame.prototype.hashTile,
        runEntropy: 42,
        chunkCache: new Map(),
        wfcMetadataCache: new Map(),
        authoredWorldTiles: true,
        worldPlan,
        getRadialMazePlan: () => ({ topology: worldPlan.topology, blockers: [], nodes: [], roomClusters: [], radii: [] }),
        ensureAuthoredWorldPlan: () => worldPlan,
        getActiveAuthoredReservationIds: () => new Set(),
        getBiomeKeyForWorldPosition: () => 'ACTIVE',
        bank: { getState: () => ({ unlocks: {} }) },
        mazeAccessState: { completedObjectives: new Set() },
        completedRingCrossingMissionIds: new Set(),
        milestoneBossLifecycleState: createMilestoneBossLifecycleState(),
        ringCrossingState: null,
        proceduralDoorStates: new Map(),
        getBuiltGoalKeys: ThreeGame.prototype.getBuiltGoalKeys,
        reconcileAuthoredWorldProgression: ThreeGame.prototype.reconcileAuthoredWorldProgression
    };

    const grid = ThreeGame.prototype.buildChunk.call(fakeThis, crossing.chunkX, crossing.chunkY);
    const metadata = fakeThis.wfcMetadataCache.get(crossing.chunkKey);
    const claim = (worldPlan.setpieceClaims ?? []).find((entry) => entry.chunkKeys?.includes(crossing.chunkKey));
    return {
        crossing,
        grid,
        metadata,
        onSetpiece: Boolean(claim),
        onSetpiecePivot: claim ? claim.chunkKeys[0] === crossing.chunkKey : null
    };
}

const WALKABLE = new Set(['.', 'R', 'B', 'L', 'O']);
// getBiomeAnchorPosition(): the crashed ship at the crash-site centre.
const SHIP_ANCHOR = { x: 9, z: 9 };
const STEP = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };

function borderCells(grid, side) {
    const size = grid.length;
    const cells = [];
    for (let i = 0; i < size; i += 1) {
        const [x, y] = side === 'n' ? [i, 0] : side === 's' ? [i, size - 1] : side === 'w' ? [0, i] : [size - 1, i];
        if (WALKABLE.has(grid[y]?.[x])) cells.push({ x, y });
    }
    return cells;
}

function reachable(grid, starts, { doorsOpen }) {
    const seen = new Set(starts.map(({ x, y }) => `${x},${y}`));
    const queue = [...starts];
    while (queue.length) {
        const { x, y } = queue.pop();
        for (const [dx, dy] of Object.values(STEP)) {
            const nx = x + dx;
            const ny = y + dy;
            const tile = grid[ny]?.[nx];
            if (seen.has(`${nx},${ny}`)) continue;
            if (!(WALKABLE.has(tile) || (doorsOpen && tile === 'D'))) continue;
            seen.add(`${nx},${ny}`);
            queue.push({ x: nx, y: ny });
        }
    }
    return seen;
}

const PORTFOLIO = [
    ...[1, 3, 8, 44, 200, 8128].map((seed) => [seed, LEGACY_ROUTE_LAYOUT_VERSION]),
    ...[1, 2, 5, 17, 91, 4242].map((seed) => [seed, ROUTE_LAYOUT_VERSION])
];

describe('ring crossings are walkable gates on the stamped grid', () => {
    it.each(PORTFOLIO)('seed %i, route generation %i: every gate can be worked while locked and opens onto its far side', (seed, layoutVersion) => {
        const worldPlan = buildWorldPlan(generateRadialMazeExpedition(seed, { layoutVersion }));
        expect(worldPlan.ringCrossings).toHaveLength(4);
        for (const crossing of worldPlan.ringCrossings) {
            const label = `seed ${seed} v${layoutVersion} ${crossing.id}`;
            const { grid, metadata } = buildCrossingChunk(worldPlan, crossing);
            const door = (metadata?.doors ?? []).find((entry) => entry.ringCrossingId === crossing.id);
            expect(door, `${label}: crossing door`).toBeTruthy();
            const farEdge = borderCells(grid, door.side);
            const approachEdges = ['n', 's', 'w', 'e'].filter((side) => side !== door.side).flatMap((side) => borderCells(grid, side));
            expect(farEdge.length, `${label}: far-side opening`).toBeGreaterThan(0);
            // A generation-1 spur gate: one opening, shared by approach and
            // far side. The route never needed to pass it.
            const isSpur = approachEdges.length === 0;
            if (!isSpur) {
                const open = reachable(grid, approachEdges, { doorsOpen: true });
                expect(farEdge.some(({ x, y }) => open.has(`${x},${y}`)), `${label}: far side reachable through the open door`).toBe(true);
            } else {
                expect(layoutVersion, `${label}: dead-end gate rooms only survive in generation 1`).toBe(LEGACY_ROUTE_LAYOUT_VERSION);
            }
            // Locked: only ground inside the live ring boundary counts.
            const chunkSize = 49;
            const clampedAt = (worldX, worldZ) => clampPositionToAuthoredRing(
                worldX, worldZ, SHIP_ANCHOR, crossing.ring, worldPlan.radii ?? undefined, { worldPlan, chunkSize }
            ).blocked;
            const insideBoundary = (x, y) => !clampedAt(crossing.chunkX * chunkSize + x, crossing.chunkY * chunkSize + y);
            // A spur's single door stays open (threeGame never locks it): the
            // console behind it must be reachable, and the spur gates nothing.
            expect(door.state, `${label}: spur door left open`).toBe(isSpur ? 'open' : 'locked');
            const shutCells = new Set(isSpur ? [] : (door.cells ?? [{ x: door.localX, y: door.localY }]).map(({ x, y }) => `${x},${y}`));
            const lockedGrid = grid.map((row, y) => row.map((tile, x) => (
                shutCells.has(`${x},${y}`) || !insideBoundary(x, y) ? '#' : tile === 'D' ? '.' : tile
            )));
            const nearStarts = (isSpur ? farEdge : approachEdges).filter(({ x, y }) => insideBoundary(x, y));
            expect(nearStarts.length, `${label}: approach inside the ring boundary`).toBeGreaterThan(0);
            const locked = reachable(lockedGrid, nearStarts, { doorsOpen: false });
            const [sx, sy] = STEP[door.side];
            const atDoor = isSpur || [...shutCells].some((key) => {
                const [x, y] = key.split(',').map(Number);
                return locked.has(`${x - sx},${y - sy}`);
            });
            expect(atDoor, `${label}: door reachable while locked`).toBe(true);
            const control = (metadata.accessSources ?? []).find((source) => source.id === `${crossing.id}:mission-control`);
            expect(control, `${label}: mission console`).toBeTruthy();
            const consoleReachable = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]
                .some(([dx, dy]) => locked.has(`${control.localX + dx},${control.localY + dy}`));
            expect(consoleReachable, `${label}: mission console reachable while locked`).toBe(true);
            // The chunk beyond the door stays locked -- unless the gate is a
            // generation-1 spur, whose only route neighbour is also its approach.
            const [fx, fy] = STEP[door.side];
            const farKey = `${crossing.chunkX + fx},${crossing.chunkY + fy}`;
            // Exact lock wherever every route passes through the gate: that is
            // every generation-2 gate, and the minority of generation-1 ones.
            const cuts = findRouteCutChunks(worldPlan.topology, worldPlan.topology.startChunkKey, worldPlan.topology.queenChunkKey);
            if (layoutVersion >= ROUTE_LAYOUT_VERSION) {
                expect(cuts.has(crossing.chunkKey), `${label}: every route passes through the gate`).toBe(true);
            }
            if (cuts.has(crossing.chunkKey) && !isSpur) {
                expect(clampedAt((crossing.chunkX + fx + 0.5) * chunkSize, (crossing.chunkY + fy + 0.5) * chunkSize),
                    `${label}: far chunk ${farKey} locked`).toBe(true);
            }
            if (crossing.opensTraversal === 'bridge') {
                expect(crossing.ring, `${label}: the bridge is the ring 2 gate`).toBe(2);
                expect(planBridgeDeckCells(grid, door).length, `${label}: bridge corridor to deck`).toBeGreaterThan(0);
            }
        }
    });
});
