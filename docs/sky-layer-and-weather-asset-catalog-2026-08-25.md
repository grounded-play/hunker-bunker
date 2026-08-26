# Sky Layer & Weather Asset Catalog

**Date:** 2026-08-25
**Status:** Production complete — 60/60 assets generated and processed in `public/sky/`; all 10 animation sheets standardized as GPU-safe atlas grids
**Companion design:** `docs/superpowers/specs/2026-08-25-procedural-sky-system-design.md` (pending)
**Style anchor:** `public/title_key_art_v2.png`
**Fiction:** Thin alien atmosphere — stars and deep space stay faintly visible even at noon. Horizon haze is thin, storms are dust/ice/spore rather than water cloud.

---

## 0. Why this document exists

The sky is currently a flat `THREE.Color` (`src/threeGame.js:1496`) that lerps toward the biome fog colour. The new third-person camera (FOV 58, near-level gaze) puts the horizon band and the lower ~30° of sky on screen for most of a run, so that flat colour is now the single largest unpainted surface in the game.

This catalog defines the **layer stack**, classifies every element as generated art / runtime pre-render / live effect, and gives the generation prompt outline for each shipped asset.

---

## 1. The single-element rule

**Every asset in this catalog contains exactly one element, occupying one layer, and nothing else.** The layers parallax against each other at different rates (§2); anything baked into the same file is welded together forever and cannot move independently.

> **Known failure — read this before writing any prompt.** The first `sky_nebula_band_core` generation came back with the galactic band, a distant ridgeline, a mid-distance wreck skyline *and* foreground biomechanical structures composited into one image. That is four layers (L1, L8, L9, L10) in one file: unusable. Two causes, both corrected below — the shared style preamble was injecting "biomechanical / alien world / survival-horror" into a pure-space asset and inviting a landscape, and no prompt explicitly forbade ground.

Two rules follow, and every prompt in §4 inherits them:

1. **Use the preamble for the asset's own family** (§1a). There is no longer one global preamble.
2. **Append the mandatory isolation clause printed at the top of the asset's layer section** in §4. It is a hard negative list, and it is not optional.

---

### 1a. Style preambles — pick by family

**SPACE preamble** — prepend to L1, L2, L3, L4, L5:

> Painterly astronomical realism, deep space photography aesthetic, high dynamic range, physically plausible celestial detail, no text, no logo, no watermark, no border, no signature.

**ATMOSPHERE preamble** — prepend to L6, L7, L11, L12:

> Painterly atmospheric realism, thin-atmosphere alien world, restrained cyan/amber/violet accents, high dynamic range, no text, no logo, no watermark, no border, no signature.

**TERRAIN preamble** — prepend to L8, L9, L10 only:

> Dark biomechanical sci-fi survival-horror concept art, thin-atmosphere alien world, Gigeresque organic engineering, worn charcoal and bone-metal materials, restrained cyan/amber/violet emissive accents, high dynamic range, no text, no logo, no watermark, no border, no signature.

The biomechanical language now appears **only** in the terrain preamble, which is the only family that should ever contain structures.

---

## 1b. Background is decided by blend mode, not by preference

The project convention keys sprites on pure black (`docs/ending-and-camp-assets-plan.md:9`). That convention is **correct for the additive sky layers and wrong for the alpha ones**. Split it:

| Blend | Layers | Background | Keying |
|---|---|---|---|
| **Additive** | L1 deepfield, L2 stars, L4 transients, L5 aurora, L11 lightning, L12 lens | **Pure black `#000000`** | **None.** Ship as-is. |
| **Alpha** | L3 bodies, L6 highcloud, L7 storm, L8/L9/L10 horizon | **Pure chroma green `#00FF00`** | Key green → alpha, despill edges. |

**Why additive layers must not be green.** Under additive blending black already contributes nothing, so it is transparent for free — no key, no despill, no halo. More importantly a chroma key produces a hard alpha decision at every pixel, which **destroys soft translucent falloff**. Nebulae, aurora, comet tails and lens bloom are made almost entirely of soft translucent falloff. Keying them is actively destructive. Ship them on black and let the blend mode do the work.

**Why alpha layers must not be black.** Horizon silhouettes, planets and storm fronts are opaque, hard-edged, and predominantly *dark* — a black key would punch straight through the subject. They need a colour that cannot occur in the art, hence green.

### Green-background contract (alpha layers only)

- Background is pure `#00FF00`, flat, unlit, **edge to edge, 100% coverage behind the subject**. Where a prompt says an element fades out, it must fade **to green**, not to black or to dark sky.
- **No green anywhere in the subject.** No green emissive, no green bioluminescence, no green rim light. Where the art direction wants sickly BIO-sector green, generate it in **amber-yellow** and let the runtime tint shift it — the shader owns the final hue.
- No drop shadow, no glow spill, no vignette, no gradient on the background.
- Subject fully inside frame with 2% bleed margin, except where the spec says *bleeds off edge*.

### Black-background contract (additive layers only)

- Background is pure `#000000`, edge to edge. Elements fade **to black**.
- No stray coloured haze filling the frame — empty sky must be genuinely black, or it will glow when added.
- Soft edges are wanted here. Do not harden them.

### Animation-sheet output contract (L4 and L11)

Every animated sky asset ships as a **single PNG atlas grid**, not a video, GIF,
APNG, loose frame sequence, or one-row strip. All 10 sheets use the same runtime
contract even though their cell aspect ratios and grid dimensions differ:

- Frames are ordered **left-to-right, then top-to-bottom**. Frame indices are zero-based.
- For frame `i`, `column = i % columns` and `row = floor(i / columns)`.
- Every cell has the exact declared dimensions. There are no gutters, padding,
  labels, borders, or divider pixels.
- The full sheet uses additive RGB on pure black. Do not chroma-key it and do not
  depend on alpha for attenuation.
- The subject keeps a stable centre anchor in every cell. Runtime path movement is
  applied to the billboard or storm band; it is not baked into the cell position.
- Playback runs at **12 fps**. `once` hides after the final cell, `loop` wraps to
  frame 0, and `hold` remains on the final cell until its owning event ends.
- `once` sheets should end on a near-black decay frame. Frame 0 must contain a
  visible onset so triggering never appears to drop a frame.
- No sheet dimension may exceed **4096 px**. Rebuilding from generator output must
  use one uniform scale factor, then crop or pad the **vertical axis only** around
  the visible frame band before grid packing. Never force-resize the source to the
  strip dimensions: that changes subject proportions and camera perspective.

The runtime-facing layout and playback definitions are the L4 and L11 tables below.
`docs/sky-motion-and-transient-animation-plan-2026-08-25.md` defines the sampler
math and separation between sheet animation and sky-path movement.

## 1c. Batch-1 audit and the pipeline correction

All 13 batch-1 assets were verified on 2026-08-25: correct resolution, zero residual green, L8/L9 masks correctly grayscale (mean saturation 0.0). Two deviations found.

### The additive layers were keyed, and must not be

`scratch/process_sky_assets.py` ramps alpha only across `excess_green` 15→60 and sets alpha 255 everywhere else. Applied to a nebula that ramp is effectively binary:

| Asset | Partial-alpha pixels | Verdict |
|---|---|---|
| `nebula_band_core` | 4.82% | hard cut |
| `nebula_veil_violet` | 6.26% | hard cut |
| `star_open_cluster` | 4.48% | hard cut |

A nebula is almost entirely soft translucent falloff, so a binary alpha decision discards most of what makes it read as gas.

**Batch 1 is salvageable without regenerating.** RGB where `alpha == 0` measured exactly `(0, 0, 0)` — the script zeroes keyed pixels rather than leaving green behind. So the runtime **discards the alpha channel on additive layers and blends RGB additively**: the art already falls to black, and additive blending reconstructs the soft edge correctly. Only nebulosity fainter than the key threshold is lost, which is not worth a regeneration pass.

**For batches 3–6, do not key the additive layers at all.** Per §1b, L4 transients, L5 aurora, L11 lightning and L12 lens are additive. Generate them on pure black and skip `process_sky_assets.py` entirely — resize only. Running the green key over them will destroy comet tails, aurora falloff, lightning decay and lens bloom, all of which are made of exactly the soft gradient the key throws away.

There is a second reason to bypass it: the despill branch clamps `g = max(r, b)` on **every** pixel, keyed or not. Any genuine cyan or teal in the subject is silently desaturated. That is acceptable on a green-keyed opaque cutout and destructive on an additive one.

### L10 came back monochrome

`near_rock_teeth` measured mean saturation 13/255 and `near_antenna_line` 6/255, against a spec calling for the one full-colour horizon band. Accepted rather than regenerated — at that saturation there is no material colour to preserve — but the runtime therefore applies a light tint to L10 as well as to L8/L9. If a later batch regenerates these, push real colour into them and drop the L10 tint.

---

### Seamless

Where **seamless** is specified, left and right edges must tile continuously — the asset wraps 360° around the dome.

### Luminance-mask assets

Layers marked **MASK** ship as **grayscale silhouettes with internal tonal detail**, not full colour. The runtime tints them from `skyState` horizon colour. This is not a shortcut — atmospheric perspective genuinely desaturates distant terrain, so the tinted result is more physically honest, it guarantees the horizon always matches the current sky, and it cuts texture memory by ~4x. Generate them grayscale on green.

---

## 2. Layer stack

Layers are **camera-locked**: the rig follows camera translation, so the 160-unit far plane (`src/threeGame.js:1564`) never clips them. Parallax is faked by offsetting each layer's UV against camera world position by a per-layer factor — 0.0 is infinitely distant and pinned, 1.0 moves with the world.

Space layers (L0–L5) are **full dome**. Atmospheric and horizon layers (L6–L10) are **cylindrical bands** occupying roughly −8° to +34° elevation, because the camera almost never shows the zenith and a full sphere there is wasted fill.

| # | Layer | Kind | Parallax | Blend | Biome-specific |
|---|---|---|---|---|---|
| L0 | `sky.base` — gradient, horizon haze, zenith falloff | **Procedural** | 0.00 | opaque | tint only |
| L1 | `sky.deepfield` — nebula, galactic band | Art (black bg) | 0.00 | additive | no |
| L2 | `sky.stars` — starfield + cluster accents | **Pre-render** + art (black bg) | 0.00 | additive | no |
| L3 | `sky.bodies` — suns, moons, planets, derelict | Art (green bg) | 0.01 | alpha | no |
| L4 | `sky.transients` — comets, meteors, re-entry | Art sheets (black bg) | 0.02 | additive | no |
| L5 | `sky.aurora` — magnetospheric curtains | **Procedural** + masks | 0.03 | additive | weighted |
| L6 | `sky.highcloud` — cirrus / ice veils | Art (seamless) | 0.06 | alpha | no |
| L7 | `sky.stormdeck` — dust walls, anvil fronts | Art (seamless) | 0.12 | alpha | **yes** |
| L8 | `sky.horizon.far` — ranges, mesas, ice shelves | Art **MASK** | 0.22 | alpha | **yes** |
| L9 | `sky.horizon.mid` — skylines, wrecks, spires | Art **MASK** | 0.38 | alpha | **yes** |
| L10 | `sky.horizon.near` — tree lines, rock teeth | Art (RGBA) | 0.62 | alpha | **yes** |
| L11 | `fx.weather` — particles, lightning | **Live** + art (sheets) | world | additive | **yes** |
| L12 | `fx.lens` — sun flare, god rays | Art | screen | additive | no |

Draw order is L0 → L12. L0–L5 write no depth. L8–L10 sit in front of the storm deck so a dust front rolls in *behind* the ridgeline, then swallows it as `stormDensity` rises.

---

## 3. Classification: art vs pre-render vs live

### 3a. Generated art — shipped PNG/KTX2 (60 assets)

Everything in §4. Produced from the prompts, chroma-keyed, committed to `public/sky/`.

### 3b. Runtime pre-render — baked once, no art file

Generated on the GPU/CPU at load or run start. These cost load time and VRAM, never per-frame art:

| Bake | Output | When | Why |
|---|---|---|---|
| **Starfield bake** | 1024² cubemap | once per run, from `runEntropy` | Seeded hash-star math is expensive per-fragment; baking it once makes L2 a texture fetch. Twinkle stays procedural on top. |
| **Storm noise bake** | 512² RG `DataTexture` | once at load | fbm for storm dissolve/edge erosion is the costliest term in the base shader. Baked, it becomes one sample. |
| **Horizon band composite** | one 2048×512 strip per biome per depth | on biome load | Composites the 2 variant strips + seeded offsets into a single band so L8/L9/L10 are 3 draws, not 18. |
| **Environment cubemap** | 256² cubemap, one face per frame | continuous, amortised | Feeds `scene.environment` for real sky reflections on bunker metal and armour. Never feeds `scene.background` — the live dome owns what you see, so slow refresh can't make the visible sky steppy. |

> **Warm-up requirement:** every new shader program here must be compiled inside `warmUpShaderPrograms()` (`src/threeGame.js:~27735`), through the composer. That function's own comment documents why compiling against the canvas instead of a render target produces a cache miss on first real frame. A sky shader missed by warm-up will stall the first outdoor frame of every session.

### 3c. Live effects — per-frame, no art beyond the sheets noted

| Effect | Owner | Notes |
|---|---|---|
| Weather particle field | existing `updateWeather` (`src/threeGame.js:18696`) | Already built. `WEATHER_FORCED_STATE = 'rainstorm'` (`:603`) currently pins it — the sky system's front scheduler replaces that forcing. |
| Lightning flash | `skyState.flash` | Drives a full-screen additive tint **and** a one-frame boost to `directionalLight`. Bolt art is L11 sheets. |
| Storm scroll | UV offset | Three storm strips scroll at 1.0 / 0.6 / 0.35 rate for internal parallax. |
| Body drift | `skyProfile` orbits | Suns/moons advance on seeded circular orbits keyed to `timeOfDay`. |
| Transient scheduler | seeded front schedule | Spawns comets/meteors at seeded times so co-op peers agree without netcode. |
| Fog colour match | `skyState.horizonColor` | `scene.fog.color` tracks the horizon so the world dissolves into its own sky. |

---

## 4. Asset manifest & prompts

Path root: `public/sky/`.

**Every prompt below is assembled as three parts:**

```
[ family preamble from §1a ]  +  [ the asset prompt ]  +  [ the layer's mandatory clause ]
```

The mandatory clause is printed once at the top of each layer section and applies to every asset in it. Do not omit it — it is what prevents the multi-layer composite failure described in §1.

---

### L1 — Deep field (3 assets, 2048×1024, additive)

> **Mandatory clause (L1)** — prepend the **SPACE** preamble (§1a), append verbatim:
> *One single deep-space element and nothing else. No ground, no horizon line, no terrain, no mountains, no rocks, no cliffs, no buildings, no structures, no wreckage, no machinery, no silhouettes, no foreground objects of any kind. The entire frame is open sky. No planets, no moons, no suns, no comets. Pure black #000000 background, edge to edge; every element fades to pure black. Additive-blend asset — do NOT use a chroma key colour, and do not harden soft edges.*

Painted so it reads at 15% opacity at noon and 100% at midnight.

| ID | File | Notes |
|---|---|---|
| `sky_nebula_band_core` | `sky/nebula_band_core.png` | seamless L/R |
| `sky_nebula_veil_violet` | `sky/nebula_veil_violet.png` | free-floating |
| `sky_nebula_veil_ember` | `sky/nebula_veil_ember.png` | free-floating |

**`sky_nebula_band_core`** — Galactic core band seen edge-on across an entire sky, dense dust lanes silhouetted against a pale amber-white stellar bulge, millions of unresolved stars, dark absorption nebulae cutting ragged channels through the band. Horizontal composition, band running left to right through the vertical centre, **seamlessly tiling left and right edges**. Cold violet outer haze falling to nothing at top and bottom.

**`sky_nebula_veil_violet`** — Isolated emission nebula veil, wispy filament structure, deep violet and cold magenta ionisation fronts, a few embedded hot blue stars, translucent gas with no hard edge, feathering to nothing at all four borders.

**`sky_nebula_veil_ember`** — Isolated supernova remnant veil, torn shell structure, ember orange and dull rust-red shock fronts, fine filamentary detail, one asymmetric bright limb, feathering to nothing at all four borders.

---

### L2 — Star accents (4 assets, 512×512, additive)

> **Mandatory clause (L2)** — prepend the **SPACE** preamble (§1a), append verbatim:
> *One single stellar grouping and nothing else. No ground, no horizon line, no terrain, no mountains, no rocks, no cliffs, no buildings, no structures, no wreckage, no machinery, no silhouettes, no foreground objects of any kind. The entire frame is open sky. No planets, no moons, no suns, no nebula veils, no comets. Pure black #000000 background, edge to edge; every element fades to pure black. Additive-blend asset — do NOT use a chroma key colour, and do not harden soft edges.*

Base starfield is **pre-rendered**, not art (§3b). These are hand-placed accents on top.

| ID | File |
|---|---|
| `sky_star_globular_cluster` | `sky/star_globular_cluster.png` |
| `sky_star_open_cluster` | `sky/star_open_cluster.png` |
| `sky_star_dense_knot` | `sky/star_dense_knot.png` |
| `sky_star_distant_galaxy` | `sky/star_distant_galaxy.png` |

**`sky_star_globular_cluster`** — Globular star cluster, spherical concentration of thousands of resolved pinpoint stars, blazing unresolved core falling off to sparse outliers, warm white and pale gold, no nebulosity.

**`sky_star_open_cluster`** — Young open star cluster, few dozen resolved hot blue-white stars in a loose irregular grouping, faint residual blue reflection nebulosity between them.

**`sky_star_dense_knot`** — Dense knot of unresolved starlight, milky luminous patch with a granular stellar texture, cold neutral white, soft edged, no discrete bright stars.

**`sky_star_distant_galaxy`** — Distant spiral galaxy seen at a steep oblique angle, tightly wound dust arms, pale core bulge, very low surface brightness, small in frame, cold neutral white with faint rust in the arms.

---

### L3 — Celestial bodies (10 assets, alpha)

> **Mandatory clause (L3)** — prepend the **SPACE** preamble (§1a), append verbatim:
> *Exactly one celestial body, centred and isolated. No ground, no horizon line, no terrain, no mountains, no rocks, no cliffs, no buildings, no structures, no wreckage, no machinery, no silhouettes, no foreground objects of any kind. The entire frame is open sky. No other celestial bodies, no stars, no nebula, no background sky detail whatsoever.*
>
> **Background depends on the body** — this layer is split:
>
> | Assets | Nature | Background | Blend |
> |---|---|---|---|
> | `sun_primary`, `sun_dwarf`, `ring_arc` | pure emitted light with soft corona/falloff | **black `#000000`**, fading to black | additive |
> | all planets, moons, `mothership_derelict` | opaque lit solid with a hard terminator | **green `#00FF00`** | alpha |
>
> For the green ones append: *Flat pure chroma green #00FF00 filling every pixel not covered by the subject, edge to edge; anything that fades out must fade to green, never to black or dark sky. No green anywhere in the subject. No glow spill, shadow or gradient on the green.*
> For the black ones append: *Pure black #000000 background, edge to edge; every element fades to pure black. Additive-blend asset — do NOT use a chroma key colour, and do not harden soft edges.*

Seeded per run: a given run picks 1–2 suns, 0–3 moons, 0–2 planets. Not all appear together.

| ID | File | Size | Role |
|---|---|---|---|
| `sky_body_sun_primary` | `sky/body_sun_primary.png` | 1024² | drives `directionalLight` |
| `sky_body_sun_dwarf` | `sky/body_sun_dwarf.png` | 512² | twin-sun companion |
| `sky_body_gasgiant_ringed` | `sky/body_gasgiant_ringed.png` | 2048² | dominant landmark |
| `sky_body_moon_cratered_large` | `sky/body_moon_cratered_large.png` | 1024² | |
| `sky_body_moon_cratered_small` | `sky/body_moon_cratered_small.png` | 512² | |
| `sky_body_moon_shattered` | `sky/body_moon_shattered.png` | 1024² | broken moon + debris belt |
| `sky_body_planet_rust` | `sky/body_planet_rust.png` | 1024² | |
| `sky_body_planet_dead_ocean` | `sky/body_planet_dead_ocean.png` | 1024² | |
| `sky_body_ring_arc` | `sky/body_ring_arc.png` | 4096×512 | planetary ring, edge-on across sky |
| `sky_body_mothership_derelict` | `sky/body_mothership_derelict.png` | 2048² | **narrative** — director event |

**`sky_body_sun_primary`** — Alien star disc seen through thin atmosphere, small hard-edged photosphere in pale gold-white, granulation texture visible on the disc, tight chromospheric rim, one asymmetric prominence arc, minimal surrounding scatter halo. Centred, circular.

**`sky_body_sun_dwarf`** — Small red dwarf companion star, dull ember-orange disc, noticeably dimmer and smaller than a primary star, faint mottled surface, tight thin corona, no prominences. Centred, circular.

**`sky_body_gasgiant_ringed`** — Ringed gas giant filling most of frame, banded turbulent atmosphere in bruised ochre, rust and slate grey, one large persistent storm oval, sharp-edged ice ring system crossing at a shallow oblique angle with a visible Cassini-style gap, hard terminator with the night side falling to unlit black, ring shadow cast across the banded cloud tops.

**`sky_body_moon_cratered_large`** — Airless cratered moon, heavily impacted bone-grey regolith, one dominant young crater with bright ray ejecta, sharp shadowed terminator at three-quarter phase, no atmosphere haze at the limb.

**`sky_body_moon_cratered_small`** — Small irregular airless moonlet, potato silhouette, saturated small-crater surface, dull charcoal-grey, sharp terminator, no atmospheric limb.

**`sky_body_moon_shattered`** — Catastrophically shattered moon, the sphere split into several large drifting fragments with raw un-weathered interior rock exposed on the fracture faces, a thin dispersing belt of smaller debris trailing along the orbital path, cold grey and iron, faint dust glow between fragments.

**`sky_body_planet_rust`** — Arid terrestrial planet, oxidised rust-red and ochre surface, enormous canyon system and a dust storm smearing one hemisphere, thin pale atmospheric limb, polar frost cap, hard terminator.

**`sky_body_planet_dead_ocean`** — Terrestrial planet with drained ocean basins, dry white salt flats where seas used to be, dark continental highlands, thin cold blue atmospheric limb, no cloud, one visible impact basin, hard terminator.

**`sky_body_ring_arc`** — Planetary ring system seen from inside the ring plane, a razor-thin luminous band running edge to edge across the whole frame, fine radial banding and density waves, ice-white with faint ochre, brightest near centre, **seamlessly tiling left and right edges**, falling to nothing above and below the band.

**`sky_body_mothership_derelict`** — Derelict colony mothership in high orbit, vast angular salvage-built hull, spine-mounted habitation drums, one catastrophic hull breach venting a frozen debris plume, dead running lights except two dim amber beacons, worn charcoal and bone-metal panelling, seen at a three-quarter angle, hard sunlight from one side and unlit black on the other.

---

### L4 — Transients (7 animated sheets, additive)

> **Mandatory clause (L4)** — prepend the **SPACE** preamble (§1a), append verbatim:
> *One single transient event and nothing else. No ground, no horizon line, no terrain, no mountains, no rocks, no cliffs, no buildings, no structures, no wreckage, no machinery, no silhouettes, no foreground objects of any kind. The entire frame is open sky. No planets, no moons, no nebula, no background starfield — the sequence composites over layers that already supply those. Pure black #000000 background, edge to edge; every element fades to pure black. Additive-blend asset — do NOT use a chroma key colour, and do not harden soft edges. Uniform cell size across the grid, no frame numbers, no gutters, padding or dividing lines between cells. The subject keeps the same anchor point in every cell -- it must not drift within its own frame, because motion across the sky comes from the runtime path, not from the art. Frame 1 must not be blank, and the final frame should fall to near-black so playback ends by fading rather than popping.*

Sheets are **atlas grids**, using the common animation-sheet contract in §1b.

> **GPU-safe grids.** Revised 2026-08-25 — a WebGL2 context on this
> machine reports `MAX_TEXTURE_SIZE` **8192**, and the original 8192-wide strips sat exactly
> on that limit with no headroom; a GPU reporting 4096 could not upload them at all, and an
> over-limit texture fails outright rather than degrading. Same frames, same cell size, same
> pixel budget — no dimension now exceeds 4096. **Frame order is left-to-right, then
> top-to-bottom.** See `docs/sky-motion-and-transient-animation-plan-2026-08-25.md` §1.

| ID | File | Sheet | Grid | Cell | Frames | FPS | Playback | Runtime output |
|---|---|---|---|---|---:|---:|---|---|
| `sky_fx_comet_longtail` | `sky/fx_comet_longtail.png` | 2048×1024 | 4×2 | 512² | 8 | 12 | `once` | Billboard following a seeded sky-crossing path |
| `sky_fx_meteor_shower` | `sky/fx_meteor_shower.png` | 2048×1024 | 4×2 | 512² | 8 | 12 | `once` | Billboard aligned to its seeded radiant |
| `sky_fx_reentry_debris` | `sky/fx_reentry_debris.png` | 2560×1024 | 5×2 | 512² | 10 | 12 | `once` | Billboard following a descending re-entry path |
| `sky_fx_satellite_tumble` | `sky/fx_satellite_tumble.png` | 1024×1024 | 4×4 | 256² | 16 | 12 | `loop` | Small billboard drifting on its orbit track |
| `sky_fx_mothership_transit` | `sky/fx_mothership_transit.png` | 2048×2048 | 4×4 | 512² | 16 | 12 | `once` | Director-triggered overhead-transit billboard |
| `sky_fx_spore_bloom_zenith` | `sky/fx_spore_bloom_zenith.png` | 2048×1536 | 4×3 | 512² | 12 | 12 | `hold` | Director-triggered zenith billboard; final stain persists |
| `sky_fx_sun_gutter` | `sky/fx_sun_gutter.png` | 2048×2048 | 4×4 | 512² | 16 | 12 | `once` | Director-triggered billboard anchored to the primary sun |

**`sky_fx_comet_longtail`** — 8-frame animation atlas of a comet crossing the sky. Bright compact coma with a long straight ion tail in cold cyan-white and a shorter curved dust tail in dull gold. Across the 8 frames the tail lengthens and the coma brightens as it approaches perihelion. Uniform cell size, subject centred in each cell, consistent scale between frames.

**`sky_fx_meteor_shower`** — 8-frame animation atlas of a meteor shower burst. Multiple thin incandescent streaks entering at a shared radiant angle, each igniting, flaring white-hot and burning out over the sequence, a few leaving brief persistent ionisation trails. Streaks at varied lengths and brightnesses. Uniform cell size.

**`sky_fx_reentry_debris`** — 10-frame animation atlas of orbital wreckage re-entering the atmosphere. A tumbling metal fragment develops an incandescent bow shock, sheds burning pieces that trail their own smaller tails, and fragments progressively across the sequence into a spreading cluster of glowing streaks. Ember orange and white-hot core. Uniform cell size.

**`sky_fx_satellite_tumble`** — 16-frame animation atlas of a derelict satellite tumbling in orbit, seen at very small scale. Slow end-over-end rotation across the frames, a solar panel catching a hard specular glint on frames 4 and 12, otherwise a dim grey silhouette. Uniform cell size, consistent scale.

**`sky_fx_mothership_transit`** — 16-frame animation atlas of the derelict mothership passing overhead low in the sky. Across the sequence it grows, rotates slowly to present its breached flank, vents a fresh debris plume around frames 9–11, and recedes. Vast angular salvage hull, dim amber beacons, hard low-angle sunlight. Uniform cell size, smooth scale progression.

**`sky_fx_spore_bloom_zenith`** — 12-frame animation atlas of an organic spore bloom staining the upper sky. Translucent membranous veils unfurl from a single point, spreading and thinning across the sequence, fine hyphal filament structure, capillary vein detail, sickly **amber-yellow and bruised violet** (no green in subject — runtime tints to green). Ends as a diffuse stain covering the cell. Uniform cell size.

**`sky_fx_sun_gutter`** — 16-frame animation atlas of a star dying. The disc mottles with expanding dark convection cells, the chromospheric rim collapses inward, colour drains from gold-white through ember orange to dull rust, a final asymmetric flare erupts around frame 12, and the disc settles to a cold dark ember with only a faint ring of residual heat. Uniform cell size, consistent disc position.

---

### L5 — Aurora masks (3 assets, 2048×512, MASK, additive)

> **Mandatory clause (L5)** — prepend the **SPACE** preamble (§1a), append verbatim:
> *One single aurora form and nothing else. No ground, no horizon line, no terrain, no mountains, no rocks, no cliffs, no buildings, no structures, no wreckage, no machinery, no silhouettes, no foreground objects of any kind. The entire frame is open sky. No stars, no nebula, no cloud, no celestial bodies. Pure grayscale — white where brightest, pure black #000000 where absent, no colour anywhere. Additive-blend luminance mask — do NOT use a chroma key colour.*

Aurora motion is procedural; these supply the **shape**. Grayscale on green.

| ID | File |
|---|---|
| `sky_aurora_curtain_tall` | `sky/aurora_curtain_tall.png` |
| `sky_aurora_curtain_ribbon` | `sky/aurora_curtain_ribbon.png` |
| `sky_aurora_sheet_diffuse` | `sky/aurora_sheet_diffuse.png` |

**`sky_aurora_curtain_tall`** — Grayscale luminance mask of tall aurora curtains, vertical ray structure with fine striations, brightest along a sharply defined lower edge and fading upward to nothing, several overlapping folds at different depths. Pure grayscale, white where brightest, black where absent. Seamlessly tiling left and right edges.

**`sky_aurora_curtain_ribbon`** — Grayscale luminance mask of a single aurora ribbon folded into tight serpentine switchbacks, crisp bright leading edge, soft trailing wash, horizontal composition running edge to edge. Pure grayscale. Seamlessly tiling left and right edges.

**`sky_aurora_sheet_diffuse`** — Grayscale luminance mask of a broad structureless aurora glow sheet, very soft, no ray structure, gentle brightness undulations across its width, fading to nothing at top and bottom. Pure grayscale. Seamlessly tiling left and right edges.

---

### L6 — High cloud (3 assets, 2048×512, seamless, alpha)

> **Mandatory clause (L6)** — prepend the **ATMOSPHERE** preamble (§1a), append verbatim:
> *One single cloud form and nothing else. No ground, no horizon line, no terrain, no mountains, no rocks, no cliffs, no buildings, no structures, no wreckage, no machinery, no silhouettes, no foreground objects of any kind. The entire frame is open sky. No stars, no nebula, no celestial bodies, no lightning, no birds. Flat pure chroma green #00FF00 filling every pixel not covered by the subject, edge to edge; anything that fades out must fade to green, never to black or dark sky. No green anywhere in the subject. No glow spill, shadow or gradient on the green.*

| ID | File |
|---|---|
| `sky_cloud_cirrus_thin` | `sky/cloud_cirrus_thin.png` |
| `sky_cloud_cirrus_streaked` | `sky/cloud_cirrus_streaked.png` |
| `sky_cloud_ice_veil` | `sky/cloud_ice_veil.png` |

**`sky_cloud_cirrus_thin`** — Sparse high-altitude cirrus, thin translucent ice filaments with fibrous hooked ends, mostly empty sky between wisps, very low opacity, cold neutral white. Horizontal band composition, seamlessly tiling left and right edges, feathering to nothing at top and bottom.

**`sky_cloud_cirrus_streaked`** — Dense wind-sheared cirrus streaks, long parallel filaments all combed in one direction, fibrous texture, moderate opacity, cold white with faint amber underlighting along the lower edges. Seamlessly tiling left and right edges.

**`sky_cloud_ice_veil`** — Diamond-dust ice crystal veil, near-featureless translucent haze with a faint halo brightening through it, extremely low opacity, cold blue-white. Seamlessly tiling left and right edges.

---

### L7 — Storm decks (5 assets, 2048×512, seamless, alpha) — **biome-scoped**

> **Mandatory clause (L7)** — prepend the **ATMOSPHERE** preamble (§1a), append verbatim:
> *One single storm formation and nothing else. No ground, no horizon line, no terrain, no mountains, no rocks, no cliffs, no buildings, no structures, no wreckage, no machinery, no silhouettes, no foreground objects of any kind. The entire frame is open sky. No stars, no nebula, no celestial bodies, no visible lightning bolt — lightning is a separate layer. Flat pure chroma green #00FF00 filling every pixel not covered by the subject, edge to edge; anything that fades out must fade to green, never to black or dark sky. No green anywhere in the subject. No glow spill, shadow or gradient on the green.*

Bound to the existing `WEATHER_PROFILES` states (`src/threeGame.js:610`).

| ID | File | Weather state | Biome bias |
|---|---|---|---|
| `sky_storm_dust_wall` | `sky/storm_dust_wall.png` | `rainstorm` / dust | ACTIVE |
| `sky_storm_anvil_front` | `sky/storm_anvil_front.png` | `rainstorm` | ACTIVE |
| `sky_storm_ice_haze` | `sky/storm_ice_haze.png` | `snow` | CRYO |
| `sky_storm_spore_veil` | `sky/storm_spore_veil.png` | `spore_drift` | BIO |
| `sky_storm_ash_fall` | `sky/storm_ash_fall.png` | `fog_gust` | all |

**`sky_storm_dust_wall`** — Approaching haboob dust wall, a towering opaque roiling front of ochre and rust particulate with a bulbous churning leading edge, darker and denser at the base, ragged tendrils tearing off the top, completely blotting out everything behind it. Horizontal composition, seamlessly tiling left and right edges, dense at bottom feathering to nothing at top.

**`sky_storm_anvil_front`** — Massive anvil-topped storm cell, hard sheared flat top, deeply shadowed turbulent underbelly, mammatus pouches hanging beneath, bruised slate and charcoal with dull amber underlighting from below. Seamlessly tiling left and right edges.

**`sky_storm_ice_haze`** — Frozen ground blizzard haze, streaming horizontal sheets of ice crystal whiteout, near-total opacity at the base thinning rapidly with altitude, faint halo brightening, cold blue-white and pale grey. Seamlessly tiling left and right edges.

**`sky_storm_spore_veil`** — Airborne spore bloom drift, semi-translucent hanging curtains of fine organic particulate, denser clotted masses suspended within thinner veils, faint capillary filament structure, sickly **amber-yellow and bruised ochre** (no green in subject — runtime tints). Seamlessly tiling left and right edges.

**`sky_storm_ash_fall`** — Volcanic ash fall curtain, dense grey-brown particulate descending in ragged vertical streaks, uneven density with clearer channels between falls, dull charcoal with faint ember glow low in the frame. Seamlessly tiling left and right edges.

---

### L8 — Far horizon (6 assets, 2048×512, **MASK**, seamless) — **biome-scoped**

> **Mandatory clause (L8)** — prepend the **TERRAIN** preamble (§1a), append verbatim:
> *One single distant landform band and nothing else. No sky detail of any kind — no stars, no nebula, no clouds, no celestial bodies, no aurora; the entire area above the skyline is flat pure chroma green. No mid-distance or foreground elements, no structures, no wreckage, no vegetation — this is the furthest terrain band only. Pure grayscale silhouette with internal tonal detail, tones compressed into the light-grey range by atmospheric perspective, no colour anywhere. Flat pure chroma green #00FF00 filling every pixel not covered by the subject, edge to edge; anything that fades out must fade to green, never to black or dark sky. No green anywhere in the subject. No glow spill, shadow or gradient on the green.*

Grayscale. Runtime tints to `skyState.horizonColor`. Silhouette must **bleed off the bottom edge**.

| ID | File | Biome |
|---|---|---|
| `sky_far_mesa_ridge` | `sky/far_mesa_ridge.png` | ACTIVE |
| `sky_far_crater_rim` | `sky/far_crater_rim.png` | ACTIVE |
| `sky_far_glacier_wall` | `sky/far_glacier_wall.png` | CRYO |
| `sky_far_icefall_range` | `sky/far_icefall_range.png` | CRYO |
| `sky_far_fungal_massif` | `sky/far_fungal_massif.png` | BIO |
| `sky_far_bone_reef` | `sky/far_bone_reef.png` | BIO |

**`sky_far_mesa_ridge`** — Grayscale luminance mask of a distant eroded mesa and butte range on the horizon, flat-topped stepped landforms at varied heights, deep talus aprons, heavy atmospheric perspective so tone is compressed into the light-grey range with only faint internal detail. Wide panoramic composition, silhouette bleeding off the bottom edge, empty above the skyline, seamlessly tiling left and right edges.

**`sky_far_crater_rim`** — Grayscale luminance mask of a colossal distant impact crater rim, a long shallow arc of uplifted terraced wall with slump blocks, one breached section, heavy atmospheric perspective, compressed light-grey tonal range. Bleeding off the bottom edge, seamlessly tiling left and right edges.

**`sky_far_glacier_wall`** — Grayscale luminance mask of a distant continental glacier front, a long unbroken calving wall with vertical fracture columns and shear planes, jagged seracs along the top, heavy atmospheric perspective, compressed light-grey tonal range. Bleeding off the bottom edge, seamlessly tiling left and right edges.

**`sky_far_icefall_range`** — Grayscale luminance mask of a distant range of ice-sheathed peaks, sharp pyramidal summits, hanging glaciers in the couloirs, wind-scoured ridgelines, heavy atmospheric perspective, compressed light-grey tonal range. Bleeding off the bottom edge, seamlessly tiling left and right edges.

**`sky_far_fungal_massif`** — Grayscale luminance mask of distant colossal fungal landforms on the horizon, enormous bracket-shelf structures stacked into mountain-scale masses, drooping organic overhangs, gill-like vertical striations, heavy atmospheric perspective, compressed light-grey tonal range. Bleeding off the bottom edge, seamlessly tiling left and right edges.

**`sky_far_bone_reef`** — Grayscale luminance mask of a distant reef of colossal fossilised skeletal structures, rib-arch formations and vertebral columns at mountain scale, porous weathered texture, heavy atmospheric perspective, compressed light-grey tonal range. Bleeding off the bottom edge, seamlessly tiling left and right edges.

---

### L9 — Mid horizon (6 assets, 2048×512, **MASK**, seamless) — **biome-scoped**

> **Mandatory clause (L9)** — prepend the **TERRAIN** preamble (§1a), append verbatim:
> *One single mid-distance silhouette band and nothing else. No sky detail of any kind — no stars, no nebula, no clouds, no celestial bodies, no aurora; the entire area above the skyline is flat pure chroma green. No distant mountain range behind it and no foreground vegetation or rocks in front of it — those are separate layers. Pure grayscale silhouette with internal tonal detail in the mid-grey range, no colour anywhere. Flat pure chroma green #00FF00 filling every pixel not covered by the subject, edge to edge; anything that fades out must fade to green, never to black or dark sky. No green anywhere in the subject. No glow spill, shadow or gradient on the green.*

Grayscale, mid-tone range — more contrast than L8, less than L10. Bleeds off bottom edge.

| ID | File | Biome |
|---|---|---|
| `sky_mid_wreck_skyline` | `sky/mid_wreck_skyline.png` | ACTIVE |
| `sky_mid_refinery_masts` | `sky/mid_refinery_masts.png` | ACTIVE |
| `sky_mid_frozen_rig` | `sky/mid_frozen_rig.png` | CRYO |
| `sky_mid_ice_spires` | `sky/mid_ice_spires.png` | CRYO |
| `sky_mid_hive_spires` | `sky/mid_hive_spires.png` | BIO |
| `sky_mid_growth_towers` | `sky/mid_growth_towers.png` | BIO |

**`sky_mid_wreck_skyline`** — Grayscale luminance mask of a middle-distance skyline of crashed colony-ship wreckage, enormous broken hull sections half-buried at varied angles, exposed structural ribs, a snapped drive spine leaning against the sky, scattered smaller debris between the masses. Mid-grey tonal range with legible internal structure. Bleeding off the bottom edge, seamlessly tiling left and right edges.

**`sky_mid_refinery_masts`** — Grayscale luminance mask of a middle-distance industrial refinery skyline, lattice towers, tall flare stacks, spherical pressure tanks, a tangle of overhead pipe runs and catwalks connecting them, guy-wired antenna masts. Mid-grey tonal range with legible internal structure. Bleeding off the bottom edge, seamlessly tiling left and right edges.

**`sky_mid_frozen_rig`** — Grayscale luminance mask of a middle-distance abandoned drilling rig frozen solid, lattice derrick sheathed in metres of accreted ice, collapsed crew modules, ice-laden cables sagging between structures, drifted snow banked against the windward faces. Mid-grey tonal range. Bleeding off the bottom edge, seamlessly tiling left and right edges.

**`sky_mid_ice_spires`** — Grayscale luminance mask of a middle-distance field of natural ice spires and penitentes, tall irregular blades of ice leaning at a common angle, varied heights, translucent internal banding suggested through tonal variation. Mid-grey tonal range. Bleeding off the bottom edge, seamlessly tiling left and right edges.

**`sky_mid_hive_spires`** — Grayscale luminance mask of a middle-distance hive spire cluster, tapering chitinous towers of layered secreted resin, irregular vent apertures near the summits, buttressed organic bases, connecting membranous bridges between spires. Mid-grey tonal range with legible internal structure. Bleeding off the bottom edge, seamlessly tiling left and right edges.

**`sky_mid_growth_towers`** — Grayscale luminance mask of a middle-distance stand of colossal growth towers, swollen segmented organic columns bulging at irregular intervals, split seams venting drifting particulate, drooping sacs suspended from the upper segments. Mid-grey tonal range. Bleeding off the bottom edge, seamlessly tiling left and right edges.

---

### L10 — Near horizon (6 assets, 2048×768, **full RGBA**, seamless) — **biome-scoped**

> **Mandatory clause (L10)** — prepend the **TERRAIN** preamble (§1a), append verbatim:
> *One single near-foreground silhouette band and nothing else. No sky detail of any kind — no stars, no nebula, no clouds, no celestial bodies, no aurora; the entire area above the skyline is flat pure chroma green. No distant mountains, no mid-distance skyline or structures behind it — those are separate layers. No ground plane extending toward the viewer; the forms rise directly out of the bottom edge. Full colour, highest detail of the three horizon bands. Flat pure chroma green #00FF00 filling every pixel not covered by the subject, edge to edge; anything that fades out must fade to green, never to black or dark sky. No green anywhere in the subject. No glow spill, shadow or gradient on the green.*

Full colour, highest detail, strongest parallax. Bleeds off bottom edge.

| ID | File | Biome |
|---|---|---|
| `sky_near_rock_teeth` | `sky/near_rock_teeth.png` | ACTIVE |
| `sky_near_antenna_line` | `sky/near_antenna_line.png` | ACTIVE |
| `sky_near_frost_pines` | `sky/near_frost_pines.png` | CRYO |
| `sky_near_icicle_palisade` | `sky/near_icicle_palisade.png` | CRYO |
| `sky_near_spore_forest` | `sky/near_spore_forest.png` | BIO |
| `sky_near_vein_thicket` | `sky/near_vein_thicket.png` | BIO |

**`sky_near_rock_teeth`** — Near-foreground line of jagged wind-carved rock teeth, sharp fractured basalt fins at varied heights and spacings, undercut bases, wind-polished faces, dark charcoal and iron-brown with mineral staining, individual cracks and flaking readable. Wide panoramic composition, bleeding off the bottom edge, empty sky above the skyline, seamlessly tiling left and right edges.

**`sky_near_antenna_line`** — Near-foreground line of derelict communication masts and salvage antenna towers, guy wires sagging between them, dish arrays hanging at broken angles, corroded lattice with legible rivets and rust runs, one collapsed mast folded over its neighbour, dull charcoal and oxidised rust with two dim amber warning lamps. Bleeding off the bottom edge, seamlessly tiling left and right edges.

**`sky_near_frost_pines`** — Near-foreground tree line of frost-killed alien conifers, bare angular branch structures heavily rimed with hoarfrost, trunks at varied leans and heights, a few snapped mid-trunk, dark grey-brown bark under blue-white ice accretion, individual branches readable against the sky. Bleeding off the bottom edge, seamlessly tiling left and right edges.

**`sky_near_icicle_palisade`** — Near-foreground palisade of enormous ground-anchored icicles and ice columns, varied thickness and height, translucent blue-white with internal fracture planes and trapped air bubbles catching light, dark rock visible at the bases. Bleeding off the bottom edge, seamlessly tiling left and right edges.

**`sky_near_spore_forest`** — Near-foreground tree line of towering alien fungal growths, tall slender stalks flaring into ragged drooping caps, hanging spore veils beneath the caps, fibrous stalk texture, dull ochre and bruised violet with faint amber luminescence in the gills (no green in subject). Varied heights and leans, individual forms readable. Bleeding off the bottom edge, seamlessly tiling left and right edges.

**`sky_near_vein_thicket`** — Near-foreground thicket of thick vascular organic tendrils rising from the ground, twisting knotted vine-like columns with visible pulsing capillary structure, smaller filaments branching between them, wet membranous surface, dull rust-red and bruised violet with faint amber capillary luminescence (no green in subject). Bleeding off the bottom edge, seamlessly tiling left and right edges.

---

### L11 — Lightning (3 sheets, additive)

> **Mandatory clause (L11)** — prepend the **ATMOSPHERE** preamble (§1a), append verbatim:
> *One single discharge and nothing else. No ground, no horizon line, no terrain, no mountains, no rocks, no cliffs, no buildings, no structures, no wreckage, no machinery, no silhouettes, no foreground objects of any kind. The entire frame is open sky. No cloud mass rendered, no rain, no stars — only the luminous discharge itself, which composites over the storm layer that already supplies the cloud. Pure black #000000 background, edge to edge; every element fades to pure black. Additive-blend asset — do NOT use a chroma key colour, and do not harden soft edges. Uniform cell size across the grid, no frame numbers, no gutters, padding or dividing lines between cells. The subject keeps the same anchor point in every cell. Frame 1 must not be blank, and the final frame should fall to near-black.*

These sheets use the same §1b atlas contract and reading order as L4.

| ID | File | Sheet | Grid | Cell | Frames | FPS | Playback | Runtime output |
|---|---|---|---|---|---:|---:|---|---|
| `sky_fx_lightning_fork` | `sky/fx_lightning_fork.png` | 1536×2048 | 3×2 | 512×1024 | 6 | 12 | `once` | Tall billboard anchored below its storm source |
| `sky_fx_lightning_sheet` | `sky/fx_lightning_sheet.png` | 2048×1024 | 2×2 | 1024×512 | 4 | 12 | `once` | Wide storm-band overlay; never a free billboard |
| `sky_fx_lightning_crawler` | `sky/fx_lightning_crawler.png` | 4096×512 | 4×2 | 1024×256 | 8 | 12 | `once` | Wide billboard aligned to the cloud base |

**`sky_fx_lightning_fork`** — 6-frame animation atlas of a forked lightning strike. Frame 1 a faint stepped leader, frames 2–3 the full return stroke at maximum brightness with a blazing white core and violet-blue corona, frames 4–6 decaying with the branches dimming from the tips inward. Sharp branching fractal geometry, tall vertical composition per cell. Uniform cell size, strike anchored at the same position in every frame.

**`sky_fx_lightning_sheet`** — 4-frame animation atlas of in-cloud sheet lightning. The discharge illuminates the cloud mass from within, brightest at frame 2, revealing the internal turbulent structure as a diffuse glow with no visible bolt, decaying to nothing by frame 4. Wide horizontal composition per cell, cold violet-white. Uniform cell size.

**`sky_fx_lightning_crawler`** — 8-frame animation atlas of a spider-lightning crawler propagating horizontally along a cloud base. The discharge extends progressively across the frames, trailing branching filaments downward, brightest at the advancing tip, earlier sections decaying behind it. Wide horizontal composition per cell, violet-white. Uniform cell size.

---

### L12 — Lens elements (4 assets, 512×512, additive)

> **Mandatory clause (L12)** — prepend the **ATMOSPHERE** preamble (§1a), append verbatim:
> *One single optical artefact and nothing else. No ground, no horizon line, no terrain, no mountains, no rocks, no cliffs, no buildings, no structures, no wreckage, no machinery, no silhouettes, no foreground objects of any kind. The entire frame is open sky. No stars, no nebula, no celestial bodies, no camera, no lens hardware — only the artefact itself. Pure black #000000 background, edge to edge; every element fades to pure black. Additive-blend asset — do NOT use a chroma key colour, and do not harden soft edges.*

| ID | File |
|---|---|
| `sky_lens_bloom_core` | `sky/lens_bloom_core.png` |
| `sky_lens_halo_ring` | `sky/lens_halo_ring.png` |
| `sky_lens_hex_ghost` | `sky/lens_hex_ghost.png` |
| `sky_lens_streak_anamorphic` | `sky/lens_streak_anamorphic.png` |

**`sky_lens_bloom_core`** — Lens bloom core, a bright radially symmetric glow with fine radiating diffraction spikes from an aperture, hottest white at centre falling smoothly to nothing, faint chromatic fringing at the outer edge. Centred, circular.

**`sky_lens_halo_ring`** — Lens halo ring, a thin soft-edged annulus with visible chromatic dispersion across its width from warm inner to cool outer, hollow and dark at the centre. Centred, circular.

**`sky_lens_hex_ghost`** — Hexagonal aperture ghost, a flat-shaded hexagon with a soft edge and faint internal iris banding, low opacity, subtle warm-to-cool chromatic shift across the shape. Centred.

**`sky_lens_streak_anamorphic`** — Anamorphic lens streak, a long thin horizontal light streak with a bright tight core and rapid vertical falloff, cold blue-cyan, extending edge to edge horizontally, fading to nothing at both ends.

---

## 5. Totals & memory budget

| Layer | Assets | Format | Est. VRAM (RGBA, uncompressed) |
|---|---|---|---|
| L1 deepfield | 3 | RGBA 2048×1024 | 24 MB |
| L2 star accents | 4 | RGBA 512² | 4 MB |
| L3 bodies | 10 | RGBA mixed | ~46 MB |
| L4 transients | 7 | RGBA sheets | ~72 MB |
| L5 aurora | 3 | **R8** 2048×512 | 3 MB |
| L6 highcloud | 3 | RGBA 2048×512 | 12 MB |
| L7 storm | 5 | RGBA 2048×512 | 20 MB |
| L8 far horizon | 6 | **R8** 2048×512 | 6 MB |
| L9 mid horizon | 6 | **R8** 2048×512 | 6 MB |
| L10 near horizon | 6 | RGBA 2048×768 | 36 MB |
| L11 lightning | 3 | RGBA sheets | ~24 MB |
| L12 lens | 4 | RGBA 512² | 4 MB |
| **Total** | **60** | | **~257 MB** |

**257 MB uncompressed is not shippable on Steam Deck.** Three mitigations, all required:

1. **KTX2 / Basis compression** on everything → roughly 6:1 → **~43 MB**. The project already tracks GPU memory via `src/gpuMemoryBudget.js`; the sky rig must register with it.
2. **Biome-scoped loading.** L7–L10 are biome-specific (23 of the 60 assets). Load only the current biome's set plus the next one along `BIOME_ORDER`; drop the third. Cuts the biome-scoped share by ~⅓.
3. **Transients stream on demand.** L4 is 72 MB and each sheet plays for a few seconds every few minutes. Load on schedule, release after play. Only `sky_fx_mothership_transit` and `sky_fx_sun_gutter` are director-triggered and can be preloaded when their beat arms.

Post-mitigation resident budget target: **~28 MB**.

> **Additive layers ship without an alpha channel.** L1, L2, L4, L5, L11 and L12 blend additively against black, so they need no alpha — store them as RGB (or R8 for the grayscale aurora masks). That is a further 25% off ~127 MB of the uncompressed total before compression even runs.


---

## 6. Production order

> **Status 2026-08-25.** All 60 assets are delivered and audited (§1c). The 10 L4/L11 animation sheets are reflowed into the standardized GPU-safe grids above, so step 7 is no longer asset-blocked. The runtime rig is built and wired: `src/sky/skyProfile.js`, `skyState.js`, `skyLayers.js`, `skyDome.js`, plus `setupSkyRig`/`updateSky` in `threeGame.js`. 64 unit tests + 3 e2e specs (`tests/e2e/sky-dome.spec.js`). Steps 1–8 have their required assets; 9–10 remain runtime work.
>
> Three bugs found only by rendering it, all fixed and now covered by tests:
> 1. **Sky drew over the world.** three.js draws transparent materials after all opaque geometry and `renderOrder` only sorts within a list, so `depthTest: false` let the horizon paint over the maze walls. Layers now depth-test; only the base dome does not.
> 2. **Night blew out to white.** Additive blending adds `src * srcAlpha`, and the keyed art is near-opaque, so alpha barely attenuates — three stacked layers saturated the sky. Additive layers are now dimmed through RGB, with gains well under 1.
> 3. **A hard seam across the sky.** Abutting elevation bands left an uncovered ring showing the bare base dome. Bands now deliberately overlap.


Assets are useless without the rig, and the rig is testable without assets. Suggested sequence:

1. **L0 base + fog match.** Procedural only, zero assets. Immediately fixes the flat-colour problem.
2. **L8–L10 horizon masks, ACTIVE biome only** (6 assets). Highest visual payoff per asset — this is where the camera actually looks.
3. **L2 star bake + L1 deepfield** (3 assets). Delivers "deep space".
4. **L3 bodies** (10 assets). Delivers "suns".
5. **L6–L7 cloud and storm** (8 assets) + wire the front scheduler, retiring `WEATHER_FORCED_STATE`.
6. **CRYO and BIO horizon sets** (12 assets).
7. **L4 transients + L11 lightning + L12 lens** (14 assets).
8. **L5 aurora** (3 assets).
9. **Environment cubemap bake** → `scene.environment`.
10. **Director events** — mothership transit, spore bloom, sun gutter.

---

## 7. Open items

- **Regenerate `sky_nebula_band_core`.** The first pass composited L1 + L8 + L9 + L10 into one frame and faded to black rather than to a key colour. Under the corrected rules it is an additive black-background asset with the L1 mandatory clause, so it needs no key at all — the terrain content is what must go. See §1.

- **Armory:** scoped out. `src/armoryScene.js:133` is an explicit subterranean bunker whose backdrop wall was deliberately removed so per-class concept art shows through a transparent canvas. A sky there is fictionally wrong and fights that art. If a skylight or viewport treatment is wanted instead, that is a separate asset set.
- **`src/scene.js`** (`GameScene`) is dead code — nothing imports it. Not an integration target.
- **Isometric camera:** the ortho gameplay camera looks down steeply and shows little sky. L8–L10 still matter there (they meet the terrain edge); L1–L5 largely do not. Consider skipping the space layers entirely in isometric mode as a free perf win.
