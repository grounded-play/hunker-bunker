# 3D Skin and Weapon Reference Bible — 2026-08-20

This document cross-references existing 2D catalog assets (`public/economy/`), existing 3D runtime models (`public/3d/runtime/new3ds/`), and provides turnaround design blueprints for the 2-per-class weapons and 2-per-class chassis skins to be modeled in 3D.

---

## 1. Existing Asset Cross-Reference & 3D Conversion Targets

### A. Class Weapons & Skins

| Itemdef | Name | Class | 2D Icon on Disk | 3D Model Status | 3D GLB Target Path |
|---|---|---|---|---|---|
| **4100** | Sub-Zero Frostbite | Scout | ✅ `skin_scout_frostbite.png` | ✅ Exists | `public/3d/runtime/new3ds/skin_scout_frostbite.glb` |
| **4105** | Obsidian Shard | Scout | ✅ `skin_obsidian_shard.png` | ⬜ **Awaiting 3D** | `public/3d/runtime/new3ds/skin_obsidian_shard.glb` |
| **4101** | Hazard Stripe SMG | Scout | ✅ `skin_hazard_stripe_smg.png` | ⬜ **Awaiting 3D** | `public/3d/runtime/new3ds/skin_hazard_stripe_smg.glb` |
| **4107** | Deep Core Melter | Tank/Eng | ✅ `skin_tank_deep_core_melter.png` | ✅ Exists | `public/3d/runtime/new3ds/skin_tank_deep_core_melter.glb` |
| **4102** | Tectonic Driller | Tank | ✅ `skin_tectonic_driller.png` | ⬜ **Awaiting 3D** | `public/3d/runtime/new3ds/skin_tectonic_driller.glb` |
| **4106** | Biolume Spore Sprayer | Tank | ✅ `skin_biolume_spore_sprayer.png` | ⬜ **Awaiting 3D** | `public/3d/runtime/new3ds/skin_biolume_spore_sprayer.glb` |
| **4103** | Cryo-Plasma Arc | Engineer | ✅ `skin_engineer_cryo_plasma.png` | ✅ Exists | `public/3d/runtime/new3ds/skin_engineer_cryo_plasma.glb` |
| **4108** | Glitched Circuit Bolter | Engineer | ✅ `skin_glitched_circuit_bolter.png` | ⬜ **Awaiting 3D** | `public/3d/runtime/new3ds/skin_glitched_circuit_bolter.glb` |
| **4111** | Solar Flare Antimatter | Engineer | ✅ `skin_solar_flare_antimatter.png` | ⬜ **Awaiting 3D** | `public/3d/runtime/new3ds/skin_solar_flare_antimatter.glb` |

---

### B. Class Exosuit Chassis Skins

All 8 chassis skins have 2D artwork in `public/economy/` and are registered in `steamItemCatalog.js`. The target 3D models will map to `src/armoryScene.js` and `src/player3dOverlay.js`:

| Itemdef | Name | Class | 2D Icon on Disk | 3D Target Path | Base Skeleton |
|---|---|---|---|---|---|
| **4113** | Cryo-Vanguard Scout | Scout | ✅ `chassis_cryo_vanguard_scout.png` | `public/3d/runtime/new3ds/chassis_cryo_vanguard_scout.glb` | `Scout.game.glb` |
| **4118** | Cyber-Spectre Infiltrator | Scout | ✅ `chassis_cyber_spectre_infiltrator.png` | `public/3d/runtime/new3ds/chassis_cyber_spectre_infiltrator.glb` | `Scout.game.glb` |
| **4114** | Trench Warden Heavy | Tank | ✅ `chassis_trench_warden_heavy.png` | `public/3d/runtime/new3ds/chassis_trench_warden_heavy.glb` | `tank-rigged.glb` |
| **4117** | Dreadnought Exo-Juggernaut | Tank | ✅ `chassis_dreadnought_exo_juggernaut.png` | `public/3d/runtime/new3ds/chassis_dreadnought_exo_juggernaut.glb` | `tank-rigged.glb` |
| **4112** | Sub-Terran Drill Engineer | Engineer | ✅ `chassis_subterran_drill_engineer.png` | `public/3d/runtime/new3ds/chassis_subterran_drill_engineer.glb` | `engineer-rigged-gestures.glb` |
| **4116** | Bio-Synthesizer Harness | Engineer | ✅ `chassis_bio_synthesizer_medic.png` | `public/3d/runtime/new3ds/chassis_bio_synthesizer_medic.glb` | `engineer-rigged-gestures.glb` |

---

## 2. Detailed 3D Modeling Reference Specifications

### 🎯 Group 1: Scout Weapons & Chassis

#### 1. Weapon: **Obsidian Shard Carbine (`4105`)**
* **Base Archetype**: `talon_c` (Carbine)
* **Form & Geometry**: Angular, stealth-faceted hard-surface chassis. Hexagonal barrel shroud with longitudinal cooling vents.
* **Materials**: Ultra-dark reflective obsidian composite (`roughness: 0.2`, `metalness: 0.85`) with etched gold/amber micro-circuit traces (`emissive: #ff9f1c`).
* **Attachments**: Integrated reflex optical sight with cyan reticle prism (`#00f0ff`).

#### 2. Weapon: **Hazard Stripe SMG (`4101`)**
* **Base Archetype**: `talon` (Vector-9 Talon SMG)
* **Form & Geometry**: Compact skeletonized frame, side-loading magazine well, top tactical rail.
* **Materials**: Industrial gunmetal slate with worn yellow-and-black 45° diagonal hazard warning stripes along the upper receiver, chipped edge paint, oil stains.

#### 3. Chassis: **Cryo-Vanguard Scout (`4113`)**
* **Base Rig**: `Scout.game.glb` (`mixamorig` bone structure, height 1.85m).
* **Anatomy**: Lightweight aerodynamic armor plating over a flexible thermal-mesh undersuit.
* **Key Visuals**: Sub-zero frost patina on pauldrons and shin guards, dual-nozzle atmospheric jump-pack on backpack, smooth spherical helmet with continuous glowing cyan visor (`#00f0ff`).

#### 4. Chassis: **Cyber-Spectre Infiltrator (`4118`)**
* **Base Rig**: `Scout.game.glb` (`mixamorig`, height 1.85m).
* **Anatomy**: Matte-black carbon-fiber nanofiber weave with active optical camouflage plates.
* **Key Visuals**: Tactical fabric hood/cowl draped over angular skull-profile helmet, twin amber HUD eye lenses (`#ff9f1c`), lightweight mechanical knee/ankle stabilizers.

---

### 🛡️ Group 2: Tank Weapons & Chassis

#### 1. Weapon: **Tectonic Driller Autocannon (`4102`)**
* **Base Archetype**: `siege_breaker` (Siege-Breaker 50)
* **Form & Geometry**: Massive twin-barrel heavy caliber weapon with an underslung cylindrical drill bit and rotary ammo feeder drum.
* **Materials**: Cast heavy iron, heat-scorched gunmetal with amber hazard lamps and reinforced hydraulic recoil damper rods.

#### 2. Weapon: **Biolume Spore Sprayer (`4106`)**
* **Base Archetype**: `siege_breaker` / Heavy Cannon
* **Form & Geometry**: Heavy industrial canister launcher modified with alien bio-tech.
* **Materials**: Chitinous green organic shell encasing a rusted steel mortar barrel, glass pressure vial glowing with bubbling emerald spore fluid (`#34d399`).

#### 3. Chassis: **Trench Warden Heavy (`4114`)**
* **Base Rig**: `tank-rigged.glb` (height 1.95m).
* **Anatomy**: Rugged industrial military power armor.
* **Key Visuals**: High protective ballistic neck gorget collar, thick riveted olive-drab chest plates, heavy linked 50-cal ammo belts draped across the chest, reinforced blast visor with narrow orange horizontal slit.

#### 4. Chassis: **Dreadnought Exo-Juggernaut (`4117`)**
* **Base Rig**: `tank-rigged.glb` (height 1.95m).
* **Anatomy**: Massive walking tank silhouette with heavy hydraulic assist limbs.
* **Key Visuals**: Oversized angled tower pauldron shields, heavy chest reactor core with glowing orange exhaust vents, industrial shoulder cage lamps.

---

### ⚡ Group 3: Engineer Weapons & Chassis

#### 1. Weapon: **Glitched Circuit Bolter (`4108`)**
* **Base Archetype**: `tesla_lock`
* **Form & Geometry**: Exposed computer motherboard chassis, wire bundles, vacuum tube diode capacitors, dual copper arc prongs at the muzzle.
* **Materials**: PCB dark-green composite, exposed copper traces, digital segment readout screen showing blinking glitch telemetry.

#### 2. Weapon: **Solar Flare Antimatter Rifle (`4111`)**
* **Base Archetype**: `tesla_lock` / Energy Driver
* **Form & Geometry**: Sleek aerodynamic heavy particle railgun with central magnetic accelerator coils.
* **Materials**: Polished white ceramic and brushed gold plating, glowing solar-amber particle containment core (`#ffaa44`) with pulsing volumetric heat shimmer.

#### 3. Chassis: **Sub-Terran Drill Engineer (`4112`)**
* **Base Rig**: `engineer-rigged-gestures.glb` (height 1.85m).
* **Anatomy**: Industrial safety-yellow and graphite utility hazard suit.
* **Key Visuals**: Tool harness with diagnostic gauges and cable coils, backpack-mounted articulated robotic servo arm with welding tip, flip-down dual-lens cyan welding goggles.

#### 4. Chassis: **Bio-Synthesizer Harness (`4116`)**
* **Base Rig**: `engineer-rigged-gestures.glb` (height 1.85m).
* **Anatomy**: High-tech field bio-chemical hazmat rig.
* **Key Visuals**: Twin pressurized glass cylinders on the backpack glowing with emerald bioluminescent liquid (`#34d399`), reinforced ribbed respirator hose connecting backpack to full-face dome mask, wrist holographic diagnostic projector.

---

## 3. Technical 3D Export & Packaging Constraints

1. **Format**: Binary `.glb` (GLTF 2.0).
2. **Compression**: Optimize with `gltf-transform` to apply `EXT_meshopt_compression` (ensures fast load times and compatibility with `src/armoryScene.js`'s `MeshoptDecoder`).
3. **Materials**: PBR Metallic-Roughness workflow (`baseColorTexture`, `metallicRoughnessTexture`, `normalTexture`, `emissiveTexture`).
4. **Bone Naming**: For character chassis, keep bone hierarchy rooted at `mixamorig:Hips` matching `Scout.game.glb` so animation retargeting works out of the box in `src/player3dOverlay.js`.
5. **Scale & Origin**:
   - Weapons: Centered at trigger grip (`0, 0, 0`), forward along `+Z` or `+X`, length approximately `0.8m` to `1.2m`.
   - Characters: Origin at floor center between feet (`0, 0, 0`), standing upright along `+Y`.
