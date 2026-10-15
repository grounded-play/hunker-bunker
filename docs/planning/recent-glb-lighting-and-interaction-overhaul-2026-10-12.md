# Recent GLB lighting and interaction overhaul — 2026-10-12

## Implementation status

Wave 0 and the first 12-prop vertical slice are now implemented in runtime:

- all 12 have bounded FX/light recipes and per-instance experience profiles;
- all 12 have bespoke actions, named state, positional feedback, and either a
  repeatable toggle or a one-shot reward protected by the existing spent key;
- barrier and iris actions change collision state;
- named state survives chunk unload/reload for the current run;
- bespoke interactables receive the per-chunk dynamic slots before ambient
  props, while the cap remains 12 and the renderer light pool remains eight;
- automated coverage verifies the profiles, actions, state application,
  shadowless practical lights, disposal path, and existing light budget.

Still pending from the full plan: Blender-authored `FX_*` empties and `HB_*`
moving-part cuts in the source GLBs, host-authoritative co-op state replication,
placement-level prompt-density flags, and Waves 2–4.

## Decision

Process the 79 world-completion and world-story GLBs added on 2026-10-11 and
2026-10-12 in four implementation waves. Every model gets an explicit
classification, but not every model gets an `E` prompt:

- **Hero interactable:** a unique, readable action with persistent state,
  feedback, and (where appropriate) a destruction consequence.
- **Ambient reactive:** source-matched glow/light/particles and passive motion;
  it may react to damage or proximity but does not compete for the interaction
  prompt.
- **Static landmark:** collision, placement, and material/emissive cleanup only.

This avoids turning ordinary scenery into an interaction menu while giving the
functional and story-heavy models the treatment already used by the older
biomechanical props.

The model-level inventory below identifies 73 types with a worthwhile authored
action, five ambient-only types, and one static landmark. That does **not** mean
every placed copy becomes interactive: authored actions are enabled only on a
room signature, vignette member, service placement, or explicit
`interactionEnabled` placement. Decorative duplicates use the same lighting
and passive response but stay out of prompt selection.

## Audit result

- Scope: **79 GLBs** (`39` from commit `58f5e570`, `40` from `91ec86c6`).
- All 79 are registered in `WORLD_3D_MODELS`, the debug showroom, and
  `DRESSING_TRIANGLES`.
- At audit time all 79 had no bespoke entry in `PROP_FX_PROFILES`; the first 12
  now do.
- At audit time all 79 had no bespoke entry in `PROP_INTERACTION_SPECS`; the
  first 12 now do.
- The 2026-10-11 plan promises articulated conveyor rollers, forklift forks,
  laundry drums, filing drawers, and a surgical lamp arm. None is present in
  `articulation_recipes.py`.
- The plan also promises a fluttering tent flap. `flutter_recipes.py` currently
  covers only `life_wind_mast` and `life_tarp_leanto`.
- Current infrastructure is reusable: `FX_*` authored anchors with normalized
  fallbacks, `HB_*` motion metadata, `propFx`, `propExperience`, the custom prop
  interaction registry, per-run spent keys, and the fixed eight-slot
  environmental light pool.

## Runtime rules

1. **Lights originate at the visible source.** Add `FX_LIGHT_00` at the lamp,
   screen, beacon, flame, fluid, or bioluminescent organ—not at model center.
   Add `FX_GLOW_00` at the same source so the model still reads when its pooled
   light is not the nearest eligible light.
2. **Keep the fixed light pool.** Prop lights remain hidden source records and
   feed the existing eight always-visible `PointLight` slots. Never add/remove
   live renderer lights during play. No prop point light casts a shadow; nearby
   surfaces receive real illumination, while contact and silhouette are carried
   by baked AO and emissive/glow presentation.
3. **One practical per prop; one prop practical per active room.** Small status
   LEDs are emissive/glow only. A pooled light is reserved for a source that
   should visibly illuminate nearby geometry: lamps, flames, large screens,
   beacons, tanks, and powerful organs.
4. **FX are state-bound.** A switched-off heater loses flame, glow, light, and
   hum together. A breached tank changes from contained bubbles to leaking
   vapor; it does not keep playing the intact loop.
5. **Interaction state is authoritative.** One-shot rewards use the stable
   scatter key, survive chunk unload/reload, and cannot be farmed. In co-op the
   host resolves rewards and broadcasts the prop state (`idle`, `working`,
   `open`, `spent`, `disabled`, or `destroyed`).
6. **Motion follows the model.** Use `HB_*` articulation for doors, lids,
   rollers, rotors, clamps, levers, forks, and winches. Use shader motion for
   cloth, breathing membranes, fluid, and subtle organic pulsing.
7. **Feedback is layered but short.** Every successful action gets a model
   response, source-local positional sound with pitch variation, a brief
   emissive acknowledgement, and only high-impact actions get particles or
   camera trauma.
8. **Prompt discipline.** Repeatable toggles say what the next action does
   (`START`, `STOP`, `OPEN`, `CLOSE`). One-shot props disappear from prompt
   selection after use. Ambient-only props never receive a generic switch just
   because they have FX.
9. **Interaction density is placement-driven.** Permit at most one primary and
   one secondary prop interaction in an ordinary room. Story vignettes may have
   up to three when their actions form one authored beat. Other copies of a
   hero-capable model are ambient/damage-reactive only.

## Required system work before model waves

### A. Make interactions drive explicit prop states

Extend the interaction result from a bare boolean to a small result object while
retaining boolean compatibility:

```js
{ success: true, state: 'open', fxMode: 'open', rewardResolved: true }
```

`interactWithCustomProp` applies the result to `propExperience`, `propFx`, prompt
text, collision, persistence, and co-op replication. This prevents the current
blanket `acknowledge()` behavior from blindly toggling every articulated part.

### B. Add named FX modes

Keep the current recipes, but let one profile expose modes such as `idle`,
`working`, `open`, `fault`, and `spent`. A mode may change effect visibility,
light intensity/color, pulse rate, and model breathing. Reuse the same GPU
resources; do not rebuild effects on every interaction.

### C. Add a recent-prop behavior manifest

Create one data table keyed by model type with:

- classification (`hero`, `ambient`, `static`);
- interaction radius and prompt/action id;
- initial and terminal state;
- persistence and co-op policy;
- collision override by state;
- FX profile/mode and authored anchor requirements;
- articulation requirement and expected `HB_*` nodes;
- destruction behavior and reward ceiling.

Generate coverage tests from this table so none of the 79 models silently falls
back to an accidental generic interaction.

### D. Fix spatial feedback

Route new prop sounds through `game.audioAt(x, z, ...)`; the current helper in
`propInteractions.js` plays several sounds non-positionally. Reuse the existing
audio catalog first. Add new clips only where the action cannot be expressed by
the existing motor, steam, metal, organic, alarm, terminal, and electrical sets.

### E. Budget active effects

Continue the 18–24 m distance cutoff and fixed light pool. Add a camera-sorted
cap for particle-bearing prop FX so a dense authored room cannot activate every
steam/spore/spark emitter at once. Flames, liquid surfaces, emissive materials,
and articulation remain visible; low-priority motes and particles yield first.

## Model plan: 2026-10-11 world-completion batch (39)

Legend: **H** hero interactable, **A** ambient reactive, **S** static landmark.

### Bunker infrastructure and daily life

| Model | Tier | Source lighting / ambient response | Unique action and GLB work |
|---|---:|---|---|
| `life_pallet_racking` | H | No cast light; dust only | **Search manifest pallet** once for a bounded salvage roll. Animate one crate latch only if separable; otherwise emissive acknowledgement is enough. |
| `life_server_racks` | H | Amber drive LEDs, cool screen glow, quiet fan loop; one low-power pooled screen light | **Download local topology** once: reveal nearby room/route data. Add `HB_FAN_*` spin only where fan geometry separates cleanly. |
| `life_transformer_bank` | H | Red fault lamp, intermittent sparks, transformer hum; pooled warning light | **Reroute power**: lever changes `idle ↔ working`, wakes nearby powered prop FX, and carries a small shock consequence when damaged. Add `HB_LEVER_00`. |
| `life_fire_station` | H | Red cabinet beacon, no continuous particles | **Break glass / take emergency charge** once, spawning a bounded utility/health pickup. Add `HB_DOOR_00`; spent state leaves the door open and beacon dark. |
| `life_conveyor_section` | H | Amber run beacon; dust only while stopped | **Start/stop conveyor**. Add `HB_ROLLER_*` spin and bind motor audio/beacon to `working`. First delivery may expose one salvage item; later toggles are visual only. |
| `life_cistern_tank` | H | Cyan gauge glow and faint condensation; no light unless its gauge is large enough to cast | **Draw treated water** once per site: clear a biological slow/status and grant a small O2 recovery. Add valve turn if separable plus `FX_STEAM_00`/drip at the outlet. |
| `life_scaffold_tower` | H | Amber work lamp only when the model visibly contains one | **Search tool tray** once. Do not add fake climbing until vertical traversal supports it. Keep the tower a solid landmark. |
| `life_forklift` | H | Amber rotating beacon and exhaust puff; pooled beacon light | **Raise/lower forks**. Add `HB_FORKS_00` linear motion and a lever; collision follows the fork state only if it actually opens/closes a route. |
| `life_sink_row` | H | Drips and a short water stream during use; no cast light | **Wash contamination** with a short cooldown; clears eligible organic status only. Add faucet handle articulation where possible. |
| `life_shower_stall` | H | Water/steam only while running; no cast light | **Run decon shower**: clear eligible organic/cryo status once per room visit, then enter cooldown. Add `FX_WATER_*` at the shower heads and drain. |
| `life_laundry_machines` | H | Amber cycle indicator and subtle steam | **Run abandoned cycle**: drum spins; first completed cycle exposes a forgotten scrap bundle, later cycles are presentation only. Add `HB_ROTOR_00` and door state if cleanly separable. |
| `life_weight_bench` | H | No cast light | **Train** once per site for a short knockback/melee-resistance buff. Use a concise exertion/metal response; no implausible machinery motion. |
| `life_arcade_cabinet` | H | Screen glow and amber marquee; pooled light only if the screen visibly lights the floor | **Play last recorded run**: one short terminal beat reveals lore and grants a modest temporary reload/handling buff. Add stick/button acknowledgement, not a new minigame. |
| `life_filing_cabinets` | H | No cast light | **Search personnel files** once for lore plus a small chance of salvage. Add one `HB_DRAWER_00`; leave it open in the spent state. |
| `life_overseer_desk` | H | Desk lamp/screen glow if present | **Inspect ration/debt ledger** once, revealing a nearby cache or story marker. Add a drawer only if the source contains a clean separable drawer. |
| `life_planning_board` | H | Marker/status pin emissive only | **Copy patrol plan** once: reveal nearby rooms or the next exact interaction anchor on the compass. No moving part required. |
| `life_algae_tank` | H | Green liquid surface, bubbles, slow pulse; pooled green tank light | **Harvest oxygenated culture** once for O2; destruction releases a slippery/poison cloud instead. Author water, bubble, glow, and light anchors. |
| `life_surgical_lamp` | H | Warm-white practical at the actual lamp head; cone halo plus pooled light | **Aim lamp / toggle**. Add `HB_ARM_00` hinge and bind light position to the moving head so illumination follows the source. |

### Cryo district

| Model | Tier | Source lighting / ambient response | Unique action and GLB work |
|---|---:|---|---|
| `cryo_ice_crawler` | H | Cyan headlamp, cold exhaust, frost motes; pooled headlamp light | **Siphon heater fuel** once for salvage and briefly wake the lamp/engine. A later full driving mechanic is out of scope. |
| `cryo_frozen_cascade` | A | Cold vapor and subtle cyan ice caustic/glow | No prompt. It is wall ambience and a damage-reactive ice shedding effect only. |
| `cryo_snowbound_crates` | H | Cyan frost glint, breath-like vapor; no cast light | **Break ice seals / search** once. Leave a cracked/spent presentation; no repeat reward. |
| `cryo_heater_station` | H | Amber heating element, heat shimmer/steam, pooled warm light | **Warm up / shut down**. Working state clears chill/slow and grants brief cold resistance; off state loses heat FX and hum. Add switch/valve articulation. |
| `cryo_ice_blocks` | H | Cyan subsurface glow only; no point light | **Cut meltwater** once for a small O2 recovery. Short ice-chip burst and saw sound; the stack remains as scenery. |

### Hive and bio district

| Model | Tier | Source lighting / ambient response | Unique action and GLB work |
|---|---:|---|---|
| `hive_resin_pillar` | H | Green resin glow, slow drips and pulse; pooled light | **Tap resin vein** once for salvage, with a deterministic chance to alert/spawn nearby enemies. Add tap/drip anchor, not a fake machine control. |
| `hive_cocooned_crew` | H | Green cocoon pulse and spores; small pooled glow | **Cut survivor/cache free** once. Resolve a fixed rescue-or-remains result from the placement seed, then leave the cocoon ruptured. Add membrane split/hinge only if feasible. |
| `hive_brood_dome` | H | Breathing membrane, green inner glow/spores; pooled light | **Cauterize brood** once to suppress its destruction-spawn consequence; shooting an untreated dome releases adds. Author breathe and rupture modes. |
| `hive_pheromone_node` | H | Green sensory pulse and spores; pooled light | **Mask scent** once for a short aggro/detection-radius reduction. Destroying it instead creates a lure pulse. |
| `hive_tendril_arch` | A | Slow muscular pulse and green sensory node | No prompt. Preserve its walk-through pillar collision; proximity can flex the tendrils without changing navigation. |
| `hive_assimilated_generator` | H | Green electrical glow, organic breathing, occasional sparks; pooled light | **Purge / overcharge**: one interaction wakes nearby powered objects and grants a short electric benefit; destruction causes an electric/bile burst. Add rotor or valve only if separable. |

### Crash site, chasm, and camps

| Model | Tier | Source lighting / ambient response | Unique action and GLB work |
|---|---:|---|---|
| `crash_engine_nacelle` | H | Ember glow, smoke, leaking sparks; pooled ember light | **Close fuel valve and salvage** once. If destroyed before shutdown, produce a bounded fire explosion; add valve articulation and distinct safe/spent FX modes. |
| `crash_hull_panels` | H | No cast light; occasional settling dust | **Pry open panel** once for salvage. Add a short panel hinge only where topology permits. |
| `crash_drag_chute` | A | Wind flutter and dust; red locator blink if visibly present | No normal prompt. Add `HB_FLUTTER_chute`; allow damage to cut/collapse it without a reward loop. |
| `salvage_tagged_heap` | H | Amber claim tag glow only | **Verify tags / salvage** once for a controlled mixed pickup. Retain the heap in a visibly searched state. |
| `chasm_gondola` | A | Amber cabin lamp and slow cable sway; pooled light | No prompt while it remains unreachable void scenery. Reserve **call gondola** for a later traversal feature with a real docking path. |
| `chasm_broken_catwalk` | S | Optional end sparks if exposed cable exists | No prompt and no fake traversal. Keep it as ledge silhouette/hazard dressing. |
| `chasm_rappel_anchor` | H | Red locator blink, rope sway; pooled light only at close range | **Secure line** once to reveal/mark a lower cache or safe ledge route. Actual vertical travel is deferred until supported. |
| `chasm_beacon_post` | H | Rotating red beacon with source halo and pooled light | **Retune beacon** to mark the nearest chasm objective/ledge route. Add `HB_ROTOR_00`; toggle changes pulse cadence and prompt. |
| `camp_canvas_tent` | H | Warm interior lantern and cloth flutter; pooled warm light | **Rest** only when local safety rules allow it. Add the missing flap `HB_FLUTTER_*` recipe; do not make the tent a universal combat heal. |
| `camp_water_barrel` | H | Cyan water surface/drips; no cast light unless a lamp exists | **Wash/refill** once per camp visit, sharing the status-clear/O2 service contract with the cistern at reduced strength. Add tap/valve motion if cleanly separable. |

## Model plan: 2026-10-12 world-story batch (40)

Every model in this batch was authored around one explicit accent source. Each
gets an authored `FX_GLOW_00`; large sources also get `FX_LIGHT_00`.

### Corporate Horizon atrocities

| Model | Tier | Source lighting / ambient response | Unique action and GLB work |
|---|---:|---|---|
| `corp_interrogation_chair` | H | Red cranial-control diode, brief electrical arc | **Extract burned memory** once: take a small health/O2 risk to reveal a security cache or local map datum. Add `HB_BRACE_00` and restraint twitch; damage discharges shock. |
| `corp_debt_severing_kiosk` | H | Amber scanner/status screen and blade-ready pulse | **Spoof liquidation record** once for corporate salvage with an alarm consequence. Add `HB_BLADE_00`/clamp motion; never animate it into the player. |
| `corp_dissection_gurney` | H | Amber instrument lamp, cold drip/monitor tick | **Run tissue scan** once for lore plus a modest medical pickup. Add `HB_LAMP_00` or instrument arm if separable. |
| `corp_executive_sarcophagus` | H | Red biometric seal and low inner glow; pooled light | **Decrypt/open director vault** once. Add `HB_LID_00`; forced destruction gives the same bounded loot but triggers patrol/alarm. |
| `corp_incinerator_hopper` | H | Amber pilot flame, ember light, smoke; pooled light | **Cycle incinerator** to burn nearby infestation and grant short spore protection. Add `HB_HATCH_00`; working mode has flame/motor, open mode does not. |
| `corp_suppression_barrier` | H | Red warning bar and alarm pulse; pooled light | **Raise/lower barrier**. Add barrier slide/hinge, update collision with state, and replicate state in co-op. Destruction permanently opens it. |

### Meridian rites

| Model | Tier | Source lighting / ambient response | Unique action and GLB work |
|---|---:|---|---|
| `meridian_cyber_graft_bench` | H | Cyan task light and occasional tool sparks; pooled light | **Apply field graft** once for a heal/temporary handling buff at a small contamination cost. Add `HB_TOOL_ARM_00`. |
| `meridian_mainframe_altar` | H | Cyan monitor, candle smoke/flames, terminal hum; pooled cyan light | **Commune with mainframe** once: reveal exact nearby anchors and grant a short critical/scan buff. Add screen acknowledgement and optional offering-drawer motion. |
| `meridian_capacitor_bomb` | H | Amber charge pulse, arcing sparks, rising whine; pooled light | **Disarm capacitor** once for high-value salvage. Destruction before disarm causes EMP/shock damage; spent state is dark and inert. Add `HB_SWITCH_00`. |
| `meridian_servitor_dock` | H | Cyan charge rails and status display; pooled light | **Drain reserve charge** once for ammo/O2 support. Add `HB_CLAMP_*`; empty state retracts clamps and dims the dock. |

### Tallow spore camp

| Model | Tier | Source lighting / ambient response | Unique action and GLB work |
|---|---:|---|---|
| `tallow_compost_fermenter` | H | Green bubbling slurry, spores, pressure breath; pooled glow | **Tap fermenter** once for nutrient/medical value with a poison/spore risk. Add valve turn plus liquid, bubble, and vent anchors. |
| `tallow_spore_cradle` | H | Slow breathing, green cradle glow and spores | **Sterilize/extract sample** once, preventing its damage-triggered hatch and granting salvage. Use breathe plus opened/ruptured state, not a generic switch. |
| `tallow_flesh_trellis` | H | Green vascular pulse, dripping fluid, spores | **Prune symbiotic growth** once for resin; action briefly emits a vulnerability cloud affecting nearby enemies and player alike. Add cut reaction, no machinery articulation. |
| `tallow_sacrificial_altar` | H | Green/amber offering glow and low smoke; pooled light | **Make blood offering** once: trade one heart for a strong time-limited combat buff. Reject safely at one heart. Add acknowledgement pulse only. |

### Vesper Iron Guild

| Model | Tier | Source lighting / ambient response | Unique action and GLB work |
|---|---:|---|---|
| `vesper_amputation_rig` | H | Red surgical lamp and tool sparks; pooled light | **Salvage trauma kit** once with a brief saw/arm cycle and controlled self-damage risk. Add `HB_TOOL_ARM_00`/`HB_SAW_00`. |
| `vesper_autocannon_bipod` | H | Amber sight/muzzle status, smoke after firing; pooled light only at sight | **Load and fire defensive burst** at nearby enemies, consuming a bounded ammo/scrap cost and entering cooldown. Add yaw/pitch joints and `HB_ROTOR_00`; host resolves targets. |
| `vesper_hanging_cage` | H | Red lock diode, slow cage sway; small pooled light | **Open cage** once. Seeded content resolves to survivor remains, salvage, or threat; add `HB_DOOR_00` and persistent open state. |
| `vesper_reloading_station` | H | Amber work light and press indicator; pooled light | **Press field ammunition** as a repeatable paid service with a cooldown and strict exchange rate. Add `HB_PRESS_00`/handle; no free infinite ammo. |

### Mayor Tina story props

| Model | Tier | Source lighting / ambient response | Unique action and GLB work |
|---|---:|---|---|
| `tina_molted_carapace` | H | Amber locator/gland glow, dry motes | **Scan molt** once to reveal Tina-specific lore/nearby story anchor and grant brief chitin insight. No mechanical motion. |
| `tina_covert_nursery_chest` | H | Green seam pulse, quiet breathing/spores | **Open nursery chest** once. Seeded result is contraband loot or a hatch threat; add `HB_LID_00` and open/ruptured modes. |
| `tina_mimic_vanity` | H | Cyan mirror/sensor glow; pooled light | **Run identity mirror** once: exposes the disguised-subject record and marks a hidden cache/story beat. Add a short mirror ripple/acknowledgement, not a character spawn. |
| `tina_trophy_trove` | H | Amber tag/case light; pooled light only if a lamp exists | **Loot trophies** once for valuable salvage and a deterministic alert. Add case/locker opening if separable. |

### PregAlien hive

| Model | Tier | Source lighting / ambient response | Unique action and GLB work |
|---|---:|---|---|
| `hive_visceral_ovipositor` | H | Green gland pulse, dripping amniotic fluid/spores; pooled light | **Jam egg line** once to suppress local add generation; failure/damage causes an egg/bile burst. Add peristaltic shader motion and valve contraction if separable. |
| `hive_vivisected_engineer` | H | Green life-support pulse, breath/steam and monitor tick | **Extract engineering override** once, ending the rig cycle and revealing reactor access/lore. Add restraint/tool twitch only if source topology allows it. |
| `hive_gestation_sac` | H | Inner green glow, bubbles, breathing membrane; pooled light | **Extract larval sample** once; destruction of an untreated sac spawns an add. Use contained, opened, and ruptured FX modes. |
| `hive_pulmonary_bellows` | H | Green vascular pulse, breath mist, wet contraction | **Clamp airflow** to disable nearby spore vents or grant a temporary clean-air/O2 benefit. Add `HB_BELLOWS_00` scale/hinge motion and repeatable open/closed state. |
| `hive_amniotic_feeder_trough` | H | Green rim light, liquid surface, bubbles/drips; pooled light | **Poison/bait trough** once so nearby hive enemies gain chitin vulnerability. Add liquid, bubble, glow, and drip anchors. |
| `hive_sphincter_iris` | H | Green sensor node and muscular pulse; pooled light | **Open/close living iris**. Author radial `HB_IRIS_*` motion or a validated scale blend, update collision, and replicate it. Forced destruction leaves it permanently open with acid spill. |

### Cryo brutality

| Model | Tier | Source lighting / ambient response | Unique action and GLB work |
|---|---:|---|---|
| `cryo_ruptured_pod` | H | Cyan fluid pool, cold vapor, drip; pooled light | **Thaw/search occupant** once for a medical or lore pickup at an O2/time cost. Add fault-to-spent vapor modes; no lid motion is required if already ruptured. |
| `cryo_cannibal_butchery_table` | H | Amber lantern flame, smoke and warm pool; pooled light | **Take emergency ration** once for one-heart healing with an explicit narrative consequence. Author flame/smoke/light anchors. |
| `cryo_ice_core_specimen` | H | Cyan base lamp, ice glow, slow bubbles/frost; pooled light | **Scan core specimen** once to reveal a hive/story anchor and lore. Add scan pulse; breaking it releases a cryo shock and larval threat. |
| `cryo_thawing_trough` | H | Amber pilot flame, water surface, steam; pooled warm light | **Warm extremities** once per room visit to clear chill/slow and heal a limited amount. Add burner and liquid anchors plus a valve toggle. |
| `cryo_frozen_shelter_pod` | H | Dying red flare ember and cold breath; small pooled red light | **Search stranded scout** once for a flare/cache and story log. Ember extinguishes in spent state. |

### Chasm and industrial set pieces

| Model | Tier | Source lighting / ambient response | Unique action and GLB work |
|---|---:|---|---|
| `chasm_hanging_elevator` | A | Red emergency beacon, slow cable/car sway; pooled light | No prompt while unreachable. If placed at a dock later, promote to **call elevator** only with authored path/collision support. |
| `chasm_suicide_ledge_cross` | H | Amber candle/memorial glow and wind motes; pooled light | **Read tags / pay respects** once to reveal a final-drop lore beat and mark a nearby recovery cache. No moving machinery. |
| `chasm_dredge_hook_crane` | H | Red work beacon and motor sparks; pooled light | **Raise dredge cache** once, then allow repeatable empty hook motion. Add `HB_WINCH_00` and hook translation; host owns the spawned salvage. |
| `ind_biomass_grinder` | H | Amber run beacon, wet spray/smoke while active; pooled light | **Start/stop grinder**. Add counter-rotating `HB_ROTOR_*`; working intake damages nearby enemies, while destruction causes shrapnel/bile burst. |
| `ind_hydraulic_manifold` | H | Amber gauges, steam leaks and pressure pulse | **Vent/bypass pressure** to disable nearby steam hazards and expose a salvage valve. Add `HB_VALVE_00`; bind steam to pressure state. |
| `ind_fuel_rod_cask` | H | Amber warning lamp plus contained reactor glow; pooled light | **Stabilize and extract cell** once for high-value salvage. Destroying an unstable cask creates radiation/fire damage. Add `HB_CLAMP_*` or lid if separable. |
| `crash_cockpit_canopy` | H | Red emergency light, smoke and dashboard sparks; pooled light | **Pry canopy / recover flight cache** once. Add `HB_CANOPY_00` if topology permits; open state reveals the interaction anchor and extinguishes the alarm after recovery. |

## Delivery waves

### Wave 0 — contracts, audits, and tooling

1. Add the recent-prop behavior manifest and coverage test for all 79 models.
2. Add structured interaction results, named FX modes, collision-by-state, and
   host-authoritative `prop-interacted` replication.
3. Expand the FX anchor authoring manifest and add an audit that fails when a
   declared anchor or `HB_*` node is missing from the shipped GLB.
4. Produce front/side/three-quarter audit renders for every articulation
   candidate before writing geometry selection recipes.
5. Add a debug-showroom overlay for type, current state, anchor positions,
   active light source, interaction radius, and collision.

### Wave 1 — prove the full stack on 12 high-value models

Implement first:

- `life_arcade_cabinet`
- `life_surgical_lamp`
- `cryo_heater_station`
- `hive_brood_dome`
- `chasm_beacon_post`
- `corp_executive_sarcophagus`
- `corp_suppression_barrier`
- `meridian_capacitor_bomb`
- `tina_covert_nursery_chest`
- `hive_sphincter_iris`
- `ind_biomass_grinder`
- `crash_cockpit_canopy`

This slice covers terminal use, pooled light, flame/heat, organic breathing,
rotor/hinge/slide articulation, collision changes, one-shot rewards,
destruction alternatives, persistence, and co-op state.

### Wave 2 — camps, daily life, and services

Process the remaining camp, bunker daily-life, Meridian, Tallow, and Vesper
service props. Prioritize tent flutter, conveyor/forklift/laundry/filing motion,
water/decon contracts, and bounded repeatable services.

### Wave 3 — bio, cryo, crash, and hazard props

Process the remaining organic, cryogenic, crash, and industrial models. Bind
contained/open/ruptured FX states and test every destruction consequence against
enemy, player, and co-op ownership rules.

### Wave 4 — ambient landmarks and cleanup

Finish unreachable chasm pieces, frozen cascade, tendril arch, drag chute,
broken catwalk, and any model rejected for articulation. Tune source anchors,
emissive strength, collision, LOD/effect distance, and room-density budgets in
the museum and representative seeded rooms.

## Verification and acceptance criteria

### Automated

- All 79 types have an explicit classification; no accidental generic switch.
- Every hero type has an interaction spec, experience profile, stable prompt,
  persistence policy, and tests for insufficient-resource/failure paths.
- Every declared source light resolves to an authored `FX_LIGHT_00` or an
  intentional normalized fallback.
- Every declared motion node and its glTF extras survive export, meshopt, and
  KTX2 conversion.
- Visible renderer light count remains fixed at eight as props toggle, load,
  unload, break, and change modes.
- Open barrier/iris collision clears; closed collision blocks; remote peers
  receive the same state.
- One-shot rewards cannot repeat after chunk unload/reload or remote replay.
- Destruction and interaction cannot both pay the full reward.
- Prop FX and experience resources dispose on chunk/model replacement.

### Visual/playtest

- Light lands on nearby floor/walls from the visible bulb, screen, flame, or
  organ in all four camera rotations.
- A powered-off source never leaves a lit pool or looping sound behind.
- Prompts select the intended prop when several props overlap and update their
  verb after a state change.
- Every action reads without HUD text: moving part, light/FX change, local
  sound, and short acknowledgment all agree.
- Dense rooms stay within the particle cap and do not create frame-time spikes
  on the Steam Deck target profile.
- Static landmarks remain prompt-free and do not block intended walk-through
  openings or floor routes.

## Explicit non-goals for this pass

- No new arcade minigame.
- No drivable forklift/crawler.
- No fake chasm travel from models that are currently unreachable scenery.
- No point-light shadow cubemaps on the new props.
- No free repeatable resource faucets.
- No interaction added solely because a model happens to glow.
