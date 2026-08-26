# Audio Voice Cutting, Foley Overlay, and Camp Ambient Integration Plan

**Status:** Plan & Specification  
**Date:** 2026-08-25  
**Target:** Hunker Bunker Audio Engine (`src/audio.js`, `public/audio/`)  
**References:**  
- `docs/elevenlabs-voice-design-prompts-11-core-roles-2026-08-25.md`  
- `docs/voice-cast-prompts-and-game-integration-2026-08-25.md`  

---

## 1. Overview & Objectives

This document outlines the end-to-end plan to:
1. **Segment and Name the 11 ElevenLabs Voice Design Character Audition Files** into individual, semantic voice lines and catalog them into the game's asset directory (`public/audio/voice/<role>/`).
2. **Catalog and Deploy the First 4 Foley Prompt Audio Sets** (Mothership, Exosuit, Bunker Director, Queen) into `public/audio/foley/` for room tones and interactive SFX cues.
3. **Design the Foley Overlay Engine in `AudioManager`** to dynamically layer room tones, contextual foley, and voice clips on clean audio buses with ducking and semantic cue anchors.
4. **Integrate `raincamp.wav` as a Subtle Looping Ambient Bed** across the starter crash area and main camp zone with spatial/environmental volume fading.

---

## 2. Asset Mapping Key & Inventory

### 2.1 ElevenLabs Character Audio Mapping (Chronological Order)

The 11 ElevenLabs files in `docs/` correspond directly in chronological generation order to the 11 character prompts defined in `elevenlabs-voice-design-prompts-11-core-roles-2026-08-25.md`:

| # | Source File | Character / Role | Prompt ID | Segments / Beats | Output Directory |
|---|---|---|---|---|---|
| **1** | `ElevenLabs_2026-08-25T22_29_49_Eva - Futuristic Robot Helper_pvc_sp100_s42_sb78_v3.mp3` | **Mothership Command** | `VD-MOTHERSHIP-01` | 3 beats: `alive_salvage`, `warning_bio_signal`, `orbital_purge` | `public/audio/voice/mothership/` |
| **2** | `ElevenLabs_2026-08-25T22_34_17_slutbot_gen_sp100_s50_sb75_v3.mp3` | **System / Exosuit** | `VD-SYSTEM-01` | 3 beats: `o2_stabilized`, `uplink_severed`, `five_heartbeats` | `public/audio/voice/system/` |
| **3** | `ElevenLabs_2026-08-25T22_37_51_slutbot2_gen_sp100_s50_sb75_v3.mp3` | **Bunker / Facilities Director** | `VD-BUNKER-01` | 3 beats: `enjoy_darkness`, `welcome_committee`, `depth_disapproves` | `public/audio/voice/bunker/` |
| **4** | `ElevenLabs_2026-08-25T22_40_12_sluto_gen_sp100_s50_sb75_v3.mp3` | **The Queen** | `VD-QUEEN-01` | 4 beats: `two_heartbeats`, `sever_uplink`, `door_left_open`, `sleep_now` | `public/audio/voice/queen/` |
| **5** | `ElevenLabs_2026-08-25T22_42_25_slut0_gen_sp100_s50_sb75_v3.mp3` | **Sister Martha** | `VD-MARTHA-01` | 3 beats: `warm_pipes`, `perimeter_care`, `pulse_unrecognized` | `public/audio/voice/martha/` |
| **6** | `ElevenLabs_2026-08-25T22_43_57_lado_gen_sp100_s50_sb75_v3.mp3` | **Commander Briggs** | `VD-BRIGGS-01` | 3 beats: `stop_identify`, `southern_barricade`, `ledger_sit_down` | `public/audio/voice/briggs/` |
| **7** | `ElevenLabs_2026-08-25T22_45_48_fgdfg_gen_sp100_s50_sb75_v3.mp3` | **Overseer Kaelen** | `VD-KAELEN-01` | 3 beats: `machine_dreamed`, `sector_zero_dream`, `pulse_through_floor` | `public/audio/voice/kaelen/` |
| **8** | `ElevenLabs_2026-08-25T22_47_52_g_gen_sp100_s50_sb75_v3.mp3` | **Dr. Okonkwo-Vass** | `VD-OKONKWO-01` | 3 beats: `lazy_science`, `they_read_us`, `more_than_footnote` | `public/audio/voice/okonkwo/` |
| **9** | `ElevenLabs_2026-08-25T22_49_36_rt_gen_sp100_s50_sb75_v3.mp3` | **Nahl, the Suture** | `VD-NAHL-01` | 3 beats: `you_can_hear_me`, `pain_is_information`, `separate_hearts` | `public/audio/voice/nahl/` |
| **10** | `ElevenLabs_2026-08-25T22_51_28_ghfghfdgh_gen_sp100_s50_sb75_v3.mp3` | **Vey, the Listener** | `VD-VEY-01` | 3 beats: `signal_recognized`, `gaps_where_mined`, `forge_mothership` | `public/audio/voice/vey/` |
| **11** | `ElevenLabs_2026-08-25T22_56_16_dfsdfsdf_gen_sp100_s50_sb75_v3.mp3` | **Rhun, the Shield** | `VD-RHUN-01` | 4 beats: `pried_my_plates`, `not_prey_not_queen`, `guard_what`, `mark_fades_stand_in_front` | `public/audio/voice/rhun/` |

---

### 2.2 Foley Audio Mapping (Prompts 01–04 + Camp Rain)

The WAV files correspond to Foley Prompts 01–04 from Section 14 of the specification:

#### Foley Set 01: Mothership Communications
- **Room Tone (12s seamless loop):** `seamless_science-fic_#1-1787698663550.wav`  
  -> `public/audio/foley/mothership/foley_mothership_room_loop.wav`
- **Opening Cue (1.5s link acquisition):** `military_spacecraft__#1-1787698725232.wav` & `military_spacecraft__#2-1787698733494.wav`  
  -> `public/audio/foley/mothership/foley_mothership_link_acquire_1.wav` & `_2.wav`
- **Threat Cue (4s distant launch rumble):** `distant_orbital_laun_#4-1787698773481.wav`  
  -> `public/audio/foley/mothership/foley_mothership_orbital_launch.wav`
- **Closing Cue (1s carrier end tone):** `encrypted_radio_carr_#1-1787698810125.wav`  
  -> `public/audio/foley/mothership/foley_mothership_carrier_term.wav`

#### Foley Set 02: System / Exosuit Interior
- **Room Tone (12s seamless loop):** `seamless_interior_ex_#3-1787698871804.wav`  
  -> `public/audio/foley/system/foley_exosuit_room_loop.wav`
- **Startup Cue (3s boot & oxygen chime):** `exosuit_life-support_#4-1787698908281.wav`  
  -> `public/audio/foley/system/foley_exosuit_startup.wav`
- **Anomaly Cue (4s scanner anomaly / extra heartbeat):** `medical_scanner_anom_#3-1787698957461.wav`  
  -> `public/audio/foley/system/foley_exosuit_scanner_anomaly.wav`
- **Disconnect Cue (2s uplink severing):** `suit_uplink_severing_#2-1787698991101.wav`  
  -> `public/audio/foley/system/foley_exosuit_sever_uplink.wav`

#### Foley Set 03: Bunker / Facilities Director
- **Room Tone (15s seamless loop):** `seamless_abandoned_s_#1-1787699060673.wav`  
  -> `public/audio/foley/bunker/foley_bunker_facility_room_loop.wav`
- **Blackout Cue (3s fluorescent buzz & breaker slam):** `industrial_sector_bl_#2-1787699099492.wav`  
  -> `public/audio/foley/bunker/foley_bunker_blackout_breaker.wav`
- **Welcome Committee Cue (6s corridor mech footstep approach):** `distant_autonomous_m_#2-1787699151319.wav`  
  -> `public/audio/foley/bunker/foley_bunker_welcome_mech_steps.wav`
- **Navigation Corruption Cue (3s relay clacks & electrical wobble):** `failing_underground__#3-1787699213778.wav`  
  -> `public/audio/foley/bunker/foley_bunker_nav_corruption.wav`

#### Foley Set 04: Queen Neural Chamber
- **Room Tone (15s seamless loop):** `seamless_living_hive_#2-1787699258830.wav`  
  -> `public/audio/foley/queen/foley_queen_hive_room_loop.wav`
- **Bond Cue (5s neural bond / dual heartbeat):** `neural_bond_forming__#3-1787699315278.wav`  
  -> `public/audio/foley/queen/foley_queen_neural_bond.wav`
- **Uplink Sever Cue (3s bio-cable tear):** `physical_communicati_#1-1787699371464.wav`  
  -> `public/audio/foley/queen/foley_queen_cable_tear.wav`
- **Sleep Cue (5s living membrane closing):** `living_membrane_clos_#3-1787699423886.wav`  
  -> `public/audio/foley/queen/foley_queen_membrane_close.wav`

#### Main Camp Ambient / Weather Bed
- **Starter Camp Weather Loop (30s seamless rain):** `raincamp.wav`  
  -> `public/audio/ambient/amb_camp_rain_loop.wav`

---

## 3. Detailed Voice Line Segmentation Plan

Using `ffmpeg` with silence-boundary detection and precise audio slicing, each character's multi-beat audition recording is split into clean, individual MP3 assets:

### 1. Mothership Command (`public/audio/voice/mothership/`)
- `voice_mothership_01_alive.mp3`: "Agent. You're alive. Your ship took a hypersonic strike on descent, but the salvage console remains operational. Bank what you recover and rebuild the vessel — system by system."
- `voice_mothership_02_warning_bio.mp3`: "Warning: an unauthorized biological signal has entered the channel. Do not answer it. Your vital signs are critical. An early extraction window is open."
- `voice_mothership_03_orbital_purge.mp3`: "Correction: recovery has been abandoned. Orbital extermination is now authorized. Remain where you are."

### 2. System / Exosuit (`public/audio/voice/system/`)
- `voice_system_01_o2_stabilized.mp3`: "Oxygen field life support at one hundred percent. Base console stabilized. Hull integrity expanded. Structural capacity increased."
- `voice_system_02_uplink_severed.mp3`: "Uplink severed. Mothership telemetry lost. Warning: operator respiration is approaching critical limits."
- `voice_system_03_five_heartbeats.mp3`: "Residual neural activity detected beneath the approved signal floor. Manifest check complete. Four seats pressurized. Five heartbeats detected. Recounting… Five heartbeats detected."

### 3. Bunker / Facilities Director (`public/audio/voice/bunker/`)
- `voice_bunker_01_enjoy_darkness.mp3`: "Unauthorized exploration detected. Local lighting has been suspended. Please enjoy the darkness responsibly."
- `voice_bunker_02_welcome_committee.mp3`: "Movement logged. Facilities has dispatched a welcome committee to your position. Your curiosity continues to exceed your clearance."
- `voice_bunker_03_depth_disapproves.mp3`: "Power has been rerouted to a department that resents you. Navigation telemetry is no longer considered authoritative. The structure notes your depth… and disapproves."

### 4. The Queen (`public/audio/voice/queen/`)
- `voice_queen_01_two_heartbeats.mp3`: "Two heartbeats. One purpose. The cold box they kept me in could not freeze the mind… and now we share the body."
- `voice_queen_02_sever_uplink.mp3`: "The Mothership still whispers through your wreck. It will send exterminators. Sever the uplink, Carrier."
- `voice_queen_03_door_left_open.mp3`: "Good. Their grid dies with it. You hide warm bodies in my ship, and I feel every heartbeat. You may call that mercy. I call it a door left open."
- `voice_queen_04_sleep_now.mp3`: "Sleep now. When you wake, we choose a new world."

### 5. Sister Martha (`public/audio/voice/martha/`)
- `voice_martha_01_warm_pipes.mp3`: "Welcome to the warm pipes, child. The steam keeps us… and we keep each other. The moss is warm because we carried it here one living tray at a time."
- `voice_martha_02_perimeter_care.mp3`: "Do not mistake care for softness. I can cross that perimeter before your rifle clears its sling."
- `voice_martha_03_pulse_unrecognized.mp3`: "You died out there. I felt the cold arrive before the radio did. Give me your hand. The other one. There. Your pulse is counting something I do not recognize."

### 6. Commander Briggs (`public/audio/voice/briggs/`)
- `voice_briggs_01_stop_identify.mp3`: "Stop. Identify. A corporate suit. Fine. Keep your hands where the turrets can see them."
- `voice_briggs_02_southern_barricade.mp3`: "The defense line is solid, but solid is not the same as safe. Check the southern barricade, count every magazine, and tell me what moved beyond the flare."
- `voice_briggs_03_ledger_sit_down.mp3`: "You died out there. I heard the frequency go empty. Sit down. Do that again. Blink. There. That is new. I am not putting it in the ledger yet."

### 7. Overseer Kaelen (`public/audio/voice/kaelen/`)
- `voice_kaelen_01_machine_dreamed.mp3`: "Another suit from the surface. The machine dreamed you would come. The grid keeps the dark at bay, operator — as long as the lights hum and nobody improvises with the primary bus."
- `voice_kaelen_02_sector_zero_dream.mp3`: "The central computer sleeps under Sector Zero. Everything here may be its dream. Even you, probably. No offense."
- `voice_kaelen_03_pulse_through_floor.mp3`: "Sit still. Your sensory telemetry is fluctuating in a pattern I have never seen. Your pulse reads through the floor plating now. It did not before. I checked."

### 8. Dr. Okonkwo-Vass (`public/audio/voice/okonkwo/`)
- `voice_okonkwo_01_lazy_science.mp3`: "You move like someone who has not been bitten yet. I study the shelled ones, and they are not as simple as the reports say. Every camp logs them as vermin. That is lazy science."
- `voice_okonkwo_02_they_read_us.mp3`: "Here is my theory: they do not hate us. They READ us. Something about what we carry may change the answer."
- `voice_okonkwo_03_more_than_footnote.mp3`: "So do not kill the next one. Stand your ground and let it decide. If I am wrong, you lose a few minutes. If I am right… we owe them more than a footnote."

### 9. Nahl, the Suture (`public/audio/voice/nahl/`)
- `voice_nahl_01_you_can_hear_me.mp3`: "Oh. You can hear me now. I felt every sac you cut, little Carrier… and I healed around the holes you left."
- `voice_nahl_02_pain_is_information.mp3`: "Do not look away. Pain is information, but it is not permission. The Queen sees every death and calls it growth. I do not."
- `voice_nahl_03_separate_hearts.mp3`: "I felt your thread sever… and I stitched it back because I chose to keep you here. Love and shared consciousness require two separate hearts… choosing to beat in rhythm."

### 10. Vey, the Listener (`public/audio/voice/vey/`)
- `voice_vey_01_signal_recognized.mp3`: "Signal. Signal. You are a signal now, not just noise. Finally."
- `voice_vey_02_gaps_where_mined.mp3`: "I heard every filament you ripped out of me. I archived the sound. The humans have a relay. The Queen has a choir. I have… gaps where you mined me."
- `voice_vey_03_forge_mothership.mp3`: "The static quiets when you are near. I can hear the Mothership from here, Carrier. It is very loud — and very sure of itself. Sure things are the easiest to forge."

### 11. Rhun, the Shield (`public/audio/voice/rhun/`)
- `voice_rhun_01_pried_my_plates.mp3`: "The one who pried my plates. Stand still so I may look at you."
- `voice_rhun_02_not_prey_not_queen.mp3`: "No. You are not prey. You are not Queen. You are something new… wearing old armor."
- `voice_rhun_03_guard_what.mp3`: "I guard. It is all I am. The question is only ever: guard what. A shield that changes hands is still a shield. A shield that hesitates… is a gravestone."
- `voice_rhun_04_stand_in_front.mp3`: "It is done. Her mark fades from my plates. Where you stand, I stand in front."

---

## 4. Audio Manager & Foley Overlay Architecture

### 4.1 Bus Routing & Gain Architecture
In `src/audio.js`, we establish structured gain routing:
```text
AudioContext.destination
  ├── masterGain
        ├── musicGain (<= musicTensionGain <= musicSources)
        ├── voiceGain (dialogue, announcements)
        ├── foleyGain (scene room tone beds & interactive foley cues)
        ├── sfxGain (tactical feedback, UI, weapons)
        └── ambientGain (raincamp loop, bunker stress, environment)
```

### 4.2 Staged Foley + Voice Cue Staging System
We implement a `playStagedDialogue(stagedConfig)` method in `AudioManager` that:
1. Starts the designated **room tone** bed on the `foleyGain` bus at -20 dB with a smooth 0.5s fade-in.
2. Plays an **opening cue** (e.g. comms lock chirp or boot chime).
3. Plays the **dry voice line** on `voiceGain` with automatic ducking on background music and ambient loops (-6 dB during speech).
4. Fires any **sync/threat cues** anchored to the voice timeline or completion.
5. Plays the **closing cue** (e.g. carrier termination) and gently fades out the room tone.
6. Provides an active handle so skipping or interrupting dialogue cleanly stops the voice and fades out associated foley immediately.

### 4.3 Rain Ambient Loop (`raincamp.wav`) for Main Camp & Starter Area
1. **Asset Loading**: Register `amb_camp_rain_loop` in the asset manifest.
2. **Looping Source**: Create a dedicated `rainAmbientSource` node in `AudioManager` connected to `ambientGain`.
3. **Spatial Presence**:
   - In the starter crash site and main surface camp, rain ambient volume sits at a subtle baseline (e.g., volume ~0.25–0.35, non-intrusive).
   - As the player moves away from the starter zone or descends deeper into underground bunker levels, the volume smoothly attenuates.
   - Connected with `threeWeather.js` and `campSystem.js` updates during the main game loop.

---

## 5. Execution Roadmap

1. **Step 1: Audio Processing & Extraction Script**
   - Run Python/FFmpeg cutting script on the 11 MP3 files into `public/audio/voice/<character>/` with clean fades and normalization.
   - Copy & standardize Foley WAV files into `public/audio/foley/<set>/` and `raincamp.wav` into `public/audio/ambient/`.
2. **Step 2: Asset Manifest Update**
   - Register the new voice, foley, and ambient audio files in `src/audioManifest.js` (or `main.js` audio loader).
3. **Step 3: AudioManager Foley & Rain System Implementation**
   - Add `foleyGain` and `rainGain` to `AudioManager`.
   - Implement `playStagedDialogue()` and `startCampRainAmbience()`.
4. **Step 4: Dialogue Integration & Starter Camp Hookup**
   - Connect starter camp dialogue lines to use their authored voice assets.
   - Hook up `startCampRainAmbience()` on game startup in the surface/starter zone.
5. **Step 5: Testing & Verification**
   - Verify all audio files are decoded properly without console errors.
   - Verify volume leveling, cross-fades, and spatial attenuation.
