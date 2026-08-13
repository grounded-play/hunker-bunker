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

## 4. Faction Camp Dressing Catalog

### Camp Meridian (Tech Survivors)
| Asset ID | Sprite Concept | Gameplay "Juice" Function | In-Game Anchor / Placement |
|---|---|---|---|
| `prop_camp_meridian_radio` | Improvised HAM radio station with glowing amber vacuum tubes, lit tuning dials, oscilloscope waveform monitor, and copper wire antenna. | Conveys long-range transmission search; hums with active amber audio waveform. | Camp Heart / Comms Alcove (scale `1.8m`) |
| `prop_camp_meridian_battery_bank` | Slagged lead-acid truck batteries connected with heavy copper jumper cables and glowing diode indicators. | Power supply visual tell for survivor survival tech. | Generator / Wall Edge (scale `1.5m`) |
| `prop_camp_meridian_repair_rig` | Welded pipe workbench with articulated magnifying lamp, soldering iron, and microchip scrap bins. | Crafting and gear maintenance station. | Work Area (scale `2.0m`) |

### Camp Tallow (Bio Cultivators / Spore Harvesters)
| Asset ID | Sprite Concept | Gameplay "Juice" Function | In-Game Anchor / Placement |
|---|---|---|---|
| `prop_camp_tallow_still` | Crude copper-and-glass fungal distillation retort bubbling with luminescent emerald spore liquor. | Visual tell for medicinal spore extract brewing. | Center Cookfire / Still Alcove (scale `1.7m`) |
| `prop_camp_tallow_spore_trays` | Tiered wooden racks filled with glowing bioluminescent cave fungi and drying root bundles. | Demonstrates sustainable bio-farming in deep darkness. | Perimeter Shelves (scale `1.9m`) |
| `prop_camp_tallow_resin_urn` | Gourd-shaped ceramic vessel sealed with beeswax and dripping golden antiseptic resin. | High-tier organic medicine storage. | Triage Corner (scale `1.2m`) |

### Camp Vesper (Militarized Iron Guild)
| Asset ID | Sprite Concept | Gameplay "Juice" Function | In-Game Anchor / Placement |
|---|---|---|---|
| `prop_camp_vesper_turret` | Sandbag-mounted twin heavy auto-cannon with hazard yellow armor shielding and spent casing mounds. | High-threat perimeter defense anchor. | Sentry Entry Point (scale `2.2m`) |
| `prop_camp_vesper_ammo_press` | Cast-iron manual cartridge reloading press with powder hopper, brass trays, and bullet molds. | Teaches heavy munitions production. | Armory Wall (scale `1.6m`) |
| `prop_camp_vesper_shield_rack` | Welded steel locker holding heavy riot barricade shields and dented ballistic vest plates. | Armor refit station visual marker. | Fortification Line (scale `1.8m`) |

---

## 5. Hive Site Dressing Catalog

### Hive Suture (Flesh Stitching & Bio-Repairs)
| Asset ID | Sprite Concept | Gameplay "Juice" Function | In-Game Anchor / Placement |
|---|---|---|---|
| `prop_hive_suture_organ` | Ribbed biological meat wall stitched closed with thick industrial barbed wire and oozing black resin. | Marks repaired breaches in the hive structure. | Hive Heart Wall (scale `2.4m`) |
| `prop_hive_wound_cauterizer` | Glistening organic gland discharging viscous sealing foam onto cracked carapace walls. | Ambient environmental healing effect. | Wall Seam (scale `1.6m`) |

### Hive Relay (Synaptic Neural Broadcast)
| Asset ID | Sprite Concept | Gameplay "Juice" Function | In-Game Anchor / Placement |
|---|---|---|---|
| `prop_hive_relay_antenna` | Towering chitinous spinal column fused with radio antenna relays and pulsating bioluminescent spore nodes. | Long-range brood telepathy relay. | Center Spire (scale `2.6m`) |
| `prop_hive_synaptic_web` | Interwoven glistening fleshy filaments transmitting glowing bio-luminescent pulses between floor nodes. | Active signal path indicator. | Corridor Floor / Wall (scale `2.0m`) |

### Hive Carapace (Brood Hatchery & Armor)
| Asset ID | Sprite Concept | Gameplay "Juice" Function | In-Game Anchor / Placement |
|---|---|---|---|
| `prop_hive_chitin_hatchery` | Armored cluster of translucent chitin eggs with undulating embryo silhouettes inside. | Telegraphs swarm reinforcement threats. | Nest Nursery (scale `2.1m`) |
| `prop_hive_carapace_molt` | Massive shed insectoid exoskeleton split down the dorsal seam, glistening with fresh ichor. | Environmental storytelling of creature growth. | Brood Alcove (scale `2.3m`) |

---

## 6. Ship Goals & Mission Objectives

| Goal / Mission | Asset ID | Sprite Concept | Gameplay Objective Identity |
|---|---|---|---|
| **Crash Site / Hull Matrix** | `prop_ship_reactor_core` | Exposed starship fusion containment core with pulsing cyan plasma coils, magnetic rings, and cryogenic steam. | Ship power restoration milestone. |
| **Crash Site / Black Box** | `prop_ship_flight_recorder` | Reinforced high-visibility orange magnetic flight data recorder with flashing emergency strobe. | Crucial lore & narrative revelation. |
| **O2 Scrubber Milestone** | `prop_o2_filter_vat` / `prop_biomech_respirator` | Pressurized chemical filtration vat / biomechanoid respiratory sphincter intake. | Restores atmosphere across the sector. |
| **Fabrication Milestone** | `prop_fabricator_workstation` / `prop_biomech_incubator` | Blue laser CNC fabricator / gestation pod. | Enables advanced weapon and suit crafting. |

---

## 7. Biomechanical & Body-Horror Set (H.R. Giger & Naked Lunch Innuendo/Surrealism)

| Room Family / Role | Asset ID | Sprite Concept | Biomechanical Horror Function |
|---|---|---|---|
| **`o2_scrubber` / `bio_vent`** | `prop_biomech_respirator` | Ribbed steel conduit fusing into a glistening organic sphincter air valve with bone vertebrae struts and dripping alien secretions. | Surreal biological air intake and life-support duct. |
| **`field_fabricator` / `bio_incubator`** | `prop_biomech_incubator` | Translucent fleshy pulsating gestational bulb encased in a skeletal spine and bronze pipe armature with dripping bio-viscous extrusion nozzle. | Synthetic/gestational organism and equipment fabricator. |
| **`power_puzzle` / `synapse_node`** | `prop_biomech_neural_synapse` | Bulbous glistening fleshy ganglia cluster mounted on a ribbed spinal column with interwoven tendon cables and electric blue sparks. | Bio-neural routing node for biological circuitry puzzles. |
| **`armory_cage` / `chitin_sheath`** | `prop_biomech_flesh_locker` | Ribbed dark chitin carapace locker with a vertical moist organic slit aperture held by bone clamps, oozing amber lubricant around weapons. | Biomechanical munition and weapon sheath. |
| **`trap_vault` / `sphincter_trap`** | `prop_biomech_sphincter_trap` | Ground canister fused with dark ribbed alien flesh, featuring a spiraling muscular sphincter mouth ringed with sharp chitinous teeth and acid secretions. | Carnivorous mimic trap and hazardous containment pod. |
| **`medical_triage` / `triage_cradle`** | `prop_biomech_triage_cradle` | Curved metal dissection table framed by vertebrae ribs and hydraulic pistons, entwined with umbilical conduits and a bulbous filtration heart. | Biomechanical life-support and surgery cradle. |

---

## 8. Batch-Ready Generation Prompts — Faction/Hive/Ship Catalog (queued, pending quota reset)

No image-generation tool was available in the session that wrote this section — these
are complete, self-contained prompts ready to paste into whichever pipeline produced
`prop_vital_monitor.jpg` and the other Section 3 signature sprites once its quota
window reopens. Nothing below has been rendered yet.

### Shared template

```
{CONCEPT}

Style: Hunker Bunker biomechanical & industrial retro-sci-fi horror game prop.
Palette: {PALETTE}.
Camera: single object, centered, 3/4 top-down isometric view (~45° azimuth,
~41° elevation) matching the game's fixed camera — not a straight side profile.
Background: solid saturated chroma green #00FF00, crisp clean outer edges,
no drop shadow, no ground plane, no props overlapping the frame boundary,
even flat lighting on the green field so keying is clean.
Composition: game-ready prop sprite, single centered subject, no text, no UI,
no watermark, no vignette.
```

`{PALETTE}` per category, from Section 2's functional-lighting rules:
- **Meridian (tech)**: amber/orange active-machinery accents on charcoal/gunmetal base.
- **Tallow (bio)**: emerald/acid-green bio-growth accents, warm organic tones.
- **Vesper (security)**: ruby/crimson warning accents on matte iron/charcoal base.
- **Hive (all three sites)**: emerald/acid-green bio-luminescence on dark chitin/bone, wet specular highlights.
- **Ship objectives**: cyan/electric-blue high-tech accents on charcoal hull plating.

### Camp Meridian

1. **`prop_camp_meridian_radio`** — Improvised HAM radio station with glowing amber vacuum tubes, lit tuning dials, an oscilloscope waveform monitor, and a copper wire antenna. / Palette: Meridian.
2. **`prop_camp_meridian_battery_bank`** — Slagged lead-acid truck batteries connected with heavy copper jumper cables and glowing diode indicators. / Palette: Meridian.
3. **`prop_camp_meridian_repair_rig`** — Welded pipe workbench with an articulated magnifying lamp, a soldering iron, and microchip scrap bins. / Palette: Meridian.

### Camp Tallow

4. **`prop_camp_tallow_still`** — Crude copper-and-glass fungal distillation retort bubbling with luminescent emerald spore liquor. / Palette: Tallow.
5. **`prop_camp_tallow_spore_trays`** — Tiered wooden racks filled with glowing bioluminescent cave fungi and drying root bundles. / Palette: Tallow.
6. **`prop_camp_tallow_resin_urn`** — Gourd-shaped ceramic vessel sealed with beeswax, dripping golden antiseptic resin. / Palette: Tallow.

### Camp Vesper

7. **`prop_camp_vesper_turret`** — Sandbag-mounted twin heavy auto-cannon with hazard-yellow armor shielding and spent-casing mounds at its base. / Palette: Vesper.
8. **`prop_camp_vesper_ammo_press`** — Cast-iron manual cartridge reloading press with a powder hopper, brass trays, and bullet molds. / Palette: Vesper.
9. **`prop_camp_vesper_shield_rack`** — Welded steel locker holding heavy riot barricade shields and dented ballistic vest plates. / Palette: Vesper.

### Hive Suture

10. **`prop_hive_suture_organ`** — Ribbed biological meat wall stitched closed with thick industrial barbed wire, oozing black resin from the seams. / Palette: Hive.
11. **`prop_hive_wound_cauterizer`** — Glistening organic gland discharging viscous sealing foam onto cracked carapace wall tissue. / Palette: Hive.

### Hive Relay

12. **`prop_hive_relay_antenna`** — Towering chitinous spinal column fused with radio antenna relays and pulsating bioluminescent spore nodes. / Palette: Hive.
13. **`prop_hive_synaptic_web`** — Interwoven glistening fleshy filaments transmitting glowing bioluminescent pulses between floor nodes. / Palette: Hive.

### Hive Carapace

14. **`prop_hive_chitin_hatchery`** — Armored cluster of translucent chitin eggs with undulating embryo silhouettes visible inside. / Palette: Hive.
15. **`prop_hive_carapace_molt`** — Massive shed insectoid exoskeleton split down the dorsal seam, glistening with fresh ichor. / Palette: Hive.

### Ship objectives

16. **`prop_ship_reactor_core`** — Exposed starship fusion containment core with pulsing cyan plasma coils, magnetic containment rings, and venting cryogenic steam. / Palette: Ship.
17. **`prop_ship_flight_recorder`** — Reinforced high-visibility orange magnetic flight data recorder with a flashing emergency strobe light. / Palette: Ship.

### After rendering

1. Save each as `public/{asset_id}.jpg` (1024x1024, matching the existing signature-sprite files) or a real-alpha PNG.
2. Register the path in `GENERATED_ROOM_PROP_PATHS` in `src/threeGame.js` (same object the six Section 3 sprites were added to) — this auto-wires it into `scatterTextures` on load.
3. Assign it as an anchor `.type` wherever the camp/hive/ship placement system references that anchor id — camp/hive dressing placement is not yet wired the way room-build anchors are (see the Sprint 23 status log); confirm the actual consumer before assuming a texture registration alone makes it appear in-game.

