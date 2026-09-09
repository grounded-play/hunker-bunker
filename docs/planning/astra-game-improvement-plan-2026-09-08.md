# Hunker Bunker — Astra Game Improvement Plan

Status: proposed implementation plan | Owner: project maintainer + Codex | Updated: 2026-09-08 | Review: before each implementation phase and after each playtest

## 1. What this plan is for

Make an expedition feel deliberate, responsive, understandable, and worth replaying. Finish the systems already present, remove the failures that interrupt play, and make completion claims match the exact build a player receives.

The immediate requested change is to move Mayor Tina farther along the opening route to a position selected by the run seed, and turn the encounter 180 degrees around the vertical Y axis so the player approaches its front. This document is written before that gameplay edit. The broader work below is a proposed sequence for review, not a claim that a whole-game overhaul has already happened.

“Astra” is the review name requested by the project owner. This document does not claim a comparison experiment against other models. Its value must come from reproducible findings, explicit changes, and witnessed improvements.

Implementation update, September 8: the owner authorized proceeding after this plan was saved. Mayor Tina's placement/facing is implemented and verified. The first broader batch corrected Log 19 interpretation, isolated GPU samples by rendering profile, added world-model latency and synchronous spans, and repaired the retail payload gate with two texture-only derivatives. Evidence is recorded in `docs/reports/astra-game-review-2026-09-08.md` and `docs/reports/astra-first-implementation-2026-09-08.md`.

Implementation update, September 9: The second batch implemented 3D physical chest patches (`mixamorig1Spine2`) with front-side culling and depth occlusion, high-fidelity transparent RGBA decals (4120, 4121, 4122, 4124, 4125), eliminated the startup microscopic UI scaling flash via synchronous inline metrics tokens, resolved rogue menu transmissions, polished tactical HUD readability, and added co-op squad wipe handling. Verified with 2,623 passing tests across 293 files and clean presubmit checks. Evidence recorded in `docs/reports/operator-patches-and-ui-scale-2026-09-09.md` and `docs/reports/armory-implementation-2026-09-09.md`. Unchecked program outcomes below remain open; this update does not promote the supplement to a second active sprint.

This is a detailed execution supplement to `docs/planning/sprint-30.md` and `docs/planning/repository-roadmap.md`. It does not create a second active sprint or silently replace the repository's current planning authority.

### Source baseline and review limits

- Repository: `hunker-bunker` on `mountain`, accessed as `caveman`.
- Baseline branch: `dev/sprint-catchups`; baseline commit: `69f31eb` (`Rig Mayor Tina for player locomotion`).
- Package version: `2.3.1-beta`. Remote test runtime: Node `v22.22.1`.
- Review covered the current game entry points, Tina encounter, world/placement boundaries, quest/depth consumers, checkpoint semantics, asset checks, current planning, recent co-op reports, and raw Log 19 evidence.
- A disposable browser session followed title → callsign → operator → Armory → solo deployment → intro skip → input-enabled gameplay. Screenshots were captured, including at 1280×800. This is a browser smoke review, not an unassisted first-hour playtest or a packaged Steam certification.
- No new two-account Steam expedition, physical Deck session, Cloud conflict round-trip, ending playthrough, or production commerce test was performed for this review.
- Historical findings below are labeled as historical evidence. Proposed improvements without a reproduced failure are design hypotheses or acceptance gaps, not invented bugs.

Evidence for this review and the bounded Tina change belongs in `docs/reports/astra-game-review-2026-09-08.md`. Later phases should create dated reports under `docs/reports/`, containing build identity, route, results, and links to recordings/traces. Reports must distinguish observed behavior from interpretation.

## 2. Findings that change the priorities

| ID | Finding | Evidence and confidence | Implication |
| --- | --- | --- | --- |
| F01 | Tina is still a near-spawn validation encounter. | Confirmed in `src/threeGame.js`, `getMayorTinaEncounterPosition()`: X near 9, Z 1.55, with only three small lateral offsets. Browser seed 24861469 returned `(9, 1.55)`. | Replace validation placement with a bounded seeded discovery farther along the route. |
| F02 | Tina has two rotation layers, and reset explicitly restores the outer group to zero. | Confirmed in `src/world3dOverlay.js` and `resetMayorTinaEncounter()`. The model child has yaw PI; the world group has yaw 0. | Apply the additional 180-degree turn to the encounter group and restore it consistently on reset. Avoid turning the player locomotion rig by mistake. |
| F03 | The automated suite is healthier and newer than the canonical summary says. | Fresh run: **2,474 tests passed across 275 files**. The Product State page still quotes 2,152/256 from August 24. Fresh lint and documentation checks also passed. | Preserve existing behavior; update truth from evidence rather than assuming everything needs replacement. |
| F04 | The generated release gate currently fails. | Fresh `npm run presubmit`: stale `steam/referenced-assets.json` and `steam/retail-asset-report.json`; public payload exceeds the 2,831,155,200-byte budget. Direct measurement: **1,333 files, 2,855,028,380 bytes**, excess **23,873,180 bytes** (22.77 MiB). | Fix payload and report generation before calling the branch release-ready. Do not just raise the budget. |
| F05 | The optimistic Log 19 performance summary mixes different runtime conditions. | Raw `docs/logs/log19.json`, entry 476: gameplay render contexts report **1,144,131,122 estimated GPU bytes** and GPU-average samples around **24.93–26.77 ms**. Entry 1744: menu contexts report **346,149,762 bytes**. | The ~346 MB menu number does not establish a gameplay memory reduction to 346 MB. Rebaseline by phase, camera, resolution, seed, and hardware. These are estimates/snapshots, not a complete frame-time distribution. |
| F06 | A severe deployment stall is real; its exact cause is not yet proven by the log. | Raw Log 19 entry 216 records an **8,574 ms long task**, with empty active phases and no last phase. Entries around 206–210 show several GLB fetch completions delayed to roughly 10,271 ms. | Instrument parse, mesh processing, upload, shader compilation, and chunk mounting. Fetch completion timing alone cannot prove synchronous file I/O caused the stall. `world3dOverlay.js` already uses `loadAsync()`. |
| F07 | Wanderer quest advancement has no runtime caller. | Current non-test source search finds `advanceQuest()` defined in `src/wandererSystem.js` but no gameplay call. | Connect one complete quest through actual events, persistence, reward, and feedback before expanding all six archetypes. |
| F08 | Part of the Depth Contract promise remains disconnected. | `rollsElite()` and elite chances exist in `src/depthContract.js`; no non-test consumer was found. `main.js` displays `eliteSpawnChanceDelta` as increased hostile threat. | Either connect a clear, balanced elite promotion path or remove the unsupported claim until it exists. Test both runtime effect and copy. |
| F09 | The checkpoint is salvage recovery, not a full suspended run. | `src/runCheckpoint.js` explicitly persists position/depth/class/salvage for conversion to the existing crash-recovered black box; it does not reconstruct the world/enemies. | Preserve this useful recovery path and describe it accurately. Treat full resume as a separate design decision. |
| F10 | Newer co-op evidence exists, but it does not prove a whole expedition. | September 2 report and raw Log 19 show a ~194-second packaged session with two peers, remote model promotion, proportional damage, and manual abort. Later commit `b25f40a` fixes squad wipe. | Credit that evidence; still prove reconnect, host loss, squad wipe after the fix, extraction, and grant consistency on the exact candidate build. |
| F11 | Startup works in the reviewed browser but has several ownership boundaries. | Actual route passed. `tests/e2e/helpers.js` uses a 75-second readiness loop across roster, initialize, Armory, deployment, intro and overlays. `playwright.config.js` still describes an earlier 45-second helper. | Replace heuristic retrying with one observable readiness contract; do not label the route currently broken just because it has been flaky before. |
| F12 | The first-screen HUD deserves a spatial review. | In the captured 1258×622 viewport, the sidearm title clips at the stage edge, ship-integrity text competes with vitals, and several large prompts share the upper-right view. A 1280×800 capture was also taken. | Measure actual rectangles at supported sizes, text scales and both cameras before reorganizing HUD ownership. Do not extrapolate a small-window observation to all displays. |
| F13 | Asset provenance is explicitly incomplete. | `ASSET_PROVENANCE.md` marks historical visual families and Tina uploads as needing review. | Build a bounded ledger for shipped files. Model normalization, a green build, and source possession do not complete provenance records. |

## 3. What to preserve

Keep the biomechanical survival identity, the crash-site repair loop, the pressure of oxygen, class-specific play, the ring descent bargain, faction consequences, and the strange optional discoveries. Tina should feel like a discovery inside that world.

Preserve the functioning Armory, rigged locomotion, remote avatar fallback/promotion, host-authority work, squad-wipe fix, generated original audio, and the large existing regression suite. Recheck older settings and camera complaints against current code: the August 27 settings audit already records several fixes.

The implementation rule is to improve a complete player action at a time. Every change must show its producer, state owner, runtime consumer, cleanup path, and evidence. A new helper with no live caller is unfinished work.

## 4. Immediate Mayor Tina change — TINA-01

**Priority:** P2 player-facing correction. **Owner:** Codex. **Scope:** small encounter edit after this plan is saved.

### Intended behavior

1. Move the encounter off the first doorway. Use the established northbound approach at **Z -14 through -20**, centered at **X 9**. This places it roughly 26–32 world units from the reviewed Tank spawn instead of about 10. A 100-seed generation probe verified the three-wide approach through Z -21. The initial wider proposal reached variable geometry near Z -25, so the implementation band was shortened before editing gameplay.
2. Select the location from the run's existing entropy. Repeated updates and retries in the same run must return the same position. A fresh seed can select another location. It is a random discovery along the safe opening route, not an unrestricted roll into cliffs, locked sectors, or distant quest spaces.
3. Apply **PI radians around Y** to the encounter's outer Tina group. Its source child already has a normalization yaw. Keep the controlled player's rig and animations unchanged.
4. Turn the cup consistently if that is necessary for the front-facing combined composition. Keep the two models aligned at their shared location and preserve the vertical seat offset.
5. Restore the new placement and facing on encounter reset. Repeated setup must not accumulate rotation. Prompts, distance checks and the visible models must all use the same position.
6. Keep the encounter optional and single-player under its current authority rules. Preserve transformation, discarded operator body, input restoration, cup removal, and locomotion.

### Implementation and verification

- Primary code: `src/threeGame.js`: placement, setup, reset. Existing regression file: `src/threeGame.mayorTinaSecret.test.js`.
- Update the test that currently requires Tina to stay outside door one. Verify multiple seeds, deterministic re-queries, minimum distance, and setup/reset orientation. Reuse the existing transformation tests.
- Inspect generated floor clearance and the approach path across representative seeds. Keep the selection bounded; do not generate the whole world or scan thousands of tiles in the frame loop.
- Browser: start a fresh run, ensure no Tina prompt/siren immediately at spawn, approach from the crash door, see the front, interact once, and verify the transformed player can move afterward. Distinguish any debug positioning used for inspection from a normal walking proof.
- Reset/new run: the old model is not stranded, the new seed can move the encounter, and the face correction remains.
- This source change is not automatically a Steam deployment. Record package status separately.

**Stop condition:** if the proposed band is not valid across the real generation route, select from verified reachable floor candidates and keep the selected position fixed for the run; do not use an unvalidated fallback coordinate.

## 5. Priorities and dependency order

P0 means data corruption, a repeatable hard lock, or a broken mandatory path. P1 means a severe stall, unusable supported control path, misleading core mechanic, or blocked release gate. P2 means comprehension, balance, presentation, or content completion. P3 means optional expansion.

| Work package | Priority | Status | Depends on | Primary owner | Evidence needed |
| --- | --- | --- | --- | --- | --- |
| TINA-01 placement/facing | P2 | Completed (2026-09-08) | Saved plan and placement inspection | Codex | Focused tests + browser encounter route |
| TRUTH-01 current evidence register | P1 | Completed (2026-09-08) | Review baseline | Codex + maintainer | Corrected phase-specific facts |
| ASSET-01 payload gate and media reliability | P1 | Completed (2026-09-08) | Asset inventory | Runtime/art owner | Audit, content playback, visual comparisons |
| BOOT-01 startup/overlay ownership | P1 | Completed (2026-09-09) | Baseline route | Runtime/UI engineer | Clean-profile, frame 0 CSS layout tokens, startup scale fix |
| HUD-01 objective/readability pass | P2 | Completed (2026-09-09) | BOOT-01 | UI/gameplay engineer | Tactical visor HUD relayout, emoji removal, gun framing |
| PRESENT-01 camera/art/audio coherence | P2 | Completed (2026-09-09) | PERF/HUD budgets | Art/audio/runtime owners | 3D chest patches, high-detail transparent decals, voice profiles |
| COOP-01 expedition authority acceptance | P1 | In Progress | Existing fixes preserved | Network engineer + two-account tester | Squad-wipe automated termination fixed; 2-account expedition open |
| PERF-01 stall attribution and loading schedule | P1 | Open | TRUTH-01 | Runtime engineer | Packaged traces before/after |
| SAVE-01 crash recovery and conflict semantics | P1 | Open | Truthful save contract | Runtime + platform owner | Process-crash and two-machine evidence |
| COMBAT-01 class/counterplay pass | P2 | Open | PERF-01 baseline | Gameplay designer | Class/encounter matrix |
| DEPTH-01 truthful risk/reward consumers | P1/P2 | Open | Combat event contract | Gameplay engineer | Runtime effect + presentation tests |
| QUEST-01 one complete Wanderer | P2 | Open | Objective/reward contracts | Gameplay engineer | Natural objective completion and reload |
| WORLD-01 useful variety and reachability | P2 | Open | Stable route evidence | World designer | Seed portfolio + player routes |
| STORY-01 factions/endings payoff | P2 | Open | Stable run and quest state | Narrative/gameplay owner | Branch route and ending proof |
| INPUT-01 controller/accessibility acceptance | P1 for broken critical actions | Open | BOOT/HUD | UI engineer + hardware tester | Full controller route + physical Deck |
| ARCH-01 bounded extraction | P2 | Open | Characterized seams | Runtime engineer | Existing callers migrated, old path removed |
| RELEASE-01 exact-build proof | P1 | Open | All critical gates | Maintainer + QA | Candidate artifact + accepted evidence |

## 6. TRUTH-01 — establish one reliable current-state register

**Problem:** stale canonical counts, newer partial acceptance, and mixed-phase performance summaries can send implementation toward the wrong work.

**Steps:**

1. Record baseline commit, package version, lockfile identity, local changes, and commands actually run. For future builds include build ID, platform, GPU/driver, viewport, renderer settings and seed.
2. Correct Log 19's interpretation with the exact entry IDs in F05/F06. Preserve the original report as history and add a correction/reference rather than silently rewriting a past observation.
3. Update Product State only to the highest demonstrated level. “A two-peer session ran” and “a full expedition survived host loss and extracted” are different states.
4. Reconcile `dev/sprint-catchups`, Sprint 30 authority, and Sprint 31 evidence labels without opening a competing master plan.
5. Use one defect record per issue: player-visible symptom, severity, reproducible route/seed, evidence, likely owner, hypothesis, fix, regression check, acceptance result, next owner if external.

**Acceptance:** no release-critical row relies solely on a historical completion claim; each has a current result or a named external environment. A green docs audit is necessary, but a human must still check the truth of the sentences.

## 7. PERF-01 — remove stalls and measure actual gameplay

**Problem:** the 8.574-second task can make deployment appear frozen, and gameplay memory is not established by menu snapshots.

### Investigation before optimization

1. Capture a production package trace on the reference GPU using a fixed route: cold title, Armory, deploy, first presented gameplay frame, north exit, dense combat, return to menu, second run.
2. Place explicit timing spans around asset request/read, GLTF parse/decompression, cloning, bounds traversal, material setup, texture decode/upload, shader compile, chunk data generation, chunk mounting, and first render.
3. Keep cold-cache and warm-cache runs separate. Separate menu, Armory, cinematic, ordinary gameplay and dense combat. Record real wall-clock frame time as well as GPU query timing; a low GPU pass time does not establish high FPS.
4. Reproduce at least three times per condition. Compare medians and tail behavior; preserve the worst trace. Record whether adaptive quality changed during the sample.

### Likely changes, selected by the trace

- Preload only the assets needed for the next visible state. `preloadWorld3dModels()` is already asynchronous; first prove which part still blocks before adding another async wrapper.
- Budget CPU-heavy instantiation and chunk mounting across frames. Use a cancellable queue tied to the current run/scene generation so late loads cannot attach to abandoned menus or old runs.
- Use lightweight runtime fallbacks during noncritical model loading. Mandatory collision/objective state must be ready before input is released; decorative meshes can arrive later.
- Reuse cached templates and materials with explicit ownership. Deduplicate texture sources where appropriate. Reduce overlarge textures and meshes based on on-screen size, not a global quality cut.
- Only move data-only work to a worker when a trace shows it is worthwhile. Keep DOM and Three.js renderer ownership explicit.
- Warm the relevant shader/material variants during a loading boundary if compilation is the cause. Do not preload every cosmetic and every possible enemy at boot.
- Add queue depth, oldest task age, active asset phase, and cancellation counts to diagnostics. A stalled operation must identify itself.

### Proposed acceptance budgets

These are targets to validate on the declared reference hardware, not already achieved results.

- No main-thread task above 250 ms after control is handed over; investigate every task above 100 ms on the fixed route.
- Streaming/mount work targets a 2–4 ms per-frame slice under gameplay, with an explicit loading-mode budget.
- Reference desktop route targets 60 FPS: report wall-clock P50/P95/P99 frame time, frames over 33.3 ms, and visible stalls. Dense combat must be measured separately.
- For physical Deck, preserve the project's 60 FPS goal but choose and document a supported quality preset based on actual evidence. Do not stamp a 60 FPS claim from desktop or software-rendered browser data.
- Ten menu → gameplay → menu cycles must reach a stable retained-resource plateau after warmup; investigate continued growth rather than insisting the cache return to zero.
- No missing collision floor, interactive objective, or player model caused by deferred work; no stale model mounts after returning to title.

**Primary files:** `src/threeGame.js`, `src/world3dOverlay.js`, `src/player3dOverlay.js`, `src/armoryScene.js`, existing frame/GPU/long-task diagnostics. **Exit evidence:** matching before/after traces, settings, route, screenshots, and resource snapshots.

## 8. ASSET-01 — fix the payload gate and make assets trustworthy

1. Inventory shipped files by actual references, dynamic family patterns, size, dimensions, codec, model/texture complexity, and provenance state. Keep runtime finals separate from source masters.
2. Recover the measured 22.77 MiB excess and leave useful headroom. Start by inspecting the largest runtime models: the current top examples include approximately 45.7 MB and 42.5 MB skin GLBs and a 40.4 MB overclock GLB. Large is a review lead, not proof a file is unused.
3. For each candidate, compare full-size source against a smaller derivative at the actual Armory/game camera distance. Check silhouette, alpha edges, skinning, attachments, emissive detail, shadows and normals. Preserve retained masters and rights evidence.
4. Remove an asset from the runtime tree only after static and dynamic references, alternate classes, random rewards, gallery/store uses and package paths are accounted for. Use deliberate source relocation where appropriate.
5. Regenerate reports after the actual payload changes. Restore `npm run presubmit` without increasing budgets solely to silence the check.
6. Extend media checking to real loading/decoding for representative PNG/WebP/GLB/video/audio formats. Existence and byte budgets do not prove a model renders or a video decodes in Linux Electron.
7. Build provenance records for bounded families. Ask the asset contributor for unknown creator/method/tool/redistribution information; record unknowns honestly. Tina and the cup remain `needs-review` until source information is supplied.

**Acceptance:** current asset reports match the build, public/ASAR limits pass, representative Linux and Windows media load, no broken dynamic references, and each release asset family has a provenance state. Unresolved rights questions have a named maintainer decision before retail approval.

## 9. BOOT-01 — one transition owner and observable readiness

**Player outcome:** Start, Back, Skip and Retry always lead to a predictable state. A player never regains control behind a blocking overlay or watches an unexplained spinner indefinitely.

1. Describe the current route as a state transition table: title, profile/roster, operator, Armory, mode selection, cinematic, world loading, gameplay, pause, death, result, return.
2. Define readiness from the current code's real conditions: live game instance, gameplay profile, visible nonzero canvas, required world collision ready, player present, input enabled, loading released, and no blocking overlay.
3. Expose one readiness state/event used by both production UI and E2E tests. Include current phase, pending prerequisite, elapsed time and failure reason in diagnostics.
4. Make each transition idempotent. Double-click Initialize/Embark, repeated controller confirm, duplicate cinematic completion and Back during loading must not create a second run or retain a stale input lock.
5. Give long operations a bounded, meaningful recovery UI: retry the failed requirement, return safely, or use an explicitly supported fallback. Do not release input merely because an arbitrary timeout expired.
6. Ensure skip and media-error paths reach the same cleanup as normal completion. Apply this to Tina's transformation as well as class/door/death cinematics.
7. Replace the test helper's repeated button hunting where possible with waiting on that production contract. Keep an end-to-end test of the real unskipped path too.

**Tests:** fresh browser profile, returning profile, slow/failed asset, repeat start, back during load, double confirm, skip mid-cinematic, media error, teardown while model load is pending. **Acceptance:** ten consecutive clean starts and ten restart cycles pass on a named machine; failure injection produces a usable recovery screen and no unhandled errors. This does not prove all hardware startup times.

## 10. SAVE-01 — preserve progress without promising full resume

**Confirmed current behavior:** the checkpoint becomes recoverable salvage after an interrupted run. Keep that meaning unless a separately designed full-save system replaces it.

1. Inventory what is permanent, run-local, recoverable salvage, Steam-owned, or purely cosmetic. Establish which storage component owns each field.
2. Verify checkpoint interval, overwrite order, clear-on-graceful-end behavior, malformed data handling and the recovery-to-black-box conversion. Make conversion idempotent so reopening twice cannot duplicate salvage.
3. Test crash during checkpoint write, boot recovery, menu return, extraction, death, and Tina transformation. Decide explicitly whether Tina's transformed identity is run-only; do not imply it survives a checkpoint that only stores class/salvage.
4. Define Cloud merge/conflict policy for each data class, including offline edits, differing timestamps, clock skew and corrupted records. Never merge currencies by simply taking both totals.
5. Surface actual sync/recovery status and the practical consequence of a conflict. Preserve a recoverable backup before migrations or conflict resolution.
6. Run Machine A → offline edit → Machine B → conflict → Machine A, then a process crash/restart with a nonempty checkpoint. Account for Steam transport and local save correctness independently.

**Acceptance:** no duplicate grants, no silent loss of previously banked progress, a recoverable interrupted run produces the intended black box once, and a complete two-machine conflict report exists. **External owner:** maintainer with two Steam-capable machines/accounts as required by the chosen route.

## 11. COOP-01 — prove an expedition, not only a connection

1. Preserve the current host/relay authority and recent damage/avatar/squad-wipe fixes. Start by reproducing current behavior; do not redesign networking from a stale report.
2. Use two packaged clients with different classes, matching build identifiers, and the supported production invite/relay path. Record each client's event sequence and server result.
3. Walk the whole route: invite/cold start, roster/loadout, ready, deploy, first fight, shared objective, revive, intentional disconnection, reconnect, host departure, final outcome, extraction/result grant and return to title.
4. Specifically retest both players downed after `b25f40a`, last living player disconnecting, reconnect during a boss transition, and host loss while an objective/reward resolves.
5. Declare the authority for enemy health, player damage, objectives, loot claims, run end, and grant IDs. Validate duplicate/out-of-order events and stale room versions at those boundaries.
6. Include reasonable latency, jitter and packet-loss simulations in a nonproduction test harness. Check interpolation and feedback separately from authoritative correctness.
7. Keep PvP labeled experimental until its separate real-account combat and abuse route passes. Co-op damage evidence does not certify PvP.
8. State supported cross-region discovery honestly; test invites independently from public lobby browsing.

**Acceptance:** both clients agree on objective/boss/end state, recover or fail clearly after disconnect, avoid duplicate rewards, and complete one witnessed expedition. **External owner:** network tester with two real Steam accounts and maintainer access to appropriate relay logs. No commerce or publication is part of this task.

## 12. HUD-01 — make the next action clear

1. Use the existing `src/objectiveRegistry.js` and `src/objectiveTargetResolver.js` as the objective authority. Represent the main goal, current subgoal, target, blocker and completion state there.
2. Give the first expedition one dominant instruction. Keep survival vitals persistent, show context-sensitive interaction near its target, and limit secondary chatter while the player is deciding what to do.
3. Standardize objective grammar: action + target + reason/blocker. Example: “Repair the O₂ generator — bank 3 tech at your ship.” Numbers and target names must come from runtime state.
4. Prioritize critical O₂/health warnings above flavor lines, and active interact prompts above background announcements. Tina's siren should not compete with the first repair lesson from the spawn area.
5. Build a layout matrix for 1280×800, 1920×1080, smaller resizable windows, maximum supported UI/text scaling and both gameplay cameras. Check stage edges, clipping, overlapping hitboxes, subtitle width and controller focus.
6. Review the first-screen captures for competing top bars and upper-right cards. Reallocate space based on measured conflicts instead of adding another larger overlay.
7. Compass/map objectives should agree on target and reachability. Distinguish unseen, blocked, completed, unavailable and current targets. Avoid pointing through an inaccessible wall without context.
8. Death/result screens should explain cause, what was kept/lost, where recovery exists, and one actionable next-run lesson derived from actual events.

**Acceptance:** a new player can state the next action at minutes 5 and 15 without the observer explaining it; no critical text or control clips in the supported layout matrix; objective completion removes the old prompt and selects the next valid target exactly once.

## 13. COMBAT-01 — clarity, response, and class identity

Treat combat quality as a set of testable encounters, not a global damage multiplier.

1. Capture short representative fights for Scout, Tank and Engineer against a basic pursuer, a ranged/area threat, a mixed pack, and a phase boss.
2. Measure time to first useful shot, hit readability, time to kill, player damage cadence, reload downtime, empty-ammo recovery, escape options and O₂ consumed per encounter.
3. Ensure telegraphs identify danger and counterplay by shape/motion/sound as well as color. Keep a usable reaction interval on the intended difficulty/preset; test camera occlusion and noise from props/effects.
4. Preserve distinct class rhythms: Scout mobility and collection, Tank deliberate commitment and survivability, Engineer tactical utility/economy. Test whether their actual win strategies differ; do not invent numerical buffs before observing them.
5. Audit aim origin, projectile origin, crosshair and muzzle alignment in isometric and third-person views. Include near walls, diagonal aim, controller aim, and transformed Tina.
6. Validate invulnerability windows, damage attribution, knockback, stagger, boss weakpoints and death messages at the live event boundaries.
7. Preserve anti-softlock mechanics: no mandatory encounter that becomes unwinnable solely because ordinary ammo is exhausted. Check ranged ammunition and any fallback tools actually available to each class.
8. Tune audiovisual hit confirmation as one event: hit → damage result → sound/flash → number/stagger. Suppress duplicate feedback from predicted and authoritative events.

**Acceptance:** every mandatory enemy has a legible response; each class completes the reference encounter set; no phantom damage through known walls; empty-ammo situations have a discoverable recovery; balance changes are supported by comparable runs and do not erase class identity.

## 14. DEPTH-01 — deliver the bargain shown to the player

1. Trace every displayed Depth Contract field to a runtime consumer: salvage, rare relic chance, O₂ penalty, director aggression and elite chance.
2. For the disconnected elite path, choose an explicit policy: promote eligible normal spawns with the existing seeded RNG, exclusions for tutorial/mandatory scripted actors, a visual/audio identity, and a known reward/counterplay change. If that is deferred, remove or rewrite the unsupported threat promise.
3. Run the promotion decision under the authoritative host in multiplayer and serialize the resulting variant. Do not let peers independently roll enemy strength.
4. Check the practical math at ring boundaries and on re-entry; modifiers must not apply twice or compound unexpectedly after reconnect/reload.
5. Show only deltas the game actually applies. The player should understand what improves and what becomes harder before committing.
6. Build a relic behavior matrix covering every existing relic: triggering event, affected statistic/action, stacking, cap, conflict, removal, persistence and multiplayer authority. Characterize strong combinations before reducing them.

**Acceptance:** each displayed claim has a tested live consumer; deterministic seeds reproduce decisions; repeated boundary crossing cannot compound modifiers; three distinct viable build strategies are demonstrated in repeatable play sessions. Build diversity remains a playtest result, not a unit-test assertion.

## 15. QUEST-01 — finish one Wanderer, then use the pattern

1. Pick one existing archetype and write its full state graph: undiscovered, met, accepted, stage 1, stage 2, ready to turn in, rewarded, failed/abandoned if supported.
2. Connect real gameplay events to objective-specific advancement through the existing manager. Do not make a generic UI click increment `advanceQuest()`.
3. Filter events by actor/site/run/objective identity. Replayed events and repeated interaction must not complete a stage or grant a reward twice.
4. Persist the supported state and restore it through the canonical save owner. Record explicitly which state resets on death/new run.
5. Make follow/assist behavior observable: clear tether behavior, stuck recovery, danger awareness, a distinctive assist effect/cue, and feedback when the companion changes the outcome.
6. Finish the route through reward delivery, HUD update, dialogue, journal entry and cleanup. Validate cancellation and actor unload/reload.
7. Only then expand to the other five archetypes, varying the verb/consequence rather than duplicating counters with different text.

**Acceptance:** a tester finds the NPC and finishes the quest through normal play without debug advancement; progress survives the supported reload boundary; the reward is granted once; quest/companion state is coherent after death, return and re-entry.

## 16. WORLD-01 — make random runs meaningfully different

1. Maintain a deterministic seed portfolio: short/long opening route, narrow/wide spaces, sparse/dense combat, deep camp, difficult return path, and edge-case terrain. Include failed seeds permanently after fixes.
2. Check actual tile connectivity, door unlock requirements, floor height, collision radius and usable interaction approach for mandatory sites. A connected chunk graph alone does not guarantee a traversable local path.
3. Reserve walkable/visible approach space before dressing. Props, corpses and optional secrets must not block mandatory doors, consoles, resource routes or extraction.
4. Add pressure/relief variation using existing director/event systems after baseline runs are stable: combat tension, a readable reward, a navigational choice, and a recovery beat. Avoid chains of unrelated modifiers that feel like noise.
5. Track recent encounter families to reduce immediate repetition without eliminating recognizable motifs. Keep seed reconstruction possible.
6. Preserve the optional nature of secrets. A secret may be surprising; a mandatory resource route must remain findable and affordable.
7. Test return journeys after doors, destruction, corruption or faction choices change the world. Map and compass must reflect current access, not a stale plan.

**Acceptance:** seed sweeps pass structural invariants; the reference portfolio is walked in live gameplay; mandatory resources and extraction remain reachable; players can describe meaningful differences between runs beyond rearranged walls.

## 17. STORY-01 — make choices visible in play

1. Audit the existing camp/hive action paths and Act 2 state consumers before treating historical missing-feature lists as current. Several camp/hive verbs already exist.
2. Give each faction a clearly different useful verb, cost, limit, risk and visible aftermath. Start by refining the implemented Meridian/Tallow/Vesper identities rather than adding factions.
3. For every choice, specify the causal chain: player action → canonical state → world/NPC reaction → objective change → ending consequence. Remove duplicate UI-only flags.
4. Let lore discovery reveal a place, opportunity, risk or relationship when appropriate. Keep optional flavor concise enough not to obscure survival-critical information.
5. Give the final camp/queen path an intentional pacing sequence: approach, recognizable threat, counterplay, payoff, and consequence. Verify that boss phases and narrative results agree.
6. Build an ending matrix with prerequisites, conflicting flags, audiovisual asset, missing-media fallback, stat/result recording and return path. Exercise at least one full branch naturally; use targeted tests for the rest.
7. Keep dialogue skippable with subtitles and preserve the information needed to make the next choice after skipping.

**Acceptance:** player choices produce observable differences during the expedition; an ending resolves once, explains the accumulated outcome, and returns control safely; unsupported branches stay visibly unaccepted in the report.

## 18. INPUT-01 and PRESENT-01 — comfort and coherent presentation

### Controller and accessibility

- Walk title, callsign, operator, Armory, mode, gameplay, shop, map, dialogue, death and settings using only a controller. Check focus entry/return, scrolling, disabled controls, analog deadzones, remapping and hot-plug.
- Verify prompt glyphs change with the active device and actual binding. Tina's prompt must show the correct interaction control.
- Test physical Deck suspend/resume during menu, gameplay and a cinematic. Recheck sound, focus, elapsed simulation time, reconnect and input on resume.
- Verify accessibility settings through visible/audible effects and restart persistence. Include text floor, UI scale, contrast/colorblind cues, subtitle speed, volume buses and supported camera comfort controls.
- Keep debug/unlock/reviewer controls behind the existing authorization gate. A dev preview showing debug controls is not proof they leak into retail; test a production build.

### Camera, 3D presentation and audio

- Compare isometric and third-person camera routes near walls, tall props, doors, terrain changes and large bosses. Keep the player/target readable without exposing through-wall aim or hiding interaction prompts.
- Review character facing/feet, weapon sockets, charms, animation cadence, shadows, model bounds and texture readability at actual game scale. Include Tina before/after transformation.
- Assign a finite budget per asset role: tiny charm, playable chassis, major boss, background prop. Require in-game comparisons for changes to those budgets.
- Use the existing audio manager for ownership, bus gain, interruption and cleanup. Prioritize threat/interaction information over repetitive ambient chatter. Test voice/SFX/music settings and long-run repetition.
- Check Linux/Windows video/audio decode and missing-media fallback. A browser success is only browser evidence.

**Acceptance:** the supported controller route has no mouse-only critical action; HUD and subtitles remain readable at 1280×800 and supported text scales; no inverted avatar, sustained foot slide, hidden target, duplicated audio or stuck cinematic on the reference routes. Hardware claims require the named hardware session.

## 19. ARCH-01 — reduce change risk while fixing real defects

The large `main.js`, `src/threeGame.js` and `style.css` files make boundary regressions likely. A rewrite would multiply simultaneous unknowns.

1. Extract only after a bug fix or trace identifies a stable seam. First candidates: startup/phase ownership, encounter lifecycle, streaming scheduler, objective event adapter, and modal/input ownership.
2. Characterize the current public contract, including failure/teardown behavior. Move one state owner and its real callers together.
3. Give async work a run/scene identity and cancellation boundary. Ensure returning to menu cannot let a late callback modify a later run.
4. Define disposal ownership for geometry/material/texture/template caches and preview instances. Shared assets must not be disposed by one consumer while another still uses them.
5. Replace direct cross-system global reads with explicit commands/events at the selected boundary. Do not introduce a second service container or generic framework just for abstraction.
6. Remove the obsolete path in the same bounded change. Keep public behavior stable unless the ticket explicitly changes it.
7. Organize CSS around actual screen/HUD ownership after layout fixes, maintaining a visual baseline. Avoid unrelated mass renaming during a gameplay correction.

**Acceptance:** the old owner/call path is gone, the new owner has real consumers, lifecycle tests remain green, the player route still works, and the diff can be reviewed independently of future extractions.

## 20. BACKEND-01 and RELEASE-01 — support the exact product being shipped

1. Verify the actual deployment topology and persistence backend before planning a migration. `server/db.js` supports multiple backends; a historical default is not evidence of the currently deployed choice.
2. Test backup/restore and schema migration on a copy or nonproduction dataset. Establish who owns restores and how a failed deployment rolls back.
3. Track auth/relay failures, reconnects, duplicate grant rejection, persistence failures and result submission. Log stable diagnostic identifiers without exporting player credentials.
4. Keep store/commerce capabilities gated to the configured and accepted environment. Catalog visibility, dev mock purchases and production purchasing are separate claims.
5. Build one candidate artifact, record its hash/build ID and run package checks against that exact artifact. Rebuilding after certification creates a new candidate needing an appropriate recheck.
6. Align Steam claims, feature availability, controller status, AI disclosure, asset provenance and current evidence. Leave physical hardware and dashboard acceptance with the maintainer who can perform it.
7. Publish or promote only through the existing deliberate release process after the candidate passes; this review does not upload a build or modify store settings.

**Acceptance:** there is a reproducible candidate, a functioning recovery/rollback route, no failed mandatory package checks, and every public capability claim points to evidence for that candidate or is qualified appropriately.

## 21. Implementation batches and review gates

Effort ranges below are planning estimates for focused engineering work, not calendar promises. Hardware, account availability, playtesting and newly reproduced failures can change them. Do not start all lanes simultaneously.

| Batch | Concrete output | Approximate effort | Gate before continuing |
| --- | --- | --- | --- |
| 0 | This plan, evidence record, bounded Tina correction | Less than 1 engineering day | Tina regression/visual route; known baseline failures recorded |
| 1 | Correct truth register, capture stall trace, payload inventory | 1–2 days | Reproducible baseline and causal hypotheses separated |
| 2 | One measured performance fix, payload reduction, deterministic startup | 3–5 days | Comparable package trace; presubmit/build green; repeat start passes |
| 3 | HUD/objective/death clarity, depth consumer correction, focused combat pass | 3–5 days | New-player checkpoints and class encounter matrix |
| 4 | One complete Wanderer, faction/ending slice, useful seed portfolio | 4–7 days | Natural quest/run completion and persistent consequences |
| 5 | Co-op, recovery/Cloud, controller/Deck and exact-package acceptance | 2–4 engineering days plus scheduled external sessions | All release-critical evidence or explicit release blockers |
| Ongoing | Small extractions only at changed seams | Included in relevant batch | Old owner removed; no speculative rewrite |

Run one complete 35–45-minute expedition early enough that its findings can change Batches 2–4. Do not wait for the end of the schedule to discover the basic loop is confusing.

At each gate, compare the actual player route to the prior capture. If a fix increases startup time, lowers readability, breaks a class or loses progress, revert that bounded change and retain the reproducer. If an external acceptance cannot run, name the owner and required environment; continue independent work without calling the gate passed.

## 22. Verification matrix

| Layer | Checks | What it proves | What it does not prove |
| --- | --- | --- | --- |
| Focused regression | Encounter setup/reset; objective transitions; reward idempotency; readiness cleanup | Specific contracts and edge cases | Human fun, platform performance |
| Full automated | `npm test`, `npm run lint` | Existing regression floor | Whole product acceptance |
| Generated/artifact | `npm run presubmit`, `npm run audit:docs`, `npm run build` | Current generated data, links, compile and media audit | Correct 3D framing or every media decode |
| Browser | Real click-driven startup, HUD layouts, input/movement, interaction, menu return | Live DOM/runtime integration in this environment | Steam Cloud, native controller, package paths |
| Generated world | Existing seed/encounter/navigation audit scripts plus selected live walks | Structural invariants and reproducibility | Every human route or enjoyable variety |
| Package | Cold start, missing media, crash recovery, repeated transitions, Linux/Windows | Actual packaged behavior | Physical Deck or two-account network behavior |
| Hardware/network | Deck controls/performance/suspend, two-account co-op, Cloud conflict | Declared hardware/service route | Untested regions/devices or universal reliability |
| Human | Uncoached 5/15/45-minute checkpoints, class/build comparison | Comprehension, fairness and perceived variety | A guarantee every player will agree |

Before merging a gameplay batch run the relevant focused checks, then the repository-required full suite, lint, presubmit, build and docs audit. Run the browser route affected by the change. Preserve existing failures as named blockers; never hide them under a changed threshold or label them caused by an unrelated small edit.

## 23. Completion criteria for the broader improvement effort

- [ ] A player can start and finish a representative expedition, explain the main loop and recover from a failed run without coaching.
- [ ] Mandatory routes remain reachable across the seed portfolio, and relevant objectives/doors/rewards resolve exactly once.
- [ ] The major deployment stall is causally understood and removed or reduced to the agreed budget on the declared package/hardware route.
- [ ] Performance comparisons use equivalent scenes/settings and include frame-time tails, not menu-only snapshots or GPU averages alone.
- [ ] Release asset and generated-data gates pass with real headroom, valid media, and a complete status classification for shipped asset families.
- [ ] Existing incomplete depth/quest promises are connected through gameplay or removed from player-facing claims until ready.
- [ ] All three classes have readable, viable reference encounters and multiple meaningful build choices.
- [ ] Supported save/recovery semantics are clear, idempotent and verified through interruption; external Cloud tests are recorded separately.
- [ ] Two-account co-op completes the declared expedition/reconnect/end-state route on the candidate build; experimental PvP remains accurately labeled.
- [ ] Controller navigation, accessibility and physical Deck acceptance match the actual product claims.
- [ ] The ending/result flow produces the right consequences and returns safely.
- [ ] Every P0/P1 has either an accepted fix or is explicitly blocking promotion, with a named owner.
- [ ] Product State, active sprint, roadmap and release claims all reference the same current evidence.

This plan is complete as a review artifact when it is saved and linked into the planning index. The game-improvement effort is complete only when the unchecked outcomes above have the appropriate evidence.
