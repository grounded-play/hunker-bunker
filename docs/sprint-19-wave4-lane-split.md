# Sprint 19 Wave 4 — Lane Split (Post Steam-Launch-Readiness-Master-Plan)

Date: 2026-07-16.

Follows the `sprint-19-work-{codex,gemini,claude}.md` /
`sprint-19-wave{2,3}-{codex,gemini,claude}.md` convention established
earlier in this sprint, now scoped against
`docs/steam-launch-readiness-master-plan.md`'s 14 phases. Purpose: split
the remaining *agent-executable* work three ways so Codex, Gemini, and
Claude can move in parallel on the same branch without touching the
same files or duplicating effort — same reasoning the master plan's own
"Recommended Next Work Order" already implies, made explicit per-agent.

## First cut: what's not assignable to any agent at all

Filtered out before splitting, because no agent sitting in this repo can
do them — they need the project owner directly, real credentials, a
Steamworks partner dashboard session, or physical hardware:

- Phase 1 §Needs steps 1-8 (creating the real Fly app, volume, secrets,
  running `fly deploy`) — needs a Fly.io account.
- Phase 2 in full (Steamworks dashboard configuration) — needs the
  Steamworks partner dashboard.
- Phase 3 step 4, Phase 4 §Needs, Phase 5 acceptance, Phase 6 acceptance,
  Phase 7 §External Needs + acceptance, Phase 9 (Steam Cloud dashboard +
  live test), Phase 10 (needs a physical Steam Deck), Phase 11 (DRM
  wrapper is a Steamworks-side signing step), Phase 12 (store page
  assets are a creative/production track) — all need a live Steam
  account, installed build, or hardware in the owner's hands.
- "Current Top Outstanding Decisions" #3, #4, #5, #6, #9, #10 in the
  master plan — product/legal/policy calls, not engineering.

None of this is being picked up by any lane below. It stays exactly as
the master plan already describes it: blocked on the owner, not on code.

## What's left that's genuinely agent-executable right now

Everything below is code that can be written and tested locally, with
no Fly/Steamworks/hardware dependency, using mocks/sandboxes where the
real thing isn't reachable:

- Phase 6 code tasks (trading/market UI language, read-only
  tradable/marketable display, graceful market-eligibility-rejected
  state).
- Phase 7 code needs (canonical transaction state instead of
  append-only receipts, "purchase pending" UI, live error taxonomy for
  `ISteamMicroTxn`, request-shape verification against Steamworks' own
  published API contract without needing a live sandbox).
- Phase 8 code needs (achievement-key-vs-Steamworks audit checklist,
  migration behavior for changed requirements, confirming `comingSoon`
  achievements don't count toward visible completion).
- Phase 13 in full (browser/UI acceptance automation) — zero external
  blockers, its own acceptance criteria say so explicitly ("Tests do not
  require Steam to be installed").
- Phase 14 code needs (idempotency record expiry/cleanup, request
  logging with no secrets, an admin runbook doc, and — the actual code
  work behind "move to a real DB" — a SQLite-on-volume migration path
  that doesn't require Postgres/hosting decisions to *start*).
- Reconciling `docs/steam-launch-readiness-master-plan.md`'s own
  "Immediate Repo Hygiene" section and "Current Top Outstanding
  Decisions" #1/#2, which are stale as of this doc's date: the dirty
  tree it describes was split into 6 commits and the Phaser/bank.js
  cleanup finished on 2026-07-15, before this doc's 2026-07-16 date —
  see the correction added directly in that doc.

## Lane split

Chosen to minimize file overlap: each lane's primary files are ones the
other two don't touch, following the established Codex = trusted-rail /
Gemini = player-layer split from earlier in this sprint (see
`project_steam_pipeline` session history) and extending it with a third,
UI-acceptance-automation lane that's structurally new work (new test
directory), not a modification of files the other two are already
editing.

### Codex lane — backend transaction/economy hardening

- Phase 7 code needs: canonical purchase/transaction state model,
  "purchase pending" UI hook, `ISteamMicroTxn` error taxonomy.
- Phase 14 code needs: idempotency expiry/cleanup, request logging,
  admin runbook, SQLite-on-volume migration path.
- Primary files: `server/steamStore.js`, `server/db.js`,
  `server/steamGrant.js`, new `server/db-sqlite.js` (if the SQLite path
  is taken), new `docs/steam-backend-admin-runbook.md`.

### Gemini lane — Steam Inventory/trading UI polish

- Phase 6 code tasks: clear "this happens through Steam" UI language,
  read-only tradable/marketable badges, graceful degraded state when
  the market-eligibility route rejects or is unavailable.
- Phase 8 code needs: achievement-key audit checklist against
  Steamworks (a doc, since there's no live dashboard to diff against
  from here), migration behavior for changed achievement requirements,
  confirming `comingSoon` achievements are excluded from the visible
  completion count.
- Primary files: `main.js` (Vault UI rendering only — the Store-gating
  hunks from wave 4's earlier pass are already committed, this is
  additive), `src/achievements.js`, new
  `docs/steam-achievement-audit-checklist.md`.

### Claude lane (this session) — browser/UI acceptance automation

- Phase 13 in full: Playwright smoke coverage for boot→menu, start run,
  Bunker Tree, Steam Vault offline/mock state, Store tab disabled state,
  game-over leaderboard states, keyboard controls, 1280x800 layout.
- Primary files: new `tests/e2e/` directory, `playwright.config.js`,
  `package.json` (devDependency + script addition only — a single small
  hunk, not a rewrite of the scripts block Codex/Gemini might also be
  touching).
- Chosen because it's structurally isolated (new directory, no existing
  file to collide on) and because I already have full context on what
  actually shipped this sprint (Store gating, Queen fight, gamepad
  fallback) to write meaningful assertions against, having built or
  reviewed most of it directly.

## Coordination note for whoever picks up Codex/Gemini's lane

This doc is a proposal, not an assignment lock — if Codex or Gemini is
already mid-task on something listed here, keep that work and treat
this doc as descriptive instead. Standard practice for this branch
still applies: `git status`/`git diff` before editing any file another
lane claims above.
