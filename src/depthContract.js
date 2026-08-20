// The Depth Contract — docs/design/one-more-ring-design-pillars.md item 1.
//
// Makes "go one ring deeper" an explicit, legible bet instead of a silent
// difficulty slider: every ring beyond the first declares what goes up
// (salvage, rare-relic odds, unusual-room odds) and what gets harder (O2
// efficiency, director aggression, elite spawn chance) at the same time.
// Ring keys match RING_CONTENT_BUDGETS in ringManifest.js (1-5) so this
// stays aligned with the existing ring/tier progression authority rather
// than inventing a second numbering scheme.
//
// Deliberately pure data + pure functions only. No HUD/audio/ritual
// presentation wiring here yet -- that's a follow-up once this lands and the
// numbers below have been tuned against actual playtesting, not guessed
// once and shipped.

export const DEPTH_CONTRACT_VERSION = 1;

// salvageMultiplier: applied to salvage/shell value on pickup.
// eliteSpawnChance: 0-1, additional chance an eligible spawn rolls elite.
// rareRelicChance: 0-1, chance a reward-tier drop rolls a relic instead of a
//   common/useful item.
// o2EfficiencyPenalty: 0-1, fraction subtracted from baseline O2 efficiency
//   (i.e. 0.05 means O2 drains 5% faster at this ring).
// directorAggressionBonus: added to the run director's base aggression
//   score (see src/act2.js / src/arcState.js), same unit that system
//   already uses internally.
export const DEPTH_CONTRACT = Object.freeze({
    1: Object.freeze({
        label: 'RING I',
        salvageMultiplier: 1.0,
        eliteSpawnChance: 0,
        rareRelicChance: 0,
        o2EfficiencyPenalty: 0,
        directorAggressionBonus: 0
    }),
    2: Object.freeze({
        label: 'RING II',
        salvageMultiplier: 1.25,
        eliteSpawnChance: 0.08,
        rareRelicChance: 0.05,
        o2EfficiencyPenalty: 0.05,
        directorAggressionBonus: 0
    }),
    3: Object.freeze({
        label: 'RING III',
        salvageMultiplier: 1.6,
        eliteSpawnChance: 0.15,
        rareRelicChance: 0.12,
        o2EfficiencyPenalty: 0.1,
        directorAggressionBonus: 1
    }),
    4: Object.freeze({
        label: 'RING IV',
        salvageMultiplier: 2.2,
        eliteSpawnChance: 0.22,
        rareRelicChance: 0.2,
        o2EfficiencyPenalty: 0.15,
        directorAggressionBonus: 2
    }),
    5: Object.freeze({
        label: 'SECTOR ZERO',
        salvageMultiplier: 3.0,
        eliteSpawnChance: 0.3,
        rareRelicChance: 0.3,
        o2EfficiencyPenalty: 0.2,
        directorAggressionBonus: 3
    })
});

const RING_KEYS = Object.keys(DEPTH_CONTRACT).map(Number).sort((a, b) => a - b);
export const MIN_RING = RING_KEYS[0];
export const MAX_RING = RING_KEYS[RING_KEYS.length - 1];

// Clamps to the known range rather than returning undefined for an
// out-of-catalog ring -- callers (HUD, director, loot rolls) should never
// have to null-check this against future/past ring numbers.
export function getDepthContract(ring) {
    const clamped = Math.min(MAX_RING, Math.max(MIN_RING, Math.round(ring)));
    return DEPTH_CONTRACT[clamped];
}

export function applySalvageMultiplier(baseValue, ring) {
    return baseValue * getDepthContract(ring).salvageMultiplier;
}

export function rollsElite(ring, roll) {
    return roll < getDepthContract(ring).eliteSpawnChance;
}

export function rollsRareRelic(ring, roll) {
    return roll < getDepthContract(ring).rareRelicChance;
}

export function applyO2EfficiencyPenalty(baseEfficiency, ring) {
    return baseEfficiency * (1 - getDepthContract(ring).o2EfficiencyPenalty);
}

// Compares two adjacent rings for the crossing-ritual summary (docs' "door
// slams, reward multiplier ticks upward" beat) -- returns only what changed,
// so a presentation layer can decide what's worth announcing without
// re-deriving the diff itself.
export function describeCrossing(fromRing, toRing) {
    const from = getDepthContract(fromRing);
    const to = getDepthContract(toRing);
    return {
        label: to.label,
        salvageMultiplierDelta: to.salvageMultiplier - from.salvageMultiplier,
        eliteSpawnChanceDelta: to.eliteSpawnChance - from.eliteSpawnChance,
        rareRelicChanceDelta: to.rareRelicChance - from.rareRelicChance,
        o2EfficiencyPenaltyDelta: to.o2EfficiencyPenalty - from.o2EfficiencyPenalty,
        directorAggressionBonusDelta: to.directorAggressionBonus - from.directorAggressionBonus
    };
}
