# Season 0: Steam Vault Catalog & Itemdef Schema

## 1. Catalog Architecture Overview
Season 0 registers **60 distinct Steam Inventory items** within the `itemdefid` namespace range `4100` to `4159`. All items adhere to Valve's Steam Inventory Service schema, featuring rich descriptions, localized tags, rarity tiers, marketability flags, and asset URL links.

### Rarity Hierarchy & Decryption Probabilities
| Rarity Tier | Color Code | Odds Weight | Drop Chance | Visual Border Style |
| :--- | :--- | :--- | :--- | :--- |
| **Uncommon (Field Spec)** | `#94a3b8` (Slate) | 550 / 1000 | **55.0%** | Subtle grey brushed steel |
| **Rare (Restricted)** | `#00c8ff` (Cyan) | 280 / 1000 | **28.0%** | Cyan neon glow border |
| **Epic (Classified)** | `#a855f7` (Violet) | 120 / 1000 | **12.0%** | Violet pulse with circuit traces |
| **Legendary (Covert Relic)**| `#eab308` (Amber Gold)| 50 / 1000 | **5.0%** | Amber solar flare & holographic shimmer |

---

## 2. Complete 60-Item Catalog Matrix

### Category A: Weapon Skins (Itemdefs 4100–4111)
| Itemdef ID | Name | Rarity | Applicable Weapon | Description |
| :--- | :--- | :--- | :--- | :--- |
| `4100` | Sub-Zero Frostbite Sidearm | Uncommon | Scout Pistol | Cryogenic frost-coated polymer chassis with cooling vents. |
| `4101` | Hazard Stripe SMG | Uncommon | Assault Carbine | High-visibility yellow/black industrial warning livery. |
| `4102` | Tectonic Driller Shotgun | Uncommon | Heavy Breacher | Heavy tungsten barrel with heat-dissipating fluting. |
| `4103` | Cryo-Plasma Railgun | Rare | Sniper / Rail | Superconducting cyan plasma coils wrapped around a carbon frame. |
| `4104` | Rust & Bone Trench Carbine | Rare | Assault Carbine | Weathered bunker salvage with bio-luminescent bone inlays. |
| `4105` | Obsidian Shard Revolver | Rare | Scout Pistol | Polished volcanic glass receiver with Damascus steel cylinder. |
| `4106` | Biolume Spore Sprayer | Rare | Heavy Flamer | Biomechanical tank leaking pulsing green fungal spores. |
| `4107` | Deep Core Melter | Epic | Plasma Lance | Magma-infused reactor core pulsing with orange thermal energy. |
| `4108` | Glitched Circuit Bolter | Epic | Assault Carbine | Holographic animated circuit board flickering with error logs. |
| `4109` | Void-Walker Beam Cannon | Epic | Heavy Beam | Dark matter emitter with purple gravitational event horizon. |
| `4110` | Queen's Carapace Carbine | Legendary | Assault Carbine | Living chitin alloy salvaged from the brood queen's crown. |
| `4111` | Solar Flare Antimatter Rifle | Legendary | Rail Sniper | Pure golden antimatter accelerator with solar particle trail. |

---

### Category B: Player Chassis Armors & Skins (Itemdefs 4112–4119)
| Itemdef ID | Name | Rarity | Class Fit | Visual Spec |
| :--- | :--- | :--- | :--- | :--- |
| `4112` | Sub-Terran Drill Engineer | Uncommon | Engineer | Reinforced heavy hazard plating and visor searchlight. |
| `4113` | Cryo-Vanguard Scout | Uncommon | Scout | Thermal insulated white-camo pressurized stealth suit. |
| `4114` | Trench Warden Heavy | Rare | Heavy | Riveted blast-shield plate armor with gas respirator. |
| `4115` | Void Commando Recon | Rare | Scout | Stealth matte-black nano-weave with purple optic sensor. |
| `4116` | Bio-Synthesizer Medic | Rare | Medic/Support | Biomechanical syringe harness with pulsing fluid tubes. |
| `4117` | Dreadnought Exo-Juggernaut | Epic | Heavy | Heavy hydraulic power-armor with glowing magma core. |
| `4118` | Cyber-Spectre Infiltrator | Epic | Scout | Active-camo holographic shimmer with cybernetic visor. |
| `4119` | Hive-Lord Symbiote Exosuit | Legendary | All Classes | Mutated hybrid armor of living alien carapace and steel. |

---

### Category C: Player Decals & Insignia (Itemdefs 4120–4129)
| Itemdef ID | Name | Rarity | Slot | Description |
| :--- | :--- | :--- | :--- | :--- |
| `4120` | Sub-Zero Pioneer Patch | Uncommon | Shoulder | Commemorative badge of the first subterranean expedition. |
| `4121` | Radiation Trefoil Emblem | Uncommon | Shoulder | Fluorescent radioactive warning emblem. |
| `4122` | Sporesnail Hunter Crest | Uncommon | Shoulder | Stylized shell crest awarded for deep nest purges. |
| `4123` | Bunker 404 Lost Squad Decal | Rare | Shoulder | Memorial badge of the lost seismic surveyor division. |
| `4124` | Cyber-Skull Tactical Pin | Rare | Shoulder | Holographic chrome skull with glowing cyan oculars. |
| `4125` | Cryo-Phoenix Insignia | Rare | Shoulder | Mythic ice bird rising from subterranean permafrost. |
| `4126` | Queen Slayer Gold Seal | Epic | Shoulder | Embossed gold seal celebrating brood queen termination. |
| `4127` | Void Horizon Sigil | Epic | Shoulder | Animated cosmic void circle that distorts ambient light. |
| `4128` | Ancient Core Glyphs | Epic | Shoulder | Archaic alien hieroglyphs found in stratum zero. |
| `4129` | Grand Marshal Relic Crest | Legendary | Shoulder | Crowned double-headed eagle cast in solid meteorite alloy. |

---

### Category D: Tactical Weapon Charms (Itemdefs 4130–4139)
*New Loadout Attachable category! Physical 3D trinkets attached to the weapon chassis receiver.*
| Itemdef ID | Name | Rarity | Charm Mesh Type | Visual Effect / Description |
| :--- | :--- | :--- | :--- | :--- |
| `4130` | Mini Cryo-Core Charm | Uncommon | Glowing Ice Cube | Tiny frosted core venting microscopic cold vapor. |
| `4131` | Spent 50-Cal Casing | Uncommon | Brass Cartridge | Engraved spent casing from the initial bunker breach. |
| `4132` | Sporesnail Pearl | Uncommon | Iridescent Orb | Lustrous biological pearl recovered from a hive queen. |
| `4133` | Trench Whistle | Rare | Steel Whistle | Retro tactical whistle dangling from a dog tag chain. |
| `4134` | Glitched RAM Card | Rare | Green PCB Circuit | Circuit chip with flickering miniature green LED readout. |
| `4135` | Geodetic Compass | Rare | Vintage Brass Compass | Needle spins wildly when pointing toward boss chambers. |
| `4136` | Miniaturized Drone Bobble | Epic | Chibi Sentry Drone | Tiny articulated turret drone with moving search beam. |
| `4137` | Amber Bio-Flask | Epic | Glass Ampoule | Suspended glowing embryo reacting to weapon fire. |
| `4138` | Dark Matter Micro-Singularity | Epic | Graviton Sphere | Miniature black hole with orbiting plasma particles. |
| `4139` | Golden Sub-Bunker Key | Legendary | Solid Gold Skeleton Key | Emits radiant gold god-rays and coin jingling audio. |

---

### Category E: Rig Overclock Modules (Itemdefs 4140–4147)
*Gameplay-affecting tactical mutator modules socketed into the player's chassis rig.*
| Itemdef ID | Name | Rarity | Socket Slot | Tactical Gameplay Modifier |
| :--- | :--- | :--- | :--- | :--- |
| `4140` | Cryo-Capacitor Overclock | Uncommon | Utility Mod | **+8% Cryo Freeze Duration** on elemental attacks. |
| `4141` | Magnetic Scavenger Coil | Uncommon | Utility Mod | **+20% Scrap & Salvage Magnet Pull Radius**. |
| `4142` | Bio-Hazard Filter Vent | Rare | Defensive Mod | **-12% Damage from Spore & Acid Gas Clouds**. |
| `4143` | Kinetic Impact Bushing | Rare | Offensive Mod | **+1 Piercing Penetration** on kinetic weapon rounds. |
| `4144` | Thermal Heat Exchanger | Rare | Offensive Mod | **+10% Faster Shield Recharge Rate** after taking fire. |
| `4145` | Echo-Location Transceiver | Epic | Sensor Mod | **Pings Hidden Rooms & Chests** within 15m radius. |
| `4146` | Symbiotic Adrenaline Pump | Epic | Defensive Mod | **+15% Movement Speed for 4s** upon dropping below 25% HP. |
| `4147` | Zero-Point Flux Overdrive | Legendary | Core Mod | **Killing 5 enemies in 3s refunds 1 Dash/Sprint Charge**. |

---

### Category F: Audio Callout Packs & HUD Mutators (Itemdefs 4148–4153)
| Itemdef ID | Name | Rarity | Category | Effect & Customization |
| :--- | :--- | :--- | :--- | :--- |
| `4148` | Soviet Sub-Commander Radio | Rare | Audio Pack | Gruff military commander tactical voiceover callouts. |
| `4149` | Synthesized AI Unit 'AURA' | Rare | Audio Pack | Calm, analytical female tactical AI combat announcer. |
| `4150` | Amber CRT Monitor Theme | Rare | HUD Theme | Retro 1980s amber phosphorus terminal HUD styling. |
| `4151` | Emerald Radar Phosphor HUD | Rare | HUD Theme | Military night-vision green HUD radar and telemetry. |
| `4152` | Emerald Void Tracer Rounds | Epic | Visual FX | Weapon projectiles emit bright emerald green laser trails. |
| `4153` | Cryo Shockwave Muzzle Flare | Epic | Visual FX | Muzzle blast triggers miniature freezing ice crystal burst. |

---

### Category G: Crafting Reagents & Keys (Itemdefs 4154–4159)
| Itemdef ID | Name | Rarity | Purpose & Utility |
| :--- | :--- | :--- | :--- |
| `4154` | Relic Decryption Key | Rare | Unlocks 1 Deep Relic Cache via the Steam Vault. |
| `4155` | 5x Relic Key Master Pack | Rare | Bundle pack containing 5 Relic Decryption Keys. |
| `4156` | Cryo-Alloy Ingot | Uncommon | Primary seasonal crafting metal for unboxing and forging. |
| `4157` | Deep Sub-Core Matrix | Rare | Concentrated power core used to craft Epic Overclocks. |
| `4158` | Refined Ambergris Catalyst | Epic | Rare biological catalyst required for Legendary skins. |
| `4159` | Deep Core Shard (Token) | Uncommon | Currency awarded from duplicate unboxings (100 shards = any item). |

---

## 3. Steam Inventory Schema JSON Definition Example

```json
{
  "itemdefid": 4130,
  "type": "item",
  "name": "Mini Cryo-Core Charm",
  "description": "Tactical Weapon Charm. A miniature cryogenic reactor core venting sub-zero vapor, clipped directly to your weapon receiver.",
  "icon_url": "https://cdn.hunkerbunker.com/steam/assets/charms/mini_cryo_core.png",
  "icon_url_large": "https://cdn.hunkerbunker.com/steam/assets/charms/mini_cryo_core_large.png",
  "tradable": true,
  "marketable": true,
  "commodity": false,
  "tags": "Type:Tactical Charm;Rarity:Uncommon;Season:Season 0",
  "background_color": "081420",
  "name_color": "94a3b8",
  "drop_interval": 0,
  "use_drop_limit": false
}
```
