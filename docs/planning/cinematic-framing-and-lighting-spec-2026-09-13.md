# Cinematic framing and background lighting — the spec the shots are held to

**Date:** 2026-09-13 · Branch `dev/sprint-39`
**Goal:** every frame a painting.
**Companions:** `blender-cinematic-optics-2026-09-12.md` (lenses, DoF, view transform),
`ending-clip-render-findings-2026-09-13.md` (what rendering actually found).

This is the standard an ending shot has to meet before it is worth rendering.
It exists because four shots rendered black or near-black, and the cause was
never the renderer: it was blocking and background light.

---

## 1. Background lighting — three layers, always

A set lit only by its practicals renders as bright patches floating in void.
Real cinematography always has three layers present, and a shot missing any of
them looks like CG.

### Layer 1 — environment (the HDRI role)

**Implemented** in `setup_world_atmosphere()`. Built procedurally rather than
shipped as a `.hdr`: no download, no licence to clear, and it tunes per scene.

What an HDRI actually buys is **directional ambient**, not brightness:

| Direction | Colour | Why |
|---|---|---|
| Below (floor bounce) | warm, dim `(0.055, 0.035, 0.022)` | real rooms bounce floor colour upward; its absence is most of why CG interiors read flat |
| Horizon | brightest band `(0.085, 0.105, 0.135)` | the band that actually models a room |
| Above (sky) | cool `(0.045, 0.075, 0.125)` | the classic cool key from above |

Strength **0.9**, up from 0.15 of flat near-black. The old value was a colour,
not a light: it lit nothing, so anything outside a practical's cone was void.

**Rule:** ambient must be strong enough that unlit geometry still reads as a
*shape*. If a silhouette disappears entirely, the environment is too weak — the
practicals are the key, not the only source.

### Layer 2 — practicals (the key)

Already present: sodium rotators, surgical spots, infection pulses. These carry
story and colour. Unchanged.

### Layer 3 — separation (rim / edge)

**Missing in these scenes, and the biggest remaining win.** Every subject that
matters needs a rim from behind or three-quarter-back to lift it off the
background. Without it a dark figure against a dark wall is one shape.

Recommended per hero subject: one low-energy rim at 120–150° from the key,
cooler than the key if the key is warm, warmer if the key is cool.

**Implemented** in `scripts/blender/cinematic_lighting.py`. A rim is *derived*
from the key it separates against rather than hand-placed: 140° around the
subject at the key's own distance (so a close key gives a close rim and the pair
stay in proportion), 45% of its energy, and opposing its temperature judged from
the key's own blue-vs-red balance — re-tint a key and its rim follows.

The geometry is pure and bpy-free precisely so it can be unit tested: placing a
rim correctly is trigonometry, and trigonometry that only runs inside Blender is
trigonometry nobody checks. 7 tests, including the overhead-key divide-by-zero
case and the angle-wrap that makes a correct 140° rotation *look* like 220°.

Wired into `outed_escape` first — fewest lights of the five, and all four of its
cameras sit about a metre from their subject.

---

## 2. Framing — the rules a shot is checked against

### 2.1 Rule of thirds, not centre

Dead-centre framing is static. Put the subject's eyeline or the focal detail on
a third. One-point perspective shots are the deliberate exception — and MI-01 is
specified as exactly that, so it should be *symmetrical and centred*, which is
precisely what it is not today.

### 2.2 Depth in three planes

Foreground, midground, background — every frame. The brief already asks for this
in MI-01 ("a foreground IV standard creates a thin cruciform silhouette"). A
frame with only a midground reads as a diorama. The foreground element does not
need to be lit; an unlit silhouette in the near plane is often stronger.

### 2.3 Leading lines

These sets are full of them — ribbed arches, conduit runs, bed rows, hangar
gantries. Point them at the subject. A corridor shot whose lines converge
anywhere but the subject actively fights the viewer.

### 2.4 Negative space is a decision, not a leftover

The current MI-01 has ~60% empty black on the left. That is not composition; it
is the set being off-camera. Negative space earns its place when it isolates the
subject deliberately — and then it should be *toned*, carrying the environment
gradient, not pure black.

### 2.5 Headroom and lead room

A moving subject gets space *ahead* of the motion, not behind it. Cameras here
dolly, so this must hold across the whole move, not just frame one.

### 2.6 The camera must be able to see the set

Trivial and yet the actual defect: **CAM_MI_02 stands outside the room.** Its
authored rotation looked along the set deliberately; pointing it at the set
centre aimed it into the unlit exterior of a wall and it rendered pure black.

**Rule:** before anything else, confirm the camera has the set in frustum and
that what it faces is lit from the camera's side.

---

## 3. Why framing is not auto-corrected

An earlier pass added a `TRACK_TO` constraint to any camera more than 12° off
the set centre. **That was reverted.** It made CAM_MI_02 strictly worse by
"fixing" a shot that was right.

A geometric rule cannot distinguish a bad angle from a deliberate one. So the
build now **reports** framing and warns, and a human fixes blocking:

```
[build_ending_scenes] FRAMING REVIEW needed for 2 camera(s):
    CAM_MI_01 (12.8 deg), CAM_MI_02 (28.4 deg)
```

Cameras standing inside the set are excluded from the check — a close-up framing
one detail is not "off axis" in any meaningful sense, and measuring it against
the whole-set centre reports nonsense.

---

## 4. Per-shot checklist

Before a shot is queued for render:

- [ ] Camera has the set in frustum, and the faces it sees are lit from its side
- [ ] Three lighting layers present: environment, practical key, separation rim
- [ ] Subject on a third — or deliberately centred for a one-point composition
- [ ] Foreground, midground and background all occupied
- [ ] Leading lines converge on the subject
- [ ] Negative space is toned, never pure black
- [ ] Composition holds across the entire camera move, not just frame one
- [ ] Test frame rendered **and looked at** — never trusted from exit code

That last one is not pedantry. Three separate defects this sprint produced
exit-0 renders: the empty sprite atlas, the black shot shells, and CAM_MI_02.

---

## 5. Status

| Item | State |
|---|---|
| Environment gradient (HDRI role) | **implemented**, all five scenes |
| Glare, chromatic aberration, 256 samples | **implemented** |
| Framing report + warning | **implemented** |
| Automatic aim correction | **reverted — made a good shot worse** |
| Game textures imported and verified | **yes** — 39 packed images, 15/15 materials textured in SET-C |
| Material enhancement pass | **implemented** — pixel filtering, roughness break-up, emissive screens |
| Separation/rim lights | **module + first scene done** — `cinematic_lighting.py`, wired into `outed_escape` |
| Per-shot blocking pass | **needs art** — the remaining blocker |


---

## 6. Game assets and textures — what is actually in these scenes

Verified, not assumed: **all 25 referenced game GLBs exist on disk**, and glTF
import brings their textures across intact — 39 packed images across 15
materials in SET-C, with every material carrying an image texture.

So the sets are already built from real game art. What they were missing was any
treatment of that art for cinema, which `enhance_imported_materials()` now adds.
Three passes, none destructive to the source:

**Pixel-art filtering.** Textures at or below 256px are switched to `Closest`.
Several game textures are 192px; Blender's default `Linear` filtering turns them
to mush at 1080p. `Closest` keeps the texel grid the art was drawn with. Across
five scenes this touched **51–66 textures per scene**.

**Roughness break-up.** A low-amplitude noise (±0.12 around the authored value)
drives roughness where nothing already does. Uniform roughness is the single
clearest "this is a game asset" tell — real surfaces vary, and a flat 0.5 reads
as plastic under a close-up. Guarded: only applied when roughness is unlinked,
so an authored roughness map is never overwritten. Typically only 3–4 materials
per scene qualify, which means most already ship proper maps.

**Emissive screens.** Materials on objects whose names read as lit surfaces —
monitor, screen, console, scanner, vital, lamp — emit their **own base colour
texture**, so a monitor emits the image it is displaying rather than a flat
wash. Strength 2.5, restrained: these are set dressing, and the glare node
downstream blooms whatever clears threshold 1.0.

A detail worth recording: matching on material or texture names finds nothing.
glTF import leaves materials called `Material.001` and textures called
`texture_pbr_20250901`. The meaning lives on the **object** names —
`Vital_Monitor_1`, `Scanner_Arch_Entrance` — so that is what the hint matching
reads. Matching materials first found 0 emitters; matching objects found 4.
