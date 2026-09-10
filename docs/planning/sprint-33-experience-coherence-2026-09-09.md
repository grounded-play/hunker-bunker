# Sprint 33 — Experience Coherence: Presentation, VFX, and Roguelike Legibility

Status: active execution plan · Owner: repository maintainer + Claude ·
Created: 2026-09-09 · Branch: `dev/sprint-33` · Baseline: `93ff756`
(`Merge pull request #59 from grounded-play/fix/mayor-tina-and-astra-plan`) ·
Package version `2.3.2-beta` · Node `v22.22.1`

This is an execution supplement to
[`astra-game-improvement-plan-2026-09-08.md`](astra-game-improvement-plan-2026-09-08.md)
and [`repository-roadmap.md`](repository-roadmap.md). It does not replace
Sprint 30 authority or open a competing master plan. It takes the packages that
plan left **Open** — `PRESENT-01` follow-through, `COMBAT-01`, `DEPTH-01`
presentation, `STORY-01` — and converts the player-facing subset into edits with
named files, tests, and acceptance evidence.

## 1. Why this sprint exists

The prior batches (TINA-01, TRUTH-01, ASSET-01, BOOT-01, HUD-01, PRESENT-01,
DEPTH-01, the Armory UI overhaul) closed correctness, truth, and menu-surface
work. The patches are done. What remains between the current build and a build
that *feels* finished is not another system — it is coherence in the three
places a player actually looks:

1. **The image.** The signature look is authored but does not run in the camera
   the game ships in.
2. **The impacts.** Combat feedback is authored as flat ground-plane geometry
   for a camera the game no longer defaults to.
3. **The ending of a run.** A roguelike teaches through its death screen; ours
   reports statistics but never says what killed you or what the run was.

Everything below is traced to a line of current source, not to a historical
audit.

## 2. Findings

| ID | Finding | Evidence | Implication |
| --- | --- | --- | --- |
| G01 | **The tilt-shift and every post-process pass are inert in the shipped default camera.** | `src/gameplayPresentation.js:5` requires `cameraMode === 'isometric'`. `src/threeGame.js:1224` sets `this.cameraMode = 'third-person'`, and `main.js:2362` defaults the persisted setting to `'third-person'`. `src/threeGame.js:7309` only calls `composer.render()` when `usesGameplayFocusEffects()` is true. | A default-settings player sees a raw `renderer.render()` frame: no tilt-shift, no bokeh band, no focus vignette. The look exists in code and never reaches the screen. |
| G02 | **Two blur systems fight each other when the effect *is* on.** | GPU: `TiltShiftPassShader` (`src/threeGame.js:15-51`) blurs on a horizontal band around `focusY`. DOM: `.gameplay-tilt-shift::after` (`style.css:2117`) applies `backdrop-filter: blur(2.5px)` on a *radial* mask around `--focus-x/--focus-y`. Both are driven from `updateTiltShiftFocus()` (`src/threeGame.js:20955-20990`). | Two different focus geometries, two blur budgets, `backdrop-filter` cost on every frame. The result is muddy rather than miniature, and it is the expensive way to be muddy. |
| G03 | **The tilt-shift blur is too weak to read as an effect.** | `blurAmount: 0.0035` with `focusRange: 0.38` and a 7-tap kernel; `factor` only reaches 1.0 past `0.38 * 1.8 = 0.684` normalized screen distance from focus — i.e. effectively never inside the frame. | Even in isometric the separation between action plane and periphery is marginal. |
| G04 | **Scene lighting is dominated by flat white ambient, which erases the biomechanical art direction.** | `src/threeGame.js:3182`: `new THREE.AmbientLight(0xffffff, 1.9)` against `HemisphereLight(..., 0.8)` (`:3186`) and `DirectionalLight(0xd6e7ff, 2.3)` (`:3190`). Ambient is ~44% of the total directional-equivalent budget and is untinted. | Form, silhouette, and the Gigeresque contrast that the key art promises are washed out. Shadow map is also disabled at construction (`:1609`) and only enabled for the gameplay profile. |
| G05 | **Transient combat VFX are authored as ground-plane decals, not camera-facing effects.** | `spawnMuzzleFlash()` (`:20301`), `spawnProjectileImpactEffect()` (`:20364`), and the cryo shards all build `CircleGeometry`/`PlaneGeometry` meshes with `rotation.x = -Math.PI / 2` — flat on the floor. | Correct for the isometric camera these were authored under. In the shipped third-person camera the player sees them nearly edge-on: a muzzle flash becomes a thin bright sliver on the ground. This is the single largest source of "placeholder-looking" combat. |
| G06 | **The death screen reports numbers but not the run.** | `index.html:1355-1415` and `showGameOver()` (`main.js:4725`) render distance / items / generator / kills / time bars, a bank note, a black-box note, an archive row, and an Act 2 card. There is no cause of death, no depth reached, no active run cards, no relics held. `activeRunCards` exists in `main.js:4746` but is only surfaced as a debug-only seed string (`main.js:4755`). | The roguelike loop's teaching moment is missing. `objectiveRegistry.js:113` already anticipates a "what changed / run-summary view" that was never built. |
| G07 | **Vector-SVG placeholder FX assets are still the source art for sparks and steam.** | `docs/placeholder-asset-remaster-audit.md` §1 lists `public/fx_spark_burst.svg` and `public/fx_steam_puff.svg` as flat vector placeholders; `spawnTextureBurstEffect()` (`:20394`) defaults `textureKey = 'fx_steam_puff'`. | Replacing the *geometry contract* (G05) matters more than repainting the SVGs, and unlocks a real remaster later without re-plumbing. |
| G08 | **The run-card deck structurally forces the same card into every deep draw.** | `drawRunCards()` caps WORLD and FACTION at one card each, and `patrol_surge` was the deck's **only** THREAT card — so a 3-card draw had to take it. Measured over 400 seeded runs before the fix: **206 of 206** three-card runs contained PATROL SURGE, and it appeared in **70.5%** of all runs. | The "run director" is a difficulty dial, not an encounter deck. This is the roadmap's "run variety" gap, made concrete. |
| G09 | **Run cards have no run-to-run memory.** | `drawRunCards(seed)` is purely seed-derived; nothing records what the previous expedition drew. | Consecutive runs can replay identical pressure. The roadmap names repeat prevention explicitly. |
| G10 | **Ten card effect keys were inert — the blurbs promised deltas the game never applied.** | Zero non-test consumers for `snailDensityMult`, `snailSpeedMult`, `questPayMult`, `biomeBias.bio`, `hazards.sporeBloom`, `routeBlocks.digOutCamp`, `economy.digOutRewardShells`, `economy.vesperAmmoCostMult`, `faction.campPressure`, `faction.hivePressure`. CAMP PARANOIA's "bond work pays twice as much" and ICE COLLAPSE's "one camp needs a dig-out route" were text only. | **Resolved** — see §ROGUE-04. Five keys wired to real consumers, five removed with their blurbs rewritten, and a whole-deck guard added so the class of bug cannot return. |

### Explicitly not findings

- The roguelike systems are **wired**, not missing: `src/director.js`,
  `src/runModifiers.js`, `src/loreDrops.js`, `src/sideStorySystem.js`,
  `src/endingExplanations.js`, `src/wandererSystem.js`, and
  `src/depthContract.js` all have non-test runtime consumers as of this
  baseline. The gap is legibility, not absence. Do not rebuild them.
- The per-shot `PointLight` removal recorded at `src/threeGame.js:20315-20329`
  is a hard-won performance fix. **No VFX work in this sprint may reintroduce a
  dynamic light per combat event.** Additive unlit material is the contract.
- Shadow-map toggling at runtime is deliberately avoided
  (`src/threeGame.js:7178-7181`). Lighting work must not reintroduce it.

## 3. Work packages

Priority: P1 = the shipped default build does not deliver an authored,
paid-for feature. P2 = comprehension, feel, or content completion.

| ID | Package | Priority | Depends on | Primary files |
| --- | --- | --- | --- | --- |
| FEEL-01 | Focus effects run in the default camera | P1 | — | `src/gameplayPresentation.js`, `src/threeGame.js` |
| FEEL-02 | One blur authority; DOM overlay becomes grade-only | P1 | FEEL-01 | `style.css`, `src/threeGame.js` |
| FEEL-03 | Tilt-shift strength that reads on screen | P2 | FEEL-02 | `src/threeGame.js` |
| LIGHT-01 | Keyed contrast lighting budget | P2 | — | `src/threeGame.js`, `src/lightingReport.js` |
| VFX-01 | Camera-facing transient combat effects | P1 | — | `src/threeGame.js`, new `src/combatVfx.js` |
| VFX-02 | Single hit-confirmation event chain | P2 | VFX-01 | `src/threeGame.js` |
| ROGUE-01 | Run debrief: cause, depth, cards, relics | P1 | — | `main.js`, `index.html`, new `src/runDebrief.js` |
| ROGUE-02 | Run cards legible during the run | P2 | ROGUE-01 | `main.js`, `index.html` |
| STORY-02 | Lore discovery changes the objective, not just a counter | P2 | ROGUE-01 | `src/loreDrops.js`, `src/objectiveRegistry.js` |
| ROGUE-03 | Deck depth, threat cap, and run-to-run repeat prevention | P1 | — | `src/runModifiers.js` |
| ROGUE-04 | Every card promise backed by a live consumer | P1 | ROGUE-03 | `src/runModifiers.js`, `src/threeGame.js` |

Execution order is FEEL-01 → FEEL-02 → FEEL-03 → VFX-01 → ROGUE-01 →
LIGHT-01 → VFX-02 → ROGUE-02 → STORY-02. Each package lands with tests before
the next begins. A package that cannot be finished honestly is marked **Carried**
in §6 with the reason, not silently dropped.

### FEEL-01 — focus effects run in the default camera

**Problem:** G01. **Behavior:**

1. `usesGameplayFocusEffects()` stops gating on camera mode. It keeps gating on
   `performanceProfile === 'gameplay'`, `gameplayPostProcessingEnabled`,
   `adaptiveGameplayPerformanceMode`, and `loadingPaused` — those are the
   performance and correctness gates and they must survive.
2. Add `focusEffectProfileFor(game)` returning `'miniature'` for isometric and
   `'cinematic'` for third-person. The miniature profile keeps the tight
   authored action plane. The cinematic profile widens `focusRange` and softens
   `blurAmount` so a third-person player gets depth separation, not a diorama.
3. `updateTiltShiftFocus()` selects uniforms by profile.

**Acceptance:** a default-settings gameplay frame renders through
`composer.render()`; both profiles are unit-tested; adaptive performance mode
and the menu profile still bypass the composer entirely.

### FEEL-02 — one blur authority

**Problem:** G02. **Behavior:** the GPU pass owns blur. `.gameplay-tilt-shift`
keeps the radial darkening and desaturation that frame the action plane and
**drops `backdrop-filter` / `-webkit-backdrop-filter` and the mask that existed
only to bound that blur.** The overlay stays cheap, stays above the canvas only,
and continues to leave HUD text untouched.

**Acceptance:** no `backdrop-filter` remains in the tilt-shift rule; the overlay
still tracks `--focus-x/--focus-y`; `prefers-reduced-motion` handling is
preserved.

### FEEL-03 — strength that reads

**Problem:** G03. **Behavior:** re-derive the falloff so peripheral blur reaches
full strength inside the visible frame, and raise `blurAmount` per profile.
Keep the 7-tap separable kernel — this is a fill-rate budget decision already
paid for, not an invitation to a wider kernel.

**Acceptance:** uniform values are asserted per profile; the focus band still
centers on the tracked player; no additional composer passes are added.

### LIGHT-01 — keyed contrast budget

**Problem:** G04. **Behavior:** reduce untinted ambient and move the removed
energy into the tinted hemisphere fill and the directional key, so surfaces keep
a lit/unlit side. Publish the intended budget as named constants next to the
lights and assert it, so a future "the level is too dark" patch cannot silently
restore a flat 1.9 white ambient without failing a test.

**Constraint:** total light *count* must not change (program-cache stability,
`src/threeGame.js:47-51`), shadow-map enablement must not change, and
`summarizeSceneLights()` must still report the same `byType` totals.

**Acceptance:** constants exist and are asserted; light count unchanged;
`npm test` green. Human sign-off on the resulting mood is explicitly **open**
and recorded as such — this package changes numbers with a stated intent, and a
person still has to look at it.

### VFX-01 — camera-facing transient combat effects

**Problem:** G05. **Behavior:**

1. New `src/combatVfx.js` owning the geometry contract for transient combat
   effects: a `billboard` orientation mode that faces the active camera each
   frame, and a `ground` mode that preserves today's floor-plane behavior for
   effects that genuinely belong on the floor (decals, pools, shockwave rings).
2. `spawnMuzzleFlash()` and `spawnProjectileImpactEffect()` move to billboard.
   `spawnFrostShockwaveEffect()` and `spawnWallDecal()` stay ground/wall aligned
   — a shockwave ring on the floor is correct.
3. Orientation updates ride the **existing** `updateTransientEffects()` pass. No
   new per-frame loop, no new light, no new material variant that can grow the
   shader program cache: additive `MeshBasicMaterial` only.

**Acceptance:** unit tests prove billboard effects re-orient toward a moving
camera and ground effects do not; the additive/unlit contract is asserted;
`transientEffects` cleanup still removes everything it created.

### ROGUE-01 — run debrief

**Problem:** G06. **Behavior:** new `src/runDebrief.js` composing a debrief from
state the run already owns — cause of death, deepest ring/depth tier reached,
the run cards actually drawn (`activeRunCards`), relics held, and one derived
lesson. `showGameOver()` renders it into the existing report; `index.html` gains
the container. Pure composition function, no new state owner, no new save key.

**Acceptance:** the debrief function is unit-tested against representative run
states including the empty/unknown case; the modal renders without the Act 2
card present; nothing throws when a field is missing.

## 4. Rules this sprint inherits

- No new module without a runtime consumer in the same change. A helper with
  only test callers is unfinished work (astra plan §3).
- No dynamic light per combat event, ever (G-note above).
- No runtime shadow-map toggling.
- Storage keys and save contracts are frozen for this sprint.
- Evidence before assertion: `npm test` and `npm run lint` output is quoted in
  the closing report, not summarized from memory.

## 5. Acceptance for the sprint

1. `npm test` and `npm run lint` pass, with the test count moving up, not down.
2. A default-settings gameplay frame is rendered through the composer.
3. Muzzle and impact effects face the camera in third-person.
4. The death screen states what killed the player and what the run was.
5. This document's §6 records, per package, one of: landed with evidence,
   carried with reason, or cut with reason.

## 6. Status log

### Concurrent-execution note (2026-09-09, 22:24)

Partway through executing FEEL-01/02/03, two other agents were found executing
**this same goal, on this same branch, against these same files.** Evidence:
`docs/planning/expedition-coherence-plan-2026-09-09.md` and
`docs/planning/roguelike-vfx-lighting-and-gameplay-plan-2026-09-09.md` appeared
alongside this document, along with `src/expeditionVfx.js`,
`src/expeditionFeedback.js`, `src/combatVfx.test.js`,
`src/tiltShiftDiorama.test.js`, `src/lightingShadowTracking.test.js`, and
`src/roguelikeLoopFlow.test.js` — i.e. the VFX-01, VFX-02, LIGHT-01 and
ROGUE-01 packages below. `src/threeGame.js` was rewritten under this session at
22:23:14, between a passing and a failing test run, replacing this session's
shader edits with a different (also reasonable) dynamic-`sharpRange`
implementation.

Their findings independently match §2 above — flat white ambient, flat-disc
impact VFX, a weak/resolution-dependent tilt-shift, a death screen that does not
teach. That convergence is corroboration, not duplication of effort worth
continuing. Their packages have since been verified landed and wired (see the
status table), so the split cost no coverage: every finding in §2 is closed by
one lane or the other.

On the maintainer's instruction this session **stood down to an unclaimed
lane** rather than continuing to overwrite concurrent work. Shared files
(`src/threeGame.js`, `main.js`, `src/director.js`, `src/runDrops.js`) are owned
by the other agents. This document remains useful as the findings register; its
FEEL/VFX/LIGHT/ROGUE packages should be reconciled against their plans by the
maintainer rather than executed twice.

### Package status

Verified 2026-09-10 07:30 against the settled tree. Packages marked *(concurrent
lane)* were executed by the other agents; they are confirmed landed and wired
here by inspection, not claimed as this session's work.

| Package | Status | Evidence |
| --- | --- | --- |
| FEEL-01 | **Landed** (this session) | `src/gameplayPresentation.js`: `usesGameplayFocusEffects()` no longer gates on `cameraMode`, so the shipped third-person camera renders through `composer.render()`. Two new cases in `src/gameplayPresentation.test.js`. |
| FEEL-02 | **Landed** (this session) | `style.css`: `.gameplay-tilt-shift::after`'s `backdrop-filter: blur(2.5px) saturate(0.88)` and its bounding mask removed; overlay is vignette-only, GPU pass is the single blur authority. |
| FEEL-03 | **Landed** *(concurrent lane)* | `TiltShiftPassShader` reworked to a texel-relative `blurAmount` of 2.4 with a dynamic `sharpRange` computed per frame against the projected player and aim lead — resolution-independent, and it reaches full defocus inside the frame. G03 resolved by a better route than this plan proposed. |
| LIGHT-01 | **Landed** *(concurrent lane)* | G04 resolved: `AmbientLight` **1.9 → 0.85**, `HemisphereLight` 0.8 → 0.55, `DirectionalLight` 2.3 → 2.5 (`src/threeGame.js:3211-3219`) — flat white ambient no longer dominates, so surfaces keep a lit/unlit side. `directionalLight.target` now tracks the player (`:3235`) with the shadow frustum widened to ±16, fixing shadows that vanished past 14m from spawn. |
| VFX-01 | **Landed** *(concurrent lane)* | G05 resolved: `src/expeditionVfx.js`'s `createImpactBurst()` replaces the four flat ground-plane discs at `src/threeGame.js:20484` with six elongated `OctahedronGeometry` shards oriented into true 3D directions (`setFromUnitVectors`, 0.6 Y component), so impacts read correctly in the third-person camera. The shockwave ring stays ground-aligned, which is correct. |
| VFX-02 | **Landed** *(concurrent lane)* | `src/expeditionFeedback.js` + `src/combatVfx.test.js`. |
| ROGUE-01 | **Landed** *(concurrent lane)* | `expeditionDebrief()` wired at `main.js:4578`; `crossingGuidance()` at `main.js:4099`. |
| ROGUE-02 | **Landed** (this session) | See below. |
| ROGUE-03 | **Landed** (this session) | See below. |
| ROGUE-04 | **Landed** (this session) | G10 closed: 5 keys wired, 5 removed, whole-deck guard added. See below. |
| STORY-02 | **Landed** (this session) | See below. |

All ten packages are closed. **Gates run against the settled tree:**
`npx vitest run` → **2,681 tests across 301 files, all passing** (baseline
2,623/293 — net +58 tests, +8 files); `npm run lint` → clean.

### ROGUE-02 — the player can read the bargain

`activeRunCards` was captured in `main.js` on `run-cards-drawn` and then
rendered nowhere: the only surface was a debug-gated seed string. The deck
decides what a run *is*, and the player was feeling its pressure without ever
being told the terms.

New `src/runCardHud.js` (pure, testable — `main.js` has DOM side effects at
module scope and cannot be imported by Vitest, the same reason
`endingExplanations.js` exists) formats drawn cards into badges and a one-line
debrief summary. Wired in two places: a `#hud-run-cards` chip strip under the
level indicator during the run, and a `#go-run-cards` line on the death screen
so two runs with identical stats still read differently. Card type is carried by
colour but always stated in words, so colour is never the only cue. An
unmodified run reports `RUN PRESSURE: NONE — A CLEAN DESCENT` rather than a
blank the player has to interpret.

**Evidence:** `src/runCardHud.test.js` → 4 passed, including empty/malformed
draws. `node --check main.js` clean.

### STORY-02 — lore discovery that changes what you do next

Executed in full, entirely within the unclaimed lore lane (`src/loreDrops.js`,
`src/loreDrops.test.js`). Two changes:

1. **Leads.** Every one of the 14 drops is now authored as `body` (what the
   object is) plus `lead` (what finding it tells the player to do, fear, or
   expect), with `text` composed from the two. Because the collection path
   already dispatches `lore-terminal-read` with `drop.text`, the lead reaches
   the reader modal through existing wiring — no edit to a claimed file, and no
   helper without a runtime consumer. A drop was flavour plus a counter; it is
   now a reason to go somewhere or to expect something.
2. **Narrative staging.** Each drop carries a `stage` (1 setup, 2 development,
   3 revelation), and `pickLoreDropForSite()` drains a site's earliest unfound
   stage before offering a later one. Rarity still decides *which* story you
   get; stage now decides *when you are ready to hear it*. Previously a
   rarity-weighted roll could hand a player the legendary queen-moult shard —
   "the grooves are writing" — before anything had established that the hive
   archives its hosts at all, which reads as disconnected fragments rather than
   a story.

Determinism, the site/`anywhere` pooling rule, the shared
`hb_world_memory_v1.logsFound` ledger, and pool exhaustion to `null` are all
preserved and still covered.

**Evidence:** `npx vitest run src/loreDrops.test.js` → 11 passed (3 new,
written failing first). `src/loreDrops.test.js`,
`src/threeGame.loreCompass.test.js`, `src/steamStats.test.js`,
`src/gameplayPresentation.test.js`, `src/threeGame.tiltShiftBokeh.test.js` →
33 passed together. `npx eslint` clean on every file this session touched.

A whole-suite `npm test` result is **not** reported here: with two agents
mid-edit in the same tree, a full run's failures cannot be attributed to a
lane, and quoting one would be misleading. The maintainer should run the gates
once the tree settles.

### ROGUE-03 — a deck instead of a difficulty dial

Executed in full, entirely within the unclaimed `src/runModifiers.js` /
`src/runModifiers.test.js` pair. Three changes:

1. **Three new THREAT cards** — HUNTER PACK, SENSOR GHOSTS, GRID FLICKER —
   breaking the structural force described in G08. Each is a *bargain*, not a
   penalty: HUNTER PACK raises proto spawn rate but extends radar range;
   SENSOR GHOSTS degrades radar but thins the ground; GRID FLICKER browns out
   power but leaves the camps too rattled to raise suspicion. A run should be a
   story about a trade, not a number that went up.
2. **Effect keys verified live before authoring.** Every key on the new cards
   (`spawnBias.proto`, `spawnBias.patrolBias`, `radar.rangeMult`,
   `radar.cooldownMult`, `environment.blackoutPulseSeconds`/`blackoutDurationSeconds`,
   `suspicionMult`) was traced to a runtime consumer in `threeGame.js`/`director.js`
   first, and a test pins that contract so the deck cannot grow new inert
   promises. G10 records the ones that were already inert.
3. **Type limits and repeat prevention.** THREAT is capped at 2 (a run can
   spike, but never be all threat), and `createRunCardState()` now reads and
   records a persisted last-two-draws ledger (`hb_run_card_history_v1`), sorting
   recently seen cards to the back of the shuffle. Deprioritised, not banned —
   banning starves a deck this small and can make a legal 3-card draw
   impossible. Passing `recentKeys` explicitly opts out, so **named-seed
   reconstruction still reproduces a run exactly**, and a bare
   `drawRunCards(seed)` is unchanged.

**Measured result**, 400 seeded runs, before → after:

| Metric | Before | After |
| --- | --- | --- |
| 3-card runs containing PATROL SURGE | 206 / 206 (100%) | 85 / 206 (41%) |
| PATROL SURGE appearance rate, all runs | 70.5% | 30.0% |
| Per-card appearance spread (9 cards) | 29.5%–70.5% | 20.3%–34.3% |

**Evidence:** `npx vitest run src/runModifiers.test.js` → 16 passed (7 new,
written failing first), `src/director.test.js` (the live consumer of
`createRunCardState`) still green. Storage is injectable and hostile/absent
storage is covered.

### Handoff note for the ROGUE-01 (run debrief) lane

`ObjectiveRegistry.clear()` wipes objectives on death/run reset but **does not
clear `this.history`** (`src/objectiveRegistry.js:148-155`). History is capped
at 20 entries and survives a run boundary, so a debrief built on `getHistory()`
will mix the current run's resolved objectives with previous runs'. Whether that
should be per-run or session-wide is a decision for whoever owns the debrief
data contract — this session did not change it, to avoid reaching into an
in-flight lane.

### ROGUE-04 — every card promise is now a real delta (G10)

A card is the player-facing statement of a run's bargain. A key nothing reads is
not a small bug: it is the game lying about its own terms, and it is exactly the
failure the astra plan's DEPTH-01 §5 names ("show only deltas the game actually
applies"). Each of the ten inert keys was resolved one of two honest ways —
wire it, or delete it and stop claiming it.

**Wired (5)** — each traced to the seam that actually applies it:

| Key | Card | Consumer |
| --- | --- | --- |
| `questPayMult` | CAMP PARANOIA | Camp quests pay in **bond**, not resources, so bond is what "bond work pays twice as much" multiplies. New `getCampQuestBondDelta()` feeds both `completeCampQuest()` call sites. Rounds up, and never pays *less* than base however hostile the multiplier. |
| `spawnBias.snailDensityMult` | PATROL SURGE | Scales the per-chunk snail budget and roll chance in chunk scatter. |
| `spawnBias.snailSpeedMult` | PATROL SURGE | Scales the snail per-frame move step. |
| `biomeBias.bio` | SPORE BLOOM | Biome is chosen purely by distance from the anchor, so "bio growth thickens routes" means pulling the BIO threshold inward by the bias — a legible geometry change, not a hidden stat. |
| `economy.vesperAmmoPayMult` | PATROL SURGE | Renamed from `vesperAmmoCostMult`: there is no ammo storefront for anything to be "cheap" in, but Vesper payouts do carry ammo, so **pay** is the honest lever. Applied in `applyCampPayoutEffects()` beside the existing Tallow med path. |

**Removed, with the blurb rewritten to describe only what is real (5):**

- `hazards.sporeBloom` — no hazard type exists for it. SPORE BLOOM's other two
  effects are real, so the blurb needed no change.
- `routeBlocks.digOutCamp` + `economy.digOutRewardShells` — no dig-out quest
  exists. `sealedGapCount` **is** live (`applyCanyonCollapse`), so ICE COLLAPSE
  now reads *"The canyons shift and seal. Three crossings you would have used
  are simply gone."* — which is precisely what it does.
- `faction.campPressure`, `faction.hivePressure` — `effects.faction` is never
  read anywhere; pure marker flags, deleted.

PATROL SURGE's blurb was also rewritten to match its new ammunition semantics.

**The structural fix.** The earlier guard only covered newly added cards. It now
walks **every** card's effect tree and fails on any key absent from an allowlist
that names each key's consumer in a comment. Adding a card with an unbacked
promise is now a test failure, not a silent lie. The audit also surfaced that
`outing.propagationBlocked` *does* have a live consumer (`threeGame.js:12535`) —
correctly excluded from G10, and now recorded in the allowlist.

**Evidence:** `src/threeGame.runCardConsumers.test.js` (5 tests) exercises the
three `threeGame.js` consumers through their real prototype methods, including
zero/negative/`NaN`/string multipliers; `src/runModifiers.test.js` (19 tests)
covers the payout levers and the whole-deck guard. Full suite: **2,681 tests
across 301 files, all passing**; `npm run lint` clean.

One regression was caught and fixed during this work: the first wiring called
`this.getCampQuestBondDelta(1)` directly, which broke 8 tests that invoke
`resolveCampQuestCompletion` on a bare stub. The call sites now use the
defensive `?.() ?? 1` form used by their neighbours — the tests were right and
the code was wrong.

## 7. Explicitly out of scope

Packaged Steam certification, two-account co-op acceptance, physical Deck
sign-off, Cloud round-trip, commerce, new asset production batches, and
`threeGame.js` extraction. Those remain owned by the roadmap's Horizon A/C and
are not made easier by this sprint.
