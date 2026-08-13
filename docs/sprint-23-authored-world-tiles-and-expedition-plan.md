# Sprint 23: Authored World Tiles and Expedition Plan

Status: proposed implementation plan  
Scope: world generation, authored rooms, spiral/ring progression, sites, quests, encounter placement, rendering, and environment assets  
Primary runtime: `src/threeGame.js`  
Primary generation modules: `src/mazeExpedition.js`, `src/mazeTiers.js`, `src/tileCatalog.js`, and `src/wfcGenerator.js`

## Executive summary

Sprint 23 should turn the current mathematically valid procedural world into a deliberately paced expedition.

The game already has most of the large systems required for this:

- a deterministic expanding spiral from the crashed ship to the Queen;
- five closed ring routes and four named ring blockers;
- 17×17 authored meta-tiles stamped through a 3×3 WFC lattice into 49×49 chunks;
- extracted room metadata, room themes, prop budgets, encounters, doors, and gates;
- three fixed-ring survivor camps, three hive thresholds, and a final Queen site;
- four ship-system goals that unlock outward progression;
- milestone bosses provoked by ship-system completion that attack the ship;
- camp quests, hive choices, loot, lore, field fabrication, and divergent Act 2 endings.

The problem is not the absence of systems. The problem is that they do not yet share one authoritative placement contract. The macro planner knows where the spiral and named sites belong, the WFC knows how to stamp local geometry, and runtime systems know how to decorate and populate rooms, but no layer currently says:

> This seed must contain this medical room, this camp objective, this hive territory, this trap/reward chain, this fabricator site, and this return shortcut, in this dramatic order, before random halls connect them.

Sprint 23 introduces that missing layer. Authored rooms become the designed gameplay beats. Seeded procedural hallways become the connective tissue. Randomness changes the route, presentation, and optional discoveries without gambling the critical game loop, quest viability, or ending paths.

## Product outcome

At the end of the sprint, a player should experience this repeatable expedition cadence:

```text
Explore the current spiral/ring
    → discover authored rooms, a camp or hive territory, loot, lore, and missions
    → complete one of several valid objective paths
    → unlock a useful return shortcut
    → survive the return to the ship
    → bank MED / TECH / COIN
    → fabricate and prepare a loadout
    → build the next ship-system goal
    → defend the ship from the milestone retaliation boss
    → open the next ring crossing
    → revisit changed camps and hives later in Act 2
    → resolve Queen, eggs, infection, and passenger choices into divergent endings
```

The intended feel is authored destinations inside a replayable expedition, not a random maze filled after the fact.

## Non-goals

Sprint 23 does not:

- replace the expanding spiral with a different world shape;
- remove WFC or make every hallway hand-authored;
- rewrite camp, hive, fabricator, bank, objective, or ending state machines;
- make moral choices mandatory for basic completion;
- require every proposed art asset before the first playable vertical slice;
- solve player or enemy animation remaster work unrelated to world readability;
- expand the number of rings, camps, hives, or ending families.

## Current game: source-of-truth audit

### 1. Macro world and progression

`src/mazeExpedition.js` is already the macro authority.

- `generateRegionalRouteTopology` creates a long expanding spiral, called “the snake,” from the crash site to the mother hive.
- Five closed ring routes wrap that spine.
- Route chunks and route edges prevent independently generated chunks from creating macro shortcuts.
- `RADIAL_SITE_RULES` fixes Meridian, Tallow, and Vesper to rings 1, 2, and 3; Suture, Relay, and Carapace hives to rings 2, 3, and 4; and the Queen to ring 5.
- Four deterministic blockers represent a blast bulkhead, collapsed bridge, hive membrane, and flooded service tunnel.
- `RING_UNLOCK_GOAL_ORDER` is `o2Bubble`, `hullExpansion`, `radarNode`, and `reactorCompressor`.
- A soft radial clamp and canyon barrier currently communicate locked progression, but the source comments correctly identify real integrated gate geometry as incomplete.
- The plan projects nodes and blockers into chunk reservations and detects direct reservation conflicts.

`src/mazeTiers.js` already expresses a compatible tier vocabulary:

- Tier 1: Crash Shelf;
- Tier 2: Outworks;
- Tier 3: Deep Works;
- Tier 4: Hive Reach;
- Tier 5: Queen Core;
- site kinds for camps, camp objectives, hives, caches, gate bosses, and the Queen;
- economic goals plus boss requirements;
- support for validating two routes to the Queen.

The two modules overlap conceptually but are not yet one placement pipeline. Sprint 23 should consolidate their responsibilities rather than introduce a third competing progression model.

### 2. Local tile and chunk generation

`src/tileCatalog.js` currently defines:

- 7×7 authored room cores;
- five-cell canyon or plain bands;
- 17×17 meta-tiles;
- three-cell `OPEN3` sockets;
- rotations, anchors, weights, roles, population budgets, and some elevation sockets;
- room, corridor, canyon walkway, dead-end, solid, ramp, bridge, ladder, and plain families.

`src/wfcGenerator.js` currently:

- builds a connected 3×3 lattice with a spanning tree and optional loops;
- assigns room and hallway roles;
- selects socket-compatible catalog entries;
- stamps nine overlapping meta-tiles into a 49×49 chunk;
- removes shells between adjacent same-role cells to make merged rooms and hall runs;
- adds canyon bands without consuming protected traversal lanes;
- extracts room instances, anchors, and metadata for runtime consumers.

This provides local connectivity, but it also causes current visual and gameplay problems:

- merged rooms can become very large without receiving enough internal structure;
- hallway identity comes mainly from geometry and presentation rolls, so consecutive halls read similarly;
- a tile carries topology, geometry, role, dressing, encounter, and progression implications at once;
- later runtime passes mutate the grid after the authored tile is selected;
- metadata can describe the source tile more strongly than the final playable space;
- critical sites are projected onto chunks rather than constructed as complete multi-room territories.

### 3. Room interpretation and population

The room layer is more capable than a visual inspection suggests.

- `src/roomGeometry.js` derives interiors, wall cells, door lanes, bounds, roles, and population budgets.
- `src/roomThemes.js` supports active, cryo, bio, camp, reward, medical, security, engineering, storage, nest, and hive readings.
- Existing themes include bunker medical, bunker armory, cryo recovery, engineering, feeding chambers, camps, and reward caches.
- `src/roomPopulation.js` plans signature, large, small, and pickup placements.
- `src/threeGame.js` assigns themes, population plans, encounter plans, procedural doors, safe gates, access sources, vertical features, canyon shaping, and render materials.
- Architectural chunks can replace ordinary WFC output with a large room or long connector.

What is missing is an authored-room build contract. A themed room is currently a role plus dressing selected for generated geometry. It is not yet a guaranteed surgical theater, armory breach, O₂ compressor, pressure puzzle, or staged hive approach with known interaction and reward anchors.

### 4. Camps, hives, quests, and endings

The branching content is live and must be preserved.

- Camps occupy fixed rings and support discovery, O₂ refuge, support levels, bond, trade, passive effects, and active verbs.
- Nine named camp quests exist across Meridian, Tallow, and Vesper.
- Existing objectives already refer to reactor venting, archive recovery, a lost probe, spore cleansing, a lost cultist, an armory breach, and a bunker holdout.
- Camp outcomes include alive, robbed, culled, recruited, and turned.
- Hives can become dormant, mined, wounded, awakened, bonded, rescued, aboard, abandoned, slain, consumed, or invalidated by cure.
- Hive harvesting can provoke a local harvest boss.
- Act 2 tracks infection, Queen, eggs, human and alien passenger states, a four-seat manifest, and multiple ending families.
- `src/objectiveRegistry.js` provides a shared objective grammar, priorities, blocking reasons, parent/child relationships, and compass ownership.

The world generator does not yet reserve all conditional destinations needed by these quest branches. A quest can be mechanically implemented while its destination still reads as generic procedural space.

### 5. Loot, lore, and fabrication

The supporting economy is also present.

- Loot uses MED, TECH, and COIN plus rarity-weighted junk and caches.
- `src/loreDrops.js` has site-specific camp, hive, ruin, crater, cave, and anywhere drops with persistent discovery memory.
- The ship fabrication bay unlocks when O₂ powers the base.
- Fabrication has permanent recipes, banked salvage costs, timed printing, rarity rolls, targeted objective odds, limited site uses, and a break-for-refund choice.
- The foundry and field fabrication flow already provide a basis for authored fabricator rooms.

The missing rule is ownership: loot, lore, schematics, and quest props should belong to room and mission contracts, not only to global scatter/population passes.

### 6. Current rendering and asset coverage

The runtime already renders:

- merged floor planes and instanced wall families;
- bunker, cryo, bio, camp, storage, and specialized room materials;
- canyon pit, cliff, ledge, causeway, bridge, ramp, and ladder cells;
- door variants, decals, props, particles, weather, enemies, camps, hives, ship modules, and 3D overlays;
- room floor, wall, and site material atlases;
- many medical, camp, hive, O₂, security, door, and dressing sprites.

The art gap is less about global material coverage and more about authored-room identity, state variants, internal structure, and readable interaction silhouettes. Many upright room and camp props still lack optimized 3D counterparts, as tracked in `docs/3d-asset-coverage.md`.

## Problems Sprint 23 must solve

### Empty large rooms

Large merged or architectural rooms can be technically populated while still reading as empty. A few edge props cannot organize a broad floor plane.

Required correction:

- floor area determines a structural-content budget;
- large rooms receive two or more activity zones;
- huge rooms are reserved for authored set pieces only;
- internal geometry such as machinery islands, partitions, pillars, trenches, raised walks, wreckage, or nested chambers breaks sightlines and supports combat;
- a room that cannot satisfy its minimum structural budget is rejected or reduced.

### Repetitive hallways

Hallways need jobs, not only different turns.

Required archetypes:

- short connector;
- pressure corridor;
- service passage;
- canyon causeway;
- defensive approach;
- biome transition hall;
- secret/service bypass;
- hive warning approach;
- camp approach;
- boss staging approach.

The route edge selects the hallway job. Geometry, dressing, lighting, encounters, and length then derive from that job. The same archetype cannot repeat on consecutive critical-path edges unless explicitly permitted.

### Enemies visible in inaccessible holes or locked zones

Enemy placement must occur after final traversal and progression reachability are known.

Combat enemies must:

- belong to the player-reachable navigation component;
- belong to an unlocked progression tier;
- respect canyon and elevation separation;
- avoid spawning in near-field line of sight across inaccessible void;
- remain outside camp safe zones and authored quiet rooms;
- use room-owned encounter zones rather than any walkable-looking cell.

Distant ambient creatures are allowed only through an explicit ambience contract with minimum distance, no combat activation, and controlled visibility.

### Decorative rather than structural gates

The current soft clamp and canyon band are useful foundations, but ring gates must become authoritative world objects.

Each gate requires:

- one reserved crossing chunk;
- a unique authored landmark build;
- a physical collision state;
- a visible locked state and readable requirement;
- a mission-backed unlock;
- a changed-world open state;
- no alternate cross-ring portal while locked;
- a nearby return route or shortcut;
- persistence across reload and Act transition.

### Quest destinations that are generic or missing

Every active or potentially activated primary quest needs a reserved compatible destination. Conditional rooms can remain sealed, dormant, or generically dressed until the quest activates, but their geometry and anchors must exist from seed creation.

### Divergent paths that can softlock progression

Moral paths may change cost, danger, allies, room state, and ending availability. They may not remove every path to a mandatory ship build or the final area.

## Target architecture

```text
Narrative state machine
    Acts, factions, infection, Queen, eggs, passengers, endings
        ↓
Progression graph
    Ship builds, ring gates, milestone bosses, mandatory fallback paths
        ↓
Quest graph
    Camp/hive branches, alternatives, exclusions, consequences
        ↓
Regional spiral planner
    Spiral spine, ring loops, crossings, site territories, route redundancy
        ↓
Ring manifest planner                         NEW
    Required/optional room families, pacing, rewards, conditional reservations
        ↓
Authored-room build placer                    NEW
    Footprints, sockets, anchors, state variants, adjacency constraints
        ↓
Procedural hallway connector
    Seeded archetypes, turns, widths, elevation, junctions, shortcuts
        ↓
Final navigation and progression validation
        ↓
Mission, encounter, loot, and lore planner
        ↓
Presentation and rendering
    Biome kit, room kit, state kit, props, decals, lighting, VFX, overlays
```

### Responsibility rule

- The spiral planner decides **where progression goes**.
- The manifest decides **which designed beats must exist**.
- The room build decides **how a beat plays**.
- The hallway generator decides **how the player travels between beats this seed**.
- The quest graph decides **why the player travels and what alternatives exist**.
- State-driven presentation decides **what the player finds on return**.

## End-to-end world and game-loop map

```text
                                      QUEEN CORE / RING 5
                           Mother hive → Queen / eggs decision
                                      → passenger manifest
                                      → divergent ending
                                                ▲
                                                │ Reactor build + ship defense
                HIVE REACH / RING 4             │
        Hive 3 territory ─ corrupted facilities ─ camp-linked objective
              │                 │                    │
        biological path    puzzle/reward       alternate component path
              └──────────────── shortcut loop ───────┘
                                                ▲
                                                │ Radar build + ship defense
                 DEEP WORKS / RING 3            │
        Vesper camp content ─ Relay hive ─ medical/quarantine ─ armory
              │                   │                 │             │
        quest/faction path   mine/bond/slay   treatment path   combat reward
              └──────────────── return shortcut ────────────────┘
                                                ▲
                                                │ Hull build + ship defense
                    OUTWORKS / RING 2            │
        Camp 2 / Camp 1 content ─ Hive 1 ─ fabricator ─ puzzle/trap vault
              │                   │          │               │
        quest/support path   resource path  schematic path  reward path
              └──────────────── return shortcut ─────────────┘
                                                ▲
                                                │ O₂ build + startup boss
                   CRASH SHELF / RING 1          │
        Ship ─ tutorial loop ─ medical/cache ─ first camp ─ O₂ objective
          ▲             │                           │
          └──────────── return and bank ────────────┘
```

The exact camp labels on individual rings remain governed by `RADIAL_SITE_RULES`; the diagram communicates content rhythm rather than renaming current sites.

## Authored-room build contract

A “room family” describes gameplay purpose. A “room build” is a specific tested geometry implementing that purpose. A “presentation kit” changes material and state without changing the essential play contract.

### Proposed data shape

```js
{
  id: 'medical_quarantine_a',
  family: 'medical',
  footprint: { chunksWide: 1, chunksHigh: 1, cellsWide: 25, cellsHigh: 19 },
  sockets: [
    { id: 'entry', side: 'south', width: 3, required: true },
    { id: 'serviceExit', side: 'west', width: 3, required: false }
  ],
  rotationPolicy: 'cardinal',
  tierEligibility: [2, 3, 4],
  biomeEligibility: ['active', 'cryo', 'bio'],
  roles: ['support', 'questDestination'],
  structuralAnchors: [],
  interactionAnchors: [],
  coverZones: [],
  encounterZones: [],
  rewardAnchors: [],
  loreAnchors: [],
  hazardZones: [],
  quietZones: [],
  presentationVariants: ['intact', 'abandoned', 'infested', 'looted'],
  stateVariants: ['dormant', 'questActive', 'resolved'],
  adjacency: {
    prefers: ['service_passage'],
    forbids: ['camp', 'reward_vault']
  },
  contentBudget: {
    structuralLarge: 2,
    activityZones: 2,
    pickupsMin: 1,
    enemiesMax: 5
  }
}
```

### Required families and initial builds

The first production pass should make a small strong catalog rather than dozens of shallow variants.

| Family | Initial authored builds | Purpose |
| --- | --- | --- |
| Entry/transition | `ring_entry_airlock`, `ring_entry_canyon_landing` | Orient player and establish new tier |
| Medical | `medical_triage`, `medical_quarantine`, `medical_surgical_theater` | Healing, MED, infection, camp quests |
| Armory/security | `armory_cage`, `armory_breached_vault`, `security_checkpoint` | Ammunition, weapons, defended rewards |
| O₂/engineering | `o2_scrubber_array`, `o2_reserve_tanks`, `compressor_control` | Ship goals and environmental control |
| Fabricator | `field_fabricator_intact`, `field_fabricator_broken` | Limited rolls, repair/break choice, schematics |
| Puzzle | `power_routing`, `pressure_balance`, `specimen_sequence` | Deliberate non-combat challenge |
| Trap/reward | `false_cache`, `spore_vent_lockin`, `security_turret_vault` | Telegraph, commitment, challenge, payoff |
| Arena | `barricade_holdout`, `pillar_crossfire`, `nest_defense` | Structured combat and camp missions |
| Lore | `archive_terminal`, `incident_review`, `memorial_bay` | Route, site, and deep lore |
| Cache | `salvage_dead_end`, `medical_cache`, `schematic_cache` | Short optional payoff |
| Camp | one territory build per camp plus state variants | Safe haven, trade, bond, Act 2 consequence |
| Hive | one territory build per hive plus state variants | Relationship, extraction, harvest, consequence |
| Gate | one build for each of the four named blockers | Physical progression boundary |
| Boss staging | `ship_approach_warning`, `ship_defense_lane`, local hive harvest arena | Clear escalation and combat space |
| Queen/finale | mother-hive approach, Queen chamber, manifest/departure space | Divergent finale |

### Room-size contracts

| Size | Contract |
| --- | --- |
| Small | One interaction, tactical feature, lore beat, or reward |
| Medium | One structural anchor plus cover and one encounter/interaction zone |
| Large | Signature landmark, at least two structural anchors, two activity zones, broken sightlines |
| Huge | Authored set piece only; never selected as an ordinary merged room |

Generated rooms that miss their size contract must be repaired deterministically, downgraded, or rejected before population.

## Ring manifests and placement grammar

The regional plan must produce a manifest before local chunks are generated.

### Example manifest

```js
{
  tier: 2,
  required: [
    { role: 'entry', count: 1 },
    { role: 'camp', siteId: 'camp_tallow', count: 1 },
    { role: 'campObjective', count: 1 },
    { role: 'hiveTerritory', siteId: 'hive_suture', count: 1 },
    { role: 'shipGoalObjective', goalKey: 'hullExpansion', count: 1 },
    { role: 'returnShortcut', count: 1 },
    { role: 'ringGate', blockerId: 'ring-2-gate', count: 1 }
  ],
  supportBudget: { medical: 1, armory: 1, fabricator: 1 },
  challengeBudget: { puzzle: 1, trapReward: 1, arena: 1 },
  narrativeBudget: { routeLore: 1, siteLore: 2, deepLore: 1 },
  optionalRoomBudget: 4
}
```

### Placement rules

- Entry rooms sit immediately inside the previous gate.
- Camps sit on or one edge off the main loop and are reachable in the first third of their ring.
- A camp objective is never adjacent to its camp; at least one meaningful route segment separates them.
- Hives are territories, not single props: warning room → contaminated approach → defended outer nest → choice chamber → escape/shortcut.
- Medical rooms appear before or after high-danger sequences, not beside another safe hub.
- Armories do not sit adjacent to another major reward.
- O₂ and ship-system objective rooms occupy the critical route but may support alternate solution branches.
- Trap rooms telegraph danger before the commitment threshold.
- Reward rooms sit behind the challenge that pays for them.
- Boss rooms and locked next-tier enemies are not visible from ordinary reachable halls.
- A return shortcut opens after the ring’s deep objective and materially shortens the trip to the ship.
- Two huge or signature rooms cannot be adjacent.
- Quiet and high-pressure beats alternate on the critical path.
- Every required room has at least one valid route from the ring entry under its activation state.
- Conditional quest rooms are reserved at seed creation even if initially sealed or dormant.

## Procedural hallway plan

Hallways remain seeded and procedural, but their semantics come from the graph edge they realize.

### Hallway build contract

Each hallway archetype defines:

- allowed length range;
- width and aspect range;
- maximum turns;
- elevation policy;
- junction eligibility;
- cover and obstruction budget;
- lighting rhythm;
- dressing kit;
- allowed encounter pressure;
- minimum sightline break frequency;
- repetition cooldown;
- compatible source and destination families.

### Example edge realization

```text
Camp → medical quest destination
    service passage + one junction + lived-in recess

Medical → ship-goal objective
    pressure corridor + airlock threshold

Objective → armory
    damaged gallery + optional cache branch

Objective → ship return shortcut
    maintenance bypass, locked from the entry side

O₂ objective → ring gate
    defensive approach + staging chamber + gate landmark
```

### Repetition control

- Do not use the same archetype twice consecutively on the critical route.
- Track the last three presentation kits and prefer underused kits.
- Limit straight uninterrupted sightlines.
- Use causeways deliberately; do not let every exposed route read as the same bridge.
- Preserve three-cell minimum traversal lanes and existing WFC seam invariants.

## Progression and ship-defense loop

Sprint 23 preserves the existing ship-return climax.

| Ring/tier | Required build | Expedition emphasis | Return climax |
| --- | --- | --- | --- |
| Crash Shelf | O₂ Bubble | Tutorial loop, first cache/camp contact, medical/O₂ rooms | O₂ startup and introductory cybersnail defense |
| Outworks | Hull Expansion | Camp mission, first hive pressure, armory, fabricator, puzzle/reward | Cryosnail milestone attack on ship |
| Deep Works | Radar Node | Camp/hive choice, quarantine, stronger traps, major lore | Sporesnail milestone attack on ship |
| Hive Reach | Reactor Compressor | Hive consequences, biological puzzles, corrupted facilities | Final milestone retaliation and cave reveal |
| Queen Core | Final resolution | Mother hive, Queen, eggs, manifest, departure | Divergent finale |

The code currently spawns milestone bosses from completed goal events, and the O₂ sequence is special-cased as the first softer fight. Sprint 23 must connect gate opening to both conditions where intended:

1. the economic/build goal is complete; and
2. the corresponding retaliation boss is defeated.

If current live progression intentionally opens on the build alone, introduce the two-condition behavior behind a migration-safe feature flag and validate save compatibility before making it authoritative.

## Quest divergence and ending safety

### Three separate graphs

The implementation must keep these graphs distinct:

1. **Structural graph:** mandatory ship builds, ring access, fallback resources, Queen access.
2. **Quest graph:** camp and hive alternatives, exclusions, bond, suspicion, local rewards.
3. **Ending graph:** infection, camp/hive statuses, Queen, eggs, manifest, and ending selection.

Structural completion cannot depend on choosing a preferred moral path.

### Alternative objective pattern

```text
Need biological resin
    ├─ Mine hive
    │    → immediate component
    │    → wounded hive and harvest boss
    ├─ Bond with hive
    │    → relationship quest
    │    → delayed component and rescue eligibility
    ├─ Raid or bargain with camp
    │    → substitute materials
    │    → suspicion/status consequence
    └─ Fabricate substitute
         → higher TECH/COIN cost
         → avoids faction damage
```

### Required safeguards

- Killing or losing an NPC moves critical information to a terminal, log, or environmental clue.
- Destroying a hive leaves a costly non-hive route to mandatory materials.
- Losing a camp removes services, convenience, and endings, not basic completion.
- Quest targets never spawn beyond the gate they are supposed to unlock.
- Mutually exclusive quests explicitly cancel, replace, or transform one another.
- The objective registry shows blocked reasons and the viable next step.
- Conditional finale spaces for camps and hives are reserved even when their occupants will not survive to use them.
- Passenger capacity and eligibility are validated before the departure choice.
- At least two physical routes to the Queen survive world generation; choices may alter danger and state, not erase both.

### State-driven revisits

| Choice/state | Visible room transformation |
| --- | --- |
| Supported camp | More lights, defenses, supplies, workers, and services |
| Robbed camp | Empty shelves, suspicion, guarded storage, degraded support |
| Culled camp | Silent aftermath, bodies, recoverable loot, missing services |
| Recruited camp | Packed supplies and departure preparation |
| Turned camp | Resin growth, altered NPCs, changed defenses |
| Mined hive | Extraction scars, wounded tissue, defensive organisms |
| Bonded hive | Safer approach, communication structures, calmer lighting |
| Slain hive | Dead tissue, scavengers, rare remains |
| Rescued hive | Empty chamber, extraction traces, changed manifest state |

## Camps and hives as territories

### Camp territory

```text
Readable approach
    → defensive perimeter
    → central interaction space
    → trade/support/fabrication corner
    → leader and quest anchors
    → attached but non-adjacent mission route
    → Act 2 state transformation
```

Each camp requires a distinct presentation kit:

- Meridian: diagnostics, breaker panels, cable coils, radar and route intelligence;
- Tallow: medical care, cultivation, bio-lamps, seed trays, triage and cleansing;
- Vesper: barricades, ammunition, armor, blast locks, holdout preparation.

### Hive territory

```text
Foreshadow/warning room
    → contaminated approach
    → defended outer nest
    → hive character/choice chamber
    → harvest or bond consequence
    → escape route or unlockable shortcut
```

Each hive territory needs anchors for dormant, wounded, bonded, rescued, slain, and consumed states without rebuilding the navigation graph.

## Loot, lore, mission, and fabricator ownership

### Room-owned rewards

| Room family | Primary rewards |
| --- | --- |
| Medical | MED, healing, treatment, medical lore |
| Armory | ammunition, weapon schematics, TECH, guarded equipment |
| O₂/engineering | ship components, TECH, environmental controls |
| Fabricator | limited rolls, schematic targets, repair/break choice |
| Camp | trades, quest rewards, bond, safe storage, class support |
| Hive | biological materials, rare loot, relationship/extraction choices |
| Trap vault | high-value mixed salvage after a telegraphed risk |
| Lore/archive | codex entry plus a small supporting reward |
| Cache | low-complexity reward at a branch endpoint |

Global scatter may supplement these rewards, but it cannot satisfy a required room’s reward contract accidentally.

### Lore layers

- **Route lore:** found on required paths and explains the ring or blocker.
- **Site lore:** tied to a camp, hive, medical, armory, or engineering site.
- **Deep lore:** hidden behind optional puzzles, traps, vaults, and dangerous branches.

Lore can reveal destinations. A security log can add an armory rumor to the map; an archive can expose a hive route; a camp account can reveal an alternate component solution.

### Field fabricator loop

```text
Discover field fabrication room
    ├─ spend banked/carried salvage for limited attempts
    ├─ improve odds toward the current target schematic
    ├─ repair/reset the site through a quest
    ├─ break the site for an immediate refund
    └─ carry permanent schematic knowledge back to the ship
```

The ship remains the dependable preparation and permanent printing hub. Field fabrication creates expedition decisions and quest destinations rather than replacing home-base identity.

## Render and asset production list

### Reuse before creating

The first vertical slice should reuse current room atlases and connected sprites wherever they already meet the contract:

- `room_floor_material_atlas_v1.png`;
- `room_wall_material_atlas_v1.png`;
- `site_floor_material_atlas_v1.png`;
- existing bunker, cryo, bio, ice, door, and normal-map textures;
- O₂, hull, radar, and reactor module art;
- existing medical bed, surgical cart, diagnostic console, specimen tanks;
- existing camp bedrolls, cots, crates, sandbags, cookfires, laundry, graves, shutters, and placards;
- existing hive sites, wounded hive, resin sac, eggs, respiratory vent, and hive-growth decals;
- existing security barricade, decals, lore portraits, lore drops, and boss art.

### P0: assets required for the first playable authored-room slice

| Asset | Format | Variants/notes | Runtime purpose |
| --- | --- | --- | --- |
| Modular interior partition | optimized GLB plus sprite fallback | bunker, cryo, bio-grown | Break up large room sightlines |
| Structural pillar/island kit | optimized GLB | clean, damaged, infested | Organize large rooms and combat cover |
| Pressure bulkhead landmark | GLB plus emissive/status material | locked, powered, open, damaged | Ring 1 gate readability |
| Gate control pedestal | GLB | inactive, objective-ready, complete | Interaction silhouette |
| O₂ scrubber bank | GLB or authored sprite assembly | idle, leaking, repaired | O₂ room identity |
| Armory rack/weapon cage | GLB | sealed, breached, looted | Armory identity and state |
| Medical partition/decon frame | GLB | intact, failed, infested | Quarantine/surgical builds |
| Fabricator field terminal | GLB | intact, depleted, broken | Field fabrication site |
| Puzzle power-routing nodes | GLB or sprite set | off, powered, incorrect, solved | Readable puzzle state |
| Trap telegraph set | decals/VFX/props | warning, active, spent | Fair trap communication |
| Reward vault container | GLB | locked, unlocked, emptied | Clear payoff silhouette |
| Hallway service kit | GLB/decals | pipes, cable trays, vents, junctions | Hallway archetype identity |
| Encounter boundary markers | decals/lighting | subtle, biome variants | Define arena without UI walls |
| Shortcut control | GLB | locked from one side, open | Return-loop clarity |

### P1: complete authored-room family kits

#### Medical

- decontamination arch;
- privacy/containment partitions;
- operating lamp;
- med cabinet and sealed supply case;
- quarantine cot/restraint bed;
- IV/diagnostic stand;
- floor drain and biohazard spill variants;
- active, abandoned, looted, and infested state dressing.

#### Armory/security

- weapon racks and empty rack variants;
- ammunition locker and opened/looted states;
- security checkpoint desk;
- armor stand;
- turret base and control node;
- blast-lock mechanism;
- barricade end caps and modular corners;
- bullet, claw, breach, and forced-entry decals.

#### O₂/engineering

- scrubber tower;
- reserve tank cluster;
- compressor;
- pipe manifold and valve wheel;
- leaking pipe and frost/steam effects;
- breaker/fuse cabinet;
- cable bus and floor conduit;
- repaired, overloaded, and dead variants.

#### Puzzle/trap/reward

- pressure gauges and valve indicators;
- routing node and cable-state visuals;
- specimen sequence plinths;
- floor pressure plate;
- spore vent tell and active plume;
- security turret warning sweep;
- false cache shell;
- reward vault open/closed/empty states.

#### Hallways

- personnel iris, maintenance hatch, blast shutter, cryo airlock, and quarantine seal;
- matching corners and end caps for bunker, cryo, and bio service runs;
- ceiling/floor cable trays;
- coolant pipe straights, elbows, valves, and leaks;
- pressure corridor ribs;
- causeway railing and broken railing;
- transition signage without baked readable text;
- maintenance recess and alcove modules.

### P2: camps, hives, and consequence states

- Meridian diagnostics, breaker cabinets, cable coils, route table, and upgraded defenses;
- Tallow med stores, cultivation trays, bio-lamps, treatment screens, and cleansing equipment;
- Vesper ammo crates, armor racks, blast locks, turret emplacements, and barricade modules;
- fortified, robbed, culled, recruited, and turned camp variants;
- hive warning growth, chitin ribs, tendon cables, resin globs, husks, spore towers, membrane curtains, and amber nodules;
- dormant, mined, wounded, awakened, bonded, rescued, slain, and consumed hive variants;
- camp and hive aftermath bodies/remains appropriate to current content rules.

### P3: atmosphere and density

- steam, sparks, dust, spores, drips, frost breath, and coolant leak VFX;
- cable coils, bolts, clamps, wire bundles, panel shards, ration tins, bandage rolls, cargo tags, and hose knots;
- scorch, rust, ice fracture, slime streak, footprints, drag marks, and repair-patch decals;
- corpse/remain states for combatants and environmental storytelling;
- alternate console, door, module, and ship-part states.

### 3D coverage priorities

From the current missing list, Sprint 23 should prioritize objects that create room identity or block sightlines:

1. medical bed, surgical cart, diagnostic console, specimen tanks;
2. engineering bench, conduit hub, cyber junction, and ruptured coolant pump;
3. security barricade and authored base-defense turret;
4. camp sandbags, crates, cots, bedrolls, and cookfire;
5. hive resin sac, respiratory vent, feeding basin, pillars, and wounded hive;
6. lore terminal and quest prop;
7. blast door and controls.

Every asset needs an optimized runtime GLB where appropriate, a sprite fallback until coverage is complete, collision/clearance dimensions, a stable origin, and documented scale.

### Render integration checklist per asset

- Register the asset in the applicable runtime catalog.
- Define sprite fallback and missing-asset behavior.
- Record footprint, origin, scale, rotation, collision, and interaction radius.
- Separate emissive/status material where state readability requires it.
- Keep UI text out of baked textures.
- Verify instancing or pooling for repeatable props.
- Verify alpha edges and nearest filtering for sprite fallbacks.
- Test active, resolved, looted/damaged, and Act 2 consequence states.
- Capture at gameplay zoom in active, cryo, and bio lighting where eligible.

## Implementation order

### Phase 0: freeze invariants and capture a baseline

1. Record five representative seeds: ordinary, loop-heavy, long-spine, merged-room-heavy, and worst site-spacing.
2. Capture current maps and gameplay screenshots for each.
3. Record generation time, chunk streaming cost, room-size distribution, hallway repetition, unreachable enemy count, and site conflicts.
4. Add explicit assertions for current socket width, deterministic topology, ring lock, and two-route Queen access.
5. Decide save-version and feature-flag strategy before changing generated-world persistence.

Exit criteria:

- repeatable baseline artifacts exist;
- existing green tests remain green;
- progression and save invariants are documented in code tests.

### Phase 1: unify macro progression data

1. Make `mazeExpedition` the sole macro route/reservation authority.
2. Make `mazeTiers` provide taxonomy and unlock queries without duplicating site placement.
3. Add stable IDs for every crossing, camp, hive, progression objective, finale site, and conditional quest reservation.
4. Extend reservation validation from “same chunk conflict” to spacing, adjacency, and route-order validation.
5. Project reservations onto actual route chunks before chunk generation.

Exit criteria:

- one debug report lists every site and its route distance;
- no seed places two exclusive required sites in one chunk;
- all locked crossings are represented in the macro graph.

### Phase 2: add ring manifests and quest reservations

1. Implement a pure ring-manifest module.
2. Define required, optional, support, challenge, narrative, and reward budgets.
3. Reserve destinations for all nine existing camp quests.
4. Reserve hive territory sequences and state anchors.
5. Reserve alternative solutions and fallback resource routes for mandatory progression.
6. Validate conditional rooms without activating them early.

Exit criteria:

- every seed contains compatible destinations for every potentially active primary quest;
- no quest destination lies beyond its own unlocking gate;
- moral choices cannot remove every progression route.

### Phase 3: implement the authored-room build contract

1. Add a versioned room-build catalog separate from `tileCatalog`.
2. Implement rotation, socket, clearance, anchor, zone, budget, and state validation.
3. Build one vertical-slice set: medical triage, armory cage, O₂ scrubber, field fabricator, power puzzle, trap vault, reward cache, and one gate.
4. Add deterministic selection based on tier, biome, quest, and seed.
5. Expose final room metadata rather than source-tile assumptions.

Exit criteria:

- every vertical-slice room renders from its contract;
- all interactions, rewards, hazards, and encounters use authored anchors;
- large-room minimum content budgets pass automatically.

### Phase 4: connect authored rooms with procedural hallways

1. Convert semantic graph edges to hallway archetypes.
2. Generate compatible WFC or carved connectors between reserved room sockets.
3. Add repetition cooldowns and sightline limits.
4. Add one-way unlockable return shortcuts.
5. Validate no hallway bypasses a locked crossing.

Exit criteria:

- authored rooms appear in the required order across the seed portfolio;
- hallway routes vary between seeds;
- critical rooms remain reachable;
- hall archetype repetition remains within the declared limit.

### Phase 5: integrate authoritative gates and ship-defense completion

1. Implement the four blocker builds and world states.
2. Bind their requirements to existing goal keys and mission IDs.
3. Bind gate completion to milestone boss defeat where approved.
4. Ensure the O₂ startup boss remains the introductory difficulty exception.
5. Persist gate and boss completion safely.
6. Prove that alternate portals and movement impulses cannot cross a locked ring.

Exit criteria:

- each gate visibly communicates locked, ready, and open states;
- opening the collapsed bridge changes traversal visibly;
- every next ring stays sealed until its authoritative conditions pass.

### Phase 6: move content ownership into rooms and quests

1. Route camp quest props and encounters to reserved authored destinations.
2. Route hive interactions and harvest bosses to hive-owned zones.
3. Route room-specific loot, lore, schematics, and rewards to authored anchors.
4. Integrate field fabricator room states and limited-use behavior.
5. Adapt the objective registry and compass to reservation IDs.
6. Preserve global scatter only as secondary dressing.

Exit criteria:

- quest instructions lead to visually appropriate spaces;
- rewards appear where room fiction promises them;
- objectives survive reload and correctly resolve/cancel alternatives.

### Phase 7: navigation-aware encounters

1. Build final traversal components after all gates, doors, vertical features, and authored hazards are stamped.
2. Filter spawns by current unlock tier and reachable component.
3. Add near-field inaccessible line-of-sight rejection.
4. Add explicit ambient-creature placement separate from combat spawns.
5. Give authored rooms encounter zones, safe zones, and maximum pressure budgets.

Exit criteria:

- no active enemy appears trapped in a nearby hole or locked tier;
- camps, lore rooms, and resolved puzzle rooms respect their quiet contracts;
- boss and holdout arenas retain controlled spawn lanes.

### Phase 8: stateful camp, hive, and Act 2 revisits

1. Map current camp and hive statuses to presentation states.
2. Swap props, NPCs, lighting, loot, blockers, and encounters without changing required navigation.
3. Reserve and validate camp/hive finale spaces.
4. Validate passenger and ending availability against visible world consequences.
5. Add regression coverage for every terminal status family.

Exit criteria:

- Act 2 revisits visibly reflect Act 1 decisions;
- every supported ending remains reachable under its declared conditions;
- missing/dead actors never softlock required information.

### Phase 9: art completion and polish

1. Produce P0 structural and interaction assets first.
2. Complete medical, armory, O₂, puzzle, trap, reward, and hallway kits.
3. Complete camp and hive state kits.
4. Add density, aftermath, decals, and ambient VFX.
5. Replace sprite fallbacks with approved GLBs according to `docs/3d-asset-coverage.md`.
6. Run performance and readability passes on desktop and Deck-class targets.

Exit criteria:

- every authored family reads without debug labels;
- no critical interaction relies on an ambiguous generic prop;
- performance stays within the agreed frame, streaming, and memory budgets.

## Testing and validation matrix

### Unit tests

- room-build schema and rotation;
- socket alignment and clearance;
- manifest budgets and deterministic selection;
- placement adjacency and spacing;
- hallway archetype compatibility and repetition cooldown;
- quest alternative/exclusion resolution;
- gate requirement evaluation;
- room content-budget validation;
- encounter reachability filtering;
- camp/hive presentation-state mapping.

### Generation and property tests

Across hundreds of seeds:

- all required sites exist exactly once;
- no incompatible reservations overlap;
- required sites appear in valid route order;
- all required routes are connected;
- locked tiers are unreachable;
- unlocked tiers are reachable;
- two routes to the Queen survive;
- quest destinations remain on the correct side of their gate;
- large rooms satisfy structural budgets;
- hallway repetition and sightline limits hold;
- combat enemies belong to reachable unlocked components.

### Integration tests

- discover camp → accept quest → reach authored destination → return → receive reward;
- discover hive → choose mine/bond/slay path → observe correct room state and boss behavior;
- collect objective resources → return → bank → fabricate → build goal;
- complete goal → spawn milestone boss → defend ship → open gate;
- field fabricator use, depletion, reset/repair, break/refund, and persistence;
- lore discovery creates the intended map/objective reveal;
- reload before and after every gate and major choice;
- Act 1 choice transforms the same room correctly in Act 2;
- divergent finale states select the correct ending and manifest.

### Playtest acceptance

For each recorded seed, reviewers should answer:

- Can the main loop and return route be understood without debug labels?
- Does each major room have a recognizable purpose on entry?
- Is any large room visually or tactically empty?
- Do consecutive halls feel different in job and rhythm?
- Is the next locked zone visible without exposing active enemies nearby?
- Does every gate explain what blocks it and what will unlock it?
- Are camp and hive approaches distinct before their central prop appears?
- Do traps telegraph commitment and reward fairly?
- Does returning to the ship feel valuable rather than like backtracking?
- Does the milestone boss feel like the expedition climax?
- Do revisited spaces visibly remember player choices?

## Telemetry and debug tooling

Add a seed report containing:

- macro route and ring distances;
- site reservation table;
- room-family and build counts;
- critical-path beat sequence;
- hallway archetype sequence;
- room footprint and content-budget results;
- quest destination and alternate-path table;
- gate requirements and state;
- reachable navigation components per unlock tier;
- rejected enemy-spawn reasons;
- asset fallback/missing-model report;
- generation and streaming timings.

Add debug overlays for:

- tier/ring ownership;
- authored room bounds and IDs;
- sockets and hallway archetypes;
- encounter, reward, hazard, quiet, and interaction zones;
- locked crossings and alternate portals;
- quest reservations and activation state;
- reachable/unreachable navigation components.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| A new planner competes with existing spiral/tier logic | Make the manifest consume existing macro output; do not create another world shape model |
| Authored rooms reduce seed variety | Randomize build selection, orientation, presentation, connector route, optional rooms, and state—not critical existence |
| Multi-chunk rooms break streaming | Start with single-chunk builds and explicit socket contracts; add multi-chunk builds only after streaming tests |
| Save incompatibility | Version world plans, preserve old saves through legacy generation or migration, and feature-flag authoritative gate changes |
| Too many assets block systems work | Ship a sprite/primitive-backed vertical slice, then replace according to P0–P3 priorities |
| Moral choices softlock builds | Validate fallback objective paths as a generation invariant |
| Room metadata drifts after grid mutation | Generate and persist final-space metadata after all structural passes |
| Performance regresses in 49×49 chunks | Cap structural props, instance repeated kits, pool VFX, and measure every phase |
| Camps/hives remain single-prop landmarks | Reserve approach and consequence rooms as part of their territory contract |

## Definition of done

Sprint 23 is complete when:

1. The expanding spiral and ring loops remain deterministic and valid.
2. Every seed contains a validated manifest of progression, camp, hive, quest, support, challenge, reward, and lore destinations.
3. At least one complete vertical-slice ring uses authored rooms connected by seeded procedural hallways.
4. Large rooms meet structural-content budgets and no longer read as empty shells.
5. Hallways have distinct semantic archetypes with repetition control.
6. Enemies cannot spawn as active combatants in nearby inaccessible holes or locked tiers.
7. A player can explore, complete objectives, return, bank, fabricate, build, fight the ship-defense boss, and open the next gate.
8. Camp, hive, loot, lore, fabricator, puzzle, trap, and reward content appears in rooms designed for those purposes.
9. Divergent quest choices preserve mandatory completion while changing faction state, room state, and ending availability.
10. Act 2 revisits visibly reflect consequential Act 1 decisions.
11. Required P0 room and gate assets are connected or have approved fallbacks.
12. Seed, integration, save/reload, performance, and playtest acceptance suites pass.

## Recommended first vertical slice

Do not attempt all five rings simultaneously. Prove the architecture in the first-ring-to-second-ring loop:

```text
Ship
  → ring-entry connector
  → first camp approach and camp
  → medical triage branch
  → optional lore/cache branch
  → O₂ scrubber objective
  → trap/reward side room
  → return shortcut
  → ship bank/fabricator
  → O₂ startup
  → introductory ship-defense boss
  → authored blast-bulkhead gate opens
  → Ring 2 entry
```

This slice exercises the new manifest, authored-room contract, random connectors, room-owned content, return shortcut, existing bank/fabricator flow, existing milestone boss, and authoritative progression gate. Once it is readable and robust across the seed portfolio, expand the same contract outward to camps, hives, divergent quests, and the Queen rather than building those systems on unproven placement behavior.
