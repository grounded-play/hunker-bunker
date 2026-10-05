import { access, stat } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { hasEnemy3dModel } from './enemy3dOverlay.js';
import { WORLD_3D_MODELS } from './world3dOverlay.js';

const NEW_ASSETS = [
    'bunker_junk_rare', 'bunker_junk_uncommon', 'fungal_spore_vent',
    'prop_biomech_arch', 'prop_broken_specimen_tank', 'prop_bunker_supplies',
    'prop_cave_bones', 'prop_cave_queen_throne', 'prop_conduit_hub',
    'prop_diagnostic_console', 'prop_medical_bed', 'prop_security_barricade',
    'prop_specimen_tank', 'prop_surgical_cart', 'spore_mortar', 'sporesnail',
    'prop_ammo_crate_stack', 'prop_biomech_flesh_locker', 'prop_biomech_incubator',
    'prop_biomech_neural_synapse', 'prop_biomech_respirator', 'prop_biomech_sphincter_trap',
    'prop_biomech_triage_cradle', 'prop_fabricator_workstation', 'prop_laser_trap_emitter',
    'prop_o2_filter_vat', 'prop_tesla_coil_node', 'prop_vital_monitor',
    'prop_base_defense_turret', 'prop_body_empty_exosuit', 'prop_body_human_frozen',
    'cybersnail_dead', 'alien_proto_crawler', 'alien_proto_crawler_A',
    'sentinel', 'sentinel_A', 'sentinel_B',
    'npc_alien_rhun', 'npc_alien_vey', 'npc_civilian_miner', 'npc_civilian_researcher',
    'prop_chair_operator_wrecked', 'prop_conduit_junction_box', 'prop_flesh_steel_coffin',
    'prop_flesh_steel_cradle', 'prop_flesh_steel_inhaler', 'prop_fungal_mycelium_loom',
    'prop_fungal_resin_basin', 'prop_fungal_spore_dispenser', 'prop_fungal_tendril_altar',
    'prop_icey_frost_manifold', 'prop_icey_frost_vent', 'prop_icey_thermal_pod',
    'prop_light_cluster_dripping', 'prop_locker_bulged', 'prop_pipe_rupture',
    'prop_shrine_plinth_broken', 'prop_storage_drum_dented', 'prop_terminal_ruptured',
    'prop_valve_wheel_fused', 'prop_vent_grate_exploded',
    'prop_autopsy_dissection_slab', 'prop_biomech_sphincter_hatch_vent',
    'prop_biomech_spore_umbilical_cable', 'prop_biomech_spore_umbilical_cable_rigged',
    'prop_biomech_tracheal_wall_pipe', 'prop_ceiling_crane_hoist',
    'prop_coolant_drum_leaking_pool', 'prop_corporate_saint_reliquary',
    'prop_decon_eyewash_shower_station', 'prop_exhaust_blower_fan_hood',
    'prop_exosuit_docking_gantry', 'prop_floor_conduit_bridge',
    'prop_floor_drainage_sump_trough', 'prop_liturgical_terminal_lectern',
    'prop_maintenance_tool_cart', 'prop_overhead_cage_fluorescent',
    'prop_oxygen_bottle_cascade_rack', 'prop_pipe_organ_heat_exchanger',
    'prop_vertebral_cable_riser', 'prop_votive_candle_shrine',
    'prop_wall_cable_tray_swag',
    // 2D -> 3D gap batch 2026-10-05
    'prop_cave_eggs_hatched', 'prop_cave_eggs_intact', 'scatter_hive_eggs', 'prop_cave_webs',
    'prop_cave_hive_wounded', 'prop_cave_spores', 'prop_spore_colony', 'prop_cave_lichen',
    'prop_hive_carapace_molt', 'prop_camp_meridian_radio',
    'prop_camp_laundry', 'prop_camp_shutter_lockdown', 'prop_camp_warning_placard',
    'prop_camp_bedrolls', 'prop_camp_cookfire_lit',
    'cryosnail_dead', 'sporesnail_dead', 'boss_cybersnail_dead', 'boss_cryosnail_dead'
];

describe('new 3D replacement asset coverage', () => {
    it('keeps every optimized GLB present and below the source-sized payload ceiling', async () => {
        for (const name of NEW_ASSETS) {
            const url = new URL(`../public/3d/runtime/new3ds/${name}.glb`, import.meta.url);
            await expect(access(url)).resolves.toBeUndefined();
            expect((await stat(url)).size, name).toBeLessThan(8 * 1024 * 1024);
        }
    });

    it('routes every asset through either the world or enemy 3D replacement catalog', () => {
        for (const name of NEW_ASSETS) {
            expect(Boolean(WORLD_3D_MODELS[name]) || hasEnemy3dModel(name), name).toBe(true);
        }
    });
});
