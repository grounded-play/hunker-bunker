# Steam & UX Docs — Master Index

Last reconciled: 2026-07-28. One reference point for the active implementation
plan, verified deployment state, lane ownership, and historical design context
so concurrent agents do not rediscover work or overwrite one another. The
newest authoritative documents appear first; older sprint documents remain
useful history but are not current status.

## Start here

- **[`current-feature-status.md`](./current-feature-status.md)**
  — canonical implementation/connection/test/live-acceptance/claim matrix.
  Historical planning is indexed under [`archive/`](./archive/README.md);
  compatibility stubs preserve older links.
- **[`master-implementation-plan-2026-07-28.md`](./master-implementation-plan-2026-07-28.md)**
  — current dependency-ordered implementation plan across backend security,
  Steam live acceptance, Cloud/Input/Deck, radial WFC, objectives, factions,
  consequence clarity, first-hour acceptance, retail assets, and documentation.
- **[`backend-steam-and-game-connection-audit-2026-07-28.md`](./backend-steam-and-game-connection-audit-2026-07-28.md)**
  — verified current-state audit, including the active `~/server`
  Docker/Caddy deployment and the distinction between configured backend
  health and live Steam-installed acceptance.
- **[`master-implementation-plan-lane-split-2026-07-28.md`](./master-implementation-plan-lane-split-2026-07-28.md)**
  — the current 2-way (Claude/Codex) task split for the master implementation
  plan above: Claude = gameplay/world/objectives/faction/ending systems,
  Codex = backend/ops/economy/input/asset/doc hygiene. Also lists which
  parts of the master plan are live/manual acceptance that no agent can do.
  Treat this as the ownership authority while both lanes are active; check its
  status log and `git diff` before touching a shared file.
- **[`faction-verb-matrix.md`](./faction-verb-matrix.md)** and
  **[`first-hour-acceptance-plan.md`](./first-hour-acceptance-plan.md)**
  — the two design docs wave 6 assigned to a Gemini lane on 2026-07-16 that
  were never written (no Gemini agent has actually touched this branch).
  Written 2026-07-28 by Claude since they directly gate Phase 8.1/10.1 of
  the master plan above.
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
  priority ladder, migration order) that collapses the parallel objective
  systems. `ObjectiveRegistry` is now implemented and connected to camp
  quests, black box, compass targeting, and selected story events; migration
  of tutorial, extraction, generator, cave, hive, boss, and remaining
  objective producers is still open.
- **[`ux-and-game-feel-punch-list-2026-07-16.md`](./ux-and-game-feel-punch-list-2026-07-16.md)**
  — the separate, parallel gameplay/UX punch list (camps, hives, maze
  diversity, lore pickup, objectives/black box, sub-objectives, boss
  difficulty, ammo economy, skill tree UI, notification/dialogue system).
  Not Steam-specific; a different track from the list above.

## Active execution status

This is a compact orientation only. The lane-split status log is authoritative
for detailed handoffs and completed work.

| Lane | Current scope | Latest verified status | Shared-file caution |
| --- | --- | --- | --- |
| Gameplay/world agent | Master-plan Phases 6–10 | Phase 6.2/6.4 abstract ring non-bypass and increasing-distance proofs complete across 2,000 seeds; physical WFC projection/room clusters remain open; Phase 7 objective hierarchy is next | Owns `threeGame`, maze/WFC, objectives, factions, endings |
| Backend/platform agent | Master-plan Phases 0–5 and 11–12 | Deployment audit and master documentation reconciled; backend is healthy/public/SQLite; credential rotation and live Steam acceptance remain manual blockers | Owns server/scripts/Electron/Input/Vault/assets/docs; re-read diffs before shared documentation edits |
| User/manual acceptance | Steamworks, credentials, Cloud, hardware, commerce | Publisher/session credentials require rotation; dashboard publication, Steam-installed vertical slice, two-machine Cloud, physical Deck, and MicroTxn acceptance are not agent-completable | Never paste secrets or mark manual evidence complete without an observed pass |

Current coordination rules:

1. Check `git status`, the lane-split status log, and the target-file diff
   immediately before editing.
2. Do not edit files assigned to the other active lane without an explicit
   handoff.
3. Record partial versus complete status precisely; abstract graph proof is not
   physical WFC proof, and configured backend health is not live Steam proof.
4. Run focused tests for the owned slice, then the full required validation
   before declaring a phase complete.
5. Make shared documentation edits narrow and additive; never broadly replace
   another agent's live changes.

## Steam launch readiness (status/planning)

- **[`master-implementation-plan-2026-07-28.md`](./master-implementation-plan-2026-07-28.md)**
  — canonical current plan for what remains, ordered by security, live Steam,
  platform acceptance, gameplay, and release gates.
- **[`backend-steam-and-game-connection-audit-2026-07-28.md`](./backend-steam-and-game-connection-audit-2026-07-28.md)**
  — canonical current evidence for what is already configured and running,
  including the active Docker/Caddy backend and SQLite volume.
- [`steam-launch-readiness-master-plan.md`](./steam-launch-readiness-master-plan.md)
  — the full 14-phase plan (backend deploy, Steamworks dashboard,
  packaged build, auth/sessions, leaderboards, inventory/trading, store/
  microtransactions, achievements, cloud saves, Steam Input/Deck, DRM,
  store assets, browser/UI acceptance, production data/ops). This is the
  detailed historical Steam plan; its undeployed-backend assumptions are
  superseded by the 2026-07-28 audit and master plan.
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
  grants/transactions, reading structured logs, idempotency behavior, and
  JSON/SQLite storage). The active `~/server` deployment uses durable SQLite
  on the `hunker-bunker-data` Docker volume.
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
  — historical audit and design evidence, not a current completion list.
  Covers: notification/dialogue system
  (4 distinct color languages sharing one HUD corner, a full-screen blur
  overlay reused for combat alerts, priority ordering); world-gen (why
  camps are hard to find, why hives read as "too close," why the maze
  shape-carve work gets washed out by a later shape-blind fill pass); lore
  pickup UX (plus a real double-counting bug in the log ledger);
  objective tracking and the black box; sub-objectives;
  boss difficulty and ammo economy (with the actual DPS/HP/ammo-pool math
  worked out); skill tree UI. Several findings have since landed, including
  black-box guard enforcement, objective-registry foundations, WFC rebuilding,
  and the skill-tree text-wrap fix. Use the current audit/master plan for open
  status.

## How to keep this index from going stale

When finishing doc-worthy work, make a narrow additive update here and add a
dated entry to the active lane-split status log. Because concurrent agents may
edit this file, always re-read the current file and diff immediately before
patching; never replace or broadly reformat another lane's entries.
