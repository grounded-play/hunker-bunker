# Player Chassis 3D Vertical Slice — Design

**Date:** 2026-07-26
**Status:** Approved for implementation
**Scope:** Scout only, walk animation only. Tank, Engineer, non-walk
animations, additional skins, and enemy/prop conversion are explicit
follow-ups, not part of this slice.

## Problem

Eight-direction hand/AI-generated sprite sheets (`art/source/art-remaster/`
v2 through v5) have not converged. Each version added more specification
rigor against a generation method that cannot hold geometric consistency:
v4's frame spec is a 64-cell "anatomical truth table" with invented
color-coded limb markers to force a diffusion model not to swap legs; the
`rejected-candidates/` directories are wrong grid shapes and scrambled
facing order; `src/spriteAtlasRuntime.js` exists specifically to sniff
transparent gaps at runtime because the generated grid cannot be trusted
positionally; v5's own production rule — "render and approve one frame at
a time; assemble only accepted frames" — requires 64 hand-approved frames
per class, and that cost multiplies per skin. Skins are not expensive on
this path; they are impractical.

## Decision

Replace the per-class flat atlas with **one rigged 3D chassis per class,
rendered live into the existing sprite slot.** Concretely:

1. A low-poly, rigid-rigged humanoid mesh is scripted (not hand-modeled or
   AI-generated) in Blender, textured by projecting the class's existing
   front-idle master art onto it, and exported as glTF.
2. At runtime, that mesh is loaded as a real `THREE.SkinnedMesh`, given a
   continuous world-space facing angle (not snapped to 8 octants), and
   animated with a real `AnimationMixer`.
3. That live mesh is never drawn directly into the main scene. Each frame
   it is rendered, via its own camera, into a small `WebGLRenderTarget`
   with `NearestFilter`. That texture becomes `SpriteMaterial.map` on the
   player's existing `THREE.Sprite` — the same object the game already
   positions, glows, and billboards.

This gets full 3D rotation and instant runtime skin-swapping (a texture
change, not a re-render) while keeping the on-screen result pixel-chunky
like the rest of the game's flat billboard art, and while changing nothing
about how the rest of the engine treats the player sprite.

## Why not the alternatives

- **Image-to-3D generation** (Hyper3D/Hunyuan, available on the Blender
  MCP bridge) from the front-idle master was considered as the primary
  path and rejected for the *foundation*: generated topology is typically
  asymmetric and messy, and auto-rigging hard-surface armor (the Scout's
  helmet seams, kneepads, pauldrons) tends to deform badly at hips and
  shoulders — trading one unreliable generative step for another. It
  remains a legitimate way to get a rough shape *reference* to model
  against by hand, but is not the chassis-production method.
- **Hand-modeling** in Blender directly would give the best quality but
  needs real 3D modeling skill turnaround per class/skin and doesn't
  solve "let me change a base image and get a new character," which is
  the actual ask.
- **Drawing the 3D mesh straight into the main scene**, lit normally, was
  rejected because every other actor, prop, and door in this game is a
  flat painted billboard; a normally-lit 3D mesh among them would look
  pasted in. Pixel-snapping through an offscreen render is what keeps it
  visually native to the game it's joining.

## Rest-pose and rotation contract

This is the single most bug-prone seam between the asset (Blender) and
the runtime (Three.js), so it is specified exactly rather than left to
convention:

- **The chassis's bind/rest pose must face world **+X**.** Concretely: in
  a straight-down view of the rigged mesh at identity rotation, the
  character's front (chest/visor) points toward increasing X.
- **Verification is a screenshot, not an argument about axis
  conventions.** Render the bind pose from directly above; the character
  must visibly face the right edge of the frame. Do this before export,
  not after debugging a wrong-facing character in-game.
- **Runtime rotation formula**, given already in the engine's own
  movement code (`getFacingRow`, `src/threeGame.js:13113`):

  ```js
  const angle = Math.atan2(axisZ, axisX); // existing convention, unchanged
  mesh.rotation.y = -angle;               // derived for a +X-facing rest pose
  ```

  Derivation: Three.js's rotation.y sends local +X to world
  `(cos θ, 0, -sin θ)`. Matching that to the desired facing vector
  `(cos(angle), sin(angle))` requires `sin θ = -sin(angle)`, i.e.
  `θ = -angle`. If a future chassis is authored facing a different axis,
  the offset changes; it must be re-derived the same way, not guessed.

## Rig

~13 bones: hips (root) → spine → chest → head; chest → shoulder → upper
arm → forearm → hand ×2; hips → thigh → shin → foot ×2. Each mesh segment
is **100%-weighted to exactly one bone** — no smooth blending. This is a
deliberate simplicity choice: it removes the auto-rig deformation failure
mode entirely (there is nothing to deform badly; boxes rotate rigidly
about their bone), and pixel-snap downsampling hides the resulting hard
seams at joints.

The chest bone is kept as its own node in the chain (not merged into
spine) even though this slice never uses it independently, because the
game's existing 2D system already runs legs and torso on independent
facing angles for aim-while-strafing
(`updatePlayerSpriteAnimation`/`torsoFacingRow`, `src/threeGame.js:13053`).
Giving chest its own bone now costs nothing; retrofitting a merged rig
later to split it would mean re-rigging. **This slice does not implement
independent torso yaw** — aiming is out of scope here — but the rig does
not block it later.

## Texture: front-projected wrap, named limitation

The existing `Scout.front-idle-master.png` is projected onto the mesh
through an orthographic camera matching the master art's own front view
(`bpy.ops.uv.project_from_view` or equivalent). This is the literal
mechanism behind "wrap a base image onto a moving 3D object."

**What this does not solve:** a single front photograph has no side or
back information. Side/back faces get edge-extended pixels from the front
projection, not true texture — they will look flatter and less detailed
than the front, especially once the character rotates in profile. This is
a known, accepted limitation of front-photo-wrapped low-poly work, not a
defect to chase in this slice. A real fix means generating side/back
reference art (there is already a `motion-reference-v5/` convention doing
exactly this for the sprite pipeline) and adding more projection angles —
a follow-up, not this slice.

**The actual pipeline improvement being delivered:** the build script also
renders a labelled UV-template image. A new skin is a PNG painted against
that template in any 2D editor — no Blender, no code, no touching anyone
else's work. This is the direct answer to "a better way to take a base
image I can add and change."

## Runtime rendering pipeline

- Offscreen scene, its own single directional light (tuned to match the
  flat, mostly-unlit look of the existing billboard art, not the main
  scene's shadow-casting light).
- **Orthographic** offscreen camera (matching the main scene's own
  `OrthographicCamera`, `src/threeGame.js:950`), positioned at the same
  relative angle the main camera already uses
  (`cameraOffset = (8, 10, 8)`, i.e. 45° azimuth, ~41° elevation from
  horizontal), looking at the chassis.
- The offscreen scene's scale is independent of the main world's scale —
  it only has to frame one chassis. Chassis is authored at a fixed
  reference height (feet at y=0, head top at y=2.0 in its own space); the
  offscreen camera's frustum is fixed to frame that with a small margin.
  This decouples asset authoring from main-world unit scale entirely.
- Render target: small and fixed (starting point ~128×128), `NearestFilter`
  for both `minFilter`/`magFilter`, no mipmaps.
- That target's `.texture` is assigned to the existing player
  `SpriteMaterial.map`. The final on-screen size/scale of the resulting
  sprite plane is tuned empirically against the current atlas sprite at
  the same in-game zoom — a visual calibration step, not a formula, done
  once during integration.
- `AnimationMixer` plays the `"Walk"` clip while `isMoving` is true (the
  existing boolean already computed in `updatePlayerSpriteAnimation`);
  otherwise the mixer is paused/reset to frame 0, matching the current
  idle-is-frame-0 behavior.

## glTF contract (the seam between Lane 1's asset and Lane 2's code)

A `.glb` satisfying this contract can be produced by anyone and consumed
by the runtime without either side reading the other's source:

- Exactly one `SkinnedMesh` in the exported scene.
- Exactly one animation clip, named exactly `"Walk"`, looping.
- Bind pose faces world +X (see Rest-pose contract above).
- Bounding box: feet at local y=0, head top at local y≈2.0.
- No extra cameras/lights baked into the export (offscreen scene supplies
  its own).

Any `.glb` meeting this contract — including a placeholder cube-and-rig
built for testing — is sufficient for Lane 2 to build and test the
runtime pipeline without waiting on final art.

## Feature flag and integration point

`src/featureFlags.js` gains `PLAYER_CHASSIS_3D_ENABLED = false`. When
false, the existing atlas-sprite path is completely unchanged. When true,
Scout's sprite texture is sourced from the render-to-texture pipeline
instead of `playerTextures.SCOUT`. Tank and Engineer are unaffected
regardless of the flag in this slice — only Scout is wired.

## Explicitly out of scope for this slice

- Aim/torso independent facing (rig supports it later; not built now).
- Tank, Engineer.
- Any animation besides walking (no idle-breathing, no death, no hit
  react).
- Additional skins beyond proving the texture-swap mechanism works.
- Any change to enemies, props, or non-player billboards.
- Side/back texture quality — named as a limitation, not solved here.

## Verification plan

- **Headless, asset side:** a Node script loads the `.glb` with the same
  `GLTFLoader`/`SkeletonUtils` the runtime uses and asserts the contract
  above (one skinned mesh, one clip named `Walk`, bounding box in range).
  This is the automatable gate between Lane 1 delivering and Lane 2/3
  trusting the asset.
- **Headless, runtime side:** existing `vitest` coverage for any pure
  logic extracted (e.g. the rotation-formula derivation, if pulled into a
  small testable function rather than inlined).
- **Visual:** a standalone harness page rendering the chassis rotating
  through a full 360°, side-by-side with the current 8-frame Scout atlas
  at matching scale, screenshotted at several facings. Then, in-game with
  the feature flag on, screenshots at a few facings compared against the
  flag-off baseline for scale/silhouette/position parity (glow anchor,
  ground contact, HUD).

## Risks carried forward, not hidden

- Front-only texture data means profile/rear views will read as less
  detailed. Accepted for this slice; tracked as a named follow-up.
- Rigid (non-smooth) skinning will show hard faceting at joints even
  after pixel-snapping if the offscreen render resolution is tuned too
  high. The render target size is a tuning parameter, not fixed in stone
  at 128×128 — Lane 2 should treat it as the first thing to adjust if
  joints read as broken rather than blocky.
- This is the first 3D mesh in a project whose renderer, camera, and
  lighting were built entirely around flat billboards. Unknown
  interactions with existing systems (fog-of-war, tinting on status
  effects via `tintPlayerSprites`, damage-flash shaders) are possible and
  are Lane 2's job to find, not assumed away here.
