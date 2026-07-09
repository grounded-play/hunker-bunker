# Cave Scene & Act 2 Art Assets

New PNGs wanted for the cave reveal and Act 3 departure scenes. The scenes
already play with procedural placeholder art — every file below is **optional
and hot-swappable**: drop it in `public/`, rerun
`node scratch/generate_cave_scenes.js`, and the videos rebuild using your art.

## Shared direction

Same bible as the class intros (`docs/class-intro-cutscene-prompts.md`):
stylized 2.5D hand-painted sci-fi, chunky readable silhouettes, subtle grain,
no readable text or logos. New palette notes for hive material: wet organic
surfaces, sickly bioluminescent green (#8CFF96 range) against amber egg-glow
(#FFB144 range), deep blue-black shadows.

**Format for all sprites: PNG on a pure-black background** (the generator
chroma-keys anything darker than RGB 15,15,15 to transparent — same trick as
the ship sprites).

## The list

| File | Used by | Prompt sketch |
| --- | --- | --- |
| `public/cave_mouth.png` | cave-reveal scene (exterior push-in) | Jagged organic cave entrance in a glacier wall, ringed with dark chitinous growths like teeth, faint amber glow pulsing from inside, sickly green rim light on wet ice. Front view, ~1200px wide, black bg. |
| `public/hive_interior.png` | cave-reveal scene (egg chamber backdrop) | Hive chamber interior wall: wet ropey organic material grown over bunker metal, bioluminescent green veins, dark recesses. 1920×1080 full-frame backdrop, dark enough that egg glows read on top. |
| `public/egg_cluster.png` | cave-reveal scene (pulsing clutches) | Cluster of 3–5 translucent alien eggs, amber inner glow, dark embryo shadows visible inside, wet membrane highlights. ~600px, black bg. |
| `public/queen_silhouette.png` | cave-reveal scene (strobe tease) | The PregAlien queen as a pure silhouette: tall crowned mass, segmented plates, egg-heavy abdomen, backlit by green — mostly black shape with minimal green rim detail. Tall portrait ~800×1400, black bg. |
| `public/survivor_vessel.png` | act3-departure scene (the four-seat ship) | Cobbled-together survivor escape vessel: welded hull plates from three different wrecks, four small canopy lights in a row, amber engine cones below, scorch marks. Nose-up flight pose, ~900px, black bg. |
| `public/lore_portraits/queen_00.webp` | Queen dialogue portrait (in-game) | Bust portrait matching lore_portraits style: the queen's crowned head half-lit by green bio-glow, alien but regal, dark background. Square, webp like the survivor_XX set. Currently borrowing `survivor_05.webp` — swap the path in `src/dialogue.js` `getDialogueSpeaker` when this lands. |

## Already covered (no art needed)

- Class intro GIFs + launch webm videos — shipped in `public/` and `public/cutscenes/`.
- Camps, cave entrance, signal dish in-world — procedural Three.js geometry.
- `cave-reveal.webm` / `act3-departure.webm` — auto-generated placeholders exist and are wired into the game (cave interact and Act 2 departure respectively).
