/**
 * Beta Season 1: Deep Crust Protocol — Canonical 24 Featured Cosmetics
 *
 * Source of truth: docs/hunker-bunker-beta-season-1-plan.md §4, §6.
 *
 * Featured Launch Pool: 24 cosmetic definitions:
 * - 9 fixed Free-track cosmetics + 1 choice from 3 class chassis at Rank 15 (4112 / 4113 / 4114)
 * - 9 Classified Dossier (Paid) milestone cosmetics + instant grant (4101)
 * - 2 Deterministic Workshop outputs (2100 Carbon Fiber Decal, 2200 Chrome Plated Sidearm)
 */

import { STEAM_ITEM_CATALOG } from './steamItemCatalog.js';
import { ARMORY_PREVIEWS } from './armoryPreviews.js';

const placements = [
    // ── Free Track Cosmetics ──
    {
        itemdefid: 4120,
        name: 'Sub-Zero Pioneer Patch',
        category: 'decal',
        track: 'free',
        rank: 1,
        rarity: 'uncommon',
        compatibility: 'all',
        desc: 'Commemorative badge of the first subterranean expedition.',
        localImg: '/economy/decal_subzero_pioneer.png'
    },
    {
        itemdefid: 4130,
        name: 'Mini Cryo-Core Charm',
        category: 'charm',
        track: 'free',
        rank: 3,
        rarity: 'rare',
        compatibility: 'all',
        desc: 'A suspended cryo-coolant cell that rattles softly in motion.',
        localImg: '/economy/charm_mini_cryo_core.png'
    },
    {
        itemdefid: 4100,
        name: 'Sub-Zero Frostbite Sidearm',
        category: 'weapon_finish',
        track: 'free',
        rank: 6,
        rarity: 'rare',
        compatibility: 'mk1_sidearm',
        desc: 'Frosted cerakote sidearm finish from the initial ice-shelf breach.',
        localImg: '/economy/finish_subzero_frostbite.png'
    },
    {
        itemdefid: 4122,
        name: 'Sporesnail Hunter Crest',
        category: 'decal',
        track: 'free',
        rank: 9,
        rarity: 'uncommon',
        compatibility: 'all',
        desc: 'Stylized shell crest awarded for deep nest purges.',
        localImg: '/economy/decal_sporesnail_hunter_crest.png'
    },
    {
        itemdefid: 4132,
        name: 'Sporesnail Pearl Charm',
        category: 'charm',
        track: 'free',
        rank: 12,
        rarity: 'rare',
        compatibility: 'all',
        desc: 'Iridescent pearl harvested from an apex bio-shell.',
        localImg: '/economy/charm_sporesnail_pearl.png'
    },
    // Rank 15 Class Choices (Player selects one upon reaching Rank 15)
    {
        itemdefid: 4112,
        name: 'Sub-Terran Drill Engineer',
        category: 'chassis',
        track: 'free',
        rank: 15,
        rarity: 'epic',
        compatibility: 'ENGINEER',
        desc: 'Heavy reinforced chassis engineered for trench drilling and turret defense.',
        localImg: '/economy/chassis_subterran_drill.png'
    },
    {
        itemdefid: 4113,
        name: 'Cryo-Vanguard Scout',
        category: 'chassis',
        track: 'free',
        rank: 15,
        rarity: 'epic',
        compatibility: 'SCOUT',
        desc: 'Thermal-insulated high-mobility recon chassis built for zero-degree sprints.',
        localImg: '/economy/chassis_cryo_vanguard.png'
    },
    {
        itemdefid: 4114,
        name: 'Trench Warden Heavy',
        category: 'chassis',
        track: 'free',
        rank: 15,
        rarity: 'epic',
        compatibility: 'TANK',
        desc: 'Blast-shielded vanguard chassis rated for point-blank seismic breach.',
        localImg: '/economy/chassis_trench_warden.png'
    },
    {
        itemdefid: 4104,
        name: 'Rust & Bone Trench Carbine',
        category: 'weapon_finish',
        track: 'free',
        rank: 18,
        rarity: 'rare',
        compatibility: 'trench_carbine',
        desc: 'Scavenged chitin plate and oxidized alloy carbine finish.',
        localImg: '/economy/finish_rust_and_bone.png'
    },
    {
        itemdefid: 4135,
        name: 'Geodetic Compass Charm',
        category: 'charm',
        track: 'free',
        rank: 21,
        rarity: 'rare',
        compatibility: 'all',
        desc: 'Magnetic heading needle gimballed for sub-crust exploration.',
        localImg: '/economy/charm_geodetic_compass.png'
    },
    {
        itemdefid: 4125,
        name: 'Cryo-Phoenix Insignia',
        category: 'decal',
        track: 'free',
        rank: 25,
        rarity: 'rare',
        compatibility: 'all',
        desc: 'Emblem honoring operators who survived absolute zero breach.',
        localImg: '/economy/decal_cryo_phoenix.png'
    },
    {
        itemdefid: 4110,
        name: "Queen's Carapace Carbine",
        category: 'weapon_finish',
        track: 'free',
        rank: 30,
        rarity: 'legendary',
        compatibility: 'trench_carbine',
        desc: 'Carved chitin carbine housing from the deep hive matriarch.',
        localImg: '/economy/finish_queens_carapace.png'
    },

    // ── Classified Dossier (Paid Track) Cosmetics ──
    {
        itemdefid: 4101,
        name: 'Hazard Stripe SMG',
        category: 'weapon_finish',
        track: 'premium',
        rank: 'purchase',
        rarity: 'rare',
        compatibility: 'scatter_repeater',
        desc: 'High-visibility industrial hazard pattern for rapid-fire CQB weapon.',
        localImg: '/economy/finish_hazard_stripe.png'
    },
    {
        itemdefid: 4121,
        name: 'Radiation Trefoil Emblem',
        category: 'decal',
        track: 'premium',
        rank: 3,
        rarity: 'uncommon',
        compatibility: 'all',
        desc: 'Fluorescent radioactive warning emblem.',
        localImg: '/economy/decal_radiation_trefoil.png'
    },
    {
        itemdefid: 4131,
        name: 'Spent 50-Cal Casing Charm',
        category: 'charm',
        track: 'premium',
        rank: 6,
        rarity: 'uncommon',
        compatibility: 'all',
        desc: 'Fired heavy anti-materiel cartridge stamped with bunker lot code.',
        localImg: '/economy/charm_spent_50cal.png'
    },
    {
        itemdefid: 4103,
        name: 'Cryo-Plasma Arc Driver',
        category: 'weapon_finish',
        track: 'premium',
        rank: 9,
        rarity: 'rare',
        compatibility: 'arc_driver',
        desc: 'Superconducting finish with visible frost discharge along the emitter coils.',
        localImg: '/economy/finish_cryo_plasma.png'
    },
    {
        itemdefid: 4124,
        name: 'Cyber-Skull Tactical Pin',
        category: 'decal',
        track: 'premium',
        rank: 12,
        rarity: 'rare',
        compatibility: 'all',
        desc: 'Chrome skull emblem with optical sensor nodes.',
        localImg: '/economy/decal_cyber_skull.png'
    },
    {
        itemdefid: 4116,
        name: 'Bio-Synthesizer Harness',
        category: 'chassis',
        track: 'premium',
        rank: 15,
        rarity: 'epic',
        compatibility: 'ENGINEER',
        desc: 'Engineer rig enhancement with integrated nutrient recycler tubing.',
        localImg: '/economy/chassis_bio_synthesizer.png'
    },
    {
        itemdefid: 4134,
        name: 'Glitched RAM Card Charm',
        category: 'charm',
        track: 'premium',
        rank: 18,
        rarity: 'rare',
        compatibility: 'all',
        desc: 'Corrupted memory stick with fluttering diagnostic LED.',
        localImg: '/economy/charm_glitched_ram.png'
    },
    {
        itemdefid: 4115,
        name: 'Void Commando Recon',
        category: 'chassis',
        track: 'premium',
        rank: 21,
        rarity: 'epic',
        compatibility: 'SCOUT',
        desc: 'Stealth-coated scout suit designed for radar-silent perimeter recon.',
        localImg: '/economy/chassis_void_commando.png'
    },
    {
        itemdefid: 4138,
        name: 'Dark Matter Micro-Singularity Charm',
        category: 'charm',
        track: 'premium',
        rank: 25,
        rarity: 'legendary',
        compatibility: 'all',
        desc: 'Magnetic confinement sphere holding a microscopic event horizon.',
        localImg: '/economy/charm_dark_matter.png'
    },
    {
        itemdefid: 4119,
        name: 'Hive-Lord Symbiote Exosuit',
        category: 'chassis',
        track: 'premium',
        rank: 30,
        rarity: 'legendary',
        compatibility: 'TANK',
        desc: 'Living carapace armor grafted directly into the operator neural harness.',
        localImg: '/economy/chassis_hive_lord_symbiote.png'
    },

    // ── Deterministic Relic Fragment Workshop Outputs ──
    {
        itemdefid: 2100,
        name: 'Carbon Fiber Decal',
        category: 'decal',
        track: 'workshop',
        rank: 'workshop',
        rarity: 'rare',
        compatibility: 'all',
        desc: 'A high-performance weave finish for your exosuit. Cosmetic equip.',
        localImg: '/economy/decal_carbon.png',
        recipe: {
            commonFragments: 5,
            rareFragments: 0
        }
    },
    {
        itemdefid: 2200,
        name: 'Chrome Plated Sidearm',
        category: 'weapon_finish',
        track: 'workshop',
        rank: 'workshop',
        rarity: 'epic',
        compatibility: 'mk1_sidearm',
        desc: 'Polished high-reflectivity chrome finish for the standard sidearm. Cosmetic equip.',
        localImg: '/economy/finish_chrome.png',
        recipe: {
            commonFragments: 10,
            rareFragments: 2
        }
    }
];

const COMPATIBILITY = { 4100: 'talon', 4101: 'talon_c', 4103: 'tesla_lock', 4104: 'talon_c', 4110: 'talon_c', 2200: 'talon' };
export const SEASON_ONE_COSMETICS = Object.freeze(placements.map(placement => Object.freeze({
    ...placement,
    ...STEAM_ITEM_CATALOG[placement.itemdefid],
    compatibility: COMPATIBILITY[placement.itemdefid] ?? placement.compatibility,
    preview: ARMORY_PREVIEWS[placement.itemdefid] ?? null,
    ownershipRule: 'cosmetic-only; base equipment is separate'
})));

export const SEASON_ONE_CLASS_CHOICES = Object.freeze([4112, 4113, 4114]);

const COSMETICS_BY_ID = new Map(SEASON_ONE_COSMETICS.map((item) => [item.itemdefid, item]));

export function getSeasonOneCosmetic(itemdefid) {
    return COSMETICS_BY_ID.get(Number(itemdefid)) ?? null;
}

export function isValidSeasonOneCosmetic(itemdefid) {
    return COSMETICS_BY_ID.has(Number(itemdefid));
}

export function getSeasonOneCatalog() {
    return [...SEASON_ONE_COSMETICS];
}
