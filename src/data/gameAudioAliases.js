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
    // Turret fire is a gunshot, not the Engineer ability's deployment sting.
    turret_fire: 'weapon_fire_sidearm'
});
