# Plan: mixed interior/exterior spaces and truthful crumbling ledges

Status: implementation-ready plan  
Branch: `dev/sprint-52`  
Planning baseline: `a950c20b`  
Evidence reviewed: hosted session logs through 2026-10-14 and current world-generation/runtime code

## Player-visible outcome

The world should obey five simple rules:

1. A visible rock rim is ground, not an invisible hole. The player may step on
   it safely the first time.
2. A fragile rim must visibly and audibly crack before it can fail. After the
   player leaves the cracked area and deliberately crosses it again, it shakes,
   sheds debris, and then collapses into a real void with a short escape grace
   period.
3. A room boundary is either a wall or a declared door. Ordinary room floor may
   never terminate directly at a cliff or void.
4. Every routable world chunk contains a deliberate mix of interior volume and
   exterior ground, with seeded variation in their proportions and shapes.
   Chunks stop reading as one repeated large room floating in a canyon.
5. Natural crossings are real topology: stone bridges, ice shelves, exterior
   yards, and broken gantries connect stable banks and participate in the same
   traversal validation as halls and doors.

This document is a code-change plan. It does not mark those outcomes complete.

## Evidence and current diagnosis

### Hosted playtest evidence

The latest uploaded session is
`logs/hunker-bunker-session-2026-10-14T05-04-10-520Z-mv7naky5-stp.json`:

- Build `2.4.16-beta`, commit `a7abbb179be6`, branch `dev/sprint-52`.
- Campaign seed `3635028876`; expedition seed `1564890653`.
- Origin chunk `0,0` reported `284` floor, `214` ledge, `45` cliff, and
  `1785` void cells.
- The fixed crash approach `0,-1` reported `377` floor and `1912` void cells,
  with no stable ledge or cliff band in the chunk telemetry.
- The final run ended in `pit-fall` at `(21.93, -47.58)`, directly beside the
  north edge of the `0,-1` approach chunk (`CHUNK_SIZE` is 49).
- The archived black boxes contain two earlier surface pit deaths at
  `(12.65, -47.65)` and `(16.78, -47.67)`. Three different crossings therefore
  reached nearly the same north seam and failed there; this is not evidence of
  one accidental input.
- Nearby MAZE chunks repeatedly reported hundreds of `O` ledge cells and
  `75–175` `C` cliff cells. Many were classified `large-room`, confirming the
  repeated room-island rhythm visible in play.

The uploaded build predates `a950c20b`, but the relevant cliff behavior remains
explicit in current code and tests, so this report is still actionable against
HEAD.

### The tile contract is currently misleading

`src/tileCatalog.js` documents the band as:

`room floor -> wall -> O ledge -> C cliff -> X pit`

However, current runtime behavior is:

- `O` is rendered and walkable exterior ground.
- `C` is rendered as a substantial cracked rock formation but
  `getHoleVisualInfo()` marks it immediately lethal with a `0.52` fall radius.
- `X` is also immediately lethal.
- `canOccupyPosition()` deliberately allows both `C` and `X` so fall detection
  can trigger.
- `threeGame.gameplayRegression.test.js` explicitly requires the player to fall
  as soon as they cross the rendered `C` lip.
- Within `SPAWN_SAFE_EDGE_RADIUS`, the same lethal tiles become invisible
  collision walls instead. The image says “rock,” while one location says
  “instant death” and another says “cannot enter.”

This is the main affordance defect. Collision is technically synchronized with
the tile label, but the label does not match what the geometry communicates.

### Chunk composition is one gesture followed by a uniform band

`generateArchitecturalMazeChunk()` fills a whole chunk with `X`, then creates
either:

- one centered room, normally 11–13 cells wide/deep; or
- one long connector terminating in a junction bay.

`addCanyonVoidAroundWalkable()` then converts nearby solid/existing canyon into
the same smoothly varying 3–5-cell `O` apron, one `C` row, then `X`. This creates
useful clearance but not compositional variety. Most chunks still read as one
room island or one corridor island with a mathematically similar shoreline.

The current room-selection rule uses coordinate parity to discourage adjacent
optional rooms, but destinations, exposure rooms, grammar rooms, reservations,
and diagonal sightlines can still place large rooms next to the crash route.
The crash approach itself is always the same centered release bay and straight
service route, so even different campaign seeds begin with the same spatial
sentence.

### Room-to-exterior safety is repaired too late and too locally

`planInstancedFloorCoverage()` repairs an `X`/`C` cell touching a door by
turning that single cell into ordinary floor. It does not prove that the entire
door width, player-radius envelope, or route beyond it has a stable exterior
landing. `addWallShell()` protects walkable space only while the initial grid is
stamped; later doorway, portal, erosion, vertical-feature, and canyon passes do
not share one final room-envelope validator.

That allows three bad presentations:

- a room floor or threshold appears to open directly onto the edge;
- a door has one patched landing cell but no readable exterior apron;
- an edge rock is rendered where the gameplay model already considers a void.

### Bridges exist, but they are not a general landscape grammar

There are already several isolated bridge concepts:

- `VERTICAL_TILE.BRIDGE` in `src/verticalWfc.js`;
- canyon walkway tiles in `src/tileCatalog.js`;
- progression crossing bridges in the campaign world;
- bridge-like dressing assets.

They do not currently form a common structural contract for ordinary mixed
interior/exterior chunks. The WFC canyon-walkway lattice is also partially
discarded by the architectural producer, so its natural-crossing signal does
not reliably become the final grid.

## New authoritative contracts

### Static terrain semantics

Keep the existing glyphs to minimize migration cost, but make their meaning
truthful and exclusive:

| Glyph | Meaning | Initial traversal | Can change? |
| --- | --- | --- | --- |
| `.` / `D` | interior floor / door threshold | safe | door state only |
| `O` | stable exterior ground, yard, shelf, or bank | safe | no |
| `C` | solid rock rim with a fragile lifecycle | safe | may crack/collapse |
| `X` | open canyon/void | lethal | only explicit bridge/repair systems |
| `B` | validated bridge deck over void | safe | only an authored bridge event |
| `#` | structural room wall | blocked/destructible by wall rules | may breach |

`C` must receive a real cap/floor collision surface. It is no longer a hole.
Only `X`, explicit pit tile `P`, or a `C` zone whose state has reached
`collapsed` may cause a pit fall.

### Fragile-rim lifecycle

Model connected `C` cells as small zones rather than independent one-cell
traps. Each zone owns one stable ID and this state machine:

`solid -> cracked -> warning -> collapsed`

- **solid:** safe on first entry and throughout that traversal.
- **cracked:** transition only after the player has stepped off the zone. Swap
  to a visibly fractured surface, play a bounded rock-settle cue, and persist
  the state. Never remove support beneath the player during the first visit.
- **warning:** begins on the next entry. Pulse cracks, shake rim instances,
  emit dust/pebbles, and give at least 650 ms to retreat. The simulation owns
  the timer; render FPS does not.
- **collapsed:** replace the zone's grid semantics with `X`, retire its cap
  instances, expose the canyon skirt/void mask, and allow normal fall detection.
  Collapse after the warning timer or immediately after the player exits,
  whichever occurs first.

Rules:

- Main routes, door aprons, spawn/crash safety envelope, objective interaction
  envelopes, and both banks of a bridge may never be fragile zones.
- A zone cannot crack from camera/radar/weather queries; only authoritative
  player occupancy may advance it.
- Host authority advances co-op state once and broadcasts the stable zone ID,
  state, and transition sequence/time. Clients only present it.
- `solid` need not be saved. `cracked`, `warning` (restored as `cracked`), and
  `collapsed` must persist across chunk eviction, suspend, and campaign reload.
- Scout/Engineer traversal abilities may cross real `X`; they do not bypass the
  presentation lifecycle or silently treat uncracked `C` as void.

### Interior/exterior envelope invariant

Every final routable chunk must expose semantic regions in its
`ChunkStructureResult`:

- `interiorRegions`
- `exteriorRegions`
- `fragileRimZones`
- `voidRegions`
- `bridgeRecords`
- `portalAprons`

After all stamping and mutations, validate these invariants:

1. Each interior floor boundary is adjacent to `#`, another interior floor, or
   a declared door cell. It cannot touch `C` or `X` orthogonally.
2. Every exterior-facing door has a stable apron covering the complete
   three-cell opening, player-radius side clearance, and at least three cells of
   depth before any fragile rim.
3. Every required portal is connected to every required objective/through-route
   using only initially safe tiles (`.`, `D`, `O`, `B`, ramps/ladders).
4. No required route depends on `C`, even while `C` is still solid.
5. A bridge connects two distinct stable banks, has a minimum two-cell-wide
   traversable deck (three at required world-route crossings), and has no
   unsupported door at either end.
6. Exterior ground has a visible terminal sequence: stable bank, optional
   fragile rock rim, then void. `C` may not appear without a neighboring stable
   retreat tile.

Validation happens before the chunk enters caches or metadata. Failed optional
features are removed deterministically; failed required routes reject the
candidate and select a bounded safe fallback.

## Implementation packages

### P0 — reproduce and instrument the actual edge failure

Files:

- `scripts/playtest-navigation-report.js`
- new `scripts/world-layout-portfolio.js`
- `src/threeGame.js`
- `src/debugConsole.js`

Changes:

1. Teach the navigation report to read the hosted JSON session format, not only
   legacy `.log` files. Extract pit-death coordinate, chunk/local coordinate,
   current tile glyph, fragile-zone ID/state, nearest portal, and nearest room
   boundary.
2. Add a deterministic layout dump for seed `3635028876` covering chunks
   `0,0`, `0,-1`, `0,-2`, `-1,-1`, and `1,-1`. Emit ASCII plus semantic-region
   counts and validate the three recorded death coordinates.
3. Extend `WORLD Chunk generated` with generator ID, indoor/exterior ratios,
   fragile-zone count, bridge count, minimum door-apron depth, and validation
   repairs/rejections. Current floor/ledge/cliff/void counts are insufficient.
4. Add rate-limited `ledge-state-changed` and `pit-fall-started` events. Include
   tile glyph and zone state, never raw input history.

Acceptance:

- The current branch explains why each recorded coordinate is lethal.
- The same report can prove after implementation that an intact/cracked `C`
  never directly starts a fall.

### P1 — separate solid rim from real void and implement staged collapse

Files:

- new `src/fragileLedges.js`
- `src/threeGame.js`
- `src/campaignWorld.js` or the existing maze persistence adapter
- `src/threeGame.gameplayRegression.test.js`
- `src/threeGame.spawnSafeEdges.test.js`
- new `src/fragileLedges.test.js`
- multiplayer sync tests in `src/threeGame.multiplayerSpawnsAndSync.test.js`

Changes:

1. Move the pure zone grouping/state reducer into `fragileLedges.js`. Inputs are
   the final grid, protected route/apron cells, player zone transitions, and
   authoritative elapsed time; output is deterministic zone records and state
   transitions.
2. Change `getHoleVisualInfo()` so intact/cracked/warning `C` returns no hole.
   A collapsed zone resolves exactly like `X`. Keep `P` and `X` immediately
   lethal.
3. Remove the special invisible-wall interpretation of safe-zone cliffs.
   Spawn safety is expressed structurally by excluding fragile zones and void
   from the crash envelope, not by making the same tile mean two things based
   on distance.
4. Track last occupied ledge zone in the authoritative gameplay update. Use a
   monotonic deadline rather than frame counts so render rate cannot change the
   warning duration. First exit cracks; second entry starts warning; expiry/exit collapses. Ensure
   depenetration, respawn, teleport, and chunk mount cannot accidentally count
   as a traversal.
5. Persist ledge-zone state by stable world-space zone ID. Add it to campaign,
   suspend, and multiplayer world-change payloads.
6. On collapse, update cached tile semantics, pathfinding, radar danger zones,
   weather surface queries, floor coverage, and bridgeability through one
   transition function. Do not let render data mutate gameplay state.

Acceptance:

- First traversal is always safe.
- The texture/state change occurs while the player stands on stable ground.
- A second traversal produces a readable warning before support disappears.
- Remount/reload and co-op peers agree on the state.

### P2 — render rock rims as support, then visibly fracture them

Files:

- `src/threeGame.js` chunk floor/cliff assembly
- `src/floorSplat.js`
- `src/stickerPlanner.js` or a new bounded ledge-crack presentation helper
- chunk resource disposal code
- renderer-focused tests

Changes:

1. Include intact `C` cells in floor coverage with a rock-cap material and
   physical top at floor height. Continue rendering canyon skirts on the `X`
   side so the silhouette still warns of the drop.
2. Store per-zone instance indices. Update only those instances on transitions;
   never rebuild an entire visible chunk in the gameplay frame.
3. Present `cracked` using the shipped cracked-seam/decal family or a dedicated
   rock-crack atlas in one pooled `InstancedMesh`. Use transparent,
   `depthWrite: false` overlays or per-instance shader state; do not add one
   material/draw call per tile or another large competing floor plane.
4. Present `warning` with low-amplitude deterministic instance motion,
   dust/pebble bursts, emissive crack pulse, and positional rock stress audio.
5. Present `collapsed` by zeroing the cap/crack instance matrices, revealing
   the already-mounted void mask/skirt, and spawning bounded pooled debris.
6. Register/dispose instance buffers and any owned geometry with the existing
   chunk lifecycle. Repeated mount/unmount must return renderer memory to its
   prior baseline.

Acceptance:

- The stable rock reads as a walkable rim and the void begins beyond it.
- Solid, cracked, warning, and collapsed states are distinguishable without UI.
- No z-fighting, per-cell material growth, first-collapse shader hitch, or
  leaked geometry/texture occurs.

### P3 — replace room-or-corridor islands with mixed landscape compositions

Files:

- `src/chunkStructure.js`
- `src/architecturalMaze.js`
- new `src/chunkLandscape.js`
- `src/roomBuilds.js` stamping boundary
- `src/wfcGenerator.js`
- `src/threeGame.js` generation integration
- `src/data/crashSiteBuild.js` and `src/crashSiteBuild.js`

Changes:

1. Make `ChunkStructureResult` the only final structural authority. Stop
   carrying a WFC landscape signal that is later discarded by a separate
   architectural grid.
2. Add a seeded `chunkLandscape` composition stage that places both interior
   and exterior regions before walls, doors, rims, and void are finalized.
   It consumes required sockets/routes and produces semantic regions plus a
   final candidate grid.
3. Supply a compact template grammar with at least these families:
   - room against a broad exterior yard;
   - small bunker plus wrapping rock path;
   - two unequal interior pavilions joined through an outside court;
   - room overlooking a stable canyon bank;
   - interior/exterior switchback;
   - natural bridge court;
   - split bank with broken gantry and stable alternate path.
4. Give each family small/medium/large proportions. Select by stable coordinate
   hash plus world-plan role, never generation/load order. Penalize the previous
   two neighboring family/size signatures so large centered rooms cannot repeat
   beside the crash route or in long runs.
5. Target broad bands rather than one exact ratio: ordinary routable chunks
   should contain roughly 20–65% safe exterior traversal and 15–55% interior
   traversal. Reserved hero rooms may exceed the interior band but must still
   provide an exterior forecourt or return apron unless their authored contract
   explicitly declares a fully enclosed site.
6. Replace the fixed crash approach with 3–4 seeded approach compositions that
   all preserve the shared ship socket and service-hub requirements: exterior
   switchback, broken gantry court, rock-cut service trench, and split yard.
   The origin keeps a recognizable crash chamber but gains an irregular outdoor
   crash apron rather than a repeated rectangular island.
7. Run the envelope validator after doors, vertical features, landform changes,
   and canyon banding. Remove `planInstancedFloorCoverage()`'s one-cell portal
   repair once generation guarantees full aprons; rendering must not repair
   topology.

Acceptance:

- The first three traversed chunks are not always crash room -> straight bay ->
  large room.
- Every ordinary routable chunk exposes both a meaningful interior and exterior
  region, with visibly different proportions across seeds.
- No room floor or door opens directly onto `C`/`X`.

### P4 — make natural crossings a first-class topology feature

Files:

- new `src/naturalCrossings.js`
- `src/chunkLandscape.js`
- `src/verticalWfc.js`
- `src/worldRoutePlanner.js`
- `src/threeGame.js` mounting/path/radar logic
- bridge and traversal tests

Changes:

1. Define one `BridgeRecord`: stable ID, deck cells, bank cells, crossing axis,
   width, presentation family (`stone`, `ice`, `gantry`, `root`), required vs
   optional, and mutable state if progression controls it.
2. Generate optional bridges only where two stable exterior banks are separated
   by an `X` region and the bridge creates a loop, overlook, shortcut, or
   alternate approach. Do not scatter bridges as decoration.
3. Reuse the existing `B` traversal semantics and vertical height metadata, but
   let presentation select natural stone/ice/industrial geometry. A bridge deck
   is always included in collision, pathfinding, radar, weather, and map reveal.
4. Protect bridge banks and required deck cells from fragile-rim selection.
   Optional broken side pieces may crumble, but the declared route remains
   valid unless a progression event explicitly changes it.
5. Feed required bridge connections into `worldRoutePlanner`; prove both local
   bank-to-bank traversal and global objective reachability before accepting a
   chunk.

Acceptance:

- Bridges connect visible destinations and create route choices.
- No bridge is a non-colliding visual prop or terminates on a lethal tile.
- Natural crossings vary by biome while sharing one gameplay contract.

### P5 — migration, portfolio proof, and playtest gate

Files:

- campaign/suspend schema code
- `scripts/world-layout-portfolio.js`
- generation stress tests
- Playwright visual/gameplay probes

Changes:

1. Bump the generated-layout identity/version because the same seed will now
   produce different grids. Do not restore coordinate-keyed doors, destroyed
   walls, or ledge zones into a mismatched layout version.
2. Migrate compatible saves by preserving account/progression state while
   regenerating map-local world changes. Record the migration reason once.
3. Sweep at least 5,000 seeds for topology invariants and collect a named visual
   portfolio: smallest exterior, largest exterior, smallest room, largest room,
   most bridges, no optional bridge, and most fragile rim.
4. Add browser probes that walk the recorded failure seam, cross a solid rim,
   leave and observe its crack, re-enter and escape the warning, then verify the
   collapsed zone is truly lethal.
5. Capture the first three chunks for at least ten campaign seeds from the game
   camera. Human review rejects repeated composition even when structural tests
   pass.

## File-level change map

| Area | Current responsibility | Planned change |
| --- | --- | --- |
| `src/tileCatalog.js` | glyph/band definitions | Make `C` explicitly solid/fragile and `X` exclusively void; document protected bridge/bank rules. |
| `src/wfcGenerator.js` | canyon band conversion | Produce semantic region/zone candidates; stop making rendered cliff cells immediate holes. |
| `src/architecturalMaze.js` | one room or connector in `X` | Become an interior-footprint supplier to mixed composition, not final chunk authority. |
| `src/chunkStructure.js` | selects final structural producer | Return one grid plus interior/exterior/rim/bridge/apron metadata and validation result. |
| `src/chunkLandscape.js` (new) | — | Seeded mixed-space templates, proportion selection, band construction, final invariants. |
| `src/fragileLedges.js` (new) | — | Pure zone grouping, protected-cell filtering, and collapse state reducer. |
| `src/naturalCrossings.js` (new) | — | Pure bridge candidate/record creation and bank validation. |
| `src/crashSiteBuild.js` | fixed origin/approach stamps | Variant approach compositions with unchanged shared portal and protected crash envelope. |
| `src/threeGame.js` generation | orders many mutation passes | Integrate one final validated structure; remove render-time topology repairs. |
| `src/threeGame.js` movement | `C` and `X` trigger falls | Only `X`/`P`/collapsed rim trigger falls; advance ledge lifecycle from fixed-tick occupancy. |
| `src/threeGame.js` rendering | `C` is cliff mesh without floor | Mount cap/crack/debris instance pools and update by zone state. |
| persistence/network code | walls/doors world changes | Add versioned ledge-zone states and host-authoritative transitions. |
| diagnostics/scripts | glyph counts only | Report semantic ratios, apron violations, bridge records, ledge states, and death context. |

## Required tests

### Pure topology

- A room boundary never touches `C` or `X` without `#`/declared door.
- Every door apron is complete for its full width and player-radius envelope.
- Required routes use only initially safe tiles.
- Every `C` zone has a stable retreat neighbor and excludes protected routes.
- Every bridge reaches two banks and preserves route connectivity.
- Same seed and coordinates produce byte-identical grids/records regardless of
  chunk generation order.

### Runtime behavior

- `C` is occupiable and does not start a fall in `solid`, `cracked`, or
  `warning` state.
- First exit cracks; second entry warns; only collapse becomes lethal.
- Spawn safety no longer relies on an invisible blocking exception.
- Chunk eviction/remount, campaign reload, suspend/resume, and multiplayer peer
  join preserve the same ledge state.
- Pathfinding/radar/weather/map queries change in the same transition as the
  authoritative tile.

### Rendering/performance

- Each state has the correct cap/crack/void presentation.
- Instance updates affect only the zone that changed.
- No per-tile material allocation and no shader compile on first collapse.
- Repeated chunk mount/unmount returns geometry, texture, and draw-call counts
  to baseline.

### Seed regressions

- Seed `3635028876`: the three logged north-approach death positions are either
  stable bank/bridge/rim on first traversal or clearly beyond real `X`; none is
  a solid-looking instant-death cliff.
- At least 5,000 seeds: zero required-route, room-envelope, door-apron, or bridge
  violations.
- Distribution checks prevent one centered large-room family or one indoor/
  exterior ratio band from dominating the first three chunks.

## Implementation order and commit boundaries

1. `test(world): capture ledge and mixed-space regressions`
   - JSON log report, seed fixture, failing semantic/topology tests.
2. `fix(traversal): make cliff rims staged fragile ground`
   - pure state machine, movement/fall contract, persistence/network state.
3. `feat(world): compose mixed interior and exterior chunks`
   - landscape grammar, envelope validator, crash approach variants.
4. `feat(world): add validated natural crossings`
   - bridge records, topology integration, presentation families.
5. `feat(render): present cracking and collapsing ledges`
   - pooled cap/crack/debris rendering and lifecycle disposal.
6. `test(world): enforce layout portfolio and playtest gates`
   - 5,000-seed sweep, browser probe, visual portfolio report.

Each commit must keep deterministic seed generation and the full test suite
green. Do not combine the terrain semantic change with the layout grammar in
one unreviewable commit.

## Non-goals for this slice

- Free jumping, platforming, or physics-driven rock bodies.
- Making ordinary `O` exterior ground randomly collapse.
- Replacing the radial campaign topology or progression gates.
- Adding decorative bridges that are not traversable.
- Using collision walls to compensate for a misleading terrain mesh.
- Guaranteeing every hero/destination room is half outdoors; authored enclosed
  spaces may opt out explicitly, but their approach still needs a stable
  exterior threshold.

## Definition of done

This work is complete only when:

- solid-looking rim rocks are safe until their staged lifecycle visibly fails;
- the player receives a clear texture/audio/motion warning before collapse;
- room walls and exterior aprons prevent rooms or doors from terminating at a
  raw edge;
- early and ordinary chunks visibly mix differently sized indoor and outdoor
  areas;
- natural bridges are common enough to shape routes but always topologically
  valid;
- the logged seed, large deterministic sweep, full automated suite, production
  build, and human game-camera portfolio all pass;
- the generated-layout version and dynamic ledge state restore safely.
