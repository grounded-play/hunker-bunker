# Blender Pre-rendered Animation Production Plan

Status: proposed implementation plan | Owner: art/animation + gameplay rendering | Updated: 2026-09-12 | Review: after the Scout vertical slice and at each asset promotion

## Decision

Yes: the existing FBX/GLB rigs can be staged and animated in Blender, then
rendered as transparent sprite atlases or short video sequences. This is a good
fit for Hunker Bunker's fixed isometric presentation because it preserves the
lighting, materials, proportions, and exact animation from one frame to the
next while keeping the shipped fallback renderer inexpensive.

Use pre-renders selectively:

- use **RGBA atlases** for characters, enemies, props, and short gameplay
  one-shots viewed from the fixed gameplay camera;
- use **PNG image sequences encoded to WebM** for full-screen endings and
  tightly directed transitions;
- keep **live 3D** for aim-dependent upper-body motion, equipment swaps,
  destructible geometry, interactive previews, camera orbit, and anything that
  must react continuously to player input.

The first production slice is the three base-class locomotion fallback, not a
wholesale replacement of the working 3D overlays.

## Source baseline

This plan is based on the repository at 2026-09-12 and the following observed
facts:

- Blender 5.2.1 LTS is available in the production environment.
- `art/source/mixamo/scout/` contains the working Scout `.blend`, the Scout
  source FBX, textures, and multiple Mixamo animation packs.
- `art/source/3d/` contains 259 FBX and 136 GLB source assets, including
  character, season, community, prop, weapon, and world assets.
- `scripts/blender/` already contains import, retargeting, optimization, and GLB
  build scripts, establishing a headless Blender workflow.
- `src/player3dOverlay.js` already consumes idle, walk, run, fall, reload,
  landing, hit, fire, injured, and gesture clips through `AnimationMixer`.
- `src/playerSpriteLayouts.js` still gives Scout only a legacy two-frame walk.
- the live Engineer sprite source is 9 columns by 7 authored rows and reuses
  one rear direction, despite the maintained player contract requiring an
  authored 8 by 8 directional walk atlas.
- `src/enemySpriteLayouts.js` already supports eleven directional enemy
  atlases, so the runtime atlas pattern is established.
- `docs/player-sprite-animation-contract-v3.md` and
  `docs/enemy-sprite-animation-contract-v4.md` define the current direction,
  phase, anchor, grid, and timing contracts.
- five expanded ending videos remain absent according to
  `docs/design/asset-gap-audit-2026-09-11.md`; these are a separate Blender
  video lane, not part of the first sprite-atlas slice.

Before implementation begins, rerun this small baseline audit and record the
result in `art/source/blender-prerenders/reports/`:

```bash
blender --version
find art/source -type f \( -iname '*.fbx' -o -iname '*.glb' -o -iname '*.blend' \) | sort
npm test -- src/playerSpriteLayouts.test.js src/enemySpriteLayouts.test.js
```

## Goals

1. Produce stable, reproducible animation frames from assets already owned by
   the repository.
2. Fix the most visible fallback-animation defects without adding runtime
   skeletal cost.
3. Make every output traceable to a source model, source action, Blender
   version, render recipe, and approval record.
4. Keep runtime selection data-driven so a pre-render can be enabled, disabled,
   or replaced without changing gameplay state.
5. Establish one pipeline that can later create player, enemy, prop, VFX, and
   cinematic deliverables.

## Non-goals

- Do not remove `player3dOverlay.js` or `enemy3dOverlay.js`.
- Do not bake player movement translation into locomotion frames; gameplay
  remains authoritative for world position.
- Do not pre-render weapon projectiles, aim direction, dynamic shadows, damage
  decals, or arbitrary cosmetic combinations in the first slice.
- Do not replace procedural particles where color, direction, or quantity must
  respond to gameplay.
- Do not promote an atlas merely because the render completed. It must pass
  anatomy, loop, scale, memory, and in-game acceptance checks.
- Do not use chroma green as the production master. Transparency is the master;
  keyed derivatives exist only for compatibility.

## What should be pre-rendered

| Priority | Deliverable | Source readiness | Why it is a fit | Initial disposition |
| --- | --- | --- | --- | --- |
| P0 | Scout eight-direction walk | Working Scout rig and walking actions exist | Replaces the live two-frame fallback with the largest visible consistency gain | Build first |
| P0 | Engineer corrected eight-direction walk | Live 3D class rig/locomotion exists | Removes the 9x7 layout and duplicated rear direction | Build after Scout recipe locks |
| P0 | Tank contract verification/re-render | An 8x8 atlas already exists | Confirms all three classes came from one camera, scale, cadence, and lighting contract | Re-render only if comparison fails |
| P1 | Base-class idle atlases | Idle actions exist | Cheap, readable life at rest and a controlled fallback when 3D is off | Three 4x8 atlases |
| P1 | Base-class run atlases | Running actions exist | Makes fallback sprint cadence distinct from walk | Three 8x8 atlases |
| P1 | Hit, reload, hard-land, downed one-shots | Source actions exist | High gameplay readability with bounded timing | One atlas per class/action; prototype hit first |
| P1 | Corrupted boss attack/telegraph/death sets | Boss models and creature actions exist | Fixed camera and discrete telegraphs suit atlases | Prototype one boss before the family |
| P2 | Camp NPC idle/gesture loops | Gesture library and NPC rigs exist | Adds character without continuous interaction requirements | Render only named, story-used beats |
| P2 | Mechanical prop loops | Many GLB props exist | Fans, vents, sacs, terminals, and shrine pulses can use cheap loops | Inventory and select by screen-time |
| P2 | Missing ending sequences | Models and ending designs vary by ending | Blender can guarantee continuity and precise framing | Separate WebM lane after sprite pipeline proof |

### Do not pre-render these by default

| Feature | Keep live because |
| --- | --- |
| Armory and cosmetic preview | The player expects orbit, lighting response, attachments, and exact equipped cosmetics |
| Weapon aiming and muzzle origin | Pose and origin must follow live aim and weapon state |
| Doors and destructible walls | Geometry and collision state change in the world |
| Dynamic lights and shadows | They must match current rooms, performance settings, and moving emitters |
| Long free-camera scenes | Baked viewpoints break as soon as framing changes |

## Output contracts

### Gameplay atlas master

- straight-alpha RGBA PNG;
- 256 by 256 pixels per cell;
- transparent background with zero RGB in fully transparent pixels to reduce
  fringe risk;
- orthographic camera with one locked lens, elevation, target, and subject
  scale for the whole class family;
- eight authored direction rows in this exact order: east, southeast, south,
  southwest, west, northwest, north, northeast;
- walk/run: 8 columns by 8 rows, 2048 by 2048 total;
- idle: 4 columns by 8 rows, 1024 by 2048 total;
- contact events at columns 0 and 4 for eight-frame locomotion;
- visual center X 128 and ground baseline Y 240, within the tolerances in the
  player/enemy animation contracts;
- no baked floor shadow. Runtime lighting owns grounding unless a future
  dedicated shadow atlas is explicitly approved;
- nearest-compatible texture sampling and no mipmap color bleed between cells.

Each atlas ships with a JSON sidecar containing:

```json
{
  "schemaVersion": 1,
  "subject": "Scout",
  "action": "walk",
  "sourceModel": "art/source/mixamo/scout/Scouting.fbx",
  "sourceAction": "art/source/mixamo/scout/animations/Female Locomotion Pack/walking.fbx",
  "blenderVersion": "5.2.1 LTS",
  "columns": 8,
  "rows": 8,
  "cellSize": 256,
  "fps": 10,
  "loop": true,
  "directions": ["east", "southeast", "south", "southwest", "west", "northwest", "north", "northeast"],
  "eventFrames": { "footstep": [0, 4] }
}
```

The real sidecar must additionally contain the source file SHA-256 values,
render recipe version, frame range, camera transform, render engine, color
management, output checksum, and approval status.

### Cinematic master

- render a numbered PNG sequence first; never render directly to the only video
  master;
- 1920 by 1080, 24 fps, Rec.709/sRGB delivery unless the existing cutscene
  player proves a different contract;
- encode WebM using the same codec assumptions as the five existing ending
  videos;
- include a poster frame and duration in the cinematic manifest;
- verify skip, pause/visibility change, audio stop, fallback still, and package
  inclusion before promotion.

## Repository layout

```text
art/source/blender-prerenders/
  README.md
  scenes/                 # .blend production scenes; no generated frames
  manifests/              # one source/render manifest per deliverable
  reports/                # contact sheets, validation JSON, review notes
  references/             # approved gameplay-scale reference captures
scripts/blender/
  render_prerender_atlas.py
  render_prerender_sequence.py
scripts/
  assemble-prerender-atlas.mjs
  validate-prerender-atlas.mjs
public/art-remaster/prerendered/
  players/<class>/<action>.png
  enemies/<enemy>/<action>.png
public/cutscenes/
  <ending>.webm
```

Generated loose frames belong in a gitignored scratch/output directory, not in
`public/` or the source tree. Only approved atlases, videos, posters, manifests,
and compact review evidence should be committed.

## Blender production recipe

### 1. Scene normalization

1. Import the subject model and action into a clean scene.
2. Resolve the armature deterministically by name and fail if the expected rig
   or action is absent.
3. Retarget only onto a verified compatible skeleton. Record any bone-name map
   in the manifest.
4. Remove root translation from looping actions while preserving vertical gait
   motion. World movement remains in game code.
5. Apply a fixed character height and ground the lowest support-foot point at
   world Z 0 without applying destructive pose transforms to the source file.
6. Attach the class-default weapon for silhouette review, but keep a weaponless
   scene variant available to test future equipment composition.
7. Mark all imported source collections read-only by convention; production
   adjustments live in the render scene or script.

### 2. Camera and direction convention

Use one orthographic camera rig. Keep the camera fixed and rotate the character
root in 45-degree increments; this prevents tiny differences in framing and
perspective between rows. Direction names describe where the character is
facing in screen/game terms, not where the camera sits.

The render script must calculate projected bounds over every sampled pose,
choose one scale for the entire deliverable, and then lock it. Per-frame
auto-framing is forbidden because it creates visual pumping.

### 3. Sampling

- identify the clean loop interval, excluding a duplicated terminal frame;
- sample by normalized phase, not by assuming every FBX uses the same native
  frame count;
- walk/run phases map exactly to contact, down/compression, pass/drive, and
  up/flight at columns 0-7;
- idle maps to neutral, inhale, neutral-cross, and exhale;
- one-shots may use 8, 12, or 16 frames, chosen once in the action manifest;
- render an adjacent contact sheet and looping preview for review before atlas
  assembly.

### 4. Lighting and look

Start with Eevee for repeatability and speed. Use a neutral three-point rig:
soft cool key, restrained warm rim, and low neutral fill. Keep world alpha at
zero. Lock exposure, view transform, materials, and light energy in a versioned
recipe rather than hand-tuning each direction.

The first Scout review compares AgX and Standard output at gameplay scale. Pick
one and lock it for the family. The desired result is compatibility with the
game's painted biomechanical look, not photorealism.

### 5. Render and assembly

The Blender script renders one PNG per direction/phase with stable names such
as `Scout.walk.east.00.png`. A separate Node assembler verifies dimensions and
names, then packs the atlas. Separating render from assembly makes failed cells
cheap to rerender and keeps image-grid logic testable outside Blender.

The command interface should be:

```bash
blender --background --factory-startup \
  --python scripts/blender/render_prerender_atlas.py -- \
  --manifest art/source/blender-prerenders/manifests/scout-walk.json \
  --output scratch/prerenders/scout-walk

node scripts/assemble-prerender-atlas.mjs \
  --manifest art/source/blender-prerenders/manifests/scout-walk.json \
  --input scratch/prerenders/scout-walk \
  --output scratch/prerenders/Scout.walk.png

node scripts/validate-prerender-atlas.mjs \
  --manifest art/source/blender-prerenders/manifests/scout-walk.json \
  --atlas scratch/prerenders/Scout.walk.png
```

No script writes into the live `public/` path unless passed an explicit
`--promote` flag after validation.

## Runtime integration

1. Add the new layouts to the existing player/enemy layout registries; do not
   create a second animation clock.
2. Keep gameplay state semantic: `idle`, `walk`, `run`, `reload`, `hit`,
   `fall`, `land`, `downed`. Rendering chooses a 3D clip or atlas for that
   state.
3. Add explicit per-action frame counts, fps, loop mode, event frames, and
   anchor data to layout definitions. Do not infer these from image dimensions
   at runtime.
4. Preserve footstep synchronization through sidecar/layout event frames.
5. Cross-fade is optional for 3D, but atlas state changes occur only at defined
   boundaries or immediately for high-priority reactions such as hit/downed.
6. If a new atlas fails to load, fall back to the previous approved asset and
   emit the existing asset-load telemetry signal.
7. Validate texture memory on the lowest target GPU. A 2048-square RGBA atlas
   is about 16 MiB uncompressed before mipmaps; avoid eagerly loading every
   action for every class.
8. Load base locomotion first and lazy-load one-shots by encounter/class where
   practical.

## Execution phases

### Phase 0 — pipeline proof

Deliverables:

- pipeline README, schema, and one Scout walk manifest;
- deterministic Blender render script;
- atlas assembler and validator with unit tests;
- Scout east-facing eight-frame strip, contact sheet, and loop preview.

Exit criteria:

- two clean runs from the same inputs produce byte-identical frames or a
  documented, bounded reason they cannot;
- all eight poses fit the locked anchor and baseline tolerances;
- contact legs and arm opposition pass human anatomy review;
- no alpha fringe is visible over black, white, cyan, and representative cave
  backgrounds.

### Phase 1 — Scout vertical slice

Deliverables:

- full 8x8 Scout walk atlas and sidecar;
- runtime layout entry behind a development flag;
- old/new gameplay-scale capture with movement speed and footstep timing;
- loading, memory, and frame-time measurements.

Exit criteria:

- all directions are authored and loop without a hitch;
- the sprite neither slides nor changes apparent scale while direction changes;
- footsteps land at columns 0 and 4;
- the atlas passes unit tests, an automated smoke route, and human gameplay
  review at 720p, 1080p, and Steam Deck scale;
- rollback is a layout/path change, not a code revert.

### Phase 2 — class locomotion family

Deliverables:

- corrected Engineer 8x8 walk;
- Tank comparison report and either approval of the existing atlas or a
  pipeline-matched replacement;
- Scout, Tank, and Engineer idle and run atlases;
- lazy-loading budget and package audit.

Exit criteria:

- all classes share direction order, anchors, camera, and lighting;
- each class retains its distinct stride described by the player contract;
- Engineer has eight genuinely authored directions;
- combined resident texture cost stays within the agreed low-spec budget.

### Phase 3 — combat one-shot pilot

Prototype one action before producing the matrix: Scout hit reaction is the
recommended pilot because it is short, frequent, interruptible, and visually
easy to compare against gameplay damage timing.

Then consider reload, hard landing, downed/death, and class-signature melee.
Each action needs explicit interruption rules and an end-state transition.

Exit criteria:

- gameplay events and animation frames agree under normal play, pause, frame
  drops, death, and rapid repeated hits;
- one-shots never leave the renderer stuck on their last frame;
- atlas count and memory remain bounded; low-value cosmetic permutations are
  rejected rather than multiplied.

### Phase 4 — enemy/boss pilot

Select one corrupted boss with an existing 3D source and produce idle,
locomotion, telegraph, attack, hit, and death only where gameplay has a matching
semantic state. Do not create animation that cannot yet be triggered.

Exit criteria:

- the telegraph communicates attack area and timing without relying on audio;
- attack impact aligns with the gameplay damage frame;
- death ends on a compatible corpse/despawn state;
- accessibility review confirms the telegraph survives reduced effects and
  color-vision modes.

### Phase 5 — Blender cinematic lane

After atlas tooling is proven, create a storyboard/animatic for one missing
ending, recommended `ALIEN_EXODUS` because it currently gates a high-effort
three-hive outcome. Reuse repository models and environment assets, render PNG
masters, encode WebM, and integrate through the existing cutscene engine.

Do not batch all five endings before the first one passes narrative, playback,
fallback, file-size, and packaged-build review.

## Validation and evidence

### Automated checks

- manifest schema and referenced-source existence;
- source and output SHA-256 capture;
- exact canvas, grid, cell dimensions, row order, and frame count;
- alpha presence and transparent-pixel RGB cleanup;
- no nontransparent pixels crossing cell edges;
- per-frame bounding-box center/baseline drift;
- perceptual difference between adjacent poses and opposite contact frames;
- loop first/last transition measurement;
- expected runtime layout path and sidecar match;
- Vite build media inclusion and Electron packaged-asset inclusion;
- unit tests for layout selection, frame stepping, state interruption, and event
  frames.

### Human acceptance

- anatomy and equipment continuity at native resolution;
- readable silhouette at actual gameplay size;
- motion matches world speed without foot sliding;
- all eight directions read correctly in the game camera;
- no halo on representative light/dark/color backgrounds;
- no direction pop, scale pumping, lighting flip, or loop hitch;
- comparison capture approved by art and gameplay owners.

Evidence for each promoted asset lives under
`art/source/blender-prerenders/reports/<deliverable>/` and includes the manifest,
validator JSON, contact sheet, loop preview, runtime capture, test command, and
named approval. The plan checkbox is not evidence by itself.

## Risks and controls

| Risk | Control |
| --- | --- |
| Atlas explosion from cosmetics and actions | Pre-render base silhouettes only; keep interactive cosmetics in 3D; set a per-class resident-memory budget |
| Foot sliding | Strip root translation, sample contact phases deliberately, and tune playback from measured gameplay speed |
| Direction mismatch | Centralize direction yaw values and add a labeled turntable/contact sheet test |
| Alpha fringe | Straight-alpha masters, zero RGB under zero alpha, padded cells, and multi-background review |
| Inconsistent scale or camera | Calculate bounds across the full action once, then lock camera and scale for all frames/directions |
| Retarget deformation | Fail on unverified bone maps and visually inspect shoulders, hands, hips, and weapon contact |
| Blender nondeterminism | Pin Blender 5.2.1 LTS, factory-startup, CPU/GPU policy, samples, seed, color management, and recipe version |
| Large repository growth | Commit source scenes selectively, exclude loose frames, measure atlas/video size before promotion |
| Sprite/3D visual mismatch | Use the same models/material intent and compare both modes in the same room/camera |
| Cinematic scope growth | Prove one ending from animatic through packaged playback before producing the remaining four |

## Work breakdown

| ID | Work item | Owner | Depends on | Acceptance evidence |
| --- | --- | --- | --- | --- |
| BP-01 | Define manifest schema and source/output directories | Tools/art tech | none | Reviewed schema and sample manifest |
| BP-02 | Implement deterministic Blender atlas renderer | Art tech | BP-01 | Two-run comparison and east-strip output |
| BP-03 | Implement atlas assembler and validator | Tools | BP-01 | Unit tests plus validator JSON |
| BP-04 | Produce and review Scout east walk strip | Animation | BP-02, BP-03 | Contact sheet and anatomy approval |
| BP-05 | Produce full Scout walk atlas | Animation | BP-04 | 64-frame validation report |
| BP-06 | Integrate Scout behind development flag | Gameplay rendering | BP-05 | Runtime tests and comparison capture |
| BP-07 | Produce corrected Engineer walk | Animation | BP-06 | Eight-direction review and no reused row |
| BP-08 | Verify or replace Tank walk | Animation | BP-06 | Cross-class comparison report |
| BP-09 | Produce class idle/run family | Animation | BP-07, BP-08 | Six approved atlases and memory report |
| BP-10 | Pilot Scout hit reaction | Animation/gameplay | BP-06 | Damage-frame and interruption tests |
| BP-11 | Pilot one corrupted boss action set | Animation/combat | BP-10 | Telegraph/impact/death capture |
| BP-12 | Storyboard and render one missing ending | Cinematic/narrative | BP-06 tooling lessons | Packaged playback and fallback evidence |

## Promotion and rollback

Promotion requires: validator pass, code review, runtime comparison, target-scale
human acceptance, build audit, and packaged-build check. Copy the approved
artifact to `public/`, update its registry entry and provenance record in the
same change, and retain the prior path until the new asset survives one release
candidate.

Rollback is performed by restoring the registry path/feature flag to the prior
approved atlas or live 3D mode. Source renders and manifests remain as evidence;
do not delete them to disguise a rejected production attempt.

## Plan exit criteria

This plan is complete when:

- the deterministic pipeline is documented and reproducible;
- Scout, Tank, and Engineer each have accepted idle, walk, and run fallback
  atlases matching the maintained contract;
- one combat one-shot and one boss action set have proven state/event timing;
- one missing ending has proven the Blender-to-WebM cinematic path in a
  packaged build;
- memory, package size, and loading budgets are recorded;
- remaining candidate animations are explicitly accepted into the roadmap or
  cut with rationale.

