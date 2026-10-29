# Footstep Audio: Banks, Surfaces, Timing (2026-10-17)

Owner ask: "generate better footstep sound banks for a better walking experience, for different textures too."

## 1. What the game did before

| Area | Before | Problem |
|---|---|---|
| Banks | 10 surfaces × 5 steps. Concrete and snow were Kenney CC0; 8 were single 0.55 s AudioGen clips (`generate_audiocraft_sfx.py`). | AudioGen asked for one footstep renders mush. The clips were **16 kHz mono** (nothing above 8 kHz: no grit, crunch or ring), **padded to 0.54–0.60 s** whatever the step, and **15 dB apart in loudness** (deep snow −11.8 dB mean, wood −26.8 dB). |
| Surface | A biome / room-style if-else chain in `ThreeGame`. | The room lookup divided by a **chunk size of 16; chunks are 49**. It read the wrong cell, so most interior steps fell through to concrete. Two-thirds of the floor textures the game draws had no sound of their own. |
| Timing | Steps fired on frames of the old sprite sheet. | The player is a rigged 3D chassis whose walk clip speeds up with ground speed, so steps drifted against the feet on screen. The Engineer's frames 0 and 5 of 9 made an uneven limp. |
| Character | One sample at one volume for every class. | A Tank and a Scout sounded the same. No kit, no splash, no left/right variation, no sprint weight. |

## 2. What it does now

### 2.1 Banks: `scripts/audio/build_footstep_banks.py`

Twenty banks of ten steps: 19 surfaces plus a gear-rattle layer.

1. **Generate:** AudioGen-medium renders 8 s takes of a single walker in heavy boots on each material: two prompt phrasings × three takes. Raw takes live in `art/source/audio/footsteps/takes` (gitignored, masters never ship).
2. **Clean:** each take is high-passed at 45 Hz and denoised against its own floor (spectral subtraction of the median spectrum of its quietest 20% of frames). This removes the steady tonal room hum AudioGen adds, which otherwise rang through every step.
3. **Slice:** peak-picking on a smoothed loudness envelope finds each footfall (librosa's onset detector missed most steps in a steady walk). The attack is found by walking back from each peak.
4. **Select:** a slice is rejected if it is too quiet, too noisy (under 16 dB above the floor), doesn't open on the hit, or holds a second footfall. The rest are ranked by SNR, attack and "punch" (energy front-loaded in the first 40 ms). The best ten with distinct timbres are kept.
5. **Shape:** each step holds through the hit, then decays naturally (per-material hold and decay time), with 2 ms in and 30 ms out.
6. **Extend:** resample to 48 kHz. A harmonic exciter (the step's own 3–8 kHz band, saturated and high-passed at 8.2 kHz, mixed 6 dB under) and a synthesized per-material transient (grit, crunch grains, metal ring, glass tinkle, splash) restore the band above AudioGen's ceiling.
7. **Level:** every step is matched on the level of its first 150 ms (−21 dB), plus a per-material offset (soft surfaces quieter, grates louder) and a −1 dB peak ceiling. Exported as Vorbis q5, mono.

Report: `docs/reports/footstep-banks-2026-10-17.json` (per step: source take, length, level, peak, spectral centroid, score; per bank: candidates and rejections).

### 2.2 Surface: `src/footstepSurface.js`

The step reads the floor the player sees: the blended floor's per-cell texture layer and wetness (`ThreeGame.getFloorSurfaceAt`, from the chunk's splat data).

- **Floor texture:** all 54 floor textures map to a bank. A test fails if a new texture is added without one.
- **On top of the floor:** puddles, oil, slime and blood underfoot (`getTrackSurfaceAt`) win over the floor.
- **Wet floors:** a solid floor wetter than 0.55 also splashes.

### 2.3 Playback: `src/footstepAudio.js`

A step is layered:
- **Surface bank:** no immediate repeat, ±5% pitch.
- **Splash:** on wet floors.
- **Kit rattle:** every step for the Tank and Engineer, every other step for the Scout.

| Chassis | Gain | Pitch | Rattle |
|---|---|---|---|
| Tank | 1.18 | 0.90 | 0.50 |
| Engineer | 1.00 | 0.97 | 0.34 |
| Scout | 0.78 | 1.07 | 0.22 |

Sprint lands harder (gain ×1.25, pitch ×1.04, rattle ×1.4). The left and right feet differ slightly in gain and pitch.

### 2.4 Timing: `src/footContactTracker.js`

The 3D chassis reports its own footfalls. After each mixer update the overlay reads both foot bones' height above the model root. A contact is a foot coming down into the bottom 20% of its recent swing (at least 3 cm of swing, at least 0.18 s between contacts per foot). It works for any clip, blend or playback speed. Sprite-frame steps remain only for a model without foot bones.

## 3. Regenerating

```
~/tools/audiocraft/.venv/bin/python scripts/audio/build_footstep_banks.py generate [--keys footstep_glass] [--takes 3]
~/tools/audiocraft/.venv/bin/python scripts/audio/build_footstep_banks.py process  [--keys footstep_glass]
```

`generate` skips takes that already exist; delete a key's takes to re-roll them. `process` is deterministic for a given set of takes.

## 4. Status (2026-10-17)

### 4.1 Banks

Built from 120 takes (20 banks × 2 prompts × 3). Every bank filled its ten slots from 20–104 clean candidates.

| | Before | Now |
|---|---|---|
| Banks × steps | 10 × 5 | 19 surfaces + gear × 10 |
| Sample rate | 16 kHz mono (AudioGen sets) | 48 kHz mono, extended above 8 kHz |
| Length | padded 0.54–0.60 s | natural 0.10–0.50 s by material |
| Loudness spread across surfaces | 15 dB | 2.7 dB (−21.3 to −24.0); gear sits 5 dB under |
| Size | | 200 files, 1.6 MB |

Spectrograms show the materials apart:
- **Grate:** tonal ring lines.
- **Ice:** needle attack plus crackle.
- **Deep snow:** long granular crunch.
- **Slime:** squelch blobs.
- **Wood:** short low thud.
- **Glass:** tinkle partials.

### 4.2 In game

Headless and headed (Xvfb + Vulkan) runs confirmed:
- foot tracking is live on all three chassis rigs (`…LeftFoot` / `…RightFoot` bones);
- the outdoor floor resolves to gravel (layer 37, regolith);
- every layer plays: surface, splash, gear;
- the feet alternate;
- sprint steps come every 350–560 ms, with no flams.

### 4.3 Timing

- **Contacts alone failed.** Bone contacts alone missed steps: blended walk/strafe clips leave one foot barely lifting.
- **Phase-locked step clock** (`StepClock`): the rate comes from the dominant locomotion clip (half a cycle per step at the mixer's time scale), and the bones only pull the phase into line.
- **Tank cadence:** the Tank's walk clip (1.37 s per cycle at time scale 0.72) gives one step every 0.95 s of game time.
- **Measurement caveat:** on this loaded dev box the game runs at about 15 fps and clamps frames to 0.05 s, so wall-clock gaps measure about 1.3× longer than game time. Animation and steps slow together.

### 4.4 Found, not changed

- **Sprinting while aiming** keeps the aim-relative walk/strafe blend at the walk's time scale (no run clip, cadence unchanged), so the feet slide. Steps follow the animation: a sprint lands louder and heavier, not faster. Fixing that is an animation change (`computeLocomotionTimeScale` / `selectOverlayAnimation`).
- **Listening pass needed (owner):** the glass and brass-casing banks get synthesized tinkle partials above 8 kHz, which could read slightly synthetic. Re-roll or lower `high_band_layer`'s `glass` gain if so.
- **Enemy footsteps** still alias the concrete bank (`enemy_walk_crawler`, `enemy_skitter_crawler`). They now get the new concrete steps, but not per-surface steps.
