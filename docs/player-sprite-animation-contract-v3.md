# Player Sprite Animation Contract v3

## Purpose

This contract replaces the ambiguous two-frame player walk cycle. Scout is the
reference rig. Tank and Engineer inherit the same layout, frame semantics,
direction order, anchors, and timing after Scout passes review.

No v3 art replaces a live asset until every frame passes the anatomical and
technical checks in this document.

## Tank and Engineer v4 walk delivery

Tank and Engineer now have independent 8 × 8 RGBA walk atlases and explicit
64-frame sidecars:

- `public/Tank.walk_v4.png`
- `public/Eng.walk_v4.png`
- `public/art-remaster/sprite-v4/tank/Tank.walk-v4-frame-spec.json`
- `public/art-remaster/sprite-v4/engineer/Engineer.walk-v4-frame-spec.json`

Both use the row and phase ordering below. Runtime footstep events occur at
columns 0 and 4. Their locked identity masters and removable-key production
sources remain beside the sidecars under `public/art-remaster/sprite-v4/`.

## Direction order

Every animation uses these rows:

| Row | Index | Direction | View |
| --- | ---: | --- | --- |
| 1 | 0 | East | strict right profile |
| 2 | 1 | Southeast | front-right three-quarter |
| 3 | 2 | South | direct front |
| 4 | 3 | Southwest | front-left three-quarter |
| 5 | 4 | West | strict left profile |
| 6 | 5 | Northwest | rear-left three-quarter |
| 7 | 6 | North | direct back |
| 8 | 7 | Northeast | rear-right three-quarter |

Directions must be authored. Mirroring is allowed for a temporary blockout,
but not for final art because suits, tools, lights, damage, and weapon mounts
are asymmetric.

## Anatomical naming

`left` and `right` always mean the character's anatomical left and right—not
screen-left and screen-right.

Every class design must include small persistent leg identifiers:

- anatomical left: one cyan hip fastener and a split kneepad;
- anatomical right: one amber hip fastener and a solid kneepad.

These identifiers must remain visible enough to audit contact-leg ownership.
They are functional suit details, not debug labels.

## Deliverables

Use one atlas per action. This keeps texture dimensions practical and lets the
runtime select different playback speeds without complicated column ranges.

| Action | Grid | Canvas | Frames | Loop |
| --- | --- | --- | ---: | --- |
| Idle | 4 columns × 8 rows | 1024 × 2048 | 4/direction | yes |
| Walk | 8 columns × 8 rows | 2048 × 2048 | 8/direction | yes |
| Run | 8 columns × 8 rows | 2048 × 2048 | 8/direction | yes |

Every cell is exactly 256 × 256 RGBA. Production masters have transparency.
If the current browser keying path is retained, export a separate derivative
on perfectly flat `#00ff00`; do not make chroma green the only master.

Recommended filenames:

- `Scout.idle_v3.png`
- `Scout.walk_v3.png`
- `Scout.run_v3.png`
- `Scout.anim_v3.json`

Tank and Engineer use the same suffixes and capitalization as their existing
`.full` family.

## Locked anchors

All frames within a class use:

| Anchor | Cell coordinate | Tolerance |
| --- | ---: | ---: |
| Visual center X | 128 | ±2 px |
| Ground baseline | 240 | ±1 px |
| Standing pelvis Y | class sidecar | ±2 px |
| Helmet top at rest | class sidecar | ±2 px |
| Muzzle/tool pivot | class sidecar | ±2 px |

Contact frames place the supporting sole on the baseline. Swing feet may rise.
The whole body must not scale, drift horizontally, or change equipment.

Vertical body movement is intentional:

- idle breathing: at most 1 px;
- walk down/up: at most 3 px around the standing pelvis;
- run flight/compression: at most 5 px.

## Idle — four frames

Idle is restrained and must not resemble walking in place.

| Frame | Pose |
| ---: | --- |
| 0 | Neutral planted stance; weight 52% on anatomical left |
| 1 | Inhale; chest harness expands 1 px, shoulders rise 1 px |
| 2 | Neutral planted stance; weight crosses center |
| 3 | Exhale; chest settles, weight 52% on anatomical right |

Rules:

- both feet remain planted;
- knees remain soft, never marching;
- arms do not swing;
- helmet direction remains locked;
- suit lights may change by one restrained intensity step;
- no breast, hip, or backpack deformation unrelated to breathing mechanics.

## Walk — eight frames

The walk cycle uses two complete steps. Each anatomical leg is visibly the
support leg once and the swing leg once.

| Frame | Phase | Support | Swing | Required silhouette |
| ---: | --- | --- | --- | --- |
| 0 | Left contact | transitioning right→left | left contacting | left heel ahead, right toe behind |
| 1 | Left down | left | right trailing | pelvis lowest; left knee flexed |
| 2 | Left pass | left | right passing | right foot beside support ankle and off ground |
| 3 | Left up | left | right advancing | pelvis highest; right knee ahead |
| 4 | Right contact | transitioning left→right | right contacting | right heel ahead, left toe behind |
| 5 | Right down | right | left trailing | pelvis lowest; right knee flexed |
| 6 | Right pass | right | left passing | left foot beside support ankle and off ground |
| 7 | Right up | right | left advancing | pelvis highest; left knee ahead |

Arm opposition:

- anatomical left leg forward means anatomical right arm forward;
- anatomical right leg forward means anatomical left arm forward;
- arms pass near neutral at frames 2 and 6;
- hands must not intersect thighs, tools, breasts, backpack, or weapon mounts.

Profile-direction requirement:

- frames 0 and 4 must have visibly reversed front/back legs;
- frames 2 and 6 must lift opposite knees;
- the far leg cannot simply disappear behind the near leg;
- knee and hip markers must prove which anatomical leg owns each pose.

Front/back requirement:

- contact boots use depth overlap plus sole visibility;
- passing knees visibly alternate;
- the pelvis may rotate up to 3° but cannot translate sideways more than 2 px.

## Run — eight frames

Run is not a faster walk. It has stronger compression, longer reach, and flight.

| Frame | Phase | Support | Required silhouette |
| ---: | --- | --- | --- |
| 0 | Left foot strike | left entering | left foot under/slightly ahead of hips |
| 1 | Left compression | left | pelvis lowest, left knee loaded |
| 2 | Left drive | left leaving | rear extension and strong opposite arm drive |
| 3 | Flight to right | none | both feet off ground, right knee leading |
| 4 | Right foot strike | right entering | mirrored anatomical ownership |
| 5 | Right compression | right | pelvis lowest, right knee loaded |
| 6 | Right drive | right leaving | rear extension and opposite arm drive |
| 7 | Flight to left | none | both feet off ground, left knee leading |

Run rules:

- frames 3 and 7 must show clear air beneath both boots;
- foot strike lands closer to the pelvis than the walk contact;
- torso leans 6–10° into travel in profiles and three-quarter views;
- backpack, chest, and hip armor remain rigidly attached;
- Scout stride is light and long;
- Tank stride is shorter, heavier, and more compressed;
- Engineer stride is efficient with controlled tool-arm motion.

## Class movement character

### Scout

- attractive adult feminine athletic silhouette;
- lightest footfalls and longest walk stride;
- controlled hip counter-rotation, never runway exaggeration;
- flexible rib harness and narrow breathing collar;
- cyan Scout identifiers remain visible in every direction.

### Tank

- powerful adult masculine silhouette;
- shortened stride, wider planted stance, heavier vertical compression;
- sternum armor and backpack stay stable;
- no detached boots or floating armor plates;
- run reads as momentum and force, not Scout animation scaled up.

### Engineer

- compact adult feminine athletic silhouette;
- economical steps and lower arm swing;
- tool arm stays controlled and never crosses the torso;
- coolant capillaries and utility pack remain aligned.

## Animation timing

Initial runtime targets:

| Action | Rate | Cycle duration |
| --- | ---: | ---: |
| Idle | 2 fps | 2.0 s |
| Walk | 10 fps | 0.8 s |
| Run | 14 fps | 0.57 s |

Footstep events:

- walk: frames 0 and 4;
- run: frames 0 and 4;
- no footsteps during idle or flight frames.

Playback may vary ±15% by class without changing frame order.

## Generation workflow

Generate one direction/action strip at a time:

1. four-frame idle strip;
2. eight-frame walk strip;
3. eight-frame run strip;
4. verify anatomical ownership;
5. normalize cells and anchors;
6. assemble the action atlas;
7. review at native size and at gameplay scale;
8. proceed to the next direction only after approval.

Do not ask an image model for all actions and directions in one image.

## Frame acceptance checklist

Every strip must pass:

- correct number of figures;
- correct direction in every frame;
- correct anatomical support and swing leg;
- four or eight genuinely distinct silhouettes as specified;
- opposite contact and passing poses are not duplicates;
- boots remain connected to shins;
- no merged knees, extra limbs, or disappearing far leg;
- head, pelvis, center, baseline, and scale meet tolerances;
- equipment and suit identity remain unchanged;
- transparent or chroma background is uniform;
- no shadow, floor, grid, text, or cross-cell spill;
- animation reads correctly as a loop at target fps.

Failure of one frame rejects the strip. Do not repair a failed gait by
duplicating, mirroring, or reordering another pose without anatomical review.
