import { describe, expect, it } from 'vitest';
import { mapRotationForWorldYaw } from './mapHeading.js';

describe('north-up tactical map heading', () => {
    it.each([
        [0, Math.PI],
        [Math.PI / 2, Math.PI / 2],
        [Math.PI, 0],
        [-Math.PI / 2, -Math.PI / 2]
    ])('maps world yaw %s to canvas rotation %s', (yaw, expected) => {
        expect(mapRotationForWorldYaw(yaw)).toBeCloseTo(expected);
    });

    it('falls back safely for corrupted headings', () => {
        expect(mapRotationForWorldYaw(Number.NaN)).toBeCloseTo(Math.PI);
    });
});
