# Phase 0 report — Scout walk, east-facing strip

> Lives in `docs/` rather than `art/source/blender-prerenders/reports/` as the
> plan suggested: `art/source/` is gitignored, so a report written there is
> invisible to everyone but the machine that produced it. The rendered frames,
> strip and contact sheet do stay under `art/source/` and are reproducible with
> the commands below.

Against `docs/planning/blender-prerendered-animation-plan-2026-09-12.md`.

## Baseline audit (as the plan requires)

```
Blender 5.2.1 LTS           on PATH
art/source FBX / GLB        259 / 136
Scout source                Scouting.fbx + Scouting-scout-working.blend + animation packs
Scout runtime layout        4x4 grid, 2 walk frames  (legacy)
Tank runtime layout         8x8 grid, 8 walk frames, footsteps [0,4]  (the target)
Tank.walk_v4.png            2048x2048 RGBA, 256px cells
```

Tank is the reference implementation, so the contract was read off it rather
than invented. That is now `src/spriteAtlasContract.js`, with 15 tests.

## Deliverables

| Plan item | State |
| --- | --- |
| pipeline schema + manifest | `src/spriteAtlasContract.js` (+ `frames.json` per render) |
| deterministic render script | `scripts/blender/render_sprite_atlas.py` |
| atlas assembler + validator | `scripts/blender/assemble_sprite_atlas.py`, `validateAtlasManifest` |
| unit tests | 15, in `src/spriteAtlasContract.test.js` |
| Scout east 8-frame strip | `art/source/blender-prerenders/scout/walk_E_strip.png` |
| contact sheet | `art/source/blender-prerenders/scout/walk_contact_sheet.png` |

## Three defects found by rendering rather than by reading

Each produced a **successful** render — exit code 0 — and a wrong result. None
would have been caught without inspecting the pixels.

**1. Empty frames.** The first run produced eight fully transparent PNGs. The
Mixamo animation packs are armature-only; importing a clip on its own yields a
rig with no mesh. The character FBX must be imported for the mesh and only the
*action* taken from the clip — the same split `build_mixamo_scout_glb.py`
already uses.

**2. Bind pose.** After the mesh appeared, all eight frames were the same pose.
Blender 4.4+ made actions *slotted*: assigning `animation_data.action` leaves
`action_slot` unbound and the rig evaluates to its rest pose, silently. The slot
must be bound explicitly. (Same change is why `Action.fcurves` no longer exists
on 5.x — the data now lives under layers/strips/channelbags, which is worth
knowing before touching any other Blender script in this repo.)

**3. Root motion.** With the walk animating, the character travelled across the
cell — centre-X drifting 77px and clipping the bottom edge by frame 6. Mixamo
locomotion moves forward in world space. Horizontal travel is now cancelled per
frame; vertical is deliberately left alone, because the bob is part of the walk
and flattening it produces a glide.

## Measured results

```
frames                 8, all distinct (0 duplicates)
height fill            165-183px of 256   (71%)
clipped frames         0/8
centre-X drift         13.5px   (arm/leg swing; was 77px before the fix)
```

Framing was tuned twice: 2.6 ortho filled only ~55% of the cell and wasted
resolution; 1.75 clipped the feet, because a ~1.8m figure does not fit a
1.75-unit orthographic box at all. 2.1 with the target at z=0.95 is the setting
that holds across the cycle.

## Determinism — bounded, not exact

The plan allows byte-identical frames *or a documented, bounded reason*. Two
clean runs from identical inputs are **not** byte-identical. Measured:

```
differing pixels          11 / 524,288   (0.002%)
largest channel delta     1 / 255
```

That is floating-point accumulation order in Cycles, not scene drift — seed,
sample count, adaptive sampling and denoising are all pinned. The bound to
enforce in CI is therefore **≤1/255 per channel and <0.01% of pixels**, not
`md5sum`. A regression that changes lighting, framing or pose will blow through
that bound immediately; a rounding difference will not.

## Not yet done

- Only the east row exists. The contact sheet leaves the other seven rows
  transparent on purpose, so a partial atlas is visibly partial rather than
  silently reusing a facing — which is exactly the defect the live Engineer
  sheet has.
- ~~The direction convention is unverified.~~ **Settled, and the first draft
  was wrong.** `getDirectionIndexFromScreenAxes` computes
  `atan2(screenY, screenX)` and rounds to an octant, so screen-right — east —
  is index 0. The draft started rows at SE, one row out, which would have
  produced a perfectly consistent and entirely rotated atlas. Now
  `E,SE,S,SW,W,NW,N,NE`, matching both the runtime and
  `scripts/blender/manifests/scout-walk.json`.
- No runtime layout entry yet; Scout still points at the legacy 4x4 sheet.
