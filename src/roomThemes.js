export const LIVED_IN_DECALS = Object.freeze({
    bunker: Object.freeze([
        'decal_abandoned_meal_tray', 'decal_emergency_oxygen_nest',
        'decal_maintenance_shrine', 'decal_failed_decon_kit',
        'decal_barricade_last_stand', 'decal_childlike_cave_map',
        'decal_bio_sample_spill', 'decal_worker_sleep_roll'
    ]),
    cryo: Object.freeze([
        'decal_emergency_oxygen_nest', 'decal_failed_decon_kit',
        'decal_barricade_last_stand', 'decal_childlike_cave_map',
        'decal_worker_sleep_roll', 'decal_abandoned_meal_tray'
    ]),
    bio: Object.freeze([
        'decal_maintenance_shrine', 'decal_childlike_cave_map',
        'decal_bio_sample_spill', 'decal_worker_sleep_roll',
        'decal_abandoned_meal_tray'
    ]),
    camp: Object.freeze([
        'decal_abandoned_meal_tray', 'decal_emergency_oxygen_nest',
        'decal_maintenance_shrine', 'decal_barricade_last_stand',
        'decal_childlike_cave_map', 'decal_worker_sleep_roll'
    ])
});

export const ROOM_THEME_CATALOG = Object.freeze([
    {
        id: 'bunker-standard',
        biomes: ['active'],
        roles: ['generic'],
        weight: 1,
        wallStyle: 'bunker-standard',
        floorStyle: 'bunker-standard',
        doorStyle: 'bunker',
        signatureProps: ['prop_bunker_supplies'],
        largeProps: ['prop_cyber_junction', 'prop_conduit_hub', 'decal_wall_breach', 'decal_meridian_stencil'],
        smallProps: ['scatter_cable_coil', 'scatter_bolts', 'prop_torn_warning_poster', 'decal_bullet_holes', 'prop_blood_trail', 'decal_hazard_stripes', 'decal_footprints_mud'],
        ambientProps: LIVED_IN_DECALS.bunker,
        encounterProfile: 'standard'
    },
    {
        id: 'bunker-utility',
        biomes: ['active'],
        roles: ['utility', 'engineering'],
        weight: 1.2,
        wallStyle: 'bunker-utility',
        floorStyle: 'bunker-utility',
        doorStyle: 'utility',
        signatureProps: ['prop_fusion_generator', 'prop_conduit_hub', 'prop_fabricator_workstation', 'prop_o2_filter_vat'],
        largeProps: ['prop_engineering_bench', 'prop_cyber_junction', 'prop_tesla_coil_node', 'decal_wall_breach'],
        smallProps: ['scatter_cable_coil', 'scatter_bolts', 'prop_torn_warning_poster', 'scatter_biomech_debris', 'scatter_broken_drone', 'decal_oil_spill_patch', 'decal_hazard_stripes'],
        ambientProps: LIVED_IN_DECALS.bunker,
        rareProps: ['scatter_horizon_black_box', 'decal_machine_cult_shrine'],
        encounterProfile: 'utility'
    },
    {
        id: 'bunker-medical',
        biomes: ['active'],
        roles: ['medical'],
        weight: 1,
        wallStyle: 'bunker-medical',
        floorStyle: 'bunker-medical',
        doorStyle: 'medical-seal',
        signatureProps: ['prop_medical_bed', 'prop_diagnostic_console', 'prop_vital_monitor'],
        largeProps: ['prop_surgical_cart', 'prop_specimen_tank', 'prop_broken_specimen_tank', 'prop_biomech_triage_cradle'],
        smallProps: ['scatter_bolts', 'decal_biohazard_stencil', 'decal_footprints_mud'],
        ambientProps: LIVED_IN_DECALS.bunker,
        encounterProfile: 'sterile'
    },
    {
        id: 'bunker-security',
        biomes: ['active'],
        roles: ['security'],
        weight: 1,
        wallStyle: 'bunker-security',
        floorStyle: 'bunker-security',
        doorStyle: 'security',
        signatureProps: ['prop_security_locker', 'prop_ammo_crate_stack'],
        largeProps: ['prop_security_barricade', 'prop_laser_trap_emitter', 'prop_cyber_junction', 'decal_claw_scratches'],
        smallProps: ['scatter_bolts', 'decal_hazard_stripes', 'decal_bullet_holes'],
        ambientProps: LIVED_IN_DECALS.bunker,
        encounterProfile: 'security'
    },
    {
        id: 'cryo-rough',
        biomes: ['cryo'],
        roles: ['generic', 'storage', 'reward'],
        weight: 1,
        wallStyle: 'cryo-rough',
        floorStyle: 'cryo-rough',
        doorStyle: 'cryo',
        signatureProps: ['prop_cryo_sleep_pod', 'prop_cave_lichen'],
        largeProps: ['prop_ruptured_coolant_pump', 'prop_bunker_supplies'],
        smallProps: ['scatter_cryo_shards', 'scatter_cryo_icicle', 'decal_footprints_mud', 'decal_claw_scratches'],
        ambientProps: LIVED_IN_DECALS.cryo,
        encounterProfile: 'cryo-standard'
    },
    {
        id: 'cryo-medical',
        biomes: ['cryo'],
        roles: ['medical', 'cryo-lab'],
        weight: 1.2,
        wallStyle: 'cryo-clean',
        floorStyle: 'cryo-tile',
        doorStyle: 'medical-seal',
        signatureProps: ['prop_cryo_sleep_pod', 'prop_vital_monitor'],
        largeProps: ['prop_diagnostic_console', 'prop_broken_specimen_tank', 'prop_biomech_triage_cradle'],
        smallProps: ['scatter_cryo_shards', 'decal_biohazard_stencil', 'decal_meridian_stencil'],
        ambientProps: LIVED_IN_DECALS.cryo,
        rareProps: ['decal_pod_312_breach'],
        encounterProfile: 'sterile'
    },
    {
        id: 'cryo-engineering',
        biomes: ['cryo'],
        roles: ['utility', 'engineering', 'security'],
        weight: 1,
        wallStyle: 'cryo-lab',
        floorStyle: 'cryo-tile',
        doorStyle: 'cryo-security',
        signatureProps: ['prop_ruptured_coolant_pump', 'prop_fusion_generator', 'prop_o2_filter_vat'],
        largeProps: ['prop_engineering_bench', 'prop_cyber_junction', 'prop_tesla_coil_node'],
        smallProps: ['scatter_cryo_shards', 'scatter_coolant_puddle', 'decal_oil_spill_patch', 'decal_hazard_stripes'],
        ambientProps: LIVED_IN_DECALS.cryo,
        encounterProfile: 'security'
    },
    {
        id: 'bio-resin',
        biomes: ['bio'],
        roles: ['generic', 'utility', 'storage'],
        weight: 1,
        wallStyle: 'bio-resin',
        floorStyle: 'bio-resin',
        doorStyle: 'resin',
        signatureProps: ['prop_alien_respiratory_vent', 'prop_spore_colony', 'prop_biomech_respirator'],
        largeProps: ['prop_alien_feeding_basin', 'prop_hive_resin_sac', 'prop_biomech_incubator', 'decal_spore_growth_patch'],
        smallProps: ['prop_cave_spores', 'prop_cave_webs', 'decal_tallow_symbol'],
        ambientProps: LIVED_IN_DECALS.bio,
        rareProps: ['decal_tallow_herb_cache'],
        encounterProfile: 'bio-standard'
    },
    {
        id: 'bio-nest',
        biomes: ['bio'],
        roles: ['nest', 'hive'],
        weight: 1.4,
        wallStyle: 'bio-nest',
        floorStyle: 'bio-hive',
        doorStyle: 'hive',
        signatureProps: ['prop_alien_feeding_basin', 'prop_cave_eggs_intact', 'prop_biomech_incubator'],
        largeProps: ['prop_alien_respiratory_vent', 'prop_biomech_sphincter_trap', 'prop_hive_resin_sac', 'prop_cave_hive_wounded', 'decal_hive_growth', 'decal_spore_growth_patch'],
        smallProps: ['prop_cave_eggs_hatched', 'prop_cave_webs', 'scatter_hive_eggs', 'prop_blood_trail', 'decal_claw_scratches'],
        ambientProps: LIVED_IN_DECALS.bio,
        encounterProfile: 'bio-nest-guard'
    },
    {
        id: 'bunker-workshop',
        biomes: ['active'],
        roles: ['engineering'],
        weight: 1.1,
        wallStyle: 'bunker-utility',
        floorStyle: 'bunker-utility',
        doorStyle: 'utility',
        signatureProps: ['prop_engineering_bench', 'prop_fabricator_workstation'],
        largeProps: ['prop_fusion_generator', 'prop_conduit_hub', 'prop_tesla_coil_node'],
        smallProps: ['scatter_cable_coil', 'scatter_bolts', 'decal_oil_spill_patch', 'decal_meridian_stencil'],
        ambientProps: LIVED_IN_DECALS.bunker,
        rareProps: ['decal_machine_cult_shrine'],
        encounterProfile: 'utility'
    },
    {
        id: 'bunker-armory',
        biomes: ['active'],
        roles: ['security'],
        weight: 1,
        wallStyle: 'bunker-security',
        floorStyle: 'bunker-security',
        doorStyle: 'security',
        signatureProps: ['prop_security_locker', 'prop_ammo_crate_stack', 'prop_biomech_flesh_locker'],
        largeProps: ['prop_security_barricade', 'prop_laser_trap_emitter', 'decal_claw_scratches'],
        smallProps: ['scatter_bolts', 'decal_hazard_stripes', 'decal_bullet_holes'],
        ambientProps: LIVED_IN_DECALS.bunker,
        rareProps: ['prop_iron_guild_dogtags'],
        encounterProfile: 'security'
    },
    {
        id: 'cryo-recovery',
        biomes: ['cryo'],
        roles: ['medical', 'cryo-lab'],
        weight: 0.9,
        wallStyle: 'cryo-clean',
        floorStyle: 'cryo-tile',
        doorStyle: 'medical-seal',
        signatureProps: ['prop_cryo_sleep_pod', 'prop_vital_monitor'],
        largeProps: ['prop_medical_bed', 'prop_diagnostic_console', 'prop_biomech_triage_cradle'],
        smallProps: ['scatter_cryo_shards', 'scatter_coolant_puddle', 'decal_biohazard_stencil', 'decal_footprints_mud'],
        ambientProps: LIVED_IN_DECALS.cryo,
        rareProps: ['decal_pod_312_breach'],
        encounterProfile: 'sterile'
    },
    {
        id: 'bio-feeding-chamber',
        biomes: ['bio'],
        roles: ['hive'],
        weight: 1.15,
        wallStyle: 'bio-nest',
        floorStyle: 'bio-hive',
        doorStyle: 'hive',
        signatureProps: ['prop_alien_feeding_basin', 'prop_biomech_sphincter_trap'],
        largeProps: ['prop_alien_respiratory_vent', 'prop_biomech_respirator', 'prop_hive_resin_sac', 'decal_spore_growth_patch'],
        smallProps: ['prop_cave_spores', 'prop_cave_webs', 'decal_tallow_symbol'],
        ambientProps: LIVED_IN_DECALS.bio,
        encounterProfile: 'bio-nest-guard'
    },
    {
        id: 'camp-fortified',
        biomes: ['active', 'cryo', 'bio'],
        roles: ['camp'],
        weight: 1,
        wallStyle: 'camp-fortified',
        floorStyle: 'camp',
        doorStyle: 'camp',
        signatureProps: ['prop_camp_crates', 'prop_camp_cookfire_lit', 'prop_ammo_crate_stack'],
        largeProps: [
            'prop_camp_sandbags', 'scatter_broken_drone', 'prop_camp_cot',
            'prop_camp_crate', 'prop_camp_cookfire_doused'
        ],
        smallProps: [
            'prop_camp_bedrolls', 'scatter_cable_coil', 'scatter_bolts', 'scatter_camp_supplies',
            'prop_blood_trail', 'decal_bullet_holes', 'decal_tallow_symbol',
            'decal_footprints_mud', 'decal_meridian_stencil'
        ],
        ambientProps: LIVED_IN_DECALS.camp,
        rareProps: ['decal_tallow_herb_cache', 'prop_iron_guild_dogtags'],
        encounterProfile: 'safe'
    },
    {
        id: 'reward-cache',
        biomes: ['active', 'cryo', 'bio'],
        roles: ['reward'],
        weight: 0.8,
        wallStyle: 'bunker-storage',
        floorStyle: 'storage',
        doorStyle: 'security',
        signatureProps: ['prop_bunker_supplies', 'prop_ammo_crate_stack'],
        largeProps: ['prop_camp_crates'],
        smallProps: ['scatter_bolts', 'decal_hazard_stripes', 'decal_meridian_stencil'],
        ambientProps: LIVED_IN_DECALS.bunker,
        rareProps: ['scatter_horizon_black_box'],
        encounterProfile: 'safe'
    }
]);

const ROLE_SEQUENCE = ['generic', 'utility', 'medical', 'security', 'engineering', 'storage', 'reward'];

// Lane B room builds expose semantic planning roles (support, objective,
// challenge, ringCrossing) that intentionally do not mirror presentation
// roles. Prefer the authored family, then translate a semantic role, so those
// rooms do not silently fall through to the generic bunker theme.
export const ROOM_FAMILY_THEME_ROLES = Object.freeze({
    medical: 'medical',
    rescue: 'medical',
    armory: 'security',
    security: 'security',
    gate: 'security',
    arena: 'security',
    trap: 'security',
    trap_reward: 'security',
    o2: 'engineering',
    fabricator: 'engineering',
    engineering: 'engineering',
    puzzle: 'engineering',
    objective: 'engineering',
    mission: 'engineering',
    cache: 'reward',
    salvage: 'reward',
    lore: 'reward',
    camp: 'camp',
    hive: 'hive',
    queen: 'hive',
    entry: 'generic',
    connector: 'generic'
});

export const SEMANTIC_ROOM_THEME_ROLES = Object.freeze({
    support: 'utility',
    questDestination: 'utility',
    objective: 'engineering',
    shipGoalObjective: 'engineering',
    challenge: 'security',
    ringCrossing: 'security',
    fallbackResourceRoute: 'engineering'
});

export function chooseRoomRole(room, { biome = 'active', depthTier = 0, random = () => 0.5 } = {}) {
    const familyRole = ROOM_FAMILY_THEME_ROLES[room?.family];
    if (familyRole) return familyRole;
    const authored = SEMANTIC_ROOM_THEME_ROLES[room?.role] ?? room?.role;
    if (authored && authored !== 'generic') return authored;
    if (biome === 'bio' && depthTier >= 2 && random() < 0.3) return random() < 0.62 ? 'nest' : 'hive';
    if (biome === 'cryo' && depthTier >= 1 && random() < 0.22) return 'cryo-lab';
    if ((room?.doors?.length ?? 0) === 1 && random() < 0.28) return 'reward';
    const maxIndex = Math.min(ROLE_SEQUENCE.length, 3 + Math.max(0, depthTier));
    return ROLE_SEQUENCE[Math.floor(random() * maxIndex)] ?? 'generic';
}

export function chooseRoomTheme(room, { biome = 'active', depthTier = 0, random = () => 0.5 } = {}) {
    const normalizedBiome = String(biome).toLowerCase();
    const role = chooseRoomRole(room, { biome: normalizedBiome, depthTier, random });
    let candidates = ROOM_THEME_CATALOG.filter((theme) => (
        theme.biomes.includes(normalizedBiome) && theme.roles.includes(role)
    ));
    if (candidates.length === 0) {
        candidates = ROOM_THEME_CATALOG.filter((theme) => (
            theme.biomes.includes(normalizedBiome) && theme.roles.includes('generic')
        ));
    }
    if (candidates.length === 0) candidates = [ROOM_THEME_CATALOG[0]];
    const total = candidates.reduce((sum, theme) => sum + theme.weight, 0);
    let roll = random() * total;
    let selected = candidates[candidates.length - 1];
    for (const theme of candidates) {
        roll -= theme.weight;
        if (roll <= 0) {
            selected = theme;
            break;
        }
    }
    return { role, theme: selected };
}

export const PRESENTATION_STATE_MODIFIERS = Object.freeze({
    intact: Object.freeze({ propPrefix: '', decal: null }),
    dormant: Object.freeze({ propPrefix: '', decal: null }),
    questActive: Object.freeze({ propPrefix: '', decal: 'decal_hazard_stripes' }),
    resolved: Object.freeze({ propPrefix: '', decal: 'decal_meridian_stencil' }),
    abandoned: Object.freeze({ propPrefix: 'scatter_', decal: 'decal_footprints_mud' }),
    infested: Object.freeze({ propPrefix: 'prop_hive_', decal: 'decal_spore_growth_patch' }),
    looted: Object.freeze({ propPrefix: 'scatter_', decal: 'decal_wall_breach' }),
    wounded: Object.freeze({ propPrefix: 'prop_', decal: 'prop_blood_trail' }),
    bonded: Object.freeze({ propPrefix: 'prop_', decal: 'decal_tallow_herb_cache' }),
    culled: Object.freeze({ propPrefix: 'scatter_', decal: 'decal_barricade_last_stand' }),
    turned: Object.freeze({ propPrefix: 'prop_hive_', decal: 'decal_spore_growth_patch' })
});

export function resolveThemeWithStateVariant(themeConfig, stateVariant = 'intact') {
    if (!themeConfig) return themeConfig;
    const modifier = PRESENTATION_STATE_MODIFIERS[stateVariant] ?? PRESENTATION_STATE_MODIFIERS.intact;
    return {
        ...themeConfig,
        stateVariant,
        appliedDecal: modifier.decal
    };
}

export function assignRoomThemes(rooms, options = {}) {
    const stateVariant = options.stateVariant ?? 'intact';
    return (rooms ?? []).map((room) => {
        const selection = chooseRoomTheme(room, options);
        const resolvedTheme = resolveThemeWithStateVariant(selection.theme, room.stateVariant ?? stateVariant);
        return {
            ...room,
            role: selection.role,
            theme: resolvedTheme.id,
            themeConfig: resolvedTheme
        };
    });
}
