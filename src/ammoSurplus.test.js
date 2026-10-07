import { describe, expect, it } from 'vitest';
import { resolveAmmoPickup } from './ammoSurplus.js';

describe('ammo pickups at a full mag', () => {
    it('fills the mag first and salvages nothing when it all fits', () => {
        expect(resolveAmmoPickup(40, 4, 48)).toEqual({ ammo: 44, wasted: 0, surplusTech: 0 });
    });

    it('salvages the rounds that do not fit as tech, at least one per pickup', () => {
        expect(resolveAmmoPickup(48, 4, 48)).toEqual({ ammo: 48, wasted: 4, surplusTech: 1 });
        expect(resolveAmmoPickup(47, 4, 48)).toEqual({ ammo: 48, wasted: 3, surplusTech: 1 });
        expect(resolveAmmoPickup(48, 16, 48)).toEqual({ ammo: 48, wasted: 16, surplusTech: 4 });
    });
});
