/**
 * Spore Mortar (AAA plan §6.2 archetype 2): bio-artillery stationary sentry.
 * Anchors in deep (tier 2+) chambers in the bio biome. Instead of chasing the
 * player like snails or chargers, it locks in place, winds up with a swelling
 * spore charge and acoustic telegraph, and lobs high-arching biological shells
 * over obstacles and walls that detonate into toxic spore puddles.
 *
 * Forces players out of static cover and denies camping.
 */

export const SPORE_MORTAR = Object.freeze({
    type: 'spore_mortar',
    maxHp: 6,
    speed: 0.0,
    minRange: 3.5,            // minimum arming distance (cannot mortar its own roots)
    maxRange: 18.0,           // long-range artillery threat
    chargeDuration: 0.75,     // telegraph duration with audible hiss and swelling scale
    cooldown: 3.6,            // reload cycle between volleys
    lobDuration: 1.15,        // ballistic airtime for projectile arc
    explosionRadius: 1.8,     // blast area
    directDamage: 2,          // direct hit damage
    minDepthTier: 2,
    spawnChance: 0.25,        // chance per eligible deep bio chunk
    tint: 0x88e066
});

export function sporeMortarTuning() {
    const { minRange, maxRange, chargeDuration, cooldown, lobDuration, explosionRadius, directDamage } = SPORE_MORTAR;
    return { minRange, maxRange, chargeDuration, cooldown, lobDuration, explosionRadius, directDamage };
}

// Splitmix deterministic hash in [0, 1)
function hash01(seed, salt) {
    let h = (Math.imul((seed >>> 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt + 1, 0xc2b2ae35)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Plans stationary spore mortar positions for a chunk.
 * Only spawns in deep tier 2+ chambers in bio biomes.
 *
 * @param {object} args
 * @param {number} args.seed - per-chunk seed
 * @param {number} args.depthTier
 * @param {string} args.biomeKey - current chunk biome
 * @param {{x:number,z:number}[]} args.candidates - walkable chamber floor points
 * @returns {{x:number,z:number}[]} placement positions (0 or 1)
 */
export function planSporeMortarPlacements({ seed = 0, depthTier = 0, biomeKey = 'active', candidates = [] } = {}) {
    if (depthTier < SPORE_MORTAR.minDepthTier || biomeKey !== 'bio' || candidates.length < 4) return [];
    if (hash01(seed, 101) >= SPORE_MORTAR.spawnChance) return [];

    // Pick an interior candidate floor point
    const index = Math.floor(hash01(seed, 102) * candidates.length);
    const chosen = candidates[index];
    if (!chosen) return [];
    return [{ x: chosen.x, z: chosen.z }];
}
