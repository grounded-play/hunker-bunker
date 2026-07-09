# Class Intro Cutscene Prompts

These prompts are for short class-specific videos that play after the player confirms a hero on the select screen and before the crash / Mothership dialogue sequence.

## Shared Direction

Target length: 4 to 6 seconds.

Format: 16:9, 1920x1080 source, export WebM first and MP4 fallback if possible.

Style: stylized 2.5D sci-fi game cinematic, dark tactical command UI mood, hand-painted hard-surface armor, chunky readable silhouettes, black metal hangar walls, pipes, sliding blast doors, scanline/flicker lighting, amber work lights, cyan system glows, subtle film grain, no photorealism.

Keep it consistent with current assets:

- Hero select mood: `public/hunker_bunker_select.png`
- Class suits: `public/Scout.full.jpeg`, `public/Tank.full.jpeg`, `public/Eng.Full.jpeg`
- Ship silhouettes: `public/scout_ship.png`, `public/tank_ship.png`, `public/engineer_ship.png`

Avoid: readable text, subtitles, logos, UI labels, extra characters, gore, over-detailed cockpit dashboards, photoreal humans, smooth luxury spaceships, bright clean Star Trek lighting.

## Asset Placement

Put generated videos here:

```text
public/cutscenes/scout-intro.webm
public/cutscenes/tank-intro.webm
public/cutscenes/engineer-intro.webm
```

Optional MP4 fallbacks:

```text
public/cutscenes/scout-intro.mp4
public/cutscenes/tank-intro.mp4
public/cutscenes/engineer-intro.mp4
```

Optional poster frames:

```text
public/cutscenes/scout-intro-poster.jpg
public/cutscenes/tank-intro-poster.jpg
public/cutscenes/engineer-intro-poster.jpg
```

The clean code hook is `runMissionIntroSequence()` in `main.js`. It currently calls `cutsceneManager.play({ playerType })` before `dialogueManager.openMothershipDialogue({ playerType })`. Play the selected class video at that point. If you keep the current sprite crash, play the class video first, then the existing crash overlay.

## Scout Prompt

Use references: `public/Scout.full.jpeg` and `public/scout_ship.png`.

Prompt:

```text
4.5 second stylized 2.5D game cinematic. A lean SCOUT operator in a dark graphite recon exosuit with neon green visor and trim steps out of a tactical hero-selection chamber. The chamber is black metal with pipes, scanlines, amber warning strips, and green class glow. The operator moves fast and precise, almost weightless, sprinting down a short launch gantry as sliding blast doors open. A sharp triangular scout ship waits ahead, black hull with bright green outline, narrow arrow silhouette, twin cyan-green engine plumes. The Scout vaults into the cockpit in one motion, canopy seals, engines flare, the ship launches forward through a dark bay into star-streaked space. End on the ship beginning to shake as green warning reflections flicker across the hull, just before the crash. Cinematic camera, three-quarter isometric angle shifting to close-up launch, high contrast, thick readable silhouettes, hand-painted sci-fi game art, subtle grain, no text, no logos.
```

Prompt note: The Scout should feel like speed, agility, and recon. Use a sharp camera push, quick door opening, and thin bright green trails.

## Tank Prompt

Use references: `public/Tank.full.jpeg` and `public/tank_ship.png`.

Prompt:

```text
5 second stylized 2.5D game cinematic. A heavy TANK operator in oversized olive graphite armor with broad shoulder plates and amber visor stands in a dark industrial hero-selection bay. The floor has reinforced launch rails, hydraulic clamps, black pipes, orange work lights, and a low tactical command glow. The Tank walks with slow weight and power toward a bulky shield-shaped dropship, black armored hull with glowing amber outline, wide pentagonal silhouette, triple orange thrusters. Close shot of armored boots hitting the deck, clamps releasing steam, the operator braces one hand on the cockpit frame and climbs in. The canopy locks with a heavy mechanical seal, engines ignite like molten amber, and the ship punches out of the launch bay into space. End with a violent hull shudder, amber lights strobing across thick armor plating, just before the crash. Cinematic three-quarter camera, weighty motion, hand-painted hard-surface style, high contrast dark metal, subtle screen flicker, no readable text, no logos.
```

Prompt note: The Tank should feel durable and deliberate. Favor low camera angles, heavy hydraulics, and slower timing until the launch impact.

## Engineer Prompt

Use references: `public/Eng.Full.jpeg` and `public/engineer_ship.png`.

Prompt:

```text
4.8 second stylized 2.5D game cinematic. An ENGINEER operator in a blue-gray utility exosuit with cyan visor, backpack tools, and small antenna leaves a hero-selection chamber filled with black metal panels, cables, scanlines, and cool cyan diagnostic glow. The operator pauses at a sparking wall console, reroutes a cable with a quick practiced motion, and the nearby utility ship wakes up. The ship is tall and narrow with cyan outline, a side grid module, a small sensor arm, black hull, and a bright blue engine cone. The Engineer jogs into the cockpit as repair drones or tool lights flicker around the frame, canopy seals, cyan power lines chase across the hull, and the ship launches from the bay into star-streaked darkness. End with the sensor arm shaking loose and cyan warning light flicker across the cockpit glass, just before the crash. Cinematic three-quarter isometric camera, stylized game-art rendering, dark tactical console mood, hand-painted armor, crisp silhouettes, subtle grain, no text, no logos.
```

Prompt note: The Engineer should feel clever and technical. Include a tiny pre-launch fix so the class identity reads before the ship leaves.

## Recommended Runtime Flow

1. Player clicks `INITIALIZE`.
2. Door/selection state locks.
3. Play `public/cutscenes/{class}-intro.webm`.
4. Either continue into the existing `CutsceneManager` crash animation or replace it with the final beat of the video.
5. Open Mothership dialogue: "AGENT {CLASS}. YOU'RE ALIVE."

If the videos include the actual impact, skip the existing crash animation. If they stop at turbulence, keep the existing crash overlay as the impact payoff.
