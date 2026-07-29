# Master Implementation Plan — Lane Split (Claude / Codex)

Date: 2026-07-28.
Source: `docs/master-implementation-plan-2026-07-28.md` (15 phases, 20 sections)
and `docs/backend-steam-and-game-connection-audit-2026-07-28.md`.

Follows the `docs/sprint-19-wave*-lane-split.md` convention: two agents working
the same branch (`dev/sprint-21`) concurrently, split to minimize file
overlap. **Always `git status`/`git diff` before starting a session in this
branch** — both lanes touch a live tree.

## Why this split

The master plan has two very different kinds of work:

1. **Live/manual acceptance** — Steamworks dashboard clicks, credential
   rotation in `~/server/backend.env` (outside this repo), physical Steam
   Deck hardware, two-machine Cloud tests, a real Valve MicroTxn sandbox
   purchase. No coding agent can do these. They are called out explicitly
   below as **not agent-executable** wherever a phase contains them, so
   neither lane silently claims "done" on something that needs the user.
2. **Code/design/test work** — everything the plan's Definition-of-Done
   ladder calls "Designed / Implemented / Connected / Automated." This is
   what the two lanes actually split.

Split rationale: Claude lane = gameplay/world/engine code (matches recent
branch history — WFC hallway/room variety, WFC maze rebuild, HUD passive
readout are all recent Claude-authored commits on this branch). Codex lane =
backend/ops/economy/platform/docs (server, scripts, electron, input, asset
pipeline, dependency hygiene) — self-contained from the game-engine surface
so the two lanes rarely touch the same file.

## Claude lane — Gameplay & World Systems

Primary files: `src/threeGame.js`, `src/mazeExpedition.js`,
`src/wfcGenerator.js`, `src/worldRoutePlanner.js`, `src/objectiveRegistry.js`,
`src/humanAI.js`, `src/camp.js`, `src/hive*.js`, ending/manifest UI modules,
`src/data/enemies.js`, combat/damage modules.

- **Phase 6 — Authoritative Radial WFC World** (6.1-6.5): make the macro
  route plan provably authoritative — ring bands, continuous barriers,
  non-bypass proof, physical room clusters, distance validation, vertical
  traversal acceptance. *6.5 (physical Deck-adjacent playtest feel) needs a
  human playtest to fully accept; the geometry/collision code is
  agent-buildable.*
- **Phase 7 — Unified Objectives and Player Guidance**: migrate all
  objective producers into `ObjectiveRegistry` (currently partial — core
  tracking exists, parent/child + blocked/reason + persistence-after-death
  do not yet), HUD/history work.
- **Phase 8 — Faction Gameplay and Human AI**: verb matrix (Meridian/
  Tallow/Vesper/Hives), the explicit activate-or-retire decision on
  `src/humanAI.js`, visible aftermath.
- **Phase 9 — Consequence, Manifest, and Ending Clarity**: run summary,
  manifest forecast, ending causal explanation.
- **Phase 10 — First-Hour and Combat Acceptance**: formal checkpoint script
  (design/doc artifact — the actual "watch a new player" pass is manual) and
  combat-economy validation (boss HP vs. DPS, anti-softlock, `slay_the_queen`
  gate) that *can* be automated as tests.

## Codex lane — Backend, Ops, Economy, Platform

Primary files: `server/`, `scripts/`, `electron/main.cjs`,
`electron/preload.cjs`, `src/inputActions.js`, `src/steamVaultUi.js`,
`src/achievements.js`, `steam/`, `docs/` cleanup, `package.json`.

- **Phase 0 — Security and Operational Correctness**: 0.1 (credential
  rotation) is **not agent-executable** — it requires Steamworks dashboard
  access and editing `~/server/backend.env`, outside the repo; flag it as a
  standing user TODO, don't attempt it. 0.2/0.3/0.4 (CORS config code path,
  shared `server/backendEnvAudit.js` validator + CLI wrapper, backup/restore
  script) are all agent-buildable.
- **Phase 1 — Steamworks Dashboard Truth**: 1.1 (the evidence packet itself)
  is manual data entry against the live dashboard — build the *template*,
  not fake evidence. 1.2/1.3 code (generate achievement dashboard data from
  `ACHIEVEMENT_DEFS`, centralize stat definitions, production leaderboard
  smoke script) are agent-buildable; live unlock/read against Steamworks is
  not.
- **Phase 2 — Installed Steam Vertical Slice**: build provenance tooling and
  safe diagnostics are agent-buildable; the actual Steam-launched test pass
  is **not agent-executable**.
- **Phase 3 — Economy Assets and Commerce Containment**: self-contained
  Inventory art + local fallback + audit script, canonical item catalog
  dedup. Commerce go/no-go (3.3) stays off pending Valve/legal — no code
  change needed beyond keeping the flags off.
- **Phase 4 — Steam Cloud and Save Integrity**: canonical save contract,
  Auto-Cloud path publication, migration fixtures. The two-machine
  acceptance matrix is **not agent-executable**.
- **Phase 5 — Input, Controller, and Steam Deck**: semantic action routing
  through `src/inputActions.js`, on-screen keyboard/focus handling. Physical
  Deck acceptance (5.3) is **not agent-executable**.
- **Phase 11 — Retail Asset and Build Reduction**: referenced-asset
  manifest script, move production-source assets out of `public/`, CI
  budgets.
- **Phase 12 — Documentation and Dependency Hygiene**: `current-feature-status.md`
  truth matrix, archive stale docs, dependency cleanup
  (`socket.io-client`), Steam claims-control report.

## Explicitly not agent-executable anywhere in this plan

Rotating the live Publisher key/session secret; any live Steamworks
dashboard publish; a real Steam-installed auth/achievement/leaderboard/
Inventory pass; two-machine Cloud sync; physical Steam Deck suspend/resume
and docked testing; a live MicroTxn sandbox purchase/refund/chargeback;
watching real new players play the first hour. These stay as checklists and
tooling that make the manual pass fast and unambiguous, not as things either
agent marks done.

## Gemini-lane coverage (unstaffed, Claude covering)

No Gemini agent has actually worked on this branch — `git log`/`git
branch -a` show no Gemini-authored commits or worktree. Historically (see
`sprint-19-wave5/6-*-lane-split.md`) Gemini's lane was design-doc-first work
that fed directly into what's now Claude's Phase 8/10: a faction verb
matrix design pass and a first-hour acceptance checkpoint script, both
assigned to Gemini on 2026-07-16 and never written. Claude picked both up
on 2026-07-28 since they're prerequisites for Claude's own remaining work,
not because they belong to a third lane:

- `docs/faction-verb-matrix.md` — grounds Phase 8.1 in the camp
  verb/status code that already exists (`src/campEconomy.js`,
  `src/camp.js`, camp-choice actions in `src/threeGame.js`) and specifies
  the cost/cooldown/failure/visual/audio/ending-consequence dimensions the
  master plan asks for but the current passive-buff system doesn't have.
- `docs/first-hour-acceptance-plan.md` — a checkpoint script for a human
  observer (this part is not agent-executable) grounded in the real
  tutorial-step sequence (`src/dialogue.js`) and Mothership reactive-line
  triggers (`MOTHERSHIP_REACTIVE_LINES`, main.js) instead of an invented
  checklist.

Camp-3 boss climax design (the third original Gemini-lane item) remains
unwritten — it doesn't feed Claude's current Phase 8-10 scope directly, so
it's flagged here rather than picked up.

## Status log

- 2026-07-28: Phase 10.2 **closed a real, previously-uncovered gap: the
  Queen fight now has combat-economy acceptance, not just damage-routing
  correctness**. The master plan names "Queen and corrupted-operator
  fights" and "close `slay_the_queen` only after a repeatable combat
  acceptance pass" explicitly; `src/combatEconomy.test.js` never covered
  the Queen (she's not in `ENEMY_STATS` — she's a separate, data-driven
  `bossPhases.js` armor/weakpoint state machine), and the existing
  `src/threeGame.queenFight.test.js` only tested damage-routing plumbing,
  never ran the fight end-to-end. New `src/queenFightAcceptance.test.js`
  simulates the real, unmocked `createBossFight`/`tickBossFight`/
  `applyBossDamage` against each class's real fire rate (idealized
  constant-fire floor case, same framing as `combatEconomy.test.js`):
  all three classes defeat the Queen within a generous 600s ceiling
  (actual idealized time: 16.7s for all three — verified, not assumed,
  and independently sanity-checked via direct per-shot armored-vs-weakpoint
  assertions since the convergence to one number across classes was worth
  double-checking, not just accepting), every class passes through all
  three phases, and the "armor chips, never fully zeroes a hit" contract
  holds for 1-damage classes exactly as `applyBossDamage`'s own comment
  claims. One of my own test assumptions was wrong and caught by the test
  itself (expected `brood` to appear in the phase-transition event log;
  it's the implicit starting phase and never fires a transition event) —
  fixed the test, not weakened it. Zero production code touched. Full
  suite 998/998, lint clean, build green.
- 2026-07-28: Phase 6.1/6.3 **authoritative regional topology implemented
  locally; live visual/physical acceptance and commit still pending**.
  `generateRegionalRouteTopology` now creates one seeded macro graph rather
  than allowing every 19x19 streamed chunk to roll its four portals
  independently: a 120+ chunk winding spine runs from the crash site's
  north blast door to the ring-5 mother hive, and five substantial closed
  ring routes wrap and intersect that spine. Camps are snapped to rings
  1/2/3, hives to 2/3/4, the cave/Queen to the terminal ring-5 spine chunk,
  room clusters to physical ring chunks, and mission blockers to outward
  spine crossings. `ThreeGame.getEdgeOpening` now reads those route edges
  inside the expedition bounds; route chunks collapse as WFC `MAZE`, while
  non-route chunks inside the bounds become sealed `CANYON`, preventing the
  old 68%-random portal roll from reconnecting the macro maze behind the
  plan. Ring chunks request loopier local collapses; outer spine chunks
  request three-meta-tile hallway runs. The existing protected
  `runMazeDetailPass` remains the MarkovJr-style local grammar pass on top
  of the WFC result. A real weighted Dijkstra implementation now measures
  the streamed route graph; tested seeds exceed 80 chunk crossings to the
  Queen (representative runs measure roughly 110-124), all route chunks are
  connected by Manhattan-adjacent edges, all five rings contain substantial
  routes, every required site is on the physical graph, and different
  seeds retain the contract while changing topology. **Still open before
  claiming Phase 6 complete**: live-browser visual traversal, confirm the
  in-chunk procedural gate chosen at each blocker is the actual unique
  crossing cut, and tune room/canyon density from play feel.
  Follow-up canyon pass now enforces the requested tile cross-section:
  indoor traversal retains one structural wall/jamb band and every deeper
  solid cell becomes lethal canyon; declared door/socket lanes remain
  walkable. `canyon-walkway` WFC tiles are explicitly exposed wall-less
  platforms, with canyon allowed directly beside their floor and only their
  authored N/E/S/W sockets acting as exits. Focused WFC/streaming tests
  cover the wall band, deep-canyon conversion, exposed-platform exception,
  portal sealing, and route connectivity.
- 2026-07-28: Phase 6.1/6.3 **attempted, scoped safely, shipped — user
  explicitly directed this after correcting two inaccurate stop-hook
  claims** (see `docs/phase6-wfc-ring-barrier-integration-plan.md` for the
  full design reasoning). Chose **not** to modify `wfcGenerator.js`'s
  connectivity solver (a documented, deliberate spanning-tree/Hamiltonian-
  path design chosen specifically to avoid WFC arc-consistency fragility —
  reintroducing hard reserved-socket constraints there risks exactly the
  failure mode that design avoided, with no test coverage of a change to
  it). Instead used the existing, already-shipped `LANDFORMS.CANYON`
  landform (bonus wall HP, exterior void generation) as a visible
  "ring boundary" tell: `isChunkOnRingBarrier` (`src/mazeExpedition.js`)
  forces `getChunkLandform` (`src/threeGame.js:21544`) to pick `CANYON`
  for chunks near a nominal ring radius, instead of the normal random
  biome-weighted pick — a landform-selection change only, zero changes to
  `wfcGenerator.js`, tile catalog, or connectivity logic. The actual hard
  bypass-prevention remains `enforceRingProgressionLock` (already shipped);
  this is the visible half.
  **Regression gate held as promised**: full suite + the 2,000-seed WFC
  stress test stayed green throughout. One real regression *was* caught
  mid-implementation (`src/threeGame.chunkVariation.test.js`'s
  `getChunkLandform` fixture crashed — `getBiomeAnchorPosition is not a
  function` — because its minimal fake `this` predated this dependency);
  fixed by adding the stub, not by weakening the assertion.
  **Live-verified against the real running game twice**, not just units:
  first pass (default band = 1 full chunk width) measured 43.6-51.2% of
  chunks within an 8-chunk radius of the real ship anchor as canyon —
  reads as "half the nearby world," not a boundary — so the default was
  halved to `chunkSize/2` before shipping. Re-verified post-tuning:
  live measurement came back 34.6% (100/289) against this session's
  offline pure-function prediction of 24.2% for the same anchor/band —
  a real, still openly-flagged discrepancy, most likely explained by a
  handful of chunks near spawn caching their landform in the first frames
  when `getBiomeAnchorPosition()` may not have resolved the same anchor
  yet (this caching-time/anchor-stability characteristic pre-dates this
  change — the original biome-based landform pick was already
  anchor-dependent and cached the same way) — not confirmed with full
  certainty, stated as the leading theory rather than a settled fact.
  Zero page/console errors in both live sessions. Full suite 991/991,
  lint clean, build green.
  **Still explicitly out of scope, stated plainly**: the canyon terrain is
  a persistent thematic tell, not a destructible gate that dynamically
  opens on unlock — actual passage is governed entirely by
  `enforceRingProgressionLock`'s live position clamp. Building "the canyon
  physically opens" is a separate, larger feature not attempted here.
- 2026-07-28: Codex Phase 12.1/12.2 **implemented conservatively**.
  `docs/current-feature-status.md` is now the live truth matrix across design,
  implementation, runtime connection, automation, live/hardware acceptance,
  claim status, and evidence ownership. Ten clearly superseded early Sprint
  19 proposal/lane/status documents moved under `docs/archive/sprint-19/`;
  their old paths remain short compatibility stubs, and archive/master index
  pages explain authority. Wave 3–6 handoffs remain live because current
  audits still cite their evidence and unresolved decisions. Combined with
  the already-shipped dependency audit (12.3) and claims control (12.4), all
  Phase 12 code/document tasks are complete; ongoing truth updates and
  eventual archival of later waves are maintenance, not an unimplemented
  subsystem.
- 2026-07-28: Codex Phase 11.1–11.3 **implemented with measured reduction**.
  `scripts/audit-retail-assets.js` extracts runtime asset references from
  HTML/CSS/JS/JSON-bearing runtime sources, classifies every public file,
  rejects missing references/invalid media, reports extension-vs-codec
  mismatches and duplicate SHA-256 groups, and enforces public/app.asar
  budgets in Steam package CI. Generated reports live under `steam/`.
  Production/reference art and RGB contact sheets moved from `public/` to
  `art/source/`, retaining the six live enemy sheets. Public payload fell
  from 833,071,416 to 643,399,073 bytes (189,672,343 bytes / about 22.8%)
  with zero extracted runtime references missing. Fresh Windows/Linux
  packages reduced the largest `app.asar` from 690,712,078 to 504,255,501
  bytes (186,456,577 bytes / about 27.0%); both pass the new 600 MiB package
  budget and the depot audit. **Still manual**: measure real Steam patch
  delta after uploading the next depot and decide whether
  the 116 extension/codec mismatches and nine duplicate groups merit
  conversion/removal; they are now visible and regression-controlled rather
  than silently shipped.
- 2026-07-28: Phase 6.1/6.2 **live-verified against a real per-run plan
  object, not just synthetic test seeds — this is genuine Gate-adjacent
  evidence, not just unit tests.** Added a `ringplan`/`ringlock` dev-console
  command (`main.js`) surfacing the live seeded plan's unlock gate and
  non-bypass proof. The command's own UI trigger hit Playwright focus/
  visibility flakiness in headless Chromium (both the `` ` `` shortcut and
  the toolbar button require a `show-debug` body class this session's
  simple click-through never enabled) — rather than fight that, called the
  real underlying functions directly via `page.evaluate` against
  `window.game.getRadialMazePlan()` in an actual running session. Result,
  captured verbatim:
  ```json
  { "ok": true, "seed": 1735238849, "nodeCount": 8, "blockerCount": 4,
    "roomClusterCount": 85, "progressionValid": true, "progressionErrors": [],
    "conflictCount": 0, "maxUnlockedRing": 1, "unlockedGoalKeys": [] }
  ```
  Real per-run seed, real plan object, `validateRingProgression`/
  `findConflictingChunkReservations`/`getMaxUnlockedRing` all executing
  correctly against it, zero page/console errors. `maxUnlockedRing: 1` with
  zero goals unlocked confirms `enforceRingProgressionLock`'s live behavior
  matches intent at run start. Full suite 985/985 throughout.
  **Not committed together with this note** — Codex has ~160 files staged
  mid-rename (Phase 11 asset relocation) in the shared working tree at the
  time of writing; committed `main.js` alone via a scoped `git commit --
  main.js` so their staged rename isn't bundled into an unrelated commit.
- 2026-07-28: Codex plan-listed audio gap **closed with original generated
  assets, connected and automated**. Added eight deterministic 44.1 kHz
  mono PCM WAVs: five readable camp-worker transition stingers and distinct
  Meridian/Tallow/Vesper active-verb cues. The checked-in generator uses
  elementary oscillators, seeded noise, and envelopes only—no third-party
  recordings or unclear licenses—and `docs/generated-audio-provenance.md`
  records that provenance. Worker cues fire only on actual state changes,
  with a tested priority selector preventing simultaneous per-worker noise;
  verb cues consume the existing `camp-verb-activated` event. Steam package
  CI verifies every generated WAV byte-for-byte. This supersedes the older
  "audio blocked on assets" status below.
- 2026-07-28: Codex Phase 12.4 **implemented**. Added a generated Steam
  claims-control report backed by `steam/claim-evidence.json`. CI now fails
  when controlled public copy positively claims multiplayer, Timeline, Deck
  Verified, English Full Audio, Cloud, achievements, or purchases without
  accepted evidence, and when the report is stale. Corrected the premature
  announcement claim that Steam Cloud was already fully synchronized; it
  now accurately says Auto-Cloud/two-machine acceptance remains pending.
- 2026-07-28: Phase 6.2 **live ring-progression enforcement shipped and
  live-verified**. Discovered mid-investigation that `mazeExpedition.js`'s
  radial plan is already live-wired into `threeGame.js`
  (`getRadialMazePlan()`, seeded per-run, already used to position camps/
  hives/the queen by ring via `chooseRadialSitePosition`/
  `isSiteOnPlannedRing`) — an earlier claim that "there's no live per-run
  ring concept" was wrong and is corrected here. Built on that: 
  `getMaxUnlockedRing`/`getLockedRingBoundaryRadius`/
  `clampPositionToUnlockedRing` (`src/mazeExpedition.js`) reuse the same
  four base-goal unlocks that already gate ACTIVE->CRYO->BIO sector
  progression as real ring gates (not new invented state), with a boundary
  deliberately kept clear of the existing +/-22 camp-placement tolerance
  band (tested). `ThreeGame.enforceRingProgressionLock()` runs once per
  frame at the end of `updatePlayer`, gated on `isGameplayInputActive` so
  it never fights a cutscene, soft-pushing the player back regardless of
  which movement path (walk/dash/knockback) put them past the boundary.
  15 new tests (9 pure + 6 on the live method). **Live-verified with a real
  Playwright session**, not just unit tests: started the dev server, played
  through title -> class-select -> deploy -> live gameplay, then held `W`
  for 3 continuous seconds (exercising `enforceRingProgressionLock` every
  single frame during real movement) with `pageerror`/`console.error`
  monitoring throughout -- zero errors before or after. No physical canyon/
  gate geometry exists in the WFC-generated world yet (that remains a
  separate, larger asset/solver task); this is real, live, functioning
  progression-bypass prevention using position math, not a claim that the
  boundary numbers are final/playtested-for-feel. Full suite 979/979 (with
  Codex's concurrent generated-audio work for Slice 3's cue set also
  landing clean), lint clean, build green.
- 2026-07-28: Codex Phase 12.3 **implemented**. Removed the unused
  `socket.io-client` production dependency (the renderer had zero imports)
  while retaining and documenting server-side `socket.io`, which is mounted
  by `server/index.js` through `server/relay.js` but does not authorize a
  multiplayer product claim. Added `npm run audit:dependencies`, pure parser
  tests for static/dynamic imports and `require()`, and CI enforcement in
  both presubmit workflows and the Steam package workflow.
  `docs/dependency-policy.md` records the decision and the distinction
  between an existing relay capability and approved multiplayer. **Still
  open in Phase 12**: the live feature-truth matrix (12.1) and stale-doc
  archive with redirects/index preservation (12.2). Phase 12.4 is completed
  in the newer entry above.
- 2026-07-28: Phase 8.2 Slice 3 **per-worker state done; audio still
  blocked on assets (unchanged)**. `updateCampWorkersHumanStates`
  (`src/campHumanBehavior.js`) replaces the single shared
  `workerHumanState` with one state per `campWorkers[i]`, each
  independently "noticing" a shared stimulus at `WORKER_REACTION_CHANCE`
  (0.7) via an injectable `random` source. `camp.js`'s `update()` loop now
  computes tint/speed per worker instead of once per camp. 4 new tests,
  including one pinning a scripted random sequence to prove two workers in
  the same camp can genuinely diverge from the identical event. This closes
  the code-achievable half of Slice 3; the audio stinger set was never
  code-blocked, it's asset-blocked, and stays that way. Full suite 955/955,
  build green.
- 2026-07-28: Phase 8.1 **UI wiring done — the active verbs are now
  actually triggerable, not just mechanically gated**. `getActionableCampAt`
  (`src/threeGame.js`) gained an `active-verb` branch offered once a camp's
  bond is maxed (the natural "what's left to do here" slot in the existing
  priority chain); `getCampActiveVerbGate`/`activateCampVerb` re-check the
  gate at execution time, spend the cost via the existing `applyTrade`, and
  apply a real per-camp effect: Tallow full-heals the player, Vesper refills
  the weapon clip and dispatches `camp-verb-resupply` for `main.js` to top
  up reserve ammo, Meridian reuses the *existing* `_meridianCompassLock`
  radar mechanic (`threeGame.js:11892`) for a 20s compass fix rather than
  the not-yet-built ring-blocker reveal. Meridian's "once per ring" collapses
  to "once per camp, ever" since each camp maps 1:1 to a fixed ring and
  there's no live per-run "current ring" concept yet (Phase 6.1/6.3 still
  open). 9 new tests on the gate/activation logic.
  **Also did real live-browser verification this round** — a Playwright
  session (`chromium.launch`) actually exists as a project dependency; the
  earlier claim of "needs a browser I don't have" was wrong, corrected here
  rather than repeated. Started the dev server, drove the app through title
  → new-run → callsign → class-select → deploy → into the crash-cutscene
  gameplay loop across several real screenshots, monitoring `pageerror`/
  `console.error` throughout: **zero errors** at every step. This directly
  verifies the day's `threeGame.js` changes (camp active-verb wiring, the
  humanAI Slice 1 camp-worker loop, mission/tutorial objective wiring) don't
  break app boot or the live per-frame update loop — real evidence, not "the
  build compiled" as a proxy for it. Did not reach an actual in-game camp
  interaction (would need scripting through the full tutorial/intro
  sequence, which hit friction skipping the canvas-rendered cutscene) — that
  specific interaction still needs a deeper live pass, flagged honestly
  rather than claimed. Full suite 951/951, lint clean, build green.
- 2026-07-28: Codex Phase 5.1/5.2 **code-executable work completed;
  physical acceptance still open** (`676effe`). Native Steam Input and the
  browser Gamepad fallback now enter one `src/inputActions.js` semantic
  router; application phase automatically selects `menu`, `gameplay`, or
  `archive`; Electron initializes and polls all three native action sets;
  and RGB consumes the shell's semantic archive event instead of running a
  second raw `navigator.getGamepads()` loop. Menu presses are edge-triggered
  centrally while gameplay retains continuous move/aim/fire. Every
  controller-focused editable field uses the Steam on-screen keyboard bridge
  when available. Visible modal roots now receive deterministic initial
  focus, trap keyboard/controller focus, and restore the remembered target
  on return. Full suite 938/938, lint and production build/media audit green.
  Action-aware fallback glyph lookup (face buttons, shoulders, sticks,
  triggers, and system buttons across Xbox/Deck, PlayStation, and Nintendo
  families) was completed in the follow-up slice with unit coverage. A new
  1280x800 Playwright acceptance test proves the settings modal chooses an
  internal focus target, keeps repeated Tab traversal inside its boundary,
  and restores the title SETTINGS trigger on Escape. That test exposed and
  fixed a keyboard-mode close-path bug that could leave focus inside the
  newly hidden modal. Follow-up validation: full suite 951/951, focused
  Playwright acceptance 1/1, lint and production build/media audit green.
  Follow-up focus-boundary inventory found and fixed three omitted
  player-facing roots (`tactical-map-modal`, `controls-popup`, and
  `snail-encounter-modal`). Every shipped `.modal` is now registered except
  the intentionally developer-only console. Playwright covers Settings,
  remapping, and Tactical Map deterministic focus; the existing suite covers
  title/profile, class selection, field gamepad movement, Bunker Tree,
  Tactical Map behavior, Vault, RGB, and game-over leaderboard paths.
  **Still open**: physical-controller traversal of encounter-only camp/hive/
  snail/endings paths and all Phase 5.3 physical-Deck work (built-in-controls
  run, 1280x800 legibility,
  suspend/resume, controller reconnect, docked output, battery/performance,
  and offline Vault). The hardware items are not agent-executable.
- 2026-07-28: Codex Phase 4 **canonical save contract implemented;
  two-machine acceptance remains manual** (`699af32`). Added a versioned
  Electron save envelope with sanitization and legacy migration, atomic
  temp-file/rename writes, last-known-good `.bak`, corruption recovery, and
  tests covering round-trip, migration, replacement, and backup fallback.
  `docs/steam-cloud-save-contract.md` now publishes the authoritative
  Auto-Cloud path and conflict/recovery behavior. **Still open**: machine A
  to B and B to A sync, offline simultaneous edits, Cloud-disabled and stale
  cloud behavior on real Steam clients; those require two installed machines
  and must not be inferred from unit tests.
- 2026-07-28: Codex Phase 3.1/3.2 **repo implementation complete;
  commerce remains intentionally held** (`8a41fbe`, `699af32`). Generated
  self-contained Steam Inventory art and in-build runtime variants for all
  catalog items, including requested chroma-green masters; added an asset
  completeness audit and Vault local fallback coverage; replaced the
  duplicate hand-maintained runtime item list with a generated canonical
  catalog plus generator tests. **Still open**: Valve/legal go/no-go and a
  real Inventory definition upload/ownership/render pass. Phase 3.3 remains
  off by design; no code path was enabled to imply commerce approval.
- 2026-07-28: Phase 8.3 "dead bosses persist visibly" — **partially
  checked, still not fully verified**. `spawnEnemyCorpse` (`src/threeGame.js:17911`)
  is called from the same death-handling branch for bosses and regular
  enemies alike (no `isBoss` exclusion in the call path), so the code
  *attempts* a persistent corpse sprite for every death including bosses.
  Did not verify that boss-specific `${type}_dead` materials actually exist
  in `scatterMaterials` (if missing, `spawnEnemyCorpse` silently returns
  with no corpse, no error) — that's an asset-population check this session
  didn't chase down, and even confirming the material exists wouldn't prove
  it *renders correctly* in game. Still needs a live-browser pass to fully
  close this item, same as "ending-vector decisions" from the same list.
- 2026-07-28: Phase 8.2 Slice 2 **verified already substantially true, not
  actually an open gap** — re-examined instead of left flagged. Confirmed
  by direct call (not just reading the numbers) that
  `deriveCampWorkerStimulus` escalates to `armed` at `suspicion >= 50`, the
  *exact* threshold `SurvivorCamp.isLockedDown` (`src/camp.js:533`) and the
  real `getActionableCampAt` lockdown gate (`src/threeGame.js:9900`) already
  use to refuse bond/support/quest-offer/aid. So Slice 1's tint/speed
  feedback was never purely cosmetic — it's a visible readout of a state
  that already had real mechanical teeth through the pre-existing
  suspicion system. 2 new regression tests lock in that the two thresholds
  stay in lockstep. `docs/human-ai-activation-plan.md` updated to reflect
  this — what's still genuinely open is a *distinct* consequence for
  `panicked`/`fleeing`/`infected` specifically (states with no existing
  suspicion threshold), which remains a real, undecided design call, not
  guessed at here. Full suite 938/938, build green.
- 2026-07-28: Phase 8.1 **implemented (mechanical layer), not just designed**:
  `docs/faction-verb-matrix.md`'s "Implementation order" step 1 done —
  `src/campEconomy.js` gained `CAMP_ACTIVE_VERBS` (Meridian ROUTE INTEL /
  Tallow TRIAGE / Vesper FIELD RESUPPLY, each with real cost/cooldown/
  failure-rule data), `getCampActiveVerb`, `canActivateCampVerb` (checks
  cost affordability by reusing the existing `canApplyTrade`, cooldown
  timing, Meridian's once-per-ring limit, Vesper's once-per-boss-encounter
  limit, and Tallow's humanity-floor no-stacking rule), and
  `isCampVerbDegraded` (Meridian's "bad intel, not blocked" failure mode
  when the informant camp has been robbed). 7 new tests, all pure/no-DOM.
  **Not done**: wiring this into the camp-choice menu UI
  (`threeGame.js:9698-9958` per the design doc's step 2) so a player can
  actually trigger these verbs, and the visual/audio feedback (step 3).
  This session shipped the tested mechanical gate; the UI trigger and
  presentation layer remain open. Full suite 928/928, build green.
- 2026-07-28: Phase 6.1 **first real step of the still-open chunk-integration
  work**: added `worldToChunkCoords`, `projectPlanToChunkReservations`,
  `findConflictingChunkReservations` to `src/mazeExpedition.js` — converts
  the macro plan's nodes/room-clusters/blockers into the exact
  `chunkX/chunkY` grid `threeGame.js` already uses everywhere
  (`Math.floor(worldCoord / 19)`, verified against real call sites, not
  guessed). **This is data projection only — it does not yet feed into
  `wfcGenerator.js`/`threeGame.js`'s actual chunk generation**; that
  connection (making WFC honor reserved sockets) is the larger remainder of
  6.1/6.3 and is a materially bigger, riskier change (touches the live
  generation pipeline, needs visual/stress verification) that this session
  didn't attempt. What this step *did* find, measured rather than guessed:
  running the projection across 2,000 seeds shows a real, minor gap —
  ~2.4% of seeds (48/2000) place a required node and a ring blocker in the
  same chunk, because `generateRadialMazeExpedition`'s placement loop only
  checks angular separation, not chunk-grid distance. Documented as a test
  assertion (`conflictRate < 0.05`) rather than silently patched — fixing
  the generator's placement algorithm risks the already-shipped,
  2,000-seed-tested Phase 6.2/6.4 non-bypass proof, so it's flagged for
  whoever does the full chunk-integration work next, not fixed blind under
  time pressure. Full suite 921/921, build green.
- 2026-07-28: Phase 7 **rollout complete (step 6, tutorial — the last step)**:
  `DialogueManager.startTutorialSequence` (`src/dialogue.js`) now tracks a
  stable `tutorial:onboarding` objective (priority 90, matching the spec's
  lowest band — "replaced by anything real"), incrementing `current` after
  each of the 11 sequential steps via a new `_trackTutorialProgress(n)`
  helper, resolving `'complete'` at the final step and `'abandoned'` from
  `cancelTutorial()`. `DialogueManager.TUTORIAL_STEP_COUNT = 11` is the
  single source of truth both places read from. 4 new tests on the two
  clean seams (`_trackTutorialProgress`, `cancelTutorial`'s registry call);
  didn't attempt to unit-test the full 11-step async sequence itself (heavy
  DOM/timer mocking for mechanics that already work and aren't what's new).
  **All 6 rollout steps from `docs/objective-system-spec.md` are now done**:
  camp quests, missions, black box, lore proximity, and tutorial all report
  through `ObjectiveRegistry`; only step 5 (deleting the now-fully-redundant
  bespoke HUD elements) remains, and it's flagged above as needing live-browser
  verification first, not a code gap. Full suite 916/916, build green.
- 2026-07-28: Phase 8.3 (visible aftermath) **checked — mostly already
  covered by existing code, one item genuinely blocked**. Camps
  (`src/camp.js` `setStatus`, `campHumanBehavior.js` from Slice 1) and
  hives (`src/hiveSite.js` — 8 statuses: `slain`/`abandoned`/
  `expired_by_cure`/`queen_consumed`/`mined`/`wounded`/`bonded`/`rescued`,
  each with its own membrane/wound sprite and audio cue) already have real
  physical state changes on resolution. **"Completed blockers" cannot be
  visible yet because the blockers aren't physically in the world yet** —
  `grep` for the `RING_BLOCKER_FEATURES` ids (`collapsed_bridge`,
  `blast_bulkhead`, etc.) from Phase 6's `src/mazeExpedition.js` found zero
  references anywhere in `src/threeGame.js`; the ring/blocker plan is
  validated at the abstract graph level (Phase 6.2/6.4, done this session)
  but never projected into actual generated chunks (Phase 6.1/6.3, still
  open). This item is downstream of that bigger open task, not a standalone
  Phase 8.3 gap. Didn't verify "dead bosses persist visibly" or
  "ending-vector decisions" visually — needs a live-browser pass, not
  claiming those done from a code read alone.
- 2026-07-28: Phase 7 rollout steps 3 and 4 **checked, already done** — no
  new work needed. Step 3 (black box): `main.js:4197-4212` already dispatches
  both `trackObjective` (on `black-box-marker-active`) and `resolveObjective`
  (on `black-box-recovered`). Step 4 (lore proximity, compass-only): already
  implemented as a direct `getRadarCompassState()` branch
  (`src/threeGame.js:11042-11059`, `getNearbyUnreadLoreTarget()`) sitting at
  the correct priority (after the registry's own compass target, before the
  radar-gated build-site guidance) — functionally equivalent to what the
  spec asked for, just not routed through the registry itself. The unified
  `#objective-tracker` HUD (`index.html:1072`, `renderObjectiveTracker` at
  `main.js:4109`) is also already fully built and live.
  **Step 5 (delete bespoke `#camp-quest-hud`/`#mission-progress-hud`) is
  NOT safe to do blindly**: `#mission-progress-hud` is dual-purposed — it's
  reused for the unrelated elevator-arrival countdown text
  (`showMissionProgressHUD('ELEVATOR ARRIVAL: Ns')`, `main.js:3317`) and for
  mission-type-flavored briefing text on mission start
  (`main.js:5617-5627`, e.g. `'SURVEY: REACH 65u DEPTH'`) that the registry
  entry doesn't carry (it only gets the generic `missionState.label`).
  Deleting it outright would silently remove the elevator countdown and the
  richer briefing text, not just de-duplicate. `#camp-quest-hud` looks
  single-purpose by contrast (only camp-quest-progress calls found) and may
  be safely deletable, but this needs live-browser visual verification
  before touching DOM, not a blind text edit — flagging for a session that
  can run the dev server and look at it, not doing it now.
- 2026-07-28: Phase 7 **rollout step 2 (missions) done**: `docs/objective-system-spec.md`'s
  documented rollout order has camp quests done, missions next. Wired
  `ThreeGame.initMission`/`clearMission` and the three completion sites
  (survey/retrieval/elimination) plus the elimination kill-progress tick to
  mirror into `ObjectiveRegistry` (`window.objectiveRegistry`) alongside the
  existing `missionState` + bespoke `#mission-progress-hud` events — nothing
  removed yet (rollout step 5 deletes the bespoke HUD once every producer
  has migrated). Stable `mission:active` id so a new run's mission
  overwrites rather than stacking a stale entry from a different mission
  type. 4 new tests on the two clean, isolated methods
  (`src/threeGame.missionObjectives.test.js`); the three completion/
  kill-progress call sites are one-line additions following the identical
  proven pattern, verified via full suite + build rather than a fragile
  test around their much larger enclosing methods. Remaining rollout steps:
  3 (black box — appears already partially done, needs verification), 4
  (lore proximity), 5 (delete bespoke branches), 6 (tutorial, last).
- 2026-07-28: **Fixed the 5 `it.fails` combat-economy tests properly instead
  of leaving them as tracked-but-red.** They weren't actually failing the
  suite (vitest counts `it.fails` as passing), but the user flagged them as
  failing tests to fix. Root cause: `src/combatEconomy.test.js`'s original
  "shots-to-kill vs. starting ammo pool" model ignored a real, already-shipped
  mechanic — `updateWeaponAmmoRefill` (`src/threeGame.js:13748`) passively
  regenerates the clip forever, unconditionally, even with zero skill
  investment (interval floors at `WEAPON_AMMO_REFILL_MIN_INTERVAL`, never
  disables). So "starting pool alone, instantly" was never the right
  floor-case model — no boss is actually a permanent ammo wall. Rewrote the
  test to assert the real invariant: worst-case extra time passive regen
  needs to close any pool deficit stays under a generous, explicitly-reasoned
  10-minute ceiling for every boss/class combo (worst case is 390s, for
  sporesnail vs. a 1-damage class). `WEAPON_AMMO_REFILL_INTERVAL` exported
  from `threeGame.js` so the test uses the real constant, not a guess. No
  `ENEMY_STATS`/`CLASS_STATS` balance numbers were changed — this was a test
  fidelity bug, not a balance call. Full suite now 897/897, zero expected-fail,
  zero failures.
- 2026-07-28: Phase 8.2 **decided and Slice 1 shipped**: asked the user
  directly (repo precedent for dead-code removal requires explicit
  go-ahead, and this is a visible gameplay-feel fork) — answer: activate
  `src/humanAI.js`. Wrote `docs/human-ai-activation-plan.md` first (a real
  scoped plan, not a blind dive) after discovering the audit undersold what
  already existed: `SurvivorCamp.campWorkers` (`src/camp.js`) already had
  live ambient movement/idle behavior reacting to camp `status`, and
  `suspicion` was already a real 0-100 signal driving lockdown visuals. So
  "activating" the state machine didn't need new rendering/movement/
  detection plumbing — Slice 1 derives stimuli from signals `camp.js`
  already computes every frame and feeds them through the actual
  `nextHumanState()` (new `src/campHumanBehavior.js`, 12 tests), wired into
  `SurvivorCamp.update()`'s existing worker loop for tint + speed feedback.
  `humanAI.js` went from zero callers to one, today, not "eventually."
  Slices 2 (escalation feeding back into gameplay, not just cosmetic) and 3
  (per-worker instead of per-camp state, audio feedback) are open and
  documented as such — not claimed done. Full suite 891/896 (5 known,
  unrelated expected-fail) green, build green. Phase 8.1 (verb matrix) was
  designed this session too (`docs/faction-verb-matrix.md`); 8.3 (visible
  aftermath) remains open.
- 2026-07-28: Lane split written. Claude lane starting on Phase 6.2/6.4
  (ring-crossing non-bypass proof + distance-band validation at the
  macro-plan level in `src/mazeExpedition.js`) — the audit's single most
  concrete unproven claim ("does not yet prove... every outward crossing is
  mission-gated... actual shortest walking distances match planned
  distances").
- 2026-07-28: Phase 6.2/6.4 **done at the macro-plan (abstract graph)
  level**: `buildRingCrossingGraph`, `computeReachableRings`,
  `computeRingWalkDistances`, `validateRingProgression` added to
  `src/mazeExpedition.js`. Proves, for the generated ring/blocker plan
  (not yet the physical WFC chunk graph): locked blockers isolate their
  ring, each blocker opens exactly its own ring (no early opens), every
  ring is reachable once fully unlocked, and shortest walk distance
  strictly increases ring-over-ring. 2,000-seed stress test added to
  `src/mazeExpedition.test.js` (13/13 passing; full suite 841/841, lint
  clean). **Still open for 6.1/6.3**: projecting these route reservations
  into actual generated chunks so the physical WFC world — not just the
  abstract plan — is provably non-bypassable; physical room-cluster
  reservation; vertical traversal acceptance. Picking up Phase 7
  (`ObjectiveRegistry` parent/child + blocked/reason model) next.
- 2026-07-28: Codex Phase 0.3 **implemented**: the environment validator now
  lives in runtime-safe `server/backendEnvAudit.js`; the existing
  `steam:audit-backend[:strict]` command remains a thin, backward-compatible
  CLI; and `server/index.js` runs the same audit before database
  initialization or opening a listening socket. Production startup now
  fails closed on invalid App ID, missing trust secrets, unsafe CORS,
  non-durable storage, incomplete leaderboard mappings, invalid commerce
  flags, or malformed limits. The active deployment is intentionally not
  modified by this repo change: its known HTTP allowed origin must be
  corrected manually before rebuilding under strict production startup.
- 2026-07-28: Codex Phase 0.4 **tooling implemented; live drill pending
  operator maintenance window**: `npm run steam:backend-volume` now creates
  non-overwriting, SHA-256 checksummed Docker-volume archives only while the
  source volume is idle; independently verifies checksum/tar integrity; and
  restores only into a brand-new non-production volume followed by SQLite
  `PRAGMA integrity_check`. The runbook defines 7-daily/4-weekly/12-monthly
  retention and encrypted off-device copies. No backup or service stop was
  performed against the active deployment during concurrent development.
- 2026-07-28: Codex Phase 1.3 **smoke client implemented; live acceptance
  pending Steam session**: `npm run steam:smoke-leaderboards` performs global
  and authenticated around-user reads for all five canonical boards, rejects
  HTTP/mock responses, and can optionally submit one canonical run payload
  before proving the account appears in reads. It accepts a short-lived
  session-token file only; no Publisher-key input exists. A live run still
  requires an operator-provided Steam session and test account.
- 2026-07-28: Codex Phase 1.2 **repo implementation complete; dashboard
  publication pending operator**: `src/steamStats.js` is now the canonical
  definition and value-derivation source for `total_deaths` and
  `longest_run_seconds`; runtime event/run-end synchronization and the
  generated dashboard packet consume it. Dashboard generation now fails if
  any publishable achievement lacks locked or unlocked art, automatically
  holds `comingSoon` definitions, and documents the beta-only
  `HB_QA_TOOLS_ENABLED=1` reset path. The packet reports 23 active
  achievements, one held achievement, and no missing active artwork.
- 2026-07-28: Phase 7 **core registry work done**: `ObjectiveRegistry`
  (`src/objectiveRegistry.js`) gained `status` ('active'/'blocked'/
  'completed'/'failed'), `blockObjective`/`unblockObjective`/
  `getBlockedObjectives` with a player-readable `blockedReason`, `parentId`/
  `getChildObjectives` for parent/child grouping, a capped resolution
  `history` (`getHistory`) so completed/failed objectives aren't just
  dropped, and a `persistent` flag so `clear()` (death/reset) can keep
  story-critical objectives while a full wipe still works via
  `clear({ preservePersistent: false })`. 5 new tests, all green, no
  existing call site broken (additive, backward-compatible defaults).
  **Still open**: migrating tutorial/extraction/generator/cave/hive/boss
  objective producers onto the registry (currently only camp quests, black
  box, and compass targeting are connected — see
  `objective-system-spec.md`), and the actual HUD/history UI (7.3).
- 2026-07-28: Phase 10.2 **combat-economy floor case checked**:
  `src/combatEconomy.test.js` computes shots-to-kill (boss HP ÷ class
  projectile damage) against the starting-run ammo pool (reserve capped by
  `CLASS_AMMO_CAPACITY` + loaded clip, no skill-tree tiers, no world
  pickups) for every boss × class combo. Extracted `STARTING_RUN_AMMO`/
  `CLASS_AMMO_CAPACITY` out of `main.js` into `src/data/ammoEconomy.js` (main.js
  has DOM side effects at module scope and can't be imported by Vitest) and
  exported `CLASS_STATS`/`WEAPON_CLIP_SIZE`/`WEAPON_FIRE_COOLDOWN` from
  `src/threeGame.js` so the test uses real source-of-truth values, not
  copy-pasted ones. Result: 14/19 combos pass; 5 are a **known, deliberately
  undecided gap** (`boss_sporesnail` for all 3 classes, `boss_cryosnail` for
  SCOUT/ENGINEER need more shots than the starting pool alone provides) —
  tracked via `it.fails` so the test suite stays honest without silently
  green-washing a real balance question. This is the same shape of gap
  `sprint-19-wave6-punch-list-lane-split.md` flagged before (only
  `cybersnail` was ever retuned). **Deliberately not fixed here**: closing
  it means either lowering `sporesnail`/`cryosnail` HP (a difficulty-feel
  call) or building the "mid-fight anti-softlock ammo drop" the audit notes
  doesn't exist yet (`spawnSnailDrops` only fires on-kill) — both are
  product decisions worth a human call, not something to guess at
  unilaterally. Full build + 860-test suite green.
- 2026-07-28: Phase 9 **more built-out than the audit implied**: 10 Act 2
  endings (`ACT2_ENDINGS` in `src/act2.js`), each with priority-ordered
  trigger conditions, pre-cutscene narration lines, and a causal one-sentence
  summary on the game-over screen; the boarding-manifest forecast already
  explains seat/egg blockers with reason codes. The actual gap was
  **automated coverage** — `generateRunOneSentenceSummary` and
  `formatManifestBlocker` lived in `main.js` (DOM side effects at module
  scope, not Vitest-importable) and had zero tests. Extracted both into
  `src/endingExplanations.js` (`explainEnding`, `formatManifestBlocker`),
  updated `main.js`'s two call sites to import them, and added
  `src/endingExplanations.test.js`: every declared ending has a distinct,
  non-generic explanation (guards against a new ending shipping without
  matching text), and every known manifest blocker reason has player-legible
  text. Run summary (9.1) and manifest seat-eligibility preview (9.2) were
  already functional pre-existing code, not something to rebuild. Full
  suite 879/884 (5 expected-fail, unchanged) green, build green.
- 2026-07-28: Codex review (assist pass): read
  `server/backendEnvAudit.js`, `scripts/steam-backend-volume.js`, and
  `scripts/smoke-steam-leaderboards.js` in full. All three are careful —
  safe Docker arg construction (`shell: false`, name allowlist regex),
  non-overwriting backups with SHA-256 + tar-integrity verification,
  restore-drill refuses to target the live volume name, leaderboard smoke
  test reads the session token from a file in preference to env and rejects
  mock/non-HTTPS responses. No issues found; full suite + lint stayed green
  throughout. Not committing Codex's files here — they're still actively
  landing new ones in the same working tree (`src/steamStats.js` appeared
  mid-review) and should land under their own commit.
- 2026-07-28: **No Gemini agent has actually touched this branch** (checked
  `git log`/branches — no Gemini-authored commits, no separate worktree).
  Per the new goal, Claude is additionally covering one unclaimed,
  low-collision slice of the plan so it isn't just sitting unpicked — see
  the new "Gemini-lane coverage (unstaffed, Claude covering)" section below.
- 2026-07-28: Phase 8 remains open, **now pending an explicit human
  decision** rather than being silently deferred again: `src/humanAI.js` is
  a complete, tested state machine (states, stimuli, transitions) with
  **zero callers anywhere in the codebase**. The master plan's own
  instruction is to explicitly choose activate-and-finish vs. remove — and
  `docs/repo-review`-era precedent in this repo (project memory: prior dead
  code removal, e.g. levelManager/game.js, phaser dep, bank.js guards) was
  only ever done "with explicit user go-ahead," not unilaterally. Asked the
  user directly rather than guessing on a visible gameplay-feel fork
  (ambient wandering camp NPCs vs. static camps).
- 2026-07-28: Phase 0.1 credential containment is **operator-confirmed**:
  the user reports the exposed Publisher key/session material has been
  secured. Replacement values remain external to the repository and were
  not inspected or recorded. Release acceptance still requires proving the
  old key/session no longer works and completing one new Steam ticket/session
  exchange. Phase 0.2's HTTPS-only allowed-origin cleanup and strict audit
  remain separate open tasks.
