# Trailer v4: Capture, Edit and Sound Plan

Date: 2026-10-14. Branch: `dev/sprint-52`. Status: **plan; nothing below is built
yet**. The store page that this trailer goes on is planned in
[steam-store-page-v2-copy-and-images-2026-10-14.md](steam-store-page-v2-copy-and-images-2026-10-14.md).

This replaces the v3 cut (2026-08-07) described in
`docs/superpowers/specs/2026-08-07-steam-trailer-capture-and-assembly-design.md`
and `docs/steam-store-assets-plan.md` § Trailer Beat Sheet. The pipeline idea
from that spec still holds: footage generated from the repo, the edit kept as
data, assembled with ffmpeg. The footage, the edit and the sound are what
change.

---

## 1. What the v3 trailer was, and why it has to be redone

v3 is `scripts/trailer-edl.json` + `scripts/build-trailer.js`: about 49 s.
Six AI key-art "feature cards" (`public/interstitials/*.webp`, a yellow
lower-third line in Liberation Sans) alternate with chunks of two hand-recorded
1080p60 screen captures (`trailer/raw/clips/user-long.mp4`,
`user-short.mp4`). Each pair is shorter than the last. The bed is the last 51 s
of "Hunker Bunker Main Theme.mp3".

| Problem | Evidence | Consequence |
| --- | --- | --- |
| **The footage shows a game that no longer exists** | `user-long.mp4` was recorded 2026-08-07: dark low-detail floors, red hex grids, no room dressing, no N64 wall pass, no sky layers, no 3D enemies or gibs (frame sheet of the source at 1 frame per 20 s, 2026-10-14). | A re-edit cannot fix it. All footage must be recaptured from the current build. |
| **It opens on a still card** | `card-1` is 3.5 s of key art before any gameplay. | Steam autoplays muted in the capsule hover and the page header. The first 5 s are the hook, and they showed a painting. |
| **28% of runtime is not gameplay** | 13.7 s of the 48.7 s are image cards. | The key art is AI illustration and does not look like the game. Viewers can't tell what they'll be playing. |
| **No sound design at all** | `"sfx": {}`. Music only. | No gunshots, impacts, VO, whooshes or hits. Cuts land on clock time, not on the music. The spec's `silencedetect` anchor was never used. |
| **Generic type** | Liberation Sans Bold, same lower third every time. | Doesn't read as this game's UI (Space Mono / Rajdhani / Outfit). |
| **Shows almost none of the game** | No classes, Queen, camps, hives, cryo or bio biomes, O2 pressure, banking UI or voice cast. | The 2,189 recorded voice lines and the faction story are invisible. |
| **The live store has no trailer** | Store HTML (2026-10-14) contains only two 8 s 480×270 HEVC "extras" loops (`scout.intro`, `eng.intro`) in About This Game. There are no movies and no screenshots. | Any trailer is an improvement. This one is the page's first impression. |

What v3 got right and v4 keeps: data-driven EDL, ffmpeg assembly, real footage
only, mechanic-named copy instead of slogans, the `verifyOutput` Steam spec
check.

---

## 2. Goals and constraints

1. **Deliverables** (all from one EDL family):
   - `hunker-bunker-gameplay-trailer` — **80–90 s**, 1920×1080 at 60 fps,
     H.264 High, about 40 Mbps, AAC 320k stereo. Uploaded first, so it is the
     one Steam autoplays and builds its microtrailer from.
   - `cutdown-30` — 30 s, for the second store slot, events and ads.
   - `cutdown-15` and `bumper-6` — social.
   - `vertical-30` — 1080×1920 center-crop recut (the iso camera crops well).
   - A 2160p master if the capture spike shows the GPU can hold it.
2. **The first 5 seconds work muted.** Motion, muzzle flashes, an enemy
   dying, all in the opening shot.
3. **At least 80% of screen time is gameplay** from the current build. Cards
   are overlays on gameplay, never full-screen art, except the title and CTA.
4. **Every cut has a reason in the audio**: a beat, a VO word, an impact, or
   a deliberate silence.
5. **Honest.** Nothing from `docs/steam-store-feature-claim-checklist.md` §
   "Do Not Claim Yet": no co-op, PvP or store/purchase UI, and no
   debug/QA Nexus spaces or god-mode tells (invulnerable flashes, debug HUD).
6. **Re-runnable.** Recapturing after an art pass is one command, and the
   edit survives it.

---

## 3. Creative concept: "Facilities Regrets the Inconvenience"

The strongest unused asset is the game's voice. The Bunker's Facilities
Director speaks like deadpan corporate customer service while the place tries
to kill you:

> "Unauthorized exploration detected. Local lighting has been suspended.
> Please enjoy the darkness responsibly." (`voice/bunker/voice_bunker_01_enjoy_darkness.mp3`)
>
> "Movement logged. Facilities has dispatched a welcome committee to your
> position. Your curiosity continues to exceed your clearance." (`…_02_welcome_committee.mp3`)
>
> "Power has been rerouted to a department that resents you. … The structure
> notes your depth… and disapproves." (`…_03_depth_disapproves.mp3`)

That tone (Lethal Company's "the Company", Portal's GLaDOS) gives the game a
personality that no other top-down extraction game in its tag neighborhood
has. The trailer is built on it. Comedy in Acts 1–2, a full combat drop in
Act 3, then a real turn in Act 4. The Mothership abandons you
("Orbital extermination is now authorized") and the Queen speaks:
"Two heartbeats. One purpose." That last beat sells the story hook (the
faction choice and ten endings) without spoiling it.

**Music:** "Under Siege (Combat Alert).mp3". Measured with ffmpeg `astats`
RMS on 2026-10-14:
- 92–120 s: a breakdown at -23 to -29 dB, dipping to -35 dB at about 100 s.
- **122.30 s: the drop**, a jump of +18.8 dB within 50 ms (from -33 to -8 dB).
- A rough low-band autocorrelation tempo over 92–152 s is about 93.5 BPM.
  It could also be double-time 187. The beat-grid tool has to settle this.
- The track holds at full energy to about 4:40.

That is a ready-made trailer arc. The music enters at T 0:06 low-passed
under the VO, rides the breakdown and a riser, and hits the drop for the
combat montage at T 0:42. The in-point follows from the drop:
122.30 − 36.0 = **86.3 s** into the track. The beat-grid tool (§6.2)
confirms the exact drop frame, and the EDL anchors the music by its drop
(`"anchor": {"beat": "drop", "at": 42.0}`), so the in-point is derived,
not typed.
Fallbacks: "Gigawatt Goliath" (175 s, steady high energy, good for the 30 s
cut) or the Main Theme's 7:09–8:00 tail (the v3 window).

---

## 4. Beat sheet (target 1:25)

`T` = trailer time. `VO` = existing recorded line (trimmed). `GAME` = the
game's own SFX for what is on screen, placed automatically from the capture
event log (§5.4). `KIT` = synthesized trailer FX (§6.3).

### Act 0: Cold open (0:00–0:06), no music

| T | Picture | Sound | Edit |
| --- | --- | --- | --- |
| 0:00 | **First frame is mid-fight.** Tank, night, zoom 1.35. Three snails and a crawler close in, a continuous burst, one snail gibs (enemy gibs pass). | GAME: weapon fire, tracers, impacts, death. KIT: low sub hit on the gib. | No fade-in. Starts on frame 1 of motion. |
| 0:03.5 | Flashlight swings onto a crawler that is right next to the player. | GAME: crawler alert. | 1.0→0.4 speed ramp into the lunge (from 120 fps capture). |
| 0:05 | **Smash to black** (6 frames). | KIT: hard cut to silence, tape-stop tail on the music-less room tone. | Cut to black. |

### Act 1: The job (0:06–0:22), music enters at 86.3 s, low-passed and opening up

| T | Picture | Sound | Edit |
| --- | --- | --- | --- |
| 0:06 | Crash site at dawn, wide (spawn wreck, zoom 0.9). Snow drifts, wreck smoking. | VO Mothership (radio-filtered): "Agent. You're alive." Music in, low-pass 400 Hz sweeping open over 8 s. | Fade from black over 10 frames. Only fade in the trailer. |
| 0:09 | Operator triptych: Scout, Tank, Engineer side by side, each doing their verb (sprint, shockwave, turret deploy). | GAME: `fx_scout_sprint`, `fx_tank_shockwave`, `fx_engineer_turret`, each on its panel's action frame. | 3-way split screen, panels slide in staggered by 4 frames. |
| 0:13 | Scavenge: shells pulled from a corpse, salvage counter ticking, Bank at the ship console. | VO Mothership: "Bank what you recover…" KIT: soft UI ticks in time with the counter. | J-cut: the VO starts under the previous shot. Punch-in 180% on the HUD counter (2× capture has the headroom). |
| 0:17 | Door transition into the bunker. The door opens, light spills in. | GAME: door slam variant. KIT: whoosh. | **Match cut**: the door opening fills the frame and becomes the next room. |
| 0:19 | Kinetic text over gameplay, game font, typed: `SALVAGE.` `BANK IT.` `GO DEEPER.` | `ui_typing` per character, a KIT sub hit on each period. | Text slams on beats 1, 3 and 5 of the bar. |

### Act 2: The bunker resents you (0:22–0:42), music breakdown, then a riser

| T | Picture | Sound | Edit |
| --- | --- | --- | --- |
| 0:22 | A dressed room, lights on. Then **the lights die**: time of day jumps to night, the flashlight cone is the only light. | VO Bunker: "Local lighting has been suspended. Please enjoy the darkness responsibly." | Cut on "suspended". 3-frame glitch (`rgbashift` + noise) on the lights-out frame. |
| 0:28 | A corridor. Crawlers pour around a corner toward the player. | VO Bunker: "Facilities has dispatched a welcome committee to your position." GAME: crawler alerts. | Hold the shot. The joke lands on "welcome committee" as they appear. |
| 0:33 | **Biome match-cut chain**: the same iso framing, player walking left to right, cutting on each footstep: bunker, cryo, bio, chasm rim with a landmark tower. | KIT: whoosh per cut. Ambience swaps per biome (`room_tone_interior_bunker` → `room_tone_cryo_subzero` → `room_tone_bio_hive` → `room_tone_exterior_wind`). | Match cut on position. Each shot about 1 s. The grade shifts per biome. |
| 0:37 | O2 meter draining in the red. Punch-in on the HUD, then pull back to the player in a storm. | VO System: "Warning: operator respiration is approaching critical limits." KIT: heartbeat pulse, riser starts (4 s). | Push-in (`zoompan`) along the riser. |
| 0:41 | Black. | VO Bunker, alone: "The structure notes your depth… and disapproves." | **The gap**: 0.5 s of silence before the drop. |

### Act 3: The drop (0:42–1:04), music drop at 122.30 s

Cuts every 2 beats for the first 8 bars, then every beat. Each shot is 0.5–1.5 s.

| Content (in order of escalation) | Sound | Edit |
| --- | --- | --- |
| Shotgun at point-blank, snail gibs | GAME fire + KIT sub on the downbeat | Hard cut on the drop frame, 2 white flash frames |
| Railgun line through three crawlers | GAME railgun + tracer | Freeze frame 8 frames + chromatic split |
| Tesla arc chaining | GAME tesla | Whip-pan transition (motion-blurred slide) |
| Cryo weapon freezing a cryosnail | GAME cryo + crystal shatter | Speed ramp 0.3→1.0 on the shatter |
| Engineer turret holding a doorway | GAME turret | Camera shake on impacts (crop jitter) |
| Scout dash through a gap | GAME sprint | Speed ramp |
| Camp under siege, defenders firing | GAME camp lockdown alarm | Wide shot, grade warm |
| Hive pulsing, spores, eggs hatching | GAME `hive_eggs_hatch`, `hive_spores_puff` | Push-in |
| Boss: Cybersnail or Cryo Goliath charge | GAME boss alert + KIT impact | Letterbox bars slide in (2.39:1), held into Act 4 |
| Destructible walls exploding into debris | GAME `enemy_break_wall` | Cut on the burst |

Kinetic text cards are inserted between bars, one word each, in game font
over gameplay (never on black): `3 OPERATORS` · `3 BIOMES` · `BOSSES` ·
`10 ENDINGS`. Recheck each against current content before rendering
(2026-10-14: 3 operator classes; 10 `ending-*.webm` cutscenes in
`public/cutscenes/`, driven by `src/act2Endings.js`).

### Act 4: The turn (1:04–1:16), music cut hard

| T | Picture | Sound | Edit |
| --- | --- | --- | --- |
| 1:04 | Mid-combat, then **music stops dead**. The player stands still in a hive chamber. | KIT: tape-stop on the music. Room tone only. | Letterbox stays. Grade drains to cold green. |
| 1:06 | Mothership uplink screen flickering. | VO Mothership: "Correction: recovery has been abandoned. Orbital extermination is now authorized." | Glitch on "abandoned". |
| 1:10 | Slow push toward the Queen in her arena (queen arrival). | VO System, whispered: "Four seats pressurized. Five heartbeats detected." KIT: heartbeat in sync. | Slow `zoompan` push. |
| 1:13 | Queen close: she turns. | VO Queen: "Two heartbeats. One purpose." KIT: **braam** + sub drop on "purpose". | Cut to black on the braam tail. |

### Act 5: Title and CTA (1:16–1:25)

| T | Picture | Sound | Edit |
| --- | --- | --- | --- |
| 1:16 | Logo, rendered from the real title screen (or the new logo from the store plan when it exists), with frost/glitch reveal. | Music: the last chord of the track (or the Main Theme's ending swell) + KIT impact. | Logo hit on the impact frame. |
| 1:20 | `WISHLIST ON STEAM`, platform line `PC · Linux · Steam Deck (in testing)`. Small: `Pre-release gameplay`. | VO Bunker, dry, as the button: "Your curiosity continues to exceed your clearance." | Hold to end. Last 10 frames are clean for Steam's end-frame thumbnail. |

**Cutdowns.** The 30 s cut is Act 0 + the first 8 bars of Act 3 + the Queen
line + the CTA. The 15 s cut is the cold open + 6 drop shots + the CTA. The
6 s bumper is the cold open's gib + logo.

---

## 5. Capture: deterministic, frame-stepped, on the GPU

### 5.1 Why not screen recording

This dev box is headless (no `DISPLAY`, TTY session), so OBS/x11grab is out.
Playwright `recordVideo` encodes low-bitrate VP8 at whatever frame rate the
page manages. Under load that is 20–40 fps with hitches. A trailer needs
locked 60 fps (120+ for slow-mo).

### 5.2 Virtual-time frame stepping

The game loop is `renderer.setAnimationLoop(() => this.render())` driven by
`performance.now()` (`src/threeGame.js:4768`, `:2499`). So a capture shim can
own time:

1. Boot normally (Vulkan args, `hb_graphics` pinned High, autoAdjust off, as
   in `tests/e2e/probes/steam-store-shots.spec.js`).
2. When the shot's setup is done, install a virtual clock in the page: replace
   `performance.now`, `Date.now`, `requestAnimationFrame` and
   `setTimeout`/`setInterval` with versions that only advance when the harness
   says so. Stop the animation loop. Pause CSS animations through CDP
   `Animation.setPlaybackRate(0)` and step them per frame with
   `Animation.seekAnimations`.
3. Per frame: advance the clock 1/60 s (or 1/120, 1/240 for slow-mo shots),
   call `game.render()`, then capture. Prefer CDP
   `HeadlessExperimental.beginFrame({screenshot})` (needs
   `--enable-begin-frame-control --deterministic-mode`). Fall back to
   `page.screenshot` (about 80–120 ms per 1080p frame, so 60 s of footage is
   about 6 minutes of capture).
4. Write a PNG sequence and encode a lossless FFV1 or ProRes intermediate
   per shot.

Speed and GPU load no longer affect the footage, so every take is smooth.
Slow-mo is native: capture at 240 fps and play at 60.

**Phase 0 spike (do first, half a day).** 3 s of combat at 60 and 240 fps.
Check, in order:
- the game sim respects the stepped clock (no wall-clock leaks such as
  `setTimeout` physics or audio-clock reads);
- the HUD stays in sync;
- `beginFrame` works with the Vulkan ANGLE backend.

If `beginFrame` fails on Vulkan, use `page.screenshot`. If the sim leaks
wall-clock time, add a `game.stepFrame(dt)` hook in `threeGame.js` (the
render path already takes delta) instead of patching globals.

### 5.3 Shot recipes

Each shot is a small module in `trailer/shots/<id>.js`:
- **Setup:** seed, class, biome or coords, time of day, camera zoom, spawn
  list, god mode, and which HUD panels are hidden. Same calls the store-shot
  probe uses: `teleportPlayerTo`, `spawnEnemyInstance`, `startQueenFight`,
  `timeOfDay` + `updateDayNightCycle`, `camera.zoom`.
- **Input track** in virtual frames, e.g.
  `[{f:0, key:'KeyD', down:true}, {f:20, aim:'enemy:0'}, {f:22, fire:30}]`.
  Aim targets resolve each frame by projecting the enemy position, the
  `enemyScreenPoints` approach from the store probe.
- **Output:** `trailer/raw/v4/<id>/frames/*.png`, `<id>.mkv`, `<id>.events.json`.

Takes are deterministic for a given seed, so the edit's in/out points stay
valid across recaptures unless the recipe changes.

**God mode is a tell.** Hide any invulnerability VFX or text, or use a
high-armor loadout instead. Check every shot for debug UI and "RELOADING"
spam.

### 5.4 Game SFX event log: auto-synced diegetic sound

Wrap `window.AudioManager.play(id, opts)` during capture and log
`{frame, id, volume, bus}`. The shot then carries its own cue sheet, and the
assembler places the real game sound at the exact frame it fired, with speed
ramps applied. Every gunshot, tracer, door and death in the trailer is in
sync with no manual spotting. Manual overrides in the EDL can mute or swap
any cue.

### 5.5 Shot list (first capture batch)

| ID | Recipe | fps | Used in |
| --- | --- | --- | --- |
| `cold-open-tank-night` | Tank, bunker, night 0.9, zoom 1.35, 4 enemies in an arc, continuous fire, one gib | 60 + 120 | Act 0 |
| `crawler-lunge` | Flashlight swing to a crawler in close | 120 | Act 0 |
| `wreck-dawn-wide` | Spawn wreck, time 0.27, zoom 0.9, idle player | 60 | Act 1 |
| `class-scout-sprint` / `class-tank-shockwave` / `class-engineer-turret` | One per class, same framing, the ability on frame 30 | 60 | Act 1 triptych |
| `salvage-bank` | Corpse shell pickup → ship console bank, HUD counter visible | 60 | Act 1 |
| `door-reveal` | Door transition into a dressed room | 60 | Act 1 |
| `lights-out` | Furnished room, time 0.4 → 0.92 cut. This is staged: no in-game "lights suspended" event exists in `src/` (2026-10-14), only the announcer line. Keep the frames honest: night is a real game state, and the cut is the edit. | 60 | Act 2 |
| `welcome-committee` | Corridor, 6 crawlers spawned off-screen walking in | 60 | Act 2 |
| `walk-bunker` / `walk-cryo` / `walk-bio` / `walk-rim` | Same framing, walking left to right | 60 | Act 2 match-cut chain |
| `o2-critical` | O2 forced low, storm sky | 60 | Act 2 |
| `drop-*` (10 shots) | One per row of the Act 3 table, per weapon profile | 60 / 240 | Act 3 |
| `camp-siege`, `hive-pulse` | Act 2 camp/hive sites from `act2.getState()` | 60 | Act 3 |
| `boss-charge` | Debug boss chamber is **not** allowed on camera. Spawn the boss in a real biome room | 60 / 120 | Act 3 |
| `uplink-abandoned` | Mothership uplink UI with the purge line | 60 | Act 4 |
| `queen-push`, `queen-turn` | `startQueenFight()`, slow zoom. **Blocked**: in the 2026-10-14 store-shot runs it hung once, crashed the renderer once, and once ran with the Queen not readable on camera and HP never dropping (store doc §7). Fix that first. | 60 | Act 4 |
| `title-reveal` | Real title screen boot | 60 | Act 5 |

The store-shot probe run of 2026-10-14 is the location scout for these: its
`shots.json` records biome, time of day and enemy count per frame.

---

## 6. Edit and sound pipeline

### 6.1 EDL v4 (`trailer/edl/gameplay-trailer.json`)

The edit is still data, but as tracks rather than a flat shot list:

```jsonc
{
  "fps": 60, "size": [1920, 1080],
  "music": { "file": "public/audio/ost/Under Siege (Combat Alert).mp3", "anchor": { "beat": "drop", "at": 42.0 }, "grid": "auto" },
  "video": [
    { "shot": "cold-open-tank-night", "in": 0.4, "dur": 3.1 },
    { "shot": "crawler-lunge", "in": 1.0, "dur": 1.5, "speed": [[0, 1.0], [0.6, 0.4]] },
    { "black": 6, "unit": "frames" },
    { "shot": "drop-shotgun", "at": "beat:drop", "dur": "2beats", "flash": 2 }
  ],
  "overlays": [ { "card": "kinetic", "text": "SALVAGE.", "at": "beat:A1.1" } ],
  "dialogue": [ { "file": "public/audio/voice/bunker/voice_bunker_01_enjoy_darkness.mp3", "at": 22.0, "trim": [0, 9.8], "fx": "pa" } ],
  "kit": [ { "fx": "riser", "end": "beat:drop", "len": 4 }, { "fx": "braam", "at": 75.2 } ],
  "game_sfx": { "from_events": true, "mute": ["ui_hover"] }
}
```

Times can be seconds, frames, or **beat references** (`beat:drop`,
`beat:A1.1` = section A, bar 1, beat 1, `2beats`). They resolve against the
music's beat grid, so moving the music in-point moves every cut with it.

### 6.2 Beat grid (`scripts/trailer/beat-grid.js`)

There is no librosa or aubio on the box, so do it in Node:
1. Decode mono 22 kHz PCM with ffmpeg.
2. Compute spectral flux onsets.
3. Autocorrelate for tempo.
4. Phase-align a beat grid and mark downbeats by low-band energy.
5. Detect the drop as the largest short-window RMS rise. The 2026-10-14
   measurement, 50 ms windows, puts it at 122.30 s.

Write `trailer/edl/<track>.grid.json`. The tool prints the BPM and drop time
so the owner can sanity-check them against a listen.

### 6.3 Trailer FX kit (`scripts/trailer/sfx-kit.js` → `trailer/sfx/*.wav`)

The repo has no trailer-grade FX: no whooshes, risers, booms or braams
(searched `public/audio` and `art` on 2026-10-14). Synthesize them with
ffmpeg `lavfi` so they are ours, license-free and reproducible:

| FX | Recipe sketch |
| --- | --- |
| `whoosh_{short,long}` | pink `anoisesrc` → band-pass with swept center (`bandpass` + `volume` envelope via `aeval`), stereo pan sweep |
| `riser_{4s,8s}` | saw + noise layers, pitch glide up an octave, high-pass sweep up, reverb tail cut at the end |
| `sub_hit` | 45 Hz sine, exponential pitch drop to 30 Hz, 600 ms decay + a 3 ms noise click |
| `impact_metal` | `sub_hit` + existing `impactMetal_medium_*` + `amb_metal_stress` transient, compressed |
| `braam` | 3 detuned saws at 55/55.4/82 Hz, low-pass opening, `aecho` hall, 3 s |
| `reverse_swell` | `areverse` of a reverb-tailed `sub_hit` + noise |
| `glitch_stutter` | 40 ms slices of the current VO or music repeated 3–6× (assembled per use) |
| `tape_stop` | music tail with `asetrate` ramp down + `atempo` correction |
| `heartbeat` | two low thumps (lub-dub) at 60 bpm, low-passed |
| `ui_text_slam` | `ui_click_confirm` + `sub_hit` at -6 dB |

The ElevenLabs sound-effects generator (the voice cast already went through
ElevenLabs, per `docs/elevenlabs-voice-design-prompts-11-core-roles-2026-08-25.md`)
is an optional upgrade for richer braams and whooshes. It is an owner
decision because it costs credits. The synthesized kit is the baseline either
way.

### 6.4 Mix (five buses, built in `build-trailer.js`)

| Bus | Content | Processing |
| --- | --- | --- |
| Music | Under Siege, with section edits on the beat grid | Ducked 8 dB under dialogue (`sidechaincompress` keyed by the dialogue bus). Low-pass sweep automation in Act 1. Tape-stop in Act 4. |
| Dialogue | Existing VO lines | High-pass 90 Hz. **Mothership**: radio band-pass 300 Hz–3.4 kHz + light bit-crush. **Bunker**: PA (band-pass + short slap `aecho`). **Queen**: dry + an octave-down layer at -14 dB + long hall. **System**: clean, close. |
| Game SFX | From capture event logs | Per-shot gain. Speed-ramped with the picture. Limited so gunfire never masks VO. |
| Kit FX | Whooshes, risers, hits, braam | Hits sit on the beat grid. Risers end exactly on their target frame. |
| Ambience | Per-biome room tones | Crossfaded under the match-cut chain. |

Master: two-pass `loudnorm` to **-14 LUFS integrated, -1 dBTP**
(YouTube/Steam-friendly). Stereo AAC 320k.

### 6.5 Picture finishing

- **Text and cards** are rendered as HTML in Playwright with the game's own
  fonts and CSS tokens, then exported as transparent PNG sequences and
  overlaid. This gives exact UI look, typed-terminal animation and no font
  files to license. Liberation Sans is gone.
- **Transitions:** hard cut (default); `xfade` `fadewhite` 2-frame flash;
  whip pan (`xfade=slideleft` + `tmix` motion blur); match cut; dip to black
  only at the Act 0→1 boundary.
- **Effects:**
  - punch-in (`crop`/`scale` from the 2× capture);
  - camera shake (`crop` with seeded jitter expressions);
  - glitch (`rgbashift` + `noise` + 1-frame row offset);
  - freeze (`tpad=stop_mode=clone`);
  - letterbox (`drawbox`, animated);
  - per-act grade (`curves`/`lut3d`): teal-cold Acts 1–2, hot orange-white
    Act 3, sick green Act 4.
- **Speed ramps:** keyframed `setpts` over high-fps captures, never frame
  blending.

### 6.6 Output and QA (extend `verifyOutput`)

Add these checks to the existing Steam spec check:
- `blackdetect`: black only where the EDL says.
- `freezedetect`: a stuck capture shows as a freeze.
- `loudnorm` print: -14 ±1 LUFS.
- `silencedetect`: silence only at the planned gaps.

Also produce:
- a **muted preview** of the first 10 s to watch exactly as Steam autoplays it;
- a contact sheet at one frame per second for review.

---

## 7. Steam upload notes

- Upload order: **1. Gameplay Trailer (v4)**, 2. `cutdown-30`. Retire nothing
  that isn't there: the page currently has no movies.
- Steam builds its autoplay microtrailer from the first movie. Every 10 s
  stretch of v4 has to work alone, which the all-gameplay rule handles.
- Name the movies plainly ("Gameplay Trailer", "30s Trailer").
- Pick a gameplay frame for the thumbnail (the Act 3 railgun freeze), not the
  logo.
- Keep the two 8 s class loops as About-section GIF/WebM (store plan §5),
  re-rendered at 616 px wide from new captures.

---

## 8. Phases

| Phase | Work | Acceptance |
| --- | --- | --- |
| 0 | Virtual-time capture spike (§5.2) | 3 s at 60 and 240 fps, with no dropped or duplicated frames (`freezedetect` clean) and the HUD in sync |
| 1 | Shot recipes + capture runner + SFX event log | All §5.5 shots captured from one command, with event logs |
| 2 | Beat grid + FX kit | Grid BPM and drop confirmed by an owner listen. Kit renders deterministically. |
| 3 | EDL v4 + assembler (tracks, beat refs, overlays, buses) | `npm run trailer:build -- gameplay-trailer` reproduces the cut |
| 4 | First full cut, then review | Owner watch-through, muted-first-10 s check, notes logged in this doc |
| 5 | Cutdowns + vertical + thumbnails | Four extra files pass `verifyOutput` |
| 6 | Upload (owner) | Store shows the trailer first. Update `docs/steam-store-assets-plan.md`. |

## 9. Owner decisions needed

1. **Music:** "Under Siege (Combat Alert)" (recommended), or keep the Main Theme.
2. **VO:** use the Bunker, Mothership, System and Queen lines as written
   above? Can the Mothership purge line and the Queen line appear, or is the
   Act 2 turn a spoiler you want held back?
3. **New VO button line:** record "Facilities regrets the inconvenience." in
   the Bunker voice through the local voice pipeline
   (`docs/voice-generation-pipeline.md`)? It is a stronger closer than the
   existing line.
4. **FX:** synthesized kit only, or also spend ElevenLabs credits on SFX?
5. **Release line:** the CTA says "Wishlist on Steam" with no date. Confirm.
6. **Platform line:** "Steam Deck (in testing)" or omit Deck until Verified?
