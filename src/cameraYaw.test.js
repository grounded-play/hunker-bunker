import { describe, expect, it } from 'vitest';
import { wrapAngle, stepAngleTowards, planarBasisFromOffsetAzimuth, aimVectorFromYaw } from './cameraYaw.js';

describe('wrapAngle', () => {
    it('leaves angles already in (-PI, PI] untouched', () => {
        expect(wrapAngle(0.5)).toBeCloseTo(0.5, 10);
        expect(wrapAngle(Math.PI)).toBeCloseTo(Math.PI, 10);
    });

    it('wraps angles outside the range back into it', () => {
        expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 5);
        expect(wrapAngle(-Math.PI * 3)).toBeCloseTo(Math.PI, 5);
        expect(wrapAngle(Math.PI * 2 + 0.1)).toBeCloseTo(0.1, 5);
    });
});

describe('stepAngleTowards', () => {
    it('eases along the shorter arc, never overshooting the target', () => {
        const result = stepAngleTowards(0, Math.PI / 2, 4, 0.1);
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThan(Math.PI / 2);
    });

    it('crosses the +-PI boundary via the short way, not the long way', () => {
        // current just past +PI-ish, target just past -PI-ish: shortest arc is forward, not a big backward sweep.
        const result = stepAngleTowards(Math.PI - 0.1, -Math.PI + 0.1, 4, 0.1);
        expect(result).toBeGreaterThan(Math.PI - 0.1);
    });

    it('converges to the target over many steps', () => {
        let angle = 0;
        for (let i = 0; i < 500; i += 1) {
            angle = stepAngleTowards(angle, Math.PI / 2, 4, 0.016);
        }
        expect(angle).toBeCloseTo(Math.PI / 2, 3);
    });
});

describe('planarBasisFromOffsetAzimuth', () => {
    it('reproduces the legacy fixed isometric basis for azimuth = atan2(8, 8)', () => {
        const azimuth = Math.atan2(8, 8);
        const { forward, right } = planarBasisFromOffsetAzimuth(azimuth);
        expect(forward.x).toBeCloseTo(-0.70710678, 5);
        expect(forward.y).toBeCloseTo(-0.70710678, 5);
        expect(right.x).toBeCloseTo(0.70710678, 5);
        expect(right.y).toBeCloseTo(-0.70710678, 5);
    });

    it('keeps forward and right perpendicular and unit-length for an arbitrary azimuth', () => {
        const { forward, right } = planarBasisFromOffsetAzimuth(1.234);
        expect(Math.hypot(forward.x, forward.y)).toBeCloseTo(1, 5);
        expect(Math.hypot(right.x, right.y)).toBeCloseTo(1, 5);
        expect(forward.x * right.x + forward.y * right.y).toBeCloseTo(0, 5);
    });
});

describe('aimVectorFromYaw', () => {
    it('matches the legacy default aim direction (aimDirX=1, aimDirZ=0) at yaw = PI/2', () => {
        const { x, z } = aimVectorFromYaw(Math.PI / 2);
        expect(x).toBeCloseTo(1, 5);
        expect(z).toBeCloseTo(0, 5);
    });
});
