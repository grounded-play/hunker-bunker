# Ending `.blend` scenes — per-file setup and what each still needs

**Date:** 2026-09-13 · Branch `dev/sprint-39`
**Method:** measured from the built files, not read from the generator.
**Companions:** `cinematic-framing-and-lighting-spec-2026-09-13.md` (the standard),
`ending-clip-render-findings-2026-09-13.md` (what rendering found).

---

## 0. Test render results — all 20 shots

Full pass via `scripts/render-shot-tests.sh`, one mid-shot frame each:

```
MI-01 2,080,141   MI-02 1,371,106   MI-03 2,090,371   MI-04 1,659,086
AE-01 1,610,687   AE-02 1,912,544   AE-03 1,381,757   AE-04   941,130  <-- black
OE-01 2,378,228   OE-02 1,381,922   OE-03 1,328,046   OE-04 1,907,636
FC-01 1,726,246   FC-02 2,080,089   FC-03 2,180,936   FC-04 1,290,725
EH-01 2,264,423   EH-02 1,503,626   EH-03 1,846,856   EH-04 1,797,586
```

**19 of 20 passed.** The size heuristic flagged AE-04 at 941,130 bytes — within
ten bytes of the known black-frame signature — and it was black when opened.
That is the check working exactly as intended: one suspect out of twenty,
correctly identified, without opening nineteen good frames.

**AE-04 is now fixed.** That pass predated the room shell and the space HDRI on
`alien_exodus`. Re-rendered against the current scene it produces 2,062,830
bytes in 88 seconds with **31 of 32 objects in frame** — a lit shuttle with
figures, warm ground bounce casting long shadows, and cool rim separation. The
ground plane is doing its job: light and shadow now land on something instead of
falling into void.

**So every one of the 20 shots renders.** One new defect visible in AE-04: a
solid black rectangle in the near foreground, which reads as a prop whose
material failed to import rather than a lighting problem. Worth chasing before
a full render.

---

## 1. Current state of all five files

| Scene | Props | Shell | Lights | Cams | Sky |
|---|---:|---|---:|---:|---|
| `ending_mothership_infection` | 15 | 6 (full room) | 7 | 4 | gradient |
| `ending_alien_exodus` | 31 | **1 (ground only)** | 6 | 4 | **space HDRI** |
| `ending_outed_escape` | 25 | 6 (full room) | 5 | 4 | gradient |
| `ending_failed_carrier` | 30 | 6 (full room) | 6 | 4 | gradient |
| `ending_empty_husk` | 29 | **1 (ground only)** | 6 | 4 | **space HDRI** |

---

## 2. Three systematic defects the audit found

### 2.1 Mixed interior/exterior scenes get the wrong shell — my bug

`alien_exodus` and `empty_husk` were classified as exterior and given oversized
ground with no walls or ceiling, so their space sky stays visible.

But both stage **SET-A (the cabin) as well as SET-D (the ice shelf)**. The
evidence is in their own contents: both carry `Light_Cabin_Overhead_Forward`,
`Light_Cabin_Overhead_Aft`, `Light_FloorGrate_Warm_1/2`, and
`Gothic_Ceiling_Rib_*` props — and `CAM_EH_01` sits 1.00 m from a ceiling rib,
`CAM_AE_02` 0.86 m from one. Those are interior shots, and they now have no room
around them at all.

**Needed:** the shell must be built **per set, not per scene**. A cabin volume
around SET-A geometry, open ground plus sky for SET-D. The binary
`exterior=True/False` I added is the wrong shape and should become a per-set
decision keyed off the collection each prop belongs to.

### 2.2 Almost every camera focuses ~4 m past its subject

`create_camera` parks the focus empty at 5 m, correct for a wide. Measured
distance from each camera to its nearest prop:

| Camera | Lens | Nearest prop | Distance | Focus plane | Error |
|---|---|---|---:|---:|---|
| `CAM_FC_01` | 50 mm | Pipe_Rupture_SporeSpill | **0.43 m** | 5 m | 4.6 m past |
| `CAM_EH_02` | 55 mm | Token_Abandoned_S1 | **0.68 m** | 5 m | 4.3 m past |
| `CAM_AE_02` | 40 mm | Gothic_Ceiling_Rib | **0.86 m** | 5 m | 4.1 m past |
| `CAM_AE_03` | 70 mm | Escape_Shuttle_Hero_Hull | **0.86 m** | 5 m | 4.1 m past |
| `CAM_OE_01` | 35 mm | Gothic_Ceiling_Rib | 0.97 m | 5 m | 4.0 m past |
| `CAM_EH_01` | 32 mm | Gothic_Ceiling_Rib | 1.00 m | 5 m | 4.0 m past |
| `CAM_OE_02` | 55 mm | Station_S3_Seat | 1.09 m | 5 m | 3.9 m past |
| `CAM_OE_03` | 65 mm | Gothic_Ceiling_Rib | 1.06 m | 5 m | 3.9 m past |
| `CAM_OE_04` | 40 mm | Station_S4_Seat | 1.12 m | 5 m | 3.9 m past |
| `CAM_FC_02` | 35 mm | Gothic_Ceiling_Rib | 1.14 m | 5 m | 3.9 m past |
| `CAM_FC_03` | 45 mm | Ch48 (the character) | 1.17 m | 5 m | 3.8 m past |
| `CAM_FC_04` | 28 mm | Gothic_Ceiling_Rib | 1.14 m | 5 m | 3.9 m past |

**Only `CAM_MI_03` has been corrected**, and only because its black frame forced
the investigation. This is the same defect on eleven more cameras, and it is
invisible at wide apertures but ruinous at 55–70 mm.

**Needed:** `create_camera` should default its focus empty to the distance of
the nearest prop along the camera's forward axis, not a flat 5 m. Shots wanting
a deliberate deep-focus or rack can override.

### 2.3 Two cameras have no subject in reach

- `CAM_EH_03` — nearest prop **8.48 m** on a 28 mm.
- `CAM_EH_04` — nearest prop **27.29 m** on a 24 mm.

At 27 m on a wide lens a prop is a speck. `EH-04` is also the shot the brief
never gave a focal length for, so 24 mm is a generator fallback rather than an
authored choice. These two need either set dressing placed for them or
repositioning onto something.

---

## 3. Per-scene needs

### `ending_mothership_infection` — the reference scene
Full room shell, 7 lights, all four cameras render. Furthest along.
- **MI-01** — set weighted hard right, left half unlit. Needs wall practicals so
  the new shell reads as a room rather than a dark boundary.
- **MI-02** — renders; composition unreviewed.
- **MI-03** — **fixed this pass**: reframed onto the collar, key + rim added,
  focus pulled to 1.2 m. Went from black to the highest-content frame in the set.
- **MI-04** — renders; composition unreviewed.

### `ending_alien_exodus`
31 props, space HDRI, but **ground-only shell breaks its interior shots** (§2.1).
- Needs a cabin volume around SET-A.
- AE-02 and AE-03 both 0.86 m from their subject with a 5 m focus plane (§2.2).
- AE-01 is the only camera with useful standoff (5.05 m).

### `ending_outed_escape`
Full shell, but the **fewest lights of any scene (5)** and all four cameras sit
0.97–1.12 m from a prop with a 5 m focus plane. Every shot is a near-subject
shot focused past it.
- Needs the focus fix most urgently of the five.
- Needs a separation rim; `Quarantine_Sweep_Beacon` is the only motivated
  non-cabin source.

### `ending_failed_carrier`
Best-lit of the interiors (6 lights incl. `Pod_Amber_Breach`,
`Coolant_Vapor_Cyan`).
- **FC-01 at 0.43 m on a 50 mm is effectively inside the pipe prop.** Needs
  repositioning regardless of focus.
- FC-03 frames the character at 1.17 m — the one shot where the focus error
  lands on a face.

### `ending_empty_husk`
- Ground-only shell breaks EH-01/EH-02 interiors (§2.1).
- EH-03 and EH-04 have no subject in reach (§2.3).
- Fewest props in frame of any scene; the emptiest file.

---

## 4. Ordered work

1. **Per-set shells** (§2.1) — unblocks 4 shots across two scenes.
2. **Focus defaults** (§2.2) — 11 cameras, one change in `create_camera`.
3. **FC-01 and EH-03/EH-04 repositioning** (§2.3) — needs art intent.
4. **Wall practicals + separation rims** — the shells are built but unlit, so
   every room still reads as a dark boundary.
5. Re-run `scripts/render-shot-tests.sh` and look at all 20 frames.

Items 1 and 2 are mechanical and measured. Items 3 and 4 need an art decision
about what each shot is of.

## 5. What is already done

Environment gradient and space HDRI, room shells, imported game textures with
pixel filtering / roughness break-up / emissive screens, 256 samples at 1080p,
the framing report, and the per-shot test render pass with its black-frame size
check.

## 6. 2026-09-13 completion pass

The measured blockers above were corrected in the generator and all five
production `.blend` files were rebuilt:

- shells are now built per set; mixed SET-A/SET-D endings key alternate set,
  shell, light and cast visibility at shot boundaries, so cabin walls cannot
  occlude exterior photography;
- Failed Carrier uses SET-B as its enclosing room and SET-A only as connected
  hatch dressing, eliminating the two coplanar closed shells;
- camera focus is derived from the nearest renderable mesh in the shot frustum
  at each shot midpoint rather than a fixed five metres;
- the gameplay shuttle asset is laid onto its flight axis, promoted from prop
  scale to a four-metre hero, animated through both launch passages, and carries
  a restrained travelling cabin/engine bounce after it leaves the pad lights;
- the exterior moon, engine and sky-fill rig is aimed at the launch geography;
  the previously black AE-04, EH-03 and EH-04 now retain readable silhouettes;
- FC-01 has a clear working-distance camera and pipe key; the remaining tight
  interior cameras were moved out of imported meshes and explicitly composed
  on their named story subjects;
- deterministic 960x540, 32-sample midpoint review frames were rendered for
  all 20 shots to `scratch/animatics/final-review/` and inspected as a contact
  sheet. No frame is empty or blocked by a room shell. AE-03 and EH-02 retain
  deliberate close foreground wipes from the cabin kit;
- the checked audio manifest was reattached after the final rebuild: four cues
  each for Mothership Infection, Alien Exodus, Outed Escape and Empty Husk, and
  five cues for Failed Carrier. All scenes use `AUDIO_SYNC`.

The review helper is `scripts/blender/render_review_frame.py`. Delivery remains
at the scene-level Cycles settings (256 samples, 1920x1080, OIDN, AgX Punchy);
the review helper deliberately overrides only resolution and sample count.
