import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { generateRadialMazeExpedition, ROUTE_LAYOUT_VERSION } from './mazeExpedition.js';
import { buildWorldPlan } from './ringManifest.js';
import { createMilestoneBossLifecycleState } from './milestoneBossLifecycle.js';

/**
 * A ring crossing must always end up with a threshold and a gate control.
 *
 * Setpiece claims legitimately cover crossing chunks -- the collapsed bridge IS
 * the ring-1 gate -- but only the claim's PIVOT chunk produces a room. When the
 * gate landed on a non-pivot module, the resolver accepted the doorless setpiece
 * module: the chunk looked right, had no door and no mission console, and the
 * ring could never be opened. Seeded gate placement made that far more
 * reachable, which is how it surfaced.
 *
 * Asserted at the buildChunk layer on purpose. Authored room structures carry no
 * `doors` of their own -- thresholds are cut further down the pipeline -- so a
 * unit-level check of the resolver would prove nothing about whether the gate
 * can actually be opened.
 */
function topologyEdgeOpening(worldPlan, axis, edgeX, edgeY) {
    const left = axis === 'horizontal' ? `${edgeX},${edgeY - 1}` : `${edgeX - 1},${edgeY}`;
    const right = `${edgeX},${edgeY}`;
    return {
        open: worldPlan.topology.routeEdges.includes([left, right].sort().join('|')),
        offset: 12
    };
}

function buildGateChunk(seed, layoutVersion = undefined) {
    const worldPlan = buildWorldPlan(generateRadialMazeExpedition(seed, { layoutVersion }));
    const crossing = worldPlan.ringCrossings[0];
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

    ThreeGame.prototype.buildChunk.call(fakeThis, crossing.chunkX, crossing.chunkY);
    const metadata = fakeThis.wfcMetadataCache.get(crossing.chunkKey);
    const claim = (worldPlan.setpieceClaims ?? []).find((entry) => entry.chunkKeys?.includes(crossing.chunkKey));
    return {
        crossing,
        metadata,
        onSetpiece: Boolean(claim),
        onSetpiecePivot: claim ? claim.chunkKeys[0] === crossing.chunkKey : null
    };
}

// Kept small on purpose: each entry builds a world plan AND a chunk, which is
// the expensive part of this suite. These four cover a gate on a setpiece pivot
// (8, 8128) and a gate on a non-pivot module (200), which is the regression.
const SEEDS = [8, 200, 8128];

describe('ring crossing chunks keep their threshold', () => {
    it('stamps exactly one crossing door on every seed', () => {
        for (const seed of SEEDS) {
            const { crossing, metadata } = buildGateChunk(seed);
            const crossingDoors = (metadata?.doors ?? [])
                .filter((door) => door.ringCrossingId === crossing.id);
            expect(crossingDoors.length, `seed ${seed}: ${crossing.id} crossing doors`).toBe(1);
        }
    });

    it('keeps the mission control the crossing needs to be opened', () => {
        for (const seed of SEEDS) {
            const { crossing, metadata } = buildGateChunk(seed);
            const control = (metadata?.accessSources ?? [])
                .find((source) => source.id === `${crossing.id}:mission-control`);
            expect(control, `seed ${seed}: ${crossing.id} mission control`).toBeTruthy();
        }
    });

    // The regression in miniature: a gate sitting on a non-pivot setpiece module
    // is exactly the case that used to silently lose its door.
    it('survives a gate that lands on a non-pivot setpiece module', () => {
        let checked = 0;
        for (const seed of SEEDS) {
            const { crossing, metadata, onSetpiece, onSetpiecePivot } = buildGateChunk(seed);
            if (!onSetpiece || onSetpiecePivot !== false) continue;
            checked += 1;
            expect(metadata.generatorId, `seed ${seed}`).not.toBe('authored-setpiece');
            expect((metadata.doors ?? []).filter((d) => d.ringCrossingId === crossing.id)).toHaveLength(1);
        }
        expect(checked, 'sweep found no non-pivot gate chunks — it has gone stale').toBeGreaterThan(0);
    });

    // The same regression on the current route generation, whose coils put
    // gates on non-pivot modules at different seeds.
    it('keeps the threshold on non-pivot gates of the current route generation', () => {
        for (const seed of [2, 3]) {
            const { crossing, metadata, onSetpiece, onSetpiecePivot } = buildGateChunk(seed, ROUTE_LAYOUT_VERSION);
            expect(onSetpiece && onSetpiecePivot === false, `seed ${seed} no longer lands on a non-pivot module`).toBe(true);
            expect(metadata.generatorId, `seed ${seed}`).not.toBe('authored-setpiece');
            expect((metadata.doors ?? []).filter((d) => d.ringCrossingId === crossing.id)).toHaveLength(1);
            expect((metadata.accessSources ?? []).some((source) => source.id === `${crossing.id}:mission-control`)).toBe(true);
        }
    });
});
