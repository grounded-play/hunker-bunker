/**
 * 2D prop types that still draw a billboard, paired with existing GLBs that
 * may depict the same object (docs/reports/2d-to-3d-gap-audit-2026-10-05.md).
 *
 * status:
 * - 'wired': aliased in WORLD_3D_MODEL_ALIASES and rendering as the model.
 * - 'review': a plausible match that needs a look before it is aliased. The
 *   debug museum's "2D -> 3D REVIEW" row shows each sprite beside each of its
 *   candidates, so the decision is made by eye, not by name.
 *
 * Resolved by new art (2026-10-05 gap batch, own GLBs now): cave spores, spore
 * colony, lichen, wounded hive wall.
 *
 * Every camp and hive signature-prop sprite (.jpg) is a ~10 KB placeholder
 * tile (dashed box + initials), so for those any fitting model is an upgrade.
 *
 * `site` says which spawn path draws the type, because only 'scatter' types
 * become 3D through an alias alone. Camp and hive signature props are built by
 * camp.js / hiveSite.js and need a per-spec model hook once approved.
 */
export const WORLD_3D_CANDIDATES = Object.freeze([
    { type: 'prop_fusion_generator', sprite: '/prop_fusion_generator.png', site: 'scatter', status: 'wired', candidates: ['fusion_generator'] },
    { type: 'prop_camp_cookfire_doused', sprite: '/prop_camp_cookfire_doused.png', site: 'scatter', status: 'wired', candidates: ['prop_camp_cookfire'] },
    { type: 'prop_camp_vesper_turret', sprite: '/prop_camp_vesper_turret.jpg', site: 'scatter', status: 'wired', candidates: ['prop_base_defense_turret'] },
    { type: 'scatter_camp_supplies', sprite: '/scatter_camp_supplies.png', site: 'scatter', status: 'wired', candidates: ['prop_camp_crate'] },

    // Looked like name matches, were not: the sprite is a console with a
    // junction box bolted on, and the vent is a purple alien bloom.
    { type: 'prop_cyber_junction', sprite: '/prop_cyber_junction.png', site: 'scatter', status: 'review', candidates: ['prop_diagnostic_console', 'prop_terminal_ruptured', 'prop_conduit_junction_box'] },
    { type: 'prop_alien_respiratory_vent', sprite: '/prop_alien_respiratory_vent.png', site: 'scatter', status: 'review', candidates: ['prop_biomech_sphincter_hatch_vent', 'prop_biomech_respirator'] },
    { type: 'prop_biomech_pillar_left', sprite: '/prop_biomech_pillar_left.png', site: 'scatter', status: 'review', candidates: ['arch_pillar_buttress_01', 'prop_biomech_arch'] },
    { type: 'prop_biomech_pillar_right', sprite: '/prop_biomech_pillar_right.png', site: 'scatter', status: 'review', candidates: ['arch_pillar_buttress_02', 'prop_biomech_arch'] },
    { type: 'scatter_bio_pod', sprite: '/scatter_bio_pod.png', site: 'scatter', status: 'review', candidates: ['prop_biomech_incubator'] },
    { type: 'prop_cryo_sleep_pod', sprite: '/prop_cryo_sleep_pod.png', site: 'scatter', status: 'review', candidates: ['prop_icey_thermal_pod', 'prop_flesh_steel_coffin'] },
    { type: 'lore_terminal', sprite: '/console.png', site: 'scatter', status: 'review', candidates: ['prop_terminal_ruptured', 'prop_liturgical_terminal_lectern'] },

    { type: 'prop_hive_chitin_hatchery', sprite: '/prop_hive_chitin_hatchery.jpg', site: 'hive', status: 'review', candidates: ['prop_biomech_incubator'] },
    { type: 'prop_hive_synaptic_web', sprite: '/prop_hive_synaptic_web.jpg', site: 'hive', status: 'review', candidates: ['prop_biomech_neural_synapse'] },
    { type: 'prop_hive_suture_organ', sprite: '/prop_hive_suture_organ.jpg', site: 'hive', status: 'review', candidates: ['prop_flesh_steel_inhaler'] },
    { type: 'prop_hive_wound_cauterizer', sprite: '/prop_hive_wound_cauterizer.jpg', site: 'hive', status: 'review', candidates: ['prop_biomech_triage_cradle'] },
    { type: 'prop_hive_relay_antenna', sprite: '/prop_hive_relay_antenna.jpg', site: 'hive', status: 'review', candidates: ['prop_vertebral_cable_riser'] },

    { type: 'prop_camp_tallow_resin_urn', sprite: '/prop_camp_tallow_resin_urn.jpg', site: 'camp', status: 'review', candidates: ['prop_fungal_resin_basin'] },
    { type: 'prop_camp_tallow_spore_trays', sprite: '/prop_camp_tallow_spore_trays.jpg', site: 'camp', status: 'review', candidates: ['prop_fungal_mycelium_loom'] },
    { type: 'prop_camp_tallow_still', sprite: '/prop_camp_tallow_still.jpg', site: 'camp', status: 'review', candidates: ['prop_pipe_organ_heat_exchanger'] },
    { type: 'prop_camp_vesper_ammo_press', sprite: '/prop_camp_vesper_ammo_press.jpg', site: 'camp', status: 'review', candidates: ['prop_fabricator_workstation'] },
    { type: 'prop_camp_vesper_shield_rack', sprite: '/prop_camp_vesper_shield_rack.jpg', site: 'camp', status: 'review', candidates: ['prop_security_barricade'] },
    { type: 'prop_camp_meridian_repair_rig', sprite: '/prop_camp_meridian_repair_rig.jpg', site: 'camp', status: 'review', candidates: ['prop_maintenance_tool_cart'] },
    { type: 'prop_camp_meridian_battery_bank', sprite: '/prop_camp_meridian_battery_bank.jpg', site: 'camp', status: 'review', candidates: ['prop_oxygen_bottle_cascade_rack'] }
]);
