import { describe, expect, it } from 'vitest';
import {
    OBJECTIVE_TARGET_SOURCE,
    objectiveAnchorToWorld,
    resolveObjectiveTarget,
    resolveObjectiveTargetPosition,
    toObjectiveCompass
} from './objectiveTargetResolver.js';

const worldPlan = {
    version: 1,
    topology: { chunkSize: 49 },
    reservations: [
        {
            id: 'quest:reactor_venting',
            chunkKey: '2,-3',
            interactionAnchorId: 'vent_valve',
            approachAnchorId: 'south_entry'
        },
        { id: 'quest:unbuilt_room', chunkX: -1, chunkY: 1 },
        { id: 'quest:world_fallback', worldX: 17.5, worldZ: -8 }
    ]
};

const structures = [{
    chunkKey: '2,-3',
    anchors: [
        { id: 'south_entry', x: 4, y: 46 },
        { id: 'vent_valve', x: 19, z: 11, reservationId: 'quest:reactor_venting' },
        { id: 'other_quest_anchor', x: 30, z: 30, reservationId: 'quest:other' }
    ]
}];

describe('objectiveAnchorToWorld', () => {
    it('converts local x/z or x/y anchors in negative chunks without rounding', () => {
        expect(objectiveAnchorToWorld({ x: 4.5, y: 8 }, { chunkKey: '-2,3' }, { chunkSize: 49 }))
            .toEqual({ x: -93.5, z: 155 });
    });

    it('preserves explicitly world-space anchors and applies an explicit world offset', () => {
        expect(objectiveAnchorToWorld(
            { coordinateSpace: 'world', x: 12, z: -7 },
            {},
            { worldOffset: { x: 100, z: 20 } }
        )).toEqual({ x: 112, z: 13 });
    });

    it('rejects malformed anchors instead of silently targeting the origin', () => {
        expect(objectiveAnchorToWorld({ id: 'missing_coords' }, { chunkKey: '0,0' })).toBeNull();
        expect(objectiveAnchorToWorld({ x: 2, z: 3 }, { chunkKey: 'bad' })).toBeNull();
    });
});

describe('resolveObjectiveTarget', () => {
    it('resolves a revealed objective to its exact reservation-owned interaction anchor', () => {
        const target = resolveObjectiveTarget({ reservationId: 'quest:reactor_venting' }, {
            worldPlan,
            chunkStructures: structures
        });
        expect(target).toEqual({
            reservationId: 'quest:reactor_venting',
            anchorId: 'vent_valve',
            source: OBJECTIVE_TARGET_SOURCE.INTERACTION,
            exact: true,
            x: 117,
            z: -136
        });
        expect(toObjectiveCompass(target)).toEqual({ x: 117, z: -136 });
    });

    it('uses the authored approach while the exact interaction remains undiscovered', () => {
        const target = resolveObjectiveTarget({
            reservationId: 'quest:reactor_venting',
            exactRevealed: false
        }, { worldPlan, chunkStructures: structures });
        expect(target).toMatchObject({
            anchorId: 'south_entry',
            source: OBJECTIVE_TARGET_SOURCE.APPROACH,
            exact: false,
            x: 102,
            z: -101
        });
    });

    it('falls back deterministically to a reserved chunk center before that chunk is built', () => {
        expect(resolveObjectiveTarget({ reservationId: 'quest:unbuilt_room' }, { worldPlan }))
            .toMatchObject({
                source: OBJECTIVE_TARGET_SOURCE.RESERVATION,
                x: -25,
                z: 73
            });
    });

    it('uses explicit reservation world coordinates without recentering them', () => {
        expect(resolveObjectiveTarget({ reservationId: 'quest:world_fallback' }, { worldPlan }))
            .toMatchObject({ x: 17.5, z: -8, source: OBJECTIVE_TARGET_SOURCE.RESERVATION });
    });

    it('can forbid approximate targets and never leaks an anchor owned by another reservation', () => {
        const alteredStructures = [{
            chunkKey: '2,-3',
            anchors: structures[0].anchors.filter((anchor) => anchor.id !== 'vent_valve')
        }];
        expect(resolveObjectiveTarget({
            reservationId: 'quest:reactor_venting',
            interactionAnchorId: 'other_quest_anchor',
            approachAnchorId: 'missing',
            allowReservationFallback: false
        }, { worldPlan, chunkStructures: alteredStructures })).toBeNull();
    });

    it('returns null for unknown reservations and null compasses for invalid targets', () => {
        expect(resolveObjectiveTarget({ reservationId: 'missing' }, { worldPlan, chunkStructures: structures })).toBeNull();
        expect(toObjectiveCompass({ x: 1, z: Number.NaN })).toBeNull();
    });

    it('accepts serialized object indexes as well as arrays', () => {
        const indexedPlan = { ...worldPlan, reservations: Object.fromEntries(worldPlan.reservations.map((r) => [r.id, r])) };
        const indexedStructures = { '2,-3': structures[0] };
        expect(resolveObjectiveTarget({ reservationId: 'quest:reactor_venting' }, {
            worldPlan: indexedPlan,
            chunkStructures: indexedStructures
        })).toMatchObject({ source: OBJECTIVE_TARGET_SOURCE.INTERACTION, x: 117, z: -136 });
    });

    it('resolves requests by id, questId, or direct string and provides resolveObjectiveTargetPosition', () => {
        expect(resolveObjectiveTarget({ id: 'quest:reactor_venting' }, { worldPlan, chunkStructures: structures }))
            .toMatchObject({ source: OBJECTIVE_TARGET_SOURCE.INTERACTION, x: 117, z: -136 });
        expect(resolveObjectiveTarget('quest:reactor_venting', { worldPlan, chunkStructures: structures }))
            .toMatchObject({ source: OBJECTIVE_TARGET_SOURCE.INTERACTION, x: 117, z: -136 });
        expect(resolveObjectiveTargetPosition({ id: 'quest:reactor_venting' }, { worldPlan, chunkStructures: structures }))
            .toEqual({ x: 117, z: -136 });
    });
});
