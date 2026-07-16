# Dev Sprint 19 Branch Audit and Open Work

Checkpoint: `dev-sprint-19` after commit `c12c226` plus the follow-up terrain pass in this worktree.

This document is a grounded review of what exists now, what is real, what is weak, what is disconnected, and what should be tackled next before calling the Steam/gameplay layer production-ready.

## Executive Read

The branch now contains real engineering across four big fronts:

- A Steam-trusted backend rail: auth ticket verification, leaderboard score recomputation, leaderboard reads/writes, inventory routes, item grants, mock/durable JSON storage, store catalog/purchase scaffolding, loot odds, Docker/Fly deploy files, and tests.
- A desktop Steam shell: Electron Steam initialization, overlay helpers, auth-ticket IPC, packaged `steam-config.json`, Steam Input state polling, save bridge, achievement/stat forwarding, and preload backend helpers.
- Player-facing Steam UI: game-over leaderboard widget, Steam Vault, Store tab with published odds, item-drop toasts, milestone grant messaging, generated Steam capsule assets, and Steam docs.
- Game-system improvements: unified vertical Bunker Tree, boss phase scaffolding, less punishing world-loop lighting, lights-out gating, and the current terrain accessibility pass.

The big warning: many pieces are connected enough for local/dev validation, but not yet proven as a live Steam product. The highest-risk gaps are session-token auth, deployed durable storage, route hardening, real Steam API verification, controller-to-gameplay acceptance on Deck, and the paid-random-item product/policy lane.

> **UPDATE 2026-07-15:** several items this doc lists as "no"/"not yet"
> now exist in the tree (still `[CODE]`-only — none of it has touched a
> real Steamworks project or deployed backend yet). Corrected inline
> below where it changes a specific bullet. For the current authoritative
> "what's left, in what order" checklist, see
> [`docs/steam-launch-readiness-master-plan.md`](./steam-launch-readiness-master-plan.md) —
> this doc remains valuable for the design reasoning and repo-structure
> critique (main.js/threeGame.js decomposition, product flag boundaries),
> which the readiness plan doesn't repeat. Also not covered here at all:
> the Queen boss fight (`src/bossPhases.js`) is now fully wired into
> `threeGame.js`/`achievements.js`/the Steam milestone-grant listener —
> see the readiness plan's "Queen fight gameplay acceptance" section.

## Current Implementations

### Steam Backend

Implemented:

- `server/index.js` mounts Steam auth, leaderboards, inventory, store, and relay routes.
- `server/steamAuth.js` verifies Steam Web API auth tickets and exposes `/steam/session`.
- `server/leaderboardScoring.js` recomputes trusted run scores server-side.
- `server/steamLeaderboards.js` supports trusted submit, leaderboard reads, real Steam leaderboard API calls, mock leaderboard fallback, milestone grant derivation, and leaderboard ID discovery/auto-create.
- `server/db.js` provides atomic JSON persistence, mock inventories, mock leaderboards, idempotency records, run receipts, and purchase receipts.
- `server/steamInventory.js` exposes inventory read, trigger-drop, promo/milestone grants, exchange/cache-open, and market eligibility.
- `server/steamGrant.js` centralizes dev-mode and real Steam Inventory `AddItem` grants.
- `server/steamStore.js` exposes catalog, mock/live key purchase init, and purchase finalization.
- `server/lootTables.js` is the single source of truth for Deep Relic Cache odds.
- Tests exist for the main backend modules.

Weak or open:

- `/steam/session` verifies a ticket but does not issue an HMAC bearer session. Most routes still burn a fresh Steam auth ticket per call.
- Auth middleware is duplicated between inventory and store. Leaderboard auth has its own path. This increases drift risk.
- No route rate limiting exists yet.
- JSON persistence is acceptable for local/dev and one-machine beta tests, but it is not production-durable unless `HB_DB_STORAGE_PATH` is mounted on persistent storage.
- Idempotency records have no expiry or cleanup.
- Real Steam API request shapes are tested at unit level, but not proven against a live Steamworks app for this app ID.
- Store mock mode grants purchased keys when microtransactions are disabled. That is useful for dev, but the Store tab must not be treated as production commerce until it is explicitly gated and Valve microtransactions are enabled.
- Purchase receipts append status rows instead of updating a canonical transaction record; that is okay for audit trails, weak for operational queries.

### Deploy and Build Pipeline

Implemented:

- `Dockerfile` for the backend service.
- `fly.toml` starter config.
- `docs/steam-backend-deploy-flyio.md` runbook.
- `scripts/write-steam-config.js` writes packaged Electron Steam backend config.
- `package.json` wires `npm run steam:config` into Electron build/dist scripts.
- `.gitignore` excludes local backend stores, build outputs, and `steam_appid.txt`.

Weak or open:

- ~~There is no deploy workflow yet.~~ **UPDATE 2026-07-15:** `.github/workflows/steam-backend-deploy.yml` now exists (runs `steam:audit-backend:strict` then `flyctl deploy --remote-only`). Still never run against a real Fly app/account — see `docs/steam-launch-readiness-master-plan.md` §1.
- `fly.toml` is still a starter. The app name, volume mount, secrets, and allowed origins need real values.
- `/health` does not include version, commit SHA, uptime, DB path mode, or storage durability status. **UPDATE 2026-07-15:** durability status (`storage.durable`, `lastWriteError`) is now reported (`server/db.js`'s `getDbStatus()`); version/commit SHA/uptime still aren't.
- ~~No CI depot audit currently fails on `steam_appid.txt` or local DB files inside packaged depots.~~ **UPDATE 2026-07-15:** `scripts/audit-steam-depot.js` now exists and checks exactly that (plus `.pem`/`.key`/`.p12`/`.pfx`/stray `.env*`), wired as `npm run steam:audit-depot`. Not yet run against a real packaged depot.
- DRM wrapping is still planned, not scripted.
- `electron/steam-config.json` is generated and ignored, which is correct, but release builds need CI/packaging evidence that the production URL was baked.

### Electron and Preload

Implemented:

- Preload reads bundled Steam config before falling back to env/default localhost.
- Preload exposes Steam identity, auth-ticket, backend health, leaderboard, inventory, store, overlay, and Steam Input helpers.
- Electron main owns the Steamworks native boundary.

Weak or open:

- `createSteamSession` exists but the rest of the preload helpers do not use a session token.
- Every inventory/store/grant call requests a ticket and sends it directly.
- Packaged-client backend reachability is solved structurally, but not yet accepted on a Steam-installed build with no environment variables.
- Steam Input state is broad, but Deck gameplay acceptance still needs hardware validation. Automated tests do not cover controller traversal/combat/menu focus.

### Player-Facing Steam UI

Implemented:

- Game-over leaderboard widget.
- Steam Vault modal with inventory grid, item details, ownership reconciliation, and Store tab.
- Store odds display reads from backend catalog.
- Steam item toasts for grants/drops.
- Demo end-card and store capsules exist.

Weak or open:

- UI is ahead of production readiness. The Store tab exists while live microtransactions are intentionally disabled. This needs a build flag or server-driven kill switch before public builds.
- Steam item art points at remote URLs. Those assets need to exist, be durable, and match Steam inventory schema art.
- Equipped cosmetics are reconciled, but actual equipping is still local/UI-only and not a full cosmetic rendering pipeline.
- Leaderboard UI shows the top list, but "your exact rank" around the player still needs real/live response support and acceptance.
- ~~The old terminal Base tab still contains legacy weapon/tier-2 card DOM even though Bunker Tree is now the accepted surface.~~ **UPDATE 2026-07-15:** the `#tier2-section`/`#weapons-section` DOM and `renderTier2Section`/`renderWeaponsSection` methods were removed 2026-07-14 (see `docs/full-implementation-review-2026-07-14.md`). One harmless leftover remains: `src/threeGame.js`'s render loop still tries to hide those two now-nonexistent element ids every frame (`document.getElementById(id)?.classList.add('hidden')`, a no-op since they don't exist) — cosmetic dead code, not re-flagging as a real gap.

### Steam Inventory and Economy

Implemented:

- Steam item schema draft in `steam/inventory_schema_hunker_bunker.json`.
- Dev mock inventory and item grants.
- Victory patches, achievement emblems, milestone grants, free Deep Relic Cache drops, Cache Key SKU catalog, cache-open recipe, and disclosed odds.
- Policy disclosure doc in `docs/steam-lootbox-odds-disclosure.md`.

Weak or open:

- Paid random reward flow is product-approved in repo docs, but it still needs Steamworks policy/legal review before public release.
- Marketability flags in schema are not enough; Community Market enablement and item behavior must be verified in Steamworks.
- Real inventory exchange/cache-open behavior needs live API proof. Dev mock behavior is not sufficient.
- The milestone grant map is safer than client-supplied itemdefids, but grant receipts still need durable production storage.
- Free drop trigger has a client-side 15% gate. The server should own abuse-resistant drop cadence before public economy value matters.

### Bunker Tree

Implemented:

- `src/skillTree.js` adapts class, weapon, O2/base goals, and tier-2 upgrades into one vertical graph.
- `src/threeGame.js` renders one downward scroll tree with measured SVG connections.
- Graph-only cross gates overlap progression paths without changing old bank save keys.
- Tests assert legacy node coverage, graph uniqueness, and cross-branch connections.

Weak or open:

- The graph is mechanically connected, but the economy balance is not yet tuned around the new cross-gates.
- ~~The Base tab still has old upgrade-card markup.~~ **UPDATE 2026-07-15:** removed 2026-07-14 — see the note in the Player-Facing Steam UI section above.
- There is no player-facing preview of "unlock route" beyond direct blocker text.
- No controller/focus audit has been done for the larger scroll tree.

### World Terrain and Maze Readability

Problem observed:

- The bunker still read as too walled-in, too flat, and too pillar-maze heavy.
- The logical wall collision footprint made tight one-tile gaps feel blocked even when the visual opening looked traversable.
- The first chunks were forced into maze landforms, so the start could immediately look like a dense pillar field.

Implemented in this follow-up pass:

- Reduced maze landform weights; hard mazes become discoveries rather than the default.
- Start chunk now uses open field; immediate ring uses ruins instead of forced maze.
- Maze and ruins carving now targets much higher floor ratios with larger connected plazas.
- Canyon ridges are spaced farther apart with wider seeded gaps.
- Field outcrops are less dense.
- Maze wall dressing now uses more damaged/low walls and fewer hazard/full-height walls.
- Added sparse non-blocking raised floor slabs so ground reads as layered terrain instead of a perfectly flat plane.
- Reduced wall collision footprint while preserving wall tile blocking, making apparent corridors more playable.

Still weak:

- The game is still fundamentally a 2D tile collision map with visual height dressing. It is not true vertical traversal.
- Raised floor slabs are decorative and do not alter player Y or pathing.
- Projectiles and flashlight occlusion still raycast rendered wall meshes, so loosened movement collision can diverge from projectile/visibility behavior near edges.
- The terrain pass needs real camera/gameplay review, not only tests.

## Repo-Wide Weak Spots

### Too much lives in `main.js` and `src/threeGame.js`

Both files are carrying multiple systems: Steam UI, menus, achievements, Vault, store, leaderboard, input, terrain, combat, terminal UI, mission state, and rendering. This is slowing iteration and increasing accidental coupling.

Recommended split:

- Move Steam Vault/store UI into `src/steamVaultUi.js`.
- Move leaderboard result UI into `src/leaderboardUi.js`.
- Move terrain dressing helpers out of `threeGame.js` where practical.
- Keep `threeGame.js` focused on world simulation/rendering orchestration.

### Documents are partially stale

Some docs still describe inventory/Vault as "parallel worktree" or leaderboard UI as not accepted, even though the branch now contains committed versions. This audit should supersede those sections until the older docs are updated.

### Tests are strong for pure modules, weaker for UI acceptance

The repo has good Vitest coverage for scoring, data transforms, terrain helpers, economy odds, and backend modules. It does not yet have browser-level smoke tests for:

- opening the console and using Bunker Tree
- Steam Vault inventory/store tab
- game-over leaderboard display
- controller gameplay
- packaged Electron preload config

### Product flags need sharper boundaries

`DEMO_BUILD`, Store visibility, mock purchase mode, Steam backend readiness, and paid-random-item availability need one coherent feature gate story. Right now the pieces exist, but the release policy is spread across code, env vars, and docs.

## Highest-Value Next Slices

1. **Session token rail**
   - Status: implemented in the current follow-up slice.
   - Make `/steam/session` issue a short-lived HMAC bearer token.
   - Move inventory/store/leaderboard routes to bearer auth.
   - Keep ticket verification only for session minting.
   - Remaining live check: packaged Electron build should mint one session and reuse it for inventory/store/leaderboard calls against the deployed HTTPS backend.

2. **Public-build economy guard**
   - Hide or disable Store tab unless backend says commerce is live and policy-ready.
   - Keep Vault read-only in public builds until real Steam Inventory behavior is verified.

3. **Backend hardening**
   - ~~Add rate limits.~~ Done — `server/rateLimit.js`, mounted on `/steam` in `server/index.js`.
   - ~~Add DB durability status to `/health`.~~ Done — `getDbStatus()` in `server/db.js`.
   - Add idempotency cleanup. Still open.
   - ~~Add deploy workflow and volume-backed storage.~~ Workflow + `fly.toml` volume mount exist (`.github/workflows/steam-backend-deploy.yml`, `docs/steam-backend-deploy-flyio.md`). Never run against a real Fly app — still open in practice, just not in code.

4. **Deck/controller acceptance**
   - Install from Steam beta branch.
   - Play five minutes entirely on controller.
   - Verify movement, fire, interact, reload, scan, ability, pause, menu focus, and text input.

5. **Terrain review loop**
   - Capture screenshots/video of first 10 chunks after the current terrain pass.
   - Tune exact floor ratios and raised slab density from real footage.
   - Decide whether "true elevation" is worth adding, or whether visual layering is enough.

6. **UI decomposition**
   - Extract Steam Vault/store and leaderboard UI out of `main.js`.
   - ~~Remove retired terminal upgrade markup once Bunker Tree is accepted.~~ Done 2026-07-14.

## Suggested Acceptance Checklist

- `npm run lint`, `npm test`, and `npm run build` pass.
- Fresh run starts in an open, readable crash area with no immediate pillar maze.
- Player can walk cleanly through one-tile visual openings without snagging.
- Console Skills tab shows the unified Bunker Tree and no old branch UI.
- Game-over leaderboard displays live/mock/offline honestly.
- Steam Vault opens in Electron and fails gracefully in web/offline mode.
- Packaged build with no env vars reaches deployed `/health`.
- Backend `/health` reports auth configured and persistent DB mounted.
- Real Steam account can submit a score and read it back.
- Real Steam account can read inventory without trusting client-supplied steamid.
- Store tab is hidden/disabled in public builds until commerce is truly enabled.
