# Interactive Props, Rigged Biomech Tentacle & Multi-Variant Prop Audit Master Plan
**"Help, Hurt, Give, Take" Interaction Mechanics, Squid-Arm Umbilical Cable Rigging & Procedural Variant Arrays**

**Date:** 2026-10-04  
**Author:** Antigravity AI Engineering & Combat Architecture  
**Target:** 20 New 3D Props, Environmental Room Hazards, Rigged Skeletal Mesh, Prop Variant System  
**Branch:** `dev/sprint-49`  
**Related Documents:**
- [Giger-Corpospace Biomech Environmental Spaces & Textures Plan](nordic-cathedral-biomech-environmental-spaces-and-textures-plan.md)
- [Authored Room Builds Catalog](../../src/data/roomBuilds.js)
- [3D Overlay Runtime](../../src/world3dOverlay.js)
- [Enemy 3D Overlay](../../src/enemy3dOverlay.js)

---

## 1. Executive Summary & Architecture Overview

The user provided 20 high-fidelity 3D assets in `public/3dprops/` and requested three major gameplay and pipeline features:
1. **Interactive / Reactive Prop Behaviors ("Help, Hurt, Give, Take"):**
   Every prop is not merely static scenery; it participates in combat and survival. When shot, damaged, or interacted with via [E], props trigger unique physical, tactical, and survival effects (e.g., breaking O2 bottles refills player oxygen and unleashes a frost knockback; ruptured pipe organs emit scalding steam cones; coolant drums explode into freeze zones; terminal lecterns grant sector telemetry; saint reliquaries yield high-tier cybernetics at the risk of triggering cathedral wardens).
2. **Rigged Squid-Arm Umbilical Cable (`prop_biomech_spore_umbilical_cable`):**
   The static umbilical cable mesh will be rigged with a multi-bone sequential spine armature in Blender, exported with skeleton/skinning weights, and wired to a room-centric dynamic AI attacker that sways, tracks the player, reaches out, and lashes with whip/constriction strikes.
3. **Comprehensive Audit of All 3D Items & Multi-Variant Arrays:**
   Across the repository's 342 GLBs, multiple versions and variations exist (intact vs. broken specimen tanks, 4 buttress variations, 4 archway variations, 3 breached wall stages). We establish a semantic `PROP_VARIANT_GROUPS` registry so procedural room decorators can roll from variant arrays, creating dynamic visual diversity instead of placing identical cloned meshes.

```
       PROP INTERACTION & GAMEPLAY FLOW
 ┌─────────────────────────────────────────────────────────┐
 │               PLAYER / ENEMY ACTION                     │
 │          [Damage Event]  OR  [Interact Key E]           │
 └───────────────────────────┬─────────────────────────────┘
                             │
                             ▼
 ┌─────────────────────────────────────────────────────────┐
 │                   PROP BEHAVIOR HOOK                    │
 │  • HELP: Refill O2 • Shield Recharge • Cleanse Infest   │
 │  • HURT: Scalding Steam • Cryo Slip • EMP Arc Shock     │
 │  • GIVE: Scrap Drop • Blueprint • Sector Map Reveal     │
 │  • TAKE: Deposit Scrap for Buff • Sacrifice HP • Alert  │
 └───────────────────────────┬─────────────────────────────┘
                             │
                             ▼
 ┌─────────────────────────────────────────────────────────┐
 │              FEEDBACK & WORLD TRANSFORMATION            │
 │  • Particle Burst • Emissive Strobe • Decal Placement   │
 │  • Audio Stinger • Dynamic Light Shift • Mesh Swap      │
 └─────────────────────────────────────────────────────────┘
```

---

## 2. The Twenty Interactive Props: "Help, Hurt, Give, Take" Specification

Each of the 20 props has defined HP, collision bounds, break effects, interact actions, and tactical consequences:

### 01. `prop_oxygen_bottle_cascade_rack`
- **Category:** Life Support / High-Pressure Gas
- **HP / Collision:** 35 HP | Solid 1.8m × 0.6m footprint (medium cover).
- **On Destruction (Rupture):**
  - **HELP & HURT:** Pressurized gas violently vents in an expanding 5m cryo-frost shockwave.
  - **Player Effect:** Instantly restores **+35% Oxygen** to the player's life-support tank.
  - **Enemy Effect:** Deals 45 cryo damage and knocks back swarming crawlers/stalkers by 3.5m, applying a 4-second 50% freeze slow.
- **On Interaction [E] (Manual Bleed):**
  - Player manually bleeds the manifold valve for a controlled **+15% O2** refill without destroying the rack or generating noise.
- **Archetype Role:** Vital life-saver in deep suffocating sectors.

### 02. `prop_coolant_drum_leaking_pool`
- **Category:** Cryogenic Industrial Chemical
- **HP / Collision:** 25 HP | Solid 1.6m × 1.6m cylinder.
- **On Destruction (Flash Freeze):**
  - **HURT & HELP:** The punctured drum explodes into an intense sub-zero chemical burst (4m radius).
  - Deals 60 cryo damage and completely freezes all enemies caught inside for 2.5 seconds (shatterable with kinetic weapons).
  - Leaves behind an ultra-slick cyan frost puddle on the floor: entities crossing it have 80% reduced friction (skidding) and take minor cold damage over time.
- **On Interaction [E]:**
  - Siphon 1× *Cryo-Chemical Flask* (crafting ingredient for frost ammunition) at the cost of taking 10 frost damage.

### 03. `prop_liturgical_terminal_lectern`
- **Category:** Sacred Corporate Interface
- **HP / Collision:** 40 HP | Solid 1.0m × 0.8m plinth.
- **On Destruction (Short Circuit):**
  - **HURT:** Screen shatters with an electrical EMP arc discharge, blinding and disabling robotic enemies/turrets in a 6m radius for 5 seconds. Destroys the lore data permanently.
- **On Interaction [E] (Liturgical Access):**
  - **GIVE:** Decrypts executive scripture, downloading sector telemetry (reveals all hidden caches and boss doors on the minimap) or granting a 60-second *"Targeting Scripture"* buff (+15% Critical Hit Chance).

### 04. `prop_votive_candle_shrine`
- **Category:** Devotional Reliquary
- **HP / Collision:** 20 HP | Walk-around low cover (1.4m × 1.2m).
- **On Destruction:**
  - **TAKE & HURT:** Shatters the obsidian plinth and extinguishes the amber votive flames, plunging the immediate area into pitch darkness and increasing local enemy aggression. Drops 1× *Blessed Relic Fragment*.
- **On Interaction [E] (Sacramental Offering):**
  - **TAKE -> GIVE:** Player deposits 25 Scrap as an offering to the Machine God. In return, the shrine pulses with bright amber light, granting *"Corporate Zeal"* (+20% sprint speed and +25% weapon reload speed for 90 seconds).

### 05. `prop_corporate_saint_reliquary`
- **Category:** Major Sarcophagus Vault
- **HP / Collision:** 120 HP (Heavy Armored) | Solid 2.8m × 1.4m centerpiece.
- **On Destruction (Desecration):**
  - **HURT & GIVE:** Shattering the leaded glass viewport releases the mummified director's bio-containment seal. Drops 1× High-Tier Cosmetic/Mod Blueprint and 50 Scrap.
  - **Consequence:** Triggers sector-wide security klaxons, immediately spawning 2 Elite Corrupted Wardens.
- **On Interaction [E] (Biometric Decryption):**
  - Requires a Keycard or high Intellect skill check. Successfully unlocking the sarcophagus grants the relic rewards without sounding the alarm or spawning guardians.

### 06. `prop_pipe_organ_heat_exchanger`
- **Category:** Steam / Pneumatic Infrastructure
- **HP / Collision:** 80 HP | Solid 2.2m × 1.2m wall plinth.
- **On Destruction (Steam Rupture):**
  - **HURT (Zone Denial):** High-pressure pipes blow out, projecting a continuous 5-meter cone of scalding 300°C steam for 8 seconds.
  - Deals 25 burn damage per second to any player or enemy passing through the plume, completely blocking line of sight and extinguishing laser weapon beams.
- **On Interaction [E] (Pressure Bypass):**
  - Turning the brass pressure wheel safely vents sub-deck pressure, disarming steam jet traps in adjacent corridors.

### 07. `prop_floor_conduit_bridge`
- **Category:** Electrical Power Distribution
- **HP / Collision:** 50 HP | Low ramp (walkable, 0.2m height).
- **On Destruction (Arc Flash):**
  - **HURT (Trap):** Strips the cable insulation and floods the floor with high-voltage electricity for 6 seconds. Any enemy walking across the ramp is stunned and electrocuted (50 shock damage).
- **On Interaction [E] (Power Reroute):**
  - Restores power to an unpowered blast door or security terminal in the current room.

### 08. `prop_decon_eyewash_shower_station`
- **Category:** Medical / Biohazard Remediation
- **HP / Collision:** 30 HP | Wall-mounted.
- **On Destruction:**
  - Water line snaps, spraying high-pressure water that washes away toxic acid puddles on the ground.
- **On Interaction [E] (Decontamination Purge):**
  - **HELP:** Player pulls the brass chain and stands under the shower for 3 seconds. Purges **50% of current Spore Infection load** (`infectionLoad`), removes toxic/poison debuffs, and cleanses the HUD visor.

### 09. `prop_exosuit_docking_gantry`
- **Category:** Heavy Armor Servicing
- **HP / Collision:** 90 HP | Walk-in vertical frame (1.8m × 1.2m).
- **On Destruction:**
  - Heavy overhead pneumatic arms collapse downward, dealing 200 crushing damage to any entity caught underneath.
- **On Interaction [E] (Fast-Charge Dock):**
  - **HELP:** Operator docks into the gantry for 4 seconds: rapidly overcharges armor shields to 150% and repairs broken armor plating. Can be used once per sector.

### 10. `prop_maintenance_tool_cart`
- **Category:** Mobile Scavenging Clutter
- **HP / Collision:** 20 HP | Destructible low cover (1.2m × 0.7m).
- **On Destruction:**
  - **GIVE:** Cart shatters and tools scatter; guaranteed drop of 15–25 Weapon Scrap and 1× Primary Ammo Pack.
- **On Interaction [E] (Search Tool Drawers):**
  - Player carefully loots the cart without breaking it, obtaining 1× Field Repair Kit or 1× Grenade.

### 11. `prop_autopsy_dissection_slab`
- **Category:** Xenobiology / Dark Horror
- **HP / Collision:** 100 HP | Solid 2.6m × 1.2m granite-chitin slab.
- **On Destruction:**
  - Splatters viscous alien bio-sludge in a 3m radius, coating floor in sticky fluid that slows all entities by 40%.
- **On Interaction [E] (Tissue Biopsy):**
  - **GIVE & TAKE:** Player biopsies the alien corpse on the slab: extracts 1× *Neural Chitin Sample* (used to craft bio-mods), but releases a spore puff that increases player infection by +5%.

### 12. `prop_exhaust_blower_fan_hood`
- **Category:** Ventilation & Air Handling
- **HP / Collision:** 60 HP | Upper wall mounted (2.0m).
- **On Destruction:**
  - Fan motor seizes with explosive sparks; exhaust stops, causing dense smoke to settle and reducing room visibility to 6 meters.
- **On Interaction [E] (Overdrive Vent):**
  - **HELP:** Reverses fan direction to high-velocity exhaust, clearing all toxic gas and spore clouds from the room within 3 seconds.

### 13. `prop_overhead_cage_fluorescent`
- **Category:** Practical Lighting
- **HP / Collision:** 15 HP | Ceiling fixture.
- **On Destruction:**
  - **HURT & TACTICAL:** Shooting the fixture shatters the glass tube; sparks shower down (dealing 15 shock damage to targets below). The room's amber light cone permanently turns off, plunging the local area into deep tactical darkness.

### 14. `prop_floor_drainage_sump_trough`
- **Category:** Floor Drainage
- **HP / Collision:** 40 HP | Recessed floor trench.
- **On Destruction:**
  - Heavy weapons collapse the rusted iron grating; creates an open trench hole that traps small crawler swarms, removing them from combat.
- **On Interaction [E]:**
  - Fish through the sludge to retrieve spent casing brass or 10 Scrap.

### 15. `prop_biomech_sphincter_hatch_vent`
- **Category:** Living Biological Hazard
- **HP / Collision:** 45 HP | Wall mounted.
- **Passive Hazard:** Periodically breathes and exhales a puff of toxic spore mist every 12 seconds.
- **On Destruction:**
  - Shooting with fire/plasma cauterizes the vent shut permanently. Shooting with kinetic ammo causes it to spasm and vomit an acidic spray (35 corrosive damage).
- **On Interaction [E]:**
  - Apply Bio-Foam Sealant to quietly plug the vent, preventing future spore emissions.

### 16. `prop_biomech_tracheal_wall_pipe`
- **Category:** Living Peristaltic Conduit
- **HP / Collision:** 35 HP | Wall mounted.
- **On Destruction (Bile Burst):**
  - **HELP (Debuff Enemies):** Puncturing the bulging tube sprays corrosive yellow digestive bile across a 4m arc. Enemies coated in bile take **+25% bonus kinetic damage** from player weapons for 8 seconds.
- **On Interaction [E]:**
  - Tap the living conduit to extract 1× *Amber Nutrient Gel*.

### 17. `prop_wall_cable_tray_swag`
- **Category:** Overhead Wire Management
- **HP / Collision:** 25 HP | Upper wall mounted.
- **On Destruction:**
  - **HURT (Environmental Trap):** Shooting the support bracket causes heavy electrified cable harnesses to collapse and dangle into the room, creating an electrified curtain that zaps passing enemies for 40 shock damage.

### 18. `prop_ceiling_crane_hoist`
- **Category:** Heavy Monorail Crane
- **HP / Collision:** 80 HP | Ceiling mount.
- **On Destruction / Trigger:**
  - **HELP (Kinetic Weapon):** Releasing the hoist cable drops the 3-ton titanium claw hook to the floor with catastrophic impact, dealing **250 crushing damage** to any enemies caught below and flattening light barricades.
- **On Interaction [E] (Crane Pendant):**
  - Operates the motorized crane to move heavy cargo containers, opening alternative flanking routes.

### 19. `prop_vertebral_cable_riser`
- **Category:** Cyber-Spinal Infrastructure
- **HP / Collision:** 50 HP | Vertical column conduit.
- **On Destruction:**
  - Shatters bone vertebrae into bone shrapnel (25 damage in a 3m radius) and severs data links.
- **On Interaction [E] (Neural Tap):**
  - **GIVE:** Jacking into the spinal nerve bundle grants temporary *Neural Echo Telemetry*, highlighting all enemy silhouettes through walls for 45 seconds.

### 20. `prop_biomech_spore_umbilical_cable` (The Animated Squid-Arm)
- **Category:** **Dynamic Room-Centric Attacker / Biomech Hazard**
- Detailed in Section 3 below.

---

## 3. Rigging & AI: The Umbilical Tentacle Attacker (`prop_biomech_spore_umbilical_cable`)

```
      UMBILICAL SQUID-ARM SKELETON (10 BONES)
                ┌──────────────┐
                │ Bone_Root    │ (Ceiling Anchor)
                └──────┬───────┘
                       │
                ┌──────┴───────┐
                │ Bone_01..03  │ (Flexible Upper Coil)
                └──────┬───────┘
                       │
                ┌──────┴───────┐
                │ Bone_04..06  │ (Mid-Body Muscle Struts)
                └──────┬───────┘
                       │
                ┌──────┴───────┐
                │ Bone_07..09  │ (Tapered Neck)
                └──────┬───────┘
                       │
                ┌──────┴───────┐
                │ Bone_Tip     │ (Striking Jaw / Talon)
                └──────────────┘
```

### 3.1 Blender Skeletal Rigging Script (`scripts/blender/rig_umbilical_tentacle.py`)
1. **Import & Decimation:**
   - Ingests `public/3dprops/prop_biomech_spore_umbilical_cable.glb` (50k polygons -> decimated to 18,000 polygons for optimal runtime skeletal deformation).
2. **Armature Generation:**
   - Evaluates the mesh's vertical bounding box (height ~3.0 meters).
   - Generates a 10-bone vertical chain: `Umbilical_Root` at $Z=3.0$, stepping down uniformly to `Umbilical_Tip` at $Z=0.0$.
3. **Weight Skinning:**
   - Automatic heat-diffusion skin weighting (`ARMATURE_AUTO`) with Laplacian smoothing to prevent tearing around high-curvature bends.
4. **Procedural Looping Keyframe Actions:**
   - `idle_sway`: Compound dual-axis sine wave oscillations simulating an organic creature floating and breathing in zero-G or ceiling suspension (2.4s loop).
   - `coil_anticipation`: Armature pulls upward and coils in a tense S-curve before striking (0.4s).
   - `lash_strike`: High-velocity downward/forward whip extension with tip snap (0.25s).
   - `sever_convulsion`: Rapid chaotic spastic shuddering when HP reaches 0, dropping limp.
5. **Export:** Output to `public/3d/runtime/new3ds/prop_biomech_spore_umbilical_cable_rigged.glb`.

### 3.2 Three.js Dynamic Tentacle Controller (`src/3d/umbilicalAttacker.js`)
- **State Machine:**
  - `IDLE`: Sways gently; emits subtle amber capillary pulse.
  - `TRACKING`: Player enters 6.0m radius; head bone dynamically aims toward player coordinates using forward kinematic pitch/yaw blending.
  - `STRIKE`: When player is within 3.8m, triggers whip strike: deals 35 damage, inflicts 20% spore infection, and knocks player back. Cooldown: 2.8s.
  - `RETRACT`: Coils back to ceiling after strike or if player leaves radius.
  - `SEVERED`: At 0 HP, tip bone drops to floor, stops attacking, and spawns an interactable loot node (*Living Umbilical Tendon*).

---

## 4. Audit of All 342 3D Items & Multi-Variant Prop Array System

### 4.1 Audit Summary Across Repository
- **Total GLBs in `public/`:** 342 files across `kits/`, `new3ds/`, `3dprops/`, `community/`, and `structures/`.
- **New Raw Props:** 20 GLBs in `public/3dprops/` (30–54MB each, uncompressed).
- **Core Runtime Library:** 186 GLBs in `public/3d/runtime/new3ds/` (optimized 12k–25k tris).
- **Modular Kit Pieces:** 80 GLBs in `public/3d/runtime/kits/` (40 cave, 40 space).

### 4.2 Multi-Variant Grouping System (`src/propVariants.js`)
Currently, world generators request single hardcoded prop names. Grouping related assets into **Variant Arrays** allows generators to randomly pick variations, instantly multiplying environmental diversity:

```javascript
export const PROP_VARIANT_GROUPS = Object.freeze({
    // Specimen Tanks (Clean vs Ruptured)
    specimen_tank: ['prop_specimen_tank', 'prop_broken_specimen_tank'],

    // Barricades (Sandbags vs Improvised Scrap vs Reinforced)
    security_barricade: [
        'prop_security_barricade',
        'state_barricade_improvised_1',
        'state_barricade_improvised_2'
    ],

    // Life-Support Sarcophagi & Reliquaries
    flesh_steel_reliquary: [
        'prop_flesh_steel_coffin',
        'prop_flesh_steel_cradle',
        'prop_flesh_steel_inhaler',
        'prop_corporate_saint_reliquary'
    ],

    // Fungal Biomech Altars & Vents
    fungal_biomech_station: [
        'prop_fungal_mycelium_loom',
        'prop_fungal_resin_basin',
        'prop_fungal_spore_dispenser',
        'prop_fungal_tendril_altar',
        'prop_biomech_sphincter_hatch_vent'
    ],

    // Cryo Manifolds & Vents
    cryo_manifold: [
        'prop_icey_frost_manifold',
        'prop_icey_frost_vent',
        'prop_icey_thermal_pod',
        'prop_coolant_drum_leaking_pool'
    ],

    // Wall Breaches & Structural Damage
    wall_breach: [
        'state_wall_breached_01',
        'state_wall_breached_02',
        'state_wall_breached_03',
        'state_column_shattered'
    ],

    // Grand Portals & Door Arches
    cathedral_archway: [
        'arch_deco_archway_grand_01',
        'arch_deco_archway_grand_02',
        'arch_deco_archway_grand_03',
        'arch_deco_archway_grand_04',
        'arch_bulkhead_frame'
    ],

    // Structural Buttresses & Pillars
    buttress_pillar: [
        'arch_pillar_buttress_01',
        'arch_pillar_buttress_02',
        'arch_pillar_buttress_03',
        'arch_pillar_buttress_04'
    ],

    // Ceiling Vault Ribs
    ceiling_vault_rib: [
        'arch_rib_ceiling_vault_01',
        'arch_rib_ceiling_vault_02',
        'arch_rib_ceiling_vault_03'
    ],

    // Computer Consoles & Scripture Lecterns
    diagnostic_terminal: [
        'prop_diagnostic_console',
        'prop_terminal_ruptured',
        'base_console',
        'prop_liturgical_terminal_lectern'
    ],

    // Industrial Storage Drums
    storage_drum: [
        'prop_storage_drum_dented',
        'prop_coolant_drum_leaking_pool'
    ],

    // Medical & Autopsy
    medical_station: [
        'prop_medical_bed',
        'prop_surgical_cart',
        'prop_autopsy_dissection_slab',
        'prop_biomech_triage_cradle'
    ],

    // Industrial & Biomechanical Piping
    pipe_system: [
        'prop_pipe_rupture',
        'prop_valve_wheel_fused',
        'prop_pipe_organ_heat_exchanger',
        'prop_biomech_tracheal_wall_pipe'
    ],

    // Cable & Wiring Infrastructure
    cable_management: [
        'prop_conduit_junction_box',
        'prop_conduit_hub',
        'prop_floor_conduit_bridge',
        'prop_wall_cable_tray_swag',
        'prop_vertebral_cable_riser'
    ],

    // Life Support & Decontamination
    life_support: [
        'prop_o2_filter_vat',
        'prop_oxygen_bottle_cascade_rack',
        'prop_decon_eyewash_shower_station'
    ],

    // Sacred Corporate Liturgy & Shrines
    sacred_shrine: [
        'arch_niche_shrine',
        'prop_shrine_plinth_broken',
        'prop_votive_candle_shrine',
        'prop_corporate_saint_reliquary'
    ],

    // Lighting Fixtures
    light_fixture: [
        'fixture_sconce_vine',
        'prop_light_cluster_dripping',
        'prop_overhead_cage_fluorescent'
    ],

    // Vents & Air Handling
    ventilation: [
        'prop_vent_grate_exploded',
        'prop_floor_drainage_sump_trough',
        'prop_exhaust_blower_fan_hood',
        'prop_biomech_sphincter_hatch_vent'
    ],

    // Maintenance & Workshop Tooling
    workshop_tooling: [
        'prop_fabricator_workstation',
        'prop_maintenance_tool_cart',
        'prop_exosuit_docking_gantry'
    ]
});

/**
 * Resolves a prop key: if it matches a group, rolls one from the array;
 * otherwise returns the key directly.
 */
export function resolvePropVariant(keyOrGroup, rng = Math.random) {
    const group = PROP_VARIANT_GROUPS[keyOrGroup];
    if (Array.isArray(group) && group.length > 0) {
        const index = Math.floor(rng() * group.length);
        return group[index];
    }
    return keyOrGroup;
}
```

---

## 5. Implementation Roadmap & TODO Checklist

### Phase 1: Optimization & Ingestion of 20 Raw Props
- [x] Create `scripts/blender/ingest_and_optimize_new_props.py`:
  - [x] Decimate the 20 raw meshes in `public/3dprops/` / `art/raw/newartandprops/` (from 50k to 15k–25k tris).
  - [x] Resize any textures over 1024 to 1024 WebP/PNG.
  - [x] Export optimized versions to `public/3d/runtime/new3ds/` (reduced from ~45MB to ~4MB each).
- [x] Register all 20 props in `WORLD_3D_MODELS` in `src/world3dOverlay.js`.

### Phase 2: Rigging the Umbilical Tentacle Attacker
- [x] Author `scripts/blender/rig_umbilical_tentacle.py`:
  - [x] Construct 10-bone spine armature for `prop_biomech_spore_umbilical_cable`.
  - [x] Bind vertex weights with automatic heat skinning.
  - [x] Key looping animations: `idle_sway`, `coil_anticipation`, `lash_strike`, `sever_convulsion`.
  - [x] Export rigged GLB to `public/3d/runtime/new3ds/prop_biomech_spore_umbilical_cable_rigged.glb`.
- [x] Implement `src/3d/umbilicalAttacker.js` Three.js controller (tracking, reach, attack radius, damage, stunning, infection).

### Phase 3: "Help, Hurt, Give, Take" Interaction Engine
- [x] Implement `src/propInteractions.js`:
  - [x] Hook into `damageProp` / projectile impact handlers:
    - [x] `prop_oxygen_bottle_cascade_rack` rupture: +35% O2 refill & cryo blast.
    - [x] `prop_coolant_drum_leaking_pool` rupture: freeze shockwave & slippery ice decal.
    - [x] `prop_pipe_organ_heat_exchanger` rupture: scalding steam cone.
    - [x] `prop_floor_conduit_bridge` rupture: electric shock floor hazard.
    - [x] `prop_overhead_cage_fluorescent` rupture: sparks & local darkness.
  - [x] Hook into player interaction [E] prompt:
    - [x] `prop_decon_eyewash_shower_station`: -50% infection load purge.
    - [x] `prop_exosuit_docking_gantry`: shield overcharge.
    - [x] `prop_votive_candle_shrine`: scrap offering for speed buff.
    - [x] `prop_liturgical_terminal_lectern`: sector map reveal.
    - [x] `prop_maintenance_tool_cart`: repair kit / ammo scavenging.

### Phase 4: Multi-Variant Prop Array System & Room Integration
- [x] Create `src/propVariants.js` with `PROP_VARIANT_GROUPS` and `resolvePropVariant`.
- [x] Integrate variant resolution into `src/threeGame.js` (`createChunkSetPiecePlacements` and WFC anchors).
- [x] Update room population in `src/data/roomBuilds.js` and `src/data/cathedralBlueprints.js` to leverage variant arrays and true interactive props.
- [x] Add vitest test suites covering prop variant resolution and interaction handlers (`propVariants.test.js`, `propInteractions.test.js`, `umbilicalAttacker.test.js`, `worldPropUsage.test.js`).
