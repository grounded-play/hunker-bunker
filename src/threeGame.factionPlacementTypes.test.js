import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = readFileSync(fileURLToPath(new URL('./threeGame.js', import.meta.url)), 'utf8');

describe('authored faction placement vocabulary', () => {
    const addressableTypes = [
        'prop_camp_cookfire_lit', 'prop_camp_crates_chained', 'prop_camp_warning_placard',
        'prop_camp_shutter_lockdown', 'prop_camp_laundry', 'prop_camp_grave_fresh',
        'prop_camp_grave_old', 'prop_camp_meridian_radio', 'prop_camp_meridian_battery_bank',
        'prop_camp_meridian_repair_rig', 'prop_camp_tallow_still', 'prop_camp_tallow_spore_trays',
        'prop_camp_tallow_resin_urn', 'prop_camp_vesper_turret', 'prop_camp_vesper_ammo_press',
        'prop_camp_vesper_shield_rack', 'prop_hive_suture_organ', 'prop_hive_wound_cauterizer',
        'prop_hive_relay_antenna', 'prop_hive_synaptic_web', 'prop_hive_chitin_hatchery',
        'prop_hive_carapace_molt'
    ];

    it.each(addressableTypes)('registers %s in the world scatter texture catalog', (type) => {
        expect(source).toMatch(new RegExp(`\\b${type}:\\s*this\\.loadKeyedSpriteTexture`));
    });
});
