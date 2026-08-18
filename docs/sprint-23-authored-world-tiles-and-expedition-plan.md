# Sprint 23: Authored World Tiles and Expedition Plan

Status: proposed implementation plan  
Scope: world generation, authored rooms, spiral/ring progression, sites, quests, encounter placement, rendering, and environment assets  
Runtime integration boundary: `src/threeGame.js` (integration only; new planners and catalogs land in owned modules)
Primary generation modules: `src/mazeExpedition.js`, `src/mazeTiers.js`, `src/tileCatalog.js`, and `src/wfcGenerator.js`
Companion execution map: `docs/sprint-23-authored-world-tiles-lane-split.md`

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

## Existing authority and predecessor map

Sprint 23 extends the last two sprints; it does not rediscover or replace them. When this document and a predecessor appear to assign the same responsibility, use the authority below.

| Concern | Existing authority/predecessor | Sprint 23 relationship |
| --- | --- | --- |
| World/WFC acceptance | `docs/sprint-22-systems-breakdown/01-world-generation-and-wfc.md` | Carries forward its open room-structure, hallway-legibility, and gate-affordance acceptance work |
| Ring barrier and bypass prevention | `docs/phase6-wfc-ring-barrier-integration-plan.md`, `src/mazeExpedition.js`, `ThreeGame.enforceRingProgressionLock()` | Preserves the shipped clamp and barrier helper/data. The helper’s runtime branch ordering still needs correction/proof before claiming a live canyon-band tell; Sprint 23 adds authored crossings, open-state geometry, and persistence proof |
| Seed portfolio and large-N validation | `scripts/world-seed-portfolio-report.js` and its tests | Extends the shipped report; does not create a second portfolio tool |
| Combat encounter audit | `scripts/combat-encounter-report.js` and its tests | Preserves the shipped TTK/ammo/O₂/boss-phase audit as a balance regression; milestone lifecycle and arena placement belong in dedicated modules/tests |
| Objective grammar and compass ownership | `docs/objective-system-spec.md`, `src/objectiveRegistry.js`, `src/objectiveRegistry.test.js` | Uses the spec’s contract/priority ladder but treats runtime/tests as status truth because the spec header is stale; producer adapters resolve reservation anchors before dispatch |
| Local prerequisite locks | `src/mazeGates.js`, `src/mazeGates.test.js` | Remains the authority for optional intra-chunk access locks; it is not the ring-crossing system |
| Faction verbs | `docs/faction-verb-matrix.md`, `src/campEconomy.js`, `src/campActiveVerbUi.test.js` | Uses shipped camp verbs as room/territory interactions rather than redesigning them |
| Vesper arena/climax precedent | `docs/camp3-boss-climax-design.md`, `src/threeGame.campQuests.test.js` | Uses the three-phase climax as design precedent and the shipped Bunker Holdout quest/active verbs as implementation precedent; does not claim the full climax is connected or accepted |
| Broad environment-art priority | `docs/public-world-dressing-plan.md` | Remains the canonical P0–P3 art queue; this plan records functional room requirements, not a competing art priority list |
| 3D connection status | `docs/3d-asset-coverage.md`, `src/world3dOverlay.js` | Remains the connected/missing inventory and integration rule |
| Delivery status | `docs/current-feature-status.md` and the five-rung ladder in `docs/master-implementation-plan-2026-08-03.md` | Uses current-feature status for claim/manual-acceptance discipline, not post-July world-gen truth; every deliverable uses Designed → Implemented → Connected → Automated → Accepted |

The last recorded Sprint 22 status reports a clean 5,000-seed structural sweep with zero site-spacing conflicts. That is the inherited baseline, not proof that rendered rooms and connectors are accepted as readable. The current sweep reports conflict counts but does not include them in `allValid`; Sprint 23 must explicitly make manifest/territory conflicts fatal audit failures.

## Terminology: do not collide two gate systems

Use these terms consistently in code, tests, and status logs:

- **Ring barrier:** the macro boundary between progression tiers.
- **Ring crossing:** the one planned landmark/corridor through a ring barrier.
- **Crossing blocker:** the bulkhead, gantry, membrane, or pressure hatch associated with a ring crossing. Current source data lives in `RING_BLOCKER_FEATURES`.
- **Local access gate:** an optional intra-chunk prerequisite lock planned by `src/mazeGates.js`/`planSafeGates`.
- **Door:** the rendered/interactable closure used by either system.

New module and event names must use `ringBarrier`, `ringCrossing`, or `crossingBlocker` for macro progression. Reserve `mazeGate`/`accessGate` for the existing local prerequisite-lock system.

## Delivery rung rule

- **Designed:** behavior and constraints are documented.
- **Implemented:** code/assets exist.
- **Connected:** the shipped runtime invokes them.
- **Automated:** tests or build/report gates exercise them.
- **Accepted:** a human has proved them in the target build and hardware context.

Agents may advance work through Automated. They must leave Accepted items explicitly open for the user or designated playtester. The definition of done at the end of this plan is rung-tagged so an automated continuation cannot loop on a human-only criterion.

## Current game: source-of-truth audit

### 1. Macro world and progression

`src/mazeExpedition.js` is already the macro authority.

- `generateRegionalRouteTopology` creates a long expanding spiral, called “the snake,” from the crash site to the mother hive.
- Five closed ring routes wrap that spine.
- Route chunks and route edges prevent independently generated chunks from creating macro shortcuts.
- `RADIAL_SITE_RULES` fixes Meridian, Tallow, and Vesper to rings 1, 2, and 3; Suture, Relay, and Carapace hives to rings 2, 3, and 4; and the Queen to ring 5.
- Four deterministic blockers represent a blast bulkhead, collapsed bridge, hive membrane, and flooded service tunnel.
- `RING_UNLOCK_GOAL_ORDER` is `o2Bubble`, `hullExpansion`, `radarNode`, and `reactorCompressor`.
- `ThreeGame.enforceRingProgressionLock()` applies a live per-frame radial clamp after movement, so walking, dashing, knockback, and alternate paths cannot bypass a locked ring.
- `isChunkOnRingBarrier()` and its landform branch exist, but the regional-bounds returns currently run first for normal ring chunks. Sprint 23 must correct or integrate that branch ordering and prove the intended canyon-band tell through generated-landform tests.
- `RING_BLOCKER_FEATURES` already declares the four fixed crossing landmarks, mission keys, door identities, and the ring-2 `bridge` traversal result. Progression graph tests cover blocker ordering/non-bypass, but `getTraversalUnlocks()`/`opensTraversal` still need focused runtime and test coverage.
- What remains incomplete is substantial but well-bounded: four unique authored crossing builds/colliders, reliable barrier-landform projection, live blocker-mission and canonical boss-defeat integration, connected `opensTraversal` world changes, alternate-portal/cut proof on the physical path, and reload/Act-transition lifecycle proof.
- The plan projects nodes and blockers into chunk reservations and detects direct reservation conflicts.

`src/mazeTiers.js` already expresses a compatible tier vocabulary:

- Tier 1: Crash Shelf;
- Tier 2: Outworks;
- Tier 3: Deep Works;
- Tier 4: Hive Reach;
- Tier 5: Queen Core;
- site kinds for camps, camp objectives, hives, caches, crossing bosses (currently named `gateBoss` in the legacy enum), and the Queen;
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

## Critical implementation seams discovered in deep review

These are preconditions, not optional cleanup. The authored-room work must not proceed on top of known pipeline, coordinate, persistence, navigation, or combat-boundary conflicts.

### Architectural generation currently overwrites WFC output

The live MAZE path in `ThreeGame.buildChunk()` currently does all of the following for every MAZE chunk:

1. collapses a WFC lattice;
2. extracts WFC metadata;
3. calls `generateArchitecturalMazeChunk()`;
4. replaces `grid` with `architectural.grid` unconditionally;
5. replaces the WFC room list with one architectural room or an empty list.

This means WFC currently supplies topology-derived inputs and preliminary metadata, but its stamped local geometry is not the final MAZE grid. Adding a third authored-room stamping pass without resolving this seam would waste generation work and recreate metadata drift.

Sprint 23 therefore must deprecate or subsume `src/architecturalMaze.js` into the authored-room/connector pipeline. There must be one final structural grid producer per chunk and one metadata record derived from that final grid.

```text
Current conflicted path
WFC collapse + metadata → architectural generator → grid/metadata replacement

Sprint 23 path
Macro topology → manifest/territory allocation → authored room or connector build
    → one final grid → final metadata → content and rendering
```

The useful room silhouettes and connector logic in `architecturalMaze.js` should be migrated into room-build and hallway catalogs before the legacy override is removed.

### Legacy coordinate constants are still live

`src/threeGame.js` contains hardcoded `stride = 6` sites, including MAZE detail-boundary protection, while the current meta-tile is 17×17 and the real overlap stride is `TILE_SIZE - 1`, or 16. These constants can protect the wrong grid lines and allow detail passes to alter intended boundaries.

Before changing placement, audit every hardcoded tile, stride, band, lattice, and chunk dimension. Import or derive from `TILE_SIZE`, `BAND_THICKNESS`, `LATTICE`, and `CHUNK_SIZE`; do not duplicate numeric geometry facts in runtime code. Add a static regression check that rejects new hardcoded legacy stride declarations.

This audit includes `src/mazeTiers.js`, which currently defines a private `BAND_THICKNESS = 0` even though `tileCatalog.js` exports 5. Its footprint/profile helpers must use the same geometry authority as stamping.

### Boss-gated progression needs durable restaging

Ship builds are persisted, while milestone bosses are initially staged from build-completion events. If a build is already complete after death/reload but its boss was not defeated, the original event may never fire again.

Identity also drifts today: `mazeTiers.js` names conceptual bosses such as `sentinel`, `warden`, `broodmother`, and `praetorian`; the live build-to-enemy mapping uses snail enemy types; and ordinary death bookkeeping records biome keys. A canonical milestone ID keyed by goal/ring crossing must be distinct from its presentation enemy type and persist through the entire lifecycle.

Before boss defeat becomes an authoritative ring-crossing condition:

- persist milestone boss identity and defeat state in a versioned progression store;
- derive `mazeTiers` unlock state from persisted goals and persisted defeated bosses;
- model each milestone as `not_ready`, `ready_to_stage`, `active`, or `defeated`;
- on base return/load, restage a missing undefeated boss when its goal is built;
- make staging idempotent so duplicate bosses cannot appear;
- define behavior for death during the encounter, quitting during the encounter, and loading an older save;
- never leave a built goal paired with a permanently unavailable boss.

### Territory reservations must be multi-chunk allocations

A camp or hive territory is a cluster, not a point reservation. The manifest must allocate every beat of a territory to adjacent route chunks before any member chunk is generated. Each allocation needs a stable territory ID, ordered beat ID, owning chunk, required neighbor relationship, cross-chunk socket, and activation state.

Chunk streaming must be able to generate one member independently while reproducing the same shared boundary contract as its unloaded neighbor. No local chunk may opportunistically claim space reserved by another territory beat.

### Compass targets must use authored anchors

`ObjectiveRegistry` already accepts exact `{x, z}` compass coordinates and implements priority selection. Runtime integration is partial: `getRadarCompassState()` prefers registry targets only in part of the priority range and retains bespoke black-box, cave, foundry, camp, side-signal, lore, and build branches. Sprint 23 must stop treating an approximate site or chunk center as sufficient when a room exposes an interaction anchor, while finishing or explicitly preserving the legacy fallback order during migration.

The room-build pipeline must export stable local and world anchors such as `surgical_console`, `armory_lock`, `hive_communion`, or `gate_control`. Quest activation binds to the relevant authored world anchor; it falls back to the territory approach anchor only before the exact interaction is revealed.

### Safe rooms need physical containment semantics

Marking camps and medical rooms “quiet” is insufficient while aggro, projectiles, and boss area-of-effect damage ignore room boundaries. The Cryosnail shockwave playtest death through the bunker door is the concrete regression case.

Room contracts must support:

- `safeZone: true` where fiction promises protection;
- explicit `containmentBounds` and protected door planes;
- hostile path/aggro rejection across a sealed containment boundary;
- projectile collision against closed structural doors;
- AoE propagation rules that stop or attenuate at containment geometry;
- an explicit exception list for attacks meant to breach shelter;
- visible/audio feedback when a shelter is compromised.

Safe-zone semantics must be enforced by combat systems, not only by spawn placement.

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

### Shipped ring locks need physical crossing completion

Macro bypass prevention is already structural at the player-movement level because the live per-frame clamp is path-independent. The canyon-band helper/data are shipped foundations, but current branch ordering still needs correction and proof before the band can be treated as a live visual tell. Sprint 23 must preserve the clamp while finishing that integration.

The remaining ring-crossing delta is:

- keep one already-reserved crossing chunk per barrier;
- turn each declared blocker into a unique authored landmark build with physical collision;
- bind locked, objective-ready, boss-pending, and open visuals to authoritative progression state;
- apply the declared changed-world traversal at runtime, including the ring-2 bridge rather than leaving it as data only;
- retain the soft clamp as defense in depth until physical collision and all movement bypass tests are accepted;
- provide a nearby return route or shortcut;
- prove state restoration across death, reload, and Act transition.

Two current seams are part of that delta:

- the architectural replacement assigns its doors `neighborIndex: null`, while `planSafeGates()` requires a valid neighbor index, so the local access-gate planner cannot be treated as a physical radial blocker implementation;
- `getTraversalUnlocks()` currently has no runtime consumer, so the declared ring-2 bridge remains data rather than a live world transformation.

Existing `mazeExpedition` and ring-progression tests are the extension point. `mazeGates.js` remains separate and continues to plan local access gates inside chunks.

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
    Ship builds, ring crossings, milestone bosses, mandatory fallback paths
        ↓
Quest graph
    Camp/hive branches, alternatives, exclusions, consequences
        ↓
Regional spiral planner
    Spiral spine, ring loops, crossings, site territories, route redundancy
        ↓
Ring manifest planner                         NEW
    Required/optional room families, pacing, rewards, multi-chunk territory reservations
        ↓
Authored-room build placer                    NEW
    Footprints, sockets, anchors, state variants, adjacency constraints
        ↓
Procedural hallway connector
    Seeded archetypes, turns, widths, elevation, junctions, shortcuts
        ↓
One final structural grid + final-space metadata
        ↓
Final navigation, containment, and progression validation
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
  safeZone: true,
  containmentBounds: { minX: 2, minY: 2, maxX: 22, maxY: 16 },
  compassAnchors: {
    approach: 'entry',
    objective: 'surgical_console'
  },
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
    { role: 'ringCrossing', blockerId: 'ring-2-gate', count: 1 }
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
- passive wayfinding grammar: destination-colored light strips, wall conduits, floor wear, signs/symbols, and increasing visual density near the destination socket.

The connector must be readable without repeated radar pulses. Wayfinding markers follow the route through turns, do not point through locked doors, and terminate at the correct authored approach anchor. Radar remains useful for confirmation and discovery, not basic corridor comprehension.

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

O₂ objective → ring crossing
    defensive approach + staging chamber + gate landmark
```

### Repetition control

- Do not use the same archetype twice consecutively on the critical route.
- Track the last three presentation kits and prefer underused kits.
- Limit straight uninterrupted sightlines.
- Use causeways deliberately; do not let every exposed route read as the same bridge.
- Preserve three-cell minimum traversal lanes and existing WFC seam invariants.
- Measure radar scans per minute and scan-to-dash ratio against the Sprint 22 playtest baseline; authored destinations are not accepted if generic connectors still force equivalent scan dependence.

## Progression and ship-defense loop

Sprint 23 preserves the existing ship-return climax.

| Ring/tier | Required build | Expedition emphasis | Return climax |
| --- | --- | --- | --- |
| Crash Shelf | O₂ Bubble | Tutorial loop, first cache/camp contact, medical/O₂ rooms | O₂ startup and introductory cybersnail defense |
| Outworks | Hull Expansion | Camp mission, first hive pressure, armory, fabricator, puzzle/reward | Cryosnail milestone attack on ship |
| Deep Works | Radar Node | Camp/hive choice, quarantine, stronger traps, major lore | Sporesnail milestone attack on ship |
| Hive Reach | Reactor Compressor | Hive consequences, biological puzzles, corrupted facilities | Final milestone retaliation and cave reveal |
| Queen Core | Final resolution | Mother hive, Queen, eggs, manifest, departure | Divergent finale |

The code currently spawns milestone bosses from completed goal events, and the O₂ sequence is special-cased as the first softer fight. Sprint 23 must connect ring-crossing opening to both conditions where intended:

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

This section extends shipped faction work. Camp verbs, costs, cooldowns, degraded states, and UI hooks already live through `src/campEconomy.js` and the faction-verb work; authored territories provide their physical context. Use the shipped Vesper Bunker Holdout quest as implementation precedent and `docs/camp3-boss-climax-design.md` as design precedent instead of inventing a second holdout grammar.

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

The Vesper perimeter siege, corrupted-operator staging, and cross-camp verb synergy described by the Camp-3 design are the target authored-arena build. Only the Bunker Holdout/active-verb foundation is currently shipped; Sprint 23’s job is to reserve, stamp, connect, and state-drive the larger design—not silently count the full three-phase climax as already connected.

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

`docs/public-world-dressing-plan.md` remains the canonical P0–P3 art-priority queue for corpses, scatter, camp/hive dressing, decals, ambience, and prop-state variants. The lists below are **functional contracts grouped by delivery dependency**, not a second art-priority system. Art production should follow the canonical queue except when collision or interaction readability makes a functional fallback necessary for the vertical slice; record that exception in the lane status log.

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

### Vertical-slice functional contracts

Final GLBs are not required to prove the first slice. The true blockers are: physical crossing collision and state silhouette, exact interactive targets for O₂/control/shortcut actions, and structural cover/partition geometry where collision changes play. All other rows may begin with approved primitive or sprite assemblies and return to the canonical art queue for final production.

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

### Post-slice authored-room family requirements

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

### Camp, hive, and consequence-state requirements

- Meridian diagnostics, breaker cabinets, cable coils, route table, and upgraded defenses;
- Tallow med stores, cultivation trays, bio-lamps, treatment screens, and cleansing equipment;
- Vesper ammo crates, armor racks, blast locks, turret emplacements, and barricade modules;
- fortified, robbed, culled, recruited, and turned camp variants;
- hive warning growth, chitin ribs, tendon cables, resin globs, husks, spore towers, membrane curtains, and amber nodules;
- dormant, mined, wounded, awakened, bonded, rescued, slain, and consumed hive variants;
- camp and hive aftermath bodies/remains appropriate to current content rules.

### Atmosphere and density requirements

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

## Code landing map and god-class constraint

`src/threeGame.js` is already roughly 25,000 lines. It may orchestrate the new modules and translate final plans into runtime objects, but it must not become the home of new pure planning algorithms or catalogs.

The proposed module names can be adjusted once implementation starts, but these responsibility boundaries must remain:

| Responsibility | Landing home | Rule |
| --- | --- | --- |
| Macro route and base reservations | existing `src/mazeExpedition.js` | Spiral/rings/blockers and base reservation coordinates only |
| Tier taxonomy/unlock query | existing `src/mazeTiers.js` | Pure goal + defeated-boss queries; no placement ownership |
| Ring manifests and required/optional budgets | new `src/ringManifest.js` | Quest reservations, alternatives, fallback viability; no Three.js or DOM |
| Multi-chunk camp/hive allocation | new `src/territoryPlanner.js` | Produces stable owners, ordered beats, and reciprocal chunk sockets |
| Authored room definitions/schema | new `src/data/roomBuilds.js` plus `src/roomBuilds.js` | Versioned data plus pure validate/rotate/select API; separate from topology-oriented `tileCatalog.js` |
| Semantic hallway definitions/realization | new `src/data/hallwayBuilds.js` plus `src/hallwayConnector.js` | Archetypes, semantic-edge realization, and repetition policy |
| One structural-producer facade | new `src/chunkStructure.js` | Sole chooser returning final `{grid, rooms, anchors, zones}`; WFC remains a solver/stamper and architectural generation becomes migration source |
| Final anchors and room bounds | extend `src/roomGeometry.js` | Local/world conversion and final-grid-derived metadata |
| Room encounters and reachability filtering | extend `src/roomEncounters.js` | This is net-new zone vocabulary on top of its current small profile/spawn planner |
| Containment and safe-zone queries | new `src/roomContainment.js` | Pure aggro/projectile/AoE boundary queries |
| Milestone lifecycle/restaging | new `src/milestoneBossLifecycle.js` | Pure versioned state transitions; runtime spawning remains an adapter |
| Ring-crossing runtime | new `src/ringCrossings.js` | Physical collision/open traversal consuming `RING_BLOCKER_FEATURES`; never call this `mazeGates` |
| Objective/compass binding | new `src/objectiveTargetResolver.js` plus producer adapters | Resolve reservation/build anchor to `{x,z}`, then dispatch the existing generic objective contract |
| Room-owned content | new `src/roomContent.js` | Anchor-owned loot/lore/fabricator/quest placements; domain state remains in existing managers |
| Rendering, streaming, interactions | thin adapters in `src/threeGame.js` | No catalog selection, graph solving, or persistence policy inline |
| Broad art connection status | `src/world3dOverlay.js`, `public/3d/runtime`, and `docs/3d-asset-coverage.md` | Keep runtime catalog and coverage document synchronized; consider extracting room prop paths to `src/roomPropCatalog.js` |

Do not turn the existing `worldProgression.js` into a catch-all; it already owns different landmark/threat concerns. The companion lane split assigns exclusive file ownership and a single integration owner for `threeGame.js`.

## Implementation order

### Phase 0: freeze invariants and capture a baseline

Target rung: **Automated** instrumentation; rendered baseline judgment remains **Accepted (human-only)**.

1. Run the existing `npm run audit:world-seeds` portfolio and `npm run audit:world-seeds:sweep`; preserve their selected ordinary, loop-heavy, long-spine, dense-merged-room, and worst-site-spacing seeds as the inherited structural baseline.
2. Extend `scripts/world-seed-portfolio-report.js` rather than creating another report. Add manifest coverage, territory ownership, final room-size distribution, hallway-archetype repetition, discarded-generation count, and reachable-enemy anomalies as those data become available.
3. Capture maps and gameplay screenshots for the report-selected portfolio seeds; visual readability remains human evidence outside the script's structural claims.
4. Run `scripts/combat-encounter-report.js` as the inherited combat-balance regression. Put milestone restaging in `milestoneBossLifecycle` tests and authored arena placement in `roomEncounters`/generation tests; do not stretch the report beyond TTK, ammo, O₂, and boss-phase evidence.
5. Record generation time, chunk streaming cost, radar scans per minute, scan-to-dash ratio, void fraction, and route-completion time.
6. Extend existing assertions for socket width, deterministic topology, ring lock, and two-route Queen access.
7. Decide save-version and feature-flag strategy before changing generated-world persistence.
8. Make required reservation, territory, route-order, and reciprocal-socket conflicts part of the report’s fatal `allValid`/exit-code contract rather than informational counts.

Exit criteria:

- the existing portfolio/sweep reports still run and expose the new fields without losing their prior contract;
- repeatable visual baseline artifacts exist for the report-selected seeds;
- existing green tests remain green;
- progression and save invariants are documented in code tests.

### Phase 0A: remove engine and coordinate conflicts

Target rung: **Automated**.

1. Inventory the exact responsibilities currently used from `wfcGenerator.js` and `architecturalMaze.js`.
2. Move useful architectural room silhouettes and long connectors behind the new room/hall build interfaces.
3. Choose exactly one final structural grid producer for each chunk role.
4. Remove the unconditional generate-then-overwrite path once parity fixtures pass.
5. Derive final room metadata after the final structural grid is selected.
6. Replace every hardcoded legacy `stride = 6` and related geometry constant with imported/derived catalog values.
7. Add coordinate-contract tests for 17×17 tiles, stride 16, 3×3 lattice, and 49×49 chunks.
8. Replace `mazeTiers.js`'s private `BAND_THICKNESS = 0` with catalog exports and derive its profile math from the same `TILE_SIZE`, `BAND_THICKNESS`, and `LATTICE` authority.

Exit criteria:

- no MAZE chunk performs a discarded full local generation pass;
- one grid and one matching metadata record leave the structural pipeline;
- no live detail or protection pass relies on the legacy stride;
- existing architectural room and connector silhouettes retain approved parity;
- `mazeTiers` profile math and tests describe the actual five-cell band geometry.

### Phase 1: unify macro progression data

Target rung: **Automated**.

1. Make `mazeExpedition` the sole macro route/reservation authority.
2. Make `mazeTiers` provide taxonomy and unlock queries without duplicating site placement.
3. Add stable IDs for every crossing, camp, hive, progression objective, finale site, and conditional quest reservation.
4. Extend reservation validation from “same chunk conflict” to spacing, adjacency, and route-order validation.
5. Project reservations onto actual route chunks before chunk generation.
6. Add territory-cluster allocation across adjacent chunk coordinates, including deterministic cross-chunk sockets and ownership.
7. Define one canonical milestone ID per goal/ring crossing. Keep the presentation enemy type separate from milestone identity, map the legacy tier labels explicitly, and stop relying on biome names as boss-defeat IDs.

Exit criteria:

- one debug report lists every site and its route distance;
- no seed places two exclusive required sites in one chunk;
- all locked crossings are represented in the macro graph;
- every camp/hive territory beat has one owning chunk and reproducible neighbor contracts;
- `mazeTiers` unlock queries consume canonical persisted milestone IDs that runtime defeat events record.

### Phase 2: add ring manifests and quest reservations

Target rung: **Automated**.

1. Implement a pure ring-manifest module.
2. Define required, optional, support, challenge, narrative, and reward budgets.
3. Reserve destinations for all nine existing camp quests.
4. Reserve hive territory sequences and state anchors.
5. Reserve alternative solutions and fallback resource routes for mandatory progression.
6. Validate conditional rooms without activating them early.

Exit criteria:

- every seed contains compatible destinations for every potentially active primary quest;
- no quest destination lies beyond the ring crossing it is intended to unlock;
- moral choices cannot remove every progression route.

### Phase 3: implement the authored-room build contract

Target rung: **Automated**; runtime invocation follows in the integration phases.

1. Add a versioned room-build catalog separate from `tileCatalog`.
2. Implement rotation, socket, clearance, anchor, zone, budget, and state validation.
3. Build one vertical-slice set: medical triage, armory cage, O₂ scrubber, field fabricator, power puzzle, trap vault, reward cache, and one ring crossing.
4. Add deterministic selection based on tier, biome, quest, and seed.
5. Expose final room metadata rather than source-tile assumptions.
6. Export named local/world interaction and compass anchors.
7. Export containment bounds, protected door planes, safe-zone flags, and attack-boundary policy.

Exit criteria:

- every vertical-slice room renders from its contract;
- all interactions, rewards, hazards, and encounters use authored anchors;
- large-room minimum content budgets pass automatically;
- objective targets resolve to authored anchors and safe-room contracts are available to combat systems.

### Phase 4: connect authored rooms with procedural hallways

Target rung: **Automated** for generation; hallway readability remains **Accepted (human-only)**.

1. Convert semantic graph edges to hallway archetypes.
2. Generate compatible WFC or carved connectors between reserved room sockets.
3. Add repetition cooldowns and sightline limits.
4. Add one-way unlockable return shortcuts.
5. Validate no hallway bypasses a locked crossing.
6. Add passive route signifiers—lighting strips, conduit continuity, floor wear, and approach-density cues—for every critical connector.

Exit criteria:

- authored rooms appear in the required order across the seed portfolio;
- hallway routes vary between seeds;
- critical rooms remain reachable;
- hall archetype repetition remains within the declared limit;
- players can follow the critical connector route without radar being the sole navigation language.

### Phase 5: complete physical ring crossings and ship-defense progression

Target rung: **Connected + Automated**; crossing/boss feel remains **Accepted (human-only)**.

1. Preserve `enforceRingProgressionLock()`, `isChunkOnRingBarrier()`, `RING_BLOCKER_FEATURES`, and the existing ring-progression tests as shipped foundations.
2. Correct/prove the ring-barrier landform branch ordering so `isChunkOnRingBarrier()` affects intended regional chunks rather than being shadowed by earlier returns.
3. Remove the `neighborIndex: null` blocker seam by giving authored crossing doors an explicit crossing contract; do not force them through the unrelated local `planSafeGates()` bridge-edge algorithm.
4. Stamp physical builds for the four already-declared blockers and bind locked, ready, boss-pending, and open presentation states.
5. Add solid blocker collision while locked; keep the radial clamp as defense in depth until human acceptance proves physical containment across all movement sources.
6. Connect and test `getTraversalUnlocks()`/`opensTraversal` so the ring-2 bridge visibly and physically changes traversal after resolution.
7. Bind crossing requirements to the existing goal keys and blocker mission IDs, then bind canonical milestone defeat where approved.
8. Ensure the O₂ startup boss remains the introductory difficulty exception.
9. Persist crossing and boss lifecycle safely.
10. Add idempotent base-load/base-return reconciliation: built goal + undefeated missing boss becomes `ready_to_stage` and restages.
11. Extend existing bypass tests for alternate portals and movement impulses; do not replace the already-proven path-independent clamp.
12. Cover death, quit, reload, duplicate event, Act transition, and legacy-save transitions for every milestone boss.

Exit criteria:

- each ring crossing visibly communicates locked, ready, boss-pending, and open states;
- opening the collapsed bridge changes traversal visibly;
- every next ring stays sealed until its authoritative conditions pass;
- no built-goal/undefeated-boss state can permanently lose its encounter trigger.

### Phase 6: move content ownership into rooms and quests

Target rung: **Connected + Automated**.

1. Route camp quest props and encounters to reserved authored destinations.
2. Route hive interactions and harvest bosses to hive-owned zones.
3. Route room-specific loot, lore, schematics, and rewards to authored anchors.
4. Integrate field fabricator room states and limited-use behavior.
5. Preserve the existing `objective-tracked`/`objective-resolved` contract and priority bands (story 10, boss 20, mission 30, camp/hive 40, lore 50, tutorial 90). Quest producers resolve reservation IDs to world anchors before dispatch. Migrate bespoke compass branches incrementally per `objective-system-spec`, or preserve their fallback ordering explicitly until their producer moves; cover priority-50 lore because the current `< 50` preference excludes it.
6. Preserve global scatter only as secondary dressing.
7. Bind revealed objectives to exact authored interaction anchors, with territory-approach fallback only while the target remains undiscovered.

Exit criteria:

- quest instructions lead to visually appropriate spaces;
- rewards appear where room fiction promises them;
- objectives survive reload and correctly resolve/cancel alternatives;
- compass guidance terminates at the actual interaction rather than the chunk center.

### Phase 7: navigation-aware encounters

Target rung: **Connected + Automated**; shelter and encounter readability remain **Accepted (human-only)**.

1. Build final traversal components after all ring crossings, local access gates, doors, vertical features, and authored hazards are stamped.
2. Filter spawns by current unlock tier and reachable component.
3. Add near-field inaccessible line-of-sight rejection.
4. Add explicit ambient-creature placement separate from combat spawns.
5. Give authored rooms encounter zones, safe zones, and maximum pressure budgets.
6. Enforce containment against aggro, projectiles, and AoE; use the closed-bunker-door Cryosnail shockwave as a regression fixture.
7. Define explicit shelter-breaching attacks and feedback rather than allowing all damage to ignore boundaries.

Exit criteria:

- no active enemy appears trapped in a nearby hole or locked tier;
- camps, lore rooms, and resolved puzzle rooms respect their quiet contracts;
- boss and holdout arenas retain controlled spawn lanes;
- a sealed safe room blocks ordinary hostile targeting, projectiles, and AoE according to its declared policy.

### Phase 8: stateful camp, hive, and Act 2 revisits

Target rung: **Connected + Automated**; consequence legibility remains **Accepted (human-only)**.

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

Target rung: **Connected + Automated** for catalogs/fallbacks; final art, readability, and target-hardware performance are **Accepted (human-only)**.

1. Continue the canonical `docs/public-world-dressing-plan.md` P0–P3 queue and record any vertical-slice functional exception explicitly.
2. Connect approved fallbacks for every vertical-slice functional contract before waiting on final GLBs; only collision/interaction-critical gaps block the slice.
3. Complete medical, armory, O₂, puzzle, trap, reward, and hallway kits.
4. Complete camp and hive state kits using the faction and Camp-3 precedents.
5. Add density, aftermath, decals, and ambient VFX in the canonical dressing order.
6. Replace sprite fallbacks with approved GLBs according to `docs/3d-asset-coverage.md`.
7. Run performance and readability passes on desktop and Deck-class targets.

Exit criteria:

- every authored family reads without debug labels;
- no critical interaction relies on an ambiguous generic prop;
- performance stays within the agreed frame, streaming, and memory budgets.

## Testing and validation matrix

Extend existing suites rather than creating parallel versions of the same invariants:

| Existing extension point | Sprint 23 additions |
| --- | --- |
| `src/mazeExpedition.test.js` | Manifest projection, crossing state, territory allocation, fallback routes |
| `src/mazeTiers.test.js` | Catalog-derived band/profile math, canonical goal+milestone IDs, and two-route unlock queries |
| `src/mazeGenerationStress.test.js` | Keep its 2,000-seed-per-biome gate; add final-grid metadata, room budgets, connector, and reachability invariants |
| `src/architecturalMaze.test.js` | Parity fixtures while silhouettes/connectors migrate into the new build catalogs |
| `src/mazeTopology.test.js` | Forbidden crossing edges, semantic connector cycles, return-shortcut rules |
| `src/mazeGates.test.js` | Preserve local access-gate behavior and prove terminology/logic remains separate from ring crossings |
| `src/threeGame.roomSetPieces.test.js` | Room-owned placements, final anchors, and no corridor/set-piece leakage |
| `src/objectiveRegistry.test.js` | Preserve generic priority/compass/persistence behavior while producer adapters migrate |
| `src/roomEncounters.test.js` | Extend safe/medical baseline with authored zones and reachable/unlocked spawn filtering |
| `scripts/world-seed-portfolio-report.test.js` | New report fields and large-N manifest/territory anomalies |
| Existing camp quest, lore compass, regional topology, and ring-lock suites | Quest-to-anchor wiring, exact compass endpoints, and physical-crossing integration |
| `tests/e2e/camp-quests.spec.js` | Extend existing accept/complete/HUD/reward path to an authored destination and exact anchor |
| `tests/e2e/qa-first-hour-gates.spec.js` | Add the Ring-1→2 vertical-slice smoke without treating subjective feel as automated acceptance |
| `tests/e2e/tactical-map.spec.js` | Preserve map/compass surfaces while authored targets and route landmarks connect |

New focused files are appropriate for genuinely new contracts such as room-build schema, territory reciprocity, milestone lifecycle, and containment. They must consume the same production APIs as the extensions above.

### Unit tests

- single structural-grid producer and final-metadata parity;
- derived tile/stride/chunk coordinate contracts;
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
- milestone boss lifecycle reconciliation and idempotent restaging;
- local-to-world compass anchor conversion;
- containment intersection for aggro, projectiles, and AoE.

### Generation and property tests

Across hundreds of seeds:

- all required sites exist exactly once;
- no incompatible reservations overlap;
- multi-chunk territory members have reciprocal socket and ownership contracts;
- required sites appear in valid route order;
- all required routes are connected;
- locked tiers are unreachable;
- unlocked tiers are reachable;
- two routes to the Queen survive;
- quest destinations remain on the correct side of their gate;
- large rooms satisfy structural budgets;
- hallway repetition and sightline limits hold;
- combat enemies belong to reachable unlocked components.
- final metadata describes the final grid rather than discarded WFC geometry.

### Integration tests

- discover camp → accept quest → reach authored destination → return → receive reward;
- discover hive → choose mine/bond/slay path → observe correct room state and boss behavior;
- collect objective resources → return → bank → fabricate → build goal;
- complete goal → spawn milestone boss → defend ship → open gate;
- build goal → die/quit before boss defeat → reload/return → boss restages → defeat → crossing opens;
- field fabricator use, depletion, reset/repair, break/refund, and persistence;
- lore discovery creates the intended map/objective reveal;
- reload before and after every ring crossing, local access gate, and major choice;
- Act 1 choice transforms the same room correctly in Act 2;
- divergent finale states select the correct ending and manifest.
- compass points to the authored interaction anchor through discovery and activation states;
- closed safe-room containment blocks Cryosnail shockwave damage and ordinary hostile aggro.

### Playtest acceptance

For each recorded seed, reviewers should answer:

- Can the main loop and return route be understood without debug labels?
- Does each major room have a recognizable purpose on entry?
- Is any large room visually or tactically empty?
- Do consecutive halls feel different in job and rhythm?
- Is the next locked zone visible without exposing active enemies nearby?
- Does every ring crossing explain what blocks it and what will unlock it?
- Are camp and hive approaches distinct before their central prop appears?
- Do traps telegraph commitment and reward fairly?
- Does returning to the ship feel valuable rather than like backtracking?
- Does the milestone boss feel like the expedition climax?
- Do revisited spaces visibly remember player choices?
- Can the critical route be followed through passive environmental cues without repeatedly scanning?
- Does entering a visibly sealed safe haven behave consistently with the protection it promises?

## Telemetry and debug tooling

Add a seed report containing:

- macro route and ring distances;
- site reservation table;
- room-family and build counts;
- critical-path beat sequence;
- hallway archetype sequence;
- room footprint and content-budget results;
- quest destination and alternate-path table;
- ring-crossing requirements and state;
- reachable navigation components per unlock tier;
- rejected enemy-spawn reasons;
- safe-zone containment and rejected aggro/damage reasons;
- objective target source (`interactionAnchor`, `approachAnchor`, or fallback);
- territory cluster ownership and cross-chunk socket table;
- structural generator selected and discarded-generation count;
- coordinate constants report (`tileSize`, `stride`, `lattice`, `chunkSize`);
- radar scans per minute, scan-to-dash ratio, and critical-route travel time;
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
- passive wayfinding paths and destination anchors;
- containment bounds, protected door planes, and AoE intersections.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| A new planner competes with existing spiral/tier logic | Make the manifest consume existing macro output; do not create another world shape model |
| WFC, architectural generation, and authored placement all produce competing grids | Subsume architectural builds, select one structural producer, and derive metadata only from the final grid |
| Legacy stride math corrupts protected boundaries | Eliminate numeric duplicates and test the 17/16/3/49 coordinate contract |
| Authored rooms reduce seed variety | Randomize build selection, orientation, presentation, connector route, optional rooms, and state—not critical existence |
| Multi-chunk rooms break streaming | Start with single-chunk builds and explicit socket contracts; add multi-chunk builds only after streaming tests |
| Save incompatibility | Version world plans, preserve old saves through legacy generation or migration, and feature-flag physical ring-crossing changes |
| Built goal persists but undefeated boss cannot respawn | Persist boss lifecycle and reconcile/restage idempotently on load and base return |
| Too many assets block systems work | Ship a sprite/primitive-backed vertical slice, track blockers as explicit exceptions, and otherwise defer art order to `public-world-dressing-plan.md` |
| Moral choices softlock builds | Validate fallback objective paths as a generation invariant |
| Room metadata drifts after grid mutation | Generate and persist final-space metadata after all structural passes |
| Performance regresses in 49×49 chunks | Cap structural props, instance repeated kits, pool VFX, and measure every phase |
| Camps/hives remain single-prop landmarks | Reserve approach and consequence rooms as part of their territory contract |
| Multi-room territories disagree at streamed chunk edges | Allocate the entire cluster before local generation and require reciprocal cross-chunk socket contracts |
| Compass still targets generic chunk centers | Export stable authored world anchors and bind objective updates to them |
| “Safe” rooms still admit AoE or aggro | Enforce containment in combat queries and keep the bunker-door shockwave case as a regression test |
| Better rooms do not reduce scan dependence | Add passive hallway wayfinding and compare scan telemetry to the Sprint 22 baseline |

## Definition of done

Engineering work is complete when every row reaches its agent-verifiable target through **Automated**. Sprint 23 is **Accepted** only after the separately marked human gates are observed in the target build. An agent must report “Automated; acceptance open,” not continue indefinitely trying to satisfy a human-only row.

| # | Outcome | Agent-verifiable target | Evidence | Human acceptance gate |
| --- | --- | --- | --- | --- |
| 1 | Expanding spiral and ring loops remain deterministic and valid | Automated | Existing and extended expedition tests plus seed sweep | None beyond overall world-feel pass |
| 2 | Every seed has a valid progression/camp/hive/quest/support/challenge/reward/lore manifest | Automated | Manifest property tests and world-seed sweep | None |
| 3 | One Ring-1→2 vertical slice uses authored rooms and seeded connectors | Connected + Automated | Integration/E2E test and generated-plan fixture | Player can complete it in the packaged build |
| 4 | Large rooms satisfy structural-content budgets | Automated | Budget/property tests | Rooms no longer read as empty at gameplay zoom |
| 5 | Hallways use semantic archetypes and repetition control | Automated | Connector-sequence tests/report | Hall rhythm and identity are visibly distinct |
| 6 | Active enemies cannot spawn in nearby inaccessible holes or locked tiers | Automated | Reachability and spawn-rejection tests | No confusing near-field cases in portfolio playtest |
| 7 | Explore → objective → return → bank/fabricate → build → boss → crossing works | Automated | End-to-end integration with death/reload variants | Full loop completed by a human without debug commands |
| 8 | Camp, hive, loot, lore, fabricator, puzzle, trap, and reward content is room-owned | Connected + Automated | Room-contract and quest integration coverage | Room purpose reads without debug labels |
| 9 | Divergent quests preserve mandatory completion while changing consequence state | Automated | Alternative/fallback graph and ending-vector tests | Choice consequences are understandable |
| 10 | Act 2 revisits apply Act 1 camp/hive consequences | Connected + Automated | State-transition/render-selection tests | Changes are visibly legible in a real revisit |
| 11 | Every vertical-slice functional asset is connected or has an approved fallback | Connected | Asset catalog/coverage audit | Final visual asset approval remains human-only |
| 12 | Structural, integration, save/reload, and performance automation passes | Automated | Named test commands, build, audits, and measured budgets | Subjective playtest and target-hardware acceptance remain open |
| 13 | Each chunk has one final structural producer and matching metadata | Automated | Pipeline selection/parity tests; zero discarded-generation count on new path | None |
| 14 | Tile geometry derives from the 17/16/3/49 contract | Automated | Coordinate-contract and static regression checks | None |
| 15 | Built-goal/undefeated-boss state survives and restages safely | Automated | Death, quit, reload, duplicate-event, migration tests | Encounter recovery feels fair after a real failed run |
| 16 | Multi-chunk territories reproduce reciprocal boundaries under independent streaming | Automated | Territory/socket property and stream-order tests | No visible seams or loading discontinuity |
| 17 | Objectives target authored interaction anchors when known | Connected + Automated | Objective priority and exact-coordinate integration tests | Compass lands cleanly on the interaction in play |
| 18 | Sealed safe rooms enforce declared aggro/projectile/AoE containment | Automated | Containment tests including Cryosnail/bunker-door fixture | Shelter promise feels consistent and readable |
| 19 | Passive connector wayfinding reduces radar dependence | Connected + Automated telemetry | Input metrics captured against Sprint 22 baseline | **Accepted only by human playtest:** lower scan dependence without over-signposting |

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
  → authored blast-bulkhead crossing opens
  → Ring 2 entry
```

This slice exercises the new manifest, authored-room contract, random connectors, room-owned content, return shortcut, existing bank/fabricator flow, existing milestone boss, and physical ring crossing/blocker. Once it is readable and robust across the seed portfolio, expand the same contract outward to camps, hives, divergent quests, and the Queen rather than building those systems on unproven placement behavior.

The slice is not accepted until it also proves the hardening seams: one structural generation path, derived stride math, exact compass anchors, safe-room containment, passive hallway wayfinding, and boss restaging after death/reload.
