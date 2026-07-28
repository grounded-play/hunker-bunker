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
        largeProps: ['prop_cyber_junction', 'prop_conduit_hub'],
        smallProps: ['scatter_cable_coil', 'scatter_bolts'],
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
        signatureProps: ['prop_fusion_generator', 'prop_conduit_hub'],
        largeProps: ['prop_engineering_bench', 'prop_cyber_junction'],
        smallProps: ['scatter_cable_coil', 'scatter_bolts'],
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
        signatureProps: ['prop_medical_bed', 'prop_diagnostic_console'],
        largeProps: ['prop_surgical_cart', 'prop_specimen_tank', 'prop_broken_specimen_tank'],
        smallProps: ['scatter_bolts'],
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
        signatureProps: ['prop_security_locker'],
        largeProps: ['prop_security_barricade', 'prop_cyber_junction'],
        smallProps: ['scatter_bolts'],
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
        smallProps: ['scatter_cryo_shards', 'scatter_cryo_icicle'],
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
        signatureProps: ['prop_cryo_sleep_pod'],
        largeProps: ['prop_diagnostic_console', 'prop_broken_specimen_tank'],
        smallProps: ['scatter_cryo_shards'],
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
        signatureProps: ['prop_ruptured_coolant_pump', 'prop_fusion_generator'],
        largeProps: ['prop_engineering_bench', 'prop_cyber_junction'],
        smallProps: ['scatter_cryo_shards', 'scatter_coolant_puddle'],
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
        signatureProps: ['prop_alien_respiratory_vent', 'prop_spore_colony'],
        largeProps: ['prop_alien_feeding_basin', 'prop_hive_resin_sac'],
        smallProps: ['prop_cave_spores', 'prop_cave_webs'],
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
        signatureProps: ['prop_alien_feeding_basin', 'prop_cave_eggs_intact'],
        largeProps: ['prop_alien_respiratory_vent', 'prop_hive_resin_sac', 'prop_cave_hive_wounded'],
        smallProps: ['prop_cave_eggs_hatched', 'prop_cave_webs'],
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
        signatureProps: ['prop_engineering_bench'],
        largeProps: ['prop_fusion_generator', 'prop_conduit_hub'],
        smallProps: ['scatter_cable_coil', 'scatter_bolts'],
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
        signatureProps: ['prop_security_locker'],
        largeProps: ['prop_security_barricade'],
        smallProps: ['scatter_bolts'],
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
        signatureProps: ['prop_cryo_sleep_pod'],
        largeProps: ['prop_medical_bed', 'prop_diagnostic_console'],
        smallProps: ['scatter_cryo_shards', 'scatter_coolant_puddle'],
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
        signatureProps: ['prop_alien_feeding_basin'],
        largeProps: ['prop_alien_respiratory_vent', 'prop_hive_resin_sac'],
        smallProps: ['prop_cave_spores', 'prop_cave_webs'],
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
        signatureProps: ['prop_camp_crates'],
        largeProps: ['prop_camp_sandbags'],
        smallProps: ['scatter_cable_coil'],
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
        signatureProps: ['prop_bunker_supplies'],
        largeProps: ['prop_camp_crates'],
        smallProps: ['scatter_bolts'],
        encounterProfile: 'safe'
    }
]);

const ROLE_SEQUENCE = ['generic', 'utility', 'medical', 'security', 'engineering', 'storage', 'reward'];

export function chooseRoomRole(room, { biome = 'active', depthTier = 0, random = () => 0.5 } = {}) {
    const authored = room?.role;
    if (authored && authored !== 'generic') return authored;
    if (biome === 'bio' && depthTier >= 2 && random() < 0.3) return random() < 0.62 ? 'nest' : 'hive';
    if (biome === 'cryo' && depthTier >= 1 && random() < 0.22) return 'cryo-lab';
    if ((room?.doors?.length ?? 0) === 1 && random() < 0.28) return 'reward';
    const maxIndex = Math.min(ROLE_SEQUENCE.length, 3 + Math.max(0, depthTier));
    return ROLE_SEQUENCE[Math.floor(random() * maxIndex)] ?? 'generic';
}

export function chooseRoomTheme(room, { biome = 'active', depthTier = 0, random = () => 0.5 } = {}) {
    const role = chooseRoomRole(room, { biome, depthTier, random });
    let candidates = ROOM_THEME_CATALOG.filter((theme) => (
        theme.biomes.includes(biome) && theme.roles.includes(role)
    ));
    if (candidates.length === 0) {
        candidates = ROOM_THEME_CATALOG.filter((theme) => (
            theme.biomes.includes(biome) && theme.roles.includes('generic')
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

export function assignRoomThemes(rooms, options = {}) {
    return (rooms ?? []).map((room) => {
        const selection = chooseRoomTheme(room, options);
        return {
            ...room,
            role: selection.role,
            theme: selection.theme.id,
            themeConfig: selection.theme
        };
    });
}
