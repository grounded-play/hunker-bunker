# Basic & Procedural Icons Replacement Prompt Manifest & Asset Mapping

**Document ID:** `DOC-ICON-REPLACE-2026-09-10`  
**Status:** In-Progress Asset Upgrades  
**Style Standard:** Deep Crust Protocol / Octane Render 3D Game Asset / Studio Lighting  
**Production Resolutions Generated per Item:**
- `public/economy/<slug>.png` ($256 \times 256$ RGBA PNG)
- `public/economy/<slug>_large.png` ($512 \times 512$ RGBA PNG)
- `steam/store/item_icons/<slug>_master.png` ($1254 \times 1254$ RGBA PNG)
- `steam/store/item_icons/chroma/<slug>_chroma.png` ($1254 \times 1254$ Monochrome Silhouette)

---

## 1. Batch 1 Replacements: COMPLETED (7 Items)

The following 7 items have been upgraded from legacy 2D procedural vectors into photorealistic 3D game asset renders across all 4 production resolutions:

| Itemdef | Item Name | File Slug | Category | Resolution & Status |
| :--- | :--- | :--- | :--- | :--- |
| **`4146`** | **Symbiotic Adrenaline Pump** | `mod_symbiotic_adrenaline_pump` | Rig Overclock | ✅ Replaced with 3D Cartridge |
| **`4148`** | **Soviet Sub-Commander Radio** | `voicepack_soviet_commander` | Tactical Audio | ✅ Replaced with 3D Military Radio |
| **`4149`** | **Synthesized AI Unit 'AURA'** | `voicepack_aura` | Tactical Audio | ✅ Replaced with 3D AI Core Orb |
| **`4150`** | **Amber CRT Monitor Theme** | `hudtheme_amber_crt` | HUD Theme | ✅ Replaced with 3D Bunker CRT Monitor |
| **`4151`** | **Emerald Radar Phosphor HUD** | `hudtheme_emerald_radar` | HUD Theme | ✅ Replaced with 3D Sonar Radar Console |
| **`4152`** | **Emerald Void Tracer Rounds** | `fx_emerald_void_tracer` | Projectile Tracer | ✅ Replaced with 3D Ballistic Round (↖) |
| **`4153`** | **Cryo Shockwave Muzzle Flare** | `fx_cryo_shockwave_muzzle` | Muzzle VFX | ✅ Replaced with 3D Cryo Flash Suppressor |

---

## 2. Complete Weapon Master Mapping (3D Models & 2D Icons)

All weapons in the game already have dedicated 3D runtime GLB models in `public/3d/runtime/new3ds/`:

### A. Base Weapons
| Archetype | In-Game Name | 3D Model (`public/3d/runtime/new3ds/`) | 2D Economy Icon | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Scout** | Vector-9 Talon SMG | `gun_scout_vector9_talon.glb` / `gun_scout_talon_c.glb` | `gun_scout_vector9_talon.png` | Complete 3D + Icon |
| **Tank** | Siege-Breaker 50 Autocannon | `gun_tank_siege_breaker50.glb` | `gun_tank_siege_breaker50.png` | Complete 3D + Icon |
| **Engineer** | Tesla-Lock MK-IV Arc Driver | `gun_engineer_tesla_lock.glb` | `gun_engineer_tesla_lock.png` | Complete 3D + Icon |

### B. Season 0 Weapon Skins (Itemdefs 4100–4111)
| Itemdef | Weapon Skin Name | Class | 3D Runtime Mesh (`public/3d/runtime/new3ds/`) | 2D Economy Icon | Icon Fidelity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`4100`** | **Sub-Zero Frostbite Sidearm** | Scout | `skin_scout_frostbite.glb` | `skin_scout_frostbite.png` | 3D Rendered |
| **`4101`** | **Hazard Stripe SMG** | Scout | `skin_hazard_stripe_smg.glb` | `skin_hazard_stripe_smg.png` | 3D Model Exists (Icon upgrade prompt below) |
| **`4102`** | **Tectonic Driller Shotgun** | Tank | `skin_tectonic_driller.glb` | `skin_tectonic_driller.png` | 3D Model Exists (Icon upgrade prompt below) |
| **`4103`** | **Cryo-Plasma Arc Driver** | Engineer | `skin_engineer_cryo_plasma.glb` | `skin_engineer_cryo_plasma.png` | 3D Rendered |
| **`4104`** | **Rust & Bone Trench Carbine** | Scout | `skin_rust_bone_trench.glb` | `skin_rust_bone_trench.png` | 3D Model Exists (Icon upgrade prompt below) |
| **`4105`** | **Obsidian Shard Sidearm** | Scout | `skin_obsidian_shard.glb` | `skin_obsidian_shard.png` | 3D Model Exists (Icon upgrade prompt below) |
| **`4106`** | **Biolume Spore Sprayer** | Tank | `skin_biolume_spore_sprayer.glb` | `skin_biolume_spore_sprayer.png` | 3D Model Exists (Icon upgrade prompt below) |
| **`4107`** | **Deep Core Melter** | Tank | `skin_tank_deep_core_melter.glb` | `skin_tank_deep_core_melter.png` | 3D Rendered |
| **`4108`** | **Glitched Circuit Bolter** | Scout | `skin_glitched_circuit_bolter.glb` | `skin_glitched_circuit_bolter.png` | 3D Model Exists (Icon upgrade prompt below) |
| **`4109`** | **Void-Walker Beam Cannon** | Engineer | `skin_void_walker_beam.glb` | `skin_void_walker_beam.png` | 3D Rendered |
| **`4110`** | **Queen's Carapace Carbine** | Scout | `skin_queen_carapace_carbine.glb` | `skin_queen_carapace_carbine.png` | 3D Rendered |
| **`4111`** | **Solar Flare Antimatter Rifle** | Engineer | `skin_solar_flare_antimatter.glb` | `skin_solar_flare_antimatter.png` | 3D Model Exists (Icon upgrade prompt below) |

### C. Sprint 34 Thematic Weapon Skins (Itemdefs 4201–4236)
| Itemdef | Skin Name | Set | 3D Runtime Mesh | 2D Economy Icon | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`4201`** | Deep Frost Scout Weapon | Deep Frost | `skin_deep_frost.glb` | `skin_deep_frost.png` | 100% Complete |
| **`4208`** | Rust & Bone Tank Weapon | Rust & Bone | `skin_rust_bone.glb` | `skin_rust_bone.png` | 100% Complete |
| **`4215`** | Hive Chitin Engineer Weapon | Hive Chitin | `skin_hive_chitin.glb` | `skin_hive_chitin.png` | 100% Complete |
| **`4222`** | Horizon Corporate Scout Weapon | Horizon Corporate | `skin_horizon_corporate.glb` | `skin_horizon_corporate.png` | 100% Complete |
| **`4229`** | Bunker 404 Tank Weapon | Bunker 404 | `skin_bunker404.glb` | `skin_bunker404.png` | 100% Complete |
| **`4236`** | Grand Marshal Engineer Weapon | Grand Marshal | `skin_grand_marshal.glb` | `skin_grand_marshal.png` | 100% Complete |

---

## 3. Complete Crests, Patches, Decals & Seals Master Mapping

### A. Base Game & Economy Patches
| Itemdef | Crest / Patch Name | File Slug (`public/economy/`) | Type | Visual Status |
| :--- | :--- | :--- | :--- | :--- |
| **`2000`** | **Scout Victory Patch** | `patch_scout` | Patch | Legacy 2D Embroidered |
| **`2001`** | **Tank Victory Patch** | `patch_tank` | Patch | Legacy 2D Embroidered |
| **`2002`** | **Engineer Victory Patch** | `patch_engineer` | Patch | Legacy 2D Embroidered |
| **`2003`** | **Queen Slayer Emblem** | `emblem_queen_slayer` | Emblem | High-Res Emblem Graphic |
| **`2004`** | **Archivist Emblem** | `emblem_archivist` | Emblem | High-Res Emblem Graphic |
| **`2100`** | **Carbon Fiber Decal** | `decal_carbon` | Decal | Carbon Weave Graphic |

### B. Season 0 Player Decals & Crests (Itemdefs 4120–4129)
| Itemdef | Decal / Crest Name | File Slug (`public/economy/`) | Rarity | Current State |
| :--- | :--- | :--- | :--- | :--- |
| **`4120`** | **Sub-Zero Pioneer Patch** | `decal_subzero_pioneer` | Uncommon | Procedural Vector SVG |
| **`4121`** | **Radiation Trefoil Emblem** | `decal_radiation_trefoil` | Uncommon | Procedural Vector SVG |
| **`4122`** | **Sporesnail Hunter Crest** | `decal_sporesnail_hunter_crest` | Uncommon | Procedural Vector SVG |
| **`4123`** | **Bunker 404 Lost Squad Decal** | `decal_bunker404_lost_squad` | Rare | Procedural Vector SVG |
| **`4124`** | **Cyber-Skull Tactical Pin** | `decal_cyber_skull_tactical_pin` | Rare | Procedural Vector SVG |
| **`4125`** | **Cryo-Phoenix Insignia** | `decal_cryo_phoenix` | Rare | Procedural Vector SVG |
| **`4126`** | **Queen Slayer Gold Seal** | `decal_queen_slayer_gold_seal` | Epic | High-Res Embossed Gold Seal |
| **`4127`** | **Void Horizon Sigil** | `decal_void_horizon_sigil` | Epic | Procedural Vector SVG |
| **`4128`** | **Ancient Core Glyphs** | `decal_ancient_core_glyphs` | Epic | Procedural Vector SVG |
| **`4129`** | **Grand Marshal Relic Crest** | `decal_grand_marshal_relic_crest` | Legendary | Procedural Vector SVG |

### C. Sprint 34 Thematic Set Patches (Itemdefs 4203–4238)
| Itemdef | Patch Name | File Slug (`public/economy/`) | Set | Visual Status |
| :--- | :--- | :--- | :--- | :--- |
| **`4203`** | **Deep Frost Patch** | `patch_deep_frost` | Deep Frost | ✅ 100% Complete High-Res |
| **`4210`** | **Rust & Bone Patch** | `patch_rust_bone` | Rust & Bone | ✅ 100% Complete High-Res |
| **`4217`** | **Hive Chitin Patch** | `patch_hive_chitin` | Hive Chitin | ✅ 100% Complete High-Res |
| **`4224`** | **Horizon Corporate Patch** | `patch_horizon_corporate` | Horizon Corporate | ✅ 100% Complete High-Res |
| **`4231`** | **Bunker 404 Patch** | `patch_bunker404` | Bunker 404 | ✅ 100% Complete High-Res |
| **`4238`** | **Grand Marshal Patch** | `patch_grand_marshal` | Grand Marshal | ✅ 100% Complete High-Res |

### D. In-World Environmental Surface Decals (32 Decals in `public/`)
These are ambient decals mapped to floor/wall surfaces via `src/roomThemes.js` and `src/threeGame.js`:
* `decal_biohazard_stencil.png`
* `decal_tallow_herb_cache.png`, `decal_tallow_symbol.png`
* `decal_frost_bloom_1.png`, `decal_frost_bloom_2.png`
* `decal_rust_bleed_1.png`, `decal_rust_bleed_2.png`
* `decal_graffiti_tally_1.png`, `decal_graffiti_tally_2.png`
* `decal_growth_creep_1.png`, `decal_growth_creep_2.png`
* `decal_vine_iron_shadow_1.png`, `decal_vine_iron_shadow_2.png`
* `decal_hand_smears_1.png`, `decal_hand_smears_2.png`
* `decal_grease_pool.png`, `decal_water_stain.png`, `decal_scorch_bloom.png`
* `decal_claw_scratches.png`, `decal_bullet_holes.png`, `decal_wall_breach.png`, `decal_scars.png`
* `decal_hazard_stripes.png`, `decal_emergency_oxygen_nest.png`, `decal_maintenance_shrine.png`
* `decal_worker_sleep_roll.png`, `decal_failed_decon_kit.png`, `decal_pod_312_breach.png`
* `decal_bio_sample_spill.png`, `decal_oil_spill_patch.png`, `decal_footprints_mud.png`, `decal_hive_growth.png`

---

## 4. Outstanding Production Prompts (Queue for Generation)

### Remaining Decals & Crests (Priority 3)

```text
[4120 - Sub-Zero Pioneer Patch]
High-detail 3D game asset render of an embroidered tactical military velcro morale patch floating in empty dark space. Thick stitched navy-blue and slate fabric border, finely stitched silver and cyan mountain peak with two crossed climbing ice axes, realistic fabric weave texture, tactile embroidery thread luster. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4121 - Radiation Trefoil Emblem]
High-detail 3D game asset render of a weathered cast-metal hazard badge floating in empty dark space. Chipped yellow industrial hazard paint over heavy pitted cast iron, deep embossed black radiation trefoil emblem, industrial rivet fasteners in the corners, subtle rust along the edges. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4122 - Sporesnail Hunter Crest]
High-detail 3D game asset render of a hunting veteran crest pin floating in empty dark space. Iridescent polished alien snail shell with glowing emerald and pearl swirls, mounted on a dark gunmetal mechanical claw badge with tiny bioluminescent spore nodes. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4123 - Bunker 404 Lost Squad Decal]
High-detail 3D game asset render of a subterranean military squad memorial medallion floating in empty dark space. Matte-black carbon shield, engraved red hazard warning stripes, a carved industrial drill bit insignia in worn titanium, battle damage scratches and scorched edges. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4124 - Cyber-Skull Tactical Pin]
High-detail 3D game asset render of an aggressive cybernetic skull badge floating in empty dark space. Polished dark chrome skull with faceted carbon-fiber cheekplates, glowing cyan optical sensor lenses with a subtle digital targeting reticle over the left eye, gold connection pins. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4125 - Cryo-Phoenix Insignia]
High-detail 3D game asset render of an ornate ice phoenix emblem floating in empty dark space. Carved translucent glacial blue ice and polished white gold, stylized rising wings with crystalline ice flares and frost vapor wisps. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4127 - Void Horizon Sigil]
High-detail 3D game asset render of an alien cosmic sigil floating in empty dark space. Deep obsidian black core ring with an orbiting distorted violet gravitational accretion disk, pulsing purple energy runes engraved into dark metal. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4128 - Ancient Core Glyphs]
High-detail 3D game asset render of an ancient subterranean alien stone relic tablet floating in empty dark space. Weathered dark basalt slab with deeply carved alien geometric hieroglyphs glowing with pulsing electric-cyan energy from within the stone fissures. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4129 - Grand Marshal Relic Crest]
High-detail 3D game asset render of an imperial military crest floating in empty dark space. Solid antique gold and meteorite iron double-headed eagle emblem, adorned with a regal crown, holding an orbital scepter and power sphere, intricate filigree and polished luster. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

### Remaining Chassis Outfits (Priority 4)

```text
[4112 - Sub-Terran Drill Engineer]
Full-body 3D game character asset render of a heavy industrial subterranean Engineer exosuit floating in empty dark space. Thick hazard-yellow and dark-steel hydraulic blast armor, reinforced chest cage, helmet with an ultra-bright halogen searchlight visor, copper cabling conduits. Studio three-quarter character lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4113 - Cryo-Vanguard Scout]
Full-body 3D game character asset render of a sleek arctic stealth Scout exosuit floating in empty dark space. Pressurized thermal matte-white and ice-blue armored plating, slim aerodynamic silhouette, narrow glowing cyan optical visor slit, utility pouches and magnetic boots. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4114 - Trench Warden Heavy]
Full-body 3D game character asset render of a brutal frontline Tank exosuit floating in empty dark space. Riveted ballistic steel cuirass, heavy twin-canister gas respirator mask, reinforced crimson chest blast shield, heavy hydraulic gauntlets. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4115 - Void Commando Recon]
Full-body 3D game character asset render of a black-ops subterranean recon exosuit floating in empty dark space. Matte-black nano-carbon weave armor with acoustic dampening plates, faceted multi-lens purple night-vision optic cluster on helmet, compact stealth thruster pack. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4116 - Bio-Synthesizer Harness]
Full-body 3D game character asset render of a tactical combat medic support exosuit floating in empty dark space. Worn bone-white ceramic plating, integrated bio-injector harness with glowing emerald and amber medicine vials, flexible rubber tubes feeding into spine injectors. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4117 - Dreadnought Exo-Juggernaut]
Full-body 3D game character asset render of an immense heavy Tank power-armor suit floating in empty dark space. Massive industrial dark-slate armor plates with heavy hydraulic pistons, glowing fiery-orange thermal furnace grate in the chest plate venting heat. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4118 - Cyber-Spectre Infiltrator]
Full-body 3D game character asset render of a cybernetic stealth operative chassis floating in empty dark space. Segmented graphite armor with subtle hexagonal active-camouflage mesh patterns, sleek mirrored cyan cyber-visor, glowing blue circuit traces. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4119 - Hive-Lord Symbiote Exosuit]
Full-body 3D game character asset render of an alien-human hybrid symbiotic power armor floating in empty dark space. Organic iridescent violet chitin plates fused with forged dark steel framing, horned bio-carapace helmet with glowing green multifaceted eyes, pulsing organic vascular conduits. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

### Remaining Weapon Skin Icons (Priority 5)

```text
[4101 - Hazard Stripe SMG]
Full side-profile 3D game asset render of a tactical submachine gun weapon finish floating in empty dark space, muzzle pointing left. High-visibility matte-yellow receiver with sharp diagonal black hazard caution stripes, worn metal edges, Picatinny top rail, tactical grip. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4102 - Tectonic Driller Shotgun]
Full side-profile 3D game asset render of a heavy combat shotgun weapon finish floating in empty dark space, muzzle pointing left. Heavy ribbed tungsten heat shroud, heat-scorched fluted barrel, industrial hydraulic pump slide, tactical iron sights. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4104 - Rust & Bone Trench Carbine]
Full side-profile 3D game asset render of a subterranean trench carbine weapon finish floating in empty dark space, muzzle pointing left. Heavily pitted rusted cast-iron receiver, polished ivory alien bone stock and foregrip with subtle green bioluminescent mineral veins, worn leather cord wrapping. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4105 - Obsidian Shard Sidearm]
Full side-profile 3D game asset render of a heavy magnum revolver weapon finish floating in empty dark space, muzzle pointing left. Polished volcanic obsidian glass frame with razor-sharp beveled edges, folded Damascus steel cylinder, glowing purple micro-fracture veins. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4106 - Biolume Spore Sprayer]
Full side-profile 3D game asset render of a heavy biomechanical chemical sprayer weapon finish floating in empty dark space, muzzle pointing left. Dark corrosion-resistant industrial receiver, twin translucent glass canisters glowing with volatile bubbling emerald spore fluid, ribbed rubber delivery hoses. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4108 - Glitched Circuit Bolter]
Full side-profile 3D game asset render of a high-tech combat rifle weapon finish floating in empty dark space, muzzle pointing left. Translucent smoky polymer receiver revealing glowing green exposed circuit boards with flickering holographic error glitches and digital diagnostic readouts. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.

[4111 - Solar Flare Antimatter Rifle]
Full side-profile 3D game asset render of an ultra-legendary antimatter precision rifle floating in empty dark space, muzzle pointing left. Polished white ceramic and solid gold filigree frame, exposed central magnetic containment chamber containing a miniature blazing yellow-white sun plasma core with corona flares. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```
