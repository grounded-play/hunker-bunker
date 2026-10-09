# Whole-world prop interactivity and animation master plan — 2026-10-09

This is the catalog-wide companion to
`lived-in-world-pass-2-interactions-2026-10-09.md`. Its goal is a world where
machines visibly work, containers physically open, terminals acknowledge the
player, organic fixtures breathe, damaged props react, and scenery still
respects draw-call and update budgets.

## Scope and audit

The current `WORLD_3D_MODELS` catalog contains 205 environment models after
excluding modular tile kits, characters, enemies, weapons and ships. The
pass-2 registration landed while this audit was being written:

- 87 `prop_*` models;
- 79 `life_*` models across the first batch and pass 2;
- 10 base machinery/clutter models;
- 24 architecture, fixture and state models;
- 5 scatter/body models.

All 39 available pass-2 runtime derivatives are present. The missing
`life_hull_shard_smoldering` becomes environment asset 206 when it arrives.

## Implementation status

Wave 0 and the first Wave 1 presentation slice are now implemented:

- all 205 registered environment models resolve to an experience class;
- terminals, consoles, the Meridian radio, route table, assimilated desk and
  cochlear intercom use repeatable `[E]` interactions with immediate emissive
  acknowledgement and audio;
- per-instance state clones only emissive-capable materials, leaving shared
  geometry and textures intact;
- interactive and animated-FX dressing can leave static instancing under a
  hard 12-root-per-chunk budget;
- controllers, cloned materials, mixers, FX, lights and dynamic roots are
  registered and released with chunk/world lifecycle.

**2026-10-09 (later): first cut-out rigs.**

Four props now move for real. `scripts/blender/articulation_recipes.py` runs inside the pass-2 ingest and, for each recipe:
- selects the part by region in the import's coordinates;
- separates it into an `HB_*` node, with the origin on the hinge or shaft;
- leaves it in its rest pose: doors closed, rotors at zero;
- writes the motion into the node's glTF extras (`hb_motion`, `hb_axis`, `hb_open_angle`, `hb_open_offset`, `hb_duration`, `hb_speed`, `hb_bob`). gltfpack keeps them with `-kn -ke`.

The rigs:
- `life_ribcage_rescue_cabinet`: the rib door swings 90 degrees on its hinge and slides 7 cm clear of the cabinet's contents;
- `life_confessional`: both booth doors swing, about 94 and 96 degrees;
- `life_seismic_drill`: the auger bit spins and plunges;
- `life_ice_bore_winch`: the cable drum turns.

`src/propArticulation.js` reads those extras and drives the parts: named-node transforms, eased, reversible mid-swing, and idle once settled. `createPropExperience` toggles it on E. These four have `mechanism` experience profiles (dynamic roots) and E specs in `propInteractions.js`.

Non-blocking interactive props (wall fixtures) now get a non-solid interaction target, so E can find them.

Verified by `tests/e2e/probes/prop-articulation-captures.spec.js`, which captures each rig at rest and after E.

Still open:
- **`life_supply_drop_pod`:** its lid can't be cut cleanly by region, because body and lid overlap in every simple cut, and its closed pose isn't recoverable from the scan. It needs a hand pass in Blender.

---

Articulated doors, drawers, drill heads and winches remain Wave 2 work because
the delivered GLBs are single monolithic meshes with no authored clips or
named moving nodes. Their Blender authoring contract is specified below; the
runtime deliberately uses light/FX acknowledgement until those movable parts
exist rather than rotating an entire prop as a fake mechanism.

Current capability audit:

- 19 props have explicit custom interaction specs.
- 88 props have runtime FX recipes.
- Only `prop_biomech_spore_umbilical_cable_rigged` currently contains named
  animation clips. Nearly all other runtime props are monolithic scans.
- Static room dressing is instanced and has no per-item update.

## Definition of “interactive world”

Not every object should display an `[E]` prompt. Prompting on every chair, bolt
and wall would make useful interactions harder to find. Every asset instead
gets one or more behavior levels:

| Level | Meaning | Examples |
|---|---|---|
| **Use** | `[E]` changes gameplay and visual state | terminal, drill, locker, valve |
| **Inspect/search** | `[E]` gives story, loot or a small one-time response | corpse, crate, memorial |
| **Proximity-reactive** | responds without a prompt | lamp wakes, sensor tracks, pod hum rises |
| **Ambient** | continuous low-cost motion | fan, smoke, bubbles, cable sway |
| **Damage-reactive** | hit/break state is visible | barricade collapse, tank leak, egg rupture |
| **Structural** | intentionally still, but participates in light, dust, drips or damage | arch, pillar, breached wall |

The target is 100% classification, not 100% prompt coverage.

## One declarative registry

Create `src/propExperience.js` as the single source of truth. It supplements,
then eventually absorbs the visual-state portion of `propFx.js` and
`propInteractions.js` without moving gameplay rewards out of their tested
handlers.

```js
{
  type: 'prop_diagnostic_console',
  behaviors: ['use', 'proximity', 'ambient', 'damage'],
  interaction: {
    prompt: '[E] ACCESS DIAGNOSTIC CONSOLE',
    cooldown: 0.35,
    repeat: 'allowed'
  },
  motion: {
    mode: 'stateful',
    parts: ['HB_SCREEN', 'HB_DRAWER_00'],
    states: ['off', 'waking', 'ready', 'working', 'faulted']
  },
  presentation: {
    emissive: { off: 0.05, ready: 1.0, working: 1.8, faulted: 0.35 },
    color: { ready: 0x52ff9a, faulted: 0xef4444 },
    fx: { working: ['screen_scan'], faulted: ['sparks'] },
    audio: { enter: 'terminal_beep', loop: 'power_hum' }
  },
  persistence: 'run',
  dynamic: true,
  updateDistance: 18
}
```

Validation fails when a registered environment model has no profile and is not
explicitly marked `structural`. This prevents new art from silently entering
the game as a dead object.

## Runtime systems

### Interaction selection

- Keep the existing shared interact action and nearest-target resolver.
- Rank useful/quest interactions above inspect-only props.
- Show one prompt at a time, with gamepad cycling for overlaps.
- Use `HB_INTERACT_00` when authored; otherwise use the collider centre.
- Require line of sight for small props and the correct interaction side for
  doors, drawers, consoles and machinery.
- Add a 250 ms acknowledgement even when the gameplay handler opens a larger
  UI: emissive punch, button depression and sound should happen immediately.

### State and animation

Use one `PropMotionController` with these common states:

```text
off → waking → ready → working → complete
closed → opening → open → closing → closed
idle → reacting → idle
any state → damaged → broken
```

Recipes may omit states. Requests are idempotent, one-shot clips clamp at the
end, and interrupted transitions select an authored reverse clip or blend from
the current pose.

The controller can drive four motion backends:

1. **GLB clips** for hinged doors, lids, drawers, tool arms and complex rigs.
2. **Named-node transforms** for rotors, valve wheels, needles and switches.
3. **Shader motion** for cloth, cables, liquid, flames, spores and soft tissue.
4. **Presentation-only fallback** for monolithic scans: emissive change, FX,
   audio and a tiny whole-object response. This is temporary for assets awaiting
   articulation, never a fake spinning whole drill.

### Materials and lights

- Clone only stateful emissive materials per dynamic instance; keep all other
  geometry, textures and materials shared.
- Change emissive intensity/color and fixed-pool source intensity. Do not toggle
  real light visibility or create new shader light-count variants.
- Broken/off states dim or color-shift instead of recompiling materials.
- Prewarm every stateful material once under the loading cover.

### Static/dynamic rendering split

- Instanced static props remain in `buildRoomDressingGroup`.
- Stateful pieces are extracted through `DYNAMIC_DRESSING_TYPES` and spawned as
  standalone roots at the same deterministic transforms.
- Shader-ambient motion may remain instanced when all copies share phase logic;
  use an instance seed/phase attribute to stop synchronized motion.
- Cap standalone dynamic dressing at 12 roots per chunk and 4 simultaneously
  updating articulated props inside 18 m. Completed poses need no mixer update.

### Save, co-op and teardown

- Save only meaningful irreversible state: searched, opened, looted, bypassed,
  harvested, complete and broken.
- Derive powered/ambient state from room, camp, objective and world state.
- Host sends `{stableId, state, revision, startedAt}`; clients reconstruct the
  appropriate pose/time.
- On unload: stop mixers and audio loops, remove mixer listeners, unregister
  source lights, dispose FX-owned GPU resources and release per-instance
  material clones.

## Existing base machinery and clutter — 10 assets

| Asset | Intended behavior |
|---|---|
| `base_console` | **Use:** screen wakes, keys depress, status glow follows the opened console UI. |
| `o2_generator` | **Use/ambient:** valve turns, fans start, gauges rise, cyan lamp and steam show output. |
| `hull_matrix` | **Use:** clamps cycle and diagnostic strips travel while repairs execute. |
| `radar` | **Use/ambient:** dish or scanner rotates during a sweep; screen line and lamp acknowledge results. |
| `fusion_generator` | **Use/ambient:** core brightens, rings/rotors spin under load, alarm state flashes red. |
| `storage_locker` | **Search:** door opens, shelf contents become visible, stays open/looted. |
| `frozen_tanker` | **Use:** valve turns and hose shudders; frost/steam and gauge indicate siphoning. |
| `basic_pile` | **Search:** small rummage/settle response and persistent searched state. |
| `bunker_junk_rare` | **Search/damage:** one-time salvage with small loose-part settle. |
| `bunker_junk_uncommon` | **Search/damage:** one-time salvage with small loose-part settle. |

## Existing general, technical and medical props — 26 assets

| Assets | Intended behavior |
|---|---|
| `prop_bunker_supplies`, `prop_ammo_crate_stack` | **Search:** lid/latches open; contents dim or disappear after loot. |
| `prop_surgical_cart`, `prop_maintenance_tool_cart` | **Search/use:** one drawer opens; indicator acknowledges; cart remains looted. |
| `prop_medical_bed`, `prop_biomech_triage_cradle` | **Use/proximity:** restraints or cradle arms settle around occupant; medical lights sequence. |
| `prop_diagnostic_console`, `prop_fabricator_workstation`, `prop_vital_monitor` | **Use:** screen wakes/glows, controls depress, working and fault colors follow gameplay UI/state. |
| `prop_specimen_tank`, `prop_broken_specimen_tank` | **Inspect/ambient/damage:** bubbles and liquid move; inspection brightens the tank; broken tank drips. |
| `prop_security_barricade`, `prop_conduit_hub` | **Damage/use:** barricade deforms/collapses; conduit switch or panel changes powered state. |
| `prop_laser_trap_emitter`, `prop_base_defense_turret` | **Use/proximity/damage:** arm/disarm, aim/track, charge light, recoil and broken settle. |
| `prop_o2_filter_vat` | **Use/ambient:** bubbles/agitation rise while filtering; valve/gauge follows output. |
| `prop_tesla_coil_node` | **Use/ambient/damage:** charge sequence, bounded arcs, discharge and fault sparks. |
| `prop_body_empty_exosuit`, `body_empty_exosuit` | **Inspect/search:** helmet/chest lamp response; no idle “living” motion. |
| `prop_body_human_frozen`, `body_frozen_human` | **Inspect:** frost motes and story readout only; bodies remain still. |
| `prop_autopsy_dissection_slab` | **Use:** tool arm/tray moves during the existing biopsy interaction. |
| `prop_decon_eyewash_shower_station` | **Use:** chain pulls, valves open and shower/water FX run for a bounded duration. |
| `prop_exosuit_docking_gantry` | **Use:** clamps close, charge lights travel, then release after charging. |
| `prop_oxygen_bottle_cascade_rack` | **Use/damage:** valve turns, gauge falls and controlled steam differs from rupture. |
| `prop_floor_conduit_bridge` | **Use/damage:** breaker lever changes position; arcs stop or intensify based on result. |
| `prop_coolant_drum_leaking_pool` | **Use/damage:** siphon hose/valve reacts; liquid ripples and freeze burst on destruction. |

## Existing biomechanical and cave props — 29 assets

| Assets | Intended behavior |
|---|---|
| `prop_biomech_flesh_locker` | **Search:** sphincter/door opens, wet glow dims after loot. |
| `prop_biomech_incubator` | **Use/ambient:** membrane/lid opens or tightens; liquid, bubbles and pulse continue. |
| `prop_biomech_neural_synapse` | **Proximity/ambient:** impulses travel toward nearby actors; stronger pulse on interaction. |
| `prop_biomech_respirator` | **Ambient/use:** bellows breathe; valve responds to oxygen interaction. |
| `prop_biomech_sphincter_trap` | **Proximity/damage:** opens to lure, snaps shut, relaxes or remains broken. |
| `prop_biomech_arch` | **Structural/ambient:** subtle vein pulse only; no prompt. |
| `prop_cave_queen_throne` | **Inspect/proximity:** localized pulse and queen/lore acknowledgement. |
| `prop_cave_bones`, `prop_hive_carapace_molt` | **Inspect/search:** small story/salvage response; otherwise still. |
| `prop_hive_resin_sac` | **Use/damage/ambient:** breathes and bubbles; extraction deflates it; rupture collapses it. |
| `prop_cave_eggs_intact`, `scatter_hive_eggs` | **Proximity/damage:** twitch when approached; hatch or rupture into a persistent state. |
| `prop_cave_eggs_hatched` | **Ambient:** residual membrane twitch/spores; no prompt. |
| `prop_cave_webs` | **Proximity/damage:** stretch when crossed and recoil when cut. |
| `prop_cave_hive_wounded` | **Ambient/damage:** slow wounded contraction and fluid response. |
| `prop_cave_spores`, `prop_spore_colony`, `prop_cave_lichen` | **Ambient/proximity:** drifting spores and soft bioluminescent response. |
| `prop_flesh_steel_coffin`, `prop_flesh_steel_cradle` | **Inspect/use:** lid/restraints move only for authored events or loot; otherwise pulse subtly. |
| `prop_flesh_steel_inhaler` | **Use/ambient:** nozzle/valve moves and mist runs for the interaction window. |
| `prop_fungal_mycelium_loom` | **Ambient/use:** shuttle/tendril cycle with a green work pulse. |
| `prop_fungal_resin_basin` | **Use/ambient:** liquid ripples/bubbles and level/emissive responds to extraction. |
| `prop_fungal_spore_dispenser` | **Use/ambient:** iris/nozzle opens and releases a bounded spore cloud. |
| `prop_fungal_tendril_altar` | **Proximity/ambient:** tendrils orient slightly and pulse during ritual interaction. |
| `prop_biomech_sphincter_hatch_vent` | **Use:** aperture closes/seals for the existing bio-foam interaction. |
| `prop_biomech_spore_umbilical_cable`, `prop_biomech_spore_umbilical_cable_rigged` | **Reactive/combat:** retain authored sway, anticipation, strike and sever clips. |
| `prop_biomech_tracheal_wall_pipe` | **Use/ambient:** peristaltic pulse and tap valve response. |
| `prop_vertebral_cable_riser` | **Use/ambient:** cable/nerve pulse travels upward during the existing jack-in interaction. |

## Existing camp props — 13 assets

| Assets | Intended behavior |
|---|---|
| `prop_camp_cookfire`, `prop_camp_cookfire_lit` | **Use/ambient:** ignition/dousing state, flame/smoke/light response and persistent camp condition. |
| `prop_camp_crates`, `prop_camp_crate` | **Search:** hinged lid or latch, contents/looted state. |
| `prop_camp_sandbags` | **Damage:** compress/settle and collapse when camp defences fail. |
| `prop_camp_cot`, `prop_camp_bedrolls` | **Use/proximity:** rest prompt only where rest is legal; small fabric settle. |
| `prop_camp_meridian_radio` | **Use/ambient:** dial/button response, tuning glow and radio waveform. |
| `prop_camp_laundry` | **Ambient:** phase-offset cloth sway; stronger outdoors. |
| `prop_camp_shutter_lockdown` | **Stateful:** physically closes/opens with camp lockdown state. |
| `prop_camp_warning_placard` | **Inspect:** readable acknowledgement/highlight, no mechanical motion. |
| `prop_camp_bunker_supplies` | This name is not registered; use `prop_bunker_supplies` rather than create an alias. |
| `prop_camp_cookfire` variants | Doused/burning are one semantic object; transition instead of model pop once authored. |

## Existing ruined industrial and cathedral props — 32 assets

| Assets | Intended behavior |
|---|---|
| `prop_chair_operator_wrecked` | **Inspect/reactive:** chair rocks once on contact, then settles. |
| `prop_conduit_junction_box` | **Use/damage:** cover opens, breaker changes position, fault sparks respond. |
| `prop_icey_frost_manifold`, `prop_icey_frost_vent` | **Use/ambient:** valve/fan state controls steam and frost pulse. |
| `prop_icey_thermal_pod` | **Use:** pod lid/door opens, interior wakes, closes after service if appropriate. |
| `prop_light_cluster_dripping` | **Ambient/damage:** irregular emissive flicker and drips; broken state goes dark. |
| `prop_locker_bulged` | **Search/reactive:** strained door opens partway or bursts; persistent opened state. |
| `prop_pipe_rupture` | **Ambient/use:** steam jet and valve/seal response; intensity follows repair state. |
| `prop_shrine_plinth_broken` | **Inspect:** lore/salvage response with dust motes; remains structurally still. |
| `prop_storage_drum_dented` | **Search/damage:** lid or bung turns; dented body only rocks on impact. |
| `prop_terminal_ruptured` | **Use/damage:** failed screen acknowledgement, sparks and brief glitch—not a normal terminal UI. |
| `prop_valve_wheel_fused` | **Use:** failed strain animation/sound or eventual forced turn when an objective allows it. |
| `prop_vent_grate_exploded` | **Ambient:** dust/steam from opening; no prompt unless it becomes a traversal entrance. |
| `prop_ceiling_crane_hoist` | **Use:** trolley/chain/hook perform the existing crane operation. |
| `prop_exhaust_blower_fan_hood` | **Use/ambient:** fan accelerates/decelerates and steam direction/intensity changes. |
| `prop_floor_drainage_sump_trough` | **Use/ambient:** grate/handle reacts, liquid churns then clears/dims. |
| `prop_liturgical_terminal_lectern` | **Use:** scripture screen blooms, controls depress and telemetry state turns green. |
| `prop_pipe_organ_heat_exchanger` | **Use/ambient/damage:** valves/bellows move; steam changes for bypass versus rupture. |
| `prop_corporate_saint_reliquary` | **Use:** biometric scan, doors unlock/open, interior relic glow, persistent looted state. |
| `prop_votive_candle_shrine` | **Use/ambient:** offering brightens flames/light; rejected offering gives a small red response. |
| `prop_overhead_cage_fluorescent` | **Ambient/damage:** ballast flicker with stable powered and broken states. |
| `prop_wall_cable_tray_swag` | **Ambient/damage:** shader/node cable sway; hit causes a damped impulse and sparks. |
| `prop_maintenance_tool_cart` | Covered above; drawers must visually match the existing one-time search. |
| `prop_autopsy_dissection_slab` | Covered above; tool animation matches biopsy duration. |
| `prop_decon_eyewash_shower_station` | Covered above; chain, valve and bounded spray. |
| `prop_exosuit_docking_gantry` | Covered above; clamp and charge cycle. |
| `prop_floor_conduit_bridge` | Covered above; breaker and arc state. |
| `prop_oxygen_bottle_cascade_rack` | Covered above; valve/gauge and controlled vent. |
| `prop_biomech_sphincter_hatch_vent`, `prop_biomech_tracheal_wall_pipe`, `prop_vertebral_cable_riser` | Covered above; preserve their existing gameplay interactions. |

## Existing first-batch lived-in assets — all 40

| Asset | Intended behavior |
|---|---|
| `life_mess_table` | **Inspect:** dishes/cups clink or shift; small lived-in story response. |
| `life_bunk_stack` | **Use/ambient:** legal rest interaction; curtain/bedding settle. |
| `life_galley_hotplate` | **Use/ambient:** knob turns, element/flame brightens, steam/heat responds. |
| `life_card_table` | **Inspect:** cards/chips highlight or shift; optional camp dialogue hook. |
| `life_memorial_board` | **Inspect:** focused lamp and memorial text/audio; persistent viewed flag only if needed. |
| `life_hydro_rack` | **Use/ambient:** pump/bubbles cycle; plant/organic sway. |
| `life_water_still` | **Use/ambient:** tap/valve turns, water level/ripples/bubbles respond. |
| `life_suit_drying_rack` | **Use/ambient:** fan starts and hanging suit/hoses sway. |
| `life_latrine_stall` | **Inspect/use:** door moves and occupancy state is respected; no reward spam. |
| `life_barrel_heater` | **Use/ambient:** ignite/douse, door/damper and heat light respond. |
| `life_route_map_table` | **Use:** map illuminates, marker/sweep travels, route UI opens. |
| `life_reloading_bench` | **Use:** vise/press cycles and task light intensifies during reload service. |
| `life_covered_stretcher` | **Inspect:** cover/buckle response only; remains respectful and mostly still. |
| `life_pipe_hammock` | **Use/ambient:** legal rest prompt; damped fabric swing. |
| `life_flood_lamp_tripod` | **Use/proximity:** aim/brightness state and subtle warm-up flicker. |
| `life_vending_machine` | **Use:** buttons press, selection light travels, dispenser door moves. |
| `life_cargo_pallet_netted` | **Search:** net/latch loosens and a persistent searched state appears. |
| `life_footlocker_open` | **Search:** contents rummage/shift; already-open geometry remains open. |
| `life_tally_bulkhead` | **Inspect:** raking light reveals marks; no mechanical motion. |
| `life_mask_rack` | **Search/inspect:** one mask/hose moves or is removed; rack remains. |
| `life_infusion_cradle` | **Use/ambient:** clamps/tubing pulse and fluid bubbles during treatment. |
| `life_sanitation_bidet` | **Use:** valve/nozzle and bounded water FX; cooldown prevents spam. |
| `life_sleep_sleeve` | **Use/ambient:** membrane/door opens, closes around rest, slow breathing pulse. |
| `life_pheromone_censer` | **Use/ambient:** valve/lid responds and scented smoke strengthens. |
| `life_ammo_ovipositor` | **Use/ambient:** aperture opens and dispensing pulse matches ammo service. |
| `life_sensory_chair` | **Use:** restraints/sensor arms settle and lights sequence around a service. |
| `life_resin_extractor` | **Use/ambient:** pump/press cycles, liquid bubbles and level responds. |
| `life_umbilical_tether` | **Use/ambient:** connector twitches and pulse travels along cable. |
| `life_vulval_drain_sump` | **Use/ambient:** drain aperture/valve and liquid swirl respond. |
| `life_tactile_console` | **Use:** keys/membrane depress, surface glow follows UI state. |
| `life_scent_distiller` | **Use/ambient:** valves/condensate/bubbles cycle during extraction. |
| `life_bone_clamp_rig` | **Use:** clamp opens/closes and work lamp follows medical/crafting state. |
| `life_fuel_probe_boom` | **Use:** boom/needle/valve moves and gauge follows transfer. |
| `life_warmth_hearth` | **Use/ambient:** iris/damper and fire intensity follow heating state. |
| `life_peristaltic_feeder` | **Use/ambient:** peristaltic wave and valve/nozzle response. |
| `life_pelvic_autopsy_trough` | **Use/ambient:** drain/tool response and liquid ripple; no gratuitous motion. |
| `life_acoustic_ear_horn` | **Use:** horn pivots/listens, waveform/glow and audio cue acknowledge. |
| `life_stigmata_inscriber` | **Use:** tool descends/traces during service, then retracts. |
| `life_lung_filter_bellows` | **Ambient/use:** bellows breathe; rate and steam respond to filtration state. |
| `life_vertebral_restraint_rack` | **Use/damage:** restraints open/close for the authored interaction; broken state slackens. |

## Incoming pass-2 assets — all 39 available GLBs

| Asset | Intended behavior |
|---|---|
| `life_cochlear_intercom` | **Use/proximity:** button press, amber-to-green acknowledgement and voice/radio response. |
| `life_ceiling_collapse` | **Structural/proximity:** dust trickle and occasional pebble fall; no prompt. |
| `life_ribcage_rescue_cabinet` | **Search:** paired doors open and red ready lamp becomes green/dim. |
| `life_checkpoint_post` | **Inspect/use:** log/pen micro-motion and lamp acknowledgement. |
| `life_pneumatic_tube_node` | **Use/ambient:** valve/capsule cycle, chase light and brief steam. |
| `life_janitor_cart` | **Search/use:** wringer jaw/handle and one cabinet respond; bucket water ripples. |
| `life_wayfinding_totem` | **Proximity/use:** directional light wakes and route pulse points toward objective. |
| `life_dropped_kit_pile` | **Search:** flap/latch moves, contents dim after persistent loot. |
| `life_seismic_drill` | **Use:** startup, auger/pump loop, stop/complete, dust and amber-to-green lamp. |
| `life_supply_drop_pod` | **Search/use:** hatch/petals open if a convincing sealed pose can be authored; otherwise ship as already-open loot. |
| `life_colossal_limb` | **Landmark/ambient:** sparse motes and an extremely slow residual contraction only if it reads as biological, not alive. |
| `life_wind_mast` | **Ambient:** rotor spin, phase-offset windsock sway and red beacon. |
| `life_guide_rope_stakes` | **Ambient/proximity:** rope shader sway and damped impulse when brushed. |
| `life_fallen_comm_dish` | **Use/inspect:** salvage or partial re-aim motion; indicator acknowledges scan state. |
| `life_tarp_leanto` | **Ambient:** cloth flutter with sheltered interior lamp state. |
| `life_pipeline_trestle` | **Use/ambient:** valve/gauge/flow pulse; long segments otherwise remain instanced. |
| `life_ice_sled` | **Search/inspect:** strap or cargo cover response; persistent searched state. |
| `life_ice_core_rack` | **Use/search:** sample drawer/tube moves; cyan inspection lamp brightens. |
| `life_ice_bore_winch` | **Use:** winch/cable cycle with frost and cyan depth-lamp state. |
| `life_parka_hooks` | **Ambient/inspect:** cloth sway and warmer glow; no repeated reward. |
| `life_brood_comb` | **Ambient/damage:** brood pulse/twitch and rupture/deflation response. |
| `life_hive_dew_funnel` | **Ambient/use:** drip, liquid ripple and collection-valve response. |
| `life_hive_feeding_bladder` | **Ambient/use/damage:** breathes, feeds/pumps, then deflates or ruptures. |
| `life_assimilated_desk` | **Use/ambient:** screen wakes, controls depress, cables twitch and fault state sparks. |
| `life_fungal_cable_bundle` | **Ambient/damage:** cable shader sway, traveling pulse and damped hit response. |
| `life_ore_cart` | **Search/reactive:** cart rocks slightly, latch/contents respond, wheels remain stopped. |
| `life_drip_buckets` | **Ambient/use:** periodic drops, water rings and optional empty/collect state. |
| `life_rope_anchor_post` | **Ambient/reactive:** tensioned rope sway and impact impulse. |
| `life_confessional` | **Use:** paired doors open/close, niche lamp brightens and lore/recovery interaction runs. |
| `life_devotion_tree` | **Use/ambient:** wire/candle sway and offering light response. |
| `life_pew_segment` | **Use/reactive:** kneeler folds or seat creaks where sitting/prayer is allowed. |
| `life_barber_chair` | **Use:** pump/turn cycle tied to camp service. |
| `life_meat_smoking_rack` | **Ambient/stateful:** smoke/heat follows Tallow condition; hooks sway subtly. |
| `life_training_dummy` | **Damage-reactive:** hit reaction and damped return; damage marks can accumulate. |
| `life_lookout_perch` | **Ambient/stateful:** binocular sweep and signal lamp follow Meridian condition. |
| `life_welding_station` | **Use:** tool arm moves, bounded sparks and task light during service. |
| `life_exosuit_teardown` | **Use/ambient:** tool/gantry response and inspection lights during service. |
| `life_fuse_bypass_panel` | **Use/damage:** lever throw, red fault to green bypass, sparks stop on success. |
| `life_pod_seat_row` | **Ambient/inspect:** red emergency flicker and oxygen-mask/harness sway. |

When `life_hull_shard_smoldering` arrives: **ambient/damage** with embers, smoke,
heat shimmer and a dimming/extinguished state.

## Architecture, fixtures, state and scatter — all 29 assets

| Assets | Intended behavior |
|---|---|
| `arch_bulkhead_frame` | **Structural:** inherits nearby door/power light state; otherwise still. |
| `arch_deco_archway_grand_01`, `arch_deco_archway_grand_02`, `arch_deco_archway_grand_03`, `arch_deco_archway_grand_04` | **Structural:** dust, drips or subtle vein light by biome; no prompt. |
| `arch_niche_shrine` | **Use/ambient:** candle/offer response and warm light. |
| `arch_pillar_buttress_01`, `arch_pillar_buttress_02`, `arch_pillar_buttress_03`, `arch_pillar_buttress_04` | **Structural/damage:** impact dust and damage state only. |
| `arch_rib_ceiling_vault_01`, `arch_rib_ceiling_vault_02`, `arch_rib_ceiling_vault_03` | **Structural/ambient:** sparse drips/motes; never per-frame articulated. |
| `arch_window_stained` | **Structural/light-reactive:** transmitted/glow intensity follows room power. |
| `fixture_clock_dead` | **Inspect/reactive:** tap produces a single hand twitch/click, then remains dead. |
| `fixture_sconce_vine` | **Ambient/damage:** flame/light flicker and extinguished state. |
| `state_barricade_improvised_1`, `state_barricade_improvised_2` | **Damage-reactive:** staged collapse/debris pose and persisted broken state. |
| `state_growth_overrun_1`, `state_growth_overrun_2` | **Ambient/damage:** shader pulse, hit recoil and burned/cut state. |
| `state_column_shattered`, `state_wall_breached_01`, `state_wall_breached_02`, `state_wall_breached_03` | **Structural:** falling dust and impact response; no prompt. |
| `scatter_bolts` | **Search/pickup:** small salvage pickup where enabled; otherwise instanced/static. |
| `scatter_cable_coil` | **Reactive/search:** damped coil response and salvage where enabled. |

## Implementation waves

### Wave 0 — enforce catalog coverage

1. Add `propExperience.js` schema, validation and generated coverage report.
2. Classify all 205 assets using this document.
3. Add showroom filters: use, inspect, ambient, proximity, damage, structural,
   needs-rig and motion-ready.
4. Add state buttons and display missing-node/clip diagnostics per asset.

### Wave 1 — immediate feedback without new rigs

Ship the behavior every monolithic model can support now:

- E acknowledgement glow/color pulse;
- existing gameplay handler dispatch;
- FX enable/disable/intensity states;
- audio acknowledgement;
- tiny damped whole-object reaction only where physically plausible;
- save/co-op state and completed/broken material state.

Prioritize all terminals, consoles, lamps, shrines and existing 19 interaction
specs. This delivers “press E and the terminal glows” before articulation work.

### Wave 2 — container and door factory

Curate Blender parts/pivots and clips for lockers, crates, cabinets, pod,
confessional, thermal pod, flesh locker, reliquary, coffin, cradle, vending
machine, latrine, sleep sleeve and camp shutter. Reuse one open/close runtime
recipe while keeping asset-specific angles and timing in the manifest.

### Wave 3 — machinery factory

Author rotors, augers, valves, gauges, levers, clamps and tool arms for base
machinery, drills, winches, vents, pumps, medical rigs, welding/fabrication and
camp services. Continuous loops update only inside the activity radius.

### Wave 4 — organic and flexible motion

Prefer shared shader/node systems over unique clips for breathing, peristalsis,
spores, liquid, cables, cloth and hanging objects. Preserve the authored rigged
umbilical combat controller as the reference exception.

### Wave 5 — placement and authored vignettes

Place the pass-2 corridor/outdoor/room/camp assets, then revisit older kits so
every room contains at least one active focal prop, one ambient secondary prop
and intentional static negative space. Never sacrifice reachability.

### Wave 6 — damage, persistence and co-op completion

Add staged break poses, late-join restoration, save migration and teardown
coverage. Finish with the whole-world performance and interaction audit.

## Acceptance criteria

- Every environment model has a validated experience profile or explicit
  structural exemption.
- Every terminal/console gives visual and audio acknowledgement within one
  rendered frame of an accepted E interaction.
- Every gameplay container visibly changes from unsearched to searched.
- Every powered machine communicates off, working, complete and faulted states
  wherever those states exist in gameplay.
- No prop promises motion its GLB cannot perform; the showroom exposes the
  missing authoring requirement.
- Only the nearest prompt is shown, and quest/service targets outrank inspect
  props.
- Static dressing remains instanced; active dynamic-root and mixer caps hold.
- Shader program count does not grow when states change or 20 chunks stream.
- Save/co-op restoration produces the correct final pose and lamp state.
- Chunk unload returns controller, mixer, audio-loop, geometry and material
  counts to baseline.
- Steam Deck p95 frame time does not regress after the full pass.

## First executable slice

Implement in this order while the pass-2 ingest continues:

1. `propExperience.js` registry, validator and showroom diagnostics.
2. Generic E acknowledgement for `base_console`, `prop_diagnostic_console`,
   `prop_fabricator_workstation`, `life_tactile_console`,
   `prop_liturgical_terminal_lectern`, `life_route_map_table` and
   `life_assimilated_desk` when it lands.
3. Dynamic-dressing extraction and controller lifecycle.
4. Rescue cabinet open/search, seismic drill active cycle and confessional
   doors as the first curated Blender rigs.
5. Apply the proven recipes family-by-family through the complete matrix.
