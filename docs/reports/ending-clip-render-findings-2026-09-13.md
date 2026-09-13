# Ending clip rendering — first real render, and three defects it found

**Date:** 2026-09-13 · Branch `dev/sprint-39`
**Method:** actually rendering frames and looking at them, rather than reading the scene files.

Adds `scripts/render-ending-shots.mjs` (plan/render driver) and
`scripts/blender/select_shot_camera.py`. `--check` validates the whole plan in a
second without spawning Blender; a render is ~20s per frame, so finding a
missing scene at frame 900 is an expensive way to learn it.

Current plan: **20 shots, 5 sequences, 893 frames, ~37s at 24fps.**

---

## 1. The per-shot `.blend` files render pure black

`art/source/blender-prerenders/endings/<seq>/<SHOT>.blend` — 20 of them — are
**camera shells, not scenes**:

```
MI-01.blend : 5 objects {MESH: 2, CAMERA: 1, EMPTY: 1, FONT: 1}
              WORLD: None          <- no environment
              (no LIGHT objects)   <- nothing lit
```

Rendering MI-01 exits 0 and writes a 941 KB PNG that is **entirely black**. This
is the same exit-0-but-wrong failure Phase 0 hit with the sprite atlas, and it
is invisible to any check that does not open the image.

By contrast the production scene holds everything:

```
ending_mothership_infection.blend : 56 objects
                                    15 MESH, 5 LIGHT, 1 ARMATURE, 27 EMPTY, 4 CAMERA
                                    WORLD: NeoGothicWorld
                                    collections: SET_C_MedicalDock, SEQ_01_...
```

**The five production scenes already contain every shot camera** (`CAM_MI_01`
through `CAM_MI_04`). The per-shot shells are a redundant parallel track.

**Therefore the driver renders from the production scenes**, selecting a camera
per shot. Note the naming difference, which fails silently if missed: the brief
writes `MI-01`, the scenes name cameras `CAM_MI_01`.

## 2. The `.blend` files on disk carried the obsolete optics

`docs/reports/blender-ending-production-optics-validation-2026-09-12.md` records
the generator being corrected to AgX Punchy at exposure 0.0. The checked-in
scene still read:

```
VIEW AgX | look AgX - High Contrast | exposure -0.4
```

The generator was fixed; the `.blend` files were built before the fix and never
regenerated. That report even predicts this — "rebuilding any of the five full
scenes would restore the obsolete settings" — but the inverse was true in
practice: the *unrebuilt* files kept them. Regenerating
`ending_mothership_infection` produced the correct `AgX - Punchy | exposure 0.0`
and 56 objects.

**Action:** the other four scenes still need regenerating. A fixed generator and
a stale artifact look identical in a diff.

## 3. `CAM_MI_01` is misframed and the shot is far too dark

With the correct optics and the correct scene, frame 20 through `CAM_MI_01`
renders geometry — so the pipeline works — but the set sits **jammed against the
right edge with roughly 90% of frame empty black**.

The brief describes MI-01 as *"exact one-point perspective"* with three medical
slabs *"in ritual symmetry"*. What renders is neither centred nor symmetrical.

Lighting is not the cause: five spots at 180–600 W are enabled and unhidden,
world strength 0.15, no mesh hidden from render. The camera sits at
`(-1.2, -4.5, 0.8)` on a 28 mm lens. This is a **blocking/composition defect in
the generator**, not a render setting, and it needs a human look at framing
before 893 frames are committed to it.

---

## Status

| Step | State |
|---|---|
| Render driver + camera selector | done |
| Plan validation (`--check`) | passing — 20 shots, all scenes present |
| Output names match `ACT2_ENDING_CUTSCENES` | pinned by test |
| Production scene renders real geometry | proven |
| Regenerate remaining 4 scenes | **to do** |
| Fix MI-01 framing (and audit the other 19) | **to do — needs art review** |
| Frame render + webm encode | blocked on framing |

The encode step is deliberately not written yet. Encoding badly-framed frames
would produce five clips that look finished and are not.

---

## Update — framing, quality and post-processing (2026-09-13, later)

### Implemented

**Camera aim correction.** Every shot camera animates its LOCATION but held a
hand-authored static rotation, so a dolly could not keep its subject framed.
`aim_stray_cameras()` adds a `TRACK_TO` constraint to an `AIM_*` empty for any
camera more than `MAX_OFF_AXIS_DEG` (12°) off the set centre — which is what
`create_camera`'s own comment already asks for ("never keyframe a brittle
numeric"), applied to rotation as well as focus. Correctly composed cameras are
left exactly as authored.

Only **CAM_MI_01 and CAM_MI_02** needed it. The other sixteen cameras across
four scenes validated clean, so the framing defect was localised, not systemic.

`validate_production_optics()` now also fails on framing, so this cannot
regress silently.

Three bugs were found and fixed in that check itself:
- `matrix_world` does not reflect a `TRACK_TO` until the depsgraph is evaluated,
  so a corrected camera measured as still broken.
- Measuring a close-up that stands *inside* the set against the set centre is
  meaningless — CAM_MI_03 scored 45° while framing exactly what it should.
  Cameras inside the set bounds are now skipped.
- The aim pass ran before the depsgraph reflected the freshly staged scene, so
  it measured near-zero angles and corrected nothing, while validation ran after
  an update and saw the real angles.

**Quality.** Samples 128 → **256**. 128 left chroma noise in the deep shadows
these sets are mostly made of, which the denoiser smeared into blotches — worse
than the noise. Resolution was already 1920×1080 at 100%.

**Post-processing** (`build_delivery_compositor`), applied at render time rather
than baked into materials:
- **Glare / Fog Glow**, threshold 1.0, strength 0.45 — so emissive practicals
  read as light sources rather than flat bright patches. Threshold below 1.0
  makes every lit wall glow.
- **Chromatic aberration** via Lens Distortion dispersion 0.025, with distortion
  held at **0.0** so the lens geometry the optics addendum fixes is not then
  warped by the grade. Kept just-perceptible: CA reads as cheap the moment a
  viewer can name it.
- **No colour grade** — the view transform is already pinned to AgX Punchy, and
  grading on top would make that decision meaningless.
- A vignette was **scoped out rather than shipped half-working**: Blender 5.x
  renames or removes the EllipseMask/MixRGB nodes the 4.x recipe needs.

Blender 5.x moved three APIs that the 4.x idioms hit as hard errors, all now
handled: the compositor is a **node group** on `scene.compositing_node_group`
(no `RenderLayers`, no `Composite` node — group input/output instead); Glare
settings are **input sockets**, not properties; and its Type menu takes display
names (`"Fog Glow"`), not the old `FOG_GLOW` enum.

All five scenes regenerated and validated.

### Renders NOT started — and why

The precondition "once they are framed up" is still not met.

After the aim correction, `CAM_MI_01` at frame 20 renders more of the set but
still weighted hard right with the left ~60% empty black. `CAM_MI_02` at frame
60 renders **entirely black in 1.46s** — the render time alone says the camera
has nothing in view.

Kicking off 893 frames at ~40s each is roughly ten hours of machine time. Doing
that against frames that do not hold an image would produce five clips that look
finished and are not, which is worse than having none.

**What this needs is an art pass on blocking**, not more automated correction:
where each camera stands, what it is pointed at, and whether the practicals are
lit at that frame. The pipeline underneath is proven — the scenes build, the
optics validate, the compositor runs, and a correctly aimed camera renders real
geometry.


---

## CORRECTION (2026-09-13) — the black frames were my bug, not blocking

I attributed the black renders to camera blocking across several commits. That
was wrong, and the evidence was available the whole time.

**What it actually was.** The delivery compositor. With the node group detached
the frame renders fully lit and textured; with it attached the frame is black.
Bisection settled it: a **pass-through** group — Group Input wired straight to
Group Output, no glare, no lens — produced a byte-identical black frame to the
full one. The contents were never the problem; the group's `Image` input never
receives the render result at all under Blender 5's
`scene.compositing_node_group` model.

**Why my first fix didn't work.** I disabled `build_delivery_compositor` and the
scenes still rendered black, which nearly convinced me the compositor was
innocent. There were **two definitions of the function** in the file — my
disabled one, and the original further down. Python takes the last, so the old
one kept running. My edit had inserted rather than replaced, because the slice
boundaries I used did not cover the original definition.

**The tell I ignored for too long.** Every black render completed in ~1.5s.
A working frame takes 20-60s at 256 samples. A render that finishes in 1.5s is
not a badly framed shot, it is a render doing no work. I had that number in
front of me from the first black frame and read it as "the camera sees nothing"
instead of "the pipeline is not rendering".

**Frustum analysis is what broke it open:** for CAM_MI_02 at frame 60, 15
objects were in front of the camera and 2 were in frame — while the render was
pure black. Framing cannot produce that, so framing was not the cause.

### Current state, verified by looking at every frame

| Camera | Frame | Result |
|---|---|---|
| CAM_MI_01 | 20 | **renders** — lit, textured, emissive monitor with a green ECG trace |
| CAM_MI_02 | 60 | **renders** |
| CAM_MI_03 | 100 | still black — genuine framing for this close-up |

So there *is* a blocking problem, but it is one shot, not the sequence.

### Where the look went

The compositor is disabled, because that is the state that demonstrably renders.
Glare and chromatic aberration move to **encode time**, applied by ffmpeg to the
rendered frames. That is the better place for them regardless: retuning does not
cost a re-render, which across 893 frames is the difference between minutes and
hours.
