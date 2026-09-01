import { describe, expect, it } from 'vitest';
import {
    getWeaponCalibration,
    getWeaponCalibrationProfiles,
    getWeaponScaleForBounds,
    normalizeWeaponArchetype
} from './weaponCalibration.js';

describe('weapon calibration profiles', () => {
    it('provides separate gameplay, armory, and reward contexts for every archetype', () => {
        const profiles = getWeaponCalibrationProfiles();
        expect(Object.keys(profiles)).toEqual(['gg1', 'talon', 'talon_c', 'siege_breaker', 'tesla_lock']);
        for (const profile of Object.values(profiles)) {
            expect(profile.gameplay.targetSize).toBeGreaterThan(0);
            expect(profile.armory.targetSize).toBeGreaterThan(profile.gameplay.targetSize);
            expect(profile.reward.targetSize).toBeGreaterThan(profile.gameplay.targetSize);
            expect(profile.armory.rotation).toEqual([0, 0, 0]);
            expect(profile.gameplay.rotation).not.toEqual(profile.armory.rotation);
        }
    });

    it('falls back safely for unknown archetypes and contexts', () => {
        expect(normalizeWeaponArchetype('missing')).toBe('gg1');
        expect(getWeaponCalibration('missing', 'unknown')).toMatchObject({ archetype: 'gg1', context: 'gameplay' });
    });

    it('clamps imported dimensions to the profile scale safety range', () => {
        const profile = getWeaponCalibration('siege_breaker', 'gameplay');
        expect(getWeaponScaleForBounds([0, 0, 0], 'siege_breaker', 'gameplay')).toBe(profile.maxScale);
        expect(getWeaponScaleForBounds([100, 100, 100], 'siege_breaker', 'gameplay')).toBe(profile.minScale);
    });
});
