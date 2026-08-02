# System Breakdown: Combat, Movement, and Classes

## Overview
Combat in Hunker Bunker is an isometric twin-stick shooter integrated with a severe resource timer (Oxygen). Currently, the player experience is hampered by a lack of mobility verbs and "sponge" enemies. Sprint 22 aims to entirely overhaul the minute-to-minute "juice" of the combat system.

## The Three Exosuit Classes
Classes define the player's starting stats, passive traits, and specific interactions with the world.
1. **The Scout:** 
   - *Fantasy:* Speed and Recon. High movement speed, lower base armor.
   - *O2 Mod:* Drains O2 1.25x faster.
   - *Sprint 22 Verb:* **Sprint Burst** (High-speed dash).
2. **The Tank:**
   - *Fantasy:* Endurance and Armor. Slow movement, high base health.
   - *Sprint 22 Verb:* **Shoulder Slam** (Short lunge, high knockback, 1-shock armor).
3. **The Engineer:**
   - *Fantasy:* Systems and Terminals. Balanced stats, excels at interacting with the environment.
   - *Sprint 22 Verb:* **Overclock Slide** (Quick repositioning slide).

## The Core Pressures
- **The O2 Leash:** Oxygen drains full-to-empty in ~5 minutes. Moving through dangerous biomes increases the drain rate (1.5x). Death forces a full respawn at the ship.
- **Sprint 22 Fix (Beacon Recall):** To alleviate the tedious "walk back," Sprint 22 introduces a one-time "Beacon Recall" (fast travel to ship) unlocked at Camp Level 2.

## The Combat "Sponge" Problem
Currently, most bosses have 20-75 HP and rely on a single behavioral pattern (walk straight at the player and shoot). This results in the dominant strategy of "walking backward while holding left-click for 40 seconds."

### Sprint 22 Solution: Boss Phase Framework
- Implement data-driven phases in `src/bossPhases.js`.
- Bosses will hit HP thresholds that trigger **pattern swaps**, **add waves**, and **weak-point windows** (where damage is temporarily tripled).
- The goal is to turn HP walls into 60-90 second fights consisting of at least 2 distinct decisions.

## "The Juice" (Presentation Overhaul)
Combat currently lacks impact. Sprint 22 will introduce purely visual enhancements driven by existing damage events:
- **Hitstop:** 50-70ms frame freezes on enemy hit.
- **Impact Frames:** Scale pop animations for damage hits.
- **Damage Pips & Kill Confirms:** Clear UI indicators when an enemy is wounded or destroyed.
