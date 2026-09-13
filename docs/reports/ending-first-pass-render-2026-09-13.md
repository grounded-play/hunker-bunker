# Ending cinematics — first-pass render

**Date:** 2026-09-13 · Branch `dev/sprint-39`
**Status:** placeholder pass. Not delivery.

---

## What this is

All 20 authored ending shots rendered, encoded, and assembled into the five
`.webm` files the game already looks for — so the five endings that have played
a fallback cutscene since launch now have their own footage, at placeholder
quality.

Run with `scripts/render-first-pass.sh`. Re-run with `--final` for delivery.

## Settings, and why they are not delivery

| | First pass | Delivery |
|---|---|---|
| Samples | **64** | 256 |
| Resolution scale | **50%** (960×540) | 100% (1920×1080) |
| Video bitrate | **1200k** | 4000k |
| Codec | VP9 | VP9 |
| Frame rate | 24 | 24 |

256 samples at full resolution across 893 frames is 15–20 hours of machine time.
A first pass is reviewed for composition, cut rhythm and continuity — none of
which need delivery grain. Draft answers the same questions in roughly a quarter
of the time, and every setting above is a flag away from delivery.

## Pipeline

1. **Render** — `render-ending-shots.mjs --render all --draft`. Renders from the
   five production scenes, selecting a camera per shot. The per-shot `.blend`
   shells are not used: they contain no lights and no world, and render black.
2. **Encode per shot** — one VP9 clip per shot. Frame pattern is `%04d`, matching
   Blender's `####` padding; a mismatch makes ffmpeg find zero frames and write
   an empty clip without failing visibly.
3. **Concat per ending** — `concat-ending-clips.mjs`, concat demuxer with
   `-c copy`. The shots were just encoded with identical settings, so
   re-encoding would be a second generation loss for nothing. Shot order comes
   from the manifest (story order), never from filename sort.

## What the footage contains

Everything built this sprint is in these frames:

- **Room shells** — floor, four walls and ceiling for interiors; oversized
  ground only for exteriors, so the sky stays visible. Before this the sets were
  props floating in void, with no surface for light or shadow to land on.
- **Game-derived space HDRI** — exteriors are lit by the game's own sky
  paintings, composed to a 2:1 panorama and promoted to a 4096×2048 scene-linear
  EXR at 1.8× gain.
- **Three-layer lighting** — environment, practical key, and derived separation
  rims across all five scenes.
- **Enhanced game materials** — pixel-art textures at `Closest` filtering,
  roughness break-up, and emissive screens driven by their own base texture.
- **Corrected optics** — AgX Punchy at exposure 0.0, lens-band apertures, 7-blade
  iris, focus planes on the subject rather than a flat 5 m.

## Known, and deliberately not fixed before this pass

- **EH-03 and EH-04** frame their nearest prop at 8.48 m and 27.29 m on wide
  lenses. They render, but they render mostly empty. EH-04 is also the one shot
  the brief never gave a focal length, so its 24 mm is a generator fallback.
- **FC-01** sits 0.43 m from a pipe prop on a 50 mm — effectively inside it.
- **MI-01** is weighted hard right with the left of frame unlit.

These are composition decisions, not defects in the pipeline, and a placeholder
pass is exactly the artifact that should inform them. Fixing them by guess
before anyone had watched the cut would have been the wrong order.

## Verification

`scripts/render-shot-tests.sh` renders one mid-shot frame per shot and flags any
under 1 MB as a likely black frame. The last full run before this pass returned
20 of 20 above threshold, 1.29–2.72 MB.

That check exists because three separate defects this sprint produced exit-0
renders that were wrong: an empty sprite atlas, the black per-shot shells, and a
compositor node group that blacked every frame while reporting success.

---

## Preserving passes

`scripts/archive-prerender-pass.sh [label]` snapshots the current scenes, test
frames and rendered frames into `art/source/blender-prerenders/archive/<stamp>-<label>/`
with a `MANIFEST.txt` recording the commit, branch and dirty-path count that
produced it.

It uses **hardlinks**, so a snapshot is byte-identical by construction rather
than by copy, and costs almost nothing: the tree measures 795 MB deduplicated
against 1.6 GB if the links were real copies. Blender writes a new inode when it
saves, so an archived link keeps the old bytes instead of following the edit.

This matters because a rebuild is not reversible from the generator alone — the
generator has moved on, so it can no longer produce the scene it produced an
hour ago. The first snapshot is `20260913-120517-pre-viewport-rework`: 5 scenes,
20 test frames, 686 rendered frames.

## Viewport placement

The aperture goes in the wall each set's cameras actually face, chosen by
averaging every shot camera's forward vector. Averaging rather than taking the
first camera: three cameras facing east and one facing west should still put the
window east.

A first version always cut the north wall, and `CAM_MI_02` faces elsewhere, so
that shot saw no difference and stayed dark — a window nobody is pointed at is
decoration. Measured placement now:

| Scene | Viewport wall |
|---|---|
| mothership_infection | S |
| alien_exodus | S |
| outed_escape | S |
| failed_carrier | S |
| empty_husk | N |

`empty_husk` differing is the check working: its cameras genuinely face the
other way.
