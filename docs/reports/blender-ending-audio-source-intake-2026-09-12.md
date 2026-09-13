# Blender ending audio source intake — 2026-09-12

Status: source intake evidence | Owner: cinematic audio | Updated: 2026-09-12 | Review: before audition approval or derivative promotion

## Result

The first CC0/public-domain candidate batch has been downloaded and retained in
the ignored source tree at `art/source/audio/cinematic-source/opengameart/`.
This is acquisition evidence, not creative approval and not permission to copy
the raw files into `public/`.

The batch occupies approximately 52 MiB and contains 148 audio files after
archive extraction: 135 OGG and 13 WAV. `ffprobe` successfully parsed the
downloaded audio. The compact selection avoids downloading the complete
roughly 500 MiB space-flight family before its first lossless sample has been
auditioned.

## Acquired sources

| Source | Creator | Declared license | Original acquired | Source page captured | Intended audition |
| --- | --- | --- | --- | :---: | --- |
| [Space Flight Sound Effects](https://opengameart.org/content/space-flight-sound-effects) | bretbernhoft | Page states public domain/free use without attribution | `spaceflight3.wav` | yes | engine/hull/wind bed |
| [60 CC0 Sci-Fi SFX](https://opengameart.org/content/60-cc0-sci-fi-sfx) | rubberduck | CC0 | `60-sci-fi-sfx_0.zip` (60 OGG files) | yes | scanners, terminals, signal events |
| [Sci-Fi Sounds](https://opengameart.org/content/sci-fi-sounds) | Kenney | CC0; optional credit | `sci-fi_sounds.zip` (70 audio files plus license/support metadata) | yes | engines, doors, force field, metal, slime |
| [Alarm](https://opengameart.org/content/alarm-1) | EZduzziteh | CC0 | `alarm_2.ogg` | yes | containment alarm |
| [Short Alarm](https://opengameart.org/content/short-alarm) | yd | CC0 | `alarm_0.ogg` | yes | diagnostic/quarantine alert |
| [Metal Impact Sounds](https://opengameart.org/content/metal-impact-sounds) | BMacZero | CC0; optional credit | seven named WAV files | yes | lock dogs, restraints, pod impacts |
| [Bubble Sound Effects](https://opengameart.org/content/bubble-sound-effects) | BMacZero | CC0; optional credit | three single and two loop WAV files | yes | heavily processed resin/egg detail |

Kenney's archive contains its own `License.txt`, which identifies the package
as Creative Commons Zero 1.0 and permits personal, educational, and commercial
use. Every other source directory contains the HTML source page captured at
retrieval time. License language was found in every captured page.

## Original-download SHA-256

| File | SHA-256 |
| --- | --- |
| `spaceflight3.wav` | `261ec24595a1c2fd71d897700cfd43496d48e4a9bf6ed8560c9e17a932cdc1a4` |
| `60-sci-fi-sfx_0.zip` | `11ebf7d8c4ece445128eeb95c969e0ed36ff34fc2c8ef0e04a154d62e2f938f8` |
| `sci-fi_sounds.zip` | `119340f351a5098ad814f78719438c0da355a9ce8a4c8a3af6a8d48aa3d49e04` |
| `alarm_2.ogg` | `ace7c78d3e071eadce6db3df560fb4722af41efbc0934b55439dcc28ab27bb20` |
| `alarm_0.ogg` | `dc76a67748c9cef0b91913fafbe47cf8ee4499c4f813dbe12e028d2806f1eab8` |
| `bing1.wav` | `d14941ce27e6b409e0cd941eaad7201d613070a4c3eb9c3627fec4cf3ae686e4` |
| `bong1.wav` | `a6558d186f2843aefa212d567963b0ad79a6f78614bcf650f519620fc1549a6d` |
| `clink1_0.wav` | `0d439cd2b1f36f501b94c39661e39f91d160affe25c79f77dff7a2cd0ed7eadd` |
| `clink2.wav` | `ecbf5a221f2aff32376b8584eea875d0b7d9963d22f6c16e237f5e7b63f51dc2` |
| `clink3.wav` | `dd07516e51e9092efc36d13668de7d29d096955a437894cedeb5064933e2650f` |
| `thud2.wav` | `5fb5c1b37a95cb6716d0bb529a0b9fe1ae9f3e2228b8f30c5c3dcbb1b570a3af` |
| `thud3.wav` | `3aa636679ffdc9602d27655ca59a7c7342ae137b68e54c61aad0fb3c414506ca` |
| `bubbles-single1.wav` | `014228835d2b255cf300f94c60db8ec661ec15b5b5c097d5f47b148d6a81fdc5` |
| `bubbles-single2.wav` | `c6c7b9f3e7415e1fee6d5ca0c9556fa03443c4cbeaa623f7a70476fc5b5a11e8` |
| `bubbles-single3.wav` | `496bc47723f77352a1f26db4bfacbf1c1ff8fa75cd0ef5a267423c382f7b073b` |
| `bubbles-loop1-amp.wav` | `94eaef4afc1146dcdfd3077cc7a6cbe6dc97daac62b8f6560dfc913dd57488a9` |
| `bubbles-loop2-amp.wav` | `b62a599e2b64223c3aa8a0644a0579ba0a95e5886ddb84ccd5e33e274fd47465` |

Captured-page hashes are retained locally and can detect later page changes;
the table above focuses on distributable source media and archives.

## High-value files exposed by archive inventory

The Kenney pack has descriptive filenames, making these the first audition
queue:

- `computerNoise_000-003.ogg` — MI/OE diagnostic beds;
- `doorClose_000-002.ogg` and `doorOpen_000-002.ogg` — OE partition layers;
- `engineCircular_000-004.ogg` — cabin machinery;
- `forceField_000-004.ogg` — partition and signal design;
- `impactMetal_000-004.ogg` — lock and pod sync points;
- `slime_000-001.ogg` — BIO layers after radical processing;
- `spaceEngineLarge_000-004.ogg`, `spaceEngineLow_000-004.ogg`, and
  `spaceEngineSmall_000-004.ogg` — layered shuttle engine;
- `thrusterFire_000-004.ogg` — exterior ignition.

The rubberduck pack contains 60 generically numbered files. It requires a
labeled audition catalog before any cue assignment; filename numbering is not
meaningful provenance or sound description.

## Safety and exclusions

- NASA audio was not downloaded in this intake. Its official material may be
  usable under NASA media guidelines, but identifiable voices, identifiers,
  endorsement implications, and protected marks require a separate review.
- The OpenGameArt “Sci-Fi Sound Effects Library” was not downloaded because its
  declared license is CC-BY 3.0 rather than CC0.
- Preview transcodes were not downloaded where full-resolution attachments
  were available.
- No acquired file has been normalized, transcoded, trimmed, renamed, mixed,
  or promoted to runtime use.

## Next gate

Complete `AUD-02/AUD-03` by generating an audition catalog with duration,
sample rate, channels, peak, integrated/short-term loudness where meaningful,
and a human keep/reject/possible decision. Then create the ten-second palette
test from approved derivatives, not from the untouched originals.

## First promotion — 2026-09-13

Six Kenney CC0 derivatives were promoted for a shared film/game vertical slice. Runtime hashes:

| File | SHA-256 |
| --- | --- |
| `engines/ship_engine_low_01.ogg` | `1814b46e52d5b2643d1b56fb2e00ee0eb27da9a50bac2f53bb161c591577aead` |
| `hive/resin_shift_01.ogg` | `4a996463c77a7f2f469ad977a6cbce4b1e9963fac19356e67465bdcdfeb50d99` |
| `hive/resin_shift_02.ogg` | `0b538d84c0d0465caca9b75916cac464a63fa70143e676be6d9f152162c311b1` |
| `mechanisms/door_lock_body_01.ogg` | `08a76cb162d2560395a40a9d30a134a782ebc2f3712812fe5e6cd2b68328aeb5` |
| `mechanisms/door_lock_body_02.ogg` | `a4a9ba1def6d16eb774ec6d7a273fa95796a1f8fb50f491682e3b3e04d13e3f1` |
| `mechanisms/metal_lock_impact_01.ogg` | `51cd586016e8d165d3915bba49661ea705f9053b32665e9573ee0f25628f8fe0` |

The ending cue manifest uses the same derivatives as gameplay. Door and hive soundsets retain their
previous shipped cues as data-only fallbacks, so rollback does not require code removal.

---

## Second intake — 2026-09-13, Kenney (CC0)

Acquired to close gaps the first intake could not fill, notably footsteps.

| Pack | Files | Licence | Retained at |
|---|---:|---|---|
| Kenney Impact Sounds 1.0 | 108 | **CC0** (`License.txt` retained) | `art/source/audio/cinematic-source/kenney/kenney_impact-sounds/` |
| Kenney RPG Audio | 74 | **CC0** (`License.txt` retained) | `art/source/audio/cinematic-source/kenney/kenney_rpg-audio/` |

182 `.ogg` total. CC0 confirmed by reading each pack's own `License.txt`, not by
assuming the source: no attribution required, no share-alike, commercial use
permitted.

### Promoted to `public/`

Only selected files ship; the raw packs stay in the ignored source tree.

- `public/audio/footsteps/` — 5 concrete + 5 snow variants
- `public/audio/impacts/` — 4 metal + 2 glass + 2 mining

### Why footsteps specifically

`playerSpriteLayouts.js` has carried `footstepFrames` since the atlas work, so
the game already knew exactly which animation frames are footfalls
(`threeGame.js:20608`). It had no sound to play on them and fell back to a
synthesised blip. The data was waiting for the asset.

Five variants with `noImmediateRepeat`: a repeated footstep is the most
noticeable audio artefact a game can have, because the ear tracks a walk cycle
whether the player wants it to or not.

### Used in both places

- **In game** — registered in `GAME_SOUNDSETS` and selected by surface: snow
  outdoors and in cryo, concrete within the bunker. The procedural blip remains
  the fallback for before the buffers decode.
- **In cutscenes** — the `footsteps` cue in `ending-audio-assets.mjs` was `null`
  because the first intake had no convincing footstep and silence beats a wrong
  sound. That gap is now closed rather than papered over.
