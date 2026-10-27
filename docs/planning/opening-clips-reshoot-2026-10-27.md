# Opening clips reshoot

Status: shot list ready, not rendered | Owner: cinematics | Updated: 2026-10-27 | Review: after the first-frame pass

Owner, 2026-10-27: reshoot the opening as three clips, each unique to the class: **run to the ship and take off**, **fly through space**, **the crash**. Prompts use the [art bible](../design/art-style-bible.md) as written: its §5 shared style block and its avoid list, word for word, with no house additions. The source of truth for every prompt and reference is `scripts/cinematics/opening-shots.json`; the pipeline is [cinematics-comfyui-pipeline.md](../cinematics-comfyui-pipeline.md).

## What the opening is now

`main.js` → `playClassIntroSequence(playerType)` plays two videos, then `src/cutscene.js` plays the crash.

| Beat | File (per class) | Length | What it shows |
| :--- | :--- | :--- | :--- |
| Launch | `public/cutscenes/<class>-class-intro.webm` (+ poster) | 8 s | **Scout:** steps off a green holo pad in a clean grey hangar, runs into a tunnel, the green interceptor catapults out into space. **Tank:** a green-armoured figure (not the current Tank model) steps off a pad through steam and walks up the ramp of an amber-thrustered drop-hauler, which lifts off. **Engineer:** a cyan-suited figure (not the current Engineer model) kneels fuelling a cyan-canopied shuttle, which then flies in black space. |
| Flight | `public/cutscenes/<class>-intro.webm` | 5 s | A tiny ship sprite crossing a starfield, with terminal text "LAUNCH SEQUENCE: <CLASS> CLASS ACTIVE". |
| Crash | none: `CutsceneManager` in `src/cutscene.js` | 3.2 s | A DOM animation: the class wreck sprite (`public/<class>_ship.png`) falls through a streamed starfield, impact particles, fade. |

None of the current clips has its own audio; the game's music plays over them. They predate the art bible (clean sterile sci-fi hangars), and two show class suits that no longer match the class models.

## The reshoot

The close operator handoff now follows the companion
[Armory departure and exact operator identity capture](armory-opening-identity-capture-2026-10-27.md)
plan: the exact equipped 3D operator supplies the UI-free departure and rear
over-shoulder bridge, while these generated shots own the hangar/ship wides,
flight and crash. This avoids asking the image model to invent arbitrary player
cosmetics.

Nine clips: three shots × Scout, Tank, Engineer. Each is generated as first frame → action → last frame (FLUX.2 klein stills with reference images, Wan 2.2 motion, the last frame blended in), with a layered sound bed and no music track.

| Shot | Target (replaces) | Scout | Tank | Engineer |
| :--- | :--- | :--- | :--- | :--- |
| **Launch**, 8 s brief | `<class>-class-intro` | sprints across the Mothership's cathedral launch nave, vaults onto the wing, catapults down a ribbed launch tube and out through the arched portal | strides up the drop-hauler's rear ramp; thruster banks flare amber one by one; lifts through steam toward the vault's opening iron iris | unclamps the fuel line, checks a teal panel, climbs in; the shuttle rises off its clamps and glides out along its rail through the arched gate |
| **Flight**, 5 s | `<class>-intro` | barrel-rolls through tumbling hull debris beside the derelict Mothership until the frozen planet swings into view | ploughs straight through an ice-shard belt, shards bursting on its armour, the planet rising ahead | unfolds its sensor dishes and sweeps teal scan beams that lock onto the planet as it fills the frame |
| **Crash**, 6 s brief | `<class>-crash` (new) | a hypersonic streak from the surface shears a wing; it cartwheels down in fire and punches through the ice into a cathedral crypt | the strike kills its thruster banks; it drops belly-first through the ice and ploughs a trench across the crypt floor | the shockwave strips its panels; systems flicker teal and red as it spirals through the ice and rolls across the crypt, sparking |

The crash beat follows the opening text ("Your ship took a hypersonic strike on descent... crashed in Sector 9"), and its last frame lands in a buried cathedral crypt beneath the ice, which is where the crash site begins.

Art-bible states: the Mothership, the ships and the operator's gear are **Order** (hard-line Nordic design, amber lanterns); the crypt the ship crashes into is **Decay**; cryo blue only on the ice; teal only for screens and the Engineer's diagnostics. Each class keeps its accent: Scout green running lights, Tank amber thrusters, Engineer teal.

Wan 2.2 TI2V renders 5 s per take; the 8 s and 6 s briefs are compressed into it until a longer-take model is installed.

## References built into every frame

Each first frame is a FLUX.2 klein edit from ordered reference images, and the prompt names them ("image 1 is the game key art, for style and architecture; image 2 is the operator; image 3 is the ship"). The last frame uses the approved first frame as its reference. `name.webm@7.6` means the frame at 7.6 s of that video (extracted by `comfy_clips.py`).

| Ref | File | Used in |
| :--- | :--- | :--- |
| style / architecture | `public/title_key_art_v2.png` (the art bible's model piece) | every shot |
| Scout / Tank / Engineer | `art/source/art-remaster/sprite-v4/<class>/identity/<Class>.front-idle-master.png` | launch |
| Scout ship, intact | `public/cutscenes/scout-class-intro.webm@7.6` | launch, flight, crash |
| Tank ship, intact | `public/cutscenes/tank-class-intro.webm@5.5` | launch, flight, crash |
| Engineer ship, intact | `public/cutscenes/engineer-class-intro.webm@6.6` | launch, flight, crash |
| Wrecks | `public/scout_ship.png`, `public/tank_ship.png`, `public/engineer_ship.png` | crash |
| Mothership | `public/sky/body_mothership_derelict.png` | flight |
| Also listed for re-picks | `public/sky/body_planet_dead_ocean.png`, `public/sky/cinematic_deep_space_panorama.jpg`, `public/sky/fx_reentry_debris.png`, `public/sky/cinematic_cathedral_crypt_panorama.jpg`, `public/crash_site_broken_floor_v1.png`, `public/ending_scorchedsky_cockpit.png` | `refs` in the JSON |

To swap a reference, change the shot's `refs` list or a class's path in the JSON and rebuild the jobs.

## Render

```bash
node scripts/cinematics/build-clip-jobs.mjs
# First frames to review (three takes each), then pick
python3 scripts/cinematics/comfy_clips.py still opening-launch-scout --takes 3
cp art/source/cinematics/opening-launch-scout/still_2.png art/source/cinematics/opening-launch-scout/first_frame.png
python3 scripts/cinematics/comfy_clips.py last opening-launch-scout --takes 3
# Motion + sound + a preview beside the take (does not touch public/)
python3 scripts/cinematics/comfy_clips.py make opening-launch-scout --model wan
# The whole opening, unattended
python3 scripts/cinematics/comfy_clips.py batch opening-launch-scout opening-launch-tank opening-launch-engineer \
  opening-flight-scout opening-flight-tank opening-flight-engineer opening-crash-scout opening-crash-tank opening-crash-engineer
```

`batch` never includes the opening unless the jobs are named, because encoding replaces the shipped intro videos.

## Wiring

- Launch and flight land on the files `playClassIntroSequence` already plays, so an encode replaces them in place.
- The crash has no video slot yet. Wiring `<class>-crash.webm` in place of the `CutsceneManager` sprite drop (keeping the sprite as the fallback when the video is missing) is the one code change, made when the first crash take is approved.
- The flight's "LAUNCH SEQUENCE" terminal text was burned into the old video; if it should stay, it becomes a DOM caption over the new clip.

## Review gates

A take is approved when the operator matches the class model with the helmet sealed, the ship keeps its silhouette and class accent from frame one to the last, the architecture reads as the art bible (granite, iron bindings, round arches, biology only from seams), no text appears, and the last frame holds long enough to cut.
