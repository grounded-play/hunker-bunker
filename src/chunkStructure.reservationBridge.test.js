import { describe, expect, it } from 'vitest';
// Deliberately imports Lane A's real, shipped modules — this file exists
// to prove src/chunkStructure.js's resolveChunkStructureForReservation
// actually interoperates with src/ringManifest.js's real output, not a
// hand-rolled fixture that could silently drift from it. Lane B's
// production code (chunkStructure.js itself) stays duck-typed and does not
// import these; only this test does.
import { generateRadialMazeExpedition } from './mazeExpedition.js';
import { buildWorldPlan, validateWorldPlan } from './ringManifest.js';
import {
    resolveChunkStructureForReservation,
    buildAuthoredRoomChunkStructure,
    STRUCTURE_GENERATOR
} from './chunkStructure.js';
import { ROOM_BUILD_CATALOG } from './roomBuilds.js';

function seededRandom(seed) {
    let state = (seed >>> 0) || 1;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
}

const SEED = 200; // the same "ordinary" portfolio seed scripts/world-seed-portfolio-report.js tracks

function realWorldPlan(seed = SEED) {
    const expedition = generateRadialMazeExpedition(seed);
    const worldPlan = buildWorldPlan(expedition);
    const validation = validateWorldPlan(worldPlan);
    if (!validation.valid) throw new Error(`fixture world plan is invalid: ${validation.errors.join('; ')}`);
    return worldPlan;
}

describe('resolveChunkStructureForReservation against Lane A\'s real WorldPlan', () => {
    const worldPlan = realWorldPlan();
    const catalogFamilies = new Set(ROOM_BUILD_CATALOG.map((build) => build.family));

    it('the vertical-slice catalog and a real world plan actually overlap (regression guard against both sides silently drifting apart)', () => {
        const reservationFamilies = new Set(worldPlan.reservations.map((r) => r.roomFamily).filter(Boolean));
        const overlap = [...catalogFamilies].filter((family) => reservationFamilies.has(family));
        expect(overlap.length).toBeGreaterThan(0);
        // Known overlap as of this catalog: o2, gate, armory, medical, cache, fabricator.
        expect(overlap).toEqual(expect.arrayContaining(['o2', 'gate', 'armory']));
    });

    it('resolves the o2Bubble ship-goal reservation to a real authored room whose anchor matches the reservation\'s own objectiveAnchorId', () => {
        const reservation = worldPlan.reservations.find((r) => r.role === 'shipGoalObjective' && r.goalKey === 'o2Bubble');
        expect(reservation).toBeDefined();
        expect(reservation.roomFamily).toBe('o2');
        expect(reservation.objectiveAnchorId).toBe('o2_control');

        const result = resolveChunkStructureForReservation(seededRandom(1), reservation, {
            openings: { south: { open: true, offset: 4 } }
        });
        expect(result).not.toBeNull();
        expect(result.generatorId).toBe(STRUCTURE_GENERATOR.AUTHORED_ROOM);
        expect(result.rooms[0].ring).toBe(reservation.ring);
        const anchor = result.rooms[0].interactionAnchors.find((a) => a.id === reservation.objectiveAnchorId);
        expect(anchor).toBeDefined();
    });

    it('resolves the armory_breach camp-quest destination to an authored room whose anchor matches its objectiveAnchorId', () => {
        const reservation = worldPlan.reservations.find((r) => r.questId === 'armory_breach');
        expect(reservation).toBeDefined();
        expect(reservation.roomFamily).toBe('armory');
        expect(reservation.objectiveAnchorId).toBe('armory_lock');

        const result = resolveChunkStructureForReservation(seededRandom(2), reservation, {
            openings: { west: { open: true, offset: 3 } }
        });
        expect(result).not.toBeNull();
        const anchor = result.rooms[0].interactionAnchors.find((a) => a.id === reservation.objectiveAnchorId);
        expect(anchor).toBeDefined();
    });

    it('resolves the spore_cleansing camp-quest destination to the medical build\'s dedicated hydro_bed_controls anchor', () => {
        const reservation = worldPlan.reservations.find((r) => r.questId === 'spore_cleansing');
        expect(reservation).toBeDefined();
        expect(reservation.roomFamily).toBe('medical');
        expect(reservation.objectiveAnchorId).toBe('hydro_bed_controls');

        const result = resolveChunkStructureForReservation(seededRandom(3), reservation, {
            openings: { south: { open: true, offset: 4 } }
        });
        expect(result).not.toBeNull();
        const anchor = result.rooms[0].interactionAnchors.find((a) => a.id === reservation.objectiveAnchorId);
        expect(anchor).toBeDefined();
    });

    it('resolves the ring-crossing reservation to the gate family landmark build', () => {
        const reservation = worldPlan.reservations.find((r) => r.role === 'ringCrossing' && r.ring === 1);
        expect(reservation).toBeDefined();
        expect(reservation.roomFamily).toBe('gate');

        const result = resolveChunkStructureForReservation(seededRandom(4), reservation, {
            openings: { south: { open: true, offset: 8 }, north: { open: true, offset: 8 } }
        });
        expect(result).not.toBeNull();
        expect(result.diagnostics.buildId).toBe('ring_crossing_landmark');
    });

    it('returns null (not a thrown error) for a reservation whose family the vertical-slice catalog does not cover yet', () => {
        const reservation = worldPlan.reservations.find((r) => r.role === 'campTerritory');
        expect(reservation).toBeDefined();
        expect(catalogFamilies.has(reservation.roomFamily)).toBe(false);
        expect(resolveChunkStructureForReservation(seededRandom(5), reservation, {})).toBeNull();
    });

    it('every reservation the catalog claims to cover actually produces a room whose family matches the reservation', () => {
        const coveredReservations = worldPlan.reservations.filter((r) => catalogFamilies.has(r.roomFamily));
        expect(coveredReservations.length).toBeGreaterThan(0);
        for (const reservation of coveredReservations) {
            const result = buildAuthoredRoomChunkStructure(seededRandom(reservation.id.length + 7), {
                chunkX: reservation.chunkX,
                chunkY: reservation.chunkY,
                family: reservation.roomFamily,
                tier: reservation.ring,
                openings: { south: { open: true, offset: 4 } }
            });
            expect(result).not.toBeNull();
            expect(result.rooms[0].family).toBe(reservation.roomFamily);
        }
    });
});
