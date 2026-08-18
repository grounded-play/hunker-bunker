import { describe, expect, it } from 'vitest';
import { generateRadialMazeExpedition } from './mazeExpedition.js';
import { buildWorldPlan, validateWorldPlan } from './ringManifest.js';
import { RING_CROSSING_STATES } from './ringCrossings.js';
import { STRUCTURE_GENERATOR } from './chunkStructure.js';
import {
    AUTHORED_STRUCTURE_FALLBACK_REASONS,
    AUTHORED_STRUCTURE_RESOLUTION,
    clampPositionToAuthoredRing,
    deriveMaxUnlockedRing,
    normalizeWorldPlanRingCrossings,
    reconcileWorldPlanRingCrossings,
    resolveAuthoredChunkStructure,
    selectCanonicalReservationForChunk,
    selectRingCrossingFarSide
} from './authoredWorldRuntime.js';

function seededRandom(seed) {
    let state = (seed >>> 0) || 1;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
}

function realWorldPlan(seed = 200) {
    const worldPlan = buildWorldPlan(generateRadialMazeExpedition(seed));
    const validation = validateWorldPlan(worldPlan);
    if (!validation.valid) throw new Error(validation.errors.join('; '));
    return worldPlan;
}

function topologyOpenings(worldPlan, reservation) {
    const openings = {};
    for (const edge of worldPlan.topology.routeEdges) {
        const [left, right] = edge.split('|');
        if (left !== reservation.chunkKey && right !== reservation.chunkKey) continue;
        const neighborKey = left === reservation.chunkKey ? right : left;
        const [neighborX, neighborY] = neighborKey.split(',').map(Number);
        const deltaX = neighborX - reservation.chunkX;
        const deltaY = neighborY - reservation.chunkY;
        const side = deltaY === -1 ? 'north'
            : deltaY === 1 ? 'south'
            : deltaX === -1 ? 'west'
            : deltaX === 1 ? 'east'
            : null;
        if (side) openings[side] = { open: true, offset: 8 };
    }
    return openings;
}

describe('WorldPlan crossing runtime adapter', () => {
    const worldPlan = realWorldPlan();

    it('normalizes the complete WorldPlan into the crossing sub-plan envelope', () => {
        // WorldPlan and ring-crossing plan versions happen to both be 1
        // today. Make them deliberately diverge so this test cannot pass by
        // accidentally forwarding the outer envelope's version.
        const plan = normalizeWorldPlanRingCrossings({ ...worldPlan, version: 77 });
        expect(plan.version).toBe(worldPlan.ringCrossingPlanVersion);
        expect(plan.seed).toBe(worldPlan.seed);
        expect(plan.ringCrossings).toHaveLength(4);
        expect(plan.ringCrossings.map((crossing) => crossing.id)).toEqual([
            'ring-1-gate', 'ring-2-gate', 'ring-3-gate', 'ring-4-gate'
        ]);
        plan.ringCrossings[0].requirements.goalKey = 'mutated-copy';
        expect(worldPlan.ringCrossings[0].requirements.goalKey).toBe('o2Bubble');
    });

    it('keeps the player in ring 1 when a ship goal is built but its crossing remains closed', () => {
        const result = reconcileWorldPlanRingCrossings(worldPlan, null, {
            builtGoalKeys: ['o2Bubble']
        });
        expect(result.state.crossings['ring-1-gate'].status).toBe(RING_CROSSING_STATES.OBJECTIVE_READY);
        expect(result.openCrossingIds).toEqual(new Set());
        expect(result.maxUnlockedRing).toBe(1);
    });

    it('advances exactly one ring after the first goal, mission, and canonical boss are complete', () => {
        const firstCrossing = worldPlan.ringCrossings[0];
        const result = reconcileWorldPlanRingCrossings(worldPlan, null, {
            builtGoalKeys: [firstCrossing.requirements.goalKey],
            completedMissionIds: [firstCrossing.requirements.missionId],
            defeatedMilestoneIds: [firstCrossing.requirements.milestoneId]
        });
        expect(result.state.crossings[firstCrossing.id].status).toBe(RING_CROSSING_STATES.OPEN);
        expect(result.openCrossingIds).toEqual(new Set([firstCrossing.id]));
        expect(result.maxUnlockedRing).toBe(2);
        expect(result.traversalUnlocks).toEqual([]);
    });

    it('does not let a migrated later crossing skip a closed predecessor', () => {
        const plan = normalizeWorldPlanRingCrossings(worldPlan);
        const state = reconcileWorldPlanRingCrossings(worldPlan, {
            unlockedCrossingIds: ['ring-2-gate']
        }).state;
        expect(state.crossings['ring-2-gate'].status).toBe(RING_CROSSING_STATES.OPEN);
        expect(deriveMaxUnlockedRing(plan, state)).toBe(1);
    });

    it('clamps before the next ring until its authored crossing opens', () => {
        const radii = [0, 108, 201, 304, 413, 529];
        const locked = clampPositionToAuthoredRing(1000, 0, { x: 0, z: 0 }, 1, radii);
        expect(locked).toMatchObject({ x: 154.5, z: 0, blocked: true });
        expect(clampPositionToAuthoredRing(201, 0, { x: 0, z: 0 }, 1, radii).blocked).toBe(true);
        expect(clampPositionToAuthoredRing(201, 0, { x: 0, z: 0 }, 2, radii).blocked).toBe(false);
    });

    it('chooses the farther topology socket on tangential spiral crossings', () => {
        const availableSidesByCrossing = {
            'ring-1-gate': ['n', 's'],
            'ring-2-gate': ['n', 's'],
            'ring-3-gate': ['e', 'w'],
            'ring-4-gate': ['e', 'w']
        };
        expect(Object.fromEntries(worldPlan.ringCrossings.map((crossing) => [
            crossing.id,
            selectRingCrossingFarSide(worldPlan, crossing.id, availableSidesByCrossing[crossing.id])
        ]))).toEqual({
            'ring-1-gate': 's',
            'ring-2-gate': 's',
            'ring-3-gate': 'w',
            'ring-4-gate': 'w'
        });
    });

});

describe('WorldPlan reservation runtime adapter', () => {
    const worldPlan = realWorldPlan();

    it('selects the base territory normally and an explicitly active state alias when requested', () => {
        const territory = worldPlan.reservations.find((reservation) => reservation.role === 'campTerritory');
        const stateAlias = worldPlan.reservations.find((reservation) => (
            reservation.role === 'campStateAnchor'
            && reservation.chunkKey === territory.chunkKey
        ));
        expect(selectCanonicalReservationForChunk(worldPlan, territory.chunkX, territory.chunkY)?.id)
            .toBe(territory.id);
        expect(selectCanonicalReservationForChunk(worldPlan, territory.chunkX, territory.chunkY, {
            activeReservationIds: [stateAlias.id]
        })?.id).toBe(stateAlias.id);
    });

    it('tries cardinal rotations deterministically and preserves accepted structure metadata', () => {
        const reservation = worldPlan.reservations.find((entry) => (
            entry.role === 'ringCrossing' && entry.ring === 3
        ));
        const result = resolveAuthoredChunkStructure(seededRandom(44), worldPlan, {
            chunkX: reservation.chunkX,
            chunkY: reservation.chunkY,
            openings: topologyOpenings(worldPlan, reservation),
            chunkSize: 35
        });
        expect(result.status).toBe(AUTHORED_STRUCTURE_RESOLUTION.ACCEPTED);
        expect(result.reservationId).toBe(reservation.id);
        expect(result.generatorId).toBe(STRUCTURE_GENERATOR.AUTHORED_ROOM);
        expect(result.diagnostics.attemptedRotations).toEqual([0, 1]);
        expect(result.diagnostics.acceptedRotationSteps).toBe(1);
        expect(result.diagnostics.rejectedSockets).toEqual([
            { rotationSteps: 0, skippedSockets: ['east', 'west'] }
        ]);
        expect(result.structure).toMatchObject({
            reservationId: reservation.id,
            generatorId: STRUCTURE_GENERATOR.AUTHORED_ROOM,
            wayfindingMarkers: [],
            diagnostics: {
                reservationId: reservation.id,
                acceptedRotationSteps: 1,
                skippedSockets: []
            }
        });
        expect(result.structure.rooms[0].reservationId).toBe(reservation.id);
        expect(result.structure.anchors.every((anchor) => anchor.reservationId === reservation.id)).toBe(true);
    });

    it('rejects a room that would silently drop a required topology opening', () => {
        const reservation = worldPlan.reservations.find((entry) => (
            entry.role === 'shipGoalObjective' && entry.goalKey === 'o2Bubble'
        ));
        const result = resolveAuthoredChunkStructure(seededRandom(45), worldPlan, {
            chunkX: reservation.chunkX,
            chunkY: reservation.chunkY,
            openings: topologyOpenings(worldPlan, reservation),
            chunkSize: 35
        });
        expect(result.status).toBe(AUTHORED_STRUCTURE_RESOLUTION.FALLBACK);
        expect(result.structure).toBeNull();
        expect(result.reservationId).toBe(reservation.id);
        expect(result.diagnostics).toMatchObject({
            fallbackRequired: true,
            reason: AUTHORED_STRUCTURE_FALLBACK_REASONS.SOCKET_MISMATCH,
            attemptedRotations: [0, 1, 2, 3]
        });
        expect(result.diagnostics.rejectedSockets).toHaveLength(4);
    });

    it('returns an explicit fallback for an unsupported real reservation family', () => {
        const reservation = worldPlan.reservations.find((entry) => entry.role === 'campTerritory');
        const result = resolveAuthoredChunkStructure(seededRandom(46), worldPlan, {
            chunkX: reservation.chunkX,
            chunkY: reservation.chunkY,
            openings: topologyOpenings(worldPlan, reservation),
            chunkSize: 35
        });
        expect(result).toMatchObject({
            status: AUTHORED_STRUCTURE_RESOLUTION.FALLBACK,
            reservationId: reservation.id,
            generatorId: null,
            wayfindingMarkers: [],
            structure: null,
            diagnostics: {
                fallbackRequired: true,
                reason: AUTHORED_STRUCTURE_FALLBACK_REASONS.UNSUPPORTED_RESERVATION,
                attemptedRotations: [0]
            }
        });
    });
});
