# Walkthrough: Procedural Real-time Audio

This walkthrough documents the design and verification of the new procedurally synthesized audio systems implemented in *Hunker Bunker*.

## Changes Made

### 1. Audio Engine Updates
#### [audio.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/audio.js)
* **Procedural Hover**: Added a new synthesized hum utilizing a sine wave oscillator. It executes a slow, low-frequency pitch sweep (100Hz to 85Hz over 280ms) with a gentle volume envelope (56ms linear attack and exponential decay) to create a warm, deep tactical thrum. Kept the original 280ms duration but lowered base volume to 0.05 for a quiet, sub-bass feel that sits "under" other sounds. Includes subtle randomized starting pitch (+/- 8%) and volume (+/- 10%) on each hover event to prevent ear fatigue.
* **Procedural Loot Chimes**: Added `playProceduralLoot(type, rarity)`:
  * **Coin**: Fast, bright ascending triangle wave chime (D5 to G5, plus additional chord notes for legendary items).
  * **Health**: Low-to-high warm sine wave sweep (C4 to C5 major chord/swell).
  * **Ammo**: Quick mid-low frequency triangle sweep (380Hz to 90Hz) with double click transients.
  * **Weapon**: High-frequency sawtooth arpeggios (A4 to A5/A6 steps).
  * **Rarity Scaling**: Enhanced duration, pitch, and amplitude multipliers for Uncommon, Rare, and Legendary chimes.
  * **Tone Shifting**: Added organic starting pitch variations (+/- 5%) and volume shifts (+/- 10%) on each collection event to differentiate consecutive item pickups.
* **Procedural Footsteps**: Added `playProceduralFootstep(suitType)`:
  * **Scout**: Light metallic tap (high pitch, short duration).
  * **Tank**: Heavy armored clonk (low-pitched resonating double tone).
  * **Engineer**: Technical step (medium pitch layered with a high-pitched tech chirp).
  * Synthesized values are randomized (+/- 15% pitch, +/- 20% volume) on each step.
* **Procedural Junk Burst**: Added `playProceduralJunkBurst(junkType)` that synthesizes a composite "explosion squish pop" sound when loot junk containers are broken:
  * **Explosion (Thump)**: Low frequency triangle wave sweep (130Hz down to 35Hz over 180ms) for the heavy breaking impact.
  * **Squish**: Mid-frequency sine wave sweep (550Hz down to 90Hz over 110ms) representing mechanical/organic disassembly.
  * **Pop**: High frequency triangle transient sweep (2400Hz down to 700Hz over 16ms) to simulate structural snap.
  * Parameters are dynamically scaled (deeper thump, larger duration/amplitude, higher pitch pops) for Uncommon, Rare, and Legendary containers.

### 2. Main Lifecycle Updates
#### [main.js](file:///home/caveman/Desktop/icecave/hunker-bunker/main.js)
* **Global Exposure**: Bound `window.AudioManager = AudioManager` on startup to enable Three.js console telemetry interactions.
* **Loot Integration**: Wired the `'pickup-collected'` callback to pass item type and rarity to `AudioManager.playProceduralLoot`.

### 3. Sprite Engine Sync
#### [threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js)
* **Walking Footsteps**: Intercepted the player animation column change detection to trigger footsteps during walk loop frames (columns 1 and 3).
* **Junk Break Trigger**: Integrated `AudioManager.playProceduralJunkBurst` inside `triggerBunkerJunkBurst` to play the synthesized sound as soon as containers are broken.

---

## Verification Results

### Linter Audit
* Verified using ESLint checks:
  ```bash
  npm run lint
  ```
  **Result**: 0 warnings, 0 errors.

### Automated Tests
* Verified via Vitest run:
  ```bash
  npm run test -- --run
  ```
  **Result**: All 5 tests passed successfully.
