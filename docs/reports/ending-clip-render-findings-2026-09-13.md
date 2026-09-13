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
