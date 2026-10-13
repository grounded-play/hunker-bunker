# Environment, Field Weapons, Carrying, and Base Rebuild Master Plan — 2026-10-12

## Outcome

Turn the recent prop library and authored-room work into a visible gameplay layer:

- rooms and hallways are larger, recognizable places rather than repeated square cells;
- practical lamps in GLBs tint nearby PBR surfaces with their authored color;
- cables visibly connect machines, walls, doors, and power sources;
- every usable door has a complete threshold and a biome-appropriate motion family;
- focal props do something specific without turning every room into a prompt forest;
- rare, run-only weapons are physical pickups and the flamethrower opens fire-gated routes;
- the first-night loop becomes “recover a bed, carry it home, seal a room, restore oxygen, sleep”;
- later runs recover ship parts and construction modules for the home base;
- carrying occupies both hands, while a companion or co-op partner provides cover.

This is the umbrella plan. The detailed prop contracts remain in
`recent-glb-lighting-and-interaction-overhaul-2026-10-12.md` and
`recent-glb-lighting-interaction-and-spatial-overhaul-pass2-2026-10-12.md`.
The existing audio/juice branch owns sound-set implementation; this plan consumes its public
weapon, impact, room-tone, and spatial-audio hooks rather than duplicating them.

## What exists now

### Recent asset census

The literal recent world-story set is **98 GLBs**:

| Import wave | Count | Current runtime role |
|---|---:|---|
| Last sprint | 39 | daily-life, camp, hive, cryo, crash, chasm props |
| Current branch first import | 40 | faction and narrative hero props |
| Current branch second import | 19 | story climax and specialist machinery |
| **Total** | **98** | room population, authored anchors, camp/hive dressing |

The broader audit exceeds 100 assets once hallway kits, doors, wall pieces, spline props, and
existing architectural GLBs are included. Do not report “100+ new props” in telemetry: keep the
98-prop world-story set and the architectural set as separate cohorts.

Current code coverage of those 98 props after the Phase 0 closure:

- **90/98** have `PROP_FX_PROFILES` in `src/propFx.js`; all eight remaining models are
  explicitly classified as non-FX architecture, traversal, or furniture.
- **92/98** have explicit `PROP_INTERACTION_SPECS` in `src/propInteractions.js`.
- Non-FX classifications: `chasm_broken_catwalk`, `chasm_gondola`,
  `chasm_rappel_anchor`, `crash_drag_chute`, `crash_hull_panels`, `life_filing_cabinets`,
  `life_pallet_racking`, `life_weight_bench`. Water FX were added to
  `camp_water_barrel` and `life_sink_row`.
- Explicit interaction exceptions: `chasm_broken_catwalk`, `chasm_gondola`,
  `chasm_rappel_anchor`, `crash_drag_chute`, `cryo_frozen_cascade`, `hive_tendril_arch`.
  The first four and the arch are ambient/traversal pieces; the cascade is reserved for the
  planned fire-gate system. These policies are executable in `src/data/recentWorldProps.js`.

### 2026-10-12 production cohort: 20 sources, 21 runtime GLBs

This follow-up cohort is now ingested rather than remaining a request list. The combined
guillotine is generated from its frame and slab, so 20 raw files intentionally produce 21
runtime files.

| Runtime model | Runtime job | Authored contract now present |
|---|---|---|
| `barrier_ice_intact` | fire-gate collision/initial stage | cold glow anchor; heat-state model route |
| `barrier_ice_fractured` | damaged fire-gate stage | cold glow/steam response; heat-state model route |
| `barrier_ice_melting` | near-open fire-gate stage | glow and water-surface anchors; melt FX route |
| `base_cot_installed` | first-night sleep anchor | installed module mapping and interaction anchor |
| `carry_field_cot_folded` | two-hand tutorial cargo | cot carry-model mapping and interaction anchor |
| `base_door_sealable_bulkhead` | player-built airtight door | `HB_DOOR_00` hinge, cyan source, open/closed solidity |
| `door_arch_guillotine_frame` | monumental supported threshold | red crown practical and 2.4 m opening fit |
| `door_arch_guillotine_slab` | moving threshold leaf | damage/reactive glow presentation |
| `door_arch_guillotine_assembled` | showroom/general world gate | `HB_DOOR_00` 2.4 m vertical slide and interaction anchor |
| `wall_macro_straight_4` | four-cell wall frontage | tray sockets and overhead practical |
| `wall_macro_buttress_3` | three-cell silhouette break | local red practical; macro-wall mapping |
| `base_o2_atmospheric_regulator` | room pressurization producer | duct/power sockets, cyan practical, cycle action |
| `base_o2_overhead_duct` | connected air distribution | paired duct sockets and green status glow |
| `base_power_junction_box` | utility branch terminator | power-in/out sockets, amber practical, route action |
| `ship_module_navigation_core` | recoverable ship module | gyro rotor, cyan practical, spin-up action |
| `ship_module_comms_transceiver` | recoverable ship module | scanning rotor, green practical, sweep action |
| `ship_module_engine_manifold` | recoverable ship module | fuel socket, orange heat source, purge action |
| `ship_module_life_support_core` | recoverable ship module/O2 source | duct socket, cyan practical, cycle action |
| `weapon_flamethrower_case` | rare-drop reveal container | hinged lid and interaction anchor |
| `weapon_flamethrower_m70` | physical run-only weapon | muzzle/glow anchors and field-drop mapping |
| `weapon_fuel_canister_heavy` | unique flamethrower ammunition | pickup/glow anchors and ammo-model mapping |

Automated and manual ingestion checks establish the current resource envelope:

- 9,999–34,999 triangles per runtime GLB; every file is under 5 MB;
- embedded texture sets are 2048×2048 WebP and retain base-color, normal, and packed
  metal/roughness PBR inputs;
- all planned `FX_*`, `socket_*`, `INTERACTION_*`, and `HB_*` nodes survive meshopt packing;
- no baked animation clips are required: hinges, slides, and rotors use deterministic runtime
  articulation metadata and stop updating when settled;
- `src/propFx.js` routes visible cyan, red, amber, orange, and green modeled sources through the
  fixed eight-light pool; all prop practicals remain shadowless;
- `src/debugShowroom.js` and `src/debugMuseumPlan.js` expose the entire cohort together for fit,
  PBR, pivot, and source-color review.

The cohort is runtime-capable, but asset availability is not feature completion. World placement
now consumes all four ship-system carry/install mappings and their live source-color practicals;
Phase 6 still needs damaged ship variants, character-held flamethrower mounting, melted ice
aftermath, construction preview meshes, and split/iris/camp/damaged-shutter door families.

### Systems to extend, not replace

| Capability | Existing source | Useful foundation | Missing layer |
|---|---|---|---|
| Practical prop FX | `src/propFx.js`, `src/threeGame.js` | normalized anchors, `FX_LIGHT_00`, pooled environmental lights | automated emissive audit and multi-source authoring |
| Prop interactions | `src/propInteractions.js`, `src/propExperience.js` | stable contracts, persistent spent state | full coverage classification and spatial consequences |
| Placement | `src/roomPopulation.js`, `src/roomDressing.js` | doorway reservations, population budgets | focal/support composition and global post-plan validation |
| Authored rooms | `src/roomBuilds.js`, `src/chunkStructure.js` | room catalog, reservations, grammar rooms | higher appearance rate and visual telemetry |
| Hallways | `src/hallwayConnector.js`, `src/data/hallwayBuilds.js` | deterministic archetypes and connectors | broader widths, longer sightline rhythm, transition landmarks |
| Walls | `src/wallAutotile.js`, wall pools in `src/threeGame.js` | corner cuts, height bands, caps, lights, theme dressing | multi-cell run modules and silhouette grammar |
| Doors | `src/proceduralDoors.js`, door rendering in `src/threeGame.js` | state records, locking, destruction | guaranteed jambs and multiple motion/visual families |
| Cables | `src/splineRouter.js`, `src/splineDressingRenderer.js`, `src/data/propSockets.js` | socket pairing, wall escapes, batched splines, cuttable runs | network intent, cross-room continuity, readable termination |
| Run loot | `src/runDrops.js`, `src/fieldWeapon.js` | run reset, profile multipliers, relic pickup lifecycle | physical gun slot, swap/drop, ammo family |
| Fire/destruction | projectile and status code in `src/threeGame.js` | wall/prop hit paths and damage/status infrastructure | continuous flame volume, burning, melting, fire gates |
| Rest/O2 | `src/dayCycle.js`, sleep flow and O2 bubble in `src/threeGame.js` | one rest rule, day advance, refill/drain | built enclosure volume and leak/seal simulation |
| Camp/hive missions | `src/data/campQuests.js`, `src/hiveSite.js` | authored factions, quests, outcomes | recover/carry/build objective verbs |
| Companion/co-op | companion combat and tactical pings in `src/threeGame.js` | autonomous fire, shared events, quick commands | escort-carrier stance and authoritative carried item |

## Spatial work landed in this pass

The first environment pass is already implemented and should remain the baseline:

- hallway dressing now supports open `double-frame`, `service-rib`, `braced-frame`,
  `camp-arch`, `low-rib`, `monumental-arch`, `transition-arch`, and `organic-arch` silhouettes;
- arches are non-colliding, walkable assemblies with posts, shoulders, crowns, and floor guides;
- corridor marker cadence follows sightline-break frequency and de-duplicates route markers;
- multi-portal hubs receive a landmark marker;
- the hallway catalog includes biome-transition and hive-warning approaches;
- authored rooms frame up to two eligible doorways rather than decorating only one;
- prop scoring separates focal edges, perimeter anchors, access lanes, and support clusters;
- door aprons remain reserved and gateway dressing does not become collision geometry;
- the shared placement audit now expands every oriented threshold to a directional 5×5 envelope:
  the full three-cell opening, one cell beyond both jambs, and two cells on both approach sides.
  Room population, dressing, pickups, encounters, and set pieces consume that same reservation;
- generated door records carry a controller-height clearance envelope and four live presentation
  families now move differently without forking door authority: blast slabs sink, hive guillotines
  retract into the crown, cryo/corporate leaves withdraw symmetrically, and camp barriers hinge
  aside. Both structural jambs are repaired and validated before the door is stamped.

The focused environment suite currently passes 157 tests across 12 files. Preserve those
contracts while expanding the systems below.

## Non-negotiable spatial rules

1. **No prop blocks a threshold.** The final composed scene, not only each individual planner,
   must pass a doorway-apron audit. Reserve every door cell plus one cell laterally and at least
   two cells along its travel direction. Interactions must also be reachable without standing in
   the door lane.
2. **Every operable door is structurally attached.** A door record is invalid unless both jamb
   sides resolve to a wall, arch post, or explicit freestanding gate support. Wide doors are not
   exempt.
3. **Every arch is walkable.** Collision may exist on posts, never across the opening below the
   player-clearance envelope. Test the actual controller radius and height.
4. **Main paths stay readable.** A 1.8 m clear traversal ribbon must survive room population,
   spline dressing, debris, encounters, and interaction staging.
5. **A room has hierarchy.** One signature/focal prop, zero or one secondary interaction, then
   supporting non-interactive props. Repetition is allowed only as a deliberate bank, row, or
   process line.
6. **Lighting comes from a visible source.** A point light without a visible emissive mesh or
   modeled aperture fails review.
7. **Template usage is measurable.** Debug telemetry records generator ID, room build ID,
   hallway archetype, door family, and fallback reason for every generated chunk.

## Workstream A — larger start, rooms, and hallways

### A1. Enlarge the crash room safely

The current crash floor is `x=2..16`, `y=4..17` with one three-cell north pre-hall. It occupies
nearly the full origin chunk already, so simply changing those constants would destroy the
foundation band or collide with the canyon seam.

Implement the new start as a **two-zone authored base reservation**:

- origin chunk: 17×16 primary hull chamber, ship, O2 machinery, initial construction sockets;
- north-adjacent tutorial chunk: 7–9 cell wide airlock/service hall before procedural branching;
- an offset side bay in the origin room for the first bed and wall-building tutorial;
- a clear 4 m central maneuvering lane for co-op spawns and carried modules;
- construction sockets live on a 0.5 m or 1 m snap grid but navigation continues using world
  coordinates and the existing chunk graph.

Code:

- move crash dimensions and sockets from inline `clearSpawnArea()` constants to
  `src/data/crashSiteBuild.js`;
- have `buildCrashSiteChunk()` consume the authored build and reserve its north continuation;
- update spawn formation, cot position, ship modules, O2 bubble center, tutorial triggers, and
  tests that currently assume the 15×14 footprint;
- retain one guaranteed unlocked egress so unfinished construction can never soft-lock a run.

### A2. Increase corridor scale without making every route a hall

Use three widths with deterministic purpose:

- service passage: 3 cells, short and rare after the tutorial;
- standard connector: 5 cells, default combat/traversal width;
- monumental/transition hall: 7 cells, used near camps, hives, missions, ring crossings, and base.

Hall length should alternate between compression and release: 6–10 m compressed approach,
12–20 m legible sightline, then a frame/turn/junction landmark. Do not widen by erosion after the
fact; encode width in `HALLWAY_BUILD_CATALOG` footprints so portals, walls, encounters, and props
agree on the same geometry.

### A3. Make authored templates unavoidable enough to notice

Current selection prefers authored reservations for destinations, grammar rooms for some optional
rooms, hallway connectors when `roomMode` is false, and generic maze structures as fallback.
Add a seeded exposure budget per ring:

- tutorial ring: one authored utility room plus the enlarged base approach;
- each later ring: at least two authored room builds, one signature hallway, and one biome
  transition connector before repeats are allowed;
- camp/hive/mission reservations always select their authored family or emit an explicit fallback
  diagnostic;
- debug overlay shows `AUTHORED ROOM`, build ID, rotation, reservation, and rejection reason;
- add a 100-seed distribution test with minimum/maximum occurrence bounds and no immediate
  archetype repetition.

## Workstream B — wall and threshold architecture

### B1. Replace the visual 1×1 wall rhythm with macro runs

Keep the tile grid for pathfinding and destruction, but render contiguous wall cells as semantic
runs:

- `straight-2`, `straight-3`, `straight-4` panels;
- inset service bay and projecting buttress variants;
- half-height rail, damaged breach, stepped top, and tall mechanical spine;
- inside/outside corners, T-junction piers, arch shoulders, and end caps;
- bunker, cryo, bio, camp, corporate, and chasm material families.

Add `src/wallRunPlanner.js` to consume the current wall grid and output stable run segments while
preserving per-cell IDs. `src/threeGame.js` renders each family in instanced pools. Damage maps a
hit back to the underlying cell; when a cell breaks, rebuild only that run/pool. Existing
`wallAutotile.js` still owns height, corner-cut, cap, frost/bio, and light-strip decisions.

Target: at least 65% of visible straight wall frontage should use a 2–4 cell module; no more than
four identical silhouettes consecutively.

### B2. Door families

Status: the shared logical record, structural-support repair, clearance envelope, and the first
four presentation families are live. `iris membrane` and `damaged shutter` remain art/runtime
follow-ups; split bulkheads currently use a single symmetric paired-leaf draw object until their
dedicated two-leaf GLB lands.

Extend procedural door records with `family`, `motion`, `frameStyle`, `materialVariant`, and
`clearanceEnvelope`:

| Family | Motion | Best use |
|---|---|---|
| blast slab | sinks into floor | bunker/security |
| arch guillotine | slides down from crown to close | hive warning, monumental threshold |
| split bulkhead | halves retract sideways | corporate/cryo |
| iris membrane | radial/opening morph or segmented approximation | bio/hive |
| camp barricade | swings/folds or manually lifts | survivor spaces |
| damaged shutter | uneven partial rise | ruined transition |

The arch-guillotine’s **open** pose stores the slab above the clearance envelope; closing lowers it.
Every family uses the same logical states (`open`, `closed`, `locked`, `destroyed`) and authority
rules. Motion is presentation, not a new gameplay state machine.

Before stamping a door, validate:

- supports on both sides;
- wall continuity beyond each support;
- opening width and controller clearance;
- valid open/closed collision bounds;
- no prop, cable below head height, encounter spawn, or pickup inside the apron.

If validation fails, repair with a gateway module or omit the door—never leave a floating slab.

Required art: six frame kits, six matching slabs/leaves, damaged states for at least blast and
shutter families, PBR material variants, named `DOOR_*` animation nodes or documented pivot nodes,
and `FX_LIGHT_00..02` anchors for status lamps.

## Workstream C — connected cable and utility networks

The current spline router connects compatible sockets within one room and sends unmatched sockets
to the nearest wall. That makes individual props plausible but not the *area* coherent.

Add a deterministic two-stage utility graph:

1. `src/utilityNetworkPlanner.js` assigns producers, consumers, junctions, wall trunks, and room
   boundary ports for power, coolant, air, data, fuel, and organic trachea.
2. `src/splineRouter.js` routes the local geometry from prop sockets to those graph nodes.

Rules:

- generator/transformer → wall riser → overhead tray → branch drops → machines;
- cable tray props must expose sockets at both ends and align to the wall run;
- orphan routes end in a modeled junction box/collar, never in empty plaster;
- routes crossing doors stay above 2.15 m or pass through a side-wall bulkhead gland;
- important powered interactions visibly change the network: pulse travels down the line, lamps
  wake in order, severing a cuttable branch disables only downstream consumers;
- adjacent authored rooms share boundary port IDs so a trunk visually continues through the
  doorway even though each chunk owns its geometry;
- preserve one merged fixed-spline mesh and one cuttable batch per chunk; no per-frame curve
  evaluation and no per-cable material.

Add socket data for the recent cable-specific GLBs first:
`prop_wall_cable_tray_swag`, `prop_vertebral_cable_riser`,
`prop_biomech_spore_umbilical_cable(_rigged)`, transformers, dynamos, generators, consoles,
fabricators, and door motors.

## Workstream D — practical light fidelity for the recent GLBs

### D1. Source-of-truth pipeline

For every lit model, author one or more named anchors:

- `FX_LIGHT_00..03`: point/spot source position;
- `FX_GLOW_00..03`: emissive mesh or halo position;
- optional extras: `color`, `intensity`, `distance`, `decay`, `pulse`, `flicker`, `state` in the
  prop FX manifest.

Color priority:

1. explicit anchor metadata;
2. average emissive texture/material color around the source mesh;
3. profile color in `PROP_FX_PROFILES`;
4. normalized-bounds fallback only for models still awaiting authoring.

Thus a red beacon produces a red emissive source, red halo, red particles if appropriate, and a
red shadowless pooled light that actually changes nearby PBR materials. Do not fake this with an
unlit billboard alone.

### D2. Coverage closure

- classify all ten missing-FX props as `ambient-no-light`, `particle-only`, or authored practical;
- classify all six missing-interaction props as traversal, destructible, ambient, or explicit
  interaction;
- run `scripts/blender/author_prop_fx_anchors.py` from the checked-in
  `scripts/blender/manifests/prop-fx-anchors.json` recipes;
- generate an audit artifact listing GLB, emissive materials, anchors, FX profile, interaction,
  collision class, socket count, and placement families;
- fail CI only for hero/signature props; warn for ambient props so art can land incrementally.

### D3. Runtime budget

- keep the fixed eight-slot environmental light pool;
- rank lights by camera distance, intensity contribution, screen relevance, and hero priority;
- no prop point-light shadows;
- cull light/particles outside 18–24 m and pause hidden animation mixers;
- merge halos/decals where possible and share materials;
- expose a debug view for source anchor, pool rank, rejected lights, and measured color.

## Workstream E — run-only physical weapon drops

### E1. Single-slot weapon contract

Add `src/fieldWeaponDrops.js` as the authoritative catalog and pure state reducer. A drop contains:

```js
{
  instanceId, profileId, rarity, ammoType, ammoInWeapon, reserveAmmo,
  worldPosition, sourceEncounterId, runId
}
```

Player state contains one `equippedFieldWeapon`. Interacting with a world gun atomically:

1. validates distance and ownership;
2. drops the currently held field gun at the pickup socket, preserving its current ammo;
3. equips the selected gun and applies the existing `fieldWeapon.js` combat profile;
4. broadcasts the swap through the shared-world event sequence in co-op;
5. clears all field-gun instances and equipped state in `resetRunDrops()` / new expedition.

These drops are deliberately absent from `profile.js`, Steam inventory, bank state, and permanent
loadout serialization. Fabricated career weapons remain a separate source; the field slot
temporarily overrides the active firing profile for that run.

Use a real GLB per weapon, outline/rarity treatment, a grounded pickup silhouette, an inspect card,
and a visible dropped-old-weapon result. The generic resource `weapon` pickup must be renamed or
visually separated so players cannot confuse tech currency with an equippable gun.

### E2. Ammo families

Start with:

- ballistic: common magazines shared by sidearm/carbine/SMG;
- shells: scatter weapon only;
- rail cells: rare precision ammo;
- cryo canisters: cryo weapon;
- fuel tanks: flamethrower only.

An empty gun remains equipped and can be swapped; it does not silently revert to infinite class
ammo. UI shows magazine/fuel plus reserve, pickup compatibility, and the ammo abandoned during a
swap. Co-op pickup and ammo consumption are host-authoritative with monotonically increasing event
sequence IDs.

## Workstream F — rare flamethrower, burning, and melt gates

### F1. Weapon behavior

Add `flamethrower` to `fieldWeapon.js`, but implement firing as a short-lived swept cone/volume,
not dozens of projectile meshes:

- range 5–7 m, widening cone, obstruction-tested against walls and closed doors;
- consumes fuel continuously with a brief ignition cost;
- applies immediate low damage plus refreshable `burning` stacks;
- flame decals/particles are cosmetic and pooled; damage uses a fixed-rate gameplay tick;
- fuel drops are uncommon and the weapon itself is rare, telegraphed by a unique case or dead
  specialist vignette.

### F2. Enemy fire status

Create `src/statusEffects.js` (or extend the existing enemy status owner if one is consolidated
first) with deterministic `burning` state:

- source player ID, stack count, remaining duration, next damage tick;
- resistance/immunity tags for fire, cryo, machine, boss, and wet targets;
- visual intensity derives from stacks but never owns damage timing;
- death credit remains with the source player;
- co-op transmits apply/refresh/extinguish events, not every particle or damage frame.

Burning should ignite appropriate organic hazards, extinguish in decon/water volumes, and interact
with cryo status without creating exponential status combinations.

### F3. Meltable ice gates

Add an explicit `fire_gate` requirement alongside objective/key gates. A meltable ice barrier has:

- stable barrier ID and persisted run state (`frozen`, `melting`, `melted`, optionally `fractured`);
- heat threshold accumulated from fire damage, with slow cooling when heat stops;
- visible melt stages, dripping water, shrinking collision, and a final break event;
- an alternate return route so a player who swaps away the flamethrower beyond the gate cannot be
  trapped;
- generation constraints: optional secrets may use early gates; mandatory progression cannot
  require a weapon the seed failed to spawn on the reachable side.

World generation performs a reachability proof: weapon source → gate approach → reward/route.
The flamethrower may also thaw `cryo_frozen_cascade` and fracture warmed ice props, but decorative
ice must remain visually distinct from gameplay gates.

Required assets: flamethrower GLB, world pickup/case, first-person or character-held mount, fuel
canister, muzzle anchor, pilot flame, five-direction flame atlas/mesh, scorch decals, three-stage
ice barrier, dripping/melt particles, melted puddle, HUD icons, and interaction cards.

## Workstream G — carrying, construction, sealing, and ship rebuild

### G1. Carry state

Add a single `carriedObject` state owned by `src/carrySystem.js`:

```js
{
  instanceId, definitionId, missionId, massClass, carrierPlayerId,
  sourceTransform, carrySocket, buildTags, condition, runId
}
```

While carrying:

- primary fire, reload, weapon swap, and weapon interactions are disabled;
- movement/turn speed depends on mass class; dodge/sprint rules are explicit;
- the object uses a character carry socket with obstruction sweep and a safe drop search;
- damage can stagger/drop heavy cargo, but never delete mission-critical cargo;
- interact drops or installs at a compatible socket; cancel never teleports it home;
- death/disconnect drops it at the last safe navigable point;
- only the host changes ownership, and reconnect reconciliation resolves exactly one owner/location.

### G2. Cover while carrying

Companions already have autonomous firing. Add a `cover-carrier` tactical stance:

- carrier entering carry state automatically requests cover unless the companion has a stronger
  explicit order;
- companion follows an offset trail position, prioritizes enemies threatening the carrier, and
  avoids standing in the placement preview;
- add `COVER ME` to the quick-command radial, or contextually replace `HELP` while carrying;
- in co-op, the non-carrier receives a prominent carrier marker and threat ping but remains fully
  controllable; do not force an AI-like command on a human player.

### G3. Construction sockets and pieces

The initial system is socketed assembly, not unrestricted voxel building. Definitions in
`src/data/baseModules.js` include footprint, compatible socket types, seal edges, structural tags,
power/air ports, build cost, collision bounds, and GLB states.

First module set:

- floor plate, straight wall, corner wall, door frame, sealable door, ceiling panel;
- bed/cot, O2 duct, regulator, power junction, storage rack;
- recovered ship modules: navigation core, comms, engine component, life-support component.

Placement preview is green only when footprint, clearance, connectivity, and ownership validate.
Installed modules receive stable IDs and persist in campaign/base state. Loose mission cargo is
run-state until installed; installation is the commit point.

### G4. Sealed-room oxygen model

Do not simulate fluid cells every frame. Build a graph from snapped construction faces:

- floors/walls/ceilings/doors expose seal edges;
- flood-fill enclosed air volumes only when construction changes or a door/breach changes state;
- each volume records cubic size, leak perimeter, connected O2 producer, pressure/fill, and beds;
- open exterior edges, destroyed panels, open unsealed doors, and missing ceiling pieces are leaks;
- O2 fill rate must exceed leak rate before the room becomes sleep-safe;
- sleeping requires the bed to be installed in a sealed, sufficiently oxygenated safe volume;
- emergency rule: the ship’s existing O2 bubble and egress remain functional so bad construction
  cannot make a save unrecoverable.

Add `src/baseSealGraph.js` as a pure, heavily tested module. `src/threeGame.js` consumes its result
for bubbles, leak FX, prompts, and sleep eligibility. `dayCycle.canRestNow()` stays the campaign-day
authority; base sealing supplies only the `safeSpace` decision.

### G5. First-night mission

The onboarding sequence:

1. reach a nearby camp or wreck and locate the bed/cot module;
2. learn two-hand carry; companion/co-op partner covers the return;
3. bring the bed to the ship side bay and snap it into its socket;
4. recover/install missing wall and door-seal pieces from the same short route;
5. power the O2 regulator and watch the room volume fill;
6. seal the door; leak indicators stop and the sleep prompt becomes valid;
7. sleep to advance the first night.

Fail-safe: dropped pieces receive a map marker; after repeated loss/off-nav placement, they respawn
at the mission’s last safe staging socket with the same stable ID and condition.

### G6. Ship rebuild campaign loop

Replace “walk to fabricator and buy the abstract step” with:

- discover a part blueprint/source through the current objective package;
- retrieve a physical module during a run;
- decide whether to carry it immediately, stage it at a camp/hive, or extract with help;
- return it to the base and install it at the ship;
- use the fabricator for repairs, adapters, fasteners, and missing subcomponents—not teleportation;
- installed ship modules unlock current progression effects and visible ship changes.

Camp and hive sub-missions gain authored logistics variants:

- camp salvage escort: recover a human wall/door/power module and choose camp donation or base use;
- camp bed mission: first-night cot/bed source and survivor cover tutorial;
- hive symbiosis carry: transport a living air membrane or bio-conduit that dislikes gunfire;
- hive purge alternative: harvest a rigid seal organ at relationship cost;
- joint extraction: an allied camp/hive can stage a heavy ship part at a nearer safe socket;
- choices feed existing bond, suspicion, obedience, and world-outcome systems rather than a second
  reputation model.

## Save, co-op, and authority boundaries

| State | Lifetime | Authority |
|---|---|---|
| world gun pickup and its ammo | current run | host/shared-world sequence |
| equipped field gun | current run | owning player, host validated |
| burning enemy / melting barrier | current run or streamed chunk persistence | host |
| loose carried mission object | current run | host |
| installed base module | campaign | campaign/base store, host commits |
| room seal graph result | derived/cache | deterministic from installed modules |
| sleep/day advance | campaign | existing day-cycle authority |
| authored prop spent/toggled state | existing scope | existing prop interaction store |

Snapshot/rejoin must serialize identifiers and logical states, never Three.js objects, matrices,
particle state, or audio handles.

## Delivery sequence

### Phase 0 — finish and protect the spatial/prop juice pass

- land the new hallway arches, markers, room gateway coverage, and population hierarchy;
- [x] close or intentionally classify the 10 FX and 6 interaction gaps with an exact 98-model
  ratchet (`src/data/recentWorldProps.js` and `src/recentWorldPropCoverage.test.js`);
- [x] add one final composed-manifest doorway invariant across pickups, set pieces, scatter,
  and room encounters (`src/placementSafety.js`); non-solid gateway frames are the only default
  exemption;
- [x] add practical-light source/color debug view and 98-prop audit artifact (`docs/audit/recent-98-prop-audit-2026-10-12.md`);
- [x] coordinate with the audio branch through resolver hooks only (AudioCraft Foley & room tone beds integrated).
- [x] ingest and audit the 20-file 2026-10-12 production cohort, including 21 optimized runtime
  GLBs, named effect/socket/interaction nodes, five articulated parts, and debug-showroom access;
- [x] give powered cohort models source-colored pooled practical lighting and reserve static
  architecture/cargo/barriers for structural, pickup, carry, or fire-damage systems instead of
  manufacturing generic prompt interactions;

Exit: no hero prop without a declared light/FX policy and interaction policy; no generated prop in a
door apron; current performance and 157-test spatial suite remain green.

### Phase 1 — architecture visibility

- [x] seeded authored-template exposure budget is consumed by live chunk generation, not only its
  catalog test: every non-tutorial ring deterministically reserves two non-story route chunks for
  socket-compatible authored room builds, one for a wide signature hall, and one for a biome
  transition hall. Camp/hive/mission/blocker/set-piece reservations always win; debug snapshots
  and the in-world debug overlay expose generator, build/archetype, rotation, reservation,
  fallback, and exposure role (`src/roomExposureBudget.js`, `src/chunkStructure.js`,
  `src/threeGame.js`);
- [x] data-driven 17×16 origin chamber plus an unavoidable seven-cell-wide north service
  approach/release chamber with topology-preserving exits and modular-kit route markers
  (`src/data/crashSiteBuild.js`, `src/crashSiteBuild.js`);
- remaining start work: offset build/tutorial side bay and runtime consumption of the declared
  half-grid bed/seal construction sockets;
- [x] enforce 5/7-cell signature and biome-transition exposure beyond the start through authored
  ring slots; ordinary service passages retain 3-cell compression so every route is not a hall;
- [x] wall-run planner and first bunker/cryo macro modules (`src/wallRunPlanner.js`);
- [x] structural threshold support repair/validation and deterministic door presentation records;
- [x] blast-slab, split-bulkhead, camp-barricade, and arch-guillotine families are assigned by
  room style; the arch-guillotine runtime retracts into its crown and closes downward;
- [x] replace the start's procedural blast-door face with authored guillotine frame/slab art while
  retaining its invisible raycast proxy and grid collision;
- remaining gateway visuals: family-specific split, iris, camp, and damaged-shutter art/animation.

Exit: a 20-seed visual tour shows recognizable starts, transitions, camps, and hives; every door
has two supports and every arch passes controller clearance.

### Phase 2 — utility continuity

- [x] utility graph, room boundary ports, cable-tray sockets, powered network state (`src/utilityNetworkPlanner.js`, `src/data/propSockets.js`);
- [x] downstream sever/restore behavior for a small authored utility room;
- extend to camps/hives after bunker profiling.

Exit: one generator visibly feeds a door, two machines, and room lights; cutting a branch affects
only its consumers; fixed cable rendering remains one merged draw call per chunk.

### Phase 3 — physical run weapons

- [x] pure run-scoped field-drop reducer with atomic single-slot swaps, preserved ammo,
  duplicate/cross-run rejection, weapon-specific reloads, and hard run reset
  (`src/fieldWeaponDrops.js`);
- [x] physical authored-GLB drops, proximity swap interaction, boss rare-drop hook, active combat
  profile/ammo mirroring, per-weapon reload consumption, and HUD ammo-family payloads
  (`src/fieldWeaponPresentation.js`, `src/threeGame.js`);
- remaining: server/host-authoritative co-op race resolution and final HUD art/copy;
- [x] ballistic/shell/rail/cryo ammo families are distinct in runtime state and HUD events;
- encounter/drop tables with seeded rarity and guaranteed tutorial QA hooks.

Exit: two players can race for, swap, drop, empty, and lose run-only guns with no duplication and
no persistence outside the expedition.

### Phase 4 — flamethrower and fire gates

- [x] swept flame volume, fuel, burn status, resistances, visuals/audio integration (`src/statusEffects.js`, `src/fieldWeapon.js`, `src/fieldWeaponDrops.js`);
- [x] staged meltable barrier and reachability-safe generation (`src/iceGateSystem.js`);
- [x] bind the physical M70, hinged case, fuel canister, and three heat-state ice GLBs to their
  authoritative weapon/drop/barrier catalogs;
- [x] first optional cryo fire-gated cache: a room-within-a-room whose only reward threshold is
  staged ice, with a physical open-case M-70 source guaranteed on the reachable approach side
  (`src/data/roomBuilds.js`, `src/threeGame.js`, `src/flameWeapon.js`);
- remaining: one authored alternate-route gate and host-authoritative co-op heat/status events.

Exit: fire damages and burns valid enemies, respects cover, melts only marked ice, cannot create an
unwinnable seed, and stays within the projectile/FX frame budget.

### Phase 5 — carrying and first-night base seal

- [x] pure one-slot carry reducer with ownership, safe drop result, compatible installation,
  run reset, and installed-module preservation (`src/carrySystem.js`);
- [x] firing, melee, and reload inputs are refused while carrying;
- [x] companion cover-carrier tactical stance (`src/carrySystem.js`);
- [x] live first-night cargo loop: the folded cot spawns beside the wreck, uses the authored carry
  GLB in world and in both hands, supports obstruction-aware safe drop, and snaps to the ship berth
  through the shared interaction selector (`src/firstNightBase.js`, `src/carryPresentation.js`,
  `src/threeGame.js`);
- [x] extend that route to a crash-hull patch and pressure-door seal: both are separate run cargo,
  use authored GLBs while carried, select tag-compatible occupied-safe sockets, persist only after
  installation, render their installed models, and replace the legacy pre-sealed giveaway berth;
- [x] while the operator carries cargo, recruited companions move into a forward cover formation
  and retain their normal basic/assist fire; a co-op partner's weapon state is untouched;
- remaining: freeform/half-grid placement preview and host-authoritative co-op carry event
  sequencing; the dedicated ship-system sockets are implemented in Phase 6;
- [x] bed, walls, sealable door, O2 duct/regulator definitions (`src/data/baseModules.js`);
- [x] bind installed/carry GLBs for the cot and all four recoverable ship modules;
- [x] live seal-gated bunker sleep: the pre-placed cosmetic cot shortcut is gone; a persisted
  installed cot plus the sealed starter hull and active O2 regulator are evaluated by
  `src/baseSealGraph.js` before the bunker rest prompt can advance the day;
- [x] installed modules persist as campaign/base state while loose cargo remains run-scoped
  (`src/baseRebuildStore.js`);
- [x] strict edge-addressed seal validation (one wall/door per perimeter edge), deterministic cabin
  fill/depressurization, sleep pressure threshold, and a five-segment emissive berth gauge with a
  practical status light (`src/baseSealGraph.js`, `src/baseAtmospherePresentation.js`);
- [x] mission cargo cannot disappear silently: every loose piece has an amber world beacon, compass
  target, tactical-map landmark, authored/last-safe staging positions, three-check off-navigation
  recovery, and death/compatible co-op retry drops that preserve the same instance;
- [x] recovered wall/door modules have persistent durability, projectile collision, authored
  damaged/breached GLB swaps, physical collision, shell-cost repair, and immediate seal/pressure
  invalidation; the pressure door cycles its authored `HB_DOOR_00` hinge and only blocks when shut;
- [x] first camp logistics route: Meridian's existing Lost Probe quest now stages the authored
  `scout_tracking_beacon_core` as run-scoped, two-handed cargo in the cryo band; completion requires
  carrying it back into the camp handoff radius rather than tapping a generic pickup;
- [x] first hive logistics route: Nahl's Host Mercy Rite now enters an authoritative `active` state,
  stages `hive_pulmonary_bellows` as a living air membrane, and grants its bond/deadline completion
  only after a two-handed ship-berth delivery; interrupted runs restore active cargo at the hive;
- [x] both routes inherit mission beacons, compass/map guidance, last-safe recovery, death drops,
  weapon lockout, and companion cover. Their authored blue/red source lamps remain visible while
  loose or carried and cast shadowless point light onto nearby PBR surfaces;
- remaining: a camp-authored cot handoff, additional hive logistics variants, and host-authoritative
  co-op delivery sequencing.

Exit: a new campaign can recover the bed, finish a sealed room, fill it with O2, and sleep; firing
is impossible while carrying; the partner/companion can defend the carrier.

### Phase 6 — ship rebuild campaign

- [x] physicalize the life-support, navigation, comms, and engine GLBs as two-handed run cargo;
- [x] stage those parts at the matching ring 1–4 authored objective reservations rather than at
  the ship, with previous-goal eligibility, navigable offset selection, and a door-clearance veto;
- [x] add four dedicated ship-bay sockets with exact tag/definition compatibility, persistent
  install commits, 1/4–4/4 rebuild feedback, compass/map tracking, recovery, and run-reset rules
  (`src/shipRebuild.js`, `src/threeGame.js`);
- [x] render installed ship systems from their authored GLBs and register their cyan/green/orange
  source effects with the fixed environmental-light pool so they illuminate nearby PBR surfaces
  without adding shadow maps or an unbounded light count;
- [x] make physical installation authorize the matching O2, hull, radar, or reactor build: terminal
  cards and direct actions refuse the abstract purchase before the exact module reaches its socket,
  while saves that already own the goal are grandfathered and may install the visible part later;
- fabricator becomes repair/adapter station;
- [x] prove one camp return handoff and one hive-to-ship staging handoff on the shared carry reducer;
- additional camp/hive logistics variants;
- damaged ship-system states, campaign save migration, rejoin, and rollback tests.

Exit: at least three current abstract progression steps require a recoverable world part, a carry
home, and an installation that visibly changes the ship/base.

## File-level implementation map

| File/module | Planned change |
|---|---|
| `src/data/crashSiteBuild.js`, `src/crashSiteBuild.js` (new) | origin room, sockets, reserved wide north continuation |
| `src/hallwayConnector.js`, `src/data/hallwayBuilds.js` | width classes, landmark cadence, transition footprints |
| `src/roomBuilds.js`, `src/chunkStructure.js` | exposure budget hooks and diagnostics |
| `src/wallRunPlanner.js` (new), `src/wallAutotile.js` | macro runs while retaining per-cell damage identity |
| `src/proceduralDoors.js` | family/motion/frame schema and structural validator |
| `src/threeGame.js` | orchestration/rendering only; avoid adding more catalogs inline |
| `src/shipRebuild.js` | pure ring-source eligibility, ship sockets, cargo staging, and progress |
| `src/utilityNetworkPlanner.js` (new) | producer/consumer/boundary graph |
| `src/splineRouter.js`, `src/data/propSockets.js` | route graph nodes, boundary continuation, more sockets |
| `src/propFx.js`, `src/propInteractions.js` | complete audit classifications and source-matched FX |
| `scripts/blender/manifests/prop-fx-anchors.json` | explicit recent-GLB anchors |
| `src/fieldWeaponDrops.js` (new), `src/fieldWeapon.js` | physical run gun state, ammo, flamethrower profile |
| `src/fieldWeaponPresentation.js` (new) | cached authored gun GLBs, grounded drop fit, halo lifecycle |
| `src/statusEffects.js` (new or consolidated) | deterministic burning lifecycle |
| `src/carrySystem.js` (new) | pure carry/drop/install state and validation |
| `src/data/baseModules.js` (new) | modules, sockets, seal and utility ports |
| `src/baseSealGraph.js` (new) | derived enclosures, leaks, pressure and sleep safety |
| `src/dayCycle.js` | consume base safe-space result; retain day authority |
| `src/data/campQuests.js`, hive mission data | carry/build objective variants |
| `src/profile.js` / campaign store | installed modules and migration only; never run guns |

## Verification matrix

### Determinism and generation

- 100 seeds: authored-room/hall frequency, no adjacent repeat violations, all portals connected;
- all door records have both supports and valid clearance in open/closed poses;
- final prop/dressing/encounter/pickup/cable manifests contain nothing in door aprons;
- required fire-gate seeds prove the flamethrower reachable first and a return path afterward;
- utility boundary port IDs and splines match across generation order and co-op peers.

### Gameplay

- interaction effects update light, sound, particles, collision, persistence, and prompt state;
- field gun swaps are atomic; old gun and ammo survive the swap; run reset clears both;
- flamethrower cannot damage through walls, uses fuel, refreshes burn, and melts marked ice only;
- carrying blocks shooting/reload/swap and recovers safely after drop, death, disconnect, or unload;
- bed sleep is refused with a useful leak reason until its volume is sealed and oxygenated;
- open doors/breaches invalidate seal state and closing/repairing recomputes it.

### Rendering and performance

- environmental point-light count remains fixed at eight; no prop light casts shadows;
- practical light color visibly affects nearby standard PBR test cards;
- wall macro pools do not raise draw calls relative to one pool per material/family;
- fixed splines remain one merged mesh per chunk plus one cuttable batch;
- flame/status FX use pools and fixed ticks; no object allocation in the main update loop;
- profile on Steam Deck target with start room, two lit hero props, fire, cables, and four-player
  carry/combat visible together.

## Art and content request list

Highest-priority new models/assets:

1. arch-guillotine doorway kit and bunker macro-wall kit;
2. crash-base side-bay, ceiling/floor seal panels, construction sockets and previews;
3. bed/cot carry model, O2 duct/regulator, wall/corner/door modules;
4. flamethrower, fuel canister, carry/held mounts, flame/scorch/melt effects;
5. three-stage meltable ice barrier and melted aftermath;
6. navigation, comms, engine, and life-support ship modules in loose/installed/damaged states;
7. cable tray ends, junction boxes, bulkhead glands, collars, hangers, and powered/off states;
8. remaining practical-light anchors and emissive source meshes for the 98-prop cohort.

All new GLBs should ship with sensible origin/scale, collision proxy or declared collision class,
named interaction and FX anchors, sockets, animation pivots/clips, PBR textures, LOD policy, and a
thumbnail/contact sheet entry. A beautiful model without those contracts is not runtime-ready.

## Definition of done

The overhaul is complete when a player can recognize authored areas without a debug overlay,
follow connected utilities through varied halls and wall silhouettes, trust that every visible lamp
lights the world in its own color, interact with focal machinery, find and swap a run-only weapon,
use a rare flamethrower to burn enemies and open a fair ice-gated route, then carry a bed and ship
parts home under companion/co-op cover to build a sealed oxygenated room and visibly rebuild the
ship—without doorway blockers, floating doors, duplicated co-op items, or permanent leakage of
run-only gear.
