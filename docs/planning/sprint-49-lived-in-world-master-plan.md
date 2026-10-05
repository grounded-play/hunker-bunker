# Sprint 49 Lived-In World Master Implementation Plan

Status: approved execution plan | Branch: `dev/sprint-49` | Updated: 2026-10-04

This plan turns the [lived-in world continuation journal](sprint-49-lived-in-world-continuation.md)
into ordered implementation work. It covers gateway precision, grounded prop dressing,
adaptive room density, practical lighting, reactive biomechanical hazards, and modular
wall-shell substitution. Work stays on `dev/sprint-49` and lands as small, reversible,
non-breaking commits.

## Outcome

Bring playable rooms closer to the shipped key art without sacrificing navigation,
objective safety, co-op determinism, or Steam Deck frame pacing:

- every authored room has a legible functional anchor and evidence of prior use;
- props visually connect to walls and floors instead of floating in empty space;
- room density responds to usable floor area rather than one global cap;
- practical amber, cyan, and biological green light creates contrast without a forest
  of dynamic lights;
- biomechanical rooms can contain readable living hazards and environmental chain
  reactions;
- selected generic wall faces can be replaced by socket-safe authored shells without
  double-rendering or changing collision.

## Baseline and non-negotiable contracts

The implementation baseline is the branch state after:

- `b3767e8a` — GLB-only decorative props joined the destruction contract;
- `5997431e` — bounded small/ambient/rare dressing and type-level debris caching;
- `e3aa3b05` — one open modular gateway frame per authored room;
- `38e9e7e3` — continuation evidence and key-art read.

The Thursday Deck log is a regression constraint, not a 60 FPS proof. It recorded
16.51 ms average GPU time, 76.5 ms presented p95, and a 152 ms p95 window around
`destructible-prop-broken`. CPU/main-thread spikes and presentation pacing therefore
matter as much as GPU averages.

Preserve these contracts throughout:

1. Procedural tile grids and doors remain the collision, lock, and reachability
   authority. Decorative frames and shells never create a second gameplay collider.
2. Objective-critical objects and structural architecture remain indestructible.
   Ordinary `prop_` dressing remains destructible and co-op synchronized.
3. Room generation stays deterministic for a seed. Every new choice consumes the
   threaded seeded RNG or a stable hash, never ambient `Math.random()`.
4. Door aprons, reserved fixture cells, primary routes, and room centers stay clear.
5. Modular kit pieces retain uniform authored scale and socket rotations. Never
   height-normalize individual kit pieces or distort their UVs.
6. Repeated visuals share geometry/materials where safe, and all owned transient GPU
   resources receive explicit teardown.
7. Do not import the rejected 408-piece Kenney nature/building kits without a separate
   art-direction decision.

## Execution and commit protocol

Before each implementation commit:

1. Re-read `git status`, this plan, and the continuation journal.
2. Add a short “next commit” entry to the continuation journal naming scope, files,
   tests, and unresolved assumptions.
3. Inspect concurrent work and stage only files owned by the current slice.

For each milestone:

1. Add or update pure-function tests first where practical.
2. Implement one bounded player-visible behavior.
3. Run the milestone's focused tests and `git diff --check` on owned files.
4. Run a 500-seed sweep for placement-only changes; use 5,000 seeds before closing a
   navigation or wall-substitution milestone.
5. Run the full unit suite before the milestone commit.
6. Perform the listed visual/performance probe when the milestone affects rendering.
7. Commit with the milestone ID and update the continuation journal with the hash,
   results, and exact next step.

Never sweep unrelated dirty files into a commit. Stop and document a blocker if a
required visual or Deck acceptance check cannot be run; do not claim it passed from
unit tests alone.

## Dependency order

```text
M1 gateway truth
  └─ M2 grounded anchor relationships
       └─ M3 adaptive density budgets
            ├─ M4 practical-light budget
            └─ M6 reactive biomech ecosystem

M1 + M3 + visual/draw-call baselines
  └─ M5 wall-shell substitution (highest structural risk; last)
```

M5 remains numbered for roadmap continuity but executes after M6 unless evidence shows
that a smaller shell pilot is safer sooner.

## M1 — Gateway and threshold precision

Target: Sprint 49.1 | Risk: medium | Player value: clean room entrances and visible
prefab identity.

### Implementation

- Extend `roomGatewayKitPlacement(door, biome)` in
  [`src/kitGrammar.js`](../../src/kitGrammar.js) to return an interior-facing offset
  and a distinct cardinal rotation for north, east, south, and west thresholds.
- Derive the half-cell interior offset from the door side:
  north `+z`, south `-z`, east `-x`, west `+x`.
- Keep frames `isSolidProp: false`, `groupType: 'architecture'`, infinite HP, and
  socket scale `1.0`.
- Add an eligibility guard in [`src/threeGame.js`](../../src/threeGame.js) so a frame
  does not double-frame an incompatible procedural door, ring-crossing gate, or
  existing authored structural gateway.
- Keep procedural door meshes, state, animation, and collision authoritative.

### Verification gate

- Parameterized north/east/south/west placement tests in
  [`src/kitGrammar.test.js`](../../src/kitGrammar.test.js).
- Room set-piece tests covering frame eligibility and no collision ownership.
- Visual captures of all four orientations in showroom or a deterministic live room.
- 500-seed sweep with zero new navigation, spacing, or determinism failures.

### Commit boundary

One implementation commit plus its tests; journal update may be included when it only
describes that slice.

## M2 — Floor grounding and decal tethering

Target: Sprint 49.2 | Risk: low-medium | Player value: props look installed, used, and
damaged rather than dropped onto an empty floor.

### Implementation

- Add a pure grounding-association catalog and planner beside
  [`src/roomPopulation.js`](../../src/roomPopulation.js). Map signature families to
  compatible low-profile support dressing, for example:
  - oxygen/coolant machinery → conduit, sump, condensation, water or coolant trail;
  - medical/dissection → drainage, bio-sample spill or failed decon trace;
  - terminals/fabricators → cable coil, bolts, oil or scorch trace;
  - biomechanical anchors → growth creep, fluid seep, grease or spore stain.
- Select at most one grounding association per signature anchor initially.
- Choose an adjacent valid floor cell, then apply the existing doorway, reservation,
  center-lane, and primary-route exclusions.
- Mark the placement `blocking: false` and consume the ambient portion of the room
  budget instead of increasing total density.
- Keep floor overlays at the renderer's existing `0.035` elevation; do not duplicate
  floor-overlay type knowledge in the planner. Export or centralize the classification
  if both systems need it.

### Verification gate

- Tests prove deterministic association, adjacency, budget consumption, and zero
  placements in doorway aprons or reserved/central cells.
- At least one active, cryo, and bio theme produces a visibly compatible association.
- 500-seed sweep passes unchanged.

### Commit boundary

Separate commit from adaptive density so failures can be attributed to relationship
placement rather than count changes.

## M3 — Adaptive room density and destruction budget

Target: Sprint 49.3 | Risk: medium-high | Player value: intimate alcoves remain focused
while grand rooms finally feel inhabited.

### Implementation

- Replace the static five-object cap in
  [`src/roomPopulation.js`](../../src/roomPopulation.js) with a pure calculation from
  valid walkable interior cells:

  `limit = clamp(floor(validFloorCells / 12) + 2, 3, 8)`

- Do not count walls, door aprons, reserved fixtures, or unreachable floor cells as
  density capacity.
- Preserve allocation priority in code and tests:
  1. authored interaction/reward/lore/quest anchors;
  2. pickups and signature gameplay anchors;
  3. essential large/wall infrastructure;
  4. one floor-grounding association;
  5. small, rare, and ambient edge dressing.
- Add a secondary rendering budget so an eight-object grand room cannot request eight
  unique dynamic lights or other expensive effects.
- Keep debris cached by concrete model type in
  [`src/enemyGibs.js`](../../src/enemyGibs.js). Add an idle/preload experiment for the
  most common destructible models only if profiling shows type-level first-break
  fracture still exceeds the target; do not synchronously pre-fracture all 71 props at
  startup.

### Verification gate

- Parameterized 16, 25, 36, 64, and 100-cell room tests produce limits 3, 4, 5, 7,
  and 8 respectively.
- Generate at least 1,000 planned rooms and assert no route/reservation violations and
  no population above its calculated cap.
- Multi-prop destruction test proves one fracture build per concrete model type.
- 5,000-seed sweep passes before milestone closure.
- Deck capture records CPU/presented p95, GPU time, draw calls, and memory. The gate is
  no regression from the Thursday baseline; do not use GPU average alone.

### Commit boundary

Prefer two commits if prewarming is justified: adaptive population first, measured
fracture/prewarm work second.

## M4 — Key-art practical lighting and contrast

Target: Sprint 49.4 | Risk: medium-high | Player value: readable focal points and the
amber/cyan/green atmosphere present in the key art.

### Implementation

- Create a signature-prop practical-light catalog rather than branching throughout
  the render loop. It should define emissive family, color, intensity cap, range, and
  whether a real light is justified.
- Prefer shared PBR emissive materials and existing bloom. Clone a material only when
  per-instance state must diverge, and dispose owned clones during chunk teardown.
- Allow at most one real dynamic practical light in the active chamber. Other anchors
  use emissive-only treatment.
- Register the light through the existing environment-light budget and visibility
  lifecycle. Lights outside active/visible room bounds must be disabled, not merely
  dimmed.
- Preserve threat, objective, player-suit, and accessibility lighting priority.

### Verification gate

- Extend [`src/threeGame.envLightBudget.test.js`](../../src/threeGame.envLightBudget.test.js)
  and memory-budget coverage for one-light-per-room, visibility disabling, and cleanup.
- Matched active/cryo/bio screenshots use the same seed, camera, exposure, and quality
  preset.
- Deck measurement shows no material, light, draw-call, or memory growth after repeated
  chunk mount/unmount cycles.

### Commit boundary

Catalog/lifecycle tests and runtime integration may be separate commits if the renderer
seam is large.

## M6 — Reactive biomechanical ecosystem

Target: Sprint 50.1 | Risk: medium | Player value: biomechanical rooms are living combat
spaces rather than static themed galleries.

### Implementation

- Add a deterministic hazard-placement rule for the rigged umbilical in eligible bio
  or Giger-cathedral rooms. Require a ceiling/wall anchor, safe player-spawn distance,
  clear strike volume, and a per-room/per-chunk cap.
- Extend [`src/3d/umbilicalAttacker.js`](../../src/3d/umbilicalAttacker.js) with an
  explicit timed `STUNNED` state and idempotent `stun(seconds)` API.
- Play one spatial alert/breath cue on detection-state entry, not every update tick.
  Reuse existing audio with pitch variation and rate limiting.
- Oxygen-rack rupture queries nearby live umbilicals and applies a four-second cryo
  stun.
- Sphincter-hatch bile applies bounded area damage plus a timed chitin-vulnerability
  modifier through the existing enemy damage/status path. Define stacking and co-op
  authority explicitly; replayed network events must not double-apply it.
- Clean up mixers, attacker references, audio state, cloned materials, and transient
  status data when the prop, enemy, or chunk is removed.

### Verification gate

- Unit tests cover IDLE/TRACKING/STRIKE/STUNNED/DEAD transitions, repeated stun,
  expiry, destruction during stun, and disposal.
- Interaction tests cover radius, target eligibility, status duration, stacking, and
  no double-application from a repeated co-op event.
- Seeded room tests prove cap, safe distance, and bio-only eligibility.
- Full combat, prop-interaction, co-op shared-world, and memory lifecycle suites pass.

### Commit boundary

Use at least two commits: attacker state/placement first, environmental synergies and
network contract second.

## M5 — Modular wall-shell substitution

Target: Sprint 50.0, executed last | Risk: high | Player value: replaces generic box
walls with the strongest cathedral/biomechanical architecture from the asset library.

### Implementation

- Build a pure wall-run analyzer in [`src/kitGrammar.js`](../../src/kitGrammar.js):
  identify straight wall runs of at least three cells that border one authored chamber
  side, exclude corners/doors/gates/objective structures, and return stable run IDs,
  inward normals, piece types, and cardinal transforms.
- Start with one pilot family and one replacement face per eligible room. Do not place
  a shell on top of a rendered generic cube.
- Add a render-suppression mask consumed by the generic wall batching path, while the
  original tile grid remains unchanged for collision and pathfinding.
- Instantiate registered socket-safe `kit_*_template_wall` pieces or authored
  cathedral ribs/buttresses at uniform scale. Batch/instance repeated pieces when
  materials and geometry permit.
- Keep every shell structural, infinite-HP, and non-destructible. Props attached to
  the shell remain independently destructible.
- Gate the pilot behind a reversible runtime/config flag until visual, navigation, and
  Deck acceptance are complete.

### Verification gate

- Pure tests cover run detection, exclusions, stable IDs, transforms, and suppression
  masks for all four orientations.
- Pixel/depth captures prove no z-fighting, missing wall holes, ceiling clipping, or
  visible seams at camera-cutaway boundaries.
- Collision/pathfinding results are byte-for-byte identical with the visual flag on
  and off for the same seeds.
- 5,000-seed sweep passes with 100% mandatory objective reachability.
- Deck measurement remains within the accepted draw-call, memory, GPU, and presented
  frame-pacing budgets before the flag becomes default.

### Commit boundary

Use separate commits for pure grammar, suppression/batching integration, and enabling
the first art family. Never combine this milestone with unrelated gameplay work.

## CI, assets, and release evidence

The Spanish, Portuguese, and Russian voice-pack budget/manifest updates are existing
branch state, not deliverables of this world lane. Re-verify rather than regenerate
them unless this work actually changes retail assets.

Required closing commands, adjusted when a milestone has a narrower focused suite:

```bash
npm test
npm run audit:world-seeds:sweep
npm run presubmit:generated
git diff --check
```

Also run the relevant browser/Deck visual probe for M1, M4, and M5. Record exact
commands, build/commit, device, seed, camera mode, quality preset, and results in the
continuation journal.

## Definition of done

The master plan is complete only when:

- every milestone has commits and evidence, or an explicit owner-approved deferral;
- gateway frames are visually correct in all four orientations;
- grounding and density remain deterministic and navigation-safe;
- lighting obeys its one-dynamic-light and teardown budgets;
- biomechanical synergies are readable, bounded, and co-op safe;
- wall substitution changes presentation without changing collision or reachability;
- all focused tests, the full unit suite, generated audits, and required seed sweeps
  pass;
- Deck captures show no regression against the recorded baseline;
- the continuation journal names any remaining hardware, art-direction, or publisher
  acceptance work without claiming it complete.
