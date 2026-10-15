# Master Plan: 80 New Interactive 3D GLBs, Decals, Materials & World Story Expansion — 2026-10-15

**Document ID:** `HB-PLAN-2026-10-15-GLB80`  
**Author:** Antigravity (World Architecture, Systems Engineering & Narrative Design)  
**Date:** October 15, 2026  
**Status:** Phase 1 Complete (Full Asset Inventory, Texture Audit, Narrative/Room Gap Analysis & Architectural Blueprint)  
**Target Ingest Path:** `art/raw/` $\rightarrow$ `scripts/blender/` $\rightarrow$ `public/3d/runtime/new3ds/`  
**Companion Documents:**
- [Master Plan: 60 New Interactive 3D GLBs, Decals, and World Story Expansion (2026-10-14)](./interactive-world-expansion-60-glbs-master-plan-2026-10-14.md)
- [Lore and World Story Assets & Textures Pass 1 (2026-10-12)](./lore-and-world-story-assets-and-textures-2026-10-12.md)
- [Lore & World Story Expansion Pass 2 (2026-10-12)](./lore-and-world-story-assets-expansion-pass2-2026-10-12.md)
- [Prop Emissions, Hazards, and Liquids Plan (2026-10-15)](./prop-emissions-hazards-and-liquids-plan-2026-10-15.md)
- [Whole-World Prop Interactivity and Animation Master Plan (2026-10-09)](./world-prop-interactivity-master-plan-2026-10-09.md)
- [Expanded Universe & Narrative Design Bible](../expanded-universe-narrative-design.md)
- [Camps, Choices & Endings Design](../story-arc-endings-design.md)

---

## 1. Executive Summary & Initiative Scope

### 1.1 The Master Mandate
Following the successful integration of the 60 interactive GLBs in Sprint 52 (`HB-PLAN-2026-10-14-GLB60`), *Hunker Bunker* has entered its definitive world-building phase. To elevate the game into an unforgettable, dense, tactile immersive sim and survival roguelike, this initiative expands the physical world with **80 brand-new, non-duplicate interactive 3D GLB assets**, accompanied by **16 photorealistic seamless PBR surface materials** and **16 visceral forensic decals**.

Every asset in this 80-piece expansion is purpose-built to address documented gaps in:
1. **Physical Agency & Interactability**: Moving mechanical parts (`HB_*` Blender node hierarchy), glTF runtime extras (`hb_motion`, `hb_axis`, `hb_open_angle`, `hb_sound`), dynamic light response (`FX_LIGHT_00`), and dedicated `[E]` interaction hooks (`src/propInteractions.js`).
2. **Environmental Coherence & Placement Spots**: Dedicated physical anchor categories (Ceiling Suspensions, High Wall Mounts, Floor Trench Covers, Catwalk Chokepoints, Altar Centerpieces, and Tabletop Consoles).
3. **Forensic Narrative Integration**: Direct story linchpins tying into Act 1 Camp survival (Meridian, Tallow, Vesper), Mayor Tina's terrifying alien mimicry, Dr. Okonkwo-Vass's acoustic xenobiology, Director Chen's corporate coverup, the Three Brood Hives (Nahl, Vey, Rhun), deep seismic void rifts, crash site hulls, and the 5 distinct Act 2 escape endings.

### 1.2 Two-Phase Delivery Roadmap
- **Phase 1 (This Document)**:
  - Exhaustive inventory and classification of **all 619 existing GLB files** in the project, explicitly flagging textured vs untextured assets (such as the 80 untextured modular kit pieces).
  - Codification of the strict **Prompt Style Guide & Reference Examples** for 3D meshes, seamless PBR textures, and decals.
  - Comprehensive review of all **26 procedural room themes** and **core storyline branches**.
  - Systematic **Gap Analysis** identifying missing narrative anchors, room dress shortages, interactive deficits, and untextured geometry.
  - The architectural specification and manifest for the **80 new assets** (10 suites of 8 assets), **16 PBR materials**, and **16 matching decals**.
- **Phase 2 (Next Deliverable)**:
  - Complete authoring of all 80 full-length generative 3D prompts in the established photorealistic style.
  - Complete authoring of the 16 PBR texture prompts and 16 decal stencil prompts.
  - Blender ingestion scripts, gltfpack compression pipelines, and engine wiring into `src/world3dOverlay.js`, `src/propInteractions.js`, `src/propFx.js`, `src/propExperience.js`, and `src/roomDressingKits.js`.

---

## 2. Complete Inventory of All Existing GLB Assets (619 Total)

An exhaustive audit of the `public/` directory reveals **619 total GLB files** across 8 distinct directories. 
Of these, **537 are fully textured**, while **82 assets are currently untextured / missing textures** (primarily the modular kit geometries and collision reference models).

```
========================================================================================
                          HUNKER BUNKER RUNTIME GLB ASSET CENSUS
========================================================================================
 Directory                                 | Count | Textured | Untextured | Primary Use
-------------------------------------------+-------+----------+------------+--------------------------------------
 public/3d/runtime/new3ds/                 |   483 |      483 |          0 | High-fidelity world props & hero items
 public/3d/runtime/kits/modular-cave-kit/  |    40 |        0 |         40 | Untextured procedural cave geometry
 public/3d/runtime/kits/modular-space-kit/ |    40 |        0 |         40 | Untextured procedural bunker geometry
 public/3d/runtime/community/              |    30 |       30 |          0 | Community class skins & cosmetics
 public/3d/runtime/                        |    19 |       19 |          0 | Bosses, core characters & base machines
 public/3d/runtime/secrets/                |     3 |        3 |          0 | Narrative secrets (Mayor Tina, Roach)
 public/3d/runtime/structures/             |     2 |        0 |          2 | Reference building & collision hulls
 public/3d/scouting-scout/                 |     1 |        1 |          0 | Scout gameplay model
 public/3d/                                |     1 |        1 |          0 | Bunker environment reference mesh
-------------------------------------------+-------+----------+------------+--------------------------------------
 TOTAL                                     |   619 |      537 |         82 | 
========================================================================================
```

### 2.1 The 82 Untextured Assets (Identified Gaps)
The following 82 GLB files currently contain raw geometry without baked PBR diffuse, normal, or ORM maps. In runtime, they either rely on vertex colors, runtime three.js mesh basic materials, or fallback untextured grey clay rendering.

1. **Modular Cave Kit (`public/3d/runtime/kits/modular-cave-kit/`, 40 files)**:
   - `corridor-corner.glb`, `corridor-end.glb`, `corridor-intersection.glb`, `corridor-junction.glb`, `corridor-transition.glb`
   - `corridor-wide-corner.glb`, `corridor-wide-end.glb`, `corridor-wide-intersection.glb`, `corridor-wide-junction.glb`, `corridor-wide.glb`, `corridor.glb`
   - `gate-metal-bars.glb`, `gate-overhang.glb`, `gate-rock.glb`, `gate.glb`, `ladder.glb`
   - `room-corner.glb`, `room-large-variation.glb`, `room-large.glb`, `room-small-variation.glb`, `room-small.glb`, `room-wide-variation.glb`, `room-wide.glb`
   - `stairs-wide.glb`, `stairs.glb`
   - `template-corner.glb`, `template-detail.glb`, `template-floor-big.glb`, `template-floor-detail-a.glb`, `template-floor-detail.glb`
   - `template-floor-layer-hole.glb`, `template-floor-layer-raised.glb`, `template-floor-layer.glb`, `template-floor.glb`
   - `template-wall-corner.glb`, `template-wall-detail-a.glb`, `template-wall-half.glb`, `template-wall-stairs.glb`, `template-wall-top.glb`, `template-wall.glb`
2. **Modular Space Kit (`public/3d/runtime/kits/modular-space-kit/`, 40 files)**:
   - `cables.glb`, `corridor-corner.glb`, `corridor-end.glb`, `corridor-intersection.glb`, `corridor-junction.glb`, `corridor-transition.glb`
   - `corridor-wide-corner.glb`, `corridor-wide-end.glb`, `corridor-wide-intersection.glb`, `corridor-wide-junction.glb`, `corridor-wide.glb`, `corridor.glb`
   - `gate-door-window.glb`, `gate-door.glb`, `gate-lasers.glb`, `gate.glb`
   - `room-corner.glb`, `room-large-variation.glb`, `room-large.glb`, `room-small-variation.glb`, `room-small.glb`, `room-wide-variation.glb`, `room-wide.glb`
   - `stairs-wide.glb`, `stairs.glb`
   - `template-corner.glb`, `template-detail.glb`, `template-floor-big.glb`, `template-floor-detail-a.glb`, `template-floor-detail.glb`
   - `template-floor-layer-hole.glb`, `template-floor-layer-raised.glb`, `template-floor-layer.glb`, `template-floor.glb`
   - `template-wall-corner.glb`, `template-wall-detail-a.glb`, `template-wall-half.glb`, `template-wall-stairs.glb`, `template-wall-top.glb`, `template-wall.glb`
3. **Structures Reference (`public/3d/runtime/structures/`, 2 files)**:
   - `structure_reference_49m.glb` (49m structural volume)
   - `structure_reference_49m.collision.glb` (Simplified collision hull)

*Actionable Opportunity:* These 80 modular kit pieces represent prime surfaces to receive the 16 new seamless PBR environmental floor/wall textures authored in this master plan!

---

### 2.2 Functional Categorization of Runtime 3D Models (`new3ds/`, 483 assets)
The 483 models in `public/3d/runtime/new3ds/` represent the active physical world. They break down into distinct semantic families:

| Prefix Family | Total Count | In `world3dOverlay.js` | In `propInteractions.js` | In `propFx.js` | Description & Gameplay Role |
|---|---|---|---|---|---|
| `life_*` | 97 | 97 | 18 | 40 | Lived-in camp clutter, beds, heaters, latrines, arcade cabinets |
| `prop_*` | 85 | 85 | 0 | 37 | Ambient infrastructure, pipes, electrical nodes, surgical beds |
| `chassis_*` | 23 | 1 | 0 | 0 | Operator chassis bodies (Tank, Scout, Engineer armor cosmetics) |
| `skin_*` | 22 | 0 | 0 | 0 | Weapon / class visual skins (Chitin, Cryo Plasma, Corporate) |
| `mod_*` | 16 | 1 | 0 | 0 | Weapon modification attachments and upgrades |
| `charm_*` | 16 | 0 | 0 | 0 | Weapon keychains and cosmetic charms |
| `arch_*` | 14 | 14 | 0 | 1 | Macro architectural buttresses, columns, and heavy blast doors |
| `chasm_*` | 13 | 13 | 10 | 6 | Seismic void rigs, cable winches, sounding anchors, drop sensors |
| `corp_*` | 13 | 13 | 13 | 9 | Executive black site items, biometric safes, whisper booths |
| `hive_*` | 12 | 12 | 11 | 12 | Biomechanical hive organs, brood thrones, bio-sac gestators |
| `vesper_*` | 10 | 10 | 10 | 5 | Iron Guild military ordnance, disarm tables, ammo presses |
| `cryo_*` | 10 | 10 | 9 | 7 | Cryogenic freezers, hibernation coffins, permafrost vents |
| `npc_*` | 10 | 10 | 0 | 0 | NPC static models (Director Chen, Martha, Kaelen, Briggs) |
| `tina_*` | 9 | 9 | 9 | 5 | Mayor Tina's mimic shed skins, ballot boxes, vocal synthesizers |
| `meridian_*` | 8 | 8 | 8 | 8 | Meridian high-voltage tech, optic patchbays, capacitor shrines |
| `state_*` | 8 | 8 | 0 | 0 | Breached wall states, rubble barricades, shattered columns |
| `vass_*` | 8 | 8 | 8 | 8 | Dr. Vass xenobiology bell jars, phonographs, embryo incubators |
| `evac_*` | 8 | 8 | 8 | 6 | 4-seat shuttle escape gantry, gyro gimbals, boarding stencils |
| `tallow_*` | 7 | 7 | 7 | 6 | Hydroponic spore stills, vaccine alembics, seed vaults |
| `base_*` | 5 | 5 | 3 | 3 | Bunker base amenities, workbenches, terminal hubs |
| `boss_*` | 5 | 2 | 0 | 2 | Boss encounter entities (Queen, Spore Snail, Cyber Snail) |
| `ship_*` | 4 | 4 | 4 | 2 | Ship wreckage modules (navigation cores, engine manifolds) |
| `crash_*` | 4 | 4 | 3 | 2 | Crash site fuselage wreckage, black boxes, titanium keels |
| `engineer_*` | 3 | 3 | 3 | 2 | Engineer class archetypes (kinetic forges, plasma stations) |
| `scout_*` | 3 | 3 | 3 | 2 | Scout class archetypes (tachyon radar masts, tracking beacons) |
| `tank_*` | 3 | 3 | 3 | 2 | Tank class archetypes (reactive armor forges, kinetic rams) |
| `carapace_*` | 3 | 3 | 3 | 3 | Rhun Brood ossuary anvils, chitin splitters |
| `suture_*` | 3 | 3 | 3 | 3 | Nahl Brood flesh-mending baths, larval nursery urns |
| `relay_*` | 3 | 3 | 3 | 3 | Acoustic tuning forks, false beacon spires, resonance diaphragms |
| `substation_*`| 2 | 2 | 2 | 2 | Stepdown transformers, breaker interlocks |
| `geo_*` | 2 | 2 | 2 | 2 | Geothermal steam manifold actuators, pressure sirens |
| `weapon_*` | 3 | 3 | 1 | 1 | Heavy flamethrower cases, fuel canisters |
| Other/Misc | 18 | 15 | 8 | 12 | Mothership collars, drill heads, tagged salvage heaps, etc. |

---

## 3. The Prompt Style Guide & Reference Standards

Every asset generated for *Hunker Bunker* must strictly obey the established aesthetic doctrine. Models that deviate into cartoonish, generic sci-fi, or fantasy styles will break game immersion.

```
                  +-------------------------------------------------------------+
                  |              THE HUNKER BUNKER AESTHETIC CONTRACT           |
                  +-------------------------------------------------------------+
                                                 |
                  +------------------------------+------------------------------+
                  |                                                             |
                  v                                                             v
    BRUTAL CORPORATE INDUSTRIAL (HORIZON)                         H.R. GIGER BIOMECHANICAL (HIVE)
    - Heavy cold-rolled cast iron & gunmetal                      - Sinuous ribbed tracheal conduits, vertebrae
    - Chipped dark enamel paint (#1c1917, #292524)                - Wet black latex, translucent amber chitin
    - Tarnished brass compression fittings                        - Calcified ivory bone frames, pelvic arches
    - Braided high-voltage conduits, zip-ties                     - Pulsating flesh sphincters, weeping bile
    - Stamped industrial serials, yellow hazard chevrons          - Bioluminescent spore pods, amniotic sacs
```

### 3.1 The 5 Invariable Rules for 3D Asset Prompts
1. **Neutral 50% Studio Grey Background (`#808080`)**:
   - The asset must be rendered on a completely flat `#808080` neutral grey background.
   - *Never* use green screen, chroma blue, white, or black backgrounds (which cause chromatic rim bleed and fringing when background is subtracted during 3D photogrammetric meshing).
2. **Orthographic Studio Lighting**:
   - 360-degree diffuse 5500K soft studio illumination. No harsh directional suns, no cast ground shadows, and no floor plane.
3. **Single Centered Object with Breathing Margin**:
   - Exactly one isolated prop centered in a 1:1 square frame with 10% breathing margin on all sides. No multiple angles, no collage, no character holding it.
4. **Single-Accent Illumination Standard**:
   - Exactly one authored accent color per prop matching the faction color matrix. This drives the point light in `src/propFx.js`.

| Faction / System | Accent Color | Hex Value | Runtime Visual Meaning |
|---|---|---|---|
| **Meridian / Cryo Systems** | Cyan | `#22D3EE` | High voltage, chilled coolant, digital logic, data stream |
| **Corporate / Security / Hazard** | Horizon Red | `#EF4444` | Biometric lockout, emergency purge, high danger, execution |
| **Industrial / Heavy Utility** | Warning Amber | `#F59E0B` | Boiler pressure, fuel line, mechanical power, mining status |
| **Tallow Hydro / Bio-Spore** | Spore Lime | `#84CC16` | Geothermal nutrients, psychotropic lichen, fungal incubation |
| **Hive Xenobiology** | Brood Emerald | `#22C55E` | Pure alien bile, neural synapse, symbiotic gestation |
| **Endgame Royal Hive** | Queen Gold | `#EAB308` | Royal jelly, unhatched queen caul, primordial biomass |

5. **Universal Negative Prompt Block**:
   Every 3D asset prompt must append:
   ```text
   Exclude: concept art, illustration, drawing, sketch, ink lines, cross-hatching, painterly, cel shading, cartoon, anime, low detail, blurry, flat lighting, harsh shadows, ground shadow, floor, horizon, scenery, background objects, gradient background, vignette, depth of field, lens flare, multiple objects, turnaround sheet, split panels, collage, people, human nudity, human genitals, text, logos, watermark, signature, clean sterile sci-fi, medieval fantasy, church, crosses, altars, runes, pastel colors. Square 1:1, 2048x2048.
   ```

---

### 3.2 Reference Prompt Examples (From Approved Archive)

#### Reference 3D Asset Prompt Example (`geo_steam_manifold_actuator.glb`)
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy industrial geothermal steam manifold actuator (1.8 m H, 1.2 m W, 0.9 m D): a cast-iron steam bypass junction bolted to a steel floor flange, featuring thick lagged steel pipes insulated with asbestos wraps bound with copper wire. A large, five-spoke cast-bronze manual valve handwheel sits at chest height, encrusted with green verdigris patina and chalky mineral lime deposits. An analog dial pressure gauge with a cracked convex glass face shows a needle pegged in the red hazard zone. Dual emergency spring-loaded copper pressure relief valves vent upward with stained brass discharge bells. Chipped matte olive drab enamel on the valve housing, cold cast gunmetal pipe flanges, weeping condensation droplets, heat-scorched peeling paint. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter side view. Single accent light: warm amber indicator lamp (#f59e0b) on the gauge body. Exclude: text, letters, people, hands, floor, horizon, shadows. Square 1:1, 2048x2048.
```

#### Reference Decal Stencil Prompt Example (`decal_vesper_kill_tally`)
```text
Hyper-detailed photorealistic decal graphic of a frontline combat kill tally on a solid flat neutral 18% studio mid-grey (#808080) background: a crude, hand-painted military skull insignia in chipped white lead paint, flanked by nine groups of five tally hash marks (47 kills). Surrounding the stencil are three massive cratered 12.7mm bullet impact gouges with silvery lead splash splatter stars and cracked metal spalling. Grimy grease thumbprints, dried blood smear across the final tally mark, chipped paint flecks. Crisp high-resolution decal cutout isolated in center of frame, flat orthogonal angle. Square 1:1, 2048x2048. Exclude: perspective, angled camera, walls, floor, 3D geometry.
```

#### Reference Seamless PBR Texture Prompt Example (`meridian_conduit_deck`)
```text
Seamless tileable photorealistic PBR environmental surface texture of an industrial high-voltage electrical conduit floor deck: heavy cast iron diamond treadplates bolted over recessed cable trenches filled with braided copper grounding straps and bundles of thick black rubber power cables. Glowing cyan (#22d3ee) fiber-optic inspection channels inset into steel raceways, worn bare metal scuffs along the diamond grips, dark grease build-up in the corners, chipped industrial dark grey enamel. Perfectly seamless 2D texture, top-down orthogonal view, uniform diffuse lighting, no cast shadows, full texture fill without borders. Square 1:1, 2048x2048.
```

---

## 4. Comprehensive Review: Rooms, Grammar & Storylines

### 4.1 The 26 Procedural Room Themes (`src/roomThemes.js`)
*Hunker Bunker* constructs its levels using procedural chunk grammar. Every chunk is governed by one of 26 theme descriptors:

```
+----------------------------------------------------------------------------------------------------+
|                                    ROOM THEMES ARCHITECTURE (26)                                   |
+----------------------------------------------------------------------------------------------------+
| Industrial Bunker (10):                                                                            |
|   1. bunker-standard   2. bunker-utility   3. bunker-medical   4. bunker-security   5. bunker-workshop |
|   6. bunker-storage    7. bunker-armory   8. bunker-substation 9. bunker-cleanroom 10. bunker-toxic-sump|
|                                                                                                    |
| Cryogenic Deep Freeze (5):                                                                         |
|   11. cryo-rough      12. cryo-medical    13. cryo-engineering 14. cryo-recovery   15. cryo-permafrost |
|                                                                                                    |
| Biomechanical Hive Brood (7):                                                                      |
|   16. bio-resin       17. bio-nest        18. bio-medical     19. bio-security     20. bio-engineering  |
|   21. bio-feeding-chamber                 22. bio-mycelium                                         |
|                                                                                                    |
| Special / High-Value Sectors (4):                                                                  |
|   23. camp-fortified  24. reward-cache    25. giger-cathedral 26. giger-obsidian                       |
+----------------------------------------------------------------------------------------------------+
```

### 4.2 Room Placement Grammar & Layer Profiles
In `src/roomDressingKits.js` and `src/roomThemes.js`, dressing occurs across 5 hierarchical placement layers:
1. **`signatureProps`**: Massive, room-defining hero focal points (e.g. `substation_stepdown_transformer`, `queen_royal_brood_throne`, `tallow_vaccine_alembic`).
2. **`largeProps`**: Heavy machinery, wall partitions, and structural machines placed against perimeter bulkheads.
3. **`wallProps`**: Elevated equipment, breaker panels, sirens, and wall safes mounted at $Y = 1.3\text{m} - 1.8\text{m}$.
4. **`clutter`**: Scavengeable items, debris heaps, ammo boxes, tool racks, and organic residue on floor margins.
5. **`decals`**: Forensic floor splats, grease pools, tire tracks, and stencils that ground the props into the room.

### 4.3 Narrative Storylines & Key Lore Arcs
1. **Act 1 Survivor Camps**:
   - **Meridian Camp (Sector A-9 / Overseer Kaelen)**: Tech-scavengers obsessed with restoring the high-voltage grid and communing with the mainframe.
   - **Tallow Camp (Sector B-4 / Sister Martha)**: Pacifist hydro-cultists cultivating psychoactive lichen and distilling antitoxins along scalding geothermal steam lines.
   - **Vesper Camp (Sector C-7 / Commander Briggs)**: The Iron Guild militarized mercenary redoubt, hoarding ballistic armaments, heavy mortars, and body armor.
2. **Mayor Tina's Infiltration Arc**:
   - Mayor Tina is not human; she is a high-order alien mimic masquerading as an executive politician.
   - She secretly sheds her synthetic latex skin in secluded vents, stores human trophies, and uses vocal synthesizers to falsify council votes.
3. **Dr. Okonkwo-Vass's Xenobiology Heresy**:
   - Horizon Corporation's lead scientist discovered that the Hive does not scream in anger, but "sings" in ultrasonic harmonic frequencies.
   - His secret labs contain acoustic bell jars, dissected crawler larynxes, and hybrid blood synthesizers.
4. **Director Chen's Corporate Coverup (Sub-Level 13)**:
   - Director Chen discovered the alien brood months before the breach and secretly monetized it.
   - Executive black sites hide shredded audit ledgers, hush-money bullion cases, biometric execution safes, and VIP escape pods.
5. **The Three Alien Brood Hives**:
   - **Brood Nahl (The Suture Hive)**: Masters of biological grafting, tissue repair, amputation, and amniotic healing.
   - **Brood Vey (The Spore Hive)**: Cultivators of psychotropic mycelium, spore mortars, and corrosive acid bladders.
   - **Brood Rhun (The Carapace Hive)**: Heavily armored obsidian warriors, bone anvils, and royal caul guards.
6. **Act 2 Endings & The 4-Seat Shuttle**:
   - The final vessel has exactly 4 seats: *Pilot (Player), Cargo, Host, Brood*.
   - 5 Endings determined by player choices: **Full Brood**, **Clean Escape**, **Mixed Crew**, **Carrier's Bargain**, and **Scorched Sky**.

---

## 5. Systematic Gap Analysis

Reviewing the 619 assets against the 26 room themes and full narrative arc exposes critical missing physical items:

```
+----------------------------------------------------------------------------------------------------+
|                                    DOCUMENTED WORLD ASSET GAPS                                     |
+----------------------------------------------------------------------------------------------------+
| 1. Missing Narrative Anchor Props:                                                                 |
|    - Director Chen's Executive Suite has no executive mahogany desk, private whiskey decanter, or  |
|      shredded audit incinerator.                                                                   |
|    - Mayor Tina lacks her grotesque larval egg incubator closet and molted skin stretching frame.   |
|    - Dr. Vass has no ultrasonic specimen vivarium, vocal-sac cryo-slicer, or telepathic antenna.  |
|                                                                                                    |
| 2. Under-Represented Room Themes:                                                                  |
|    - `bunker-cleanroom`: Lacks laminar flow hoods, decontamination showers, and airlock baffles.   |
|    - `bunker-toxic-sump`: Lacks sewage lift pumps, chemical neutralizer tanks, and acid skimmers.  |
|    - `cryo-permafrost`: Lacks core-drilling ice saws, thermal heater lanterns, and frozen remains. |
|    - `giger-obsidian`: Lacks chitinous sacrificial obelisks, spinal altars, and neural cradles.    |
|                                                                                                    |
| 3. Interactive Mechanism Deficits:                                                                 |
|    - Needs physical puzzle props (patchbays, hydraulic lever banks, three-keypad consoles).        |
|    - Needs high-yield salvageable machines (break-open safes, drillable battery racks).            |
|                                                                                                    |
| 4. Structural & Texture Deficits:                                                                  |
|    - The 80 modular kit geometries (`modular-space-kit`, `modular-cave-kit`) are completely        |
|      untextured and need seamless PBR floor/wall surfaces.                                         |
|                                                                                                    |
| 5. Spatial Placement Spot Shortages:                                                               |
|    - Too many floor-level props; severe shortage of ceiling-mounted rigs, wall-mounted utilities,  |
|      and recessed floor grate mechanics.                                                           |
+----------------------------------------------------------------------------------------------------+
```

---

## 6. Interaction Architecture & Articulation Standards

To ensure every one of the 80 new props feels alive and tactile, they must integrate directly into the engine's 4-tier prop runtime:

```
                                  +-----------------------------+
                                  |   GLB NODE HIERARCHY        |
                                  |   (Authored in Blender)     |
                                  +-----------------------------+
                                                 |
         +---------------------------------------+---------------------------------------+
         |                                       |                                       |
         v                                       v                                       v
+------------------+                   +--------------------+                  +--------------------+
|  HB_BODY         |                   |  HB_DOOR / LEVER   |                  |  FX ANCHORS        |
|  Static chassis  |                   |  Articulated hinge |                  |  Light, Spores,    |
|  Baseplate mount |                   |  glTF extras       |                  |  Steam, Particles  |
+------------------+                   +--------------------+                  +--------------------+
         |                                       |                                       |
         v                                       v                                       v
src/world3dOverlay.js                  src/propArticulation.js                 src/propFx.js
- Metric bounds normalization          - Quaternion slerp hinges               - Dynamic 8-light pool
- Physical collision span              - Sliding pneumatic shafts              - Color-matched glow
- Floor/Wall offset                    - Sound FX trigger synchronization      - Directional hazards
```

### 6.1 glTF Extras Contract
In Blender, moving parts must be tagged with custom properties that survive export via `gltfpack -kn -ke`:
- `hb_motion`: `"rotate"` (revolving valves/doors), `"slide"` (pneumatic gates/drawers), `"spin"` (fans/turbines), `"pulse"` (organic sacs).
- `hb_axis`: `"x"`, `"y"`, or `"z"`.
- `hb_open_angle`: Numeric angle in radians (e.g. `1.5708` for 90° swing).
- `hb_open_offset`: Numeric distance in meters (e.g. `0.45` for drawer pull).
- `hb_sound`: Sound ID (`"vault_open"`, `"power_hum"`, `"metal_creak"`, `"flesh_squelch"`).

### 6.2 Declarative Interactions (`src/propInteractions.js`)
Every prop receives a stateful interaction hook:
```javascript
chen_executive_shredder_hopper: statefulInteraction(
    '[E] PURGE CLASSIFIED FINANCIAL ARCHIVES',
    (state) => `EXECUTIVE INCINERATOR: ${state === 'open' ? 'CLASSIFIED DATA ASH CLEARED — ENCRYPTED DRIVE SALVAGED' : 'FURNACE COLD'}.`,
    {
        nextState: (_game, prop) => nextBinaryState(prop, 'open', 'closed'),
        sound: 'furnace_blast',
        onUse: (game, prop, state) => {
            if (state === 'open') {
                game.awardLoot?.('chen_bearer_bonds', 50);
                game.spawnAshCloud?.(prop.position.x, prop.position.z);
            }
        }
    }
)
```

---

## 7. Spatial Placement Spots, Matching Materials & Decals

### 7.1 Authoring Dedicated Placement Spots
Props will no longer be placed haphazardly. Each prop is designed for a specific spatial anchor:
- **`CEILING_SUSPENDED`**: Overhead hanging gantry hoists, bio-drip pods, suspended surgical lights, cable trunks.
- **`WALL_HIGH`**: Mounted between $Y = 1.4\text{m} - 1.8\text{m}$ (sirens, breaker boxes, decontamination showers).
- **`FLOOR_RECESSED`**: Sump grates, maintenance hatches, drainage troughs, geothermal vent wells.
- **`CENTER_VIGNETTE`**: Large multi-sided workstations, dissecting slabs, altars, executive boardroom tables.
- **`CORNER_NICHE`**: Storage drums, cryogenic canisters, generator banks, sleeping nests.
- **`TABLETOP`**: Small forensic pickups, tape recorders, microscope rigs, sample jars.

---

### 7.2 The 16 New Seamless PBR Environmental Surfaces
These 16 PBR materials match the sector environments and will texture the untextured modular kits:

| # | Material ID | Sector / Room Theme | Visual Description |
|---|---|---|---|
| M01 | `pbr_cleanroom_poly_grate` | `bunker-cleanroom` | White antimicrobial polyurethane flooring with recessed stainless drainage grates |
| M02 | `pbr_toxic_corrosion_sludge` | `bunker-toxic-sump` | Corroded iron floor plates immersed in iridescent yellow sulfur acid sludge |
| M03 | `pbr_substation_highvoltage_tread` | `bunker-substation` | Rubberized insulated safety mats over perforated electrical conduit raceways |
| M04 | `pbr_chen_executive_parquet` | `bunker-security` / Exec | Scratched dark teakwood executive parquet stained with corporate audit ash |
| M05 | `pbr_permafrost_glacial_fracture`| `cryo-permafrost` | Dense blue glacial permafrost ice cracked over rusted industrial diamond plate |
| M06 | `pbr_cryo_manifold_frosting` | `cryo-engineering` | Galvanized steel decking covered in thick rime frost and frozen nitrogen spills |
| M07 | `pbr_nahl_suture_cartilage` | `bio-medical` / Nahl | Glistening pink amniotic cartilage floor interwoven with surgical wire stitching |
| M08 | `pbr_vey_mycelial_rot` | `bio-mycelium` / Vey | Spongy rotting bio-substrate covered in lime fungal spores and crawling mycelium |
| M09 | `pbr_rhun_obsidian_chitin` | `giger-obsidian` / Rhun | Mirror-black polished obsidian slabs set with interlocking razor chitin scales |
| M10 | `pbr_tina_shed_chrysalis_floor`| `bio-nest` / Tina | Sticky amber epidermal resin floor pools with shedding synthetic human latex dermis |
| M11 | `pbr_vass_acoustic_tile` | `bunker-workshop` / Vass| Sound-dampening perforated lead acoustical tiles with grease-pencil soundwave graphs|
| M12 | `pbr_geothermal_basalt_crust` | `bunker-utility` / Geo | Fractured black volcanic basalt slabs over glowing amber geothermal steam fissures |
| M13 | `pbr_hangar_tarmac_skid` | `crash` / Hangar | Heat-scorched runway tarmac scored with deep titanium gouges and jet propellant |
| M14 | `pbr_gantry_corrugated_deck` | `evac` / Gantry | Heavy industrial yellow-and-black chevron painted open steel gantry grating |
| M15 | `pbr_survivor_scrap_patchwork` | `camp-fortified` | Improvised floor welded from scavenged ammo crates, rebar grids, and scrap sheet |
| M16 | `pbr_primordial_matriarch_caul`| `queen` / Sacred Hive | Pulsing golden royal jelly substrate laced with bio-luminescent embryonic capillaries |

---

### 7.3 The 16 New Forensic Story Decals
These 16 decals ground the props with forensic narrative storytelling:

| # | Decal ID | Placement Family | Story Context & Visual Description |
|---|---|---|---|
| D01 | `decal_chen_audit_shred_fallout` | `security, executive` | Piles of confetti-shredded confidential corporate audit documents singed by fire |
| D02 | `decal_toxic_acid_skid_pool` | `utility, sump` | Foaming chartreuse acid puddle eating deep chemical pits into concrete and steel |
| D03 | `decal_high_voltage_arc_star` | `substation, electrical`| Black scorched electrical arc explosion star with melted copper droplet beads |
| D04 | `decal_tina_ovipositor_drill_scars`| `story, quarters, tina`| Serrated mechanical/organic drill gouges in floor surrounded by amber egg slime |
| D05 | `decal_vass_soundwave_grease_graph`| `medical, vass, workshop`| Frantic grease-pencil chalkboard frequency waveform annotations (40kHz to 120kHz)|
| D06 | `decal_suture_amputation_trough` | `bio, medical, nahl` | Dark arterial blood drainage track with discarded surgical staple wire fragments |
| D07 | `decal_vey_spore_eruption_burst` | `bio, mycelium, vey` | Radial lime-green fungal spore dust cloud blast radiating from a ruptured vent |
| D08 | `decal_rhun_chitin_blade_gouges` | `giger, cathedral, rhun` | Three parallel razor-sharp chitin blade slashes gouged 3cm deep into solid cast iron|
| D09 | `decal_cryo_liquid_nitrogen_burst` | `cryo, engineering` | Radial crystalline frost fracture star blooming outward from a burst relief valve |
| D10 | `decal_geothermal_sulfur_crust` | `utility, geothermal` | Bright yellow-orange crumbly sulfur mineral crust rings around a bubbling floor hole|
| D11 | `decal_cockpit_ejection_debris` | `crash, exterior` | Exploded perspex canopy shards, charred survival manual pages, scorched oxygen hose|
| D12 | `decal_evac_boarding_queue_arrows` | `hangar, gantry, evac` | Heavy scuffed yellow stencil boarding lanes: 'PILOT', 'CARGO', 'HOST', 'BROOD' |
| D13 | `decal_meridian_grounding_grid` | `meridian, electrical` | Stenciled cyan electrical grounding warning box with copper lightning bolt glyph |
| D14 | `decal_tallow_sacred_spore_circle` | `tallow, camp` | Sister Martha's chalk and dried chamomile consecrated prayer circle on the floor |
| D15 | `decal_vesper_iron_guild_credo` | `vesper, armory` | Chipped white lead paint stencil: 'HOLD THE SECTOR / SPEND THE BRASS / NO RETREAT' |
| D16 | `decal_queen_telepathic_sigil` | `queen, brood` | Complex Giger biomechanical alien glyph weeping black iridescent amniotic resin |

---

## 8. The 80 New Assets Blueprint

The 80 new interactive models are organized into **10 dedicated thematic suites of 8 assets each**. Every asset is uniquely named, has exact physical dimensions, a strict triangle budget, an authored single-accent illumination color, physical motion articulation, a designated placement spot, and a narrative quest hook.

```
+----------------------------------------------------------------------------------------------------+
|                               THE 80 NEW INTERACTIVE ASSETS MAP                                    |
+----------------------------------------------------------------------------------------------------+
| Suite 1: Corporate Sub-Level 13 & Director Chen's Executive Black Site (8 Assets)                   |
| Suite 2: High-Hazard Toxic Sump & Chemical Waste Processing (8 Assets)                              |
| Suite 3: Dr. Okonkwo-Vass's Deep Resonance & Psychic Xenobiology Lab (8 Assets)                   |
| Suite 4: Mayor Tina's Infiltration Sanctum & Mimic Metamorphosis (8 Assets)                        |
| Suite 5: The Primordial Royal Nursery & Hive Organ Metamaterials (8 Assets)                        |
| Suite 6: Cryo-Crypts, Permafrost Faults & Glacial Preservation (8 Assets)                           |
| Suite 7: Tectonic Boreholes, Geothermal Turbines & Magma Flues (8 Assets)                          |
| Suite 8: Aerospace Keel Crash Wreckage & Field Arsenal Depots (8 Assets)                            |
| Suite 9: Catwalk Gantries, Freight Elevators & Shuttle Launch Bays (8 Assets)                       |
| Suite 10: Deep-Bunker Survivor Shrines, Barter Stalls & Makeshift Relics (8 Assets)                |
+----------------------------------------------------------------------------------------------------+
```

---

### 8.1 Suite 1: Corporate Sub-Level 13 & Director Chen's Executive Black Site
*Narrative Context:* Sub-Level 13 was erased from bunker schematics. Here, Director Chen orchestrated the coverup, hid illicit bullion, audited worker expiration schedules, and monitored alien telemetry.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tris | Accent Light | Placement Spot | Articulation / Action |
|---|---|---|---|---|---|---|---|
| 01 | `chen_executive_mahogany_desk` | `chen_executive_mahogany_desk.glb` | 0.9m × 2.4m × 1.2m | 8.5k | Horizon Red (`#ef4444`) | `CENTER_VIGNETTE` | `HB_DRAWER` slides out 0.45m; reveals encrypted datapad |
| 02 | `chen_shredder_furnace_hopper` | `chen_shredder_furnace_hopper.glb` | 2.1m × 1.3m × 0.9m | 9.0k | Warning Amber (`#f59e0b`) | `WALL_HIGH` | `HB_HOPPER` swings 45°; triggers fire FX; loots bearer bonds |
| 03 | `chen_bullion_smuggling_trunk` | `chen_bullion_smuggling_trunk.glb` | 0.8m × 1.4m × 0.8m | 7.5k | Queen Gold (`#eab308`) | `CORNER_NICHE` | `HB_LID` swings open 90°; dispenses gold bullion scrap |
| 04 | `chen_whiskey_decanter_caddy` | `chen_whiskey_decanter_caddy.glb` | 0.5m × 0.6m × 0.4m | 4.5k | Warning Amber (`#f59e0b`) | `TABLETOP` | `HB_STOPPER` lifts 0.1m; gives high-morale buff consumable |
| 05 | `chen_boardroom_hologram_plinth`| `chen_boardroom_hologram_plinth.glb`| 1.4m × 1.8m × 1.8m | 9.5k | Cyan (`#22d3ee`) | `CENTER_VIGNETTE` | `HB_PROJECTOR` pulses; displays full bunker map overlay |
| 06 | `chen_holding_cell_shock_gate` | `chen_holding_cell_shock_gate.glb` | 2.6m × 1.5m × 0.4m | 9.0k | Horizon Red (`#ef4444`) | `WALL_HIGH` | `HB_GATE` slides vertically 1.8m; opens corporate prison cell |
| 07 | `chen_pneumatic_capsule_chute` | `chen_pneumatic_capsule_chute.glb` | 2.2m × 0.7m × 0.5m | 7.0k | Warning Amber (`#f59e0b`) | `WALL_HIGH` | `HB_VALVE` snaps open; retrieves pneumatic mail canister |
| 08 | `chen_executive_bodyguard_rack`| `chen_executive_bodyguard_rack.glb`| 2.2m × 1.6m × 0.6m | 8.5k | Horizon Red (`#ef4444`) | `WALL_HIGH` | `HB_ARMOR_DOOR` opens; yields elite executive heavy armor |

---

### 8.2 Suite 2: High-Hazard Toxic Sump & Chemical Waste Processing
*Narrative Context:* The lowermost sub-floors where caustic effluent from coolant plants, battery wash vats, and hive bile collect in bubbling sumps.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tris | Accent Light | Placement Spot | Articulation / Action |
|---|---|---|---|---|---|---|---|
| 09 | `sump_acid_skimmer_separator` | `sump_acid_skimmer_separator.glb` | 2.0m × 1.8m × 1.2m | 9.0k | Spore Lime (`#84cc16`) | `FLOOR_RECESSED` | `HB_SKIMMER` rotates 360°; clears toxic slime surface |
| 10 | `sump_chemical_neutralizer_vat`| `sump_chemical_neutralizer_vat.glb`| 2.5m × 2.0m × 2.0m | 9.5k | Cyan (`#22d3ee`) | `CENTER_VIGNETTE` | `HB_MIXER_VALVE` turns 180°; neutralizes room acidity |
| 11 | `sump_sewage_macerator_pump` | `sump_sewage_macerator_pump.glb` | 1.6m × 1.2m × 1.0m | 8.5k | Warning Amber (`#f59e0b`) | `FLOOR_RECESSED` | `HB_PUMP_LEVER` pulls down; drains flooded drainage trench |
| 12 | `sump_emergency_eyewash_station`| `sump_emergency_eyewash_station.glb`| 1.5m × 0.8m × 0.6m | 6.5k | Cyan (`#22d3ee`) | `WALL_HIGH` | `HB_PADDLE` depresses; restores player vision from blinding venom|
| 13 | `sump_caustic_barrel_crusher` | `sump_caustic_barrel_crusher.glb` | 2.4m × 1.4m × 1.1m | 9.0k | Warning Amber (`#f59e0b`) | `CORNER_NICHE` | `HB_RAM` compresses down 0.8m; crushes scrap into refined slugs |
| 14 | `sump_spill_barrier_bulkhead` | `sump_spill_barrier_bulkhead.glb` | 2.2m × 2.2m × 0.5m | 8.0k | Horizon Red (`#ef4444`) | `WALL_HIGH` | `HB_DAM_GATE` drops 1.2m; dams chemical wave in hallway |
| 15 | `sump_overflow_siphon_snorkel` | `sump_overflow_siphon_snorkel.glb` | 1.8m × 0.9m × 0.9m | 7.0k | Spore Lime (`#84cc16`) | `FLOOR_RECESSED` | `HB_SIPHON_ARM` swings into basin; siphons rare chemical catalyst|
| 16 | `sump_hazmat_suit_rinse_booth` | `sump_hazmat_suit_rinse_booth.glb` | 2.4m × 1.3m × 1.3m | 9.5k | Cyan (`#22d3ee`) | `CORNER_NICHE` | `HB_SHOWER_DOOR` slides; decontaminates toxic status effect |

---

### 8.3 Suite 3: Dr. Okonkwo-Vass's Deep Resonance & Psychic Xenobiology Lab
*Narrative Context:* Dr. Vass's forbidden retreat where he mapped alien telepathy, ultrasonic larynxes, and embryonic neural bridges.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tris | Accent Light | Placement Spot | Articulation / Action |
|---|---|---|---|---|---|---|---|
| 17 | `vass_ultrasonic_vivarium_dome`| `vass_ultrasonic_vivarium_dome.glb`| 2.2m × 1.6m × 1.6m | 9.5k | Brood Emerald (`#22c55e`)| `CENTER_VIGNETTE` | `HB_DOME_SHELL` iris-opens; accesses live crawler specimen |
| 18 | `vass_telepathic_tuning_spire` | `vass_telepathic_tuning_spire.glb` | 2.8m × 0.8m × 0.8m | 8.5k | Queen Gold (`#eab308`) | `CORNER_NICHE` | `HB_TUNING_ROD` vibrates; decodes Queen's secret message |
| 19 | `vass_cryo_vocal_slicer_microtome`|`vass_cryo_vocal_slicer_microtome.glb`| 1.3m × 1.1m × 0.8m | 8.0k | Cyan (`#22d3ee`) | `TABLETOP` | `HB_BLADE_ARM` slides 0.2m; extracts acoustic tissue sample |
| 20 | `vass_oscilloscope_tape_console`|`vass_oscilloscope_tape_console.glb`| 1.7m × 1.4m × 0.8m | 8.5k | Brood Emerald (`#22c55e`)| `WALL_HIGH` | `HB_REEL` spins; plays Dr. Vass's final chilling confession tape |
| 21 | `vass_brainwave_entrainment_crib`|`vass_brainwave_entrainment_crib.glb`| 1.4m × 2.0m × 1.0m | 9.0k | Cyan (`#22d3ee`) | `CENTER_VIGNETTE` | `HB_VISOR` pivots down; upgrades player psychic radar |
| 22 | `vass_bioluminescent_centrifuge`| `vass_bioluminescent_centrifuge.glb`| 1.6m × 1.0m × 1.0m | 8.5k | Spore Lime (`#84cc16`) | `TABLETOP` | `HB_CENTRIFUGE_LID` pops up; refines pure hive serum |
| 23 | `vass_dissection_fluid_gutter` | `vass_dissection_fluid_gutter.glb` | 1.1m × 2.4m × 1.0m | 8.0k | Brood Emerald (`#22c55e`)| `CENTER_VIGNETTE` | `HB_DRAIN_VALVE` releases fluid; reveals swallowed access keycard|
| 24 | `vass_telemetric_specimen_locker`|`vass_telemetric_specimen_locker.glb`| 2.1m × 1.2m × 0.7m | 8.5k | Horizon Red (`#ef4444`) | `WALL_HIGH` | `HB_LOCKER_DOOR` swings; reveals neural override chip |

---

### 8.4 Suite 4: Mayor Tina's Infiltration Sanctum & Mimic Metamorphosis
*Narrative Context:* Mayor Tina's hidden inner sanctum beneath the council quarters. Behind executive wood panels lies the breeding chamber of an apex alien mimic.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tris | Accent Light | Placement Spot | Articulation / Action |
|---|---|---|---|---|---|---|---|
| 25 | `tina_latex_skin_stretching_rack`|`tina_latex_skin_stretching_rack.glb`| 2.2m × 1.4m × 0.6m | 8.5k | Spore Lime (`#84cc16`) | `WALL_HIGH` | `HB_STRETCH_FRAME` unlatches; reveals shed mayor face disguise |
| 26 | `tina_larval_incubation_wardrobe`|`tina_larval_incubation_wardrobe.glb`| 2.3m × 1.5m × 0.8m | 9.0k | Queen Gold (`#eab308`) | `CORNER_NICHE` | `HB_WARDROBE_DOORS` fold open; reveals warm egg cluster |
| 27 | `tina_vocal_mimic_tuning_organ` |`tina_vocal_mimic_tuning_organ.glb` | 1.8m × 1.3m × 0.9m | 9.0k | Warning Amber (`#f59e0b`) | `CENTER_VIGNETTE` | `HB_BELLOWS` pumps; synthesizes Overseer Kaelen's voice override |
| 28 | `tina_human_teeth_reliquary_urn`|`tina_human_teeth_reliquary_urn.glb`| 1.2m × 0.7m × 0.7m | 7.0k | Spore Lime (`#84cc16`) | `TABLETOP` | `HB_URN_LID` rotates open; spills collected teeth & identity chips|
| 29 | `tina_pheromone_diffuser_flue` |`tina_pheromone_diffuser_flue.glb` | 2.5m × 0.9m × 0.9m | 8.0k | Brood Emerald (`#22c55e`)| `CEILING_SUSPENDED`| `HB_FLUE_BAFFLE` opens; releases calming pheromone mist |
| 30 | `tina_council_ballot_forgery_desk`|`tina_council_ballot_forgery_desk.glb`| 1.1m × 1.6m × 0.9m | 8.0k | Horizon Red (`#ef4444`) | `CENTER_VIGNETTE` | `HB_STAMP_ARM` depresses; stamps falsified council vote manifest |
| 31 | `tina_ovipositor_birthing_alcove`|`tina_ovipositor_birthing_alcove.glb`| 2.0m × 1.8m × 1.5m | 9.5k | Queen Gold (`#eab308`) | `FLOOR_RECESSED` | `HB_CHITIN_PETALS` unfurl; yields primordial bio-grenade |
| 32 | `tina_secret_vent_airlock_hatch` |`tina_secret_vent_airlock_hatch.glb` | 1.4m × 1.4m × 0.4m | 8.0k | Horizon Red (`#ef4444`) | `WALL_HIGH` | `HB_AIRLOCK_WHEEL` spins; unlocks shortcut back to surface camp |

---

### 8.5 Suite 5: The Primordial Royal Nursery & Hive Organ Metamaterials
*Narrative Context:* The deep cathedral heart where the Queen's royal offspring gestate inside biomechanical amniotic chambers.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tris | Accent Light | Placement Spot | Articulation / Action |
|---|---|---|---|---|---|---|---|
| 33 | `royal_gestation_stasis_caul` | `royal_gestation_stasis_caul.glb` | 2.6m × 1.6m × 1.6m | 9.5k | Queen Gold (`#eab308`) | `CENTER_VIGNETTE` | `HB_CAUL_MEMBRANE` pulses/tears; releases dormant royal larva |
| 34 | `royal_jelly_extractor_press` | `royal_jelly_extractor_press.glb` | 2.0m × 1.3m × 1.1m | 9.0k | Queen Gold (`#eab308`) | `CENTER_VIGNETTE` | `HB_PRESS_LEVER` cranks down; collects royal jelly super-stim |
| 35 | `hive_neural_synapse_pillar` | `hive_neural_synapse_pillar.glb` | 3.2m × 1.2m × 1.2m | 9.0k | Brood Emerald (`#22c55e`)| `CEILING_SUSPENDED`| `HB_SYNAPSE_CORE` pulses; disables hive psychic scream hazard |
| 36 | `hive_chitin_forge_crucible` | `hive_chitin_forge_crucible.glb` | 1.8m × 1.4m × 1.4m | 8.5k | Warning Amber (`#f59e0b`) | `FLOOR_RECESSED` | `HB_CRUCIBLE_LID` pivots open; forges organic chitin armor plating|
| 37 | `hive_ovary_digestive_sluice` | `hive_ovary_digestive_sluice.glb` | 1.5m × 2.2m × 1.2m | 9.0k | Spore Lime (`#84cc16`) | `FLOOR_RECESSED` | `HB_SLUICE_SPHINCTER` expands; flushes acid sludge trap |
| 38 | `hive_bio_luminescent_spore_mast`|`hive_bio_luminescent_spore_mast.glb`| 2.8m × 1.0m × 1.0m | 8.5k | Brood Emerald (`#22c55e`)| `CORNER_NICHE` | `HB_SPORE_POD` pops; disperses bioluminescent illumination field|
| 39 | `hive_matriarch_communion_podium`|`hive_matriarch_communion_podium.glb`| 1.6m × 1.2m × 1.0m | 9.0k | Queen Gold (`#eab308`) | `CENTER_VIGNETTE` | `HB_HAND_IMPRINT` accepts flesh; unlocks Act 2 Queen alliance path|
| 40 | `hive_tendril_cable_junction` | `hive_tendril_cable_junction.glb` | 2.4m × 1.5m × 0.8m | 8.0k | Cyan (`#22d3ee`) | `WALL_HIGH` | `HB_TENDON_CLUTCH` disconnects; cuts alien parasite from power line|

---

### 8.6 Suite 6: Cryo-Crypts, Permafrost Faults & Glacial Preservation
*Narrative Context:* Sub-zero morgues and cryogenic freezers where the bodies of the original 2020 colonizers and dead corporate executives lie preserved in permafrost.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tris | Accent Light | Placement Spot | Articulation / Action |
|---|---|---|---|---|---|---|---|
| 41 | `cryo_morgue_drawer_stack` | `cryo_morgue_drawer_stack.glb` | 2.2m × 1.8m × 2.0m | 9.5k | Cyan (`#22d3ee`) | `WALL_HIGH` | `HB_DRAWER_03` rolls out 1.6m; inspects frozen chief medical officer|
| 42 | `cryo_ice_core_sampling_drill` | `cryo_ice_core_sampling_drill.glb` | 2.4m × 1.2m × 1.0m | 9.0k | Warning Amber (`#f59e0b`) | `CENTER_VIGNETTE` | `HB_DRILL_SPINDLE` lowers; cores ice sample with pre-impact virus|
| 43 | `cryo_nitrogen_dewar_cart` | `cryo_nitrogen_dewar_cart.glb` | 1.4m × 1.1m × 0.8m | 7.5k | Cyan (`#22d3ee`) | `CORNER_NICHE` | `HB_VALVE_TAP` opens; dispenses liquid nitrogen cryo-grenades |
| 44 | `cryo_thawing_immersion_tank` | `cryo_thawing_immersion_tank.glb` | 1.6m × 2.2m × 1.2m | 9.0k | Warning Amber (`#f59e0b`) | `CENTER_VIGNETTE` | `HB_GANTRY_HOIST` lowers frozen survivor into warm brine |
| 45 | `cryo_permafrost_wall_fracture`| `cryo_permafrost_wall_fracture.glb`| 2.8m × 2.0m × 0.8m | 8.5k | Cyan (`#22d3ee`) | `WALL_HIGH` | `HB_ICE_CHUNKS` break open; uncovers hidden passage to deep cave |
| 46 | `cryo_hibernation_control_plinth`|`cryo_hibernation_control_plinth.glb`| 1.5m × 1.0m × 0.8m | 8.0k | Cyan (`#22d3ee`) | `CENTER_VIGNETTE` | `HB_CONSOLE_KEYS` depress; reboots life support in Sector Cryo-3 |
| 47 | `cryo_specimen_nitrogen_chest` | `cryo_specimen_nitrogen_chest.glb` | 1.0m × 1.5m × 0.9m | 7.5k | Cyan (`#22d3ee`) | `FLOOR_RECESSED` | `HB_CHEST_LID` swings open 95°; loots undamaged cybernetic organs|
| 48 | `cryo_frostbite_triage_chair` | `cryo_frostbite_triage_chair.glb` | 1.6m × 1.0m × 1.1m | 8.0k | Horizon Red (`#ef4444`) | `CENTER_VIGNETTE` | `HB_HEAT_SHROUD` folds down; cures hypothermia & frostbite status|

---

### 8.7 Suite 7: Tectonic Boreholes, Geothermal Turbines & Magma Flues
*Narrative Context:* The roaring, shaking deep bedrock level where massive geothermal turbines generate the bunker's emergency heat amidst boiling mineral flues.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tris | Accent Light | Placement Spot | Articulation / Action |
|---|---|---|---|---|---|---|---|
| 49 | `geo_steam_turbine_impeller` | `geo_steam_turbine_impeller.glb` | 2.5m × 2.2m × 1.8m | 9.5k | Warning Amber (`#f59e0b`) | `CENTER_VIGNETTE` | `HB_TURBINE_ROTOR` spins; redirects generator current to elevators|
| 50 | `geo_sulfur_condenser_tower` | `geo_sulfur_condenser_tower.glb` | 3.0m × 1.2m × 1.2m | 9.0k | Spore Lime (`#84cc16`) | `CORNER_NICHE` | `HB_COLLECTION_TAP` levers; gathers high-explosive sulfur powder |
| 51 | `geo_seismic_bore_collar` | `geo_seismic_bore_collar.glb` | 1.8m × 2.0m × 2.0m | 9.0k | Warning Amber (`#f59e0b`) | `FLOOR_RECESSED` | `HB_BORE_CLAMP` locks down; arrests seismic tremors in the room |
| 52 | `geo_magma_flue_inspection_port`|`geo_magma_flue_inspection_port.glb`| 1.8m × 1.2m × 0.8m | 8.0k | Warning Amber (`#f59e0b`) | `WALL_HIGH` | `HB_BLAST_SLIDER` slides open; reveals glowing lava observation port|
| 53 | `geo_mud_pot_geyser_vent` | `geo_mud_pot_geyser_vent.glb` | 1.2m × 1.6m × 1.6m | 8.0k | Spore Lime (`#84cc16`) | `FLOOR_RECESSED` | `HB_CAP_LID` bolts shut; seals boiling sulfuric steam hazard |
| 54 | `geo_heavy_pipe_expansion_joint`|`geo_heavy_pipe_expansion_joint.glb`| 2.4m × 1.4m × 1.0m | 8.5k | Warning Amber (`#f59e0b`) | `WALL_HIGH` | `HB_JACK_SCREW` turns; relieves pipe structural tension stress |
| 55 | `geo_thermal_battery_charging_bay`|`geo_thermal_battery_charging_bay.glb`| 2.0m × 1.5m × 0.8m | 8.5k | Warning Amber (`#f59e0b`) | `WALL_HIGH` | `HB_CELL_LOCKER` slides out; charges energy weapon power cells |
| 56 | `geo_core_temperature_telemeter`|`geo_core_temperature_telemeter.glb`| 1.9m × 0.8m × 0.6m | 7.0k | Horizon Red (`#ef4444`) | `WALL_HIGH` | `HB_GRAPH_DRUM` resets; overrides reactor meltdown timer |

---

### 8.8 Suite 8: Aerospace Keel Crash Wreckage & Field Arsenal Depots
*Narrative Context:* The icy surface trenches and breach caverns where orbital transport shuttles crashed, scattering armored cockpits, ammunition lockers, and heavy drop ordnance.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tris | Accent Light | Placement Spot | Articulation / Action |
|---|---|---|---|---|---|---|---|
| 57 | `crash_shuttle_cockpit_canopy` | `crash_shuttle_cockpit_canopy.glb` | 2.2m × 2.6m × 2.0m | 9.5k | Cyan (`#22d3ee`) | `CENTER_VIGNETTE` | `HB_CANOPY_FRAME` pivots up; recovers flight recorder black box |
| 58 | `crash_jet_turbofan_nacelle` | `crash_jet_turbofan_nacelle.glb` | 2.4m × 2.0m × 2.4m | 9.5k | Warning Amber (`#f59e0b`) | `CENTER_VIGNETTE` | `HB_FAN_BLADES` rotate; salvages high-grade titanium turbine blades|
| 59 | `crash_avionics_black_box_crypt`|`crash_avionics_black_box_crypt.glb`| 1.1m × 0.8m × 0.8m | 7.5k | Horizon Red (`#ef4444`) | `CORNER_NICHE` | `HB_RECORDER_LID` unlatches; reveals telemetry tape on crash sabotage|
| 60 | `crash_fuel_jettison_manifold` | `crash_fuel_jettison_manifold.glb` | 1.8m × 1.4m × 1.0m | 8.5k | Warning Amber (`#f59e0b`) | `WALL_HIGH` | `HB_DUMP_LEVER` pulls down; dumps jet fuel, creating fire barrier |
| 61 | `crash_ejection_seat_survival_kit`|`crash_ejection_seat_survival_kit.glb`| 1.4m × 0.9m × 0.9m | 8.0k | Horizon Red (`#ef4444`) | `CENTER_VIGNETTE` | `HB_SURVIVAL_PACK` unzips; yields emergency flare gun & rations |
| 62 | `crash_heavy_ordnance_pallet` | `crash_heavy_ordnance_pallet.glb` | 1.2m × 1.8m × 1.4m | 8.5k | Warning Amber (`#f59e0b`) | `FLOOR_RECESSED` | `HB_STRAP_LATCH` unhooks; loots heavy armor-piercing rocket ammo |
| 63 | `crash_tactical_flare_mortar` | `crash_tactical_flare_mortar.glb` | 1.5m × 0.8m × 0.8m | 7.0k | Warning Amber (`#f59e0b`) | `CORNER_NICHE` | `HB_BREECH` opens; launches high-intensity room illuminator flare |
| 64 | `crash_fuselage_keel_beam_cutter`|`crash_fuselage_keel_beam_cutter.glb`| 2.0m × 1.5m × 1.0m | 8.5k | Cyan (`#22d3ee`) | `CENTER_VIGNETTE` | `HB_TORCH_ARM` swings; cuts through collapsed structural titanium|

---

### 8.9 Suite 9: Catwalk Gantries, Freight Elevators & Shuttle Launch Bays
*Narrative Context:* The colossal launch bays, crane gantries, and industrial elevators in the Gantry sector where the final escape shuttle awaits launch.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tris | Accent Light | Placement Spot | Articulation / Action |
|---|---|---|---|---|---|---|---|
| 65 | `gantry_crane_winch_drum` | `gantry_crane_winch_drum.glb` | 2.4m × 1.8m × 1.5m | 9.0k | Warning Amber (`#f59e0b`) | `CEILING_SUSPENDED`| `HB_CABLE_DRUM` rotates; lowers heavy shipping container bridge |
| 66 | `gantry_fuel_loading_boom_arm` | `gantry_fuel_loading_boom_arm.glb` | 3.2m × 1.4m × 1.0m | 9.5k | Warning Amber (`#f59e0b`) | `WALL_HIGH` | `HB_BOOM_ARM` swings 90°; couples hypergolic fuel line to shuttle |
| 67 | `gantry_launch_sequencer_desk` | `gantry_launch_sequencer_desk.glb` | 1.6m × 1.8m × 1.0m | 8.5k | Cyan (`#22d3ee`) | `CENTER_VIGNETTE` | `HB_ABORT_SWITCH` toggles; initiates 60-second shuttle launch countdown|
| 68 | `gantry_exhaust_flame_trench_gate`|`gantry_exhaust_flame_trench_gate.glb`| 2.8m × 2.4m × 0.6m| 9.0k | Horizon Red (`#ef4444`) | `FLOOR_RECESSED` | `HB_BLAST_DEFLECTOR` angles 45°; redirects rocket plume hazard |
| 69 | `gantry_four_seat_cockpit_ladder`|`gantry_four_seat_cockpit_ladder.glb`| 3.2m × 1.2m × 1.0m | 8.0k | Warning Amber (`#f59e0b`) | `WALL_HIGH` | `HB_LADDER_EXTENSION` slides down 1.5m; allows boarding the escape craft|
| 70 | `gantry_freight_elevator_gate` | `gantry_freight_elevator_gate.glb` | 2.6m × 2.0m × 0.4m | 8.5k | Warning Amber (`#f59e0b`) | `WALL_HIGH` | `HB_ACCORDION_GATE` slides open; calls massive cargo lift platform|
| 71 | `gantry_umbilical_cryo_coupler`| `gantry_umbilical_cryo_coupler.glb`| 2.2m × 1.2m × 1.2m | 8.5k | Cyan (`#22d3ee`) | `WALL_HIGH` | `HB_JAW_COLLAR` unclamps; disconnects freezing LOX umbilical line |
| 72 | `gantry_radar_tracking_parabola`|`gantry_radar_tracking_parabola.glb`| 2.8m × 2.0m × 1.8m | 9.0k | Cyan (`#22d3ee`) | `CEILING_SUSPENDED`| `HB_DISH` rotates 360°; scans orbital mothership approach trajectory |

---

### 8.10 Suite 10: Deep-Bunker Survivor Shrines, Barter Stalls & Makeshift Relics
*Narrative Context:* Desperate survival landmarks built by indentured laborers: shrines to lost family, makeshift barter stalls, and battery recharging altars.

| # | Asset ID | glTF File | Dimensions (H×W×D) | Tris | Accent Light | Placement Spot | Articulation / Action |
|---|---|---|---|---|---|---|---|
| 73 | `camp_makeshift_barter_stall` | `camp_makeshift_barter_stall.glb` | 1.8m × 2.2m × 1.2m | 9.0k | Warning Amber (`#f59e0b`) | `CENTER_VIGNETTE` | `HB_SCALE_PAN` tilts; barters scrap shells for high-tier ammunition|
| 74 | `camp_rebar_relic_memorial_wall`|`camp_rebar_relic_memorial_wall.glb`| 2.4m × 2.0m × 0.5m | 8.5k | Warning Amber (`#f59e0b`) | `WALL_HIGH` | `HB_MEMORIAL_PLAQUE` lifts; uncovers hidden stash of survivor dogtags|
| 75 | `camp_soup_kettle_cookfire` | `camp_soup_kettle_cookfire.glb` | 1.2m × 1.2m × 1.2m | 8.0k | Warning Amber (`#f59e0b`) | `CENTER_VIGNETTE` | `HB_KETTLE_LID` lifts; serves hot nutrient stew (+50 max HP buff) |
| 76 | `camp_battery_rejuvenator_bench`|`camp_battery_rejuvenator_bench.glb`| 1.4m × 1.6m × 0.9m | 8.5k | Cyan (`#22d3ee`) | `CENTER_VIGNETTE` | `HB_CRANK_HANDLE` rotates; manual dyno charges empty suit battery |
| 77 | `camp_bunk_privacy_screen_curtain`|`camp_bunk_privacy_screen_curtain.glb`| 2.0m × 1.6m × 0.4m| 7.0k | Warning Amber (`#f59e0b`) | `CORNER_NICHE` | `HB_CURTAIN_RING` slides 1.2m; reveals sleeping deserter contractor|
| 78 | `camp_field_water_filtration_still`|`camp_field_water_filtration_still.glb`| 1.8m × 1.0m × 0.8m| 8.0k | Cyan (`#22d3ee`) | `CORNER_NICHE` | `HB_FILTER_CARTRIDGE` pulls out; extracts clean drinking water dose|
| 79 | `camp_clandestine_shortwave_radio`|`camp_clandestine_shortwave_radio.glb`| 1.3m × 0.9m × 0.7m| 7.5k | Cyan (`#22d3ee`) | `TABLETOP` | `HB_DIAL_TUNER` turns; tunes in to survivor distress broadcast |
| 80 | `camp_scrap_armor_welding_jig` | `camp_scrap_armor_welding_jig.glb` | 1.7m × 1.5m × 1.0m | 9.0k | Warning Amber (`#f59e0b`) | `CENTER_VIGNETTE` | `HB_CLAMP_JAW` releases; finishes welding reinforced chest plate |

---

## 9. Verification & Phase 2 Next Steps

1. **Prompt Manifest Generated (Complete)**:
   - Full 112-row prompt manifest generated in [interactive-world-expansion-80-glbs-prompts-2026-10-15.tsv](./interactive-world-expansion-80-glbs-prompts-2026-10-15.tsv):
     - **Rows 1–80**: 80 Interactive 3D Prop prompts in complete photorealistic H.R. Giger / Corporate Industrial style with neutral 50% grey studio backgrounds (`#808080`) and single accent illumination.
     - **Rows 81–96**: 16 Seamless PBR surface texture prompts across cleanrooms, sumps, substations, executive suites, permafrost, and alien hive bedrocks.
     - **Rows 97–112**: 16 Forensic narrative decal stencil prompts across corporate audit shredding, acid burns, electrical arcs, and ovipositor drill scars.
2. **Batch Generation Execution**:
   - Trigger generation pipelines across image generation models (Imagen 3 / Nano Banana) and 3D photogrammetric pipelines (Tripo3D / Rodin).
3. **Blender Ingestion & Optimization Scripting**:
   - Write `scripts/blender/ingest_expansion_80_glbs.py` to auto-orient bottom-center pivot origins, verify `HB_*` node hierarchies, recalculate normals, and pack with `gltfpack -c -kn -km -ke -noq`.
4. **Engine Registration**:
   - Wire all 80 models into `src/world3dOverlay.js`, `src/propInteractions.js`, `src/propFx.js`, `src/propExperience.js`, and `src/roomDressingKits.js`.
   - Update triangle registries in `src/data/dressingTriangles.js`.
   - Run full unit/integration test suites to verify 100% test coverage and zero runtime regressions.
