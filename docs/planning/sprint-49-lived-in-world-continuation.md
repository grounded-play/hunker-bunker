# Sprint 49 lived-in world continuation

Status: active implementation journal | Branch: `dev/sprint-49` | Updated: 2026-10-04

This file is the continuation point for the prop, prefab, destruction, and room-life
work requested after reviewing the Sprint 49 plan. Keep it current before each
commit so another contributor can resume without reconstructing the audit.

The ordered execution contract now lives in the
[Sprint 49 Lived-In World Master Implementation Plan](sprint-49-lived-in-world-master-plan.md).
Use this journal for commit-by-commit evidence and next-step handoffs; use the master
plan for milestone scope, dependencies, verification gates, and definition of done.

## Evidence carried into implementation

- The Thursday Deck session
  `logs/hunker-bunker-session-2026-10-02T01-37-00-805Z-muqam0sq-bhvr.json`
  recorded average GPU time of 16.51 ms, but presented gameplay p95 of 76.5 ms.
  Its worst retained window was p95 152 ms at
  `event:destructible-prop-broken`. New room life must therefore remain bounded,
  reuse caches, and avoid unbounded particle/light/draw-call growth.
- The key art in `public/keyart/keyart_prop_*.jpg` consistently layers a strong
  functional silhouette with wall/ceiling infrastructure, floor traces, hanging
  cables, leaking fluids, shrines, and signs of prior inhabitants. The game already
  owns those layers in `ROOM_THEME_CATALOG`; `planRoomPopulation` simply ignored
  its `smallProps`, `ambientProps`, and `rareProps` pools.
- All 71 `public/3d/runtime/new3ds/prop_*.glb` files are registered. Sixty-seven
  participate in room themes or semantic variant groups. The defense turret,
  biomech arch, camp cookfire, and cave throne intentionally remain bespoke set
  pieces so their gameplay meaning is not diluted by random room substitution.
- All 80 current cave/space modular-kit GLBs are registered and exhibited by the
  museum audit. Their normal-play placement gap is separate: the Thursday handoff
  found 0 `hallway-connector` chunks in a 67-chunk run, so adding a dedicated,
  socket-safe placement space remains the next prefab task. Do not import the 408
  rejected Kenney nature/building pieces without an art-direction decision.

## Commit record

### Next commit — M4 active practical-light guard

- Keep one registered practical source per eligible room, but allow only the nearest
  anchor practical to occupy the fixed environment-light pool at a time. This meets
  the active-chamber contract while preserving the other seven slots for existing
  objective, threat, portal, and accessibility lighting.
- Extend the pool test across two anchor rooms and camera movement; the visible light
  count must remain fixed and the nearest anchor must hand off without enabling a
  second anchor source.
- Run focused light/set-piece tests, docs audit, 500 seeds, and the full suite; stage
  only this journal, the pool guard, and its test.

### Next commit — M2 grounding priority hardening

- Run the grounded-anchor relationship before small/rare/ambient edge dressing so
  its GLB support piece can consume the documented five-object budget instead of
  silently losing every slot in a busy room.
- Restrict “beside the anchor” to the four cardinal neighbor cells; diagonal decals
  do not visually tether machinery to its service run.
- Add a crowded-room priority regression, tighten the adjacency assertion, and run
  the population tests, docs audit, 500-seed sweep, and full unit suite. Leave the
  unrelated generated chroma audit file unstaged.

### Next commit — M1 evidence and compatibility hardening

- Regenerate the committed four-side overview plate with the measured 0.85-unit
  room inset from `8fb9d2a8`; the current plate still shows the rejected 0.5-unit
  intermediate even though the closed/open Playwright captures are correct.
- Keep legacy room doors without IDs eligible for ordinary presentation frames,
  while also recognizing structural gateway declarations carried by `contentPlan`.
- Add focused eligibility tests, run the M1 test set and `git diff --check`, and
  stage only the journal, overview renderer/capture, helper, and its test.

### M1 — cardinal gateway truth

- Measure the shipped cave and space `gate.glb` bounds at the shared kit scale,
  then give north/east/south/west room thresholds distinct cardinal transforms
  with the approved half-cell room-side inset.
- Suppress the decorative frame for locked procedural gates, ring crossings, and
  authored rooms that already declare structural gateway architecture. Ordinary
  animated door slabs remain compatible and retain all collision and state authority.
- Add four-side grammar coverage and room-set-piece eligibility coverage, commit a
  reproducible four-orientation visual capture, then run the focused tests, docs
  audit, 500-seed sweep, and full unit suite.
- Assumption to verify visually: the open kit frame is front/back symmetric enough
  for four semantic yaws; the unique yaws preserve room-facing intent even where
  the current mesh silhouette is symmetric.

### `b3767e8a` — GLB-only props join the destruction contract

- `prop_` placements without billboard fallbacks now receive HP, projectile/melee
  targeting, co-op break synchronization, drops, custom destruction behavior, and
  removal through the existing scatter-prop path.
- Architecture, aftermath states, modular navigation kits, and objective-critical
  objects remain protected to avoid progression and navigation breakage.
- Destroying the living umbilical removes and disposes its attacker controller so
  it cannot continue ticking after the visible prop is gone.
- Verification: 30 focused tests passed.

### `5997431e` — bounded room life and cached destruction

- Spend the existing small/ambient/rare theme pools at room edges without blocking
  doors, reserved fixtures, room centers, pickups, or combat lanes.
- Cap the full population plan at five objects; gameplay anchors and pickups are
  allocated before decorative layers.
- Cache fractured debris by prop model type instead of unique placement key, so
  subsequent props of the same model do not repeat the ~100 ms fracture step.
- Pin registration, gameplay reachability, and behavior coverage for the full
  runtime prop library with an automated audit.
- Verify focused world/destruction suites plus the configured seed sweep. Then run
  the full unit suite before taking the prefab-placement continuation.

Verification completed: 75 focused tests, 562 full-suite files / 4,941 tests, and
a 500-seed sweep all passed.

### `e3aa3b05` — authored-room modular gateway landmarks

- Add a pure `roomGatewayKitPlacement` grammar helper that centres the open
  `gate.glb` frame for the room biome on a real three-cell threshold.
- Mount at most one gateway per authored room. Keep it non-colliding, structural,
  socket-scaled, and cardinally rotated; procedural doors and the tile grid remain
  the only collision/lock authority.
- This gives the cave/space prefab kits a normal-play placement path even when the
  generator produces no `hallway-connector` chunks, without layering a full room
  shell over existing geometry.
- Verification before commit: kit grammar, room set-piece, 3D overlay, prop
  collision and destructibility suites; 500-seed sweep; then the full unit suite.

Verification completed: 55 focused tests, 562 full-suite files / 4,944 tests, and
a 500-seed sweep all passed.

## Final key-art read

A contact-sheet review of the actual shipped key art confirmed the repeated visual
language rather than relying on filenames alone:

- one large, readable functional anchor per composition (slab, hatch, gantry,
  oxygen rack, exchanger, shrine);
- infrastructure packed around the perimeter (pipe forests, bundled cables,
  ribbed wall panels and suspended fixtures), leaving the working floor readable;
- evidence of use and failure at floor level (tools, containers, coolant pools,
  drainage, caution markings and residue);
- restrained practical light concentrated on the object, usually amber, green or
  cyan, instead of uniform room brightness.

The implementation follows that hierarchy: signature/large anchors remain first,
small and ambient layers stay at room edges, rare shrines/landmarks are occasional,
and the cap prevents the surrounding detail from swallowing navigation or the Deck
frame budget. No key-art files were modified.

## Safe continuation after the gateway commit

1. Visually verify the gateway frame against north/south and east/west authored
   thresholds in a real run; adjust only the pure grammar rotation if the asset's
   authored forward differs from the measured corridor convention.
2. Expand from gateways to room pieces only after a dedicated authored interior can
   replace, rather than overlap, existing walls. Preserve kit
   uniform scale and topology rotations from `kitGrammar.js`; never height-normalize
   individual kit pieces.
3. Treat modular shells as structural rather than destructible. Interior props are
   destructible; breaking navigation geometry would invalidate the seed guarantees.
4. Measure draw calls and a destruction burst on Deck before raising the five-object
   room cap or adding dynamic lights.

---

## World improvement goals (verified 2026-10-04)

The six goals below keep the structure added in `800816a9` but are corrected
against the code. That expansion called 76.5 ms p95 a budget (it is the Deck's
*measured* problem, about 13 fps), gave the gateway helper the wrong signature,
proposed a light cap the engine already enforces, named a nonexistent
`spore_colony` asset, and raised the room cap before measuring. It also used
absolute `file:///` links, which failed `npm run audit:docs`.

### North star and budget

Every room reads like the key art: **one functional anchor, infrastructure on the
perimeter, evidence of use and failure on the floor, and restrained practical light
on the anchor** (see *Final key-art read* above). The working floor stays readable.

Budget, from the 2026-10-02 Deck capture: GPU average 16.51 ms, presented-gameplay
p95 76.5 ms, worst window p95 152 ms at `event:destructible-prop-broken`. Frame loss
on this project is main-thread CPU, and quality is never cut to buy frames
(adaptive changes resolution only). So **no goal may raise main-thread work per
frame without a Deck capture showing it does not regress p95**, and goals that add
objects ship behind a flag until that capture exists.

### Standing verification (every goal)

- `npx vitest run` (full suite) and `npm run audit:docs` pass.
- World changes: `node scripts/world-seed-portfolio-report.js --sweep-only --sweep=500`
  passes with no navigation or reachability regressions.
- `npm run presubmit:generated` passes when assets or catalogs change.
- Deck-gated acceptance is marked **[Deck]** and needs a human capture uploaded to
  the session-log drop box; agents may not mark those boxes complete.

### Goal 1 — gateway alignment (M1)

**Before M1:** [`roomGatewayKitPlacement(door, biome)`](../../src/kitGrammar.js)
centred `kit_<skin>_gate` on the authored threshold cells, `rotationSteps` 0 for n/s
doors and 1 for e/w, scale 1, at most one per authored room, non-colliding. No one
had seen it rendered.

- [x] Screenshot the gate on a north, east, south and west authored threshold
  (showroom or seeded run) and record whether the frame's authored forward matches
  the corridor convention, and whether the procedural door slab passes through it.
- [x] Only if the screenshots show clipping: add a side-dependent offset or a
  four-step rotation in the pure helper; procedural doors and the tile grid remain
  the only collision and lock authority.
- [x] Parameterized test in [`kitGrammar.test.js`](../../src/kitGrammar.test.js)
  pinning position and rotation for all four sides.

**Accept:** four-side test passes; 500-seed sweep clean; screenshots committed
under `docs/reports/assets/`.

**Result (2026-10-04):** the gate frame matches the corridor convention on all four
sides in both skins (`gate.glb` is 4.4 × 1.4 units, so 3.3/3.15 wide × 1.05 deep at
`KIT_SCALE`), and frames the open threshold cleanly. The closed blast door did not
fit. It is a 3.35 × 4.8 × 0.58 slab centred on the threshold line that sinks into
the floor to open, so it ran through both posts and above the arch, both with the
frame centred and with `e113e3e3`'s half-cell inset. The frame now stands
`GATEWAY_ROOM_INSET` (≈0.85 = frame half-depth 0.525 + slab half-thickness 0.29 +
3.5 cm) into the room, just clear of the slab's room-side face. The slab footprint
moved to [`proceduralDoors.js`](../../src/proceduralDoors.js) constants so the two
cannot drift apart, and a test measures both `gate.glb` files against them.
Evidence: `HB_PROBES=1 npx playwright test tests/e2e/probes/gateway-orientation.spec.js`
writes `docs/reports/assets/gateway-orientation-{cave,space}-{closed,open}-2026-10-04.png`.
Checks: 41 focused tests, full suite 4,952 passed, 500-seed sweep 0 failures.

### Goal 2 — floor grounding (M2)

**Before M2:** [`planRoomPopulation`](../../src/roomPopulation.js) spent the theme's
small/ambient/rare pools at room edges under a five-object cap, with nothing tying an
anchor to the floor. Floor overlays exist (`FLOOR_OVERLAY_TYPES`, drawn flat at 0.035
in `threeGame.js`). Grounding pieces exist: `prop_floor_conduit_bridge` and
`prop_floor_drainage_sump_trough`. Correction to the earlier list: `decal_rust_bleed_*`,
`decal_water_stain` and `decal_spore_stain_*` are **wall** decals and would stand
upright on a floor. The floor set includes `scatter_coolant_puddle`,
`scatter_slime_puddle`, `decal_fluid_seep`, `decal_grease_pool`,
`decal_frost_bloom_*`, `decal_spore_growth_patch` and `decal_floor_medallion_*`.

- [x] A data table pairing anchors with ground dressing: `GROUNDING_RULES` matches
  anchor families by name (cryo/coolant/oxygen; medical/autopsy; biomech/fungal/hive;
  terminal/conduit/machinery; shrine/reliquary; storage/ammo).
- [x] Place the pairing on a floor cell adjacent to the anchor, never in a door
  apron, the room-centre lane, a pickup or a reserved fixture cell; deterministic
  per seed. Choices come from a stable hash of room and anchor, so grounding draws
  nothing from the shared RNG and changes no other placement.
- [x] Budget rule: flat grounding decals have their own cap
  (`GROUNDING_DECAL_LIMIT` = 2 per room, kind `grounding-decal`). A GLB grounding
  piece (kind `grounding`, at most one per room) counts toward the five-object cap
  and is placed only when the cap has room. Everything grounding places is non-blocking.

**Accept:** [`roomPopulation.test.js`](../../src/roomPopulation.test.js) proves the
exclusions and determinism; 500-seed sweep clean.

**Result (2026-10-04):** tests prove every decal type is in the renderer's flat
floor-overlay set (read from `threeGame.js`), that grounding sits beside its anchor
outside door aprons, fixture rings, the pickup and the centre, the decal and object
caps, and that the plan is identical with grounding on or off apart from the added
dressing and the RNG draw count. Checks: 17 population tests, full suite 4,958
passed, 500-seed sweep 0 failures. The renderer needed no change: grounding
placements take the existing non-blocking floor-overlay path.

Concurrency note: another agent landed a second M2 pass (`ANCHOR_GROUND_DRESSING_TABLE`)
in the working tree at the same time, and it was swept into `8c7a5ef0`. It is removed
in the follow-up commit because it placed wall decals (`decal_water_stain`,
`decal_rust_bleed_*`, `decal_spore_stain_*`) on the floor, consumed the shared RNG
(reshuffling later rooms), and reserved cells without removing them from the
candidate pool. Its anchor coverage (eyewash/decon, heat exchanger, docking gantry)
was folded into `GROUNDING_RULES`.

### Goal 3 — density scaling (M3, measure first)

**Before M3:** `const roomObjectLimit = 5` in `roomPopulation.js`. Fractured debris
was cached per model type on first break (`5997431e`). Nothing measured draw calls
per room (`renderer.info` is only read by `rewardPreview.js`).

- [x] Measurement first: a probe that reports placements, draw calls and triangles
  per generated room and commits a baseline report.
  [`scripts/room-density-probe.mjs`](../../scripts/room-density-probe.mjs) stamps
  all 12 authored builds × 4 biomes × 50 seeds, themes and plans them as
  `buildChunk` does, and prices each placement from asset data (GLB primitives and
  triangles; sprites as one quad). It is a content-cost estimate, not a GPU
  measurement. Baseline:
  [`room-density-baseline-2026-10-04.json`](../reports/room-density-baseline-2026-10-04.json).
- [x] Area budget behind a flag (default off): `areaRoomObjectLimit` implements
  `clamp(floor(floorCells / 12) + 2, 3, 8)`, priority unchanged. Opt in with
  `planRoomPopulation(..., { areaBudget: true })`. In game it is
  `featureFlags.isAreaRoomDensityEnabled()` (`localStorage.hb_area_room_density =
  'on'`), which `ThreeGame` ignores in multiplayer: peers generate rooms locally,
  so one player's setting must not change everyone's rooms.
- [x] Warm the fracture cache in idle time on room entry:
  [`propDebrisPrewarm.js`](../../src/propDebrisPrewarm.js) queues a destructible
  prop's model family when its 3D model attaches, and fractures one family per
  idle period with at least 30 ms of idle time. It has no timeout fallback, so a
  device that never idles keeps today's behaviour instead of hitching at random.
- [ ] **[Deck]** Paired capture, flag on vs off: presented p95 does not regress and
  the destruction-burst window improves on 152 ms. Only then default the flag on.

**Accept (agent):** baseline report committed; formula unit-tested at 4×4, 6×6,
8×8, 10×10 and 14×14; flag off by default.

**Result (2026-10-04):** baseline (cap 5): 4.85 objects per room on average (max 6,
because structural anchors sit outside the cap), 6.8 estimated draw calls (p95 8),
about 67k triangles on average (p95 110k, max 125k). With the area budget
([report](../reports/room-density-area-budget-2026-10-04.json)): 6.64 objects (max 8),
8.6 draw calls (p95 10), about 93k triangles on average (p95 147k). That is +37%
objects and +39% triangles. **Finding:** every authored build has 99–209 floor
cells, so the formula returns its maximum of 8 for all of them. On today's catalog
it is a flat raise to 8, not area scaling, and the alcove and standard tiers it was
designed around do not exist as authored rooms. Its stated targets also disagree
with the formula: an 8×8 room gets 7, not "4 to 5". Decide whether to keep the
formula before the [Deck] capture. Checks: 28 focused tests, full suite 4,969
passed, 500-seed sweep 0 failures.

### Goal 4 — practical emissive light (M4)

**Before M4:** the environment light pool already caps the visible lights
(`ENV_LIGHT_BUDGET = 8`, nearest registered sources lit, the rest parked at zero;
[`threeGame.envLightBudget.test.js`](../../src/threeGame.envLightBudget.test.js)).
So the existing pool already provides the "max one light, fade off-screen" idea.

- [x] Emissive palette table for signature anchors: cyan (oxygen cascade rack,
  coolant drum), amber (liturgical lectern, votive shrine), green (biomech hatch
  vent, tracheal wall pipe). Audit which GLBs carry an emissive map, and list the
  rest as art requests instead of faking them in code.
  [`anchorPracticalLight.js`](../../src/anchorPracticalLight.js) maps anchor families
  to the palette. **Audit:** none of the 37 signature or key-art anchor props has an
  emissive material (26 GLBs, all one material with no emissive map or factor;
  11 are sprites with no GLB). **Art requests:** emissive maps for
  `prop_oxygen_bottle_cascade_rack` and `prop_coolant_drum_leaking_pool` (cyan
  gauges and frost), `prop_liturgical_terminal_lectern` and `prop_votive_candle_shrine`
  (amber CRT and candle flames), and `prop_biomech_sphincter_hatch_vent` and
  `prop_biomech_tracheal_wall_pipe` (green fluid veins).
- [x] Register each room's signature anchor as one pooled source in its palette
  colour; add no lights outside the pool. The light sits beside the prop in the chunk
  group (a child would be culled once the prop's GLB hides it), is registered with
  `registerEnvLight`, and is retired in `breakScatterProp`.

**Accept:** light-budget tests still pass; a new test proves at most one anchor
source per room; before/after screenshots. **[Deck]** p95 does not regress.

**Result (2026-10-04):** `threeGame.roomSetPieces.test.js` proves only a room's
signature anchor is marked, even when other anchors in the room have palettes. The
light-budget suite is unchanged and passing. Before/after:
`docs/reports/assets/anchor-practical-light-2026-10-04.png`
(`HB_PROBES=1 npx playwright test tests/e2e/probes/anchor-practical-light.spec.js`).
The pool keeps the lit-light count constant, so this adds no shader variants; its
only per-frame cost is one more entry in the pool's 0.35 s distance sort per loaded
room. **[Deck]** p95 is not yet checked. Checks: 18 light and set-piece tests, full
suite 4,972 passed, 500-seed sweep 0 failures.

### Goal 5 — modular wall shells (M5, design-gated)

**Before M5:** wall kit pieces exist (`kit_cave_template_wall*`, `arch_pillar_buttress_01-04`,
`arch_rib_ceiling_vault_01-03`) but only gateways reach normal play. Layering shells
over existing walls was ruled out (z-fighting, double draw).

- [x] Spike in the showroom: detect straight wall runs of 3 or more facing an
  authored chamber, and swap the procedural wall render for kit pieces at uniform
  scale 1 for one biome. Tile collision stays authoritative; shells are structural
  and indestructible.
  [`wallShellPlacements(grid, room, biome)`](../../src/kitGrammar.js) finds runs of
  boundary `#` cells (one cell outside the stamped bounds, where doors are also cut)
  whose room-side neighbour is interior floor and that stay more than one cell from
  every door. It covers each run with whole 3-cell `kit_<skin>_template_wall` pieces
  (4 kit units at `KIT_SCALE` = 3 tiles), centred, each listing the wall cells whose
  render it replaces. The showroom probe
  ([`wall-shell-spike.spec.js`](../../tests/e2e/probes/wall-shell-spike.spec.js))
  stamps a real build with its socket doors and draws it before and after.
- [ ] **[Art]** Art-direction sign-off on the spike before it reaches normal play.

**Accept (agent):** spike screenshots plus a 500-seed sweep with the spike flag on;
no default-on change without the art sign-off.

**Result (2026-10-04):** evidence for the sign-off:
`docs/reports/assets/wall-shell-spike-medical_triage-active-2026-10-04.png` (13 pieces)
and `...-reactor_compressor_hall-cave-2026-10-04.png` (16 pieces). The grammar is
tested on all 12 authored builds: every replaced cell is a boundary wall facing
interior floor, more than a cell from every door, with no cell used twice. The spike
is showroom-only. It changes no world generation or play path, so the 500-seed
sweep (0 failures) runs exactly as it does with the spike off, and there is no
in-game switch to turn on. Before any in-game wiring (for example behind
`hb_modular_wall_shells`, which another agent added to `featureFlags.js` default-off),
four blockers need answers:
1. Procedural walls are destructible (`wallHp`), so a shell must break or hide with
   its cells.
2. Camera-side walls are cut away to `ROOM_CUTAWAY_HEIGHT` as the camera rotates,
   and a 3 m shell would block the view into the room.
3. Kit walls are 3.04–3.19 tall against 2.8 m procedural walls.
4. The cave piece is 1.62 deep and reaches past its wall cell.
Checks: 42 kit grammar tests, full suite 4,986 passed, 500-seed sweep 0 failures.
The gateway probe now waits for kit textures, and its four captures were re-taken
textured.

**Next commit — M5 pure grammar handoff:** keep the spike showroom-only and the
runtime flag off, while adding stable run/piece IDs, inward normals, explicit
objective/protected-cell exclusions, and a suppression mask to the pure analyzer.
The showroom fixture will consume that mask. Unit tests will cover stability,
exclusions, transforms, and mask contents; the 5,000-seed and full-suite gates must
remain green. This does not resolve or bypass the four Art/runtime blockers above.

**Result:** `92f95c2e` adds stable run/piece IDs, cardinal inward normals,
objective/protected/structural/reserved-cell exclusions, and an exact presentation
suppression mask; the showroom now consumes that mask while collision retains the
original grid. `8d8292ea` adds overview and focal evidence for all 12 authored rooms
using real room population, grounding, gateways, practical colours, props, decals,
and kit assets. The fixture uses the gameplay chroma-key path; no green backing is
present in the committed captures. Checks: 53 focused tests, 2 wall-shell Chromium
captures, 12 furnished-room Chromium captures, full suite 4,996 passed, and a
5,000-seed sweep reported 0 validity, spacing, manifest/territory, or determinism
failures. M5 remains showroom-only and default-off pending **[Art]** and the four
runtime blockers above.

### Goal 6 — reactive biomech synergies (M6)

**Now:** in [`propInteractions.js`](../../src/propInteractions.js) a ruptured oxygen
cascade rack already deals cryo damage to nearby snails, and the sphincter hatch vent
deals bile damage. The `ambient_steam_hiss` and `flesh_squish` cues exist. Living
umbilicals ([`umbilicalAttacker.js`](../../src/3d/umbilicalAttacker.js)) come only
from the giger theme's `prop_biomech_spore_umbilical_cable_rigged` signature prop.
Nothing yet affects an umbilical.

- [x] `UmbilicalAttacker` gains a stun state; a cryo rupture within range stuns
  it for 4 s (no attacks; a visible frost state). `b8abf652` (non-stacking
  `STUNNED`, frost visual, cleanup) and `1c040947` (rupture stuns live umbilicals
  within 5 m for `BIOMECH_SYNERGY_TUNING.cryoStunSeconds` = 4).
- [x] Bile spray applies a timed armour-weakening status to snails, in addition to
  its current damage. Define the multiplier and duration in data. `1c040947`:
  `STATUS_IDS.CHITIN_VULNERABILITY`, 1.25× damage taken for 6 s
  (`STATUS_DEFAULTS` in [`statusEffects.js`](../../src/statusEffects.js); `BILE_ARMOR_WEAKEN`
  in [`propInteractions.js`](../../src/propInteractions.js)); reapplying
  refreshes to the greater remaining time, never stacks.
- [x] Spatial breathing/tension cue when the player enters an umbilical's 7 m
  detection radius, using the existing sound keys. `b8abf652`: a one-shot
  `onDetectionEnter` at `detectionRadius` 7.0 plays the existing `enemy_alert_snail`
  key positionally (`audioAt`) at a low, per-attacker pitch (0.66–0.76).

**Accept:** [`umbilicalAttacker.test.js`](../../src/umbilicalAttacker.test.js) and
[`propInteractions.test.js`](../../src/propInteractions.test.js) cover stun timing,
status expiry and the cue trigger; full suite green.

**Result (2026-10-04):** `b8abf652` adds the explicit stun lifecycle, independent frost visual,
one-shot detection-entry callback, deterministic spatial cue pitch, and idempotent
material/mixer cleanup. `1c040947` connects prop rupture synergies: oxygen rack and coolant
drum ruptures stun living umbilicals in range for 4 s; sphincter vent and tracheal pipe ruptures
apply data-driven bile damage and 1.25× armor weakening (`BILE_ARMOR_WEAKEN`) for 6 s to snails.
Reapplication refreshes rather than stacks. Scaling occurs cleanly on authoritative hit resolution.
Checks: 25 focused tests pass, 500-seed sweep 0 failures, and the full suite passes with 4,994 tests
across 564 test files.

### Handed off (human gates)

Agents cannot complete these, and they stay unchecked:

- **M3 [Deck]:** a paired Steam Deck capture with `hb_area_room_density` on and
  off. Presented p95 must not regress and the destruction-burst window must improve
  on 152 ms before the flag defaults on. First decide whether to keep the
  formula: it returns 8 for every current authored room (see M3 Result).
- **M4 [Deck]:** a p95 check with the anchor practical lights in play.
- **M5 [Art]:** art-direction sign-off on the wall-shell spike images. If it is
  approved, the four in-game blockers in the M5 Result must be solved before
  `hb_modular_wall_shells` does anything in play.
- **Art requests (M4):** emissive maps for the six key-art anchors listed in M4.

### Agent implementation close (2026-10-04)

All safe, agent-completable Sprint 49 lived-in-world work is committed on
`dev/sprint-49`. Final checks on the integrated tree:

- `npm test -- --run`: 564 files, 4,996 tests passed.
- `npm run audit:world-seeds:sweep`: 5,000 seeds, zero validity, spacing,
  manifest/territory, or determinism failures.
- `npm run presubmit:generated`: Steam claims, planned SFX, retail assets, item and
  trade-up catalogs, soundtrack, chroma-green, and economy-icon checks passed.
- `HB_PROBES=1 npx playwright test tests/e2e/probes/wall-shell-spike.spec.js`:
  2/2 Chromium captures passed.
- Furnished-room showroom: 12/12 authored room captures passed after the fixture was
  routed through gameplay-equivalent green/black chroma keying.
- `git diff --check`: clean for the implementation commits.

The Thursday Deck log remains the comparison baseline: 16.51 ms average GPU,
76.5 ms presented p95, and 152 ms destruction-window p95. No local test substitutes
for the outstanding M3/M4 Deck measurements or the M5 Art decision listed above.

### Milestones

| Milestone | Goal | Agent-completable gate | Human gate |
|---|---|---|---|
| M1 | Gateway alignment | 4-side test, screenshots, 500-seed sweep | none |
| M2 | Floor grounding | exclusion and determinism tests, sweep | none |
| M3 | Density scaling | baseline probe report, flag-off formula | **[Deck]** paired capture |
| M4 | Emissive light | pool tests, one-anchor test, screenshots | **[Deck]** p95 check |
| M5 | Wall shells | showroom spike, sweep with flag on | **[Art]** sign-off |
| M6 | Reactive synergies | stun, debuff and cue tests | none |
