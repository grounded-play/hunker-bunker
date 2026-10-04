/**
 * Prop Variant Registry & Dynamic Resolver
 *
 * Audits all 3D props across the repository and organizes duplicate/variant models
 * into procedural variant arrays. Allows room decorators and procedural generation
 * to roll from variant arrays, creating organic visual variety instead of identical clones.
 */

export const PROP_VARIANT_GROUPS = Object.freeze({
    // Specimen Tanks (Intact vs Ruptured)
    specimen_tank: Object.freeze([
        'prop_specimen_tank',
        'prop_broken_specimen_tank'
    ]),

    // Barricades & Defensive Fortifications
    security_barricade: Object.freeze([
        'prop_security_barricade',
        'state_barricade_improvised_1',
        'state_barricade_improvised_2'
    ]),

    // Flesh & Steel Biomech Reliquaries
    flesh_steel_reliquary: Object.freeze([
        'prop_flesh_steel_coffin',
        'prop_flesh_steel_cradle',
        'prop_flesh_steel_inhaler',
        'prop_corporate_saint_reliquary'
    ]),

    // Fungal Biomech Stations & Vents
    fungal_biomech_station: Object.freeze([
        'prop_fungal_mycelium_loom',
        'prop_fungal_resin_basin',
        'prop_fungal_spore_dispenser',
        'prop_fungal_tendril_altar',
        'prop_biomech_sphincter_hatch_vent'
    ]),

    // Cryo Manifolds, Pods & Coolant Drums
    cryo_manifold: Object.freeze([
        'prop_icey_frost_manifold',
        'prop_icey_frost_vent',
        'prop_icey_thermal_pod',
        'prop_coolant_drum_leaking_pool'
    ]),

    // Wall Breaches & Structural Failures
    wall_breach: Object.freeze([
        'state_wall_breached_01',
        'state_wall_breached_02',
        'state_wall_breached_03',
        'state_column_shattered'
    ]),

    // Grand Portals & Door Arches
    cathedral_archway: Object.freeze([
        'arch_deco_archway_grand_01',
        'arch_deco_archway_grand_02',
        'arch_deco_archway_grand_03',
        'arch_deco_archway_grand_04',
        'arch_bulkhead_frame'
    ]),

    // Structural Buttresses & Pillars
    buttress_pillar: Object.freeze([
        'arch_pillar_buttress_01',
        'arch_pillar_buttress_02',
        'arch_pillar_buttress_03',
        'arch_pillar_buttress_04'
    ]),

    // Ceiling Vault Ribs
    ceiling_vault_rib: Object.freeze([
        'arch_rib_ceiling_vault_01',
        'arch_rib_ceiling_vault_02',
        'arch_rib_ceiling_vault_03'
    ]),

    // Computer Consoles & Liturgical Lecterns
    diagnostic_terminal: Object.freeze([
        'prop_diagnostic_console',
        'prop_terminal_ruptured',
        'prop_liturgical_terminal_lectern'
    ]),

    // Industrial Storage Drums
    storage_drum: Object.freeze([
        'prop_storage_drum_dented',
        'prop_coolant_drum_leaking_pool'
    ]),

    // Medical, Triage & Dissection Stations
    medical_station: Object.freeze([
        'prop_medical_bed',
        'prop_surgical_cart',
        'prop_autopsy_dissection_slab',
        'prop_biomech_triage_cradle'
    ]),

    // Industrial & Biomechanical Piping
    pipe_system: Object.freeze([
        'prop_pipe_rupture',
        'prop_valve_wheel_fused',
        'prop_pipe_organ_heat_exchanger',
        'prop_biomech_tracheal_wall_pipe'
    ]),

    // Cable & Wiring Infrastructure
    cable_management: Object.freeze([
        'prop_conduit_junction_box',
        'prop_conduit_hub',
        'prop_floor_conduit_bridge',
        'prop_wall_cable_tray_swag',
        'prop_vertebral_cable_riser'
    ]),

    // Life Support & Decontamination
    life_support: Object.freeze([
        'prop_o2_filter_vat',
        'prop_oxygen_bottle_cascade_rack',
        'prop_decon_eyewash_shower_station',
        'prop_biomech_respirator'
    ]),

    // Sacred Corporate Shrines & Altars
    sacred_shrine: Object.freeze([
        'arch_niche_shrine',
        'prop_shrine_plinth_broken',
        'prop_votive_candle_shrine',
        'prop_corporate_saint_reliquary'
    ]),

    // Lighting Fixtures
    light_fixture: Object.freeze([
        'fixture_sconce_vine',
        'prop_light_cluster_dripping',
        'prop_overhead_cage_fluorescent'
    ]),

    // Ventilation & Drainage
    ventilation: Object.freeze([
        'prop_vent_grate_exploded',
        'prop_floor_drainage_sump_trough',
        'prop_exhaust_blower_fan_hood',
        'prop_biomech_sphincter_hatch_vent'
    ]),

    // Workshop & Maintenance Tooling
    workshop_tooling: Object.freeze([
        'prop_fabricator_workstation',
        'prop_maintenance_tool_cart',
        'prop_exosuit_docking_gantry'
    ]),

    // Fungal Growth Overruns
    growth_overrun: Object.freeze([
        'state_growth_overrun_1',
        'state_growth_overrun_2',
        'prop_hive_resin_sac'
    ]),

    // General Clutter & Crates
    bunker_junk: Object.freeze([
        'bunker_junk_rare',
        'bunker_junk_uncommon',
        'prop_camp_crates',
        'prop_camp_crate'
    ]),

    // Corpses & Skeletal Remains
    corpse_remains: Object.freeze([
        'prop_body_empty_exosuit',
        'prop_body_human_frozen',
        'prop_cave_bones',
        'cybersnail_dead'
    ]),

    // Ground Scatter Debris
    scatter_clutter: Object.freeze([
        'scatter_bolts',
        'scatter_cable_coil'
    ]),

    // Living Umbilical Tentacle Hazards
    umbilical_hazard: Object.freeze([
        'prop_biomech_spore_umbilical_cable',
        'prop_biomech_spore_umbilical_cable_rigged'
    ]),

    // Crawler Enemy Variants
    alien_crawler: Object.freeze([
        'alien_proto_crawler',
        'alien_proto_crawler_A'
    ]),

    // Sentinel Enemy Variants
    sentinel_drone: Object.freeze([
        'sentinel',
        'sentinel_A',
        'sentinel_B'
    ])
});

// Build reverse lookup: model key -> variant group key
const MODEL_TO_GROUP = new Map();
for (const [groupName, models] of Object.entries(PROP_VARIANT_GROUPS)) {
    for (const modelKey of models) {
        if (!MODEL_TO_GROUP.has(modelKey)) {
            MODEL_TO_GROUP.set(modelKey, groupName);
        }
    }
}

/**
 * Returns all variants for a given group or model key.
 */
export function getPropVariants(keyOrGroup) {
    if (PROP_VARIANT_GROUPS[keyOrGroup]) {
        return PROP_VARIANT_GROUPS[keyOrGroup];
    }
    const groupName = MODEL_TO_GROUP.get(keyOrGroup);
    if (groupName && PROP_VARIANT_GROUPS[groupName]) {
        return PROP_VARIANT_GROUPS[groupName];
    }
    return [keyOrGroup];
}

/**
 * Resolves a prop key:
 * 1. If key matches a known variant group, rolls a variant from that group.
 * 2. If allowModelSubstitution is true and the key belongs to a group, rolls from its sibling variants.
 * 3. Otherwise returns key as-is.
 */
export function resolvePropVariant(keyOrGroup, options = {}) {
    const rng = typeof options === 'function' ? options : (options.rng || Math.random);
    const allowModelSubstitution = typeof options === 'object' ? Boolean(options.allowSubstitution) : false;

    // Direct group match
    const group = PROP_VARIANT_GROUPS[keyOrGroup];
    if (Array.isArray(group) && group.length > 0) {
        const idx = Math.floor(rng() * group.length);
        return group[idx];
    }

    // Optional substitution of individual model key with a sibling variant
    if (allowModelSubstitution) {
        const groupName = MODEL_TO_GROUP.get(keyOrGroup);
        if (groupName) {
            const siblings = PROP_VARIANT_GROUPS[groupName];
            if (siblings && siblings.length > 0) {
                const idx = Math.floor(rng() * siblings.length);
                return siblings[idx];
            }
        }
    }

    return keyOrGroup;
}
