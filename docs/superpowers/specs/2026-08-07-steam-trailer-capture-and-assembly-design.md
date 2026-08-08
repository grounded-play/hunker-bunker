# Steam Trailer: Capture & Assembly Design

Date: 2026-08-07.

## Purpose

Produce Hunker Bunker's first Steam store trailer end-to-end from this repo:
capture raw gameplay footage with Playwright, assemble it with ffmpeg into a
Steam-spec `.mp4`, and leave behind a re-runnable, re-editable pipeline
(not a one-off hand-cut video) so future trailer revisions are a data edit,
not a rebuild.

This supersedes the "Trailer Beat Sheet" in `docs/steam-store-assets-plan.md`
(2026-07-13), which opened on 5s of silent title card before any gameplay.
Steam's own trailer guidance says to reach gameplay/action as fast as
possible — the beat sheet below replaces that section.

## Trailer script (the "what")

Target: ~65-70 seconds, 1920x1080, cut to the tail of "Hunker Bunker Main
Theme.mp3" (its ending swell + the quiet stretch after it).

| Time | Beat | Visual | Audio |
|---|---|---|---|
| 0:00-0:04 | Cold open, mid-action | Hard cut straight into combat — no logo, no fade. Weapon fire, an enemy dying. | `weapon_fire_sidearm*` + `enemy_death_*`, no music yet |
| 0:04-0:16 | The loop, fast | Ken Burns pans/stills: pick operator -> bunker interior -> resource pickup -> locked door. Each cut goes *through* the reused door-transition clip. | Door SFX variant rotates each use; music fades in low |
| 0:16-0:30 | Pressure rises | O2 meter draining, snails closing in, generator online, reload under pressure | `amb_metal_stress*`, `hive_*`, reload SFX; music energy climbing |
| 0:30-0:42 | Decision montage | Bank vs. descend, archive log, fabrication, risky route — fast cuts, door-transition between each | `ui_click_confirm*`, `fx_levelup`; music mid-build |
| 0:42-0:52 | Escalation to boss | Multi-enemy swarm -> Queen presence teased | `hive_queen_throne.wav`; music climax synced to the Main Theme's actual ending swell |
| 0:52-0:58 | Cave reveal | Reuse `cave-reveal.webm`, one big cut on a music hit | Cut to silence as the theme drops into its lull |
| 0:58-0:70 | Title drop + CTA | Logo held over the lull, then wishlist/CTA card | Near-silent |

Editing principle: every hard visual cut lands on a transient in the
music/SFX mix (a hit, a drop, a swell), not an arbitrary clock tick. The
assembly step locates those transients programmatically (see below) rather
than hardcoding guessed timestamps.

## Capture architecture (Playwright -> raw clips)

- New `tests/e2e/trailer/` folder, separate from the smoke-test specs in
  `tests/e2e/` — these specs *are* the footage, not pass/fail assertions,
  and shouldn't run as part of the regular `test:e2e` gate.
- A dedicated Playwright project block (own config or a `test.use()`
  override) with `recordVideo: { dir: 'trailer/raw', size: { width: 1920,
  height: 1080 } }` — full 1080p capture, higher than the 1280x800 the rest
  of the e2e suite runs at.
- Reuse `bootToOperatorMenu` / `startRunAndSkipIntro` /
  `stubOfflineElectronAPI` from `tests/e2e/helpers.js`. No new boot logic.
- Reuse the god-mode / `spawnPatrolNearPlayer` / `startQueenFight` hooks
  already proven in `tests/e2e/captureScreenshots.spec.js` to force each
  encounter on demand instead of waiting for it to happen naturally.
- One spec/clip per beat: cold-open combat, exploration pan, O2/generator
  pressure, decision-montage UI, swarm, Queen tease — plus **one dedicated
  door-transition clip**, capturing the real door-open/reveal sequence once,
  cleanly, with nothing else competing in frame.
- Each clip spec writes a sidecar JSON next to its video:
  `{ file, label, inPoint, outPoint }` — so the assembly step knows exactly
  where the usable footage starts/ends inside Playwright's raw recording
  instead of guessing.

### Known constraint: no audio in captured video

Chromium's screencast API (what both `context.recordVideo` and CDP use)
never carries an audio track. This isn't a config gap to work around — it's
categorical. It's also not a problem here: every sound this trailer needs
already exists as a standalone asset (`public/audio/vg2/*.wav`,
`public/audio/ost/*.mp3`), so the mix is built in the assembly step from
those files, not extracted from the capture.

## Assembly architecture (ffmpeg -> final .mp4)

- **Edit Decision List** — a single `trailer-edl.json` holding shot order,
  per-shot duration, Ken Burns pan/zoom vector, and text-card copy. Creative
  timing lives in data; re-cutting the trailer means editing JSON, not code.
- **Door-transition reuse with variation** — the same door clip is reused
  4-5 times as a wipe between beats. Each reuse applies a different
  crop/zoom window via ffmpeg's `crop`/`zoompan` so it reads as a fresh
  reveal rather than a visibly repeated clip, and pulls a *different* door
  SFX variant each time (`door_slam_vertical1` -> `2` -> `3`,
  `door_slide_horiz` -> `2` -> `3` -> `4`) so the repetition doesn't land on
  the ear either.
- **Locating the music's climax/lull programmatically** — run
  `ffmpeg -af silencedetect=noise=-30dB:d=0.3` over the tail of "Hunker
  Bunker Main Theme.mp3" to find the quiet stretch after its ending swell.
  That silence point anchors the title-drop cut, instead of an eyeballed
  timestamp that breaks the moment the source track changes.
- **Mix** — the Main Theme's tail (trimmed via `atrim` to the
  climax+lull window) as the bed; discrete SFX one-shots layered in via
  `amix`/`adelay` at each cut point; output as stereo AAC (Steam transcodes
  to stereo regardless, so mix for stereo directly).
- **Ken Burns** — `zoompan` per still/near-still shot, reusing the same
  zoompan math already proven in `scripts/build-cinematic-still-videos.js`
  rather than re-deriving it.
- **Final encode** — `-c:v libx264 -pix_fmt yuv420p -r 30 -b:v 8M -c:a aac
  -ac 2`, 1920x1080, `.mp4` container — matches the Steam upload spec
  (H.264/AAC, 16:9, 1080p, 30fps, 5,000+ Kbps).
- New script: `scripts/build-trailer.js`, following the structure already
  established by `scripts/build-cinematic-still-videos.js` (same
  `FFMPEG_CANDIDATES` fallback pattern: `HB_FFMPEG` env var -> system
  `ffmpeg` -> Playwright-bundled ffmpeg as last resort, though the bundled
  one is a minimal `--disable-everything` build that can't decode mp3 or
  mux mp4/AAC, so a real system ffmpeg is required for this script even
  though the stills script can fall back further). Takes the raw clips +
  EDL, outputs `dist/trailer/hunker-bunker-trailer.mp4`.

## File plan

New:
- `tests/e2e/trailer/capture-cold-open.spec.js`
- `tests/e2e/trailer/capture-exploration.spec.js`
- `tests/e2e/trailer/capture-pressure.spec.js`
- `tests/e2e/trailer/capture-decision-montage.spec.js`
- `tests/e2e/trailer/capture-swarm-and-queen.spec.js`
- `tests/e2e/trailer/capture-door-transition.spec.js`
- `tests/e2e/trailer/trailer.playwright.config.js` (or a `trailer` project
  entry in the existing config) — 1080p `recordVideo`, own output dir.
- `scripts/trailer-edl.json` — shot order, durations, Ken Burns vectors,
  text-card copy, music timing anchors.
- `scripts/build-trailer.js` — ffmpeg assembly.

Changed:
- `docs/steam-store-assets-plan.md` — replace the "Trailer Beat Sheet"
  section with the action-first version above.
- `package.json` — add `trailer:capture` (runs the trailer Playwright
  project) and `trailer:build` (runs `build-trailer.js`) scripts.

## Testing / verification

- The capture specs are Playwright specs, but they're footage generators,
  not correctness assertions — treat "did the expected UI/encounter appear
  on screen for the expected duration" as their pass condition (reuse
  existing locator/visibility patterns from `captureScreenshots.spec.js`
  rather than inventing new ones).
- After assembly, verify the output file against the Steam spec mechanically
  (`ffmpeg -i` / `ffprobe` output): container, codec, resolution, fps,
  bitrate, stereo audio — a short check appended to `build-trailer.js`
  itself (print a summary, warn if any field misses spec) rather than a
  separate audit script, since this only ever runs after a build.
- No unit/vitest coverage needed — this is a content pipeline, not runtime
  game logic.

## Prerequisites / risks

- **ffmpeg**: this sandbox has no system ffmpeg installed
  (`apt-cache policy` shows `ffmpeg 7:6.1.1-3ubuntu5` available but not
  installed); the Playwright-bundled binary is a minimal build that can't
  decode mp3 or mux `.mp4`/AAC. A real ffmpeg install is required to run
  `build-trailer.js` to completion. (Install requested separately from this
  design doc since it needs an interactive password.)
- **Music timing is data, not a constant**: the EDL's climax/lull anchors
  are derived from the *current* Main Theme file via `silencedetect`, not
  hardcoded — if the OST file is ever re-exported/remastered, rerun the
  detection rather than trusting stale timestamps in the EDL.
- **Capture determinism**: `spawnPatrolNearPlayer`/`startQueenFight` calls
  make the encounter beats reproducible, but the exploration/pressure beats
  still rely on real gameplay motion (player movement, generator animation)
  — expect to record a few takes per beat and pick the cleanest, same as
  any live-action capture.
