export const HUMAN_ARCHETYPES = Object.freeze({
    engineer: Object.freeze({
        displayName: 'Engineer',
        loot: Object.freeze({ tech: 3, coin: 1, med: 0 }),
        hostConversion: 'tech_drone'
    }),
    soldier: Object.freeze({
        displayName: 'Soldier',
        loot: Object.freeze({ tech: 1, coin: 2, med: 1 }),
        hostConversion: 'warrior_drone'
    }),
    medic: Object.freeze({
        displayName: 'Medic',
        loot: Object.freeze({ tech: 1, coin: 1, med: 3 }),
        hostConversion: 'brood_nurse'
    }),
    scout: Object.freeze({
        displayName: 'Scout',
        loot: Object.freeze({ tech: 1, coin: 3, med: 0 }),
        hostConversion: 'stalker_drone'
    }),
    miner: Object.freeze({
        displayName: 'Miner',
        loot: Object.freeze({ tech: 2, coin: 1, med: 1 }),
        hostConversion: 'burrower_drone'
    }),
    commander: Object.freeze({
        displayName: 'Commander',
        loot: Object.freeze({ tech: 2, coin: 4, med: 1 }),
        hostConversion: 'signal_queen'
    })
});

export function getHumanArchetype(id) {
    return HUMAN_ARCHETYPES[id] ?? HUMAN_ARCHETYPES.scout;
}
