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

**Now:** [`planRoomPopulation`](../../src/roomPopulation.js) spends the theme's
small/ambient/rare pools at room edges under a five-object cap. Floor overlays
exist (`FLOOR_OVERLAY_TYPES`, drawn at 0.035 elevation in `threeGame.js`). Grounding
assets exist: `prop_floor_conduit_bridge`, `prop_floor_drainage_sump_trough`,
`decal_rust_bleed_*`, `decal_water_stain`, `decal_spore_stain_02/03`.

- [ ] A data table pairing anchors with ground dressing (e.g. dissection slab or
  oxygen cascade rack → drainage sump or water stain; liturgical lectern → floor
  conduit bridge; biomech vent or pipe → spore stain).
- [ ] Place the pairing on a floor cell adjacent to the anchor, never in a door
  apron, the room-centre lane, a pickup or a reserved fixture cell; deterministic
  per seed.
- [ ] Decide and document the budget rule: GLB grounding pieces count toward the
  room cap; flat decals get their own small cap (proposal: 2 per room).

**Accept:** [`roomPopulation.test.js`](../../src/roomPopulation.test.js) proves the
exclusions and determinism; 500-seed sweep clean.

### Goal 3 — density scaling (M3, measure first)

**Now:** `const roomObjectLimit = 5` in `roomPopulation.js`. Fractured debris is
cached per model type on first break (`5997431e`). Nothing measures draw calls per
room (`renderer.info` is only read by `rewardPreview.js`).

- [ ] Measurement first: a probe that reports placements, draw calls and triangles
  per generated room (showroom or headless sweep) and commits a baseline report.
- [ ] Area budget behind a flag (default off):
  `limit = clamp(floor(floorCells / 12) + 2, 3, 8)`, priority unchanged (pickups →
  signature anchor → wall infrastructure → floor grounding → edge decals).
- [ ] Warm the fracture cache for the active room's theme models during idle time
  on room entry, rather than precomputing every prop at boot.
- [ ] **[Deck]** Paired capture, flag on vs off: presented p95 does not regress and
  the destruction-burst window improves on 152 ms. Only then default the flag on.

**Accept (agent):** baseline report committed; formula unit-tested at 4×4, 6×6,
8×8, 10×10 and 14×14; flag off by default.

### Goal 4 — practical emissive light (M4)

**Now:** the environment light pool already caps the visible lights
(`ENV_LIGHT_BUDGET = 8`, nearest registered sources lit, the rest parked at zero;
[`threeGame.envLightBudget.test.js`](../../src/threeGame.envLightBudget.test.js)).
So the existing pool already provides the "max one light, fade off-screen" idea.

- [ ] Emissive palette table for signature anchors: cyan (oxygen cascade rack,
  coolant drum), amber (liturgical lectern, votive shrine), green (biomech hatch
  vent, tracheal wall pipe). Audit which GLBs carry an emissive map, and list the
  rest as art requests instead of faking them in code.
- [ ] Register each room's signature anchor as one pooled source in its palette
  colour; add no lights outside the pool.

**Accept:** light-budget tests still pass; a new test proves at most one anchor
source per room; before/after screenshots. **[Deck]** p95 does not regress.

### Goal 5 — modular wall shells (M5, design-gated)

**Now:** wall kit pieces exist (`kit_cave_template_wall*`, `arch_pillar_buttress_01-04`,
`arch_rib_ceiling_vault_01-03`) but only gateways reach normal play. Layering shells
over existing walls was ruled out (z-fighting, double draw).

- [ ] Spike in the showroom: detect straight wall runs of 3 or more facing an
  authored chamber, and swap the procedural wall render for kit pieces at uniform
  scale 1 for one biome. Tile collision stays authoritative; shells are structural
  and indestructible.
- [ ] **[Art]** Art-direction sign-off on the spike before it reaches normal play.

**Accept (agent):** spike screenshots plus a 500-seed sweep with the spike flag on;
no default-on change without the art sign-off.

### Goal 6 — reactive biomech synergies (M6)

**Now:** in [`propInteractions.js`](../../src/propInteractions.js) a ruptured oxygen
cascade rack already deals cryo damage to nearby snails, and the sphincter hatch vent
deals bile damage. The `ambient_steam_hiss` and `flesh_squish` cues exist. Living
umbilicals ([`umbilicalAttacker.js`](../../src/3d/umbilicalAttacker.js)) come only
from the giger theme's `prop_biomech_spore_umbilical_cable_rigged` signature prop.
Nothing yet affects an umbilical.

- [ ] `UmbilicalAttacker` gains a stun state; a cryo rupture within range stuns
  it for 4 s (no attacks; a visible frost state).
- [ ] Bile spray applies a timed armour-weakening status to snails, in addition to
  its current damage. Define the multiplier and duration in data.
- [ ] Spatial breathing/tension cue when the player enters an umbilical's 7 m
  detection radius, using the existing sound keys.

**Accept:** [`umbilicalAttacker.test.js`](../../src/umbilicalAttacker.test.js) and
[`propInteractions.test.js`](../../src/propInteractions.test.js) cover stun timing,
status expiry and the cue trigger; full suite green.

### Milestones

| Milestone | Goal | Agent-completable gate | Human gate |
|---|---|---|---|
| M1 | Gateway alignment | 4-side test, screenshots, 500-seed sweep | none |
| M2 | Floor grounding | exclusion and determinism tests, sweep | none |
| M3 | Density scaling | baseline probe report, flag-off formula | **[Deck]** paired capture |
| M4 | Emissive light | pool tests, one-anchor test, screenshots | **[Deck]** p95 check |
| M5 | Wall shells | showroom spike, sweep with flag on | **[Art]** sign-off |
| M6 | Reactive synergies | stun, debuff and cue tests | none |
