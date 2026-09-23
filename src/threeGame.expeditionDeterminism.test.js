import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { generateRadialMazeExpedition, ROUTE_LAYOUT_VERSION } from './mazeExpedition.js';
import { buildWorldPlan } from './ringManifest.js';
import { createMilestoneBossLifecycleState } from './milestoneBossLifecycle.js';

function topologyEdgeOpening(worldPlan, axis, edgeX, edgeY) {
    const previous = axis === 'horizontal' ? `${edgeX},${edgeY - 1}` : `${edgeX - 1},${edgeY}`;
    return {
        open: worldPlan.topology.routeEdges.includes([previous, `${edgeX},${edgeY}`].sort().join('|')),
        offset: 12
    };
}

function authoredBuildFixture(worldPlan) {
    return {
        chunkSize: 49,
        chunkCellCount: 24,
        performanceProfile: 'gameplay',
        createSeededRandom: ThreeGame.prototype.createSeededRandom,
        getEdgeOpening: (axis, x, y) => topologyEdgeOpening(worldPlan, axis, x, y),
        ensureChunkPortals: ThreeGame.prototype.ensureChunkPortals,
        widenChunkCorridors: ThreeGame.prototype.widenChunkCorridors,
        runMazeDetailPass: ThreeGame.prototype.runMazeDetailPass,
        clearSpawnArea: ThreeGame.prototype.clearSpawnArea,
        getDepthTier: () => 2,
        isInTutorialRing: () => false,
        getChunkLandform: () => 'maze',
        getLandformType: () => 'maze',
        getWallKey: (x, z) => `${x},${z}`,
        hashTile: ThreeGame.prototype.hashTile,
        runEntropy: worldPlan.seed,
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
}

const worldPlan = buildWorldPlan(generateRadialMazeExpedition(44, { layoutVersion: ROUTE_LAYOUT_VERSION }));
const reserved = new Set([
    ...worldPlan.reservations.map((entry) => entry.chunkKey),
    ...worldPlan.setpieceClaims.flatMap((claim) => claim.chunkKeys)
]);
const routeChunks = worldPlan.topology.routeChunks.filter((chunk) => (
    chunk.roles.includes('ring')
    && !chunk.roles.some((role) => ['camp', 'hive', 'queen', 'room', 'mission'].includes(role))
    && !reserved.has(`${chunk.chunkX},${chunk.chunkY}`)
));

function buildSnapshot(game, chunk) {
    const key = `${chunk.chunkX},${chunk.chunkY}`;
    const grid = ThreeGame.prototype.buildChunk.call(game, chunk.chunkX, chunk.chunkY);
    const metadata = game.wfcMetadataCache.get(key);
    return {
        grid: grid.map((row) => row.join('')),
        generatorId: metadata.generatorId,
        rooms: metadata.roomInstances,
        doors: metadata.doors,
        doorStates: [...game.proceduralDoorStates.values()].filter((door) => door.chunkKey === key)
    };
}

describe('expedition reconstruction determinism', () => {
    it.each([0, 1])('reconstructs unreserved route chunks with parity %i regardless of loaded adjacent rooms', (parity) => {
        const chunks = routeChunks.filter((chunk) => Math.abs(chunk.chunkX + chunk.chunkY) % 2 === parity).slice(0, 3);
        expect(chunks).toHaveLength(3);
        for (const chunk of chunks) {
            const unloaded = authoredBuildFixture(worldPlan);
            const loaded = authoredBuildFixture(worldPlan);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                loaded.wfcMetadataCache.set(`${chunk.chunkX + dx},${chunk.chunkY + dy}`, {
                    roomInstances: [{ id: `previously-visited:${dx},${dy}` }]
                });
            }
            const expected = buildSnapshot(unloaded, chunk);
            const actual = buildSnapshot(loaded, chunk);
            expect(actual).toEqual(expected);
            if (parity === 0) {
                expect(actual.generatorId).toBe('architectural-room');
                expect(actual.doors.length).toBeGreaterThan(0);
                expect(actual.doorStates.length).toBe(actual.doors.length);
            }
        }
    });

    it('keeps generated rooms and door records when the same route is streamed in reverse order', () => {
        const chunks = routeChunks.slice(0, 8);
        expect(chunks).toHaveLength(8);
        const forward = authoredBuildFixture(worldPlan);
        const reverse = authoredBuildFixture(worldPlan);
        const snapshots = new Map(chunks.map((chunk) => [
            `${chunk.chunkX},${chunk.chunkY}`, buildSnapshot(forward, chunk)
        ]));
        for (const chunk of [...chunks].reverse()) {
            expect(buildSnapshot(reverse, chunk)).toEqual(snapshots.get(`${chunk.chunkX},${chunk.chunkY}`));
        }
    });
});

describe('authored hive shelter after a campaign choice', () => {
    it.each(['slain', 'queen_consumed', 'expired_by_cure', 'aboard'])('removes a real communion room\'s containment after the hive becomes %s', (status) => {
        const game = authoredBuildFixture(worldPlan);
        const heart = worldPlan.reservations.find((entry) => entry.id === 'territory:hive_suture');
        ThreeGame.prototype.buildChunk.call(game, heart.chunkX, heart.chunkY);
        const room = game.wfcMetadataCache.get(heart.chunkKey).roomInstances[0];
        expect(room.siteId).toBe('hive_suture');
        expect(room.isSafe).toBe(true);
        for (const door of game.proceduralDoorStates.values()) door.state = 'closed';

        game.getHiveRecord = () => ({ status: 'bonded' });
        const before = ThreeGame.prototype.getActiveContainmentZones.call(game);
        expect(before).toHaveLength(1);
        expect(before[0].isSafe).toBe(true);

        game.getHiveRecord = () => ({ status });
        expect(ThreeGame.prototype.getActiveContainmentZones.call(game)).toEqual([]);
    });
});
