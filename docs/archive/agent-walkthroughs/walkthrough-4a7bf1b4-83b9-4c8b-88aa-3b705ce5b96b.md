# Walkthrough: Missing Audio Asset Generation & Integration

All gaps identified in the audio audit have been resolved: we programmatically synthesized 18 missing sound effects, registered them along with other unused assets in the manifests, and replaced layered placeholders with dedicated audio cues.

## Changes Made

### Programmatic Sound Synthesis
We created [generate_sfx.py](file:///home/caveman/Desktop/icecave/hunker-bunker/scratch/generate_sfx.py) to synthesize high-quality retro sound effects directly into `/audio/vg2/` folder:
- **Weapon Fire**: 3 pitch-sweep variations (`weapon_fire_sidearm1..3.wav`).
- **Weapon Reload**: 2 mechanical click-clack variations (`weapon_reload1..2.wav`).
- **Player Hit**: 3 grunt/impact sweeps (`player_hit1..3.wav`).
- **Player Death**: Decompressing suit thrum + three alarm flatline beeps (`player_death1.wav`).
- **Enemy Hit**: 3 squishy impact sweeps (`enemy_hit_soft1..3.wav`).
- **Enemy Death (Snail)**: 3 wobbly LFO-modulated dissolves (`enemy_death_snail1..3.wav`).
- **Enemy Death (Crawler)**: 2 insectoid pops (`enemy_death_crawler1..2.wav`).
- **UI Upgrade**: 1 ascending pentatonic chime arpeggio (`ui_upgrade_weapon1.wav`).

### Manifest Registration
We updated [main.js](file:///home/caveman/Desktop/icecave/hunker-bunker/main.js) to:
- Register the new assets (`player_hit`, `player_death`, `ui_upgrade_weapon`, `enemy_hit_soft`, `enemy_death_snail`, `enemy_death_crawler`, `weapon_fire_sidearm`, `weapon_reload`).
- Load existing but previously unused click variations and typing sounds:
  - `ui_click2` pointing to `/audio/vg2/ui_click_confirm2.wav` (creating click sound variety).
  - `ui_typing1..4` pointing to `/audio/vg2/ui_typing1..4.wav` (adding dialogue typing clicks).

### Sound Hookups and Triggers
We mapped the new sound triggers to clean up gameplay feedback loops:
1. **Dialogue Typing**: Updated [dialogue.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/dialogue.js) to trigger `ui_typing` (which randomly selects from `ui_typing1..4`) instead of `ui_scan_ping` while character dialogues are typing out.
2. **Player Damage**: Updated `playPlayerDamageCue` in `main.js` to play the dedicated `player_hit` sound (which chooses from `player_hit1..3`) instead of layering `ui_error` and `amb_metal_stress`.
3. **Player Death**: Updated `playPlayerDeathCue` in `main.js` to play `player_death1` directly.
4. **Weapon Fire**: Updated `tryFireWeapon` in [threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js) to play `weapon_fire_sidearm` instead of `ui_scan_ping`.
5. **Weapon Reload**: Updated `startReload` in `src/threeGame.js` to play `weapon_reload` instead of `door_gears_spin`.
6. **Enemy Damage**: Updated `damageSnail` in `src/threeGame.js` to play `enemy_hit_soft` instead of `ui_scan_ping` when snails/crawlers take a hit.
7. **Enemy Death**: Updated `damageSnail` in `src/threeGame.js` to play either `enemy_death_crawler` (for crawlers) or `enemy_death_snail` (for snails) instead of layering `door_slam_vertical` and `ui_error`. These are dynamically pitched down and louder for bosses.

---

## Verification Results

### Sound Files Generated
The python synthesizer ran successfully and populated `public/audio/vg2/`:
- All 18 WAV files generated with correct structures and headers.
- File sizes match expected durations.

### Production Build
We verified building the application via `npm run build`:
- Vite completed bundling with **0 warnings and 0 errors**.
- All modified modules correctly transformed and packaged.
