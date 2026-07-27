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
