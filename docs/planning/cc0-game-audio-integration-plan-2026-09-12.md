# CC0 Game Audio Integration Plan

Status: proposed implementation plan | Owner: audio + gameplay systems | Updated: 2026-09-12 | Review: after audition palette approval and before each runtime promotion

## Decision

Use the gathered CC0/public-domain audio as raw sound-design material for the
game itself, not only the five ending films. Integrate a small set of edited,
loudness-matched derivatives into existing gameplay systems while retaining
the current sounds as fallbacks until replacements pass blind comparison and
packaged-build review.

Do not ship the acquired source packs wholesale. The first intake contains 148
audio files and approximately 52 MiB of ignored source material. The runtime
should receive only named, purposeful derivatives that add a missing sound,
provide meaningful variation, or materially improve an existing cue.

The acquisition and rights evidence is recorded in
[`../reports/blender-ending-audio-source-intake-2026-09-12.md`](../reports/blender-ending-audio-source-intake-2026-09-12.md).

## Source baseline

- `src/audio.js` owns decoding, buses, playback, pitch variance, looping, and
  simple stereo panning.
- `main.js` currently declares a large gameplay audio manifest inline and
  eagerly decodes it during game initialization.
- Numbered keys such as `door_gears_spin1` and `door_gears_spin2` automatically
  form a randomized variation family when code requests `door_gears_spin`.
- Available buses are `sfx`, `world`, `music`, `voice`, and `foley`; `foley`
  has a gain node but is not accepted by the explicit-bus validation branch in
  `AudioManager.play()`, so an explicit `bus: 'foley'` currently falls back to
  the inferred bus. Correct this before relying on new foley routing.
- Stereo pan exists, but there is no central world-position attenuation API,
  per-sound concurrency limit, cooldown registry, no-immediate-repeat selector,
  or per-family loudness metadata.
- The game already ships door, ambient metal, hive, combat, camp, weapon, UI,
  mothership, exosuit, bunker, and Queen sounds. New derivatives must be judged
  against those assets rather than assumed superior because they are new.
- Source masters under `art/source/` are ignored by Git. Only approved runtime
  derivatives and tracked provenance/evidence should ship.

Before implementation, record:

```bash
npm test -- src/audio.test.js
npm run audit:build-media
ffprobe -v error -show_streams public/audio/vg2/door_slide_horiz.wav
```

## License and provenance contract

The acquired OpenGameArt sources are declared CC0 or explicitly public domain
on their captured source pages. CC0 permits copying, adapting, and commercial
use without required attribution. This makes destructive layering, pitch/time
processing, convolution, resampling, and incorporation into original composite
effects viable.

That permission does not remove the repository's provenance obligations:

- preserve the exact original download, captured source page, original
  filename, creator/uploader, retrieval date, and SHA-256;
- keep the embedded `License.txt` from the Kenney archive;
- assign every derivative a stable source-chain manifest;
- record optional credit even when it is not legally required;
- do not claim project authorship of the source recording;
- do not promote previews when full-resolution attachments exist;
- reject files containing third-party music, recognizable speech, protected
  identity, or material inconsistent with the declared source;
- update `docs/ASSET_PROVENANCE.md` when a derivative enters `public/`;
- keep NASA material excluded until a separate media-guideline review is
  completed.

An approved derivative should use provenance state `third-party-license` with
commercial-use basis `CC0 1.0` or `public-domain source`, even when attribution
is optional. `verified` describes completed evidence, not ownership.

## Product goals

1. Give repeated world actions enough variation that mechanisms and creatures
   stop sounding like one retriggered sample.
2. Differentiate metal machinery from living machinery using a coherent
   neo-Gothic cyber-biohorror palette.
3. Improve world position, distance, obstruction, and priority behavior.
4. Preserve voice intelligibility and player-critical feedback during dense
   encounters.
5. Keep cold-start decoding, resident memory, simultaneous voices, and package
   size bounded.
6. Make every runtime cue traceable and replaceable through data rather than
   scattered hard-coded paths.

## Non-goals

- Do not replace the soundtrack, character voices, or generated camp cues in
  this pass.
- Do not use audio to make an unimplemented gameplay state appear functional.
- Do not add realistic gunshots solely because a pack contains explosions or
  lasers; class weapon identity needs a dedicated design pass.
- Do not treat pitch randomization as sufficient variation for distinctive
  hero events.
- Do not add full binaural/HRTF middleware in the first implementation.
- Do not delete current runtime assets until the new palette survives a release
  candidate and rollback window.

## Runtime sound palette

### Palette rules

| Family | Mechanical layer | Material/body layer | Signature violation |
| --- | --- | --- | --- |
| Human bunker | relay, motor, latch | painted iron, cable, concrete reflection | failing current or oxidized resonance |
| Mothership | servo, scanner, filtered engine | sterile panel, glass, controlled air | hidden subcutaneous pulse |
| Hive | tendon tension, membrane valve | wet resin, shell, internal air | machine-timed biological rhythm |
| Cryo | compressor, brittle actuator | ice crack, frost grit, pressure vapor | high glass-like stress tone |
| Corruption | familiar source retained | time-stretched or reversed body | narrow unstable sideband, never generic glitch spam |

Every composite effect should remain recognizable at low volume and on Steam
Deck speakers. Sub-bass supports an event; it cannot be the only evidence the
event occurred.

## Candidate-to-gameplay map

### Tier 0 — technical preparation

No audio is promoted before these foundations exist.

Implementation update, 2026-09-12: explicit `foley` routing is corrected in
`src/audio.js`, with regression coverage in `src/audio.test.js`. A pure,
initially empty `GAME_SOUNDSETS` registry plus validation and deterministic
variant/fallback/no-repeat selection now exists in
`src/data/gameSoundsets.js`, covered by `src/data/gameSoundsets.test.js`. It is
deliberately not wired to downloaded media until audition and provenance gates
pass. Cooldowns, concurrency, runtime history, contextual loading, and spatial
placement remain planned work.

| Work | Current seam | Required change |
| --- | --- | --- |
| Accept the foley bus | `AudioManager.play()` explicit-bus allowlist | Include `foley` in validation and test routing to `foleyGain` |
| Centralize manifests | inline `main.js` manifest | Move audio declarations into `src/data/audioAssetManifest.js` or equivalent pure module |
| Define soundsets | numbered-key implicit lookup | Add metadata for variants, bus, gain, pitch range, cooldown, concurrency, priority, preload group, and fallback key |
| Avoid immediate repetition | current uniform random choice | Track the last one or two variants per family and select another when available |
| Bound density | no family concurrency control | Enforce `maxVoices` and retrigger policy: reject, replace oldest, or replace quietest |
| World placement | caller-supplied stereo pan only | Add a tested screen-space pan and distance-gain helper using camera/player position |
| Load by context | gameplay manifest eagerly decoded | Keep critical UI/combat cues eager; load biome/camp/boss/mechanism banks on entry or first safe anticipation point |

### Tier 1 — high-value replacements and expansions

These use descriptive Kenney filenames or individually acquired WAVs and can be
auditioned without first decoding the anonymous rubberduck catalog.

| Runtime family | Candidate sources | Derivative target | Trigger locations | Treatment | Keep current asset as |
| --- | --- | --- | --- | --- | --- |
| Door open/close | Kenney `doorOpen_000-002`, `doorClose_000-002`; CC0 metal clinks/thuds | `mechanism_door_open1-3.wav`, `mechanism_door_close1-3.wav` | automatic doors, authored doors, camp barriers | layer motor + latch/body; class by door mass; 3 variants | fallback and A/B reference |
| Heavy lock dogs | CC0 `bong1`, `thud2`, `thud3`, Kenney metal impacts | `mechanism_lock_heavy1-3.wav` | lockdown chains, objective doors, quarantine-style barriers | shorten attacks, add iron resonance, mono-compatible | `camp_lockdown_chains` |
| Console/terminal life | Kenney `computerNoise_000-003` | `amb_terminal_near1-3.wav` and `ui_terminal_commit1-2.wav` | active consoles, fabricator, camp workstations | remove constant hiss, make short loop-safe beds; subtle variation | existing UI clicks |
| Force field/energy barrier | Kenney `forceField_000-004` | `amb_barrier_loop1-2.wav`, `barrier_engage1-3.wav` | camp perimeter, partition fields, shields | isolate stable mid-band; add project oscillator accent | current procedural hum |
| Shuttle/large machinery | `spaceflight3.wav`; Kenney engine families | `amb_ship_engine_low_loop.wav`, `ship_ignition1-2.wav` | ship sanctuary, Act 2 vessel, generator/foundry moments | derive loop, mono low end, audible upper harmonics | mothership room/launch foley |
| Thrusters | Kenney `thrusterFire_000-004` | `ship_thruster_burst1-4.wav` | launch, landing, ship damage reaction | transient trim, distance variants, no vacuum realism claim inside cabin | current orbital launch cue |
| Metal debris/contact | CC0 clinks plus Kenney impacts | `prop_metal_small1-5.wav`, `prop_metal_heavy1-3.wav` | destructible walls, dropped scrap, casing/debris sweeteners | normalize by perceived size; short tails; concurrency cap | existing metal stress |
| Hive resin movement | Kenney `slime_000-001`, CC0 bubble sources | `hive_resin_shift1-4.wav`, `hive_sac_pulse1-3.wav` | resin sacs, biomech doors, nests, corrupted props | pitch down/formant shift, granular edits, dry tendon layer; never raw bubbles | current hive web/spore cues |
| Egg/incubator | bubble loops, slime, existing egg hum/hatch | `hive_egg_idle_loop.wav`, `hive_egg_warning1-3.wav` | egg proximity, containment, hatching telegraph | subtle internal fluid detail under existing tonal hum | existing egg cues |
| Alarm tiers | acquired two CC0 alarms | `alarm_caution_loop.wav`, `alarm_critical_loop.wav` | O2, lockdown, generator danger, boss-room state | rebuild rhythm and timbre; avoid using one alarm everywhere | `camp_lockdown_alarm` |

### Tier 2 — biome and systemic ambience

| Feature | New behavior | Source/design direction |
| --- | --- | --- |
| Active machinery emitters | Nearby terminals, barriers, generators, vents, and foundry props emit low-cost contextual loops | Kenney engine/computer/field material, looped and distance-bounded |
| Room threshold transitions | Door crossing changes early reflections and high-frequency content instead of switching ambience abruptly | derive short threshold tails from door/metal sources; automate environment filter |
| Cryo stress events | Rare ice/metal tension punctuation responds to temperature and structural danger | layer existing metal stress with edited space-flight groans; strict cooldown |
| Hive breathing network | Resin props share a slow phase but use local staggered pulses | derived slime/bubble sources under existing hive ambience; no simultaneous global retrigger |
| Camp machinery identity | Meridian ticks/data, Tallow fluid/steam, Vesper iron/servo | reuse derivative families with camp-specific EQ, cadence, and emission points |
| Destruction size classes | Small prop, medium barricade, heavy wall, organic rupture resolve to different families | metal impacts for hard classes; resin shifts for organic classes; combine only for hybrid props |

### Tier 3 — combat and bosses

Proceed only after Tier 1 proves concurrency and priority behavior.

| Feature | Candidate use | Guardrail |
| --- | --- | --- |
| Armor hit sweeteners | short CC0 metal contacts under current enemy/player hit | Preserve attack identity and hit-confirm timing; cap rapid-fire density |
| Heavy boss steps | low engine/metal body layers | Trigger only on authored contact frames; never every animation frame |
| Boss telegraph fields | force-field tonal layers | Telegraph must remain audible under combat and distinct from UI errors |
| Corrupted boss biology | resin/egg derivative family | Each boss receives a signature contour, not the same wet sound pitched differently |
| Wall destruction | metal thud/impact variants | Synchronize fracture, major break, debris tail; obey distance and occlusion |

Weapons remain outside this batch unless an audition reveals a uniquely useful
non-gunshot layer. A future weapon pass should preserve Scout/Tank/Engineer
attack identity and run separate loudness, repetition, and fatigue testing.

## Proposed soundset contract

Use a pure data registry so call sites request semantic events rather than
filenames:

```js
export const GAME_SOUNDSETS = Object.freeze({
  mechanism_door_close: Object.freeze({
    variants: ['mechanism_door_close1', 'mechanism_door_close2', 'mechanism_door_close3'],
    bus: 'world',
    gain: 0.55,
    pitch: [0.96, 1.03],
    cooldownMs: 90,
    maxVoices: 3,
    retrigger: 'replace-quietest',
    noImmediateRepeat: true,
    preloadGroup: 'mechanisms',
    fallback: 'door_slide_horiz'
  })
});
```

`AudioManager.playSoundset(id, options)` resolves the metadata, selects a
variant, applies caller overrides within safe bounds, routes it, and emits
telemetry containing the semantic ID and chosen asset. Existing `play(key)`
remains available for backward compatibility during migration.

### Priority classes

| Priority | Examples | Behavior under voice pressure |
| --- | --- | --- |
| Critical | damage warning, O2 failure, boss telegraph, irreversible interaction | remains audible; may duck ambience/music |
| Gameplay | weapon action, confirmed hit, door state, pickup | moderate duck or no change; concurrency bounded |
| World | machinery, footsteps, resin, debris | attenuate normally; drop first under density |
| Texture | distant groan, tiny drip, nonessential prop loop | suppress during voice, cinematics, and heavy combat |

Do not duck voice. Voice may duck music and noncritical world texture through a
short attack and slower release. UI confirmation remains dry and centered.

## Spatialization and obstruction

For the existing isometric camera, full 3D HRTF is unnecessary for the first
pass. Implement predictable screen-space spatial sound:

1. transform source world position into camera right/forward axes;
2. map camera-right displacement to stereo pan with a conservative maximum;
3. apply smooth inverse-distance-like gain between `refDistance` and
   `maxDistance`;
4. reduce high frequencies and direct gain for a closed door or known wall
   obstruction when a cheap grid line test says the source is blocked;
5. keep critical telegraphs at a minimum audible gain even near the attenuation
   boundary;
6. stop or virtualize loops after the source leaves range instead of retaining
   silent buffer sources indefinitely.

Positional output must never create gameplay authority. Multiplayer clients
play local audio from replicated game state; they do not transmit audio events
as authoritative state.

## Authoring pipeline

### Source to derivative

1. Audition at matched loudness and label `keep`, `possible`, or `reject`.
2. Scan for speech/music/identity contamination and technical faults.
3. Copy a selected source into a non-destructive design session; never edit the
   preserved original.
4. Trim, de-click, remove DC, repair noise only where helpful, and resample to
   48 kHz/24-bit.
5. Layer no more elements than necessary to establish mechanism, body, air,
   and signature.
6. Print a dry mono/stereo master and, where needed, a separate loop region or
   distance variant.
7. Loudness-match against the current cue in context, not in isolation.
8. Export WAV for short critical effects. Consider OGG only for longer ambience
   after decode/size measurements.
9. Generate a derivative manifest and waveform/spectrum review.
10. Copy only the accepted derivative to `public/audio/cc0-derived/<family>/`.

### Derivative manifest fields

- runtime key/path and semantic soundset;
- source file(s), SHA-256, source page, creator, license;
- edit session/tool versions and transformation notes;
- sample rate, bit depth/codec, channels, duration;
- sample peak, true peak, integrated or short-term loudness as appropriate;
- loop start/end and crossfade when applicable;
- intended bus, base gain, pitch range, concurrency, cooldown, priority;
- trigger locations, fallback key, approval state, and reviewer/date.

## Loudness and mix targets

Do not normalize every file to the same peak. Match perceived function and
leave headroom for overlapping gameplay.

| Family | Initial authoring target | Peak ceiling | Notes |
| --- | --- | --- | --- |
| UI/critical one-shot | -20 to -16 LUFS short-term | -3 dBTP | readable, dry, short; final gain still controlled in runtime |
| Gameplay mechanism | -24 to -18 LUFS short-term | -4 dBTP | door mass distinguishes level; no jump-scare peaks |
| Combat/world impact | context matched; preserve transient | -3 dBTP | test dense overlap and limiter-free summing |
| Local machinery loop | -32 to -26 LUFS integrated | -8 dBTP | designed to combine with room ambience |
| Global ambience | -34 to -28 LUFS integrated | -8 dBTP | music and voice retain space |
| Biological texture | -30 to -22 LUFS short-term | -6 dBTP | close detail, restrained low-mid buildup |

These are authoring ranges, not runtime mix guarantees. Final base gains are
set through in-game comparison using the user sliders at defaults and at their
minimum/maximum meaningful values.

## Loading, memory, and package budget

- Tier 1 runtime derivatives: target no more than 24 files and 8 MiB total.
- Eager boot additions: at most six small critical cues and 1 MiB compressed.
- Long loops load contextually and unload/evict when their biome or scene is no
  longer reachable if measurement shows retained decoded buffers matter.
- Limit most world families to 2-4 concurrent voices; small debris may allow 6
  with oldest/quietest replacement.
- One ambient emitter per logical machine, not per decorative mesh instance.
- Record compressed file size and decoded PCM estimate in the asset audit.
- `audit:build-media` must prove every declared runtime file is packaged; a new
  audio audit should also detect orphan derivatives and duplicate hashes.

## Implementation phases

### Phase A — audition and palette proof

Deliverables:

- machine-readable catalog for the acquired 148 files;
- duration/channel/sample-rate/peak/loudness analysis;
- human keep/possible/reject labels with notes;
- ten-second interactive palette test covering door, engine, terminal, metal,
  barrier, alarm, resin, and egg families;
- three current-vs-candidate blind comparisons.

Exit criteria:

- exact source/license chain is intact;
- no source with speech/music contamination advances;
- at least one mechanism and one biological family clearly outperform current
  cues in game context;
- rejected files remain source-only and never enter the runtime manifest.

### Phase B — audio runtime foundations

Deliverables:

- extracted pure audio manifest module;
- soundset registry and `playSoundset()`;
- fixed foley-bus routing;
- no-repeat selection, cooldown, concurrency, priority, and fallback behavior;
- screen-space position/distance helper;
- unit tests and telemetry coverage.

Exit criteria:

- missing new derivatives fall back without throwing or blocking boot;
- soundsets never immediately repeat when alternatives exist;
- concurrency caps survive rapid-fire synthetic tests;
- all buses follow mute and user-volume controls;
- voice remains intelligible during a stress fixture.

### Phase C — mechanisms vertical slice

Integrate doors, heavy locks, and terminal life in one authored bunker route.

Exit criteria:

- door open, travel, latch, and close phases align with animation;
- nearby repeated doors vary without changing perceived mass;
- offscreen/distant doors attenuate and pan predictably;
- terminal loops do not multiply per mesh or survive disposal;
- current asset rollback requires only soundset data changes.

### Phase D — hive and environment vertical slice

Integrate resin movement, egg idle/warning, force fields, and one camp machinery
identity.

Exit criteria:

- biological sources do not sound like raw bubbles/slime;
- hive loops stay phase-coherent without synchronized global pulsing;
- obstruction and room transitions are audible but not exaggerated;
- low-O2 filtering, existing music tension, voice, and new ambience interact
  without double-filtering or gain jumps.

### Phase E — destruction, combat, and boss accents

Add size-classed metal impacts, wall debris, selected armor sweeteners, heavy
boss contacts, and one telegraph family.

Exit criteria:

- damage/telegraph cues win priority over debris and ambience;
- a dense encounter stays below clipping and within the voice-readability
  target;
- contact-frame timing is stable across normal and degraded frame rate;
- no rapid event produces machine-gun repetition or an unbounded voice count.

### Phase F — rollout and retirement

Promote approved soundsets across remaining compatible triggers, verify a
packaged Steam/Electron build, retain old cues for one release candidate, then
retire only those with accepted replacements and no remaining references.

## Test and acceptance matrix

### Automated

- manifest paths exist, decode, and use approved extensions;
- source-derived runtime assets have complete provenance sidecars;
- no duplicate runtime hashes under different names without an explicit alias;
- soundset variants exist and declare valid gain/pitch/concurrency limits;
- foley routes to `foleyGain`;
- no-repeat, cooldown, concurrency, fallback, and mute behavior;
- positional pan/gain clamps and obstruction-filter transitions;
- loop boundaries remain within declared duration and do not click in a render
  test;
- build and Electron package contain all referenced derivatives;
- no source archives or source-page HTML leak into `dist/`.

### Human/device

- default mix, voice-first mix, music-off, SFX-low, and mute-all settings;
- Steam Deck speakers, laptop, headphones, and stereo speakers;
- mono fold-down and left/right polarity;
- quiet exploration, busy camp, dense combat, boss telegraph, pause/resume,
  focus loss, scene teardown, death, and return to title;
- repeated-use fatigue for doors, pickups, impacts, resin, and alarms;
- accessibility check that critical warnings do not rely on pitch or stereo
  location alone.

## Work breakdown

| ID | Work item | Owner | Depends on | Evidence |
| --- | --- | --- | --- | --- |
| GAUD-01 | Catalog and analyze acquired sources | Audio tools | none | machine report + labeled audition sheet |
| GAUD-02 | Audit existing cues and choose A/B baselines | Audio design | GAUD-01 | comparison playlist and notes |
| GAUD-03 | Design door/lock/terminal palette | Audio design | GAUD-02 | approved derivative masters |
| GAUD-04 | Extract manifest and add soundsets | Audio/gameplay | none | unit tests and unchanged legacy behavior |
| GAUD-05 | Fix foley routing and add voice priority/duck policy | Audio/gameplay | GAUD-04 | bus tests and stress render |
| GAUD-06 | Add concurrency/cooldown/no-repeat behavior | Audio/gameplay | GAUD-04 | deterministic unit tests |
| GAUD-07 | Add screen-space position and obstruction | Audio/gameplay | GAUD-04 | math tests and room capture |
| GAUD-08 | Integrate mechanism vertical slice | Gameplay/audio | GAUD-03-07 | route capture and performance report |
| GAUD-09 | Design and integrate hive/environment set | Audio design/gameplay | GAUD-08 | biome capture and loop QC |
| GAUD-10 | Design and integrate destruction/boss set | Combat/audio | GAUD-08 | encounter capture and density report |
| GAUD-11 | Provenance, build, package, device acceptance | Release/audio | GAUD-08-10 | audit output and named acceptance |
| GAUD-12 | Retire superseded assets after rollback window | Audio maintainer | GAUD-11 | zero references and release-candidate approval |

## Promotion and rollback

Promote each family independently. A promotion change contains the derived
audio, derivative manifests, provenance update, runtime soundset data, tests,
and comparison evidence. Preserve the previous key as `fallback` and keep the
old file packaged through one release candidate.

Rollback changes soundset data back to the prior key or disables the new bank.
It must not require reverting unrelated gameplay code. Source downloads,
license captures, and rejected audition evidence remain preserved.

## Plan exit criteria

This plan is complete when:

- the acquired set has a reviewed audition catalog;
- at least mechanisms, ship/machinery, alarms, hive resin/egg, and metal-impact
  families use accepted CC0-derived soundsets in gameplay;
- runtime audio supports correct foley routing, bounded variation, priority,
  contextual loading, and predictable screen-space placement;
- every shipped derivative has a complete source chain and provenance entry;
- boot/memory/package budgets and dense-mix/device results are recorded;
- replaced assets are either retained deliberately or retired with zero
  references and an accepted rollback window.
