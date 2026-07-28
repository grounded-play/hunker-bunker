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

## Status log

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
