# Player Chassis 3D Vertical Slice — Lane Split (Codex / Gemini / Claude)

Date: 2026-07-26.

Implements `docs/superpowers/specs/2026-07-26-player-chassis-3d-vertical-slice-design.md`
(read that first — this doc is the who/where/how, not the why). Follows the
`docs/sprint-19-wave{2,3,4}-{codex,gemini,claude}.md` convention already
established in this repo: split by file ownership so three agents can work
the same branch in parallel without touching the same files or blocking on
each other.

Scope reminder: **Scout only, walk animation only.** Nothing here touches
Tank, Engineer, enemies, or any non-walk animation.

## What's not assignable to any agent

- **Whether the final result actually looks right next to the game's other
  art** is a subjective creative call for the project owner, not something
  any lane can self-certify. Every lane's "definition of done" below is
  mechanical (contract satisfied, tests pass, screenshot produced) — final
  go/no-go on the visual is a separate human step after all three lanes
  land.
- Committing new binary art/model assets to the shared branch should still
  go through the normal review the user already does for this repo; no lane
  should assume its output is final just because its own checks pass.

## The two contracts that make parallel work possible

Both are already pinned exactly in the design doc — restated here because
they're what let Lane 1 and Lane 2 build simultaneously without waiting on
each other:

**glTF contract** (Lane 1 produces, Lane 2 consumes):
- Exactly one `SkinnedMesh`.
- Exactly one animation clip, named exactly `"Walk"`, looping.
- Bind pose faces world **+X** (verify with a top-down screenshot before
  export — character must visibly face frame-right).
- Bounding box: feet at local y=0, head top at local y≈2.0.
- No extra cameras/lights in the export.

**Runtime module contract** (Lane 2 produces, Lane 3 consumes):

```js
// src/playerChassisRenderer.js
export function createChassisSpriteSource({ classId, glbUrl }) {
  // returns:
  // {
  //   texture,                                   // THREE.Texture, NearestFilter, live-updated
  //   update(deltaSeconds, { axisX, axisZ, isMoving }),
  //   dispose()
  // }
}
export function computeChassisYaw(axisX, axisZ); // pure, unit-testable
```

Any code satisfying these two contracts can be developed, tested, and
demoed independently of the other lane's actual implementation — Lane 2
can build against a placeholder glb (even a single bone + a textured
quad) that satisfies the glTF contract shape without final art, and Lane
3 can build its harness against a stub `createChassisSpriteSource` before
Lane 2's real implementation lands, as long as both sides honor the
signatures above.

## Codex lane — chassis asset pipeline

Produces the rigged, textured, exported chassis and the artist-facing raw
material for skinning. Entirely new files; touches nothing anyone else
owns.

**Primary files:**
- `scripts/blender/build_player_chassis.py` (new)
- `public/models/scout/Scout.chassis.glb` (generated output, committed)
- `public/models/scout/Scout.uv-template.png` (generated output, committed
  — labelled UV layout render, one region per body part)
- `public/models/scout/README.md` (new — script parameters, exact command
  to regenerate, and what changed if the design's bone list changes)

**Tasks:**
1. Script builds the ~13-bone rig from the design doc's bone list (hips
   root → spine → chest → head; chest → shoulder → upper arm → forearm →
   hand ×2; hips → thigh → shin → foot ×2), each mesh segment rigid
   (100%) weighted to exactly one bone.
2. Script builds the chassis mesh from primitives sized against
   `public/art-remaster/sprite-v4/scout/identity/Scout.front-idle-master.png`
   silhouette (helmet, chest plate, pelvis armor, pauldron/forearm/hand
   per arm, thigh/shin/boot per leg). Reference the kneepad color-coding
   already established in that master art (orange = one side, cyan = the
   other) so left/right read unambiguously in the low-poly version too.
3. **Verify the +X rest-pose contract before doing anything else with the
   rig** — render a top-down screenshot of the bind pose and confirm the
   character visibly faces frame-right. This is the single most likely
   thing to be wrong and the cheapest point to catch it.
4. Hand-keyframe an 8-12 frame walk cycle as pose-bone rotations in the
   script (thigh/shin swing, counter-swinging arms, slight torso bob).
   Export as an animation clip named exactly `"Walk"`, set to loop.
5. UV-project `Scout.front-idle-master.png` onto the mesh through an
   orthographic camera matching that art's own front view. Side/back
   faces: extend edge pixels from the front projection rather than
   leaving them untextured. This will look flatter than the front — that
   is the accepted, named limitation in the design doc, not a bug to
   chase here.
6. Render and save the UV-template image: a checker or labelled unwrap
   render showing which UV region corresponds to which body part, so a
   human can paint a new skin against it without opening Blender.
7. Export `.glb`. Confirm bounding box (feet y=0, head top y≈2.0).

**Definition of done (self-check, run headless):**
```sh
blender --background --python scripts/blender/build_player_chassis.py -- \
  --class scout \
  --base-image public/art-remaster/sprite-v4/scout/identity/Scout.front-idle-master.png \
  --out public/models/scout/
```
exits 0 and produces both output files. Then hand off to Lane 3's contract
checker (below) as the actual pass/fail gate — don't hand-verify the glTF
contract by eye, run the checker.

## Gemini lane (Antigravity, Flash) — verification tooling and docs

Builds the automated gate between Lane 1's output and everyone trusting
it, plus the human-facing skin authoring guide. New files only; the one
shared file it touches gets a single additive line, same handling the
Codex/Gemini/Claude precedent doc already uses for `package.json`.

**Primary files:**
- `scripts/verify-player-chassis-asset.mjs` (new)
- `tests/e2e/player-chassis-visual.spec.js` (new)
- `docs/player-chassis-skin-authoring-guide.md` (new)
- `package.json` (additive only: one new `"verify:chassis"` script entry)

**Tasks:**
1. `scripts/verify-player-chassis-asset.mjs`: headless Node script, takes
   a `.glb` path as an argv, loads it with `GLTFLoader` +
   `SkeletonUtils` from `three/examples/jsm/...` — both ship inside the
   already-installed `three` package (confirmed present at
   `node_modules/three/examples/jsm/loaders/GLTFLoader.js` and
   `.../utils/SkeletonUtils.js`), so **no new dependency needed**, and
   this script has zero dependency on Lane 2's code either. Assert the
   full glTF contract above; non-zero exit and a clear message on any
   violation (e.g. `"expected exactly one animation clip named 'Walk',
   found: idle, walk_v1"`). Write and run it against Lane 1's output as
   soon as it exists.
2. Wire it as `npm run verify:chassis -- public/models/scout/Scout.chassis.glb`
   in `package.json` (the one shared-file touch this lane makes).
3. `docs/player-chassis-skin-authoring-guide.md`: prose guide for a human
   artist, referencing Codex's `Scout.uv-template.png` — which UV region
   is which body part, expected image format/size, and "no Blender or
   code changes needed, just paint and drop the PNG in." This is the
   deliverable that actually answers the user's original "a better way to
   take a base image and change it" ask — write it for a non-programmer.
4. `tests/e2e/player-chassis-visual.spec.js`: Playwright spec that (a)
   loads a standalone harness page rendering the chassis rotating through
   a full 360° next to the current 8-frame Scout atlas at matching scale,
   screenshotting several facings, and (b) with
   `PLAYER_CHASSIS_3D_ENABLED` on, boots the real game and screenshots
   the player at a few facings for scale/silhouette/ground-contact parity
   against the flag-off baseline. **Part (b) depends on Lane 2's feature
   flag and `threeGame.js` integration landing** — write the spec now
   against the contract's function signatures, but leave it `test.skip`
   with a comment pointing at this doc until Lane 2's PR lands, rather
   than blocking on it.

**Definition of done:** `npm run verify:chassis -- <path>` correctly
passes on a contract-valid glb and fails with a legible message on at
least one deliberately broken fixture (wrong clip name, two skinned
meshes) — prove the checker actually checks something. Playwright spec
part (a) runs standalone; part (b) is either passing or clearly skipped
pending Lane 2, never silently absent.

## Claude lane (this session) — runtime integration

The riskiest, least-specified-in-advance piece: getting a live 3D mesh to
render into an existing 2D billboard slot and look native to a game built
entirely around flat sprites. Chosen for this lane because it needs
iterative visual debugging (screenshot, adjust light/camera/render-target
size, repeat) against a codebase I already have full context on from this
session's earlier work, and because it's the one piece that must touch
`src/threeGame.js`, a large shared file no other lane should also be
editing.

**Primary files:**
- `src/playerChassisRenderer.js` (new)
- `src/playerChassisRenderer.test.js` (new — covers `computeChassisYaw`
  at minimum, pure and WebGL-free)
- `src/featureFlags.js` (additive: `PLAYER_CHASSIS_3D_ENABLED = false`)
- `src/threeGame.js` (integration point only — where `playerTextures.SCOUT`
  currently feeds `SpriteMaterial.map`; a single clearly-delimited hunk,
  not a refactor of the surrounding sprite/animation code)

**Tasks:**
1. Build `createChassisSpriteSource`/`computeChassisYaw` against the
   glTF contract, developed and tested against a placeholder glb (a
   trivial single-bone quad satisfying the contract shape) so this lane
   is never blocked waiting on Codex's final art.
2. Offscreen scene: single directional light tuned flat/unlit to match
   existing billboard look (not the main scene's shadow-casting light);
   `OrthographicCamera` at the design doc's derived angle (matching
   `cameraOffset = (8, 10, 8)` → 45° azimuth, ~41° elevation); frustum
   fixed to the chassis's authored bounding box (y: 0 to ~2.0) with a
   small margin, independent of main-world scale.
3. `WebGLRenderTarget`, starting at 128×128, `NearestFilter` both
   directions, no mipmaps. Treat this size as the first tuning knob if
   joints read as broken rather than blocky once real art is in.
4. Wire `PLAYER_CHASSIS_3D_ENABLED` into the Scout sprite path in
   `threeGame.js`: when true, `playerTextures.SCOUT` is replaced by the
   render target's `.texture`; `AnimationMixer` plays `"Walk"` while
   `isMoving`, otherwise held at frame 0 — reusing the `isMoving` boolean
   `updatePlayerSpriteAnimation` already computes, not a new one.
5. Confirm `tintPlayerSprites` (status-effect color tint via
   `SpriteMaterial.color`) still works against the new texture source —
   it multiplies the texture, so it should, but this is exactly the kind
   of cross-system interaction the design doc calls out as unverified;
   check it, don't assume it.
6. Swap in Codex's real `Scout.chassis.glb` once it passes Gemini's
   `verify:chassis` check; re-tune render-target size/lighting against
   real art if needed.

**Definition of done:** `vitest` green including the new
`playerChassisRenderer.test.js`; `eslint` clean; production build
succeeds; with the flag on, the Scout visibly rotates continuously (not
in 8 snaps) while walking in a live browser check, at a scale/position
matching the flag-off baseline; with the flag off, behavior is bit-for-bit
identical to before this lane's changes (prove this — screenshot diff or
equivalent, not "should be fine because it's behind a flag").

## Sequencing

All three lanes start immediately; none blocks on another to *begin*:

1. Codex and Claude both start now — Claude against a placeholder glb.
2. Gemini's `verify:chassis` checker has zero dependency on anyone and
   should run against Codex's real output the moment it exists.
3. Gemini's visual Playwright spec part (b) is written now but stays
   skipped until Claude's `threeGame.js` integration lands.
4. Final step, after all three land: Claude swaps Codex's real,
   Gemini-verified `.glb` into the runtime path (should be a one-line
   URL change if the contract was honored), re-tunes if needed, and
   un-skips Gemini's part (b) spec.

## Coordination note

Same as every prior lane-split doc in this repo: this is a proposal, not
a lock. If an agent is already mid-task on something listed here, keep
that work and treat this doc as descriptive. Run `git status`/`git diff`
before editing any file another lane claims above.
