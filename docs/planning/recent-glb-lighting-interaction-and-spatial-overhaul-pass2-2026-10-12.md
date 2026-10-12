# Recent GLB Lighting, Interaction, and Spatial Overhaul (Pass 2 Expansion) — 2026-10-12

## Executive Summary & Current Architecture State

Following the successful implementation of **Wave 0** (contracts, data manifest, persistent spent keys, structured results) and **Wave 1** (12-prop vertical slice) by the previous engineering pass, and the subsequent spatial layout pass for distinctive hallway arches and junction crowns, this master plan details the complete rollout for:
1. **Pass 2 (19 Brand New GLBs)** just ingested and placed from `10.12.3ds.2`:
   - `bay_c_pod_312_rupture`, `carapace_sentry_chrysalis`, `chen_sealed_confession_console`, `corp_biometric_collar_chute`, `crawler_signal_antenna_rig`, `decon_exosuit_scrubber_station`, `engineer_wave_relay_dynamo`, `evac_four_seat_cockpit_module`, `evac_manifest_allocation_terminal`, `evac_preflight_fuel_umbilical`, `queen_royal_brood_throne`, `relay_false_beacon_spire`, `royal_egg_clutch_caul`, `scout_tracking_beacon_core`, `sector_zero_bore_drillhead`, `suture_mercy_cocoon_canopy`, `tank_orbital_siege_cannon`, `vass_acoustic_resonator_tank`, `vass_hybrid_embryo_incubator`.
2. **Pass 1 Remaining World-Story Props (28 GLBs)**:
   - Corporate Horizon (`corp_interrogation_chair`, `corp_debt_severing_kiosk`, `corp_dissection_gurney`, `corp_incinerator_hopper`), Meridian (`meridian_cyber_graft_bench`, `meridian_mainframe_altar`, `meridian_servitor_dock`), Tallow (`tallow_compost_fermenter`, `tallow_spore_cradle`, `tallow_flesh_trellis`, `tallow_sacrificial_altar`), Vesper (`vesper_amputation_rig`, `vesper_autocannon_bipod`, `vesper_hanging_cage`, `vesper_reloading_station`), Tina (`tina_molted_carapace`, `tina_mimic_vanity`, `tina_trophy_trove`), Hive (`hive_visceral_ovipositor`, `hive_vivisected_engineer`, `hive_gestation_sac`, `hive_pulmonary_bellows`, `hive_amniotic_feeder_trough`), Cryo (`cryo_ruptured_pod`, `cryo_cannibal_butchery_table`, `cryo_ice_core_specimen`, `cryo_thawing_trough`, `cryo_frozen_shelter_pod`), Chasm/Industrial (`chasm_suicide_ledge_cross`, `chasm_dredge_hook_crane`, `ind_hydraulic_manifold`, `ind_fuel_rod_cask`).
3. **2026-10-11 World-Completion Remaining Props (31 GLBs)**:
   - Bunker daily life, services, bio, cryo, and crash props.

---

## Technical Constraints & Design Principles

### 1. In-Model Source Practical Lighting
- **Visible Light Origins**: Light positions are computed in model space at the exact visible lamp filament, CRT phosphor, emergency beacon, heating coil, bioluminescent organ, or liquid meniscus (`[x, y, z]` normalized model bounds fallback or `FX_LIGHT_00` / `FX_GLOW_00` node).
- **Fixed Light Pool (8 Slots)**: Lights never spawn ad-hoc dynamic renderer point lights. Props register into the engine's 8-slot nearest-light budget pool in `threeGame.js`.
- **Zero Point-Light Shadows**: All prop point lights remain strictly shadowless (`castShadow = false`) to eliminate cubemap rendering overhead on the Steam Deck and low-spec target hardware. Realism is maintained through screen-space ambient occlusion, baked AO, contact decals, and glowing source halos.
- **Distance Culling**: Active lighting and particle emitters cull beyond 18–24m, yielding CPU and GPU budget to close-quarters gameplay.

### 2. Interaction Discipline & Anti-Prompt-Forest Rules
- **Placement-Gated Prompts**: In generic room layouts, decorative duplicates do NOT present an `[E]` prompt. Only designated focal pieces, signature anchors, and vignette leaders receive interaction capability. Maximum **1 primary** and **1 secondary** interactable per standard room.
- **State-Bound Behavior & Visuals**:
  - Toggled machines (`working` / `idle`) toggle their audio hum, light intensity, and particle emitters synchronously.
  - One-shot salvage/story targets transition cleanly to `spent` or `open`, persisting across chunk unloads and multiplayer sessions via stable seed hashes.
- **Physical Collision Response**: Barriers, pod doors, iris sphincters, and hatches update their physics bounding boxes upon state change.

---

## Detailed Model Rollout: Batch by Batch

### Batch A: Pass 2 World-Story Models (19 Models)

| Model ID | Tier | Practical Light & FX Anchor | Unique Interaction Contract | Gameplay Consequence & Sound | Placement Synergy |
|---|:---:|---|---|---|---|
| `bay_c_pod_312_rupture` | **H** | Cyan cryo strobe at top frame `[0.5, 0.88, 0.52]` (`0x4deeea`, 0.95 int, 3.2m). Cold permafrost steam & coolant drip. | `[E] SEARCH RUPTURED POD` (one-shot -> `spent`) | Pries cryo tags. +25 scrap, logs Pod 312 incident. Sound: `flesh_seal` + hiss. | Cryo triage, research labs, escape corridors. |
| `carapace_sentry_chrysalis` | **H** | Pulsing bio-vein amber-green `[0.5, 0.65, 0.5]` (`0xa3e635`, 0.8 int, 2.8m, 0.18 pulse). Spore dusting & breathing. | `[E] HARVEST SENTINEL CHITIN` (one-shot -> `spent`) | Yields hardened armor plate (+1 shield / +20 scrap). 20% local swarm alert. Sound: `flesh_seal`. | Hive guard corridors, bio nest perimeters. |
| `chen_sealed_confession_console` | **H** | Amber phosphor CRT monitor `[0.5, 0.72, 0.58]` (`0xffa834`, 0.7 int, 2.5m, flicker). Marquee screen halo. | `[E] DECRYPT CONFESSION LOG` (one-shot -> `spent`) | Plays Deputy Chen's secret confession. Reveals contraband cache on map. Sound: `terminal_beep`. | Bunker security, command, cathedrals. |
| `corp_biometric_collar_chute` | **H** | Red/green biometric gate `[0.5, 0.78, 0.54]` (`0xef4444` -> `0x22c55e`, 0.85 int). Severance sparks. | `[E] OVERRIDE COLLAR DISPOSAL` (one-shot -> `open`) | Disables collar detonator. Yields +35 scrap. Sounds: alarm chime + `vault_open`. | Corporate offices, execution chambers. |
| `crawler_signal_antenna_rig` | **H** | Red beacon atop antenna mast `[0.5, 0.98, 0.5]` (`0xff3333`, 1.3 int, 4.5m, 0.5Hz beacon). Electrical static sparks. | `[E] RETUNE SIGNAL RIG` (toggle `idle` <-> `working`) | Synchronizes local transceiver. Reveals unexplored doorways in sector. Sound: `power_hum`. | Forward scout camps, rooftop communication. |
| `decon_exosuit_scrubber_station` | **H** | High-bay halogen white flood `[0.5, 0.92, 0.52]` (`0xd8f8ff`, 1.25 int, 3.8m). Overhead steam shower & foam jets. | `[E] ACTIVATE DECON SCRUBBER` (repeatable, 45s cooldown) | Cleanses all biological status (spores, slime, acid burn) + grants 30s hazard immunity. Sound: `steam_burst`. | Airlocks, hazmat transitions, workshops. |
| `engineer_wave_relay_dynamo` | **H** | Cyan induction core glow `[0.5, 0.55, 0.5]` (`0x38bdf8`, 1.1 int, 3.5m, harmonic pulse). Spinning arc sparks. | `[E] ENGAGE WAVE DYNAMO` (toggle `idle` <-> `working`) | Energizes grid. Grants room-wide +15% fire rate & reload buff. Sound: `crane_motor` + hum. | Engineering hubs, power junctions. |
| `evac_four_seat_cockpit_module` | **H** | Amber dashboard cockpit warning glow `[0.5, 0.58, 0.55]` (`0xff7830`, 0.8 int). Smoldering wiring smoke. | `[E] SALVAGE FLIGHT RECORDER` (one-shot -> `spent`) | Recovers black box telemetry (+40 scrap, marks drop site). Sound: `vault_open`. | Crash canyons, hangar bays, chasm edges. |
| `evac_manifest_allocation_terminal` | **H** | Green monoculture CRT terminal `[0.5, 0.74, 0.56]` (`0x4ade80`, 0.75 int, scanlines). Terminal hum. | `[E] SPOOF EVAC MANIFEST` (one-shot -> `spent`) | Unlocks sealed evacuation pods in current chunk. Sound: `terminal_beep`. | Corporate evacuation lobbies, transit bays. |
| `evac_preflight_fuel_umbilical` | **H** | Yellow pressure gauge lamp `[0.5, 0.65, 0.5]` (`0xfacc15`, 0.9 int). Hydrazine vapor jet leak. | `[E] VENT FUEL UMBILICAL` (one-shot -> `spent`) | Drains rocket propellant (+30 chem scrap). Extinguishes hazardous vapor. Sound: `steam_burst`. | Fuel stations, launch platforms. |
| `queen_royal_brood_throne` | **H** | Deep violet-crimson royal organ glow `[0.5, 0.75, 0.5]` (`0xa855f7`, 1.4 int, 4m, slow swell). Heavy spore drift. | `[E] EXTRACT ROYAL JELLY` (one-shot -> `spent`) | Grants legendary consumable (full heal + temporary max HP boost). Triggers hive roar. Sound: `flesh_seal`. | Boss arenas, central bio cathedral sanctum. |
| `relay_false_beacon_spire` | **H** | Amber lantern lighthouse beam `[0.5, 0.96, 0.5]` (`0xfbbf24`, 1.5 int, 5.0m, sweeping beam). Wind motes. | `[E] REPROGRAM FALSE BEACON` (toggle `idle` <-> `working`) | Inverts beacon signature to draw patrolling swarms away from exit routes. Sound: `terminal_beep`. | Chasm precipices, deep permafrost wastes. |
| `royal_egg_clutch_caul` | **H** | Translucent warm amber yolk glow `[0.5, 0.42, 0.5]` (`0xf59e0b`, 0.65 int, 2.2m). Gel surface shimmer. | `[E] PUNCTURE EGG CLUTCH` (one-shot -> `spent`) | Destroys royal embryos. Prevents royal elite spawns (+20 bio scrap). Sound: `flesh_seal` squish. | Egg nursery chambers, queen's court. |
| `scout_tracking_beacon_core` | **H** | High-intensity blue strobe `[0.5, 0.62, 0.5]` (`0x60a5fa`, 0.9 int, double-chirp). Radio pulse ring. | `[E] RECOVER BEACON DATA` (one-shot -> `spent`) | Unveils fallen scout supply caches in sector. Sound: `terminal_beep`. | Camps, frozen corpses, sniper nests. |
| `sector_zero_bore_drillhead` | **H** | Industrial tungsten work floods `[0.5, 0.72, 0.58]` (`0xffedd5`, 1.3 int, 3.8m). Diesel smoke puffs & grinding vibration. | `[E] CRANK BORE DRILLHEAD` (one-shot -> `working`) | Massive drill bites forward with screen shake, breaking rock wall into secret cache. Sound: `crane_motor`. | Mining arteries, bunker excavation dead-ends. |
| `suture_mercy_cocoon_canopy` | **H** | Sterile emerald life-support gel glow `[0.5, 0.68, 0.5]` (`0x2dd4bf`, 0.85 int). Gel bubbles & respirator breath. | `[E] ENTER MERCY CANOPY` (repeatable, 60s cooldown) | Cocoon closes for 2s, completely restoring HP and suit integrity. Sound: `flesh_seal` + breath. | Field surgical units, bio sanctuaries. |
| `tank_orbital_siege_cannon` | **H** | Red targeting laser optic & barrel coils `[0.5, 0.78, 0.65]` (`0xff4433`, 1.35 int). Breech steam vents. | `[E] FIRE CALIBRATION BURST` (one-shot -> `spent`) | Massive deafening artillery blast into chasm with camera trauma, clearing barricades. Sound: `explosion`. | Heavy defense bastions, trench lines. |
| `vass_acoustic_resonator_tank` | **H** | Cyan standing acoustic waves `[0.5, 0.62, 0.5]` (`0x06b6d4`, 1.05 int). Ultrasonic cavitation bubbles. | `[E] STRIKE ACOUSTIC RESONATOR` (repeatable, 30s cooldown) | Sonic ring pulse staggers all nearby organic and hive enemies for 12s. Sound: `power_hum` ring. | Giger cathedrals, acoustic labs. |
| `vass_hybrid_embryo_incubator` | **H** | Toxic acid-lime nutrient fluid `[0.5, 0.58, 0.5]` (`0x84cc16`, 0.95 int). Continuous bubble stream. | `[E] ABORT INCUBATION CYCLE` (one-shot -> `spent`) | Drains fluid with rush sound, granting +35 bio scrap while embryo collapses. Sound: `water_drain`. | Secret genetics labs, dissection vaults. |

---

### Batch B: Pass 1 Remaining World-Story Props (28 Models)

#### 1. Corporate Horizon Atrocities
- `corp_interrogation_chair` (H): Red cranial headband diode `[0.5, 0.75, 0.5]` (`0xef4444`, 0.75 int). Arc sparks. `[E] EXTRACT BURNED MEMORY`: Risk 10 O2/HP to gain executive map codes (+30 scrap). Sound: `power_hum` shock.
- `corp_debt_severing_kiosk` (H): Amber scanner screen `[0.5, 0.7, 0.55]` (`0xf59e0b`, 0.8 int). Screen scanline. `[E] SPOOF LIQUIDATION RECORD`: Payout +35 scrap with corporate alarm horn. Sound: `terminal_beep`.
- `corp_dissection_gurney` (H): Overhead articulated exam lamp `[0.5, 0.82, 0.5]` (`0xe2e8f0`, 0.9 int). Monitor beep. `[E] SCAN TISSUE SPECIMEN`: Medical analysis grants medkit + lore. Sound: `terminal_beep`.
- `corp_incinerator_hopper` (H): Fiery orange internal embers `[0.5, 0.35, 0.5]` (`0xf97316`, 1.2 int, flicker). Heat shimmer & black smoke. `[E] CYCLE INCINERATOR`: Burns bio-waste, granting 30s spore resistance. Sound: `crane_motor` + flame.

#### 2. Meridian Camp Cyber-Rites
- `meridian_cyber_graft_bench` (H): Cyan surgical task light `[0.5, 0.72, 0.5]` (`0x06b6d4`, 0.85 int). Tool sparks. `[E] ATTACH CYBER GRAFT`: +25% melee damage buff for 60s at cost of 10% movement slow. Sound: `power_hum` clamp.
- `meridian_mainframe_altar` (H): Altar candles + cyan terminal bank `[0.5, 0.68, 0.5]` (`0x38bdf8`, 1.1 int). Candle flicker + terminal hum. `[E] COMMUNE WITH MAINFRAME`: Reveals all room secrets in current chunk. Sound: `terminal_beep`.
- `meridian_servitor_dock` (H): Blue charge rails `[0.5, 0.65, 0.5]` (`0x2563eb`, 0.9 int). Electro-arcs. `[E] DRAIN RESERVE CHARGE`: Fully restores suit energy/ammo supply. Sound: `power_hum`.

#### 3. Tallow Camp & Gestation
- `tallow_compost_fermenter` (H): Murky green fermenter bubbles `[0.5, 0.55, 0.5]` (`0x65a30d`, 0.7 int). Spore vapor jet. `[E] TAP SLURRY`: Harvests high-grade stimulant (+25 scrap). Sound: `steam_burst`.
- `tallow_spore_cradle` (H): Pulsing bio-cradle glow `[0.5, 0.45, 0.5]` (`0x84cc16`, 0.6 int). Spore motes. `[E] STERILIZE CRADLE`: Prevents spore eruption (+15 bio scrap). Sound: `flesh_seal`.
- `tallow_flesh_trellis` (H): Vascular red-green pulse `[0.5, 0.6, 0.5]` (`0x16a34a`, 0.65 int). Resin drips. `[E] PRUNE TRELLIS`: Yields sticky resin glue traps. Sound: `flesh_seal`.
- `tallow_sacrificial_altar` (H): Braziers + blood channel glow `[0.5, 0.5, 0.5]` (`0xdc2626`, 0.95 int). Low smoke. `[E] MAKE BLOOD OFFERING`: Sacrifices 1 heart for +50% weapon damage for 90s. Sound: `flesh_seal`.

#### 4. Vesper Iron Guild
- `vesper_amputation_rig` (H): Red blood-lamp `[0.5, 0.78, 0.5]` (`0xb91c1c`, 0.85 int). Tool sparks. `[E] SALVAGE TRAUMA KIT`: Grants emergency surgical bundle (+30 scrap). Sound: `crane_motor` saw.
- `vesper_autocannon_bipod` (H): Ammo feed indicator `[0.5, 0.62, 0.5]` (`0xf59e0b`, 0.7 int). Barrel smoke. `[E] FIRE DEFENSIVE BURST`: Discharges turret burst into hallway, shredding oncoming hostiles. Sound: `explosion`.
- `vesper_hanging_cage` (H): Red cage latch diode `[0.5, 0.45, 0.5]` (`0xef4444`, 0.6 int). Chain creak. `[E] UNLOCK CAGE`: Drops cage with heavy clang; drops survivor scrap bundle. Sound: `vault_open`.
- `vesper_reloading_station` (H): Tungsten work lamp `[0.5, 0.72, 0.5]` (`0xfde047`, 0.8 int). Primer press sound. `[E] PRESS MUNITIONS`: Converts raw scrap into full ammunition clip. Sound: `crane_motor`.

#### 5. Mayor Tina Story Props
- `tina_molted_carapace` (H): Phosphor chitin dust `[0.5, 0.5, 0.5]` (`0xa3e635`, 0.5 int). Dry motes. `[E] SCAN MOLT`: Reveals Mayor Tina narrative entry + chitin lore. Sound: `terminal_beep`.
- `tina_mimic_vanity` (H): Fluorescent vanity bulb row `[0.5, 0.75, 0.5]` (`0xf1f5f9`, 0.95 int). Mirror reflection ripple. `[E] INSPECT COSMETICS`: Discovers Tina's discarded human skin mask (+30 scrap). Sound: `glass_chime`.
- `tina_trophy_trove` (H): Golden display case lights `[0.5, 0.68, 0.5]` (`0xfbbf24`, 0.85 int). Case halo. `[E] LOOT TROPHY TROVE`: High-value unique relic drop (+50 scrap). Sound: `vault_open`.

#### 6. PregAlien Hive Visceral Props
- `hive_visceral_ovipositor` (H): Deep scarlet glandular glow `[0.5, 0.7, 0.5]` (`0xe11d48`, 0.9 int). Amniotic slime jet. `[E] JAM OVIPOSITOR`: Suppresses egg laying in sector. Sound: `flesh_seal`.
- `hive_vivisected_engineer` (H): Cyan life-support ECG monitor `[0.5, 0.65, 0.5]` (`0x06b6d4`, 0.75 int). Monitor heartbeat tick. `[E] TERMINATE SUFFERING`: Reclaims reactor security keycard (+40 scrap). Sound: `terminal_beep`.
- `hive_gestation_sac` (H): Amber egg womb pulse `[0.5, 0.5, 0.5]` (`0xf59e0b`, 0.7 int). Mucus drip. `[E] EXCISE EMBRYO`: Extracts biological tissue sample safely. Sound: `flesh_seal`.
- `hive_pulmonary_bellows` (H): Pink lung tissue contraction glow `[0.5, 0.6, 0.5]` (`0xf43f5e`, 0.8 int). Wet mist breathing. `[E] CLAMP AIRWAY`: Disables spore circulation in adjacent rooms. Sound: `steam_burst`.
- `hive_amniotic_feeder_trough` (H): Green bile surface glow `[0.5, 0.35, 0.5]` (`0x84cc16`, 0.75 int). Slime bubbles. `[E] CONTAMINATE TROUGH`: Poisons feeding swarm, causing local hive enemies to take 2x damage. Sound: `water_drain`.

#### 7. Cryo District Brutality
- `cryo_ruptured_pod` (H): Cyan cryo fluid pool `[0.5, 0.45, 0.5]` (`0x38bdf8`, 0.85 int). Frozen vapor. `[E] SEARCH OCCUPANT`: Recovers dogtags and cold-preserved supplies (+25 scrap). Sound: `flesh_seal`.
- `cryo_cannibal_butchery_table` (H): Amber kerosene lantern `[0.5, 0.72, 0.5]` (`0xd97706`, 0.9 int, flicker). Lantern smoke. `[E] TAKE RATIONS`: Restores 1 full heart at the cost of narrative sanity. Sound: `flesh_seal`.
- `cryo_ice_core_specimen` (H): Cyan subsurface ice light `[0.5, 0.65, 0.5]` (`0x0ea5e9`, 0.85 int). Core frost motes. `[E] ANALYZE CORE`: Reveals prehistoric hive infection layer (+30 scrap). Sound: `terminal_beep`.
- `cryo_thawing_trough` (H): Amber heating pilot coil `[0.5, 0.4, 0.5]` (`0xf97316`, 0.8 int). Warm steam. `[E] WARM EXTREMITIES`: Removes cryo slowdown and heals 10 HP. Sound: `steam_burst`.
- `cryo_frozen_shelter_pod` (H): Dying emergency beacon ember `[0.5, 0.6, 0.5]` (`0xef4444`, 0.5 int). Frost breath. `[E] PRY EMERGENCY HATCH`: Finds frozen scout's thermal flare (+20 scrap). Sound: `vault_open`.

#### 8. Chasm & Industrial Props
- `chasm_suicide_ledge_cross` (H): Memorial candle glow `[0.5, 0.5, 0.5]` (`0xf59e0b`, 0.7 int, warm flicker). Wind motes. `[E] READ INSCRIPTION`: Unlocks fallen comrade lore and marks a hidden stash. Sound: `wind_chime`.
- `chasm_dredge_hook_crane` (H): Yellow safety strobe `[0.5, 0.88, 0.5]` (`0xeab308`, 1.1 int). Heavy cable hum. `[E] HOIST DREDGE CRANE`: Drags sunken salvage crate out of the void (+45 scrap). Sound: `crane_motor`.
- `ind_hydraulic_manifold` (H): Pressure dial backlight `[0.5, 0.6, 0.5]` (`0x0284c7`, 0.75 int). Steam hiss. `[E] VENT PRESSURE`: Clears scalding steam traps from corridor. Sound: `steam_burst`.
- `ind_fuel_rod_cask` (H): Radiation warning amber strobe `[0.5, 0.7, 0.5]` (`0xf59e0b`, 1.0 int). Reactor hum. `[E] EXTRACT FUEL ROD`: High-yield energy cell reward (+50 scrap). Sound: `vault_open`.

---

### Batch C: 2026-10-11 World-Completion Remaining Models (31 Models)

- **Bunker Daily Life & Services**:
  - `life_pallet_racking` (H): Dust motes. `[E] SEARCH PALLET`: Controlled supply drop roll (+20 scrap).
  - `life_server_racks` (H): Blue LED blink `[0.5, 0.7, 0.5]` (`0x38bdf8`, 0.6 int). Fan hum. `[E] ACCESS LOGS`: Sector map download.
  - `life_transformer_bank` (H): Red fault lamp `[0.5, 0.65, 0.5]` (`0xef4444`, 0.8 int). Arc sparks. `[E] RESET BREAKER`: Energizes local room power.
  - `life_fire_station` (H): Red cabinet beacon `[0.5, 0.75, 0.5]` (`0xdc2626`, 0.7 int). `[E] BREAK GLASS`: Emergency health stimulant.
  - `life_conveyor_section` (H): Yellow run lamp `[0.5, 0.5, 0.5]` (`0xfacc15`, 0.6 int). `[E] START CONVEYOR`: Moves cargo, exposing hidden parts (+25 scrap).
  - `life_cistern_tank` (H): Cyan water level backlight `[0.5, 0.6, 0.5]` (`0x38bdf8`, 0.7 int). `[E] PURIFY WATER`: Clears toxins & restores 15 O2.
  - `life_scaffold_tower` (H): Work lamp `[0.5, 0.85, 0.5]` (`0xfef08a`, 0.8 int). `[E] SEARCH TOOL TRAY`: Hardware salvage (+15 scrap).
  - `life_forklift` (H): Amber beacon `[0.5, 0.75, 0.5]` (`0xf59e0b`, 0.9 int). `[E] RAISE FORKS`: Lifts crate barricade, opening alternative doorway.
  - `life_sink_row` (H): Water drips. `[E] WASH CONTAMINATION`: Cleanses light bio grime.
  - `life_shower_stall` (H): Steam spray `[0.5, 0.8, 0.5]`. `[E] RUN DECON SHOWER`: Full status scrub once per visit.
  - `life_laundry_machines` (H): Amber cycle light. `[E] CHECK DRUM`: Finds forgotten currency/scrap (+15 scrap).
  - `life_weight_bench` (H): No light. `[E] TRAIN`: +10% stamina buff for 60s.
  - `life_filing_cabinets` (H): No light. `[E] SEARCH PERSONNEL FILES`: Lore dossier + security codes.
  - `life_overseer_desk` (H): Desk green lamp `[0.5, 0.65, 0.5]`. `[E] INSPECT LEDGER`: Marks high-value reward cache.
  - `life_planning_board` (H): Pin illumination. `[E] STUDY PATROL ROUTE`: Highlights enemy patrol paths.
  - `life_algae_tank` (H): Green bubbling vat `[0.5, 0.55, 0.5]` (`0x22c55e`, 0.85 int). `[E] HARVEST OXYGEN`: Restores 40 O2.

- **Cryo, Hive, Crash & Camps**:
  - `cryo_ice_crawler` (H): Cyan high-beam headlights `[0.5, 0.65, 0.7]` (`0x7dd3fc`, 1.2 int). `[E] SIPHON FUEL`: +25 fuel scrap.
  - `cryo_frozen_cascade` (A): Subsurface ice caustics. Ambient visual only.
  - `cryo_snowbound_crates` (H): Frost glint. `[E] BREAK ICE CRATES`: Salvage pickup (+20 scrap).
  - `cryo_ice_blocks` (H): Ice glow. `[E] CHIP MELTWATER`: +15 O2.
  - `hive_resin_pillar` (H): Green vein glow `[0.5, 0.6, 0.5]` (`0x4ade80`, 0.8 int). `[E] TAP RESIN`: Yields biological adhesive.
  - `hive_cocooned_crew` (H): Cocoon pulse `[0.5, 0.5, 0.5]`. `[E] CUT COCOON`: Frees survivor remains (+30 scrap).
  - `hive_pheromone_node` (H): Green spore glow `[0.5, 0.65, 0.5]`. `[E] MASK ODOR`: 30s enemy stealth detection reduction.
  - `hive_tendril_arch` (A): Organic muscular pulse. Walkable gateway framing.
  - `hive_assimilated_generator` (H): Sickly green sparks `[0.5, 0.6, 0.5]` (`0x84cc16`, 1.0 int). `[E] OVERCHARGE`: Massive EMP pulse.
  - `crash_engine_nacelle` (H): Orange turbine embers `[0.5, 0.5, 0.5]` (`0xf97316`, 1.1 int). `[E] SALVAGE TURBINE`: +35 alloy scrap.
  - `crash_hull_panels` (H): Dust motes. `[E] PRY HULL PANEL`: Scrap recovery (+20 scrap).
  - `crash_drag_chute` (A): Fluttering nylon fabric. Ambient landmark.
  - `salvage_tagged_heap` (H): Amber locator tag `[0.5, 0.5, 0.5]`. `[E] SORT SALVAGE`: Mixed resource loot bundle.
  - `camp_canvas_tent` (H): Warm lantern interior `[0.5, 0.45, 0.5]` (`0xfbbf24`, 0.9 int). `[E] REST AT TENT`: Restores 25 HP outside combat.
  - `camp_water_barrel` (H): Water ripples. `[E] REFILL FLASK`: O2 recovery & thirst quench.

---

## Phased Implementation Roadmap

### Wave A: Pass 2 Flagship Story & Industrial Props (6 Models)
- Implement `bay_c_pod_312_rupture`, `chen_sealed_confession_console`, `decon_exosuit_scrubber_station`, `engineer_wave_relay_dynamo`, `evac_four_seat_cockpit_module`, `tank_orbital_siege_cannon`.
- Source practical lights in `propFx.js`, interactions in `propInteractions.js`, audio hooks, and tests in `propInteractions.test.js` & `propFx.test.js`.

### Wave B: Pass 2 Bio & Cryo Organics (7 Models)
- Implement `queen_royal_brood_throne`, `carapace_sentry_chrysalis`, `royal_egg_clutch_caul`, `vass_acoustic_resonator_tank`, `vass_hybrid_embryo_incubator`, `suture_mercy_cocoon_canopy`, `relay_false_beacon_spire`.
- Bio-fluid bubbles, resonant sound pulses, royal jelly mechanics, cocoon medical healing.

### Wave C: Pass 2 Evac & Heavy Infrastructure (6 Models)
- Implement `corp_biometric_collar_chute`, `crawler_signal_antenna_rig`, `evac_manifest_allocation_terminal`, `evac_preflight_fuel_umbilical`, `scout_tracking_beacon_core`, `sector_zero_bore_drillhead`.
- Collar overrides, radar sweeps, drilling breaches, and rocket fuel drainage.

### Wave D: Pass 1 Corporate, Meridian, Tallow & Vesper (14 Models)
- Complete remaining World-Story Pass 1 props.

### Wave E: Pass 1 Hive, Cryo Brutality & Chasm (14 Models)
- Complete remaining Pass 1 visceral hive and chasm props.

### Wave F: 2026-10-11 Daily Life, Camps & Cleanup (31 Models)
- Finalize all remaining service, daily life, and ambient props across the complete inventory.

---

## Verification & Acceptance Checklist

1. **Light Count & Pool Discipline**:
   - `threeGame.js` visible point-light pool strictly stays within 8 practicals.
   - Zero point-light shadows enabled.
   - Lights extinguish completely when prop enters `spent` or `off` mode.
2. **Interaction Correctness**:
   - Every interactive prop has an authored `[E] VERB` label and corresponding localized message.
   - Repeatable props toggle states; one-shot props persist across chunk reloads using stable coordinates.
   - Collision boundaries update immediately for doors/hatches/barriers.
3. **Automated Test Coverage**:
   - `vitest run src/propInteractions.test.js`
   - `vitest run src/propFx.test.js`
   - `vitest run src/roomDressing.test.js`
   - Full suite `vitest run` passes 100%.
4. **Production Build**:
   - `npm run build` completes without warning or missing asset errors.
