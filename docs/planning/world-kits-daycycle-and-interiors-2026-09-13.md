# Modular kits, the day cycle, and interior sub-levels

**Date:** 2026-09-13 · Branch `dev/sprint-39`
**Status:** design + phased implementation. Living document.

Covers three connected asks: fold six CC0 kits into the world without them
looking like asset-pack filler, add a rest/day cycle between runs, and let the
player enter buildings and drop to sub-levels.

They are one problem. The kits supply the vocabulary, the sub-levels are what
that vocabulary is *for*, and the day cycle is the frame that makes exploring
them matter.

---

## 1. What the kits actually are

Downloaded to `art/source/kits/`, all **CC0**, verified by reading each pack's
own `License.txt` rather than trusting the source page.

| Kit | Pieces | Format |
|---|---:|---|
| modular-space-kit | 40 | GLB/OBJ/FBX |
| modular-cave-kit | 40 | GLB/OBJ/FBX |
| building-kit | 79 | GLB/OBJ/FBX |
| nature-kit | 329 | GLB/OBJ/FBX |
| animated-characters-survivors | 4 FBX (mesh + idle/run/jump) | FBX |
| planets | PNG sprites | 2D |

### 1.1 The finding that shapes everything

**The cave kit and the space kit share their corridor and room grammar.**
Measured after registering both: **36 of 40 piece names are identical** —
`corridor`, `corridor-corner`, `corridor-wide-junction`, `room-large`, `stairs`,
`template-floor-layer-hole` and the rest of the structural set.

The four that differ are all flavour, not structure:

| Cave only | Space only |
|---|---|
| `gate_metal_bars`, `gate_overhang`, `gate_rock` | `gate_door`, `gate_door_window`, `gate_lasers` |
| `ladder` | `cables` |

So the gates differ in what a door is made of, and the cave gets a ladder where
space gets cable runs. An initial read called the two kits identical; they are
not, and the distinction matters — a generator can share its corridor logic
across both skins, but the gate table has to be per-skin.

That is not a coincidence to work around; it is the design. One connector
grammar serves both, so the existing random-hallway system can keep its logic
and swap its skin per biome. A bunker corridor and a cave corridor become the
same socket contract with different materials, which is exactly the
"fixed set pieces joined by procedural halls" model the setpiece plan already
describes.

### 1.2 Pieces that unlock the other two asks

- `stairs`, `stairs-wide`, `ladder` — vertical connection.
- `template-floor-layer-hole`, `template-floor-layer-raised` — a floor with a
  hole in it is a sub-level entrance that needs no special case.
- `gate`, `gate-door`, `gate-door-window`, `gate-metal-bars`, `gate-rock` — the
  door that closes behind you.
- building-kit `barricade-doorway-*`, `border-high-*` — exterior structures the
  player can enter.

---

## 2. Art direction — making it ours, not "kiddish"

Kenney kits are deliberately clean, bright, low-detail and untextured-by-design.
Dropped in raw they read as placeholder. Four rules, applied as an automated
Blender pass so it is repeatable rather than hand-tweaked per asset:

1. **Strip the palette, keep the silhouette.** The kits' value is their geometry
   and socket alignment. Their flat pastel vertex colours are the thing that
   reads as a toy. Re-material to the game's own palette — the same
   `ROOM_THEME_CATALOG` families the authored rooms already use.
2. **Add wear at the seams.** Uniform surfaces are the second tell. The
   roughness break-up already written for imported game materials
   (`enhance_imported_materials`) applies here unchanged.
3. **Light it like the game, not like a showroom.** These sets are near-black
   with saturated emissive practicals. A kit piece lit that way stops looking
   like a kit piece almost immediately — the MI-03 collar shot is the proof.
4. **Break the grid.** Modular kits repeat at a fixed interval and the eye finds
   it fast. Rotate, mirror, and swap `-variation` pieces per instance, and let
   the existing decal/dressing pass scatter over the seams.

**Non-goal:** re-modelling. If a piece needs new geometry to fit, it is the
wrong piece — there are 488 of them.

---

## 3. Day cycle — rest, spend, advance

A between-run safe space entered by sleeping at camp.

```
RUN (expedition)  ->  camp reached  ->  SLEEP  ->  REST PHASE  ->  next RUN
                                                   day += 1
                                                   difficulty += tier
                                                   spend / level / repair
```

- **Day counter** drives difficulty scaling and gates content. It is the clock
  the story runs on.
- **Rest phase** is a real location, not a menu: the camp dressed for night,
  where the player levels, buys, repairs and talks. `camp.js` already has
  dressing, leaders and quests — this is a lighting and state change over
  existing geometry, not a new scene.
- **Story locks on a timer.** Beats that are not reached by a given day close
  permanently. This reuses the write-once `storyLinchpins` machinery rather than
  inventing a second irreversible-choice system, and turns the day counter into
  narrative pressure rather than just a difficulty multiplier.

Persistence sits on the existing hybrid boundary: the day counter and unlocks
are meta, the run is not.

---

## 4. Interiors and sub-levels

### 4.1 The model

A structure or hole is a **portal to a bounded sub-area**, not a seamless part
of the open map. Entering swaps the active play plane; leaving swaps back.

That is deliberate. Seamless interiors need occlusion culling, portal
rendering, and a camera that solves for every doorway. A swapped plane needs a
door, a fade and a stack — and it is the model the game already uses for the
cave/mothership transitions, so it extends something proven.

```
SURFACE  --enter structure-->  INTERIOR PLANE   (own chunk grid, own lighting)
INTERIOR --drop through hole-->  SUB-LEVEL PLANE  (deeper, darker, no exit but up)
```

### 4.2 Camera

Two behaviours, both needed:

- **Ceiling fade.** Inside a structure, geometry between the camera and the
  player fades out rather than being culled — a hard cull pops, a fade reads as
  a cutaway. The existing `world3dOverlay` material path can drive alpha per
  object, so this is a per-frame test against the camera-to-player segment, not
  a new render pass.
- **Tighter framing below.** Sub-levels get a closer camera and a shorter far
  plane, which does double duty: it sells confinement and it means a sub-level
  costs less to render than the surface it hangs off.

### 4.3 Why `template-floor-layer-hole` matters

A floor piece with a hole in it is a sub-level entrance that needs no bespoke
geometry and no special-case authoring. Place it, and the descent exists.

---

## 5. Phases

| # | Work | Exit |
|---|---|---|
| **0** | Kit intake: convert to GLB, register placement types, record provenance | Every kit piece is addressable from a room build |
| **1** | Restyle pass: palette, wear, variation in Blender | A kit corridor is indistinguishable from an authored one at a glance |
| **2** | Corridor grammar: swap the random hallway skin per biome using one socket contract | Cave and bunker share a generator, differ only in skin |
| **3** | Day cycle: sleep trigger, day counter, rest phase, difficulty and story gates | A run ends in camp and the next begins on day N+1 |
| **4** | Portals: enter structure, drop to sub-level, return stack | A player enters a building and comes back out where they left |
| **5** | Camera: ceiling fade, sub-level framing | The player is never hidden by a roof |

Phases 0–2 are asset and generation work. 3 is systems. 4–5 are runtime and
camera. They are independent enough to land separately.

## 6. Status log

- 2026-09-13 — kits acquired and verified CC0; cave/space grammar identity
  found; plan written.
