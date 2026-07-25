# Gameplay Asset Remaster Audit

## Decision

Do not replace any live sprite yet.

The current player sheets have a specialized packed layout, and the renderer
cuts every selected frame into two independent billboards at exactly 50%
height. The painted pelvis and waist do not remain at that boundary in every
pose, so the runtime creates seams even when a source frame looks correct.

The safe order is:

1. lock a documented sprite contract;
2. remove the arbitrary half-frame crop or move it to authored per-class
   anchors;
3. validate one Scout remaster in a side-by-side harness;
4. propagate the approved construction to Tank and Engineer;
5. update enemies and world dressing in functionally related families.

Current assets remain the fallback until a replacement passes the checks below.

## Current player contract

Runtime consumer: `src/threeGame.js`

| Property | Current value |
| --- | --- |
| Canvas | 1024 × 1024 |
| Grid | 4 columns × 4 rows |
| Cell | 256 × 256 |
| Directions | 8 |
| Walk frames | 2 per direction |
| Filtering | nearest |
| Player sheets | `scout_walk.png`, `tank_walk.png`, `engineer_walk.png` |
| Body treatment | separate lower and upper sprites |
| Split | fixed at 50% of every cell |

The sheet is not a conventional four-direction 4×4 walk atlas. Each direction
owns an adjacent two-cell pair:

| Direction index | Logical direction | Sheet row | Columns |
| --- | --- | --- | --- |
| 0 | east | 2 | 3–4 |
| 1 | southeast | 4 | 3–4 |
| 2 | south | 4 | 1–2 |
| 3 | southwest | 3 | 3–4 |
| 4 | west | 3 | 1–2 |
| 5 | northwest | 2 | 1–2 |
| 6 | north | 1 | 3–4 |
| 7 | northeast | 1 | 1–2 |

Rows and columns above are one-based art coordinates. Runtime texture
coordinates invert the vertical axis.

### Why walking currently looks wrong

- Two frames are too little for a convincing planted-contact/pass/contact
  cycle.
- Several current pairs change silhouette only slightly.
- Feet, helmet, pelvis, and visual center drift between cells.
- The renderer can play the two frames backward for backpedalling, which
  magnifies foot sliding.
- The fixed half-height crop intersects different anatomy in different poses.
- Legs can use a movement-facing cell while the torso uses an aim-facing cell;
  silhouettes were not authored to interlock across all 64 direction pairs.
- Tank has a one-off horizontal flip for west, which signals a missing or
  unusable authored direction.

## Recommended player layout

Use a versioned `v2` contract rather than silently changing the current atlas:

- 8 direction rows × 4 animation columns;
- columns: idle/contact-left, pass-left, contact-right, pass-right;
- 256 × 256 cells, producing a 1024 × 2048 master;
- fixed foot baseline, helmet top, character center, pelvis anchor, and muzzle
  pivot across every cell;
- 16 px transparent safety inset;
- no baked shadow or glow outside the character silhouette;
- nearest-neighbor runtime filtering;
- a small JSON sidecar per class with `feet`, `pelvis`, `muzzle`, and
  `visualCenter` anchors.

For aiming, prefer a single full-body sprite that faces aim while stationary
and faces movement while running. If independent torso aiming is essential,
author separate lower-body and upper-body atlases with explicit overlap below
the belt. Do not derive the two parts by cropping one full-body frame.

## Enemy contracts

There are two materially different enemy families.

### Directional sheet enemies

`alien_proto_crawler`, `alien_proto_spitter`, and the three corrupted class
bosses are consumed as conventional 4 × 4 sheets:

- row 1 south;
- row 2 north;
- row 3 east;
- row 4 west;
- four animation frames per row.

This is a better contract than the player packing and should remain stable.
The current files are JPEG data despite `.png` filenames in several cases.
Remasters should be true RGBA PNGs so keyed black backgrounds and compression
halos do not contaminate the silhouette.

### Static snail enemies and bosses

Cybersnail, Cryosnail, Sporesnail, their bosses, and dead variants are loaded
as single keyed images. They are not animation sheets. These should become:

- a four-direction locomotion atlas for each living enemy;
- a separate attack/telegraph atlas when a mechanic needs it;
- a single transparent corpse sprite derived from the approved living design;
- one dominant anatomical idea per boss, with scale readable at game camera
  distance.

## World asset inventory

The current gameplay-facing audit found 84 immediately relevant root assets.
They fall into these working families:

| Family | Current examples | Remaster need |
| --- | --- | --- |
| Base walls | `bunker_wall_metal*`, `bunker_wall_grunge` | coordinated ribbed base, normal, grime, damage |
| Cryo walls | `cryo_wall_conduit*`, `ice_wall_glacier` | coolant routes that invade joints and seals |
| Bio walls | `bio_wall_veins*` | growth following drains, seams, and cable paths |
| Doors | base, class, win/loss, `door_biomech_v2` | one construction with aligned state variants |
| Survival | O2 module, bedrolls, cookfire | shared breathing/heat connector language |
| Power | reactor, hull matrix, cable coil | repeated plugs, bus bars, vertebral conduits |
| Information | console, radar, placards | readable silhouette without baked UI text |
| Storage | crates, chained crates, junk | modular latches and stackable dimensions |
| Maintenance | bolts, coolant, gravel | low-cost scatter with clean traversal zones |
| Infestation | eggs, webs, throne, spores, lichen | wet accents reserved for living contamination |

## New bunker dressing pack

Build these as small coherent packs rather than unrelated one-offs.

### Wall kit

- clean load-bearing rib;
- cable-service rib;
- coolant-service rib;
- vented pressure panel;
- corroded panel;
- breached panel;
- Queen-controlled membrane panel;
- matching corner, end-cap, floor seam, and ceiling-seam decals.

### Door kit

- personnel iris;
- pressure bulkhead;
- maintenance hatch;
- blast shutter;
- cryo airlock;
- quarantine seal;
- damaged/jammed state for each gameplay-relevant model.

Every door needs a clear closed silhouette, a collision footprint, and a
separate emissive/status layer. Door art must not contain labels.

### Prop kit

- wall oxygen manifold;
- cable junction and hanging conduit;
- fuse cabinet;
- cryo pipe elbow and leaking valve;
- locker bank;
- decontamination frame;
- bunk/cot;
- ration heater;
- med cabinet;
- tool trolley;
- sealed salvage tote;
- waste drum;
- floor drain;
- ceiling vent;
- broken service robot;
- recorder/camera node.

Use charcoal, iron, worn bone, and dirty ice as the base. Amber is machinery,
cyan is cryogenic function, red is warning/recording, and violet is reserved
for Queen control.

## Replacement acceptance checks

A candidate is not allowed to replace a live asset until:

- dimensions and format match the declared contract;
- every cell contains exactly one silhouette;
- all pixels stay inside the cell safety inset;
- feet and visual center remain within a two-pixel tolerance;
- directional identity is correct;
- walk frames have distinct contacts without scale drift;
- alpha corners are fully transparent and edges have no key-color fringe;
- the sheet reads at 25%, 50%, and native display size;
- it survives grayscale;
- a side-by-side gameplay capture shows no collision or aim mismatch.

## Prototype status

`public/art-remaster/concepts/scout_sheet_biomech_concept.png` is a style and
silhouette study only. It demonstrates the worn bone/charcoal/cyan material
translation from `title_key_art_v2.png`, but it is **not runtime-ready**:

- generated canvas is 1254 × 1254 instead of 1024 × 1024;
- several direction pairs are duplicated;
- the exact packed direction map was not obeyed;
- no anchor validation has been performed.

Keep it out of runtime routing. It is useful as a paint target for a
deterministic pixel-art pass, not as a replacement sheet.

### Scout v2 sensual-direction study

The second Scout exploration is stored under
`public/art-remaster/sprite-prototypes/scout/`. It deliberately pushes the
adult appeal further while remaining a fully sealed, credible pressure suit:
an athletic hourglass silhouette, long articulated legs, tailored hip seals,
a corset-like pressure harness, and an illuminated spinal support.

The front and rear plates improve foot readability substantially:

- profile and three-quarter frames show separated planted and trailing boots;
- opposing columns generally reverse the contact leg;
- the backpack and pressure harness keep a coherent biomechanical identity;
- the ivory, charcoal, cyan, and restrained amber palette matches the key art.

These files remain prototypes, not live sprites. Image generation still failed
strict production checks: canvas sizes differ, the first full atlas omitted two
direction rows, and the front plate's last row drifted toward a rear view.
Production sheets should therefore be assembled from individually approved
direction pairs, snapped to deterministic 256 × 256 cells, and anchor-normalized
before runtime integration.

That controlled assembly now exists as
`public/art-remaster/sprite-prototypes/scout/scout_walk_v2_atlas.png`:

- 512 × 2048 transparent RGBA;
- 2 columns × 8 direction rows;
- fixed 256 × 256 cells;
- runtime direction-index order from east through northeast;
- fixed visual center and foot baseline;
- reproducible via `scripts/build-scout-v2-atlas.sh`.

West, southwest, and northwest are temporarily mirrored from their opposite
right-facing directions. This is acceptable for animation evaluation but not
for final art because it reverses small suit asymmetries. The JSON sidecar
records that limitation and deliberately leaves `runtimeReady` false.

## Review sheets

- `public/art-remaster/concepts/sprites-current-contact-sheet.jpg`
- `public/art-remaster/concepts/world-assets-current-contact-sheet.jpg`
