// Model URLs for operator weapons, weapon skins, chassis skins and modules.
// Plain data, kept apart from the Three.js loaders that consume them
// (player3dOverlay.js, operatorEquipmentSockets.js), so menus that only need
// names, icons and URLs -- the Armory and Vault on the title screen -- do not
// pull Three.js into the web build's boot download (issue #106).
import { COMMUNITY_GLB_MAP } from './communitySkins.js';

export const WEAPON_URL = '/3d/GG.1.glb';

export const WEAPON_ARCHETYPES = {
    gg1: WEAPON_URL,
    talon: '/3d/runtime/new3ds/gun_scout_vector9_talon.glb',
    talon_c: '/3d/runtime/new3ds/gun_scout_talon_c.glb',
    siege_breaker: '/3d/runtime/new3ds/gun_tank_siege_breaker50.glb',
    tesla_lock: '/3d/runtime/new3ds/gun_engineer_tesla_lock.glb'
};

export const WEAPON_SKIN_MESHES = {
    4100: '/3d/runtime/new3ds/skin_scout_frostbite.glb',          // Sub-Zero Frostbite Talon SMG
    4101: '/3d/runtime/new3ds/skin_hazard_stripe_smg.glb',        // Hazard Stripe SMG
    4102: '/3d/runtime/new3ds/skin_tectonic_driller.glb',         // Tectonic Driller Shotgun/Autocannon
    4103: '/3d/runtime/new3ds/skin_engineer_cryo_plasma.glb',     // Cryo-Plasma Arc Driver
    4104: '/3d/runtime/new3ds/skin_rust_bone_trench.glb',         // Rust & Bone Trench Carbine
    4105: '/3d/runtime/new3ds/skin_obsidian_shard.glb',           // Obsidian Shard Marksman
    4106: '/3d/runtime/new3ds/skin_biolume_spore_sprayer.glb',    // Biolume Spore Sprayer
    4107: '/3d/runtime/new3ds/skin_tank_deep_core_melter.glb',    // Deep Core Melter Autocannon
    4108: '/3d/runtime/new3ds/skin_glitched_circuit_bolter.glb',  // Glitched Circuit Bolter
    4109: '/3d/runtime/new3ds/skin_void_walker_beam.glb',         // Void-Walker Beam Cannon
    4110: '/3d/runtime/new3ds/skin_queen_carapace_carbine.glb',   // Queen's Carapace Carbine (Capstone)
    4111: '/3d/runtime/new3ds/skin_solar_flare_antimatter.glb',   // Solar Flare Antimatter Rifle
    4201: '/3d/runtime/new3ds/skin_deep_frost.glb',               // Deep Frost Weapon Skin
    4208: '/3d/runtime/new3ds/skin_rust_bone.glb',                // Rust & Bone Weapon Skin
    4215: '/3d/runtime/new3ds/skin_hive_chitin.glb',              // Hive Chitin Weapon Skin
    4222: '/3d/runtime/new3ds/skin_horizon_corporate.glb',        // Horizon Corporate Weapon Skin
    4229: '/3d/runtime/new3ds/skin_bunker404.glb',                // Bunker 404 Weapon Skin
    4236: '/3d/runtime/new3ds/skin_grand_marshal.glb',            // Grand Marshal Weapon Skin
    // Achievement weapons now load their bespoke optimized 3D models:
    5002: '/3d/runtime/new3ds/skin_scout_chrono_drifter.glb',             // Chrono-Drifter Talon-C
    5006: '/3d/runtime/new3ds/skin_tank_bunker_bastion.glb',              // Bunker Bastion Siege-Breaker
    5009: '/3d/runtime/new3ds/skin_engineer_archival_constructor.glb',   // Archival Constructor Arc Driver
    5010: '/3d/runtime/new3ds/skin_engineer_hive_weaver.glb'             // Hive-Weaver Bio-Plasma Emitter
};

export const CHASSIS_SKIN_MODELS = Object.freeze({
    '4112': '/3d/runtime/new3ds/chassis_subterran_drill_engineer.glb',
    '4113': '/3d/runtime/new3ds/chassis_cryo_vanguard_scout.glb',
    '4114': '/3d/runtime/new3ds/chassis_trench_warden_heavy.glb',
    '4115': '/3d/runtime/new3ds/chassis_void_commando_recon.glb',
    '4116': '/3d/runtime/new3ds/chassis_bio_synthesizer_medic.glb',
    '4117': '/3d/runtime/new3ds/chassis_dreadnought_exo_juggernaut.glb',
    '4118': '/3d/runtime/new3ds/chassis_cyber_spectre_infiltrator.glb',
    '4119': '/3d/runtime/new3ds/chassis_hive_lord_symbiote.glb',
    '4200': '/3d/runtime/new3ds/chassis_deep_frost.glb',
    '4207': '/3d/runtime/new3ds/chassis_rust_bone.glb',
    '4214': '/3d/runtime/new3ds/chassis_hive_chitin.glb',
    '4221': '/3d/runtime/new3ds/chassis_horizon_corporate.glb',
    '4228': '/3d/runtime/new3ds/chassis_bunker404.glb',
    '4235': '/3d/runtime/new3ds/chassis_grand_marshal.glb',
    '5001': '/3d/runtime/new3ds/chassis_scout_ghost_runner.glb',
    '5003': '/3d/runtime/new3ds/chassis_scout_cartographer.glb',
    '5004': '/3d/runtime/new3ds/chassis_scout_pioneer_courier.glb',
    '5005': '/3d/runtime/new3ds/chassis_tank_old_iron.glb',
    '5007': '/3d/runtime/new3ds/chassis_tank_colossus_hive.glb',
    '5008': '/3d/runtime/new3ds/chassis_tank_gentle_titan.glb',
    '5011': '/3d/runtime/new3ds/chassis_engineer_chen_undying.glb',
    '5012': '/3d/runtime/new3ds/chassis_engineer_exodus_vanguard.glb',
    'skin_scout_mayor_tina': '/3d/runtime/secrets/mayor-tina-rigged.glb',
    ...(COMMUNITY_GLB_MAP || {})
});

export const MOD_GLB_MAP = Object.freeze({
    '4140': '/3d/runtime/new3ds/mod_cryo_capacitor.glb', '4141': '/3d/runtime/new3ds/mod_magnetic_scavenger.glb',
    '4142': '/3d/runtime/new3ds/mod_bio_hazard_filter.glb', '4143': '/3d/runtime/new3ds/mod_kinetic_impact.glb',
    '4144': '/3d/runtime/new3ds/mod_thermal_heat_exchanger.glb', '4145': '/3d/runtime/new3ds/mod_echo_location_transceiver.glb',
    '4146': '/3d/runtime/new3ds/mod_symbiotic_adrenaline_pump.glb', '4147': '/3d/runtime/new3ds/mod_zero_point_flux.glb',
    '4160': '/3d/runtime/new3ds/mod_ballast_plating.glb', '4161': '/3d/runtime/new3ds/mod_scrap_furnace.glb',
    '4162': '/3d/runtime/new3ds/mod_queens_bane.glb', '4163': '/3d/runtime/new3ds/mod_archivist_lens.glb',
    '4164': '/3d/runtime/new3ds/mod_shard_conduit.glb', '4165': '/3d/runtime/new3ds/mod_duplicate_refiner.glb',
    '4166': '/3d/runtime/new3ds/mod_pressure_seal.glb', '4167': '/3d/runtime/new3ds/mod_deep_anchor.glb'
});
