const VALID_RETRIGGER_POLICIES = new Set(['reject', 'replace-oldest', 'replace-quietest']);

/**
 * Runtime soundset definitions live here only after edited assets pass
 * provenance review. Raw source-pack files never become shipping dependencies.
 */
export const GAME_SOUNDSETS = Object.freeze({
    door_slide_horiz: Object.freeze({
        variants: Object.freeze(['cc0_door_lock_body_01', 'cc0_door_lock_body_02', 'cc0_metal_lock_impact_01']),
        fallback: 'door_slide_horiz1', bus: 'world', gain: 0.78,
        pitch: Object.freeze([0.96, 1.04]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    hive_webs_sticky: Object.freeze({
        variants: Object.freeze(['cc0_resin_shift_01', 'cc0_resin_shift_02']),
        fallback: 'hive_webs_sticky', bus: 'world', gain: 0.72,
        pitch: Object.freeze([0.92, 1.06]), noImmediateRepeat: true, retrigger: 'replace-quietest'
    }),

    // Kenney Impact Sounds, CC0. Licence file retained with the pack under
    // art/source/audio/cinematic-source/kenney/; only the selected files are
    // copied into public/, the raw packs stay in the ignored source tree.
    //
    // The sprite layouts have carried footstepFrames since the atlas work, so
    // the game already knew exactly which animation frames are footfalls. It
    // had no sound to play on them and fell back to a synthesised blip.
    footstep_concrete: Object.freeze({
        variants: Object.freeze([
            'footstep_concrete_000', 'footstep_concrete_001', 'footstep_concrete_002',
            'footstep_concrete_003', 'footstep_concrete_004'
        ]),
        // Five variants and no immediate repeat. A repeated footstep is the
        // most noticeable audio artefact a game can have, because the ear
        // tracks a walk cycle whether the player wants it to or not.
        fallback: 'footstep_concrete_000', bus: 'sfx', gain: 0.42,
        pitch: Object.freeze([0.94, 1.08]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    footstep_snow: Object.freeze({
        variants: Object.freeze([
            'footstep_snow_000', 'footstep_snow_001', 'footstep_snow_002',
            'footstep_snow_003', 'footstep_snow_004'
        ]),
        fallback: 'footstep_snow_000', bus: 'sfx', gain: 0.40,
        pitch: Object.freeze([0.92, 1.06]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    // Prop debris had no sound at all until this sprint, then borrowed
    // amb_metal_stress -- an ambience cue doing an impact's job.
    prop_impact_metal: Object.freeze({
        variants: Object.freeze([
            'impactMetal_light_000', 'impactMetal_light_001',
            'impactMetal_medium_000', 'impactMetal_medium_001'
        ]),
        fallback: 'impactMetal_light_000', bus: 'sfx', gain: 0.55,
        pitch: Object.freeze([0.88, 1.14]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    prop_impact_glass: Object.freeze({
        variants: Object.freeze(['impactGlass_light_000', 'impactGlass_light_001']),
        fallback: 'impactGlass_light_000', bus: 'sfx', gain: 0.5,
        pitch: Object.freeze([0.9, 1.12]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    // Kenney Impact Sounds CC0: soft squelching impact variants for snail and creature crawl cycles
    enemy_crawl_snail: Object.freeze({
        variants: Object.freeze([
            'impactSoft_medium_000', 'impactSoft_medium_001', 'impactSoft_medium_002',
            'impactSoft_medium_003', 'impactSoft_medium_004'
        ]),
        fallback: 'impactSoft_medium_000', bus: 'sfx', gain: 0.35,
        pitch: Object.freeze([0.88, 1.12]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    enemy_crawl_boss: Object.freeze({
        variants: Object.freeze([
            'impactSoft_heavy_000', 'impactSoft_heavy_001', 'impactSoft_heavy_002',
            'impactSoft_heavy_003', 'impactSoft_heavy_004'
        ]),
        fallback: 'impactSoft_heavy_000', bus: 'sfx', gain: 0.55,
        pitch: Object.freeze([0.72, 0.95]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    // AudioCraft generated surface footsteps
    footstep_metal_grate: Object.freeze({
        variants: Object.freeze([
            'footstep_metal_grate_000', 'footstep_metal_grate_001', 'footstep_metal_grate_002',
            'footstep_metal_grate_003', 'footstep_metal_grate_004'
        ]),
        fallback: 'footstep_metal_grate_000', bus: 'sfx', gain: 0.44,
        pitch: Object.freeze([0.94, 1.06]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    footstep_ice_crunch: Object.freeze({
        variants: Object.freeze([
            'footstep_ice_crunch_000', 'footstep_ice_crunch_001', 'footstep_ice_crunch_002',
            'footstep_ice_crunch_003', 'footstep_ice_crunch_004'
        ]),
        fallback: 'footstep_ice_crunch_000', bus: 'sfx', gain: 0.42,
        pitch: Object.freeze([0.93, 1.07]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    footstep_hive_slime: Object.freeze({
        variants: Object.freeze([
            'footstep_hive_slime_000', 'footstep_hive_slime_001', 'footstep_hive_slime_002',
            'footstep_hive_slime_003', 'footstep_hive_slime_004'
        ]),
        fallback: 'footstep_hive_slime_000', bus: 'sfx', gain: 0.40,
        pitch: Object.freeze([0.90, 1.08]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    footstep_wood_plank: Object.freeze({
        variants: Object.freeze([
            'footstep_wood_plank_000', 'footstep_wood_plank_001', 'footstep_wood_plank_002',
            'footstep_wood_plank_003', 'footstep_wood_plank_004'
        ]),
        fallback: 'footstep_wood_plank_000', bus: 'sfx', gain: 0.42,
        pitch: Object.freeze([0.94, 1.06]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    footstep_deep_snow: Object.freeze({
        variants: Object.freeze([
            'footstep_deep_snow_000', 'footstep_deep_snow_001', 'footstep_deep_snow_002',
            'footstep_deep_snow_003', 'footstep_deep_snow_004'
        ]),
        fallback: 'footstep_deep_snow_000', bus: 'sfx', gain: 0.44,
        pitch: Object.freeze([0.93, 1.07]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    footstep_shell_casings: Object.freeze({
        variants: Object.freeze([
            'footstep_shell_casings_000', 'footstep_shell_casings_001', 'footstep_shell_casings_002',
            'footstep_shell_casings_003', 'footstep_shell_casings_004'
        ]),
        fallback: 'footstep_shell_casings_000', bus: 'sfx', gain: 0.40,
        pitch: Object.freeze([0.92, 1.08]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    footstep_bone_terrazzo: Object.freeze({
        variants: Object.freeze([
            'footstep_bone_terrazzo_000', 'footstep_bone_terrazzo_001', 'footstep_bone_terrazzo_002',
            'footstep_bone_terrazzo_003', 'footstep_bone_terrazzo_004'
        ]),
        fallback: 'footstep_bone_terrazzo_000', bus: 'sfx', gain: 0.45,
        pitch: Object.freeze([0.94, 1.06]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    footstep_wet_puddle: Object.freeze({
        variants: Object.freeze([
            'footstep_wet_puddle_000', 'footstep_wet_puddle_001', 'footstep_wet_puddle_002',
            'footstep_wet_puddle_003', 'footstep_wet_puddle_004'
        ]),
        fallback: 'footstep_wet_puddle_000', bus: 'sfx', gain: 0.42,
        pitch: Object.freeze([0.93, 1.07]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),

    // AudioCraft generated interactive props & mechanisms
    terminal_beep: Object.freeze({
        variants: Object.freeze(['terminal_beep_000', 'terminal_beep_001', 'terminal_beep_002']),
        fallback: 'terminal_beep_000', bus: 'world', gain: 0.48,
        pitch: Object.freeze([0.96, 1.04]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    terminal_deny: Object.freeze({
        variants: Object.freeze(['terminal_deny_000', 'terminal_deny_001', 'terminal_deny_002']),
        fallback: 'terminal_deny_000', bus: 'world', gain: 0.52,
        pitch: Object.freeze([0.95, 1.05]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    vault_open: Object.freeze({
        variants: Object.freeze(['vault_open_000', 'vault_open_001', 'vault_open_002']),
        fallback: 'vault_open_000', bus: 'world', gain: 0.52,
        pitch: Object.freeze([0.94, 1.06]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    crane_motor: Object.freeze({
        variants: Object.freeze(['crane_motor_000', 'crane_motor_001', 'crane_motor_002']),
        fallback: 'crane_motor_000', bus: 'world', gain: 0.50,
        pitch: Object.freeze([0.95, 1.05]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    power_hum: Object.freeze({
        variants: Object.freeze(['power_hum_000', 'power_hum_001', 'power_hum_002']),
        fallback: 'power_hum_000', bus: 'world', gain: 0.46,
        pitch: Object.freeze([0.96, 1.04]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    steam_burst: Object.freeze({
        variants: Object.freeze(['steam_burst_000', 'steam_burst_001', 'steam_burst_002']),
        fallback: 'steam_burst_000', bus: 'world', gain: 0.50,
        pitch: Object.freeze([0.94, 1.06]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    chem_siphon: Object.freeze({
        variants: Object.freeze(['chem_siphon_000', 'chem_siphon_001', 'chem_siphon_002']),
        fallback: 'chem_siphon_000', bus: 'world', gain: 0.48,
        pitch: Object.freeze([0.95, 1.05]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    flesh_seal: Object.freeze({
        variants: Object.freeze(['flesh_seal_000', 'flesh_seal_001', 'flesh_seal_002']),
        fallback: 'flesh_seal_000', bus: 'world', gain: 0.50,
        pitch: Object.freeze([0.92, 1.08]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    flesh_squish: Object.freeze({
        variants: Object.freeze(['flesh_squish_000', 'flesh_squish_001', 'flesh_squish_002']),
        fallback: 'flesh_squish_000', bus: 'world', gain: 0.50,
        pitch: Object.freeze([0.92, 1.08]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    neural_tap: Object.freeze({
        variants: Object.freeze(['neural_tap_000', 'neural_tap_001', 'neural_tap_002']),
        fallback: 'neural_tap_000', bus: 'world', gain: 0.48,
        pitch: Object.freeze([0.96, 1.04]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    toolbox_open: Object.freeze({
        variants: Object.freeze(['toolbox_open_000', 'toolbox_open_001', 'toolbox_open_002']),
        fallback: 'toolbox_open_000', bus: 'world', gain: 0.48,
        pitch: Object.freeze([0.95, 1.05]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    water_shower: Object.freeze({
        variants: Object.freeze(['water_shower_000', 'water_shower_001', 'water_shower_002']),
        fallback: 'water_shower_000', bus: 'world', gain: 0.52,
        pitch: Object.freeze([0.96, 1.04]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    water_slosh: Object.freeze({
        variants: Object.freeze(['water_slosh_000', 'water_slosh_001', 'water_slosh_002']),
        fallback: 'water_slosh_000', bus: 'world', gain: 0.46,
        pitch: Object.freeze([0.95, 1.05]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    generator_complete: Object.freeze({
        variants: Object.freeze(['generator_complete_000', 'generator_complete_001']),
        fallback: 'generator_complete_000', bus: 'world', gain: 0.54,
        pitch: Object.freeze([0.96, 1.04]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    fan_wind: Object.freeze({
        variants: Object.freeze(['fan_wind_000', 'fan_wind_001']),
        fallback: 'fan_wind_000', bus: 'world', gain: 0.48,
        pitch: Object.freeze([0.95, 1.05]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    exosuit_charge: Object.freeze({
        variants: Object.freeze(['exosuit_charge_000', 'exosuit_charge_001', 'exosuit_charge_002']),
        fallback: 'exosuit_charge_000', bus: 'sfx', gain: 0.50,
        pitch: Object.freeze([0.96, 1.04]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),

    // AudioCraft generated creature & loot acoustics
    enemy_idle_boss: Object.freeze({
        variants: Object.freeze(['enemy_idle_boss_000', 'enemy_idle_boss_001', 'enemy_idle_boss_002']),
        fallback: 'enemy_idle_boss_000', bus: 'world', gain: 0.45,
        pitch: Object.freeze([0.90, 1.10]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    enemy_alert_crawler: Object.freeze({
        variants: Object.freeze(['enemy_alert_crawler_000', 'enemy_alert_crawler_001', 'enemy_alert_crawler_002']),
        fallback: 'enemy_alert_crawler_000', bus: 'sfx', gain: 0.42,
        pitch: Object.freeze([0.95, 1.08]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    enemy_alert_snail: Object.freeze({
        variants: Object.freeze(['enemy_alert_snail_000', 'enemy_alert_snail_001', 'enemy_alert_snail_002']),
        fallback: 'enemy_alert_snail_000', bus: 'sfx', gain: 0.45,
        pitch: Object.freeze([0.94, 1.06]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    enemy_alert_boss: Object.freeze({
        variants: Object.freeze(['enemy_alert_boss_000', 'enemy_alert_boss_001']),
        fallback: 'enemy_alert_boss_000', bus: 'world', gain: 0.55,
        pitch: Object.freeze([0.92, 1.08]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    enemy_break_wall: Object.freeze({
        variants: Object.freeze(['enemy_break_wall_000', 'enemy_break_wall_001', 'enemy_break_wall_002']),
        fallback: 'enemy_break_wall_000', bus: 'world', gain: 0.55,
        pitch: Object.freeze([0.92, 1.08]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    crystal_shatter: Object.freeze({
        variants: Object.freeze(['crystal_shatter_000', 'crystal_shatter_001', 'crystal_shatter_002']),
        fallback: 'crystal_shatter_000', bus: 'sfx', gain: 0.50,
        pitch: Object.freeze([0.94, 1.06]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    item_pickup: Object.freeze({
        variants: Object.freeze(['item_pickup_000', 'item_pickup_001', 'item_pickup_002']),
        fallback: 'item_pickup_000', bus: 'sfx', gain: 0.45,
        pitch: Object.freeze([0.95, 1.05]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),

    // AudioCraft generated lore setpiece landmark props (Pass 2 World Story Props)
    chen_sealed_confession_console: Object.freeze({
        variants: Object.freeze(['chen_sealed_confession_console_000', 'chen_sealed_confession_console_001']),
        fallback: 'chen_sealed_confession_console_000', bus: 'world', gain: 0.52,
        pitch: Object.freeze([0.96, 1.04]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    evac_manifest_allocation_terminal: Object.freeze({
        variants: Object.freeze(['evac_manifest_allocation_terminal_000', 'evac_manifest_allocation_terminal_001']),
        fallback: 'evac_manifest_allocation_terminal_000', bus: 'world', gain: 0.50,
        pitch: Object.freeze([0.96, 1.04]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    scout_tracking_beacon_core: Object.freeze({
        variants: Object.freeze(['scout_tracking_beacon_core_000', 'scout_tracking_beacon_core_001']),
        fallback: 'scout_tracking_beacon_core_000', bus: 'world', gain: 0.48,
        pitch: Object.freeze([0.96, 1.04]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    relay_false_beacon_spire: Object.freeze({
        variants: Object.freeze(['relay_false_beacon_spire_000', 'relay_false_beacon_spire_001']),
        fallback: 'relay_false_beacon_spire_000', bus: 'world', gain: 0.54,
        pitch: Object.freeze([0.95, 1.05]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    ind_biomass_grinder: Object.freeze({
        variants: Object.freeze(['ind_biomass_grinder_000', 'ind_biomass_grinder_001']),
        fallback: 'ind_biomass_grinder_000', bus: 'world', gain: 0.52,
        pitch: Object.freeze([0.95, 1.05]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    hive_visceral_ovipositor: Object.freeze({
        variants: Object.freeze(['hive_visceral_ovipositor_000', 'hive_visceral_ovipositor_001']),
        fallback: 'hive_visceral_ovipositor_000', bus: 'world', gain: 0.50,
        pitch: Object.freeze([0.94, 1.06]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),

    // Kenney RPG Audio CC0: shell creak and mandible click variants for creature idle noise triggers
    enemy_idle_snail: Object.freeze({
        variants: Object.freeze(['creak1', 'creak2', 'creak3']),
        fallback: 'creak1', bus: 'sfx', gain: 0.28,
        pitch: Object.freeze([0.90, 1.10]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    enemy_idle_crawler: Object.freeze({
        variants: Object.freeze(['metalClick']),
        fallback: 'metalClick', bus: 'sfx', gain: 0.25,
        pitch: Object.freeze([1.2, 1.7]), noImmediateRepeat: false, retrigger: 'replace-oldest'
    })
});

// Approved gameplay foley & surfaces
export const GAMEPLAY_FOLEY_MANIFEST = Object.freeze([
    ...[
        'footstep_concrete', 'footstep_snow', 'footstep_metal_grate', 'footstep_ice_crunch',
        'footstep_hive_slime', 'footstep_wood_plank', 'footstep_deep_snow', 'footstep_shell_casings',
        'footstep_bone_terrazzo', 'footstep_wet_puddle'
    ].flatMap((key) => (
        GAME_SOUNDSETS[key].variants.map((variant) => Object.freeze({ key: variant, url: `/audio/footsteps/${variant}.ogg` }))
    )),
    ...['prop_impact_metal', 'prop_impact_glass'].flatMap((key) => (
        GAME_SOUNDSETS[key].variants.map((variant) => Object.freeze({ key: variant, url: `/audio/impacts/${variant}.ogg` }))
    ))
]);

export const GAMEPLAY_ENEMY_MANIFEST = Object.freeze([
    ...['impactSoft_medium_000', 'impactSoft_medium_001', 'impactSoft_medium_002', 'impactSoft_medium_003', 'impactSoft_medium_004'].map((variant) => Object.freeze({ key: variant, url: `/audio/enemies/${variant}.ogg` })),
    ...['impactSoft_heavy_000', 'impactSoft_heavy_001', 'impactSoft_heavy_002', 'impactSoft_heavy_003', 'impactSoft_heavy_004'].map((variant) => Object.freeze({ key: variant, url: `/audio/enemies/${variant}.ogg` })),
    ...['creak1', 'creak2', 'creak3'].map((variant) => Object.freeze({ key: variant, url: `/audio/enemies/${variant}.ogg` })),
    Object.freeze({ key: 'metalClick', url: '/audio/enemies/metalClick.ogg' })
]);

export function validateSoundset(soundset) {
    if (!soundset || !Array.isArray(soundset.variants) || soundset.variants.length === 0) return false;
    if (soundset.variants.some(key => typeof key !== 'string' || key.length === 0)) return false;
    if (soundset.pitch && (!Array.isArray(soundset.pitch) || soundset.pitch.length !== 2 || soundset.pitch.some(value => !Number.isFinite(value)))) return false;
    if (soundset.pitch && soundset.pitch[0] > soundset.pitch[1]) return false;
    if (soundset.retrigger && !VALID_RETRIGGER_POLICIES.has(soundset.retrigger)) return false;
    return true;
}

/**
 * Pure deterministic selection. The caller owns history, cooldowns, voice
 * limits, buffer availability, and playback; this function only resolves the
 * next key and normalized play options.
 */
export function selectSoundsetVariant(soundset, {
    random = Math.random,
    lastVariant = null,
    availableKeys = null
} = {}) {
    if (!validateSoundset(soundset)) return null;

    const available = availableKeys ? new Set(availableKeys) : null;
    let candidates = available
        ? soundset.variants.filter(key => available.has(key))
        : [...soundset.variants];

    if (soundset.noImmediateRepeat && candidates.length > 1) {
        candidates = candidates.filter(key => key !== lastVariant);
    }

    if (candidates.length === 0) {
        return soundset.fallback && (!available || available.has(soundset.fallback))
            ? { key: soundset.fallback, bus: soundset.bus ?? 'sfx', gain: soundset.gain ?? 1, playbackRate: 1 }
            : null;
    }

    const roll = Math.min(0.999999999, Math.max(0, Number(random()) || 0));
    const key = candidates[Math.floor(roll * candidates.length)];
    const [pitchMin, pitchMax] = soundset.pitch ?? [1, 1];

    return {
        key,
        bus: soundset.bus ?? 'sfx',
        gain: soundset.gain ?? 1,
        playbackRate: pitchMin + ((pitchMax - pitchMin) * roll)
    };
}
