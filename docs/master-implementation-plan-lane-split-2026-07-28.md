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
