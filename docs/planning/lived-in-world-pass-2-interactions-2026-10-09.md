# Lived-in world pass 2 — placement and interactive motion plan — 2026-10-09

This plan extends `lived-in-world-pass-2-2026-10-09.md` after the prop GLBs
began arriving. It covers placement, stateful doors/hatches, powered machinery,
reactive lights, ambient loops, persistence, co-op and asset-authoring gates.

The whole-catalog behavior inventory and rollout are defined in
[`world-prop-interactivity-master-plan-2026-10-09.md`](world-prop-interactivity-master-plan-2026-10-09.md).
That document covers the 166 existing environment models as well as all 39
available pass-2 GLBs, so this pass does not stop at the new assets.

## Audit snapshot

- 39 of the 40 planned raw GLBs are present in
  `art/source/3d/raw-masters-2026-10-09/`.
- `life_hull_shard_smoldering` (#80) is still missing.
- All 39 available runtime derivatives are now present in
  `public/3d/runtime/new3ds/`. The readiness gate remains necessary for future
  replacements, articulated revisions and the missing hull shard.
- The inspected interactive candidates import as one mesh named `node_0`, with
  no armature, child nodes or animation clips.
- Separating by loose geometry is not safe: the cabinet, drill, pod, winch and
  confessional contain about 1,500–7,000 disconnected islands each.
- The current ingest script exports with `export_animations=False`.
- Room dressing is currently rendered as static `InstancedMesh` batches. An
  individual door or drill inside such a batch cannot animate independently.

These constraints mean that genuine moving doors and drill bits require a
curated Blender part/pivot pass. Whole-prop rotation is not an acceptable
substitute.

## Player-facing rules

1. Motion communicates state. A drill spins only while working; a cabinet door
   remains open after it has been searched; red changes to green only after the
   interaction succeeds.
2. Every interaction has anticipation, action and settle: lamp response and a
   short mechanical twitch, the main motion, then a readable final pose.
3. Ambient motion stays quiet. Windsocks, cables, smoke and biological pulse
   should not compete with enemies or interaction prompts.
4. Stateful props use the existing interact input and targeting system. No new
   control is introduced.
5. Static clutter remains instanced. Only props with per-instance state leave
   the static batch.

## Authoring contract

### Required named nodes

Use only the nodes needed by an asset:

| Purpose | Name |
|---|---|
| Static remainder | `HB_STATIC` |
| Left/right door | `HB_DOOR_L`, `HB_DOOR_R` |
| Hatch or petal | `HB_HATCH_00` (increment suffixes) |
| Drill/auger | `HB_AUGER` |
| Rotor/anemometer | `HB_ROTOR` |
| Winch drum | `HB_WINCH` |
| Lever/switch | `HB_SWITCH` |
| Reactive arm/tool | `HB_TOOL` |
| Cloth/cable | `HB_FLEX_00` |
| Stateful lamp mesh | `HB_LAMP_00` |
| Interaction point | `HB_INTERACT_00` empty |

Door pivots sit on their hinges. Rotors and winches use their true axis. Every
moving node has applied scale, a stable local origin and no negative scale.

### Clip names

Stateful GLBs use a small common vocabulary:

- `idle` — optional non-state-changing loop;
- `activate` — one-shot startup;
- `active_loop` — repeat while powered;
- `deactivate` — one-shot shutdown;
- `open` and `close` — one-shot door/hatch motion;
- `hit_react` — optional one-shot reaction.

Clips contain only the nodes they own. First and last poses are deliberate;
`LoopOnce` actions clamp at their final frame. Stateful clips must not autoplay
merely because they are the first clip in a GLB.

### Lights and effects

Keep the existing `FX_*` anchor convention. Add anchors where appropriate:

- `FX_LIGHT_00`, `FX_GLOW_00`;
- `FX_SMOKE_00`, `FX_STEAM_00`, `FX_SPARKS_00`;
- `FX_WATER_SURFACE`, `FX_BUBBLE_VOLUME`.

Lamp state changes use per-instance cloned emissive materials. Point-light
sources remain bookkeeping inputs to the fixed eight-light pool; `.visible`
is never toggled to indicate a state.

### Ingest changes

Extend `ingest_lived_in_props_20261009.py` with an explicit per-asset motion
manifest. For stateful assets it must:

- preserve named nodes, pivots and animations;
- export animations;
- retain names through gltfpack (`-kn`);
- validate required nodes and clips before replacing a runtime GLB;
- reject cameras, authoring lights, missing textures, duplicate clip names and
  invalid/non-finite bounds;
- produce an audit JSON containing triangle count, texture dimensions, nodes,
  clips, duration and file size.

Static assets keep the current optimized path and do not pay an animation cost.

## Runtime architecture

Create a focused `propMotion.js` module rather than adding asset-specific
branches throughout `threeGame.js`.

Each recipe declares:

```js
{
  mode: 'stateful' | 'ambient' | 'reactive',
  initial: 'closed',
  transitions: { closed: 'opening', opening: 'open' },
  clips: { opening: 'open', closing: 'close', active: 'active_loop' },
  lamps: { closed: 'red', active: 'amber', complete: 'green' },
  persistence: 'run' | 'derived' | 'none'
}
```

The controller owns its mixer/actions, transition completion listeners,
emissive channels, prop FX enablement and looping audio handle. It exposes
`request(state)`, `update(delta)`, `serialize()` and `dispose()`.

Use a small finite state machine:

```text
dormant/closed → activating/opening → active/open
active → deactivating → dormant
open → closing → closed
any powered state → broken
```

Invalid/repeated requests are idempotent. Delta is clamped. Mixers, listeners,
audio loops, cloned materials and FX resources are released on chunk unload.

### Static versus dynamic dressing

Add a `DYNAMIC_DRESSING_TYPES` registry.

- Static types continue through `buildRoomDressingGroup` and stay instanced.
- Dynamic types are omitted from the instance batch and created as standalone
  `createWorld3dModel` roots using the same deterministic item transform.
- The existing invisible dressing collider remains the gameplay owner. It
  holds the model/controller references and the stable dressing identity.
- Dynamic roots inherit chunk visibility and teardown.
- Start with a limit of 12 dynamic dressing roots per chunk. Placement planners
  count against this budget and degrade extra candidates to static props.

### Interaction, persistence and co-op

- Extend `PROP_INTERACTION_SPECS`; accepted gameplay interactions dispatch a
  visual-state request to the controller. A rejected interaction changes
  neither animation nor lamp state.
- Persist irreversible state by stable dressing ID: `opened`, `looted`,
  `activated`, `harvested`, `bypassed` or `broken`.
- Ambient state is derived from room/camp power and is not saved.
- The host is authoritative in co-op. Replicate compact `{id, state, revision}`
  updates; clients animate toward the new state and snap only when a late join
  restores a completed pose.
- Interaction prompts use the authored `HB_INTERACT_00` position when present,
  with the collider position as fallback.

## Motion and interaction matrix

### Tier 1 — author and wire first

| Asset | States and motion | Light/FX response | Placement/gameplay |
|---|---|---|---|
| `life_ribcage_rescue_cabinet` | closed → doors open → searched | red ready lamp → green open → dim searched | corridor wall; one-time supplies |
| `life_supply_drop_pod` | sealed → hatch/petals open → looted | amber locator blink → steady green → dim | FIELD/CRATER landmark; one-time cache |
| `life_confessional` | closed → doors open; optional close | amber niche lamp brightens while occupied | cathedral/chapel vignette; lore or short recovery interaction |
| `life_seismic_drill` | off → startup → auger/pump loop → stop/complete | amber pulse → green active; dust and small vibration | FIELD/CRATER; interact to run a short salvage cycle |
| `life_ice_bore_winch` | off → winch turns/cable moves → complete | cyan depth lamp brightens; frost/steam | cryo room/outdoor ice; water or coolant salvage cycle |
| `life_fuse_bypass_panel` | faulted → lever throw → bypassed | red flicker/sparks → stable green; sparks stop | engineering wall; local power interaction |
| `life_welding_station` | idle → arm/tool startup → welding loop → idle | amber work lamp plus bounded weld sparks | workshop/engineering; activated by service/workbench use |
| `life_pneumatic_tube_node` | idle → rattle/valve cycle → delivered | amber chase/pulse and brief steam | corridor wall; message/lore or small delivery |

The supply-pod source appears authored as already split open. Before rigging,
review whether its petals can form a convincing closed pose. If not, keep it as
an open/looted environmental pod and reserve a new sealed variant for the true
opening interaction.

### Tier 2 — ambient loops and readable state

| Asset | Motion/state |
|---|---|
| `life_wind_mast` | rotor spin, restrained windsock sway, red beacon blink |
| `life_meat_smoking_rack` | smoke/heat shimmer; stronger while Tallow is healthy |
| `life_hive_dew_funnel` | periodic drip and liquid ripple |
| `life_hive_feeding_bladder` | subtle biological pulse and bubbles |
| `life_fungal_cable_bundle` | slow cable sway and green pulse |
| `life_assimilated_desk` | screen pulse and occasional cable twitch |
| `life_devotion_tree` | candle/light flicker and slight hanging-wire sway |
| `life_cochlear_intercom` | amber idle pulse; green acknowledgement on use |
| `life_wayfinding_totem` | steady practical with slow directional pulse |
| `life_lookout_perch` | small binocular sweep and signal-lamp state |

### Tier 3 — reactive polish

| Asset | Reaction |
|---|---|
| `life_training_dummy` | short `hit_react`, settles back without blocking damage |
| `life_barber_chair` | pump/turn once when the camp service activates |
| `life_exosuit_teardown` | tool-arm twitch and inspection lights during service |
| `life_checkpoint_post` | lamp acknowledgement and logbook/pen micro-motion |
| `life_parka_hooks` | warmer glow and very small hanging-cloth sway |
| `life_pod_seat_row` | red emergency flicker and oxygen-mask sway |

All other pass-2 props remain static until a motion has clear semantic value.

## Placement rollout

Placement follows the original pass-2 map and happens only after a model passes
the runtime validator.

1. **Corridors:** add deterministic `planCorridorDressing` placement for 41–48.
   Wall fixtures alternate sides on long runs; junctions receive the totem;
   dead ends receive cabinet/checkpoint vignettes. Preserve one clear cell.
2. **Outdoor landforms:** add `planLandformDressing` for 49–56. Limit each chunk
   to one landmark and keep the drill/pod interaction side reachable.
3. **Rooms:** extend the cryo, bio, cathedral, engineering, workshop, security
   and storage kits with 57–71 and 76–78. Stateful pieces are rare anchors,
   never random repeated clutter.
4. **Camps:** place barber chair in all camps, meat rack at Tallow, training
   dummy at Vesper and lookout perch at Meridian. Tie activity to existing camp
   condition/service state.
5. **Crash site:** place seat row now; add hull shard when #80 arrives.

Every placement pass retains reachability checks and the existing triangle
budgets. Interactive sides receive a reserved approach cell.

## Delivery sequence

### Phase A — arrival gate and showroom

- Add the 39 catalog entries with planned height/span and GLB-only placement.
- Add a generated readiness report: raw, runtime, registered, validated,
  placed, motion-ready.
- Put every validated model in the showroom with buttons for each intended
  state. Static models may ship before their motion pass.

### Phase B — placement without interaction

- Build corridor and landform planners.
- Extend room kits and camp/crash compositions.
- Verify density, reachability, collision, grounding, facing and budgets.

### Phase C — Tier 1 Blender articulation

- Curate moving geometry, pivots, named nodes and clips for the eight Tier 1
  assets.
- Preserve those clips through ingest and validate the runtime GLBs.
- Approve closed/open and off/active poses in the showroom before gameplay
  wiring.

### Phase D — runtime motion controller

- Implement `propMotion.js`, dynamic-dressing extraction and stateful material
  clones.
- Wire Tier 1 interaction specs, FX, lights, audio and chunk disposal.
- Add save restore and co-op replication.

### Phase E — ambient and reactive polish

- Add Tier 2 loops, then Tier 3 reactions.
- Keep ambient loops distance-culled and pause them outside the active area.

## Verification gates

- Blender validator tests required nodes, pivots, clips, clip durations and
  motion bounds for every stateful asset.
- Unit tests cover every legal/illegal state transition and disposal during a
  transition.
- Placement tests cover deterministic output, one-cell corridor clearance,
  approach cells, dynamic-root cap and triangle budgets.
- Persistence tests restore open/looted/completed props by stable identity.
- Co-op tests prove one authoritative activation and late-join pose restore.
- Browser tests interact with the cabinet, pod, confessional, drill, winch,
  fuse panel and welding station in real gameplay.
- The visual showroom captures closed/open and off/active pairs.
- A 20-chunk probe asserts no runtime shader-program growth, bounded draw calls
  and mixers returning to baseline after chunk unload.
- Steam Deck p95 frame time must not regress; fix the measured cost without
  removing visible behavior.

## Recommended first implementation slice

Start with three assets that exercise the whole architecture:

1. `life_ribcage_rescue_cabinet` — persistent hinged door and one-time loot;
2. `life_seismic_drill` — startup, continuous loop, stop, light and particles;
3. `life_confessional` — two doors, authored interaction point and room-based
   placement.

Together they prove one-shot state, continuous machinery, multi-part doors,
static-to-dynamic dressing extraction, save restore, lights, FX and teardown.
After that, the pod, winch, fuse panel and welding station are recipe work.
