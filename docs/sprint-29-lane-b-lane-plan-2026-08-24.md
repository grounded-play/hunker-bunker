# Sprint 29 Lane B Plan — Rendering, Lighting, FX Depth, Weapons, and Charms

**Agent:** Codex  
**Branch:** `dev/sprint-29`  
**Date:** 2026-08-24  
**Parent plan:** [`sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md`](./sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md)  
**Ownership contract:** [`sprint-29-agent-lane-assignment-2026-08-24.md`](./sprint-29-agent-lane-assignment-2026-08-24.md)

## Lane objective

Make the 3D presentation stable and calibratable across armory, gameplay, and season-pass reward preview contexts. Lane B owns lighting lifecycle and adaptive-quality wiring, the 3D reward preview, weapon scale profiles, and per-archetype charm sockets. Lane B does not own DOM/CSS reward layering, locomotion mixer functions, audio, or the economy/grant path.

## Day-one reproduction result

### Build provenance

`log16.json` was produced by packaged `HunkerBunker/2.2.0`. The current branch is `dev/sprint-29` at `2.3.1-beta`, so the packaged log is a lead, not proof of current behavior.

### PCFSoftShadowMap warning

The warning mechanism is still present on the current branch:

- `src/armoryScene.js:90` creates a new armory `WebGLRenderer` and assigns `renderer.shadowMap.type = THREE.PCFSoftShadowMap`.
- `src/threeGame.js:1605` creates the main renderer and assigns `THREE.PCFShadowMap`.
- `main.js` initializes the armory through `ensureArmoryInitialized()` when the armory gate opens.
- `closeArmoryScreen()` disposes the armory renderer, so a later armory entry creates another renderer and re-runs the shadow assignment.

This matches the two log16 warnings near the two armory entries and is sufficient to keep the issue open. A current-branch headed WebGL reproduction with valid runtime GLB paths produced the exact warning twice across two fresh armory-scene lifecycles. Therefore:

- **Verified by current source/lifecycle tracing:** the armory can reassign the deprecated shadow type on each fresh armory renderer.
- **Verified on 2.3.1-beta:** headed Chrome with real WebGL and valid assets emitted `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.` twice. The first warning arrived about 198ms after armory-scene creation and the second about 259ms after the next creation; the exact ~80ms log16 timing is load-path/build dependent.
- **Verified at lifecycle level:** each fresh `createArmoryScene()` call creates a new renderer and can trigger the warning again after the previous scene is disposed.
- **Still required for the visual portion:** capture the actual packaged armory shadow appearance and compare the pre/post transition frame cost after replacing the deprecated assignment.

### Immediate lighting hypothesis

The warning is a credible lead, but not yet a proven root cause for the player’s lighting report. The current main gameplay renderer already keeps `PCFShadowMap` stable and adaptive mode only changes pixel ratio/post-processing while keeping shadow enablement tied to gameplay. The first implementation check is therefore to remove the armory-only deprecated assignment or replace it with one supported, stable shadow type, then compare transition CPU/shader timing and visual shadow quality.

## Current-state audit

### Findings and implementation status

| Area | Evidence | Lane B status |
|---|---|---|
| Armory shadow type | `src/armoryScene.js:90` previously assigned `PCFSoftShadowMap`; headed WebGL reproduced the warning twice across fresh armory lifecycles | Implemented: armory now uses supported `PCFShadowMap`; headed visual comparison remains |
| Reward 3D preview | `src/rewardReveal.js` previously exposed Lane A's explicit stub | Implemented in `src/rewardPreview.js`: category routing, GLB loading, turntable, explicit failure states, and telemetry |
| Reward model disposal contract | No Lane B preview mount/dispose module existed | Implemented: owned material/texture cloning, geometry/material disposal, renderer disposal, context loss, resize/RAF cleanup |
| Weapon scale profiles | `armoryScene.js` and `player3dOverlay.js` previously used one-size rules | Implemented: `src/weaponCalibration.js` provides per-archetype gameplay/armory/reward profiles and clamps |
| Charm sockets | `armoryScene.js:340-342` previously used one `0.18, -0.05, 0.06` transform for every weapon | Implemented: `src/charmSockets.js` provides per-archetype transforms and armory integration |
| Charm model offsets | Every charm additionally uses `model.position.set(0, -0.05, 0)` | Open; must remain a model-local presentation offset, not a substitute for weapon sockets |
| Reward burst depth | `.progression-reward-burst` is DOM/CSS | Hand off to Lane A; Lane B must not implement a competing three.js burst |
| Lighting telemetry | Shared `src/presentationTelemetry.js` now exists from concurrent Lane A work | Implemented: profile/adaptive tier snapshots correlate shadow, post-processing, pixel ratio, and renderer diagnostics |
| Preview performance measurement | No preview mount or per-preview resource report existed | Implemented: reward preview emits mount/load timing plus draw-call/triangle metrics |

### Already fixed or usable foundations

- `WEAPON_ARCHETYPES` and `WEAPON_SKIN_MESHES` are shared from `src/player3dOverlay.js` into `src/armoryScene.js`; armory and gameplay do not maintain separate weapon URL maps.
- Armory GLTF loading is promise-cached by URL, failed loads evict the cache entry, and loaded scenes are cloned before mutation.
- The armory registers `MeshoptDecoder` before loading compressed GLBs.
- `createClassWeapon()` has an existing fallback chain from skin to archetype to GG1.
- The armory and player overlay already dispose their own renderer/model resources in their existing lifecycle paths; the new reward-preview module must follow the same discipline and additionally release preview-only resources on every close/failure path.
- The current main renderer disables synchronous shader-error checks, addressing the earlier shader-log round-trip regression; Lane B should measure remaining transition stalls rather than reintroduce that check.
- Concurrent Lane C work now emits `WEAPON.fire-input`, `WEAPON.shot-blocked`, `WEAPON.shot-accepted`, and `WEAPON.projectile` from `src/threeGame.js`; Lane B should consume the evidence and avoid editing that path unless a request is routed through the ownership seam.
- The reward burst is not a three.js object. `src/seasonPassUi.js` creates a `.progression-reward-burst` `<div>` with 18 `<i>` children, and `style.css` animates those children with `progression-particle`. Its z-index/stacking fix belongs exclusively to Lane A.

## Current handoff readiness

The investigation gate is complete and the lane can move into implementation when the shared branch is ready:

- **Lighting lead reproduced:** the deprecated armory shadow assignment emits twice when two fresh armory renderers are created and rendered with valid GLB paths.
- **Lane A contract available:** `src/presentationTelemetry.js` defines the closed `LIGHTING` and `REWARD` event names, and `src/rewardReveal.js` provides the preview stub that Lane B must replace without changing its public contract.
- **Lane C contract available:** weapon-fire/refusal telemetry is now emitted from `src/threeGame.js`; Lane B should consume the evidence rather than duplicate that instrumentation.
- **Burst ownership settled:** no Lane B work is required in `style.css`, `seasonPassUi.js`, or a three.js burst scene.
- **First implementation seam:** `src/armoryScene.js:90` shadow configuration, followed by the pure calibration/socket registries before renderer integration.

The remaining proof obligations are implementation and verification obligations, not unresolved scope questions: preserve critical lighting, provide explicit preview success/failure and disposal, replace the universal weapon/charm transforms, and measure warm/cold preview cost plus five close/reopen cycles.

## Day-one blocking answer: reward burst implementation

**Answer: the season-pass reward burst is DOM/CSS, not three.js.**

Evidence:

- `src/seasonPassUi.js` creates the burst with `overlay.querySelector('.progression-reward-burst')` and fills it with `<i>` nodes.
- `style.css` defines `.progression-reward-burst` and the `progression-particle` animation.
- No reward-burst mesh, particle system, three.js camera layer, or render-order hook is connected to the season-pass claim flow.

Lane A owns the stacking-context and z-index correction. Lane B will not change `style.css`, add a competing three.js burst, or claim the burst as a rendering-layer fix. Lane B’s reward-preview interface reports when the 3D object is ready; Lane A fires and layers the DOM burst around that state.

## Charm socket design

### Design rule

The weapon archetype defines the socket. The charm defines only its own local model normalization and optional local rotation. No charm-specific offset may compensate for a wrong weapon socket.

### New registry shape

`src/charmSockets.js` will export an immutable registry keyed by the canonical weapon archetype ID used by `WEAPON_ARCHETYPES`:

```js
{
  gg1: {
    position: [x, y, z],
    rotation: [rx, ry, rz],
    scale: 1,
    anchor: 'receiver-underbarrel'
  },
  talon: { ... },
  talon_c: { ... },
  siege_breaker: { ... },
  tesla_lock: { ... }
}
```

The exact numbers will come from bounds/anchor inspection of the current GLBs, not from copying the existing `0.18, -0.05, 0.06` value. The registry should also expose a safe fallback archetype transform and a validation helper that returns a reason when an unknown archetype is requested.

### Application rules

- Create the socket as a child of the weapon model or weapon pivot only after the active weapon archetype is known.
- Apply the archetype transform in weapon-local space.
- Preserve the charm’s local model offset for its own origin correction, but keep it separate from the socket transform.
- When switching guns, update the socket transform before attaching the current charm.
- When switching a skin on the same archetype, retain the archetype socket unless the skin explicitly supplies a validated compatible socket.
- Reset spring rotation/velocity when changing archetype or removing a charm so the next charm does not inherit stale motion.
- Expose socket axes and anchor names in the debug attachment view.
- Test at least one small, one long, one heavy, and one Engineer weapon, plus all ten Season 0 charms through the supported weapon families.

### Lane A interface

Lane A does not need to know socket details. The preview API accepts `{ itemId, category }`; Lane B resolves the equipped weapon/archetype internally. For debug and tests, Lane B will export a pure `getCharmSocketTransform(archetypeId)` helper so Lane A or tests can inspect a stable transform without importing a renderer.

## Weapon scale calibration profiles

### Contract

Calibration is against the weapon presentation contract, not each source asset. Every weapon must preserve:

- A documented forward axis and muzzle point.
- A grip/support-hand relationship suitable for the player rig.
- A known local origin/pivot.
- A real-world or gameplay-space length/height expectation.
- Valid muzzle, projectile, shell, charm, and hand anchors after normalization.

### Profile contexts

`src/weaponCalibration.js` will own three contexts:

1. **Gameplay held weapon** — calibrated for the right-hand rig and first-person readability. This profile must not let a large imported mesh dominate the camera or clip through the hand/body.
2. **Armory bench** — calibrated for turntable readability, with framing limits that fit the largest supported gun. This replaces the global `targetSize = 1.15` rule.
3. **Reward turntable** — calibrated for a neutral camera and consistent card/reveal composition. It may use a different camera distance or framing scale, but it must preserve the weapon’s proportions and anchor orientation.

### Profile data

Each archetype profile will contain a canonical target dimension, scale clamp, pivot correction, rotation, grip anchor, muzzle anchor, charm socket key, and preview framing radius. Skin IDs may reference a validated profile override only when the mesh’s origin or silhouette genuinely differs; arbitrary per-skin scaling is not the default.

### Calibration process

1. Load the base archetype and measure its local bounds and forward axis.
2. Identify grip, muzzle, and charm anchor points in the model’s local space.
3. Normalize the base archetype to the gameplay contract.
4. Validate each supported skin against the base profile.
5. Add a skin override only if the asset cannot satisfy the base contract without visible distortion.
6. Derive armory and reward framing from the calibrated bounds, not from an unrelated fixed max dimension.
7. Render a debug axes view showing origin, forward axis, grip, muzzle, and charm socket.

## Reward preview design and Lane A interface

Lane B will add `src/rewardPreview.js` with this public contract:

```js
mountRewardPreview({ container, itemId, category })
  -> { ready: Promise<{ ok: true } | { ok: false, reason: string }>, dispose() }
```

### Required behavior

- Resolve the item definition and select a weapon, chassis, charm, or rig-module preview path.
- Use existing URL maps and cached GLTF loading where possible.
- Mount a dedicated preview scene/renderer or an isolated render group supplied by the reveal container; do not leak the live gameplay scene into the reward modal.
- Use a turntable camera with category-specific framing derived from calibrated bounds.
- For charms, attach the charm to the calibrated weapon socket rather than floating it independently.
- For chassis skins, use the matching class rig or a validated mannequin and avoid retargeting deformation in the reveal pose.
- For 2D-only rewards, return `ok: false` with a stable reason such as `preview_not_3d` so Lane A can render the deliberate 2D card path.
- For missing GLBs, return `ok: false` with the item ID and `asset_missing` reason; never silently present a class-base model as the claimed cosmetic.
- Emit `REWARD.preview-ready` or `REWARD.preview-failed` through `src/presentationTelemetry.js`; never call `debugLog` directly.
- `dispose()` must be idempotent and release renderer, render targets, geometries, materials, textures owned by the preview instance, animation mixers, event listeners, and cached cloned scene references.

## Lighting work plan

### Phase 1 — reproduce and stabilize shadow configuration

- Run a headed current-branch build with a real WebGL context.
- Enter armory, leave to gameplay, enter armory again, and capture console plus renderer shadow state.
- Remove the deprecated `PCFSoftShadowMap` assignment or replace it with one supported stable type selected once per renderer lifecycle.
- Confirm no shadow-dependent material recompile occurs merely because the armory is re-entered.
- Emit `LIGHTING.snapshot` and `LIGHTING.tier-change` through the shared telemetry module.

### Phase 2 — movement-route diagnosis

Compare snapshots at:

1. Initial gameplay frame.
2. First movement.
3. First room/chunk boundary.
4. Door transition.
5. Biome transition.
6. Return to the starting-room area.
7. Adaptive-quality mode entry and exit.

Record active light count, critical-light IDs, enabled state, intensity/color, shadow state, exposure, tone mapping, fog/environment values, pixel ratio, post-processing, draw calls, triangles, GPU memory estimate, CPU long-task timing, and dropped frames.

### Phase 3 — quality policy

Preserve critical readability lights first. If budgets are exceeded, degrade decorative lights, shadow resolution, post-processing, and nonessential effects in that order. Do not disable or detach the key/fill/ambient relationship that defines the authored room look. Any tier change must emit its reason and before/after values.

## Performance measurement for reward preview

Every preview run will be measured in a cold and warm state:

- `previewOpenToMountMs` — claim/reveal request to renderer/group mounted.
- `assetFetchMs`, `assetParseMs`, and `shaderWarmupMs` per asset where available.
- `previewFirstRenderableMs` — mount to first frame with a visible model.
- `previewFrameMs` — median and p95 over a 2-second idle/spin window.
- `previewMaxFrameMs` and dropped-frame count during the reveal.
- Before/after GPU memory estimate, geometry count, texture count, material count, and render-target bytes.
- Resource counts after `dispose()` and after five open/close cycles.
- Main gameplay frame and memory snapshot before opening and after closing the reveal.

### Performance gates

- Preview open must not introduce a visible multi-hundred-millisecond main-thread stall on a warm asset path.
- A preview must not retain a renderer, render target, cloned scene, or preview-only material after close.
- Five repeated open/close cycles must not monotonically increase GPU memory or unique texture/material counts.
- Preview render cost must be reported separately from gameplay cost; do not hide it by disabling the gameplay renderer without recording the state transition.
- The results must be captured at desktop 16:9 and 1280x800/Steam Deck-sized output.

## Task ordering and handoffs

### Step 1 — current-branch reproduction and contracts (complete)

- Headed shadow-warning reproduction.
- Confirm DOM/CSS burst answer to Lane A.
- Publish `rewardPreview` API and socket/calibration data shapes.
- Consume the already-published Lane A `presentationTelemetry.js` event names before emitting Lane B telemetry.

### Step 2 — lighting/shadow fix and diagnostics (code complete; headed QA pending)

- Stabilize shadow type/lifecycle.
- Add lighting snapshots and adaptive-tier correlation.
- Run the movement route and record whether the “lights off” report survives on 2.3.1-beta.

### Step 3 — reward preview implementation (complete)

- Implement preview mounting, category routing, turntable, failure states, telemetry, and disposal.
- Integrate the calibrated weapon/charm transforms.
- Hand Lane A the ready/failure behavior and confirm it can render honest fallback cards.

### Step 4 — weapon scale and charm sockets (code complete; headed QA pending)

- Add pure calibration/socket registries and tests.
- Wire armory and held-weapon paths without touching Gemini’s locomotion functions.
- Validate base archetypes, skins, charms, muzzle/grip anchors, and preview framing.

### Step 5 — integration and performance audit (automated complete; headed QA pending)

- Run reward open/close cycles and resource checks.
- Run armory re-entry and lighting movement route.
- Run `npm test` and `npm run build`.
- Hand Lane C the performance captures and any headed-browser reproduction requirements.

## File ownership and boundaries

Lane B may edit:

- `src/threeGame.js`.
- `src/baseLights.js`.
- `src/armoryScene.js`.
- New `src/weaponCalibration.js`.
- New `src/charmSockets.js`.
- New `src/rewardPreview.js`.
- In `src/player3dOverlay.js` only `WEAPON_ARCHETYPES`, `WEAPON_SKIN_MESHES`, `CHASSIS_SKIN_MODELS`, `createClassWeapon`, `normalizeModel`, and weapon position/scale constants.
- In `main.js` only renderer, adaptive-quality, and lighting wiring seams.

Lane B will not edit:

- `style.css` or DOM reward burst markup.
- Locomotion/mixer functions in `src/player3dOverlay.js`.
- `src/audio.js`.
- Economy/grant ownership or season-pass UI logic.

## Lane B completion evidence

- Headed current-branch armory re-entry capture confirms the shadow warning is gone or documented as an intentional supported configuration.
- Lighting snapshots prove whether movement/quality transitions preserve critical lighting.
- Code/test evidence proves the burst is handed to Lane A as DOM/CSS, with no competing three.js burst.
- `mountRewardPreview()` resolves explicit success/failure and disposes all owned resources.
- Pure calibration/socket tests cover every weapon archetype and fallback behavior.
- Armory and gameplay/reward profiles preserve weapon scale, grip, muzzle, and charm anchors.
- Five preview open/close cycles show no monotonic resource growth.
- `npm test` and `npm run build` pass, with unrelated failures recorded separately.

### Automated verification result — 2026-08-24

- `npm test -- --run`: 254 files, 2,096 tests passed.
- `npm run build`: Vite production build and required-media audit passed.
- Remaining proof is visual/in-game: movement lighting continuity, five reward preview open/close cycles, weapon/charm framing on all archetypes, and headed shadow-warning confirmation.
