import { describe, expect, it, vi } from 'vitest';
import { GAME_SOUNDSETS, selectSoundsetVariant, validateSoundset } from './gameSoundsets.js';

const DOOR_SET = Object.freeze({
    variants: Object.freeze(['door_close1', 'door_close2', 'door_close3']),
    bus: 'world',
    gain: 0.55,
    pitch: Object.freeze([0.96, 1.03]),
    cooldownMs: 90,
    maxVoices: 3,
    retrigger: 'replace-quietest',
    noImmediateRepeat: true,
    fallback: 'door_slide_horiz'
});

describe('game soundset selection', () => {
    it('contains only provenance-approved runtime asset dependencies', () => {
        // This list is a provenance guard, not a snapshot: every entry is a
        // deliberate approval, so adding a soundset must mean editing this test
        // and saying where the audio came from.
        //
        //   door_slide_horiz, hive_webs_sticky  - CC0 intake (opengameart)
        //   footstep_concrete, footstep_snow, prop_impact_*, enemy_crawl_* - Kenney Impact Sounds, CC0,
        //   enemy_idle_snail, enemy_idle_crawler - Kenney RPG Audio, CC0,
        //     licence retained at art/source/audio/cinematic-source/kenney/
        //   AudioCraft AudioGen Neural Foley & SFX - Generated via scripts/audio/generate_audiocraft_sfx.py
        expect(Object.keys(GAME_SOUNDSETS)).toEqual([
            'door_slide_horiz', 'hive_webs_sticky',
            'footstep_concrete', 'footstep_snow',
            'prop_impact_metal', 'prop_impact_glass',
            'enemy_crawl_snail', 'enemy_crawl_boss',
            'footstep_metal_grate', 'footstep_ice_crunch', 'footstep_hive_slime',
            'footstep_wood_plank', 'footstep_deep_snow', 'footstep_shell_casings',
            'footstep_bone_terrazzo', 'footstep_wet_puddle',
            'terminal_beep', 'terminal_deny', 'vault_open',
            'crane_motor', 'power_hum', 'steam_burst', 'chem_siphon',
            'flesh_seal', 'flesh_squish', 'neural_tap', 'toolbox_open',
            'water_shower', 'water_slosh', 'generator_complete', 'fan_wind',
            'exosuit_charge', 'enemy_idle_boss', 'enemy_alert_crawler',
            'enemy_alert_snail', 'enemy_alert_boss', 'enemy_break_wall',
            'crystal_shatter', 'item_pickup',
            'chen_sealed_confession_console', 'evac_manifest_allocation_terminal',
            'scout_tracking_beacon_core', 'relay_false_beacon_spire',
            'ind_biomass_grinder', 'hive_visceral_ovipositor',
            'enemy_idle_snail', 'enemy_idle_crawler',
            'shell_drop_metal', 'shell_drop_snow', 'shell_drop_stone', 'shell_drop_slime', 'shell_drop_wood',
            'weapon_fire_shotgun', 'weapon_fire_carbine', 'weapon_fire_smg', 'weapon_fire_railgun',
            'weapon_fire_cryo', 'weapon_fire_tesla',
            'tracer_flyby_ballistic', 'tracer_flyby_frost', 'tracer_flyby_heavy', 'tracer_flyby_chitin',
            'amb_point_tallow_forge', 'amb_point_vesper_generator', 'amb_point_meridian_chimes', 'amb_point_hive_sac'
        ]);
        expect(Object.values(GAME_SOUNDSETS).every(validateSoundset)).toBe(true);
        expect(Object.isFrozen(GAME_SOUNDSETS)).toBe(true);
    });

    it('selects deterministically and avoids the previous variant', () => {
        const random = vi.fn(() => 0);
        const selected = selectSoundsetVariant(DOOR_SET, { random, lastVariant: 'door_close1' });

        expect(selected).toEqual({
            key: 'door_close2',
            bus: 'world',
            gain: 0.55,
            playbackRate: 0.96
        });
    });

    it('uses the approved fallback when no variant is loaded', () => {
        const selected = selectSoundsetVariant(DOOR_SET, {
            availableKeys: ['door_slide_horiz']
        });

        expect(selected?.key).toBe('door_slide_horiz');
    });

    it('rejects malformed metadata', () => {
        expect(validateSoundset({ variants: [] })).toBe(false);
        expect(validateSoundset({ variants: ['cue'], pitch: [1.1, 0.9] })).toBe(false);
        expect(validateSoundset({ variants: ['cue'], retrigger: 'unbounded' })).toBe(false);
        expect(selectSoundsetVariant({ variants: [] })).toBeNull();
    });
});
