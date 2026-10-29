/**
 * Runtime contract for the 80-model World Expansion cohort uploaded 2026-10-16.
 *
 * This is deliberately data-first: the renderer, interaction, FX, experience,
 * presentation and placement systems all consume the same identity list so a
 * model cannot be registered without also owning a gameplay destination.
 */

export const WORLD_EXPANSION_80_IDS = Object.freeze(`
briggs_field_strip_ritual_mat
ceiling_brood_shadow_perch
ceiling_cable_transfer_carriage
ceiling_condensate_return_tree
chen_boardroom_hologram_plinth
chen_bullion_smuggling_trunk
chen_executive_bodyguard_rack
chen_executive_mahogany_desk
chen_holding_cell_shock_gate
chen_pneumatic_capsule_chute
chen_shredder_furnace_hopper
chen_whiskey_decanter_caddy
evac_boarding_vote_turnstile
evac_crew_belongings_mesh
evac_egg_coldchain_harness
evac_empty_seat_memorial_latches
evac_infection_screening_arch
evac_launch_mass_trim_track
evac_mixed_crew_translation_rail
evac_passenger_muster_abacus
evac_queen_restraint_arc
evac_turned_passenger_jettison_seat
hazard_beneficiary_seed_warmer
hazard_beneficiary_steam_rotary_airlock
hazard_controller_air_scrub_diverter
hazard_controller_phase_slug
hazard_controller_relief_logic_cam
hazard_source_cryogen_header
hazard_source_spore_pressure_gland
hazard_source_steam_heart
kaelen_drafting_scroll_reel
martha_warm_pipe_return_nest
meridian_grid_covenant_seal
meridian_grid_restored_bus_crown
meridian_probe_return_catchframe
meridian_reactor_vent_load_selector
meridian_recruited_packdown_sled
meridian_robbed_stripped_transformer_carcass
meridian_turned_resin_choked_breaker_gallery
nahl_covenant_suture_knot
nahl_gift_mercy_carrier
nahl_refusal_cautery_scar
nahl_shared_repair_tendon_jig
rhun_covenant_weight_stone
rhun_gift_load_bearing_yoke
rhun_refusal_split_anvil_wedge
rhun_shared_breach_brace
secret_floor_confessional_cache
secret_wall_memory_skin
sump_acid_skimmer_separator
sump_caustic_barrel_crusher
sump_chemical_neutralizer_vat
sump_emergency_eyewash_station
sump_sewage_macerator_pump
tallow_communal_dose_wheel
tallow_cultist_escort_tether_reel
tallow_harvest_restored_canopy
tallow_recruited_mobile_clinic_harness
tallow_red_mold_quarantine_loom
tallow_robbed_seed_absence_niche
tallow_turned_spore_lockdown_iris
traversal_ballast_tilt_floor
traversal_catwalk_swing_span
traversal_collapsible_chasm_stitcher
traversal_door_pressure_equalizer_bladder
traversal_flood_baffle_wedge
traversal_floor_recess_lift_drum
traversal_thermal_ice_underbite
traversal_wall_coring_chain
vesper_defense_grid_fire_director
vesper_grown_moving_target_rail
vesper_iron_ledger_totem
vesper_recruited_gun_limber
vesper_robbed_armory_shadowboard
vesper_surrender_weapon_tree
vesper_turned_execution_interlock
vey_covenant_twin_listening_cowl
vey_gift_route_memory_orb
vey_refusal_silence_baffle
vey_shared_signal_braider
`.trim().split(/\s+/));

export const WORLD_EXPANSION_80_DECALS = Object.freeze([
    'decal_coring_chain_cut', 'decal_cryogen_header_fallout', 'decal_egg_harness_condensate',
    'decal_escort_tether_drag', 'decal_evac_muster_positions', 'decal_flood_baffle_tide',
    'decal_grid_covenant_witness_arc', 'decal_iron_ledger_chalk_ring', 'decal_lift_recess_rim',
    'decal_memory_skin_pressure', 'decal_nahl_covenant_loop', 'decal_packdown_drag_route',
    'decal_probe_capture_skid', 'decal_queen_restraint_sweep', 'decal_red_mold_quarantine_edge',
    'decal_refusal_cautery_fan', 'decal_restored_grid_halo', 'decal_rhun_weight_set',
    'decal_stolen_weapon_ghosts', 'decal_stripped_copper_scatter', 'decal_turned_resin_veins_fan',
    'decal_vey_resonance_nodes', 'decal_vote_turnstile_wear', 'decal_warm_pipe_body_polish'
]);

export const WORLD_EXPANSION_80_SURFACES = Object.freeze([
    'tex_camp_private_worn_felt', 'tex_camp_robbed_contact_dust', 'tex_ceiling_service_condensate',
    'tex_covenant_two_hand_ivory', 'tex_evac_coldchain_frost_deck', 'tex_evac_queue_burnished_deck',
    'tex_flood_tide_mineral', 'tex_hazard_routed_conduit_wall', 'tex_meridian_covenant_bus_floor',
    'tex_moving_floor_recess_grease', 'tex_recruited_packdown_canvas_floor', 'tex_refusal_cautery_scale',
    'tex_secret_memory_membrane', 'tex_tallow_red_mold_filter_floor', 'tex_turned_resin_ingress',
    'tex_vesper_oiled_tally_deck'
]);

function includesAny(id, words) {
    return words.some((word) => id.includes(word));
}

function suiteFor(id) {
    if (id.startsWith('chen_') || id.startsWith('sump_')) return 'corporate-sump-evidence';
    if (id.startsWith('meridian_') || id.startsWith('kaelen_')) return 'meridian-consequence';
    if (id.startsWith('tallow_') || id.startsWith('martha_')) return 'tallow-consequence';
    if (id.startsWith('vesper_') || id.startsWith('briggs_')) return 'vesper-consequence';
    if (/^(nahl|vey|rhun)_/.test(id)) return 'alien-covenant';
    if (id.startsWith('evac_')) return 'evac-ending';
    if (id.startsWith('traversal_')) return 'traversal';
    if (id.startsWith('hazard_')) return 'network-hazard';
    if (id.startsWith('ceiling_')) return 'ceiling-network';
    return 'secret-reveal';
}

function placementFor(id) {
    if (id.startsWith('ceiling_') || id.includes('canopy') || id.includes('header') || id.includes('gland')) return 'ceiling';
    if (includesAny(id, ['wall_', 'scar', 'shadowboard', 'gallery', 'niche', 'silence_baffle'])) return 'wall';
    if (includesAny(id, ['shock_gate', 'turnstile', 'screening_arch', 'rotary_airlock', 'quarantine_loom', 'execution_interlock'])) return 'threshold';
    if (includesAny(id, ['floor_recess', 'tilt_floor', 'mass_trim_track'])) return 'recess';
    if (includesAny(id, ['ritual_mat', 'decanter', 'scroll_reel', 'route_memory_orb'])) return 'tabletop';
    if (includesAny(id, ['packdown_sled', 'mercy_carrier', 'load_bearing_yoke', 'mobile_clinic', 'chasm_stitcher'])) return 'carry-install';
    return 'floor';
}

function motionFor(id) {
    if (includesAny(id, ['wheel', 'turnstile', 'drum', 'cam', 'rotary', 'skimmer', 'macerator', 'crusher', 'coring_chain'])) return 'spin';
    if (includesAny(id, ['gate', 'airlock', 'baffle', 'iris', 'screening_arch', 'memory_skin', 'cache', 'trunk', 'hopper', 'chute'])) return 'hinge';
    if (includesAny(id, ['rail', 'carriage', 'sled', 'limber', 'catchframe', 'load_selector', 'interlock', 'lift', 'tilt_floor'])) return 'slide';
    if (includesAny(id, ['heart', 'gland', 'nest', 'suture', 'cowl', 'membrane', 'harness', 'canopy'])) return 'breathe';
    return 'pulse';
}

function fxFor(id) {
    if (includesAny(id, ['steam', 'furnace', 'thermal', 'warm', 'cautery', 'welding'])) return 'thermal';
    if (includesAny(id, ['acid', 'sewage', 'neutralizer', 'cryogen', 'coldchain', 'condensate', 'frost', 'eyewash', 'flood'])) return 'liquid';
    if (includesAny(id, ['spore', 'resin', 'brood', 'suture', 'nahl_', 'vey_', 'rhun_', 'queen', 'egg', 'memory_skin'])) return 'organic';
    return 'powered';
}

function themeFor(id) {
    if (id.startsWith('evac_')) return 'bunker-standard';
    if (id.startsWith('traversal_')) return id.includes('ice') ? 'cryo-rough' : 'bunker-utility';
    if (id.startsWith('hazard_')) return id.includes('spore') ? 'bio-engineering' : 'bunker-substation';
    if (id.startsWith('ceiling_')) return id.includes('brood') ? 'bio-nest' : 'bunker-utility';
    if (/^(nahl|vey|rhun)_/.test(id)) return 'giger-cathedral';
    if (/^(tallow|martha)_/.test(id)) return 'camp-fortified';
    if (/^(meridian|kaelen|vesper|briggs)_/.test(id)) return 'camp-fortified';
    if (id.startsWith('sump_')) return 'bunker-toxic-sump';
    return 'bunker-standard';
}

function heightFor(id, placement) {
    if (placement === 'tabletop') return 0.65;
    if (placement === 'ceiling') return id.includes('canopy') ? 0.55 : 1.1;
    if (placement === 'wall') return 1.55;
    if (placement === 'threshold') return 2.25;
    if (placement === 'recess') return 0.42;
    if (placement === 'carry-install') return 1.05;
    if (includesAny(id, ['catwalk', 'gallery', 'restraint_arc', 'bus_crown', 'defense_grid'])) return 2.2;
    return 1.45;
}

function supportFor(id, index) {
    if (id.includes('covenant')) return ['tex_covenant_two_hand_ivory', id.startsWith('nahl_') ? 'decal_nahl_covenant_loop' : id.startsWith('vey_') ? 'decal_vey_resonance_nodes' : id.startsWith('rhun_') ? 'decal_rhun_weight_set' : 'decal_grid_covenant_witness_arc'];
    if (id.includes('refusal')) return ['tex_refusal_cautery_scale', 'decal_refusal_cautery_fan'];
    if (id.startsWith('evac_')) return [id.includes('egg') ? 'tex_evac_coldchain_frost_deck' : 'tex_evac_queue_burnished_deck', id.includes('queen') ? 'decal_queen_restraint_sweep' : id.includes('egg') ? 'decal_egg_harness_condensate' : id.includes('turnstile') ? 'decal_vote_turnstile_wear' : 'decal_evac_muster_positions'];
    if (id.startsWith('traversal_')) return [id.includes('flood') || id.includes('ice') ? 'tex_flood_tide_mineral' : 'tex_moving_floor_recess_grease', id.includes('coring') ? 'decal_coring_chain_cut' : id.includes('flood') ? 'decal_flood_baffle_tide' : 'decal_lift_recess_rim'];
    if (id.startsWith('hazard_')) return ['tex_hazard_routed_conduit_wall', id.includes('cryogen') ? 'decal_cryogen_header_fallout' : 'decal_turned_resin_veins_fan'];
    if (id.startsWith('ceiling_')) return ['tex_ceiling_service_condensate', 'decal_cryogen_header_fallout'];
    if (id.startsWith('tallow_') || id.startsWith('martha_')) return ['tex_tallow_red_mold_filter_floor', id.includes('warm_pipe') ? 'decal_warm_pipe_body_polish' : id.includes('red_mold') ? 'decal_red_mold_quarantine_edge' : 'decal_escort_tether_drag'];
    if (id.startsWith('vesper_') || id.startsWith('briggs_')) return ['tex_vesper_oiled_tally_deck', id.includes('ledger') ? 'decal_iron_ledger_chalk_ring' : id.includes('robbed') ? 'decal_stolen_weapon_ghosts' : 'decal_stripped_copper_scatter'];
    if (id.startsWith('meridian_') || id.startsWith('kaelen_')) return ['tex_meridian_covenant_bus_floor', id.includes('probe') ? 'decal_probe_capture_skid' : id.includes('restored') ? 'decal_restored_grid_halo' : id.includes('recruited') ? 'decal_packdown_drag_route' : 'decal_grid_covenant_witness_arc'];
    if (id.startsWith('secret_')) return ['tex_secret_memory_membrane', 'decal_memory_skin_pressure'];
    return [WORLD_EXPANSION_80_SURFACES[index % WORLD_EXPANSION_80_SURFACES.length], WORLD_EXPANSION_80_DECALS[index % WORLD_EXPANSION_80_DECALS.length]];
}

export const WORLD_EXPANSION_80_SPECS = Object.freeze(WORLD_EXPANSION_80_IDS.map((id, index) => {
    const placement = placementFor(id);
    const [surface, decal] = supportFor(id, index);
    return Object.freeze({
        id,
        suite: suiteFor(id),
        placement,
        theme: themeFor(id),
        role: id.startsWith('evac_') ? 'objective' : id.startsWith('traversal_') ? 'traversal' : id.startsWith('secret_') ? 'secret' : 'questDestination',
        height: heightFor(id, placement),
        maxSpan: includesAny(id, ['catwalk', 'gallery', 'canopy', 'arc', 'crown', 'carriage', 'return_tree']) ? 3.2 : 2.2,
        motion: motionFor(id),
        fx: fxFor(id),
        surface,
        decal,
        prompt: `Use ${id.replaceAll('_', ' ')}`,
        states: Object.freeze(['idle', 'active', 'resolved']),
        sockets: Object.freeze(id.startsWith('hazard_') ? ['socket_input_00', 'socket_output_00'] : [])
    });
}));

export const WORLD_EXPANSION_80_BY_ID = Object.freeze(Object.fromEntries(
    WORLD_EXPANSION_80_SPECS.map((spec) => [spec.id, spec])
));

export const WORLD_EXPANSION_80_MODELS = Object.freeze(Object.fromEntries(
    WORLD_EXPANSION_80_SPECS.map((spec) => [spec.id, Object.freeze({
        url: `/3d/runtime/new3ds/${spec.id}.glb`,
        height: spec.height,
        maxSpan: spec.maxSpan,
        yaw: 0
    })])
));

if (WORLD_EXPANSION_80_IDS.length !== 80 || new Set(WORLD_EXPANSION_80_IDS).size !== 80) {
    throw new Error('World Expansion 80 manifest must contain exactly 80 unique ids.');
}
