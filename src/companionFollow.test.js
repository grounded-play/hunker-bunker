import { describe, it, expect } from 'vitest';
import { computeTrailPosition } from './companionFollow.js';

describe('computeTrailPosition', () => {
    it('places the trail point behind the player along their facing direction', () => {
        // Player facing +X (dirX=1, dirZ=0); trail point should sit at -X.
        const result = computeTrailPosition(
            { x: 10, z: 10 },
            { dirX: 1, dirZ: 0 },
            2 // trail distance
        );
        expect(result.x).toBeCloseTo(8);
        expect(result.z).toBeCloseTo(10);
    });

    it('falls back to directly behind (facing default) when direction is zero-length', () => {
        const result = computeTrailPosition({ x: 0, z: 0 }, { dirX: 0, dirZ: 0 }, 2);
        expect(Number.isFinite(result.x)).toBe(true);
        expect(Number.isFinite(result.z)).toBe(true);
    });
});

describe('follow heading (QA 2026-10-27: the companion looped around the player)', () => {
    it('trails the walking direction, not the aim, and keeps it while the player stands still', async () => {
        const { updateFollowHeading } = await import('./companionFollow.js');
        let state = updateFollowHeading(null, { x: 0, z: 1 }, { x: 0, z: 0 }, { blend: 1 });
        expect(state.moving).toBe(true);
        expect(state.heading.dirZ).toBeCloseTo(1);
        // Standing still: the heading does not move however the player aims.
        const still = updateFollowHeading(state.heading, { x: 0, z: 1 }, { x: 0, z: 1 });
        expect(still.moving).toBe(false);
        expect(still.heading).toEqual(state.heading);
        // Turning to walk east eases the heading over rather than snapping.
        state = updateFollowHeading(state.heading, { x: 1, z: 1 }, { x: 0, z: 1 });
        expect(state.heading.dirX).toBeGreaterThan(0);
        expect(state.heading.dirZ).toBeGreaterThan(0);
    });

    it('holds a nearby follower in place when the player stops', async () => {
        const { shouldHoldFollow } = await import('./companionFollow.js');
        expect(shouldHoldFollow({ x: 1.5, z: 0 }, { x: 0, z: 0 }, false)).toBe(true);
        expect(shouldHoldFollow({ x: 1.5, z: 0 }, { x: 0, z: 0 }, true)).toBe(false);
        expect(shouldHoldFollow({ x: 6, z: 0 }, { x: 0, z: 0 }, false)).toBe(false);
    });
});
