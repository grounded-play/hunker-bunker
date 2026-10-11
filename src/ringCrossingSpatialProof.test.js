import { describe, expect, it } from 'vitest';
import {
    ALL_ROOM_BUILDS,
    ROOM_BUILD_CATALOG,
    buildRoomInstanceFromBuild,
    classifyRoomBuildSize,
    computeApproachPoint,
    rotateRoomBuild,
    stampRoomBuild,
    validateRoomBuild
} from './roomBuilds.js';
import { RING_CROSSING_SPATIAL_PROOF } from './data/ringCrossingSpatialProof.js';

function shortestPatternPath(pattern, start, goal, blocked = new Set()) {
    const key = ({ x, y }) => `${x},${y}`;
    const queue = [{ ...start, distance: 0 }];
    const seen = new Set([key(start)]);
    for (let index = 0; index < queue.length; index += 1) {
        const current = queue[index];
        if (current.x === goal.x && current.y === goal.y) return current.distance;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const next = { x: current.x + dx, y: current.y + dy };
            const nextKey = key(next);
            if (pattern[next.y]?.[next.x] !== '.' || blocked.has(nextKey) || seen.has(nextKey)) continue;
            seen.add(nextKey);
            queue.push({ ...next, distance: current.distance + 1 });
        }
    }
    return Infinity;
}

describe('detached ring-crossing spatial proof', () => {
    it('is valid in every rotation but absent from every live room catalog', () => {
        expect(validateRoomBuild(RING_CROSSING_SPATIAL_PROOF)).toEqual([]);
        for (let rotation = 0; rotation < 4; rotation += 1) {
            expect(validateRoomBuild(rotateRoomBuild(RING_CROSSING_SPATIAL_PROOF, rotation))).toEqual([]);
        }
        expect(classifyRoomBuildSize(RING_CROSSING_SPATIAL_PROOF)).toBe('large');
        expect(ROOM_BUILD_CATALOG.some(({ id }) => id === RING_CROSSING_SPATIAL_PROOF.id)).toBe(false);
        expect(ALL_ROOM_BUILDS.some(({ id }) => id === RING_CROSSING_SPATIAL_PROOF.id)).toBe(false);
        expect(RING_CROSSING_SPATIAL_PROOF.family).not.toBe('gate');
        expect(RING_CROSSING_SPATIAL_PROOF.roles).not.toContain('ringCrossing');
        expect(RING_CROSSING_SPATIAL_PROOF).not.toHaveProperty('crossingId');
        expect(RING_CROSSING_SPATIAL_PROOF).not.toHaveProperty('reservationId');
    });

    it('compresses, reveals the control, and keeps independent west/east branch routes', () => {
        const build = RING_CROSSING_SPATIAL_PROOF;
        const approach = computeApproachPoint(build);
        const control = { x: 8, y: 5 };
        const farSide = { x: 8, y: 2 };
        const westBranch = new Set(Array.from({ length: 8 }, (_, y) => `4,${y}`));
        const eastBranch = new Set(Array.from({ length: 8 }, (_, y) => `12,${y}`));
        expect(approach).toEqual({ x: 8, y: 10 });
        expect(shortestPatternPath(build.pattern, approach, control)).toBe(5);
        expect(shortestPatternPath(build.pattern, approach, farSide, westBranch)).toBeLessThan(Infinity);
        expect(shortestPatternPath(build.pattern, approach, farSide, eastBranch)).toBeLessThan(Infinity);
        expect(shortestPatternPath(build.pattern, approach, farSide)).toBeGreaterThan(10);
        expect(build.pattern[3]).toBe('.....#######.....');
        expect(build.pattern[7][8]).toBe('.');
        expect(build.structuralAnchors.every((anchor) => build.pattern[anchor.y][anchor.x] === '#')).toBe(true);
        expect(build.interactionAnchors[0]).toMatchObject({ id: 'gate_control', x: 8, y: 5 });
        expect(build.loreAnchors[0]).toMatchObject({ id: 'gate_placard', x: 13, y: 8 });
    });

    it('stamps all four synthetic sockets without acquiring crossing runtime state', () => {
        const stamp = stampRoomBuild(RING_CROSSING_SPATIAL_PROOF, () => 0.5, {
            openings: {
                north: { open: true, offset: 8 },
                east: { open: true, offset: 8 },
                south: { open: true, offset: 8 },
                west: { open: true, offset: 8 }
            }
        });
        expect(stamp.skippedSides).toEqual([]);
        expect(stamp.doors.map(({ socketId }) => socketId).sort()).toEqual([
            'approach', 'farSide', 'flankEast', 'flankWest'
        ].sort());
        expect(stamp.doors.every((door) => door.ringCrossingId == null)).toBe(true);
        const room = buildRoomInstanceFromBuild(RING_CROSSING_SPATIAL_PROOF, stamp);
        expect(room).not.toHaveProperty('accessSources');
        expect(room).not.toHaveProperty('ringCrossingId');
        expect(room.stateVariant).toBe('dormant');
    });
});
