# Authored Set Pieces, Crash-Site Building, and Run Variety Plan

Status: approved direction; Phase 1 foundation in progress | Owner: world design + gameplay systems | Updated: 2026-09-12 | Review: after bridge greybox and crash-site project prototype

Implementation log: on 2026-09-12 the first non-runtime foundation landed in
`src/data/setpieceBuilds.js` and `src/setpieceBuilds.js`: a serializable three-module valley-bridge
fixture, schema validation, deterministic cardinal claim allocation, and per-chunk resolution to
the existing `ChunkStructureResult` envelope. It is intentionally not connected to `WorldPlan` or
chunk streaming yet, so it changes no visible level, collision, ring gate, or saved progression.

## Product decision

Hunker Bunker's levels should become **fixed landmarks connected by variable
routes**.

Each run retains deterministic procedural corridors, cliffs, hazards, optional
branches, and encounter packages, but they connect a recognizable sequence of
authored place sets: the crash settlement, valley crossing, hospital, camps,
hives, objective facilities, boss thresholds, and Queen finale. Players learn
what kind of place they are approaching without knowing its exact route,
condition, occupants, complication, reward, or exit configuration.

At the same time, the crash site becomes a compact run headquarters. Players
bring materials home, choose from seeded project offers, construct visible
facilities on safe authored plots, and create a run-specific combination of
survival, combat, traversal, faction, and narrative effects. Permanent
progression expands the future project pool; the powerful settlement itself
resets with the run.

The first proof is a constructed bridge across the valley separating Ring 1
from Ring 2. It combines authored geography, crafting, gating, a defense beat,
persistent world-state change, audio, multiplayer authority, and a meaningful
return shortcut in one legible set piece.

## Evidence base

This plan synthesizes two parallel code-and-asset audits:

- [Set-piece and level-generation audit](../reports/setpiece-level-generation-audit-2026-09-12.md)
- [Crash-site crafting and run-progression audit](../reports/crash-site-crafting-and-run-progression-audit-2026-09-12.md)
- [Gate stage areas — detailed level design](gate-stage-areas-design-2026-09-12.md)
  defines the spatial, narrative, encounter, Blender, Cycles-backdrop, and acceptance contracts for
  all four ring crossings, with the Ring 1→2 bridge specified to Blender-ready production depth.

The implementation should extend the current architecture rather than replace
it:

- `mazeExpedition.js` already builds deterministic radial topology and route
  chunks from a shared run seed;
- `mazeTiers.js` already names five progression layers;
- `ringManifest.js` already reserves mandatory goals, territories, quests,
  content budgets, and crossings;
- `territoryPlanner.js` already assigns ordered camp/hive beats to route
  chunks;
- `authoredWorldRuntime.js` already selects and rotates authored chunks with
  typed procedural fallback;
- `chunkStructure.js` already exposes the common structure result consumed by
  themes, population, encounters, objectives, containment, and rendering;
- `ringCrossings.js` already reconciles locked, objective-ready, boss-pending,
  and open states from durable facts;
- the crash site is already a special authored origin landmark with fixed ship
  goals and coordinates;
- `fabricator.js`, bank resources, camp economies, run drops, and run modifiers
  already prove crafting transactions and run-changing effects.

The perceived “random-room” problem is mainly that the authored catalog is
small and single-chunk. It currently has eight room builds and eight hallway
archetypes, while several important reservation families still fall back to
generic architecture. Large places have no deterministic multi-chunk claim
layer.

## Design pillars

1. **Known landmark, unknown journey.** The valley, hospital, camp, or hive has
   a learned identity; its approach and current problem change each run.
2. **Fixed critical path, variable connective tissue.** Random generation may
   branch from or dress the route, but cannot overwrite required sockets,
   objectives, construction plots, or crossing lanes.
3. **Every build changes play.** Projects unlock actions, routes, conversions,
   allies, defenses, or new risks—not merely small percentage bonuses.
4. **The base visibly remembers.** Models, light, clutter, NPC routines, audio,
   and dialogue reflect what the squad built and whom it supported.
5. **Warmth creates attachment, not chores.** Returns deliver recovery,
   decisions, people, and visible change without hunger meters, plank-by-plank
   placement, or inventory-grid housekeeping.
6. **Small catalog, deep combinations.** A curated pool of tagged projects,
   relics, factions, and drawbacks creates explainable emergent strategies.
7. **No seed can brick.** Every required objective and material exists on the
   reachable side of its gate, with structural fallback and validation.
8. **Shared co-op authorship.** The world plan and base belong to the run, not
   one client; irreversible choices use host authority and a short squad vote.

## World-generation model

```text
authored crash-site place set
  -> seeded typed connector chain
  -> authored destination place set
  -> seeded branch / pressure / relief connectors
  -> authored ring-crossing set piece
  -> next ring's authored destination portfolio
```

### Layer 1 — macro topology

Keep the current route graph authoritative. It determines rings, connectivity,
minimum route lengths, outward progression, and site neighborhoods. Do not
build a second generator beside it.

Derive independent named random streams from the run seed:

- `topology`;
- `setpiece-allocation`;
- `connector-chain`;
- `setpiece-presentation`;
- `encounters`;
- `loot`;
- `project-offers`.

Adding a cosmetic prop roll must never move a bridge or change a draft offer.

### Layer 2 — authored place sets

A place set is a versioned graph of authored chunk modules. It declares:

- family, ring/biome eligibility, footprint, pivot, rotation/reflection policy;
- required ingress/egress and optional secret/shortcut sockets;
- ordered beats: threshold, reveal, interaction, complication, reward, exit;
- room module IDs and permitted presentation variants;
- objective, lore, encounter, build, audio, and state anchors;
- critical traversable lanes, safe zones, containment, and fall hazards;
- resource/reward guarantees and fallback placement;
- stage/state overlays and collision deltas;
- render, light, audio-emitter, NPC, and performance budgets.

The planner claims the entire footprint at world-plan creation time. Individual
chunks never independently roll membership in a multi-chunk landmark.

Recommended data boundary:

```js
{
  version: 1,
  id: 'crossing_valley_bridge_v1',
  family: 'ringCrossing',
  footprint: [{ dx: 0, dy: -1 }, { dx: 0, dy: 0 }, { dx: 0, dy: 1 }],
  eligibility: { rings: [1], roles: ['ringCrossing'] },
  sockets: [
    { id: 'near', at: { dx: 0, dy: 1 }, side: 's', width: 3, required: true },
    { id: 'far', at: { dx: 0, dy: -1 }, side: 'n', width: 3, required: true }
  ],
  modules: [
    { at: { dx: 0, dy: 1 }, buildId: 'bridge_approach' },
    { at: { dx: 0, dy: 0 }, buildId: 'bridge_span' },
    { at: { dx: 0, dy: -1 }, buildId: 'bridge_far_abutment' }
  ],
  stages: ['ruined', 'surveyed', 'scaffolded', 'online', 'damaged'],
  criticalRoute: ['near', 'bridge_span', 'far']
}
```

### Layer 3 — typed procedural connectors

Connectors remain variable but are selected by a grammar rather than treated as
undifferentiated hallways:

| Connector | Spatial promise | Variable pressure |
| --- | --- | --- |
| Pressure hall | doors, cover pockets, service spur | patrol, blackout, venting, locked cache |
| Cliff ledge | one readable safe lane and distant sightline | wind, brittle edge, ranged threat |
| Canyon walkway | rails, broken span cues, bridge sockets | exposed combat, lower cache, falling debris |
| Maintenance trench | pipes, low cover, repair recess | steam timing, ambush, resource seam |
| Ice cave | natural arch, fractured shortcut | visibility, collapse, cryo enemies |
| Bio tunnel | living occluders and pulse direction | infection, resin gate, creature pressure |
| Return shortcut | sealed from outbound side | milestone-opened safe route home |

For each link, the planner chooses chain length, turns, elevation impression,
quiet beats, combat density, branches, and presentation variation inside a
budget. WFC/procedural tile filling occurs only after critical lanes and
place-set sockets are fixed.

### Layer 4 — deterministic state overlays

The footprint and anchors do not move after generation. State changes swap
declared collision, props, NPCs, lights, audio, hazards, and interactions:

- bridge: ruined → surveyed → funded → scaffolded → online → damaged;
- crash site: wreck → sheltered → powered → specialized;
- camp: distressed → stabilized → expanded → allied/turned/evacuated/destroyed;
- hive: warning → active → bonded/harvested/hostile/destroyed;
- hospital: sealed → breached → decontaminated/infested/looted;
- objective facility: dormant → unstable → operating/destroyed.

Transitions are atomic: validate the next nav/collision result, persist the
state, then change presentation. Never reroll a place set after player action.

## Allocation and resolution architecture

### World-plan allocation

Add a pure set-piece allocation stage after reservations/territories and before
chunk streaming:

1. sort required candidates: crash, crossings, finale, territories, mandatory
   goals, active quest destinations, optional landmarks;
2. select eligible blueprints using a setpiece-specific RNG stream;
3. rotate only through the declared transform policy;
4. fit claimed cells to route chunks or add a deterministic topology spur;
5. require reciprocal external sockets and honor territory sockets;
6. reject overlaps with earlier claims, tutorial clear zones, or locked-space
   violations;
7. serialize blueprint, version, transform, module IDs, presentation variant,
   claimed chunk keys, and omission/fallback reason;
8. fail validation if any required set piece cannot be placed.

### Runtime resolution order

`ThreeGame.buildChunk()` should resolve:

1. authored crash-site module;
2. claimed required set-piece module;
3. active single-chunk reservation;
4. authored typed hallway;
5. procedural architectural fallback.

Every producer returns the existing `ChunkStructureResult` plus optional
`setpieceId`, `moduleId`, `stage`, and diagnostics. Downstream theme, content,
population, door, reachability, encounter, objective, and containment systems
remain shared.

### Proposed modules

- `src/data/placeSets.js` — immutable catalog;
- `src/placeSetPlanner.js` — allocation, transform, footprint, socket validation;
- `src/setpieceRuntime.js` — claimed-chunk resolution and stage projection;
- `src/connectorPlanner.js` — typed connector-chain planning;
- `src/data/runProjects.js` — immutable construction recipes/offers;
- `src/runConstruction.js` — transactions, stages, upgrades, damage, serialization;
- `src/crashSitePlan.js` — hub zones, plot sockets, visual-state projection;
- `src/constructionEffects.js` — allowlisted effect resolution;
- `src/setpieceDiagnostics.js` — seed/claim/fallback debug output.

Keep orchestration adapters in `threeGame.js` thin and characterized by tests.

## Authored destination portfolio

| Place family | Initial footprint | Consistent expectation | Seed/state variation |
| --- | ---: | --- | --- |
| Crash settlement | 3×3 around origin | wreck, hearth, mandatory ship systems, plots, safe return | class wreck, storm damage, visitor, project offers, faction influence |
| Valley bridge | 1×3 or 2×3 | visible gulf, survey deck, buildable span, far threshold | orientation, bridge method, defense, lower ledge, weather |
| Hospital | 2×2 | reception, ward, surgical core, pharmacy/records exit | sealed, looted, infected; patients; cure/salvage choice |
| Survivor camp | 2×3 | approach, perimeter, hearth, service, leader, exit | camp identity, crisis, mirror, defenses, aftermath state |
| Hive territory | 2×3 | warning, contaminated approach, nest, choice, consequence, escape | hive identity, organic fork, bond/harvest/hostility |
| Industrial objective | 1×2 or 2×2 | machinery reveal, control problem, consequence, reward | power state, hazard, enemy pressure, schematic family |
| Security holdout | 2×2 | barricade, kill lane, command post, breached flank | survivors, siege vector, turret state, vault |
| Boss threshold | 2×2 | foreshadow, staging, arena, unlock reveal | cover, adds, environmental hazard, post-kill exit |
| Queen finale | 3×3 | irreversible descent, throne/chamber, ending-vector choice | visible consequences from camps, hives, infection, passengers |

Each major family should ultimately have at least two topological variants and
three presentation/state variants. Rotation multiplies variety but never
substitutes for genuinely different path decisions.

## Crash site: the run headquarters

### Spatial plan

```text
                 SIGNAL RIDGE
             [mast] [map] [weather]
                       |
 DEFENSE EDGE -- WRECK CORE -- LIFE SUPPORT
 [turret/trap]  [ship/O2]    [med/bio]
                       |
             HEARTH -- WORKSHOP
          [people/cots] [craft/sort]
                       |
                 WORLD INGRESS
```

Requirements:

- direct readable path from spawn to every mandatory terminal;
- loop around the ship with no dead-end camera traps;
- two combat ingress lanes and one protected civilian/hearth pocket;
- fixed tagged plot sockets, not freeform voxel construction;
- no project blocks extraction, the north exit, or another plot;
- construction silhouette and interaction prompt readable at isometric scale;
- return arrival frames the latest project before opening menus.

### Cozy-survival cadence

“Cozy” comes from evidence of care under pressure:

- emergency red light warms toward dirty amber as systems stabilize;
- rescued people sleep, cook, repair, sort supplies, and react to weather;
- curios and lore objects appear on shelves after discovery;
- each built device contributes one restrained ambient layer;
- the map table gains marked routes and crossed-out threats;
- a return briefly suppresses combat music, restores breathable space, tallies
  salvage, resolves visitor/dialogue beats, and reveals construction progress.

Avoid hunger/thirst chores, daily crop schedules, individual plank placement,
and storage-grid maintenance. The cadence is expedition → decisive project →
visible transformation → changed next expedition.

## Construction and crafting

### Persistence boundary

| State | Run reset? | Contents |
| --- | :---: | --- |
| Construction materials | yes | generic salvage, structure, biomass |
| Draft offers/schematics | yes | current seeded choice pool and rerolls |
| Constructed base | yes | plots, project tiers, damage, visitors, defenses |
| Combat build | yes | relics, overclocks, synergies, drawbacks |
| Account knowledge | no | discovered project families, lore, cosmetics, difficulties |
| Steam inventory | no | existing tradable/cosmetic items; never required for construction |

Construction uses two run-local material tags from the first prototype. It does not draw from
TECH/MED/COIN: those currencies retain their existing ship-goal and armory roles so building a wall
does not silently mean delaying mandatory progression.

- `structure`: beams, plating, cable, fasteners;
- `biomass`: resin, membrane, chitin, culture.

Both construction materials reset with the run and are never written to account inventory. Their
sources, sinks, guarantees, and end-of-run treatment must be tuned independently from the persistent
economy. This is locked owner decision D3; the subordinate setpiece addendum records the rationale.

### Project recipe contract

```js
{
  id, version, family, tier, plotTypes,
  offeredBy, requiresFlags, forbidsFlags,
  cost, buildSeconds, stages,
  tags, effects, synergies, drawbacks,
  visualStateIds, audioEventIds,
  upgradeInto, dismantleReturn,
  narrativeConsequences
}
```

Recipes are data; effects resolve through an allowlisted registry. Saved data
never executes callbacks. Transactions must be idempotent, host-authoritative
in co-op, checkpointed, and recover safely from quit/disconnect during assembly.

### Seeded project draft

At the first schematic cache and meaningful returns, offer three projects from
a seeded weighted pool. The unchosen offers leave unless a project preserves
one. Weights may respond to class, ring, injuries, relic tags, visited factions,
available plot types, and existing projects.

Rules:

- no immediate duplicate family unless an upgrade requires it;
- every offer must be currently buildable or identify a guaranteed reachable
  ingredient source;
- at least one neutral mechanical route completes mandatory progression;
- rerolls have a real opportunity cost and a capped count;
- offered IDs and RNG cursor are checkpointed;
- co-op sees one shared offer and uses a short vote/host-confirm flow.

### Initial project catalog

| Family | Three-way identity | Run-changing effect and cost |
| --- | --- | --- |
| Life support | scrubber condenser / fungal lung / overpressure reservoir | efficient O2 / alien healing plus infection pressure / burst refuge on cooldown |
| Workshop | precision bench / salvage sorter / wet bioforge | targeted mechanical draft / dismantle-reroll economy / mutate relic tags and hive response |
| Signal | survey mast / listening choir / false beacon | preview a route / expose hive opportunities / redirect a hunter toward a prepared site |
| Defense | Vesper turret / shock fence / decoy garden | direct defense / lane control and power draw / stealth at biomass upkeep |
| Hearth | mess table / infirmary cots / shrine of recovered names | visitor/trade strength / injury recovery / humanity and narrative memory |
| Mobility | cable winch / crawler saddle / portable gantry | bridge construction / organic shortcuts / temporary connector traversal |
| Specialist | mechanic / medic / cartographer | repair efficiency / recovery economy / branch information, each with a personal request |

### Combinatorial examples

- `last_breath` + Overpressure Reservoir turns deliberate low-O2 timing into a
  combat resource while making emergency refill timing precious.
- `scrap_cycler` + Salvage Sorter makes explosive reloads compete directly with
  bridge materials.
- Queen's Milk + Fungal Lung builds around alien healing while ordinary human
  medicine becomes dangerous and Tallow reacts.
- Meridian Survey Mast + Scout reveals branch topology but not exact rewards.
- Vesper Turret + False Beacon lets the player lure a hunter into a prepared
  defense at the risk of project damage.
- Bonded Suture Hive + living bridge substitutes biomass for structure, enables
  self-repair, and increases human suspicion.

The target is an explainable run thesis—“a noisy fortified salvage base” or “a
living refuge that profits from infection”—rather than a list of percentages.

### Fairness and loss

- mandatory materials have a guaranteed source before their gate;
- optional projects dismantle for 60-75% return;
- mandatory components cannot be dismantled or permanently destroyed;
- failed defense can damage/disable optional projects, not erase the only path;
- one bad draft cannot prevent bridge completion;
- failed construction refunds or preserves a declared fraction exactly once;
- death summaries distinguish field loss, deposited materials, damaged
  projects, account knowledge, and recoverable black-box value.

## First vertical slice: Ring 1 valley bridge

### Required progression decision

Current data places `blast_bulkhead` at Ring 1→2 and `collapsed_bridge` at Ring
2→3. The desired signature bridge is Ring 1→2.

Adopt this migration:

1. make `crossing_valley_bridge_v1` the physical and narrative Ring 1→2 gate;
2. preserve stable crossing IDs in saved data through an explicit versioned
   migration rather than changing array meaning in place;
3. move or reinterpret the blast bulkhead as the crash-site north threshold or
   as a bridge-approach pressure door, not an additional hidden progression
   lock;
4. give Ring 2→3 a new authored obstruction selected from the existing tier
   fiction—freight lift, collapsed transit bore, or powered canyon causeway;
5. retain the existing four-condition crossing semantics by making bridge
   construction satisfy the goal/mission side of the contract, not a fifth
   invisible requirement.

This decision must receive a save-migration test before implementation lands.

### Spatial block

```text
RING 1 / NEAR SIDE                         RING 2 / FAR SIDE

[variable approach]
       |
[reveal overlook]--[survey/workshop deck]==== broken valley ==== [abutment]
                          |                         |                  |
                    supply spur             scaffold/defense     hospital or
                    guaranteed              construction lane    Outworks reveal
                          |
                  optional lower ledge cache (never a bypass)
```

### Player beats

1. Foreshadow the valley through wind, cliff silhouettes, and broken gantry.
2. Reveal the far-side authored landmark before the player can reach it.
3. Survey the workbench; show one mandatory neutral plan, one seeded alternative,
   and one locked faction method as future possibility.
4. Mark a nearby authored supply place containing the guaranteed minimum.
5. Let an optional exposed lower ledge yield surplus or a project mutation.
6. Deposit resources and commit to one method.
7. Assemble through visible stages during a 30-60 second interruptible defense.
8. Lock the span, validate navigation, reveal the Ring 2 Depth Contract, and
   open the far threshold.
9. Make the completed span a reliable, shorter return path whose utility
   reflects the chosen construction method.

### Bridge variants

| Variant | Inputs | Benefit | Tradeoff | Look/audio |
| --- | --- | --- | --- | --- |
| Salvage gantry | structure + TECH | dependable neutral progression; accepts utility socket | highest generic material cost | welded plate, cable lamps, irregular iron rhythm |
| Tallow mycelial span | biomass + MED plus knowledge | repairs slowly and shelters from weather | infection pulse and human suspicion | pale rib structure, amber sacs, tendon tension |
| Meridian tension bridge | TECH + COIN plus contact | scanner nodes reveal nearby branch | narrow deck and power interruption | taut cable, cyan survey beams, resonant wire |
| Vesper assault causeway | structure + COIN plus contact | cover and defense during pursuit | noise raises director attention | barricade plate, red cages, heavy lock cadence |

Only two variants are required in the first playable proof. The neutral gantry
is always available; the second is seed/faction dependent.

### State contract

`surveyed → funded → assembling → defended → online → damaged`

- pre-build valley collision is impassable outside the canonical span;
- construction consumes materials exactly once;
- leaving pauses or deterministically resolves the defense; it never silently
  consumes again;
- only `online` opens one validated three-cell-wide traversal lane;
- `damaged` remains repairable from either side and cannot permanently trap the
  player;
- host owns transaction/stage/HP in multiplayer and broadcasts the snapshot
  before affected chunks remount;
- every stage survives save/reload and produces consistent collision, visuals,
  objectives, and audio.

## Story integration

### Camps

- Meridian projects emphasize information, precision, power routing, and
  efficient but narrow structures.
- Tallow projects emphasize care, shelter, biological exchange, and unsettling
  living maintenance.
- Vesper projects emphasize fortification, ammunition, noise, and defensible
  geometry.
- Helping, robbing, culling, turning, or evacuating a camp changes its place-set
  overlay and which future projects can enter the draft.

### Hives

- Suture affects healing structures, biological bridges, and bodily costs.
- Relay affects signals, route knowledge, false beacons, and communication risk.
- Carapace affects defense, armor, barricades, and whom structures protect.
- Bonding/harvesting must create different materials, spatial states, dialogue,
  and ending pressure—not only currency deltas.

### Hospital

The first Ring 2 destination after the bridge should be a hospital family so
the bridge promises a visually clear goal. Its variants can be:

- sealed quarantine: restore power and choose whom to admit;
- abandoned ward: recover MED and a survivor record while avoiding cryo hazards;
- Suture-infested surgery: accept a bodily modification or salvage the living
  equipment;
- occupied triage: rescue patients, recruit a specialist, or divert supplies.

Every variant shares reception, ward, surgical core, and records/pharmacy exit,
so players learn the place while discovering a different problem.

## Asset plan

### Reuse now

- crash: broken class ships, O2 generator, radar, fusion generator, console,
  hull matrix;
- Gothic architecture: bulkhead frames, grand archways, rib vaults, buttress
  pillars, stained windows, shrine niches;
- hospital: medical bed, vital monitor, surgical cart, diagnostic console,
  specimen tanks, frozen bodies, empty exosuits;
- construction: fabricator workstation, conduit hub/junction, pipe rupture,
  valve wheel, Tesla coil, storage drums, supplies, cable/bolt scatter;
- camps: cots, crates, barricades, defense turret, civilians, named leaders;
- hives: biomech arches, incubator, neural synapse, respirator, triage cradle,
  resin sacs/basins, tendril altar, mycelium loom, spore vents;
- finale: Queen throne, Queen, corrupted leaders, snail bosses and sentinels.

### Build/verify next

1. modular bridge deck, ruined span, rails, piers, cables, workbench, scaffold,
   damaged and online states;
2. large valley silhouette/ice wall modules and distant cliff caps;
3. snap-compatible crash foundations, walls, roofs, awnings, plot ghosts, and
   construction-state meshes;
4. hospital partitions, doors, signage, curtains, ceiling services, pharmacy
   storage, and powered/infested overlays;
5. camp/hive approach and perimeter modules sized to chunk sockets;
6. collision proxies, standardized scale/origin, LOD/texture/draw-call budgets,
   and isometric silhouette review for reused assets.

## Audio implementation connection

The set-piece/build system consumes semantic soundsets from the
[CC0 game audio integration plan](cc0-game-audio-integration-plan-2026-09-12.md):

- connector thresholds: door, wind, pressure, and room-transition families;
- bridge: cable strain, metal placement, lock dogs, construction loop, defense
  warning, completion impact, wind shelter, damaged groan;
- crash projects: one contextual emitter per logical machine, not per mesh;
- hospital: terminal life, medical scanner, ventilation, quarantine alarm;
- hive states: resin shift, sac pulse, membrane valve, egg warning;
- destruction/boss thresholds: size-classed impact and critical telegraph.

The initial audio foundation is now coded: explicit `foley` bus routing is
fixed and a pure soundset registry/selector supports validation, deterministic
selection, loaded-key filtering, fallbacks, and no-immediate-repeat behavior.
The registry intentionally remains empty until derived sounds pass audition and
provenance gates.

Every place set declares semantic audio zones/emitters; it never embeds runtime
file paths. Critical warnings override texture density. Emitters dispose with
their chunk and obey contextual loading, concurrency, distance, obstruction,
mute, and user-volume rules.

## Debugging and authoring tools

Add a set-piece debug mode that shows:

- run seed and named RNG stream;
- ring boundaries and locked/unlocked state;
- claimed footprints, blueprint/module IDs, rotation, sockets, and stage;
- critical lane, nav reachability, fall hazards, build plots, and objective
  anchors;
- typed connector chain and fallback reason;
- resource-solvency proof for mandatory construction;
- audio zones/emitters and active soundset IDs;
- per-place draw calls, triangles, texture memory, lights, loops, and enemies.

Provide seed replay, plan export/import, and a gallery route that mounts every
module/state without playing a full run.

## Implementation phases

### Phase 0 — freeze contracts and migrate the bridge

- decide and version the Ring 1→2 bridge migration;
- add a structure-specific GLB placement path that preserves authored scale and pivots; the existing
  prop loader height-normalizes and bounds-centers every model and cannot mount stage shells;
- adopt layered Blender construction: scale-preserving module shells establish silhouette and
  sockets, while the existing addressable kit supplies replaceable dressing;
- characterize current topology, crossings, reservations, authored fallback,
  crash placement, and save behavior;
- define place-set, claim, connector, project, and construction schemas;
- add validation and debug serialization before rendering new art.

Exit: a 49×49 reference shell retains exact scale/pivot through load and rotation, old saves retain
equivalent unlocked depth, required set pieces allocate
for a seed independent of visit order, and current procedural fallback remains
playable.

### Phase 1 — multi-chunk bridge greybox

- implement catalog, allocator, claim serialization, and claimed-chunk resolver;
- author approach/span/abutment modules with proxy geometry;
- enforce impassable valley and reciprocal sockets;
- mount ruined/surveyed/online stages without crafting first.

Exit: 1000-seed sweep produces connected Ring 1, unreachable Ring 2 before
opening, reachable Ring 2 after opening, no claim overlaps, and stable hashes.

### Phase 2 — bridge crafting and defense

- implement run construction ledger and neutral gantry recipe;
- guarantee the supply destination on the near side;
- add deposit, staged assembly, defense, pause/resume, repair, and checkpoint;
- synchronize transaction and stage in multiplayer;
- integrate bridge objectives, Depth Contract presentation, audio semantics,
  and comparison captures.

Exit: bridge resources cannot double-spend, save/reload cannot skip or relock
the gate, clients agree, failure cannot brick the run, and the completed bridge
is a useful return route.

### Phase 3 — crash-site project vertical slice

- build fixed plots and six hub zones;
- ship one project choice in each of Life Support, Workshop, and Signal;
- implement seeded three-choice draft, reroll, upgrade/dismantle, visual stages,
  and effect snapshot;
- add NPC use, warm-light progression, contextual emitters, and return reveal.

Exit: two seeds or two choices produce observably different next-expedition
decisions; the hub remains navigable and readable on controller/Steam Deck.

### Phase 4 — Ring 2 hospital place set

- author the 2×2 common grammar and at least two structural/presentation
  variants;
- connect bridge far-side socket to hospital threshold through a variable
  connector chain;
- integrate power/infection state, objective anchors, patients or evidence,
  reward choice, and a return shortcut.

Exit: players recognize “hospital” while route, state, challenge, and payoff
vary; every objective and exit passes reachability/containment tests.

### Phase 5 — camps and hives as place sets

- convert existing territory beats into claimed multi-chunk modules;
- resolve entity transforms from canonical content beats;
- preserve current position selection as migration fallback;
- implement consequence overlays and faction project unlocks.

Exit: each faction/hive is identifiable from approach silhouette and audio;
state changes persist without moving anchors or regenerating topology.

### Phase 6 — portfolio and run-combination expansion

- add industrial objective, security holdout, boss threshold, and finale sets;
- expand project catalog only after effect tags and offer fairness are proven;
- author at least two topology variants and three presentation/state variants
  for each major family;
- tune route pacing across the 35-45 minute Proof Run.

Exit: blind playtesters can describe route landmarks and their run-build thesis;
seed portfolio shows meaningful variety without broken progression or content
budget spikes.

## Verification

### Automated

- same seed/state produces identical topology, claims, connectors, offers,
  variants, anchors, and stage projection;
- chunk visitation/build order does not change the plan;
- claimed footprints never overlap and all external sockets reciprocate;
- golden path and every required objective remain reachable;
- locked ring is unreachable before crossing and reachable after it;
- mandatory materials are reachable before their consuming gate;
- stage transitions are idempotent and navigation-valid;
- save migration, checkpoint resume, disconnect/reconnect, and legacy fallback;
- co-op host is sole transaction authority and clients converge;
- plot occupancy never blocks critical routes;
- place budgets cap enemies, lights, particles, loops, draw calls, and texture
  memory;
- build/package audit includes required modules and audio but excludes sources.

### Human acceptance

- player can name a landmark from its approach silhouette;
- first-run player understands why the bridge is blocked and how to build it;
- far-side destination is visible before crossing;
- construction looks physical at every stage and completion feels consequential;
- completed bridge shortens/changes the return journey;
- crash site becomes warmer, inhabited, and personally configured during one
  run without becoming a chore screen;
- project choices materially change combat, survival, route, or faction
  decisions;
- two runs share recognizable place grammar but differ in routes, states,
  offers, threats, and rewards;
- objectives, hazards, prompts, and exits remain readable at 720p, 1080p, and
  Steam Deck scale.

## Work breakdown

| ID | Work item | Owner | Depends on | Acceptance evidence |
| --- | --- | --- | --- | --- |
| SP-01 | Bridge boundary decision and save migration | Systems/design | none | migration matrix and tests |
| SP-02 | Place-set/claim schemas and validators | World systems | SP-01 | pure unit tests and sample plan |
| SP-03 | Deterministic allocator and RNG streams | World systems | SP-02 | 1000-seed hash/overlap report |
| SP-04 | Claimed-chunk runtime resolver | Rendering/world | SP-03 | fallback and visitation-order tests |
| SP-05 | Bridge proxy modules and valley collision | Level design | SP-04 | gallery and traversal capture |
| SP-06 | Run construction ledger/transactions | Gameplay | SP-02 | idempotency/save/co-op tests |
| SP-07 | Bridge recipe, supply room, and objective | Gameplay/level | SP-05, SP-06 | complete proof-run capture |
| SP-08 | Bridge defense, repair, and return shortcut | Combat/gameplay | SP-07 | failure/recovery tests |
| SP-09 | Crash hub plots and state projection | Level/design | SP-06 | navigation and state gallery |
| SP-10 | Three-choice project draft and effects | Gameplay | SP-06, SP-09 | fairness sweep and divergent runs |
| SP-11 | First three crash project families | Design/audio/art | SP-10 | A/B run captures |
| SP-12 | Hospital place set and variants | Level/narrative | SP-04, SP-07 | reachability and variant gallery |
| SP-13 | Camp/hive territory conversion | Level/narrative | SP-04, SP-12 | state/quest regression suite |
| SP-14 | Authoring/debug gallery and budgets | Tools | SP-02 | gallery, plan export, perf report |
| SP-15 | Packaged co-op Proof Run acceptance | QA/release | SP-07-14 | named hardware/session evidence |

## Scope gates

- Do not create freeform construction before fixed plots prove fun.
- Do not add a new permanent currency for this system.
- Do not author dozens of room variants before bridge and hospital demonstrate
  the place-set pipeline.
- Do not convert all camps/hives in one change.
- Do not place story entities through both old and new systems simultaneously.
- Do not let decoration randomness influence topology or project offers.
- Do not ship source art/audio archives in runtime packages.
- Do not mark a phase complete from unit tests alone; each vertical slice needs
  an in-game capture and human readability review.

## Plan exit criteria

This plan is complete when:

- the Ring 1→2 bridge is an authored, buildable, persistent physical crossing;
- the crash site supports meaningful run-local project drafts and visible
  construction without navigation or save instability;
- hospital, camps, hives, objectives, and finale use versioned multi-chunk place
  sets connected by variable typed routes;
- the same seed/state is reproducible and no tested seed bricks progression;
- construction and relic/faction tags produce explainable run-specific builds;
- audio, art, collision, objectives, NPCs, and state overlays share semantic
  set-piece contracts;
- package/performance budgets and co-op/Steam Deck acceptance are recorded;
- remaining place/project variants are deliberately scheduled or cut.
