// ── Depth-tier loot config (data) ─────────────────────────────
// doc 11 §3.4 content pipeline + §4.C (greed: deeper = richer). Behaviour-
// preserving extraction of the depth-tier names and loot scaling from
// threeGame.js. Pure data + a clamped lookup.

export const DEPTH_TIER_NAMES = Object.freeze(['SURFACE', 'SHALLOW', 'DEEP', 'ABYSS']);

export const DEPTH_TIER_LOOT_CONFIG = Object.freeze([
    Object.freeze({ pickupMultiplier: 0.8, legendaryBoost: 0 }),
    Object.freeze({ pickupMultiplier: 1.0, legendaryBoost: 0 }),
    Object.freeze({ pickupMultiplier: 1.3, legendaryBoost: 0.05 }),
    Object.freeze({ pickupMultiplier: 1.7, legendaryBoost: 0.15 })
]);

export function getDepthLootConfig(depthTier) {
    const index = Math.max(0, Math.min(DEPTH_TIER_LOOT_CONFIG.length - 1, Math.floor(depthTier)));
    return DEPTH_TIER_LOOT_CONFIG[index];
}
