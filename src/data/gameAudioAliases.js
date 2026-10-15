// Compatibility names used by gameplay/UI callers. Targets are canonical
// manifest keys (or numbered families), not a second copy of the audio buffers.
export const GAME_AUDIO_ALIASES = Object.freeze({
    fx_menu_hover: 'ui_hover',
    fx_menu_click: 'ui_click',
    fx_menu_confirm: 'ui_click',
    ui_click_confirm: 'ui_click',
    ui_click_confirm1: 'ui_click1',
    ui_confirm: 'ui_click',
    ui_buy_item: 'ui_upgrade_weapon',
    ui_modal_open: 'ui_click',
    ui_modal_close: 'ui_click',
    fx_level_up: 'fx_levelup',
    metal_stress: 'amb_metal_stress',
    amb_spore_puff: 'hive_spores_puff',
    alert_high_priority: 'camp_lockdown_alarm',
    camp_fortified: 'ui_upgrade_weapon',
    boss_kill: 'enemy_death_snail',
    killstreak_stinger: 'fx_achievement',
    // Turret fire is a gunshot, not the Engineer ability's deployment sting.
    turret_fire: 'weapon_fire_sidearm',
    turret_reprogram: 'ui_upgrade_weapon',
    glass_break: 'crystal_shatter',
    ambient_steam_hiss: 'steam_burst',
    sfx_ui_denied: 'terminal_deny',
    metal_crash: 'enemy_break_wall',
    ambient_sparks: 'neural_tap',
    shrine_blessing: 'neural_tap',
    alarm_klaxon: 'camp_lockdown_alarm',
    // Enemy walking and movement noise aliases
    enemy_walk_crawler: 'footstep_concrete',
    enemy_skitter_crawler: 'footstep_concrete',
    // Enemy noise triggers: attack abilities
    enemy_attack_sporesnail: 'hive_spores_puff',
    enemy_shockwave_cryosnail: 'fx_tank_shockwave',
    enemy_hit_hard: 'prop_impact_metal',
    // Spent brass shell casing Foley bounces across surface biomes
    shell_drop_metal: 'prop_impact_metal',
    shell_drop_snow: 'footstep_snow',
    shell_drop_stone: 'footstep_concrete',
    shell_drop_slime: 'footstep_hive_slime',
    shell_drop_wood: 'footstep_wood_plank',
    casing_drop: 'prop_impact_metal'
});
