// Achievement cosmetics are kept separate from the generated Steam catalog so
// local unlock logic can remain honest while source art is still in production.
export const ACHIEVEMENT_COSMETICS = Object.freeze([
    ['5001', 'Ghost Runner Recon Rig', 'ghost', 'scout', 'chassis', 'legendary', 'pending'],
    ['5002', 'Chrono-Drifter Talon-C', 'quick_study', 'scout', 'weapon', 'epic', 'pending'],
    ['5003', 'Subterranean Cartographer Suit', 'cartographer', 'scout', 'chassis', 'epic', 'ready'],
    ['5004', 'Pioneer Courier Scout Frame', 'reyes_courier', 'scout', 'chassis', 'rare', 'ready'],
    ['5005', 'Old Iron Dreadnought Chassis', 'hardened', 'tank', 'chassis', 'rare', 'ready'],
    ['5006', 'Bunker Bastion Siege-Breaker', 'hunkered', 'tank', 'weapon', 'epic', 'pending'],
    ['5007', 'Colossus of the Hive Carapace', 'ending_full_brood', 'tank', 'chassis', 'legendary', 'ready'],
    ['5008', 'Gentle Titan Hazard Frame', 'gentle_drill', 'tank', 'chassis', 'epic', 'ready'],
    ['5009', 'Archival Constructor Arc Driver', 'archivist', 'engineer', 'weapon', 'legendary', 'pending'],
    ['5010', 'Hive-Weaver Bio-Plasma Emitter', 'kin', 'engineer', 'weapon', 'legendary', 'pending'],
    ['5011', "Chen's Undying Prototype Rig", 'chen_thirteenth', 'engineer', 'chassis', 'legendary', 'ready'],
    ['5012', 'Exodus Vanguard Engineer Suit', 'ending_alien_exodus', 'engineer', 'chassis', 'legendary', 'ready']
].map(([itemdefid, name, achievementKey, classId, slot, rarity, modelStatus]) => Object.freeze({
    itemdefid, name, achievementKey, classId, slot, rarity, modelStatus,
    desc: `Achievement reward: ${achievementKey}. 3D model status: ${modelStatus}.`
})));

export const ACHIEVEMENT_COSMETIC_BY_KEY = Object.freeze(
    Object.fromEntries(ACHIEVEMENT_COSMETICS.map((item) => [item.achievementKey, item]))
);
