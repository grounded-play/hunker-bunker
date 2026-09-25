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
        id: 'cryo_rime', implemented: true,
        type: DROP_TYPES.OVERCLOCK,
        name: 'Cryo Rime Injector',
        nameKey: 'ui.relics.cryo_rime.name',
        descriptionKey: 'ui.relics.cryo_rime.description',
        rarity: DROP_RARITIES.RARE,
        description: 'Shots freeze enemies and slow their movement speed.',
        element: 'cryo',
        stats: { slowDuration: 2.5, slowMult: 0.5, freezePerHit: 34, maxStacks: 100 }
    },
    {
        id: 'plasma_bounce', implemented: false,
        type: DROP_TYPES.OVERCLOCK,
        name: 'Plasma Arc Coils',
        rarity: DROP_RARITIES.RARE,
        description: 'Shots bounce off metallic walls towards nearby hostiles.',
        element: 'tesla',
        stats: { maxBounces: 2 }
    },
    {
        id: 'caustic_payload', implemented: true,
        type: DROP_TYPES.OVERCLOCK,
        name: 'Caustic Spore Payload',
        nameKey: 'ui.relics.caustic_payload.name',
        descriptionKey: 'ui.relics.caustic_payload.description',
        rarity: DROP_RARITIES.MYTHIC,
        description: 'Shots cause bio-corrosion that ticks damage over time.',
        element: 'bio',
        stats: { poisonDuration: 3.0, tickDamage: 2, tickInterval: 0.5 }
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
        id: 'shatter_engine', implemented: true,
        type: DROP_TYPES.RELIC,
        name: 'Shatter Engine',
        nameKey: 'ui.relics.shatter_engine.name',
        descriptionKey: 'ui.relics.shatter_engine.description',
        rarity: DROP_RARITIES.RARE,
        description: 'Defeating frozen hostiles triggers an ice shrapnel nova.',
        element: 'cryo',
        stats: { shatterRadius: 4.0, shatterDamage: 25, shatterChillDuration: 2.0 }
    },
    {
        id: 'bio_vampirism', implemented: true,
        type: DROP_TYPES.RELIC,
        name: 'Bio-Vampiric Membrane',
        nameKey: 'ui.relics.bio_vampirism.name',
        descriptionKey: 'ui.relics.bio_vampirism.description',
        rarity: DROP_RARITIES.MYTHIC,
        description: 'Slaying bio enemies restores O2 vitals and suit battery.',
        element: 'bio',
        stats: { o2Restore: 8, batteryRestore: 15, heartRestore: 1 }
    },
    {
        id: 'tesla_thrusters', implemented: false,
        type: DROP_TYPES.RELIC,
        name: 'Tesla Dash Coils',
        rarity: DROP_RARITIES.RARE,
        description: 'Thruster dash leaves behind an electrified arc fence.',
        element: 'tesla'
    },
    {
        id: 'pheromone_aura', implemented: false,
        type: DROP_TYPES.RELIC,
        name: 'Hive Pheromone Aura',
        rarity: DROP_RARITIES.MYTHIC,
        description: 'Pacifies wild snails and converts nearby crawlers into bio-allies.',
        element: 'bio'
    },
    {
        id: 'chitin_membrane', implemented: true,
        type: DROP_TYPES.RELIC,
        name: 'Carapace Membrane',
        rarity: DROP_RARITIES.RARE,
        description: 'Bio-slime grants 30% protection against damage. Fractional protection accumulates to block whole hearts; oxygen loss and falls bypass it.',
        element: 'bio'
    },
    {
        id: 'synapse_pulse', implemented: false,
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
        wired: true,
        stats: { alienHealAmount: 5, humanHealPenaltyMult: 0.5 }
    }
]);

// docs/design/one-more-ring-design-pillars.md item 1 (Sprint 28 Lane A):
// ring defaults to 1 (depthContract.js's neutral baseline, rollsRareRelic
// returns false at ring 1) so every existing caller not yet passing it
// keeps today's exact drop distribution -- this only changes behavior for
// a caller that explicitly supplies a deeper ring (see threeGame.js's
// spawnGearPoofEffect/kill-loot call site).
export function rollEnemyLootDrop(random, { isElite = false, isBoss = false, ring = 1, excludedIds = [] } = {}) {
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

    // `implemented: false` entries declare an effect that nothing in the
    // runtime reads -- three carry stat keys with no consumer anywhere, six
    // carry no stats at all. They stay in the catalog so the Vault and the
    // debug museum can still display them, but handing one to a player as a
    // reward gives them an item that does nothing, so the reward roll skips
    // them until their effect exists. Astra plan section 23: incomplete
    // promises are connected through gameplay or removed from player-facing
    // claims until ready.
    const excluded = new Set(excludedIds);
    const available = [...WEAPON_OVERCLOCKS, ...SUIT_RELICS]
        .filter((item) => item.implemented !== false && !excluded.has(item.id));
    let pool = available.filter((item) => item.rarity === rarity);
    if (!pool.length) pool = available;
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

    if (!pool.length) return null;
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

// The per-kill half of "Kills refill the magazine but permanently reduce
// maximum oxygen". Both terms are charged by the SAME relic: the refund and
// the penalty are read off one entry, not summed independently across the
// loadout.
//
// maxO2PenaltyPercent is a shared stat key and Punctured Lung carries it too
// -- but as a one-time equip cost, charged once through
// applyPuncturedLungCapacity at equip and recomputed from base 100 in
// resetVitalsForRun. Reading the key here without checking whose it was
// re-charged that 40% on every kill, compounding: a Punctured Lung run lost
// max O2 to 2.8 of 100 within six kills. See
// docs/reports/relic-behavior-matrix-2026-09-09.md.
export function applyParasiticMagazineKill({ clipAmmo = 0, clipSize = 0, maxO2 = 100 } = {}, equippedRelics = []) {
    let nextClipAmmo = clipAmmo;
    let nextMaxO2 = maxO2;
    for (const relic of equippedRelics) {
        const refund = Number(relic?.stats?.killAmmoRefund);
        if (!Number.isFinite(refund) || refund <= 0) continue;
        nextClipAmmo = Math.min(clipSize, nextClipAmmo + refund);
        const penalty = Number(relic?.stats?.maxO2PenaltyPercent);
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

// "Queen's Milk -- Alien enemies may heal you on contact. Human healing
// hurts instead." Two independent hooks, both pure:
//
// 1. getQueensMilkAlienContactHeal -- reason must be a genuine alien-body
//    touch, not a ranged/AoE/environmental hit. Verified against threeGame.js
//    call sites: 'crawler' (charge-attack proximity check) and
//    'mycelium_stalker' / 'bio_charger' (both explicitly commented
//    "Contact attack check"). Deliberately excludes enemy-projectile,
//    ground-slam, frost-shockwave, queen-shockwave (alien, but ranged/AoE,
//    not contact) and hazard-zone/o2-depletion/fall/camp-turret/pvp-rival
//    (not alien contact at all) -- "on contact" means the creature's own
//    body touching you.
// 2. getQueensMilkHumanHealPenalty -- healAmount is whatever a human-sourced
//    heal call was about to apply (med conversion, camp aid, health pickup
//    -- every current call to ThreeGame.healPlayer() in this codebase is one
//    of these three, there is no separate "alien heals you" path elsewhere
//    to accidentally double-flip). Returns a positive damage amount for the
//    caller to route through takeDamage() instead of healing, or null when
//    the relic isn't equipped / there's nothing to flip.
const QUEENS_MILK_ALIEN_CONTACT_REASONS = new Set(['crawler', 'mycelium_stalker', 'bio_charger']);

export function getQueensMilkAlienContactHeal(reason, equippedRelics = []) {
    if (!QUEENS_MILK_ALIEN_CONTACT_REASONS.has(reason)) return null;
    for (const relic of equippedRelics) {
        if (relic?.id !== 'queens_milk') continue;
        const healAmount = Number(relic?.stats?.alienHealAmount);
        if (Number.isFinite(healAmount)) return healAmount;
    }
    return null;
}

export function getQueensMilkHumanHealPenalty(healAmount, equippedRelics = []) {
    if (!(healAmount > 0)) return null;
    for (const relic of equippedRelics) {
        if (relic?.id !== 'queens_milk') continue;
        const penaltyMult = Number(relic?.stats?.humanHealPenaltyMult);
        if (Number.isFinite(penaltyMult)) return Math.max(1, Math.round(healAmount * penaltyMult));
    }
    return null;
}

// Element combinations are not active effects until their runtime consumers
// exist. Keep the API stable without announcing bonuses the game cannot apply.
//
// The equipped list is accepted (and both the runtime caller in threeGame.js
// and the tests pass it) so that wiring synergies up later is a body change
// rather than a signature change. Declaring it also stops every caller reading
// as passing a superfluous argument to a zero-arity function.
export const SYNERGY_DEFINITIONS = Object.freeze({
    cryo_shatter: Object.freeze({
        id: 'cryo_shatter',
        name: 'Cryo Shatter',
        nameKey: 'ui.relics.synergy.cryo_shatter',
        description: 'Frozen enemies shatter on defeat or melee strike, triggering an ice shrapnel nova.',
        element: 'cryo',
        components: Object.freeze(['cryo_rime', 'shatter_engine'])
    }),
    bio_predator: Object.freeze({
        id: 'bio_predator',
        name: 'Bio Predator',
        nameKey: 'ui.relics.synergy.bio_predator',
        description: 'Corroding bio enemies restores suit O2 vitals and bio-battery on defeat.',
        element: 'bio',
        components: Object.freeze(['caustic_payload', 'bio_vampirism'])
    })
});

export function computeActiveSynergies(equippedItems = []) {
    const itemIds = new Set((equippedItems ?? []).map((item) => (typeof item === 'string' ? item : item?.id)).filter(Boolean));
    const active = [];
    if (itemIds.has('cryo_rime') && itemIds.has('shatter_engine')) {
        active.push(SYNERGY_DEFINITIONS.cryo_shatter);
    }
    if (itemIds.has('caustic_payload') && itemIds.has('bio_vampirism')) {
        active.push(SYNERGY_DEFINITIONS.bio_predator);
    }
    return active;
}

export const BIO_ENEMY_TYPES = Object.freeze(new Set([
    'crawler',
    'alien_proto_crawler_A',
    'alien_proto_spitter',
    'sporesnail',
    'boss_sporesnail',
    'mycelium_stalker',
    'bio_charger',
    'spore_mortar',
    'fungal_spore_vent'
]));

export function isBioEnemy(type) {
    return BIO_ENEMY_TYPES.has(String(type || ''));
}

export function resolveCryoShatterNova({
    originX = 0,
    originZ = 0,
    scatterSprites = [],
    shatterRadius = 4.0,
    shatterDamage = 25,
    shatterChillDuration = 2.0,
    sourceSprite = null
} = {}) {
    const affected = [];
    for (const other of scatterSprites) {
        if (!other?.parent || other === sourceSprite || other.userData?.burstTriggered) continue;
        const dx = other.position.x - originX;
        const dz = other.position.z - originZ;
        const distance = Math.hypot(dx, dz);
        if (distance > shatterRadius) continue;
        affected.push({
            sprite: other,
            distance,
            damage: shatterDamage,
            chillDuration: shatterChillDuration
        });
    }
    return affected;
}

export function resolveBioVampirismKill({
    playerVitals = {},
    enemyType = '',
    isCorroded = false,
    stats = { o2Restore: 8, batteryRestore: 15, heartRestore: 1 }
} = {}) {
    if (!isCorroded || !isBioEnemy(enemyType)) {
        return { o2Restored: 0, heartRestored: 0, batteryRestored: 0 };
    }
    const currentO2 = playerVitals.o2 ?? 0;
    const maxO2 = playerVitals.maxO2 ?? 100;
    const o2Restored = Math.min(stats.o2Restore ?? 8, Math.max(0, maxO2 - currentO2));

    const currentHp = playerVitals.hp ?? 0;
    const maxHp = playerVitals.maxHp ?? 4;
    const heartRestored = (currentHp < maxHp && (stats.heartRestore ?? 1) > 0) ? 1 : 0;

    return {
        o2Restored,
        heartRestored,
        batteryRestored: stats.batteryRestore ?? 15
    };
}

export function getTurretElementalInheritance(equippedItems = []) {
    const itemIds = new Set((equippedItems ?? []).map((item) => (typeof item === 'string' ? item : item?.id)).filter(Boolean));
    if (itemIds.has('cryo_rime')) {
        return {
            element: 'cryo',
            potency: 0.5,
            freezePerHit: 17,
            slowDuration: 1.5,
            bulletColor: 0x7df2ff
        };
    }
    if (itemIds.has('caustic_payload')) {
        return {
            element: 'bio',
            potency: 0.5,
            tickDamage: 1,
            poisonDuration: 2.0,
            bulletColor: 0x66ff66
        };
    }
    return null;
}

export function applyIncomingDamageModifiers(baseDamage = 0, runOverclocks = [], runRelics = []) {
    if (!Number.isFinite(baseDamage) || baseDamage <= 0) return 0;
    let damage = baseDamage;
    for (const mod of runOverclocks ?? []) {
        const mult = Number(mod?.stats?.takenDamageMult);
        if (Number.isFinite(mult) && mult > 0) {
            damage *= mult;
        }
    }
    for (const relic of runRelics ?? []) {
        const mult = Number(relic?.stats?.takenDamageMult);
        if (Number.isFinite(mult) && mult > 0) {
            damage *= mult;
        }
    }
    return damage;
}

