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
    item_pickup: 'xp_tick',
    terminal_deny: 'ui_error3',
    // Turret fire is a gunshot, not the Engineer ability's deployment sting.
    turret_fire: 'weapon_fire_sidearm',
    turret_reprogram: 'ui_upgrade_weapon',
    crystal_shatter: 'prop_impact_glass',
    glass_break: 'prop_impact_glass',
    // Enemy walking and movement noise aliases
    enemy_walk_crawler: 'footstep_concrete',
    enemy_skitter_crawler: 'footstep_concrete',
    // Enemy noise triggers: alert, attack abilities, wall breaking
    enemy_alert_crawler: 'ui_scan_ping',
    enemy_alert_snail: 'hive_eggs_hum',
    enemy_alert_boss: 'hive_queen_throne',
    enemy_attack_sporesnail: 'hive_spores_puff',
    enemy_shockwave_cryosnail: 'fx_tank_shockwave',
    enemy_break_wall: 'prop_impact_metal'
});
