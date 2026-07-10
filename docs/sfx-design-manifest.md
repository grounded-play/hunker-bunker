# Sound FX Design Manifest

Proposals for custom synthesized and recorded sound effects (SFXs) to accompany the Sprint 19 Wave 2 assets (camp props, cave/hive dressing, and class abilities).

---

## 1. Camp Prop Audio Events

| Prop Asset | Trigger Event | Audio Description | Synthesizer / Waveform Profile |
| :--- | :--- | :--- | :--- |
| `prop_camp_cookfire_lit.png` | Standing near camp (ambient loop) | Low warm crackle, quiet wind rumble | Low-pass noise layer (cutoff < 150Hz) + randomized high-pitched pop transients (triangle waves @ 1200Hz). |
| `prop_camp_cookfire_doused.png` | Discovery or camp culled | Steam hiss, cooling logs crack | Sudden white noise burst decaying over 1.2s, swept low-pass filter (3000Hz down to 200Hz). |
| `prop_camp_crates_chained.png` | Suspicion >= 50 (Lockdown) | Metallic chain rattle, padlock click | Hard high-frequency metal impact clicks (sine @ 3200Hz) followed by rapid chain links clatter (high-pass noise bursts). |
| `prop_camp_warning_placard.png` | Entering lockdown zone | Pulsing warning alarm klaxon | Dual-tone siren (440Hz / 620Hz square wave) pulsing at 2.5Hz with an uneasy pitch bend. |

---

## 2. Cave & Hive Dressing Audio Events

| Dressing Asset | Trigger Event | Audio Description | Synthesizer / Waveform Profile |
| :--- | :--- | :--- | :--- |
| `prop_cave_eggs_intact.png` | Standing near hive (ambient loop) | Wet organic heartbeat pulsing, low sac hum | Sub-bass sine wave (55Hz) modulated by a slow LFO (1.2Hz) + low-amplitude wet pop transient. |
| `prop_cave_eggs_hatched.png` | Egg hatching / rupture | Squelchy membrane pop and shell snap | High-frequency snap (noise burst) + low squish sweep (sine wave sweeping 220Hz down to 80Hz). |
| `prop_cave_spores.png` | Walking through spore stacks | Gas release puff, airborne spores hiss | Soft noise envelope with a slow attack (0.15s) and moderate decay (0.9s), band-pass filtered around 900Hz. |
| `prop_cave_webs.png` | Player brushing against webs | Sticky tearing thread sounds | Rapid micro-bursts of high-pass noise (decay < 0.02s) to simulate threads snapping under tension. |
| `prop_cave_queen_throne.png` | Staging area (ambient loop) | Deep biomorphic chitin rumble | Sub-bass triangular drone (38Hz) layered with slow, periodic crackles and heavy breathing envelopes. |
| `prop_cave_hive_wounded.png` | Hive damaged / leaking | Resonant wet dripping drops | High-pitched sine wave drops (sweeping 800Hz to 1600Hz in 0.05s) decaying instantly with low-amplitude echo. |

---

## 3. Class FX & UI Audio Events

| FX WebM Asset | Trigger Event | Audio Description | Synthesizer / Waveform Profile |
| :--- | :--- | :--- | :--- |
| `fx_scout_sprint.webm` | Scout activates Sprint | Fast electric wind whoosh | High-frequency white noise sweep (cutoff 1200Hz to 4000Hz) with 0.15s pitch envelope rise and 0.5s tail decay. |
| `fx_tank_shockwave.webm` | Tank activates Stomp | Heavy bass boom and concrete fracture | Deep crash impact (deep sine sweep 180Hz down to 25Hz) + high-frequency noise punch for the earth cracking. |
| `fx_engineer_turret_reprogram.webm` | Engineer reprogram trigger | High-voltage electric arcing | Fast series of short triangle beeps with high pitch fluctuation (800Hz to 3000Hz) mixed with pink noise. |
| `fx_shared_levelup.webm` | Exosuit level up event | Ascending synth chime flourish | Major chord arpeggio (sine + triangle waves: 261Hz, 329Hz, 392Hz, 523Hz) with long delay and chorus echoes. |
| `fx_shared_achievement.webm` | Achievement unlocked | Triumphant digital fanfare chime | High-pass square/sine synth lead playing a major 5th interval with a bright bell ring (sine at 2400Hz). |
