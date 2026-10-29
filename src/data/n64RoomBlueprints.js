// Six signature N64-inspired architectural room blueprints.
// Blueprint specifications from docs/planning/n64-architectural-level-design-overhaul-2026-10-10.md Section 4.
// Adheres to broken orthogonality (45-degree corner chamfers), multi-tier elevation, proscenium sightlines,
// and monumental centerpieces ("weenies").
// Fully compliant with validateRoomBuild, rotateRoomBuild, and chunk border margins.

function buildPattern(width, height, wallCells = []) {
    const pattern = Array.from({ length: height }, () => Array(width).fill('.'));
    for (const { x, y, w = 1, h = 1 } of wallCells) {
        for (let row = y; row < y + h; row += 1) {
            for (let col = x; col < x + w; col += 1) {
                if (row >= 0 && row < height && col >= 0 && col < width) {
                    pattern[row][col] = '#';
                }
            }
        }
    }
    return pattern.map((row) => row.join(''));
}

export const N64_ROOM_BLUEPRINTS = Object.freeze([
    // Blueprint 1: The Sub-Deck Turbine Sump (19 x 11) - Sunken coolant basin & bridging catwalks
    Object.freeze({
        id: 'room_subdeck_turbine_sump',
        family: 'engineering',
        themeStyle: 'substation',
        pattern: buildPattern(19, 11, [
            // 45-degree corner chamfers
            { x: 0, y: 0, w: 2, h: 2 },
            { x: 17, y: 0, w: 2, h: 2 },
            { x: 0, y: 9, w: 2, h: 2 },
            { x: 17, y: 9, w: 2, h: 2 },
            // Central fusion turbine hub island
            { x: 8, y: 4, w: 3, h: 3 },
            // Flanking coolant pylons
            { x: 4, y: 4, w: 2, h: 3 },
            { x: 13, y: 4, w: 2, h: 3 }
        ]),
        sockets: [
            { id: 'approach', side: 's', width: 3, required: true },
            { id: 'exit', side: 'n', width: 3, required: false }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [2, 3, 4],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: ['objective', 'defense'],
        structuralAnchors: [
            { id: 'fusion_turbine_hub', type: 'engineer_wave_relay_dynamo', x: 9, y: 5 },
            { id: 'coolant_pylon_west', type: 'prop_tesla_coil_node', x: 4, y: 5 },
            { id: 'coolant_pylon_east', type: 'prop_tesla_coil_node', x: 14, y: 5 }
        ],
        interactionAnchors: [
            { id: 'turbine_control_console', type: 'life_tactile_console', x: 9, y: 8 },
            { id: 'sump_drain_valve', type: 'prop_floor_drainage_sump_trough', x: 9, y: 2 }
        ],
        compassAnchors: { approach: 'approach', objective: 'turbine_control_console' },
        coverZones: [{ x: 4, y: 4, w: 2, h: 3 }, { x: 13, y: 4, w: 2, h: 3 }],
        encounterZones: [{ id: 'catwalk_approach', x: 6, y: 7, w: 7, h: 3 }],
        rewardAnchors: [{ id: 'turbine_maintenance_cache', type: 'prop_bunker_supplies', x: 2, y: 5 }],
        loreAnchors: [{ id: 'turbine_log_terminal', type: 'lore_terminal', x: 16, y: 5 }],
        hazardZones: [{ id: 'coolant_sump_leak', x: 6, y: 4, w: 7, h: 3 }],
        quietZones: [],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 18, maxY: 10 },
        presentationVariants: ['intact', 'overloaded', 'flooded'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['pressure_corridor', 'boss_staging_approach'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 2, activityZones: 2, pickupsMin: 1, enemiesMax: 5 }
    }),

    // Blueprint 2: The Cryo-Fissure Cathedral (21 x 11) - Diagonal glacial bedrock rift & central ice obelisk dais
    Object.freeze({
        id: 'room_cryo_fissure_cathedral',
        family: 'gate',
        themeStyle: 'permafrost',
        pattern: buildPattern(21, 11, [
            // 45-degree corner chamfers
            { x: 0, y: 0, w: 3, h: 2 },
            { x: 18, y: 0, w: 3, h: 2 },
            { x: 0, y: 9, w: 3, h: 2 },
            { x: 18, y: 9, w: 3, h: 2 },
            // Central ice obelisk dais
            { x: 9, y: 4, w: 3, h: 3 },
            // Glacial stalagmite crags
            { x: 4, y: 4, w: 2, h: 3 },
            { x: 15, y: 4, w: 2, h: 3 }
        ]),
        sockets: [
            { id: 'entry', side: 's', width: 3, required: true },
            { id: 'exit', side: 'n', width: 3, required: false }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [2, 3, 4],
        biomeEligibility: ['cryo', 'active'],
        roles: ['ringCrossing', 'objective'],
        structuralAnchors: [
            { id: 'ice_obelisk_core', type: 'prop_icey_thermal_pod', x: 10, y: 5 },
            { id: 'stalagmite_spire_w', type: 'state_column_shattered', x: 4, y: 5 },
            { id: 'stalagmite_spire_e', type: 'state_column_shattered', x: 15, y: 5 }
        ],
        interactionAnchors: [
            { id: 'cryo_stabilizer_terminal', type: 'prop_liturgical_terminal_lectern', x: 10, y: 8 },
            { id: 'permafrost_survey_post', type: 'chasm_geothermal_survey_transit', x: 10, y: 2 }
        ],
        compassAnchors: { approach: 'entry', objective: 'cryo_stabilizer_terminal' },
        coverZones: [{ x: 4, y: 4, w: 2, h: 3 }, { x: 15, y: 4, w: 2, h: 3 }],
        encounterZones: [{ id: 'fissure_guardians', x: 6, y: 2, w: 9, h: 7 }],
        rewardAnchors: [{ id: 'frozen_expedition_cache', type: 'prop_bunker_supplies', x: 2, y: 5 }],
        loreAnchors: [{ id: 'glacier_core_log', type: 'lore_terminal', x: 18, y: 5 }],
        hazardZones: [{ id: 'glacial_chasm_frost', x: 7, y: 3, w: 7, h: 5 }],
        quietZones: [],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 20, maxY: 10 },
        presentationVariants: ['intact', 'subzero_frost', 'rift_breached'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['pressure_corridor', 'boss_staging_approach'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 2, activityZones: 2, pickupsMin: 1, enemiesMax: 5 }
    }),

    // Blueprint 3: The Fungal Nave & Spore Well (21 x 11) - Sunken spore well & ribcage buttresses
    Object.freeze({
        id: 'room_bio_spore_well_nave',
        family: 'gate',
        themeStyle: 'mycelium',
        pattern: buildPattern(21, 11, [
            // Corner chamfers
            { x: 0, y: 0, w: 2, h: 2 },
            { x: 19, y: 0, w: 2, h: 2 },
            { x: 0, y: 9, w: 2, h: 2 },
            { x: 19, y: 9, w: 2, h: 2 },
            // Ribcage buttress pillars
            { x: 4, y: 2, w: 2, h: 2 },
            { x: 4, y: 7, w: 2, h: 2 },
            { x: 15, y: 2, w: 2, h: 2 },
            { x: 15, y: 7, w: 2, h: 2 },
            // Central spore loom hub
            { x: 9, y: 4, w: 3, h: 3 }
        ]),
        sockets: [
            { id: 'approach', side: 's', width: 3, required: true },
            { id: 'exit', side: 'n', width: 3, required: false }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [2, 3, 4],
        biomeEligibility: ['bio', 'active'],
        roles: ['ringCrossing', 'objective'],
        structuralAnchors: [
            { id: 'spore_loom_hub', type: 'prop_fungal_mycelium_loom', x: 10, y: 5 },
            { id: 'ribcage_buttress_nw', type: 'prop_pipe_organ_heat_exchanger', x: 4, y: 2 },
            { id: 'ribcage_buttress_sw', type: 'prop_pipe_organ_heat_exchanger', x: 4, y: 7 },
            { id: 'ribcage_buttress_ne', type: 'prop_pipe_organ_heat_exchanger', x: 15, y: 2 },
            { id: 'ribcage_buttress_se', type: 'prop_pipe_organ_heat_exchanger', x: 15, y: 7 }
        ],
        interactionAnchors: [
            { id: 'spore_well_lectern', type: 'prop_liturgical_terminal_lectern', x: 10, y: 8 },
            { id: 'umbilical_valve_manifold', type: 'hive_pheromone_node', x: 10, y: 2 }
        ],
        compassAnchors: { approach: 'approach', objective: 'spore_well_lectern' },
        coverZones: [{ x: 4, y: 2, w: 2, h: 7 }, { x: 15, y: 2, w: 2, h: 7 }],
        encounterZones: [{ id: 'spore_concourse', x: 7, y: 3, w: 7, h: 5 }],
        rewardAnchors: [{ id: 'mycelial_chitin_relic', type: 'prop_bunker_supplies', x: 2, y: 5 }],
        loreAnchors: [{ id: 'hive_catechism_log', type: 'lore_terminal', x: 18, y: 5 }],
        hazardZones: [{ id: 'spore_effluvium_well', x: 7, y: 3, w: 7, h: 5 }],
        quietZones: [],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 20, maxY: 10 },
        presentationVariants: ['fruiting', 'dormant', 'pulsing'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['pressure_corridor', 'boss_staging_approach'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 2, activityZones: 2, pickupsMin: 1, enemiesMax: 5 }
    }),

    // Blueprint 4: The Decon Blast Airlock & Sluice Gate (17 x 11) - 45° blast chamfers & narrowed sluice jambs
    Object.freeze({
        id: 'room_decon_blast_airlock',
        family: 'security',
        themeStyle: 'cleanroom',
        pattern: buildPattern(17, 11, [
            // 45-degree blast chamfers
            { x: 0, y: 0, w: 2, h: 2 },
            { x: 15, y: 0, w: 2, h: 2 },
            { x: 0, y: 9, w: 2, h: 2 },
            { x: 15, y: 9, w: 2, h: 2 },
            // Sluice bulkhead jambs
            { x: 0, y: 4, w: 5, h: 3 },
            { x: 12, y: 4, w: 5, h: 3 }
        ]),
        sockets: [
            { id: 'entry', side: 's', width: 3, required: true },
            { id: 'exit', side: 'n', width: 3, required: false }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [2, 3, 4],
        biomeEligibility: ['active', 'bio', 'cryo'],
        roles: ['security', 'defense'],
        structuralAnchors: [
            { id: 'blast_door_jamb_west', type: 'prop_conduit_junction_box', x: 3, y: 5 },
            { id: 'blast_door_jamb_east', type: 'prop_conduit_junction_box', x: 13, y: 5 }
        ],
        interactionAnchors: [
            { id: 'decon_cycle_console', type: 'prop_diagnostic_console', x: 8, y: 5 },
            { id: 'eyewash_shower_station', type: 'prop_diagnostic_console', x: 8, y: 2 }
        ],
        compassAnchors: { approach: 'entry', objective: 'decon_cycle_console' },
        coverZones: [{ x: 0, y: 4, w: 5, h: 3 }, { x: 12, y: 4, w: 5, h: 3 }],
        encounterZones: [{ id: 'sluice_chamber', x: 5, y: 4, w: 7, h: 3 }],
        rewardAnchors: [{ id: 'hazmat_supply_locker', type: 'prop_bunker_supplies', x: 8, y: 8 }],
        loreAnchors: [{ id: 'decon_manifest_terminal', type: 'lore_terminal', x: 6, y: 2 }],
        hazardZones: [{ id: 'decon_drainage_trough', x: 5, y: 3, w: 7, h: 1 }],
        quietZones: [],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 16, maxY: 10 },
        presentationVariants: ['sterile', 'contaminated', 'quarantined'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['pressure_corridor', 'boss_staging_approach'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 2, activityZones: 2, pickupsMin: 1, enemiesMax: 4 }
    }),

    // Blueprint 5: The Obsidian Vault of the Machine Saint (19 x 11) - Octagonal chamfers & monolithic saint reliquary dais
    Object.freeze({
        id: 'room_obsidian_saint_vault',
        family: 'cache',
        themeStyle: 'obsidian',
        pattern: buildPattern(19, 11, [
            // Octagonal 45-degree corner chamfers
            { x: 0, y: 0, w: 3, h: 3 },
            { x: 16, y: 0, w: 3, h: 3 },
            { x: 0, y: 8, w: 3, h: 3 },
            { x: 16, y: 8, w: 3, h: 3 },
            // Central monolithic saint reliquary dais
            { x: 8, y: 4, w: 3, h: 3 },
            // Flanking runic pillars
            { x: 4, y: 3, w: 2, h: 2 },
            { x: 13, y: 3, w: 2, h: 2 }
        ]),
        sockets: [
            { id: 'entry', side: 's', width: 3, required: true }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [2, 3, 4],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: ['reward', 'questDestination'],
        structuralAnchors: [
            { id: 'saint_monolith_dais', type: 'prop_corporate_saint_reliquary', x: 9, y: 5 },
            { id: 'runic_pillar_w', type: 'state_column_shattered', x: 4, y: 3 },
            { id: 'runic_pillar_e', type: 'state_column_shattered', x: 13, y: 3 }
        ],
        interactionAnchors: [
            { id: 'saint_reliquary_lectern', type: 'prop_votive_candle_shrine', x: 9, y: 8 }
        ],
        compassAnchors: { approach: 'entry', objective: 'saint_reliquary_lectern' },
        coverZones: [{ x: 8, y: 4, w: 3, h: 3 }],
        encounterZones: [{ id: 'vault_guardians', x: 5, y: 2, w: 9, h: 3 }],
        rewardAnchors: [{ id: 'amethyst_relic_cache', type: 'prop_bunker_supplies', x: 9, y: 2 }],
        loreAnchors: [{ id: 'saint_epitaph_terminal', type: 'lore_terminal', x: 4, y: 7 }],
        hazardZones: [],
        quietZones: [],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 18, maxY: 10 },
        presentationVariants: ['sealed', 'gilded', 'consecrated'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['pressure_corridor', 'boss_staging_approach'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 2, activityZones: 1, pickupsMin: 1, enemiesMax: 4 }
    }),

    // Blueprint 6: The Subterranean Bore Pit & Ore Gantry (21 x 11) - Heavy rock bore excavation pit & crane gantry
    Object.freeze({
        id: 'room_bore_pit_gantry',
        family: 'engineering',
        themeStyle: 'bunker',
        pattern: buildPattern(21, 11, [
            // 45-degree corner chamfers
            { x: 0, y: 0, w: 2, h: 2 },
            { x: 19, y: 0, w: 2, h: 2 },
            { x: 0, y: 9, w: 2, h: 2 },
            { x: 19, y: 9, w: 2, h: 2 },
            // Central bore drill rig island
            { x: 9, y: 4, w: 3, h: 3 },
            // Overhead crane gantry support columns
            { x: 4, y: 3, w: 2, h: 2 },
            { x: 15, y: 3, w: 2, h: 2 }
        ]),
        sockets: [
            { id: 'entry', side: 's', width: 3, required: true },
            { id: 'exit', side: 'n', width: 3, required: false }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [3, 4, 5],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: ['objective', 'defense'],
        structuralAnchors: [
            { id: 'bore_drill_rig', type: 'life_seismic_drill', x: 10, y: 5 },
            { id: 'gantry_column_w', type: 'life_scaffold_tower', x: 4, y: 3 },
            { id: 'gantry_column_e', type: 'life_scaffold_tower', x: 15, y: 3 }
        ],
        interactionAnchors: [
            { id: 'bore_winch_control', type: 'life_ice_bore_winch', x: 10, y: 8 },
            { id: 'slurry_purge_valve', type: 'prop_valve_wheel_fused', x: 10, y: 2 }
        ],
        compassAnchors: { approach: 'entry', objective: 'bore_winch_control' },
        coverZones: [{ x: 4, y: 3, w: 2, h: 5 }, { x: 15, y: 3, w: 2, h: 5 }],
        encounterZones: [{ id: 'pit_perimeter', x: 6, y: 2, w: 9, h: 7 }],
        rewardAnchors: [{ id: 'excavated_ore_cache', type: 'prop_bunker_supplies', x: 2, y: 5 }],
        loreAnchors: [{ id: 'geothermal_bore_log', type: 'lore_terminal', x: 18, y: 5 }],
        hazardZones: [{ id: 'geothermal_slurry_vent', x: 7, y: 4, w: 7, h: 3 }],
        quietZones: [],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 20, maxY: 10 },
        presentationVariants: ['drilling', 'overheated', 'collapsed'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['pressure_corridor', 'boss_staging_approach'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 2, activityZones: 2, pickupsMin: 1, enemiesMax: 5 }
    })
]);
