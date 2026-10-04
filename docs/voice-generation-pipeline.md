# Voice generation pipeline (local, Qwen3-TTS + Voicebox)

Status: current tooling guide | Owner: audio + narrative | Updated: 2026-10-04 | Review: when a role is cast or a model changes

Generates the game's missing spoken lines and the developer commentary reads on this workstation, with no paid service. The casting is the existing [ElevenLabs casting bible](elevenlabs-voice-design-prompts-11-core-roles-2026-08-25.md). Its 11 identity descriptions drive Qwen3-TTS **VoiceDesign**, so the voices are designed for this game, not picked from stock presets.

## What exists

| Piece | Where | What it does |
| :--- | :--- | :--- |
| Cast | [`scripts/voice/build-voice-cast.mjs`](../scripts/voice/build-voice-cast.mjs) → [`voice-cast.json`](../scripts/voice/voice-cast.json) | The 11 roles from the casting bible, each with its identity description, a 25+ word reference read, direction, rejection criteria and post chain |
| Lines | [`scripts/voice/extract-voice-lines.mjs`](../scripts/voice/extract-voice-lines.mjs) → `voice-lines.json` | Every spoken narrative line in all 7 languages (2,086 lines, about 298 per language), keyed by i18n key and assigned to a role. Speech only: no labels, buttons or banners |
| Generator | [`scripts/voice/qwen_voice.py`](../scripts/voice/qwen_voice.py) | `design`: auditions per role from its description. `lines`: clones the chosen audition for every line; writes dry masters |
| Selection | [`scripts/voice/cast-selection.json`](../scripts/voice/cast-selection.json) | Which audition was approved for each role (versioned) |
| Encoder | [`scripts/voice/encode-voice-lines.mjs`](../scripts/voice/encode-voice-lines.mjs) | Applies each role's post chain (casting bible section 17), normalizes loudness, writes MP3s and the manifest |
| Runtime | [`src/voiceLines.js`](../src/voiceLines.js), `AudioManager.playVoiceLine` (`src/audio.js`) | Plays the exact recorded line when it exists in the current language; falls back to the keyword-matched clips otherwise. Commentary cards read their entry aloud |

Files: dry masters in `art/source/voice/` (gitignored, like the other art masters); game files in `public/audio/voice/lines/<locale>/<key>.mp3`, listed in `public/audio/voice/lines/manifest.json`.

Line counts per role (English): System 124 (three suit registers), Kaelen 22, Martha 21, Briggs 21, Bunker 20, Nahl 16, Vey 16, Rhun 16, Okonkwo-Vass 16, Mothership 14, developer 12.

## Workstation

Tools live outside the repo in `~/tools/voice`: `Qwen3-TTS/` and `voicebox/` (clones), `.venv-qwen/` (PyTorch 2.11 + CUDA 12.8, `qwen-tts`), `voicebox/backend/venv/`, and `models/` (Qwen3-TTS-12Hz-1.7B-VoiceDesign, -1.7B-Base, Tokenizer-12Hz; about 9 GB).

Hardware: Threadripper PRO 3975WX (32 cores), 109 GB RAM, RTX 2070 SUPER (8 GB). The 1.7B models fit the GPU in float16. The card is Turing: no bfloat16 and no FlashAttention 2, so the scripts use float16 with PyTorch SDPA.

**One-time fix (needs sudo):** the GPU driver did not load after the kernel moved to 7.0. NVIDIA 535 has no build for it. Install 580 and reboot:

```bash
sudo ubuntu-drivers install nvidia:580
sudo reboot
nvidia-smi    # should list the RTX 2070 SUPER
```

Until then everything runs on the CPU. Measured: 5.8 s of speech in 153 s, about 26 times slower than real time, which suits smoke tests only.

## Run it

```bash
PY=~/tools/voice/.venv-qwen/bin/python

# 0. Rebuild inputs after editing the casting bible or the locale files
node scripts/voice/build-voice-cast.mjs
node scripts/voice/extract-voice-lines.mjs

# 1. Audition: three takes per role, from the role's identity description
$PY scripts/voice/qwen_voice.py design --roles mothership briggs queen --takes 3

# 2. Listen (art/source/voice/auditions/<role>/take_<n>.wav), check against the
#    role's "Reject if" list in voice-cast.json, and record the choice in
#    scripts/voice/cast-selection.json:
#    "briggs": { "take": 2, "by": "<name>", "date": "2026-10-05", "notes": "..." }

# 3. Render the role's lines (dry masters), one language at a time
$PY scripts/voice/qwen_voice.py lines --roles briggs --locale en
$PY scripts/voice/qwen_voice.py lines --roles briggs --locale de --limit 5   # spot-check first

# 4. Post chain + MP3 + manifest; the game picks them up on the next load
node scripts/voice/encode-voice-lines.mjs

# Or everything, unattended and resumable: missing auditions, provisional
# Whisper-based picks (by: auto-qa, override by listening), every role's lines
# in every language (each line transcribed; re-rendered up to twice if it
# misses its script), encoding each language as it completes.
$PY scripts/voice/qwen_voice.py all
```

QA needs `faster-whisper` in the tools venv (`uv pip install faster-whisper`); each dry master gets a sidecar JSON with the transcript, character error rate, seed and attempts, and `qa: review` marks lines that never reached the threshold.

**Developer commentary** is read by the developer, not designed. Record a clean 30–60 s read, save it as `art/source/voice/auditions/developer/take_1.wav` with `take_1.json` containing `{ "text": "<what you read>" }`, set `"developer": { "take": 1, ... }` in the selection file, then run `lines --roles developer` for each language.

**Voicebox** (optional; its desktop app is not prebuilt for Linux): `cd ~/tools/voice/voicebox && backend/venv/bin/uvicorn backend.main:app --port 17493`, then open `http://127.0.0.1:17493/docs`. It adds Chatterbox Turbo's delivery tags (`[gasp]`, `[angry]`) for combat barks, an effects editor and multi-voice "stories". Import an approved audition as a profile to use it there.

## Rules carried over from the casting bible

- Never use a real person's voice without their permission, and never reference a celebrity or an existing character. The descriptions already follow this rule.
- Keep the dry master; post chains are applied when encoding, never to the only copy.
- Spoken text: UI prefixes removed, O₂ read as "oxygen", shouted all-caps lines brought to sentence case. Subtitles are unchanged.
- Re-check every role against its "Reject if" list in each language; translations change rhythm.

## Licences and disclosure

- **Qwen3-TTS:** Apache-2.0; commercial use allowed. **Voicebox:** MIT. Check the licence of any other engine (Chatterbox, TADA, LuxTTS) before shipping lines it generated.
- **Steam:** generated voice is AI-generated content. Declare it in the Steamworks content survey (pre-generated content) before a build with these lines ships.

## Open items

- GPU driver (above), then cast the first three roles (Mothership, Briggs, the Queen, one from each vocal group) and approve takes.
- Lines that are not in the narrative catalogs (hard-coded radio messages in `main.js`, the RGB minigame, wanderer greetings) are not extracted yet. They still use the keyword clips.
- German nouns lose their capitals when shouted lines are lowered. Pronunciation is unaffected; tidy it if a German reviewer flags it.
