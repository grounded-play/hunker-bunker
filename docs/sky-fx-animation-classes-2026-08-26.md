# Sky FX Animation Classes

**Date:** 2026-08-26
**Status:** Design outline, pre-implementation
**Companions:** `docs/sky-layer-and-weather-asset-catalog-2026-08-25.md` (asset contract), `docs/sky-motion-and-transient-animation-plan-2026-08-25.md` (motion plan)

---

## 0. The problem

Every animated sky asset currently plays through one model: step to the nearest whole frame at 12fps, either stretched across the effect's lifetime or looped. That is correct for exactly one of the things in the sky.

Measuring the delivered atlases makes the mismatch concrete. Three sheets, three unrelated signatures:

| Atlas | Frame-mean arc | Bounding box | Shape of the event |
|---|---|---|---|
| `fx_comet_longtail` | 2.3 → **17.0 at f5** → 3.0 | 171 → 345 → 201 | rises, peaks, recedes — a closed arc |
| `fx_lightning_fork` | 4.0 → **22.8 at f2** → 4.6 | ~constant | snap attack, fast decay, fixed in place |
| `fx_reentry_debris` | 18.3 → 1.9, monotonic | 349 → **409, expanding** | dims *while spreading* — dissolving into parts |

A single playback model cannot serve all three:

- **Cross-fading lightning destroys it.** A bolt's identity is the discrete step — the eye reads the jump from leader to return stroke as the strike. Blend those frames and it becomes a soft pulsing smear.
- **Stepping a planet destroys it.** A body meant to change slowly over a minute has, at 12fps, either a visible pop every few seconds or no motion at all. Slow motion *requires* interpolation; there is no frame rate that fixes it.
- **Re-entry needs its opacity tied to its own dissolve**, not to a generic fade, because the art already dims as it spreads.

So playback character is a per-asset property, and it has four independent axes.

---

## 1. The four axes

Every animated sky asset is described by four choices. They are orthogonal — any combination is legal — and together they replace the current single `playback` field.

### Axis 1 — Frame blending

| Mode | Behaviour | For |
|---|---|---|
| `step` | snap to the nearest whole frame | lightning, anything whose identity is the discontinuity |
| `blend` | sample the two neighbouring frames and cross-fade by the fractional frame index | planets, nebulae, anything slow |

**`blend` is the mechanism that makes slow animation possible at all.** It requires sampling two atlas cells in one pass and mixing them, which the current billboard material cannot do — it holds a single UV window. This is the one genuinely new piece of rendering (§3).

### Axis 2 — Rate

| Mode | Clock | For |
|---|---|---|
| `realtime` | the atlas's own fps | lightning, tumbling satellite — things with a true physical rate |
| `lifetime` | the atlas is stretched across the effect's duration | comet, re-entry — the arc *is* the traversal |
| `ambient` | a period measured in tens of seconds to minutes, independent of any event | planets, galaxy, nebula |

`lifetime` already exists as `sheetTimeForTransient`. `ambient` is new and is what "the galaxy ones should be slowest" means: a period, not an fps.

### Axis 2b — The presence envelope (implemented)

Independent of frames, every trigger animation is gated by an envelope across its own lifetime. **Trigger animations never loop: they run once and fade out.** Without this an effect blinks off the moment its last frame is reached, which reads as a dropped frame rather than an ending.

The envelope governs *presence*; the cycle governs *frames*. The two are separate on purpose — a tumbling satellite keeps looping its rotation while the envelope fades its whole pass out.

- Smoothstep at both ends, not a linear ramp: on additive atlases brightness *is* the effect, and a linear dimmer reads as mechanical.
- The lead-in is short (6%) and the tail long (24% by default): an effect should arrive promptly but leave gently.
- The tail is per-asset. Lightning uses 14% — a strike that lingers stops reading as a strike. Narrative beats (mothership, sun gutter, spore bloom) use 30–34%.
- It guarantees zero at the end regardless of where a given sheet's last frame lands, so nothing ever vanishes mid-brightness. Useful because the atlases differ: `comet` ends at frame-mean 3.0 and `reentry` at 1.9, but `mothership` is already at 0.2.

Measured in the running game, one comet over a 20 s life:

```
t(s)   0     1     2-15    16     17     18     19     20
op     0.00  0.94  1.00    0.92   0.68   0.37   0.11   gone
```

### Axis 3 — Cycle

| Mode | Behaviour | For |
|---|---|---|
| `once` | play 1→N, then stop — **never loops**; the envelope fades the tail | comet, re-entry, lightning |
| `hold` | play 1→N, hold the last frame | spore bloom |
| `loop` | wrap N→1 | satellite tumble |
| `pingpong` | play 1→N→1, ever | **planets, nebulae** |

**`pingpong` is why a cinemagraph never pops.** A slow looping body would jump from its last frame back to its first every cycle; ping-pong makes the sequence its own return path, so an atlas that was never authored to tile still loops seamlessly and forever. This is the single most useful addition for the "slow, fading, breathing" look.

### Axis 4 — Motion coupling

| Mode | Position | For |
|---|---|---|
| `path` | travels a seeded arc across the dome | comet, re-entry, mothership |
| `anchored` | pinned to a named point | spore bloom (zenith), sun gutter (the live sun), lightning (cloud base) |
| `orbital` | drifts on the body orbit it belongs to | planets, moons |
| `fixed` | does not move | galaxy band, nebula veils |

Already implemented as anchors; listed here because a class is not fully specified without it.

---

## 2. The classes

Named combinations, so assets are tagged with an intent rather than four separate switches.

| Class | Blend | Rate | Cycle | Motion | Character |
|---|---|---|---|---|---|
| **STROBE** | `step` | `realtime` | `once` | `anchored` | violent, discrete, over in under a second |
| **TRAVELLER** | `step` | `lifetime` | `once` | `path` | crosses the sky while its own arc plays out |
| **DISSOLVER** | `blend` | `lifetime` | `once` | `path` | as TRAVELLER, but fades out on its own dissolve curve |
| **TUMBLER** | `step` | `realtime` | `loop` | `path` | rotates at a true rate while it passes |
| **CINEMAGRAPH** | `blend` | `ambient` | `pingpong` | `orbital` | breathes; never obviously repeats |
| **DEEP DRIFT** | `blend` | `ambient` | `pingpong` | `fixed` | the slowest thing on screen; motion barely perceptible |
| **BLOOM** | `blend` | `lifetime` | `hold` | `anchored` | spreads, then stains and stays |

### Assignment

| Asset | Class | Period / duration | Why |
|---|---|---|---|
| `fx_lightning_fork` | STROBE | ~0.5 s | measured snap-to-peak at f2; must not blend |
| `fx_lightning_sheet` | STROBE | ~0.35 s | in-cloud glow, same discontinuity |
| `fx_lightning_crawler` | STROBE | ~0.7 s | propagates along the cloud base |
| `fx_comet_longtail` | TRAVELLER | 18–26 s | measured closed arc: rises, peaks at f5, recedes |
| `fx_meteor_shower` | TRAVELLER | 6–12 s | ignite and burn out |
| `fx_reentry_debris` | **DISSOLVER** | 5–9 s | measured: dims monotonically while its bbox *expands* |
| `fx_satellite_tumble` | TUMBLER | 20–40 s | true rotation rate |
| `fx_mothership_transit` | TRAVELLER | ~18 s | director beat |
| `fx_spore_bloom_zenith` | BLOOM | ~20 s then holds | director beat |
| `fx_sun_gutter` | DISSOLVER | ~24 s | the star dying; anchored to the sun, not a path |
| planets, gas giant, moons | **CINEMAGRAPH** | 40–90 s | slow rotation and terminator drift |
| `body_mothership_derelict` | CINEMAGRAPH | ~70 s | slow tumble in orbit |
| nebula veils, galactic band | **DEEP DRIFT** | 180–400 s | the slowest layer in the sky |
| aurora | (cloud shader) | — | already handled by `skyCloudMaterial` shimmer |

---

## 3. What has to be built

### 3a. Two-cell sampling — the one new rendering piece

`blend` cannot be expressed with a texture offset. The material must sample **two** atlas cells and mix them:

```
frameFloat = f(progress or elapsed)      // no longer rounded
frameA     = floor(frameFloat)
frameB     = next frame under the cycle rule
mix        = fract(frameFloat)
colour     = mix(sample(cellRect(frameA)), sample(cellRect(frameB)), smoothstep(mix))
```

Notes that matter:

- **Cross-fade in linear-ish space and blend additively.** Every animation atlas is additive-on-black, so mixing two cells is a genuine dissolve rather than an alpha compromise. The smoothstep on `mix` avoids the linear-ramp "double exposure" look at the midpoint.
- **`frameB` follows the cycle rule, not `frameA + 1`.** Under `pingpong` the neighbour at the end of a sweep is the *previous* frame; under `loop` it wraps to 0; under `once` it clamps. Getting this wrong produces exactly one wrong frame per cycle, which reads as a flicker.
- **`step` mode is the same shader with `mix` forced to 0**, so there is one material rather than two code paths.

### 3b. Ambient rate

A period in seconds, not an fps. `frameFloat = (elapsed / periodSeconds) * frames`, with ping-pong folding. A phase offset per instance (below) keeps bodies out of lockstep.

### 3c. Phase jitter

Two moons on screen advancing in lockstep read as a rendering artefact. Every instance takes a seeded phase offset so identical assets never share a frame. Derived from the run seed plus the instance key, so it stays deterministic for co-op.

### 3d. Where the planet frames come from

Planets, moons and the galaxy currently ship as **single stills** — there are no frames to blend. Two ways to get a cinemagraph out of them:

**Option A — procedural, no new art (recommended for most).** A rotating gas giant is a horizontal scroll of its own banded texture; a drifting nebula is a slow UV warp plus a brightness shimmer. Both are transforms the existing `skyCloudMaterial` already knows how to do, applied to a billboard instead of a dome band. Zero new assets, zero memory, and it never repeats.

**Option B — new frame atlases.** Needed only where the change is *not* a transform: a terminator sweeping across a planet, cloud bands shearing past each other, the derelict tumbling to show its breached flank. 6–8 frames at 1024² in a 3×2 or 4×2 grid is plenty, because ping-pong doubles the apparent length and blending hides the low frame count.

**Recommendation:** Option A for the gas giant, the two nebula veils and the galactic band — rotation and drift are transforms, and this needs no generation. Option B only for `body_mothership_derelict` (its tumble genuinely changes silhouette) and optionally one hero planet. That is 1–2 new atlases instead of 13.

---

## 4. Code changes

| File | Change |
|---|---|
| `src/sky/skySpriteMaterial.js` | **new** — two-cell sampling `ShaderMaterial`: `uMapA/uMapB` rects, `uMix`, `uOpacity`, `uTint`, additive. Replaces `MeshBasicMaterial` for billboards. |
| `src/sky/skyFxClasses.js` | **new** — pure. The class table, per-asset assignment, and `resolveFramePair(definition, class, time)` returning `{ frameA, frameB, mix }` under the cycle rule. |
| `src/sky/skySheets.js` | add `fxClass` per atlas; keep `playback` as the derived cycle |
| `src/sky/skyBillboards.js` | use the sprite material; accept a frame *pair* plus mix instead of a single rect |
| `src/sky/skyLayers.js` | `resolveSkyTransients` / `resolveSkyBodies` emit frame pairs; bodies gain ambient phase |
| `src/sky/skyState.js` | expose an ambient clock for `ambient`-rate assets |

---

## 5. Testing

The pure half tests as the rest of the sky does:

- `resolveFramePair` — `mix` stays in [0,1); `frameA`/`frameB` always in range; the neighbour is correct under each cycle rule; **ping-pong reverses at both ends without repeating an endpoint frame** (the classic off-by-one that shows as a stutter at the turn); `step` classes always return `mix === 0`.
- Ambient rate — a full period returns to the starting frame; two instances with different seeds never share a phase.
- Class assignment — every atlas in `SKY_SHEETS` has a class; no STROBE asset is ever assigned `blend`.

Shader behaviour needs the same treatment that caught the depth and blow-out bugs: **capture frame pairs and diff**. Specifically, assert that a CINEMAGRAPH body changes measurably over 10 s but *not* over 0.2 s (proving it is slow rather than static), and that a STROBE changes completely between adjacent captures (proving it is not being smoothed).

---

## 6. Open tuning items carried forward

- The comet renders as a compact fireball rather than a tailed comet — angular size and additive gain, not the art. Its measured arc peaks at f5, so a TRAVELLER stretched over ~20 s spends most of its life near peak, which is correct.
- `fx_spore_bloom_zenith` is zenith-anchored and the third-person camera almost never looks up; it likely needs a lower anchor to be seen at all.
- `fx_lightning_crawler` is dim (peak frame-mean 10 against the fork's 23) and may not read on screen.
- `fx_mothership_transit` frames 1–3 and 15–16 are near-invisible by design, so the beat is imperceptible for its first ~19% and last ~12%.
