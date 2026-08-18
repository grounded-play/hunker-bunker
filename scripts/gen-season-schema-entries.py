#!/usr/bin/env python3
"""One-off generator: builds the 60 Season 0 itemdef entries (4100-4159) and
splices them into steam/inventory_schema_hunker_bunker.json, right after 4001.
Scoped deliberately: registers items for visibility/equip-ability only — does
NOT touch DEEP_RELIC_CACHE_DROP_TABLE or itemdef 4002's resolver bundle (real
loot-drop odds are a fair-play/compliance decision per doc 01, left for an
explicit follow-up, not something to set unilaterally here).
Run once, then delete. Not part of the regular build pipeline.
"""
import json

RARITY_COLORS = {
    'uncommon': ('94a3b8', '1e293b'),
    'rare': ('00c8ff', '0c4a6e'),
    'epic': ('a855f7', '581c87'),
    'legendary': ('eab308', '78350f'),
}

# (itemdefid, name, description, rarity, item_slot, slot_tag, class_tag, icon_slug, marketable)
ITEMS = [
    # A. Weapon Skins
    (4100, "Sub-Zero Frostbite Sidearm", "Cryogenic frost-coated polymer chassis with cooling vents.", 'uncommon', 'CosmeticWeapon', 'weapon_finish', 'scout', 'skin_scout_frostbite', True),
    (4101, "Hazard Stripe SMG", "High-visibility yellow/black industrial warning livery.", 'uncommon', 'CosmeticWeapon', 'weapon_finish', 'scout', 'skin_hazard_stripe_smg', True),
    (4102, "Tectonic Driller Shotgun", "Heavy tungsten barrel with heat-dissipating fluting.", 'uncommon', 'CosmeticWeapon', 'weapon_finish', 'tank', 'skin_tectonic_driller', True),
    (4103, "Cryo-Plasma Arc Driver", "Superconducting cyan plasma coils wrapped around the Tesla-Lock's arc driver frame.", 'rare', 'CosmeticWeapon', 'weapon_finish', 'engineer', 'skin_engineer_cryo_plasma', True),
    (4104, "Rust & Bone Trench Carbine", "Weathered bunker salvage with bio-luminescent bone inlays.", 'rare', 'CosmeticWeapon', 'weapon_finish', 'scout', 'skin_rust_bone_trench', True),
    (4105, "Obsidian Shard Revolver", "Polished volcanic glass receiver with Damascus steel cylinder.", 'rare', 'CosmeticWeapon', 'weapon_finish', 'scout', 'skin_obsidian_shard', True),
    (4106, "Biolume Spore Sprayer", "Biomechanical tank leaking pulsing green fungal spores.", 'rare', 'CosmeticWeapon', 'weapon_finish', 'tank', 'skin_biolume_spore_sprayer', True),
    (4107, "Deep Core Melter", "Magma-infused reactor core pulsing with orange thermal energy.", 'epic', 'CosmeticWeapon', 'weapon_finish', 'engineer', 'skin_tank_deep_core_melter', True),
    (4108, "Glitched Circuit Bolter", "Holographic animated circuit board flickering with error logs.", 'epic', 'CosmeticWeapon', 'weapon_finish', 'scout', 'skin_glitched_circuit_bolter', True),
    (4109, "Void-Walker Beam Cannon", "Dark matter emitter with purple gravitational event horizon.", 'epic', 'CosmeticWeapon', 'weapon_finish', 'engineer', 'skin_void_walker_beam', True),
    (4110, "Queen's Carapace Carbine", "Living chitin alloy salvaged from the brood queen's crown.", 'legendary', 'CosmeticWeapon', 'weapon_finish', 'scout', 'skin_queen_carapace_carbine', True),
    (4111, "Solar Flare Antimatter Rifle", "Pure golden antimatter accelerator with solar particle trail.", 'legendary', 'CosmeticWeapon', 'weapon_finish', 'engineer', 'skin_solar_flare_antimatter', True),
    # B. Chassis Armors & Skins
    (4112, "Sub-Terran Drill Engineer", "Reinforced heavy hazard plating and visor searchlight.", 'uncommon', 'CosmeticChassis', 'chassis_skin', 'engineer', 'chassis_subterran_drill_engineer', True),
    (4113, "Cryo-Vanguard Scout", "Thermal insulated white-camo pressurized stealth suit.", 'uncommon', 'CosmeticChassis', 'chassis_skin', 'scout', 'chassis_cryo_vanguard_scout', True),
    (4114, "Trench Warden Heavy", "Riveted blast-shield plate armor with gas respirator.", 'rare', 'CosmeticChassis', 'chassis_skin', 'tank', 'chassis_trench_warden_heavy', True),
    (4115, "Void Commando Recon", "Stealth matte-black nano-weave with purple optic sensor.", 'rare', 'CosmeticChassis', 'chassis_skin', 'scout', 'chassis_void_commando_recon', True),
    (4116, "Bio-Synthesizer Harness", "Biomechanical syringe harness with pulsing fluid tubes. Chassis skins equip via LoadoutManager's single global suit slot (src/loadout.js `suit.chassisSkinId`, not per-class) — no class restriction needed, so the earlier 'Medic class' framing (there is no Medic class; roster is locked to Scout/Tank/Engineer per doc 07 §1) never actually blocked this item.", 'rare', 'CosmeticChassis', 'chassis_skin', 'all', 'chassis_bio_synthesizer_medic', True),
    (4117, "Dreadnought Exo-Juggernaut", "Heavy hydraulic power-armor with glowing magma core.", 'epic', 'CosmeticChassis', 'chassis_skin', 'tank', 'chassis_dreadnought_exo_juggernaut', True),
    (4118, "Cyber-Spectre Infiltrator", "Active-camo holographic shimmer with cybernetic visor.", 'epic', 'CosmeticChassis', 'chassis_skin', 'scout', 'chassis_cyber_spectre_infiltrator', True),
    (4119, "Hive-Lord Symbiote Exosuit", "Mutated hybrid armor of living alien carapace and steel.", 'legendary', 'CosmeticChassis', 'chassis_skin', 'all', 'chassis_hive_lord_symbiote', True),
    # C. Decals & Insignia
    (4120, "Sub-Zero Pioneer Patch", "Commemorative badge of the first subterranean expedition.", 'uncommon', 'CosmeticDecal', 'decal', 'all', 'decal_subzero_pioneer', True),
    (4121, "Radiation Trefoil Emblem", "Fluorescent radioactive warning emblem.", 'uncommon', 'CosmeticDecal', 'decal', 'all', 'decal_radiation_trefoil', True),
    (4122, "Sporesnail Hunter Crest", "Stylized shell crest awarded for deep nest purges.", 'uncommon', 'CosmeticDecal', 'decal', 'all', 'decal_sporesnail_hunter_crest', True),
    (4123, "Bunker 404 Lost Squad Decal", "Memorial badge of the lost seismic surveyor division.", 'rare', 'CosmeticDecal', 'decal', 'all', 'decal_bunker404_lost_squad', True),
    (4124, "Cyber-Skull Tactical Pin", "Holographic chrome skull with glowing cyan oculars.", 'rare', 'CosmeticDecal', 'decal', 'all', 'decal_cyber_skull_tactical_pin', True),
    (4125, "Cryo-Phoenix Insignia", "Mythic ice bird rising from subterranean permafrost.", 'rare', 'CosmeticDecal', 'decal', 'all', 'decal_cryo_phoenix', True),
    (4126, "Queen Slayer Gold Seal", "Embossed gold seal celebrating brood queen termination.", 'epic', 'CosmeticDecal', 'decal', 'all', 'emblem_queen_slayer', True),
    (4127, "Void Horizon Sigil", "Animated cosmic void circle that distorts ambient light.", 'epic', 'CosmeticDecal', 'decal', 'all', 'decal_void_horizon_sigil', True),
    (4128, "Ancient Core Glyphs", "Archaic alien hieroglyphs found in stratum zero.", 'epic', 'CosmeticDecal', 'decal', 'all', 'decal_ancient_core_glyphs', True),
    (4129, "Grand Marshal Relic Crest", "Crowned double-headed eagle cast in solid meteorite alloy.", 'legendary', 'CosmeticDecal', 'decal', 'all', 'decal_grand_marshal_relic_crest', True),
    # D. Tactical Weapon Charms
    (4130, "Mini Cryo-Core Charm", "Tiny frosted core venting microscopic cold vapor.", 'uncommon', 'CosmeticCharm', 'weapon_charm', 'all', 'charm_mini_cryo_core', True),
    (4131, "Spent 50-Cal Casing", "Engraved spent casing from the initial bunker breach.", 'uncommon', 'CosmeticCharm', 'weapon_charm', 'all', 'charm_spent_50cal', True),
    (4132, "Sporesnail Pearl", "Lustrous biological pearl recovered from a hive queen.", 'uncommon', 'CosmeticCharm', 'weapon_charm', 'all', 'charm_sporesnail_pearl', True),
    (4133, "Trench Whistle", "Retro tactical whistle dangling from a dog tag chain.", 'rare', 'CosmeticCharm', 'weapon_charm', 'all', 'charm_trench_whistle', True),
    (4134, "Glitched RAM Card", "Circuit chip with flickering miniature green LED readout.", 'rare', 'CosmeticCharm', 'weapon_charm', 'all', 'charm_glitched_ram', True),
    (4135, "Geodetic Compass", "Needle spins wildly when pointing toward boss chambers.", 'rare', 'CosmeticCharm', 'weapon_charm', 'all', 'charm_geodetic_compass', True),
    (4136, "Miniaturized Drone Bobble", "Tiny articulated turret drone with moving search beam.", 'epic', 'CosmeticCharm', 'weapon_charm', 'all', 'charm_mini_drone_bobble', True),
    (4137, "Amber Bio-Flask", "Suspended glowing embryo reacting to weapon fire.", 'epic', 'CosmeticCharm', 'weapon_charm', 'all', 'charm_amber_bio_flask', True),
    (4138, "Dark Matter Micro-Singularity", "Miniature black hole with orbiting plasma particles.", 'epic', 'CosmeticCharm', 'weapon_charm', 'all', 'charm_dark_matter', True),
    (4139, "Golden Sub-Bunker Key", "Emits radiant gold god-rays and coin jingling audio.", 'legendary', 'CosmeticCharm', 'weapon_charm', 'all', 'charm_golden_sub_bunker_key', True),
    # E. Rig Overclock Modules (gameplay-affecting)
    (4140, "Cryo-Capacitor Overclock", "+8% Cryo Freeze Duration on elemental attacks.", 'uncommon', 'GameplayModule', 'rig_overclock', 'all', 'mod_cryo_capacitor', True),
    (4141, "Magnetic Scavenger Coil", "+20% Scrap & Salvage Magnet Pull Radius.", 'uncommon', 'GameplayModule', 'rig_overclock', 'all', 'mod_magnetic_scavenger', True),
    (4142, "Bio-Hazard Filter Vent", "-12% Damage from Spore & Acid Gas Clouds.", 'rare', 'GameplayModule', 'rig_overclock', 'all', 'mod_bio_hazard_filter', True),
    (4143, "Kinetic Impact Bushing", "+1 Piercing Penetration on kinetic weapon rounds.", 'rare', 'GameplayModule', 'rig_overclock', 'all', 'mod_kinetic_impact', True),
    (4144, "Thermal Heat Exchanger", "+10% Faster Shield Recharge Rate after taking fire.", 'rare', 'GameplayModule', 'rig_overclock', 'all', 'mod_thermal_heat_exchanger', True),
    (4145, "Echo-Location Transceiver", "Pings hidden rooms & chests within 15m radius.", 'epic', 'GameplayModule', 'rig_overclock', 'all', 'mod_echo_location_transceiver', True),
    (4146, "Symbiotic Adrenaline Pump", "+15% Movement Speed for 4s upon dropping below 25% HP.", 'epic', 'GameplayModule', 'rig_overclock', 'all', 'mod_symbiotic_adrenaline_pump', True),
    (4147, "Zero-Point Flux Overdrive", "Killing 5 enemies in 3s refunds 1 Dash/Sprint Charge.", 'legendary', 'GameplayModule', 'rig_overclock', 'all', 'mod_zero_point_flux', True),
    # F. Audio Callout Packs & HUD Mutators
    (4148, "Soviet Sub-Commander Radio", "Gruff military commander tactical voiceover callouts.", 'rare', 'CosmeticAudio', 'voice_pack', 'all', 'voicepack_soviet_commander', True),
    (4149, "Synthesized AI Unit 'AURA'", "Calm, analytical female tactical AI combat announcer.", 'rare', 'CosmeticAudio', 'voice_pack', 'all', 'voicepack_aura', True),
    (4150, "Amber CRT Monitor Theme", "Retro 1980s amber phosphorus terminal HUD styling.", 'rare', 'CosmeticHUD', 'hud_theme', 'all', 'hudtheme_amber_crt', True),
    (4151, "Emerald Radar Phosphor HUD", "Military night-vision green HUD radar and telemetry.", 'rare', 'CosmeticHUD', 'hud_theme', 'all', 'hudtheme_emerald_radar', True),
    (4152, "Emerald Void Tracer Rounds", "Weapon projectiles emit bright emerald green laser trails.", 'epic', 'CosmeticFX', 'tracer_fx', 'all', 'fx_emerald_void_tracer', True),
    (4153, "Cryo Shockwave Muzzle Flare", "Muzzle blast triggers a miniature freezing ice crystal burst.", 'epic', 'CosmeticFX', 'muzzle_fx', 'all', 'fx_cryo_shockwave_muzzle', True),
    # G. Crafting Reagents & Keys
    (4154, "Relic Decryption Key (Earned)", "Unlocks 1 Deep Relic Cache via the Steam Vault. Earned for free through Deep Core Shard dispensary trade-in (docs/season-zero-protocol/05 §4) — the F2P-earned counterpart to itemdef 4001's paid Cache Key, not a duplicate; 4001 is purchase-only and never drops free.", 'rare', 'Key', 'cache_key', 'all', 'cache_key', False),
    (4155, "5x Relic Key Master Pack", "Bundle pack containing 5 Relic Decryption Keys.", 'rare', 'Bundle', 'reagent', 'all', 'reagent_relic_key_master_pack', True),
    (4156, "Cryo-Alloy Ingot", "Primary seasonal crafting metal for unboxing and forging.", 'uncommon', 'Material', 'reagent', 'all', 'reagent_cryo_alloy_ingot', False),
    (4157, "Deep Sub-Core Matrix", "Concentrated power core used to craft Epic Overclocks.", 'rare', 'Material', 'reagent', 'all', 'reagent_deep_sub_core_matrix', False),
    (4158, "Refined Ambergris Catalyst", "Rare biological catalyst required for Legendary skins.", 'epic', 'Material', 'reagent', 'all', 'reagent_refined_ambergris', False),
    (4159, "Deep Core Shard (Token)", "Currency awarded from duplicate unboxings (100 shards = any item).", 'uncommon', 'Material', 'reagent', 'all', 'reagent_deep_core_shard', False),
]

BASE = "https://hunkerbunker.netlify.app/economy/"

def build_entry(itemdefid, name, desc, rarity, item_slot, slot_tag, class_tag, slug, marketable):
    name_color, bg_color = RARITY_COLORS[rarity]
    return {
        "itemdefid": itemdefid,
        "type": "item",
        "name": name,
        "name_english": name,
        "description": desc,
        "description_english": desc,
        "icon_url": f"{BASE}{slug}.png",
        "icon_url_large": f"{BASE}{slug}_large.png",
        "background_color": bg_color,
        "name_color": name_color,
        "tradable": True,
        "marketable": marketable,
        "item_slot": item_slot,
        "tags": f"rarity:{rarity};class:{class_tag};slot:{slot_tag};season:0",
    }

# Only itemdefs with a full, verified compliant asset set (local/large/master/chroma —
# see scripts/audit-steam-inventory-assets.js) get registered. Registering an item without
# real production art fails that audit's PNG/size/RGBA checks, which is part of the test
# suite — so the other 38 season itemdefs stay unregistered until their art lands, matching
# docs/season-zero-protocol/08-asset-audit-and-gaps.md's honest current-state accounting.
# Itemdef 4154 vs 4001 conflict (docs/season-zero-protocol/08-asset-audit-and-gaps.md §4,
# item 3) is resolved: they're intentionally distinct SKUs, not a duplicate — 4001 is the
# purchase-only Cache Key (never drops free), 4154 is the F2P-earned counterpart from the
# Deep Core Shard dispensary (doc 05 §4). Both reuse the same compliant `cache_key` art
# (same physical key, different acquisition path), so 4154 is now registered too.
# All 60 Season 0 itemdefs (4100-4159) now have a full, verified compliant asset set
# (local/large/master/chroma) on disk satisfying scripts/audit-steam-inventory-assets.js.
COMPLIANT_ITEMDEFS = set(range(4100, 4160))


def main():
    path = "steam/inventory_schema_hunker_bunker.json"
    with open(path) as f:
        data = json.load(f)

    existing_ids = {it["itemdefid"] for it in data["items"]}
    eligible = [row for row in ITEMS if row[0] in COMPLIANT_ITEMDEFS]
    new_entries = [build_entry(*row) for row in eligible if row[0] not in existing_ids]
    skipped = [row[0] for row in eligible if row[0] in existing_ids]
    if skipped:
        print(f"Skipped already-present itemdefs: {skipped}")

    # Insert right after 4001, before 4002 (the internal resolver), preserving order.
    insert_at = next(i for i, it in enumerate(data["items"]) if it["itemdefid"] == 4002)
    data["items"][insert_at:insert_at] = new_entries

    with open(path, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")

    print(f"Inserted {len(new_entries)} new itemdefs (4100-4159 range).")

if __name__ == "__main__":
    main()
