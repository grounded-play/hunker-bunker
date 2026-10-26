# Cinematics pipeline (local ComfyUI)

Status: current tooling guide | Owner: cinematics + audio | Updated: 2026-10-26 | Review: when a model or the clip list changes

Makes the game's missing motion clips on this workstation with locally installed models, no paid service. The clip list and prompts come from the [cinematics audit §10](planning/camp-interaction-and-cinematics-audit-2026-10-16.md#10-movie-prompts-first-frame-last-frame-action); the result lands exactly where the runtime already looks.

## What it makes

`node scripts/cinematics/build-clip-jobs.mjs` writes `scripts/cinematics/clip-jobs.json`: 25 jobs today.

| Kind | Jobs | First frame | Target |
| :--- | :--- | :--- | :--- |
| Side stories | 15 (Kaelen, Martha, Briggs, Nahl, Aria ×3 each) | the scene's key art (`SIDE_STORY_INTERSTITIALS[id].image`) | `/interstitials/motion/int_<id>_motion_v1.webm` |
| Song cards 33–38 | 6 (Act 3 and endings) | the card's key art | `/interstitials/motion/int_NN_<slug>_motion_v1.webm` + `/interstitials/int_NN_<slug>_key_v1.mp4` |
| Sleep | 4 (camp, cryo, hive, squad) | generated (FLUX.2 klein) from the audit's first-frame prompt | `/cutscenes/sleep-<style>.webm` + `.mp4` + `-poster.jpg` |

Vey and Rhun have no card brief yet (audit §11.1), so they are not jobs.

## Workstation

- ComfyUI 0.42 at `~/Desktop/icecave/xpsr/ComfyUI`, serving `http://127.0.0.1:8188` (override with `HB_COMFY_URL` / `HB_COMFY_ROOT`). No custom nodes needed.
- Models already in its `models/` folder:
  - **LTX-Video 2B 0.9.8 distilled fp8** (`checkpoints/`) + `t5xxl_fp8_e4m3fn_scaled` — default image-to-video; fits the 8 GB RTX 2070 SUPER.
  - **Wan 2.2 TI2V 5B fp16** (`diffusion_models/`) + `umt5_xxl_fp8_e4m3fn_scaled` + `wan2.2_vae` — `--model wan`; better motion, offloads on 8 GB, much slower.
  - **FLUX.2 klein 4B** + `qwen_3_4b` + `flux2-vae` — first-frame stills.
- ffmpeg/ffprobe on PATH. The script uses only the Python standard library.
- The GPU is shared with the voice pipeline: run one at a time. If ComfyUI is holding memory from other work, `POST /free {"unload_models":true,"free_memory":true}` releases it when its queue is empty.

## Run it

```bash
node scripts/cinematics/build-clip-jobs.mjs          # after editing the audit's §10 prompts
python3 scripts/cinematics/comfy_clips.py status      # what each job has

# Sleep jobs only: make first-frame candidates, then choose one
python3 scripts/cinematics/comfy_clips.py still sleep-cryo --takes 3
cp art/source/cinematics/sleep-cryo/still_2.png art/source/cinematics/sleep-cryo/first_frame.png

# Takes (each run adds take_<model>_<n>.mp4 + .json + .sheet.jpg)
python3 scripts/cinematics/comfy_clips.py clip card_33
python3 scripts/cinematics/comfy_clips.py clip card_33 --model wan
python3 scripts/cinematics/comfy_clips.py clip all          # every job with a first frame

# Watch the finished encode (scaled, trimmed, music muxed) beside the take
python3 scripts/cinematics/comfy_clips.py encode card_33 take_ltxv_1 --preview
# Then encode the take you approve into public/
python3 scripts/cinematics/comfy_clips.py encode card_33 take_ltxv_1
```

Takes, stills and their sidecars (prompt, seed, steps, render time) are masters in `art/source/cinematics/<job>/` and are git-ignored. The contact sheet (`.sheet.jpg`, six frames) is the fast review; watch the take before encoding.

## Prompts

Each take's prompt is the audit's action prompt, then "The shot ends on" its last-frame prompt, then a shared motion suffix. Frame prompts use the audit's shared look, with the artist reference replaced by a description (no named artists, per the casting and art rules); the negative prompt rejects flicker, morphing faces, text and watermarks. Change the words in the audit, rebuild the jobs, and render a new take.

## Make a clip live

`encode` writes the files; the game plays them only once the registry says so. Review the take first (characters on model, no text, no explicit content, the first frame matching the key art the player just saw).

- **Song cards 33–38:** `src/songInterstitials.js` gives motion to `number <= 32`; list the approved card ids instead.
- **Side stories:** set the entry's `status: 'final'` and add `motion` / `motionWebm` pointing at the encoded WebM.
- **Sleep:** add `sleep-<style>` to `SHIPPED_SLEEP_CUTSCENES` in `src/sleepCutscene.js`.

Run the retail-asset audit (`npm run audit:retail-assets`) after encoding: new WebM/MP4 files are unpacked from app.asar, but the reports must be regenerated.
