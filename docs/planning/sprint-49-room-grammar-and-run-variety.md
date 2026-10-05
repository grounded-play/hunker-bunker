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

- [ ] **G0 — baseline and contracts.** Capture a fixed seed portfolio and current
  floor-plan signatures; trace all live generation paths and expedition seeding.
  Record repetition, fallback, layout cost and prop coverage. Add characterization
  fixtures for exact sockets, objective access, save versions and unchanged legacy mode.
- [ ] **G1 — pure interior grammar pilot.** Add proposed `roomGrammar.js` and
  `data/roomGrammarProfiles.js`; implement industrial motifs with 1–4 entrances,
  circulation reservations, seeded module selection, bounded rewrites and fallback.
  Test 3/4-way connectors explicitly. No renderer or live default change yet.
- [ ] **G2 — live geometry adapter.** Integrate pilot output in `chunkStructure.js`
  behind a persisted generator version/feature flag. Eliminate discarded geometry
  on the new path; ensure metadata describes the grid actually rendered. Integrate
  cathedral builds with explicit selection rules and reachable objectives.
- [ ] **G3 — destructible module runtime.** Add instanced-prop identity/removal,
  partition breach and attachment handling. Test collision, save/reload, late join,
  duplicate hits and critical-service recovery before enabling generated partitions.
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

> On dev/sprint-49, implement G0 then G1 from
> docs/planning/sprint-49-room-grammar-and-run-variety.md. Inspect current work first,
> preserve other contributors' edits, and keep legacy generation unchanged. Commit
> each bounded slice with tests and update the source checklist and continuation
> journal between commits. Start with actual live geometry and seed behavior;
> do not substitute more decoration for structural room and corridor variety.
