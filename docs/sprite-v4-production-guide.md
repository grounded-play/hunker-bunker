# Sprite v4 Production Guide

## Status

Scout is the reference character. The first assembled v4 atlas was rejected
after anatomical review: cyan/amber leg ownership drifted between generated
frames even where silhouettes looked plausible. Scout has been returned to the
last packed fallback in runtime while v4 is rebuilt from an explicit 64-frame
truth table.

Current Scout files:

- runtime: `public/Scout.walk_v4.png`;
- master: `public/art-remaster/sprite-v4/scout/Scout.walk_v4.png`;
- preview: `public/art-remaster/sprite-v4/scout/Scout.walk_v4-preview-r2.png`;
- metadata: `public/art-remaster/sprite-v4/scout/Scout.anim_v4.json`;
- source strips: `public/art-remaster/sprite-v4/scout/strips/`;
- builder: `scripts/build-scout-v4.sh`;
- strip splitter: `scripts/split-transparent-strip.py`.
- locked identity master:
  `public/art-remaster/sprite-v4/scout/identity/Scout.front-idle-master.png`;
- 64-frame truth table:
  `public/art-remaster/sprite-v4/scout/Scout.walk-v4-frame-spec.json`.

The identity master permanently defines anatomical left as cyan with a split
kneepad and anatomical right as amber with a solid kneepad. A strip fails if
those markers swap, regardless of how attractive or dynamic the pose appears.

### Anatomical retry result

Eight new high-detail direction strips were generated against the locked
identity master and assembled under
`public/art-remaster/sprite-v4/scout-anatomical/`.

This retry is also **not runtime-ready**. It materially improved permanent
cyan/amber identification in direct front and back views, but review still
found:

- west-profile frames with duplicated amber knees;
- several diagonal rows that change colored-leg ownership without matching
  the requested phase;
- insufficient contact/down/pass/up silhouette separation in rear diagonals;
- adjacent large profile figures touching across source-strip slots, producing
  detached fragments during equal-slot fallback;
- residual magenta edge contamination on the northwest row.

The live game therefore remains on `Scout.full_v2.png`. The anatomical retry
is evidence and paint reference, not a replacement.

## v4 layout

Walk is an 8 × 8 atlas with 256 × 256 cells:

- rows: east, southeast, south, southwest, west, northwest, north, northeast;
- columns: left contact, left down, left pass, left up, right contact,
  right down, right pass, right up.

The runtime supports a per-class layout. Scout uses v4 while unfinished Tank
and Engineer sheets keep their legacy packed 4 × 4 format.

## Source-strip rule

Generate one direction strip at a time on a removable flat background. Do not
assume figures are evenly spaced. The v4 builder:

1. removes chroma to obtain RGBA;
2. finds each figure using fully transparent column gaps;
3. rejects strips that do not contain exactly eight figures;
4. trims each figure;
5. scales it to fit a 220 × 220 recognition area;
6. places its feet on the 240 px baseline;
7. centers it in a 256 × 256 cell;
8. assembles direction rows in runtime order.

This prevents detached boots and cross-cell fragments.

## Special-action order

Build and approve clips in this order:

1. idle;
2. run;
3. aim/fire;
4. interact/pickup;
5. hurt;
6. death.

The JSON manifest already reserves filenames, grids, timing, loop behavior,
footstep frames, projectile events, and hold-last-frame behavior.

### Idle

Four frames per direction: neutral-left weight, inhale, neutral-center,
exhale/right weight. Both feet stay planted.

### Run

Eight frames per direction: strike, compression, drive, flight, opposite
strike, opposite compression, opposite drive, opposite flight.

### Aim/fire

Six frames per direction: acquire, raise, settle, fire, recoil, recover.
Projectile emission occurs on frame 3.

### Interact/pickup

Six frames per direction: neutral, reach, contact, transfer, retract, settle.
Hands and the interaction point must stay readable.

### Hurt

Four frames per direction: impact, recoil, compression, recovery. Damage
direction is conveyed through torso twist without changing facing row.

### Death

Eight frames per direction: impact, buckle, knee drop, hand brace, collapse,
ground contact, settle, final corpse. The runtime holds the last frame.

## Creating the next character

After Scout special actions pass:

1. copy the v4 directory structure;
2. preserve all filenames except the character prefix;
3. preserve grids, direction rows, phase columns, and event frames;
4. generate strips using the approved Scout pose silhouettes as motion
   reference and the new class design as identity reference;
5. keep class-specific movement character without changing phase semantics;
6. run the same splitter and builder;
7. add the class layout to `PLAYER_SPRITE_LAYOUTS`;
8. route the class only after its complete atlas passes.

Never scale Scout into Tank or recolor Scout into Engineer. The animation rig
is shared; anatomy, mass, equipment, stride length, and compression are
authored per class.
