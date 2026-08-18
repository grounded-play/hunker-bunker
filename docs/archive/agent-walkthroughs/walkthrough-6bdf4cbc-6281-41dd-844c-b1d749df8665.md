# Walkthrough: Season 0 Audio Synthesis & Production Manifest

**Conversation ID**: `6bdf4cbc-6281-41dd-844c-b1d749df8665`

## Overview
- **Image Generation Quota Status**: `gemini-3.1-flash-image` has a server-side cooldown until `02:07:32Z`. All 7 production-tailored image prompts (3 Base Guns, 3 Class Skins, 1 Charm) are documented and ready in [`docs/season-zero-protocol/06-asset-production-and-prompt-manifest.md`](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/season-zero-protocol/06-asset-production-and-prompt-manifest.md).
- **Procedurally Synthesized Audio Assets**: Built 9 lossless 44.1kHz WAV SFX and announcer callout assets into [`public/audio/generated/`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/audio/generated/) using [`scripts/generate-plan-sfx.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/scripts/generate-plan-sfx.js).
- **Automated Test Suite**: All 188 test files passing (1576 tests passed).

---

## Deployed Audio Assets (`public/audio/generated/*.wav`)

| Sound File | Category | Description |
| :--- | :--- | :--- |
| `sfx_charm_clink_light.wav` | Tactical Charm | High-pitched titanium keyring clink when moving/sprinting |
| `sfx_charm_clink_heavy.wav` | Tactical Charm | Deep brass casing resonance and receiver impact |
| `sfx_overclock_socket.wav` | Armory Bench | Hydraulic pneumatic latch and magnetic snap when slotting a Rig Overclock |
| `sfx_overclock_hum_cryo.wav` | Rig Overclock | Sub-zero cryogenic capacitor frequency pulse and frost hiss |
| `sfx_overclock_hum_magnetic.wav`| Rig Overclock | Heavy electromagnetic copper induction coil surge and arc |
| `sfx_smelt_forge_burst.wav` | Economy / Forge | High-temperature thermal forge blast for 5:1 trade-up smelting |
| `sfx_trade_shard_dispense.wav` | Economy / Token | Deep Core Shard crystalline dispensary chime sequence (C6–E6–G6–C7) |
| `voice_commander_breached.wav` | Voice Callout | Heavy squelch burst with gruff military commander tactical callout |
| `voice_aura_target_down.wav` | Voice Callout | Clean synthesized female AI multi-tone harmonic announcer chime |

---

## Recent Commits on `dev/sprint23`

1. `130fcfd` — `docs(audio): document 9 synthesized WAV audio assets in production manifest`
2. `6dca242` — `feat(audio): add synthesized tactical voice announcer callouts for Commander and AURA`
3. `13321cb` — `feat(audio): synthesize and deploy 7 Season 0 Armory & attachables SFX WAV assets`
4. `40a6c7a` — `docs(armory): synchronize Armory specifications, per-class loadouts, and master index`
5. `dc1a73b` — `feat(assets): optimize and deploy 13 runtime GLBs and document next 7 image prompts`
