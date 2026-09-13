# Blender ending production optics validation

Status: implemented and headless-validated | Branch: `dev/sprint-39` | Date: 2026-09-12

## Finding

The shot-shell generator already followed the approved cinematic optics, but
the production set/character generator did not. `build_ending_scenes.py` still
created 1.65:1 anamorphic bokeh, used the early shot-list apertures as low as
f/1.4, filled the world at density 0.035, and selected AgX High Contrast at
-0.4 exposure. Those choices contradicted the locked spherical-iris, lens-band,
0.002–0.006 volume-density, and AgX Punchy rules in
`docs/planning/blender-cinematic-optics-2026-09-12.md`.

This mattered in production rather than only on paper: rebuilding any of the
five full scenes would restore the obsolete settings, and moving close-up
cameras had no focus object to keep the story detail sharp.

## Implemented

`scripts/blender/build_ending_scenes.py` now:

- uses the approved lens-band apertures: f/5.6 through 32 mm, f/4 through
  60 mm, f/2.8 through 90 mm, and f/4 above 90 mm;
- uses a seven-blade spherical iris (`aperture_ratio = 1.0`);
- gives every `CAM_*` camera a named `FOCUS_*` empty parented at a stable
  starting plane, ready to re-parent or animate for authored rack focuses;
- pins AgX Punchy at exposure 0.0;
- reduces global volume density to 0.004 and anisotropy to 0.4;
- stamps the optics specification and values into scene custom properties;
- validates every production camera before saving and fails the build on
  missing focus targets, incorrect aperture, wrong blade count, anamorphic
  ratio, or color-management drift.

The shot-list f/stops remain preserved as camera custom-property production
history. They no longer override the later optics addendum.

## Verification

```bash
python3 -m py_compile scripts/blender/build_ending_scenes.py

scene_tmp=$(mktemp -d /tmp/hb-ending-scene.XXXXXX)
blender --background --factory-startup \
  --python scripts/blender/build_ending_scenes.py -- \
  --scene alien_exodus --output-dir "$scene_tmp"
```

Blender 5.2.1 LTS rebuilt the highest-priority `ALIEN_EXODUS` production scene
with 65 objects and reported `optics validated for 4 cameras`. The generated
45 MB `.blend` stayed in the temporary validation directory; production source
scenes remain ignored and are not bundled or committed.

## Remaining film-production gates

1. Render and review the `ALIEN_EXODUS` 960×540 animatic, then `EMPTY_HUSK`, as
   ordered by the shot brief.
2. Author the per-shot focus-target animation (especially AE-03 and MI-03);
   the generator now supplies the correct rigs but does not invent narrative
   focus pulls.
3. Approve all five animatics before final materials, simulations, or 1080p
   Cycles frame sequences.
4. Audition and promote only provenance-cleared cinematic audio, then mix it
   against approved picture lock.
