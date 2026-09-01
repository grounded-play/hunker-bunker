# Sky Motion & Transient Animation — Implementation Plan

**Date:** 2026-08-25
**Status:** Asset format complete; animation runtime pre-implementation
**Companion:** `docs/sky-layer-and-weather-asset-catalog-2026-08-25.md` (asset contract)
**Branch:** `dev/sprint-31`

---

## Status — 2026-08-25 evening

| Part | State |
|---|---|
| **A — cloud cinemagraphs** | **Shipped.** `skyCloudMaterial.js` (dual-rate scroll + domain warp + horizon squash), `wind` and `flash` on `skyState`, animated layers flagged in `skyLayers`, rig wired, `delta` threaded through `updateSky`. |
| **B — celestial billboards** | **Shipped.** `skyBillboards.js` pool + `resolveSkyBodies`. The 10 body assets now render; they had been computed every frame and thrown away. |
| **C — transients** | **Shipped.** All 10 atlases delivered and audited. `skyTransients.js` (seeded schedule, paths, anchors, director pre-emption), `resolveSkyTransients`, billboard rendering, `threeGame.playSkyTransient`. Verified in-browser: 8/8 beats queue, activate and draw with correct per-grid UV windows. |
| **D — lightning** | Partly shipped: `skyState.flash` and the key-light boost are in, and the bolt atlases render as transients. Storm-triggered placement and cadence are untuned. |

### Atlas audit (rebuilt set)

All 10 validate: dimensions match the manifest exactly, alpha uniformly 255 (un-keyed, correct for additive), zero green residue, no interior blank frames. Per-frame luminance confirms the intended arcs — comet tail brightening 6 to 70, meteor igniting then burning out, sun gutter dimming 164 to 19, lightning peaking on frame 2.

Decode is not a concern: all 10 load in **98 ms total in parallel**.

Two art notes, neither blocking:

- `fx_lightning_crawler` is very dim overall (peak frame mean 10, against the fork's 57). It may not read on screen.
- `fx_mothership_transit` frames 1-3 and 15-16 are effectively invisible (mean under 1.0). That is a deliberate approach/recede fade, but it means the beat is imperceptible for its first ~19% and last ~12%.

### The sheet-vs-lifetime mapping

A comet holds 8 frames at 12fps -- 0.67s -- but crosses the sky over ~20s, and the art brief has its tail lengthening across the crossing. So `sheetTimeForTransient` **stretches** once-mode and hold-mode atlases across the transient's lifetime, while loop-mode atlases (the tumbling satellite) play at their true frame rate, because stretching a rotation over a 30s pass would look frozen. Conflating the sheet's timeline with the transient's is the mistake this function exists to prevent.

### Trigger fade-out (shipped 2026-08-26)

Trigger animations never loop; they run once and fade out over their tail rather than cutting on the last frame. Implemented as `transientEnvelope` (pure, in `skyTransients.js`) applied in `resolveSkyTransients`, with per-asset tail lengths — 14% for lightning, 30–34% for narrative beats, 24% default. See `docs/sky-fx-animation-classes-2026-08-26.md` §2b.

### Still to tune (visual, not correctness)

- The comet reads as a compact fireball rather than a tailed comet -- likely angular size and additive gain, not the art.
- `spore_bloom_zenith` is zenith-anchored, and the third-person camera almost never looks up. It may need a lower anchor to be seen at all.
- Lightning bolt placement relative to the storm deck is unverified.

**Verification:** 2316 unit tests across 268 files, `eslint` clean, zero console errors in-browser.

### Measured, not assumed: the drift calibration

Motion was verified by freezing the clock and camera in a real browser and diffing frame pairs 1.6s apart over the sky band (`scratch/sky_motion_probe.mjs`):

| Condition | mean abs delta | pixels changed |
|---|---|---|
| cloud layers hidden | 0.70 | 0.4% |
| clouds visible, calm | 92.9 | 74.0% |
| clouds visible, storm wind | 16.3 | 37.8% |

The first pass failed this test: calm wind measured **0.8% against a 0.4% baseline** — at `speed 0.12 x drift 0.010` a calm sky moved roughly 4px of a 2048 strip over 1.6s, indistinguishable from frozen, which is the exact problem the shader exists to solve. Drift coefficients were raised to 0.033/0.052 and `WIND_CALM_SPEED` to 0.24.

Note the storm row reads *lower* than calm despite moving faster: a dense dust wall is low-contrast, so fast motion produces small per-pixel deltas. The rows are not comparable to each other — only each against the hidden-layer baseline.

### Concurrent-edit collision

`src/sky/skySheets.js` and `skySheets.test.js` were rewritten by another agent mid-session. Their version is the better one (carries `url`, `renderAs`, `anchor`; time-based `elapsedSeconds` API rather than progress-based) and is now the authority. No production code broke -- the UV rect shape and the bottom-left conversion matched. What was lost was test coverage, restored in **`skySheets.contract.test.js`**, deliberately under a separate filename so a future concurrent rewrite of one file cannot silently delete the other.

## 0. Where the sky is today

Shipped and verified (2229 unit tests, 3 e2e specs, zero console errors):

| Module | Owns |
|---|---|
| `src/sky/skyProfile.js` | seed → celestial layout + weather-front schedule |
| `src/sky/skyState.js` | per-frame sun direction, day factor, star opacity, storm density, colours |
| `src/sky/skyLayers.js` | which texture per layer, biome sets, blend modes |
| `src/sky/skyDome.js` | camera-locked rig, band geometry, materials |
| `threeGame.js` | `setupSkyRig`, `updateSky` (fog colour + key-light direction) |

**Everything in the sky is currently static.** Layers hold still; only their opacity and tint respond to time and weather. Two concrete gaps:

1. **The cloud and storm plates do not move.** They read as painted backdrops, which is what this plan's Part A fixes.
2. **`skyState.bodies` is computed every frame and nothing renders it.** All 10 celestial body assets — suns, moons, planets, the ring arc, the derelict — are sitting in `public/sky/` unused, because `skyDome.js` only builds meshes for the 8 entries in `SKY_LAYERS`. Part B fixes that, and it is a prerequisite for Part C rather than a side quest: transients are billboards on the same machinery.

---

## 1. COMPLETE — animation sheets standardized as GPU-safe grids

The original catalog specified single-row horizontal strips, three of which were 8192px wide. A headless WebGL2 context on this machine reports `MAX_TEXTURE_SIZE` **8192** — those sheets sat exactly on the limit with zero headroom, and any GPU reporting 4096 (older integrated parts, mobile) could not upload them at all. A texture that exceeds the limit does not degrade; it fails.

**Completed 2026-08-25:** all 10 delivered sheets were rebuilt from the untouched generator outputs and packed into atlas grids. The rebuild preserves source proportions with a single uniform scale factor, then crops or pads only vertically around the authored frame band; it never stretches a source to the strip dimensions. Frame count and shipping cell size are unchanged, and no dimension now exceeds 4096. The conversion is reproducible with `scratch/reflow_sky_sheets.py`.

| Asset | Frames | Cell | ~~Was (strip)~~ | **Now (grid)** | Layout |
|---|---|---|---|---|---|
| `sky_fx_comet_longtail` | 8 | 512² | ~~4096×512~~ | **2048×1024** | 4×2 |
| `sky_fx_meteor_shower` | 8 | 512² | ~~4096×512~~ | **2048×1024** | 4×2 |
| `sky_fx_reentry_debris` | 10 | 512² | ~~5120×512~~ | **2560×1024** | 5×2 |
| `sky_fx_satellite_tumble` | 16 | 256² | ~~4096×256~~ | **1024×1024** | 4×4 |
| `sky_fx_mothership_transit` | 16 | 512² | ~~8192×512~~ | **2048×2048** | 4×4 |
| `sky_fx_spore_bloom_zenith` | 12 | 512² | ~~6144×512~~ | **2048×1536** | 4×3 |
| `sky_fx_sun_gutter` | 16 | 512² | ~~8192×512~~ | **2048×2048** | 4×4 |
| `sky_fx_lightning_fork` | 6 | 512×1024 | ~~3072×1024~~ | **1536×2048** | 3×2 |
| `sky_fx_lightning_sheet` | 4 | 1024×512 | ~~4096×512~~ | **2048×1024** | 2×2 |
| `sky_fx_lightning_crawler` | 8 | 1024×256 | ~~8192×256~~ | **4096×512** | 4×2 |

**Frame order is left-to-right, then top-to-bottom** (reading order). The runtime assumes this and nothing else.

### Additional requirements the runtime depends on

These are not stylistic; playback breaks without them.

- **Uniform cells, no gutters, no padding, no frame numbers, no dividing lines.** The shader computes each cell's UV rect arithmetically from `(cols, rows)`. One pixel of gutter bleeds the neighbouring frame into every sample.
- **Preserve source aspect ratio.** Normalize the untouched generator output with
  one uniform scale factor and crop/pad vertically; never resize width and height
  independently. Non-uniform strip resizing flattens subjects and changes their POV.
- **Consistent subject anchor across frames.** The billboard does not re-centre per frame — motion across the sky comes from the *path*, not from the subject wandering inside its cell. A comet that drifts within its own cells will jitter on top of its trajectory.
- **Frame 1 must not be blank.** Playback starts on it; a blank first frame reads as a dropped effect.
- **Every sheet is additive on pure black, and is NOT chroma-keyed** (catalog §1b/§1c). Resize only — do not run `scratch/process_sky_assets.py` over these.
- **The last frame should fall to near-black** for the one-shot effects (comet, meteor, re-entry, lightning), so playback ends by fading rather than popping off.

---

## 2. Part A — cloud cinemagraphs

Make `highcloud` and the 5 `stormdeck` variants move, without pre-rendered video.

### Technique

Three effects composed in one fragment shader:

1. **Dual-rate scroll.** Sample the strip twice, at different scale and speed, and combine. Each sample wraps seamlessly because the strips tile horizontally and `wrapS` is already `RepeatWrapping` — so the loop is infinite and cannot pop. The second sample is the important half: the two slide through each other, so density builds and thins as they beat. A single scrolling plate always reads as a moving painting; the beat is what makes cloud appear to form and dissolve.
2. **Domain warp.** Offset the sample UV by a slow drifting sinusoidal field so edges billow and curl rather than translating rigidly. This is the difference between a cinemagraph and a pan.
3. **Horizon squash.** Scale the drift rate by elevation within the band so clouds foreshorten toward the horizon instead of marching at uniform speed.

### Driven by state, not by the shader's own clock

`skyState` gains a `wind` field — `{ speed, direction }` derived from `weatherState` and `stormDensity`. Clear sky drifts lazily; a dust wall or rainstorm races. This keeps the existing shape where the shader renders state and never invents its own.

### Aurora is a special case

Aurora gets a **vertical shimmer** along the curtain rather than horizontal drift — aurora is not blown downwind, and scrolling it sideways would look like a moving curtain of cloth. Same material, different mode flag.

### Not animated

Nebula, stars and the ring arc stay fixed — deep space does not drift on a human timescale. The three horizon bands stay fixed — they are terrain.

---

## 3. Part B — celestial billboards (prerequisite for Part C)

`skyState.bodies` already emits `{ assetId, angularSize, direction }` per body and nothing consumes it.

Add a billboard pool to the rig: a small set of reusable camera-facing quads, positioned by converting each body's unit direction into a point on the dome and scaling by `angularSize`. Bodies whose direction is below the horizon are hidden rather than destroyed.

Blend follows the catalog's L3 split: suns and the ring arc are additive-on-black; planets, moons and the derelict are green-keyed alpha cutouts.

This is deliberately built as a **general billboard pool**, because a transient is exactly a billboard whose texture happens to be a sheet.

---

## 4. Part C — transient sprite-sheet playback

### Two independent motions

A transient has two things happening at once, and conflating them is the classic mistake:

- **Path** — where it is in the sky. A comet crosses; a meteor shower falls from a radiant; the mothership transits overhead. Driven by a seeded track and the transient's progress 0→1.
- **Sheet** — what it looks like right now. The comet's tail lengthens, the debris fragments, the sun's disc guts out. Driven by frame index.

The sheet must not move the subject and the path must not change the art. Hence the "consistent anchor" requirement in §1.

### Scheduling

`skyProfile` gains a **transient schedule** alongside the existing weather fronts: seeded start times, types and path parameters over the run. Same guarantees as the weather fronts — ordered, non-overlapping per type, and derived from `runEntropy` so co-op peers agree with nothing on the wire.

Director-triggered transients (`mothership_transit`, `spore_bloom_zenith`, `sun_gutter`) are **not** scheduled. They are fired by narrative beats, so they enter through an explicit `playSkyTransient(id)` call and pre-empt the scheduled queue.

### Playback modes

| Mode | Used by | Behaviour |
|---|---|---|
| `once` | comet, meteor, re-entry, mothership transit, lightning, sun gutter | play frames 1→N across the transient's lifetime, then hide |
| `loop` | satellite tumble | wrap continuously while visible |
| `hold` | spore bloom | play 1→N, then hold the final frame while the effect persists |

### Sheet manifest

A single implemented `SKY_SHEETS` table keyed by asset id carries `{ columns, rows, cellWidth, cellHeight, frames, fps, playback, renderAs, anchor, width, height }`. It is the only place frame layout is described, so a re-cut sheet is a one-line change.

---

## 5. Part D — lightning and the flash

Lightning is a transient, but it also reaches outside the sky:

- Fires while `stormDensity` is high, at seeded intervals scaled by density.
- Sets `skyState.flash` (0→1, sharp attack, exponential decay).
- `updateSky` adds `flash` to the directional light for one frame, so a strike genuinely lights the world rather than only the sky.

`sky_fx_lightning_sheet` (in-cloud glow) draws in the storm band; `lightning_fork` and `lightning_crawler` draw as billboards.

---

## 6. Code changes, file by file

| File | Change |
|---|---|
| `src/sky/skyCloudMaterial.js` | **new** — `ShaderMaterial` factory for cloud/storm/aurora layers: dual-rate scroll, domain warp, horizon squash, mode flag for aurora shimmer. Also takes parallax as a **uniform**. |
| `src/sky/skySheets.js` | **implemented** — `SKY_SHEETS` manifest plus pure `frameIndexForSkySheet`, `frameRectForSkySheet`, and `isSkySheetFinished` helpers. No THREE. |
| `src/sky/skyTransients.js` | **new** — pure. Seeded transient schedule, `resolveActiveTransients(schedule, elapsed, events)` → active transients with progress, path position and frame index. |
| `src/sky/skyBillboards.js` | **new** — THREE. Reusable camera-facing quad pool for celestial bodies *and* transients. |
| `src/sky/skyProfile.js` | add transient schedule generation alongside `weatherFronts` |
| `src/sky/skyState.js` | add `wind`, `flash`, and `transients` to the returned state |
| `src/sky/skyLayers.js` | mark which layers are cloud-type so the rig picks the animated material |
| `src/sky/skyDome.js` | use `skyCloudMaterial` for cloud-type layers; mount the billboard pool; move parallax from `texture.offset` to a uniform |
| `src/threeGame.js` | pass `delta` through to the rig; apply `skyState.flash` to the directional light; expose `playSkyTransient(id)` for the director |

### One latent bug fixed on the way

`skyDome.getTexture` caches textures **by URL**, and parallax currently writes `texture.offset.x` on that shared object. Today every layer resolves to a distinct URL so nothing collides — but the moment two layers share one (a storm variant reused across biomes), they would silently stomp each other's offset. Moving parallax into a per-material uniform disarms it rather than leaving it set.

---

## 7. Test plan

Pure modules unit-test as the existing ones do:

- `skySheets` — frame index across progress 0→1, no out-of-range frame, correct UV rect per cell, last frame reached exactly at progress 1.
- `skyTransients` — schedule ordering, no overlap per type, director events pre-empt, progress monotonic, active set empty between transients.
- `skyState` — wind scales with storm density; flash decays; wind direction stable within a front.
- `skyBillboards` — pool reuse (no allocation per frame), below-horizon bodies hidden not destroyed, additive vs alpha blend per the L3 split.

Shader behaviour cannot be asserted from a unit test beyond uniform wiring. It gets verified the way the last three rendering bugs were caught — **capture the same frame at intervals and diff the pixels**, asserting that cloud regions change over time, that they change *faster* under a storm, and that horizon and star regions do **not** change. That last one is the real test: it proves motion is scoped to the layers that should move.

---

## 8. Sequencing

1. **Part A** — cloud cinemagraphs. No new assets needed; all 6 cloud/storm plates are already delivered. Highest visible payoff, zero dependency on the in-flight generation.
2. **Part B** — billboard pool + celestial bodies. Unlocks 10 delivered-but-unused assets.
3. **Part C** — transient scheduling and sheet playback. The §1 grid assets are delivered, so this is now runtime-only work.
4. **Part D** — lightning and the flash coupling.

Parts A, B, and C are unblocked. All animation sheets now match the §1 contract.

---

## 9. Risks

| Risk | Handling |
|---|---|
| Sheet layout regresses to over-wide strips | `scratch/reflow_sky_sheets.py` is idempotent and validates every source/target dimension; keep the §1 atlas table as the shipping contract. |
| Cloud shader costs fill rate on Deck | Two cloud layers, upper band only. Low performance profile drops to single-sample (no beat, still scrolls). |
| Additive transients stack and blow out | Same trap already hit and fixed once: attenuate through RGB, not alpha. Cap concurrent additive transients. |
| Sheets stream in and out mid-run | L4 is ~72 MB uncompressed. Load on schedule, release after play; preload only director-armed beats. |
| Motion reads as "sliding wallpaper" | The dual-rate beat plus domain warp is specifically what prevents this. If it still reads flat, the fix is the warp amplitude, not more scroll speed. |
