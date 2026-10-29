/**
 * Chitin scuttler (AAA plan §6.2): the first expansion archetype built end
 * to end. A swarmer: a smaller, amber, twitchier crawler that hunts in packs
 * of up to three in deep (tier 2+) chambers outside the bio biome, where the
 * lone crawler already lives. It runs the crawler AI (ThreeGame.isCrawler)
 * with its own tuning, and reuses the crawler's sprite and parasite model at
 * its own size and tint.
 *
 * Packs are planned from a per-chunk hash, not the chunk's seeded scatter
 * stream: drawing from that stream would reshuffle every later placement in
 * every chunk (solo and co-op alike).
 */

export const CHITIN_SCUTTLER = Object.freeze({
    type: 'chitin_scuttler',
    maxHp: 1,
    tint: 0xffb347,
    spriteScale: 0.55,        // vs the crawler's 0.72
    detectRadius: 6.0,        // crawler 7.0
    // A point-blank pack of three killed a standing 3-HP operator in 2.5 s
    // at 0.18 / 0.9 (2026-10-17 run); these leave a beat to shoot first.
    windup: 0.28,             // crawler 0.35
    packWindupStagger: 0.22,  // followers telegraph in sequence, not one alpha strike
    chargeSpeed: 9.0,         // crawler 7.0
    chargeMaxDuration: 0.7,   // crawler 1.0
    attackCooldown: 1.2,      // crawler 1.5
    minDepthTier: 2,
    minDistFromSpawn: 24,
    packChance: 0.3,          // per eligible chunk
    packSize: 3,
    packRadius: 5
});

export function scuttlerTuning(packIndex = 0) {
    const { detectRadius, windup, packWindupStagger, chargeSpeed, chargeMaxDuration, attackCooldown } = CHITIN_SCUTTLER;
    const safeIndex = Number.isInteger(packIndex) ? Math.max(0, Math.min(CHITIN_SCUTTLER.packSize - 1, packIndex)) : 0;
    return {
        detectRadius,
        windup: windup + safeIndex * packWindupStagger,
        chargeSpeed,
        chargeMaxDuration,
        attackCooldown
    };
}

// Deterministic [0, 1) from a seed and a salt (splitmix-style mixing).
function hash01(seed, salt) {
    let h = (Math.imul((seed >>> 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt + 1, 0xc2b2ae35)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * @param {object} args
 * @param {number} args.seed - per-chunk seed (chunk coords mixed with run entropy)
 * @param {number} args.depthTier
 * @param {boolean} args.biomeHasCrawlers - the bio biome keeps its lone crawler
 * @param {{x:number,z:number}[]} args.candidates - walkable chamber floor points
 * @returns {{x:number,z:number}[]} pack positions, leader first; [] for none
 */
export function planScuttlerPack({ seed = 0, depthTier = 0, biomeHasCrawlers = false, candidates = [] } = {}) {
    if (depthTier < CHITIN_SCUTTLER.minDepthTier || biomeHasCrawlers || candidates.length < 2) return [];
    if (hash01(seed, 1) >= CHITIN_SCUTTLER.packChance) return [];
    const leader = candidates[Math.floor(hash01(seed, 2) * candidates.length)];
    const mates = candidates
        .filter((point) => point !== leader)
        .map((point) => ({ point, distance: Math.hypot(point.x - leader.x, point.z - leader.z) }))
        .filter((entry) => entry.distance > 0.6 && entry.distance <= CHITIN_SCUTTLER.packRadius)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, CHITIN_SCUTTLER.packSize - 1)
        .map((entry) => entry.point);
    if (!mates.length) return [];
    return [leader, ...mates].map((point, packIndex) => ({ x: point.x, z: point.z, packIndex }));
}
