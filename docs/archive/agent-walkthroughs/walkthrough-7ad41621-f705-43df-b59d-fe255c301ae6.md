# Walkthrough: Ship Upgrades, Snail Corpses & Class Intro Cutscenes

We have successfully generated and integrated the required graphics, video files, and code changes.

---

## 1. Ship Upgrades (NanoBanana)
Dynamically swaps textures when base modules are fully repaired.
- Scout: [scout_ship_broken.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/scout_ship_broken.png) / [scout_ship_healed.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/scout_ship_healed.png)
- Tank: [tank_ship_broken.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/tank_ship_broken.png) / [tank_ship_healed.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/tank_ship_healed.png)
- Engineer: [engineer_ship_broken.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/engineer_ship_broken.png) / [engineer_ship_healed.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/engineer_ship_healed.png)

---

## 2. Enemy Corpses (Visual Feedback)
We generated 6 custom dead shell sprites using Gemini 3 Pro to match the game's exact retro art style:

````carousel
![Cyber-Snail - Dead Shell](/home/caveman/.gemini/antigravity-ide/brain/7ad41621-f705-43df-b59d-fe255c301ae6/cybersnail_dead_1783618752068.png)
<!-- slide -->
![Cryo-Snail - Dead Shell](/home/caveman/.gemini/antigravity-ide/brain/7ad41621-f705-43df-b59d-fe255c301ae6/cryosnail_dead_1783618764680.png)
<!-- slide -->
![Spore-Snail - Dead Shell](/home/caveman/.gemini/antigravity-ide/brain/7ad41621-f705-43df-b59d-fe255c301ae6/sporesnail_dead_1783618778256.png)
<!-- slide -->
![Boss Cyber-Snail - Dead Shell](/home/caveman/.gemini/antigravity-ide/brain/7ad41621-f705-43df-b59d-fe255c301ae6/boss_cybersnail_dead_1783618791988.png)
<!-- slide -->
![Boss Cryo-Snail - Dead Shell](/home/caveman/.gemini/antigravity-ide/brain/7ad41621-f705-43df-b59d-fe255c301ae6/boss_cryosnail_dead_1783618806031.png)
<!-- slide -->
![Boss Spore-Snail - Dead Shell](/home/caveman/.gemini/antigravity-ide/brain/7ad41621-f705-43df-b59d-fe255c301ae6/boss_sporesnail_dead_1783618820309.png)
````

### Code Integration:
- In [threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js), we loaded the dead shell textures and registered them as scatter materials.
- In `damageEnemy()`, if a snail dies, we spawn a static, low-elevation, non-blocking scatter sprite representing the dead shell corpse.
- In the frame update loop, we track `isCorpse` entities and apply a slow fade-out (decay) over 5 seconds after they have remained on the ground for 10 seconds.

---

## 3. Class Intro Cutscenes (Chrome Recording - v2)
We updated `scratch/generate_cutscenes.js` to run Google Chrome headlessly and draw custom 2.5D space launching animations for all three classes onto a 1920x1080 canvas. The animations capture the stream via `MediaRecorder` and export WebM video files and first-frame poster images directly to the client with a `-v2` suffix to avoid losing the initial batch:
- **Scout**: [scout-intro-v2.webm](file:///home/caveman/Desktop/icecave/hunker-bunker/public/cutscenes/scout-intro-v2.webm) & [scout-intro-poster-v2.jpg](file:///home/caveman/Desktop/icecave/hunker-bunker/public/cutscenes/scout-intro-poster-v2.jpg) (Green trim, fast launch, end-turbulence shake).
- **Tank**: [tank-intro-v2.webm](file:///home/caveman/Desktop/icecave/hunker-bunker/public/cutscenes/tank-intro-v2.webm) & [tank-intro-poster-v2.jpg](file:///home/caveman/Desktop/icecave/hunker-bunker/public/cutscenes/tank-intro-poster-v2.jpg) (Amber theme, heavy dropship movement, hull vibration). Flipped horizontally to face forward while launching right.
- **Engineer**: [engineer-intro-v2.webm](file:///home/caveman/Desktop/icecave/hunker-bunker/public/cutscenes/engineer-intro-v2.webm) & [engineer-intro-poster-v2.jpg](file:///home/caveman/Desktop/icecave/hunker-bunker/public/cutscenes/engineer-intro-poster-v2.jpg) (Cyan theme, blue exhaust, sensor arm shaking). Flipped horizontally to face forward while launching right.

### Visual Fixes in v2:
1. **Chroma-Keying**: Added an offscreen canvas pixel filter that automatically keyed out the pure black background rectangle on all three ship PNG sprites, making them blend seamlessly.
2. **Direction Alignment**: Flipped the Tank and Engineer ships horizontally so they face the right (forward) direction during their launch sequence with their engines/flames trailing behind correctly on the left.

### Code Integration:
- In [main.js](file:///home/caveman/Desktop/icecave/hunker-bunker/main.js), we implemented `playClassIntroSequence(playerType)`, which creates a fullscreen overlay showing the class-specific intro GIF (`Scout.Intro.gif`, `Tank.Intro.gif`, or `Eng.Intro.gif`) for 3.5 seconds before transitioning seamlessly to the custom WebM launch video.
- The entire intro chain runs sequentially in `runMissionIntroSequence()`: first the GIF, then the WebM video (both skippable by keypress/touch), and finally the original ship crash animation onto the planet.

---

## 4. Favicon Resolution
- Copied the existing `favicon.png` from the root directory into `public/favicon.png` so it resolves successfully when requested by `index.html`.

## 4. Act 2 & Act 3 Cinematic Cutscene Assets

We generated the remaining hand-painted art assets for Act 2 and Act 3:
- **Cave Mouth** ([cave_mouth.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/cave_mouth.png)): Jagged organic cave entrance nestled in thick glacier ice, with a warm pulsing amber glow radiating from inside.
- **Hive Interior Backdrop** ([hive_interior.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/hive_interior.png)): Dark retro sci-fi bunker interior overtaken by fleshy, pulsating organic biomass growths with glowing green bio-luminescent veins.
- **Egg Cluster** ([egg_cluster.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/egg_cluster.png)): Compact cluster of translucent organic amber alien eggs with dark embryo shadows.
- **Queen Silhouette** ([queen_silhouette.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/queen_silhouette.png)): Tall crowned alien queen monster silhouette outlined in a sharp, vibrant green rim light.
- **Survivor Vessel** ([survivor_vessel.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/survivor_vessel.png)): Cobbled survivor space vessel rocket made from recycled ship plates and thrusters, pointing upwards (nose-up).
- **Queen Dialogue Portrait** ([queen_00.webp](file:///home/caveman/Desktop/icecave/hunker-bunker/public/lore_portraits/queen_00.webp)): Dialogue portrait of the alien queen with glowing green eyes and dark shadows, cropped directly from our custom queen silhouette asset.

### Code & Compilation:
- **Dialogue Portrait Swap**: In [dialogue.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/dialogue.js), we swapped the portrait path for `THE QUEEN` speaker from `survivor_05.webp` to use the newly generated `queen_00.webp` portrait.
- **Video Re-Compilation**: Ran `node scratch/generate_cave_scenes.js` to compile the new `cave-reveal.webm` and `act3-departure.webm` videos using our generated custom art assets.

---

## 5. Verification Results
- All unit tests pass successfully (`npm run test`).
- Snail shells correctly spawn upon death, remain as static debris, and decay smoothly.
- Videos are valid WebM files and play correctly.
- Headless fresh-intro test (`node scratch/smoke_fresh_intro.js`) runs and passes successfully (4/4 checks).
- Headless Act 2 playthrough test (`node scratch/smoke_act2.js`) runs and passes completely (17/17 checks), verifying that the new cinematic scenes play flawlessly end-to-end.

---

## 6. Cleanup & Commit
- Cleaned up the `scratch/` folder by removing temporary `.png` screenshots, Chrome execution profile folders, and diagnostic scripts.
- Staged all outstanding modified and new files (both from the agent and the user) and created a clean git commit: `feat: integrate ship upgrades, snail corpses, class intro animations, and Act 2/Act 3 custom cutscene assets`.
