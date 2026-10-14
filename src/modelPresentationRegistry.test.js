import { describe, expect, it } from 'vitest';
import {
    MODEL_SURFACE,
    getModelPresentationProfile,
    getModelPresentationProfiles,
    isWallMountedModel
} from './modelPresentationRegistry.js';
import { DRESSING_KITS, ROLE_DRESSING } from './roomDressingKits.js';

describe('model presentation registry', () => {
    it('classifies exosuit, decon, and wall machine fixtures as reviewed wall mounts', () => {
        for (const type of [
            'prop_exosuit_docking_gantry',
            'prop_decon_eyewash_shower_station',
            'decon_exosuit_scrubber_station',
            'life_exosuit_teardown',
            'cryo_heater_station',
            'storage_locker',
            'life_ribcage_rescue_cabinet',
            'life_suit_drying_rack'
        ]) {
            expect(getModelPresentationProfile(type)).toMatchObject({
                surface: MODEL_SURFACE.WALL,
                forwardAxis: '+Z',
                upAxis: '+Y',
                contact: { axis: 'z', side: 'min' }
            });
            expect(isWallMountedModel(type)).toBe(true);
        }
        expect(getModelPresentationProfile('prop_ceiling_crane_hoist')).toMatchObject({
            surface: MODEL_SURFACE.CEILING
        });
        expect(isWallMountedModel('prop_ceiling_crane_hoist')).toBe(true);
    });

    it('does not guess a support surface for unaudited models', () => {
        expect(getModelPresentationProfile('prop_unknown')).toBeNull();
        expect(isWallMountedModel('prop_unknown')).toBe(false);
    });

    it('classifies every wall dressing model as requiring wall support', () => {
        const wallTypes = [DRESSING_KITS, ROLE_DRESSING]
            .flatMap((catalog) => Object.values(catalog))
            .flatMap((kit) => kit.wallProps ?? []);

        expect(wallTypes.length).toBeGreaterThan(0);
        expect(wallTypes.filter((type) => !isWallMountedModel(type))).toEqual([]);
    });

    it('returns a copy of the registry map', () => {
        const profiles = getModelPresentationProfiles();
        delete profiles.prop_exosuit_docking_gantry;
        expect(isWallMountedModel('prop_exosuit_docking_gantry')).toBe(true);
    });
});
