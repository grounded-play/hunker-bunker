import { describe, expect, it } from 'vitest';
import { generateRadialMazeExpedition } from './mazeExpedition.js';
import {
    TERRITORY_PLAN_VERSION,
    allocateTerritories,
    getRequiredSocketsForChunk,
    getTerritoryBeat,
    getTerritoryForChunk,
    validateTerritoryPlan
} from './territoryPlanner.js';

function edge(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function lineTopology(length = 14) {
    return {
        version: 1,
        startChunkKey: '0,0',
        routeChunks: Array.from({ length }, (_, chunkX) => ({ chunkX, chunkY: 0, ring: 1 })),
        routeEdges: Array.from({ length: length - 1 }, (_, chunkX) => (
            edge(`${chunkX},0`, `${chunkX + 1},0`)
        ))
    };
}

function fixtureReservations() {
    return [{
        id: 'camp_meridian_reservation',
        territoryId: 'camp_meridian',
        kind: 'camp',
        ring: 1,
        routeChunkKey: '2,0',
        anchorBeatIndex: 1,
        contentAnchorBeatIndex: 2,
        beats: [
            { id: 'approach', role: 'readable_approach' },
            { id: 'heart', role: 'central_interaction' },
            { id: 'mission', role: 'mission_route' }
        ]
    }, {
        id: 'hive_suture_reservation',
        territoryId: 'hive_suture',
        kind: 'hive',
        ring: 1,
        routeChunkKey: '9,0',
        anchorBeatIndex: 2,
        activationState: 'dormant',
        beats: [
            { id: 'warning', role: 'foreshadow' },
            { id: 'outer', role: 'outer_nest' },
            { id: 'choice', role: 'choice_chamber' }
        ]
    }];
}

function radialTerritoryReservations(expedition) {
    return expedition.nodes
        .filter((node) => node.kind === 'camp' || node.kind === 'hive_threshold')
        .map((node) => ({
            id: `${node.id}_reservation`,
            territoryId: node.id,
            kind: node.kind === 'camp' ? 'camp' : 'hive',
            ring: node.ring,
            routeChunkKey: `${node.chunkX},${node.chunkY}`,
            anchorBeatIndex: 1,
            beats: [
                { id: 'approach', role: 'approach' },
                { id: 'heart', role: 'territory_heart' },
                { id: 'consequence', role: 'consequence_route' }
            ]
        }));
}

describe('allocateTerritories', () => {
    it('allocates stable ordered beats to exclusive adjacent route chunks', () => {
        const topology = lineTopology();
        const reservations = fixtureReservations();
        const plan = allocateTerritories(topology, reservations, { seed: 29 });

        expect(plan.version).toBe(TERRITORY_PLAN_VERSION);
        expect(plan.diagnostics).toMatchObject({
            valid: true,
            requestedTerritories: 2,
            allocatedTerritories: 2,
            claimedChunkCount: 6,
            allocationErrors: []
        });
        expect(plan.territories.map((territory) => territory.id)).toEqual([
            'camp_meridian',
            'hive_suture'
        ]);
        expect(plan.territories[0].beats.map((beat) => beat.ownerChunkKey)).toEqual([
            '1,0',
            '2,0',
            '3,0'
        ]);
        expect(plan.territories[0].anchorBeatId).toBe('camp_meridian:beat:heart');
        expect(plan.territories[0].contentAnchorBeatId).toBe('camp_meridian:beat:mission');
        expect(plan.territories[1].beats.map((beat) => beat.ownerChunkKey)).toEqual([
            '7,0',
            '8,0',
            '9,0'
        ]);
        expect(new Set(plan.territories.flatMap((territory) => (
            territory.beats.map((beat) => beat.ownerChunkKey)
        ))).size).toBe(6);
        expect(validateTerritoryPlan(plan, topology, reservations)).toEqual({ valid: true, errors: [] });
    });

    it('emits two exact reciprocal socket endpoints per territory boundary', () => {
        const plan = allocateTerritories(lineTopology(), fixtureReservations(), { seed: 29 });
        expect(plan.requiredChunkSockets).toHaveLength(8);
        for (const socket of plan.requiredChunkSockets) {
            const reciprocal = plan.requiredChunkSockets.find((candidate) => (
                candidate.id === socket.reciprocalSocketId
            ));
            expect(reciprocal).toMatchObject({
                reciprocalSocketId: socket.id,
                pairId: socket.pairId,
                ownerChunkKey: socket.neighborChunkKey,
                neighborChunkKey: socket.ownerChunkKey,
                beatId: socket.neighborBeatId,
                neighborBeatId: socket.beatId,
                width: socket.width
            });
            expect({ east: 'west', west: 'east', north: 'south', south: 'north' }[socket.side])
                .toBe(reciprocal.side);
        }
    });

    it('is reproducible when reservation, chunk, and edge input orders change', () => {
        const topology = lineTopology();
        const reservations = fixtureReservations();
        const expected = allocateTerritories(topology, reservations, { seed: 912 });
        const reorderedTopology = {
            ...topology,
            routeChunks: [...topology.routeChunks].reverse(),
            routeEdges: [...topology.routeEdges].reverse()
        };
        const actual = allocateTerritories(reorderedTopology, [...reservations].reverse(), { seed: 912 });
        expect(actual).toEqual(expected);
        expect(JSON.parse(JSON.stringify(actual))).toEqual(actual);
    });

    it('provides stream-order-independent lookups by chunk and stable beat id', () => {
        const plan = allocateTerritories(lineTopology(), fixtureReservations());
        const territory = getTerritoryForChunk(plan, '2,0');
        expect(territory?.id).toBe('camp_meridian');
        expect(getTerritoryBeat(plan, 'camp_meridian:beat:heart')).toMatchObject({
            ownerChunkKey: '2,0',
            role: 'central_interaction'
        });
        expect(getRequiredSocketsForChunk(plan, '2,0').map((socket) => socket.side).sort())
            .toEqual(['east', 'west']);
        expect(getTerritoryForChunk(plan, '13,0')).toBeNull();
    });

    it('honors preclaimed chunks without leaking a partial territory', () => {
        const topology = lineTopology(5);
        const reservations = [fixtureReservations()[0]];
        const plan = allocateTerritories(topology, reservations, {
            claimedChunkKeys: ['1,0'],
            seed: 5
        });
        expect(plan.territories).toEqual([]);
        expect(plan.requiredChunkSockets).toEqual([]);
        expect(plan.diagnostics.valid).toBe(false);
        expect(plan.diagnostics.errors).toContain(
            'camp_meridian cannot allocate 3 adjacent unclaimed route chunks'
        );
    });

    it('solves the whole portfolio so a flexible territory cannot consume a constrained path', () => {
        const topology = {
            startChunkKey: '0,0',
            routeChunks: [
                { chunkX: 0, chunkY: 0, ring: 1 },
                { chunkX: 0, chunkY: 1, ring: 1 },
                { chunkX: 1, chunkY: 0, ring: 1 },
                { chunkX: 1, chunkY: 1, ring: 1 }
            ],
            routeEdges: [
                edge('0,0', '0,1'),
                edge('0,0', '1,0'),
                edge('0,1', '1,1')
            ]
        };
        const reservations = [{
            id: 'flexible_camp',
            routeChunkKey: '0,0',
            beats: [{ id: 'heart' }, { id: 'support' }]
        }, {
            id: 'constrained_hive',
            routeChunkKey: '1,1',
            beats: [{ id: 'heart' }, { id: 'approach' }]
        }];
        const plan = allocateTerritories(topology, reservations, { seed: 44 });
        expect(plan.diagnostics.valid).toBe(true);
        expect(getTerritoryForChunk(plan, '0,1')?.id).toBe('territory:constrained_hive');
        expect(getTerritoryForChunk(plan, '1,0')?.id).toBe('territory:flexible_camp');
    });

    it('reports malformed and conflicting reservation descriptions', () => {
        const plan = allocateTerritories(lineTopology(4), [{
            id: 'duplicate',
            routeChunkKey: '1,0',
            beats: [{ id: 'a' }]
        }, {
            id: 'duplicate',
            routeChunkKey: '2,0',
            beats: [{ id: 'b' }]
        }, {
            id: 'empty',
            routeChunkKey: '3,0',
            beats: []
        }, {
            id: 'bad_content_anchor',
            routeChunkKey: '3,0',
            contentAnchorBeatIndex: 2,
            beats: [{ id: 'only' }]
        }]);
        expect(plan.diagnostics.valid).toBe(false);
        expect(plan.diagnostics.errors).toEqual(expect.arrayContaining([
            'duplicate territory reservation duplicate',
            'territory:empty has no territory beats',
            'territory:bad_content_anchor has invalid contentAnchorBeatIndex 2',
            'allocated 1 of 4 requested territories'
        ]));
    });

    it('makes non-cardinal topology edges fatal to validation', () => {
        const topology = lineTopology(4);
        topology.routeEdges.push(edge('0,0', '2,0'));
        const plan = allocateTerritories(topology, [{
            id: 'camp',
            routeChunkKey: '1,0',
            beats: [{ id: 'heart' }]
        }]);
        expect(plan.diagnostics.valid).toBe(false);
        expect(plan.diagnostics.errors).toContain('topology contains 1 invalid route edge(s)');
    });

    it('detects ownership, route-order, adjacency, and reciprocal-socket corruption', () => {
        const topology = lineTopology();
        const reservations = fixtureReservations();
        const plan = allocateTerritories(topology, reservations);
        plan.territories[0].beats[1].ownerChunkKey = plan.territories[0].beats[0].ownerChunkKey;
        plan.territories[0].beats[1].routeDistance = -1;
        plan.requiredChunkSockets[0].neighborChunkKey = '12,0';
        const result = validateTerritoryPlan(plan, topology, reservations);
        expect(result.valid).toBe(false);
        expect(result.errors.some((error) => error.includes('is owned by both'))).toBe(true);
        expect(result.errors.some((error) => error.includes('has an invalid route distance'))).toBe(true);
        expect(result.errors.some((error) => error.includes('are not adjacent route chunks'))).toBe(true);
        expect(result.errors.some((error) => error.includes('are not reciprocal'))).toBe(true);
    });

    it('allocates all current camp/hive territories across 300 radial seeds', () => {
        for (let seed = 1; seed <= 300; seed += 1) {
            const expedition = generateRadialMazeExpedition(seed);
            const reservations = radialTerritoryReservations(expedition);
            const first = allocateTerritories(expedition.topology, reservations, { seed });
            const second = allocateTerritories(expedition.topology, reservations, { seed });
            expect(first, `seed ${seed}`).toEqual(second);
            expect(first.diagnostics.valid, `seed ${seed}: ${first.diagnostics.errors.join('; ')}`).toBe(true);
            expect(first.territories, `seed ${seed}`).toHaveLength(reservations.length);
        }
    });
});
