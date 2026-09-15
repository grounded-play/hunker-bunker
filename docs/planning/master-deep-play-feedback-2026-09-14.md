# Master deep play feedback — September 13–14 sprint review

## Outcome and scope

This is the implementation backlog for the supplied screenshots, full playthrough notes, attached review, `docs/logs/log21.json`, `docs/logs/log22.json`, and the latest available hosted Steam captures. **All 48 tickets below remain open.** Existing implementations are identified explicitly; finding code or passing a unit test does not close a visual/gameplay regression.

Code baseline: `545bb8f` on `dev/sprint-40`, package `2.4.4-beta`. That commit contains the initial tabbed Settings/Terminal pass. Earlier commits added alternate VO takes and broader cosmetic unlocking. They do not establish that the requested UI balance, general VO orchestration, or packaged Steam behavior is correct. The hosted captures below are older `2.4.2-beta` builds; reproduce against the current branch before deciding whether an old defect remains.

This document is a plan, not a claim that the entire sprint has been implemented. No Steam accounts, achievements, inventory, purchases, or hosted issues were modified during this review.

## Implementation journal

The full backlog remains the goal. Entries below distinguish implemented changes from acceptance still requiring hardware, packaged clients, or a complete gameplay route. No ticket is closed merely because its unit tests pass.

### Pass 1 — DP-10 explicit turret construction (September 14)

Commit: `8182f49`.

- Removed all three automatic ownership paths: bank-load inference, base-upgrade event grant and visual-update grant. O2 now unlocks construction eligibility, not an active turret.
- Added an optional terminal build card (currently Objective / Night Log; its final tab home is part of DP-25). Construction costs **30 TECH / 10 COIN**, committed atomically with ownership. Duplicate purchase, missing O2/funds, and upgrading/repairing an unbuilt turret are rejected.
- Existing explicit `baseTurretUnlocked: true` beta saves retain their turret, upgrades and damage without a new charge. A save containing only O2/goal progress gets no inferred turret. Fresh bank reset clears active rendering/firing state.
- Verification: bank/base-turret/class-passive tests passed (57 checks); ESLint passed for affected JS. Browser skill checks confirmed the actual terminal button at 1920×1080: click changed resources 100/100 → 70/90, ownership and active state to true, then disabled the button as `TURRET BUILT`; no browser errors. This used isolated seeded O2 eligibility, not a claimed full boss playthrough. `tests/e2e/base-turret-build.spec.js` passed its real-click/duplicate/persist/reload route (26.8 seconds).
- **Status: implemented, broader acceptance pending.** First-boss balance with/without defense and paired packaged clients still need verification; DP-17/25 own final menu sizing/organization.

### Pass 2 — DP-02 O2 lighting lifecycle regression

Commit: `126dda5`.

- Found the prebuilt-light workaround was undone by `ensureO2BubbleVisualState`: every offline O2 update disposed the base grid. First repair added eight PointLights back during play, then startup hid/reintroduced the O2 PointLight too. These changes invalidate light-count-dependent material programs and are consistent with the recorded long render phases; they do not prove every stall has the same cause.
- Added `BaseLights.standby()` to power down without removing fixtures. The O2 light is likewise always present at zero intensity while offline. Actual game teardown still disposes the grid. Repair, cinematic rise and reset now preserve the same light identities.
- Verification: **19 tests passed** across base lights, choreography and the new **runtime** `threeGame.o2LightLifecycle.test.js`. The regression exercises `ensureO2BubbleVisualState`, offline/online/reset and `startO2StartupSequence`/animation completion, asserting the same nine visible light IDs throughout. ESLint, production build and required-media audit passed.
- **Status: regression fixed, performance acceptance pending.** Need same-route cold/warm RTX and packaged Linux traces for DP-01/02; no FPS or latency improvement is claimed from unit tests alone. Asset first-use/driver/media costs and choreography ownership remain separate work.

### Pass 3 — DP-03 boss-film ownership and interrupted O2 cleanup

- O2's director now marks its final boss warning as already presented; the warning remains available to HUD/VO consumers without enqueuing the film a second time. The main warning listener uses a per-run, per-encounter claim gate, with goal fallback for legacy events. Radar and reactor can both present even though they use the same species. Actual spawned encounter IDs now travel with warning events.
- Concurrent/repeated O2 requests share one promise within a run. New runs get a new presentation; failed requests can retry. Leaving the run prevents late sequence callbacks from spawning a boss or unlocking a newer expedition.
- Added bounded wait for the structure-rise callback and failure cleanup: input/cinematic lock releases, the paid generator restores its completed visual state, and stale callbacks clear. Run reset explicitly cancels any old rise animation.
- Verification: **38 tests passed** across presentation, director, boss lifecycle and runtime O2 lighting. Tests include actual director→warning-consumer interaction, duplicate aliases, distinct same-species goals, new encounters/runs, concurrency, media failure/retry, lost callback and cancellation. ESLint, production build and required-media audit passed.
- Broader regression sweep: `npx vitest run src/threeGame*.test.js src/bank*.test.js src/baseTurret.test.js src/o2CinematicDoors.test.js src/baseLights.test.js src/milestonePresentation.test.js --maxWorkers=4` — **88 files / 626 tests passed**. This includes the existing gameplay/bank tests affected by the new build card and reset hooks.
- **Status: implemented, full media/client acceptance pending.** Tests inject media/door completion rather than certify actual decoder timing or paired packaged-client playback. Full O2 camera framing (DP-11), later structure choreography (DP-12) and general cinematic queue cancellation remain follow-up work; the overall 48-ticket goal is not complete.

### Pass 4 — DP-05 Foundry transition rollback and plane recovery (September 14)

Commit: `d744c5c`.

- Found a concrete failure path independent of the unidentified original capture: entry hid the surface and committed the plane before mounting the room; a mount exception left no rollback. Entry now keeps the surface intact until a floor is mounted, guards reentrant entry, and restores player transforms, camera, input and visibility on failure. Failed room pickups are deregistered; cleanup disposes only portal-owned geometry/materials, never shared surface resources.
- Foundry uses a namespaced cache instead of reusing a pit at the same coordinates. Collision, contextual interactions, pickups, ceiling presentation and the exit all use the active cache key. Exit hides the interior; re-entry restores it. Respawn restores surface visibility and hides old interior groups.
- A bounded Foundry-only recovery handles non-finite coordinates, below-floor positions and escape beyond the room. Missing/hidden/detached floor groups return the player to the recorded exterior point and are invalidated for clean reconstruction. Entry, rollback, recovery and exit now emit structured `PORTAL` diagnostics.
- Verification: **88 files / 637 tests passed**, including 11 new Foundry regression cases (40 checks across Foundry, pockets and plane contracts). ESLint, `git diff --check`, production build and 50-required-media audit passed.
- Browser skill verification reached title → roster → Armory → solo deployment without reported page errors, but the intro/loading transition remained non-ready and later evaluations stalled. No successful rendered Foundry traversal is claimed; original failure replay and packaged-client acceptance remain open. This is a tested safety patch, not proof that all Foundry ground-loss causes are resolved.

### Pass 5 — DP-16 gameplay audio manifest and bounded missing-key diagnostics (September 14)

- Confirmed the concrete footstep cause: `GAME_SOUNDSETS` already described approved concrete/snow and metal/glass variants, but the gameplay audio manifest loaded **none of their 16 files**. Added the shared `GAMEPLAY_FOLEY_MANIFEST` to actual gameplay loading, using existing approved assets; no new audio artwork or source-pack imports.
- Added one canonical alias table for 18 stale UI/gameplay names, including metal stress, turret gunshots, boss death, priority alarm and confirmation cues. Aliases preserve caller volume, pitch and world-space options, reuse canonical buffers and cannot form chains. Updated the obsolete comment claiming the soundset registry was empty.
- Missing audio is now logged once per key with exact attempt counts retained in exported `state.audioMissing`; diagnostics track at most 128 distinct keys plus overflow attempt totals. Late asset decoding is still retried, not permanently silenced by the diagnostic dedupe.
- Verification: **55 focused tests passed** (audio, soundsets and debug logger), including static literal-caller coverage in main/top-level gameplay modules, every approved variant's manifest/file presence, no-immediate-repeat, alias options, bounded cardinality and exported counts. ESLint, production build, required-media audit and `git diff --check` passed. Browser skill verification decoded all 16 real files and started all four sound families with zero missing reports. `tests/e2e/gameplay-audio-assets.spec.js` passed real fetch/decode/playback in Chrome (22.7 seconds).
- **Status: implemented, full-route listening acceptance pending.** The browser test uses the actual audio manager and shipped files in a title-screen fixture; it does not prove traversal mix quality, every dynamic cue, spatial audibility on speakers, or VO correctness (DP-13–15). Static coverage intentionally excludes dynamically assembled names and non-audio `.play()` calls.

### Pass 6 — DP-04 Mayor Tina hostile lifecycle (September 14)

- Fixed the split state that marked Tina hostile while leaving the encounter in the friendly `idle` phase. The warning hit now transitions to `hostile`, removes the teacup immediately, grounds the Mayor model, hides/disables the interaction prompt and stops Tina-owned speech.
- The hostile actor now pursues the player with bounded delta time, collision-aware axis fallback, facing updates and a contact-damage cooldown. It no longer remains embedded in the cup. The dead state removes any residual cup, hides the actor and prevents siren/prompt/dialogue updates. New-run reset explicitly restores hit count, hostility/death flags, actor placement and both models.
- Verification: 16 Mayor lifecycle/combat tests pass, including warning→chase, blocked-axis movement, attack cooldown, death voice/visual cleanup and complete reset. Full visual encounter playthrough remains part of the final acceptance sweep.

### Pass 11 — DP-17–21 full-stage Armory and stable operator selection (September 14)

- Expanded the Armory across the bounded game stage, brought the operator and weapon camera closer, increased primary target/text floors and added a compact 720p layout that keeps both equipment benches visible without scrolling or overlap. Removed the redundant turntable telemetry placeholder while retaining direct stage inspection.
- Daily Ops is no longer a Hero Select utility command. It is a deployment choice beside standard embark in the Armory, preserving the selected class and loadout while routing through the existing real Daily Ops seed/rules entry point.
- Flattened Hero Select commands into a visible three-column command deck above Initialize. Controller/WASD movement now follows those visible rows and columns rather than the obsolete semantic wrapper rails.
- Class swaps keep the last valid posed preview until the requested model proves it has an idle clip, reject stale async completions, use a class-correct sprite/fallback during loading and recover after a bounded timeout. The selection doors wait for that synchronized result, preventing the left identity and center model from disagreeing.
- Verification: 42 focused Armory/3D overlay tests passed. Browser checks passed rapid 50-class cycling, operator preview fallback coverage, real 3-column directional navigation, equipment re-rendering and computed full-stage/no-sidebar-overflow checks at the project Chrome profile. Broader resolution and packaged-client visual acceptance remain in the final sweep.

### Pass 12 — DP-26–31 HUD hazard and tactical-map coherence (September 14)

- Added a gameplay-phase-owned hazard panel that distinguishes cold exposure, oxygen depletion and bio-toxin exposure, reports a rate-derived time remaining where meaningful, identifies the safety action and supplies separate restrained edge treatments with reduced-motion behavior. Leaving gameplay clears both the HUD and environmental body states.
- Black Box and Foundry now register explicit always-identifiable tactical-map landmarks as soon as their signals are active; they use distinct icon shapes and do not depend on the destination chunk already being explored.
- Exploration trails are bounded to 600 points, use an injectable clock, fade segment-by-segment for three minutes and expire instead of accumulating across a long run. Existing new-run/death reset remains authoritative for immediate clearing.
- Increased the minimap player arrow floor, added a high-contrast outline/notched tail and drove map paths, rooms, scans and the player marker from the active HUD theme. Theme tokens now reach the complete HUD panel family immediately; the pink/purple Bunker 404 theme applies a functional heart-shaped minimap mask while hazard meaning retains independent colors.
- Verification: 30 focused map, mapping-mission and gameplay-regression tests passed, including fake-clock fade/expiry, bounded trails and truthful hazard event telemetry. ESLint and diff checks passed; visual theme/hazard acceptance remains in the combined browser/package sweep.

### Pass 13 — DP-32–34 corpse identity and enemy forward axes (September 14)

- Black Box markers now preserve the recorded deceased class and asynchronously replace the lightweight class-colored fallback with that class's actual rig. The rig is locked into the shared defeat/downed animation, laid onto the ground and kept independent of the operator selected for the recovery run. Missing assets retain the identified fallback instead of exposing a bind pose.
- Removed the erroneous extra half-turn from the rigged crawler asset, whose locomotion pack and model are both +Z-forward. Removed the inherited quarter-turn from the unique cryo boss export while leaving regular cyber/cryo shared-mesh and cyber-boss corrections untouched; corrections are explicitly asset-local.
- Verification: eight focused Black Box storage/corpse and enemy-overlay tests passed, including all three class mappings, loading fallback identity and independent yaw contracts. Full rendered death/recovery and eight-direction encounter acceptance remain in the visual sweep.

### Pass 14 — DP-09/35–38 breaches, survivors, camps and visible cycle (September 14)

- Boss wall attacks now select a perpendicular adjacent wall and clear a two-tile-wide opening toward the target.
- Eligible survivors publish a map signal before model load, spawn off-site, follow a navigation route to the crash-site airlock and only become interactable on arrival.
- Recruited survivors use grounded collision-aware follow movement with faster catch-up and safe behind-player recovery instead of flying/overlapping teleports.
- Camp placement validates the full clearing and anchors the complete set piece to sampled terrain height.
- The expedition HUD now displays campaign day, local 24-hour time, day/night phase and cycle progress continuously.
- Verification: 47 focused Vitest assertions passed across day-cycle, wall, survivor and camp suites; production Vite build and 50-asset media audit passed.

### Pass 15 — DP-06–08/11–12 route, prop streaming and milestone presentation (September 14)

- Room population now reserves a complete doorway apron, preserves authored blocking flags, and retains the existing multi-thousand-seed connectivity guarantees so set dressing cannot seal a valid west-complex socket.
- Common world models remain preloaded during staging; uncommon GLB replacements now begin 28 units away with bounded concurrency while their deterministic sprite fallback remains visible. Destruction keys remain authoritative across chunk eviction.
- GLB-replaced destructible props retain collision and an explicit DISMANTLE reticle/integrity readout; nonblocking authored dressing no longer becomes a surprise solid collider.
- O₂ choreography now drives the active camera focus rather than an unused field, holds the generator through its rise, and restores tracking on success, skip, death or error.
- Hull, radar and reactor console milestones request the correct boss film immediately, wait for media settlement, focus and raise their own structure from below ground, then begin dialogue/boss AI. Completed-save restoration remains instant and skips theatrics.
- Verification: 51 focused presentation/navigation/interaction assertions passed, plus the 6,000-seed maze stress suite and the production build/media audit.

### Pass 16 — DP-39–42 isolated validation gallery and audio audition (September 14)

- Replaced the single-file exhibit corridor with six-column category grids, retained labeled pedestals and upright wall backing, and enlarged the bounded validation floor for clear aisles around every row.
- World props and actors now expose paired intact/damaged display states with repeatable global reset/damage controls. Production display actors retain their authored idle animation path; static counterparts use an explicit visual damage state rather than invented animation clips.
- Entering the gallery now selects an isolated simulation profile: player inspection and camera motion continue, while run timers, needs, hazards, weapons, projectiles, ambient spawns and enemy AI remain frozen. Existing transient shots are hidden, and their visibility plus the prior noclip/god/session state are restored exactly on exit.
- Added the bounded Music / Songs / VO & Takes / Effects jukebox with filter, source/cue metadata, missing-source status, one-sample ownership, stop and gain. It catalogs all 38 soundtrack entries and both alternate takes for every voice slot, and auditions raw buffers without consuming dialogue history or firing story/achievement events.
- Verification: 25 focused gallery/frame-profile assertions passed, including multi-row placement, specimen reset, complete song/take discovery and live-run isolation; production Vite build and 50-asset media audit passed.

### Pass 17 — DP-43–46 authorized beta inventory and repeatable achievement QA (September 14)

- Fixed the packaged-beta unlock no-op: Electron ownership starts denied and can only enable synthetic inventory after the trusted main process confirms a named beta or explicit QA override. Public/default builds omit the controls and still reject direct store calls.
- Unlock All audits every catalog-derived equippable category and displays its available/total result. The Armory test kit grants bounded, non-tradable synthetic marketplace items plus keys, records bounded local receipts, survives Steam inventory refresh and never claims those objects are Steam-owned.
- Named beta builds now reject purchase-init/finalize before reaching a charge endpoint and direct testers to the no-charge grant kit. Browser sandbox acquisition is labeled as a synthetic grant rather than a verified purchase.
- Steam achievement activation changed from fire-and-forget IPC to request/ack. A durable account-scoped queue retries unacknowledged keys, rejects account crossover, validates all live API keys against a shared Electron catalog and excludes coming-soon definitions.
- Achievement reset now supports explicit local / Steam / both scopes. Local state resets in memory and storage, while account-scoped reset generations discard stale retries and allow the same achievement to be earned again without duplicating reward grants. Offline Steam reset is reported as unavailable rather than success.
- Verification: 80 focused ownership/Armory/achievement/sync/auth assertions passed (93 including adjacent console coverage); Electron syntax checks, ESLint, diff checks, production Vite build and media audit passed. A real Steam account reset was intentionally not invoked by automated verification.

### Pass 18 — DP-47 functional Foundry run outputs (September 15)

- Replaced concept-only Foundry output labels with explicit runtime contracts: six fabricated guns, five existing rig modules and two existing weapon charms. Every recipe declares its output kind and, for equipment, the real catalog itemdef it grants.
- All six guns now select distinct live projectile spread, damage, lifetime and cadence profiles; previously only Scatter Repeater changed gameplay. Equip from the Foundry calls the running game's weapon recalculation immediately.
- Module outputs use effects already consumed by combat/hazard simulation and update the active run's modifier snapshot. Charm outputs mount the existing GLB charm and rebuild the current player weapon overlay.
- Fabricated recipe cards now expose their real name, effect, exact cost, print progress and direct print/apply action. A full module rig offers explicit replacement buttons for bay A and B; no slot is silently overwritten. Print ownership is catalog-backed and survives inventory refresh without pretending to be Steam inventory.
- Verification: 56 focused Fabricator/Loadout/field-weapon/season checks passed, including weapon/mod/charm current-run application, full-slot rejection then explicit replacement and one-spend print behavior. A broader 39-check weapon/projectile regression subset and the production build/media audit passed.

## Evidence register

References use **entry `id`**, not zero-based array position, followed by elapsed milliseconds. JSON messages embed diagnostic objects; expand the referenced entry to inspect its details. SHA-256 and compact metrics can be reproduced with:

```sh
node scripts/analyze-sprint-playtest.mjs docs/logs/log21.json docs/logs/log22.json
npm run logs:fetch -- --latest 4
node scripts/analyze-sprint-playtest.mjs logs/hunker-bunker-session-2026-09-13*.json
```

Raw hosted files remain in ignored `logs/`; retrieval is documented in [the runbook](../session-log-review-runbook.md). Four newest exports were retrieved from the configured service, whose newest listed capture was September 13 at 03:10 UTC. Two are progressive exports of the same Linux session: use the later `kmxk` capture, not both as independent runs.

| Reference | Capture | Session / verified scope |
| --- | --- | --- |
| L21 | [log21.json](../logs/log21.json) | September 14 02:02:09.927 UTC; 354,957 ms; 879 entries; Engineer; browser; Steam inactive |
| L22 | [log22.json](../logs/log22.json) | September 14 05:38:42.888 UTC; 675,755 ms; 8,221 entries; Tank; browser; Steam inactive; elimination complete, 9 kills |
| SW | `logs/hunker-bunker-session-2026-09-13T01-53-59-897Z-mtz5uny8-5tbj.json` | Windows/Electron, `2.4.2-beta`, Steam active; started 01:37:04.059 UTC; 1,015,515 ms; 9,915 entries |
| SD | `logs/hunker-bunker-session-2026-09-13T01-54-16-244Z-mtz5uz9y-kmxk.json` | Linux/Electron, `2.4.2-beta`, Steam active; started 01:37:03.537 UTC; 1,032,683 ms; 1,587 entries |
| SS | `logs/hunker-bunker-session-2026-09-13T03-10-00-720Z-mtz8kcyd-13lt.json` | Windows/Electron, `2.4.2-beta`, Steam active; 280,375 ms; 1,088 entries; poison death |
| U | User notes and three supplied screenshots | Direct visual/playtester reports; not automatically proven by unrelated log traffic |

**Missing evidence:** no inspected capture establishes the specific Foundry under-world failure, a negative-Y excursion during that failure, or destruction of its floor. L22 does show discovery, nearby depenetration, and an activation click. The separately described failure capture cannot yet be positively identified. Preserve that P0 ticket; request the exact filename or a new marked capture instead of inventing a crash trace. The final menu/showcase coordinates in SS are not evidence of a Foundry fall.

### Corrections to the previous review

- The 11.3-minute Tank session is **L22**, not L21. Neither is a packaged Steam session. The separately retrieved SW/SD/SS captures do establish Steam-active packaged clients.
- L21 contains **184** `Long task` entries totaling **38,817 ms**; its largest are **7,973 ms** (id 304, 287384 ms) and **7,394 ms** (id 308, same delivery timestamp).
- L22 contains **4,018** such entries totaling **358,155 ms**. Its largest are **15,698 ms** (id 2275, 290060 ms) and **15,196 ms** (id 2347, 316413 ms). These are sums of reported task durations, not a measured percentage of user-visible freeze time; observer delivery can be delayed.
- L22 id 2275 includes a **15,623.1 ms `frame:render` phase**; id 2347 includes **15,122.9 ms `frame:render`**. Nearby O2 model clone/prepare samples are 0.1/0 ms, so the evidence does **not** justify blaming expensive GLB cloning or video decode alone. First-visible rendering, shader compilation/upload, driver stalls and overlapping presentation work need separate measurement.
- L22 final GPU timer maximum is 1,440.48 ms (L21: 1,731.17 ms), but the longer CPU/render stalls above dominate this investigation. A session-wide maximum does not locate the exact offending frame.
- `gpuFrame.droppedFrames = 556` in L22 means **GPU timing queries skipped/failed**, not 556 presentation frames lost: see [gpuFrameTimer.js](../../src/gpuFrameTimer.js), `beginFrame`/`endFrame` (around line 81). Do not use “fewer than 50 dropped frames” as an acceptance gate based on this counter.
- L22 final JS heap is **869,442,434 bytes**, not 1.2 GB. Texture estimate is **1,343,108,905 bytes**, total estimated GPU memory **1,457,051,913 bytes**. Estimates and final snapshots are not peak physical VRAM measurements. L21 final total estimate is 1,345,127,620 bytes.
- L22 final 3,473 wall instances / 169 wall meshes are real, but do not prove a disconnected maze or explain freezes by themselves.
- `totalPickups = 17,999,809` is not millions of spawned pickups. `ThreeGame.getRunStats` (around line 20861) labels the sum of **bank med + tech + coin** as `totalPickups`. Debug resources can inflate this number. Fix the metric contract (DP-48).
- L22 id 8140 (654083 ms), the later `INITIATE BUILD`, precedes HP **4/5**, the `int_26` video (8147), and an 80 ms task (8148). This is not low-health evidence. The **first** O2 repair is id 2258 (274199 ms), followed by the much larger stalls.
- Two distinct boss-intro keys occur, not two logged requests for an identical filename: L22 ids 2453/2483, SW 3742/3771, SD 650/664. Resolve their asset aliases and encounter ownership before diagnosing duplicate media.
- Missing effects are proven; incorrect simultaneous VO is not established merely by `AUDIO` volume. L22 has 346 missing `footstep_concrete` attempts and 25 `metal_stress` attempts; speech needs cue/speaker/take telemetry.
- Day/rest code, boss wall damage, achievement forwarding/reset, museum pedestals, and map reset already exist. The work is to reconcile incomplete runtime behavior, not recreate these systems blindly.

## Priority and execution order

P0 = stalls/soft-locks or core progression failures that block a credible beta playthrough. P1 = functional correctness and usable testing. P2 = presentation polish after dependencies. Suggested owners are disciplines, not assigned people. Effort S/M/L means roughly one focused change / multi-system change / multi-session investigation; it is not a delivery promise.

| Stage | Work | Exit gate |
| --- | --- | --- |
| 1 — trustworthy reproduction | DP-01, 05, 48; capture IDs, seeds, build SHA, CPU/GPU/video/plane spans | Same route replayable; telemetry distinguishes render, media and portal state |
| 2 — critical path | DP-02–06, 10–16 | O2 → first boss → Foundry → next boss without long freezes, duplicate intros or soft-lock |
| 3 — interface and movement | DP-17–38 | Readable full-stage menus, coherent previews, connected traversal and clear hazards/objectives |
| 4 — repeatable QA | DP-39–46 (Steam tooling may proceed alongside stage 2) | Isolated museum, complete audio audition, reset/re-earn and no-charge inventory test routes |
| 5 — content and release sweep | DP-07–09, 31, 47 and all remaining acceptance routes | Craft outputs work immediately; environment, themes and repeated runs validated |

Do not close the umbrella review until every child has either passed its acceptance checks or is explicitly deferred with reason and impact. Do not use debug-inflated economy sessions as balance/performance baselines.

## Detailed tickets

### DP-01 · P0 · Runtime performance baseline and instrumentation · Engine · M

**Problem:** frequent traversal/menu freezes; previous analysis underestimates their severity and overstates their cause.

**Evidence:** L21 ids 245 (262843 ms, 1905 ms task), 304/308; L22 2275/2347; SW 3591 (469994 ms, 10541 ms), 3659 (490937 ms, 10062 ms), 8222 (854347 ms, 12805 ms). L22 adaptive quality was already enabled, so “turn on adaptive mode” is not sufficient.

**Code:** [threeGame.js](../../src/threeGame.js), frame render/update loop, chunk mount budget and `createWorld3dModel`; [gpuFrameTimer.js](../../src/gpuFrameTimer.js); [gpuMemoryBudget.js](../../src/gpuMemoryBudget.js); [debugConsole.js](../../src/debugConsole.js). Existing `threeGame.chunkMountBudget.test.js` covers only part of this path.

**Fix:** record actual frame intervals, task start/end, transition/encounter IDs, render first-use, shader preparation, asset upload, media readiness, active overlays and resource lifetime. Run cold/warm fixed-seed routes on the RTX system and packaged Linux hardware; budget model preparation per frame, prioritize visible assets, and pause hidden preview renderers. Avoid a blanket preload of the entire asset catalog.

**Acceptance:** attach before/after traces on identical settings; no unexplained >100 ms steady-play task and no >250 ms unresponsive UI/build transition; target <50 ms normal-play tasks and report p95/p99 frame intervals separately per hardware target. Explicit loading phases must remain responsive. These are proposed gates, not current measurements.

### DP-02 · P0 · O2 first-render stalls · Rendering/media · L

**Problem:** repair click and post-video transition freeze the game.

**Evidence:** L22 2258 (274199 ms) repair → 2264 Foundry discovery → 2266 bubble activation → 2275, 15.7 s task → 2296 (291643 ms) O2 video → 2347, 15.2 s task. Both extreme tasks contain extreme render phases. SW reproduces multi-second O2-adjacent tasks.

**Code:** `threeGame.js` O2 upgrade listeners around 6290, generator presentation, frame rendering; [main.js](../../main.js) O2 orchestration around 5225 and cutscene routing around 7364; [cutscene.js](../../src/cutscene.js).

**Fix:** measure and prepare only required generator materials/geometry/media ahead of interaction; separate bank mutation, visual readiness and reveal phases. Keep video/DOM state changes out of synchronous render bursts. Profile first-render compilation/upload independently from video decode and chunk work. Add cancellation and error fallback that leaves the purchase committed exactly once.

**Acceptance:** ten cold/warm repair sequences meet DP-01 gates, input/skip stay responsive, no duplicate spend, and video failure cannot strand the player. No “fixed by preload” claim without a hardware trace.

### DP-03 · P1 · One presentation per boss encounter · Gameplay/media · M

**Problem:** boss introduction appears twice, interrupting play.

**Evidence:** L22 2453 (324835 ms) `event-boss-encounter-cybersnail`, then 2483 (333068 ms) `int_13_a_snail_blocks_the_hallway`; same pair SW 3742/3771 and SD 650/664.

**Code:** `main.js` cutscene event aliases/orchestration, `src/cutscene.js`, `src/voiceCallouts.js` boss listeners, `threeGame.js` boss spawn events.

**Fix:** choose one director for an encounter ID; collapse legacy event and direct-film requests to that identity, with queued/playing/completed states. Deduplicate host/remote and retry requests without suppressing a genuinely new encounter. Resolve filename aliases in logs.

**Acceptance:** one intro for each boss per encounter on web and paired packaged clients; skip, death, retry and reconnect do not double-play or permanently suppress later encounters.

### DP-04 · P0 · Mayor destruction, dialogue and hostile state · Gameplay/animation · M

**Problem:** two visible representations, retained teacup, hostile actor trapped, dialogue and interaction continue after destruction.

**Evidence:** U; no matching Mayor hit sequence in inspected captures. Code strongly supports a lifecycle gap: `onMayorTinaHit` hides the mayor on kill but not the cup; normal cup removal lives in transformation completion. Interaction tests `phase === 'idle'`, while hit handling separately changes `tinaHostile`/`tinaDead`.

**Code:** `threeGame.js` `setupMayorTinaEncounter` (4435), `interactWithMayorTina` (4509), transformation/reset methods, `onMayorTinaHit` (21686); [mayorTinaCombat.js](../../src/mayorTinaCombat.js); `threeGame.mayorTinaSecret.test.js`.

**Fix:** one encounter lifecycle controlling friendly, warning/hostile, transforming and dead states. On hostility clear friendly interaction/dialogue, remove cup visual/collider and place the animated hostile actor on reachable ground. On death cancel pending callbacks/audio, remove interaction and resolve the story choice once. Preserve the authored four-hit/story-linchpin rule unless intentionally rebalanced.

**Acceptance:** shoot/engage/transform in every ordering, including rapid hits and leaving/reentering. One intended actor, no cup obstruction, working chase, no dead speaker/prompt, one story resolution and clean reset.

### DP-05 · P0 · Foundry under-world/vanishing surface recovery · World/physics · L

**Problem:** entering the Foundry reportedly removes the ground or leaves the player below it, soft-locking the run.

**Evidence:** U; precise failure capture unidentified. Related L22 2264 (274203 ms) places Foundry at (59,10); 6379/6427 (552385/555146 ms) show horizontal depenetration nearby; 6730 (572425 ms) clicks `ACTIVATE FOUNDRY`. None proves ground deletion.

**Code:** `threeGame.js` `enterFoundryInterior` (23817), `mountFoundryInterior`, `exitPocket` (23905), plane transitions and chunk disposal; `threeGame.foundryInterior.test.js`. Entry explicitly hides `chunkGroups` and moves to `POCKET_WORLD_Y`: being below the surface is intentional only while a valid interior is mounted.

**Fix:** make entry transactional: mount/validate floor and exit first, then commit plane, visibility, player and camera together. Retain a safe return position and rollback on load/error/death/run reset. Keep collision/render plane ownership aligned; do not dispose shared surface geometry through interior cleanup. Add plane-aware out-of-bounds recovery, not a global Y=0 teleport that breaks intentional sublevels.

**Acceptance:** 20 enter/exit cycles, second run, death inside, save restore, asset failure and chunk eviction all leave a valid floor/exit. Recovery restores a validated walkable surface position and logs the reason. Capture the original failure before asserting root cause.

### DP-06 · P0 · West maze connectivity and usable doors · Generation · L

**Problem:** west-of-crash complex has doors inside walls, disconnected rooms/no exits, excessive props and poor enemy distribution.

**Evidence:** U screenshot/route report. L22 wall counts are context only; they do not establish topology. Need seed, chunk coordinates and room IDs from the failing route.

**Code:** [chunkStructure.js](../../src/chunkStructure.js) `buildMazeChunkStructure`, authored-room and hallway connector builders; [worldRoutePlanner.js](../../src/worldRoutePlanner.js); `threeGame.js` structure mount, door/collision and scatter placement; `chunkStructure.reservationBridge.test.js`.

**Fix:** derive doors/openings/collision from shared sockets; flood-fill walkable cells from the ship through every required room/site after dressing. Reserve doorway and navigation clearance before spawning props. Reject or repair disconnected generation deterministically; enforce encounter/cover budgets instead of filling empty cells indiscriminately.

**Acceptance:** failing seed plus at least 100 varied seeds have routes to required exits/sites; every door changes collision with its visual state; no prop seals a connector; walk the reported west complex in both directions.

### DP-07 · P1 · Destructible pop-in and proximity spawning · Streaming · M

**Problem:** destructibles appear/disappear within sight as the player approaches.

**Evidence:** U; L21 301 (279041 ms) adaptive state reports seven pending mounts; this supports streaming pressure, not measured pop-in distance.

**Code:** `threeGame.js` chunk mount queue, visible/prefetch radii, `createWorld3dModel`, scatter reconstruction; `threeGame.chunkMountBudget.test.js` and `threeGame.chunkVariation.test.js`.

**Fix:** deterministic placements generated before visibility, outer-ring prefetch with frame budgets, view-distance hysteresis for eviction, cheap placeholders outside visibility only, persistent destruction keyed by run/chunk/entity. Log mount distance, visibility and readiness.

**Acceptance:** sprint/turn/backtrack through chunk boundaries with cold assets: no visible near-player placement swaps; destroyed props stay destroyed; cache remains bounded. Do not fix this by loading the whole world.

### DP-08 · P1 · Prop scale and interaction contract · World art/gameplay · M

**Problem:** intended interactables cannot be used and model sizes do not fit their spaces.

**Evidence:** U; reticle changes alone do not identify incorrect props.

**Code:** [world3dOverlay.js](../../src/world3dOverlay.js) model height/yaw catalog; `threeGame.js` interaction candidates around 6450 and destructible-hit filtering around 21732; authored room placement data.

**Fix:** per-asset manifest with intended role, scale/bounds, interaction anchor/radius, collider and destruction behavior. Audit named problem props in DP-39 gallery. Decorative props must not advertise interaction; intended usable objects need an appropriate prompt and response.

**Acceptance:** catalog validation and screenshot sweep show consistent scale, accessible prompts, matching colliders, and functioning actions. Record exact asset IDs for any exceptions.

### DP-09 · P1 · Boss-width wall breaches · Enemy AI · M

**Problem:** bosses search for holes rather than break two-wall-wide routes to the ship/player.

**Evidence:** U; L22 destroyedWallCount=14 does not attribute destruction to a boss. Wall damage already exists.

**Code:** `threeGame.js` boss wall damage around 23616 and movement collision around 29727; [bossWallDestruction.test.js](../../src/bossWallDestruction.test.js); [bossPhases.js](../../src/bossPhases.js).

**Fix:** sweep a boss-sized corridor toward its valid target, select adjacent destructible wall segments for a breach at least two wall cells wide, remove their collision and update pathing together. Preserve intentionally indestructible progression boundaries; telegraph impact and throttle effects.

**Acceptance:** cyber/cryo/spore bosses approach the ship/player through blocked layouts, break and traverse the required width without tunneling or repeated stuck attacks; host/client breach state agrees.

### DP-10 · P1 · Turret is an explicit construction choice · Economy/gameplay · M

**Problem:** O2 automatically provides an active turret and trivializes the first boss.

**Evidence:** U and concrete code: `bank.js` normalization around 515 unlocks the turret when O2 level ≥1 or other unlocks exist; `threeGame.js` also calls `unlockBaseTurret` around 4090/4144. L22 has a turret-fire attempt at 3181.

**Code:** [bank.js](../../src/bank.js), `unlockBaseTurret` (1014), normalization; `threeGame.js` turret setup/update and terminal build UI.

**Fix:** separate eligible/blueprint unlocked from built/active. Add an explicit priced build action after O2 eligibility. Remove automatic activation from both live listeners and save normalization; define migration for old beta saves without silently charging/refunding.

**Acceptance:** fresh O2 repair never produces turret fire; deliberate build spends once and spawns once; no build funds means no build; reload preserves choice. Test first boss with and without turret.

### DP-11 · P1 · O2 monitor-rise camera choreography · Presentation · M

**Problem:** the rise occurs outside the player's view.

**Evidence:** U; L22 O2 video at 2296 is not proof the rise was seen.

**Code:** `main.js` O2 sequence, `threeGame.js` generator reveal/camera methods and upgrade listener around 6336; [cutsceneTiming.js](../../src/cutsceneTiming.js).

**Fix:** sequence purchase → readiness → video → controlled look-at → rise → short hold → restore view/input. Use an explicit completion signal, not competing timers; restore on skip, death, abort and media error. Bound camera movement and offer reduced-motion behavior.

**Acceptance:** purchase while facing all four directions; monitors stay in frame through the rise and gameplay view/input always returns. Camera tests separate from DP-02 frame-budget tests.

### DP-12 · P1 · Second-boss video and structure-rise sequence · Presentation · M

**Problem:** later console upgrade lacks the correct immediate video/rising structure presentation.

**Evidence:** L22 8140→8147 proves an `int_26` request within 7 ms, contradicting a universal “no immediate video request.” It does not prove a decoded visible frame or rise animation. U reports the visual failure.

**Code:** `threeGame.js` terminal objective purchase and hull/radar/reactor unlock dispatch; `main.js` tier/boss choreography and film aliases.

**Fix:** reuse the DP-03/11 director with a per-upgrade structure, camera target and video definition. Readiness states distinguish requested/decoded/playing; prevent boss AI from starting before the reveal is complete or explicitly skipped.

**Acceptance:** each tier has the correct visible film and rise once, including save-restored upgrades and skip/error paths; never reuse the first structure's animation unintentionally.

### DP-13 · P0 · Context-correct health/oxygen/shield speech · Audio/gameplay · M

**Problem:** health warnings use inappropriate lines and overlap other dialogue.

**Evidence:** U; L22 recorded HP states include 3/4, 4/4 and 4/5, not a demonstrated low-health interval. SS poison death at 1023 (229930 ms) supplies a hazard route. Need chosen cue/speaker/subtitle/audio telemetry.

**Code:** `threeGame.js` low-health trigger around 17897; [audio.js](../../src/audio.js) `playVoiceCallout` (597), `playVoiceForMessage` (645); [voiceCallouts.js](../../src/voiceCallouts.js); [data/voiceBanks.js](../../src/data/voiceBanks.js).

**Fix:** distinct semantic cue IDs for HP, oxygen, cold, toxins and shield; trigger on downward threshold crossings with hysteresis, not every update or max-HP increase. Route all speech through the existing voice owner, including narrative/video dialogue, and cancel expired queued warnings when healed or changing phase.

**Acceptance:** scripted HP/heal/max-HP/O2/toxin scenarios choose only appropriate text/audio; no simultaneous spoken channels; no health warning from an upgrade granting max HP; no gameplay warning in menus.

### DP-14 · P0 · Session-wide speech no-repeat policy · Audio · M

**Problem:** lines repeat painfully; alternating two recordings of the same sentence does not solve it.

**Evidence:** U. The branch already has `_lastVoiceTake` and priority checks in `audio.js`; these only address parts of the problem, not shared line identity across all producers.

**Code:** `audio.js` voice ownership/priority/take selection; `voiceCallouts.js`; line director and dialogue dispatch in `threeGame.js`/`main.js`.

**Fix:** shared scheduler keyed by semantic line ID, speaker, encounter and run. No exact spoken-line repeat within an expedition; use unplayed eligible variants, then silence/captions. Story beats are once per encounter. Critical cues may update nonverbal alerts without replaying speech. Expire queues and reset at an explicit new run; keep same-line alternate takes under one repeat identity.

**Acceptance:** 20 minutes of repeated damage/reload/entry produces no repeated semantic line in the same run, no overlap, no stale queue after healing/death, and repeat history resets predictably on a fresh expedition. Audition mode is explicitly exempt.

### DP-15 · P1 · Detailed VO script and take mapping · Narrative/audio · M

**Problem:** recordings, subtitles and gameplay intent need a single authoritative script.

**Evidence:** U; prior take installation/rotation commits provide assets, not a complete approved dialogue script. Existing [VO planning](vo-voice-banks-2026-09-13.md) must be reconciled with actual take contents rather than assumed take ordering.

**Code:** `src/data/voiceBanks.js`, audio cue mappings, `art/source/audio/vo/segments/vo-takes.json`, `src/data/campDialogue.js` and gameplay cue producers.

**Fix:** a script row per semantic line: trigger/precondition, exclusions, speaker, exact subtitle, emotional direction, priority, lifetime, repeat scope, source/time range and every alternate take. Audit recordings by listening; unsupported cues stay silent/subtitled instead of borrowing unrelated speech. Armory changes audition a fitting bank introduction/readiness sample without altering gameplay cooldown history.

**Acceptance:** every shipped trigger maps to approved text and matching takes; every take is auditionable; no unused/mislabeled cuts; automated asset/subtitle mapping checks plus human content sign-off. Deliver the script as a separate child artifact, not merely more recording files.

**Implementation pass 8:** Alternate-radio cues now use strict semantic slots,
one authored speech owner, expedition-scoped no-repeat history, downward-only HP
and shield threshold triggers, exact start-time subtitles, and Armory-only
audition bypass. The authoritative trigger/exclusion/take matrix is in
`docs/planning/vo-runtime-script-2026-09-14.md`. Unsupported meanings stay silent
rather than reusing the other bank's unrelated line. Human listening approval of
the freestyle source cuts remains a release-content check, not an automated-code
claim.

### DP-16 · P1 · Missing sound keys and bounded audio diagnostics · Audio · S

**Problem:** common actions request absent sounds and spam the log.

**Evidence:** L21 missing `footstep_concrete`: 55 attempts, first 334. L22: 346, first 960; `metal_stress`: 25, first 976; also `alert_high_priority` 2407, `boss_kill` 3039, `turret_fire` 3181 and several UI aliases.

**Code:** `audio.js` manifest/play methods and callers; `audio.soundsetWiring.test.js`; retail media audit.

**Fix:** reconcile exact keys with authored assets, consolidate aliases, validate static caller references, and rate-limit repeated missing-key reporting while preserving counts. Do not confuse missing effects with proven VO overlap.

**Acceptance:** canonical route has zero missing required keys; optional fallback is safe and logged once with a count; intended footsteps/turret/confirmation effects are audible with appropriate spatialization.

### DP-17 · P1 · Readable full-stage Armory · UI · M

**Problem:** tiny equipment controls occupy a narrow corner of a huge stage.

**Evidence:** U Armory screenshot; L21 enters Armory at 92 (19925 ms), L22 at 151 (56726 ms). Images establish readability, not log menu snapshots.

**Code:** [armoryUi.js](../../src/armoryUi.js), [styles/armory.css](../../src/styles/armory.css) around 254 (8–11 px hints/fields), global `style.css` Armory rules, [armoryScene.js](../../src/armoryScene.js).

**Fix:** full game-stage shell with bounded header/footer, deliberate preview and equipment columns, readable text floors and ≥44 CSS-pixel primary targets after stage scaling. Group weapon/suit/cosmetics in tabs if needed. Size camera/viewports from the actual available stage, not assumptions about a 4K screenshot.

**Acceptance:** 1280×800, 1920×1080, 2560×1440, 4K and ultrawide: no overflow or overlapping actions, readable equipped names, keyboard/controller access and useful preview size. Validate computed hit boxes, not only screenshot aesthetics.

### DP-18 · P2 · Remove confusing Armory placeholder presentation · UI/art · S

**Problem:** random “roundtable”/turntable presentation and redundant telemetry distract from equipment.

**Evidence:** U. `armoryScene.js` around 209 builds an explicit hexagonal platform; `armoryUi.js` around 700 advertises “Turntable Staging / 360° DRAG ORBIT.” The reported object is not yet proven to be a missing-asset fallback.

**Code:** those platform/readout builders and Armory backdrop layout.

**Fix:** compare the intended preview pedestal with the screenshot; remove redundant platform chrome/telemetry and any confirmed fallback object. Keep useful drag/orbit interaction with a single unobtrusive instruction. Preserve weapon/charm preview ownership and dispose removed resources correctly.

**Acceptance:** only intended operator/weapon assets and coherent staging remain; no placeholder labels/shapes; dragging still behaves correctly and never scrolls the equipment UI.

### DP-19 · P1 · Hero preview stalls, T-pose and synchronization · Animation/UI · M

**Problem:** center and left preview disagree and sometimes stall/T-pose.

**Evidence:** U screenshots/reproduction; L21 menu/Armory interval has 623/346/329 ms tasks (76/91/94), but no logged skeleton failure. Do not equate a stall with a proven rig fault.

**Code:** [scoutHeroPreview.js](../../src/scoutHeroPreview.js) `setType` (40); [player3dOverlay.js](../../src/player3dOverlay.js) animation loading/retargeting; `main.js` `syncHeroPreview`, `triggerHeroPreviewSwap` (13749), sprite timer (13737); `threeGame.js` menu showcase.

**Fix:** share selected class, cosmetic and animation-clock/state definitions across both views. Keep the last fully posed model until the newest generation is loaded; reject stale async completions; validate required bones/clips and supply a posed fallback. Stop hidden loops; make the door/swap state recover on rejection/timeout. Existing generation guard should be retained, not duplicated.

**Acceptance:** rapid Scout/Tank/Engineer cycling 50 times under cold/throttled loading never reveals bind pose or stale class. Both panels show the selected operator and matching intended action; no hidden preview render work after deployment.

### DP-20 · P1 · Hero command panel is a 3×3 grid · UI · S

**Problem:** actions below the left preview scroll in cramped columns instead of filling nine usable slots above Initialize.

**Evidence:** U Hero Select screenshot; SW 101/102 (47026/47519 ms) targets command wrappers rather than a clear button.

**Code:** `index.html` hero command markup, `style.css` `.menu-command*`/`.preview-box`, `main.js` controller focus navigation around 1176.

**Fix:** nine-cell grid above a persistent full-width Initialize action. After Daily Ops moves, arrange actual available commands; do not invent inert filler. Fit preview height to remaining space and define row/column controller traversal.

**Acceptance:** all nine positions and Initialize fit without inner scroll on supported landscape sizes; large target activation, visible focus, predictable directional navigation, no hidden actionable cells.

### DP-21 · P1 · Daily Ops moves to full-stage Loadout mode selection · UI/game flow · M

**Problem:** Daily Ops belongs with deployment choices, not Hero Select utility actions.

**Evidence:** U; current `main.js` `daily-ops-btn`/status around 2817 and Hero Select markup own this action.

**Code:** `index.html`, `main.js` Daily Ops/start handlers; Armory loadout actions and mode selection state.

**Fix:** add a loadout mode choice alongside Single Player (and existing supported modes), retain selected class/equipment when entering/leaving Daily Ops, and relocate status/seed/rewards with it. Remove the Hero Select entry and update controller focus routes.

**Acceptance:** Daily Ops accessible only from the intended Loadout route; launch uses its real seed/rules, back returns to the same loadout, and the screen fits the stage with DP-17 target sizes.

### DP-22 · P1 · Balanced Settings tabs with session actions first · UI · M

**Problem:** current Display first tab is nearly empty; Gameplay has most controls; Quit/Abort/Debug are not together on the first page.

**Evidence:** U and current markup: `index.html` tabs around 2182; Gameplay panel around 2223; Operator around 2372. The initial tab pass is present, not finished.

**Code:** `index.html`, `main.js` `selectSettingsTab` (9664), final Settings overrides in `style.css`.

**Fix:** first **Session** tab = Resume/close, Abort (run only), Quit, Debug and useful core display options. Separate **Controls**, **Camera & HUD**, **Audio**, **Accessibility**, **Profile & Saves** to distribute current rows. Keep action footer in the layout budget, not below a full-height panel. Bound width/height to the game stage and remove inherited min-width overflow. Use a paged tab strip if labels cannot fit, rather than clipping controls.

**Acceptance:** every control reachable without menu-body scrolling at supported landscape sizes, first page contains the requested actions, Abort/Reset retain confirmation, hidden tabs excluded from focus. Test resize, localization, controller-only and enlarged text; fall back to explicit subpages where needed, never inaccessible clipped content.

### DP-23 · P1 · Pointer motion never scrolls; whole-row activation · Input/UI · M

**Problem:** hovering/moving the mouse shifts Settings; narrow toggles are difficult to hit.

**Evidence:** U and earlier settings request. `focusControllerTarget`/`centerSettingsFocusTarget` can reposition Settings; disabling wheel/cursor scrolling on one input path does not cover native hover. The branch already has delegated `.setting-item` clicks.

**Code:** `main.js` around 1031/1098, native pointer and virtual-controller focus paths, Settings row handler around 9694; [settingsWheelGuard.js](../../src/settingsWheelGuard.js); `tests/e2e/controller-focus.spec.js`.

**Fix:** explicit focus origin: only deliberate keyboard/controller navigation may reveal a target; native hover never writes scrollTop or invokes scrollIntoView. Prefer semantic checkbox labels/full-width actions. Row clicks must toggle once, cycle selects predictably and respect disabled controls, while clicks on a child input/button keep native behavior.

**Acceptance:** pointer sweeps leave every scroll position unchanged; row/label/control clicks toggle exactly once; disabled rows do nothing; keyboard, wheel-intended controls and gamepad remain usable. Assert scroll positions and resulting values, not only overflow CSS.

### DP-24 · P1 · Turn/aim sensitivity selection and behavior · Input · S

**Problem:** blank sensitivity display and inconsistent choice behavior in the original screenshot.

**Evidence:** U earlier screenshot. Audit numeric/string round-trip: markup percentage values such as `1.0`/`2.0` can disagree with numeric values serialized as `1`/`2`.

**Code:** `index.html` Turn / Aim Speed select, `main.js` settings load/save and sensitivity presets, `threeGame.js` turn/aim input application.

**Fix:** canonical numeric option values, finite/clamped migration and a valid default. One source for mouse/controller sensitivity; document which turn axes it affects. Remove duplicate competing preset/select controls in the same layout.

**Acceptance:** every 50/75/100/125/150/200% selection displays and persists across reload; malformed saves recover; measured turn/aim response scales monotonically without changing menu pointer speed or scroll position.

**Implementation pass 9:** Settings is now a six-page full-stage interface:
Session, Audio, Controls, Camera & HUD, Accessibility, and Profile & Saves.
Resume, context-sensitive Abort, Quit, and authorized Debug are together on the
first page; existing controls are redistributed into bounded two-column pages.
Native pointer hover synchronizes highlight without `scrollIntoView`, full-row
activation respects disabled controls, and aim values use canonical numeric
option strings with a finite allowlist/default migration. Browser coverage at
1280×800 verifies all six pages fit without scrolling, pointer sweeps preserve
`scrollTop`, every preset displays/persists, and controller/subpanel focus still
works.

### DP-25 · P1 · Terminal layout and real objective/night log · UI/gameplay · M

**Problem:** cramped terminal, redundant/unclear choice panel, first-tab scroll; new log tab is currently relocated cards plus a snapshot, not objective history.

**Evidence:** U; L22 first repair 2258 and later build 8140 verify important actions. Existing `renderTerminalEventPanel` does attach real choices, so it is inaccurate to call all choices inert without checking their result.

**Code:** `index.html` `console-terminal-modal`; `threeGame.js` `getActiveTerminalEvent`/`renderTerminalEventPanel` (10964/10984), `openConsoleModal` (11665) and day summary around 11708; `style.css` terminal sizing/minimums.

**Fix:** full-stage shell, first tab bounded overview with bank/current objective/next build/heal; upgrades on their own tab; journal with chronological accepted/completed objectives, next actionable step, current expedition day/rest phase and deadline changes. Move optional events into a clearly named section with visible outcomes rather than silently deleting working content. Subscribe summary/history to real state changes, not only modal open; distinguish lighting clock from expedition day.

**Acceptance:** first tab `scrollHeight <= clientHeight` at all supported sizes; no offscreen fixed min-width; real objective/night transitions update while open; resolved events don't reroll merely from rendering; all purchase actions execute once with visible results.

**Implementation pass 10:** Terminal uses the full-stage bounded shell and its
Base page is verified with `scrollHeight <= clientHeight` at 1280×800. The
Objective/Night page now maintains a bounded, chronological expedition journal
from live mission status, next affordable base action, day/rest phase, local
light transition, and story deadline resolution/expiry. Re-rendering an
unchanged state does not duplicate history; a fresh expedition clears it. The
working random-choice system is retained and accurately labeled **Optional
Field Opportunity**, with its result still rendered beside the choice. Browser
coverage also completes a real skill purchase after switching through all three
Terminal pages.

### DP-26 · P1 · Gameplay objectives never leak into menus · UI lifecycle · S

**Problem:** objective prompts persist into Hero Select/Armory.

**Evidence:** U; L21 PHASE ids 52/71/92/148/161/204 supply transition points, but no definitive screenshot of leaked HUD in the logs.

**Code:** `main.js` app-phase handling around 489 and HUD notification stack; `threeGame.js` profile/reset and objective dispatch; menu visibility snapshots.

**Fix:** gate gameplay-only HUD by authoritative app phase and clear transient notifications/listeners on run exit. Cancel stale asynchronous callbacks using run/phase generation IDs. Preserve mission data without rendering it over menus.

**Acceptance:** death→menu→hero→Armory→restart and abort routes show zero gameplay HUD outside gameplay, including late events/video callbacks and overlays opened from a paused run.

### DP-27 · P1 · Clear cold/toxin threat and time-to-harm · HUD/gameplay · M

**Problem:** unclear frozen bar and insufficient feedback while dying outside safety.

**Evidence:** U; L22 oxygen falls from 80% (2573, 346134 ms) to 29% (7992, 641848 ms) with `Bubble: true`. SS 1023 records poison death; SD 1365 records oxygen-depletion death. These are distinct hazards, not interchangeable “ice damage.”

**Code:** `threeGame.js` oxygen/hazard/vitals updates; `main.js` vitals HUD and death-cause mapping; `style.css` HUD effects.

**Fix:** separately label oxygen reserve, cold exposure and toxin state, source/safety condition and rate-based estimated time to next harm where meaningful. Add restrained ice/toxin edge effects, directional safety cues and accessible low-motion alternatives. Never present a fixed countdown if variable rates make it false.

**Acceptance:** enter/exit each hazard, stack hazards, heal and pause: bar labels, effects, sound and countdown agree with actual damage; effects clear on recovery/death/menu and remain legible in every theme.

### DP-28 · P1 · Objective markers for Black Box and Foundry · Map · M

**Problem:** important destinations are missing or not discoverable on map/reticle.

**Evidence:** U; L22 2264 logs Foundry reveal; SW 4604 logs Engineer Black Box coordinates, 4822 (608549 ms) recovery video. Neither proves marker visibility.

**Code:** [mapSystem.js](../../src/mapSystem.js) `registerLandmark`; `threeGame.js` Foundry reveal, Black Box marker state (8648+), Meridian compass and map payload; `main.js` map renderer.

**Fix:** shared objective registry used by full map, minimap, compass and reticle; distinguish unknown signal, discovered destination, active/recovered and off-plane. Restore markers from saved objective state and remove them only on resolution.

**Acceptance:** discovery/reload/death/recovery/portal transitions show the right markers and floor/direction; important signals remain identifiable at all zooms without revealing unrelated unexplored terrain.

### DP-29 · P2 · Readable minimap player arrow · HUD · S

**Problem:** direction arrow is hard to distinguish against terrain/objectives.

**Evidence:** U gameplay screenshot; no log can establish readability.

**Code:** `main.js` minimap canvas drawing, map theme/scale; `mapSystem.js` player coordinate payload.

**Fix:** minimum screen-space arrow size, contrast outline, explicit facing tip and separate objective icon shapes. Keep forward direction consistent between camera modes and high-DPI canvas transforms.

**Acceptance:** direction readable on light/dark/fogged maps and all themes at Deck/1080p/4K sizes; verify all cardinal headings and camera rotation.

### DP-30 · P1 · Per-run map reset and fading trails · Map/save · M

**Problem:** permanent line accumulation obscures the map after repeated runs.

**Evidence:** U; SW repeated deaths/restarts at 4604/4672, 5865/5904 and later pairs provide a repeat-run route. `ExplorationTracker` already timestamps points and has `reset`, but `getBreadcrumbTrail` returns them without age filtering.

**Code:** `mapSystem.js` lines 17–89, `main.js` trail drawing, `threeGame.js` run reset/exploration ownership.

**Fix:** separate persistent discovered landmarks from ephemeral route trails. Clear current trail on death/new expedition; optionally retain only a few bounded previous-run segments with age-based alpha, then expire them. Inject a test clock and avoid connecting disconnected historical segments.

**Acceptance:** fake-clock tests verify fade/expiry and memory bounds; five deaths cannot accumulate a solid permanent map scribble; Black Box/known permanent markers remain valid.

### DP-31 · P2 · Complete immediate HUD theme and heart map · HUD/art · M

**Problem:** cosmetic theme recolors only part of the HUD; pink/purple should include a heart-shaped map.

**Evidence:** U; `main.js` theme variables around 2742 already define more than one token, but propagation to every consumer is not proven.

**Code:** `main.js` HUD theme application and canvas maps; `style.css` HUD hard-coded colors; Armory HUD-theme selection.

**Fix:** semantic theme tokens for panels/text/primary/danger/safe/objectives plus a minimap mask identifier. Apply to CSS and canvas/WebGL HUD consumers in one change notification; implement a heart mask with functional clipping and preserved readable markers. Keep danger meaning and accessibility contrast independent of cosmetic hue.

**Acceptance:** changing theme updates every HUD surface immediately without reload, including map, reticle and overlays; heart map works at every scale; default restores fully; hazard colors remain understandable.

### DP-32 · P1 · Black Box corpse matches deceased operator · Character art · M

**Problem:** generic wrong body appears instead of the operator who died.

**Evidence:** SW 4604/5865 store `classType: ENGINEER`; SD 830 stores `TANK`; SS 1023 stores Engineer. Thus class metadata exists. Current `threeGame.js` corpse builder around 8688 constructs generic torso/helmet/limbs.

**Code:** [blackBox.js](../../src/blackBox.js), `threeGame.js` Black Box marker creation; `player3dOverlay.js`/corpse asset catalog.

**Fix:** load a laid-out/frozen corpse for recorded class and, where supported, death-time cosmetic. Freeze a valid death pose or use authored static variants; keep the recoverable box separate and lightweight. Save death appearance, not current loadout, and provide class-correct fallback on missing assets.

**Acceptance:** die with all three classes, switch class, reload and recover: corpse still matches the dead operator, lies on ground without T-pose and has working recovery interaction.

### DP-33 · P1 · Crawler forward orientation · Animation · S

**Problem:** crawler runs backwards.

**Evidence:** U; no heading telemetry proves the angle. `enemy3dOverlay.js` already gives `crawler` a `Math.PI` yaw, so blindly adding another π is unsafe.

**Code:** [enemy3dOverlay.js](../../src/enemy3dOverlay.js) crawler config around 25, movement yaw application; sprite fallback layouts and `threeGame.js` crawler AI.

**Fix:** identify exact crawler variant, establish authored forward axis, apply one asset-local correction separate from world heading; align attack origin and visual facing.

**Acceptance:** named crawler and proto variants move/attack forward in all eight directions; sprite fallback and GLB agree; collision/projectiles unchanged.

### DP-34 · P1 · Cryosnail lateral orientation · Animation · S

**Problem:** ice snail moves sideways.

**Evidence:** U. `enemy3dOverlay.js` normal cryosnail reuses cyber-snail with −π/2; boss cryosnail has a different asset and +π/2. Distinguish which fails.

**Code:** `enemy3dOverlay.js` normal/boss configurations around 16/23 and heading composition; sprite layout data.

**Fix:** verify each model's local forward vector; correct per-asset yaw, not a global snail rotation. Check transform order under animation/root scaling.

**Acceptance:** normal and boss cryosnails walk, turn and attack along travel direction on straight/diagonal paths, with consistent fallback visuals.

### DP-35 · P1 · First ally approaches front door and signals early · AI/presentation · M

**Problem:** post-boss survivor appears off-side; Meridian cue is not available before the character is visible.

**Evidence:** U; L22 3177 (384736 ms) `RECRUIT COMPANION` proves a recruit interaction, not arrival animation or marker behavior.

**Code:** `threeGame.js` first-contact/camp quest runtime, Meridian target (14399), survivor placement around 15522; `threeGame.campFirstContact.test.js`.

**Fix:** stage arrival along a grounded route toward an unobstructed ship-front-door anchor, with an exhausted walk/idle state. Publish the authorized Meridian signal independently of the NPC model's culling/loading. Defer only if the door route is temporarily blocked, with a safe fallback arrival point.

**Acceptance:** first-boss completion produces a visible approach, no pop-in beside the ship; cue precedes arrival as designed; repeated event/load doesn't spawn another survivor.

### DP-36 · P1 · Recruited companions walk and help · AI/animation · M

**Problem:** kill counting works but recruited allies float/sit and do not visibly assist.

**Evidence:** U; L22 recruit at 3177 and related progression are partial evidence only.

**Code:** `threeGame.js` `updateCompanions` (29223), companion creation/AI and quest state; player/NPC animation overlays; `campHumanBehavior.js` for camp-worker states, not a replacement for companion locomotion.

**Fix:** companion locomotion follows grounded navigable paths, velocity drives walk/idle, and active help/escort-only state is explicit. Define when combat assistance unlocks and communicate it. Resolve stuck routes without teleporting into view or through cliffs.

**Acceptance:** recruit, escort, fight and return across doors/canyons: feet stay grounded, animations reflect motion, intended combat help works, kills count once and any escort restriction is clearly displayed.

### DP-37 · P1 · Grounded, connected camp set pieces · World/AI · L

**Problem:** camps float in canyons, cannot be reached and contain T-posed people.

**Evidence:** U; no inspected capture proves floating camp geometry. Capture camp ID/seed/terrain samples before redesign.

**Code:** [camp.js](../../src/camp.js), `threeGame.js` placement gate (13521), camp approach/spawn solver (14615), [campHumanBehavior.js](../../src/campHumanBehavior.js), authored camp dressing and worker model loading.

**Fix:** authored camp footprints with grounded foundations, entry/exit/worker sockets, route reservations and clearance. Validate the whole footprint against terrain, not only its center. Workers require a valid idle clip before becoming visible; defer placement or choose another deterministic site on failure.

**Acceptance:** all camp types reachable from ship across 100 seeds; no floating foundations, inaccessible entrance or visible bind-pose resident. Escort arrives and completes the intended camp progression.

### DP-38 · P1 · Visible expedition day/night and camp-building loop · Progression · M

**Problem:** player never encounters the intended rest/build/expedition cycle.

**Evidence:** U; no explicit cycle milestone in L21/L22. Existing `dayCycle.js` includes sleep, rest completion, expedition start and deadlines. Cosmetic `timeOfDay` lighting is a separate mechanism.

**Code:** [dayCycle.js](../../src/dayCycle.js), `threeGame.js` day state, rest runtime around 15130, `enterFoundryInterior` rest path; `threeGame.dayCycleRuntime.test.js`/`dayDeadlineBindings.test.js`; terminal journal DP-25.

**Fix:** verify availability/gates for safe rest and building, show current day/phase and next actionable objective, and connect camp work/deadlines to the authoritative expedition state. Advance day only on the agreed rest transition, not every cosmetic sun cycle. Persist and synchronize state explicitly.

**Acceptance:** a fresh run can visibly complete expedition→safe rest/build→next day; costs/tasks/deadlines update once, survive save/load, and UI agrees on all surfaces and clients.

### DP-39 · P2 · Museum grid, pedestals and decal orientation · QA/art · M

**Problem:** long corridor display and upside-down decals make asset validation difficult.

**Evidence:** U. `debugMuseum.js` already has pedestals (around 151), but advertises walking +X through categories (410); do not replace all useful display code.

**Code:** [debugMuseum.js](../../src/debugMuseum.js), world decal transforms/catalog and placement helpers.

**Fix:** category grids with labeled pedestals and clear aisles; use upright wall backing for decals with consistent UV/rotation convention. Separate floor and wall decal orientation checks. Reuse pedestal builder and asynchronously fill bounded sections.

**Acceptance:** every catalog item has a labeled cell, sane scale, no overlap and readable upright decal; a category can be surveyed without traversing one enormous line.

### DP-40 · P2 · Paired intact/destructible animated museum samples · QA/animation · M

**Problem:** need each specimen on a pedestal and its destructible/live counterpart behind it cycling idle/walk/attack.

**Evidence:** U; `debugMuseum.js` has an animation loop already, but requested paired state coverage is not established.

**Code:** `debugMuseum.js` model loading and animation loop (81+), world/enemy overlay creation, destruction/debris helpers.

**Fix:** paired display sockets with state labels, local reset and damage action. Animate actors that actually support idle/walk/attack; static props get intact/damaged/destroyed demonstrations instead of imaginary clips. Keep walk cycles in-place on display boundaries and cap active mixers by proximity/category.

**Acceptance:** supported clips loop in order without bind pose; destructive test can be reset repeatedly; neighboring displays remain intact and performance is bounded.

### DP-41 · P1 · Museum is an isolated safe validation session · QA/runtime · M

**Problem:** grip drains and enemies from the run attack while testing.

**Evidence:** U; merely teleporting outside real terrain is not isolation. `debugMuseum.js` opening around 201 retains access to a live game/player.

**Code:** `debugMuseum.js` open/close, `threeGame.js` enemy/projectile/companion updates, hazard/grip drain, world reset and simulation profiles.

**Fix:** explicit QA session profile with frozen needs, no ambient spawns/AI targeting, cleared transient projectiles/effects and independent display actors. Snapshot/restore intended run state on exit or require a deliberate run-ending transition; do not silently damage the player's save.

**Acceptance:** enter mid-combat/low grip, remain ten minutes: no harm/drain/ambient attacks; return leaves no museum objects or muted gameplay systems behind. Resetting the gallery is repeatable.

### DP-42 · P2 · Tabbed museum jukebox for all audio · QA/audio · M

**Problem:** no complete in-world audio/song/lyric audition tool.

**Evidence:** U; audio manifest and take arrays exist, but no complete requested gallery menu was demonstrated.

**Code:** `debugMuseum.js`, `audio.js` manifest/buses, voice-bank catalog, lyric/subtitle and cutscene sound metadata; tab/input patterns in Settings.

**Fix:** jukebox interactable opens bounded Music / Songs & Lyrics / VO & Takes / Effects tabs with search/paging, labels, source/cue IDs, play/stop and gain. Audition uses a dedicated channel and does not consume gameplay repeat history or fire achievements/story events. Stop prior audition and restore background mix on close.

**Acceptance:** every runtime audio catalog entry and alternate take is discoverable/playable, lyric timing visible where present, missing sources clearly labeled; no overlapping samples, accidental gameplay triggers or memory growth from repeated browsing.

### DP-43 · P1 · Debug unlock covers every equippable category in Steam beta · QA/economy · M

**Problem:** “unlock all” does not reliably unlock all categories in packaged testing.

**Evidence:** SW 170–226 (91819–113325 ms) and SS 122–144 repeatedly click the old `UNLOCK ALL SKINS`; L22 181 (78711 ms) clicks newer `UNLOCK ALL COSMETICS`. Clicks alone don't prove success. Current branch expanded category ownership after the older build.

**Code:** `armoryUi.js` debug unlock handler, `armoryOptions.js`, ownership store, `steamVaultUi.js`, Electron QA capability checks.

**Fix:** catalog-derived category sweep (weapons/chassis, sheen, charms, tracer, patches, HUD, voice banks and relevant modules), with completion counts and failed IDs. Centralize authorized beta/tester capability in the main process; UI visibility isn't authorization. Label synthetic ownership separately from Steam-owned inventory and revalidate after Steam refresh.

**Acceptance:** current packaged Windows/Linux beta tester can equip every catalog item across all classes, reload and refresh without unexplained relocking. Public/non-QA build rejects grants even via direct IPC. “All unlocked” means the catalog audit truly passed.

### DP-44 · P1 · No-charge grant-set/key and marketplace test workflow · QA/backend · M

**Problem:** testers need items/sets/keys and acquisition flows without accepted real purchases.

**Evidence:** U; no inspected log proves a purchase or grant API result. Existing local grants do not certify Steam inventory settlement.

**Code:** `steamVaultUi.js`, ownership store, `src/data/steamItemCatalog.js`, `electron/main.cjs` inventory/milestone bridge and server inventory/grant handlers.

**Fix:** explicit synthetic sandbox inventory for free acquisition UI testing, with grant set / grant N keys / reset test inventory and audit receipts. Separately support only authorized server-side Steam test grants if the configured backend permits them. Hard-disable purchase initiation in test mode, label non-tradable synthetic items, bound quantities and retain idempotency. Never place publisher credentials in the renderer or imply local grants are genuine Steam assets.

**Acceptance:** grant/use/refund/reset test flows work offline and online as supported, show source/status accurately, and cannot invoke a charge endpoint. Real Steam test grants require verified tester authorization and server receipts; public requests are rejected.

### DP-45 · P1 · Achievement catalog parity and acknowledged offline sync · Platform · M

**Problem:** achievements must agree with Steam and unlocks earned offline must reach Steam later.

**Evidence:** SW/SD/SS are Steam active and record achievement events, but do not demonstrate acknowledged unlock parity/offline replay. L21/L22 cannot validate Steam at all. Current `main.js` listener sends new unlock events; Electron activation is fire-and-forget with failures logged.

**Code:** [achievements.js](../../src/achievements.js) definitions/evaluation (437+), [steamStats.js](../../src/steamStats.js), `main.js` Steam forwarding (15370), `electron/main.cjs` `hb:unlockAchievement` (805), `electron/preload.cjs`, Cloud save bridge.

**Fix:** compare local API keys/progress semantics/icons/hidden state to the actual published Steam achievement configuration. Add account-scoped durable pending unlocks with request/ack/status and retry on reconnect/startup; reconcile remote/local state without resetting legitimate progress. Verify behavior against the installed Steamworks wrapper, not guessed API return semantics. Keep web-only achievements explicitly local pending an authenticated supported transfer path; don't silently merge arbitrary browser saves into a different account.

**Acceptance:** fresh tester earns each supported achievement online and offline, restarts/reconnects, and sees matching Steam/local state with confirmed results. Errors are retriable, account switches cannot inherit another account's pending events, and “coming soon” entries never masquerade as published unlocks.

### DP-46 · P1 · Reset and re-earn achievements repeatedly in beta · Platform/QA · M

**Problem:** testers cannot reliably reset both stores and trigger the same achievements again, especially offline.

**Evidence:** no reset action/ack in inspected logs. Code already exposes `resetachievements confirm` (`debugConsole.js` around 1408) and gated `stats.resetAll(true)` (`electron/main.cjs` 845). That path resets Steam stats/achievements but does not reset the local engine's `unlocked`/progress, so local one-shot guards can prevent re-earning.

**Code:** those handlers, `achievements.js` state/save APIs, `main.js` achievement engine/UI, save-contract/Cloud bridge and DP-45 queue.

**Fix:** explicit confirmed reset scope: local test progress, Steam current account, or both. Back up relevant test state, reset in-memory + persisted local progress, and use an account-scoped reset generation so stale unlock retries/cloud saves cannot undo the reset. If Steam is unavailable, show pending/unsupported—not success—and serialize remote reset before subsequent unlock replay. Preserve production inventory reward idempotency; repeated achievement QA must not farm tradable rewards. Verify tester authorization in main/backend; do not reset any account during development verification without the tester's explicit action.

**Acceptance:** same tester earns→resets→re-earns three times, including offline reset/reconnect and restart; local/Steam state agrees and reset status is truthful. Public builds deny it; other saves/accounts unaffected; failed reset retains a recoverable state and does not resurrect old unlocks.

### DP-47 · P1 · Foundry crafts functional current-run equipment · Content/economy · M

**Problem:** Foundry presents old concepts instead of usable charms, gun modifications and guns.

**Evidence:** U; L22 6730 `ACTIVATE FOUNDRY` establishes access interaction, not successful useful crafting.

**Code:** [foundry.js](../../src/foundry.js), `main.js` `renderFabricationModal` (11370), crafting/catalog data, bank and loadout application; `threeGame.js` interior workbench interaction.

**Fix:** define recipes with real runtime item IDs, costs, unlock gates, output quantity/slot and immediate equip/apply path. Remove or visibly disable concept-only outputs. Separate run equipment/modifiers from cosmetic/account inventory and show replacement/slot-conflict choices before spending. Build on DP-05 safe interior and DP-25 usable UI.

**Acceptance:** craft at least one supported gun, mod and charm; cost deducted once; each appears and functions immediately in the run; invalid/full-slot craft is safe; restart/persistence matches declared scope. No successful-looking purchase yields an unusable placeholder.

### DP-48 · P1 · Correct telemetry semantics and evidence quality · Diagnostics · S

**Problem:** misleading counters obscure performance/economy analysis and visual failures lack identifiers.

**Evidence:** L22 `totalPickups=17999809` vs `getRunStats` bank-balance sum; query-drop confusion described above. Foundry failure lacks plane/readiness evidence; speech lacks semantic cue/take evidence.

**Code:** `threeGame.js` `getRunStats`, `gpuFrameTimer.js`, `debugConsole.js`, session export and [steam/steamEvents.js](../../src/steam/steamEvents.js) stats consumers.

**Fix:** version the log schema; separate collected item count, collected value, bank balance, debug-granted resources and actual frame intervals. Rename query drops (retain backward-compatible alias if required), annotate estimated memory and measurement coverage. Add user checkpoint, seed/build/asset/entity/encounter/plane IDs; bound diagnostic history and avoid repeated giant context copies. Do not send debug grants into real achievement/stat totals.

**Acceptance:** fixtures show one pickup changes count once, bank spend doesn't reduce lifetime count, debug grants are distinguishable, GPU query failures don't masquerade as frame loss, and exported marked routes are analyzable without 100 MB of redundant phase context. Preserve enough detail to investigate rare stalls.

## Coverage of the supplied 25-item summary

| Original item | Detailed tickets |
| --- | --- |
| 1 Performance | DP-01, 02, 48 |
| 2 VO | DP-13–16 |
| 3 O2/turret/video/camera | DP-02, 03, 10–12 |
| 4 Mayor | DP-04 |
| 5 Maze | DP-06 |
| 6 Armory | DP-17, 18 |
| 7 Hero preview | DP-19 |
| 8 Grid/Daily Ops/Loadout | DP-20, 21, 17 |
| 9 Enemy facing | DP-33, 34 |
| 10 Corpse | DP-32 |
| 11 Ally/camps | DP-35–37 |
| 12 Boss walls | DP-09 |
| 13 Cold/toxins | DP-27 |
| 14 Map | DP-28–30 |
| 15 Day/night | DP-38 |
| 16 HUD leakage | DP-26 |
| 17 Museum | DP-39–42 |
| 18 Settings | DP-22–24 |
| 19 Debug/economy | DP-43, 44 |
| 20 Achievements | DP-45, 46 |
| 21 Foundry soft-lock | DP-05 |
| 22 HUD themes | DP-31 |
| 23 Foundry content | DP-47 |
| 24 Pop-in | DP-07, 48 |
| 25 Props | DP-08 |

Earlier requests not explicit in the 25-item summary remain covered: full-stage/no-hover-scroll/row-click Settings and aim speed (DP-22–24), terminal overview and objective/night journal (DP-25), alternate-take mapping and Armory voice audition (DP-14/15), second-boss rise (DP-12), no-charge sets/keys (DP-44), and repeatable offline achievement testing (DP-45/46).

## Verification and handoff checklist

- Attach a current-build, fixed-seed walkthrough with checkpoints: hero swaps → loadout modes → Settings each tab → deployment → west maze → O2 repair → first boss → recruit/escort → camp → Foundry enter/craft/exit → later boss → death/Black Box → restart → museum.
- Capture app SHA/package version, platform, rendering settings, resolution/DPI, input method, run seed and test-grant state. Do not conflate old Steam captures with current browser results.
- Extend the existing focused tests named above; add real rendered interaction tests for size/scroll/focus and actual gameplay replays for topology, animations and portals. Regex/source tests alone cannot certify the requested experience.
- Steam reset/grant verification requires the authorized tester on the intended beta account. No real-money purchase step. Record local vs remote acknowledgments and verify non-QA denial separately.
- Obtain the exact Foundry failure capture or produce one with plane entry/exit, mounted floor IDs, world visibility, player position and safe-return state. It remains an open P0, not a fabricated diagnosis.
- Each fix should land as a focused commit with ticket ID, affected code, test result and remaining limitation. This master document is the coverage index; it does not replace the required detailed VO script or runtime evidence.

## Review validation

The evidence extractor was run successfully against L21/L22 and all four downloaded exports. Ticket numbering was checked for exactly DP-01 through DP-48; every local Markdown link resolves; `git diff --check` passed. These validate the report, **not** the proposed game fixes. No new gameplay acceptance run or Steam mutation was performed for this planning handoff.

Capture SHA-256 fingerprints (downloaded JSON is normalized by the fetch script):

```text
L21 77eb648f93a4403dd4b30a435061084fc63dc33c2d2a12acd3394dcbc2b8ac61
L22 11bc3008bb9ad713934c92004d274f0d6916076c524bd983d57def4109d39116
SW  711f21f3cfa57ef9d03d6c335006dcf373ab5fa87393c896ebbb8e310dfb92d3
SD  f5974fd51f291268e2fcebdee4905f82d163eb934638d16c2c1efefafd7a8b16
SS  e74c99cb6a5cf7e0c85611a9f46084250212b9137d46de79cbd535cc70aef04b
```
