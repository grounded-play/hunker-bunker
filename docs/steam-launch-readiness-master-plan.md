# Steam Launch Readiness Master Plan

Date: 2026-07-16
Branch context: `dev-sprint-19`, dirty worktree with substantial uncommitted Steam/backend/gameplay changes.

This document is the project-level plan for turning Hunker Bunker from a game
with local Steam scaffolding into a Steam-installed build that connects to real
Steam services, uses a trusted backend, supports leaderboards and inventory,
and can survive a real Steam Deck/player acceptance pass.

It intentionally separates four kinds of work:

1. Code that already exists in this branch.
2. Code still missing from the repo.
3. Steamworks/dashboard/account work that cannot be solved by code alone.
4. Live acceptance work that must be proven on installed Steam builds.

Older docs such as `steam-make-it-real-plan.md`,
`steam-implementation-status-and-roadmap.md`,
`dev-sprint-19-branch-audit-and-open-work.md`, and
`full-implementation-review-2026-07-14.md` contain useful history, but several
sections are now stale. This document should be treated as the current
implementation plan until those docs are reconciled.

## Product Definition

The Steam-connected version of Hunker Bunker should support:

- Steam launch and overlay.
- Steam identity and ownership-aware backend auth.
- Trusted leaderboard submissions.
- Leaderboard reads in game-over/results UI.
- Steam achievements and stats.
- Steam Cloud save sync.
- Steam Input and browser Gamepad fallback.
- Steam Deck playable UX.
- Steam Inventory read, grants, exchanges, and ownership reconciliation.
- Player trading/marketplace through Steam Inventory/Community Market, not a
  custom peer-to-peer in-game marketplace.
- Optional real-money Cache Key purchases only after Steamworks
  Microtransactions and legal/product approval are complete.
- SteamPipe packaging with depot audits and DRM wrapping where appropriate.

The goal is not merely "code compiles." The goal is:

```text
Steam install -> launch -> auth -> play -> submit score -> read leaderboard
-> read/grant inventory -> cloud/achievement/overlay confirmed -> Deck usable.
```

## Current High-Level Status

### Already Real In Code

The branch currently contains substantial implementation work:

- Electron app shell using `steamworks.js`.
- Steam identity/auth-ticket IPC.
- Preload helpers for backend health, sessions, leaderboards, inventory, store,
  overlay, and Steam Input.
- Backend modules for:
  - Steam auth ticket verification.
  - HMAC backend session tokens.
  - Leaderboard score recomputation.
  - Real Steam leaderboard submit/read paths.
  - Mock leaderboard fallback.
  - Inventory read/drop/grant/exchange/market eligibility routes.
  - Store catalog and purchase scaffolding.
  - Rate limiting.
  - JSON persistence with atomic writes.
  - Health endpoint with Steam and storage status.
- Dockerfile and Fly.io config for the trusted backend.
- Backend deploy workflow scaffold.
- Backend environment audit script.
- Steam depot audit script.
- Packaged `electron/steam-config.json` generation.
- Store purchase gating so production cannot silently use mock purchases.
- Steam Vault/Store UI scaffolding.
- Browser Gamepad fallback mapped into gameplay controls.
- Steam Input gameplay routing.
- Queen combat/reward plumbing is partially integrated in the current dirty
  tree, although it still needs gameplay acceptance.
- Tests for many of the above modules.

### Still Not Proven

The project is not yet Steam-proven because these have not been completed:

- No deployed production HTTPS backend has been smoke-tested.
- No Steam-installed beta branch build has proven it can reach that backend
  without environment variables.
- No real Steam account has completed the full score/inventory loop.
- No real Steam Inventory item schema has been proven live.
- No real Community Market/trading behavior has been accepted.
- No Steam Microtransactions setup has been accepted or live-tested.
- No Steam Deck five-minute controller acceptance pass has been recorded.
- No DRM wrap acceptance pass has been recorded.
- No final Store page kit has been uploaded/accepted.
- Docs are out of sync with the current code state.

## Immediate Repo Hygiene Before More Feature Work

Before implementing more Steam features, stabilize the branch.

### Needs

- Decide whether this dirty tree should be one large integration commit or a
  set of logical commits.
- Include or discard the staged deletions:
  - `src/game.js`
  - `src/levelManager.js`
- If deleting old Phaser-era files, finish the cleanup:
  - Remove Phaser references from `README.md`.
  - Remove Phaser references from `index.html` credits/metadata if no longer
    true.
  - Remove Phaser aliases from `jsconfig.json`.
  - Confirm `package.json` no longer lists `phaser`.
- Add the untracked tests/scripts/docs that are meant to ship.
- Reconcile docs that still describe implemented work as missing.

### Acceptance

- `git status --short` contains only intentional files.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build` passes.
- `npm audit --omit=dev` reports 0 vulnerabilities.
- Dirty branch can be reviewed without guessing which changes belong to which
  sprint slice.

## Phase 1: Trusted Backend Deployment

Steam leaderboards, inventory, marketplace-adjacent features, and paid item
flows cannot be trusted from the client. They require a backend reachable over
HTTPS.

### Already Implemented

- `Dockerfile`
- `fly.toml`
- `docs/steam-backend-deploy-flyio.md`
- `.dockerignore`
- `.github/workflows/steam-backend-deploy.yml`
- `/health`
- `npm run steam:audit-backend`
- `npm run steam:audit-backend:strict`
- `HB_DB_STORAGE_PATH` support in `server/db.js`
- Storage durability status in `/health`
- Session token support
- Rate limits

### Needs

1. Choose or confirm the real Fly app name.
2. Create the Fly app:

   ```bash
   fly apps create <real-app-name>
   ```

3. Update `fly.toml`:

   ```toml
   app = "<real-app-name>"
   ```

4. Create a persistent volume:

   ```bash
   fly volumes create hb_data --size 1 --region iad
   ```

5. Set secrets on Fly:

   ```bash
   fly secrets set \
     HB_STEAM_PUBLISHER_KEY=<publisher web api key> \
     HB_SESSION_SECRET=<long random string> \
     HB_ALLOWED_ORIGINS=<allowed origins> \
     HB_STEAM_LEADERBOARD_IDS=<board:id list>
   ```

6. Decide Store flags:

   ```bash
   fly secrets set \
     HB_STEAM_MICROTXN_ENABLED=0 \
     HB_STEAM_STORE_ENABLED=0 \
     HB_STEAM_STORE_MOCK_PURCHASES=0
   ```

7. Run strict audit locally or in CI:

   ```bash
   npm run steam:audit-backend:strict
   ```

8. Deploy:

   ```bash
   fly deploy
   ```

   Or run the `steam-backend-deploy` GitHub Actions workflow after setting:

   - `FLY_API_TOKEN`
   - `HB_STEAM_PUBLISHER_KEY`
   - `HB_SESSION_SECRET`
   - `HB_ALLOWED_ORIGINS`
   - `HB_STEAM_LEADERBOARD_IDS`
   - `HB_STEAM_MICROTXN_ENABLED`
   - `HB_STEAM_STORE_ENABLED`

### Acceptance

- `curl https://<backend>/health` returns `ok: true`.
- Health reports:
  - `steam.authConfigured: true`
  - `storage.durable: true`
  - correct appid `1247290`
  - explicit session signing mode
- `curl https://<backend>/steam/store/catalog` returns catalog/odds and does
  not allow production mock purchases.
- Docker image builds:

  ```bash
  docker build -t hunker-bunker-steam-backend:local .
  ```

- Production dependency audit passes:

  ```bash
  npm audit --omit=dev
  ```

### Outstanding Risks

- Current JSON DB is acceptable for early playtest, but not serious scale.
- One Fly app means no proper staging/production split.
- No monitoring/alerting yet.
- Multi-machine writes need a real database later.

## Phase 2: Steamworks Dashboard Setup

This is account/dashboard work. It cannot be completed purely in repo code.

### Steam App Identity

Known app/depot values in repo:

- App ID: `1247290`
- Windows depot: `1247291`
- Linux depot: `1247292`

### Needs

Configure in Steamworks:

- App metadata.
- Build branches:
  - `beta`
  - optionally `playtest`
  - eventually `default`
- Steam Cloud.
- Achievements/stats.
- Leaderboards.
- Inventory Service.
- Item schema.
- Trading/marketability settings.
- Microtransactions, only if/when paid Cache Keys are approved.
- DRM wrapper settings/process.
- Store page assets.

### Acceptance

- Steam dashboard has all achievements/stats matching code keys.
- Steam dashboard has all leaderboards matching backend definitions.
- Inventory itemdefs match code constants.
- Steam Cloud has correct save paths.
- Steam Input manifest is uploaded/associated.
- Build depots match the VDFs.
- Private beta branch installs on desktop and Deck.

## Phase 3: Packaged Build Backend Reachability

The installed Steam build cannot depend on local environment variables. It must
contain a baked backend URL.

### Already Implemented

- `scripts/write-steam-config.js`
- `electron/steam-config.json` generation.
- `electron/preload.cjs` reads bundled config before env/default.
- Release config guard rejects localhost in strict mode.
- Steam build workflow writes config before packaging.

### Needs

1. Set CI variable:

   ```text
   HB_STEAM_BACKEND_URL=https://<backend>.fly.dev
   ```

2. Generate config locally for smoke:

   ```bash
   HB_STEAM_BACKEND_URL=https://<backend>.fly.dev npm run steam:config
   ```

3. Build packaged Electron output:

   ```bash
   npm run electron:build
   ```

4. Install through Steam beta branch, not just local Electron.

### Acceptance

- In a packaged build with no shell env vars, `getSteamBackendHealth` reaches
  the deployed backend.
- `/health` is visible from the installed build.
- Localhost fallback is not used in release/tagged builds.
- `steam:audit-depot` passes on both Windows and Linux unpacked outputs.

## Phase 4: Steam Auth And Backend Sessions

The backend must derive `steamid64` from Steam auth, not from the renderer.

### Already Implemented

- Steam auth-ticket IPC.
- `/steam/session`.
- HMAC session token creation/verification.
- Preload bearer session reuse.
- Route auth middleware accepts bearer sessions.
- Dev fallback when publisher key is absent.

### Needs

- Live test with a real Steam account.
- Confirm a packaged build mints one session and reuses it.
- Confirm expired/tampered sessions renew or fail safely.
- Confirm backend never accepts body/query `steamid64` for trusted operations.
- Confirm publisher key never appears in client bundles or logs.

### Acceptance

- Backend logs show ticket verification only for session minting, not every
  inventory/store/leaderboard call.
- Authenticated routes identify the correct real Steam account.
- Requests without ticket/session are rejected.
- Requests with mismatched client-supplied `steamid64` cannot affect ownership
  or leaderboards.

## Phase 5: Leaderboards

### Current Code Intent

Trusted scores should be submitted by the backend after recomputation. The
renderer should only send run facts. The backend decides the canonical score.

### Already Implemented

- `server/leaderboardScoring.js`
- `server/steamLeaderboards.js`
- `POST /steam/leaderboards/submit-run`
- `GET /steam/leaderboards/:board`
- Mock fallback when no publisher key is configured.
- Server-side milestone grants tied to validated run payloads.

### Steamworks Needs

Create leaderboards matching code definitions:

- `best_run_score`
- `survival_time_seconds`
- `deepest_depth_score`
- `daily_ops_score`
- `fastest_extraction_ms`

Then set:

```text
HB_STEAM_LEADERBOARD_IDS=best_run_score:<id>,survival_time_seconds:<id>,deepest_depth_score:<id>,daily_ops_score:<id>,fastest_extraction_ms:<id>
```

### Code/UX Needs

- Results screen should show:
  - live state
  - mock/dev state
  - offline state
  - top entries
  - player's exact rank if available
- Backend should persist run receipts durably.
- Idempotency records should eventually expire or compact.

### Acceptance

- Submit a real run from Steam-installed build.
- Score appears in Steam leaderboard.
- Score reads back through backend.
- Game-over UI displays the submitted score honestly.
- Duplicate submit does not create duplicate grants.
- Daily Ops score cannot be spoofed by changing client-side facts.

## Phase 6: Steam Inventory, Trading, And Marketplace

This is the most important product boundary: the game should not run its own
custom player marketplace. Steam Inventory owns items; Steam Trading and the
Community Market own player-to-player transfer.

### Product Model

- Steam items are cosmetics, collectibles, containers, keys, or emblems.
- No marketable gameplay power.
- Core progression stays local/Steam Cloud.
- The game may show inventory and ownership state.
- The game may initiate Steam-approved purchase/market/overlay flows.
- The game should not create an in-game peer-to-peer exchange that bypasses
  Steam.

### Already Implemented

- Inventory read route.
- Trigger drop route.
- Promo/milestone grant route.
- Exchange/open-cache route.
- Market eligibility route.
- Server-owned itemdef mapping for milestone grants.
- Deep Relic Cache odds table.
- Store catalog route.
- Steam Vault UI scaffolding.
- Ownership reconciliation for equipped cosmetics.
- Server-side drop cooldown.

### Steamworks Item Schema Needs

Create and upload inventory schema with itemdefs for:

- Common Relic Fragment.
- Rare Relic Fragment.
- Class victory patches:
  - Scout
  - Tank
  - Engineer
- Queen Slayer Emblem.
- Archivist Emblem.
- Cosmetic decals/finishes.
- Deep Relic Cache.
- Cache Key.
- Drop generator item(s).
- Exchange/bundle resolver item(s), if using Steam Inventory exchange.

Each itemdef needs explicit decisions:

- `name`
- `description`
- icon URLs
- type/category
- rarity
- tradable
- marketable
- commodity or unique
- bundle/generator/exchange behavior
- tags
- dynamic properties, if needed

### Trading/Market Needs

Dashboard/account tasks:

- Enable or configure item trading where appropriate.
- Enable marketability only for approved non-power items.
- Confirm any cooldowns or trade restrictions Steam applies.
- Confirm item visibility in the user's Steam Inventory.
- Confirm item listings on Steam Community Market if marketability is enabled.

Code tasks:

- Add clear UI language that trading/market actions happen through Steam.
- Add overlay links only after market eligibility is confirmed.
- Add read-only "tradable/marketable" display.
- Add ownership reconciliation before equip.
- Add graceful state when market eligibility API rejects or is unavailable.

### Acceptance

- Real Steam account can receive a granted item.
- Item appears in Steam Inventory.
- Item shows correct tradable/marketable status.
- If marketable, listing flow is possible through Steam.
- If tradable, transfer behavior matches Steam rules.
- Game UI never claims marketplace support for items Steam does not allow.
- Equipped cosmetics are removed or disabled if ownership disappears.

## Phase 7: Store, Cache Keys, And Paid Random Rewards

### Current Product Intent

Deep Relic Caches can drop for free. Cache Keys are the only paid SKU. Opening
a Deep Relic Cache with a Cache Key yields a disclosed random cosmetic reward.

### Already Implemented

- Store catalog endpoint.
- Odds endpoint/data from `server/lootTables.js`.
- Store UI reads backend catalog/odds.
- Production purchase gating.
- Mock purchases blocked in strict production.
- Purchase init/finalize scaffolding.

### External Needs

- Steamworks Microtransactions must be enabled by Valve.
- Legal/product review for paid random rewards.
- Regional compliance decision:
  - geo-gate
  - disable purchases in certain regions
  - or offer direct-purchase fallback
- Tax/payment setup in Steamworks.

### Code Needs

- Verify `ISteamMicroTxn/InitTxn`.
- Verify `QueryTxn`.
- Verify `FinalizeTxn`.
- Verify overlay confirmation URL behavior in Electron/Steam.
- Store canonical transaction state, not append-only receipts forever.
- Add refund/reversal handling if required.
- Add robust "purchase pending" UI.
- Add live error taxonomy:
  - Steam unavailable
  - user canceled
  - transaction pending
  - transaction rejected
  - already finalized
- Hide or disable Store tab in public builds until backend says purchases are
  enabled.

### Acceptance

- Store is disabled in public builds unless explicitly enabled by backend.
- Odds display matches server drop table.
- Real purchase sandbox/live test completes.
- Key appears in Steam Inventory.
- Cache open consumes cache + key and grants exactly one reward.
- Failed/canceled purchase grants nothing.
- Duplicate finalize grants nothing extra.

## Phase 8: Achievements And Stats

### Already Implemented

- Local achievement engine.
- Steam achievement forwarding through Electron.
- Queen Slayer now appears to be wired to a combat `queenKilled` event in the
  current dirty tree.
- Tests cover several achievement paths.

### Steamworks Needs

Create matching achievements/stats in Steamworks:

- Keys must match code exactly.
- Icons must be uploaded.
- Hidden/secret status must match product intent.
- Stats must be configured with correct types/ranges.

### Code Needs

- Audit every achievement key against Steamworks.
- Add migration behavior for changed achievement requirements.
- Confirm `comingSoon` achievements do not count toward visible completion.
- Confirm combat-only Queen kill cannot be granted by narrative branch.

### Acceptance

- Unlock an achievement in an installed Steam build.
- Steam overlay notification appears.
- Achievement appears on Steam profile.
- Offline behavior queues or fails gracefully.
- Queen Slayer only unlocks from combat defeat.

## Phase 9: Steam Cloud Saves

### Current Intent

Local `hb_*` state is bridged by Electron into `save.json`, then Steam Cloud
syncs that file between machines.

### Needs

Steamworks dashboard:

- Configure Steam Cloud.
- Set the exact save file path/pattern used by Electron.
- Confirm Windows and Linux paths.
- Confirm per-user storage behavior.

Code:

- Confirm save bridge writes all required state.
- Confirm conflict behavior.
- Confirm reset/export/import flows do not corrupt Cloud save.

Acceptance:

- Play on Machine A.
- Quit cleanly.
- Steam Cloud uploads save.
- Install on Machine B.
- Save state appears.
- Reset/new run behavior is sane.

## Phase 10: Steam Input And Steam Deck

### Already Implemented

- Steam Input manifest.
- Electron Steam Input polling.
- Renderer prompt switching.
- Steam Input gameplay routing.
- Browser Gamepad fallback.
- Controller menu focus helpers.

### Needs

- Upload/associate Steam Input config in Steamworks.
- Verify Steam Deck controller type/glyph behavior.
- Audit 1280 x 800 layout.
- Verify text entry uses Steam overlay keyboard where needed.
- Confirm no mouse-only required actions remain.

### Acceptance

On a Steam Deck, from a Steam-installed build:

- Launch game.
- Start run.
- Move.
- Aim.
- Hold fire.
- Interact.
- Reload.
- Use ability.
- Radar scan.
- Pause/open settings.
- Navigate menu/modal focus.
- Enter text where relevant.
- Play for five minutes without keyboard/mouse.

## Phase 11: DRM And Build Pipeline

### Already Implemented

- Steam VDFs with real app/depot IDs.
- Steam build workflow.
- Depot audit script.
- Config bake step in build workflow.
- `steam_appid.txt` exclusion checks.

### Needs

- Document exact Steam DRM wrapper procedure for Windows.
- Add local helper script for DRM wrap, if practical.
- Verify wrapped executable launches through Steam.
- Keep DRM separate from economy trust.
- Decide whether Linux build has any equivalent protection or just Steam
  launch/auth dependency.

### Acceptance

- Tagged build packages both depots.
- Depot audit passes for Windows and Linux.
- No `steam_appid.txt`, `.env`, local DB, or secrets-shaped files in depot.
- Windows executable is wrapped if required.
- Wrapped executable launches from Steam beta branch.
- Backend still enforces Steam auth regardless of DRM.

## Phase 12: Store Page And Marketing Assets

### Existing Planning

See `docs/steam-store-assets-plan.md` and
`docs/steam-store-asset-checklist.md`.

### Needs

- Final capsule art at required sizes.
- Screenshots:
  - title/operator selection
  - exploration
  - objective interaction
  - combat
  - archive/fabrication
  - results/leaderboard
  - cave reveal
- Trailer capture and edit.
- Short description.
- Long description.
- Tags.
- Mature content questionnaire, if applicable.
- Controller/Steam Deck feature claims only after acceptance.

### Do Not Claim Yet

Do not put these in public store copy until proven:

- Paid crates or Cache Keys.
- Marketplace/trading support.
- Full Steam Deck Verified-style claims.
- Specific Act 2 outcomes.
- Any economy feature not live in Steamworks.

## Phase 13: Browser/UI Acceptance Automation

Vitest coverage is strong for pure modules and backend behavior, but UI flows
need browser-level smoke coverage.

### Needs

Add Playwright or equivalent smoke tests for:

- Boot to menu.
- Start run.
- Open console.
- Use Bunker Tree.
- Open Steam Vault in offline/mock state.
- Open Store tab and verify disabled state.
- Game-over leaderboard states.
- Keyboard controls.
- Browser Gamepad fallback, if test harness can emulate.
- 1280 x 800 layout screenshot.

### Acceptance

- `npm run test:ui` or equivalent runs locally.
- CI can run at least smoke subset.
- Screenshots are attached on failure.
- Tests do not require Steam to be installed.

## Phase 14: Production Data And Operations

### Current State

The backend uses a JSON file with atomic writes. This is okay for early beta
with one machine. It is not a long-term production database.

### Needs Before Larger Launch

- Move receipts/idempotency/inventory mirrors to a real DB:
  - SQLite on mounted volume for single-machine beta, or
  - Postgres for multi-machine production.
- Add idempotency cleanup/expiry.
- Add request logs with no secrets.
- Add monitoring/alerts.
- Add backup/export path.
- Add admin runbook for bad grants or transaction investigation.

### Acceptance

- Restart backend without losing receipts.
- Deploy backend without losing receipts.
- Duplicate requests remain idempotent after restart.
- Failed purchase can be investigated from logs/DB.
- No secrets appear in logs.

## Environment Variables And Secrets

### Build/Client Config

- `HB_STEAM_BACKEND_URL`
- `HB_STEAM_APPID`
- `HB_STEAM_AUTH_IDENTITY`
- `HB_STEAM_CONFIG_REQUIRE_REMOTE`

### Backend Auth

- `HB_STEAM_PUBLISHER_KEY`
- `HB_SESSION_SECRET`
- `HB_STEAM_SESSION_SECRET` fallback/legacy alias
- `HB_SESSION_TTL_SECONDS`
- `HB_ALLOWED_ORIGINS`

### Backend Storage

- `HB_DB_STORAGE_PATH`

### Leaderboards

- `HB_STEAM_LEADERBOARD_IDS`
- `HB_STEAM_LEADERBOARD_AUTO_CREATE`

### Store/Economy

- `HB_STEAM_MICROTXN_ENABLED`
- `HB_STEAM_STORE_ENABLED`
- `HB_STEAM_STORE_MOCK_PURCHASES`
- `HB_STEAM_DROP_COOLDOWN_SECONDS`

### Rate Limits

- `HB_RATE_LIMIT_WINDOW_MS`
- `HB_RATE_LIMIT_MAX`

### CI/Deploy

- `FLY_API_TOKEN`
- `STEAM_BUILD_ACCOUNT`
- `STEAM_CONFIG_VDF`
- `STEAM_APPID`
- `STEAM_DEPOT_WINDOWS`
- `STEAM_DEPOT_LINUX`

## Command Checklist

### Local Validation

```bash
npm run lint
npm test
npm run build
npm audit --omit=dev
npm run steam:audit-backend
npm run steam:audit-depot
```

### Strict Backend Audit Example

```bash
HB_BACKEND_AUDIT_STRICT=1 \
HB_STEAM_APPID=1247290 \
HB_STEAM_PUBLISHER_KEY=<publisher> \
HB_SESSION_SECRET=<secret> \
HB_ALLOWED_ORIGINS=https://<origin> \
HB_DB_STORAGE_PATH=/app/server/data/db_storage.json \
HB_STEAM_LEADERBOARD_IDS='best_run_score:101,survival_time_seconds:102,deepest_depth_score:103,daily_ops_score:104,fastest_extraction_ms:105' \
npm run steam:audit-backend:strict
```

### Backend Image

```bash
docker build -t hunker-bunker-steam-backend:local .
```

### Packaged Config

```bash
HB_STEAM_BACKEND_URL=https://<backend>.fly.dev npm run steam:config
npm run electron:build
```

### Steam Upload

Use the `steam-build` workflow or SteamPipe manually after depot audit passes.

## Live Acceptance Ladder

Do this in order.

### Level 0: Local Dev

- Web dev build runs.
- Backend local dev runs.
- Mock leaderboards/inventory/store states work.
- Tests pass.

### Level 1: Packaged Local Electron

- `electron:build` output launches.
- Preload reads `electron/steam-config.json`.
- Backend health reaches deployed URL.
- No local env vars required.

### Level 2: Steam Beta Desktop

- Build uploaded to private `beta` branch.
- Installed through Steam.
- Overlay works.
- Auth session mints.
- Score submits.
- Leaderboard reads back.
- Achievement unlock appears.
- Cloud save syncs to second machine.

### Level 3: Steam Inventory Live

- Real account reads inventory.
- Server grants item.
- Item appears in Steam inventory.
- Exchange/cache-open works or is deliberately disabled.
- Market/trade flags match Steam dashboard.

### Level 4: Steam Deck

- Install from Steam beta.
- Play five minutes entirely on controller.
- Prompts/glyphs readable.
- 1280 x 800 layout holds.
- Text entry works.

### Level 5: Release Candidate

- DRM wrap accepted.
- Depot audit passes on all depots.
- Store page assets uploaded.
- Backend monitoring exists.
- Paid Store disabled unless legally/product approved and live-tested.

## Current Top Outstanding Decisions

1. Do we commit the current dirty tree as one sprint integration or split it?
2. Do we permanently delete the Phaser-era files and remove all Phaser docs/config?
3. What Fly app name and allowed origin policy should be used?
4. Are paid Cache Keys definitely in scope for first public release, or should
   Store be read-only/offline until after launch?
5. Should Belgium/Netherlands handling be geo-gate, direct-purchase fallback,
   or full purchase disable?
6. Which items are actually tradable and marketable?
7. Is JSON-on-volume acceptable for beta, and what is the threshold for DB
   migration?
8. What is the minimum Queen fight acceptance bar before Queen Slayer/Emblem
   can ship?
9. Should Steam Deck be a public claim at launch or an internal compatibility
   target until proven?
10. Should Lighthouse tooling remain, be upgraded, or be removed to clear dev
    audit warnings?

## Recommended Next Work Order

1. Commit or split the current dirty tree.
2. Reconcile docs against the current branch reality.
3. Deploy backend to Fly with durable volume and secrets.
4. Bake deployed backend URL into packaged build.
5. Upload/install from Steam beta.
6. Prove auth -> score -> leaderboard -> inventory read on real Steam account.
7. Upload/verify Steam Inventory schema.
8. Accept Deck controls/layout.
9. Decide Store/microtransaction/legal scope.
10. Add browser/UI smoke tests.
11. Add DRM wrap procedure.
12. Finalize store assets and store page.

## Definition Of Done

Hunker Bunker is Steam-connected and functional when:

- The player installs it from Steam.
- The game launches through Steam.
- The overlay works.
- Steam identity is detected.
- Backend auth succeeds.
- Backend health is reachable from the installed build.
- A run can be played.
- A trusted score is submitted and read back.
- Achievements unlock in Steam.
- Save data syncs through Steam Cloud.
- Inventory can be read from Steam.
- At least one server-granted item appears in Steam Inventory.
- Any Store button is either live and fully verified or honestly disabled.
- Steam Deck/controller play is accepted.
- Depot audit and backend audit pass.
- No secrets/local DB/dev appid ship in depots.
- The docs match the actual release behavior.
