# Sprint 19 Wave 5 — Steam Connection Lane Split (Claude / Codex / Gemini)

Date: 2026-07-16.

Follows the `sprint-19-wave4-lane-split.md` convention, refreshed against
current reality — a lot landed since that doc was written. This is scoped
narrowly to **"what's left to properly connect the game to Steam,"**
per `docs/steam-launch-readiness-master-plan.md`'s 14 phases. The general
gameplay/UX punch list (`docs/ux-and-game-feel-punch-list-2026-07-16.md`)
is a separate, parallel track — not duplicated here.

See `docs/steam-docs-master-index.md` for the full map of every doc this
session produced, including the ones referenced below.

## What landed since Wave 4 (verify against `git log`, not just this list)

Five commits landed between the Wave 4 split and this one — read before
picking a task, so nobody redoes finished work:

- **`2b7d401` Harden Steam backend transactions** — canonical
  purchase/transaction state (replacing append-only receipts), MicroTxn
  order/trans-id handling + status taxonomy + pending-purchase UI hooks +
  safe retry semantics, opt-in idempotency expiry, structured Steam
  request logging, `docs/steam-backend-admin-runbook.md`,
  `docs/steam-achievement-audit-checklist.md`. This closes almost all of
  Phase 7's "Code Needs" and Phase 14's idempotency/logging/runbook items
  from the master plan.
- **`6210ffd` premium store/library assets, screenshots, compliance
  docs** — store/library capsules, hero graphic, page background,
  transparent logo, and broadcast panels regenerated to exact Steamworks
  spec; **5 real 1920x1080 gameplay screenshots captured via a Playwright
  script** (`tests/e2e/captureScreenshots.spec.js`, reusing this
  session's Phase 13 Playwright setup rather than building competing
  infra — good, keep that pattern); `docs/HEALTH_WARNING.md` +
  `docs/PRIVACY.md` compliance docs; Vault UI degraded-state/read-only
  badge polish. This closes most of Phase 12's asset list (see
  `docs/steam-store-placeholder-assets-and-prompts.md` for what
  specifically was replaced and why) and the "must be captured, not
  generated" screenshot requirement.
- **`607d18c` / `3d6d521`** — item store background + core inventory
  master icons + a 69px inventory-page logo generated.
- **`d665e99` hosted Item Store schema, UI, and backend validations** —
  `steam/inventory_schema_hunker_bunker.json` now defines `store_tags`,
  pricing, and hides internal/free container itemdefs; backend
  validation + item lookup in `server/steamStore.js`; Vault UI now
  redirects to the hosted Steam Item Store beta/production pages. This
  is most of Phase 6's remaining "Code tasks."

## Still filtered out — needs the owner directly, not any agent

Same filter as Wave 4, re-confirmed still true: Phase 1 (real Fly app,
volume, secrets, `fly deploy`), Phase 2 (Steamworks dashboard config in
full), Phase 3 step 4 (install from Steam beta), Phase 4's live-account
verification, Phase 9 (Steam Cloud dashboard + live two-machine test),
Phase 10 (physical Steam Deck), Phase 11's actual DRM wrap (a Steamworks
signing step), and Phase 7's external needs (Valve Microtransactions
approval, regional legal decision on loot-box handling). None of this
moves without the owner's hands on a real dashboard/account/device.

## What's still genuinely agent-executable

- ~~**Phase 5 code/UX**: results-screen leaderboard display — live/mock/
  offline state and "player's exact rank if available"~~ **Already done —
  verified 2026-07-16.** `renderGameOverLeaderboard`/
  `setGameOverLeaderboardState` (`main.js`) already implement all three
  states (`retrieving`/`offline`/`mock`/`live` via CSS class
  `go-leaderboard-status--{type}`) plus an `AroundUser` fetch + separator
  row for exact rank when the player isn't in the top 10. This doc's
  original claim that it "wasn't touched by the five commits above" was
  wrong — it predates this doc, just hadn't been directly checked before
  writing it. Covered by `tests/e2e/game-over-leaderboard.spec.js`
  (offline state, the one reachable without `window.electronAPI`).
- **Phase 6 remaining**: refund/reversal handling if required (grepped
  `server/steamStore.js` for `refund`/`reversal` — nothing found yet),
  overlay links gated on confirmed market eligibility (partially present
  — `marketEligibility` state exists in `main.js`, verify the overlay
  link itself is actually gated on it, not just the read-only badge).
- **Phase 11 non-DRM code task**: "add local helper script for DRM wrap,
  if practical" — still nobody's touched this; even without real
  Steamworks signing access, a documented/scripted wrapper invocation
  procedure is buildable now.
- **Phase 13 (this session's Claude lane, in progress)**: boot-to-menu,
  Steam Vault offline state, and Store-tab-disabled smoke tests are
  landed (`tests/e2e/boot-and-menu.spec.js`,
  `tests/e2e/steam-vault.spec.js`). Still open per the master plan's own
  list: Bunker Tree interaction, keyboard-control smoke coverage,
  game-over leaderboard states, browser-Gamepad-fallback emulation,
  1280x800 layout screenshot review across more scenes than the current
  two specs cover.
- **Phase 14 real DB migration**: still open and larger than anything
  above — moving receipts/idempotency/inventory mirrors off the JSON
  file onto SQLite-on-volume (beta scale) or Postgres (production
  scale). The admin runbook (`docs/steam-backend-admin-runbook.md`) now
  documents the *current* JSON-file operational model; this would be the
  next real step past it, not a rewrite of it.

## Lane split

Same rationale as Wave 4 — minimize file overlap, keep each lane's
primary files distinct from what the other two are touching.

### Codex lane — backend/economy follow-through

- Phase 6 remaining code tasks (refund/reversal handling, market-
  eligibility-gated overlay links).
- Phase 14 real DB migration (SQLite-on-volume first, as the smaller
  step) — the biggest single remaining code task in this whole list.
- Primary files: `server/steamStore.js`, `server/db.js`, new
  `server/db-sqlite.js` (if that path is taken), an update to
  `docs/steam-backend-admin-runbook.md` once the storage backend
  actually changes.

### Gemini lane — DRM helper

- ~~Phase 5 code/UX: results-screen live/mock/offline leaderboard states
  and exact-rank display~~ — already done, see above; removed from this
  lane.
- Phase 11's non-DRM code task: a documented/scripted DRM-wrap
  invocation helper (even without real signing access, script the
  *procedure* so it's a one-command step once the owner has Steamworks
  wrapper access).
- Primary files: new `scripts/steam-drm-wrap.js` or equivalent, a new
  `docs/steam-drm-wrap-procedure.md`.

### Claude lane (this session) — Phase 13 continuation

**Status 2026-07-16:** all four remaining Phase 13 test specs are
written and landed — `tests/e2e/bunker-tree.spec.js` (opens the tree,
switches BASE SYSTEM/CLASS SKILLS tabs, grants shells via the global
`window.bankManager` and actually purchases a node, asserting the status
text changes), `tests/e2e/keyboard-controls.spec.js` (real WASD movement
+ a real canvas mouse-click fire, not the debug hooks the screenshot
script uses), `tests/e2e/game-over-leaderboard.spec.js` (offline state),
`tests/e2e/browser-gamepad-fallback.spec.js` (a faked
`navigator.getGamepads()` drives real player movement through the actual
fallback polling loop). `tests/e2e/helpers.js` gained
`startRunAndSkipIntro` — starting a run launches a class-intro/cutscene/
Mothership-dialogue sequence that holds `window.game.inputEnabled` false
until it's skipped or played out; every gameplay-testing spec needs this,
not just a `#hud-run-seed` visibility check (which can pass while the
sequence is still blocking input).

**Verification status, honestly:** `bunker-tree`, `keyboard-controls`,
and `game-over-leaderboard` each got a clean individual pass. Also fixed
`eslint.config.js` along the way — it was linting `playwright-report/**`'s
own bundled trace-viewer JS (1147 false-positive errors) because that
generated dir wasn't in the ignore list, the same oversight `.gitignore`
already had covered but eslint didn't. `browser-gamepad-fallback.spec.js`
did **not**
get a clean run — six attempts across escalating timeouts (60s up to
180s test-level) all stalled partway through `startRunAndSkipIntro`
under `uptime` load averages that climbed from ~3 to ~12 over the course
of this work, confirmed caused by this same dev container running this
session's Claude instance *plus* a second independent Claude Code
session, an Antigravity IDE extension host, and a Codex app-server all
concurrently (`ps aux` — not something to fix by killing shared
processes). The test's logic mirrors the three that do pass and reuses
the identical `startRunAndSkipIntro`/`window.game` access pattern, so
there's no specific reason to suspect a logic bug in it specifically —
but it has not actually been proven green. **Re-run
`npx playwright test tests/e2e/browser-gamepad-fallback.spec.js` once
system load is back to normal before treating Phase 13 as fully closed.**

Real findings while building these (not test-harness noise):
- Multi-level skill nodes (e.g. `ammoCapacity`, `LV 0/3`) stay in the
  `available` CSS class after a purchase as long as they can still be
  upgraded further — asserting a final `unlocked` class is wrong for
  these; assert the status/level text changed instead.
- `#lore-hud-prompt`-style ambient environment noted in passing, not
  filed here (see `docs/ux-and-game-feel-punch-list-2026-07-16.md`
  instead — that's the non-Steam UX track).
- This dev container is genuinely under multi-agent load throughout this
  sprint (confirmed: a second independent Claude Code session, an
  Antigravity IDE agent, and a Codex app-server process were all running
  concurrently) — the original 1000ms fixed buffer in
  `bootToTitleSplash` (working around Vite's post-first-load dev-server
  reload) started flaking under that load. Replaced with a retrying
  click (1s/2.5s/5s growing waits) rather than one bigger fixed guess.

## Coordination note

Same as Wave 4: this is a proposal against current `git log`/`git
status`, not a lock. If a lane is already mid-task on something listed
under another lane, keep going — update this doc afterward rather than
stopping to re-negotiate. Always `git status`/`git diff` immediately
before editing a file another lane claims above.
