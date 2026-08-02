# Engineering Deep Dive: Audio & The Soundtrack

## Overview
Hunker Bunker relies on Three.js's `PositionalAudio` for spatial soundscapes in the 3D world, combined with a 2D UI audio layer. Recently, a massive 43-track original soundtrack was generated (documented in `suno-scene-soundtrack-prompts.md` and `ost_metadata.csv`). 

## The Current State
- The game has ambient tracks and SFX, but the 43 new tracks are not yet mapped to dynamic game states.
- The `src/roomThemes.js` file handles assigning audio to specific room clusters (e.g., changing from a mechanical hum to biological squelching).

## Sprint 22 Engineering Goals

### 1. The Dynamic Audio Matrix
We must build a state-aware audio manager that reads the current `hb_act2_v1` state and seamlessly crossfades tracks.
- **Act 1 (Exploration):** Uses the "Glacial Depths" or "Overgrown Bio-Sphere" tracks.
- **Act 2 (Infected):** If `humanity` < 50%, tracks should swap to their corrupted/dissonant counterparts (e.g., "The Spores Know Your Name").
- **Boss Fights:** Trigger combat synths (e.g., "Gigawatt Goliath") based on the new `bossPhases.js` states.

### 2. The Spatial Mix
- Attach `THREE.PositionalAudio` to the Camp Leaders and Hive cores. For example, Sister Martha's camp (Tallow) should emit the "Warmth Beneath the Ice" track localized to her sector.
- Add occlusion raycasting: if a wall is between the player and the audio source, use a LowPass filter node to muffle the sound.

### 3. Soundtrack DLC Packaging
The OST is currently being processed (ID3 tags and artwork). We need to ensure the SteamPipe upload script correctly separates the `dist_soundtrack` directory into a distinct Steam DLC depot so players can download the MP3s outside the game.
