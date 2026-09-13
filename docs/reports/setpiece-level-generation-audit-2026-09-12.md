# Setpiece and level-generation audit

Date: 2026-09-12

## Executive finding

Hunker Bunker does not need a second level generator. It already has the correct high-level seam for a hybrid authored/procedural world: a seeded regional route graph feeds a serializable `WorldPlan`; the plan reserves progression, territory, quest, and crossing chunks; the runtime attempts an authored room for a reservation and falls back safely to procedural architecture when the catalog cannot satisfy it.

What players currently perceive as “random rooms” is chiefly a content-coverage and scale problem:

- authored content is limited to eight single-chunk room builds and eight hallway archetypes;
- camp, hive, finale, entry, connector, rescue, lore, arena, security, engineering, and several mission families can still fall back to generic architecture;
- a reservation resolves to one chunk and one room, while the intended camps, hives, hospital wings, crash settlement, valleys, and ring thresholds need ordered multi-chunk compositions;
- the Ring 1-to-2 `collapsed_bridge` exists as a progression contract, but no bridge construction site, staged construction state, or physical multi-chunk span is realized;
- the crash site is an authored starting landmark, but “building” is presently a four-step fixed upgrade ladder rather than player-directed, per-run settlement growth.

The recommended architecture is therefore a versioned **setpiece blueprint layer above the existing reservation and chunk-structure layers**. A blueprint claims a deterministic connected chunk footprint, declares sockets and ordered beats, and supplies one chunk module per claimed coordinate. Unclaimed route chunks continue to use the current hallway/procedural system. This preserves run variety around recognizable landmarks without sacrificing reachability, gating, rollback, or seed reproducibility.

## What exists now

### 1. Deterministic macro geography

`src/mazeExpedition.js` already owns the run-scale shape.

- `generateRadialMazeExpedition(seed)` fixes the crash at ring 0, places three named camps in rings 1–3, three named hive thresholds in rings 2–4, and the Queen chamber in ring 5.
- `generateRegionalRouteTopology(seed)` creates a connected outward spiral (“spine”), closed ring paths, route edges, and physical chunk keys. Site nodes are snapped to route chunks rather than left at arbitrary world coordinates.
- Ring room-cluster count rises by depth (`8 + ring * 3`), while edge contracts prescribe longer outward routes.
- The same numeric seed drives topology and site placement. Multiplayer setup also derives world-generation entropy from the synchronized session seed in `src/threeGame.js`.

This is an appropriate foundation for “different path each run, expected kind of destination.” The route graph should remain the authority; setpieces should occupy and decorate its nodes and edges rather than generate a competing world.

### 2. Tier and gate contracts

`src/mazeTiers.js` defines five named progression layers: Crash Shelf, Outworks, Deep Works, Hive Reach, and Queen Core. Each layer declares allowed space types, site types, minimum site counts, a banked ship-upgrade goal, and a milestone encounter requirement.

`src/mazeExpedition.js` declares four stable blockers:

| Boundary | Feature | Mission | Traversal change |
|---|---|---|---|
| Ring 1 → 2 | blast bulkhead | restore ring power | door state |
| Ring 2 → 3 | collapsed bridge | restore canyon crossing | bridge |
| Ring 3 → 4 | hive membrane | clear infested threshold | membrane state |
| Ring 4 → 5 | flooded service tunnel | restart drainage pumps | hatch/tunnel state |

The requested valley bridge therefore maps directly to the existing `collapsed_bridge` contract. Note that the current data labels this as the **Ring 2 blocker opening Ring 3**, not Ring 1 opening Ring 2. Product/design must resolve that naming mismatch before implementation. The least disruptive answer is to move `collapsed_bridge` to the first crossing while preserving stable crossing IDs through an explicit save migration; silently changing array order would reinterpret existing progress.

`src/ringCrossings.js` already derives `locked`, `objective_ready`, `boss_pending`, and `open` states from four durable facts: predecessor crossing, built ship goal, completed crossing mission, and defeated milestone. `src/authoredWorldRuntime.js` clamps traversal as defense in depth and chooses the outward door from topology, not a fragile radial guess.

### 3. World reservations and territory beats

`src/ringManifest.js` builds a versioned `WorldPlan` with:

- mandatory ship-goal objective rooms;
- camp quest destinations;
- fallback and alternative resource routes;
- ring crossing reservations;
- camp and hive territories;
- a Queen finale;
- per-ring support, challenge, reward, and narrative budgets.

Camp territories already describe six ordered beats: approach, perimeter, central interaction, service, leader/quest, exit. Hive territories likewise describe warning, contaminated approach, outer nest, choice chamber, consequence, and escape. `allocateTerritories(...)` maps these beats to route chunks and publishes `requiredChunkSockets`.

This is very close to a setpiece footprint contract. The missing step is to bind each ordered beat to an authored module and state presentation, instead of treating the reservation mainly as a way to choose a single room family.

### 4. Authored room and hallway production

`src/chunkStructure.js` provides a clean single-output structural API. Its producers return the final grid, room instances, anchors, zones, sockets, markers, and diagnostics. It supports:

- procedural architectural room/connector fallback;
- authored room builds;
- authored hallway connectors;
- a reservation-to-room bridge.

`src/authoredWorldRuntime.js::resolveAuthoredChunkStructure` selects the canonical active reservation, tries four cardinal rotations in stable order, rejects socket mismatches, and reports a typed fallback reason. `src/threeGame.js::buildChunk` consumes this result and retains the legacy generator when an authored result is unavailable.

The room catalog in `src/data/roomBuilds.js` currently contains eight builds: medical triage, armory cage, O2 scrubber, field fabricator, power puzzle, trap vault, reward cache, and ring-crossing landmark. The hallway catalog in `src/data/hallwayBuilds.js` contains eight connectors, including canyon causeway, camp approach, secret bypass, and boss staging approach.

These catalogs prove the mechanism, but not the requested world. A test explicitly confirms that `campTerritory` is unsupported and falls back. The code comments list other uncovered families: entry, camp, hive, engineering, security, lore, rescue, arena, queen, connector, salvage, and mission.

### 5. Runtime rooms, dressing, encounters, and objectives

After a structure is accepted, `src/threeGame.js::buildChunk` already performs the correct downstream sequence:

1. assign biome/depth-aware room themes;
2. bind room content and active camp quest anchors;
3. plan bounded population;
4. plan doors and safe gates;
5. stamp door records and calculate reachable cells;
6. plan encounters only on reachable cells and only in unlocked rings;
7. add canyon void, ledges, and cliffs around walkable space;
8. cache metadata used by rendering, objectives, containment, and diagnostics.

`src/roomContent.js`, `src/roomPopulation.js`, `src/roomEncounters.js`, `src/objectiveTargetResolver.js`, and `src/roomContainment.js` are reusable seams. A setpiece blueprint should emit their existing room/anchor/zone shapes rather than introduce bespoke spawning code.

Camp and hive entities are currently positioned separately in `src/threeGame.js` via `chooseCampPosition` / `chooseHiveSitePosition`, then validated by `isGoodSitePosition`. The long-term setpiece path should resolve their world transforms from the territory’s canonical content beat. Keep the current placement functions as fallback during migration.

### 6. Crash site and building today

The origin chunk is specially authored by `buildCrashSiteChunk`, has an authored north exit and blast door, and contains class-specific wrecks. This is a sound base-setpiece anchor.

The current build loop is narrower than the requested survival/cozy loop:

- `BUILD_SITES` in `src/threeGame.js` defines four fixed world coordinates for O2 Bubble, Hull Bay, Scanner Mast, and Reactor.
- `getNextBuildSite()` advances linearly based on bank unlocks.
- only the Scanner Mast site has a visible four-frame construction sprite in `updateBuildSiteBeacon()`; comments explicitly call the other sites abstract scanner targets.
- `FabricationFoundry`, `fabricator.js`, loadouts, and seasonal deterministic recipes cover weapon/cosmetic fabrication, not placeable world structures.
- bank resources and per-run deposits already provide tech/coin/med accounting, while run modifiers and run drops already demonstrate run-specific build-changing effects.

The settlement system should use a distinct run-scoped construction ledger and recipes. It can consume the existing resource vocabulary, but must not conflate permanent account inventory/fabrication receipts with buildings that disappear or convert to a run summary at run end.

### 7. Relevant shipped assets

The runtime GLB library already supports a strong first setpiece pass. Useful examples under `public/3d/runtime/new3ds/` include:

- architecture: bulkhead frames, grand archways, ribbed vault ceilings, buttress pillars, stained windows, shrine niches;
- camp: camp crates/cots, improvised barricades, defense turret, civilian miners/researchers, named survivor NPCs;
- medical/hospital: medical bed, vital monitor, surgical cart, diagnostic console, specimen tanks, frozen bodies, empty exosuits;
- engineering/construction: fabricator workstation, conduit hub/junction, pipe rupture, valve wheel, Tesla coil, storage drums, supplies and cable/bolt scatter;
- hive/bio: biomechanical arch, incubator, neural synapse, respirator, triage cradle, flesh locker/coffin, resin sacs/basins, tendril altar, mycelium loom, spore vents, overrun growth states;
- finale/boss: Queen throne, Queen, corrupted survivor bosses, sentinels, cyber/cryo/spore bosses;
- crash: broken class ships, O2 generator, radar, fusion generator, console, hull matrix.

Major missing or unverified kits are: modular bridge deck/rails/piers/cables; bridge construction-state meshes; large valley silhouettes and distant cliff caps; snap-compatible crash-site foundations; modular walls/roofs for player construction; camp/hive perimeter kits sized to chunk sockets; hospital signage and room dividers; build ghosts and damaged/repaired variants. Existing assets must also be audited for origin, scale, collision proxy, draw-call cost, and readable isometric silhouette before a blueprint references them.

## Proposed authored-setpiece insertion architecture

### A. Add a versioned setpiece catalog

Create `src/data/setpieceBuilds.js` as data only and `src/setpieceBuilds.js` as pure validation/rotation/realization logic.

Each blueprint should declare:

```js
{
  version: 1,
  id: 'crossing_valley_bridge_v1',
  family: 'ringCrossing',
  footprint: [{ dx: 0, dy: -1 }, { dx: 0, dy: 0 }, { dx: 0, dy: 1 }],
  pivot: { dx: 0, dy: 0 },
  eligibility: { rings: [1], biomes: ['active', 'cryo'], roles: ['ringCrossing'] },
  sockets: [
    { id: 'approach', at: { dx: 0, dy: 1 }, side: 's', width: 3, required: true },
    { id: 'farSide', at: { dx: 0, dy: -1 }, side: 'n', width: 3, required: true }
  ],
  modules: [
    { at: { dx: 0, dy: 1 }, buildId: 'bridge_approach' },
    { at: { dx: 0, dy: 0 }, buildId: 'bridge_span' },
    { at: { dx: 0, dy: -1 }, buildId: 'bridge_far_abutment' }
  ],
  stages: ['ruined', 'surveyed', 'scaffolded', 'complete'],
  anchors: [{ id: 'bridge_workbench', module: 0 }, { id: 'bridge_crossing', module: 1 }],
  zones: [{ id: 'fall_hazard', kind: 'hazard', module: 1 }],
  criticalRoute: ['approach', 'bridge_crossing', 'farSide']
}
```

Blueprints must contain no Three.js objects and make no random calls. Random variant selection happens through a passed seeded RNG and is written into the world plan.

### B. Allocate footprints at plan-build time

Extend `buildWorldPlan()` with `setpieces` and `setpieceClaims`. A pure `allocateSetpieces(topology, reservations, catalog, seed)` should:

1. sort required candidates by priority: crash, crossings, finale, territories, mandatory goals, active quest destinations, optional landmarks;
2. select eligible variants using an isolated RNG stream derived from `hash(seed, setpieceId, reservationId)`;
3. rotate/reflect only within the blueprint policy;
4. fit every footprint cell onto existing route chunks or explicitly add deterministic spur chunks through the topology API;
5. require socket reciprocity with route edges and `requiredChunkSockets`;
6. reject overlap with earlier claims, territory beats, the tutorial clear zone, or inaccessible locked-ring space;
7. store the chosen blueprint ID, transform, claimed chunk keys, module IDs, variants, and external sockets in the serialized plan;
8. fail validation for an unplaced required setpiece; optional setpieces may record a typed omission reason.

Do not defer footprint choice until chunk streaming. Independent per-chunk rolls can disagree about a multi-chunk landmark and are sensitive to visitation order.

### C. Resolve claimed chunks before ordinary reservations

Add `resolveSetpieceChunkStructure(random, worldPlan, chunkX, chunkY, state)` ahead of `resolveAuthoredChunkStructure` in `ThreeGame::buildChunk`.

Resolution order should be:

1. authored crash module;
2. claimed required setpiece module;
3. current active single-chunk reservation;
4. authored hallway connector;
5. architectural procedural fallback.

The setpiece resolver returns the existing `ChunkStructureResult` shape plus `setpieceId`, `moduleId`, and `stage`. This lets all current theme, content, population, door, reachability, encounter, containment, and rendering code remain shared.

### D. Make state variants structural but deterministic

Keep topology and footprint fixed for the run. Change only declared stage overlays:

- bridge: ruined → surveyed → scaffolded → complete;
- camp: distressed → stabilized → expanded → allied/turned/evacuated/destroyed;
- hive: warning → active → allied/harvested/hostile/destroyed;
- crash settlement: wreck → sheltered → powered → specialized;
- hospital: sealed → breached → decontaminated/infested/looted.

Each stage supplies collision deltas, prop groups, interaction anchors, audio state, lights/VFX, and nav changes. A stage transition must be atomic: validate the next collision/nav grid, persist the state, then swap presentation. Never reroll the module or move its anchors when its state changes.

### E. Designed destination portfolio

First production catalog:

| Family | Footprint | Consistent promise | Run variation |
|---|---:|---|---|
| Crash settlement | 3×3 around origin | ship, fire, build plots, safe return | class wreck placement, two available plot sockets, survivor/hive influence |
| Valley bridge | 1×3 or 2×3 | visible uncrossable valley and buildable span | approach orientation, scaffold hazard, defended far side, shortcut branch |
| Survivor camp | 2×3 | readable approach, perimeter, hearth, leader, workshop, exit | camp identity, crisis, layout mirror, ally/hostile state |
| Hive territory | 2×3 | warning, resin threshold, outer nest, choice chamber, escape | hive identity, organic route fork, harvested/allied mutation |
| Hospital | 2×2 | reception threshold, ward, surgery, pharmacy/reward | infection state, locked wing, patient story, enemy profile |
| Objective facility | 1×2 or 2×2 | setup, interaction puzzle, consequence, reward | goal family, hazard, optional hard route |
| Boss threshold | 2×2 | foreshadow lane, arena, unlock reveal | arena cover arrangement, adds, post-kill exit |
| Queen finale | 3×3 | irreversible descent and chamber | prior camp/hive consequences and ending-vector dressing |

For each major family, author at least two topological variants and three presentation variants. Rotation and state overlays multiply variety without losing location literacy.

### F. Crash-site construction and run-build system

Treat the crash site as the player’s cozy/survival hub for one run, with permanent unlocks expanding the pool of possible buildings between runs.

Use three layers of state:

- **Account unlocks:** blueprint families and cosmetic variants eligible in future runs.
- **Run offers:** a deterministic subset/deck selected at run start; equivalent in function to a roguelike item pool. Offers are saved in the run checkpoint.
- **Placed buildings:** run-scoped plot occupancy, construction stage, health, upgrade branch, and emitted gameplay modifiers.

Proposed run loop:

1. salvage outside the crash site;
2. return/deposit into a run stockpile;
3. choose one of three seeded build offers or spend a reroll resource;
4. place it on an authored snap plot or upgrade an existing structure;
5. receive a strong run-shaping benefit and a corresponding pressure/cost;
6. see/hear the site become warmer, busier, safer, and more personal;
7. take the next expedition route, with a reliable homeward shortcut unlocked by milestones.

First building families should express playstyle, not incremental percentages:

- Med Bay: converts med salvage into limited revives; attracts rescue objectives.
- Scrap Foundry: dismantles unwanted drops into material; increases noise/raids.
- Signal Mast: reveals one setpiece choice per ring; may draw elite hunters.
- Spore Conservatory: grows bio consumables; changes hive reactions.
- Turret Perimeter: protects deposited salvage during attacks; consumes power.
- Bunkhouse: recruits one run-specific specialist with a passive and request.
- Route Cartography Table: previews one branch and enables a return shortcut.
- Bridge Workshop: unlocks bridge construction stages and portable traversal kits.

Implement recipes in a new run-domain module (`src/runConstruction.js`), not in permanent `fabricator.js`. Every recipe needs costs, prerequisites, plot tags, build time/event, stage output, modifier hooks, refund policy, and save schema. Modifier effects should flow through a single `getRunSettlementEffects()` snapshot consumed by existing combat, salvage, compass, camp, hive, and director systems.

### G. Bridge vertical slice

The bridge is the best first multi-chunk proof because it connects level authorship, construction, gating, traversal, persistence, audio, and visual state.

Recommended contract:

- place it at the first intended ring crossing after the blocker-order decision;
- claim approach, span, and far-abutment chunks;
- keep the valley impassable with cliff/void tiles outside the canonical span;
- expose a workbench anchor on the near side;
- require a small construction recipe plus the existing mission and milestone conditions;
- show at least three states: collapsed silhouette, scaffold/cable partial build, traversable final deck;
- open collision only along one validated three-cell-wide lane;
- reveal a second, optional dangerous route around or below the valley in some seeds, never a free bypass of the lock;
- persist the stage and crossing state in run checkpoints and synchronize it in multiplayer before remounting affected chunks.

If design keeps the existing four-condition crossing contract, crafting contributes the mission/build condition rather than creating a fifth independent lock. The UI should present one legible checklist rather than make the player satisfy overlapping hidden systems.

## Determinism rules

- One authoritative `runSeed`; never use `Math.random()` in planning or structural realization.
- Derive independent named streams (`topology`, `setpiece-allocation`, `setpiece:<id>:variant`, `room-content`, `encounter`) so adding a prop roll cannot move the bridge next release.
- Persist plan version, catalog version, selected blueprint/module IDs, transforms, variants, offers, plot occupancy, and mutable stages.
- Chunk generation must be a pure function of plan identity + chunk key + durable state. Streaming/visit order must not alter results.
- Multiplayer host distributes the complete plan identity and mutable setpiece deltas; clients verify checksums and do not independently choose variants.
- A save with an unsupported plan/catalog version must use an explicit migration or safe legacy fallback, never partially reinterpret coordinates.
- Build transitions use stable event IDs so repeated/reordered network messages are idempotent.

## Test plan

### Pure unit tests

- Blueprint schema: unique IDs, connected footprint, valid pivots, module coverage, socket widths, anchors inside walkable bounds, collision/nav validity for every stage.
- Allocation: same seed produces byte-identical claims; a portfolio of seeds has no overlaps; required setpieces always place; optional failures expose reasons.
- Rotation: all permitted rotations preserve socket reciprocity and anchor transforms.
- Critical route: crash-to-Queen remains connected under each unlocked-state prefix; locked crossings have no bypass; opened crossings expose a valid lane.
- Bridge: every incomplete stage blocks the far side; final stage connects it; falling/void zones never overlap the deck.
- Settlement offers: deterministic per seed, respect unlock pools, contain no duplicates unless declared, and checkpoint round-trip exactly.
- Construction transactions: validate costs, prevent double spend/build, enforce plot tags, and make network event replay idempotent.

### Integration tests

- Extend `src/chunkStructure.reservationBridge.test.js` so every required setpiece reservation resolves, not merely the current room-family overlap.
- Extend `src/authoredWorldRuntime.test.js` for multi-chunk claim priority, stage selection, socket rejection, and fallback diagnostics.
- Extend `src/threeGame.authoredExpedition.test.js` to build every claimed module in shuffled chunk order and compare grids/metadata.
- Add a bridge traversal test covering locked, partial, and complete collision plus outward-door selection.
- Add camp/hive tests proving the entity and objective anchor bind to the territory’s content beat, not an independently chosen nearby tile.
- Add checkpoint and multiplayer tests for build offers, plot placements, stage transitions, and remounted chunk parity.
- Add encounter tests proving safe/home/quiet zones suppress spawns and locked-ring rooms remain inactive.

### Seed portfolio and visual QA

Maintain a checked-in portfolio containing ordinary, worst-case turn, dense-territory, mirrored bridge, and all-biome seeds. For each seed emit a machine-readable report and debug-map screenshot with:

- critical path length by ring;
- setpiece claims and omitted optionals;
- socket/reachability errors;
- shortest path to every required anchor;
- accidental crossing bypasses;
- room/hall/setpiece repetition counts;
- stage collision hashes;
- estimated props, draw calls, lights, loops, and concurrent encounter pressure.

Browser E2E should cover: spawning in the crash setpiece; walking the generated hall route to the bridge; reading its requirements; constructing it; crossing into the next tier; returning through a shortcut; placing one crash-site building; reloading from checkpoint; and confirming the same geometry and state.

## Implementation sequence and gates

### Phase 0 — contract decisions

- Decide whether the valley bridge gates Ring 2 or Ring 3.
- Freeze `SetpieceBlueprint v1`, `SetpieceClaim v1`, and run-construction state schemas.
- Add debug-map visibility for claims, external sockets, stages, and fallbacks.

Exit: a plan can represent a multi-chunk landmark without runtime/render dependencies.

### Phase 1 — allocator and resolver

- Implement pure catalog validation, footprint allocation, rotation, and per-chunk module resolution.
- Extend `WorldPlan` version and migration policy.
- Insert claimed-module resolution into `buildChunk` ahead of the existing reservation resolver.

Exit: synthetic 2–3 chunk fixtures build identically in any stream order and preserve route reachability.

### Phase 2 — valley bridge vertical slice

- Author approach/span/abutment modules and ruined/scaffolded/complete states.
- Bind the workbench objective, recipe transaction, gate state, nav swap, VFX, and audio events.
- Add checkpoint and multiplayer replication.

Exit: the bridge visibly and physically gates the intended ring, survives reload, and cannot be bypassed across the valley.

### Phase 3 — crash settlement loop

- Replace fixed beacon-only sites with snap plots and stage meshes.
- Implement deterministic offer deck, run stockpile, construction UI, and the first four building families.
- Route modifiers through one effects snapshot and add home warmth/population/audio escalation.

Exit: a run produces meaningful choices at home and two seeds can create materially different builds without changing the opening tutorial contract.

### Phase 4 — authored destinations

- Build multi-chunk camp and hive portfolios from the existing six-beat territory definitions.
- Add hospital, objective facility, boss threshold, and finale blueprints.
- Bind current NPCs, quests, room content, encounters, lore, state variants, and endings to blueprint anchors.

Exit: every required reservation family resolves to authored content; procedural fallback remains only for connective and optional space.

### Phase 5 — variety, tuning, and tooling

- Add blueprint preview/validation tooling and exportable debug reports.
- Expand variants, branch paths, optional micro-setpieces, and return shortcuts.
- Tune travel time, offer economy, repetition cooldowns, performance budgets, and accessibility.

Exit: seed portfolio, E2E route, multiplayer parity, performance, and player-readability gates all pass.

## Exact code seams to extend

| Concern | Existing authority | Proposed extension |
|---|---|---|
| Macro routes | `src/mazeExpedition.js::generateRegionalRouteTopology` | deterministic footprint fitting and explicit spur insertion API |
| Required content | `src/ringManifest.js::buildWorldPlan` | append versioned `setpieces` / `setpieceClaims` |
| Territory layout | `src/territoryPlanner.js::allocateTerritories` | expose beat claims to setpiece allocator; do not duplicate allocation |
| Crossing state | `src/ringCrossings.js` | bind bridge stage/event to existing condition model |
| Runtime selection | `src/authoredWorldRuntime.js` | claimed-module resolver before canonical single reservation |
| Structure contract | `src/chunkStructure.js` | `buildSetpieceModuleChunkStructure`, returning current result shape |
| Room modules | `src/data/roomBuilds.js`, `src/roomBuilds.js` | reuse for interior modules; add missing families |
| Hall modules | `src/data/hallwayBuilds.js`, `src/hallwayConnector.js` | route-to-setpiece transition modules and repetition history |
| Chunk integration | `src/threeGame.js::buildChunk` | resolve setpiece claims, cache IDs/stages, remount on transitions |
| Camp/hive placement | `chooseCampPosition`, `chooseHiveSitePosition` in `src/threeGame.js` | prefer canonical territory content anchors; retain fallback |
| Objectives | `src/objectiveTargetResolver.js`, `src/objectiveRegistry.js` | resolve setpiece anchor IDs and stage-aware targets |
| Population/encounters | `roomPopulation.js`, `roomEncounters.js` | consume emitted zones/budgets unchanged |
| Collision safety | current reachable-cell and route-graph checks in `threeGame.js` | validate whole claimed footprint and state transition |
| Construction economy | bank resources, foundry/fabricator, `BUILD_SITES` | new run-scoped construction domain and settlement effect snapshot |
| Persistence | maze persistence/run checkpoint in `src/threeGame.js` and `src/runCheckpoint.js` | save plan identity, offers, plots, stages, idempotent events |
| Debugging | existing debug map/QA nexus/world diagnostics | visualize claims, sockets, stages, fallback reasons, route locks |

## Risks and non-negotiables

- Do not let a visually complete bridge open before the durable crossing state, or an open crossing retain blocking collision.
- Do not allow authored landmarks to erase required topology openings; current socket rejection behavior is worth preserving.
- Do not use independently spawned camp/hive positions once their setpiece is active; duplicate authorities will drift.
- Do not mix permanent fabrication receipts with per-run construction inventory.
- Do not reroll offers, layouts, or variants on load or chunk remount.
- Do not ship setpiece geometry without low-cost collision proxies and performance budgets; the present runtime is already sensitive to material/light proliferation.
- Do not remove the procedural fallback until the catalog covers all required reservations and seed-portfolio failures are zero.

## Recommended first ticket

Implement a data-only three-module `crossing_valley_bridge_v1` fixture, a pure allocator for one injected crossing reservation, and a resolver that returns existing `ChunkStructureResult` records. Test allocation and regeneration before adding any art or construction UI. This proves the architectural risk—multi-chunk deterministic insertion—while keeping the visible game unchanged. The next ticket can then attach ruined/scaffolded/complete meshes, the run recipe, and the existing crossing state.
