// Eight prebuilt cathedral / biomech room blueprints.
// Blueprint specifications from docs/planning/nordic-cathedral-biomech-environmental-spaces-and-textures-plan.md Section 3.
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

export const CATHEDRAL_ROOM_BLUEPRINTS = Object.freeze([
    // Blueprint 1: The Machine God Nave (21 x 11) - Monumental Hall with buttress arches & aisle
    Object.freeze({
        id: 'room_biomech_machine_nave',
        family: 'gate',
        themeStyle: 'giger',
        pattern: buildPattern(21, 11, [
            { x: 3, y: 2, w: 2, h: 2 },
            { x: 3, y: 7, w: 2, h: 2 },
            { x: 16, y: 2, w: 2, h: 2 },
            { x: 16, y: 7, w: 2, h: 2 }
        ]),
        sockets: [
            { id: 'approach', side: 's', width: 3, required: true },
            { id: 'farSide', side: 'n', width: 3, required: false }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [2, 3, 4],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: ['ringCrossing', 'objective'],
        structuralAnchors: [
            { id: 'buttress_nw', type: 'prop_pipe_organ_heat_exchanger', x: 4, y: 3 },
            { id: 'buttress_sw', type: 'prop_pipe_organ_heat_exchanger', x: 4, y: 8 },
            { id: 'buttress_ne', type: 'prop_pipe_organ_heat_exchanger', x: 16, y: 3 },
            { id: 'buttress_se', type: 'prop_pipe_organ_heat_exchanger', x: 16, y: 8 }
        ],
        interactionAnchors: [
            { id: 'apse_scripture_terminal', type: 'prop_liturgical_terminal_lectern', x: 10, y: 3 },
            { id: 'conduit_bridge_controls', type: 'base_console', x: 10, y: 6 }
        ],
        compassAnchors: { approach: 'approach', objective: 'apse_scripture_terminal' },
        coverZones: [{ x: 3, y: 2, w: 3, h: 3 }, { x: 15, y: 2, w: 3, h: 3 }],
        encounterZones: [{ id: 'nave_concourse', x: 7, y: 3, w: 7, h: 5 }],
        rewardAnchors: [{ id: 'votive_shrine_relic', type: 'prop_bunker_supplies', x: 10, y: 2 }],
        loreAnchors: [{ id: 'nave_catechism_log', type: 'lore_terminal', x: 2, y: 5 }],
        hazardZones: [],
        quietZones: [],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 20, maxY: 10 },
        presentationVariants: ['intact', 'consecrated', 'desecrated'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['pressure_corridor', 'boss_staging_approach'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 2, activityZones: 2, pickupsMin: 1, enemiesMax: 5 }
    }),

    // Blueprint 2: The Crypt of the Executive Saint (15 x 13) - Sacred Cross Layout with Dais Sarcophagus
    Object.freeze({
        id: 'room_corpospace_executive_crypt',
        family: 'cache',
        themeStyle: 'reliquary',
        pattern: buildPattern(15, 13, [
            // Corner chamfers forming a sacred cruciform hall
            { x: 0, y: 0, w: 3, h: 3 },
            { x: 12, y: 0, w: 3, h: 3 },
            { x: 0, y: 10, w: 3, h: 3 },
            { x: 12, y: 10, w: 3, h: 3 },
            // Central sarcophagus dais pedestal
            { x: 6, y: 5, w: 3, h: 3 }
        ]),
        sockets: [
            { id: 'entry', side: 's', width: 3, required: true }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [2, 3, 4],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: ['reward', 'questDestination'],
        structuralAnchors: [
            { id: 'saint_sarcophagus_dais', type: 'prop_corporate_saint_reliquary', x: 7, y: 6 }
        ],
        interactionAnchors: [
            { id: 'lectern_scripture', type: 'prop_liturgical_terminal_lectern', x: 7, y: 8 }
        ],
        compassAnchors: { approach: 'entry', objective: 'lectern_scripture' },
        coverZones: [{ x: 5, y: 4, w: 5, h: 5 }],
        encounterZones: [{ id: 'crypt_guardians', x: 4, y: 2, w: 7, h: 3 }],
        rewardAnchors: [{ id: 'saint_reliquary_chest', type: 'prop_bunker_supplies', x: 7, y: 4 }],
        loreAnchors: [{ id: 'executive_epitaph', type: 'lore_terminal', x: 3, y: 6 }],
        hazardZones: [],
        quietZones: [],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 14, maxY: 12 },
        presentationVariants: ['sealed', 'gilded', 'breached'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['pressure_corridor'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 1, activityZones: 1, pickupsMin: 1, enemiesMax: 3 }
    }),

    // Blueprint 3: Xenobiotic Incubation Cloister (17 x 11) - Infested Quad with Umbilical Pillars
    Object.freeze({
        id: 'room_xenobiotic_incubation_cloister',
        family: 'trap_reward',
        themeStyle: 'biomech',
        pattern: buildPattern(17, 11, [
            { x: 0, y: 0, w: 2, h: 2 },
            { x: 15, y: 0, w: 2, h: 2 },
            { x: 0, y: 9, w: 2, h: 2 },
            { x: 15, y: 9, w: 2, h: 2 },
            // Umbilical pillar clusters
            { x: 4, y: 3, w: 2, h: 2 },
            { x: 11, y: 3, w: 2, h: 2 }
        ]),
        sockets: [
            { id: 'entry', side: 's', width: 3, required: true }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [2, 3, 4],
        biomeEligibility: ['active', 'bio', 'cryo'],
        roles: ['challenge', 'reward'],
        structuralAnchors: [
            { id: 'umbilical_pillar_west', type: 'prop_biomech_tracheal_wall_pipe', x: 4, y: 3 },
            { id: 'umbilical_pillar_east', type: 'prop_biomech_tracheal_wall_pipe', x: 11, y: 3 }
        ],
        interactionAnchors: [
            { id: 'specimen_tank_console', type: 'prop_diagnostic_console', x: 8, y: 5 }
        ],
        compassAnchors: { approach: 'entry', objective: 'specimen_tank_console' },
        coverZones: [{ x: 4, y: 3, w: 2, h: 2 }, { x: 11, y: 3, w: 2, h: 2 }],
        encounterZones: [{ id: 'spore_ambush', x: 6, y: 2, w: 5, h: 4 }],
        rewardAnchors: [{ id: 'cloister_cache', type: 'prop_bunker_supplies', x: 8, y: 3 }],
        loreAnchors: [{ id: 'incubation_log', type: 'lore_terminal', x: 2, y: 5 }],
        hazardZones: [{ id: 'spore_field', x: 5, y: 4, w: 7, h: 3 }],
        quietZones: [],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 16, maxY: 10 },
        presentationVariants: ['incubating', 'ruptured', 'purged'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: [], forbids: ['camp'] },
        contentBudget: { structuralLarge: 2, activityZones: 1, pickupsMin: 1, enemiesMax: 4 }
    }),

    // Blueprint 4: Sub-Deck Cryogenic Heat Exchanger (17 x 13) - Dense Machine Room
    Object.freeze({
        id: 'room_subdeck_cryo_exchanger',
        family: 'engineering',
        themeStyle: 'cryo_deck',
        pattern: buildPattern(17, 13, [
            { x: 3, y: 3, w: 3, h: 2 },
            { x: 11, y: 3, w: 3, h: 2 },
            { x: 3, y: 8, w: 3, h: 2 },
            { x: 11, y: 8, w: 3, h: 2 }
        ]),
        sockets: [
            { id: 'entry', side: 'w', width: 3, required: true },
            { id: 'exit', side: 'e', width: 3, required: false }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [2, 3, 4],
        biomeEligibility: ['cryo', 'active'],
        roles: ['objective', 'questDestination'],
        structuralAnchors: [
            { id: 'cryo_manifold_north', type: 'prop_oxygen_bottle_cascade_rack', x: 4, y: 3 },
            { id: 'cryo_manifold_south', type: 'prop_oxygen_bottle_cascade_rack', x: 12, y: 8 }
        ],
        interactionAnchors: [
            { id: 'cryo_bleed_valve', type: 'prop_valve_wheel_fused', x: 8, y: 6 }
        ],
        compassAnchors: { approach: 'entry', objective: 'cryo_bleed_valve' },
        coverZones: [{ x: 3, y: 3, w: 3, h: 2 }, { x: 11, y: 3, w: 3, h: 2 }],
        encounterZones: [{ id: 'exchanger_patrol', x: 7, y: 3, w: 3, h: 7 }],
        rewardAnchors: [{ id: 'coolant_drum_cache', type: 'prop_coolant_drum_leaking_pool', x: 8, y: 2 }],
        loreAnchors: [{ id: 'cryo_shift_log', type: 'lore_terminal', x: 2, y: 2 }],
        hazardZones: [{ id: 'frost_coolant_pool', x: 6, y: 5, w: 5, h: 3 }],
        quietZones: [],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 16, maxY: 12 },
        presentationVariants: ['chilled', 'leaking_cryo', 'restored'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['pressure_corridor'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 2, activityZones: 1, pickupsMin: 1, enemiesMax: 3 }
    }),

    // Blueprint 5: Sacramental Cyber-Surgical Ward (19 x 11) - Dual-Bay Medical Ward
    Object.freeze({
        id: 'room_cyber_surgical_fabrication_ward',
        family: 'medical',
        themeStyle: 'giger',
        pattern: buildPattern(19, 11, [
            // Dividing wall between Bay A and Bay B with open center threshold and approach
            { x: 9, y: 1, w: 1, h: 3 },
            { x: 9, y: 5, w: 1, h: 2 }
        ]),
        sockets: [
            { id: 'entry', side: 's', width: 3, required: true }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [1, 2, 3, 4],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: ['support', 'questDestination'],
        structuralAnchors: [
            { id: 'bay_divider_north', type: 'prop_vital_monitor', x: 9, y: 2 },
            { id: 'bay_divider_south', type: 'prop_vital_monitor', x: 9, y: 6 }
        ],
        interactionAnchors: [
            { id: 'surgical_slab_controls', type: 'prop_medical_bed', x: 5, y: 5 },
            { id: 'fabricator_ward_terminal', type: 'prop_fabricator_workstation', x: 14, y: 5 }
        ],
        compassAnchors: { approach: 'entry', objective: 'surgical_slab_controls' },
        coverZones: [{ x: 8, y: 1, w: 3, h: 9 }],
        encounterZones: [],
        rewardAnchors: [{ id: 'surgical_supplies', type: 'prop_bunker_supplies', x: 2, y: 2 }],
        loreAnchors: [{ id: 'surgical_triage_log', type: 'lore_terminal', x: 16, y: 2 }],
        hazardZones: [],
        quietZones: [{ x: 0, y: 0, w: 19, h: 11 }],
        safeZone: true,
        containmentBounds: { minX: 0, minY: 0, maxX: 18, maxY: 10 },
        presentationVariants: ['sterile', 'field_dressing', 'abandoned'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['service_passage'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 2, activityZones: 2, pickupsMin: 1, enemiesMax: 1 }
    }),

    // Blueprint 6: Deep-Space Astrogation Apse (17 x 11) - Tiered Amphitheater Command Deck
    Object.freeze({
        id: 'room_deep_space_astrogation_apse',
        family: 'security',
        themeStyle: 'cathedral',
        pattern: buildPattern(17, 11, [
            // North apse curve chamfers
            { x: 0, y: 0, w: 3, h: 2 },
            { x: 14, y: 0, w: 3, h: 2 },
            // Console barrier arcs
            { x: 4, y: 4, w: 2, h: 3 },
            { x: 11, y: 4, w: 2, h: 3 }
        ]),
        sockets: [
            { id: 'entry', side: 's', width: 3, required: true }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [2, 3, 4],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: ['objective', 'defense'],
        structuralAnchors: [
            { id: 'console_barrier_west', type: 'prop_cyber_junction', x: 4, y: 5 },
            { id: 'console_barrier_east', type: 'prop_cyber_junction', x: 11, y: 5 }
        ],
        interactionAnchors: [
            { id: 'astrogation_radar_table', type: 'prop_diagnostic_console', x: 8, y: 5 }
        ],
        compassAnchors: { approach: 'entry', objective: 'astrogation_radar_table' },
        coverZones: [{ x: 4, y: 4, w: 2, h: 3 }, { x: 11, y: 4, w: 2, h: 3 }],
        encounterZones: [{ id: 'apse_defenders', x: 5, y: 2, w: 7, h: 3 }],
        rewardAnchors: [{ id: 'astrogation_charts', type: 'prop_ammo_crate_stack', x: 8, y: 2 }],
        loreAnchors: [{ id: 'star_log_terminal', type: 'lore_terminal', x: 3, y: 2 }],
        hazardZones: [],
        quietZones: [],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 16, maxY: 10 },
        presentationVariants: ['calibrated', 'drifting', 'blackout'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['defensive_approach'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 2, activityZones: 1, pickupsMin: 1, enemiesMax: 4 }
    }),

    // Blueprint 7: Stasis Chrysalis Sepulcher (15 x 9) - Catacomb Niche Corridor
    Object.freeze({
        id: 'room_stasis_bunk_sepulcher',
        family: 'fabricator',
        themeStyle: 'giger',
        pattern: buildPattern(15, 9, [
            // Pod divider buttresses along north and south walls
            { x: 4, y: 1, w: 2, h: 1 },
            { x: 9, y: 1, w: 2, h: 1 },
            { x: 4, y: 7, w: 2, h: 1 },
            { x: 9, y: 7, w: 2, h: 1 }
        ]),
        sockets: [
            { id: 'entry', side: 'w', width: 3, required: true },
            { id: 'exit', side: 'e', width: 3, required: false }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [1, 2, 3, 4],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: ['support', 'questDestination'],
        structuralAnchors: [
            { id: 'stasis_rack_north', type: 'prop_exosuit_docking_gantry', x: 4, y: 1 },
            { id: 'stasis_rack_south', type: 'prop_exosuit_docking_gantry', x: 9, y: 7 }
        ],
        interactionAnchors: [
            { id: 'chrysalis_pod_console', type: 'prop_liturgical_terminal_lectern', x: 7, y: 4 }
        ],
        compassAnchors: { approach: 'entry', objective: 'chrysalis_pod_console' },
        coverZones: [{ x: 3, y: 1, w: 4, h: 2 }, { x: 8, y: 6, w: 4, h: 2 }],
        encounterZones: [],
        rewardAnchors: [{ id: 'scavenged_ration_cache', type: 'prop_bunker_supplies', x: 12, y: 4 }],
        loreAnchors: [{ id: 'sepulcher_survivor_slate', type: 'lore_terminal', x: 2, y: 2 }],
        hazardZones: [],
        quietZones: [{ x: 0, y: 0, w: 15, h: 9 }],
        safeZone: true,
        containmentBounds: { minX: 0, minY: 0, maxX: 14, maxY: 8 },
        presentationVariants: ['huddled', 'abandoned', 'dormant'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['service_passage'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 2, activityZones: 1, pickupsMin: 1, enemiesMax: 1 }
    }),

    // Blueprint 8: Quarantine Airlock Threshold (13 x 9) - Octagonal Decompression Vault
    Object.freeze({
        id: 'room_quarantine_airlock_threshold',
        family: 'puzzle',
        themeStyle: 'bunker',
        pattern: buildPattern(13, 9, [
            // Chamfered 45-degree blast corners
            { x: 0, y: 0, w: 2, h: 2 },
            { x: 11, y: 0, w: 2, h: 2 },
            { x: 0, y: 7, w: 2, h: 2 },
            { x: 11, y: 7, w: 2, h: 2 },
            // Wall jambs
            { x: 3, y: 4, w: 1, h: 1 },
            { x: 9, y: 4, w: 1, h: 1 }
        ]),
        sockets: [
            { id: 'entry', side: 's', width: 3, required: true },
            { id: 'exit', side: 'n', width: 3, required: false }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [1, 2, 3, 4],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: ['challenge', 'questDestination'],
        structuralAnchors: [
            { id: 'decon_station_west', type: 'prop_decon_eyewash_shower_station', x: 3, y: 4 },
            { id: 'decon_station_east', type: 'prop_decon_eyewash_shower_station', x: 9, y: 4 }
        ],
        interactionAnchors: [
            { id: 'airlock_purge_override', type: 'prop_pipe_organ_heat_exchanger', x: 6, y: 4 }
        ],
        compassAnchors: { approach: 'entry', objective: 'airlock_purge_override' },
        coverZones: [{ x: 2, y: 3, w: 3, h: 3 }, { x: 8, y: 3, w: 3, h: 3 }],
        encounterZones: [],
        rewardAnchors: [{ id: 'emergency_o2_pack', type: 'prop_oxygen_bottle_cascade_rack', x: 6, y: 2 }],
        loreAnchors: [],
        hazardZones: [{ id: 'decon_purge_plume', x: 4, y: 3, w: 5, h: 3 }],
        quietZones: [{ x: 0, y: 0, w: 13, h: 9 }],
        safeZone: true,
        containmentBounds: { minX: 0, minY: 0, maxX: 12, maxY: 8 },
        presentationVariants: ['pressurized', 'purging', 'sealed'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['pressure_corridor'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 2, activityZones: 1, pickupsMin: 1, enemiesMax: 0 }
    })
]);
