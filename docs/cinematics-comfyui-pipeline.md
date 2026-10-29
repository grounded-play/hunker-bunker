# Cinematics pipeline (local ComfyUI)

Status: current tooling guide | Owner: cinematics + audio | Updated: 2026-10-27 | Review: when a model or the clip list changes

Makes the game's motion clips as **the grindhouse cut** (explicit sex between consenting adults plus schlock gore against the monsters, in Giger's biomechanical eroticism; [art bible §9–10](design/art-style-bible.md#9-mature-content-direction)), with layered sound under their music, on this workstation with locally installed models, no paid service. The clip list comes from the [cinematics audit §10](planning/camp-interaction-and-cinematics-audit-2026-10-16.md#10-movie-prompts-first-frame-last-frame-action); every first frame, last frame and action comes from `scripts/cinematics/cut-prompts.json`. The result lands exactly where the runtime already looks.

## What it makes

`node scripts/cinematics/build-clip-jobs.mjs` writes `scripts/cinematics/clip-jobs.json`: 31 jobs today.

| Kind | Jobs | First frame | Target |
| :--- | :--- | :--- | :--- |
| Side stories | 15 (Kaelen, Martha, Briggs, Nahl, Aria ×3 each) | redrawn on Z-Image from the cut's brief (the key art, `SIDE_STORY_INTERSTITIALS[id].image`, is the scene it rewrites) | `/interstitials/motion/int_<id>_motion_v1.webm` |
| Song cards 33–38 | 6 (Act 3 and endings) | redrawn on Z-Image from the cut's brief | `/interstitials/motion/int_NN_<slug>_motion_v1.webm` + `/interstitials/int_NN_<slug>_key_v1.mp4` |
| Sleep | 10: camp, cryo and hive once per player class (Scout, Tank, Engineer), plus the squad with all three | FLUX.2 klein from the cut's brief, with the class's front-idle model render as the reference image | `/cutscenes/sleep-<style>-<class>.webm` (squad: `sleep-squad`) + `.mp4` + `-poster.jpg` |

Vey and Rhun have no card brief yet (audit §11.1), so they are not jobs.

## Workstation

- ComfyUI 0.42 at `~/Desktop/icecave/xpsr/ComfyUI`, serving `http://127.0.0.1:8188` (override with `HB_COMFY_URL` / `HB_COMFY_ROOT`). No custom nodes needed.
- Models already in its `models/` folder:
  - **LTX-Video 2B 0.9.8 distilled fp8** (`checkpoints/`) + `t5xxl_fp8_e4m3fn_scaled` — default image-to-video; fits the 8 GB RTX 2070 SUPER.
  - **Wan 2.2 TI2V 5B fp16** (`diffusion_models/`) + `umt5_xxl_fp8_e4m3fn_scaled` + `wan2.2_vae` — `--model wan`; better motion, offloads on 8 GB, much slower.
  - **FLUX.2 klein 4B** + `qwen_3_4b` + `flux2-vae` — first-frame stills guided by reference images (`ReferenceLatent`).
  - **Z-Image Turbo** (`z_image_turbo_int8_convrot` + `z_image_ae`, Apache-2.0, official Comfy-Org release) — fast text-only alternate stills (`still --model zimage`); do not use it for player shots because it cannot consume the class identity reference.
- ffmpeg/ffprobe on PATH. The script uses only the Python standard library.
- The GPU is shared with the voice pipeline: run one at a time. If ComfyUI is holding memory from other work, `POST /free {"unload_models":true,"free_memory":true}` releases it when its queue is empty.

## Run it

```bash
node scripts/cinematics/build-clip-jobs.mjs          # after editing the audit's §10 prompts
python3 scripts/cinematics/comfy_clips.py status      # what each job has

# Generated-frame jobs: approve both endpoints before motion
python3 scripts/cinematics/comfy_clips.py still sleep-cryo-tank --takes 3
cp art/source/cinematics/sleep-cryo-tank/still_2.png art/source/cinematics/sleep-cryo-tank/first_frame.png
python3 scripts/cinematics/comfy_clips.py last sleep-cryo-tank --takes 3
cp art/source/cinematics/sleep-cryo-tank/last_1.png art/source/cinematics/sleep-cryo-tank/last_frame.png

# Everything not live yet, unattended: sound beds first (one AudioGen load), then
# Wan takes back to back (~24 min each), each encoded into public/ and shipped
python3 scripts/cinematics/comfy_clips.py batch
python3 scripts/cinematics/comfy_clips.py batch card_34 --redo   # a new take for one clip

# One full clip to review: a video take, a sound bed, the finished preview encode
python3 scripts/cinematics/comfy_clips.py make card_33

# Or step by step. Takes (each run adds take_<model>_<n>.mp4 + .json + .sheet.jpg)
python3 scripts/cinematics/comfy_clips.py clip card_33
python3 scripts/cinematics/comfy_clips.py clip card_33 --model wan
python3 scripts/cinematics/comfy_clips.py clip all          # every job with a first frame

# Sound design takes (art/source/cinematics/<job>/sound/take_<n>/)
python3 scripts/cinematics/comfy_clips.py sound card_33

# Watch the finished encode (scaled, trimmed, music muxed) beside the take
python3 scripts/cinematics/comfy_clips.py encode card_33 take_ltxv_1 --preview
# Then encode the take you approve into public/
python3 scripts/cinematics/comfy_clips.py encode card_33 take_ltxv_1
```

Takes, stills and their sidecars (prompt, seed, steps, render time) are masters in `art/source/cinematics/<job>/` and are git-ignored. The contact sheet (`.sheet.jpg`, six frames) is the fast review; watch the take before encoding.

## Sound

Every clip gets layered sound design under its music, made locally with AudioGen (`facebook/audiogen-medium`, cached in the AudioCraft venv at `~/tools/audiocraft`, the same setup as the footstep banks).

- `scripts/cinematics/sound-layers.json` holds 3–4 layers per clip: an ambience bed, the action's foley, and an accent or two, each an AudioGen prompt with a start time, fades and a gain (dB relative to -10). Name concrete sounds; AudioGen renders what is named, not story.
- `comfy_clips.py sound <job>` frees ComfyUI's VRAM (AudioGen shares the 8 GB card), then renders all layers in one batch, masters each (soxr to 48 kHz, high-pass, exciter to restore air above AudioGen's 8 kHz ceiling, Haas widening to stereo, -20 LUFS) and mixes the bed into `art/source/cinematics/<job>/sound/take_<n>/bed.wav`.
- `encode` lays the newest bed under the job's music: both are loudness-matched, then set by `musicGainDb` / `bedGainDb` (the song leads on cards and side stories, the bed 5 dB under it; on sleep clips the bed leads and the ambient track sits 6 dB under), faded and limited. `--sound take_2` picks a take; `--no-sound` gives music only.

## First frame → action → last frame

The job builder injects three versioned prompt locks from the art bible: house
style, character identity and shot continuity. Scene files contain only what is
unique to that shot, avoiding dozens of subtly different copies of the style block.

1. `still` makes first-frame candidates: Z-Image Turbo with the Giger and nudity
   LoRAs for key-art cuts (the brief rewrites the scene), FLUX.2 klein with the class
   PNG as a reference latent and the klein anatomy LoRA for sleep films.
2. Approve `first_frame.png`; it fixes cast, composition, geography, palette and
   key-light direction.
3. `last` makes endpoint candidates on FLUX.2 klein from the approved first frame
   (plus the class PNGs on sleep films; never the old key art, which pulls the old
   cast back in). Approve one as `last_frame.png`.
4. `clip` runs the action from frame one on Wan 2.2 with the explicit motion LoRA;
   the prompt opens with the cut's trigger word, then the ordered action, last-frame
   description, identity lock, continuity lock and a twelve-frame hold.
5. `encode` blends the last half-second into `last_frame.png` when it exists.
   `--no-end-lock` exports raw model motion for comparison.

`batch` runs all of it unattended: the newest first and last stills become the
approved frames when none has been picked, so review the shipped cuts and re-pick
(`still`/`last`, copy, `encode`) where a frame misses the brief.

The installed 8 GB-friendly LTX and Wan 2.2 TI2V checkpoints accept a start image,
not a last image, so the endpoint is a blend, not native first/last-frame
generation. If a compatible FLF checkpoint is installed later, add it under a
separate model name and keep the blend as a fallback.

Every cut's brief lives in `scripts/cinematics/cut-prompts.json`: the style lock
(prefix, suffix, identity and continuity locks, negative), the model add-ons per
model (`loras`), the class looks, the sleep shots (each `{operator}` replaced by the
class look) and one scene per key-art cut. Change the words there, rebuild the jobs,
and render new endpoints and motion. Do not edit generated `clip-jobs.json` by hand.

## Model and content policy

Hunker Bunker is Adults Only on Steam. The brief is explicit, with the art bible's
hard edges: every person is a consenting adult over twenty-five (the negative prompt
carries the age floor), no sexual act involves anyone asleep, unconscious or
coerced, gore is aimed at the monsters and never sexual, and the operator's helmet
stays sealed. Every still and take sidecar records its model, LoRAs, seed, composed
prompt and references. Review each shipped cut against those edges; the in-game
Content Guide lists the explicit cutscenes as soon as one ships, and the Steamworks
content survey must match before release.

## Make a clip live

`encode` (without `--preview`) writes the files into `public/` and adds the job id to `src/cinematics/shippedMotionClips.js`. That list is the switch the registries read:

- **Song cards 33–38:** `src/songInterstitials.js` gives a card motion when `card_<id>` is listed (cards 1–32 always have it).
- **Side stories:** a listed entry becomes `status: 'final'` with `motion` / `motionWebm` at `/interstitials/motion/int_<id>_motion_v1.webm`.
- **Sleep:** a listed `sleep-<style>-<class>` (or `sleep-squad`) joins `SHIPPED_SLEEP_CUTSCENES` in `src/sleepCutscene.js`; a rest plays the player's class cut (`playerClass` on `day-rest-open`) and falls back to the shared `sleep-<style>` film, then the night card.

To pull a clip, delete its line from the list (the files can stay). `scripts/cinematics/build-clip-jobs.test.js` fails if a listed clip's files are missing or a registry doesn't play it. Watch shipped clips in game before release: characters on model, no text, no explicit content, the first frame matching the key art the player just saw.

Run the retail-asset audit (`npm run audit:retail-assets`) after encoding: new WebM/MP4 files are unpacked from app.asar, but the reports must be regenerated.
