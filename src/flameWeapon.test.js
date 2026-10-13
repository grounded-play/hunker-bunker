import { describe, expect, it } from 'vitest';
import { resolveSweptConeHits } from './flameWeapon.js';

describe('resolveSweptConeHits', () => {
    it('returns targets in the cone nearest-first', () => {
        const near = { id: 'near', x: 0.5, z: 2 };
        const far = { id: 'far', position: { x: 0, z: 5 } };
        const hits = resolveSweptConeHits({
            origin: { x: 0, z: 0 },
            direction: { x: 0, z: 1 },
            targets: [far, near]
        });
        expect(hits.map(({ target }) => target.id)).toEqual(['near', 'far']);
    });

    it('rejects targets outside the angle or range and accepts footprint overlap', () => {
        const outsideAngle = { id: 'angle', x: 5, z: 1 };
        const outsideRange = { id: 'range', x: 0, z: 7 };
        const edge = { id: 'edge', x: 2.7, z: 5.8, radius: 0.8 };
        const hits = resolveSweptConeHits({
            direction: { x: 0, z: 1 },
            range: 6.5,
            halfAngle: 0.38,
            targets: [outsideAngle, outsideRange, edge]
        });
        expect(hits.map(({ target }) => target.id)).toEqual(['edge']);
    });

    it('returns no hits for a direction with no magnitude', () => {
        expect(resolveSweptConeHits({ direction: { x: 0, z: 0 }, targets: [{ x: 0, z: 1 }] })).toEqual([]);
    });
});
