// ── In-Run Roguelike Drops & Overclock System ──────────────────────────────
// Manages randomized mid-run loot drops (Weapon Overclocks & Suit Relics)
// and calculates elemental synergies (Cryo, Bio, Tesla) per playthrough.

export const DROP_TYPES = Object.freeze({
    OVERCLOCK: 'overclock',
    RELIC: 'relic'
});

export const DROP_RARITIES = Object.freeze({
    COMMON: 'common',
    RARE: 'rare',
    MYTHIC: 'mythic',
    CORRUPTED: 'corrupted'
});

export const WEAPON_OVERCLOCKS = Object.freeze([
    {
        id: 'split_shot',
        type: DROP_TYPES.OVERCLOCK,
        name: 'Split-Shot Core',
        rarity: DROP_RARITIES.COMMON,
        description: 'Splits main weapon salvo into a 3-bullet fan spread.',
        stats: { extraBullets: 2, spreadAngle: 0.22, damageMult: 0.75 }
    },
    {
        id: 'cryo_rime',
        type: DROP_TYPES.OVERCLOCK,
        name: 'Cryo Rime Injector',
        rarity: DROP_RARITIES.RARE,
        description: 'Shots freeze enemies and slow their movement speed.',
        element: 'cryo',
        stats: { slowDuration: 2.5, slowMult: 0.5 }
    },
    {
        id: 'plasma_bounce',
        type: DROP_TYPES.OVERCLOCK,
        name: 'Plasma Arc Coils',
        rarity: DROP_RARITIES.RARE,
        description: 'Shots bounce off metallic walls towards nearby hostiles.',
        element: 'tesla',
        stats: { maxBounces: 2 }
    },
    {
        id: 'caustic_payload',
        type: DROP_TYPES.OVERCLOCK,
        name: 'Caustic Spore Payload',
        rarity: DROP_RARITIES.MYTHIC,
        description: 'Shots cause bio-corrosion that ticks damage over time.',
        element: 'bio',
        stats: { poisonDuration: 3.0, tickDamage: 2 }
    },
    {
        id: 'glass_cannon_core',
        type: DROP_TYPES.OVERCLOCK,
        name: 'Corrupted Overcharge',
        rarity: DROP_RARITIES.CORRUPTED,
        description: '+100% Weapon Damage, but increases incoming damage by 50%.',
        stats: { damageMult: 2.0, takenDamageMult: 1.5 }
    }
]);

export const SUIT_RELICS = Object.freeze([
    {
        id: 'shatter_engine',
        type: DROP_TYPES.RELIC,
        name: 'Shatter Engine',
        rarity: DROP_RARITIES.RARE,
        description: 'Defeating frozen hostiles triggers an ice shrapnel nova.',
        element: 'cryo'
    },
    {
        id: 'bio_vampirism',
        type: DROP_TYPES.RELIC,
        name: 'Bio-Vampiric Membrane',
        rarity: DROP_RARITIES.MYTHIC,
        description: 'Slaying bio enemies restores O2 vitals and suit battery.',
        element: 'bio'
    },
    {
        id: 'tesla_thrusters',
        type: DROP_TYPES.RELIC,
        name: 'Tesla Dash Coils',
        rarity: DROP_RARITIES.RARE,
        description: 'Thruster dash leaves behind an electrified arc fence.',
        element: 'tesla'
    },
    {
        id: 'pheromone_aura',
        type: DROP_TYPES.RELIC,
        name: 'Hive Pheromone Aura',
        rarity: DROP_RARITIES.MYTHIC,
        description: 'Pacifies wild snails and converts nearby crawlers into bio-allies.',
        element: 'bio'
    },
    {
        id: 'chitin_membrane',
        type: DROP_TYPES.RELIC,
        name: 'Carapace Membrane',
        rarity: DROP_RARITIES.RARE,
        description: 'Grants +30% armor damage reduction when standing in bio-slime terrain.',
        element: 'bio'
    },
    {
        id: 'synapse_pulse',
        type: DROP_TYPES.RELIC,
        name: 'Synapse Dash Pulse',
        rarity: DROP_RARITIES.RARE,
        description: 'Thruster dash emits a bio-pulse that stuns nearby hostiles for 2s.',
        element: 'tesla'
    }
]);

export function rollEnemyLootDrop(random, { isElite = false, isBoss = false } = {}) {
    const chance = isBoss ? 1.0 : (isElite ? 0.65 : 0.12);
    if (random() > chance) return null;

    const rarityRoll = random();
    let rarity = DROP_RARITIES.COMMON;
    if (isBoss) {
        rarity = rarityRoll < 0.4 ? DROP_RARITIES.CORRUPTED : DROP_RARITIES.MYTHIC;
    } else if (isElite) {
        rarity = rarityRoll < 0.2 ? DROP_RARITIES.MYTHIC : (rarityRoll < 0.6 ? DROP_RARITIES.RARE : DROP_RARITIES.COMMON);
    } else {
        rarity = rarityRoll < 0.1 ? DROP_RARITIES.RARE : DROP_RARITIES.COMMON;
    }

    const pool = [...WEAPON_OVERCLOCKS, ...SUIT_RELICS].filter((item) => item.rarity === rarity);
    if (!pool.length) return WEAPON_OVERCLOCKS[0];
    return pool[Math.floor(random() * pool.length)];
}

export function computeActiveSynergies(equippedItems = []) {
    const elements = new Set(equippedItems.map((item) => item.element).filter(Boolean));
    const synergies = [];
    if (elements.has('cryo') && elements.has('tesla')) {
        synergies.push({
            id: 'superconductor',
            name: 'Superconductor Arc',
            description: 'Shock damage shatters frozen targets for 2x damage.'
        });
    }
    if (elements.has('bio') && elements.has('cryo')) {
        synergies.push({
            id: 'frost_spore',
            name: 'Frost Spore Cloud',
            description: 'Caustic spores slow hostiles and trail freezing mist.'
        });
    }
    return synergies;
}
