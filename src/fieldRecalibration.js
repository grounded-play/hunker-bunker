// ── Field Recalibration & Weapon Synergy System ─────────────────────────────
// Safe-camp buildcraft terminal: provides 1 high-stakes recalibration choice per outpost.
// Supports rerolling, replacing/upgrading weapon mods, and triggering elemental fusions
// such as Sub-Zero Necrosis (Cryo + Bio Synthesis).

import { DROP_RARITIES } from './runDrops.js';

export const RECALIBRATION_MODS = Object.freeze([
    {
        id: 'cryo_rime',
        name: 'Cryo Rime Injector',
        nameKey: 'ui.relics.cryo_rime.name',
        rarity: DROP_RARITIES.RARE,
        element: 'cryo',
        description: 'Supercools kinetic projectiles. Hits apply chill stacks, slowing enemies and freezing them solid at 100 stacks.',
        type: 'overclock',
        implemented: true,
        stats: { damageMult: 0.95, slowDuration: 2.5, slowMult: 0.5, freezePerHit: 34 },
        cost: Object.freeze({ tech: 35 })
    },
    {
        id: 'caustic_payload',
        name: 'Caustic Spore Payload',
        nameKey: 'ui.relics.caustic_payload.name',
        rarity: DROP_RARITIES.MYTHIC,
        element: 'bio',
        description: 'Infects targets with aggressive subterranean spores, dealing continuous bio-corrosive damage over time.',
        type: 'overclock',
        implemented: true,
        stats: { damageMult: 0.9, poisonDuration: 3.0, tickDamage: 3, tickInterval: 0.5 },
        cost: Object.freeze({ tech: 25, med: 15 })
    },
    {
        id: 'subzero_necrosis',
        name: 'Sub-Zero Necrosis',
        nameKey: 'ui.relics.synergy.subzero_necrosis',
        rarity: DROP_RARITIES.MYTHIC,
        element: 'fusion',
        isFusion: true,
        fusionElements: Object.freeze(['cryo', 'bio']),
        description: 'Cryo + Bio Synthesis: Frozen enemies infected with caustic spores burst into an explosive cryogenic toxin nova on death, freezing and corroding surrounding hostiles.',
        type: 'overclock',
        implemented: true,
        stats: { damageMult: 1.15, slowDuration: 2.5, freezePerHit: 34, poisonDuration: 3.0, novaRadius: 4.5, novaDamage: 35 },
        cost: Object.freeze({ tech: 50, med: 10 })
    },
    {
        id: 'kinetic_hollow_point',
        name: 'Kinetic Hollow-Point Core',
        nameKey: 'ui.relics.kinetic_hollow_point.name',
        rarity: DROP_RARITIES.COMMON,
        element: 'kinetic',
        description: 'Dense expanding tungsten slugs deal 25% more damage, but the unstable recoil coupling increases incoming damage by 15%.',
        type: 'overclock',
        implemented: true,
        stats: { damageMult: 1.25, takenDamageMult: 1.15 },
        cost: Object.freeze({ tech: 20 })
    },
    {
        id: 'hyper_split_core',
        name: 'Hyper-Split Salvo Splitter',
        nameKey: 'ui.relics.hyper_split_core.name',
        rarity: DROP_RARITIES.RARE,
        element: 'kinetic',
        description: 'Splits primary muzzle blast into a 3-projectile spread with wide corridor coverage.',
        type: 'overclock',
        implemented: true,
        stats: { extraBullets: 2, spreadAngle: 0.22, damageMult: 0.75 },
        cost: Object.freeze({ tech: 35 })
    },
    {
        id: 'corrupted_overcharge',
        name: 'Corrupted Chamber Overcharge',
        nameKey: 'ui.relics.corrupted_overcharge.name',
        rarity: DROP_RARITIES.CORRUPTED,
        element: 'corrupted',
        description: '+80% raw ballistic weapon damage, but breaches suit dissipation coils: incoming hostile damage increased by 35%.',
        type: 'overclock',
        implemented: true,
        stats: { damageMult: 1.8, takenDamageMult: 1.35 },
        cost: Object.freeze({ tech: 25 })
    },
    {
        id: 'o2_siphon_chamber',
        name: 'Low-O₂ Overdrive Injector',
        nameKey: 'ui.relics.o2_siphon_chamber.name',
        rarity: DROP_RARITIES.RARE,
        element: 'cryo',
        description: 'Channels chilled suit atmosphere into the firing pin: deals up to +100% damage as oxygen depletes below 50%.',
        type: 'overclock',
        implemented: true,
        stats: { lowO2Threshold: 50, lowO2DamageMult: 2.0 },
        cost: Object.freeze({ tech: 20, med: 10 })
    }
]);

// TECH and SCRAP are the same bank currency. Keep one canonical key so a
// mixed cost cannot accidentally double-count or under-charge it.
export const RECALIBRATION_REROLL_COST = Object.freeze({ tech: 10 });

/**
 * Deterministic pseudo-random number generator for camp seeds.
 */
function seededRandom(seed) {
    let s = Number(seed) || 12345;
    return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };
}

/**
 * Formats human-readable before-and-after stat comparisons.
 */
export function buildStatDiffPreview(currentMod = null, candidateMod = null) {
    const beforeStats = [];
    const afterStats = [];

    // Current Mod Baseline
    if (!currentMod) {
        beforeStats.push({ label: 'CORE FIRING PIN', value: 'Standard Kinetic (1.0x)' });
        beforeStats.push({ label: 'ELEMENT', value: 'None' });
    } else {
        beforeStats.push({ label: 'ACTIVE OVERCLOCK', value: currentMod.name });
        beforeStats.push({ label: 'ELEMENT', value: (currentMod.element || 'kinetic').toUpperCase() });
        if (currentMod.stats?.damageMult) {
            beforeStats.push({ label: 'DAMAGE SCALING', value: `${Math.round(currentMod.stats.damageMult * 100)}%` });
        }
    }

    // Candidate Mod Target
    if (candidateMod) {
        afterStats.push({ label: 'NEW OVERCLOCK', value: candidateMod.name, highlight: true });
        afterStats.push({
            label: 'ELEMENT',
            value: candidateMod.element === 'fusion' ? 'CRYO + BIO FUSION' : (candidateMod.element || 'kinetic').toUpperCase(),
            highlight: Boolean(candidateMod.isFusion)
        });
        if (candidateMod.stats?.damageMult) {
            const multVal = Math.round(candidateMod.stats.damageMult * 100);
            afterStats.push({
                label: 'DAMAGE SCALING',
                value: `${multVal}%`,
                diff: currentMod?.stats?.damageMult ? `${multVal - Math.round(currentMod.stats.damageMult * 100)}%` : null
            });
        }
        if (candidateMod.stats?.slowDuration) {
            afterStats.push({ label: 'FREEZE RATE', value: `+${candidateMod.stats.freezePerHit || 34}/hit (Freeze @ 100)` });
        }
        if (candidateMod.stats?.poisonDuration) {
            afterStats.push({ label: 'BIO CORROSION', value: `${candidateMod.stats.tickDamage || 3} DPS / ${candidateMod.stats.poisonDuration}s` });
        }
        if (candidateMod.isFusion) {
            afterStats.push({ label: 'SYNERGY NOVA', value: `${candidateMod.stats.novaDamage} Dmg / ${candidateMod.stats.novaRadius}m AoE`, highlight: true });
        }
    }

    return { beforeStats, afterStats };
}

/**
 * Generates 3 curated recalibration choices for a given camp.
 * If the player has Cryo or Bio components, guarantees a fusion choice!
 */
export function generateRecalibrationChoices({
    campId = 'camp-0',
    equippedOverclocks = [],
    equippedRelics = [],
    rerollCount = 0,
    runEntropy = 0
} = {}) {
    // Generate deterministic seed from campId and rerolls
    let hash = 0;
    const str = `${campId}:${rerollCount}:${runEntropy}`;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    const rand = seededRandom(Math.abs(hash) + 1);

    const currentOverclock = equippedOverclocks[0] || null;
    const equippedIds = new Set([
        ...equippedOverclocks.map((o) => (typeof o === 'string' ? o : o?.id)),
        ...equippedRelics.map((r) => (typeof r === 'string' ? r : r?.id))
    ].filter(Boolean));

    const hasCryo = equippedIds.has('cryo_rime') || equippedIds.has('shatter_engine');
    const hasBio = equippedIds.has('caustic_payload') || equippedIds.has('bio_vampirism');
    const eligibleForFusion = hasCryo || hasBio;

    const pool = [...RECALIBRATION_MODS];
    const choices = [];

    // If eligible for fusion, always offer the Sub-Zero Necrosis fusion choice
    if (eligibleForFusion) {
        const fusionMod = pool.find((m) => m.id === 'subzero_necrosis');
        if (fusionMod) {
            const preview = buildStatDiffPreview(currentOverclock, fusionMod);
            choices.push({
                ...fusionMod,
                preview,
                synergyUnlocked: 'subzero_necrosis'
            });
        }
    }

    // Shuffle and pick remaining choices up to 3
    const remaining = pool.filter((m) => !choices.some((c) => c.id === m.id) && m.id !== currentOverclock?.id);
    for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    for (const mod of remaining) {
        if (choices.length >= 3) break;
        const preview = buildStatDiffPreview(currentOverclock, mod);
        choices.push({
            ...mod,
            preview,
            synergyUnlocked: (mod.element === 'cryo' && hasBio) || (mod.element === 'bio' && hasCryo) ? 'subzero_necrosis' : null
        });
    }

    return choices;
}

/**
 * Checks if player can afford the recalibration mod cost.
 */
export function checkRecalibrationAffordability(cost = {}, bank = {}) {
    const missing = [];
    const availableTech = Number(bank.tech ?? bank.scrap) || 0;
    const availableMed = Number(bank.med) || 0;

    if (cost.tech && availableTech < cost.tech) {
        missing.push({ resource: 'tech', need: cost.tech, have: availableTech });
    }
    if (cost.med && availableMed < cost.med) {
        missing.push({ resource: 'med', need: cost.med, have: availableMed });
    }

    return {
        affordable: missing.length === 0,
        missing
    };
}
