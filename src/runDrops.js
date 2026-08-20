// ── In-Run Roguelike Drops & Overclock System ──────────────────────────────
// Manages randomized mid-run loot drops (Weapon Overclocks & Suit Relics)
// and calculates elemental synergies (Cryo, Bio, Tesla) per playthrough.

import { rollsRareRelic } from './depthContract.js';

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

// Sprint 25 design pass (docs/design/one-more-ring-design-pillars.md item 2):
// "transformative" relics/overclocks that change a rule instead of adding a
// flat stat bonus -- the design doc's own examples are named here directly.
// Most existing SUIT_RELICS/WEAPON_OVERCLOCKS entries above are catalog-only
// today (confirmed: no id below is referenced anywhere outside this file and
// runDrops.test.js except through the generic mod.stats?.* reads threiGame.js
// already does for damageMult/extraBullets/spreadAngle) -- these new entries
// keep that same honest split. `wired: true` marks the ones actually read at
// runtime this pass; the rest are real catalog entries (roll into loot,
// appear in the manifest/UI) whose effect is described but not yet enforced,
// same status quo as e.g. pheromone_aura/chitin_membrane above.
export const TRANSFORMATIVE_RELIC_IDS = Object.freeze([
    'last_breath', 'punctured_lung', 'scrap_cycler', 'parasitic_magazine',
    'false_telemetry', 'vesper_doctrine', 'cryo_breach', 'queens_milk'
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
    },
    {
        id: 'last_breath',
        type: DROP_TYPES.RELIC,
        name: 'Last Breath',
        rarity: DROP_RARITIES.MYTHIC,
        description: 'Below 20% O2, weapon damage doubles. Oxygen stops being a countdown and starts being a decision.',
        transformative: true,
        wired: true,
        stats: { lowO2Threshold: 20, lowO2DamageMult: 2.0 }
    },
    {
        id: 'punctured_lung',
        type: DROP_TYPES.RELIC,
        name: 'Punctured Lung',
        rarity: DROP_RARITIES.CORRUPTED,
        description: 'Maximum oxygen capacity permanently reduced. Kills restore oxygen.',
        transformative: true,
        wired: true,
        stats: { maxO2PenaltyPercent: 40, killO2Restore: 8 }
    },
    {
        id: 'scrap_cycler',
        type: DROP_TYPES.RELIC,
        name: 'Scrap Cycler',
        rarity: DROP_RARITIES.RARE,
        description: 'Reloading consumes 3 salvage and fires a radial shrapnel blast.',
        transformative: true,
        wired: true,
        stats: { reloadSalvageCost: 3, reloadShrapnelDamage: 15, reloadShrapnelRadius: 3 }
    },
    {
        id: 'parasitic_magazine',
        type: DROP_TYPES.RELIC,
        name: 'Parasitic Magazine',
        rarity: DROP_RARITIES.CORRUPTED,
        description: 'Kills refill the magazine but permanently reduce maximum oxygen.',
        transformative: true,
        wired: true,
        stats: { killAmmoRefund: 1, maxO2PenaltyPercent: 5 }
    },
    {
        id: 'false_telemetry',
        type: DROP_TYPES.RELIC,
        name: 'False Telemetry',
        rarity: DROP_RARITIES.RARE,
        description: 'At critical health, enemies temporarily lose track of you.',
        transformative: true,
        wired: true,
        stats: { criticalHpPercent: 15, aggroDropChance: 0.4, aggroDropDuration: 2.5 }
    },
    {
        id: 'vesper_doctrine',
        type: DROP_TYPES.OVERCLOCK,
        name: 'Vesper Doctrine',
        rarity: DROP_RARITIES.RARE,
        description: 'Every empty reload ejects the remaining magazine as an explosive.',
        transformative: true,
        wired: true,
        stats: { emptyReloadExplosionDamage: 20, emptyReloadExplosionRadius: 3 }
    },
    {
        id: 'cryo_breach',
        type: DROP_TYPES.RELIC,
        name: 'Cryo Breach',
        rarity: DROP_RARITIES.RARE,
        description: 'Frozen enemies explode on death and freeze nearby targets.',
        element: 'cryo',
        transformative: true,
        wired: true,
        stats: { chainFreezeRadius: 3 }
    },
    {
        id: 'queens_milk',
        type: DROP_TYPES.RELIC,
        name: "Queen's Milk",
        rarity: DROP_RARITIES.MYTHIC,
        description: 'Alien enemies may heal you on contact. Human healing hurts instead.',
        element: 'bio',
        transformative: true,
        stats: { alienHealAmount: 5, humanHealPenaltyMult: 0.5 }
    }
]);

// docs/design/one-more-ring-design-pillars.md item 1 (Sprint 28 Lane A):
// ring defaults to 1 (depthContract.js's neutral baseline, rollsRareRelic
// returns false at ring 1) so every existing caller not yet passing it
// keeps today's exact drop distribution -- this only changes behavior for
// a caller that explicitly supplies a deeper ring (see threeGame.js's
// spawnGearPoofEffect/kill-loot call site).
export function rollEnemyLootDrop(random, { isElite = false, isBoss = false, ring = 1 } = {}) {
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

    let pool = [...WEAPON_OVERCLOCKS, ...SUIT_RELICS].filter((item) => item.rarity === rarity);
    // Depth Contract's rareRelicChance (design doc: "chance a reward-tier
    // drop rolls a relic instead of a common/useful item") biases this roll
    // toward the relic half of the pool specifically, not just a higher
    // rarity floor -- rarity and item-type (overclock vs relic) were
    // previously two separate axes with no depth-based link between them.
    // Only narrows the pool when a relic actually exists at this rarity;
    // never empties an otherwise-valid roll.
    if (rollsRareRelic(ring, random())) {
        const relicsOnly = pool.filter((item) => item.type === DROP_TYPES.RELIC);
        if (relicsOnly.length) pool = relicsOnly;
    }

    if (!pool.length) return WEAPON_OVERCLOCKS[0];
    return pool[Math.floor(random() * pool.length)];
}

// "Last Breath" (docs/design/one-more-ring-design-pillars.md item 2): the
// first transformative relic wired to a real gameplay hook, called from
// src/threeGame.js's spawnPlayerShot. Pulled out as a standalone pure
// function (rather than inlined in that already-large method) so it's
// testable without faking spawnPlayerShot's much bigger dependency surface.
export function applyLastBreathDamage(baseDamage, equippedRelics = [], currentO2 = 100) {
    let damage = baseDamage;
    for (const relic of equippedRelics) {
        if (relic?.stats?.lowO2DamageMult && currentO2 < relic.stats.lowO2Threshold) {
            damage *= relic.stats.lowO2DamageMult;
        }
    }
    return damage;
}

export function applyPuncturedLungCapacity(baseMaxO2 = 100, equippedRelics = []) {
    let maxO2 = baseMaxO2;
    for (const relic of equippedRelics) {
        const penalty = Number(relic?.stats?.maxO2PenaltyPercent);
        if (Number.isFinite(penalty) && penalty > 0) {
            maxO2 *= Math.max(0, 1 - (penalty / 100));
        }
    }
    return Math.max(1, maxO2);
}

export function applyPuncturedLungKillO2(currentO2 = 0, equippedRelics = [], maxO2 = 100) {
    let nextO2 = currentO2;
    for (const relic of equippedRelics) {
        const restore = Number(relic?.stats?.killO2Restore);
        if (Number.isFinite(restore) && restore > 0) nextO2 += restore;
    }
    return Math.min(maxO2, Math.max(0, nextO2));
}

export function applyParasiticMagazineKill({ clipAmmo = 0, clipSize = 0, maxO2 = 100 } = {}, equippedRelics = []) {
    let nextClipAmmo = clipAmmo;
    let nextMaxO2 = maxO2;
    for (const relic of equippedRelics) {
        const refund = Number(relic?.stats?.killAmmoRefund);
        const penalty = Number(relic?.stats?.maxO2PenaltyPercent);
        if (Number.isFinite(refund) && refund > 0) nextClipAmmo = Math.min(clipSize, nextClipAmmo + refund);
        if (Number.isFinite(penalty) && penalty > 0) nextMaxO2 *= Math.max(0, 1 - (penalty / 100));
    }
    return { clipAmmo: nextClipAmmo, maxO2: Math.max(1, nextMaxO2) };
}

export function applyFalseTelemetryAggroDrop(currentHp = 100, maxHp = 100, equippedRelics = [], random = Math.random) {
    const hpRatio = currentHp / Math.max(1, maxHp);
    for (const relic of equippedRelics) {
        const threshold = Number(relic?.stats?.criticalHpPercent);
        const chance = Number(relic?.stats?.aggroDropChance);
        const duration = Number(relic?.stats?.aggroDropDuration);
        if (Number.isFinite(threshold) && Number.isFinite(chance) && Number.isFinite(duration)
            && hpRatio * 100 <= threshold && random() < chance) {
            return Math.max(0, duration);
        }
    }
    return 0;
}

export function getCryoBreachChainFreezeRadius(equippedRelics = []) {
    return equippedRelics.reduce((radius, relic) => {
        const value = Number(relic?.stats?.chainFreezeRadius);
        return Number.isFinite(value) && value > radius ? value : radius;
    }, 0);
}

// docs/design/one-more-ring-design-pillars.md item 2 (Sprint 28): "Scrap
// Cycler -- reloading consumes 3 salvage and fires a radial shrapnel
// blast." Pure decision only -- does NOT touch this.bank itself (spending
// shells is a real side effect the caller must perform and only apply the
// blast if the spend actually succeeded, so a broke player still gets a
// normal reload rather than a silently-failed one). Returns null when the
// relic isn't equipped, distinct from "equipped but nothing happens" so a
// caller doesn't need a second existence check.
export function getScrapCyclerReloadEffect(equippedRelics = []) {
    for (const relic of equippedRelics) {
        const salvageCost = Number(relic?.stats?.reloadSalvageCost);
        const shrapnelDamage = Number(relic?.stats?.reloadShrapnelDamage);
        if (Number.isFinite(salvageCost) && Number.isFinite(shrapnelDamage)) {
            return {
                salvageCost,
                shrapnelDamage,
                shrapnelRadius: Number(relic?.stats?.reloadShrapnelRadius) || 3
            };
        }
    }
    return null;
}

// "Vesper Doctrine -- every empty reload ejects the remaining magazine as
// an explosive." An OVERCLOCK (weapon-side), not a suit RELIC, so it reads
// from equippedOverclocks, not equippedRelics -- see DROP_TYPES.OVERCLOCK
// on its own catalog entry. wasEmpty is the caller's own read of
// clipAmmo === 0 at the moment reload was requested, passed in rather than
// re-derived here so this stays a pure function with no clip-state
// knowledge of its own.
export function getVesperDoctrineReloadEffect(wasEmpty, equippedOverclocks = []) {
    if (!wasEmpty) return null;
    for (const mod of equippedOverclocks) {
        const explosionDamage = Number(mod?.stats?.emptyReloadExplosionDamage);
        if (Number.isFinite(explosionDamage)) {
            return {
                explosionDamage,
                explosionRadius: Number(mod?.stats?.emptyReloadExplosionRadius) || 3
            };
        }
    }
    return null;
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
