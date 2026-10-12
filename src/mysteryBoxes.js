// Mystery boxes (Sprint 53 V6, docs/planning/sprint-53-world-variety-night-and-sleep-2026-10-07.md).
// Sealed containers that roll what is inside when opened: supplies, salvage,
// lore, an ambush, a hazard, or a lead. Pure rules here; threeGame.js places
// them per room (seeded, so co-op screens agree) and opens them.

export const MYSTERY_OUTCOMES = Object.freeze(['supplies', 'salvage', 'lore', 'ambush', 'hazard', 'quest_hook']);

// The line the operator hears when a box opens, by outcome.
export const MYSTERY_OUTCOME_LINE_KEYS = Object.freeze({
    supplies: 'ui.mystery.outcome.supplies',
    salvage: 'ui.mystery.outcome.salvage',
    lore: 'ui.mystery.outcome.lore',
    ambush: 'ui.mystery.outcome.ambush',
    hazard: 'ui.mystery.outcome.hazard',
    quest_hook: 'ui.mystery.outcome.quest_hook'
});

// Owner-approved table (2026-10-07) for an ordinary box; other kinds lean.
const WEIGHTS = Object.freeze({
    courier: Object.freeze({ supplies: 40, salvage: 25, lore: 15, ambush: 10, hazard: 5, quest_hook: 5 }),
    quarantine: Object.freeze({ supplies: 5, salvage: 20, lore: 10, ambush: 35, hazard: 25, quest_hook: 5 }),
    reliquary: Object.freeze({ supplies: 10, salvage: 30, lore: 35, ambush: 10, hazard: 0, quest_hook: 15 }),
    blacksite: Object.freeze({ supplies: 30, salvage: 45, lore: 15, ambush: 0, hazard: 0, quest_hook: 10 })
});

// Each kind's look until its own model ships (A2 prompts): a stand-in GLB type,
// how long it takes to open, and whether it needs a keycard (or an Engineer).
export const MYSTERY_BOX_KINDS = Object.freeze({
    courier: Object.freeze({ standIn: 'prop_security_locker', labelKey: 'ui.mystery.kind.courier', model: 'mystery_courier_case', openSeconds: 1.6, needsKeycard: false, accent: 0xf59e0b }),
    quarantine: Object.freeze({ standIn: 'prop_flesh_steel_coffin', labelKey: 'ui.mystery.kind.quarantine', model: 'mystery_quarantine_crate', openSeconds: 2.2, needsKeycard: false, accent: 0xef4444 }),
    reliquary: Object.freeze({ standIn: 'prop_corporate_saint_reliquary', labelKey: 'ui.mystery.kind.reliquary', model: 'mystery_reliquary_pod', openSeconds: 2.2, needsKeycard: false, accent: 0x10b981 }),
    blacksite: Object.freeze({ standIn: 'prop_locker_bulged', labelKey: 'ui.mystery.kind.blacksite', model: 'mystery_blacksite_lockbox', openSeconds: 2.8, needsKeycard: true, accent: 0xf59e0b })
});

const BIOME_KINDS = Object.freeze({
    active: Object.freeze({ courier: 70, blacksite: 15, quarantine: 15 }),
    cryo: Object.freeze({ courier: 55, quarantine: 30, blacksite: 15 }),
    bio: Object.freeze({ reliquary: 45, quarantine: 35, courier: 20 })
});

export function seededRandom(seed) {
    // Scramble the seed first: neighbouring rooms have neighbouring seeds,
    // and a plain LCG's first draw barely moves between them.
    let state = seed >>> 0;
    state = Math.imul(state ^ (state >>> 16), 0x7feb352d) >>> 0;
    state = Math.imul(state ^ (state >>> 15), 0x846ca68b) >>> 0;
    state = (state ^ (state >>> 16)) >>> 0 || 1;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

function pick(weights, random) {
    const entries = Object.entries(weights).filter(([, w]) => w > 0);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = random() * total;
    for (const [key, weight] of entries) {
        roll -= weight;
        if (roll < 0) return key;
    }
    return entries[entries.length - 1][0];
}

export function pickMysteryBoxKind(biome, random) {
    return pick(BIOME_KINDS[biome] ?? BIOME_KINDS.active, random);
}

export function rollMysteryOutcome(kind, random) {
    return pick(WEIGHTS[kind] ?? WEIGHTS.courier, random);
}

/** Seconds to open; Engineers are trained for it. */
export function mysteryOpenSeconds(kind, playerType = 'SCOUT') {
    const base = MYSTERY_BOX_KINDS[kind]?.openSeconds ?? 1.6;
    return String(playerType).toUpperCase() === 'ENGINEER' ? base * 0.5 : base;
}

/** Chance a room holds a box; deeper rings hold a few more. */
export function mysteryBoxChance(depthTier = 0) {
    return Math.min(0.28, 0.16 + Math.max(0, depthTier) * 0.02);
}

/** What spills out, by outcome and depth: pickup types for the drop spill. */
export function mysteryRewardDrops(outcome, depthTier = 0) {
    const extra = Math.min(3, Math.max(0, Math.floor(depthTier / 2)));
    if (outcome === 'supplies') return ['ammo', 'ammo', 'health', ...Array(extra).fill('ammo')];
    if (outcome === 'salvage') return ['coin', 'coin', 'weapon', ...Array(extra).fill('coin')];
    if (outcome === 'quest_hook') return ['coin'];
    if (outcome === 'ambush') return ['ammo'];
    return [];
}
