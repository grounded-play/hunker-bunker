# Enemy and Boss Sprite Animation Contract v4

## Live scope

The conversion covers eleven living enemy rigs:

- proto crawler and proto spitter;
- corrupted Scout, Tank, and Engineer bosses;
- Cybersnail, Cryosnail, and Sporesnail;
- boss Cybersnail, boss Cryosnail, and boss Sporesnail.

Dead snail sprites remain separate single-frame RGBA assets derived from the
approved living masters.

## Atlas contract

Every living enemy uses a 2048 × 2048 RGBA atlas with 8 × 8 cells. Each cell
is exactly 256 × 256.

Rows are authored in this order:

1. east;
2. southeast;
3. south;
4. southwest;
5. west;
6. northwest;
7. north;
8. northeast.

Columns are one complete locomotion loop. Bipeds use the player v4 phase
contract: left-contact, left-down, left-pass, left-up, right-contact,
right-down, right-pass, right-up.

Crawler and spitter columns alternate tripod or diagonal support groups:

1. group A contact;
2. group A compression;
3. group A pass;
4. group A lift;
5. group B contact;
6. group B compression;
7. group B pass;
8. group B lift.

Snail columns are:

1. feelers reach;
2. forebody compression;
3. shell roll;
4. tail contraction;
5. feelers cross neutral;
6. opposite reach;
7. second compression;
8. settle into the loop.

## Production rule

Generate one direction strip containing exactly eight separated figures.
Validate it before generating the next direction. Never request a complete
64-frame enemy atlas from an image model: the rejected first batch produced
8 × 9, 7 × 7, 8 × 5, and 6 × 8 layouts and also reordered facings.

Each strip must have:

- one unchanged identity and equipment loadout;
- eight genuinely distinct silhouettes;
- a uniform removable key background;
- no overlapping figures or cross-cell fragments;
- a locked center, scale, and ground baseline;
- the correct facing in every frame.

Only validated strips are keyed, normalized, and assembled. Runtime paths do
not change until all eight rows of a class pass.

## Rejected first-pass evidence

The whole-atlas experiments are retained under
`public/art-remaster/enemy-v4/rejected-candidates/`. They are not live assets
and must not be repacked or promoted.
