import { mixRunEntropy } from './runEntropy.js';

export const EXPEDITION_CONDITIONS = Object.freeze([
    Object.freeze({
        id: 'glacial_gale',
        name: 'Glacial Gale',
        tagline: 'SUB-ZERO BLIZZARD // CRYO BURSTS',
        description: 'Severe sub-zero squalls. Defeated cryo hostiles detonate in localized frost shockwaves. Ice slicks form in non-bunker corridors.',
        biomeFocus: 'cryo',
        scrapMultiplier: 1.0,
        threatTier: 1,
        weatherVisual: 'blizzard',
        playerEffect: 'ice_skate',
        enemyModifier: 'cryo_death_burst'
    }),
    Object.freeze({
        id: 'spore_bloom',
        name: 'Spore Bloom',
        tagline: 'HIGH TOXIC HUMIDITY // BIO SURGE',
        description: 'Dense spore mist blankets the sector. Bio-snails yield +35% organic salvage; ambient spore clouds drift through unsealed halls.',
        biomeFocus: 'bio',
        scrapMultiplier: 1.35,
        threatTier: 2,
        weatherVisual: 'spore_fog',
        playerEffect: 'poison_resist_drain',
        enemyModifier: 'spore_cloud_trail'
    }),
    Object.freeze({
        id: 'bio_resin_surge',
        name: 'Bio-Resin Surge',
        tagline: 'HIVE HIGH TIDE // RUNNER SWARMS',
        description: 'Accelerated alien incubation. Fast swarmers stalk hive perimeters; bio-nodes yield +50% resin biomass.',
        biomeFocus: 'bio',
        scrapMultiplier: 1.25,
        threatTier: 2,
        weatherVisual: 'resin_mist',
        playerEffect: 'slime_slow',
        enemyModifier: 'swarm_haste'
    }),
    Object.freeze({
        id: 'geothermal_arc',
        name: 'Geothermal Arc',
        tagline: 'GRID OVERLOAD // ELECTRICAL VENTING',
        description: 'Thermal conduits overload and arc across damaged bulkhead walls. Scrap and component salvage increased by +50%.',
        biomeFocus: 'active',
        scrapMultiplier: 1.5,
        threatTier: 3,
        weatherVisual: 'arc_flicker',
        playerEffect: 'shield_surge',
        enemyModifier: 'shock_retaliation'
    }),
    Object.freeze({
        id: 'subzero_stillness',
        name: 'Sub-Zero Stillness',
        tagline: 'EERIE SILENCE // ELITE STALKERS',
        description: 'Deadly stillness settling over the sector. Low standard patrol density, but aggressive mutated elite variants stalk the routes.',
        biomeFocus: 'all',
        scrapMultiplier: 1.15,
        threatTier: 3,
        weatherVisual: 'clear_frost',
        playerEffect: 'stealth_bonus',
        enemyModifier: 'elite_density'
    })
]);

export const EXPEDITION_BOUNTIES = Object.freeze([
    Object.freeze({ id: 'salvage_run', label: 'Extract 120+ Scrap from Deep Corridors', rewardBonus: 60 }),
    Object.freeze({ id: 'eliminate_elite', label: 'Eliminate a Mutated Sector Stalker', rewardBonus: 80 }),
    Object.freeze({ id: 'scout_compound', label: 'Infiltrate and Map an Outlying Compound', rewardBonus: 75 }),
    Object.freeze({ id: 'clearing_breach', label: 'Smash 6 Structural Wall Dividers', rewardBonus: 50 })
]);

export function deriveExpeditionSeed(campaignSeed, expeditionIndex = 0) {
    return mixRunEntropy(campaignSeed, 0x45585044, (expeditionIndex >>> 0) + 1);
}

export function createExpeditionProfile(campaignSeed, expeditionIndex = 0) {
    const normIndex = Math.max(0, Math.floor(Number(expeditionIndex) || 0));
    const seed = deriveExpeditionSeed(Number(campaignSeed) >>> 0, normIndex);
    
    // Deterministic selection based on expedition seed
    const conditionIndex = ((seed ^ 0xa5a5a5a5) >>> 0) % EXPEDITION_CONDITIONS.length;
    const condition = EXPEDITION_CONDITIONS[conditionIndex];
    
    const bountyIndex = ((seed ^ 0x5b5b5b5b) >>> 0) % EXPEDITION_BOUNTIES.length;
    const bounty = EXPEDITION_BOUNTIES[bountyIndex];

    const threatIndex = Math.min(5, 1 + Math.floor(normIndex / 3));

    // Dynamic obstacle roll: determines which corridor gates/rockfalls are active this deployment
    const obstacleKey = ((seed >>> 16) ^ 0x7c7c) % 4;

    return {
        expeditionIndex: normIndex,
        expeditionSeed: seed,
        campaignSeed: Number(campaignSeed) >>> 0,
        condition,
        bounty,
        threatIndex,
        obstacleKey,
        title: `EXPEDITION ${normIndex + 1} — ${condition.name.toUpperCase()}`,
        briefing: `${condition.tagline} · THREAT LEVEL ${threatIndex}`
    };
}
