# Sprint 23: Room Juice & 2D Dressing Asset Specification

## 1. Executive Summary & Sprint 23 Review

Sprint 23 established an authoritative placement and progression contract across the game's procedural world:
- **Authored Rooms**: Act as distinct, dramatic gameplay milestones.
- **Connective Hallways**: Procedurally generated connective tissue.
- **Pacing & Progression**: Governed by `WorldPlan` reservations, canonical milestone boss lifecycles, and ring crossings.

### Verification Proof Across All Lanes

| Lane | Responsibilities & Modules | Verified Status |
|---|---|---|
| **Lane A** | Macro plans (`WorldPlan`), manifests, camp/hive territory allocator, milestone boss state machine, ring crossing queries, objective resolver, 5,000-seed audit. | **Complete & Integrated** (5,000 seeds: 0 validity/spacing/conflict/determinism failures) |
| **Lane B** | `ChunkStructureResult` standard contract, 8 vertical-slice authored room builds, 8 hallway connector archetypes, reservation-to-build bridge with zero discarded generation. | **Complete & Integrated** (100% contract aligned, no discarded WFC iterations on reserved chunks) |
| **Lane C** | Runtime integration in `ThreeGame.buildChunk`, world-space containment bounds translation in `getActiveContainmentZones`, milestone boss event hooks, radar compass target resolution, exact quest anchor binding, persistence rollback safety. | **Complete & Integrated** (178 test files, 1,505 tests passing, presubmit clean) |

---

## 2. Visual Style & Chroma-Key Sprite Constitution

All room dressing sprites adhere to Hunker Bunker's **Biomechanical & Industrial Retro-Sci-Fi Horror** aesthetic:
1. **One Engineered Anatomy**: Charcoal metal, oxidized steel, copper conduits, hydraulic pistons, bone-like reinforcement ribs, and tendon cable runs.
2. **Functional Lighting & Palette**:
   - **Charcoal / Matte Gunmetal / Iron**: Structural base.
   - **Amber / Orange**: Human machinery, active consoles, and industrial safety markers.
   - **Cyan / Electric Blue**: High-tech fabrication, data links, and cryogenic systems.
   - **Emerald / Acid Green**: Fungal bio-growth, respiration vats, and toxic spore culture.
   - **Ruby / Crimson**: High-voltage warnings, security lasers, and emergency beacons.
3. **Chroma-Key Background**: Sprites are rendered on a solid, saturated chroma green background (`#00FF00`) with crisp outer boundaries for clean alpha-mask extraction into the game engine.
4. **World Scale & Placement**:
   - **Props**: Bottom-pivoted (`center: (0.5, 0.0)`), scaled between `1.2m` to `2.4m` world units.
   - **Floor Decals**: Top-down flat perspective, renderOrder `7`, elevation `0.03m` above floor plane.

---

## 3. Authored Room Family Signature Sprites

| Room Family | Asset ID | Sprite Concept | Gameplay "Juice" Function |
|---|---|---|---|
| **`medical_triage`** | `prop_vital_monitor` | Rugged military medical cart with a glowing green CRT oscilloscope ECG waveform, IV fluid pouch, and dangling electrode leads. | Gives clear visual feedback for triage/healing areas. |
| **`armory_cage`** | `prop_ammo_crate_stack` | Heavy steel munitions crates stamped with hazard yellow warning chevrons, steel latches, and spent brass casings around the base. | Highlights high-value combat and weapon modification loot. |
| **`o2_scrubber`** | `prop_o2_filter_vat` | Pressurized bronze-and-iron chemical scrubber cylinder with bubbling green liquid, analog needle gauges, and steam release valves. | Visually anchors the ship's vital life-support goal. |
| **`field_fabricator`** | `prop_fabricator_workstation` | Heavy industrial CNC/laser workbench with an articulating blue arc welder nozzle and floating cyan wireframe schematic display. | Distinguishes high-tier equipment crafting from ordinary salvage. |
| **`power_puzzle`** | `prop_tesla_coil_node` | High-voltage step-up capacitor tower with ribbed ceramic insulators, heavy grounding cables, and visible electric arcs. | Teaches electrical hazards and power circuit interactables. |
| **`trap_vault`** | `prop_laser_trap_emitter` | Armored wall-mounted turret mount emitting twin ruby laser tripwire beams with scorch marks along the housing. | Warns player of high-risk, high-reward trap corridors. |
| **`reward_cache`** | `prop_alloy_footlocker` | Reinforced titanium supply chest with glowing cyan security status light bar and biometric scanner clasp. | Dramatic payoff visual for secret caches and dead ends. |
| **`ring_crossing_landmark`** | `prop_hydraulic_piston_actuator` | Massive heavy-duty industrial hydraulic ram with hazard-striped protective cage and hydraulic fluid hoses. | Conveys the physical immensity of ring barrier bulkheads. |

---

## 4. Camp & Hive Faction Clutter

- **Meridian (Tech Survivors)**: Stacked CRT monitors with scrolling amber diagnostic data, improvised lead-acid battery banks, and loose vacuum tube crates.
- **Tallow (Bio Cultivators)**: Terraced fungal growth trays, hanging resin gourds, and fermented spore carboys.
- **Vesper (Militarized Security)**: Welded razor-wire barricades, ammunition reloading presses, and riot shield stands.
- **Alien Hives**: Glistening tendon curtains, pulsating amber egg clutches, and chitinous husk molts.

---

## 5. Biomechanical & Body-Horror Set (H.R. Giger & Naked Lunch Innuendo/Surrealism)

| Room Family / Role | Asset ID | Sprite Concept | Biomechanical Horror Function |
|---|---|---|---|
| **`o2_scrubber` / `bio_vent`** | `prop_biomech_respirator` | Ribbed steel conduit fusing into a glistening organic sphincter air valve with bone vertebrae struts and dripping alien secretions. | Surreal biological air intake and life-support duct. |
| **`field_fabricator` / `bio_incubator`** | `prop_biomech_incubator` | Translucent fleshy pulsating gestational bulb encased in a skeletal spine and bronze pipe armature with dripping bio-viscous extrusion nozzle. | Synthetic/gestational organism and equipment fabricator. |
| **`power_puzzle` / `synapse_node`** | `prop_biomech_neural_synapse` | Bulbous glistening fleshy ganglia cluster mounted on a ribbed spinal column with interwoven tendon cables and electric blue sparks. | Bio-neural routing node for biological circuitry puzzles. |
| **`armory_cage` / `chitin_sheath`** | `prop_biomech_flesh_locker` | Ribbed dark chitin carapace locker with a vertical moist organic slit aperture held by bone clamps, oozing amber lubricant around weapons. | Biomechanical munition and weapon sheath. |
| **`trap_vault` / `sphincter_trap`** | `prop_biomech_sphincter_trap` | Ground canister fused with dark ribbed alien flesh, featuring a spiraling muscular sphincter mouth ringed with sharp chitinous teeth and acid secretions. | Carnivorous mimic trap and hazardous containment pod. |
| **`medical_triage` / `triage_cradle`** | `prop_biomech_triage_cradle` | Curved metal dissection table framed by vertebrae ribs and hydraulic pistons, entwined with umbilical conduits and a bulbous filtration heart. | Biomechanical life-support and surgery cradle. |

