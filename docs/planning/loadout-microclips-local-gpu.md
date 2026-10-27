# Loadout microclips — local GPU production plan

Status: render queue defined but paused before rendering. The newer
[Armory departure and exact operator identity capture](armory-opening-identity-capture-2026-10-27.md)
is the recommended path because it preserves arbitrary full loadouts in-engine
without enumerating cosmetic combinations. Keep this 144-clip plan as a
fallback for item-specific macro inserts only.

The goal is a personalised three-insert start sequence: the selected weapon is
grabbed, the selected badge is fitted, and the selected charm is clipped on.
The game composes those three clips at runtime. We do not render every complete
loadout combination.

## Exact current render count

The queue is generated from the live Armory catalog, not a hand-maintained
spreadsheet.

| Slot | Catalog choices | Class treatment | Clips |
|---|---:|---|---:|
| Weapon | 4 factory frames + 23 weapon skins | Already class-compatible | 27 |
| Badge / patch / decal | 23 | One fit per Scout, Tank and Engineer chest | 69 |
| Charm | 16 | One macro fit per class glove/socket | 48 |
| **Total** | | | **144** |

There are 9,936 possible class-valid weapon × badge × charm combinations.
Rendering slot inserts reduces that to 144 reusable clips while still showing
the correct player class. The runtime order is `weapon → badge → charm`; an
empty slot is skipped.

Charm shots intentionally crop out almost the entire weapon. That keeps one
class-specific charm clip valid across every finish without showing the wrong
gun. The class glove and standard socket remain visible.

## Four-stage reference workflow

1. **Physical truth.** Render the shipped GLB with its shipped materials using
   `scripts/render-armory-previews.mjs`. Flat badges use their large economy
   image. This source owns geometry, texture, markings and colour placement.
2. **Painted prop plate.** Comfy receives only the physical truth reference and
   paints an isolated three-quarter prop on neutral grey. Approve it as
   `prop_plate.png`; reject any changed silhouette, invented markings or missing
   attachment point.
3. **First and last frames.** FLUX receives the approved prop plate first, then
   the canonical class identity and, for charms, the class socket reference.
   The first frame leaves a visible gap before contact. The last frame shows the
   completed grab/fit/clip with the same camera and lighting.
4. **Motion.** Wan animates one action only for 2.25 seconds. Weapon: grip, lift,
   ready. Badge: align, click, press. Charm: align clasp, close, one damped swing.

This is deliberately a plate pipeline, not “prompt from the item name.” The
manifest includes a hard prop lock and ordered references for every job.

## Build and render

Rebuild whenever the Armory catalog changes:

```bash
node scripts/cinematics/build-loadout-clip-jobs.mjs
jq '.counts' scripts/cinematics/loadout-clip-jobs.json
```

Render one pilot all the way through:

```bash
export HB_CINEMATIC_JOBS=scripts/cinematics/loadout-clip-jobs.json
JOB=loadout-scout-weapon-frame-talon

python3 scripts/cinematics/comfy_clips.py prop "$JOB" --takes 3
cp "art/source/cinematics/$JOB/prop_1.png" \
  "art/source/cinematics/$JOB/prop_plate.png"

python3 scripts/cinematics/comfy_clips.py still "$JOB" --takes 3
cp "art/source/cinematics/$JOB/still_1.png" \
  "art/source/cinematics/$JOB/first_frame.png"

python3 scripts/cinematics/comfy_clips.py last "$JOB" --takes 3
cp "art/source/cinematics/$JOB/last_1.png" \
  "art/source/cinematics/$JOB/last_frame.png"

python3 scripts/cinematics/comfy_clips.py clip "$JOB" --model wan
python3 scripts/cinematics/comfy_clips.py encode "$JOB" take_wan_1 --preview --no-sound
```

Once the pilot passes review, the batch command creates a painted prop plate,
first frame, last frame, motion take and encoded files for each requested job:

```bash
HB_CINEMATIC_JOBS=scripts/cinematics/loadout-clip-jobs.json \
  python3 scripts/cinematics/comfy_clips.py batch \
  loadout-scout-weapon-frame-talon \
  loadout-scout-badge-2000 \
  loadout-scout-charm-4130 \
  --model wan
```

Run the full 144 only after those three pilot types pass. The generated masters
stay under `art/source/cinematics/`; encoded runtime files go under
`public/cutscenes/loadout/`.

## Runtime contract

The loadout sequence resolver uses stable values already stored by the game:

- weapon: `frame:{archetypeId}` when no skin is selected, otherwise
  `weaponSkinId`;
- badge: shared `decalId`;
- charm: class loadout `charmId`.

The file key is `loadout-{class}-{slot}-{itemId}`. A successful non-preview
encode adds that key to `src/cinematics/shippedLoadoutClips.js`. The opening
player prepends only entries in that shipped set, in weapon → badge → charm
order; if a slot clip is absent, it skips immediately. This lets clips land in
reviewed batches without blocking a run or showing a broken video element.

## Review gate

- Compare prop plate and both endpoints to the physical truth at 100% zoom.
- Reject identity drift, wrong glove/chest, changed grip, changed badge graphic,
  charm clasp invention, extra fingers, contact before the authored moment,
  morphing metal, flicker or a second item.
- Verify first and last frames share camera, crop, set, light and screen
  direction.
- Verify the final twelve frames settle cleanly for concatenation.
- Test missing-file fallback and a three-clip sequence for every class before
  enabling the loadout inserts by default.
