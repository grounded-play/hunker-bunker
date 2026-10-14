# Plan: GLB placement, weapon direction, and armed hero presentation

Status: implementation-ready audit and remediation plan

Branch: `dev/sprint-52`

Planning baseline: `bc3f5b30`

## Implementation progress

- 2026-10-14 — P1 wall-machine foundation implemented: added
  `modelPresentationRegistry.js`, centralized the existing
  wall-backed set, classified both exosuit/decon machines, removed the unsafe
  arbitrary-floor fallback, moved the docking gantry from generic corner
  dressing to wall dressing, and made both scatter replacement paths consume
  the shared classification. Focused result: 74 tests passed across model
  registry, room population/dressing, site props, and floor/door placement.
- 2026-10-14 — P0 runtime model presentation inventory & audit script
  implemented: added `scripts/audit-model-presentation.mjs` and npm scripts
  `audit:model-presentation` and `audit:model-presentation:check`. Audited all
  551 runtime GLBs across world props, weapon archetypes, skins, charms, chassis
  skins, rig modules, and NPCs with 0 failures. Output emitted to
  `docs/reports/model-presentation-audit.md` and `.json`.
- 2026-10-14 — P1 expanded wall-machine & fixture classification: expanded
  `modelPresentationRegistry.js` to cover 28 wall machinery, gantry, teardown,
  locker, rack, cabinet, and ceiling crane models with explicit surface and
  contact semantics. Verified in `modelPresentationRegistry.test.js`.
- 2026-10-14 — P3 weapon rotation & grip calibration: identified that non-GG1
  frames (`talon`, `talon_c`, `siege_breaker`, `tesla_lock`) have their height
  along +Y rather than +Z, causing them to render twisted 90° sideways when
  using GG1's Euler rotation. Updated calibration rotation to
  `[0, -Math.PI / 2, Math.PI / 2]` with `sightAxis: '+Y'`. Validated in
  `src/weaponCalibration.test.js` that all archetypes point forward along hand aim
  and remain upright.
- 2026-10-14 — P4 armed hero selection loadout presentation & reactive charm:
  - Hero selection now defaults `weaponVisible: true` in an armed idle (`idle`).
  - `src/player3dOverlay.js` supports `weaponSkinId`, `weaponSheenColor`, and
    `charmId`, and drives stationary breathing physics on the charm spring.
  - `src/scoutHeroPreview.js` provides `setPresentation({ classType, loadout })`
    with fallback `setType(type)`, equips the selected class weapon, skin,
    sheen, charm, and chassis, and runs a presentation state machine
    alternating between relaxed `ARMED_IDLE` and `AIM_READY` with charm impulses.
  - `main.js` `syncHeroPreview` passes the equipped class loadout into the preview.
  - Verified in `src/ticket81HeroSelection.verification.test.js`.
- 2026-10-14 — Follow-up review of the 59-GLB world-expansion ingest:
  - Corrected the audit gate to inspect every shipped GLB and every literal
    production reference, rather than treating imported catalog entries as the
    complete asset set. The gate now proves **619 / 619** shipped GLBs are
    readable and **619 / 619** literal production references resolve.
  - Removed the six runtime registrations for
    `tina_pheromone_dispersal_vent`, which was wired into catalogs, showroom,
    interaction, FX, and triangle data but was not included in the 59-file
    asset commit. The source-generation manifest remains intact so the model
    can be integrated when its GLB actually lands.
  - Expanded the shared wall-support registry from 28 to 89 classified models
    and added a cross-catalog test requiring every `wallProps` entry in theme
    and role dressing to have mandatory wall support. This closes the gap
    introduced when new models were added to wall dressing without placement
    profiles.
- 2026-10-14 — Follow-up review of armed hero/gameplay cosmetics:
  - Fixed the new top-level `weaponSheenColor` default, which was overriding
    the existing `weaponMount.sheenColor` path with white in live gameplay.
    Hero and gameplay now merge weapon skin, finish, charm, and position
    through one tested resolver with explicit presentation values taking
    precedence.
  - Made `AIM_READY` visually meaningful: the preview locks its base facing,
    eases into a bounded upper-body aim turn, holds the equipped weapon through
    the motion, then eases back to armed idle while the charm spring reacts.
- 2026-10-14 — P2 room-dressing surface contract implemented:
  - Added `surfaceAssetRegistry.js` with explicit floor/wall support, aspect,
    depth-offset, and render-order metadata for every theme/role decal.
  - Corrected the acoustic diagram and execution-wall splatter so they no
    longer enter floor placement pools. The pod-rupture splash is the sole
    reviewed dual-surface exception.
  - The renderer now rejects known wrong-plane placements and uses the shared
    support offset, preventing flush coplanar wall/floor quads from fighting.
  - Added registry/renderer coverage and a duplicate floor-surface-id gate.
- Remaining: route special scatter/setpiece decals through the P2 registry and
  add contact-sheet visual regression probes (P5).
Date: 2026-10-14

## Player-visible outcome

The 3D presentation should obey six visible rules:

1. A wall machine, charger, cabinet, rack, sign, pipe, sconce, or docking
   gantry is mounted against a real wall, faces into the usable room, and does
   not float, bury itself, or expose its unfinished back.
2. Floor, wall, and ceiling models and decals use the correct support surface.
   Their authored front/up axes and contact planes are explicit data rather
   than filename guesses.
3. Every gun points along the operator's aim direction in gameplay, the
   Armory, reward previews, and hero selection. The grip sits in the primary
   hand, the stock and trigger clear the body, and the muzzle never points
   backward through the operator.
4. Hero selection shows the selected class loadout by default: equipped weapon
   archetype/skin/finish and charm. The operator normally holds it in a relaxed
   armed idle and occasionally settles into a short aim-ready pose.
5. The charm remains attached to its weapon socket and reacts to breathing,
   readying, aim motion, and pose transitions without clipping the hand, body,
   sight, or barrel.
6. New GLBs cannot ship into a runtime catalog until their scale, pivot,
   support surface, front axis, and representative in-context capture pass an
   automated audit.

## Audit snapshot

This plan covers runtime assets, not every archival source file:

- `public/3d` currently contains **619 GLBs** after the 59-model expansion.
- `WORLD_3D_MODELS` registers **485** world models and
  `WORLD_3D_STRUCTURES` registers one metric structure.
- **479 of 485** world registrations use zero asset yaw. Only six declare a
  non-zero yaw correction.
- No `WORLD_3D_MODELS` entry currently declares a mount surface, authored
  forward axis, contact plane, or clearance envelope.
- The operator catalog exposes **5 weapon archetypes**, **22 weapon-skin
  meshes**, **53 chassis entries**, and **16 rig modules**.
- Forty-nine source modules contain direct `.glb` references, so auditing only
  `world3dOverlay.js` would miss operators, enemies, weapons, charms, equipment,
  structures, field weapons, and special scenes.

The older 2026-10-01 asset audit visually inspected the then-current set and
found placeholder, damaged, and mislabeled meshes. It did not establish a
machine-readable placement/orientation contract, and the runtime catalog has
grown from 320 to 560 GLBs since that snapshot.

## Confirmed code-level causes

### World props have dimensions, but not placement semantics

`src/world3dOverlay.js` generally records only `url`, `height`/`scale`, optional
`span`/`maxSpan`, and `yaw`. `prepareWorld3dModel()` recenters every normalized
prop horizontally and moves its minimum Y to the floor. That is reasonable for
free-standing props but destroys authored wall/contact offsets and cannot tell
which face is the back of a charger or cabinet.

Placement direction then comes from several partially overlapping systems:

- `src/propBehavior.js` defaults nearly every unclassified solid prop to
  `facing: wall`, even when its actual mount type is unknown.
- `src/roomPopulation.js` maintains a separate twelve-item
  `isWallBackedPropType()` allowlist. `prop_exosuit_docking_gantry` is absent.
  If a required wall-backed prop finds no wall candidate, `pickCandidate()`
  silently falls back to any floor candidate.
- `src/roomDressingKits.js` places the exosuit gantry and teardown station in
  the broad `corners` layer instead of expressing their actual rear support and
  service-clearance requirements.
- `src/roomDressing.js` estimates wall depth from another hand-maintained
  table/pattern matcher. This is not derived from the transformed GLB.
- `src/threeGame.js` marks only three model types as wall-backed when creating
  scatter anchors, so the generic replacement path does not apply the same
  wall inset to most wall machines.
- `src/roomDressingRenderer.js` directly applies item position and yaw. It has
  no final support-plane validation after the real model bounds are known.

The result is not one bad exosuit asset. The runtime lacks one authoritative
answer to “where is this model's back/contact plane, and what direction is its
front?”

### Texture/decal support is inferred from lists and names

Floor and wall decals are divided across explicit sets, regexes, dressing
layers, and scatter flags. Wall decals have a support-cell check in one path,
but there is no catalog-level `surface`, authored up direction, aspect policy,
or physical size contract shared by every placement path. A texture can
therefore be correct in the room-dressing renderer and wrong when spawned by a
scatter, setpiece, or special-event path.

### Weapon calibration asserts an assumption, not the loaded asset

`src/weaponCalibration.js` says all five weapon archetypes have authored
`+X` muzzle/forward axes and gives all five the same gameplay Euler rotation.
`src/weaponCalibration.test.js` rotates a synthetic `+X` vector using that same
metadata. It never loads a GLB, identifies a muzzle and grip, or compares the
result with the operator's hand/aim axes. A wrong asset axis can therefore make
the test pass while the rendered gun points backward or sideways.

`createPlayer3dOverlay()` attaches the weapon directly beneath the right-hand
bone. There is no per-rig primary-hand socket, support-hand target, stock
clearance, or muzzle marker. The same local position is consequently expected
to fit Scout, Tank, Engineer, and dozens of chassis bodies.

### Hero selection deliberately hides and substitutes the loadout

`src/scoutHeroPreview.js` creates every class with `weaponVisible: false`, then
toggles the weapon every 4.2–5.2 seconds. It does not accept the selected class
loadout. Since it also does not supply `weaponArchetype` or weapon equipment,
the temporary visible weapon is the default GG1 rather than necessarily the
selected class weapon, skin, finish, or charm.

`main.js::syncHeroPreview()` already reads and renders the selected loadout in
the text strip, but only calls `preview.setType(type)`. The visual operator and
the textual loadout can therefore disagree.

Charm spring physics already exists in `player3dOverlay.js`, but a stationary
hero preview supplies no movement and no equipped charm. The spring settles to
zero, so it cannot react to breathing or the ready/aim transition.

## Authoritative contracts

### Asset-space convention

Every runtime model record must expose or inherit a reviewed asset profile:

```js
{
  surface: 'floor' | 'wall' | 'ceiling' | 'free' | 'hand' | 'socket',
  forwardAxis: '+X' | '-X' | '+Z' | '-Z',
  upAxis: '+Y',
  yawCorrection: 0,
  contact: { axis: 'z', side: 'min', inset: 0.02 },
  pivot: 'bounds-center-floor' | 'authored' | 'grip',
  clearance: { front: 0.8, sides: 0.25, top: 0 },
  allowedPlacement: ['wall', 'corner'],
  review: { status: 'verified', capture: '...' }
}
```

- `yawCorrection` corrects asset space only. World/room yaw remains a separate
  transform on a parent placement group.
- Normalization occurs inside an asset-space child. Contact alignment and world
  placement occur on separate parents so bounds centering cannot erase a
  wall, ceiling, grip, or authored-structure pivot.
- Unknown profiles fail the audit and use a safe free-standing quarantine in
  development; they do not silently inherit “wall-facing.”
- Wall/ceiling assets require a valid support tile or authored socket. If none
  exists, deterministic placement selects another candidate or omits the
  optional prop.

### Weapon-space convention

Every base weapon and bespoke weapon skin receives measured markers in a
single registry:

```js
{
  grip: { position: [...], rotation: [...] },
  supportGrip: { position: [...] },
  muzzle: { position: [...], axis: '+X' },
  stock: { position: [...] },
  charmSocket: { position: [...], rotation: [...] },
  boundsContext: { gameplay: ..., hero: ..., armory: ..., reward: ... }
}
```

Markers may come from named GLB nodes (`HB_Grip`, `HB_SupportGrip`,
`HB_Muzzle`, `HB_Stock`, `HB_Charm`) when present. Reviewed registry overrides
cover existing assets without those nodes. A weapon skin may inherit the base
archetype only after its marker error is measured within tolerance.

Acceptance math is performed on the loaded and transformed model:

- muzzle forward versus operator aim: at most 15 degrees;
- grip versus primary-hand socket: at most 3 cm;
- support grip versus off-hand target: at most 10 cm in hero/gameplay poses;
- stock may not enter the torso clearance volume;
- charm/cord may not intersect hand, sight, muzzle exclusion cone, or torso in
  idle and ready poses.

### Hero presentation state

Use a small presentation state machine independent of combat simulation:

`armed-idle -> readying -> aimed-hold -> lowering -> armed-idle`

- Start and spend most time in `armed-idle`; the equipped weapon is always
  visible.
- At a seeded, non-distracting cadence, transition to `aimed-hold` and back.
- Blend existing clips where they are suitable. Otherwise apply bounded upper
  body/hand targets without altering locomotion or gameplay hitboxes.
- Feed weapon angular velocity and breathing acceleration into the existing
  charm spring. Readying produces a small lag; lowering produces a smaller
  counter-swing. Clamp delta and angular limits as the gameplay spring does.
- Class changes and loadout changes use generation tokens; stale async weapon
  or charm loads must dispose themselves and never overwrite the latest hero.

## Implementation packages

### P0 — build a complete reproducible runtime asset inventory

Files:

- new `src/modelPresentationRegistry.js`
- new `scripts/audit-model-presentation.mjs`
- new `src/modelPresentationRegistry.test.js`
- extend `src/debugMuseumPlan.js` and `src/debugAssetCatalogs.js`

Changes:

1. Collect every runtime `.glb` reference from the world, structure, enemy,
   operator, weapon, skin, charm, module, field-weapon, corpse, carry, and
   special-scene catalogs. De-duplicate by resolved URL but retain every use
   context.
2. Load each GLB through the production meshopt-capable loader and emit JSON
   containing bounds, root transforms, mesh/skinned-mesh count, animations,
   named marker nodes, materials/textures, triangle count, and catalog uses.
3. Fail on missing files, non-finite transforms/bounds, zero-area geometry,
   unsupported root scale, or any used model without a presentation profile.
4. Add labelled contact-sheet modes for front/back/left/right plus the actual
   runtime-normalized placement. World assets are grouped by support surface;
   weapons are grouped by archetype and skin.
5. Preserve the prior duplicate/placeholder audit as content evidence, but do
   not conflate byte validity with correct direction or placement.

Acceptance:

- The report accounts for all 560 shipped GLBs and identifies which are
  runtime-used, archival/unreferenced, or intentionally structure-scale.
- Every direct source reference resolves to exactly one audit record.
- CI can distinguish an unaudited asset from an intentionally free-standing
  asset instead of accepting `yaw: 0` as proof.

### P1 — centralize model support, axis, pivot, and clearance data

Files:

- `src/world3dOverlay.js`
- `src/propBehavior.js`
- `src/roomPopulation.js`
- `src/roomDressing.js`
- `src/roomDressingKits.js`
- `src/roomDressingRenderer.js`
- `src/threeGame.js`
- new `src/modelPlacement.js`

Changes:

1. Move placement semantics out of the three separate hardcoded wall-backed
   lists and into `modelPresentationRegistry.js`.
2. Introduce an asset-space correction group and a placement-space group.
   Apply normalization/yaw correction only to the child; align its reviewed
   contact plane to the support surface using transformed bounds.
3. Replace guessed bounding depths with measured, cached post-correction
   envelopes. Keep explicit overrides only where animation changes the bounds.
4. Make wall and ceiling support mandatory. Remove the `wallOnly` fallback to
   arbitrary floor candidates. Optional dressing is omitted when no valid
   socket exists; required anchors produce a validation error and safe fallback
   layout.
5. Classify `prop_exosuit_docking_gantry`,
   `decon_exosuit_scrubber_station`, `life_exosuit_teardown`, racks, lockers,
   cabinets, vending machines, fixed consoles, wall pipes, wall lights, and
   comparable assets from the audit rather than from name regexes.
6. Reserve each machine's front service clearance and player interaction point
   during room reachability checks. A correctly wall-mounted charger must not
   become a correctly oriented doorway blocker.
7. Apply the same resolved transform to dynamic models, instanced dressing,
   scatter replacements, setpieces, and debug museum/showroom instances.

Acceptance:

- The exosuit docking gantry and scrubber station sit flush against all four
  cardinal walls, face into the room, retain an accessible front interaction
  zone, and never spawn unsupported in a room center.
- One model type produces the same facing/contact result through population,
  dressing, scatter, and special-object paths.
- Required door aprons and routes remain clear after measured envelopes are
  applied.

### P2 — unify decal and texture support-surface placement

Files:

- `src/propBehavior.js`
- `src/roomDressingKits.js`
- `src/roomDressing.js`
- `src/roomDressingRenderer.js`
- `src/threeGame.js`
- new `src/surfaceAssetRegistry.js`

Changes:

1. Register every placed decal/texture with `surface`, dimensions in metres,
   up direction, aspect policy, depth offset, and allowed support tile types.
2. Funnel room dressing, scatter, setpiece, and special decals through one
   resolver. A wall decal without a wall is rejected; it is not silently
   floated or converted unless the registry provides a floor variant.
3. Validate transformed corners against the support face so large stains,
   grates, and posters do not cross walls, doors, or void edges.
4. Extend the museum with floor/wall/ceiling texture panels labelled with
   orientation arrows and one-metre rulers.

Acceptance:

- Every placed texture has a real support surface and consistent visual up.
- Floor overlays remain within traversable support; wall/ceiling assets do not
  float or z-fight.

### P3 — measure every weapon and replace self-referential calibration

Files:

- `src/weaponCalibration.js`
- `src/charmSockets.js`
- `src/player3dOverlay.js`
- `src/armoryScene.js`
- `src/rewardPreview.js`
- new `scripts/capture-weapon-fit.mjs`
- `src/weaponCalibration.test.js`
- `src/player3dWeaponEquipment.test.js`

Changes:

1. Audit the five base frames and all 22 bespoke weapon-skin GLBs. Record grip,
   muzzle, stock, support-grip, and charm markers per actual mesh.
2. Replace the shared Euler assumption with marker-to-socket alignment. Derive
   the weapon transform that maps the asset grip frame to a per-rig hand frame;
   do not rotate around a recentered bounds origin.
3. Add per-rig hand profiles for Scout, Tank, and Engineer. Use a bounded
   support-hand target/IK presentation layer for held idle and aim poses.
4. Make gameplay, hero, Armory, and reward views consume the same asset-space
   marker data while retaining context-specific framing and scale.
5. Make tests load representative real GLBs. Assert transformed muzzle/aim,
   grip/hand, stock/torso, and charm exclusion tolerances rather than asserting
   that metadata rotates its own declared axis correctly.
6. Capture every base weapon and skin on every compatible class from front,
   side, back, and aim-line views. Emit a labelled contact sheet and numeric
   failures beside it.

Acceptance:

- No compatible weapon points backward or sideways in any consumer.
- A skin cannot inherit base calibration unless its measured markers pass.
- Armory/reward framing differences never change the weapon's semantic front.

### P4 — show the selected armed loadout in hero selection

Files:

- `main.js`
- `src/scoutHeroPreview.js`
- `src/player3dOverlay.js`
- `src/loadout.js` only if a read-only presentation snapshot helper is useful
- `src/ticket81HeroSelection.verification.test.js`
- `tests/e2e/character-preview.spec.js`

Changes:

1. Pass a snapshot from `window.loadout.getClassLoadout(type)` into
   `syncHeroPreview()` containing archetype, skin, sheen/finish, charm, chassis,
   and wearable modules.
2. Replace `setType(type)` with an idempotent
   `setPresentation({ classType, loadout })`. Rebuild only the components whose
   asset identity changed and guard every async result with one generation ID.
3. Default `weaponVisible` to true in hero selection. Remove the unarmed
   five-second interval. Keep the weapon through `armed-idle`, `readying`,
   `aimed-hold`, and `lowering`.
4. Add a deterministic presentation state machine. Most time is relaxed armed
   idle; occasional short aim-ready holds show the correct gun direction
   without turning the class screen into a firing loop.
5. Pass `charmId` to `createClassWeapon()`. Drive the existing spring from
   breathing and measured weapon motion, and trigger a bounded impulse during
   ready/lower transitions.
6. Refresh the preview after Armory/loadout events if the selected class is
   visible, without reloading the whole operator unnecessarily.

Acceptance:

- The hero model, text strip, and saved loadout always agree for all classes.
- The equipped gun and charm are visible within the first stable preview frame.
- Idle-to-aim transitions preserve hand fit, muzzle direction, and charm
  attachment; rapid class/loadout switching cannot resurrect stale assets.

### P5 — visual gates and rollout

Files:

- extend `tests/e2e/character-preview.spec.js`
- new `tests/e2e/model-placement-orientation.spec.js`
- new `tests/e2e/probes/model-presentation-contact-sheets.spec.js`
- `scripts/audit-retail-assets.js`
- package scripts in `package.json`

Changes:

1. Add a fast manifest/schema gate to normal tests and a browser-loaded GLB
   audit to presubmit/release verification.
2. Add deterministic four-wall rooms for wall/corner/ceiling assets and capture
   north/east/south/west placements with support planes visible.
3. Add hero captures for all three classes in armed idle and aimed hold using a
   loadout with a visible charm.
4. Keep contact-sheet output in report artifacts, not retail assets. Record the
   commit, registry version, viewport, renderer, and asset hashes.
5. Land corrections in bounded catalog batches (weapons, wall machines,
   wall/ceiling fixtures, furniture, free-standing props, characters/enemies)
   so a bad transform can be bisected without reverting the audit framework.

Release gates:

- zero runtime-used GLBs without a presentation profile;
- zero unsupported wall/ceiling placements across the seed portfolio;
- zero weapon marker tolerance failures across compatible frames/skins;
- hero preview armed-idle and aimed-hold captures approved at 1280×800 and
  1920×1080;
- full unit suite, production build, media audit, and targeted browser tests
  pass.

## Suggested commit sequence

1. `test(assets): inventory runtime model presentation metadata`
2. `refactor(world): centralize model support and facing contracts`
3. `fix(world): align wall machines and supported textures`
4. `fix(weapons): calibrate real grip and muzzle markers`
5. `feat(hero): present selected armed loadout and reactive charm`
6. `test(visual): gate model orientation contact sheets`

## Explicit non-goals

- Do not remodel or retexture all 560 GLBs as part of the transform pass.
  Damaged, placeholder, or mislabeled art remains a separate replacement queue
  identified by the asset audit.
- Do not alter combat hitboxes, weapon balance, firing cadence, or authoritative
  aim simulation to make a preview look correct.
- Do not use ad hoc per-room rotations after the registry exists. Corrections
  belong to the asset profile; topology/world yaw belongs to placement data.
- Do not make hero selection fire live projectiles or gameplay effects. Its
  ready/aim cadence is presentation-only.
