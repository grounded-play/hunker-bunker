# Cutscene films and lived-in asset prompts — 2026-10-08

Owner, 2026-10-08: "provide some prompts for the sleep cutscene styles and other missing cutscenes ... what's first frame, last frame and action for each film ... as well as 2D studio-lit perspective realistic image prompts in the style of others, to give me 20 new assets to populate the game and make it more lived in."

Every prompt follows the key-art rule book in [`sprint-53-world-variety-night-and-sleep-2026-10-07.md` §0](sprint-53-world-variety-night-and-sleep-2026-10-07.md):
- **Scale:** monumental biomechanical architecture, with the operator small in frame.
- **Light:** darkness first, and only a few practical sources.
- **Atmosphere:** floor fog and wet, reflective floors.
- **Surfaces:** grimy gunmetal, ivory bone, black latex.
- **Accent colours:** one per biome.
  - cyan: cryo;
  - green: bio, hive;
  - amber: human machinery;
  - red: warning;
  - violet: only the Queen.

It refines the sleep sets in that doc's §C, which had three stills plus one motion line each, into first frame, last frame and action.

---

## Part 1 — Films

### What is missing

| Film | File | Status today | Wired? |
|---|---|---|---|
| Sleep: bunker cot | `sleep-bunker` | none; a night card plays instead | yes: `main.js` → `playSleepCutscene` |
| Sleep: camp bedroll | `sleep-camp` | none | yes |
| Sleep: cryo pod | `sleep-cryo` | none | yes |
| Sleep: hive cocoon | `sleep-hive` | none | yes |
| Sleep: squad watch | `sleep-squad` | none | yes |
| Ending: Mothership Infection | `ending-mothershipinfection` | ~160 KB generated placeholder | yes: `ACT2_ENDING_CUTSCENES` |
| Ending: Alien Exodus | `ending-alienexodus` | ~220 KB placeholder | yes |
| Ending: Outed Escape | `ending-outedescape` | ~190 KB placeholder | yes |
| Ending: Failed Carrier | `ending-failedcarrier` | ~190 KB placeholder | yes |
| Ending: Empty Husk | `ending-emptyhusk` | ~185 KB placeholder | yes |
| Beat: descending a level | `event-descent` | none | **no:** needs a trigger on `ELEVATOR_DESCENDED` |
| Beat: first contact at a camp | `event-camp-first-contact` | none | **no:** needs a trigger on `camp-first-contact` |
| Beat: bonding with a hive | `event-hive-bonded` | none | **no:** needs a trigger on hive bond |

The other ending, death and event films already exist. The deaths are Ken Burns pans over stills (`npm run cinematics:stills`), so they could be upgraded to real motion later with the same three-part format.

### How to make one

1. Generate the **first frame** and the **last frame** as stills, using the prompt plus the shared style block, with the negative block in the negative field.
2. Run image-to-video with both frames as the start and end keyframes, using the **action** prompt.
3. Export at 1920×1080 and 24 fps:
   - `public/cutscenes/<file>.webm` (VP9);
   - `<file>.mp4` (H.264) as the fallback;
   - `<file>-poster.jpg`, taken from the first frame.
4. Sleep films: add the base name to `SHIPPED_SLEEP_CUTSCENES` in `src/sleepCutscene.js`. Until then the night card keeps playing.
5. Endings: replace the placeholder file. The runtime already points at it.

**Lengths:**
- sleep: 6–8 s;
- endings: 12–16 s;
- beats: 5–7 s.

Every film ends on black: the game holds black for a beat, then cuts to its card.

**The operator:** helmet always sealed, with the visor reflecting the light. Never a face in close-up. The suit is generic armoured exosuit, so one film serves Scout, Tank and Engineer.

### Shared style block (append to every still)

```text
Photorealistic cinematic film still, key-art lighting: a near-black frame lit by only one or two practical light sources, amber floor pinpoints, cold fog rolling low along a wet reflective floor, monumental biomechanical architecture of ivory-bone ribs, vertebral pipework and grimy riveted gunmetal fading into darkness above, H.R. Giger biomechanical horror fused with brutal deep-space corporate industrial design, a lone operator in a scuffed armoured exosuit with the helmet sealed and the visor reflecting the light, small in frame against the scale of the space, 35mm film grain, faint atmospheric haze, high dynamic range, 16:9, 1920x1080.
```

### Negative block (stills and video)

```text
text, letters, numbers, writing, logos, UI, HUD, subtitles, watermark, signature, bright clean lighting, daylight, blue sky, sunshine, cartoon, anime, illustration, painterly, cel shading, sketch, close-up human face, exposed skin, nudity, gore, blood spray, dismemberment, extra limbs, deformed hands, duplicated operator, fantasy, medieval, church, crosses, runes, pastel colors, lens flare streaks, chromatic aberration, motion blur smear, morphing architecture, flicker
```

---

### S1. Sleep — bunker cot · `sleep-bunker` · 7 s

**Plays when** you rest at the cot by your crashed ship. **Beat:** alone, exhausted, safe for one more night.

- **First frame**
  ```text
  Wide shot inside a cramped bunker built into the torn hull of a crashed ship, the operator sitting on the edge of a narrow steel cot, elbows on knees, helmet sealed, a rifle propped against the cot frame, one caged work lamp hanging from a ribbed pipe and throwing a warm amber pool over the cot, everything beyond that pool near black, cold fog drifting across a wet riveted floor, the ship's ribbed hull curving overhead like a ribcage, condensation beading on the pipes.
  ```
- **Last frame**
  ```text
  The same bunker almost entirely dark, the operator lying on the cot under a thin foil blanket, one gloved hand resting on the rifle, the work lamp switched off and only its filament dying to a dim orange thread, a single amber standby pinpoint on the ship's console far in the background, fog settled flat and still on the floor.
  ```
- **Action**
  ```text
  Slow 6-second push-in from the wide shot toward the cot. The operator lowers themself back onto the cot and pulls the foil blanket over their legs, one hand settling onto the rifle. The hanging lamp sways gently from the movement, then flickers twice and fades out, its filament cooling to a dull orange thread. Steam drips from a pipe; fog drifts then settles. The camera stops; hold for one second; fade to black. Architecture must stay rigid; no new objects appear.
  ```

### S2. Sleep — camp bedroll · `sleep-camp` · 8 s

**Plays when** you rest at a survivor camp: Meridian, Tallow or Vesper. **Beat:** the only warm place on the planet, borrowed.

- **First frame**
  ```text
  Low wide shot of a survivors' camp in a vast dark bunker hall, an oil-drum fire in the centre throwing flickering orange light over a ring of bedrolls, supply crates and sandbag walls, the operator sitting on a bedroll with their back to camera, helmet sealed, warming gloved hands at the fire, two survivors in patched coats silhouetted across the flames, laundry strung between pipes, monumental ribbed biomechanical arches vanishing into black overhead, sparks rising.
  ```
- **Last frame**
  ```text
  The same camp asleep, the fire burned down to a bed of glowing embers, the operator a dark shape curled on the bedroll, the survivors asleep under blankets, a single sentry silhouetted at the sandbag barricade with a rifle, looking out into the dark, a faint cold blue-grey glow at the far end of the hall, sparks gone, fog creeping in under the barricade.
  ```
- **Action**
  ```text
  Slow quarter-orbit around the fire, starting low behind the operator and ending high and wide over the camp. The operator lies back on the bedroll. A survivor feeds a broken chair leg into the flames, sending up a short burst of sparks, then lies down. The firelight gradually dims to an ember glow; shadows lengthen. In the last two seconds the sentry at the barricade turns their head toward the dark. Fog creeps along the floor. Fade to black on the sentry.
  ```

### S3. Sleep — cryo pod · `sleep-cryo` · 7 s

**Plays when** you rest out in the cryo ring, or while infected. **Beat:** sleep as preservation; the cold keeps you.

- **First frame**
  ```text
  An emergency thermal cryo pod standing upright in a frozen chamber, its ribbed glass lid half open and furred with frost, the operator stepping back into the padded cradle inside, helmet sealed, cyan instrument light washing over the frost from a strip inside the pod, icicles hanging from biomechanical conduits overhead, white fog pouring slowly out of the pod's base across a floor of black ice.
  ```
- **Last frame**
  ```text
  The cryo pod sealed shut, its glass lid entirely covered in dense fern-like frost so the operator is only a dark silhouette behind it, the cyan light inside dimmed to a faint standby glow, the frozen chamber silent and almost black, fog lying motionless on the ice.
  ```
- **Action**
  ```text
  The camera holds a slow, steady push toward the pod. The operator settles back into the cradle and the lid swings closed with a soft hiss of vapour. Frost blooms across the glass from the edges inward in branching fractal ferns until the silhouette inside is barely visible. A cyan heartbeat light pulses three times, each slower than the last, then dims to standby. Fog stops moving. Fade to black.
  ```

### S4. Sleep — hive cocoon · `sleep-hive` · 8 s

**Plays when** you are bonded to a hive and rest in the bio ring. **Beat:** tender and wrong; the hive holds you like its own.

- **First frame**
  ```text
  Deep inside a biomechanical hive chamber, the operator lying back into a cradle of glossy black latex and curved ivory ribs, helmet sealed, the cradle's ribs half open like cupped fingers, thin glistening tendrils lifting from the cradle toward the armour, emerald bioluminescent veins pulsing slowly in the ribbed walls, warm wet mist hanging in the air, everything beyond the cradle dissolving into dark.
  ```
- **Last frame**
  ```text
  Pulled far back: the hive chamber wall lined with rows of closed translucent cocoons, each glowing softly emerald from within and breathing in unison, one cocoon in the middle row holding the faint shape of an armoured figure with a visor glowing green, wet mist, monumental ivory ribs arching overhead into black.
  ```
- **Action**
  ```text
  The ribs of the cradle close slowly over the operator like fingers folding, and a translucent membrane seals between them. Tendrils settle gently across the armour without striking. The membrane begins to rise and fall in a slow breathing rhythm; the visor inside picks up the emerald glow. The camera pulls back and up in one continuous move to reveal the cocoon is one of dozens along the chamber wall, all breathing together. Fade to black. No sudden movements, no teeth, no gore.
  ```

### S5. Sleep — squad watch · `sleep-squad` · 8 s

**Plays when** you rest in co-op. **Beat:** someone stays awake so you can sleep.

- **First frame**
  ```text
  Two armoured operators inside the crash-site bunker at night: one lying on a steel cot under a foil blanket, the other sitting on an ammo crate by the open bunker door with a rifle across their knees keeping watch, both helmets sealed, a single caged amber lamp hanging between them, cold fog drifting in through the doorway from the black outside, the crashed ship's ribbed hull looming behind.
  ```
- **Last frame**
  ```text
  The same bunker in deep dusk: the sleeper still under the blanket, the watcher's helmet tipped forward in sleep against the door frame with the rifle still across their knees, the amber lamp guttered to a faint ember glow, and at the very edge of the open doorway the first thin grey-blue light of dawn touching the fog.
  ```
- **Action**
  ```text
  Slow lateral dolly from the sleeping operator across to the watcher at the door. Out in the dark beyond the doorway a distant cold glow drifts left to right and disappears; the watcher's visor tracks it and catches its reflection. A long still moment. The watcher's head slowly nods forward in sleep. The lamp gutters low. Faint grey dawn light rises at the doorway in the last second. Fade to black.
  ```

---

### E1. Ending — Mothership Infection · `ending-mothershipinfection` · 14 s

**Closing lines:**

> MOTHERSHIP CLEARANCE ACCEPTED. SURVIVOR RESCUE FLIGHT LOGGED.
> THREE PASSENGERS SLEEPING. VITALS CLEAN. YOURS READ CLEAN TOO.
> QUEEN: GO QUIETLY, CARRIER. THE BIG SHIP IS WARM, AND WE ARE PATIENT.

**Beat:** a perfect rescue that is a perfect infection.

- **First frame**
  ```text
  Interior of a small rescue shuttle's cabin in flight, dim and clean by this world's standards, three survivors asleep strapped into crash seats under grey thermal blankets, the operator seated at the end of the row with helmet sealed and hands resting calmly on their knees, a cockpit window ahead showing the immense dark hull of a mothership filling the view, lit with long rows of cold white running lights, one warm amber cabin light overhead.
  ```
- **Last frame**
  ```text
  Close on the operator's visor in the dark cabin, reflecting the mothership's docking bay lights sliding past, and beneath the reflection, deep inside the visor, a faint pulse of violet light like a heartbeat, the rest of the frame black.
  ```
- **Action**
  ```text
  Begin wide on the sleeping cabin; the shuttle glides toward the mothership and its docking bay lights sweep across the sleeping faces' blankets in slow bands. The camera drifts down the row of seats toward the operator, who is perfectly still. As the bay doors close behind the shuttle the cabin light shifts from amber to the mothership's cold white. Final push-in onto the visor: the docking lights reflect across it, and underneath them a single slow violet pulse appears, then a second. Cut to black on the second pulse. Calm, quiet, no alarms.
  ```

### E2. Ending — Alien Exodus · `ending-alienexodus` · 15 s

**Closing lines:**

> LAUNCH COMPLETE. CARGO: THREE NON-HUMAN SIGNATURES. FRIENDLY.
> THE QUEEN'S SIGNAL IS SCREAMING FROM THE ICE. FADING. GONE.
> NAHL IS SINGING SOMETHING THROUGH THE HULL. IT SOUNDS LIKE THANK YOU.

**Beat:** you leave with the hives, not the humans, and it is beautiful.

- **First frame**
  ```text
  Inside the cargo hold of a battered launch vessel at the moment of lift-off, three tall biomechanical alien allies of glossy black latex and ivory chitin standing braced among strapped crates, their ribbed crests glowing soft emerald, the operator standing among them with helmet sealed and one gloved hand on a cargo strap, the hold door still open on a white-blue ice field and a monumental ruined hive spire behind, violet light bleeding up through cracks in the ice far below.
  ```
- **Last frame**
  ```text
  High above the planet: the small launch vessel a single spark climbing through black space, the frozen planet below with one fading violet glow on its night side, and inside the vessel's hull a soft emerald light pulsing through a narrow viewport, stars sharp and still.
  ```
- **Action**
  ```text
  The hold door closes on the ice field as the ship lifts; the deck shudders. Through the closing gap the violet glow beneath the ice flares once, a scream of light, and the door seals over it. Inside, one of the alien allies lays a long-fingered hand gently on the hull and its crest pulses emerald in a slow rhythm, like singing; the other two answer. Cut outside: the ship rises out of the atmosphere into black space as the violet glow on the planet below dims and goes out. Hold on the climbing spark with the emerald pulse in its viewport. Fade to black.
  ```

### E3. Ending — Outed Escape · `ending-outedescape` · 13 s

**Closing lines:**

> CABIN LOCKS ENGAGED FROM THE PASSENGER SIDE.
> THE SURVIVORS KNOW. THEY BOARDED ANYWAY.
> QUARANTINE COURSE SET. NOBODY IS SLEEPING ON THIS FLIGHT.

**Beat:** they know what you are; they came anyway; nobody blinks.

- **First frame**
  ```text
  The cramped passenger cabin of a launch vessel in flight, harsh red warning light washing everything, a heavy pressure door with a small thick viewport separating the cockpit from the cabin, through the viewport four survivors in patched coats sitting bolt upright in their seats, all of them awake and staring toward the door, one holding a rifle across their lap, the operator alone on the cockpit side of the door, helmet sealed, back to camera.
  ```
- **Last frame**
  ```text
  Close on the pressure door's viewport from the cockpit side, the operator's visor reflected faintly in the scratched glass, and through it one survivor's gloved hand pressed flat against the other side of the glass, the cabin behind them in red light, nobody asleep.
  ```
- **Action**
  ```text
  Slow push from behind the operator toward the pressure door. A heavy lock bolt slides home on the passenger side with a visible jolt. Through the viewport the survivors do not move; their eyes follow the operator. The ship's red warning light pulses slowly. One survivor stands, walks to the door and places a gloved hand flat on the glass, steady, neither threat nor plea. The operator's visor reflection overlaps the hand. Hold; the red light pulses twice more. Fade to black.
  ```

### E4. Ending — Failed Carrier · `ending-failedcarrier` · 14 s

**Closing lines:**

> LAUNCH COMPLETE. COOLANT CELL BREACH IN COMPARTMENT FOUR.
> THE AMBER GLOW IS FLICKERING. SOMEONE IS ASKING WHAT THAT LIGHT IS.
> YOU HID THE FUTURE IN A COLD BOX AND THE COLD BOX IS FAILING.

**Beat:** the containment you trusted is thawing in the hold.

- **First frame**
  ```text
  The dark cargo hold of a launch vessel in flight, a single heavy cryo containment box bolted to the deck in the centre of the frame, ribbed gunmetal with a frosted inspection window, a warm amber glow pulsing from inside the window, frost on its edges beginning to bead into water, a thin stream of white vapour leaking from a cracked seal, the operator standing over it with helmet sealed, a survivor's silhouette in the open hatch behind, looking in.
  ```
- **Last frame**
  ```text
  Extreme close-up on the containment box's inspection window: the frost almost gone, condensation running down the glass, and behind it the amber glow now steady and strong, something ribbed and translucent pressed against the inside of the glass, the frame otherwise black.
  ```
- **Action**
  ```text
  The camera drifts slowly down from over the operator's shoulder toward the containment box. The amber glow flickers irregularly; frost on the box melts into running droplets; the vapour leak thickens. The survivor in the hatch takes one step closer and stops. A warning light on the box's side switches from cyan to red. Final slow push into the inspection window as the last of the frost clears and the glow steadies, a ribbed shape pressing gently against the glass from inside. Cut to black.
  ```

### E5. Ending — Empty Husk · `ending-emptyhusk` · 16 s

**Closing lines:**

> LAUNCH COMPLETE. CREW MANIFEST: ONE.
> THE CAMPS ARE SILENT. THE HIVES ARE SILENT. THE QUEEN IS SILENT.
> THERE WAS SO MUCH TO CARRY. YOU CARRIED NOTHING.

**Beat:** you got out alone, and nothing followed you because nothing was left.

- **First frame**
  ```text
  A survivors' camp in a vast dark bunker hall, abandoned: the oil-drum fire cold and grey with ash, bedrolls empty and frosted, laundry frozen stiff on its line, crates tipped over, no people anywhere, a single amber lamp still burning on a pole and swinging slightly, monumental ribbed arches vanishing into black above, fog drifting through the empty camp.
  ```
- **Last frame**
  ```text
  A lone launch vessel climbing away from a dark frozen planet, small against black space, its single cabin window lit amber, and behind it on the planet's surface no lights at all: no camp fires, no hive glow, nothing, the planet a dead grey disc.
  ```
- **Action**
  ```text
  Slow drift through the empty camp, past the cold fire and the frozen laundry; the lone lamp sways and finally goes out. Cut: through a narrow cockpit window the operator, helmet sealed, alone in a single seat, the cabin otherwise empty, straps hanging loose on every other seat. Cut outside: the ship climbs into space as the camera pulls back to show the planet below with not a single light on its surface. Hold on the small amber window. Fade to black.
  ```

---

### B1. Beat — descending a level · `event-descent` · 6 s

**Not wired.** It needs a trigger on `COOP_TRANSITION_EVENTS.ELEVATOR_DESCENDED`. **Beat:** going deeper is a choice you feel in your stomach.

- **First frame**
  ```text
  An open industrial cargo lift platform at the top of a colossal vertical shaft, the operator standing alone in the centre of the platform, helmet sealed, one hand on a guard rail, a single caged amber lamp on the lift's mast, the shaft walls lined with ribbed biomechanical pipework and ivory vertebrae plunging down into total darkness, fog spilling over the platform's edge.
  ```
- **Last frame**
  ```text
  Looking straight down the shaft from far above: the lift platform a tiny square of amber light sinking into black, the ribbed walls converging to a vanishing point, a faint cyan glow far below where the shaft ends.
  ```
- **Action**
  ```text
  The lift lurches and begins to descend; the guard rail vibrates. The camera stays fixed at the top of the shaft as the platform drops away beneath it, the operator's amber light shrinking, ribs and pipes sliding past. Steam vents along the shaft wall burst in sequence as the lift passes them. The platform becomes a small square of light; a cyan glow appears far below. Fade to black.
  ```

### B2. Beat — first contact at a camp · `event-camp-first-contact` · 6 s

**Not wired.** It needs a trigger on `camp-first-contact`, today a flare plus a reward. **Beat:** other people are alive down here, and they are pointing guns at you.

- **First frame**
  ```text
  A dark bunker corridor opening onto a vast hall, the operator standing in the corridor mouth with hands slightly raised, helmet sealed, facing a sandbag and scrap-metal barricade across the hall, a red signal flare burning on the floor between them throwing hard red light and smoke, three survivor silhouettes behind the barricade aiming rifles, the barricade lit from behind by a warm amber camp glow.
  ```
- **Last frame**
  ```text
  The same hall moments later: the flare burned down to a smoking stub, a gap opened in the barricade, one survivor in a patched coat standing in it with their rifle lowered, waving the operator in, the warm amber camp light spilling through the gap onto the wet floor between them.
  ```
- **Action**
  ```text
  Hold wide and tense: the flare sputters, red smoke rolls across the floor, the rifles stay up. The operator slowly lowers their hands. A survivor lowers their rifle, then drags a scrap panel aside to open a gap in the barricade; amber light spills out through it. The survivor waves once. The flare dies. Fade to black.
  ```

### B3. Beat — bonding with a hive · `event-hive-bonded` · 7 s

**Not wired.** It needs a trigger when a hive bond completes. **Beat:** the hive accepts you, and the operator accepts it back.

- **First frame**
  ```text
  A towering biomechanical hive chamber, a tall alien leader of glossy black latex and ivory chitin with a ribbed glowing crest standing over the kneeling operator, helmet sealed, one long-fingered hand extended toward the operator's visor, emerald bioluminescent veins pulsing in the walls, warm wet mist, monumental ribs arching into darkness above.
  ```
- **Last frame**
  ```text
  The same chamber with the operator standing beside the alien leader, both facing the camera, a thin emerald vein-pattern now glowing faintly across the operator's armour plates like frost of light, the walls' pulse and the armour's pulse in sync, mist settling.
  ```
- **Action**
  ```text
  The alien leader's fingertips touch the operator's visor and an emerald light spreads from the contact point across the armour in branching vein patterns. The walls' pulse quickens to match it, then both slow together. The operator rises to stand beside the leader. Slow push-in throughout. The glow settles to a faint shared heartbeat. Fade to black. Tender, not violent.
  ```

---

## Part 2 — Twenty lived-in assets

The world has rooms and threats, but few signs that people lived here: where they ate, slept, washed, passed time and remembered the dead. These twenty fill that gap. None duplicates a shipped model (`WORLD_3D_MODELS`) or the 27 props already requested in the Sprint 53 doc §A.

**Pipeline** (same as Sprint 53 §A and `docs/planning/3d-gap-generation-prompts-2026-10-05.md`):
1. Generate the studio-lit image from the block.
2. Run image-to-3D.
3. Put the GLB in `art/raw/`.
4. It is optimised into `public/3d/runtime/new3ds/`, registered in `WORLD_3D_MODELS` with its `propBehavior`, given a `maxSpan` if needed, and checked on the museum walk.

Use the **negative block (3D props)** from Sprint 53 §A in the negative field.

| # | Asset | File | Where | Size | Tris | Accent | Behaviour |
|---|---|---|---|---|---|---|---|
| 1 | Bunker mess table | `life_mess_table.glb` | bunker mess | 0.9 m, 2.4 m long | 6k | amber | solid |
| 2 | Triple crew bunk | `life_bunk_stack.glb` | quarters, camp | 2.1 m | 7k | amber | solid |
| 3 | Galley hot-plate cart | `life_galley_hotplate.glb` | mess, camp | 1.0 m | 5k | amber | solid |
| 4 | Cable-drum card table | `life_card_table.glb` | camp, quarters | 0.8 m, 1.6 m across | 6k | amber | solid |
| 5 | Memorial board | `life_memorial_board.glb` | camp, chapel | 1.6 m | 5k | amber | solid, thin |
| 6 | Hydroponic grow rack | `life_hydro_rack.glb` | camp, hydro | 1.8 m | 7k | amber | solid |
| 7 | Condensate water still | `life_water_still.glb` | cryo, camp | 1.3 m | 6k | cyan | solid |
| 8 | Suit drying rack | `life_suit_drying_rack.glb` | quarters, airlock | 1.9 m | 6k | amber | solid |
| 9 | Chemical latrine stall | `life_latrine_stall.glb` | camp edge | 2.1 m | 5k | none | solid |
| 10 | Oil-drum stove | `life_barrel_heater.glb` | camp, cryo | 1.4 m | 4k | amber | solid, light |
| 11 | Route-map table | `life_route_map_table.glb` | ops, camp | 1.1 m | 6k | amber | solid |
| 12 | Reloading bench | `life_reloading_bench.glb` | armory | 1.0 m, 1.8 m long | 7k | amber | solid |
| 13 | Covered stretcher | `life_covered_stretcher.glb` | medical, camp | 0.7 m | 4k | none | solid, low |
| 14 | Pipe hammock | `life_pipe_hammock.glb` | camp, maintenance | 1.6 m | 5k | none | solid |
| 15 | Floodlight tripod | `life_flood_lamp_tripod.glb` | anywhere | 1.9 m | 4k | amber | solid, light |
| 16 | Smashed ration vending machine | `life_vending_machine.glb` | bunker halls | 1.9 m | 6k | amber | solid |
| 17 | Netted cargo pallet | `life_cargo_pallet_netted.glb` | storage, cryo | 1.4 m | 6k | none | solid |
| 18 | Open footlocker | `life_footlocker_open.glb` | quarters, camp | 0.5 m | 4k | none | solid, low |
| 19 | Day-tally bulkhead | `life_tally_bulkhead.glb` | quarters, holdouts | 2.0 m, 1.4 m wide | 3k | none | solid, thin |
| 20 | Respirator rack | `life_mask_rack.glb` | bio, decon | 1.7 m | 6k | green | solid |

The style tail is the same on every block, so each prompt is complete on its own.

**1. Bunker mess table** — `life_mess_table.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE long riveted steel mess table bolted to a floor plate, with two attached steel benches on swing arms, four dented compartment meal trays left mid-meal with dried ration paste, a chipped enamel mug, scattered bent cutlery, a ration can used as an ashtray, and a small warming plate with one amber (#f59e0b) element glowing at the table's end. Lived-in, abandoned in a hurry. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, scuffed enamel, grime, ribbed pipe-section legs, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**2. Triple crew bunk** — `life_bunk_stack.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE triple-stacked crew bunk frame of welded gunmetal tubing, three thin stained mattresses, a grey wool blanket hung from the top rail as a privacy curtain, a pair of worn boots under the bottom bunk, a small clip-on reading lamp with a warm amber (#f59e0b) bulb on the middle rail, a canvas personal pouch hanging from a hook. Cramped, human, worn. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed vertebral tubing joints, rough canvas, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**3. Galley hot-plate cart** — `life_galley_hotplate.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE scorched steel utility cart used as a field galley: a two-ring electric hot plate with one ring glowing dull amber (#f59e0b), a dented kettle on it, a stack of mismatched chipped mugs, a torn carton of powdered ration, a ladle hanging from the side rail, and a thick cable running down to a battery pack on the bottom shelf. Warm, makeshift, heavily used. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, scorch marks, grease film, ribbed cable sheathing, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**4. Cable-drum card table** — `life_card_table.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE small scene-piece on one shared footprint: an upturned wooden cable drum used as a table, a game of cards left mid-hand with worn face-down cards and a few with abstract faded pips, bottle caps stacked as betting chips, a tin lantern with a warm amber (#f59e0b) flame, and three mismatched supply crates pulled up as stools. Off-duty, human, frozen in time. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: scarred wood, cold cast gunmetal banding, scuffed composite, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**5. Memorial board** — `life_memorial_board.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE scrap steel panel mounted on a welded tripod stand, covered in pinned faded photographs bleached so pale their images are unrecognisable, several stamped metal dog-tags hanging from wires along the top edge, a dried flower stem tucked into a bolt hole, and a narrow ledge holding a melted candle stub with one tiny amber (#f59e0b) flame. Grief kept with care. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: rusted gunmetal, curled paper, tarnished steel tags, wax drips, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no readable writing, 1:1 aspect ratio.
```

**6. Hydroponic grow rack** — `life_hydro_rack.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE three-tier hydroponic grow rack of corroded steel, grimy plastic trays of sickly pale lettuce and twisted thin tomato vines with a few small green fruit, clear drip tubes looping between tiers, mineral crust on the tray lips, and warm amber (#f59e0b) grow-light bars mounted under each shelf. Stubborn life in a dead place. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, ribbed tubing, wet leaves, mineral scale, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, subsurface scattering in the leaves, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**7. Condensate water still** — `life_water_still.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE improvised water still: a dented steel drum on a small frame, frost crusted on its upper half, a coil of green-tarnished copper tubing running to a cylindrical filter canister with a tiny cyan (#22d3ee) status light, dripping into a battered jerry can below, a rag tied tight around one leaking joint, ice beading on the coil. Resourceful survival engineering. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, tarnished copper, frost, translucent ice, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, subsurface scattering in the ice, glossy specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**8. Suit drying rack** — `life_suit_drying_rack.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE free-standing pipe rack holding an empty padded black exosuit undersuit liner hung by its shoulders like a deflated person, armoured gloves on hooks, a pair of heavy magnetic boots on the base plate, and a small blower heater at the foot with an amber (#f59e0b) element glowing, steam faintly rising from the damp liner. Ritual of a long shift. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, quilted black latex padding, scuffed armour plates, ribbed pipe joints, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no people, no text, 1:1 aspect ratio.
```

**9. Chemical latrine stall** — `life_latrine_stall.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE corrugated steel chemical-toilet cubicle, its door hanging ajar on one bent hinge with only the edge of a seat visible inside, a toilet-paper roll threaded on a wire, worn hazard stripes around the base, a hand-pump wash basin bolted to the outside wall with a cracked mirror shard above it, rust streaks down the panels. Mundane, grimy, human. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: corrugated gunmetal, rust, chipped paint, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**10. Oil-drum stove** — `life_barrel_heater.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE oil drum converted into a stove, rows of punched holes glowing hot orange-amber (#f59e0b) from the fire inside, a steel grill grate across the top holding a dented kettle, a bent stovepipe chimney rising from the side, the drum standing on three bricks, soot blackening its upper half and scorched paint peeling. The warm centre of a cold room. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: soot-blackened gunmetal, scorched paint, ember glow, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, emissive ember glow, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**11. Route-map table** — `life_route_map_table.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE sloped steel drafting table covered in hand-drawn route charts made only of lines, contours and arrows, push-pins with faded red thread strung between them, coffee-ring stains, a brass compass and a grease pencil, and an articulated magnifier lamp clamped to the edge with a warm amber (#f59e0b) bulb. Someone was planning a way out. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, curled paper, tarnished brass, ribbed lamp arm, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no letters or numbers on the maps, 1:1 aspect ratio.
```

**12. Reloading bench** — `life_reloading_bench.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy weapon-maintenance bench: a bench vice gripping a rifle barrel, a field-stripped rifle laid out in order on an oil-stained rag, a tin of spent brass casings, cleaning rods and brushes, a short stack of magazines, and a clamp lamp with a warm amber (#f59e0b) bulb. Careful, practiced work. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, gun oil sheen, brass, scarred wooden top, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**13. Covered stretcher** — `life_covered_stretcher.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE folding field stretcher on low steel legs, a heavy grey canvas tarp laid over it and tied down with two straps, the tarp's draped shape the only hint of what lies beneath, nothing of a body visible, a blank metal tag hanging from a string at one corner, frost settled in the tarp's folds. Quiet, respectful, final. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, heavy weathered canvas, frost, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no body, no gore, no text, 1:1 aspect ratio.
```

**14. Pipe hammock** — `life_pipe_hammock.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE patched canvas hammock slung between two short vertical ribbed pipe sections, each pipe standing on its own riveted base plate, a rolled jacket as a pillow, a paperback book lying face-down and open on the canvas, a tin cup hanging from a cord. Stolen rest in the machinery. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: ribbed vertebral gunmetal pipe, patched canvas, frayed rope, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**15. Floodlight tripod** — `life_flood_lamp_tripod.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE tall portable floodlight on a folding steel tripod, a dented protective cage over one large lamp glowing warm amber (#f59e0b), gaffer-tape repairs on two legs, a heavy power cable coiled loosely at its feet running to a small battered battery box. The work lamp of the key art. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, chipped paint, ribbed cable sheathing, cloth tape, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, emissive lamp glow, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**16. Smashed ration vending machine** — `life_vending_machine.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE corporate ration vending machine, its front glass cracked in a spiderweb around a fist-sized hole, most spiral coils empty with three faded packets left, one side panel kicked in, the brand panel scraped blank, and one small amber (#f59e0b) coin-slot light still blinking. Old world, broken in desperation. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, cracked glass, scratched enamel, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy specular highlights on glass, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no logos, 1:1 aspect ratio.
```

**17. Netted cargo pallet** — `life_cargo_pallet_netted.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE cargo pallet stacked with mismatched supply crates, sealed drums and canvas sacks, held together by frayed cargo netting and two ratchet straps, one sack split and spilling grain, frost dusting the top layer and icicles on the strap buckles. Supplies hoarded against a long winter. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, scuffed composite, rough canvas, frayed rope, frost, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**18. Open footlocker** — `life_footlocker_open.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE battered personal footlocker with its lid propped open, inside a neatly folded spare undershirt, a bundle of letters tied with string with no readable writing, a small hand-carved wooden toy ship, a dented harmonica and a scratched photo frame whose picture is blurred beyond recognition. Someone's whole life in one box. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: dented gunmetal, worn fabric, aged paper, carved wood, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no readable writing, 1:1 aspect ratio.
```

**19. Day-tally bulkhead** — `life_tally_bulkhead.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE free-standing bulkhead wall panel section on two riveted feet, its face scratched with hundreds of day-tally marks in groups of five that grow more frantic toward one corner, soot smears where a hand rested, a nail with a single dog-tag hanging from it, and a stub of chalk on a narrow ledge. How long someone waited. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: scratched cold cast gunmetal, soot, chalk dust, ribbed edge framing, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, no letters or numbers, 1:1 aspect ratio.
```

**20. Respirator rack** — `life_mask_rack.glb`
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE free-standing steel rack of hooks hung with six gas masks and respirator hoods, their filter canisters stained green with spore residue, a bucket of spent filter cans at the base, one mask with a cracked visor, and a small contamination indicator glowing green (#10b981) on the rack's upright. The price of breathing in the bio ring. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening black latex masks, cold cast gunmetal, mould-stained filters, every surface slick and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no people, no text, 1:1 aspect ratio.
```

### Where they go once registered

- **Room dressing kits** (`src/roomDressingKits.js` and `src/roomThemes.js`):
  - quarters: 2, 8, 18, 19;
  - mess and galley: 1, 3, 16;
  - ops: 11, 15;
  - armory: 12;
  - medical: 13;
  - decon: 20.
- **Camps** (`src/camp.js` dressing):
  - Meridian: 11, 15;
  - Tallow: 3, 6, 10;
  - Vesper: 12, 19;
  - all three camps: 4, 5, 9, 14.
- **Cryo:** 7 and 17 carry frost, and 10 is the warm centre of a cold room.
- **Practical lights:** 10 and 15 can carry a `practicalLight` through the env-light pool (`registerEnvLight`). Never toggle a light's `.visible`: three recompiles every lit shader when the visible light count changes. See `docs/planning/qa-2026-10-07-no-damage-and-stalls.md`.
