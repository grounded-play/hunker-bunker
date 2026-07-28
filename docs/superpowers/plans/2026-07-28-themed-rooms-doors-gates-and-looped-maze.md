# Themed Rooms, Enforced Population, Doors, Gates, and Looped Maze — Implementation Plan

**Date:** 2026-07-28  
**Status:** Ready for implementation  
**Scope:** MAZE/WFC chunks, room population, room-specific surfaces, procedural
doors, progression gates, enemy placement, and looped navigation.

## Goal

Turn the current connected WFC geometry into a complete room-network system:

- no accidental full-height walls inside authored room footprints;
- every room has an explicit type, theme, population budget, and signature;
- room-specific floor and wall treatment is visible within a biome;
- enemies spawn from room encounter budgets rather than generic floor scatter;
- ordinary procedural doors open and close instead of behaving only as weak walls;
- progression doors support power, credentials, boss, and objective gates;
- the maze contains controlled loops and alternate routes;
- critical gates cannot be bypassed through a generated loop;
- all generation remains deterministic, connected, and safe for chunk streaming.

The player-facing target is the supplied room-and-hallway diagram: rooms of
different sizes, one or more doorway approaches, variable-length halls,
occasional canyon-lined open traversals, branches, dead ends, loops, and
progression-gated regions.

## Current Baseline

The implementation must build on, rather than replace, these existing systems:

- `src/tileCatalog.js`
  - authored 7x7 room, corridor, dead-end, canyon-walkway, and vertical tiles;
  - socket-compatible rotations;
  - `roomRole`, `decorationSet`, `populationBudget`, and anchors.
- `src/wfcGenerator.js`
  - deterministic 3x3 lattice generation;
  - room-to-hall role rules;
  - exponentially decreasing hallway continuation;
  - stamped grids and extracted WFC metadata.
- `src/threeGame.js`
  - chunk generation and streaming;
  - biome terrain blending;
  - room classification;
  - scatter, set-piece, pickup, and enemy placement;
  - destructible walls;
  - a fully interactive starting-bunker blast door;
  - lightweight procedural `D` threshold barriers.
- Canyon assets:
  - `public/canyon_falloff_biomech.png`
  - `public/canyon_falloff_ice.png`
  - `public/canyon_falloff_alien.png`

## Non-Goals

- Do not replace the 19x19 chunk grid.
- Do not make generation asynchronous.
- Do not replace the active/cryo/bio distance progression.
- Do not create a general inventory rewrite.
- Do not require one-use consumable keys.
- Do not place a progression gate on the only route back to the ship.
- Do not introduce permanent softlocks when a prerequisite is unavailable.
- Do not make every chunk a dense loop network; dead ends remain valuable.

## Product Decisions

These defaults remove ambiguity during implementation:

1. **Keys are persistent access credentials**, not consumed items.
2. Gate types are:
   - `power`
   - `credential`
   - `boss`
   - `objective`
3. Ordinary room doors can be opened manually and can be destroyed.
4. Locked progression doors cannot be destroyed until their requirement is met.
5. Each room receives one mandatory signature placement before optional dressing.
6. Room navigation clearance takes priority over population budget.
7. Loops are added after the base spanning tree but before gates are finalized.
8. Every gated region has one controlled entrance unless the gate explicitly
   declares multiple synchronized entrances.
9. Tutorial-ring chunks have ordinary doors but no credential, boss, or story gates.
10. Canyon walkways never receive blocking props or ordinary ground enemies.

## Architecture

Generation becomes a sequence of pure planning stages followed by rendering:

```text
base spanning tree
    -> room/hall role assignment
    -> bounded loop injection
    -> tile resolution
    -> room-instance extraction
    -> theme assignment
    -> gate-region planning
    -> navigation reservations
    -> room population plan
    -> enemy encounter plan
    -> grid stamping
    -> Three.js mounting/rendering
```

The authoritative object is a `RoomInstance`. All downstream systems consume it
instead of re-inferring room meaning from individual floor cells.

```js
{
    id: '2,-4:room:6',
    chunkKey: '2,-4',
    latticeIndex: 6,
    tileId: 'room-corner-sw',
    role: 'medical',
    theme: 'cryo-medical',
    biome: 'cryo',
    footprint: [{ x: 1, y: 13 }, ...],
    interior: [{ x: 2, y: 14 }, ...],
    doors: [
        { id: '2,-4:door:6:n', side: 'n', cells: [...], neighborIndex: 3 }
    ],
    wallCells: [{ x: 0, y: 13, edge: 'w' }, ...],
    navigation: {
        doorLanes: [...],
        primaryRoute: [...],
        reserved: [...]
    },
    populationBudget: {
        signature: 1,
        large: 1,
        small: 2,
        pickup: 1,
        enemyMin: 0,
        enemyMax: 0
    },
    gate: null,
    placements: [],
    encounter: null
}
```

New pure modules should keep `ThreeGame` from accumulating more planning logic:

- `src/mazeTopology.js`
- `src/roomThemes.js`
- `src/roomPopulation.js`
- `src/mazeGates.js`
- `src/roomEncounters.js`
- `src/proceduralDoors.js`

## Generation Invariants

The following must be asserted in tests across at least 2,000 seeds:

1. Every room socket connects to a hallway-class tile.
2. Every open socket has an identical facing socket.
3. Every room interior floor cell is reachable from at least one room door.
4. No structural wall occupies a room's declared `interior`.
5. Every room has exactly one valid signature placement.
6. No blocking prop overlaps a door lane or primary route.
7. Every non-optional gate prerequisite can be obtained before reaching the gate.
8. Removing a locked gate edge separates its protected region from the start.
9. Unlocking the gate makes the protected region reachable.
10. No non-gated loop bypasses a gate.
11. At least one ungated return route to the ship remains.
12. Enemy placements are on walkable, non-door, non-canyon cells.
13. Tutorial chunks contain no progression gate.
14. Fixed seed and `runEntropy` produce deterministic results.

---

## Phase 1 — Authoritative Room Geometry and Metadata

### Task 1.1: Extract exact room footprints

**Files**

- Modify: `src/tileCatalog.js`
- Modify: `src/wfcGenerator.js`
- Create: `src/roomGeometry.js`
- Create: `src/roomGeometry.test.js`
- Modify: `src/wfcGenerator.test.js`

**Work**

- Add explicit tile-local metadata:

```js
{
    interiorMask: string[7],
    wallMask: string[7],
    doorwayLanes: {
        n: [{ x: 2, y: 0 }, ...]
    },
    sizeClass: 'compact' | 'standard' | 'large',
    traversalClass: 'room' | 'hall' | 'canyon'
}
```

- Generate masks from patterns at catalog construction time where possible.
- Reject catalog entries whose anchors are not inside `interiorMask`.
- Extract exact `footprint`, `interior`, `wallCells`, and `doors` into
  `RoomInstance`.
- Stop relying on `classifyChunkCells` for WFC room identity. Keep it as the
  fallback for non-WFC landforms.

**Tests**

- Every room interior is floor.
- Every wall-mask cell is non-floor.
- Every anchor is valid for its clearance.
- Rotating a tile rotates masks, anchors, and door lanes consistently.
- Compact, standard, corner, junction, and hub rooms produce distinct areas.

### Task 1.2: Prevent random structural walls inside rooms

**Files**

- Modify: `src/threeGame.js`
- Create: `src/threeGame.roomGeometry.test.js`

**Work**

- Add all WFC room interior cells to the protected set passed to terrain detail.
- Allow `runMazeDetailPass` to erode only explicitly mutable wall cells.
- Exclude room interior from:
  - wall spawning;
  - terrain-step placement when clearance would be reduced;
  - hazard-wall conversion;
  - random damaged-wall variation.
- Add a diagnostic assertion in development builds that reports:
  - chunk key;
  - room ID;
  - illegal wall coordinate.

**Acceptance**

- Full-height walls occur only on declared room shell/divider cells.
- Low floor dressing can appear inside rooms only outside reserved navigation.

---

## Phase 2 — Room Types and Theme Assignment

### Task 2.1: Define room roles as data

**Files**

- Create: `src/roomThemes.js`
- Create: `src/roomThemes.test.js`
- Modify: `src/tileCatalog.js`

**Required roles**

- `generic`
- `utility`
- `medical`
- `security`
- `engineering`
- `storage`
- `reward`
- `story`
- `camp`
- `nest`
- `hive`
- `cryo-lab`
- `vertical`

**Theme schema**

```js
{
    id: 'cryo-medical',
    allowedBiomes: ['cryo'],
    allowedRoles: ['medical'],
    minDepthTier: 1,
    weight: 1,
    wallStyle: 'cryo-clean',
    floorStyle: 'cryo-tile',
    doorStyle: 'medical-seal',
    lightColor: 0x9ddcff,
    fogAccent: 0x16304a,
    signatureProps: ['prop_specimen_tank'],
    largeProps: ['prop_medical_console'],
    smallProps: ['scatter_cryo_shards'],
    pickupBias: ['health', 'tech'],
    encounterProfile: 'sterile'
}
```

**Work**

- Separate geometry from semantic role. A corner room can be medical, security,
  storage, or generic.
- Assign role/theme after geometry resolution using biome, depth, neighboring
  roles, and seeded weights.
- Add adjacency rules:
  - camps do not border nests;
  - medical prefers utility/engineering access;
  - security prefers junctions or gated borders;
  - rewards prefer dead ends;
  - hive/nest density increases in bio sectors;
  - cryo-labs occur only in cryo sectors.
- Limit repeated themes within a local 3x3 chunk neighborhood.

### Task 2.2: Add room-theme debugging

**Files**

- Modify: `src/debugConsole.js`
- Modify: `src/threeGame.js`

**Commands**

- `maze rooms`
- `maze room-at <x> <z>`
- `maze theme-overlay on|off`
- `maze seed <number>`

**Overlay**

- room outline;
- room ID and role;
- door and gate IDs;
- reserved navigation cells;
- signature anchor;
- enemy budget.

---

## Phase 3 — Room-Specific Walls, Floors, and Lighting

### Task 3.1: Add room surface style catalog

**Files**

- Create: `src/roomSurfaceStyles.js`
- Create: `src/roomSurfaceStyles.test.js`
- Modify: `src/threeGame.js`
- Add generated assets under: `public/room-surfaces/`

**Initial wall styles**

- `bunker-standard`
- `bunker-utility`
- `bunker-security`
- `bunker-medical`
- `bunker-engineering`
- `bunker-storage`
- `cryo-rough`
- `cryo-clean`
- `cryo-lab`
- `bio-resin`
- `bio-hive`
- `bio-nest`
- `camp-fortified`
- `ruined-industrial`

Each style defines:

```js
{
    wallSide,
    wallTop,
    wallDetail,
    floorBase,
    floorDetail,
    color,
    emissive,
    emissiveIntensity,
    roughness,
    metalness,
    propTint
}
```

**Rendering approach**

- Preserve the shared biome shader for general chunks.
- Add a small cached material set for room styles.
- Assign room wall style per mesh using `RoomInstance.wallCells`.
- Add room-floor overlay meshes only over the room footprint. Use a tiny Y offset
  to avoid z-fighting with the chunk floor.
- Cache geometries and materials; never create one material per room.
- Dispose style materials/textures with the other shared assets.

**Performance limits**

- Maximum 16 cached room wall materials.
- Maximum 16 cached floor-overlay materials.
- No per-room point lights.
- Emissive meshes/glow decals provide room accents.

### Task 3.2: Theme doors and threshold frames

**Files**

- Modify: `src/proceduralDoors.js`
- Modify: `src/threeGame.js`

**Work**

- Door appearance derives from the destination room theme.
- Add threshold frame styles without blocking the center lane.
- Security/gated doors must be visibly different from ordinary doors.
- Canyon walkway doors use reinforced bridge thresholds.

---

## Phase 4 — Guaranteed Room Population

### Task 4.1: Build a deterministic reservation system

**Files**

- Create: `src/roomPopulation.js`
- Create: `src/roomPopulation.test.js`
- Modify: `src/wfcGenerator.js`
- Modify: `src/threeGame.js`

**Reservation priority**

1. Door lanes.
2. Primary route through the room.
3. Gate interaction space.
4. Vertical traversal.
5. Signature prop.
6. Required large props.
7. Required pickups.
8. Enemy spawn points.
9. Small dressing.

**Placement rules**

- A reservation includes cell, radius, blocking flag, and owner.
- Blocking props require a valid route after placement.
- Run a room-local BFS after each blocking placement.
- If an authored anchor is invalid, search the room interior using:
  - clearance;
  - wall proximity preference;
  - distance from doors;
  - distance from existing reservations.
- Optional dressing may be dropped.
- Mandatory signature must use a safe fallback marker if its preferred asset
  cannot be placed.

### Task 4.2: Enforce population budgets

**Files**

- Modify: `src/tileCatalog.js`
- Modify: `src/roomThemes.js`
- Modify: `src/roomPopulation.js`
- Modify: `src/threeGame.js`

**Budget schema**

```js
{
    signature: 1,
    large: { min: 1, max: 2 },
    small: { min: 2, max: 5 },
    pickup: { min: 0, max: 2 },
    enemy: { min: 0, max: 2 }
}
```

**Work**

- Merge geometry budget, role budget, theme budget, and depth modifiers.
- Replace WFC-room portions of:
  - `createChunkSetPiecePlacements`;
  - `createChunkPickupPlacements`;
  - `createChunkScatterPlacements`.
- Keep existing functions as fallback for non-WFC landforms.
- Save the final population plan in `wfcMetadataCache`.

**Acceptance**

- Every room has one signature.
- Required counts are met unless navigation clearance prevents them.
- Any budget degradation is explicit in metadata and debug output.

---

## Phase 5 — Room-Driven Enemy Encounters

### Task 5.1: Separate enemies from decorative scatter

**Files**

- Create: `src/roomEncounters.js`
- Create: `src/roomEncounters.test.js`
- Modify: `src/threeGame.js`

**Encounter profile**

```js
{
    id: 'bio-nest-guard',
    allowedRoles: ['nest', 'hive'],
    allowedBiomes: ['bio'],
    minDepthTier: 2,
    maxGroups: 2,
    composition: [
        { type: 'sporesnail', min: 1, max: 2, weight: 1 },
        { type: 'crawler', min: 0, max: 1, weight: 0.35 }
    ],
    formation: 'guard-signature',
    respawn: 'never'
}
```

**Rules**

- Medical, camp, story, and reward rooms default to zero enemies.
- Security rooms may contain sentinels.
- Nest/hive rooms prefer biome-native enemies.
- Corridor encounters are rare patrols, not stationary clutter.
- Canyon walkways can spawn flyers/ranged enemies only when supported; until
  then they receive no enemies.
- Never spawn within:
  - two cells of a door;
  - the primary navigation route;
  - a gate interaction zone;
  - the ship safe radius.
- Preserve existing boss distance/progression logic, but place bosses in a
  validated boss-capable room rather than the nearest generic candidate.

### Task 5.2: Add encounter persistence

**Files**

- Modify: `src/threeGame.js`
- Modify: save/run-state module used by current defeated-boss tracking

**Work**

- Stable encounter ID: `<run>:<chunk>:<room>:<profile>`.
- Do not respawn cleared room encounters after chunk unload/reload.
- Persist boss and objective-gate encounter results.

---

## Phase 6 — Real Procedural Doors

### Task 6.1: Replace raw `D` cells with door records

**Files**

- Create: `src/proceduralDoors.js`
- Create: `src/proceduralDoors.test.js`
- Modify: `src/threeGame.js`

**Door record**

```js
{
    id: '2,-4:door:6:n',
    chunkKey: '2,-4',
    cells: [{ x: 9, y: 6 }],
    orientation: 'horizontal',
    style: 'medical-seal',
    state: 'closed',
    lock: null,
    hp: 6,
    maxHp: 6,
    autoClose: false
}
```

**States**

- `open`
- `opening`
- `closed`
- `closing`
- `locked`
- `destroyed`

**Work**

- Keep `D` as the serialized grid marker initially.
- Mount an animated door group rather than a scaled wall cube.
- Add interaction prompt and proximity detection.
- Add open/close animation and synchronized collision.
- Add audio, status light, and steam/spark feedback.
- Ordinary doors are destructible.
- Door state survives chunk unload/remount.
- Reuse the starting blast-door interaction patterns but not its hard-coded
  coordinates or six-tile geometry.

### Task 6.2: Place doors from room metadata

**Files**

- Modify: `src/wfcGenerator.js`
- Modify: `src/threeGame.js`

**Work**

- Stop scanning arbitrary narrow floor cells in `addRoomThresholdDoors`.
- Select doors from explicit room-to-hall boundaries.
- Door probability depends on room role:
  - security: 100%;
  - medical/story/reward: high;
  - utility/storage: medium;
  - generic: low;
  - camp/canyon walkway: style-specific.
- Never place two independent doors on the same socket.

---

## Phase 7 — Keys, Objectives, and Progression Gates

### Task 7.1: Implement access state

**Files**

- Create: `src/accessControl.js`
- Create: `src/accessControl.test.js`
- Modify: run/save state

**Access state**

```js
{
    credentials: ['security-alpha'],
    poweredSystems: ['cryo-grid'],
    defeatedBosses: ['active'],
    completedObjectives: ['restore-relay']
}
```

**Gate requirement**

```js
{
    type: 'credential',
    id: 'security-alpha',
    label: 'SECURITY ALPHA REQUIRED',
    sourceObjective: 'recover-security-alpha',
    failOpen: false
}
```

**Work**

- Persistent credentials are awarded by objectives, terminals, bosses, or room
  signatures.
- Gate evaluation is a pure function.
- UI exposes exact unmet requirement.
- Unlock events update mounted doors immediately.

### Task 7.2: Plan gates without softlocks

**Files**

- Create: `src/mazeGates.js`
- Create: `src/mazeGates.test.js`
- Modify: `src/wfcGenerator.js`

**Algorithm**

1. Build the complete topology graph.
2. Mark start node and mandatory return path.
3. Identify bridge edges and candidate protected subgraphs.
4. Select a gate edge by depth and role.
5. Select or generate its prerequisite in the reachable pre-gate graph.
6. Mark all loop candidates crossing the protected cut as forbidden.
7. Validate:
   - prerequisite reachable before gate;
   - protected objective unreachable while locked;
   - protected objective reachable after unlock;
   - ship remains reachable.
8. If validation fails, discard the gate—not the run.

**Gate distribution**

- Tutorial ring: none.
- Active sector: power gates, occasional security credential.
- Cryo sector: thermal/power and security gates.
- Bio sector: boss, hive-objective, and decontamination gates.
- Maximum one critical progression gate per local planning region.

### Task 7.3: Gate presentation

**Files**

- Modify: `src/proceduralDoors.js`
- Modify: `src/threeGame.js`
- Modify: UI HTML/CSS where interaction prompts are defined

**Feedback**

- locked color and symbol;
- requirement label;
- radar marker when discovered;
- objective linkage;
- unlock animation;
- distinct denied sound;
- no ambiguous generic “locked” message.

---

## Phase 8 — Loops and Multiple Interconnections

### Task 8.1: Inject bounded loops

**Files**

- Create: `src/mazeTopology.js`
- Create: `src/mazeTopology.test.js`
- Modify: `src/wfcGenerator.js`

**Algorithm**

1. Generate the existing spanning tree.
2. Enumerate adjacent closed lattice edges.
3. Reject edges that:
   - create room-to-room adjacency;
   - bypass a planned gate cut;
   - open an exterior room wall;
   - invalidate tile availability;
   - produce a loop shorter than the minimum cycle length.
4. Score candidates:
   - joins distant tree nodes;
   - creates meaningful route choice;
   - connects a branch back toward a hub;
   - avoids eliminating dead ends;
   - respects tutorial/depth settings.
5. Add zero to two loop edges per chunk.
6. Re-resolve affected tile sockets.
7. Validate full graph and gate cuts.

**Target distribution**

- Tutorial ring: 0 loops.
- Early active: 20–35% of chunks have one loop.
- Deep active/cryo: 35–55% have one loop.
- Bio: 40–65% have one loop; rare two-loop hubs.
- Preserve at least one dead end in chunks that have enough nodes.

### Task 8.2: Add macro-route validation across chunks

**Files**

- Create: `src/worldRoutePlanner.js`
- Create: `src/worldRoutePlanner.test.js`
- Modify: `src/threeGame.js`

**Work**

- Build a lightweight graph of generated chunk portals and critical gates.
- Cache graph records independently of mounted meshes.
- Validate a bounded radius around the player/ship.
- Guarantee critical objective regions have intended connectivity.
- Do not require the entire infinite world to be pre-generated.

---

## Phase 9 — Canyon Traversal Integration

### Task 9.1: Treat canyon walkways as navigation reservations

**Files**

- Modify: `src/roomPopulation.js`
- Modify: `src/roomEncounters.js`
- Modify: `src/threeGame.js`

**Work**

- Reserve the full walkway width.
- Prohibit blocking props and ordinary melee enemy spawns.
- Use biome-specific canyon textures already present.
- Add sparse edge dressing only on safe non-walkable cells.
- Verify lethal `X` cells and safe floor remain visually/collision aligned.

### Task 9.2: Add canyon room variants

**Files**

- Modify: `src/tileCatalog.js`
- Modify: `src/tileCatalog.test.js`

**Variants**

- straight narrow ledge;
- broad bridge;
- right-angle ledge;
- overlook reward dead end;
- split bridge around a central void;
- ramp/ladder transition.

Every variant requires a cell-level reachability test and safe player-radius
clearance.

---

## Phase 10 — Integration, Persistence, and QA

### Task 10.1: Version generated metadata

**Files**

- Modify: chunk metadata cache and run-state serialization

**Work**

- Add `generationVersion`.
- Invalidate old cached WFC metadata when schema changes.
- Stable IDs must derive from seed/chunk/lattice index, not array insertion order.
- Preserve door, gate, encounter, and cleared-room state across chunk remount.

### Task 10.2: Automated test matrix

**Required suites**

- `src/tileCatalog.test.js`
- `src/wfcGenerator.test.js`
- `src/roomGeometry.test.js`
- `src/roomThemes.test.js`
- `src/roomPopulation.test.js`
- `src/roomEncounters.test.js`
- `src/proceduralDoors.test.js`
- `src/accessControl.test.js`
- `src/mazeGates.test.js`
- `src/mazeTopology.test.js`
- `src/worldRoutePlanner.test.js`
- targeted `src/threeGame.*.test.js` integration suites

**Seed sweeps**

- 2,000 seeds per biome.
- 2,000 tutorial-only seeds.
- At least 500 gate-bearing region plans per gate type.
- At least 500 loop-plus-gate combinations.

**Assertions**

- invariants listed near the top of this plan;
- deterministic snapshot hashes;
- no undefined catalog selections;
- no unreachable floor islands;
- no signature-placement failure;
- no gate bypass;
- no enemy or prop on lethal canyon;
- no door state loss after remount.

### Task 10.3: Visual QA harness

**Files**

- Add a debug route or test harness under existing development UI.

**Views**

- 20 seeded chunks tiled in a grid;
- topology lines;
- room-role colors;
- door/gate markers;
- prop reservations;
- enemy spawn markers;
- biome surface previews;
- locked vs unlocked reachability.

### Task 10.4: Performance budget

Measure production builds on representative hardware:

- Pure planning target: under 2 ms per new chunk.
- Population/encounter planning target: under 1 ms per new chunk.
- No new shader compilation when mounting a room whose style was already cached.
- No more than the configured shared material limits.
- No new per-room dynamic point lights.
- No visible chunk-streaming hitch.

---

## Recommended Execution Order

1. Phase 1: authoritative geometry.
2. Phase 2: roles/themes.
3. Phase 4: reservations and guaranteed population.
4. Phase 5: room-driven enemies.
5. Phase 3: room surfaces.
6. Phase 6: real doors.
7. Phase 7.1–7.2: access state and preliminary protected gate cuts.
8. Phase 8.1: inject local loops while respecting those protected cuts.
9. Phase 7.3: finalize/revalidate gates and add presentation.
10. Phase 8.2: bounded cross-chunk route validation.
11. Phase 9: canyon variants.
12. Phase 10: persistence, stress testing, visual QA, and performance.

Population precedes rendering so visual themes consume stable metadata. Local
loops follow preliminary gate-cut selection but precede final gate placement,
so loop injection knows which cuts are protected and final gate validation sees
every possible bypass. Cross-chunk validation follows local gate correctness.

## Definition of Done

The feature is complete only when all of the following are true:

- Every generated WFC room has a stable ID, type, theme, exact footprint, and
  enforced population result.
- No illegal structural wall appears in a room interior across the seed sweep.
- Every room has a visible signature that communicates its function.
- Room-specific walls and floors visibly differentiate at least the initial 14
  styles while retaining biome identity.
- Enemies are generated from room encounter profiles and respect safe roles.
- Ordinary procedural doors open, close, collide, animate, persist, and can be
  destroyed.
- Progression gates clearly state requirements and cannot be bypassed.
- Gate prerequisites are always reachable before their gates.
- Generated regions contain controlled branches, dead ends, and loops.
- Canyon traversals remain clear, lethal at their edges, and biome-correct.
- All automated tests, build, lint, media audit, and visual QA checks pass.

## Deliverable Strategy

Implement as a sequence of small PR-sized changes:

1. Metadata and geometry invariants.
2. Theme catalog and assignment.
3. Population planner.
4. Encounter planner.
5. Surface rendering.
6. Procedural door runtime.
7. Loop injection.
8. Access control and gates.
9. Canyon expansion and cross-chunk validation.
10. Persistence and QA hardening.

Do not combine all phases into one unreviewable change. Each delivery must keep
the game buildable and retain deterministic generation.
