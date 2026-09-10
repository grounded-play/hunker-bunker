// Elite enemies -- the Depth Contract's eliteSpawnChance made real.
//
// docs/planning/depth-01-elite-and-relic-lane-2026-09-09.md.
//
// Two separate things were previously both called "enraged":
//
//   1. A rank, decided once at spawn from the ring you chose to descend to.
//      This is what depthContract.js's eliteSpawnChance always described and
//      what rollsElite() was written for -- it just had no caller.
//   2. A last stand, entered by any ordinary non-boss non-crawler whose hp
//      passes through exactly 1 (threeGame.js's damageSnail). Every enemy
//      shot down through that value dies flagged, so reading `enraged` at
//      the loot boundary put ordinary trash on the 0.65 elite drop branch
//      instead of 0.12, with elite rarity weighting.
//
// `isElite` now carries the rank; `enraged` keeps the last stand. They can
// both be true at once -- a promoted elite still makes its last stand.

import { rollsElite } from './depthContract.js';

// Ordinary hunting families that can be promoted. Deliberately a list rather
// than "any enemy type": bosses run authored fights, and sentinels are
// already elite by identity -- isEliteForLoot treats them as such, so
// promoting them too would rank them twice.
//
// `crawler` is included despite being excluded from the last-stand enrage
// mechanic, and that is load-bearing rather than incidental. A live sample of
// 592 tier-3 chunks contained 377 crawler and 404 sentinel placements against
// only 33 from every other eligible family combined. Leaving crawlers out
// made the contract's elite promise technically wired and practically
// unreachable -- roughly one promotion per twenty deep chunks. See
// tests/e2e/elite-promotion.spec.js, which samples enough chunks to catch
// exactly that failure.
export const ELITE_ELIGIBLE_TYPES = Object.freeze([
    'cybersnail',
    'cryosnail',
    'sporesnail',
    'crawler',
    'mycelium_stalker',
    'bio_charger',
    'spore_mortar',
    'alien_proto_crawler',
    'alien_proto_spitter'
]);

const ELIGIBLE = new Set(ELITE_ELIGIBLE_TYPES);

// A rank must be readable before the enemy is wounded, and by more than
// colour (parent plan section 13 item 3). Silhouette carries that here:
// elites are visibly larger at any distance and in any palette. The tint is
// a secondary channel and is deliberately not SNAIL_ENRAGED_TINT (0xff4a4a),
// so "promoted" and "making its last stand" never read as the same state.
//
// Nearby visible elites receive a rate-limited suit warning in ThreeGame.
// Procedural audio uses the existing SFX bus and needs no media payload.
export const ELITE_IDENTITY = Object.freeze({
    scaleMultiplier: 1.35,
    hpMultiplier: 1.8,
    speedMultiplier: 1.15,
    tint: 0xc08cff
});

export function isEliteEligibleType(type) {
    return ELIGIBLE.has(type);
}

// The loot boundary's question: does this corpse roll on the elite table?
export function isEliteForLoot(userData) {
    return Boolean(userData?.isElite || userData?.isSentinel);
}

// `roll` is a single draw from the caller's seeded generator, so the same
// seed reproduces the same elite set. Ring I's contract chance is 0, which
// is what keeps the opening ring -- and therefore the tutorial route --
// free of promotions by construction rather than by a special case.
export function rollElitePromotion(ring, roll, { type, isBoss = false, isDisplayModel = false, isScripted = false } = {}) {
    if (isBoss || isDisplayModel || isScripted) return false;
    if (!isEliteEligibleType(type)) return false;
    return rollsElite(ring, roll);
}
