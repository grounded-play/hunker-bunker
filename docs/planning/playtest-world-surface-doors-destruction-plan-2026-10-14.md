# Playtest plan: blended crash floor, shared doors, and walls that break

Status: implementation-ready plan  
Branch: `dev/sprint-52`  
Planning baseline: `a7abbb17`  
Evidence reviewed: newest hosted session-log uploads through 2026-10-14  

## Outcome

The next world-correction slice should deliver three player-visible rules:

1. The crash/landing floor is one continuous material system. Damage, scorch,
   wetness, and room surface art blend in the floor shader; opaque textured
   planes are not stacked above one another.
2. A door exists only at a real shared opening. Its room and corridor sides
   refer to one portal, one state, and one clearance envelope, and both sides
   are traversable when the door is open.
3. Ordinary structural walls react to every valid shot, visibly deteriorate,
   then open into a persistent walkable breach. A protected wall or locked
   progression gate explains why it resisted instead of silently behaving like
   scenery.

This is a code and verification plan. It does not mark the three defects fixed.

## Evidence and current reading

### Hosted playtest

The latest upload is
`logs/hunker-bunker-session-2026-10-14T05-04-10-520Z-mv7naky5-stp.json`:

- Windows desktop, Steam build `2.4.16-beta`, Engineer, solo.
- Session `2026-10-14T05:00:27.723Z` to `05:04:10.515Z`.
- World seed `3635028876`.
- Origin chunk `0,0` advertised its north portal. Approach chunk `0,-1`
  advertised north and south portals and was stamped as the narrow crash-site
  approach (`377` floor, `1912` void cells).
- The player produced repeated accepted projectile volleys and 11 attempts to
  play `bullet_impact_metal`, but the final and sampled performance state kept
  `destroyedWallCount: 0`.

The log proves the exact seed, chunk topology, firing activity, and lack of a
completed wall breach. It does **not** contain a screenshot, door aperture
coordinates, or `wall-damaged` events, so it cannot by itself prove which
rendered surface each projectile hit. The instrumentation gap is part of this
plan rather than being filled with a guess.

The installed package records only `2.4.16-beta`, not its Git commit. Reproduce
against both the packaged build and current branch before treating a current
test pass as proof that the observed build was correct.

### Code causes and risks

#### The floor really is stacked

`ThreeGame.mountChunk()` builds the origin floor using the chunk splat material,
then creates a second `7.5 x 7.5` `crashDeck` plane at world Y `0.035` with a
transparent, depth-writing `crashSiteFloorMaterial`. That material draws
`crash_site_broken_floor_v1` over the already textured floor. Polygon offset and
the Y gap may reduce literal depth-buffer flicker, but they do not create a
material blend; two competing floor images remain visible.

Relevant code:

- `src/threeGame.js`: texture/material setup near `crashSiteFloorMaterial`;
  `createChunkFloorSplatMaterial()`; the `crashDeck` block in `mountChunk()`.
- `src/floorSplat.js`: surface catalog, splat data, and shader blending.
- `src/floorSplat.test.js` and
  `src/threeGame.floorOverlaysAndAutoDoors.test.js`: floor contracts.

#### The crash exit spans two independently stamped zones

The open blast-door slab is at `(9,3)` in origin chunk `0,0`. The route then
crosses the north chunk boundary into separately generated/stamped chunk
`0,-1`. `stampCrashSiteOrigin()` and `stampCrashSiteApproach()` are intended to
meet at the same three-cell opening, but the approach code currently accepts
"some south opening" as satisfying the required crash connection. It does not
verify that the south opening is the exact centered socket required by the
origin. The log records portal sides, not their offsets, so the current evidence
cannot catch that mismatch.

Generated room doors have a related ownership weakness: door IDs originate on
room-local doorway records and are de-duplicated during planning by center cell.
The physical rule should instead be explicit: the normalized boundary opening
owns the door, while both adjacent spaces reference it.

Relevant code:

- `src/data/crashSiteBuild.js`: crash-room and approach contract.
- `src/crashSiteBuild.js`: origin and approach stamping.
- `src/threeGame.js`: `getEdgeOpening()`, chunk generation,
  `setupBunkerBlastDoor()`, procedural-door planning, stamping, and mounting.
- `src/roomGrammar.js`, `src/roomGrammarChunk.js`, `src/wfcGenerator.js`, and
  `src/proceduralDoors.js`: doorway sockets and runtime door records.
- `src/crashSiteBuild.test.js`, `src/threeGame.crashSiteDoor.test.js`,
  `src/proceduralDoors.test.js`, and `src/wfcGenerator.test.js`: topology tests.

#### Wall destruction exists, but the observed hit path is opaque

The intended path is already substantial:

`updateProjectiles()` -> `checkProjectileWallHit()` -> instanced-pool hit
resolution -> `damageWall()` -> `destroyWall()` -> persistent destroyed-wall key,
collision update, debris/audio/camera feedback, and multiplayer event.

Standard walls have 8 HP, damaged walls 5 HP, hazard walls 11 HP, and ordinary
door slabs 3 HP. Engineer bullets deal 1 base damage. Until destruction, an
instanced wall only changes tint; at zero HP its cell disappears and a burst is
spawned. The semantic multi-cell facade is hidden as a unit when one member
breaks, exposing the surviving cell meshes below.

The session log does not subscribe to `wall-damaged` or `wall-destroyed`, and it
does not record the wall key, resolved pool instance, HP transition, or a reason
when damage is refused. Consequently `destroyedWallCount: 0` cannot distinguish
misses, shots spread across several walls, a visual facade with no resolved
logical target, or a protected target. That uncertainty must be removed first.

Relevant code:

- `src/threeGame.js`: `spawnPlayerShot()`, `checkProjectileWallHit()`,
  `updateProjectiles()`, `findWallByPoolInstance()`, `damageWall()`,
  `destroyWall()`, wall-run facade creation, and chunk wall registries.
- `src/wallRaycastIndex.js`: optimized instanced-wall raycasts.
- `src/debugConsole.js`: captured gameplay event list.
- `src/threeGame.destructibleWalls.test.js`,
  `src/threeGame.performanceDiagnostics.test.js`, and
  `src/threeGame.multiplayerSpawnsAndSync.test.js`: existing wall coverage.

## Implementation packages

### P0 — freeze the reproduction and add truthful diagnostics

Owner area: gameplay diagnostics. Do this before changing hit behavior.

1. Add a rate-limited wall-impact record containing world position, logical
   `wallKey`, rendered object kind, instance ID, wall variant, HP before/after,
   applied damage, destroyed flag, and refusal reason (`locked`, `protected`,
   `unresolved-render-surface`, or `already-destroyed`). Do not log a record per
   frame or include player identity.
2. Add `wall-damaged` and `wall-destroyed` to the session event capture in
   `src/debugConsole.js`; aggregate repeated impacts in the same way weapon
   telemetry is sampled.
3. Add a debug probe that fires a fixed number of Engineer-strength hits into a
   chosen wall key. It must use the normal projectile/raycast path rather than
   calling `destroyWall()` directly.
4. Reproduce seed `3635028876` at the crash room, at its north seam, and at the
   first generated room wall. Save one before-change screenshot or short clip
   and the probe output outside source control; summarize the result in the
   implementation commit or follow-up report.

Acceptance:

- One impact can be followed from rendered hit to logical wall and HP change.
- A refused hit states the reason.
- Eight unmodified Engineer hits destroy a standard 8 HP wall when all eight
  land on the same cell.
- Diagnostics do not materially grow logs during automatic fire.

### P1 — fold crash damage into the single blended floor

Owner area: floor material and crash-site presentation.

1. Add a crash-impact surface/mask to `src/floorSplat.js`. Prefer the already
   shipped `tex_floor_scorched_plasma_crater` PBR family as the damaged center,
   with deterministic radial falloff/noise into the crash room's standard deck.
   Encode the choice in the origin chunk's splat data so the existing four-cell
   blend, breakup, roughness, wetness, and wall-foot shading all operate on it.
2. Remove the opaque/albedo `crashDeck` plane from `mountChunk()` and retire
   `crashSiteFloorMaterial` plus `crashSiteFloorTexture` from setup/disposal once
   no caller needs them.
3. Keep the heat pulse only as a sparse emissive effect. It must be transparent,
   `depthWrite: false`, bounded to the impact mask, and visually subordinate to
   the PBR floor. If the heat layer still reads as a second square texture,
   integrate that mask into the floor shader too.
4. Keep the impact centered on the active ship, but pass that center into splat
   generation rather than moving a second floor mesh after class selection.
5. Do not add a per-cell material or draw call. The origin remains one blended
   floor material, with at most the existing lightweight emissive effect.

Tests:

- `src/floorSplat.test.js`: crash center selects the scorched family; outer
  room cells remain standard; transition cells are deterministic; canyon/wall
  cells stay `NONE`.
- `src/threeGame.crashSiteDoor.test.js`: each class places the same shader mask
  under its active ship anchor without creating an opaque floor overlay.
- Renderer/browser assertion: origin chunk contains no transparent,
  depth-writing crash-floor plane and no coplanar room-floor overlays when floor
  splatting is active.

Acceptance:

- No shimmer, hard 7.5 m square, double-pattern edge, or floor texture popping
  while walking/rotating around the ship at 100%, 125%, and 150% render scale.
- The scorch reads as damage belonging to the deck, not a decal laid on it.
- Fallback GPUs without the compressed floor arrays still show one coherent
  floor.

### P2 — make a doorway one shared boundary portal

Owner area: world topology and procedural doors.

1. Introduce a normalized portal key derived from chunk/world coordinates,
   orientation, and the complete three-cell socket. Both adjacent rooms or a
   room/corridor pair reference this key. Door state, lock, HP, auto-close,
   clearance envelope, and persistence live once on that portal record.
2. Merge coincident room-local doorway declarations by portal key in
   `planProceduralDoors()` before styling/gating. Reject incompatible declarations
   (different cells/orientation) during generation rather than silently choosing
   the first room.
3. Make the crash-site boundary use the same contract. In
   `stampCrashSiteApproach()`, require the exact south socket centered at world
   X 9 even when another south opening already exists. Carve a continuous apron
   from the origin pre-hall, across both chunk-border rows, into the approach
   hub.
4. After door stamping and support repair, run a local traversal check from an
   apron cell on side A to an apron cell on side B with the door considered
   open. If it fails, repair only the declared clearance envelope or reject and
   regenerate the chunk; never leave a door mounted against a wall.
5. Mount one slab/frame/control set per portal. Room presentation may style each
   face, but it must not create a second door or collision object.
6. Extend `WORLD Chunk generated` telemetry with portal IDs, center/cells, and
   `clearBothSides`, at least for the crash route and failed validations. Side
   names alone are insufficient evidence.

Tests:

- `src/crashSiteBuild.test.js`: if an unrelated south opening exists, the exact
  required centered crash socket is still carved; BFS crosses from ship room to
  approach hub.
- `src/threeGame.crashSiteDoor.test.js`: open blast door plus cross-chunk seam is
  traversable and collision-free for the player's radius.
- `src/proceduralDoors.test.js`: two adjacent room declarations become one portal,
  one persisted state, and one mounted door; mismatched sockets fail validation.
- `src/wfcGenerator.test.js`: every shared `OPEN3` socket aligns across both
  spaces and retains its clearance apron after door/support stamping.
- Seed regression: `3635028876`, plus a deterministic sample of at least 100
  seeds, contains no door whose open-state traversal terminates in a wall.

Acceptance:

- The crash-room door opens onto a readable continuous service hall.
- Every generated door connects two walkable spaces and controls the same
  opening from either side.
- Door persistence and multiplayer synchronization still address one stable ID.

### P3 — make ordinary walls visibly crumble and reliably open

Owner area: projectile collision, wall state, and destruction presentation.

1. Add one `resolveDestructibleWallHit()` boundary between raycast results and
   `damageWall()`. It must resolve ordinary cell pools, procedural door meshes,
   cutaway presentations, and semantic wall-run facades to a specific logical
   wall record. A visual wall surface must never absorb a projectile without
   either resolving damage or reporting why it is protected.
2. For a wall-run facade hit, select the nearest member cell along the hit point;
   do not destroy an entire 2–4 cell run. On breach, hide/rebuild only the facade
   covering that member while keeping surviving members hittable and visually
   intact.
3. Keep HP and persistence on the logical wall record. Use three presentation
   stages derived from HP ratio: intact, cracked/deformed, and breached. Reuse
   pooled materials/geometry and existing breach/debris assets; do not clone a
   material or instantiate a unique heavyweight GLB for every wall.
4. Improve immediate feedback on non-final hits: a crack/deformation step,
   material-appropriate chips/dust, the correct impact sound, and a small damage
   flash. Final impact produces the larger crumble burst and a visible hole.
   Keep camera trauma subtle for bullet hits and stronger for Tank/boss breaches.
5. At zero HP, preserve the existing world-state invariants: remove collision
   and raycast target, mark the tile destroyed, create exterior ground only when
   appropriate, clear attached dressing/decals, update navigation/cutaway data,
   and replicate one idempotent multiplayer event.
6. Make exceptions explicit. Objective-critical modules use their existing
   protected-prop contract; locked progression doors return a locked/protected
   impact response. Ordinary `#` room and corridor walls remain destructible.
7. Supply or correctly resolve `bullet_impact_metal`; the newest log attempted
   it 11 times and recorded it as missing.

Tests:

- `src/threeGame.destructibleWalls.test.js`: full projectile path for standard,
  damaged, hazard, exterior, cutaway, facade, and procedural-door targets; exact
  HP transitions; one-cell facade breach; walkability and persistence after
  remount.
- `src/wallRaycastIndex.test.js`: instanced hit keeps stable `instanceId` and
  resolves the expected wall after matrices/cutaway state change.
- `src/threeGame.multiplayerSpawnsAndSync.test.js`: duplicate/local/remote breach
  events remain idempotent and peers remove the same logical cell.
- `src/threeGame.performanceDiagnostics.test.js`: telemetry reports applied and
  refused damage without per-shot resource growth.
- Existing protected-prop and quest-object suites continue to prove that the
  change cannot soft-lock objectives.

Acceptance:

- In an installed build, eight Engineer shots into one standard wall show
  progressive damage and create a traversable breach; four Tank shots do the
  same at 2 damage each.
- Shooting a protected surface gives an immediate locked/reinforced response.
- Reloading the run or remounting the chunk preserves the breach.
- Repeated breaches do not grow Three.js programs/materials without bound and
  remain within the current destruction-window performance budget.

## Order, ownership, and commit boundaries

Implement in P0 -> P1 -> P2 -> P3 order. P0 removes ambiguity for P3; P2 must
stabilize portal identity before door persistence is changed. P1 can be reviewed
independently after the reproduction is frozen.

Suggested commits:

1. `test(telemetry): trace logical wall impacts`
2. `fix(floor): blend crash damage into the chunk splat`
3. `fix(world): share and validate doorway portals`
4. `fix(combat): resolve and stage structural wall breaches`
5. `test(playtest): verify crash route floor and destruction`

Serialize edits to `src/threeGame.js`. The floor owner can work primarily in
`src/floorSplat.js`; the topology owner in `src/crashSiteBuild.js`,
`src/proceduralDoors.js`, and room/WFC tests; the destruction owner in the
projectile/wall sections of `src/threeGame.js` and `src/wallRaycastIndex.js`.
Do not land parallel changes to the same `threeGame.js` regions without first
reassigning ownership.

## Verification gate

Run the narrow suites after each package, then the repository's normal unit,
lint, and build checks. Final evidence must come from a newly packaged Steam
build, not only Vite or headless tests.

Final manual matrix:

| Case | Required evidence |
|---|---|
| Seed `3635028876`, Engineer, crash room | Floor orbit/walk clip; exact portal telemetry; eight-hit wall breach |
| Same seed, Tank | Four-hit wall breach and heavy feedback |
| Fresh seed, generated adjacent rooms | One shared door; open traversal from both sides |
| Chunk unload/remount or save/reload | Door state and destroyed wall persist |
| Two-player co-op | Both peers see the same door and one wall-cell breach |
| Desktop at 100/125/150% scale | No floor fighting or square overlay edge |
| Steam Deck | No new destruction hitch; door and breach remain readable at 1280x800 |

For the follow-up upload, include the Git commit/build ID in session metadata.
The current `2.4.16-beta`-only package label is not enough to distinguish local
fixes from what the player actually ran.

