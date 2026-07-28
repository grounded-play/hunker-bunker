# Steam & UX Docs — Master Index

Date: 2026-07-16. One reference point for everything produced across this
session (2026-07-15 evening through 2026-07-16) so Claude, Codex, and
Gemini are all reading from the same map instead of rediscovering each
other's docs. Newest/most-authoritative docs first in each section.

## Start here

- **[`sprint-19-wave6-punch-list-lane-split.md`](./sprint-19-wave6-punch-list-lane-split.md)**
  — the current 3-way (Claude/Codex/Gemini) task split for the gameplay/UX
  punch list's remaining items plus the objective-framework/first-hour/
  faction-verb gaps `things-we-missed.md` calls out. Read this before
  picking up any punch-list or design-gap work; it also lists what's
  already been fixed since the punch list was written, so you don't redo it.
- **[`sprint-19-wave5-steam-connection-lane-split.md`](./sprint-19-wave5-steam-connection-lane-split.md)**
  — the current 3-way (Claude/Codex/Gemini) task split for what's left to
  connect the game to Steam. Read this before picking up any Steam work.
- **[`things-we-missed.md`](./things-we-missed.md)**
  — full audit of underplanned/unexplored/dropped work across design and
  deployment; the source material wave 6 above triages into lanes.
- **[`objective-system-spec.md`](./objective-system-spec.md)**
  — design for the unified tracked-objective contract (one event shape,
  priority ladder, migration order) that collapses the five parallel
  objective systems; wave 6 Claude-lane item 6, design-complete
  2026-07-17, implementation not started.
- **[`ux-and-game-feel-punch-list-2026-07-16.md`](./ux-and-game-feel-punch-list-2026-07-16.md)**
  — the separate, parallel gameplay/UX punch list (camps, hives, maze
  diversity, lore pickup, objectives/black box, sub-objectives, boss
  difficulty, ammo economy, skill tree UI, notification/dialogue system).
  Not Steam-specific; a different track from the list above.

## Steam launch readiness (status/planning)

- **[`steam-launch-readiness-master-plan.md`](./steam-launch-readiness-master-plan.md)**
  — the full 14-phase plan (backend deploy, Steamworks dashboard,
  packaged build, auth/sessions, leaderboards, inventory/trading, store/
  microtransactions, achievements, cloud saves, Steam Input/Deck, DRM,
  store assets, browser/UI acceptance, production data/ops). The
  canonical "what's real vs. coded vs. blocked" reference — everything
  else in this section is either older history behind it or a narrower
  slice in front of it.
- [`sprint-19-wave4-lane-split.md`](./sprint-19-wave4-lane-split.md) —
  the previous (2026-07-15 night) 3-way split. Superseded by Wave 5
  above for current task assignment, but has the original reasoning for
  why the lanes are split the way they are.
- [`steam-implementation-status-and-roadmap.md`](./steam-implementation-status-and-roadmap.md),
  [`steam-make-it-real-plan.md`](./steam-make-it-real-plan.md),
  [`steam-build-pipeline.md`](./steam-build-pipeline.md),
  [`steam-economy-leaderboards-drm-plan.md`](./steam-economy-leaderboards-drm-plan.md),
  [`steam-truth-check.md`](./steam-truth-check.md) — earlier-session
  history/design-reasoning docs, superseded for current status by the
  master plan above (each carries its own "superseded" pointer at the
  top).
- [`dev-sprint-19-branch-audit-and-open-work.md`](./dev-sprint-19-branch-audit-and-open-work.md),
  [`full-implementation-review-2026-07-14.md`](./full-implementation-review-2026-07-14.md)
  — the two full-repo review passes from 2026-07-14/15 (dead code, the
  Queen-fight gap that's since been closed, repo-health notes). Historical
  record of what was found and fixed; also superseded for "what's left"
  by the master plan.

## Steam backend operations

- **[`steam-backend-admin-runbook.md`](./steam-backend-admin-runbook.md)**
  — how to operate the deployed backend day-to-day (investigating bad
  grants/transactions, reading structured logs, idempotency behavior).
  Written against the current JSON-file storage model — see Wave 5's
  Codex-lane note about the real-DB migration this will need an update
  for once that lands.
- **[`steam-backend-deploy-docker-caddy.md`](./steam-backend-deploy-docker-caddy.md)** —
  the Docker Compose & Caddy deploy runbook for self-hosted execution behind
  `https://steam.tuesdaycinema.club` (container setup, Caddy reverse proxy,
  secrets, and backup procedure).
- [`steam-backend-deploy-flyio.md`](./steam-backend-deploy-flyio.md) —
  legacy/alternative Fly.io cloud deploy guide.

## Steam economy, achievements, store assets

- **[`steam-dashboard-handoff.md`](./steam-dashboard-handoff.md)**
  — generated copy/paste packet for the Steamworks dashboard: app/depot
  identity, launch options, leaderboards, achievements, stats, Cloud paths,
  Steam Input manifest, Inventory schema, Item Store filters, backend env,
  and acceptance checklist. Regenerate with `npm run steam:dashboard-handoff`.
- **[`steam-achievement-audit-checklist.md`](./steam-achievement-audit-checklist.md)**
  — achievement-key-vs-Steamworks audit checklist (keys, icons, hidden/
  secret status, `comingSoon` exclusion).
- **[`steam-item-store-page-plan-and-image-prompts.md`](./steam-item-store-page-plan-and-image-prompts.md)**
  — the hosted Steamworks Item Store page plan: schema work, itemdef
  phases, top-level filters, in-game link plan, and image-generation
  prompts for the item store background/logo/detail images. The
  in-game-item-icon counterpart to the capsule-art doc below.
- **[`steam-store-placeholder-assets-and-prompts.md`](./steam-store-placeholder-assets-and-prompts.md)**
  — audit of the store *capsule* art specifically (found the placeholder
  capsules were cropped from a mislabeled source image with a different
  game's branding baked in) plus regeneration prompts. Mostly resolved by
  the "premium store/library assets" commit since this doc was written —
  verify current `steam/store/*.png` against it before assuming anything
  here is still outstanding.
- [`steam-store-asset-checklist.md`](./steam-store-asset-checklist.md),
  [`steam-store-assets-plan.md`](./steam-store-assets-plan.md) —
  the original asset requirement lists (sizes, capture-vs-generate
  guidance). Reference for spec/sizing; status fields inside are stale,
  trust the file inventory in `steam/store/` over the doc's own "Not
  finished" markers.
- [`steam-lootbox-odds-disclosure.md`](./steam-lootbox-odds-disclosure.md)
  — the Cache Key / Deep Relic Cache crate-and-key economy design and
  disclosed-odds policy reasoning.
- [`steam-portal-copy.md`](./steam-portal-copy.md) — Steam store page
  copy (About This Game, system requirements, platform/Deck compatibility
  info) ready to paste into Steamworks.

## Compliance

- **[`HEALTH_WARNING.md`](./HEALTH_WARNING.md)** — photosensitive
  seizure warning, required for the public-facing Steamworks store link.
- **[`PRIVACY.md`](./PRIVACY.md)** — privacy policy covering Steam
  identity/data handling.

## Gameplay/UX (non-Steam track)

- **[`ux-and-game-feel-punch-list-2026-07-16.md`](./ux-and-game-feel-punch-list-2026-07-16.md)**
  — see "Start here" above. Covers: notification/dialogue system
  (4 distinct color languages sharing one HUD corner, a full-screen blur
  overlay reused for combat alerts, priority ordering); world-gen (why
  camps are hard to find, why hives read as "too close," why the maze
  shape-carve work gets washed out by a later shape-blind fill pass); lore
  pickup UX (plus a real double-counting bug in the log ledger);
  objective tracking and the black box (the guard boss isn't actually
  enforced); sub-objectives (nothing like a checklist HUD exists yet);
  boss difficulty and ammo economy (with the actual DPS/HP/ammo-pool math
  worked out); skill tree UI. One item from this list — the skill-tree
  text-wrapping bug (title text breaking mid-word, e.g. "MAGNE/T/EXPANS/
  ION I") — is already fixed (`style.css` `.skill-node-header`).

## How to keep this index from going stale

When you finish a doc-worthy piece of work this session, add one line
here rather than letting it exist only in a commit message — that's the
whole value of this file.
