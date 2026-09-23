import { describe, expect, it } from 'vitest';
import { getOperatorEquipmentTransform } from './operatorEquipmentSockets.js';

describe('class and item wearable calibration', () => {
    it('moves the same chest module farther out on the Tank shell', () => {
        const scout = getOperatorEquipmentTransform({ classType: 'SCOUT', itemId: '4142', mount: 'chest_center' });
        const tank = getOperatorEquipmentTransform({ classType: 'TANK', itemId: '4142', mount: 'chest_center' });
        expect(tank.offset[2]).toBeGreaterThan(scout.offset[2]);
        expect(tank.size).toBeGreaterThan(scout.size);
    });

    it('applies item-specific trims on a shared mount', () => {
        const filter = getOperatorEquipmentTransform({ classType: 'ENGINEER', itemId: '4142', mount: 'chest_center' });
        const ballast = getOperatorEquipmentTransform({ classType: 'ENGINEER', itemId: '4160', mount: 'chest_center' });
        expect(ballast.offset).not.toEqual(filter.offset);
        expect(ballast.size).not.toBe(filter.size);
    });
});
