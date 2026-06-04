export const RUN_MODIFIERS = Object.freeze([
    Object.freeze({
        id: 'rolling_blackout',
        title: 'ROLLING BLACKOUT',
        description: 'Lighting faults pulse through the bunker. Visibility drops in short waves.',
        weight: 2
    }),
    Object.freeze({
        id: 'thin_air',
        title: 'THIN AIR',
        description: 'Atmospheric reserves are poor. O2 drains slightly faster beyond the ship field.',
        weight: 2
    }),
    Object.freeze({
        id: 'patrol_surge',
        title: 'PATROL SURGE',
        description: 'Hostile patrol routing is elevated near terminals and high-value salvage.',
        weight: 2
    }),
    Object.freeze({
        id: 'bad_map_data',
        title: 'BAD MAP DATA',
        description: 'Compass telemetry jitters after long-range scans.',
        weight: 1
    }),
    Object.freeze({
        id: 'unstable_doors',
        title: 'UNSTABLE DOORS',
        description: 'Old pressure seals slam and echo. Expect false movement pings.',
        weight: 1
    })
]);

export function getRunModifierById(id) {
    return RUN_MODIFIERS.find((modifier) => modifier.id === id) ?? null;
}

export function pickRunModifier(random = Math.random) {
    const total = RUN_MODIFIERS.reduce((sum, modifier) => sum + (modifier.weight ?? 1), 0);
    let roll = random() * total;
    for (const modifier of RUN_MODIFIERS) {
        const weight = modifier.weight ?? 1;
        if (roll < weight) return modifier;
        roll -= weight;
    }
    return RUN_MODIFIERS[RUN_MODIFIERS.length - 1] ?? null;
}
