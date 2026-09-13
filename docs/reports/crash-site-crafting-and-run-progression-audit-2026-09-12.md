# Crash-Site Crafting and Run-Progression Audit

Date: 2026-09-12
Scope: design and repository audit only; no gameplay code changed

## Executive recommendation

Turn the crash site into the run's visible headquarters and make construction
the connective tissue between exploration, authored set pieces, ring gates,
survival pressure, and build experimentation.

The intended loop is:

> leave a damaged but inhabited crash site -> traverse generated connective
> routes -> enter a recognizable authored site -> return with constrained
> materials or a strange schematic -> choose what the crash site becomes ->
> use that choice to solve or transform the next crossing -> risk one more
> ring.

This does **not** require replacing the procedural world. The repository
already separates macro route planning (`mazeExpedition.js`), required content
reservations (`ringManifest.js`), authored room stamping (`roomBuilds.js`), and
local WFC generation (`wfcGenerator.js`). The practical expansion is to add:

1. authored multi-chunk **place sets** at reserved nodes;
2. typed procedural **connectors** between those places;
3. run-local **construction plots and projects** at the crash site and selected
   field locations;
4. a small seeded **schematic draft** whose choices combine with class, relics,
   camps, hives, and route state;
5. the Ring 1-to-2 valley bridge as the first complete vertical slice.

The crash site should feel cozy because it becomes legible, warm, inhabited,
and personally arranged—not because danger disappears. Every improvement is a
small declaration of what the player values this run, and every departure
leaves that fragile refuge behind.

## Evidence: what exists today

### World topology and authored-space foundation

- `src/mazeExpedition.js` is already the seeded macro authority. It creates the
  outward "snake," five rings, fixed camp/hive ring assignments, and four
  deterministic blockers.
- The blocker sequence already names a blast bulkhead, **collapsed bridge**,
  hive membrane, and flooded service tunnel. The collapsed bridge declares
  `opensTraversal: 'bridge'`.
- `src/ringCrossings.js` builds and validates a serializable crossing plan, but
  the repository comments still identify the physical crossing geometry and
  connected world change as incomplete.
- `src/ringManifest.js` reserves entries, return shortcuts, camps, hives,
  crossing sites, objectives, support rooms, rewards, and narrative content.
  Camp and hive territories already have ordered six-beat structures rather
  than being conceptually single rooms.
- `src/data/roomBuilds.js` and `src/roomBuilds.js` provide versioned authored
  layouts, cardinal rotation, sockets, structural/interaction/reward/lore
  anchors, zones, state variants, and deterministic selection/stamping.
- Existing room families include medical triage, armory, O2, field fabrication,
  puzzles, trap/reward rooms, caches, lore, rescue, engineering, and arenas.
- `src/worldRoutePlanner.js` can prove chunk reachability from compatible
  portals. This should become one layer of the place-set validation suite.

Conclusion: the correct direction is a composition layer above these modules,
not a second world generator.

### Crash site and construction-adjacent systems

- `src/threeGame.js` already creates a class-specific broken ship, crash-site
  floor art, an avionics/repair interface, an O2 module, hull matrix, radar
  dish, reactor compressor, flood lights, and a base turret.
- Four `BUILD_SITES` already drive the ship-goal progression: O2 bubble, hull
  expansion, radar node, and reactor compressor.
- Builds already have resource requirements, visual locked/unlocked states,
  milestones, scanner guidance, cinematics/events, and retaliation bosses.
- The Fabrication Foundry and fabrication UI already support crafting-like
  interaction. The current experience is chiefly menu/state progression,
  however; it is not a spatial base-building system with player choices,
  mutually exclusive plots, construction stages, or visible daily life.

Conclusion: preserve ship-goal progression as the mandatory backbone, then
wrap it in optional run-local construction rather than rewriting it.

### Economy and run-build expression

- Banked/common resources already include TECH, MED, COIN, and shells/salvage;
  `src/campEconomy.js` gives them explicit exchange values and camp-specific
  trades.
- Camps already grant class-sensitive benefits: Meridian improves route
  intelligence, Tallow improves survival/medicine, and Vesper improves ammo
  and turret behavior.
- `src/runDrops.js` already contains transformative relics and overclocks whose
  effects alter decisions (critical-O2 damage, ammo/O2 exchanges, reload
  explosions, alien-contact healing, and more).
- The separate Steam/seasonal crafting economy is persistent and inventory
  facing. It must not be confused with a run-local construction economy.

Conclusion: use existing resources and transformative mechanics, but establish
an explicit persistence boundary. Run construction must not become another
premium, seasonal, or grind currency system.

### Camps, hives, narrative, and consequence

- Camps occupy fixed rings and already support discovery, trade, bond, quests,
  active verbs, upgrades, and multiple outcome states.
- Hive sites already support mining, wounding, bonding, rescuing, consuming,
  and passenger/ending consequences.
- Existing story language repeatedly frames the player as a builder: the Queen
  calls the survivors "little builders," camps construct an escape vessel,
  and crash-site logs instruct the survivor to bank and build.
- The design pillars already call for "one more ring," bodily custody, and a
  world that remembers player actions.

Conclusion: construction choices should be factional and bodily choices, not
neutral tech-tree purchases. Human, machine, and hive construction methods
must produce different spaces, sounds, costs, and ending pressure.

## Problem statement

The current world can meet topology and content obligations yet still feel
like a succession of random rooms. Three missing scales cause that impression:

| Scale | Current strength | Missing experience |
|---|---|---|
| Macro | rings, snake route, blockers, fixed site rules | visible landforms and memorable gate geography |
| Meso | reservations and authored single-room builds | multi-room place sets with arrival, heart, complication, and exit |
| Home | ship modules and fixed build milestones | an evolving, inhabited crash site shaped by run choices |

The player also receives relics and upgrades, but does not yet create a
coherent spatial "build" they can point at. A run needs both meanings of build:
the combat rules carried by the operator and the refuge physically assembled
around the wreck.

## Design pillars for the new layer

1. **Known landmark, unknown route.** Players can learn that a valley crossing,
   hospital, camp, or hive has a recognizable grammar while its approach,
   hazards, state, reward, and exit vary by seed.
2. **Every project changes play.** A structure must unlock an action, route,
   economy, companion behavior, or survival rule. Pure decoration is a reward
   layer, not the core project choice.
3. **The base remembers the run.** Models, light, clutter, NPC routines, ambient
   audio, and dialogue reflect construction and faction consequences.
4. **Warmth has a cost.** Staying home restores clarity and creates attachment,
   but time/director pressure, limited stores, and deeper opportunities pull
   the player back out.
5. **Small combinatorial catalog.** Build replayability through tagged
   interactions among a curated set of meaningful components, not hundreds of
   percentage modifiers.
6. **No seed can brick.** Mandatory construction always has a deterministic
   resource floor, fallback route, and validated physical path.

## Proposed world grammar

### Three-part generation model

Generate each expedition as:

```text
CRASH-SITE PLACE SET
  -> connector chain (hall / ledge / cave / service trench)
  -> authored place set (camp / hospital / objective / hive / crossing)
  -> connector chain with optional branch and return shortcut
  -> next authored place set
```

#### 1. Place sets

A place set is a graph of authored chunks, not one decorated random room. Its
contract contains:

- stable `placeSetId`, family, version, ring eligibility, and footprint;
- required ingress and egress sockets plus optional secret/shortcut sockets;
- ordered beats: threshold, reveal, interaction, complication, reward, exit;
- room-build IDs or allowed pools for each beat;
- quest, lore, encounter, construction, and state anchors;
- guaranteed navigable lanes and combat containment;
- presentation variants and state overlays;
- resource/reward budget and fallback drops;
- audio zones, emitters, music state, and transition stingers;
- performance budget and minimum camera-readable silhouette.

Initial set catalog:

| Family | Consistent promise | Seed-variable dimensions |
|---|---|---|
| Crash site | wreck, repair terminal, fire/light, build plots, safe O2 center | ship class, plot offers, weather damage, visitor, clutter |
| Valley crossing | cliff reveal, broken span, assembly deck, far-side threshold | bridge design, materials, enemy pressure, lower-path cache, weather |
| Hospital | reception/triage, ward, surgical core, pharmacy or records exit | intact/looted/infested, patients, power routing, cure vs salvage reward |
| Human camp | readable approach, perimeter, communal heart, service area, leader | camp identity, outcome state, quest, defenses, available specialist |
| Hive | warning, grown approach, defended nest, choice chamber, consequence, escape | hive identity, dormant/wounded/bonded state, alternate organic shortcut |
| Industrial objective | approach, machinery floor, control room, consequence exit | power state, hazards, boss or puzzle, schematic family |
| Security holdout | barricaded entry, kill lane, command post, breached flank | occupants, turret state, siege direction, reward vault |

#### 2. Connectors

Connectors remain procedurally assembled, but acquire a typed grammar:

- `pressure_hall`: doors, cover pockets, service branches;
- `cliff_ledge`: one safe lane, sightline exposure, falloff silhouette;
- `canyon_walkway`: rail/broken-rail variants and bridge sockets;
- `maintenance_trench`: low cover, pipes, repair caches;
- `ice_cave`: brittle shortcuts and visibility risk;
- `bio_tunnel`: living occluders and infection pressure;
- `return_shortcut`: initially sealed, opens back toward an earlier landmark.

For each link, the route planner selects a connector chain within min/max
length, turn, elevation, combat-density, quiet-beat, and branch budgets. WFC
fills local geometry only after the critical lane and set sockets are reserved.

#### 3. Set-piece overlays

State overlays alter a stable place without regenerating its collision graph:
`powered`, `flooded`, `burning`, `infested`, `fortified`, `robbed`, `bonded`,
`storm`, and `night`. They swap dressing, hazards, emitters, dialogue, loot,
and encounter packages while preserving validation.

### Placement order

1. Generate the seeded macro topology.
2. Build the ring manifest and progression contract.
3. Reserve footprints for mandatory place sets and physical crossings.
4. Select compatible variants using the run seed and state constraints.
5. Connect required sockets with typed connector chains.
6. Add optional branches and return shortcuts within the ring budget.
7. Run graph, collision, objective, resource-solvency, and performance checks.
8. Only then populate incidental rooms, enemies, dressing, lore, and loot.

Critical rule: random content may decorate or branch from the golden path; it
may not overwrite a required anchor, construction plot, bridge lane, camp
territory beat, or quest destination.

## Crash site as the run headquarters

### Spatial layout

Use a compact, camera-readable hub with six named zones:

1. **Wreck Core:** ship, avionics, mandatory ship modules, extraction point.
2. **Hearth:** cookfire, seating/cots, visitors, camp dialogue, run summaries.
3. **Workshop:** fabrication, dismantling, project drafting, material storage.
4. **Defense Edge:** turret/barricade/trap plots facing the world ingress.
5. **Life Support:** O2, med, water/bio cultivation, suit decontamination.
6. **Signal Ridge:** radar, map table, route intel, weather and threat readout.

The hub needs a clear loop around the ship, a direct path from spawn to every
mandatory terminal, two combat ingress lanes, and reserved plots that never
block navigation. The first pass should use fixed plot sockets rather than
freeform voxel placement. Players still choose *what* and *where among valid
plots*, gaining authorship without collision, controller, or save complexity.

### Cozy expression

Cozy is delivered through accumulated evidence of care:

- survivors occupy cots, cook, repair, sort supplies, and react to weather;
- lights warm from emergency red toward amber as systems stabilize;
- collected curios and lore objects appear on shelves;
- a repaired radio, still, garden, or hive organ adds a distinct ambient layer;
- the map gains hand-marked routes and named danger zones;
- return sequences briefly lower combat music, replenish O2, count the haul,
  and show one new visible construction stage;
- optional layout choices persist for the run, while a small cosmetic memory
  (photos, patches, discovered curios) may persist across runs.

Avoid long survival-game chores. There is no individual plank placement,
sleep meter, crop watering calendar, or storage-grid shuffling in the core
scope. The rhythm is expedition -> decisive project -> visible transformation.

## Construction and crafting model

### Persistence boundary

| Layer | Resets at run end? | Contains |
|---|---:|---|
| Field inventory | yes | TECH, MED, COIN, organic matter, structural salvage |
| Run schematics | yes | drafted plans and discovered project mutations |
| Constructed base | yes | plots, tiers, visitors, defenses, bridge variant |
| Run combat build | yes | relics, overclocks, synergies, drawbacks |
| Account knowledge | no | discovered schematic entries, lore, cosmetic trophies, difficulty unlocks |
| Steam inventory | no | existing tradable/cosmetic economy; never required for run construction |

Use the existing currencies initially. Add at most two run-only material tags
when recipes need physical readability:

- `structure`: beams, plating, cable, fasteners, recovered from industrial and
  security spaces;
- `biomass`: resin, membrane, chitin, cultures, recovered or gifted by hives.

TECH controls circuitry and machines; MED controls sterile/living systems;
COIN remains portable trade value; shells/salvage can cover labor and generic
matter. Resource icons and pickups should expose tags, while the bank remains
the transaction authority.

### Recipe contract

Each `RunProjectRecipe` should declare:

```js
{
  id, family, tier, plotTypes,
  offeredBy, requiresFlags, forbidsFlags,
  cost, buildSeconds, constructionStages,
  tags, effects, synergies, drawbacks,
  visualStateIds, audioEventIds,
  upgradeInto, dismantleReturn,
  narrativeConsequences
}
```

Recipes should be data, while effects resolve through a tested effect registry.
Never execute arbitrary callback functions from save data.

### Project families

| Family | Example choices | Gameplay consequence |
|---|---|---|
| Life support | scrubber condenser / fungal lung / overpressure reservoir | efficient O2 / organic healing but infection / burst refuge with cooldown |
| Workshop | precision bench / scrap cycler / wet bioforge | targeted mechanical draft / reroll via salvage / mutate relic tags |
| Signal | survey mast / listening choir / false beacon | reveal routes / hear hive opportunities / redirect a hunt toward a site |
| Defense | Vesper turret / shock fence / decoy garden | direct damage / lane control and power cost / stealth with biomass upkeep |
| Hearth | mess table / infirmary cots / shrine of recovered names | stronger visitors/trade / injury recovery / humanity and narrative benefit |
| Mobility | cable winch / crawler saddle / portable gantry | bridge construction / bio-shortcuts / new connector traversal |

### Draft and discovery loop

At each major return or schematic cache, offer three project plans drawn from a
seeded, weighted pool. The player chooses one; the others are not automatically
banked. Weights respond to class, carried relic tags, visited faction, injuries,
ring, and existing projects, with hard anti-duplication and solvency rules.

The replayable variation comes from cross-system tags:

- `last_breath` + Overpressure Reservoir: stronger low-O2 window, but the
  reservoir's burst becomes a strategic combat resource.
- `scrap_cycler` + Salvage Sorter: explosive reloads compete directly with the
  material needed to build the bridge.
- Queen's Milk + Fungal Lung: alien healing base, human medicine becomes
  dangerous, and Tallow responds narratively.
- Meridian Survey Mast + Scout: reveals branch topology and one hidden place
  socket, but not its exact reward.
- Vesper Turret + false beacon: lets the player prepare a home-defense event,
  harvesting a pursuing threat at the risk of base damage.
- Bonded Suture hive + living bridge: biomass substitutes for structure, the
  crossing heals between attacks, and the human camps distrust it.

This takes inspiration from combinatorial roguelike deck/relic design without
copying another game's items, presentation, probability model, or scoring.
The goal is explainable emergent strategies: "I built a listening, living base
that profits from infection," not "I stacked +32% damage."

### Fairness rules

- Mandatory project ingredients have a guaranteed source on the reachable side
  of their gate.
- At least one no-faction mechanical recipe can complete every mandatory gate.
- Draft offers cannot all depend on an unavailable material or forbidden flag.
- Dismantling optional projects returns 60-75% of material and never destroys
  a mandatory progression component.
- A failed defense can damage or temporarily disable projects, not delete the
  run's only route forward.
- Co-op uses one authoritative shared site state and a short vote/confirm flow
  for irreversible project selection.

## First vertical slice: bridge across the Ring 1 valley

### Narrative and spatial purpose

The bridge is the first unmistakable proof that the player can change the
world. It spans a visible valley between the Ring 1 shelf and Ring 2 Outworks,
turning the existing `collapsed_bridge` blocker from a permission bit into a
learned landmark. Players see the far side before reaching it, understand the
material problem, choose a construction method, defend the work, and later use
the same crossing as a reliable return route.

### Place-set beats

1. **Foreshadow:** cliff silhouettes and a broken gantry are visible from the
   approach; wind and metal strain replace ordinary hallway ambience.
2. **Reveal:** camera framing exposes the far-side hospital/outworks landmark
   and the collapsed center span.
3. **Survey deck:** terminal identifies required load and shows two currently
   available bridge plans plus a locked faction alternative.
4. **Material loop:** a nearby authored industrial room supplies the guaranteed
   minimum structure/TECH; an optional dangerous lower ledge supplies surplus.
5. **Commit:** player deposits materials and selects a variant.
6. **Assembly event:** 30-60 seconds of staged construction with an interruptible
   defense, repair points, visible stages, and safe restart behavior.
7. **Crossing ritual:** the span locks, wind drops beneath the machinery, the
   Ring 2 Depth Contract appears, and the far gate opens.
8. **Return payoff:** the bridge is shorter and safer than the outbound material
   loop, and its chosen utility affects future crossings.

### Bridge variants

| Variant | Inputs | Benefit | Cost/risk | Visual identity |
|---|---|---|---|---|
| Salvage gantry | structure + TECH | dependable, supports turret/socket upgrade | highest generic material cost | welded plates, cable lamps, ugly straight deck |
| Tallow mycelial span | biomass + MED, Tallow or hive knowledge | slowly repairs and shelters from weather | infection pulse; human suspicion | pale ribs, soft amber sacs, grown handrails |
| Meridian tension bridge | TECH + COIN, Meridian contact | scanner nodes reveal nearby branches | narrower deck; power interruptions | taut cable geometry, cyan survey lasers |
| Vesper assault causeway | structure + COIN, Vesper contact | cover and defense during pursuit | loud; raises director attention | barricade panels, red lamps, gun nests |

Only two plans need to be available in the proof run. Variant availability
must never prevent progression.

### Mechanical contract

- The pre-build gap has real collision/fall prevention and no alternate bypass.
- `bridgeOnline`/canonical traversal state activates a placed bridge instance,
  updates nav/collision, opens the crossing, and survives save/reload.
- Build stages are `surveyed -> funded -> assembling -> defended -> online ->
  damaged` with idempotent transitions.
- Leaving during assembly pauses or resolves by a declared rule; it never
  silently consumes materials twice.
- Multiplayer host owns the transaction and broadcasts the chosen recipe,
  stage, HP, and completion event.
- A fallback interaction can repair a damaged bridge from either side.

## Run cadence

### Suggested 35-45 minute proof run

| Time | Beat | Construction payoff |
|---:|---|---|
| 0-5 | wake, repair O2, inspect empty plots | hub becomes survivable |
| 5-12 | first connector and authored support site | acquire first schematic/material identity |
| 12-18 | return and choose first optional project | combat/survival build gains a thesis |
| 18-26 | reach valley, survey bridge, raid supply place | spatial objective and tradeoff are explicit |
| 26-31 | construct/defend bridge | world visibly changes |
| 31-38 | cross into Ring 2 and enter hospital/camp/hive place | project changes approach or reward |
| 38-45 | extract or risk one more landmark | return shows inhabitants using the new base |

Limit mandatory round trips. A return should cause at least two payoffs among:
healing, dialogue, new visitor, project completion, draft choice, route intel,
visual upgrade, or narrative consequence.

## Required data and runtime boundaries

Add or extend focused modules rather than concentrating more logic in
`threeGame.js`:

- `src/data/placeSets.js`: immutable authored place-set catalog;
- `src/placeSetPlanner.js`: select, rotate, reserve footprint, validate sockets;
- `src/connectorPlanner.js`: connect reserved sets using existing tile/WFC
  vocabulary;
- `src/data/runProjects.js`: project/recipe catalog and effect tags;
- `src/runConstruction.js`: pure transaction, stage, upgrade, dismantle, and
  serialization logic;
- `src/crashSitePlan.js`: fixed hub zones, plot sockets, state-to-presentation
  projection;
- `src/constructionEffects.js`: allowlisted mechanical effect resolution;
- integration adapters in `threeGame.js`, `bank.js`, `ringCrossings.js`, audio,
  objectives, save/load, and multiplayer shared-world state.

Recommended serialized state:

```js
{
  version,
  runSeed,
  offeredSchematicIds,
  discoveredSchematicIds,
  selectedSchematicIds,
  plots: [{ plotId, projectId, tier, stage, hp, variant }],
  fieldProjects: [{ anchorId, projectId, stage, hp }],
  materialLedger,
  bridge: { crossingId, recipeId, stage, hp, online },
  visitors,
  cosmeticMemories
}
```

Save migrations must reject unknown effect IDs safely, preserve mandatory
ship-goal state, and refund orphaned run-project costs when a recipe is removed
between development builds.

## Asset reuse and gaps

### Strong reuse candidates already in `public/`

| Need | Existing assets |
|---|---|
| Wreck identity | class broken/healed ships, `ship_wreckage.png`, `crash_site_broken_floor_v1.png` |
| Mandatory systems | `module_o2_generator.png`, `module_hull_matrix.png`, `module_radar_dish.png`, `module_reactor_compressor.png` |
| Workshop | `prop_engineering_bench.png`, `prop_fabricator_workstation.jpg`, fusion generator and conduit props |
| Cozy camp layer | cots, bedrolls, cookfire lit/doused, laundry, crates, supplies, graves |
| Camp identities | Meridian battery/radio/repair rig; Tallow still/spore trays/resin urn; Vesper ammo press/shield rack/turret |
| Hive construction | resin sac, chitin hatchery, relay antenna, synaptic web, suture organ, wound cauterizer, eggs |
| Hospital | medical bed, vital/diagnostic props, biomechanical triage cradle/incubator |
| Route dressing | canyon falloffs, bunker/cryo/bio walls, doors, barricades, floor/wall/site atlases, debris |

### Required new assets

Priority 0 (bridge proof):

- broken valley/gantry hero set with near/far abutments;
- modular bridge deck, cables, rail, supports, weld points, and 3-4 build stages;
- collision proxy and nav-readable bridge footprint;
- mechanical and one faction bridge variant;
- construction hologram/ghost footprint and valid/invalid plot markers;
- material bundle pickups for structure and biomass;
- distant Ring 2 landmark silhouette;
- wind, cable strain, tool, ratchet, weld, placement, completion, damage, and
  bridge-footstep audio events.

Priority 1 (crash-site hub):

- plot foundations for workshop, hearth, defense, life support, and signal;
- construction-stage overlays (frame, partial, finished, damaged);
- storage piles that grow with the material ledger;
- inhabitant work/sit/warm/sleep animation loops;
- warm-light and weather-shelter variants;
- project icons and controller-readable draft cards.

Priority 2 (place-set expansion):

- hospital reception, ward partition, surgical theater hero assembly, pharmacy;
- cliff ledges, ladders, maintenance trench turns, and return-shortcut seals;
- state overlays for intact/looted/infested hospital and each camp/hive outcome;
- set-specific wide silhouettes and approach signage so places read before the
  player enters them.

Existing JPG hero props should be audited for transparency, projection, and
perspective compatibility before gameplay promotion. Assets that are attractive
but lack a clean alpha/collision contract belong in backgrounds or set cards,
not as interactive floor props.

## Audio and feedback requirements

Construction should use semantic event keys, not filenames:

- `construction.plan_open`, `construction.place_valid`,
  `construction.place_denied`, `construction.deposit`;
- `construction.stage_frame`, `construction.stage_power`,
  `construction.complete`, `construction.damage`, `construction.repair`;
- `bridge.wind_near`, `bridge.cable_tension`, `bridge.deck_footstep`,
  `bridge.lock`, `bridge.online`;
- one quiet loop per crash-site project family and state.

Mix behavior matters to the design: arriving home ducks threat ambience,
restores the hearth/workshop bed, and foregrounds whichever structures are
active. Construction completion gets a short mechanical cadence plus the
chosen faction timbre; it should not reuse a generic loot sting. Audio emitters
must follow the same plot/bridge state model as visuals so reload and co-op do
not create phantom loops.

## Delivery plan

### Phase 0: lock contracts and boundaries

- Name the place-set, connector, plot, project, and material schemas.
- Declare run-local/account/Steam persistence boundaries in code comments and
  save documentation.
- Build pure validators for IDs, sockets, anchors, recipes, solvency, and state
  transitions.
- Capture deterministic snapshot fixtures for at least 20 seeds.

### Phase 1: bridge greybox

- Reserve a real two-chunk valley crossing at Ring 1-to-2.
- Stamp near deck, gap, far deck, assembly anchor, and far threshold.
- Connect the existing crossing state to bridge visibility, collision, nav,
  objective state, compass, save/load, and co-op replication.
- Prove no walking, dash, knockback, alternate portal, or reload bypass.

### Phase 2: minimal crash-site construction

- Add three fixed optional plots and a project-selection UI.
- Ship one choice in each of workshop, survival, and defense families.
- Reuse existing assets for first finished states; add explicit construction
  stages.
- Make NPC/light/audio presentation react to completion.

### Phase 3: seeded schematic draft

- Add weighted three-choice offers with tags and anti-brick guarantees.
- Connect at least six project/relic/class/faction synergies.
- Add reroll or dismantle only after the default choice economy is readable.
- Add run summary language that names the strategy the player assembled.

### Phase 4: hospital and camp place-set proof

- Build one 4-6 beat hospital set from existing medical room contracts.
- Convert one camp territory (Meridian is the cleanest tech/route pairing) to a
  multi-room place set with all outcome overlays.
- Validate random approaches and exits around consistent internal geography.

### Phase 5: hive and route breadth

- Build one complete hive six-beat set and a living bridge mutation.
- Add cliff, trench, cave, bio-tunnel, and return-shortcut connector families.
- Extend state overlays and project consequences to the remaining camps/hives.

### Phase 6: balance, performance, and content scale

- Tune material income, trip count, build time, director pressure, and repair.
- Enforce draw-call, texture-memory, dynamic-light, audio-voice, and enemy caps.
- Grow catalog only after telemetry shows meaningful project selection and
  completion rather than obvious dominant picks.

## Acceptance criteria

### Automated

- Same seed and run state produce identical place sets, connector graph, draft
  offers, plots, and bridge variant.
- Every mandatory set has reachable ingress, objective, reward where promised,
  and egress; all required anchors resolve to actual content.
- Every generated seed has a valid path from crash site to each unlocked site
  and no path across a locked crossing.
- Mandatory bridge materials are reachable and sufficient before the bridge;
  no draft state can consume the only mandatory supply without a fallback.
- Building is atomic: failed or repeated input cannot double-charge, duplicate,
  or skip stages.
- Save/reload preserves construction, collision, bridge traversal, project
  effects, audio-loop state, and visual state.
- Unknown/removed recipes fail safely and refund according to migration policy.
- Co-op peers converge on the host's selected project, ledger, stage, HP, and
  bridge collision state.
- Project effects are allowlisted, order-stable, and covered in combinations,
  including at least pairwise tests with transformative relics.
- Generated site/connector budgets remain below agreed entity, light, texture,
  and audio concurrency ceilings.

### Human playtest

- From the crash site, a new player can identify the next landmark and explain
  why the valley cannot yet be crossed without reading a design document.
- The bridge is visible as a unique location before it becomes an objective.
- Two runs with different seeds share the expected hospital/bridge/camp grammar
  but have meaningfully different approaches, branches, threats, and rewards.
- Within ten minutes, a player can describe one way their base physically
  changed and one way that change affects play.
- By the Ring 2 crossing, a player can describe their run build as a strategy,
  not a list of bonuses.
- Returning home feels like relief and progress, while leaving again remains
  attractive; base interactions do not become repetitive chores.
- Bridge construction is readable with mouse/keyboard and controller and does
  not require precise cursor placement.
- Audio clearly distinguishes invalid placement, funded construction, danger,
  damage, repair, and completion without relying only on HUD text.
- No authored place reads as an isolated showroom: arrival, objective, conflict,
  consequence, and exit form a coherent mini-story.
- A Steam Deck proof run sustains the game's target frame pacing across hub,
  construction event, bridge vista, and authored multi-room site.

## Decisions to lock before implementation breadth

1. Whether the first bridge sits between the current logical Ring 1 and Ring 2
   (recommended) even though the legacy blocker array calls the collapsed
   bridge the second blocker; normalize player-facing naming before content is
   authored around ambiguity.
2. Whether optional projects are all fixed-plot (recommended for the first
   release) or whether a later constrained placement mode is worth supporting.
3. Which two bridge variants ship in the proof run; recommend Salvage Gantry
   plus Meridian Tension Bridge, with the organic span following the first hive
   place-set implementation.
4. Whether construction time advances the director. Recommend yes for exposed
   field projects and no for ordinary crash-site menu time; this keeps building
   tactical without punishing accessibility or careful reading.
5. Which tiny account-persistent cosmetic memories survive run reset. Keep them
   expressive and non-mechanical so the roguelike economy stays clean.

## Definition of the first shippable slice

The slice is complete when a fresh run begins at an obviously damaged crash
site, lets the player repair O2 and choose one optional project, routes through
procedural connectors into an authored material site, presents a visible broken
valley crossing, allows a fair choice between two bridge plans, stages and
defends construction, permanently opens the physical path into Ring 2 for that
run, and returns the player to a visibly warmer, more inhabited home whose
layout and mechanics reflect their choices.

That single loop proves the larger vision: random paths between dependable
places, a survival problem answered through construction, a run build expressed
both mechanically and spatially, and a home worth coming back to.
