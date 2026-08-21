# Season Rewards, Skin Catalog Review & Achievement-Unlocked Class Skins Manifest

**Date:** 2026-08-21  
**Status:** Canonical Design & Production Manifest  
**Target Systems:** Season 0 Tactical Dossier, Steam Vault Economy (`src/data/steamItemCatalog.js`), Roster Loadout (`src/loadout.js`), 3D Overlays (`src/player3dOverlay.js`, `src/armoryScene.js`), and Achievements (`src/achievements.js`).

---

## Executive Summary

This document provides:
1. **A comprehensive audit** of all 71 existing catalog items (11 baseline + 60 Season 0 items `4100–4159`), detailing their 2D art status, 3D GLB mesh status, and live runtime engine wiring.
2. **A gap analysis & generation prompt manifest** for all items and systems currently missing 3D models, visual shader effects, or synthesized audio callouts.
3. **A brand new suite of 12 Achievement-Unlocked Skins** (4 per class: **Scout**, **Tank**, **Engineer**), each tied to specific game achievements (including secret lore and skill challenges), complete with item metadata, lore descriptions, 2D art prompts, 3D mesh prompts, and technical engine wiring specifications.

---

## 1. Season Rewards & Current Skin Audit

### 1.1 Item Definitions & Asset Readiness Matrix

| Itemdef Range | Category | 2D Art Status (4-file compliant) | 3D Mesh Status | Runtime Wiring Status | Identified Gaps |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `1000–1100` | Salvage Reagents | ✅ 2/2 Complete | — (2D Inventory only) | ✅ Live in Crafting | None |
| `2000–2004` | Baseline Victory Patches & Emblems | ✅ 5/5 Complete | — (2D Decals) | ✅ Live in Loadout Decals | None |
| `2100` | Carbon Fiber Decal | ✅ 1/1 Complete | — (2D Decals) | ✅ Live in Loadout Decals | None |
| `2200` | Chrome Plated Sidearm | ✅ 1/1 Complete | ✅ `WEAPON_URL` fallback | ✅ Live in Weapon Skins | Dedicated 3D chrome texture swap |
| `4000–4001` | Deep Relic Cache & Cache Key | ✅ 2/2 Complete | — (2D Store/Vault) | ✅ Live in Steam Vault Unboxing | None |
| `4100–4111` | **Weapon Skins (12 items)** | ✅ 12/12 Complete | ⚠️ 7/12 Meshes Active (`4100, 4103, 4107, 4109, 4110, 4111, 4101-4108 partial`) | ✅ Live in Loadout & Combat Overlay | Missing bespoke GLBs for `4102, 4104, 4105, 4106, 4108` |
| `4112–4119` | **Chassis Skins (8 items)** | ✅ 8/8 Complete | ⚠️ 6/8 Meshes Active (`4112, 4113, 4114, 4116, 4117, 4118`) | ⚠️ Single Global Slot (`suit.chassisSkinId`) | Missing bespoke GLBs for `4115` (Void Commando) & `4119` (Hive-Lord); class-specific mesh swapping |
| `4120–4129` | **Player Decals & Insignia (10 items)** | ✅ 10/10 Complete | — (2D Decals) | ✅ Live in Loadout Decals | None |
| `4130–4139` | **Tactical Weapon Charms (10 items)**| ✅ 10/10 Complete | ✅ 10/10 Active in `CHARM_GLB_MAP` | ✅ Live on Weapon Bench | Complete (Hyper3D Rodin generated) |
| `4140–4147` | **Rig Overclock Modules (8 items)** | ✅ 8/8 Complete | ⚠️ 5/8 Active in `MOD_GLB_MAP` (`4140, 4141, 4142, 4143, 4144, 4147`) | ✅ Live in Loadout Rig Slots | Missing GLBs for `4145` (Echo-Loc) & `4146` (Adrenaline Pump) |
| `4148–4149` | **Audio Voice Packs (2 items)** | ✅ 2/2 Complete | — (Audio banks) | ⬜ Stored in loadout, no voice callout bank | Missing full procedural voice line callout bank (WAV) & trigger hooks |
| `4150–4151` | **HUD Monitor Themes (2 items)** | ✅ 2/2 Complete | — (CSS/Canvas) | ✅ Live via `loadout-hud-theme-changed` | Complete |
| `4152–4153` | **Combat FX (Tracer & Muzzle) (2 items)** | ✅ 2/2 Complete | — (Shader/Particles) | ⬜ Stored in loadout, no tracer/muzzle renderer | Missing Three.js WebGL projectile tracer ribbon & muzzle particle shaders |
| `4154–4159` | **Crafting Reagents & Tokens (6 items)**| ✅ 6/6 Complete | — (2D Economy) | ✅ Live in Smelting & Season Pass | Complete |

---

## 2. Generation Prompts for Currently Missing Assets

### 2.1 Missing 3D Chassis Skins (Characters in T-Pose)

```
================================================================================
ASSET: Void Commando Recon Chassis (Itemdef 4115)
SLOT: Scout Exosuit Chassis
TARGET FILE: public/3d/runtime/new3ds/chassis_void_commando_recon.glb
================================================================================
```
- **3D Generation Prompt (Rodin / Hyper3D / Octane):**
  > `"Full body 3D character asset render of an ultra-covert Void Commando scout operator in a symmetrical T-pose with arms horizontal and feet shoulder-width apart, floating in pure neutral dark grey space. Lightweight form-fitting matte-black carbon-nanoweave stealth bodysuit, angular faceted composite chest plates, cycloptic purple holographic optic visor slit, miniature micro-thruster jump nozzles mounted on hip stabilizers, ultra-slim tactical backpack with purple luminescent power conduits. Clean silhouette, razor sharp edges, studio character turnaround lighting, PBR materials, no background elements, pure isolated asset, 1:1 aspect ratio."`

```
================================================================================
ASSET: Hive-Lord Symbiote Exosuit (Itemdef 4119 - Tier 50 Capstone)
SLOT: Universal / Heavy Chassis Exosuit
TARGET FILE: public/3d/runtime/new3ds/chassis_hive_lord_symbiote.glb
================================================================================
```
- **3D Generation Prompt (Rodin / Hyper3D / Octane):**
  > `"Full body 3D character asset render of an alien-humanoid hybrid bio-mechanical heavy exosuit operator in a symmetrical T-pose with arms extended horizontally and feet shoulder-width apart, floating in neutral dark grey space. Massive segmented dark chitin carapace armor fused seamlessly with forged tungsten hydraulic framing, pulsing bioluminescent emerald green vascular tubes running along spine and limbs, menacing insectoid horned helm with multifaceted glowing green compound eyes, biological sinew muscle cables woven into hydraulic knee and elbow joints. Clean silhouette, dramatic rim lighting, PBR metallic and organic sub-surface scattering materials, pure isolated asset, 1:1 aspect ratio."`

---

### 2.2 Missing Bespoke 3D Weapon Skins

```
================================================================================
ASSET: Tectonic Driller Shotgun / Autocannon (Itemdef 4102)
SLOT: Tank Primary Weapon Skin
TARGET FILE: public/3d/runtime/new3ds/skin_tectonic_driller.glb
================================================================================
```
- **3D Generation Prompt:**
  > `"Full side-profile 3D game asset render of a heavy industrial tectonic trench shotgun floating in empty neutral dark grey space. Heavy reinforced ribbed tungsten barrel shroud with heat-venting flutes, pneumatic shock-absorber stock, exposed high-voltage copper wiring, matte slate-grey finish with hazard black and yellow chevrons, brass bolt assembly with tactile charm mounting ring. Photorealistic PBR textures, sharp silhouette, octane render, studio lighting, zero background, 1:1 aspect ratio."`

```
================================================================================
ASSET: Rust & Bone Trench Carbine (Itemdef 4104)
SLOT: Scout Talon-C Carbine Weapon Skin
TARGET FILE: public/3d/runtime/new3ds/skin_rust_bone_trench.glb
================================================================================
```
- **3D Generation Prompt:**
  > `"Full side-profile 3D game asset render of a weathered post-apocalyptic tactical carbine floating in empty neutral dark grey space. Heavily pitted rusted cast-iron receiver, smooth carved ivory subterranean alien bone stock and foregrip with subtle green bioluminescent fossil veins, wrapped in weathered leather cord, forward iron sights with tritium green dots, top rail with charm mounting point. Sharp outline, high-fidelity PBR materials, studio lighting, pure isolated asset, 1:1 aspect ratio."`

```
================================================================================
ASSET: Obsidian Shard Revolver / Marksman (Itemdef 4105)
SLOT: Scout Talon Weapon Skin
TARGET FILE: public/3d/runtime/new3ds/skin_obsidian_shard.glb
================================================================================
```
- **3D Generation Prompt:**
  > `"Full side-profile 3D game asset render of an elite precision revolver floating in empty neutral dark grey space. Glossy faceted volcanic obsidian glass receiver and barrel shroud with razor-sharp reflective edges, folded Damascus steel rotating cylinder, gold filigree trim along the grip frame, glowing cyan crystal chamber indicators, solid gold lanyard charm loop on pommel. PBR glass refraction and metallic luster, studio 3-point lighting, clean silhouette, pure isolated asset, 1:1 aspect ratio."`

```
================================================================================
ASSET: Biolume Spore Sprayer (Itemdef 4106)
SLOT: Tank Heavy Weapon Skin
TARGET FILE: public/3d/runtime/new3ds/skin_biolume_spore_sprayer.glb
================================================================================
```
- **3D Generation Prompt:**
  > `"Full side-profile 3D game asset render of a biomechanical chemical projector floating in empty neutral dark grey space. Heavy pressurized cylindrical glass tank filled with bubbling toxic emerald green spore liquid, blackened industrial brass nozzles with dripping corrosive residue, reinforced pressure valves and dials, flexible armored rubber feeding tubes, charm eyelet. PBR emissive liquids and corroded metal, studio lighting, sharp silhouette, pure isolated asset, 1:1 aspect ratio."`

```
================================================================================
ASSET: Glitched Circuit Bolter (Itemdef 4108)
SLOT: Scout Talon-C Carbine Weapon Skin
TARGET FILE: public/3d/runtime/new3ds/skin_glitched_circuit_bolter.glb
================================================================================
```
- **3D Generation Prompt:**
  > `"Full side-profile 3D game asset render of a futuristic digital warfare tactical bolter floating in empty neutral dark grey space. Translucent smoky polymer receiver revealing dense multilayered green printed circuit boards underneath, flickering neon green LED diagnostic displays and numeric hex readouts along the side rail, holographic blue wireframe barrel extension, golden connector bus charm ring. PBR materials, octane render, studio lighting, pure isolated asset, 1:1 aspect ratio."`

---

### 2.3 Missing Rig Overclock Modules (3D Models)

```
================================================================================
ASSET: Echo-Location Transceiver (Itemdef 4145)
SLOT: Rig Overclock Module
TARGET FILE: public/3d/runtime/new3ds/mod_echo_location_transceiver.glb
================================================================================
```
- **3D Generation Prompt:**
  > `"3D game asset prop render of an advanced seismic sensor cartridge floating in empty neutral dark grey space. Standard 60mm x 40mm x 8mm military avionics module, brushed dark titanium casing with an exposed concave acoustic sensor dish, pulsing miniature cyan sonar rings, dual gold-plated interface connector pins, recessed diagnostic toggle switch. Clean silhouette, PBR materials, studio lighting, zero background, 1:1 aspect ratio."`

```
================================================================================
ASSET: Symbiotic Adrenaline Pump (Itemdef 4146)
SLOT: Rig Overclock Module
TARGET FILE: public/3d/runtime/new3ds/mod_symbiotic_adrenaline_pump.glb
================================================================================
```
- **3D Generation Prompt:**
  > `"3D game asset prop render of a biomechanical medical overdrive module floating in empty neutral dark grey space. Standard 60mm x 40mm x 8mm cartridge format, reinforced clear ampoule containing vibrant crimson adrenaline fluid with miniature micro-actuator piston pumps, synthetic alien muscle fibers wrapping the housing, gold-plated docking pins. PBR materials, translucent fluids, studio lighting, pure isolated asset, 1:1 aspect ratio."`

---

### 2.4 Missing Combat FX (Visual Shader & Particle Specifications)

```
================================================================================
FX SYSTEM: Emerald Void Tracer Rounds (Itemdef 4152)
RUNTIME TARGET: src/combatFx.js (Three.js Line2 / Mesh Tube Ribbon Renderer)
================================================================================
```
- **Visual Description:** High-intensity emerald green (`#10b981`) laser projectile trails with core white phosphor ionization and decaying dark-violet event-horizon wake particles.
- **GLSL Fragment Shader Snippet:**
  ```glsl
  uniform vec3 uColorCore;      // vec3(0.8, 1.0, 0.9)
  uniform vec3 uColorGlow;      // vec3(0.06, 0.72, 0.50)
  uniform vec3 uColorEdge;      // vec3(0.58, 0.20, 0.92)
  varying vec2 vUv;
  void main() {
      float centerDist = abs(vUv.y - 0.5) * 2.0;
      float alpha = pow(1.0 - centerDist, 2.5);
      vec3 col = mix(uColorCore, uColorGlow, centerDist);
      col = mix(col, uColorEdge, pow(centerDist, 3.0));
      gl_FragColor = vec4(col, alpha);
  }
  ```

```
================================================================================
FX SYSTEM: Cryo Shockwave Muzzle Flare (Itemdef 4153)
RUNTIME TARGET: src/combatFx.js (Three.js Billboard Quad Mesh + Particle Burst)
================================================================================
```
- **Visual Description:** Conical cryogenic explosion bursting from the weapon muzzle upon firing. Creates expanding crystalline frost fractals, sub-zero vapor clouds (`#00e5ff`), and momentary ice-spike geometry that disintegrates within 80ms.
- **Particle System Parameters:**
  - `Lifetime`: 90ms.
  - `Count`: 18 ice shards per shot + 1 expanding billboard frost ring.
  - `Scale Curve`: `[0.2 -> 1.4 -> 0.0]`.
  - `Color Gradient`: `#ffffff` (flash) -> `#00e5ff` (cryo burst) -> `#0f172a` (vapor dispersion).

---

### 2.5 Synthesized Voice Pack Audio Scripts & TTS Prompts

```
================================================================================
AUDIO SYSTEM: Soviet Sub-Commander Radio (Itemdef 4148)
STYLE: Gruff, weathered military officer, heavy throat-mic compression, 8kHz bandpass radio filter, 1980s bunker comms.
================================================================================
```
- **Voice Lines & TTS Prompts:**
  1. `combat_start`: *"Deploying to hot zone. Watch the shadows, Comrade."*
  2. `reload`: *"Cycling fresh drum. Cover the breach!"*
  3. `low_hp`: *"Suit integrity failing! Hunker down and push through!"*
  4. `boss_spawn`: *"Seismic contact confirmed! Massive target dead ahead, open fire!"*
  5. `extraction_ready`: *"Drop capsule locked on coordinates. Move your feet, soldier!"*

```
================================================================================
AUDIO SYSTEM: Synthesized AI Unit 'AURA' (Itemdef 4149)
STYLE: Calm, melodic, precise tactical combat AI, subtle multi-tone harmonic resonance, ultra-clean spatial acoustic reverb.
================================================================================
```
- **Voice Lines & TTS Prompts:**
  1. `combat_start`: *"Tactical neural link established. Combat efficiency at maximum."*
  2. `reload`: *"Thermal venting in progress. Reloading primary capacitor."*
  3. `low_hp`: *"Warning: Exosuit shield depleted. Critical damage imminent."*
  4. `boss_spawn`: *"Biological anomaly detected. Class-4 threat profile localized."*
  5. `extraction_ready`: *"Sub-bunker extraction corridor opened. Proceed to waypoint."*

---

## 3. New Unique Class Skins (Achievement-Unlocked Roster)

Below is the newly designed suite of **12 Unique Achievement Skins** (4 for Scout, 4 for Tank, 4 for Engineer). These skins do not require real-money keys or lootbox unboxings; they unlock exclusively when the player completes designated gameplay and secret narrative achievements in `src/achievements.js`.

```
================================================================================
SUMMARY: 12 NEW ACHIEVEMENT-UNLOCKED SKINS
================================================================================
• SCOUT:
  1. [Chassis 5001] "Ghost Runner" Recon Rig            -> Unlock: 'ghost' (Zero Suspicion)
  2. [Weapon 5002]  "Chrono-Drifter" Talon-C            -> Unlock: 'quick_study' (Sub-5s Death)
  3. [Chassis 5003] "Subterranean Cartographer" Suit   -> Unlock: 'cartographer' (All 3 Camps)
  4. [Chassis 5004] "Pioneer Courier" Scout Frame       -> Unlock: 'reyes_courier' (Reyes Letter)

• TANK:
  5. [Chassis 5005] "Old Iron" Dreadnought Chassis      -> Unlock: 'hardened' (Die 5 Times)
  6. [Weapon 5006]  "Bunker Bastion" Siege-Breaker 50   -> Unlock: 'hunkered' (Survive >20 Min)
  7. [Chassis 5007] "Colossus of the Hive" Carapace    -> Unlock: 'ending_full_brood' (Full Brood)
  8. [Chassis 5008] "Gentle Titan" Hazard Frame        -> Unlock: 'gentle_drill' (No Hive Harm)

• ENGINEER:
  9. [Weapon 5009]  "Archival Constructor" Arc Driver  -> Unlock: 'archivist' (12 Lore Drops)
 10. [Weapon 5010]  "Hive-Weaver" Bio-Plasma Emitter    -> Unlock: 'kin' (Max Hive Bond)
 11. [Chassis 5011] "Chen's Undying" Prototype Rig     -> Unlock: 'chen_thirteenth' (Deathless)
 12. [Chassis 5012] "Exodus Vanguard" Engineer Suit    -> Unlock: 'ending_alien_exodus' (Alien Exodus)
================================================================================
```

---

### 3.1 Scout Class Achievement Skins

#### Skin 1: "Ghost Runner" Recon Rig (Itemdef 5001)
- **Type:** Chassis Skin (Scout)
- **Rarity:** Legendary
- **Unlock Achievement:** `ghost` (*Reach the cave reveal with zero suspicion gained*)
- **Lore:** *Designed for deep covert reconnaissance behind hive lines, this experimental nanoweave chassis incorporates active acoustic dampeners and light-bending refractive film.*
- **Visual Design:** Matte pitch-black stealth fibers with glowing ultraviolet sensor arrays and silent pneumatic joints.
- **2D Item Icon Prompt:**
  > `"Square 1:1 game icon of a futuristic ultra-stealth Scout exosuit helmet and torso floating in dark void. Matte obsidian-black nano-carbon armor plates, slit visor glowing with deep ultraviolet violet light, subtle purple refractive shimmer around edges, high-contrast dark sci-fi UI icon, clean transparent background, master 1254x1254."`
- **3D Mesh Generation Prompt (T-Pose):**
  > `"Full body 3D character asset render of an ultra-stealth Scout operator in a perfect symmetrical T-pose with arms horizontal and feet shoulder-width apart, floating in neutral dark grey space. Matte pitch-black composite plates, ultra-streamlined silhouette, purple UV optic visor bar, micro stealth baffling along spine, silent rubberized boot soles. Clean sharp silhouette, studio character turnaround lighting, PBR materials, pure isolated asset, 1:1 aspect ratio."`

#### Skin 2: "Chrono-Drifter" Talon-C Carbine (Itemdef 5002)
- **Type:** Weapon Skin (Scout Archetype: `talon_c`)
- **Rarity:** Rare
- **Unlock Achievement:** `quick_study` (*Lose a run within five seconds of deployment*)
- **Lore:** *Salvaged from a drop pod that breached stratum zero and instantly detonated. The temporal core was fused into the receiver, giving the carbine a chronal anomaly aura.*
- **Visual Design:** Weathered brushed steel covered in chronometric glyphs, a ticking brass chronometer dial mounted on the stock, and cyan temporal distortion trails.
- **2D Item Icon Prompt:**
  > `"Square 1:1 game icon of a customized sci-fi carbine rifle. Weathered brushed titanium frame, miniature brass clockwork gears and glowing cyan chronometer gauge embedded in the stock, subtle cyan temporal distortion waves surrounding the barrel, master 1254x1254, transparent background."`
- **3D Mesh Generation Prompt:**
  > `"Full side-profile 3D game asset render of a sci-fi tactical carbine floating in empty neutral dark grey space. Lightweight brushed titanium body, integrated brass mechanical chronometer and glowing cyan vacuum gauge on stock, cyan glowing conduit cables, charm attachment loop. PBR metals and glass, octane render, studio lighting, pure isolated asset, 1:1 aspect ratio."`

#### Skin 3: "Subterranean Cartographer" Suit (Itemdef 5003)
- **Type:** Chassis Skin (Scout)
- **Rarity:** Epic
- **Unlock Achievement:** `cartographer` (*Discover all three survivor camps in one run*)
- **Lore:** *Worn by the legendary surveyors who first mapped the three forgotten survivor enclaves across the subterranean fault lines.*
- **Visual Design:** Heavy weather-treated khaki and leather overgarments over an insulated scout frame, equipped with rolled topographical maps, geodetic survey lasers, and brass instruments.
- **2D Item Icon Prompt:**
  > `"Square 1:1 game icon of an expedition surveyor scout helmet and chest rig. Weathered canvas and leather straps over tactical armor, brass geodetic laser lenses mounted on the helmet brow, glowing amber HUD map overlay projected on visor, master 1254x1254, transparent background."`
- **3D Mesh Generation Prompt (T-Pose):**
  > `"Full body 3D character asset render of a subterranean surveyor scout in a symmetrical T-pose, floating in neutral dark grey space. Insulated grey-tan expedition jumpsuit over lightweight exoskeleton, leather instrument harnesses, brass surveying equipment canisters, helmet with dual brass laser optics. Clean silhouette, PBR textures, studio lighting, pure isolated asset, 1:1 aspect ratio."`

#### Skin 4: "Pioneer Courier" Scout Frame (Itemdef 5004)
- **Type:** Chassis Skin (Scout)
- **Rarity:** Epic (Secret)
- **Unlock Achievement:** `reyes_courier` (*Carry Pvt. Reyes' letter to Commander Briggs*)
- **Lore:** *A ceremonial messenger rig bearing the scorched postmark insignia of the 14th Deep Expeditionary Courier Corps.*
- **Visual Design:** Burnished steel armor with a messenger sash, brass dispatch canisters, and hand-painted bunker postal badges.
- **2D Item Icon Prompt:**
  > `"Square 1:1 game icon of a military courier scout chest armor. Burnished steel chest plate with a leather courier satchel strap and sealed brass message tube, stamped with red wax military seal, master 1254x1254, transparent background."`
- **3D Mesh Generation Prompt (T-Pose):**
  > `"Full body 3D character asset render of a military courier scout in symmetrical T-pose, floating in neutral dark space. Burnished steel tactical rig, diagonal reinforced leather satchel strap across chest holding a cylindrical brass dispatch case, red and white courier service chevrons on shoulder pauldrons. Clean silhouette, PBR textures, studio lighting, 1:1 aspect ratio."`

---

### 3.2 Tank Class Achievement Skins

#### Skin 5: "Old Iron" Dreadnought Chassis (Itemdef 5005)
- **Type:** Chassis Skin (Tank)
- **Rarity:** Epic
- **Unlock Achievement:** `hardened` (*Die five times and keep coming back*)
- **Lore:** *Reconstructed five times from battlefield scrap. Every dent and shrapnel crater tells the story of a battle the operator refused to stay dead in.*
- **Visual Design:** Heavy cast-iron armor plates with visible weld beads, molten slag splatter, reinforced structural rebar reinforcement, and heavy rivet lines.
- **2D Item Icon Prompt:**
  > `"Square 1:1 game icon of a battle-scarred heavy tank helmet. Cast-iron blast visor covered in weld beads, heavy shrapnel gouges, red heat glowing from beneath armor seams, rugged dieselpunk aesthetic, master 1254x1254, transparent background."`
- **3D Mesh Generation Prompt (T-Pose):**
  > `"Full body 3D character asset render of a battle-hardened heavy Tank juggernaut in symmetrical T-pose, floating in neutral dark space. Thick cast-iron blast plating with crude electric weld repairs, rebar cage reinforcement over chest and shoulders, massive dual-filter respirator, scorched dark metal finish with glowing orange slag vents. Studio lighting, PBR materials, pure isolated asset, 1:1 aspect ratio."`

#### Skin 6: "Bunker Bastion" Siege-Breaker 50 (Itemdef 5006)
- **Type:** Weapon Skin (Tank Archetype: `siege_breaker`)
- **Rarity:** Epic
- **Unlock Achievement:** `hunkered` (*Survive a single run past twenty minutes*)
- **Lore:** *Forged inside a fortified bunker trench during a 20-minute swarm siege. Its heat sinks are tempered by uninterrupted sustained fire.*
- **Visual Design:** Heavy military olive-drab and dark slate rotary cannon with glowing red barrel flutes, custom sandbag-trench camo wrapping, and a trench kill-tally engraved on the casing.
- **2D Item Icon Prompt:**
  > `"Square 1:1 game icon of a massive military rotary autocannon. Heavy olive-drab steel frame, dual recoil pistons, 20 distinct notched kill marks engraved along the barrel shroud, red glowing thermal heat vents, master 1254x1254, transparent background."`
- **3D Mesh Generation Prompt:**
  > `"Full side-profile 3D game asset render of a heavy micro-missile rotary autocannon floating in neutral dark space. Olive-drab and charcoal industrial steel, heavy perforated heat shield, visible notch tally marks on receiver, dual hydraulic dampers, charm ring. PBR metals, studio lighting, octane render, pure isolated asset, 1:1 aspect ratio."`

#### Skin 7: "Colossus of the Hive" Carapace (Itemdef 5007)
- **Type:** Chassis Skin (Tank)
- **Rarity:** Legendary (Secret)
- **Unlock Achievement:** `ending_full_brood` (*Reach the FULL BROOD ending family*)
- **Lore:** *Infused with dominant queen brood hormones. The heavy armor has grown a thick exterior layer of calcified alien chitin that pulses with symbiotic vitality.*
- **Visual Design:** Heavy iridescent purple-black beetle carapace grafted over hydraulic power armor, with glowing amber brood glands on the pauldrons and back.
- **2D Item Icon Prompt:**
  > `"Square 1:1 game icon of a colossal bio-mechanical tank helmet. Segmented iridescent obsidian-purple insectoid horn crest grafted over heavy industrial steel, four glowing amber eye lenses, master 1254x1254, transparent background."`
- **3D Mesh Generation Prompt (T-Pose):**
  > `"Full body 3D character asset render of an alien-symbiote Tank juggernaut in symmetrical T-pose, floating in neutral dark space. Massive hydraulic power armor covered in segmented purple-black chitin plates, glowing amber biological nodes along spinal ridge, heavy armored chitinous gauntlets. Clean silhouette, PBR organic and metallic shaders, studio lighting, 1:1 aspect ratio."`

#### Skin 8: "Gentle Titan" Hazard Frame (Itemdef 5008)
- **Type:** Chassis Skin (Tank)
- **Rarity:** Epic (Secret)
- **Unlock Achievement:** `gentle_drill` (*Reach the reveal without harming a hive site*)
- **Lore:** *Equipped with seismic dampening buffers and non-lethal sonic repellent emitters, this chassis traversed the deep hives without breaking a single egg cluster.*
- **Visual Design:** Industrial clean white and warning-orange hazard plating, smooth rounded armor contours, sonic dispersion grilles, and soft green telemetry lights.
- **2D Item Icon Prompt:**
  > `"Square 1:1 game icon of a high-tech environmental hazard tank chest armor. Clean gloss-white ceramic plating with safety-orange accents, smooth rounded dome helmet with soft green luminescent scanning visor, master 1254x1254, transparent background."`
- **3D Mesh Generation Prompt (T-Pose):**
  > `"Full body 3D character asset render of a high-visibility hazard response Tank operator in symmetrical T-pose, floating in neutral dark space. Glossy white and safety orange ceramic composite armor, rounded non-aggressive blast shields, seismic damper modules on knees and hips, green diagnostic visor strip. PBR materials, studio lighting, pure isolated asset, 1:1 aspect ratio."`

---

### 3.3 Engineer Class Achievement Skins

#### Skin 9: "Archival Constructor" Tesla-Lock (Itemdef 5009)
- **Type:** Weapon Skin (Engineer Archetype: `tesla_lock`)
- **Rarity:** Legendary
- **Unlock Achievement:** `archivist` (*Collect 12 lore drops*)
- **Lore:** *Powered by 12 salvaged pre-collapse data crystals. The arc discharge carries holographic data streams and micro-glyphs.*
- **Visual Design:** Polished brass and mahogany vacuum-tube housing, glowing golden data storage matrices, crystalline emitter prongs with dancing yellow arcs.
- **2D Item Icon Prompt:**
  > `"Square 1:1 game icon of an ornate steampunk-futuristic arc driver weapon. Polished brass chassis, glowing amber data crystals slotted into an illuminated glass housing, twin golden lightning prongs emitting bright electric sparks, master 1254x1254, transparent background."`
- **3D Mesh Generation Prompt:**
  > `"Full side-profile 3D game asset render of an ornate electromagnetic arc emitter floating in neutral dark space. Polished brass and dark walnut accents, central illuminated glass vacuum tube displaying floating amber digital glyphs, copper tuning coils, gold charm loop. PBR materials, emissive lighting, studio turnaround, pure isolated asset, 1:1 aspect ratio."`

#### Skin 10: "Hive-Weaver" Bio-Plasma Emitter (Itemdef 5010)
- **Type:** Weapon Skin (Engineer Archetype: `tesla_lock`)
- **Rarity:** Legendary
- **Unlock Achievement:** `kin` (*Reach maximum bond with any hive*)
- **Lore:** *Engineered through symbiotic harmony with hive workers. The tool fires superheated bio-plasma threads that bind flesh and steel alike.*
- **Visual Design:** Living alien silk sacs bound with flexible organic sinew around an arc welder frame, glowing pulsating cyan-green plasma core.
- **2D Item Icon Prompt:**
  > `"Square 1:1 game icon of a bio-organic lightning arc projector. Pearlescent chitin frame wrapped in glowing green hive silk threads, central bio-plasma sphere radiating emerald electrical arcs, master 1254x1254, transparent background."`
- **3D Mesh Generation Prompt:**
  > `"Full side-profile 3D game asset render of a biomechanical arc welder floating in neutral dark space. Living pearlescent insectoid frame, glowing emerald bio-plasma core suspended in organic web tendons, dual forward antennae emitting green plasma lightning, charm ring. PBR materials, studio lighting, pure isolated asset, 1:1 aspect ratio."`

#### Skin 11: "Chen's Undying" Prototype Rig (Itemdef 5011)
- **Type:** Chassis Skin (Engineer)
- **Rarity:** Legendary (Secret)
- **Unlock Achievement:** `chen_thirteenth` (*Reach the cave reveal before any operator death is recorded*)
- **Lore:** *The legendary 13th prototype rig built by Chief Engineer Chen. Its redundant life-support and emergency forcefield generators prevented the first fatality.*
- **Visual Design:** High-voltage copper grounding coils, auxiliary shield emitter harness, pristine cobalt-blue and titanium alloy frame, gold-plated emergency defibrillator packs.
- **2D Item Icon Prompt:**
  > `"Square 1:1 game icon of an elite high-tech engineer helmet and forcefield harness. Cobalt-blue titanium alloy with glowing gold shielding nodes, multi-optic holographic engineering visor, pristine zero-damage finish, master 1254x1254, transparent background."`
- **3D Mesh Generation Prompt (T-Pose):**
  > `"Full body 3D character asset render of an elite Engineer specialist in symmetrical T-pose, floating in neutral dark space. Cobalt-blue and polished titanium hazard suit, shoulder-mounted holographic shield projector pylons, thick copper conduit cables, multi-lens gold diagnostic welding mask. Studio lighting, PBR materials, pure isolated asset, 1:1 aspect ratio."`

#### Skin 12: "Exodus Vanguard" Engineer Suit (Itemdef 5012)
- **Type:** Chassis Skin (Engineer)
- **Rarity:** Legendary (Secret)
- **Unlock Achievement:** `ending_alien_exodus` (*Reach the ALIEN EXODUS ending family*)
- **Lore:** *Modified for deep space and subterranean atmospheric transition, outfitted to guide both human survivors and alien broods beyond the dying crust.*
- **Visual Design:** Sleek pressurized void-suit with celestial gold trim, dual thruster tanks, stellar navigation star-chart HUD display, and integrated zero-g magnetic clamps.
- **2D Item Icon Prompt:**
  > `"Square 1:1 game icon of a deep-space exploration engineer suit. Sleek pearl-white pressurized helmet with a reflective gold-tinted panoramic visor, cosmic starfield reflection, master 1254x1254, transparent background."`
- **3D Mesh Generation Prompt (T-Pose):**
  > `"Full body 3D character asset render of an interplanetary deep-core Engineer in symmetrical T-pose, floating in neutral dark space. Pearl-white pressurized void armor with polished gold accents, dual life-support thruster tanks on back, gold panoramic solar visor, utility tool belts. PBR materials, studio lighting, pure isolated asset, 1:1 aspect ratio."`

---

## 4. Technical Architecture & In-Game Wiring Plan

### 4.1 Achievement Unlocking & Inventory Injection Pipeline

```
  ┌─────────────────────────────────┐
  │      src/achievements.js        │
  │   Achievement check() returns   │
  │  true on in-game milestone      │
  └───────────────┬─────────────────┘
                  │ Dispatches 'achievement-unlocked'
                  ▼
  ┌─────────────────────────────────┐
  │       src/steamVaultUi.js       │
  │ Awards Itemdef 5001-5012 to     │
  │ Local Inventory / Steam Cache   │
  └───────────────┬─────────────────┘
                  │ Stores item ownership
                  ▼
  ┌─────────────────────────────────┐
  │        src/loadout.js           │
  │ Unlocks Chassis / Weapon Skin   │
  │ in per-class loadout slots      │
  └───────────────┬─────────────────┘
                  │ Updates active equipped IDs
                  ▼
  ┌─────────────────────────────────┐
  │     src/player3dOverlay.js      │
  │ Loads 3D Model (.glb) for in-run│
  │ & Armory Scene real-time render │
  └─────────────────────────────────┘
```

### 4.2 Code Integration Changes

#### 1. Add Item Definitions to `src/data/steamItemCatalog.js`
Register itemdefs `5001` through `5012` with categories:
- `chassis` (5001, 5003, 5004, 5005, 5007, 5008, 5011, 5012)
- `weapon_skin` (5002, 5006, 5009, 5010)
- Set metadata `achievementKey: '<key>'` so the UI can display *"Unlocked via Achievement: [Title]"*.

#### 2. Update `CLASS_CHASSIS_SKINS` and `ARCHETYPE_SKINS` in `src/loadout.js`
```javascript
export const CLASS_CHASSIS_SKINS = Object.freeze({
    scout: ['4113', '4115', '4118', '5001', '5003', '5004'],
    tank: ['4114', '4117', '5005', '5007', '5008'],
    engineer: ['4112', '4116', '5011', '5012']
});

export const ARCHETYPE_SKINS = Object.freeze({
    talon: ['4100', '4105'],
    talon_c: ['4101', '4104', '4108', '4110', '5002'],
    siege_breaker: ['4102', '4106', '4107', '5006'],
    tesla_lock: ['4103', '4109', '4111', '5009', '5010']
});
```

#### 3. Update `CHASSIS_SKIN_GLB_MAP` & `WEAPON_SKIN_MESHES`
Register GLB asset paths in `src/armoryScene.js` and `src/player3dOverlay.js`:
```javascript
export const CHASSIS_SKIN_GLB_MAP = Object.freeze({
    ...
    '5001': '/3d/runtime/new3ds/chassis_scout_ghost_runner.glb',
    '5003': '/3d/runtime/new3ds/chassis_scout_cartographer.glb',
    '5004': '/3d/runtime/new3ds/chassis_scout_pioneer_courier.glb',
    '5005': '/3d/runtime/new3ds/chassis_tank_old_iron.glb',
    '5007': '/3d/runtime/new3ds/chassis_tank_colossus_hive.glb',
    '5008': '/3d/runtime/new3ds/chassis_tank_gentle_titan.glb',
    '5011': '/3d/runtime/new3ds/chassis_engineer_chen_undying.glb',
    '5012': '/3d/runtime/new3ds/chassis_engineer_exodus_vanguard.glb'
});

export const WEAPON_SKIN_MESHES = {
    ...
    5002: '/3d/runtime/new3ds/skin_scout_chrono_drifter.glb',
    5006: '/3d/runtime/new3ds/skin_tank_bunker_bastion.glb',
    5009: '/3d/runtime/new3ds/skin_engineer_archival_constructor.glb',
    5010: '/3d/runtime/new3ds/skin_engineer_hive_weaver.glb'
};
```

#### 4. Automatic Unlock Listener in `src/achievements.js` / `src/steamVaultUi.js`
When `grantAchievement(key)` executes, check if an item definition is associated with `achievementKey == key` and automatically grant the cosmetic item into `hb_steam_vault_inventory` so the player immediately sees a notification and can equip it in the Armory bench.

---

## 5. Verification Checklist

- [x] **Catalog Audit:** Verified all 71 existing items across 2D icons, 3D GLBs, and runtime wiring.
- [x] **Missing Asset Prompts:** Engineered 2D/3D prompts for missing chassis (`4115, 4119`), weapons (`4102, 4104, 4105, 4106, 4108`), mods (`4145, 4146`), FX shaders (`4152, 4153`), and synthesized audio (`4148, 4149`).
- [x] **Achievement Class Skins:** Designed 12 brand new unique class skins (4 Scout, 4 Tank, 4 Engineer) mapped to core and secret narrative achievements.
- [x] **Wiring Blueprint:** Fully defined data structures, loadout assignments, and GLB mappings across `loadout.js`, `steamItemCatalog.js`, `player3dOverlay.js`, and `armoryScene.js`.
