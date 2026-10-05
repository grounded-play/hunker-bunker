# Sprint 49 — room grammars and expedition variety

Status: scoped implementation proposal | Branch: `dev/sprint-49` | 2026-10-04

Parent: [S49-20](sprint-49.md#s49-20--world-variety-that-preserves-navigation-and-purpose).
Commit evidence belongs in the [continuation journal](sprint-49-lived-in-world-continuation.md).
This extends the [world master plan](sprint-49-lived-in-world-master-plan.md).
No generator or saved-world behavior changes in this planning commit.

## What the code does today

Inspection checkpoint: `3515fe42`. These are code findings, not a new visual playtest.

- `src/chunkStructure.js:buildMazeChunkStructure` computes a WFC lattice but
  discards its grid and room list, returning `generateArchitecturalMazeChunk`
  geometry. WFC role counts survive as diagnostics. Adding WFC tiles alone will
  therefore not change the live geometry on this path.
- `src/architecturalMaze.js` supplies architectural room/connector carving;
  its room shapes include rectangular, L-shaped and clipped-corner outlines.
  The problem is limited structural vocabulary, not literally identical seeds.
- Authored builds have rotation, sockets and functional anchors. The authored
  selection path in `src/chunkStructure.js` still selects `ROOM_BUILD_CATALOG`;
  the eight cathedral additions exported through `ALL_ROOM_BUILDS` need integration.
- `src/threeGame.js:runMazeDetailPass` uses the existing simplified MarkovJunior-style
  engine for small wall erosion with protected cells. It is not a room-function grammar.
- `src/roomDressing.js` adds themed, bounded dressing and vignettes after geometry.
  Its private seed uses room ID; unchanged IDs can repeat dressing despite a new run.
  Trace actual expedition IDs before changing this seed contract.
- `src/mazeExpedition.js` already varies site angles and clusters but fixes camp
  identity to progression rings. `campaignWorld.js` already tracks campaign and
  expedition seeds. More variety should extend those contracts, not replace them.
- `getSpawnTile` has ship, multiplayer crash-plan and formation behavior. A random
  start must preserve ship access, party assembly, camera readiness and tutorial flow.
- Instanced ordinary dressing has no damage handling today. Destructible interior
  walls are also a larger gameplay change than swapping visual wall shells.

## Recommended architecture

Use one shared solver with room-family rule data, rather than a separate engine
for each room. WFC chooses compatible spatial modules; bounded Markov-style rules
add purposeful variation. Neither local adjacency nor rewriting proves global access.

| Stage | Produces | Must preserve |
|---|---|---|
| Expedition/area plan | Sites, progression, area identity, start/camp candidates | Story IDs, allowed rings, objective order |
| Connection graph | Room/corridor roles and shared doorway sockets | Exact neighbor agreement, loops and required routes |
| Interior grammar | Footprint, partitions, aisles, alcoves, setpiece reservations | Every socket and required interaction reachable |
| Module solve | Compatible walls, corners, floor and infrastructure modules | Footprints, mount points, collision and sightline rules |
| Bounded rewrites | Damage patterns, asymmetric niches, growth, lived-in traces | Reserved paths, anchors and area vocabulary |
| Population/destruction | Props, encounters, damage IDs and persistent state | Budget, authority, save/reload and objective recovery |

Proposed pure API: `planInterior({ seed, generatorVersion, areaProfile, roomRole,
footprint, sockets, reservations, budget })`. Return grid, anchors, placements,
destructible definitions, normalized layout signature and diagnostics. Keep Three.js
out of planning. Adapt the result to the existing chunk-structure contract.

Freeze socket positions and widths before solving. Reserve their full approach
lanes and a connected circulation skeleton; then place large setpieces, then
partitions, then small dressing. Validate actual actor clearance, not just a
single-cell flood fill. Offset doors are allowed only when both neighbors share
the same canonical edge decision. Never independently roll the two sides.

Use bounded backtracking/restarts and deterministic, valid fallback templates.
Log failed rule/profile and fallback reason. Repeated fallback is a content defect,
not successful variety. Keep the existing chunk dimensions initially; larger or
multi-chunk interiors are a later extension, not a prerequisite.

## Spatial vocabulary, not just prop shuffling

Each family gets at least three structurally distinct motifs for the pilot.
These are proposed content targets, not claims about current assets.

| Area/room family | Motifs | Functional setpieces and wall language |
|---|---|---|
| Industrial service | Split workshop, offset machinery island, perimeter service loop | Repair benches, crane bay, ducts, ribbed partitions |
| Cryo/medical | Paired wards, staggered pod aisles, observation core with bypass | Stasis banks, autopsy slab, glazed dividers, coolant runs |
| Biomechanical cathedral | Processional nave, off-center reliquary, branching cloister | Pipe organs, votive clusters, oxygen infrastructure, organic ribs |
| Habitation/camp | Courtyard, sheltered crescent, occupied maintenance alcove | Beds, food, repair, radio, storage and evidence of daily use |

Hallways are first-class spaces with their own grammar: service trench, windowed
gallery, offset dogleg, checkpoint, passing bay and maintenance alcove. Keep route
width and combat sightlines intentional. A bend can frame a landmark or hide a
small side story; a long straight can give a clear threat-reading interval.

Three-way connectors can be a service hub, asymmetric fork or small checkpoint
court. Four-way connectors can wrap an island, cross an open concourse or form a
ring with four spokes. Preserve all required entrances without making every
junction a symmetric plus sign. No forced interaction in the main walking lane.

Use coherent area profiles: repeated construction materials, fixture families,
wear directions, signage and light palettes. Allow transition zones between areas.
Follow the existing key-art review's anchor → infrastructure → traces of habitation
hierarchy; new captures must demonstrate structural differences, not only clutter.
Track asset coverage across a seed portfolio; do not force every prefab into every room.

## Larger rooms and finished visual targets

Owner scope expansion, 2026-10-04: larger, more detailed and inhabited spaces are
part of G0–G6, not an optional dressing pass after generation is finished.

Current architectural width parameters are 11–13 and depth parameters 10–13;
inclusive bounds and carved shapes mean these are not exact usable dimensions.
The current chunk is 49×49. Cathedral patterns range from 13×9 to 21×11 or 17×13.
Test larger footprints inside existing chunks before changing world coordinates,
chunk constants, movement speed, model scale or base camera zoom.

| Tier | Proposed envelope in grid cells | Purpose |
|---|---|---|
| Compact support | 11×11 to 15×13 | Storage, refuge and service alcoves; preserve spatial contrast |
| Standard occupied | 19×15 to 23×19 | Workshop/ward, three functional subzones and a bypass |
| Major destination | 27×19 to 31×25 | Nave, fabrication hall or camp court, four–five subzones |
| Landmark prototype | Up to 35×27 | Rare single-chunk showcase, conditional on camera/budget proof |

These are proposed bounding envelopes, not meters or guaranteed walkable area.
Validate against actual reservations and approach lanes. Start with the standard
tier and one major destination. Generate larger motifs instead of stretching old
blueprints: offset wings, paired chambers, machinery islands, perimeter loops and
recessed galleries. Retain the existing boundary margins and socket authority.

Every larger room needs an arrival/read zone, a recognizable work or ritual center,
a service/storage edge and a quiet or disrupted human-use corner. Major rooms
should offer a main aisle and a slower flanking/service route where progression
permits. Large empty crossing distances fail acceptance even if prop counts pass.
Measure route time, cover spacing, sightlines and companion clearance in G0/G1.

### Branch key art inspected for this expansion

These are close-up references. Translate their functional relationships and
material language to gameplay scale; do not copy their density onto every tile.

| Reference | Observed composition | Room implementation target |
|---|---|---|
| [Heat exchanger](../../public/keyart/keyart_prop_pipe_organ_heat_exchanger.jpg) | Parallel pipes, broad manifold, amber gauges, cyan readouts, leaks and drain | Machinery wall with supply/return runs, maintenance clearance and drainage below leaks |
| [Autopsy slab](../../public/keyart/keyart_prop_autopsy_dissection_slab.jpg) | Task lamp, worn slab, straps, tool tray, specimen jars, dense wall services | Medical work island, reachable storage, lamp support, dirty/clean sides and open circulation |
| [Sector gateway](../../public/keyart/keyart_room_bulkhead_sector_gateway.jpg) | Thick ribs, embedded cables/screens, signage, cyan/amber contrast, drips | Deep entrance composition, readable destination marker, recessed panels and clear threshold |
| [Maintenance cart](../../public/keyart/keyart_prop_maintenance_tool_cart.jpg) | Sorted tools, cloth, replacement fittings, cans, cable reels and wear | Repair vignette beside the machine it services, showing an interrupted task |

Detail must read at three scales: room silhouette/landmark on entry, equipment
clusters during combat, small tools/wear on approach. Reuse existing models first;
missing pipe joins/support brackets become specific asset requests. Keep material
scale and wear coherent; avoid identical oversized stains on every wall panel.

### Finished room briefs

- **Maintenance hall:** an offset exchanger/gantry creates two routes. A crane
  aligns over a work bay; cables terminate at equipment. Tools, removed panels and
  spare parts tell one repair story. Coolant drains toward a sump with a safe bypass.
- **Medical ward:** paired treatment bays flank an off-center slab. An observation
  pocket breaks the outline. Lamps focus on work surfaces; privacy partitions break
  sightlines without hiding all enemies. Decontamination leads toward treatment.
- **Machine nave:** an entrance view ends at an exchanger/reliquary. Ribbed side
  bays, asymmetric votive clusters and a maintenance route create depth. Overhead
  ribs suggest height but cut away before obscuring aim or exits. Restrained light
  and machinery sound distinguish it from the surrounding corridors.
- **Camp court:** beds, food, shared heat, repair and radio form separate activity
  areas joined by supply paths. Personal effects and improvised repairs convey
  occupation. NPC paths avoid entrances; services remain usable after destruction.
- **Arrival site:** ship damage explains the approach; a lit safe pocket frames
  the console and first exit. Traces of occupation establish the area's identity
  immediately, while multiplayer arrival positions stay uncluttered.

Assign a coherent environmental story state: maintained, abandoned mid-task,
quarantined or reclaimed. That state selects compatible vignettes, wear and sound.
Do not independently shuffle every object. These are environmental stories, not
new mandatory quests or reward multipliers.

### Detail, readability and performance

Reserve playable space first; concentrate detail around work clusters and room
edges. Add recessed machinery, wall bays, bulkhead transitions and supported
overhead fixtures to vary depth and silhouette as well as textures. Ground decals
at their source. Pool practical lights; an emissive fixture need not add a dynamic
light. Avoid constant loud loops and synchronized blinking.

Test cutaway behavior from every supported camera heading and at the center of
large rooms. More floor area does not authorize proportional growth in costly
GLBs: retain hard triangle/type/light/debris caps until profiling supports changes.
Use lightweight repeated modules and visual detail tiers without removing gameplay
collision or damage targets at lower quality settings. Review intact, occupied,
combat and heavily destroyed states, including attachment cleanup and wreck access.

### Added implementation gates

- [ ] **G0:** record actual room envelopes, usable area, travel time and model
  budgets; compare reference art with baseline gameplay captures.
- [ ] **G1:** standard occupied tier and one major motif, with functional subzones,
  large-setpiece reservations, bypass routes and connected entrances.
- [ ] **G2/G4:** finish one maintenance-hall vertical slice: structural variation,
  connected infrastructure, story-state dressing, sound and practical lighting.
  Review it before extending the same contracts to medical and biomech families.
- [ ] **G3:** destroy every physical module class in the slice; verify collision,
  attachment cleanup, service recovery, co-op and saved destruction state.
- [ ] **G5:** one inhabited camp court and one safe arrival variant using the same
  subzone contracts; then expand to the remaining planned starting scenarios.
- [ ] **G6:** matched entrance, center, side-route and destruction captures at
  gameplay zoom. Record silhouette, function, infrastructure, habitation,
  navigation and performance findings separately. Bigger alone does not pass.

## Destruction is part of the layout contract

Target: all physical interior props, setpieces and wall modules in the new grammar
have explicit damage behavior. This expands the older master plan's blanket
structural-architecture protection. Do not silently advertise full destructibility
while leaving new instanced objects without hit targets.

- Separate cosmetic surface destruction from traversable wall breaches. An interior
  partition breach updates authoritative tile collision, navigation, visibility,
  projectiles and rendering together. An empty mesh with a surviving blocker fails.
- Shell damage must not expose unloaded space or a nontraversable void as a doorway.
  Border terrain/substrate remains a separately declared world boundary. Full terrain
  excavation and physically simulated building collapse are outside this increment.
- Critical service/setpiece housings can break, but their required interaction must
  survive as an accessible wreck or deterministic replacement. Do not delete a camp
  service, quest item, exit or progression state when its model is destroyed.
- Doors may be damaged, but progression locks require an explicit breach policy;
  a destroyed casing cannot accidentally bypass a story gate. Record exceptions in
  the asset contract and make them visually legible.
- Stable IDs derive from generator version, expedition, location and authored slot,
  never current instance-buffer index. Apply host-authoritative, idempotent damage
  events and persisted deltas; late join/reload restores the same breaches.
- Removing a support must remove or remount attached fixtures consistently. Bound
  debris, collision rebuilds, chain reactions, lights and audio per frame.

## Camps and starting areas

Yes: vary their spatial design and eligible placement while retaining their purpose.
Keep named camp IDs and ring progression initially. Choose among reachable sites
using travel distance, safe arrival space, route adjacency and quest compatibility;
persist the chosen site before chunk generation. Vary camp enclosure, service
arrangement, entrances and surrounding approach, not just compass angle.

Pilot starting scenarios: sheltered crash bay, maintenance landing, breached cargo
court. Each needs ship/console access, separated party spawn slots, readable first
exit, an enemy-free arrival envelope and reachable introductory interactions.
Keep the tutorial's teaching sequence stable. Randomize a new expedition, never a
resume or reconnect. Relocating the global origin and changing progression rings
are deferred until the local start scenarios pass; variety does not require either.

## Determinism and compatibility

Derive separate streams from expedition seed + area ID + room ID + generator version
+ stage name. A new decal must not reroll a room, rewards or an adjacent chunk.
Pre-plan any repetition limits in canonical order so exploration/chunk load order
cannot affect selection. Persist generator version and profile decisions with the
expedition. Existing saves keep their legacy generator; new generation is opt-in
until validated. Do not regenerate explored rooms beneath saved destruction deltas.
Co-op peers must agree on version and plan digest before mounting geometry.

## Commit-sized implementation order

- [x] **G0 initial evidence:** `73a96f20` adds a read-only 240-case baseline,
  normalized geometry metrics and persistence characterization. Full route-weighted
  performance/visual evidence remains open; see the [report](../reports/room-grammar-baseline-2026-10-04.md).
- [x] **G1 pure pilot:** industrial standard/major envelopes, three motifs, bounded
  asymmetric offsets, exact 1–4 doorway contracts, reserved circulation/anchors,
  deterministic IDs and explicit fallback implemented in `src/roomGrammar.js`.
  5,000-seed planner sweep passes; runtime integration and finished visuals remain open.

- [ ] **G0 — baseline and contracts.** Capture a fixed seed portfolio and current
  floor-plan signatures; trace all live generation paths and expedition seeding.
  Record repetition, fallback, layout cost and prop coverage. Add characterization
  fixtures for exact sockets, objective access, save versions and unchanged legacy mode.
- [x] **G1 — pure interior grammar pilot.** Added `roomGrammar.js` and
  `data/roomGrammarProfiles.js`: industrial motifs with 1–4 entrances, circulation
  reservations, seeded module selection, bounded asymmetric offsets and fallback.
  Explicit 3/4-way tests pass. This is a motif solver, not general WFC propagation;
  no renderer or live default change yet.
- [ ] **G2 — live geometry adapter.** Integrate pilot output in `chunkStructure.js`
  behind a persisted generator version/feature flag. Eliminate discarded geometry
  on the new path; ensure metadata describes the grid actually rendered. Integrate
  cathedral builds with explicit selection rules and reachable objectives.
- [x] **G2 adapter and opt-in path:** `roomGrammarChunk.js` supplies the final chunk
  contract directly; `ThreeGame.buildChunk` selects it for eligible optional rooms
  on maps saved with `interiorVersion: 1`. Missing versions stay legacy (0).
  Authored sites, destinations, tutorials, fixed worlds and multiplayer are excluded.
  Remaining G2 work: cathedral catalog integration, plan digest negotiation for co-op,
  full-world/visual acceptance and rollout; the parent gate stays open.
- [ ] **G3 — destructible module runtime.** Add instanced-prop identity/removal,
  partition breach and attachment handling. Test collision, save/reload, late join,
  duplicate hits and critical-service recovery before enabling generated partitions.
- [x] **G3 implemented subcontracts:** multi-mesh dressing removal, late-load/failure
  cleanup, stable v2 placement IDs and legacy migration, support removal, original-grid
  remount planning, thick interior module breaches and persisted wall replay.
  [Evidence](../reports/room-dressing-integration-2026-10-05.md).
- [x] **G3 co-op reconciliation subtask:** relay-authoritative partial-HP tracking,
  hit sequence ordering, late-join reconciliation, and protocol version 1 negotiation.
  [Evidence](../reports/room-dressing-coop-reconciliation-2026-10-05.md).
- [x] **G3 maintenance-hall presentation subtask:** key-art dressing integration,
  wall-mount heights, industrial room grammar pairing, and showroom breach visualization.
  [Evidence](../reports/room-grammar-maintenance-hall-2026-10-05.md). General service
  recovery keeps the parent gate open.
- [x] **G3 persistence subtask:** map-local dressing break snapshots, replacement
  restore, new-map clearing and exact-ID remote replay handling implemented; see
  [persistence notes](../reports/room-dressing-persistence-2026-10-05.md).
  Renderer integration, ID versioning, partial HP and breach contracts remain open.
- [ ] **G4 — area and corridor vocabulary.** Add cryo/medical and biomech profiles,
  hallway motifs and asymmetric junctions; measure normalized layout repetition.
  Expand assets only where the coverage audit identifies an actual missing module.
- [ ] **G5 — camp/start variants.** Add eligible-site scoring and three safe start
  scenarios; preserve camp IDs, rings, tutorial order and multiplayer crash plans.
- [ ] **G6 — acceptance and rollout.** Run seed sweeps, co-op/persistence journeys,
  gameplay captures, destruction stress and physical Deck comparisons. Enable only
  the profiles that pass; record remaining exceptions and rollback behavior.

Before each commit, update this checklist and the continuation journal with scope,
evidence, limitations and the next bounded step. After committing, record the hash
in the next handoff entry. Do not mark all of S49-20 complete after a pilot.

## Acceptance and measures

Hard gates: zero seam mismatches, unreachable mandatory anchors, spawn overlaps,
load-order nondeterminism or lost critical interactions across the configured
5,000-seed sweep. Include explicit pre/post-destruction and restore scenarios;
connectivity checks alone do not prove quest progression or encounter quality.

Variety targets for the pilot: three distinct structural motifs per family; every
supported doorway signature exercised; multiple 3/4-way junction shapes; no adjacent
exact canonical layout repeats when a valid alternative exists. Normalize translation
and rotation and ignore decoration for structural hashes. Report duplicate rate,
motif distribution, fallback rate, path length, cover and sightline distribution
against G0 rather than promising every finite layout is globally unique.

Produce matched top-down plans and player-camera captures for the same seed portfolio,
including approaches, junctions, camps and starts. Human review checks recognizable
function, useful routes, enemy readability and lived-in storytelling. Set solver
time/memory budgets from G0 measurements and retain bounded work in all cases.

Thursday baseline remains 76.5 ms presented p95 and 152 ms destruction-window p95
(16.51 ms average GPU). Compare equivalent hardware/routes and destruction density;
do not treat these poor baseline numbers as a desirable target or call a local
unit-test run Deck acceptance. New geometry and destruction must not regress pacing.

## Continuation prompt

> On dev/sprint-49, continue with G2 and the remaining G0 measurements from
> docs/planning/sprint-49-room-grammar-and-run-variety.md. Inspect current work first,
> preserve other contributors' edits, and keep legacy generation unchanged. G1's
> pure planner is implemented; integrate its contracts rather than rebuilding it. Commit
> each bounded slice with tests and update the source checklist and continuation
> journal between commits. Start with actual live geometry and seed behavior;
> do not substitute more decoration for structural room and corridor variety.
