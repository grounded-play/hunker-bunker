# Cinematic optics addendum

Companion to
[`blender-ending-scene-blocks-and-shot-list-2026-09-12.md`](blender-ending-scene-blocks-and-shot-list-2026-09-12.md).

That brief specifies lens *bands* and focus *intent* — "65-100 mm for
surveillance, suspicion, skin", "shallow depth of field only to reveal
information through a deliberate rack focus". It does not specify an aperture,
a sensor, a circle of confusion, or how a focus pull is rigged. Those are the
numbers that decide whether a shot is achievable, and one of them turns out to
break a shot already in the list.

Kept separate from the brief on purpose: the brief is being actively authored,
and this is a technical lane that can settle independently.

## Depth of field, computed

Full-frame 36 mm sensor, circle of confusion 0.029 mm — matching Blender's
default `sensor_width` so no conversion is needed.

| Lens | f/ | Subject | Near | Far | **Total DoF** |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 28 mm | 5.6 | 4.0 m | 2.19 m | 22.57 m | **20.4 m** |
| 28 mm | 4.0 | 3.0 m | 2.08 m | 5.35 m | **3.27 m** |
| 35 mm | 4.0 | 3.0 m | 2.34 m | 4.17 m | **1.83 m** |
| 50 mm | 2.8 | 2.5 m | 2.32 m | 2.72 m | **0.40 m** |
| 50 mm | 2.0 | 2.0 m | 1.91 m | 2.09 m | **0.18 m** |
| 85 mm | 2.8 | 1.5 m | 1.48 m | 1.52 m | **0.048 m** |
| 100 mm | 2.8 | 1.2 m | 1.19 m | 1.21 m | **0.021 m** |
| 100 mm | 4.0 | 1.2 m | 1.18 m | 1.22 m | **0.031 m** |

### This breaks MI-03 as written

The brief specifies MI-03 as *"100 mm collar macro, shallow focus, creeping 3%
push"*. At 100 mm f/2.8 on a 1.2 m subject there is **21 mm of usable depth**.
A 3% push moves the camera roughly 36 mm — **further than the entire depth of
field**. The collar pulse the shot exists to show would drift out of focus
during the move.

Three fixes, any of which works:

1. **Parent focus to the subject** (recommended, and now the default in the
   generator). `focus_object` tracks the collar empty, so the plane follows the
   push and the shot is rigged rather than lucky.
2. **Stop down to f/5.6** — 42 mm of depth, still unmistakably shallow at
   100 mm, and survives the push without rigging.
3. **Push in less**, or push on a 65 mm and crop.

The same arithmetic applies to any 85 mm+ shot with camera movement. It is not a
reason to avoid long lenses; it is a reason to rig focus rather than dial a
distance once and hope.

## Default aperture per lens band

Chosen so geography stays legible, per the brief's own instruction that
"passenger occupancy, major silhouettes, and action geography should not
disappear into fashionable blur".

| Band | Default f/ | Rationale |
| --- | ---: | --- |
| 18–32 mm | **5.6** | Architecture shots. Metres of depth; the nave reads all the way back. |
| 33–60 mm | **4.0** | Ensemble blocking. Roughly 1.8 m of depth holds two rows of seats. |
| 61–90 mm | **2.8** | Suspicion and skin. ~50 mm of depth — one feature, deliberately. |
| 91 mm+ | **4.0** | Macro inserts. Deliberately *not* 2.8: see MI-03 above. |

Bokeh shape: **7 aperture blades, `aperture_ratio` 1.0**. Blender's default of 0
blades renders perfectly circular, obviously synthetic bokeh. A 7-blade iris is
what an actual lens on this kind of production would give, and it matches the
brief's instruction that the work "feel authored in camera and light before
compositing effects are added". Anamorphic squeeze is deliberately *not* used —
the brief bans excessive anamorphic flare, and squeezed bokeh reads as the same
affectation.

## The view transform is currently unspecified — and it defaults to AgX

Blender 4.x+ ships **AgX** as the default view transform, and the brief pins
"color management" without naming one. Whoever renders first therefore decides
the entire look by accident.

This matters more than usual here. AgX aggressively desaturates and rolls off
highlights toward white — it is built to tame exactly the kind of saturated
emissive practicals this project is full of. A sodium-orange warning rotator or
a green infection pulse that reads as vivid in the viewport will render notably
duller through AgX.

| Transform | Effect on this material |
| --- | --- |
| **AgX** | Safe, filmic, desaturates the coloured practicals that carry the palette |
| **Filmic** | Older, flatter, less highlight rolloff, keeps more chroma |
| **Standard** | No rolloff; emissives clip hard to white |

**Recommendation: AgX with `look = "AgX - Punchy"`, exposure 0.0.** It keeps the
highlight discipline the render baseline asks for while restoring the chroma the
palette depends on. The point is not which is correct — it is that it must be
*chosen and pinned in every scene*, and it currently is not. The generator now
writes it explicitly.

## Focus pulls, rigged not dialled

A rack focus keyframed onto `focus_distance` breaks the moment the camera or
subject moves, and every shot in this brief has camera movement.

Each generated scene therefore ships with:

- `FOCUS_<shot>` — an empty, at the subject, with `camera.dof.focus_object`
  bound to it. Move the empty, not the number.
- A rack focus is then an **animation of the empty between two subjects**,
  which survives any camera move and reads correctly in the viewport.
- `focus_distance` is left as the fallback for locked-off inserts only.

## Volumetrics for the cathedral light

The brief's central image is a desecrated cathedral, which means shafts. It
specifies volumetric *noise* handling but no density.

- Scene volume density **0.002–0.006** for hangar and nave scale. Above ~0.01 at
  SET-C's 24 m depth the far wall fogs out and the one-point perspective the
  shot depends on collapses.
- Anisotropy **0.3–0.5**: forward scattering, so shafts brighten toward the
  source and read as directional rather than as ambient haze.
- Volumetric step rate 0.5 on final passes; 1.0 for greybox.
- Shafts must be **cut by geometry**, not faked by a cone mesh — the ribs and
  bed frames doing the occluding is what makes the space feel built.

## Lens imperfection, in small amounts

The brief bans "generic digital chromatic aberration" and drone-like movement.
The counterpart is that a perfectly clean virtual camera reads as CG. Cheap,
motivated imperfection:

- **Vignette**: subtle, in the compositor, radial, ~0.85 at the corners. Not a
  black frame.
- **Barrel distortion**: ≤1% on the 18–28 mm shots only. Wide rectilinear lenses
  do this; its absence is a tell.
- **Handheld float**: for SET-B and post-fracture `FAILED_CARRIER` only —
  amplitude under 0.5° rotation and 5 mm translation, sub-1 Hz. Enough to feel
  operated, far below the "unmotivated orbiting" the brief rejects.
- **Sensor-plane bloom** rather than a lens-flare overlay, so highlights bloom
  where the emissives actually are.

## What the generator now does automatically

`scripts/blender/build_ending_shot_scenes.py` applies all of the above per shot:
DoF on, f-stop from the lens band, 7 blades, focus empty bound and parented,
view transform pinned, exposure pinned, volumetric defaults, and a 2.39:1
composition guide matching the brief's safe-area rule. Each value is recorded in
the scene's custom properties, so a `.blend` states its own optics rather than
relying on anyone's memory.
