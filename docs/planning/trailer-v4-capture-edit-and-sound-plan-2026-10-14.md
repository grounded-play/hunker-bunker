# Trailer v4: Capture, Edit and Sound Plan

Date: 2026-10-14. Branch: `dev/sprint-52`. Status: **phases 0–3 and 5 built
the same day, phase 4 (owner watch-through) and phase 6 (upload) open. See
§10 for what was built, how to rerun it, and what differs from this plan.
§11 (2026-10-15) revises the cut: in-game films and interstitials, VO lines
paired with word-synced text clips, a class showcase with skins, and an
arsenal sequence. It supersedes §4 where they differ.**
The store page that this trailer goes on is planned in
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
| `lights-out` | Corridor, time 0.42, then at frame 90 the real `triggerLightsOut()` event (it shows "LIGHTING BREAKER TRIPPED. PLEASE ENJOY THE DARKNESS RESPONSIBLY.") plus a drop to night 0.86. Correction (built): the event exists (`src/threeGame.js` `triggerLightsOut`), but in-game it only dims, and interiors stay lit at night, so the edit adds a 0.3 s flicker and a darker grade on that frame. See §10. | 60 | Act 2 |
| `welcome-committee` | Corridor, 6 crawlers spawned off-screen walking in | 60 | Act 2 |
| `walk-bunker` / `walk-cryo` / `walk-bio` / `walk-rim` | Same framing, walking left to right | 60 | Act 2 match-cut chain |
| `o2-critical` | O2 forced low, storm sky | 60 | Act 2 |
| `drop-*` (10 shots) | One per row of the Act 3 table, per weapon profile | 60 / 240 | Act 3 |
| `camp-siege`, `hive-pulse` | Act 2 camp/hive sites from `act2.getState()` | 60 | Act 3 |
| `boss-charge` | Debug boss chamber is **not** allowed on camera. Spawn the boss in a real biome room | 60 / 120 | Act 3 |
| `uplink-abandoned` | Mothership uplink UI with the purge line | 60 | Act 4 |
| `queen-push`, `queen-turn` | `startQueenFight()`, framed beside the player. Unblocked (built): the earlier "Queen not on camera" runs were framing, not a broken fight. See §10.3. | 60 | Act 4 |
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

---

## 10. Build record (2026-10-14)

Everything below ran on a `dev/sprint-52` checkout (worktree
`../hunker-bunker-trailer`, branch `trailer/v4-capture`; the shared tree was
switched to another agent's branch mid-session, so captures run from their own
worktree and Vite server). Raw takes and build intermediates are under
`trailer/raw/v4/` (gitignored); deliverables under `dist/trailer/v4/`
(gitignored).

### 10.1 Commands

```bash
npm run trailer:capture:v4                       # all 29 recipes, ~2.5 h on the RTX 2070 SUPER (1.25 s/frame)
TRAILER_SHOTS=queen-push,queen-turn npm run trailer:capture:v4   # retake some
npm run trailer:grid -- "public/audio/ost/Under Siege (Combat Alert).mp3"
npm run trailer:sfx                              # trailer/sfx/*.wav, bit-identical per run
npm run trailer:build:v4 -- gameplay-trailer     # also cutdown-30, cutdown-15, bumper-6, vertical-30
node scripts/trailer/about-loops.js              # store About loops (store plan §5.2)
```

The capture config starts its own no-HMR server
(`tests/e2e/trailer/v4/vite.capture.config.mjs`, port 5241, own optimizer
cache). `TRAILER_REPL=1 npx playwright test -c tests/e2e/trailer/v4/playwright.config.js repl`
boots once and runs `trailer/raw/repl/<n>.mjs` files dropped in, which is how
the recipes were scouted.

### 10.2 Phase results

| Phase | Result |
| --- | --- |
| 0 | `tests/e2e/trailer/v4/vclock.js` owns `performance.now`, `Date.now`, rAF and timers in the page (pass-through until a take starts, then frame-stepped; pending timers keep their ids). 3 s of combat at 60 and 240 fps: exactly one `game.render()` per step, delta exactly 16.667 / 4.167 ms, **0 duplicated frames** (framemd5) of 180 and 720. The camera change and a HUD element added before step 6 both first appear in captured frame 6 (checked on the frames; `phase0-spike.spec.js`). `HeadlessExperimental.beginFrame` was not needed. **Capture resolution trap (measured):** a raw CDP `Page.captureScreenshot` returns CSS pixels (1728×972 for the 16:9 stage crop) at any `clip.scale`/`fromSurface`/`optimizeForSpeed` setting, and every call resets the page's `devicePixelRatio` to 1 (the canvas then drops to 1x on the next resize). Playwright's `page.screenshot({ clip })` returns device pixels and keeps the DPR. The context runs at deviceScaleFactor 1.35, the game's own render cap at this stage size (`src/renderScale.js`, 5 MP budget), so frames are 2333×1312 (cropped to 2332 for x264), downsampled to 1080p with 1.2x punch-in headroom; about 1.25 s per frame, so 60 s of footage is about 75 minutes. |
| 1 | `tests/e2e/trailer/v4/shots.js` (29 recipes) + `capture-v4.spec.js` (one boot per class, 16:9 crop at 1.35x device pixels, x264 crf 12 intermediates, a contact sheet per take, `trailer/raw/v4/index.json`). Each take writes `<id>.events.json`: every `AudioManager.play` with its virtual time, the exact sample variant, gain, pan and rate. `Math.random` is seeded per take. |
| 2 | `scripts/trailer/beat-grid.js`: **94.19 BPM, drop at 122.258 s (+18.8 dB)**; the half/double candidates score far lower (191.5 BPM: 77 vs 297). Owner listen still needed. `scripts/trailer/sfx-kit.js`: 18 synthesized FX (whooshes, risers, sub hit, metal impact, braam, reverse swell, heartbeats, text slam, type ticks, glitch, drone), checksums identical across runs. |
| 3 | `scripts/trailer/build-v4.js` + `edl-time.js`, EDLs in `trailer/edl/`. Beat references (`beat:drop+8`, `bar:drop+2`, `2beats`), sequential `until` cuts, speed ramps and freezes by per-frame source mapping, push/shake/whip in Node, grades/flash/glitch/flicker/fades in ffmpeg, split-screen triptych, drawtext cards in the game's fonts (`trailer/fonts/`, OFL), animated letterbox. Five-bus mix in Node at 48 kHz: music with low-pass automation and tape stop, dialogue through radio/PA/Queen/system chains (whisper word timings + silencedetect for the trims), game SFX placed from the event logs (pitched with slow-mo), kit, ambience beds; dialogue ducks music 9 dB and SFX 5 dB. Two-pass loudnorm to -14 LUFS under a -3 dBTP limiter (ffmpeg's AAC adds ~1.2 dB of true peak on this mix). QA: codec/size/fps/audio/duration, loudness, true peak, blackdetect and freezedetect against the EDL's planned black/holds, plus a warning when a clip outruns its take. |
| 4 | First full cut built: `hunker-bunker-gameplay-trailer.mp4`, 85.6 s, QA pass. Owner watch-through still to do; my notes in §10.4. |
| 5 | `cutdown-30`, `cutdown-15`, `bumper-6`, `vertical-30` (1080×1920) built from the same takes, all through the same QA; thumbnails (railgun freeze, boss, Queen) exported by the build; four About loops (616×346, WebM + MP4, 120–470 KB, seamless) by `about-loops.js`. |

### 10.3 What the capture found in the game

- **The Queen fight works.** The 2026-10-14 store-shot misses were framing:
  on this build `game.caveEntrance` is null, so `startQueenFight()` spawns her
  at `getApexThreatOrigin()`, an offset from the player that lands below the
  bottom edge of the screen; she does not move; her model plays an emergence
  (root scale 0.05 → 1, about 1.5 s once the GLB is cached, longer on first
  load) and rises about 0.66 NDC above its root, so anything placed screen-up
  of the player leaves the 16:9 crop. Her brood adds are
  `alien_proto_crawler` models that look like small Queens, which is what the
  earlier "Queen on top of the player" frames showed. Framed beside the
  player she reads well, takes damage (120 → 91 in a 4 s take) and her
  boss bar updates. If the Queen should be findable in normal play, the spawn
  offset is worth a look.
- **Lights-out is real but subtle.** `triggerLightsOut()` needs the O2
  generator online (`canTripLightingBreaker()`), and the visible effect is a
  mild dim; "night" is a tint and furnished interiors stay lit. The trailer
  uses the real event plus a night drop and adds a short flicker and darker
  grade in the edit. The store's planned `hb_about_03_lights_out` loop has
  the same limit.
- **Live enemies draw through their 3D visual** (`userData.enemy3dVisual`);
  their sprite is hidden, so `sprite.visible` is not an "alive" test.
  Crawlers have 1 HP and cybersnails 2; recipes multiply HP (×2–×4) so a
  fight lasts on camera.
- **Clean HUD needs more than the stage.** The minimap is a canvas and some
  toasts live outside `#game-viewport`; clean mode hides everything except
  the renderer's canvas.
- **The title menu shows MULTIPLAYER**, which the claim checklist keeps off
  camera; the title capture hides the menu and profile HUD.
- The weapon panel title stays `SIDEARM` after a field-weapon swap (store
  doc §7), visible in every HUD-on shot.

### 10.4 Differences from §4 and review notes for the owner

- Act 2's "corridor → crawlers pour in" is staged in the cathedral hall (the
  corridor hid them); the biome chain is bunker / cryo / bio walks; the O2 shot
  carries the Bunker's "depth… and disapproves" line, and the System warning
  was dropped for time.
- Act 4 opens on the hive (not a Mothership uplink screen: there is no
  uplink UI worth filming) with the purge line, then the Queen emerging and
  the two-shot.
- Act 5 has no music sting (the Main Theme has no ending swell; it is loud to
  the last second): impact, reverse swell and drone under the title art, CTA
  over the art, Bunker's "Your curiosity continues to exceed your clearance."
  as the button.
- Defaults taken for §9: music 1, VO 2 as written including the purge and
  Queen lines, no new line recorded (3), synthesized kit only (4), "Wishlist
  on Steam" with no date (5), no platform line (6). Each is one EDL edit.
- To check on a watch-through: the mix balance (I verified levels and
  waveform shape, not by ear), whether the weaker takes (welcome committee,
  SMG, camp siege) should be re-staged, and the grid against the music.

---

## 11. Revision (2026-10-15): films, VO-synced text, classes, skins and guns

Owner request: use the interstitial movies and the new tactical text videos,
lay each VO line over a text clip that spells it for emphasis, show all three
classes each doing their own thing, and show several skins and gun types.

### 11.1 What exists to use

All paths under `public/`. "Film" means an in-game cinematic: every one of
these plays somewhere in the game, so showing it is honest, but it is still
not gameplay and counts against the budget in §11.2.

| Source | Size, length | Content | Use in the cut |
| --- | --- | --- | --- |
| `cutscenes/intro-boot.mp4` | 1920×1080, 6.0 s, audio | Glitch-typed terminal words over scrolling code: SECURE BUNKER 07, BIO-BREACH DETECTED, QUARANTINE FAILED, exosuit/weapons/deploy readouts, DIRECTIVE: DEEP RUN, ✓ ALL SYSTEMS GO, DEPLOY | Act 0 overlay words; its glitch audio as SFX |
| `cutscenes/intro-mothership-briefing.mp4` | 1920×1080, 13.21 s, VO mixed in | The `voice_mothership_01_alive` line spelled verbatim in time with the voice: "Agent. / You're alive. / … / Bank what you recover / rebuild the vessel — system by system. / AWAITING CHOICE" | Act 1 text over gameplay, cut on the same in/out points as the VO (§11.4) |
| `cutscenes/credits-terminal.mp4` | 1920×1080, 6.0 s, audio | HUNKER BUNKER, TUESDAY CINEMA CLUB, THANK YOU FOR DEPLOYING | Act 5 end card words |
| `interstitials/int_NN_*_key_v1.mp4` (32) | 1280×720, 6.04 s, audio | Animated key art, one per song (`int_01` Someone Is Still Alive … `int_32` Black Box Stain); `interstitials/motion/*_motion_v1.webm` twins | Short cut-ins on matching beats: `int_01` (You're alive), `int_13` A Snail Blocks the Hallway (welcome committee), `int_09` Mothership Customer Support (the purge, its smile turns to red warnings), `int_11` Her Voice Inside Your Helmet and `int_12` The Queen Makes a Reasonable Offer (Queen), `int_25` Gigawatt Goliath (boss) |
| `cutscenes/cave-reveal.webm` | 1920×1080, 7.4 s | Hive interior, eggs, green veins | Act 4 opener |
| `cutscenes/ending-*.webm` (10) | 1920×1080, about 6–7 s | The ten endings | "10 ENDINGS" flash sequence |
| `cutscenes/event-boss-encounter-{cybersnail,cryosnail,sporesnail}.webm`, `event-queen-encounter.webm` | 1280×800, 3.6 s | Boss and Queen encounter cards | One beat before each boss/Queen gameplay shot |
| `cutscenes/death-oxygen.mp4` | 1280×720, 8 s | Suit failing, red O2 light | 6–10 frames inside the O2-critical beat |
| `cutscenes/{scout,tank,engineer}-class-intro.mp4` | 480×270, 8 s | Class intros | Not used: too low resolution (store plan §5.2 retires them too) |

720p and 1280×800 sources are scaled to 1080p with Lanczos, cropped to 16:9,
given the act grade and a little grain, and kept short, so the softness does
not read next to the 1.35x gameplay captures.

### 11.2 Rules for the revised cut

1. **Gameplay at least 75% of runtime.** Films and text clips are cut-ins and
   overlays: no film insert longer than 1.5 s except the Act 4 opener and the
   title. Budget for the cut below: about 14 s of film in 88 s (16%).
2. **Text clips ride over gameplay, not black.** The text videos have dark
   backgrounds; they composite with `screen` blending (or an alpha render,
   §11.5) at 70–100% so the words sit on top of the action.
3. **One voice source.** VO comes from the dialogue bus (§6.4) with its radio,
   PA or Queen chain; a film's own audio track is muted unless the EDL turns
   it on (the boot clip's glitch hits are used as SFX).
4. **Each class reads as itself:** its own skin, its signature gun, its
   ability, and a class chip (SCOUT / TANK / ENGINEER) the first time it
   appears. No shot mixes two classes unless it is labelled as a split.
5. **Skins and finishes are shown, never sold:** no prices, rarity labels,
   store UI or "free" claims (claim checklist). Names may appear as kinetic
   text only if the owner wants them (§11.10).
6. **Spoilers:** ending flashes run 4 frames each, too fast to read story
   details; the Queen and purge lines were already approved in §9 defaults.

### 11.3 Revised beat sheet (target 1:28, drop still at 0:42)

`b` = beat (0.637 s at 94.19 BPM); beat times come from the grid, so the cut
moves with the music.

**Act 0, cold open (0:00–0:06.3), no music**

| T | Picture | Text clip (word-synced) | Sound |
| --- | --- | --- | --- |
| 0:00 | Tank firefight, night grade (gameplay, unchanged) | — | Game SFX, sub hit |
| 0:01.6 | same | `intro-boot` "BIO-BREACH DETECTED", screen blend, 0.6 s | Boot clip glitch hit |
| 0:03.0 | Crawler lunge, 120 fps ramp | `intro-boot` "QUARANTINE FAILED", 0.6 s | Boot clip glitch hit |
| 0:05.4 | Black | — | Mothership VO "Agent." (radio) |

**Act 1, the job and the crew (0:06.3–0:21.6), music low-passed, opening up**

| T | Picture | Text clip | Sound |
| --- | --- | --- | --- |
| 0:06.3 | `int_01` Someone Is Still Alive, 1.0 s, then the wreck at dawn | `intro-mothership-briefing` "You're alive." in time with the VO | VO "You're alive." |
| 0:10.2 | **Class showcase**, 12 beats (§11.6): SCOUT 4b, TANK 4b, ENGINEER 4b. Each class flips through its skins on the beat in the same move | Kinetic class chip on each class's first beat | Each class's ability SFX on its action frame (`fx_scout_sprint`, `fx_tank_shockwave`, `fx_engineer_turret`) |
| 0:17.8 | Salvage and bank: corpse pickup, counters ticking | `intro-mothership-briefing` "Bank what you recover / rebuild the vessel —" | VO "Bank what you recover and rebuild the vessel" |

**Act 2, the bunker resents you (0:21.6–0:42), breakdown and riser**

| T | Picture | Text clip | Sound |
| --- | --- | --- | --- |
| 0:21.6 | Lights-out corridor (real event + night + flicker) | New clip `vo-bunker-lights` (§11.5): "LOCAL LIGHTING" on "Local", "SUSPENDED" on "suspended", then "PLEASE ENJOY THE DARKNESS RESPONSIBLY" typed under the second sentence | VO Bunker 01 (PA) |
| 0:27.4 | Welcome committee (cathedral, crawlers pour in); `int_13` A Snail Blocks the Hallway cut in for 1b on "welcome committee" | `vo-bunker-committee`: "WELCOME COMMITTEE" slam on "welcome" | VO Bunker 02 |
| 0:32.4 | Biome chain: bunker / cryo / bio walk, 2b each | Kinetic "3 BIOMES" on the bio cut | Whooshes, room tones |
| 0:36.3 | O2 critical push-in; `death-oxygen` 8 frames on the riser's last bar | `vo-bunker-depth`: "DEPTH NOTED" on "depth", "DISAPPROVES" on "disapproves" | VO Bunker 03, heartbeat, riser |
| 0:40.7 | Black | — | 0.5 s silence |

**Act 3, the drop (0:42–1:02.4), 32 beats**

| Beats | Picture | Text | Notes |
| --- | --- | --- | --- |
| 0–8 | **Arsenal** (§11.7): one gun per beat, nine guns, each with its in-game name slammed in game font | Weapon names | Hard cut on each beat; muzzle-flash frame on the beat |
| 9–12 | Class abilities back to back: Scout dash, Tank smash, Engineer turret | — | Freeze 6 frames on the smash impact |
| 13–20 | Camp siege, hive pulse, cryo lance shatter (240 fps), rail freeze | "THE SURVIVORS OR THE SWARM" across 4b | Same line as the store About heading (store doc §4) |
| 21–24 | `event-boss-encounter-cybersnail` 1b, boss charge 2b, `int_25` Gigawatt Goliath 1b | "BOSSES" | Letterbox slides in on beat 21 |
| 25–28 | Queen fight (HP bar dropping) | — | |
| 29–32 | **Ending flashes:** 10 endings, 4 frames each (0.67 s), then 2b of the last one | "10 ENDINGS" | White flash between flashes |

**Act 4, the turn (1:02.4–1:16), music cut by tape stop**

| T | Picture | Text clip | Sound |
| --- | --- | --- | --- |
| 1:02.4 | `cave-reveal` 2.5 s, sick grade | — | Drone, room tone |
| 1:04.9 | `int_09` Mothership Customer Support: the smile, then the red warning panels on "abandoned" | `vo-mothership-purge`: "CORRECTION" / "RECOVERY ABANDONED" / "ORBITAL EXTERMINATION AUTHORIZED", red variant | VO Mothership 03 (radio), glitch on "abandoned" |
| 1:10.5 | Queen emergence beside the player (gameplay) | — | Heartbeat |
| 1:12.6 | `int_11` Her Voice Inside Your Helmet 1.0 s, then the Queen two-shot | `vo-queen-heartbeats`: "TWO HEARTBEATS." then "ONE PURPOSE." on the words, organic gold variant | VO Queen 01, braam on "purpose" |

**Act 5, title and CTA (1:16–1:28)**

| T | Picture | Text clip | Sound |
| --- | --- | --- | --- |
| 1:16 | Title art (menu hidden) with logo, push-in | `credits-terminal` "HUNKER BUNKER" glitch-in over the logo area | Impact, reverse swell |
| 1:21 | Same art | CTA "WISHLIST ON STEAM"; small `credits-terminal` "TUESDAY CINEMA CLUB" | VO Bunker "Your curiosity continues to exceed your clearance." |

Film time: about 1.0 + 0.64 + 0.13 + 0.64 + 0.64 + 1.3 + 2.5 + 5.6 + 1.0 s plus
the title, about 14 s of 88 (16%), inside rule 1.

### 11.4 VO lines and their text cues

Word starts from whisper (`trailer/raw/vo-words/*.json`), checked against
silencedetect (§6). Times are seconds into the source file; the overlay word
lands 2 frames before the spoken word so the eye leads the ear.

| VO file (trim) | Text clip | Words on screen, at source time |
| --- | --- | --- |
| `mothership_01_alive` (0.00–2.50) | briefing, same in/out | "Agent." 0.00, "You're alive." 1.64 |
| `mothership_01_alive` (8.73–11.20) | briefing, same in/out | "Bank what you recover" 8.76, "rebuild the vessel —" 10.14 |
| `bunker_01_enjoy_darkness` (3.78–9.60) | `vo-bunker-lights` | "LOCAL LIGHTING" 3.80, "SUSPENDED" 5.06, "PLEASE ENJOY THE DARKNESS RESPONSIBLY" 6.86 (typed to 9.14) |
| `bunker_02_welcome_committee` (2.50–6.10) | `vo-bunker-committee` | "FACILITIES" 2.46, "WELCOME COMMITTEE" 4.20, "TO YOUR POSITION" 4.94 |
| `bunker_03_depth_disapproves` (9.25–13.25) | `vo-bunker-depth` | "THE STRUCTURE NOTES YOUR DEPTH" 9.32 (typed), "DISAPPROVES" 11.86 (slam) |
| `mothership_03_orbital_purge` (1.25–7.75) | `vo-mothership-purge` | "CORRECTION" 1.29, "RECOVERY ABANDONED" 3.42, "ORBITAL EXTERMINATION" 5.02, "AUTHORIZED" 6.68 |
| `queen_01_two_heartbeats` (0.18–4.10) | `vo-queen-heartbeats` | "TWO HEARTBEATS." 0.18, "ONE PURPOSE." 2.80 |
| `bunker_02_welcome_committee` (7.00–10.40) | `credits-terminal` style, CTA | "YOUR CURIOSITY" 7.16, "EXCEEDS YOUR CLEARANCE" 9.04 |

### 11.5 New text clips

The briefing is the only VO line with a text video today. The other five come
from `scripts/generate-tactical-videos.py`, which already renders the
briefing from a word list timed to a `voice_track`:

- One preset per row of §11.4 (`vo-bunker-lights`, `vo-bunker-committee`,
  `vo-bunker-depth`, `vo-mothership-purge`, `vo-queen-heartbeats`), words and
  times taken from the table so the render lands on the spoken words.
- Palette per speaker: Bunker PA amber, Mothership radio cyan turning red
  for the purge, Queen organic gold (matches `int_11` and `int_12`).
- Add an alpha output (VP9 with alpha in WebM, or ProRes 4444) beside the
  MP4, so the words can sit over gameplay without the terminal background.
  Until then the assembler uses `screen` blending on the dark-background MP4.
- Render at the trailer's 60 fps and 1920×1080 so the words stay sharp.

### 11.6 Class showcase: each class its own, several skins each

Each class gets one choreography, captured once per skin with the same seed
and input track, so cutting between takes on the beat reads as a skin flip
mid-move. Skins are equipped through the game's own loadout API before the
run starts (`window.loadout.equipChassisSkin(id)`, `setArchetype`,
`equipWeaponSkin`), after `reconcileOwnership()` has run so an unowned
cosmetic is not stripped (verify in the capture spike).

| Class | Move (4 beats) | Skins, cut on the beat | Gun and finish | Place |
| --- | --- | --- | --- | --- |
| **Scout** | Sprint into a pack, dash through the gap, burst | 4113 Cryo-Vanguard Scout → 4115 Void Commando Recon → 4118 Cyber-Spectre Infiltrator | `talon` with 4100 Sub-Zero Frostbite Sidearm, then 4110 Queen's Carapace Carbine | Cryo engineering |
| **Tank** | Wade in, SMASH, Bulwark block, scatter blast | 4114 Trench Warden Heavy → 4117 Dreadnought Exo-Juggernaut → 4119 Hive-Lord Symbiote Exosuit | `siege_breaker` | Bio nest |
| **Engineer** | Deploy turret, turret holds the line, tesla arc | 4112 Sub-Terran Drill Engineer → 4116 Bio-Synthesizer Harness | `tesla_lock` with 4103 Cryo-Plasma Arc Driver | Bunker medical |

The class chip and the act grade stay the same across skin flips, so the
flip reads as "same operator, different suit".

New recipes: `class-scout-skin-{4113,4115,4118}`,
`class-tank-skin-{4114,4117,4119}`, `class-engineer-skin-{4112,4116}`.
The runner boots once per (class, skin), about 8 boots, and each take is
about 3 s at 60 fps.

### 11.7 Arsenal: nine guns, one beat each

| Beat | Gun (in-game name) | Class | Recipe |
| --- | --- | --- | --- |
| 1 | MARK-I SIDEARM | any | `arsenal-sidearm` |
| 2 | PULSE CARBINE | Engineer | `arsenal-pulse` |
| 3 | SCATTER REPEATER | Tank | `arsenal-scatter` |
| 4 | NEON SMG | Scout | `arsenal-smg` |
| 5 | RAIL MARKSMAN | Scout | `arsenal-rail` (240 fps, freeze on the line) |
| 6 | CRYO LANCE | Scout | `arsenal-cryo` (240 fps, shatter) |
| 7 | M-70 FLAMETHROWER | Tank | `arsenal-flame` |
| 8 | TALON / SIEGE BREAKER / TESLA LOCK | each class | three panels, the class guns side by side |
| 9 | (impact) | — | white flash into beat 10 |

Each take frames the muzzle and the target in one shot (enemy 3–4 m away,
zoom 1.45), fire starts on frame 2, and the beat cut lands on the first muzzle
flash. Names are the labels in `src/fieldWeapon.js` and the class archetypes
in `src/data/classArsenal.js`; recheck them before rendering.

### 11.8 Assembler and capture changes

- **EDL `film` clips:** external media with `in`, `dur`, fit or crop to 16:9,
  Lanczos upscale, grade, grain and optional speed; audio muted unless
  `audio: true`.
- **EDL `textClip` overlay track:** a text video placed at a trailer time,
  trimmed to a source window, blended `screen` (or alpha), with opacity and
  scale. A `syncTo` field ties its in-point to a dialogue entry, so the text
  and the VO always share in/out points.
- **Split panels with chips:** the triptych and the class-gun panel take a
  `chip` per panel.
- **Capture:** `bootForCapture({ chassisSkin, archetype, weaponSkin })`
  equips through the loadout API before `startRunAndSkipIntro`; one boot per
  (class, skin).
- **QA:** report film share and fail the build above 25%; check every text
  clip's in-point against its VO word time (±2 frames).

### 11.9 Cutdowns

- **30 s:** cold open with the two boot words, class showcase 6 beats (2 per
  class, one skin flip each), arsenal 6 beats, Queen line with its text clip,
  title and CTA.
- **15 s:** cold open, arsenal 6 beats, title.
- **6 s:** the cold-open gib, "QUARANTINE FAILED", logo.
- **Vertical 30:** as the 30 s, with text clips centred and scaled to the 9:16
  frame.

### 11.10 Owner decisions added

1. Show skin and gun names as kinetic text, or show the guns only?
2. Ending flashes: 4 frames each (unreadable) or skip endings entirely?
3. Premium skins (4115, 4116, 4119) in the trailer: fine, or free-track skins
   only (4112, 4113, 4114, 4117, 4118)?
4. Use the boot clip's own glitch audio, or only the kit FX?

### 11.11 Work order

1. Text clip presets and alpha output (§11.5).
2. Capture: loadout equip in `bootForCapture`, class-skin and arsenal recipes
   (§11.6, §11.7).
3. Assembler: `film`, `textClip` and chips (§11.8).
4. EDL v4.1 for the gameplay trailer and the cutdowns, then build, QA and
   owner watch-through.

