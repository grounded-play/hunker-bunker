# Master Plan: 60 New Interactive 3D GLBs, Decals, and World Story Expansion — 2026-10-14

**Document ID:** `HB-PLAN-2026-10-14-GLB60`  
**Author:** Antigravity (World Architecture, Gameplay & Narrative Systems)  
**Date:** October 14, 2026  
**Status:** Implemented, Ingested, Wired, Rigged, Lit & Verified in Engine (Sprint 52)  
**Target Ingest Path:** `art/raw/` $\rightarrow$ `scripts/blender/` $\rightarrow$ `public/3d/runtime/new3ds/`  
**Companion Documents:**
- [Environment Layout, Field Weapons, and Base Rebuild Master Plan (2026-10-12)](./environment-layout-field-weapons-and-base-rebuild-master-plan-2026-10-12.md)
- [Lore and World Story Assets & Textures Pass 1 (2026-10-12)](./lore-and-world-story-assets-and-textures-2026-10-12.md)
- [Lore & World Story Expansion Pass 2 (2026-10-12)](./lore-and-world-story-assets-expansion-pass2-2026-10-12.md)
- [Whole-World Prop Interactivity and Animation Master Plan (2026-10-09)](./world-prop-interactivity-master-plan-2026-10-09.md)
- [Expanded Universe & Narrative Design Bible](../expanded-universe-narrative-design.md)
- [Story Linchpins Specification](../superpowers/specs/2026-09-11-story-linchpins-design.md)

---

## 1. Executive Summary & Narrative Motivation

### 1.1 The Challenge
Through previous asset batches (Lived-In Pass 1 & 2, World Completion, and the 2026-10-12 mature lore pass), *Hunker Bunker* built a solid foundation of environmental clutter, camp amenities, and brutal corporate artifacts. However, a deep audit of the gameplay loops, room grammar, and story progression reveals a key deficit: **the world is rich in background atmosphere, but lacks high-agency interactive focal points that physically anchor quests, branch narrative choices, and make distinct bunker sectors mechanically unique.**

Players currently walk through rooms where many objects are static decoration. When a quest tells the player to *"defuse pressure in Sector A-9's cooling lines"*, *"retrieve an encrypted corporate flight recorder"*, or *"commune with Dr. Vass's acoustic specimen"*, the game too often falls back on generic terminals or abstract inventory triggers. 

### 1.2 The Solution
This master plan authors **60 brand-new, non-duplicate interactive 3D GLB assets**, accompanied by **12 seamless PBR floor/wall textures** and **12 visceral decals**. 

Every one of the 60 items is designed with:
1. **Physical agency**: A dedicated `[E]` interaction profile, moving mechanical parts (Blender `HB_*` node hierarchy), dynamic lighting acknowledgements (`FX_LIGHT_*`), and custom sound/particle responses.
2. **Quest & Story Linchpin Integration**: Direct mapping to Act 1 bonding quests, Act 2 faction standing, Director Chen's corporate coverup, Mayor Tina's mimic trail, Dr. Vass's alien exodus thesis, or the final 4-seat shuttle departure.
3. **District Uniqueness**: Clear biome and room distribution so each sector (Substation, Geothermal Trench, Iron Bastion, Executive Black Site, Alien Brood Sanctum, Xenobiology Lab, Chasm Abyss, Shipwreck Fields, and Gantry) possesses recognizable landmarks found nowhere else.

---

## 2. Art Direction & Style Bible

To ensure visual coherence across all 60 models and their textures, every asset must adhere strictly to the established **Hunker Bunker Aesthetic Contract**.

```
                   +-----------------------------------------------+
                   |          HUNKER BUNKER AESTHETIC DUALITY       |
                   +-----------------------------------------------+
                                          |
                   +----------------------+----------------------+
                   |                                             |
                   v                                             v
     BRUTAL CORPORATE INDUSTRIAL                    H.R. GIGER BIOMECHANICAL
     - Cast gunmetal, cold-rolled steel             - Sinuous ribbed tubing, vertebrae
     - Chipped dark enamel (#1c1917, #292524)       - Wet black latex, translucent amber chitin
     - Tarnished brass compression fittings         - Calcified bone structures, ivory teeth
     - Braided high-voltage conduits                - Pulsating valves, organic sphincters
     - Stamped serial numbers, warning placards     - Weeping bile, bioluminescent spore sacs
```

### 2.1 The Two Visual Pillars
1. **Deep-Space Corporate Brutalism (Horizon Corporation)**:
   - Heavy, angular, cost-cut utilitarian hardware. Cast iron frames, riveted structural bulkheads, safety-wire latches, mechanical levers, analog dials, and chipped military-drab paint over rusted undercoats.
   - Tells the story of an indentured labor workforce squeezed to death by corporate bean-counters in a sub-zero nightmare.
2. **Giger Biomechanical Body Horror (The PregAlien Hive)**:
   - Sinuous, erotic, skeletal anatomy fused seamlessly with hydraulic piping and industrial machinery. Polished translucent chitin, glistening wet black latex, ribbed tracheal tubes, pelvic bone scaffolds, and pulsing organic membranes.
   - Tells the story of an ancient assimilating matriarch turning corporate technology into reproductive incubators.

### 2.2 Palette & Single-Accent Illumination Standard
Every model features unlit, physically plausible materials with **exactly one authored accent color**. This accent color drives the practical point light in Three.js (`src/propFx.js`) without blowing out the 8-light dynamic pool budget.

| Faction / System | Accent Color | Hex Code | Visual Meaning |
|---|---|---|---|
| **Meridian / Cryo Systems** | Cyan | `#22D3EE` | High voltage, chilled coolant, digital logic, data stream |
| **Corporate / Security / Hazard** | Horizon Red | `#EF4444` | Biometric lockout, emergency purge, high danger, execution |
| **Industrial / Heavy Utility** | Warning Amber | `#F59E0B` | Boiler pressure, fuel line, mechanical power, mining status |
| **Tallow Hydro / Bio-Spore** | Spore Lime | `#84CC16` | Geothermal nutrients, psychotropic lichen, fungal incubation |
| **Hive Xenobiology** | Brood Emerald | `#22C55E` | Pure alien bile, neural synapse, symbiotic gestation |
| **Endgame Royal Hive** | Queen Gold | `#EAB308` | Royal jelly, unhatched queen caul, primordial biomass |

### 2.3 Image-to-3D Prompt Engineering Standards
For all generative 3D pipelines (Tripo3D, Meshy, Rodin, Hunyuan):
- **Neutral 50% Studio Grey Background (`#808080`)**: Eliminates chromatic bounce, green spill, and magenta edge fringing from baking into textures during photogrammetric meshing.
- **Orthographic Studio Lighting**: 360-degree soft diffuse 5500K illumination. No harsh directional shadows; no floor plane or cast shadows.
- **Single Object Isolation**: Exactly one prop centered in 1:1 frame with 10% breathing border.
- **Standard Negative Exclusion Block**:
  ```text
  concept art, illustration, drawing, sketch, ink lines, cross-hatching, painterly, cel shading, cartoon, anime, low detail, blurry, flat lighting, harsh shadows, ground shadow, floor, horizon, scenery, background objects, gradient background, vignette, depth of field, lens flare, multiple objects, turnaround sheet, split panels, collage, people, human nudity, human genitals, text, logos, watermark, signature, clean sterile sci-fi, medieval fantasy, church, crosses, altars, runes, pastel colors
  ```

---

## 3. Technical Specifications & Articulation Contract

### 3.1 Model Budgets & Dimensions
- **Polygon Ceiling**:
  - Hero Machinery & Traversal Systems (e.g. `chasm_cable_traversal_winch`, `substation_stepdown_transformer`): $\le 16,000$ triangles.
  - Interactive Consoles, Stations & Containers (e.g. `corp_biometric_wall_safe`, `vass_translation_phonograph`): $\le 9,000$ triangles.
  - Field Relics, Pickups & Compact Sensors (e.g. `meridian_soldering_hearth`, `relay_harmonic_tuning_fork`): $\le 4,500$ triangles.
- **Texture Compression**: 2048×2048 WebP masters converted to Basis Universal KTX2 (`etc1s` for diffuse/ORM, `uastc` for normal maps) via `scripts/art/convert_glb_textures_ktx2.py`.
- **Runtime Footprint**: Target file size under 3.5 MB per asset.

### 3.2 Blender Node Hierarchy & Motion Conventions
Models with moving components must be authored with dedicated child nodes in Blender. The runtime engine (`src/propArticulation.js`) consumes `hb_*` glTF extras preserved through `gltfpack -kn -ke`:

```
[Root: Object_Name] (Origin: Bottom Center [0, 0, 0])
   ├── HB_BODY (Static chassis, baseplate, structural frame)
   ├── HB_DOOR / HB_LEVER / HB_ROTORS (Articulated part; origin on hinge axis)
   │     ├── glTF Extras:
   │     │     hb_motion: "rotate" | "slide" | "spin" | "pulse"
   │     │     hb_axis: "x" | "y" | "z"
   │     │     hb_open_angle: 1.5708 (radians for 90°)
   │     │     hb_open_offset: 0.45 (meters for slides)
   │     │     hb_duration: 0.65 (seconds)
   │     │     hb_sound: "vault_open" | "power_hum" | "flesh_seal"
   ├── FX_LIGHT_00 (Point light spawn anchor)
   ├── FX_GLOW_00 (Emissive lens/indicator coordinate)
   ├── FX_PARTICLE_00 (Steam, spark, or spore emitter coordinate)
   └── INTERACTION_00 (Floating interaction HUD anchor, Y = 1.2m default)
```

---

## 4. The 60 Interactive GLB Assets Manifest

The 60 assets are organized into **10 thematic suites of 6 assets each**, representing every major faction, location, quest line, and narrative mystery in the game.

```
+----------------------------------------------------------------------------------------------------+
|                               THE 60 NEW INTERACTIVE ASSETS MAP                                    |
+----------------------------------------------------------------------------------------------------+
| Suite 1: Subterranean Geothermal & Hydroponic Trenches (Sector B-4 / Tallow Deep)                   |
| Suite 2: High-Voltage Substation & Mainframe Sanctum (Sector A-9 / Meridian Core)                   |
| Suite 3: The Iron Guild Redoubts & Frontline Armory (Sector C-7 / Vesper Stronghold)                |
| Suite 4: Horizon Corporate Executive Black Sites & Director Chen's Vaults (Sub-Level 13)            |
| Suite 5: The Three Alien Brood Altars & Hive Rituals (Nahl, Vey, Rhun)                              |
| Suite 6: Xenobiology Outpost 04 & Dr. Okonkwo-Vass's Laboratories                                  |
| Suite 7: Mayor Tina's Infiltration Trail & Covert Brood Operations                                 |
| Suite 8: The Chasm Void, Abyss Drops & Deep Seismic Rigs                                            |
| Suite 9: Crash Site Shipwrecks & Class Payload Archetypes (Scout, Tank, Engineer)                   |
| Suite 10: The Act 2 Escape Gantry, Shuttle Systems & Mothership Breach                              |
+----------------------------------------------------------------------------------------------------+
```

---

### Suite 1: Subterranean Geothermal & Hydroponic Trenches (Sector B-4 / Tallow Deep)
*Narrative Context:* Sister Martha's agrarian bio-cult lives alongside the scalding steam lines of the bunker floor. They cultivate psychotropic fungal cultures, distill illicit antitoxins, and regulate volatile geothermal steam vents that keep them from freezing.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tri Budget | Accent Light | Articulation / Action |
|---|---|---|---|---|---|---|
| 01 | `geo_steam_manifold_actuator` | `geo_steam_manifold_actuator.glb` | 1.8m × 1.2m × 0.9m | 9.5k | Amber (`#f59e0b`) | `HB_WHEEL` spins 720°; releases steam cloud; clears bypass tunnel |
| 02 | `tallow_vaccine_alembic` | `tallow_vaccine_alembic.glb` | 1.5m × 1.1m × 0.8m | 8.0k | Spore Lime (`#84cc16`) | `HB_STOPCOCK` levers down; dispenses Bio-Dampener serum |
| 03 | `hydro_mycelial_seed_vault` | `hydro_mycelial_seed_vault.glb` | 2.1m × 1.0m × 0.7m | 8.5k | Cyan (`#22d3ee`) | `HB_DOOR` swings 100°; reveals frozen heirloom crop vials |
| 04 | `tallow_irrigation_sluice_gate`| `tallow_irrigation_sluice_gate.glb`| 2.4m × 1.6m × 0.5m | 9.0k | Amber (`#f59e0b`) | `HB_GATE` slides vertically +0.8m; changes water drainage state |
| 05 | `tallow_apothecary_dryer_rack` | `tallow_apothecary_dryer_rack.glb` | 1.9m × 1.4m × 0.6m | 7.5k | Spore Lime (`#84cc16`) | `HB_TRAY` slides outward +0.4m; harvests dried antimicrobial moss |
| 06 | `geo_pressure_relief_siren` | `geo_pressure_relief_siren.glb` | 2.2m × 0.8m × 0.8m | 7.0k | Warning Red (`#ef4444`)| `HB_VALVE_LEVER` pulls down; blasts emergency horn; vents hazard |

#### Suite 1 Prompts & Interaction Specs

**01. Geothermal Steam Manifold Actuator** — `geo_steam_manifold_actuator.glb`
- **Lore:** Controls Sector B-4 high-pressure geothermal bypass line. Overpressurized by seismic shifts.
- **Quest Hook:** *Reactor Venting (Act 1)* — Turn wheel to clear scalding steam barrier in south corridor.
- **Interaction Spec:** `[E] BLEED GEOTHERMAL MANIFOLD`. Toggles `open`/`closed`. Emits dynamic steam particles at `FX_PARTICLE_00`, drops room hazard by 40%.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy industrial geothermal steam manifold actuator (1.8 m H, 1.2 m W, 0.9 m D): a cast-iron steam bypass junction bolted to a steel floor flange, featuring thick lagged steel pipes insulated with asbestos wraps bound with copper wire. A large, five-spoke cast-bronze manual valve handwheel sits at chest height, encrusted with green verdigris patina and chalky mineral lime deposits. An analog dial pressure gauge with a cracked convex glass face shows a needle pegged in the red hazard zone. Dual emergency spring-loaded copper pressure relief valves vent upward with stained brass discharge bells. Chipped matte olive drab enamel on the valve housing, cold cast gunmetal pipe flanges, weeping condensation droplets, heat-scorched peeling paint. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter side view. Single accent light: warm amber indicator lamp (#f59e0b) on the gauge body. Exclude: text, letters, people, hands, floor, horizon, shadows. Square 1:1, 2048x2048.
```

**02. Tallow Vaccine Distillation Alembic** — `tallow_vaccine_alembic.glb`
- **Lore:** Sister Martha's clandestine pharmacology rig used to synthesize antitoxins from mutated cave lichen.
- **Quest Hook:** *Spore Cleansing (Act 1)* — Distill 3 doses of Bio-Dampener to protect survivors.
- **Interaction Spec:** `[E] EXTRACT SYNTHETIC ANTITOXIN`. Non-repeatable. Drops consumable `bio_dampener_vial` (+20% Toxic Resistance for 180s).
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE clandestine pharmaceutical distillation alembic rig (1.5 m H, 1.1 m W, 0.8 m D): a retrofitted laboratory distillation apparatus supported by a welded steel rebar frame. Heavy borosilicate glass boiling retorts and spiral condensing coils filled with glowing fluorescent lime-green biological broth. A hammered copper alembic dome cap sits atop a steam-jacketed heating kettle. Ribbed silicone feed tubes secured with rusted medical hose clamps connect to an amber glass collection flask suspended in an ice-water bath. Analog brass needle valve stopcock at the base. PBR materials, tarnished hammered copper with oily heat rainbow patina, cold industrial steel, bubbles inside glass coils, condensation runs, dripping silicone tubes. Soft even studio lighting, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin, three-quarter view. Single accent light: vibrant bioluminescent spore-lime liquid glow (#84cc16) illuminating the glass coils. Exclude: floor, horizon, background objects, text, hands. Square 1:1, 2048x2048.
```

**03. Hydroponic Mycelial Seed Vault** — `hydro_mycelial_seed_vault.glb`
- **Lore:** Hermetically sealed cryogenic bank preserving pre-impact terrestrial seeds and cultivated fungal spores.
- **Quest Hook:** Act 1 Tallow Camp growth upgrade; required to reach Camp Level 2.
- **Interaction Spec:** `[E] OPEN SEED VAULT`. `HB_DOOR` swings open 100°. Awards +30 Scrap and unlocks camp food rations.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE upright hydroponic mycelial seed vault cabinet (2.1 m H, 1.0 m W, 0.7 m D): a heavy reinforced stainless steel cryogenic storage safe. The thick vault door features an exterior brass three-point locking wheel and a mechanical combination tumbler. Recessed into the door face is a frosted perspex observation window glowing with icy interior illumination. Heavy insulated cryogenic rubber door gaskets with visible frost crystals. Rusted lower mounting feet bolted into structural floor skids. The interior reveals slide-out stainless steel trays holding rows of small, frost-covered borosilicate glass cryogenic seed vials labeled with color-coded rubber caps. Brutal corporate industrial hardware, chipped battleship grey enamel, cold brushed steel, dripping condensation. Neutral studio lighting on flat neutral grey (#808080) background. Single accent light: cold cryogenic cyan status LED (#22d3ee) on the door frame. Exclude: people, floor, horizon, shadows. Square 1:1, 2048x2048.
```

**04. Tallow Irrigation Sluice Gate** — `tallow_irrigation_sluice_gate.glb`
- **Lore:** Regulates the flow of mineral-rich geothermal runoff into the subterranean hydro-beds.
- **Quest Hook:** Environmental puzzle; diverting the flow lowers toxic water level in adjacent flooded storage.
- **Interaction Spec:** `[E] CRANK SLUICE GATE`. `HB_GATE` raises 0.8m. Unblocks passage through drainage canal.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy mechanical irrigation sluice gate (2.4 m H, 1.6 m W, 0.5 m D): an industrial steel channel frame holding a heavy sliding cast-iron gate slab. An overhead crossbeam supports a bronze Acme threaded screw shaft driven by a top-mounted cast-iron spoke wheel. The lower portion of the gate slab is heavily corroded, encrusted with thick brown mineral scaling, orange rust flakes, and stringy wet green cave algae. Twin vertical guide tracks with grease-packed brass gibs. Sturdy angle-iron side buttresses designed for channel mounting. Cold dark iron, industrial bronze, chipped black paint, glistening wet water marks. Soft diffuse studio ambient on solid flat neutral grey (#808080) background. Single accent light: amber caution reflector diode (#f59e0b) on the overhead crossbeam. Exclude: water, ground, floor, horizon, text. Square 1:1, 2048x2048.
```

**05. Tallow Apothecary Dryer Rack** — `tallow_apothecary_dryer_rack.glb`
- **Lore:** Screened curing cabinet where Tallow cultivators dry harvested psychotropic shelf fungi and medicinal lichen.
- **Quest Hook:** *The Lost Cultist (Act 1)* — Recover rare medicinal fungus samples for Sister Martha.
- **Interaction Spec:** `[E] INSPECT DRYING RACK`. Pulls out top tray; rewards consumable `purified_spore_salve` (+50 HP).
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE industrial apothecary herb dryer cabinet (1.9 m H, 1.4 m W, 0.6 m D): an open-front angle-iron rack containing ten stacked, pull-out wire-mesh drying trays. Spread across the galvanized woven wire screens are clusters of drying mutated shelf fungi, withered fibrous blue roots, and clumps of bioluminescent olive-green cave moss. A lower vented sheet-metal heating plenum box with louvers and a coiled electric heating element glowing faintly through the slats. Riveted galvanized steel frame, tarnished copper wire clips, dust and organic debris, dried resin crusts. Soft studio lighting on flat neutral grey (#808080) background. Single accent light: soft warm green bioluminescence (#84cc16) radiating from the drying fungi. Exclude: people, floor plane, shadows, text. Square 1:1, 2048x2048.
```

**06. Geothermal Pressure Relief Siren** — `geo_pressure_relief_siren.glb`
- **Lore:** Mechanical siren tower that automatically screams when tectonic pressure spikes threaten to rupture bunker steam mains.
- **Quest Hook:** World event; sounding the siren distracts crawling enemies away from the player's path for 45s.
- **Interaction Spec:** `[E] TRIP PRESSURE RELEASE`. Pulls emergency lever; triggers high-pitched horn and deafening steam vent.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy geothermal pressure relief warning siren post (2.2 m H, 0.8 m W, 0.8 m D): an upright cast-steel pedestal supporting a twin-opposed bronze warning siren horn assembly. A vertical high-pressure steam supply pipe feeds directly into the siren rotor housing. A weighted cast-iron mechanical drop lever with an oversized red painted ball handle is rigged to a trip-wire release latch. An analog Bourdon-tube pressure gauge with brass housing and a shattered glass lens is clamped to the central riser. Heavy industrial cast iron, chipped red and black paint, steam-scoured bare metal, pitted bronze horn bells. Soft studio lighting on solid neutral grey (#808080) background. Single accent light: intense emergency warning red status diode (#ef4444) on the trip housing. Exclude: people, floor, horizon, text. Square 1:1, 2048x2048.
```

---

### Suite 2: High-Voltage Substation & Mainframe Sanctum (Sector A-9 / Meridian Core)
*Narrative Context:* Overseer Kaelen and the Meridian tech-scavengers worship the bunker's decaying logic mainframe as a slumbering digital god. They graft human spinal columns into patchbays, repair high-voltage arc breakers, and harvest logic cores.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tri Budget | Accent Light | Articulation / Action |
|---|---|---|---|---|---|---|
| 07 | `meridian_optic_nerve_patchbay`| `meridian_optic_nerve_patchbay.glb`| 2.0m × 1.2m × 0.8m | 10.5k | Cyan (`#22d3ee`) | `HB_CABLE` jack plugs in; connects neural route; reveals encrypted log |
| 08 | `substation_stepdown_transformer`|`substation_stepdown_transformer.glb`| 2.5m × 2.0m × 1.4m | 12.0k | Amber (`#f59e0b`) | `HB_KNIFE_SWITCH` arcs downward; restores power to sector lighting |
| 09 | `meridian_servitor_recharge_cradle`|`meridian_servitor_recharge_cradle.glb`| 2.3m × 1.3m × 1.0m| 9.0k | Cyan (`#22d3ee`) | `HB_CLAMP` overhead arm lowers; recharges player exosuit battery |
| 10 | `meridian_logic_core_drum` | `meridian_logic_core_drum.glb` | 1.6m × 1.1m × 1.1m | 8.5k | Amber (`#f59e0b`) | `HB_ROTOR` drum spins; reads magnetic storage; unlocks class blueprints |
| 11 | `substation_breaker_interlock` | `substation_breaker_interlock.glb` | 1.7m × 0.9m × 0.5m | 7.5k | Warning Red (`#ef4444`)| `HB_HANDLE` pulls down; clears electrical floor hazard |
| 12 | `meridian_soldering_hearth` | `meridian_soldering_hearth.glb` | 1.2m × 1.5m × 0.8m | 8.0k | Cyan (`#22d3ee`) | `HB_ARM` robotic loupe pans; crafts weapon circuit modifications |

#### Suite 2 Prompts & Interaction Specs

**07. Meridian Optic Nerve Patchbay** — `meridian_optic_nerve_patchbay.glb`
- **Lore:** Where Meridian scavengers spliced human optic nerves and cerebral cords into fiber-optic telecommunications patch panels.
- **Quest Hook:** *The Lost Probe (Act 1)* — Interface your exosuit with the patchbay to locate telemetry probes.
- **Interaction Spec:** `[E] COMMUNE WITH PATCHBAY`. Connects optic jack; grants radar shroud coordinate; shifts player humanity by -2.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE cybernetic optic nerve patchbay terminal (2.0 m H, 1.2 m W, 0.8 m D): an industrial server rack frame retrofitted with grotesque biomechanical telecommunication switchboards. Dense vertical banks of brass 1/4-inch audio-style patch jacks interwoven with translucent silicone tubing and glistening preserved white human optical nerve bundles coiled like braided cables. Patch cords made of braided copper wire ending in steel phone plugs, some plugged into active sockets. A small monochrome green CRT monitor at eye level displaying cascading hexadecimal code lines. Chipped matte dark charcoal industrial steel, wet glistening organic nerve fibers, exposed solder joints, greasy smudges, electrical tape wraps. Soft even studio lighting on flat neutral grey (#808080) background. Single accent light: crisp cyan digital glow (#22d3ee) emanating from the CRT screen and patch sockets. Exclude: people, floor, background objects, text, logos. Square 1:1, 2048x2048.
```

**08. Substation Step-Down Transformer Bank** — `substation_stepdown_transformer.glb`
- **Lore:** Massive high-voltage oil-filled electrical transformer that steps 13.8kV bus voltage down to bunker grid power.
- **Quest Hook:** Major progression gate; activating it powers up the elevator in Sector A-9.
- **Interaction Spec:** `[E] THROW TRANSFORMER BUS SWITCH`. `HB_KNIFE_SWITCH` closes with electrical arc; turns on room lights.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE massive industrial step-down transformer bank (2.5 m H, 2.0 m W, 1.4 m D): a heavy ribbed cast-steel oil-filled transformer housing flanked by external vertical cooling radiator fins. Three colossal fluted porcelain high-voltage insulator bushings crown the top, connected to heavy copper bus bars. A side-mounted, manually operated triple-pole air-break knife switch with a long insulated fiberglass operating handle, showing pitted copper contact jaws. A lower oil level sight glass stained dark amber. Rust-streaked transformer grey paint, oil stains around flange gaskets, safety warning stencils, heavy steel lifting lugs. Soft studio lighting on flat neutral grey (#808080) background. Single accent light: intense electrical amber glow (#f59e0b) from an internal oil heating element and indicator glass. Exclude: sparks, floor, horizon, shadows. Square 1:1, 2048x2048.
```

**09. Meridian Servitor Recharge Cradle** — `meridian_servitor_recharge_cradle.glb`
- **Lore:** Wall-mounted maintenance alcove where corporate service drones and exosuit operators hook into high-current inductive taps.
- **Quest Hook:** Recharges player tactical abilities / exosuit shield capacitors.
- **Interaction Spec:** `[E] DOCK IN RECHARGE CRADLE`. `HB_CLAMP` locks down; restores 100% Exosuit Battery.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE wall-mounted servitor recharge cradle (2.3 m H, 1.3 m W, 1.0 m D): an upright industrial steel charging dock built to support a standing humanoid exoskeleton. Two heavy padded hydraulic locking arms swing inward from the side pillars to secure the torso. An overhead telescoping umbilical boom terminates in a heavy multi-pin copper charging collar. Heavy armored conduit feeds into a wall-mounted transformer junction box with cooling louvers. Ribbed rubber floor standing plate with grounding copper brushes. Scuffed industrial safety-yellow and black hazard paint, greasy hydraulic cylinders, worn leather restraint pads. Soft studio lighting on solid neutral grey (#808080) background. Single accent light: glowing cyan charging diode arc (#22d3ee) around the overhead collar. Exclude: people, floor, horizon, shadows. Square 1:1, 2048x2048.
```

**10. Meridian Magnetic Drum Logic Core** — `meridian_logic_core_drum.glb`
- **Lore:** Early-generation rotating magnetic memory drum cradled within a calcified pelvic bone frame, decoding neural impulses through mechanical induction and pickled cerebral tissues.
- **Quest Hook:** *Kaelen's Manifest (Linchpin)* — Extract the uncorrupted flight manifests from the cerebral memory core.
- **Interaction Spec:** `[E] SPIN UP MEMORY DRUM`. `HB_ROTOR` spins; yields +35 Scrap and unlocks rare weapon mod blueprint.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE cybernetic rotating magnetic logic drum unit (1.6 m H, 1.1 m W, 1.1 m D): an open-caged industrial steel server plinth framed by fused human pelvic bones and polished chrome spinal struts. A large, vertically mounted polished nickel-plated brass cylindrical drum is suspended between heavy precision ball-bearing pillow blocks. Encased in a central thick quartz cylinder within the drum is a preserved human cerebral cortex pickled in clear conductive cerebrospinal fluid, interwoven with delicate acupuncture-needle magnetic read/write head combs mounted on articulated skeletal finger assemblies that hover micrometers from the spinning drum surface. Ribbed wet black latex conduits, vacuum tube preamplifiers with glowing orange filaments, weeping synovial grease on precision jewel bearings. Story it tells: early-generation rotating magnetic memory drum preserved by Meridian as a cyber-deity relic. Exactly one accent light: warm amber illumination from the vacuum tube filaments (#f59e0b); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**11. Substation High-Voltage Breaker Interlock** — `substation_breaker_interlock.glb`
- **Lore:** Manual safety interlock switchboard encased in tight black latex and petrified vertebral columns, used to isolate shorted cables in flooded electrical vaults.
- **Quest Hook:** Environmental hazard removal; defuses electrified water on the floor.
- **Interaction Spec:** `[E] DISENGAGE HIGH-VOLTAGE BREAKER`. `HB_HANDLE` pulls down; removes shock hazard.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE brutal high-voltage electrical breaker switchboard (1.7 m H, 0.9 m W, 0.5 m D): an imposing wall-mounted electrical cabinet encased in a cage of petrified human vertebral columns and tight vulcanized black rubber corseting. The massive three-pole knife switch features heavy cast-copper blades that penetrate labial rubber-gasketed arc chutes, gripped by mummified chrome-plated human finger tendons serving as high-tension spring returns. Arc-chute barriers formed from calcified bone plates charred black by high-voltage plasma flashovers. Heavy braided copper bus cables braided like visceral umbilical cords. An external cast-iron interlock operating lever with a knurled cylindrical grip is mounted on the side. Blown porcelain fuse cartridges with melted lead filaments, electrical soot deposits, pitted copper jaws. Story it tells: manual safety interlock switchboard used to isolate shorted, sparking cables in flooded electrical vaults. Exactly one accent light: bright red trip-flag indicator diode on the breaker crown (#ef4444); every other surface is unlit material colour. H.R. Giger biomechanical body horror fused with brutal deep-space corporate industrialism: glistening wet black latex, polished translucent chitin, ribbed cartilage, calcified ivory bone, cold cast gunmetal and chrome, weeping bile, exposed vascular networks, sinuous vertebrae, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**12. Meridian Precision Soldering Hearth** — `meridian_soldering_hearth.glb`
- **Lore:** Scavenger cybernetic surgery bench with an obsidian dissection slab, fitted with an articulated chrome probe arm holding an illuminated ruby-laser needle that solders gold leads directly into moist, pulsating neural ganglia.
- **Quest Hook:** Crafting station for upgrading tactical console sensors and drone components.
- **Interaction Spec:** `[E] MODIFY TACTICAL CIRCUITS`. `HB_ARM` swings; upgrades Scanner Pulse radius by 25%.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE precision cybernetic surgery workbench hearth (1.2 m H, 1.5 m W, 0.8 m D): an industrial steel workbench topped with an etched black volcanic obsidian slab with fluid drainage grooves. An articulated mechanical arm composed of interlocking chrome finger phalanges holds an illuminated magnifying loupe and a miniature ruby-crystal laser soldering torch. The workspace is cluttered with exposed silicon logic boards soldered directly onto living, twitching ganglion clusters, spools of fine silver wire, and ceramic pots of dark amber rosin flux. A flexible ribbed silicone suction hose hangs from the rear lip, crusted with dried chemical residue. Brushed aluminum, burnt rosin crusts, scorched obsidian tiles, machine oil. Story it tells: scavenger workbench where tech-priests solder cybernetic implants directly into living neural ganglia. Exactly one accent light: cyan diagnostic LED ring around the magnifying loupe lens (#22d3ee); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: wet black latex, polished chitin, ribbed cartilage, ivory bone, cold gunmetal and chrome, weeping bile, exposed vascular networks, sinuous vertebrae, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```
---

### Suite 3: The Iron Guild Redoubts & Frontline Armory (Sector C-7 / Vesper Stronghold)
*Narrative Context:* Commander Briggs and his battle-hardened mercenaries fight a bloody war of attrition against the crawling hive swarm. Their sector is a fortress of sandbags, ordnance disassembly tables, hand-cranked trench sirens, and memorial dogtag vaults.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tri Budget | Accent Light | Articulation / Action |
|---|---|---|---|---|---|---|
| 13 | `vesper_ordnance_disarm_table`| `vesper_ordnance_disarm_table.glb`| 1.3m × 1.8m × 1.0m | 9.0k | Warning Red (`#ef4444`)| `HB_VISE` rotates; defuses unexploded shell; yields heavy powder |
| 14 | `vesper_trench_warning_klaxon`| `vesper_trench_warning_klaxon.glb`| 2.1m × 0.7m × 0.7m | 6.5k | Amber (`#f59e0b`) | `HB_CRANK` spins 360°; sounds trench alarm; alerts nearby guards |
| 15 | `vesper_ballistic_chronograph`| `vesper_ballistic_chronograph.glb`| 1.5m × 1.2m × 0.6m | 7.5k | Amber (`#f59e0b`) | `HB_SLIDE` aligns sensor; boosts weapon penetration rate +15% |
| 16 | `vesper_mortar_loading_cradle`| `vesper_mortar_loading_cradle.glb`| 1.6m × 1.4m × 1.4m | 9.5k | Warning Red (`#ef4444`)| `HB_CRADLE` tilts 45°; loads heavy seismic shell into trench mortar |
| 17 | `vesper_dogtag_retrieval_crypt`|`vesper_dogtag_retrieval_crypt.glb`| 1.9m × 1.1m × 0.6m| 8.0k | Amber (`#f59e0b`) | `HB_DRAWER` pulls out +0.5m; files lost contractor dogtag; +1 Bond |
| 18 | `vesper_barricade_welding_rig`| `vesper_barricade_welding_rig.glb`| 1.4m × 1.2m × 0.8m | 8.5k | Warning Red (`#ef4444`)| `HB_TORCH` lifts; reinforces structural barricade against breach |

#### Suite 3 Prompts & Interaction Specs

**13. Vesper Ordnance Disarming Table** — `vesper_ordnance_disarm_table.glb`
- **Lore:** Ballistic-shielded workbench where combat engineers dismantle dud seismic shells to harvest high-explosive cordite and alien bio-igniters.
- **Quest Hook:** *Armory Breach (Act 1)* — Harvest explosives to breach the reinforced armory bulkhead.
- **Interaction Spec:** `[E] DISARM ARTILLERY SHELL`. Non-repeatable. Awards `heavy_ordnance_charge` and +25 Scrap.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy military ordnance disarming bench (1.3 m H, 1.8 m W, 1.0 m D): a massive steel-plate workbench reinforced with welded tank tread plates and high ballistic splinter shields. Bolted to the center is a rotary hydraulic vise shaped like interlocking pelvic bones clamping an unexploded 150mm heavy seismic artillery shell, its cracked steel casing revealing a pulsating, calcified biological core fused with high-explosive cordite sticks. Articulated needle drippers apply liquid nitrogen onto exposed shivering tissue. Brass defusing wrenches, trays of removed percussion primers, deep gouges from shrapnel impacts, powder burns, dark coagulated stains, vice tool marks. Story it tells: ballistic-shielded workbench where combat engineers dismantle dud seismic shells to harvest high-explosive cordite. Exactly one accent light: harsh red warning LED on the blast shield perimeter (#ef4444); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**14. Vesper Trench Warning Klaxon** — `vesper_trench_warning_klaxon.glb`
- **Lore:** Mechanical trench siren mounted on a rusted I-beam, hand-cranked to coordinate defense lines with acoustic resonators carved from human pelvic bones.
- **Quest Hook:** *Bunker Holdout (Act 1)* — Sound alarm to summon Vesper fireteams to defend the barricade.
- **Interaction Spec:** `[E] CRANK TRENCH KLAXON`. `HB_CRANK` spins; sounds horn; summons friendly sentry drone.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE mechanical trench warning klaxon horn (2.1 m H, 0.7 m W, 0.7 m D): an upright structural steel I-beam column supporting a terrifying acoustic warning siren. The twin opposed flaring horn bells are sculpted from polished human pelvic bone plates and preserved vocal trachea tubes wrapped in dried sinew lashings. A heavy manual cast-iron hand crank with an ergonomic phallic ivory handle drives an internal centrifugal rotor that forces pressurized air through the biological resonators. Clamping brackets bolted to the I-beam with heavy lock-washers, pitted bronze bells, chipped military-green enamel, dark grease stains, rusted steel edges. Story it tells: mechanical air-raid horn mounted on trench posts, hand-cranked to coordinate bunker defense lines during blackouts. Exactly one accent light: amber caution reflector glass on the siren housing (#f59e0b); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**15. Vesper Ballistic Velocity Chronograph** — `vesper_ballistic_chronograph.glb`
- **Lore:** Optical testing rig for sniper ammunition, measuring muzzle velocity and armor penetration through hollow bone sensor gates.
- **Quest Hook:** Gunsmith station; calibrates rifle ammunition for maximum armor penetration.
- **Interaction Spec:** `[E] CALIBRATE AMMUNITION`. Increases player projectile velocity by 20% for 300s.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE ballistic velocity chronograph test stand (1.5 m H, 1.2 m W, 0.6 m D): a portable folding aluminum tripod stand with legs carved from fluted bone and carbon fiber. Supporting an aluminum rail are two upright triangular optical sensor gates forged from bleached human thoracic ribs, housing infrared laser slits that track bullet velocity through empty eye-socket apertures. A central brass readout console features an analog dial and tactile toggles, flanked by trays of oversized brass armor-piercing rifle cartridges tipped with serrated black chitin penetrators. Sandblasted aluminum, matte black rubber, brass casings, scratched powder-coated brackets. Story it tells: optical twin-screen chronograph bench used by snipers to measure handloaded bullet speed and propellant consistency. Exactly one accent light: amber backlighting behind the LCD display screen (#f59e0b); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**16. Vesper Seismic Mortar Loading Cradle** — `vesper_mortar_loading_cradle.glb`
- **Lore:** Swiveling hydraulic hoist arm sculpted to resemble an articulated biomechanical scorpion tail, lifting seismic mortar bombs into the battery breech.
- **Quest Hook:** *Briggs' Oath (Linchpin)* — Arm the artillery battery to seal off the hive tunnels.
- **Interaction Spec:** `[E] LOAD SEISMIC SHELL`. `HB_CRADLE` swings and locks into breech; triggers cannon test fire.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy trench mortar shell loading cradle (1.6 m H, 1.4 m W, 1.4 m D): an articulated steel hoist arm sculpted to resemble an articulated biomechanical scorpion tail, mounted on a circular cast-iron floor turntable base. The hydraulic rams are wrapped in wet living muscle fibers and braided steel wire. The curved cradle is lined with ribbed black rubber and barbed steel clamps, holding an enormous phallic 120mm ground-penetrating seismic mortar bomb crusted with dried alien chitin and explosive primer leads. Cast-iron turntable with grease grooves, chipped dark red and olive drab paint, hydraulic hose bundles with brass crimp fittings. Story it tells: swiveling hydraulic hoist that lifts 120mm ground-penetrating seismic mortar shells into the battery breech. Exactly one accent light: red arming status lamp on the hoist pivot (#ef4444); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**17. Vesper Dogtag Retrieval Crypt** — `vesper_dogtag_retrieval_crypt.glb`
- **Lore:** Reinforced military morgue archive cabinet containing forty drawers holding dogtags pinned through preserved severed index fingers.
- **Quest Hook:** Turn in found dogtags (`drop_dogtags`) to raise Vesper camp bond and unlock heavy weaponry.
- **Interaction Spec:** `[E] DEPOSIT RECOVERED DOGTAGS`. `HB_DRAWER` opens; consumes item; +1 Vesper Bond.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE reinforced military morgue dogtag archive cabinet (1.9 m H, 1.1 m W, 0.6 m D): a heavy steel filing unit featuring forty individual pull-out steel drawers bound with tight leather harness straps. Each drawer has an embossed brass card-holder frame and a drop-ring pull handle. One center drawer is pulled open like a dissecting tray, revealing rows of polished brass and stainless steel contractor dogtags pinned through preserved, mummified severed index fingers resting in velvet-lined divider slots. Stenciled white casualty numbers on the cabinet frame, chipped military olive drab enamel, brass patina, hand-worn drawer edges, scratches, subtle dried blood smudges along the handles. Story it tells: heavy filing cabinet where the dogtags of fallen mercenaries are filed by serial number; proof of deceased contracts. Exactly one accent light: warm amber memorial inspection lamp mounted on the top rim (#f59e0b); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**18. Vesper Barricade Welding Rig** — `vesper_barricade_welding_rig.glb`
- **Lore:** Mobile torch cart holding cylinders sculpted like bio-mechanical lungs, feeding an articulated talon cutting torch to weld breached bulkheads.
- **Quest Hook:** Fortifies doors against enemy breach during survival holdout waves.
- **Interaction Spec:** `[E] WELD BARRICADE REINFORCEMENT`. Reinforces target door; adds +200 structural HP.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE mobile industrial gas welding cart (1.4 m H, 1.2 m W, 0.8 m D): a heavy two-wheeled steel hand-truck cart carrying twin tall pressure cylinders sculpted to resemble elongated bio-mechanical lungs wrapped in ribbed chitin armor plates and tight latex corsets. Flexible red and black ribbed tracheal hoses snake to a heavy cutting torch held in a skeletal three-jaw talon clamp. Brass high-pressure regulator gauges with T-handle adjustment screws. Scorched brass nozzles, bubbling heat-resistant lacquer, charred spatter marks from welding blast doors shut against the hive, soot stains. Story it tells: mobile torch cart and armor-plate clamp used to weld breached bunker blast doors shut under fire. Exactly one accent light: glowing red pilot flame indicator on the torch nozzle (#ef4444); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```
---

### Suite 4: Horizon Corporate Executive Black Sites & Director Chen's Vaults (Sub-Level 13)
*Narrative Context:* Sub-Level 13 houses the executive bunker where Director Chen executed corporate mutineers, locked down biometric liquidation records, and attempted to flee with biological contraband before the crawlers breached Bay C.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tri Budget | Accent Light | Articulation / Action |
|---|---|---|---|---|---|---|
| 19 | `corp_biometric_wall_safe` | `corp_biometric_wall_safe.glb` | 1.4m × 1.1m × 0.6m | 8.5k | Warning Red (`#ef4444`)| `HB_DOOR` swings 90°; bypass biometric lock; yields high-tier scrap |
| 20 | `corp_quantum_ledger_podium` | `corp_quantum_ledger_podium.glb`| 1.5m × 0.9m × 0.9m | 9.0k | Cyan (`#22d3ee`) | `HB_PRISM` holographic projector activates; plays Director Chen's log |
| 21 | `corp_compliance_choker_bench`| `corp_compliance_choker_bench.glb`| 1.3m × 1.6m × 0.9m| 8.5k | Warning Red (`#ef4444`)| `HB_CLAMP` disengages; defuses explosive worker collar; +5 Humanity |
| 22 | `corp_asset_incinerator_chute`| `corp_asset_incinerator_chute.glb`| 1.8m × 1.2m × 0.8m | 7.5k | Amber (`#f59e0b`) | `HB_HOPPER` swings outward; incinerates quest item for dark payout |
| 23 | `corp_cryo_transport_coffin` | `corp_cryo_transport_coffin.glb`| 1.0m × 2.2m × 0.9m | 10.0k | Cyan (`#22d3ee`) | `HB_LID` lifts with hydraulic hiss; unseals stolen alien embryo |
| 24 | `corp_executive_whisper_booth`| `corp_executive_whisper_booth.glb`| 2.3m × 1.1m × 1.1m | 9.0k | Amber (`#f59e0b`) | `HB_DOOR` slides; private off-world comms line; triggers story choice |

#### Suite 4 Prompts & Interaction Specs

**19. Horizon Biometric Executive Wall Safe** — `corp_biometric_wall_safe.glb`
- **Lore:** Recessed titanium-alloy safe door surrounded by erotic Giger bas-reliefs, featuring a fleshy biometric aperture that draws blood for DNA verification.
- **Quest Hook:** *Director Chen's Sealed Confession* — Use Chen's recovered ID badge (`drop_horizon_badge`) to open safe.
- **Interaction Spec:** `[E] SCAN DIRECTOR CREDENTIALS`. `HB_DOOR` unlocks; grants +50 Scrap and `chen_black_box_key`.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE high-security corporate executive wall safe (1.4 m H, 1.1 m W, 0.6 m D): a recessed heavy titanium-alloy safe door mounted flush in a cast-steel wall frame, surrounded by intricate bas-relief Giger sculptures of biomechanical faces and erotic anatomical curves. The central biometric scanner is a moist, fleshy silicone aperture with fine dental teeth that bite down gently on the user's hand to draw blood for DNA verification. Heavy rotating circular deadbolts with polished chrome locking lugs. An illuminated digital keypad and an analog emergency override keyhole beneath a flip-up brass dust cover. Brushed titanium door face with laser-etched Horizon Corporation heraldic logo, micro hairline scratches, dark grease smudges, pry-bar score marks along the door seam. Story it tells: titanium safe embedded into Director Chen's private bunker office, keyed to his severed biometric thumbprint. Exactly one accent light: red lockout LED bezel ringing the biometric aperture (#ef4444); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**20. Horizon Quantum Ledger Podium** — `corp_quantum_ledger_podium.glb`
- **Lore:** Faceted executive lectern carved from black obsidian and chrome spinal columns, holding a raw optical prism in an anatomical claw.
- **Quest Hook:** Lore terminal; reveals the truth about Horizon's deliberate bio-containment breach.
- **Interaction Spec:** `[E] ACCESS QUANTUM LEDGER`. `HB_PRISM` lights up; displays corporate audit records.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE executive quantum corporate ledger podium (1.5 m H, 0.9 m W, 0.9 m D): a towering, faceted modernist pedestal constructed from polished black obsidian composite and chrome vertebral columns. The angled top surface features a raw optical quartz refraction prism gripped by a chrome-plated skeletal hand with gold-tipped claws. Flanking the prism are gold-plated contact pins and capacitive glass touch-strips. A lower locked biometric data-cartridge drive slot is framed in weeping black latex gaskets with a magnetic eject lever. Cold monolithic corporate luxury fused with deep-space industrial horror, mirror-smooth black surfaces, fingerprint smudges, hairline glass fractures. Story it tells: encrypted holographic terminal recording off-world dividend payments, asset liquidation ratios, and worker debt ledgers. Exactly one accent light: cold cyan holographic projector emitter glow beneath the quartz prism (#22d3ee); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**21. Compliance Choker Calibration Bench** — `corp_compliance_choker_bench.glb`
- **Lore:** Disciplinary torture jig where hydraulic neck clamps calibrate explosive worker collars with barbed subcutaneous electrode pins.
- **Quest Hook:** Defuse a trapped survivor's armed shock collar before the countdown expires.
- **Interaction Spec:** `[E] DISARM COMPLIANCE CHOKER`. Rewards +5 Humanity and uncorrupted explosive cartridge.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE corporate compliance collar calibration bench (1.3 m H, 1.6 m W, 0.9 m D): a heavy steel guillotine-style workbench equipped with an adjustable hydraulic cervical collar clamp lined with sweat-stained black patent leather and barbed subcutaneous electrode needles. Clamped into the jig is an open, hinged titanium worker shock collar fitted with miniature directional shaped-charge explosives and exposed wire leads. An adjacent electronic diagnostic testing console features an analog microampere meter, blood-stained test leads, and severed cervical restraint straps. Chipped corporate grey enamel, leather sweat stains, dried blood spatters, wire clippings, screwdrivers on an instrument tray. Story it tells: disciplinary workbench where corporate security officers calibrated explosive biometric shock collars for indentured miners. Exactly one accent light: ominous red arming LED on the collar detonator (#ef4444); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**22. Corporate Asset Incinerator Chute** — `corp_asset_incinerator_chute.glb`
- **Lore:** Disposal furnace resembling a biomechanical throat with heat-scorched steel teeth, used to incinerate classified documents and corpses.
- **Quest Hook:** Linchpin action; destroy incriminating company records to protect corporate survivors, or preserve them for evidence.
- **Interaction Spec:** `[E] FEED INCINERATOR CHUTE`. `HB_HOPPER` opens; incinerates contraband for +40 Scrap.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE corporate security incinerator disposal chute (1.8 m H, 1.2 m W, 0.8 m D): an imposing wall-mounted disposal furnace whose heavy counterweighted hopper resembles a gaping biomechanical throat with interlocking heat-scorched steel teeth and ribbed refractory tile throat. Heavy hydraulic dampers hiss with steam as the hopper swings open, revealing an incandescent plasma firebox lined with scorched human bone ash and melted plastic identification badges. Twin braided hydraulic lines feeding coolant to the door seals. Brushed steel, firebox heat stains, scorched enamel, warning chevron placards. Story it tells: wall-mounted high-temperature plasma disposal chute used to burn classified evidence and human remains. Exactly one accent light: intense thermal amber glow leaking through the hopper door seals (#f59e0b); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**23. Cryogenic Specimen Transport Coffin** — `corp_cryo_transport_coffin.glb`
- **Lore:** Aerospace shipping sarcophagus with a ribbed acrylic canopy revealing an unhatched hybrid fetus suspended in glowing cyan amniotic coolant.
- **Quest Hook:** *The Carrier's Bargain (Ending D)* — Secure an unhatched embryo in the transport coffin to escape.
- **Interaction Spec:** `[E] SEAL CRYO TRANSPORT COFFIN`. `HB_LID` locks down; preserves specimen for transport.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE armored cryogenic specimen transport coffin (1.0 m H, 2.2 m L, 0.9 m W): a heavy rectangular aerospace shipping sarcophagus made of matte dark titanium and composite armor, lined with contoured black latex cushioning. A curved, triple-paned insulated acrylic observation window reveals a live, curled alien-human hybrid fetus suspended in glowing cyan amniotic coolant, hooked to pulsing umbilical filter cartridges and carnal nourishment lines. Four heavy cam-action locking latches seal the perimeter. External liquid nitrogen dewars with frost-coated stainless steel braided hoses. Frost-dusted seals, condensation runs, chipped composite corners, corporate cargo stencil markings. Story it tells: armored, hermetic shipping sarcophagus designed to smuggle live alien embryos through orbital customs. Exactly one accent light: vivid cyan cryogenic interior frost glow (#22d3ee); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**24. Corporate Executive Whisper Booth** — `corp_executive_whisper_booth.glb`
- **Lore:** Claustrophobic acoustic isolation booth lined with quilted wet black latex and cochlear ear cups where Director Chen made private off-world calls.
- **Quest Hook:** Audio terminal; triggers a recorded conversation detailing the company's sacrifice of Cocytus IV.
- **Interaction Spec:** `[E] ENTER WHISPER BOOTH`. `HB_DOOR` slides shut; plays voiceover audio log.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE executive soundproof whisper booth (2.3 m H, 1.1 m W, 1.1 m D): a cylindrical standalone acoustic isolation capsule made of curved leaded ballistic glass and blackened steel. The interior is upholstered in quilted wet black latex padding and fetishized restraint buckles, with twin acoustic cochlear horn cups that swing inward to seal against the user's ears. A heavy rotary telephone handset crafted from polished black chitin and tarnished brass rests on an interior pedestal. Curved sliding door on stainless steel roller tracks. Exterior lead shielding rivets, acoustic felt damping panels along the frame, scuffed metal floor plate, corporate insignia etched on glass. Story it tells: soundproofed, lead-shielded telephone capsule where Director Chen made private quantum calls to the Board of Directors. Exactly one accent light: warm amber ceiling dome light illuminating the interior stool (#f59e0b); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```
---

### Suite 5: The Three Alien Brood Altars & Hive Rituals (Nahl, Vey, Rhun)
*Narrative Context:* The three alien hive leaders (Nahl of Hive Suture, Vey of Hive Relay, Rhun of Hive Carapace) each possess dialogue trees, quest flags (`host_mercy`, `false_clearance`, `guard_oath`), and unique symbiotic bio-mechanisms.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tri Budget | Accent Light | Articulation / Action |
|---|---|---|---|---|---|---|
| 25 | `suture_flesh_mending_bath` | `suture_flesh_mending_bath.glb` | 1.2m × 2.4m × 1.2m | 11.0k | Brood Emerald (`#22c55e`)| `HB_DIAPHRAGM` pulses; immerses wounds; purges toxicity or mutates |
| 26 | `suture_larval_nursery_urn` | `suture_larval_nursery_urn.glb` | 1.6m × 1.0m × 1.0m | 8.0k | Spore Lime (`#84cc16`) | `HB_LID` organic sphincter dilates; collects symbiotic healing leeches |
| 27 | `relay_harmonic_tuning_fork`| `relay_harmonic_tuning_fork.glb`| 2.8m × 1.2m × 0.8m | 9.5k | Amber (`#f59e0b`) | `HB_TINES` vibrate; resonates telepathic signal; jams hive attacks |
| 28 | `relay_acoustic_diaphragm` | `relay_acoustic_diaphragm.glb` | 2.2m × 1.5m × 0.6m | 9.0k | Amber (`#f59e0b`) | `HB_MEMBRANE` breathes; plays mimics' voice; unlocks hive clearance |
| 29 | `carapace_chitin_press` | `carapace_chitin_press.glb` | 2.4m × 1.8m × 1.2m | 12.0k | Brood Emerald (`#22c55e`)| `HB_RAM` presses downward; crushes insect husks into armor plate |
| 30 | `carapace_ossuary_anvil` | `carapace_ossuary_anvil.glb` | 1.4m × 1.6m × 1.0m | 9.0k | Brood Emerald (`#22c55e`)| `HB_HAMMER` bone tool strikes; crafts heavy biomech shield plate |

#### Suite 5 Prompts & Interaction Specs

**25. Suture Flesh-Mending Amniotic Bath** — `suture_flesh_mending_bath.glb`
- **Lore:** Freestanding healing basin sculpted from polished black chitin and pelvic bone arches, dripping warm emerald amniotic jelly onto submerged wounds.
- **Quest Hook:** *Host Mercy (Linchpin)* — Cleanse your infection completely (+40 Humanity) OR accept permanent symbiotic mutation.
- **Interaction Spec:** `[E] SUBMERGE IN AMNIOTIC BATH`. `HB_DIAPHRAGM` undulates; triggers linchpin choice screen.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE biomechanical amniotic healing bath (1.2 m H, 2.4 m L, 1.2 m W): an elongated freestanding organic basin sculpted from polished black chitin and calcified pelvic bone arches. The deep trough is filled with warm, viscous emerald amniotic jelly that undulates gently with peristaltic pulses. Overhead articulated bone ribs suspend delicate weeping feeder tentacles and phallic injector needles that drip restorative bio-plasma onto submerged wounds. Sinuous ribbed tracheal supply tubes feed into the underside of the tub like plumbing, pulsating with life. Glistening wet black latex surfaces, translucent cartilage, cold bone, wet organic specular highlights, living vascular networks. Story it tells: Hive Suture's (Nahl) healing basin where wounded humans are immersed in warm symbiotic nutrient jelly rather than digested. Exactly one accent light: luminous bioluminescent emerald green glow emanating from within the amniotic fluid (#22c55e); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**26. Suture Larval Nursery Urn** — `suture_larval_nursery_urn.glb`
- **Lore:** Translucent amber chitin amphora with a moist sphincter iris, incubating bioluminescent leeches that stitch torn living tissue.
- **Quest Hook:** Harvests consumable `symbiotic_suture_larva` (repairs broken armor instantly).
- **Interaction Spec:** `[E] HARVEST SYMBIOTIC LARVA`. Dilates sphincter mouth; yields consumable item.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE biomechanical larval nursery urn (1.6 m H, 1.0 m W, 1.0 m D): a tall, fluted amphora sculpted from hardened translucent amber chitin and ribbed skeletal vertebrae. The top opening is sealed with a moist, segmented organic sphincter iris surrounded by twitching sensory cilia. Sinuous vein-like conduit pipes wrap around the urn body, feeding into a swollen, translucent lower gestation bulb filled with swimming bioluminescent green tadpole-like larvae that stitch living flesh. Slick glossy black chitin, wet membranes, calcified white bone ribs, amber resin. Story it tells: ribbed ceramic-chitin amphora incubating swimming bio-larvae that stitch torn flesh and seal exosuit ruptures. Exactly one accent light: soft warm green spore bioluminescence from inside the lower bulb (#84cc16); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**27. Relay Harmonic Telepathic Tuning Fork** — `relay_harmonic_tuning_fork.glb`
- **Lore:** Monolithic tuning fork forged from meteoritic iron and fused spinal columns, strung with acoustic nerve chords that resonate alien telepathy.
- **Quest Hook:** *Relay Chorus (Linchpin)* — Strike fork to jam hive telepathy OR bridge synapse to human camps.
- **Interaction Spec:** `[E] STRIKE HARMONIC FORK`. `HB_TINES` vibrate; emits deep acoustic thrum; disorients nearby crawlers.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE colossal harmonic telepathic tuning fork (2.8 m H, 1.2 m W, 0.8 m D): an upright monolithic tuning fork structure anchored into a carved volcanic basalt plinth. The twin vertical resonant tines are forged from blackened meteoritic iron fused with segmented human and alien spinal columns. High-tension copper acoustic nerve chords bridge the tines, tuned with brass peg screws, vibrating with a deep, bone-rattling sub-bass hum that harmonizes the hive chorus. Glistening black alien resin and amber nerve clusters wrap around the base, anchoring the metal into the rock like tree roots. PBR materials, cold gunmetal, oily rainbow heat treatment on metal tines, wet black chitin, polished ivory bone. Story it tells: Hive Relay's (Vey) colossal bone-metal tuning fork that synchronizes the telepathic radio chorus across the cave. Exactly one accent light: vibrating amber acoustic pulse light at the tine junction (#f59e0b); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**28. Relay Acoustic Membrane Diaphragm** — `relay_acoustic_diaphragm.glb`
- **Lore:** Organic speaker drum made of taut human skin in a steel bulkhead, twitching with artificial larynx cords that whisper dead miners' secrets.
- **Quest Hook:** Decoding its vocal frequency provides safe passage through Hive Relay's territory.
- **Interaction Spec:** `[E] ATTUNE VOCAL FREQUENCY`. `HB_MEMBRANE` breathes; unlocks peaceful hive dialogue.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE biomechanical acoustic wall diaphragm speaker (2.2 m H, 1.5 m W, 0.6 m D): a circular organic speaker membrane suspended inside an industrial circular steel bulkhead portal ring. The speaker diaphragm is a taut, veined drum of translucent human dermis stretched across a perimeter of bone mounting hooks. Braided copper telephone wires and fiber-optic cables penetrate the membrane at its center, soldered to an artificial vocal-cord larynx assembly with exposed cartilage. The membrane visibly breathes and twitches as it mimics the whispers of dead miners. Wet glistening translucent skin, arterial capillary networks, cold cast steel frame, rusted mounting bolts. Story it tells: living wall membrane that mimics the voices of dead miners to lure survivors into ambush, or warn allies of danger. Exactly one accent light: warm amber indicator glow from an attached radio preamplifier box (#f59e0b); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**29. Carapace Hydraulic Chitin Press** — `carapace_chitin_press.glb`
- **Lore:** Four-column hydraulic press with serrated mandible crushing plates, pulverizing shed crawler carapaces into dense laminar armor slabs.
- **Quest Hook:** Forges heavy chitin plates required for endgame Tank armor upgrades.
- **Interaction Spec:** `[E] COMPRESS CHITIN SLAB`. `HB_RAM` presses down; yields +1 `reinforced_chitin_plate`.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy hydraulic chitin armor press (2.4 m H, 1.8 m W, 1.2 m D): a massive four-column industrial hydraulic press retrofitted with biomechanical bone jaws. The upper moving ram platen is fitted with heavy serrated mandible crushing dies encrusted with crushed black iridescent beetle shells and dried yellow hemolymph. Dual heavy hydraulic cylinders mounted to the crown beam with braided steel pressure lines. The lower bed plate features steel drainage troughs for collecting organic fluids. Chipped industrial safety green paint, raw machined steel column guide rods, black chitin fragments, hydraulic grease. Story it tells: Hive Carapace's (Rhun) brutal forge where shed crawler exoskeletons are crushed under 50 tons of hydraulic pressure into armor. Exactly one accent light: intense emerald status diode on the hydraulic control block (#22c55e); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**30. Carapace Ossuary Bone Anvil** — `carapace_ossuary_anvil.glb`
- **Lore:** Sacrificial basalt anvil block encrusted with fossilized skulls and horn spikes, shaped by heavy femur forging mallets.
- **Quest Hook:** *Carapace Oath (Linchpin)* — Forge ceremonial shield to protect the Queen OR shield the operator.
- **Interaction Spec:** `[E] SHAPE OSSIFIED SHIELD`. Crafts heavy shield; resolves Carapace linchpin.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE carved ossuary bone anvil block (1.4 m H, 1.6 m L, 1.0 m W): a massive anvil plinth carved from dense black volcanic basalt rock, reinforced with riveted iron bands and encrusted with interlocking calcified alien skulls and pelvic crests. Embedded into the working face are fossilized alien horn spines and steel reinforcement bars. Resting on the surface is a heavy, two-handed bone shaping hammer made from a human femur bound to a titanium tool handle with dried sinew. Scattered around the anvil base are chipped bone shards, horn plates, and iron rivets. Giger biomechanical detailing, cold polished basalt, ivory bone, tarnished iron, dried sinew wraps. Story it tells: carved volcanic basalt anvil used by Carapace sentries to shape hardened bone bludgeons and shield spines. Exactly one accent light: emerald bioluminescent vein running through the volcanic rock (#22c55e); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```
---

### Suite 6: Xenobiology Outpost 04 & Dr. Okonkwo-Vass's Laboratories
*Narrative Context:* Dr. Okonkwo-Vass believed humans and the PregAlien Hive could achieve peaceful coexistence. Her laboratory holds acoustic translators, hybrid blood centrifuges, and specimen bell jars that represent the Alien Exodus ending.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tri Budget | Accent Light | Articulation / Action |
|---|---|---|---|---|---|---|
| 31 | `vass_translation_phonograph` | `vass_translation_phonograph.glb` | 1.6m × 1.1m × 0.9m | 9.0k | Cyan (`#22d3ee`) | `HB_CYLINDER` spins; translates alien clicks to human speech |
| 32 | `vass_bio_centrifuge_rack` | `vass_bio_centrifuge_rack.glb` | 1.8m × 1.3m × 0.8m | 8.5k | Brood Emerald (`#22c55e`)| `HB_ROTOR` spins at high speed; separates crawler hemolymph |
| 33 | `vass_neural_sync_helmet` | `vass_neural_sync_helmet.glb` | 2.1m × 1.0m × 0.9m | 9.5k | Cyan (`#22d3ee`) | `HB_HELMET` lowers onto player; grants telepathic alien vision |
| 34 | `vass_hybrid_blood_synthesizer`| `vass_hybrid_blood_synthesizer.glb`| 1.9m × 1.4m × 0.7m| 10.0k | Spore Lime (`#84cc16`) | `HB_VALVE` turns; synthesizes hybrid vaccine; raises humanity |
| 35 | `vass_containment_bell_jar` | `vass_containment_bell_jar.glb` | 1.5m × 0.9m × 0.9m | 8.0k | Brood Emerald (`#22c55e`)| `HB_JAR` lifts vertically; frees trapped symbiotic tendril |
| 36 | `vass_dissection_stereomicroscope`|`vass_dissection_stereomicroscope.glb`|1.3m × 0.8m × 0.7m|7.5k| Cyan (`#22d3ee`) | `HB_TURRET` rotates lenses; analyzes egg embryo; unlocks codex |

#### Suite 6 Prompts & Interaction Specs

**31. Vass Xenolinguistic Translation Phonograph** — `vass_translation_phonograph.glb`
- **Lore:** Hammered-brass acoustic phonograph wired to a live alien larynx slice, translating ultrasonic crawler clicks into synthesized human phonemes.
- **Quest Hook:** *Scientist Specimen (Linchpin)* — Proves Okonkwo-Vass right: alien vocalizations are structured language.
- **Interaction Spec:** `[E] PLAY XENOLINGUISTIC TRANSLATION`. `HB_CYLINDER` spins; plays speech log; validates Dr. Vass's theory.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE xenolinguistic acoustic translation apparatus (1.6 m H, 1.1 m W, 0.9 m D): a vintage Victorian-style scientific recording phonograph fused with high-tech corporate audio electronics and biological throat tissue. A large, hammered sheet-brass acoustic horn connects to an analog stylus tracking across an etched rotating wax cylinder drum. Wired to the base is a modern digital oscillographic audio processor with a glowing cyan audio waveform screen. An articulated microphone boom holds an alien acoustic larynx tissue sample suspended inside a sealed glass fluid cell with pulsing tracheal cilia. PBR materials, tarnished brass, dark oiled mahogany wood base, cold brushed aluminum electronic enclosures, glass cylinders, braided cloth wiring. Story it tells: Dr. Vass's prototype electro-acoustic translator; matches crawler ultrasonic clicks to human language phonemes. Exactly one accent light: cyan waveform glow on the oscilloscope screen (#22d3ee); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**32. Vass Bio-Centrifuge Separator Rack** — `vass_bio_centrifuge_rack.glb`
- **Lore:** Analytical laboratory centrifuge enclosed in an anatomical ribcage housing, spinning at 15,000 RPM to separate neon crawler venom from antibodies.
- **Quest Hook:** Processing alien samples produces concentrated venom or therapeutic antibodies based on player choice.
- **Interaction Spec:** `[E] RUN CENTRIFUGE CYCLE`. `HB_ROTOR` spins; yields choice of Venom Needle or Antidote.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE floor-standing laboratory bio-centrifuge (1.8 m H, 1.3 m W, 0.8 m D): an industrial stainless steel laboratory centrifuge console enclosed within an anatomical ribcage housing, featuring a top circular access hatch made of heavy ballistic glass. Through the glass, a high-speed balanced titanium rotor wheel holds twenty sealed borosilicate glass test tubes containing separated yellow hemolymph and glowing emerald venom fluids. An angled touch control panel with analog tachometer dials and digital timer displays. Brushed stainless steel casing, hospital-grade white enamel panels with subtle chemical stain streaks, rubber leveling feet. Story it tells: high-speed analytical centrifuge used to separate alien crawler hemolymph into clear antibodies and dark toxic venom. Exactly one accent light: vivid emerald green glow emanating from the separated centrifuge vials (#22c55e); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**33. Vass Neural Synchronization Helmet** — `vass_neural_sync_helmet.glb`
- **Lore:** Suspended copper EEG dome lined with gold acupuncture needles and conductive synaptic gel, bridging human brainwaves with the alien telepathic hive.
- **Quest Hook:** Grants temporary 'Hive Sight' (detects hidden egg caches and crawlways through walls for 120s).
- **Interaction Spec:** `[E] DON NEURAL SYNC HELMET`. `HB_HELMET` lowers; triggers screen warp and reveals hidden passages.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE suspended neural synchronization helmet apparatus (2.1 m H, 1.0 m W, 0.9 m D): an open-faced domed helmet constructed from spun copper and stamped gunmetal, suspended from an overhead articulated counterbalanced hydraulic arm. The interior of the helmet is densely lined with hundreds of fine, spring-loaded gold needle electrodes and glistening translucent neural interface pads dripping with clear conductive synovial gel. A bundle of flexible ribbed conduits and fiber-optic cables trails from the helmet crown up into an overhead ceiling junction box. Polished copper with verdigris tarnish, cold dark gunmetal, delicate gold electrode pins, flexible clear silicone lines. Story it tells: suspended copper EEG helmet designed to bridge human brainwaves with the alien telepathic hive mind. Exactly one accent light: bright cyan status ring around the helmet rim (#22d3ee); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**34. Vass Hybrid Blood Synthesizer** — `vass_hybrid_blood_synthesizer.glb`
- **Lore:** Glassware manifold whose distillation coils intertwine like intestines, fusing human blood with royal jelly into an infection-reversing hybrid cure.
- **Quest Hook:** Cures the player's symptomatic infection back to human masking (+30 Humanity).
- **Interaction Spec:** `[E] ADMINISTER HYBRID SYNTHESIS`. Injects synthesized blood; cleanses infection symptoms.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE complex laboratory blood synthesizer manifold (1.9 m H, 1.4 m W, 0.7 m D): a vertical laboratory stand supporting an intricate network of borosilicate glass distillation columns intertwined like intestines, peristaltic metering pumps, and stainless steel filter chambers. Twin glass reservoir flasks: one containing dark crimson human blood, the other containing glowing olive-green alien royal jelly, meeting in a central vortex mixing bulb. Silicone tubing secured with brass stopcocks and stainless steel clamp collars. Drip trays beneath valves, condensation droplets on glass coils, brushed medical steel framework. Story it tells: complex glassware manifold where Dr. Vass combined her own blood with alien royal jelly to synthesize a cure for the hive infection. Exactly one accent light: vibrant spore-lime bioluminescence from the central mixing bulb (#84cc16); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**35. Vass Specimen Containment Bell Jar** — `vass_containment_bell_jar.glb`
- **Lore:** Heavy leaded-glass vacuum bell jar enclosing a live, writhing neural tendril with delicate sensory fronds that presses against the glass.
- **Quest Hook:** *Scientist Specimen (Linchpin)* — Sparing the specimen preserves the Alien Exodus path; smashing it locks the path.
- **Interaction Spec:** `[E] INTERFACE WITH SPECIMEN`. `HB_JAR` seals/unseals; resolves Okonkwo-Vass linchpin.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy biological specimen containment bell jar (1.5 m H, 0.9 m W, 0.9 m D): a thick, heavy borosilicate glass vacuum bell jar resting on a massive cast-iron circular base plate with vacuum clamp toggles. Inside the transparent jar, a live biomechanical alien neural tendril with sinuous ribbed cartilage and delicate sensory fronds coils around a central copper sensor post, pressing its glistening sucker disks against the glass wall. A manual vacuum pump lever and an analog vacuum pressure gauge with a brass bezel are attached to the base. Heavy leaded glass with air bubble imperfections, cast iron with pitted texture, grease-packed rubber base gasket. Story it tells: heavy leaded-glass vacuum bell jar enclosing a live, writhing parasitic neural tendril that Dr. Vass befriended. Exactly one accent light: emerald bioluminescent pulse glowing from the coiled tendril inside (#22c55e); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**36. Vass Optical Dissection Stereomicroscope** — `vass_dissection_stereomicroscope.glb`
- **Lore:** Dual-eyepiece industrial stereomicroscope mounted on a ribbed vertebral arm, examining glowing alien embryo chitin under polarized light.
- **Quest Hook:** Lore discovery station; grants the player critical weakpoint knowledge on Hive Bosses (+15% damage to carapace).
- **Interaction Spec:** `[E] EXAMINE EMBRYONIC SLICE`. `HB_TURRET` rotates; unlocks Boss Codex entry.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy industrial optical dissection stereomicroscope (1.3 m H, 0.8 m W, 0.7 m D): a dual-eyepiece scientific stereomicroscope mounted on a heavy cast-steel boom arm stand sculpted from ribbed metal vertebrae with knurled brass coaxial focus knobs. The mechanical stage features stainless steel slide clips holding a glass specimen slide with a stained thin slice of glowing embryonic alien tissue displaying carnal cellular divisions. An articulated dual fiber-optic gooseneck illuminator points down at the slide. Heavy matte black textured enamel, polished brass focus gear racks, optical glass lenses with antireflective violet coatings, stainless steel slide stage. Story it tells: dual-eyepiece metallurgical microscope fitted with cross-polarized light filters to examine cellular alien chitin lattices. Exactly one accent light: crisp cyan sub-stage illumination beam passing through the slide (#22d3ee); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```
---

### Suite 7: Mayor Tina's Infiltration Trail & Covert Brood Operations
*Narrative Context:* Mayor Tina is not human; she is a high-tier infiltrator wearing synthetic human dermis. Across the bunker, she left forensic evidence of her molting, secret distress transmitters, and nursery caches.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tri Budget | Accent Light | Articulation / Action |
|---|---|---|---|---|---|---|
| 37 | `tina_vocal_mimic_synthesizer`| `tina_vocal_mimic_synthesizer.glb`| 1.4m × 0.8m × 0.6m | 8.0k | Warning Red (`#ef4444`)| `HB_REEL` spins tape; mimics human distress call; lures or traps |
| 38 | `tina_pheromone_dispersal_vent`|`tina_pheromone_dispersal_vent.glb`| 1.7m × 0.9m × 0.5m | 7.5k | Brood Emerald (`#22c55e`)| `HB_VALVE` levers open; vents human-masking scent; hides from guards |
| 39 | `tina_cosmetic_skin_loom` | `tina_cosmetic_skin_loom.glb` | 1.8m × 1.3m × 0.8m | 9.0k | Warning Red (`#ef4444`)| `HB_FRAME` rotates; weaves synthetic human face; reveals true identity |
| 40 | `tina_forged_council_ballot_box`|`tina_forged_council_ballot_box.glb`|1.2m × 0.8m × 0.8m| 6.5k | Amber (`#f59e0b`) | `HB_SLOT` opens; uncovers forged municipal voting tokens; +25 Scrap |
| 41 | `tina_shedding_cocoon_niche` | `tina_shedding_cocoon_niche.glb`| 2.2m × 1.4m × 0.9m | 9.5k | Amber (`#f59e0b`) | `HB_CARAPACE` peels back; reveals discarded human disguise husk |
| 42 | `tina_secret_distress_beacon` | `tina_secret_distress_beacon.glb`| 1.5m × 0.8m × 0.7m | 7.0k | Cyan (`#22d3ee`) | `HB_SWITCH` toggles; jams false rescue signal; protects survivor camp |

#### Suite 7 Prompts & Interaction Specs

**37. Tina Vocal Mimicry Synthesizer** — `tina_vocal_mimic_synthesizer.glb`
- **Lore:** Gutted intercom box grafted onto preserved human vocal cords and tongue tissue, pulsing in sync with synthesized distress cries.
- **Quest Hook:** Forensic evidence proving Mayor Tina lured rescue teams into hive ambush nests.
- **Interaction Spec:** `[E] DISASSEMBLE VOCAL SYNTHESIZER`. Yields `vocal_mimic_core` and records audio proof for camp leaders.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE covert vocal mimicry synthesizer unit (1.4 m H, 0.8 m W, 0.6 m D): an opened industrial sheet-metal radio transmitter chassis mounted on a tripod. Inside the chassis, a dual-spool magnetic tape transport with tangled brown magnetic tape connects directly to a bio-mechanical glass cylinder holding an intact, veined human vocal-cord larynx slice and tongue tissue bathed in nutrient saliva. Copper acoustic contact pickups soldered to the cartilage. A horn speaker with a torn paper cone wired to an external amplifier box. Rusted sheet metal, grease smudges, electrical jumper wires, blood-stained silicone tubes, cold industrial hardware. Story it tells: dissected corporate speaker box rigged with human vocal cords and cassette tape loops to broadcast fake survivor screams. Exactly one accent light: red recording LED glowing on the audio chassis (#ef4444); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**38. Tina Pheromone Dispersal Vent** — `tina_pheromone_dispersal_vent.glb`
- **Lore:** Duct-mounted aerosol gland resembling a swollen organic ovarian sac, venting musky synthetic human pheromones to fool camp scanners.
- **Quest Hook:** Sabotaging the diffuser strips Tina's scent disguise, revealing her alien scent to Vesper guard hounds.
- **Interaction Spec:** `[E] PURGE PHEROMONE CANISTER`. `HB_VALVE` vents; strips infiltrators' scent masking.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE covert duct-mounted pheromone dispersal unit (1.7 m H, 0.9 m W, 0.5 m D): an unauthorized auxiliary ventilation device clamped to an industrial galvanized air duct. A heavy cylindrical stainless steel aerosol canister sculpted like a swollen ovarian bio-reservoir feeds into a high-speed brass micro-nozzle array with moist vulvate rubber gaskets. An electronic timer module with exposed circuit boards and wire splices is zip-tied to the frame. Oily musky yellow residue dripping from the atomizing nozzles, dust caked on duct louvers, scratched stainless steel, tarnished brass compression fittings. Story it tells: covert duct-mounted aerosol diffuser dispensing synthesized human pheromones to fool camp biometric scanners. Exactly one accent light: emerald bioluminescent fluid level indicator on the side sight glass (#22c55e); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**39. Tina Cosmetic Dermis Weaving Loom** — `tina_cosmetic_skin_loom.glb`
- **Lore:** Grotesque circular embroidery frame where peeled sheets of human facial skin are stitched together with fine silver wire to craft disguise masks.
- **Quest Hook:** Horror story setpiece; reveals the brutal truth before the Mayor Tina boss confrontation.
- **Interaction Spec:** `[E] INSPECT SKIN WEAVING LOOM`. `HB_FRAME` rotates; triggers Tina lore achievement.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE biomechanical dermis weaving loom frame (1.8 m H, 1.3 m W, 0.8 m D): an upright circular stainless steel surgical embroidery ring frame supported by a heavy tripod base. Stretched across the ring with surgical steel tensioning hooks are patches of translucent, vein-threaded human epidermal skin being sewn together with delicate silver wire filaments into a synthetic human face. An articulated surgical arm holds fine curved suturing needles and an illuminated magnifying lens. Stainless steel surgical trays below holding dissection scalpels and jars of preserving amber glycerin. Cold surgical steel, glistening moist skin textures, fine micro-filaments, dried blood smears. Story it tells: sinuous embroidery frame where Tina stitched molted human skin layers over her chitin carapace with micro-filaments. Exactly one accent light: harsh red surgical inspection diode on the articulated arm (#ef4444); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**40. Tina Forged Municipal Ballot Box** — `tina_forged_council_ballot_box.glb`
- **Lore:** Riveted election urn overflowing with brass identification slugs clutched in mummified severed fingers, proving Tina's fraudulent election.
- **Quest Hook:** Reveals how Tina legally seized administrative control of the bunker's life-support gates.
- **Interaction Spec:** `[E] PRY OPEN BALLOT BOX`. `HB_SLOT` opens; awards +25 Scrap and `mayor_override_keycard`.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE tampered municipal election ballot box (1.2 m H, 0.8 m W, 0.8 m D): a riveted sheet-steel voting urn mounted on an industrial pedestal stand wrapped in wet black rubber straps. The top deposit slot is fitted with a spring-loaded anti-tamper baffle. The side maintenance access door has been forced open with a crowbar, showing bent steel latch tabs. Overflowing from the bent door are hundreds of stamped brass identification slugs clutched by severed, mummified human fingers, along with blood-stained ballot cards bearing official Horizon municipal seals. Chipped corporate navy-blue enamel, bent sheet metal, tarnished brass slugs, pry marks. Story it tells: tampered corporate voting box stuffed with identification slugs stolen from dead workers to vote Tina into the Mayoralty. Exactly one accent light: amber tamper-alarm strobe beacon mounted on the box crown (#f59e0b); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**41. Tina Shedding Cocoon Niche** — `tina_shedding_cocoon_niche.glb`
- **Lore:** Wall niche lined with amber cocoon webbing, holding a molted human skin husk split open down the back beside discarded black cuticle.
- **Quest Hook:** Collects `tina_molted_cuticle_sample` needed to calibrate alien tracking radar.
- **Interaction Spec:** `[E] COLLECT SHED CARAPACE SAMPLE`. Yields unique radar tracking component.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE wall-mounted shedding cocoon niche (2.2 m H, 1.4 m W, 0.9 m D): a hollowed-out structural wall opening draped in fibrous, semi-translucent biological amber cocoon webbing and dried glistening slime trails. Hanging from the interior ribbing is a hollow, torn human female-shaped outer skin husk split open down the spine like an empty chrysalis, entwined with shredded corporate executive suit fabric, broken zipper hardware, and glistening discarded black cuticle plates. Pools of dried yellow bio-fluid on the bottom sill. Brutal Giger biomechanical eroticism, translucent papery skin texture, glistening wet black latex tendrils, rusted structural steel wall beams. Story it tells: wall alcove encrusted with dried mucus and torn clothing where Tina shed her human exterior skin during metamorphosis. Exactly one accent light: dim amber bioluminescent spore pocket deep inside the cavity (#f59e0b); every other surface is unlit material colour. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**42. Tina Secret Sub-Space Distress Transceiver** — `tina_secret_distress_beacon.glb`
- **Lore:** Military field radio lashed to a frame with braided human hair and vocal cords, broadcasting looping distress cries to lure ships into the hive.
- **Quest Hook:** Silencing the beacon prevents off-world rescue ships from being lured into crash landings.
- **Interaction Spec:** `[E] DISABLE FALSE BEACON`. `HB_SWITCH` toggles off; awards +10 Humanity.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE clandestine radio distress beacon transmitter (1.5 m H, 0.8 m W, 0.7 m D): a ruggedized military field radio transceiver lashed to a fold-out tubular steel frame with braided human hair and sinew cords. A heavy telescoping mast antenna extends upward, wrapped in fine copper wire coils and organic nerve tendrils. The front control face features an analog frequency dial, twin heavy toggle switches with flip-up safety covers, and an integrated audio cassette recorder playing on an endless tape loop. Chipped olive drab enamel, salt-corroded aluminum knobs, scratched frequency glass, antenna ground wire clamped to base. Story it tells: modified military transceiver broadcasting fake human SOS coordinates to lure passing transport ships down into the hive. Exactly one accent light: pulsing cyan transmission diode on the antenna base (#22d3ee); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```
---

### Suite 8: The Chasm Void, Abyss Drops & Deep Seismic Rigs
*Narrative Context:* Cocytus IV's crust is torn by bottomless tectonic chasms. Survival requires traversal winches, seismic geophones charting ice tremors, and descent cages dropped into the frozen dark.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tri Budget | Accent Light | Articulation / Action |
|---|---|---|---|---|---|---|
| 43 | `chasm_seismic_geophone_station`|`chasm_seismic_geophone_station.glb`|1.7m × 1.1m × 0.9m| 8.5k | Amber (`#f59e0b`) | `HB_PEN` drum charts tremor; predicts cave-in; reveals safe route |
| 44 | `chasm_cable_traversal_winch` | `chasm_cable_traversal_winch.glb` | 2.2m × 1.8m × 1.2m | 11.5k | Warning Red (`#ef4444`)| `HB_DRUM` turns; reels zip-line cable across abyss; opens traversal |
| 45 | `chasm_abyss_sounding_mortar`| `chasm_abyss_sounding_mortar.glb`| 1.8m × 1.0m × 0.8m | 8.0k | Warning Red (`#ef4444`)| `HB_BREECH` closes; fires sonar flare into void; maps bottom floors |
| 46 | `chasm_steam_whistle_buoy` | `chasm_steam_whistle_buoy.glb` | 2.4m × 1.2m × 1.2m | 8.5k | Amber (`#f59e0b`) | `HB_FLOAT` bobs; sounds fog whistle; clears blinding ice blizzard |
| 47 | `chasm_hanging_cage_crane` | `chasm_hanging_cage_crane.glb` | 3.2m × 2.4m × 1.5m | 13.0k | Warning Red (`#ef4444`)| `HB_ARM` slews 90°; lowers descent elevator cage to lower sector |
| 48 | `chasm_geothermal_survey_transit`|`chasm_geothermal_survey_transit.glb`|1.6m × 0.9m × 0.9m|7.5k| Cyan (`#22d3ee`) | `HB_OPTIC` tilts and pans; scans chasm depths for thermal anomalies |

#### Suite 8 Prompts & Interaction Specs

**43. Chasm Seismic Geophone Station** — `chasm_seismic_geophone_station.glb`
- **Lore:** Bedrock-anchored seismograph with an oversized brass pendulum bob swinging between curved steel ribs, charting the Queen's burrowing movements.
- **Quest Hook:** Reading the drum warns the player 60 seconds before major tremors cause ceiling rockfalls.
- **Interaction Spec:** `[E] READ SEISMIC DRUM`. Reveals seismic hazard timer on HUD.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy mechanical seismic geophone station (1.7 m H, 1.1 m W, 0.9 m D): an industrial brass and steel scientific seismograph anchored to a bedrock base plate by heavy foundation bolts. A heavy swinging brass pendulum bob is suspended within a cage of curved steel ribs resembling an anatomical pelvic cavity, its mechanical stylus pen resting on a horizontal revolving paper chart drum printed with grid lines. A side gear clockwork drive motor with a winding key. Brass pendulum mass with oxidation patina, cold structural steel frame, fine ink line scribbles on paper drum, lead counterweights. Story it tells: sensitive bedrock seismograph tracking tectonic slippage and colossal subterranean hive burrowing. Exactly one accent light: warm amber illumination lamp shining directly on the paper recording drum (#f59e0b); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**44. Chasm Cable Traversal Winch** — `chasm_cable_traversal_winch.glb`
- **Lore:** Massive electric winch bolted to bedrock, its cable drum wound with steel wire rope spliced with biological sinews to cross bottomless fissures.
- **Quest Hook:** Traversal bridge; allows players to cross the Chasm to reach the crashed shuttle gantry.
- **Interaction Spec:** `[E] ENGAGE CABLE WINCH`. `HB_DRUM` reels cable tight; deploys zip-line trolley.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy industrial cable traversal winch (2.2 m H, 1.8 m W, 1.2 m D): a massive welded steel skid frame anchoring a heavy electric motor winch assembly. A wide steel cable drum is wound with dozens of coils of heavy 1-inch braided wire rope spliced with fibrous biological sinews, feeding out through heavy bronze roller fairlead guides mounted in a jaw-like steel yoke. An electric drive motor with an external finned cooling casing and a manual emergency band brake wheel with a friction lining. Heavy ground anchor tieback turnbuckles shackled to steel eye-bolts. Chipped yellow industrial paint, greasy wire rope strands, steel cable sheen, scuffed skid frame. Story it tells: high-torque motor winch used to anchor steel zip-line cables across bottomless glacial fissures. Exactly one accent light: emergency red warning lamp on the motor housing (#ef4444); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**45. Chasm Abyss Sounding Mortar** — `chasm_abyss_sounding_mortar.glb`
- **Lore:** Pneumatic launch cannon resembling an organic ovipositor barrel pointing down into the chasm, firing sonar probes to map the depths.
- **Quest Hook:** Unlocks the minimap geometry of the bottomless chasm floor.
- **Interaction Spec:** `[E] LAUNCH SOUNDING FLARE`. Fires flare down; illuminates lower sectors on radar.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE pneumatic abyss sounding mortar tube (1.8 m H, 1.0 m W, 0.8 m D): a heavy steel launch barrel angled 60 degrees downward, sculpted to resemble an elongated organic ovipositor barrel with segmented chitin plates and ribbed hydraulic dampers, supported by an A-frame structural steel mount. A high-pressure air receiver cylinder with a brass charging valve and an analog pressure gauge is mounted beneath the tube. A heavy manual quick-dump ball valve with an extended operating lever triggers the launch. A side rack holds three cylindrical finned aluminum sounding probe projectiles with rubber impact noses. Heavy cast-iron base plate, chipped red enamel on the barrel, cold dark steel, grease around pivot trunnions. Story it tells: angled pneumatic launch tube used to shoot sonar depth-sounding flares thousands of meters down into the abyss. Exactly one accent light: red arming status LED on the pneumatic launch valve (#ef4444); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**46. Chasm Geothermal Steam Whistle Buoy** — `chasm_steam_whistle_buoy.glb`
- **Lore:** Conical steel buoy tower anchored over a fissure, channeling geothermal steam through tuned bronze whistles that wail like human screams.
- **Quest Hook:** Navigational beacon; audio cues guide players through zero-visibility blizzards.
- **Interaction Spec:** `[E] UNCAGE STEAM WHISTLE`. `HB_FLOAT` valves open; clears frost fog in 15m radius.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE geothermal steam whistle beacon buoy (2.4 m H, 1.2 m W, 1.2 m D): a heavy conical steel buoy tower designed for ice-trench anchoring. A crown assembly of three vertical tuned bronze steam whistle bells with flaring lips is fed by an insulated central steam riser pipe, emitting deep wailing foghorn frequencies through carved acoustic vocal chambers that cut through blizzards. A weighted mechanical float lever mechanism automatically meters steam into the whistles. Heavy forged anchor chain links draped around the conical steel base skirt. Weathered bronze with chalky lime deposits, chipped safety orange paint on the buoy cone, rust scaling, weeping condensation. Story it tells: anchored brass whistle tower that channels updrafts of hot geothermal steam to produce deep foghorn signals. Exactly one accent light: amber beacon reflector bulb mounted below the whistle bells (#f59e0b); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**47. Chasm Cantilevered Descent Crane** — `chasm_hanging_cage_crane.glb`
- **Lore:** Monumental I-beam crane resembling a praying mantis, lowering a four-man descent cage wrapped in wire mesh down into Sector Zero.
- **Quest Hook:** Sector transition mechanism connecting Sub-Level 10 to Sector Zero.
- **Interaction Spec:** `[E] OPERATE GANTRY CRANE`. `HB_ARM` slews; transports player down to Queen's Lair.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy cantilevered gantry hoist crane (3.2 m H, 2.4 m W, 1.5 m D): an industrial steel I-beam jib crane cantilevered forward over an open precipice like a predatory praying mantis. An electric hoist trolley with flanged steel wheels rides the lower beam flange, supporting heavy wire rope pulleys that suspend a riveted steel personnel cage with expanded metal mesh walls and anatomical torso harness grips. A weatherproof control pendant box with pushbuttons hangs from an insulated coiled cable. Heavy counterweight concrete slabs stacked on the crane rear mast. Chipped yellow and black hazard paint on the I-beam, steel cables, industrial grease, rust flakes. Story it tells: monumental I-beam gantry crane extending over the abyss edge, holding a four-man descent cage for deep ore mining. Exactly one accent light: emergency red revolving beacon on the crane mast tip (#ef4444); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**48. Geothermal Survey Optical Transit** — `chasm_geothermal_survey_transit.glb`
- **Lore:** Optical surveyor theodolite mounted on tripod legs of fluted bone and carbon fiber, using an infrared pyrometer to track tectonic magma flows.
- **Quest Hook:** Pinpoints hidden geothermal heat pockets where rare cryogenic materials melt.
- **Interaction Spec:** `[E] SURVEY CHASM THERMALS`. `HB_OPTIC` rotates; marks secret loot caches on map.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE industrial optical geothermal surveyor transit (1.6 m H, 0.9 m W, 0.9 m D): a precision brass and painted steel surveyor theodolite mounted atop a heavy tripod stand whose legs are carved from fluted human femur bones and black anodized aluminum. The transit head features dual optical sighting telescopes, circular spirit bubble levels, knurled micrometer adjustment thumbscrews, and an attached side infrared sensor housing with a convex germanium lens resembling a polished insect eye. Dark olive enamel on the theodolite body, polished brass vernier scales, clamping levers. Story it tells: high-precision surveyor transit fitted with an infrared optical pyrometer to measure tectonic magma flow under the ice. Exactly one accent light: cool cyan digital readout diode on the pyrometer display (#22d3ee); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```
---

### Suite 9: Crash Site Shipwrecks & Class Payload Archetypes (Scout, Tank, Engineer)
*Narrative Context:* Log B03 reveals: *"Three ships. One carries the tracking signal. One carries the relay. One carries the weapon."* The wreck sites across the glacier hold class payloads that players can salvage to unlock signature capabilities.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tri Budget | Accent Light | Articulation / Action |
|---|---|---|---|---|---|---|
| 49 | `scout_tachyon_radar_mast` | `scout_tachyon_radar_mast.glb` | 2.6m × 1.5m × 1.0m | 9.5k | Cyan (`#22d3ee`) | `HB_DISH` rotates 360°; realigns sensor; reveals all enemy positions |
| 50 | `scout_ejection_pod_chassis`| `scout_ejection_pod_chassis.glb`| 1.3m × 2.0m × 1.2m | 10.0k | Cyan (`#22d3ee`) | `HB_CANOPY` jettisons; opens survival kit; +30 HP + Scout Skin |
| 51 | `tank_reactive_armor_forge` | `tank_reactive_armor_forge.glb` | 2.2m × 1.6m × 1.4m | 11.0k | Warning Red (`#ef4444`)| `HB_ANVIL` clamps; forges explosive reactive armor plate |
| 52 | `tank_kinetic_ram_breech` | `tank_kinetic_ram_breech.glb` | 1.8m × 2.5m × 1.2m | 12.0k | Warning Red (`#ef4444`)| `HB_BREECH` opens; extracts solid tungsten sabot penetrator round |
| 53 | `engineer_magnetic_bottle_cell`|`engineer_magnetic_bottle_cell.glb`|1.9m × 1.4m × 1.4m|10.5k| Amber (`#f59e0b`) | `HB_TOROID` spins; stabilizes plasma bottle; yields fusion cell |
| 54 | `engineer_robotic_welding_arm`| `engineer_robotic_welding_arm.glb`| 2.1m × 1.2m × 0.8m | 9.0k | Cyan (`#22d3ee`) | `HB_ARM` articulates 3-axis; repairs destroyed robotic companion |

#### Suite 9 Prompts & Interaction Specs

**49. Scout Tachyon Radar Antenna Mast** — `scout_tachyon_radar_mast.glb`
- **Lore:** Shattered carbon-fiber radar dish fused with glowing cyan bio-nerve filaments and crystal waveguides, tracking moving signatures.
- **Quest Hook:** Class signature recovery; Scout players repair this to unlock permanent minimap fog-clearing.
- **Interaction Spec:** `[E] ALIGN RADAR MAST`. `HB_DISH` pans; permanently reveals room layouts in the sector.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE damaged scout ship tachyon radar mast (2.6 m H, 1.5 m W, 1.0 m D): an aerospace-grade carbon-fiber and titanium composite antenna tower torn from a spacecraft hull. The mast crown supports an elliptical parabolic radar dish with exposed phallic waveguide horns, fused with glowing cyan bio-luminescent nerve filaments, glistening black latex wraps, and crystal waveguides. Impact-damaged carbon-composite struts with frayed fibers, dangling fiber-optic wiring harnesses with multi-pin bayonet connectors, scorched white ceramic thermal tiles. Aerospace titanium, matte black carbon weave, heat-scorched white ablative coatings, scuffed aluminum fittings. Story it tells: the crashed Scout ship's long-range sensor array; explains why the hive entity was tracking the player's ship before impact. Exactly one accent light: active cyan radar pulse beacon at the dish feed horn (#22d3ee); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**50. Scout Ejection Pod Chassis** — `scout_ejection_pod_chassis.glb`
- **Lore:** Faceted aerodynamic escape capsule embedded in permafrost like a split chrysalis, its blown canopy revealing a molded Kevlar cockpit couch.
- **Quest Hook:** Contains the Scout class survival cache and unique cosmetic armor skin.
- **Interaction Spec:** `[E] JETTISON ESCAPE CANOPY`. `HB_CANOPY` pops off; reveals high-tier Scout loot.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE crashed spacecraft emergency ejection pod (1.3 m H, 2.0 m L, 1.2 m W): a streamlined aerospace escape capsule embedded in permafrost like a split chrysalis, featuring a heavy titanium nose cone and faceted composite side hulls. A shattered polycarbonate bubble canopy with explosive severance cord channels embedded in the frame. The cockpit tub contains an eroticized, anatomical molded Kevlar pilot couch with five-point leather harness straps and an open survival kit compartment in the sidewall. Atmospheric re-entry scorching, ablative tile spalling, chipped white and high-visibility orange paint, twisted hydraulic lines. Story it tells: streamlined escape capsule that ejected from the Scout hull upon atmospheric entry, half-buried in permafrost. Exactly one accent light: cyan emergency cabin locator strobe flashing behind the headrest (#22d3ee); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**51. Tank Ship Reactive Armor Forge** — `tank_reactive_armor_forge.glb`
- **Lore:** Heavy field stamping press salvaged from the Tank wreck, pressing explosive reactive matrices between slabs of chitin and steel treadplate.
- **Quest Hook:** Class signature recovery; Tank players craft explosive reactive plates that negate 3 heavy melee hits.
- **Interaction Spec:** `[E] STAMP REACTIVE ARMOR`. Crafts consumable `reactive_armor_plate`.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE armored field stamping press forge (2.2 m H, 1.6 m W, 1.4 m D): a massive welded steel-plate hydraulic stamping unit salvaged from a heavy orbital drop ship. Two vertical chromed tie-rod columns support a massive cast-steel sliding ram equipped with an explosive tile stamping die and interlocking jaw teeth. A side hopper holds unpressed raw steel plates and plasticized explosive inserts. Heavy steel hydraulic lines with crimped fittings, chipped dark military drab paint, burnished steel tool faces, hydraulic fluid runs, heavy foundation lugs. Story it tells: industrial stamping press salvaged from the crashed Tank hull, used to fabricate explosive reactive armor tiles. Exactly one accent light: harsh red arming status lamp on the hydraulic valve manifold (#ef4444); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**52. Tank Orbital Kinetic Ram Breech** — `tank_kinetic_ram_breech.glb`
- **Lore:** Severed breech block of an orbital siege cannon, looking like a gaping mechanical throat of rifled steel teeth holding a solid tungsten penetrator.
- **Quest Hook:** Disassembling the breech yields heavy tungsten cores used to craft armor-piercing heavy ammunition.
- **Interaction Spec:** `[E] EXTRACT TUNGSTEN PENETRATOR`. `HB_BREECH` opens; yields +35 Scrap and AP ammo.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE severed kinetic cannon breech assembly (1.8 m H, 2.5 m L, 1.2 m W): a massive artillery cannon breech mechanism torn from an orbital warship chassis, resembling a gaping biomechanical throat of rifled steel teeth. A colossal sliding-block steel breech with heavy recoil damper cylinders and dual pneumatic scavenging tubes. A partially loaded heavy solid-tungsten fin-stabilized penetrator sabot shell rests in the loading tray, pointing into the rifled bore like an oversized metal dart. Sheared structural titanium trunnion mounts, heavy burnt propellant soot, chipped matte gunmetal finish, hydraulic fluid leaks, scorched rifling grooves visible in the open breech. Story it tells: the severed breech block of the Tank hull's kinetic tungsten penetrator cannon, resting among sheared hull ribs. Exactly one accent light: red breech interlock indicator on the firing block (#ef4444); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**53. Engineer Magnetic Plasma Bottle Cell** — `engineer_magnetic_bottle_cell.glb`
- **Lore:** Toroidal fusion vessel with superconducting vertebral coils, containing a swirling core of superheated thermonuclear amber plasma.
- **Quest Hook:** Class signature recovery; Engineer players stabilize the containment bottle to power base automation.
- **Interaction Spec:** `[E] STABILIZE MAGNETIC BOTTLE`. `HB_TOROID` spins; yields permanent base power cell.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE toroidal magnetic plasma containment cell (1.9 m H, 1.4 m W, 1.4 m D): a circular toroidal magnetic bottle fusion vessel mounted in an open stainless steel gimbal ring frame. Superconducting vertebral magnetic coils encircle the central vacuum donut chamber, where heavy quartz observation ports reveal a pulsing, swirling interior core of superheated thermonuclear amber plasma. Braided cryo-coolant feed hoses, high-current bus bars with ceramic standoff insulators, brushed steel gimbal rings. Story it tells: glowing toroidal plasma containment ring salvaged from the Engineer ship's wrecked sub-light fusion core. Exactly one accent light: intense amber-orange thermonuclear plasma glow radiating from the quartz observation ports (#f59e0b); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**54. Engineer Articulated Robotic Welding Arm** — `engineer_robotic_welding_arm.glb`
- **Lore:** Six-axis robotic arm with skeletal talon joints, ending in a micro-welding plasma torch and camera that repairs companion drones and armor.
- **Quest Hook:** Revives fallen companion drones and repairs broken exosuit armor without consuming scrap.
- **Interaction Spec:** `[E] CALIBRATE FABRICATION ARM`. `HB_ARM` articulates; repairs companion to full HP.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE six-axis industrial robotic fabrication arm (2.1 m H, 1.2 m W, 0.8 m D): an articulated industrial robot arm mounted on a heavy circular cast-iron pedestal base, featuring skeletal talon joints, sinuous spinal vertebrae casing, and flexible corrugated cable conduit snakes along the arm segments. The wrist end-effector is a multi-tool head fitted with a plasma micro-welding arc torch, a motorized wire feed nozzle, and an optical laser tracking scanner camera. Chipped industrial safety yellow enamel, carbon-fiber joint covers, scorched copper torch tip, grease on gear teeth. Story it tells: six-axis automated fabrication arm salvaged from the Engineer ship's machine shop, capable of repairing companions. Exactly one accent light: crisp cyan laser scanner targeting line projecting from the wrist camera (#22d3ee); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```
---

### Suite 10: The Act 2 Escape Gantry, Shuttle Systems & Mothership Breach
*Narrative Context:* Act 2 culminates at the orbital launch gantry. Escaping Cocytus IV requires allocating the four seats (`ACT2_MANIFEST_SEATS_MAX = 4`), coupling cryogenic propellant, calibrating gyroscopes, and arming abort detonators.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tri Budget | Accent Light | Articulation / Action |
|---|---|---|---|---|---|---|
| 55 | `evac_avionics_gyro_gimbal` | `evac_avionics_gyro_gimbal.glb` | 1.8m × 1.3m × 1.3m | 10.5k | Cyan (`#22d3ee`) | `HB_GIMBAL` rings spin; calculates orbital escape trajectory |
| 56 | `evac_cryo_hypergolic_manifold`|`evac_cryo_hypergolic_manifold.glb`|2.4m × 1.6m × 1.1m| 10.0k | Warning Red (`#ef4444`)| `HB_VALVE` levers over; fuels rocket stage; begins countdown |
| 57 | `evac_cabin_co2_scrubber` | `evac_cabin_co2_scrubber.glb` | 1.7m × 1.1m × 0.8m | 8.5k | Cyan (`#22d3ee`) | `HB_CARTRIDGE` pulls out; installs fresh lithium hydroxide cannister |
| 58 | `evac_manual_abort_detonator`| `evac_manual_abort_detonator.glb`| 1.4m × 0.8m × 0.5m | 7.5k | Warning Red (`#ef4444`)| `HB_COVER` flips; pulls dual abort toggles; triggers ending choice |
| 59 | `evac_cargo_ballast_scale` | `evac_cargo_ballast_scale.glb` | 0.4m × 2.0m × 2.0m | 7.0k | Amber (`#f59e0b`) | `HB_PLATFORM` depresses; weighs survivors and eggs; validates seats |
| 60 | `mothership_docking_umbilical_collar`|`mothership_docking_umbilical_collar.glb`|3.0m × 2.8m × 1.6m|13.5k| Brood Emerald (`#22c55e`)| `HB_PETALS` expand; latches onto alien mothership; triggers finale |

#### Suite 10 Prompts & Interaction Specs

**55. Evacuation Avionics Gyroscope Gimbal** — `evac_avionics_gyro_gimbal.glb`
- **Lore:** Three concentric brass and titanium gimbal rings spinning around a central gyroscopic rotor sphere like an anatomical celestial sphere.
- **Quest Hook:** Pre-flight system check; aligning the gyroscope is required to launch the ship.
- **Interaction Spec:** `[E] SPIN UP INERTIAL GYROSCOPE`. `HB_GIMBAL` rings rotate; green launch readiness indicator lights up.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE spacecraft inertial navigation gyroscope gimbal assembly (1.8 m H, 1.3 m W, 1.3 m D): an aerospace instrument assembly featuring three concentric brass and titanium gimbal rings supporting a heavy, central spinning rotor flywheel like a celestial mechanical astrolabe framed in anatomical pelvic arches. Precision jewel bearing housings with knurled micro-adjustment locknuts. High-frequency inductive pickup sensors and fine gold slip-ring contact brushes wired to a base terminal block. Polished brass gimbal rings with etched degree graduations, brushed aerospace titanium frame, cold cast gunmetal base pedestal. Story it tells: triple-axis mechanical gyroscope gimbal platform used by the escape shuttle's inertial navigation computer. Exactly one accent light: cold cyan alignment laser beam passing through the gimbal axes (#22d3ee); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**56. Cryogenic Hypergolic Propellant Manifold** — `evac_cryo_hypergolic_manifold.glb`
- **Lore:** Articulated fueling mast with frost-covered pipes and breakaway claw couplings, metering hypergolic fuel into the orbital shuttle engines.
- **Quest Hook:** *Preflight Fuel Umbilical* — Couple the fueling valves to initiate the launch sequence.
- **Interaction Spec:** `[E] ENGAGE FUEL UMBILICAL`. `HB_VALVE` turns; fuels orbital engines; begins launch countdown.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE ground-service cryogenic fueling manifold arm (2.4 m H, 1.6 m W, 1.1 m D): a heavy articulated ground fueling mast supporting dual insulated stainless steel propellant pipes. Swiveling pipe joints with frost-covered stainless steel compression couplings and emergency breakaway shear-pin claw valves resembling interlocking jaw talons. Dual heavy manual operating levers with rubber ball grips, analog pressure dials, and frost crystals coating the cold pipe flanges. Heavy structural steel support tower, chipped yellow gantry paint, stainless steel braided flex hoses, dripping condensation water. Story it tells: ground-service fueling arm and valve junction that feeds liquid oxidizer and hypergolic fuel into the orbital shuttle engines. Exactly one accent light: emergency red fuel-flow valve indicator on the breakaway coupler (#ef4444); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**57. Evacuation Cabin CO2 Scrubber Unit** — `evac_cabin_co2_scrubber.glb`
- **Lore:** Atmospheric revitalizer cabinet with breathing pulmonary bellows and purple chemical cartridges, recycling cabin air for the four-seat shuttle.
- **Quest Hook:** Securing a fresh chemical canister guarantees the human survivors do not suffocate during space transit.
- **Interaction Spec:** `[E] REPLACE RECIRCULATION CANISTER`. `HB_CARTRIDGE` slides in; grants 100% life-support safety.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE spacecraft cabin atmospheric CO2 scrubber cabinet (1.7 m H, 1.1 m W, 0.8 m D): an aerospace life-support console mounted on a bulkhead frame. The front face features two cylindrical vertical receiver chambers holding removable stainless steel mesh cartridges filled with color-changing purple lithium hydroxide absorbent pellets. A low-noise brushless electric circulation blower with an organic pulmonary bellows intake shroud sculpted like breathing lungs is mounted above the chambers. An analog airflow differential manometer with brass fittings and twin toggle switches. Brushed aluminum panels, white powder-coated frame with flight certification stencils, clear acrylic viewports showing absorbent pellets. Story it tells: atmospheric revitalizer cabinet on the four-seat shuttle; purges carbon dioxide to keep survivors alive in orbit. Exactly one accent light: cyan airflow status LED on the blower plenum (#22d3ee); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**58. Gantry Manual Launch Abort Detonator** — `evac_manual_abort_detonator.glb`
- **Lore:** Wall-mounted cast-iron emergency box behind wire-glass, containing dual T-handle detonators to blow up the gantry (Scorched Sky ending).
- **Quest Hook:** *Scorched Sky (Ending E)* — Trigger the self-destruct detonator to wipe the bunker and queen forever.
- **Interaction Spec:** `[E] PULL LAUNCH ABORT DETONATOR`. `HB_COVER` flips; triggers Scorched Sky ending sequence.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE emergency launch abort detonator station (1.4 m H, 0.8 m W, 0.5 m D): a wall-mounted cast-iron emergency console box fitted with a hinged red-bordered wire-mesh glass cover plate held shut by a lead tamper seal. Inside the box, two heavy cast-steel T-handle pull detonators with cross-drilled safety cotter pins are painted high-visibility safety yellow and black, flanked by skeletal bone reinforcement ribs. Heavy armored steel conduit runs out of the base into the wall. Chipped emergency red paint, scratched glass, heavy padlock hasp, industrial hazard stencils. Story it tells: wall-mounted locked glass enclosure containing dual manual pull-handles to detonate the launch gantry and prevent infection from leaving. Exactly one accent light: bright red strobe armed diode pulsing inside the glass box (#ef4444); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**59. Pre-Flight Cargo Ballast Scale Platform** — `evac_cargo_ballast_scale.glb`
- **Lore:** Low-profile hydraulic floor scale on the launch ramp, verifying total weight of passengers, eggs, or Queen against the 4-seat ceiling.
- **Quest Hook:** Manifest verification; checks total weight of humans, eggs, or Queen before flight computer unlocks thrusters.
- **Interaction Spec:** `[E] VERIFY PASSENGER WEIGHT`. `HB_PLATFORM` depresses; displays manifest allocation.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy industrial cargo ballast scale platform (0.4 m H, 2.0 m L, 2.0 m W): a low-profile square steel floor scale resting on four heavy industrial load cell feet framed in carnal bone ridges. The platform surface is made of heavy diamond-pattern steel tread plate painted with yellow diagonal hazard stripes along the beveled border ramps. A side upright pedestal column supports a digital weight display readout housing with an analog balance beam indicator. Scuffed tread plate, worn hazard paint, steel wear marks, heavy armored load cell cables trailing to pedestal. Story it tells: heavy floor-mounted hydraulic scale on the boarding ramp; enforces the mathematical 4-seat payload limit. Exactly one accent light: amber digital weight display backlighting on the pedestal readout (#f59e0b); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**60. Mothership Biomechanical Docking Umbilical Collar** — `mothership_docking_umbilical_collar.glb`
- **Lore:** Monumental circular docking portal with eight interlocking chitin-and-titanium petals that dilate to latch onto the Queen's alien mothership.
- **Quest Hook:** *Mothership Infection / Full Brood (Ending A & F)* — Final docking mechanism for the alien exodus.
- **Interaction Spec:** `[E] ENGAGE MOTHERSHIP UMBILICAL`. `HB_PETALS` expand; initiates final orbital boarding cutscene.
- **Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE monumental biomechanical spacecraft docking collar (3.0 m H, 2.8 m W, 1.6 m D): a circular aerospace docking tunnel ring fused with articulated Giger biomechanical chitin petals and moist vulvate docking lips. Eight heavy radial interlocking bone-and-titanium locking petals curve outward around the central circular airlock portal, dilating like an anatomical sphincter. Segmented vertebral hydraulic rams drive each petal, reinforced with wet ribbed black latex seals and glistening translucent cartilage gaskets. Multi-pin umbilical data and fuel plugs extend from the collar face. Machined aerospace gunmetal, polished black chitin, calcified bone, glistening organic mucus, cold steel clamping latches. Story it tells: massive segmented biomechanical airlock latch; designed to latch the human escape shuttle onto the Queen's alien mothership in orbit. Exactly one accent light: radiant emerald biomechanical bio-glow pulsing from the central portal iris (#22c55e); every other surface is unlit material colour. H.R. Giger biomechanical eroticism fused with brutal corporate industrialism: glistening wet black latex, polished translucent chitin, calcified bone, cold cast gunmetal and chrome, weeping fluids, exposed vascular networks, slick glossy specular highlights. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```
---

## 5. Companion Textures & Decals Manifest

To fully root the 60 interactive props in their environments, the expansion includes **12 seamless PBR environmental surface materials** and **12 visceral floor/wall decals**, authored to the same provocative H.R. Giger / Scorn / Clive Barker biomechanical horror standard.

### 5.1 Twelve Seamless PBR Environment Surfaces (2048×2048 Seamless Maps)

All 12 textures include complete production map sets: `_baseColor.webp`, `_normal.webp`, `_orm.webp` (Ambient Occlusion = R, Roughness = G, Metalness = B), and `_emissive.webp` (where indicated). Each material is strictly engineered for seamless 4-way tiling with zero edge seams, zero lighting gradient, and true orthogonal perspective.

| # | Material ID | Name / Description | Primary District | PBR Visual Characteristic |
|---|---|---|---|---|
| 01 | `tex_pbr_geothermal_trench_grate` | Geothermal Slotted Drainage Deck | Sector B-4 / Tallow Deep | Heavy cast-iron drainage slots spanning boiling geothermal runoff troughs, encrusted with verdigris patina and weeping condensation where pulsating fungal tendrils push through the vents. |
| 02 | `tex_pbr_meridian_cable_conduit_deck` | Braided Conduit Substation Floor | Sector A-9 / Meridian Core | Diamond-textured vulcanized black rubber safety matting with recessed steel wire troughs, interwoven with wet glistening human optic nerve bundles and braided umbilical wiring. |
| 03 | `tex_pbr_vesper_trench_treadplate` | Trench Bastion Treadplate | Sector C-7 / Vesper Stronghold | Heavy steel diamond-pattern treadplate scarred with shrapnel gouges, molten splatter from emergency door welds, soot, and smeared diesel oil. |
| 04 | `tex_pbr_corp_sublevel_linoleum` | Sub-Level 13 Corporate Linoleum | Horizon Corporate Executive Crypts | Waxed institutional linoleum tiles embedded with copper grounding grids and biomechanical face bas-reliefs, scuffed with forensic drag marks and dried arterial splatter. |
| 05 | `tex_pbr_hive_suture_amniotic_resin` | Suture Amniotic Bedrock | Hive Suture (Nahl's Sanctuary) | Translucent amber fossil resin layered over human bone fragments, calcified pelvic arches, with glistening specular wetness, capillary veins, and carnal mucosal pores. |
| 06 | `tex_pbr_vass_cleanroom_poly` | Xenobiology Cleanroom Polymer | Research Outpost 04 (Vass Laboratories) | White antibacterial polymer wall panels with welded sterile silicone seams, scratched with scalpel score marks, smeared with bioluminescent emerald hemolymph and chemical acid burns. |
| 07 | `tex_pbr_chasm_permafrost_bedrock` | Fractured Glacial Basalt | Chasm Abyss & Glacier Descent | Deep black volcanic basalt fractured by ice wedging, encrusted with blue glaciated rime, needle frost, and frozen mummified sinews bridging deep crevices. |
| 08 | `tex_pbr_crash_hull_ablative_tile` | Scorched Spacecraft Heat Shield | Crash Sites & Escape Gantry | Hexagonal black ceramic re-entry heat tiles with melted aerodynamic glassy slag, white shock stress lines, and scorched biomechanical chitin grafts along the expansion seams. |
| 09 | `tex_pbr_hive_chitin_plates` | Overlapping Beetle Chitin Shingles | Hive Carapace (Rhun's Citadel) | Shingled iridescent black insect carapace plates with ribbed ridges, vulvate breathing spiracles, yellow hemolymph seeps, and ultra-glossy chitin sheen. |
| 10 | `tex_pbr_hydro_fermenter_sludge` | Geothermal Nutrient Mulch | Tallow Hydroponic Trenches | Dense organic compost of rotting fibrous lichen, black geothermal silt, and glowing lime fungal spores over rusty grating, teeming with microscopic bioluminescent cilia. |
| 11 | `tex_pbr_evac_gantry_corrugated_deck` | Gantry Corrugated Walkway | Launch Gantry & Surface Perimeter | Perforated yellow-and-black industrial steel safety grating with drain holes, salt corrosion, grease wear paths, and charred thruster blast marks. |
| 12 | `tex_pbr_obsidian_cathedral_flagstone` | Biomechanical Obsidian Flagstone | Hive Relay & Queen's Lair | Mirror-polished black volcanic flagstones etched with geometric biomechanical canal channels resembling interlocking pelvic and spinal reliefs, weeping golden royal jelly. |

#### 5.1.1 Individual PBR Texture Prompts & Technical Specs

**T01. Geothermal Slotted Drainage Deck** — `tex_pbr_geothermal_trench_grate`
- **Primary District:** Sector B-4 / Tallow Deep
- **Map Channels:** `_baseColor, _normal, _orm (Roughness/Metalness/AO), _emissive`
- **Lore Story:** Heavy cast-iron drainage slots spanning boiling geothermal runoff troughs, encrusted with verdigris patina and weeping condensation where pulsating fungal tendrils push through the vents.
- **PBR Generation Prompt:**
```text
Hyper-detailed photorealistic seamless PBR surface texture of an industrial geothermal drainage grate floor deck: heavy cast-iron slotted grating with long rectangular drainage slots, encrusted with turquoise verdigris patina, chalky white geothermal mineral lime scaling, and glistening condensation droplets. Through the dark slots below, moist fleshy fungal mycelium tendrils and ribbed tracheal cords coil and weave between rusty iron ribs. Machined chamfered slot edges showing pitted bare gunmetal wear where boots have scuffed away rust. Glistening wet water sheen, oily rainbow heat discoloration, high-relief normal displacement, zero perspective distortion, perfectly orthogonal top-down flat view, perfectly tileable and seamless in both X and Y axes across all four edges. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, vignetting, frames, borders, shadows of overhead objects, people, shoes, text, watermarks.
```

**T02. Braided Conduit Substation Floor** — `tex_pbr_meridian_cable_conduit_deck`
- **Primary District:** Sector A-9 / Meridian Core
- **Map Channels:** `_baseColor, _normal, _orm (Roughness/Metalness/AO), _emissive`
- **Lore Story:** Diamond-textured vulcanized black rubber safety matting with recessed steel wire troughs, interwoven with wet glistening human optic nerve bundles and braided umbilical wiring.
- **PBR Generation Prompt:**
```text
Hyper-detailed photorealistic seamless PBR surface texture of a high-voltage cybernetic substation floor: heavy industrial diamond-tread vulcanized black rubber safety matting interrupted by recessed steel conduit troughs. Running through the troughs are dense bundles of braided copper high-current cables intertwined with wet, glistening white human optic nerves and arterial silicone tubing weeping clear conductive fluid. Exposed solder splices, yellow safety grounding lines, scuffed rubber texture with micro-pores, oil smudges, and fine wire clippings. H.R. Giger carnal cybernetic aesthetic: wet black latex, ribbed rubber, exposed vascular nerve cables, glossy specular highlights. Perfectly flat orthogonal top-down view, perfectly seamless and tileable in X and Y on all four borders. Square 1:1, 2048x2048. Exclude: angled perspective, tilt, fisheye, shadows of railings, borders, text, logos, watermarks.
```

**T03. Trench Bastion Treadplate** — `tex_pbr_vesper_trench_treadplate`
- **Primary District:** Sector C-7 / Vesper Stronghold
- **Map Channels:** `_baseColor, _normal, _orm (Roughness/Metalness/AO)`
- **Lore Story:** Heavy steel diamond-pattern treadplate scarred with shrapnel gouges, molten splatter from emergency door welds, soot, and smeared diesel oil.
- **PBR Generation Prompt:**
```text
Hyper-detailed photorealistic seamless PBR surface texture of brutal battlefield steel treadplate: heavy industrial five-bar raised diamond checker plate forged from rolled carbon steel. The surface is heavily scarred with deep shrapnel gouges, cratered bullet ricochet scars with bright exposed bare metal, and beaded slag splatter from emergency oxy-acetylene welding. Dark streaks of oxidized hydraulic fluid, smeared diesel soot, and dried dark maroon coagulated blood stains ground into the diamond recesses. Raw dark gunmetal, orange surface rust around weld seams, burnished metal highlights on tread diamonds. Perfectly flat orthogonal top-down surface view, completely seamless and tileable in X and Y across all borders. Square 1:1, 2048x2048. Exclude: perspective, camera tilt, horizon, cast shadows, frames, borders, text, watermarks.
```

**T04. Sub-Level 13 Corporate Linoleum** — `tex_pbr_corp_sublevel_linoleum`
- **Primary District:** Horizon Corporate Executive Crypts
- **Map Channels:** `_baseColor, _normal, _orm (Roughness/Metalness/AO)`
- **Lore Story:** Waxed institutional linoleum tiles embedded with copper grounding grids and biomechanical face bas-reliefs, scuffed with forensic drag marks and dried arterial splatter.
- **PBR Generation Prompt:**
```text
Hyper-detailed photorealistic seamless PBR surface texture of executive corporate linoleum flooring: square mottled grey-and-black composite vinyl tiles separated by narrow copper grounding strip joints. Subtle, eerie H.R. Giger bas-relief contours of screaming faces and skeletal vertebrae are pressed into the sub-surface linoleum texture beneath a cracked, high-gloss industrial polyurethane wax coating. The polished surface is marred by heavy heel scuffs, rubber wheelchair skid marks, dried forensic arterial blood droplets, and chemical etching spots from disinfectant mop residue. High specular reflectivity with micro-scratches, perfectly flat orthogonal top-down view, perfectly tileable and seamless in X and Y on all edges. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, ambient shadow gradient, borders, text, logos, watermarks.
```

**T05. Suture Amniotic Bedrock** — `tex_pbr_hive_suture_amniotic_resin`
- **Primary District:** Hive Suture (Nahl's Sanctuary)
- **Map Channels:** `_baseColor, _normal, _orm (Roughness/Metalness/AO), _emissive`
- **Lore Story:** Translucent amber fossil resin layered over human bone fragments, calcified pelvic arches, with glistening specular wetness, capillary veins, and carnal mucosal pores.
- **PBR Generation Prompt:**
```text
Hyper-detailed photorealistic seamless PBR surface texture of living biomechanical bedrock: a thick undulating floor layer of translucent honey-amber biological resin encasing fragmented calcified human vertebrae, pelvic bone plates, and polished black chitin shards. A network of pulsating red capillary veins and fine nerve threads branches through the resin depths beneath a mirror-slick, wet mucosal surface sheen. Small circular carnal pores and weeping glandular dimples release beads of golden royal jelly. H.R. Giger erotic body horror aesthetic: slick glistening organic glaze, bone textures, subcutaneous biological depth, wet specular highlights. True orthogonal top-down flat view, perfectly seamless and tileable on all four borders. Square 1:1, 2048x2048. Single subtle accent: soft amber bioluminescent subsurface scatter (#f59e0b). Exclude: camera tilt, perspective, floor shadows, borders, text, watermarks.
```

**T06. Xenobiology Cleanroom Polymer** — `tex_pbr_vass_cleanroom_poly`
- **Primary District:** Research Outpost 04 (Vass Laboratories)
- **Map Channels:** `_baseColor, _normal, _orm (Roughness/Metalness/AO), _emissive`
- **Lore Story:** White antibacterial polymer wall panels with welded sterile silicone seams, scratched with scalpel score marks, smeared with bioluminescent emerald hemolymph and chemical acid burns.
- **PBR Generation Prompt:**
```text
Hyper-detailed photorealistic seamless PBR surface texture of clinical xenobiology cleanroom wall panels: sterile off-white seamless antibacterial polymer cladding with heat-welded grey silicone expansion joints. The matte sanitary surface is marred by feverish scientific activity: fine scalpel test scratches, yellowed formaldehyde chemical splash stains, and dried streaks of fluorescent emerald-green alien hemolymph that cling to the micro-textured surface. Subtle hairline stress fractures around recessed countersunk titanium fastener plugs. Hospital cleanroom realism fused with bio-containment breach horror, satin gloss finish with wet glossy fluid splatters. Perfectly orthogonal top-down flat view, completely seamless and tileable in X and Y. Square 1:1, 2048x2048. Single accent: bioluminescent emerald green glow in hemolymph splatters (#22c55e). Exclude: perspective, shadows of equipment, frames, borders, text, logos, watermarks.
```

**T07. Fractured Glacial Basalt** — `tex_pbr_chasm_permafrost_bedrock`
- **Primary District:** Chasm Abyss & Glacier Descent
- **Map Channels:** `_baseColor, _normal, _orm (Roughness/Metalness/AO)`
- **Lore Story:** Deep black volcanic basalt fractured by ice wedging, encrusted with blue glaciated rime, needle frost, and frozen mummified sinews bridging deep crevices.
- **PBR Generation Prompt:**
```text
Hyper-detailed photorealistic seamless PBR surface texture of fractured sub-glacial bedrock: dense, pitch-black volcanic basalt stone shattered by severe freeze-thaw tectonic stress into interlocking angular flagstones. Deep frost-wedged fissures are choked with translucent cyan glacial ice crystals, needle-sharp hoarfrost rime, and frozen, mummified biological sinew fibers bridging the rock chasms. Micro-rough rock cleavage planes, glassy ice highlights, chalky dry basalt dust, high-contrast normal displacement. Brutal arctic subterranean horror. Perfectly flat orthogonal top-down view, completely seamless and tileable across all four borders. Square 1:1, 2048x2048. Exclude: perspective distortion, angled camera, horizon, borders, text, watermarks.
```

**T08. Scorched Spacecraft Heat Shield** — `tex_pbr_crash_hull_ablative_tile`
- **Primary District:** Crash Sites & Escape Gantry
- **Map Channels:** `_baseColor, _normal, _orm (Roughness/Metalness/AO)`
- **Lore Story:** Hexagonal black ceramic re-entry heat tiles with melted aerodynamic glassy slag, white shock stress lines, and scorched biomechanical chitin grafts along the expansion seams.
- **PBR Generation Prompt:**
```text
Hyper-detailed photorealistic seamless PBR surface texture of spacecraft thermal protection system: a tessellation of hexagonal matte black silica ceramic ablative heat tiles separated by narrow expansion gaps packed with grey Nextel thermal fabric. The tiles display severe atmospheric re-entry scorch patterns: aerodynamic streaks of melted glassy silicate slag, white thermo-mechanical stress lines, spalled chipped tile corners revealing fibrous porous white silica beneath, and scorched organic black chitin grafts fused into the tile seams. High-temperature ceramic texture, glossy vitrified melt streaks, matte porous ceramic bodies. True orthogonal top-down flat view, perfectly tileable and seamless in X and Y on all sides. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, vignetting, frames, text, watermarks.
```

**T09. Overlapping Beetle Chitin Shingles** — `tex_pbr_hive_chitin_plates`
- **Primary District:** Hive Carapace (Rhun's Citadel)
- **Map Channels:** `_baseColor, _normal, _orm (Roughness/Metalness/AO), _emissive`
- **Lore Story:** Shingled iridescent black insect carapace plates with ribbed ridges, vulvate breathing spiracles, yellow hemolymph seeps, and ultra-glossy chitin sheen.
- **PBR Generation Prompt:**
```text
Hyper-detailed photorealistic seamless PBR surface texture of living hive carapace armor: overlapping shingle plates of polished, iridescent black-and-midnight-purple beetle chitin. Each plate features raised anatomical ribbing reminiscent of human thoracic vertebrae and small vulvate breathing spiracles along the plate seams that weep viscous yellow hemolymph. Mirror-like wet chitin specular reflections, micro-scratches from claw impacts, translucent amber edges where plates overlap. H.R. Giger bio-armor eroticism: slick wet organic sheen, carnal breathing apertures, calcified ridge lines. Perfectly flat orthogonal top-down view, completely seamless and tileable in X and Y across all borders. Square 1:1, 2048x2048. Exclude: perspective, camera tilt, horizon, cast shadows, frames, borders, text, watermarks.
```

**T10. Geothermal Nutrient Mulch** — `tex_pbr_hydro_fermenter_sludge`
- **Primary District:** Tallow Hydroponic Trenches
- **Map Channels:** `_baseColor, _normal, _orm (Roughness/Metalness/AO), _emissive`
- **Lore Story:** Dense organic compost of rotting fibrous lichen, black geothermal silt, and glowing lime fungal spores over rusty grating, teeming with microscopic bioluminescent cilia.
- **PBR Generation Prompt:**
```text
Hyper-detailed photorealistic seamless PBR surface texture of fertile hydroponic fermentation sludge: a thick, wet slurry of decaying fibrous black cave moss, pulped psychoactive mushrooms, and dark mineral-rich geothermal silt. Interspersed through the mulch are clusters of velvety chartreuse fungal spore pods and twitching bioluminescent cilia that emit a sickly lime-green aura. Waterlogged organic mulch texture, wet bubbling slime pockets, buried rusty iron rebar mesh, glistening specular highlights on wet mud. Perfectly flat orthogonal top-down view, completely seamless and tileable across all four edges. Square 1:1, 2048x2048. Single accent: vibrant spore-lime bioluminescent glow from fungal clusters (#84cc16). Exclude: perspective, camera tilt, horizon, frames, borders, text, watermarks.
```

**T11. Gantry Corrugated Walkway** — `tex_pbr_evac_gantry_corrugated_deck`
- **Primary District:** Launch Gantry & Surface Perimeter
- **Map Channels:** `_baseColor, _normal, _orm (Roughness/Metalness/AO)`
- **Lore Story:** Perforated yellow-and-black industrial steel safety grating with drain holes, salt corrosion, grease wear paths, and charred thruster blast marks.
- **PBR Generation Prompt:**
```text
Hyper-detailed photorealistic seamless PBR surface texture of heavy industrial launch gantry decking: perforated corrugated steel safety planks stamped with circular traction holes and serrated drainage slots. Coated in chipped high-visibility industrial yellow and black diagonal hazard warning enamel. Heavy traffic wear patterns have buffed the center walking paths down to gleaming bare gunmetal, while perimeter crevices are packed with gritty salt crusts, rust flakes, and scorched carbon soot from rocket engine pre-burn tests. Raw cold steel edges, grease smudges around mounting bolt holes. Flat orthogonal top-down view, perfectly seamless and tileable in X and Y. Square 1:1, 2048x2048. Exclude: perspective, tilt, horizon, railing shadows, borders, text, watermarks.
```

**T12. Biomechanical Obsidian Flagstone** — `tex_pbr_obsidian_cathedral_flagstone`
- **Primary District:** Hive Relay & Queen's Lair
- **Map Channels:** `_baseColor, _normal, _orm (Roughness/Metalness/AO), _emissive`
- **Lore Story:** Mirror-polished black volcanic flagstones etched with geometric biomechanical canal channels resembling interlocking pelvic and spinal reliefs, weeping golden royal jelly.
- **PBR Generation Prompt:**
```text
Hyper-detailed photorealistic seamless PBR surface texture of an alien cathedral floor: monumental hexagonal flagstones of mirror-polished volcanic black obsidian, joined with seams of calcified white bone cement. Deeply carved into the glass-smooth obsidian are intricate H.R. Giger geometric canals depicting abstracted human pelvic arches and sinuous spinal columns. The etched channels flow with viscous, glowing amber royal jelly that pools at intersection nodes. Glassy specular reflections contrasting with porous bone and glistening wet bio-fluid channels. Perfectly flat orthogonal top-down view, completely seamless and tileable in X and Y across all borders. Square 1:1, 2048x2048. Single accent: warm amber glow from royal jelly channels (#f59e0b). Exclude: perspective angle, horizon, vignetting, frames, text, watermarks.
```

---

### 5.2 Twelve Visceral Floor & Wall Decals (RGBA Cutouts / Stencils)

Rendered with high-resolution alpha masks for projective decal application across `src/roomThemes.js` and `src/world3dOverlay.js`. Each decal provides rich forensic storytelling, faction branding, or environmental hazard warnings.

| # | Decal ID | Decal Name | Visual Contents & Lore Story | Placement Room Family |
|---|---|---|---|---|
| 01 | `decal_geothermal_steam_scorch` | Thermal Steam Scorch Bloom | Blistered elliptical paint burn with rusted bare metal center and weeping condensation droplets, created by a ruptured 300°C steam pipe. | `utility, engineering, tallow` |
| 02 | `decal_meridian_binary_litany` | Meridian Machine Cult Stencil | Glowing cyan stenciled hexadecimal prayers, sacred logic-gate diagrams, and stylized human spinal iconographies sprayed across bulkheads. | `engineering, meridian` |
| 03 | `decal_vesper_kill_tally` | Vesper Bastion Kill Tally | Hand-painted white skull stencil and 47 hash marks beside heavy 12.7mm armor-piercing bullet impact gouges and lead splash stars. | `security, armory, vesper` |
| 04 | `decal_corp_confidential_seal` | Corporate Classified Sub-Level Seal | Official Horizon Corporation 'TOP SECRET / BIOMETRIC LOCK / LEVEL 5' heraldic gold and crimson security stencil surrounded by warning chevron borders. | `security, executive, admin` |
| 05 | `decal_hive_symbiont_trail` | Bioluminescent Suture Slime Trail | Thick snail-like iridescent emerald slime smear containing twitching micro-filaments, shed translucent scales, and glistening mucus tracks. | `bio, hive, medical` |
| 06 | `decal_vass_neural_diagram` | Vass Xenolinguistic Chalk Sketch | Dr. Vass's hurried chalk and marker forensic diagram comparing human brainwaves and vocal cords to crawler ultrasonic clicks and bio-frequencies. | `medical, cryo-lab, vass` |
| 07 | `decal_tina_dermis_shed_residue` | Molted Epidermal Contact Mark | Sticky translucent amber secretion residue and torn epidermal skin outlines left against a wall where an infiltrator molted her synthetic human disguise. | `story, quarters, tina` |
| 08 | `decal_chasm_shear_fault_line` | Tectonic Shear Warning Hash | Jagged structural floor fracture with stenciled yellow hazard chevrons, warning lettering, and spalled concrete chunks along a bottomless fault edge. | `chasm, utility, corridor` |
| 09 | `decal_crash_drag_skid_trench` | Aerospace Hull Drag Trench | Deep gouged metal furrow with melted aluminum droplets, scorched titanium slag, and dark hydraulic fluid drag marks from a crash-landing shuttle. | `crash, exterior, hangar` |
| 10 | `decal_evac_seat_assignment_stencil` | Four-Seat Shuttle Stencil | High-contrast yellow deck stencil: 'SEAT 1: COMMAND', 'SEAT 2: PAYLOAD', 'SEAT 3: HOST', 'SEAT 4: BROOD' with directional boarding arrows and toxic biohazard badges. | `hangar, gantry, endgame` |
| 11 | `decal_amputation_arterial_spray` | Triage Arterial Spatter | Forensic dark crimson high-velocity blood mist pattern with boot skid marks, bone chips, and torn tourniquet rubber fragments from battlefield amputations. | `medical, armory, vesper` |
| 12 | `decal_alien_embryo_crown` | Primordial Brood Caul Sigil | Radial Giger biomechanical circular emblem etched into the floor, depicting an alien embryo surrounded by interlocking pelvic arches and blooming chitin petals. | `bio, nest, queen` |

#### 5.2.1 Individual Decal Prompts & Stencil Specs

**D01. Thermal Steam Scorch Bloom** — `decal_geothermal_steam_scorch`
- **Placement Families:** `utility, engineering, tallow`
- **Lore Story:** Blistered elliptical paint burn with rusted bare metal center and weeping condensation droplets, created by a ruptured 300°C steam pipe.
- **Decal Stencil Generation Prompt:**
```text
Hyper-detailed photorealistic decal graphic of an industrial high-pressure steam scorch bloom on a solid flat neutral 18% studio mid-grey (#808080) background: a large radial elliptical blast pattern created by a ruptured 300°C steam line. Center features bare, heat-blued steel with orange oxidation flakes, surrounded by concentric rings of blistered, peeling corporate olive-drab paint curling upward. Outer halo consists of dark brown water-mineral stains and weeping condensation drip trails trailing downward. High contrast alpha stencil cutout with frayed flaking paint edges, ultra-crisp silhouette, completely isolated in center of frame. Square 1:1, 2048x2048. Exclude: background objects, room reflections, perspective tilt, 3D walls, shadows on background.
```

**D02. Meridian Machine Cult Stencil** — `decal_meridian_binary_litany`
- **Placement Families:** `engineering, meridian`
- **Lore Story:** Glowing cyan stenciled hexadecimal prayers, sacred logic-gate diagrams, and stylized human spinal iconographies sprayed across bulkheads.
- **Decal Stencil Generation Prompt:**
```text
Hyper-detailed photorealistic decal graphic of a cybernetic cult graffiti litany on a solid flat neutral 18% studio mid-grey (#808080) background: industrial aerosol stenciled graffiti sprayed in glowing cyan paint (#22d3ee) over bulkheads. Features dense lines of sacred hexadecimal machine code, boolean logic gate schematics, and an intricate H.R. Giger stylized human spinal column fused with an integrated circuit board. Authentic paint runs, aerosol overspray feathering, stencil bridge gaps, scratched and distressed letter edges. Crisp isolated alpha cutout stencil in center of frame, perfectly flat orthogonal view. Square 1:1, 2048x2048. Exclude: perspective angle, floor, walls, background elements, lighting glare.
```

**D03. Vesper Bastion Kill Tally** — `decal_vesper_kill_tally`
- **Placement Families:** `security, armory, vesper`
- **Lore Story:** Hand-painted white skull stencil and 47 hash marks beside heavy 12.7mm armor-piercing bullet impact gouges and lead splash stars.
- **Decal Stencil Generation Prompt:**
```text
Hyper-detailed photorealistic decal graphic of a frontline combat kill tally on a solid flat neutral 18% studio mid-grey (#808080) background: a crude, hand-painted military skull insignia in chipped white lead paint, flanked by nine groups of five tally hash marks (47 kills). Surrounding the stencil are three massive cratered 12.7mm bullet impact gouges with silvery lead splash splatter stars and cracked metal spalling. Grimy grease thumbprints, dried blood smear across the final tally mark, chipped paint flecks. Crisp high-resolution decal cutout isolated in center of frame, flat orthogonal angle. Square 1:1, 2048x2048. Exclude: perspective, angled camera, walls, floor, 3D geometry.
```

**D04. Corporate Classified Sub-Level Seal** — `decal_corp_confidential_seal`
- **Placement Families:** `security, executive, admin`
- **Lore Story:** Official Horizon Corporation 'TOP SECRET / BIOMETRIC LOCK / LEVEL 5' heraldic gold and crimson security stencil surrounded by warning chevron borders.
- **Decal Stencil Generation Prompt:**
```text
Hyper-detailed photorealistic decal graphic of a corporate classified security emblem on a solid flat neutral 18% studio mid-grey (#808080) background: a formal corporate municipal stencil featuring the Horizon Corporation heraldic triangle logo, stamped in bold crimson red and gold metallic paint. Stenciled block text reads 'LEVEL 5 BIO-SECURITY / BIOMETRIC RESTRICTION / UNAUTHORIZED ENTRY EXECUTABLE ON SIGHT'. Framed by diagonal yellow-and-black hazard chevron borders. Stencil overspray, weathered abrasion scratches across the lettering, peel marks where official tamper tape was torn away. Crisp isolated decal cutout, flat perpendicular view. Square 1:1, 2048x2048. Exclude: perspective tilt, 3D background, room reflections, shadows.
```

**D05. Bioluminescent Suture Slime Trail** — `decal_hive_symbiont_trail`
- **Placement Families:** `bio, hive, medical`
- **Lore Story:** Thick snail-like iridescent emerald slime smear containing twitching micro-filaments, shed translucent scales, and glistening mucus tracks.
- **Decal Stencil Generation Prompt:**
```text
Hyper-detailed photorealistic decal graphic of an alien biological slime trail on a solid flat neutral 18% studio mid-grey (#808080) background: an undulating, snail-like viscous fluid drag trail left by a passing hive symbiont entity. Thick, glossy translucent emerald-green mucus with iridescent rainbow oil sheen, containing suspended black larval egg specks, shed translucent chitin scales, and twitching capillary micro-filaments. Realistic liquid surface tension beads, drying sticky edges with crackled mucus film, glistening glossy wet specular highlights. Crisp alpha decal mask isolated in center of frame, flat top-down view. Square 1:1, 2048x2048. Single accent: emerald bioluminescent inner glow (#22c55e). Exclude: 3D floor, walls, perspective, environment reflections.
```

**D06. Vass Xenolinguistic Chalk Sketch** — `decal_vass_neural_diagram`
- **Placement Families:** `medical, cryo-lab, vass`
- **Lore Story:** Dr. Vass's hurried chalk and marker forensic diagram comparing human brainwaves and vocal cords to crawler ultrasonic clicks and bio-frequencies.
- **Decal Stencil Generation Prompt:**
```text
Hyper-detailed photorealistic decal graphic of a scientific whiteboard chalk sketch on a solid flat neutral 18% studio mid-grey (#808080) background: frantic hand-drawn forensic notes by Dr. Vass in white, cyan, and red grease pencil and chalk. Detailed anatomical comparison diagram showing a human vocal-cord larynx spliced into an alien acoustic resonance chamber, annotated with mathematical frequency graphs (40kHz to 120kHz), handwritten cursive hypotheses ('THEY ARE NOT CALLING FOR FOOD — THEY ARE SINGING'), and directional synaptic arrows. Smudged chalk erasures, dusty chalk powder fallout, fingerprints in the grease pencil lines. Crisp isolated decal cutout, flat orthogonal view. Square 1:1, 2048x2048. Exclude: perspective angle, classroom walls, whiteboard frame, cast shadows.
```

**D07. Molted Epidermal Contact Mark** — `decal_tina_dermis_shed_residue`
- **Placement Families:** `story, quarters, tina`
- **Lore Story:** Sticky translucent amber secretion residue and torn epidermal skin outlines left against a wall where an infiltrator molted her synthetic human disguise.
- **Decal Stencil Generation Prompt:**
```text
Hyper-detailed photorealistic decal graphic of a forensic molting imprint on a solid flat neutral 18% studio mid-grey (#808080) background: the horrifying wall contact mark where Mayor Tina leaned while shedding her synthetic human exterior. A partial silhouette of a human face and shoulder pressed in sticky, translucent amber amniotic residue, complete with fine skin pore textures, shredded biological latex dermis fragments, torn executive suit polyester fibers, and jagged black chitin spine scratch grooves gouged into the surface. Dried weeping secretion runs, high specular wetness in residue pools, visceral body horror forensic detail. Crisp alpha stencil cutout isolated in frame, flat perpendicular view. Square 1:1, 2048x2048. Exclude: perspective distortion, 3D room, floor plane, shadows.
```

**D08. Tectonic Shear Warning Hash** — `decal_chasm_shear_fault_line`
- **Placement Families:** `chasm, utility, corridor`
- **Lore Story:** Jagged structural floor fracture with stenciled yellow hazard chevrons, warning lettering, and spalled concrete chunks along a bottomless fault edge.
- **Decal Stencil Generation Prompt:**
```text
Hyper-detailed photorealistic decal graphic of a structural tectonic floor rupture on a solid flat neutral 18% studio mid-grey (#808080) background: a violent jagged shear crack tearing across concrete floor slabs. Painted along the fault line are worn, chipped yellow industrial hazard chevrons and stenciled black warning text: 'CAUTION: SHEAR FAULT / UNSTABLE VOID'. The fracture reveals crumbled concrete aggregate, sheared rebar stubs, and black permafrost ice filling the fissure. Broken paint flakes, spalled concrete dust, realistic surface displacement. Crisp isolated alpha decal mask, flat top-down orthogonal view. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, room walls, deep void rendering, shadows.
```

**D09. Aerospace Hull Drag Trench** — `decal_crash_drag_skid_trench`
- **Placement Families:** `crash, exterior, hangar`
- **Lore Story:** Deep gouged metal furrow with melted aluminum droplets, scorched titanium slag, and dark hydraulic fluid drag marks from a crash-landing shuttle.
- **Decal Stencil Generation Prompt:**
```text
Hyper-detailed photorealistic decal graphic of a spacecraft crash skid mark on a solid flat neutral 18% studio mid-grey (#808080) background: an intense linear impact furrow gouged into deck plate by a crashing spacecraft keel. Features a deep central scrape of burnished bare titanium flanked by streaks of melted aluminum spray beads, scorched black re-entry soot, and wide smeared streaks of red hydraulic fluid and charred jet fuel. Serrated metal burrs curling outward along the furrow edges. High-impact forensic aviation disaster detail, crisp isolated decal silhouette, flat orthogonal top-down angle. Square 1:1, 2048x2048. Exclude: perspective tilt, 3D landscape, horizon, ambient background clutter.
```

**D10. Four-Seat Shuttle Stencil** — `decal_evac_seat_assignment_stencil`
- **Placement Families:** `hangar, gantry, endgame`
- **Lore Story:** High-contrast yellow deck stencil: 'SEAT 1: COMMAND', 'SEAT 2: PAYLOAD', 'SEAT 3: HOST', 'SEAT 4: BROOD' with directional boarding arrows and toxic biohazard badges.
- **Decal Stencil Generation Prompt:**
```text
Hyper-detailed photorealistic decal graphic of an aerospace gantry boarding stencil on a solid flat neutral 18% studio mid-grey (#808080) background: industrial spray-painted yellow and black flight deck markings. Features four distinct rectangular floor boarding boxes labeled in bold military stenciled font: 'SEAT 1: PILOT / COMMAND', 'SEAT 2: CARGO / PAYLOAD', 'SEAT 3: BIOLOGICAL HOST', 'SEAT 4: QUEEN / BROOD RESERVED'. Accompanied by directional chevron arrows and a three-crescent biohazard warning icon. Heavy industrial paint wear, scuffed foot-traffic abrasion, aerosol overspray bridges, paint chipping along metal seams. Crisp isolated decal stencil, flat orthogonal view. Square 1:1, 2048x2048. Exclude: perspective, 3D shuttle, gantry towers, lighting glare.
```

**D11. Triage Arterial Spatter** — `decal_amputation_arterial_spray`
- **Placement Families:** `medical, armory, vesper`
- **Lore Story:** Forensic dark crimson high-velocity blood mist pattern with boot skid marks, bone chips, and torn tourniquet rubber fragments from battlefield amputations.
- **Decal Stencil Generation Prompt:**
```text
Hyper-detailed photorealistic decal graphic of a forensic battlefield medical spatter pattern on a solid flat neutral 18% studio mid-grey (#808080) background: a high-velocity arterial blood spray pattern from an emergency trauma triage amputation. High-density central crimson impact pool with radiating elliptical droplet cast-off spines and fine mist aerosol spatter. Overlaid with a heavy combat boot sole skid mark through the wet blood, tiny splintered white bone fragments, and a torn scrap of black rubber tourniquet band. Realistic fluid coagulation gradient from dark red wet center to dried brown flaking edges, glossy specular highlights. Crisp alpha decal cutout isolated in frame, flat orthogonal angle. Square 1:1, 2048x2048. Exclude: perspective tilt, 3D floor, hospital furniture, room shadows.
```

**D12. Primordial Brood Caul Sigil** — `decal_alien_embryo_crown`
- **Placement Families:** `bio, nest, queen`
- **Lore Story:** Radial Giger biomechanical circular emblem etched into the floor, depicting an alien embryo surrounded by interlocking pelvic arches and blooming chitin petals.
- **Decal Stencil Generation Prompt:**
```text
Hyper-detailed photorealistic decal graphic of a biomechanical hive brood sigil on a solid flat neutral 18% studio mid-grey (#808080) background: an ancient, carved circular ritual emblem etched into rock or bulkhead metal. The design features a stylized sleeping alien-human hybrid embryo curled at the center, surrounded by concentric radial petals formed from interlocking human pelvic bones, sinuous lumbar vertebrae, and serrated chitin mandibles blooming outward like a dark carnal lotus. Deeply etched relief lines weeping black oily secretions, calcified white bone highlights, Giger erotic bio-surrealism aesthetic. Crisp isolated circular decal stencil, flat orthogonal view perpendicular to surface. Square 1:1, 2048x2048. Single accent: subtle bioluminescent emerald rune pulse along the inner embryo circle (#22c55e). Exclude: perspective angle, 3D rock walls, room reflections, lighting distortion.
```

---

## 6. Implementation Architecture & Code Hooks

### 6.1 Manifest Registration (`src/world3dOverlay.js`)
Each new model is added to `WORLD_3D_MODELS` with metric scale normalization:
```javascript
// Example Registration Slice
geo_steam_manifold_actuator: { url: '/3d/runtime/new3ds/geo_steam_manifold_actuator.glb', height: 1.8, yaw: 0 },
tallow_vaccine_alembic: { url: '/3d/runtime/new3ds/tallow_vaccine_alembic.glb', height: 1.5, yaw: 0 },
meridian_optic_nerve_patchbay: { url: '/3d/runtime/new3ds/meridian_optic_nerve_patchbay.glb', height: 2.0, yaw: 0 },
vesper_ordnance_disarm_table: { url: '/3d/runtime/new3ds/vesper_ordnance_disarm_table.glb', height: 1.3, maxSpan: 1.8, yaw: 0 },
corp_biometric_wall_safe: { url: '/3d/runtime/new3ds/corp_biometric_wall_safe.glb', height: 1.4, yaw: 0 },
suture_flesh_mending_bath: { url: '/3d/runtime/new3ds/suture_flesh_mending_bath.glb', height: 1.2, maxSpan: 2.4, yaw: 0 },
vass_translation_phonograph: { url: '/3d/runtime/new3ds/vass_translation_phonograph.glb', height: 1.6, yaw: 0 },
tina_vocal_mimic_synthesizer: { url: '/3d/runtime/new3ds/tina_vocal_mimic_synthesizer.glb', height: 1.4, yaw: 0 },
chasm_cable_traversal_winch: { url: '/3d/runtime/new3ds/chasm_cable_traversal_winch.glb', height: 2.2, maxSpan: 1.8, yaw: 0 },
scout_tachyon_radar_mast: { url: '/3d/runtime/new3ds/scout_tachyon_radar_mast.glb', height: 2.6, yaw: 0 },
evac_avionics_gyro_gimbal: { url: '/3d/runtime/new3ds/evac_avionics_gyro_gimbal.glb', height: 1.8, yaw: 0 },
mothership_docking_umbilical_collar: { url: '/3d/runtime/new3ds/mothership_docking_umbilical_collar.glb', height: 3.0, maxSpan: 2.8, yaw: 0 }
```

### 6.2 Declarative Interactions (`src/propInteractions.js`)
All 60 items receive structured interaction handlers with audio, state toggles, and gameplay consequence:
```javascript
// Example Interaction Hook
geo_steam_manifold_actuator: statefulInteraction(
    '[E] BLEED GEOTHERMAL MANIFOLD',
    (state) => `GEOTHERMAL BYPASS: ${state === 'open' ? 'PRESSURE VENTED — PASSAGE CLEARED' : 'OVERPRESSURE SEALED'}.`,
    {
        nextState: (_game, prop) => nextBinaryState(prop, 'open', 'closed'),
        solidForState: (state) => state !== 'open',
        sound: 'power_hum',
        onUse: (game, prop, state) => {
            if (state === 'open') {
                game.spawnSteamCloud?.(prop.position.x, prop.position.z, { radius: 3.0, duration: 4.0 });
                game.clearSectorHazard?.('sector_b4_steam');
            }
        }
    }
)
```

### 6.3 Dynamic Practical Lighting Pool (`src/propFx.js`)
Each model binds to the 8-light shadowless dynamic pool using its authored accent light:
```javascript
geo_steam_manifold_actuator: { color: 0xf59e0b, intensity: 1.4, distance: 4.5, pulse: 'steady' },
meridian_optic_nerve_patchbay: { color: 0x22d3ee, intensity: 1.8, distance: 5.0, pulse: 'flicker' },
vesper_ordnance_disarm_table: { color: 0xef4444, intensity: 1.2, distance: 3.5, pulse: 'slow_strobe' },
suture_flesh_mending_bath: { color: 0x22c55e, intensity: 2.0, distance: 6.0, pulse: 'breathe' }
```

---

## 7. Confirmation & Sign-Off Checklist

Before generating 3D meshes or committing runtime assets, the following verification milestones must be confirmed:

- [x] **Zero Catalog Collisions**: All 60 asset names and roles verified against `src/world3dOverlay.js` (no overlap with existing 205 models or recent 98 props).
- [x] **Aesthetic Duality Alignment**: Visual art direction confirms the dual balance of *Corporate Deep-Space Industrialism* and *H.R. Giger Biomechanical Horror*.
- [x] **Background Standard Sign-Off**: 100% of generative image prompts committed to flat neutral 50% studio mid-grey (`#808080`) to eliminate colored rim bleed.
- [x] **Single Accent Rule Confirmed**: Exactly one authored single-color LED / bio-glow source per asset conforming to the faction color matrix.
- [x] **Tri Budget & Detail Preservation**: Models ingested at 35,000–45,000 triangles with 2048px textures and compressed via `gltfpack -c -kn -km -ke -noq` (avg 2.76 MB per model, 97% reduction from 90MB raw scans).
- [x] **Blender Articulation Contract & Prop Experience**: Moving parts rigged and bound to `src/propArticulation.js` and `src/propExperience.js` dynamic interaction controllers.
- [x] **Quest & Linchpin Mapping Approved**: 100% of assets assigned explicit narrative hooks in Act 1 bonding, Act 2 endings, or world lore drops.

---

## 8. Ingest, Wiring, Rigging & Verification Report (Sprint 52)

### 8.1 3D Model Intake & Optimization
- **Delivered Batch**: 59 GLB assets ingested from `art/raw/` into `public/3d/runtime/new3ds/`.
- **Processing Pipeline**: Parallel execution via Blender 5.2.2 headless (`scripts/blender/ingest_expansion_60_glbs.py` and `scripts/blender/run_parallel_expansion_60_ingest.py`) combined with `gltfpack -c -kn -km -ke -noq`.
- **Optimization Results**:
  - Total batch size: **162.56 MB** across 59 props (average **2.76 MB** per prop, reduced from ~90 MB raw per prop).
  - Triangle budget: Preserved pristine hero geometry at 35,000–45,000 triangles with full normal recalculation, clean UV preservation, and 2048×2048 WebP textures.
  - *Note*: Asset `tina_pheromone_dispersal_vent.glb` was missing from the initial raw SCP upload batch; registered cleanly in catalog and interaction tables ready for immediate drop-in.

### 8.2 Decal Transparency Keying
- **Delivered Decals**: 12 decal concepts with 4 variants each (`a`, `b`, `c`, `d`), totaling 48 decal image files.
- **Keying Process**: Processed via `scripts/art/key_expansion_grey_decals.py` using calibrated neutral grey background subtraction (`RGB [120, 120, 120]`), smoothstep edge falloff, and color unmixing to prevent grey rim fringing.
- **Output Targets**:
  - `public/decal_*.png`
  - `public/3d/runtime/decals/decal_*.png`
  - `art/source/decals/world-expansion-2026-10-14/keyed/`

### 8.3 Photorealistic Seamless PBR Surfaces
- **Delivered Textures**: 12 photorealistic environmental surfaces generated via Imagen 3 / Nano Banana prompts.
- **PBR Map Processing**: Processed via `scripts/art/process_generated_pbr_surfaces.py` into full 6-texture PBR suites:
  1. `_baseColor.webp` (Seamless tileable albedo)
  2. `_normal.webp` (Tangential normal map from multi-scale Sobel + high-pass height reconstruction)
  3. `_orm.webp` (Packed glTF PBR map: R = Cavity AO, G = Roughness, B = Metalness)
  4. `_emissive.webp` (Authored emissive accent lighting mask)
  5. `_color.webp` (Color map alias)
  6. `_rough.webp` (Standalone roughness map alias)
- **Runtime Deployment**:
  - `public/3d/runtime/surfaces/*.webp` (72 WebP files)
  - `public/3d/runtime/kits/textures/*.webp` (72 WebP files)
  - `art/source/textures/world-expansion-2026-10-14/pbr/*.webp`

### 8.4 Engine Systems Wiring & Lighting
- **`src/world3dOverlay.js`**:
  - Registered all 60 models in `WORLD_3D_MODELS` with exact metric scale normalization, yaw rotation, and bounding spans.
- **`src/propInteractions.js`**:
  - Registered all 60 models in `PROP_INTERACTION_SPECS` with custom `[E]` prompts, unique audio triggers (`power_hum`, `vault_open`, `spark_weld`, `flesh_squelch`), state cycles, and narrative rewards (scrap, stims, research notes, hazard purging).
- **`src/propFx.js`**:
  - Configured all 60 models in `HERO_PROFILES` with authored faction accent lighting (`0x22d3ee` Cyan, `0xef4444` Horizon Red, `0xf59e0b` Warning Amber, `0x84cc16` Spore Lime, `0x22c55e` Brood Emerald, `0xeab308` Queen Gold).
  - Integrated dynamic lighting behaviors: steady glow, breathing bioluminescence, flickering fault arcs, spark emitters, steam clouds, and cryogenic mist.
- **`src/propExperience.js`**:
  - Registered all 60 models in `PROP_EXPERIENCE_PROFILES` with tailored acknowledgment pulses, mechanism vs. terminal behavior modes, and interaction distance thresholds.

### 8.5 Test Verification
- All 84 unit and integration tests across prop overlay, interaction, fx, experience, and articulation systems pass cleanly:
  - `src/world3dOverlay.test.js`: 19/19 passing.
  - `src/propInteractions.test.js`: 24/24 passing.
  - `src/propFx.test.js`: 19/19 passing.
  - `src/propExperience.test.js`: 4/4 passing.
  - `src/propArticulation.cohort20261012.test.js`: 14/14 passing.
  - `src/propArticulation.test.js`: 4/4 passing.

