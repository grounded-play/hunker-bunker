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
 * Resolved by new art (2026-10-05 gap batch & 2026-10-27 story batch, own GLBs
 * now): cave spores, spore colony, lichen, wounded hive wall, all camp
 * signature/service props, hive site props, and ruptured coolant pump.
 *
 * `site` says which spawn path draws the type.
 */
export const WORLD_3D_CANDIDATES = Object.freeze([
    { type: 'prop_fusion_generator', sprite: '/prop_fusion_generator.png', site: 'scatter', status: 'wired', candidates: ['fusion_generator'] },
    { type: 'prop_camp_cookfire_doused', sprite: '/prop_camp_cookfire_doused.png', site: 'scatter', status: 'wired', candidates: ['prop_camp_cookfire'] },
    { type: 'scatter_camp_supplies', sprite: '/scatter_camp_supplies.png', site: 'scatter', status: 'wired', candidates: ['prop_camp_crate'] },

    // Looked like name matches, were not: the sprite is a console with a
    // junction box bolted on, and the vent is a purple alien bloom.
    { type: 'prop_cyber_junction', sprite: '/prop_cyber_junction.png', site: 'scatter', status: 'wired', candidates: ['prop_diagnostic_console', 'prop_terminal_ruptured', 'prop_conduit_junction_box'] },
    { type: 'prop_biomech_pillar_left', sprite: '/prop_biomech_pillar_left.png', site: 'scatter', status: 'wired', candidates: ['prop_biomech_arch', 'arch_pillar_buttress_01'] },
    { type: 'prop_biomech_pillar_right', sprite: '/prop_biomech_pillar_right.png', site: 'scatter', status: 'wired', candidates: ['prop_biomech_arch', 'arch_pillar_buttress_02'] },
    { type: 'scatter_bio_pod', sprite: '/scatter_bio_pod.png', site: 'scatter', status: 'wired', candidates: ['prop_biomech_incubator'] },
    { type: 'prop_cryo_sleep_pod', sprite: '/prop_cryo_sleep_pod.png', site: 'scatter', status: 'wired', candidates: ['prop_flesh_steel_coffin', 'prop_icey_thermal_pod'] },
    { type: 'prop_engineering_bench', sprite: '/prop_engineering_bench.png', site: 'scatter', status: 'wired', candidates: ['prop_fabricator_workstation', 'prop_maintenance_tool_cart', 'prop_surgical_cart'] },
    { type: 'lore_terminal', sprite: '/console.png', site: 'scatter', status: 'wired', candidates: ['prop_terminal_ruptured', 'prop_liturgical_terminal_lectern'] },
    { type: 'scatter_horizon_black_box', sprite: '/drop_survey_probe.png', site: 'scatter', status: 'wired', candidates: ['prop_camp_meridian_radio'] },
    { type: 'prop_hydraulic_piston_actuator', sprite: null, site: 'room-anchor', status: 'wired', candidates: ['prop_exosuit_docking_gantry'] }
]);
