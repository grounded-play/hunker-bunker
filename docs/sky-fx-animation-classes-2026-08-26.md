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

### 3c-bis. Correction: ping-pong is wrong for rotation

The class table above assigns CINEMAGRAPH bodies `pingpong`. That is wrong wherever the change is **directional**. A rotating planet that plays forward then backward is obviously broken; rotation must loop seamlessly, with the last frame flowing into the first, which is an authoring constraint on the atlas rather than a runtime setting.

Ping-pong is right only for **non-directional** change — billowing, churn, shimmer — where there is no "forward". Corrected assignment:

| Change | Cycle | Examples |
|---|---|---|
| directional (rotation, tumble) | `loop`, atlas authored seamless | gas giant, derelict |
| non-directional (churn, billow) | `pingpong` or procedural noise | suns, nebulae |
| none (physically static) | no frame animation at all | moons, ring arc, galactic band |

### 3d. Per-asset decision

Blanket answers look wrong here, because these assets change for different physical reasons — or don't change at all. **Two atlases, everything else procedural or static.**

| Asset | Technique | Why this and not the other |
|---|---|---|
| `body_gasgiant_ringed` | **Atlas** — 8f seamless rotation loop, crossfaded | The rings cross the disc diagonally and the terminator is baked hard. Any texture scroll smears the rings and drags the terminator across a lit face. Rotation on a banded giant is the most visible motion in the sky, so this is the asset that earns an atlas. |
| `body_mothership_derelict` | **Runtime tumble** — roll + foreshortening, no atlas | Revised after building it. What is achievable from a single still is roll and foreshortening, and those are *transforms* — so doing them at runtime is smooth where frames would step, and costs no texture memory. A genuine silhouette change would need real 3D renders, which cannot be derived from this art; the runtime tumble reads correctly at sky distance. |
| `body_moon_cratered_large` / `_small` / `_shattered` | **No frame animation.** Orbital drift + atmospheric extinction | Real moons are tidally locked — they show a phase, not surface motion. Faking rotation would look wrong, and a procedural terminator would fight the terminator already baked into the art. What sells them is extinction: dimming and warming as they near the horizon. |
| `body_planet_rust` / `body_planet_dead_ocean` | **No frame animation.** Orbital drift + extinction | Same reasoning. Polar caps and a baked terminator mean a scroll slides the cap sideways. At this angular size, rotation would be invisible anyway. |
| `body_sun_primary` / `body_sun_dwarf` | **Procedural** — granulation churn + prominence flicker | A star's surface genuinely churns, and it is non-directional, so noise does it better than frames and never repeats. Small and bright on screen; an atlas would be wasted memory. |
| `body_ring_arc` | **Procedural** — scintillation only | A ring system does not visibly move. Anything more would be a lie. |
| `nebula_veil_violet` / `_ember` | **Procedural** — domain-warp billow | Non-directional, and noise never repeats, so it beats any finite atlas. The warp already exists in `skyCloudMaterial`. |
| `nebula_band_core` | **Procedural** — scintillation only | A galaxy does not move. What gives this life is the atmosphere drifting *in front of* it, which the cloud layers already provide. |
| `star_*` accents | **Procedural** — twinkle | Scintillation is atmospheric, not stellar. Per-pixel noise, no art. |

The unifying touch across every body is **atmospheric extinction** — dimming and warm-shifting toward the horizon. It is physically real, it applies to all of them, it costs nothing, and it does more for believability than frame animation would on any of the static ones.

### 3d-bis. Attempted and rejected: deriving the gas giant rotation from its still

A rotation atlas was built from the existing `body_gasgiant_ringed.png` by
un-projecting each pixel to (lat, lon) on a sphere, offsetting the longitude,
and re-sampling. Two problems were solved on the way and one proved fatal.

**Solved — baked lighting.** Rotating pixels directly drags the terminator round
with the surface, so the planet swings dark. Fitting a Lambert term to the disc
(best fit: light direction `(-0.90, 0.20, 0.39)`, correlation 0.774 over 62k
samples), dividing it out, and re-applying it at the destination normal keeps
the light fixed while the surface turns.

**Solved — the rings.** A colour threshold failed outright: bright desaturated
cloud is indistinguishable from ring, so the mask pasted swathes of cloud back
over a rotating planet as duplicated arcs. Fitting the ring ellipse
geometrically from the pixels *outside* the disc, where they are unambiguous
(tilt -27.7 deg, a=1134, b=248), and extending that band across the disc gives a
clean rigid ring.

**Fatal — a hemisphere cannot supply a rotation.** The source shows one face.
Rotating 90 degrees puts the source's limb at the destination's centre, and the
limb holds almost no resolution, so it stretches into a hard vertical smear.
Measured share of disc pixels sampling from `|nx| > 0.95`:

| rotation | 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315 |
|---|---|---|---|---|---|---|---|---|
| limb-sourced | 1.2% | 6.9% | **9.8%** | 6.9% | 1.2% | 6.9% | **9.8%** | 6.9% |

This is geometric, not a tuning failure: it peaks at 90 and 270 for any
parameters. **The gas giant needs genuinely new frames.** Generation spec:

> Eight-frame rotation sequence of the same ringed gas giant, one frame per 45
> degrees of planetary rotation, as a 4x2 grid at 512px per cell (2048x1024).
> The cloud bands, storm ovals and belt structure advance by 45 degrees of
> longitude per frame and wrap seamlessly, so frame 8 flows back into frame 1
> with no discontinuity. **The ring system, the lighting and the terminator do
> not move** -- rings stay rigid in the same position and orientation in every
> frame, the light stays fixed from the upper left, and the shadowed limb stays
> on the same side throughout. Identical planet position, identical disc radius
> and identical camera in every cell. Banded turbulent atmosphere in bruised
> ochre, rust and slate grey; sharp-edged ice rings crossing at a shallow
> oblique angle with a visible gap; ring shadow cast on the cloud tops. Pure
> black background, no chroma key, additive-blend asset.

Note the atlas must **loop**, not ping-pong (3c-bis), so the seamless wrap
between the last and first frame is a hard requirement of the brief.

### 3e. Where the planet frames come from

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
