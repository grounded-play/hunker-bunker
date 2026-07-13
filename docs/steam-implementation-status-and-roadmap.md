# Steam Implementation Status and Roadmap

Date: 2026-07-13.

This is the working checkpoint for Hunker Bunker's Steam integration. It records
where the repo is today, what is safe to build next, and what should remain
deferred until the Steamworks configuration and policy details are settled.

## Where We Are Today

### Desktop and Steam Shell

Implemented:

- Electron wrapper with optional Steam initialization through `steamworks.js`.
- Steam overlay enablement for Electron.
- Steam Input polling and controller-aware renderer state.
- Save bridge from `hb_*` localStorage records into Electron `save.json`.
- Steam achievements and stats forwarding.
- Steam identity and Web API auth-ticket IPC:
  - `hb:getSteamIdentity`
  - `hb:getSteamAuthTicket`
  - `hb:cancelSteamAuthTicket`
- Preload helpers that call the backend with Steam auth tickets.

Important behavior:

- Steam remains optional for dev/web builds.
- Publisher keys never enter Electron, preload, Vite, or renderer code.
- Backend-only Steam Web API calls are the rule for trusted writes.

### Backend Foundation

Implemented:

- Express/Socket.IO server split into modules.
- `/health` endpoint.
- `/steam/session` endpoint that verifies Steam Web API auth tickets when
  `HB_STEAM_PUBLISHER_KEY` is configured.
- Safe disabled behavior when Steam auth is not configured.
- CORS controlled by `HB_ALLOWED_ORIGINS`.

Parallel Steam economy/Vault work currently exists in the worktree:

- `electron/main.cjs`
- `electron/preload.cjs`
- `index.html`
- `main.js`
- `style.css`
- `server/db.js`
- `server/steamInventory.js`
- `server/steamInventory.test.js`
- `steam/inventory_schema_hunker_bunker.json`
- `server/index.js` route mounting for inventory
- `server/db_storage.json` generated mock data

These files should be reviewed before they are treated as final. They are useful
scaffolding, but the inventory routes must be checked for auth, idempotency,
Steam API parameter correctness, and production storage assumptions before
shipping. The renderer Vault UI should also be checked for scope: first accepted
Vault should be read-only unless we explicitly approve crafting, grants, market
links, and loot/drop product rules.

### Leaderboards

Implemented:

- Browser-safe Steam event module in `src/steam/steamEvents.js`.
- Game-over payload generation from score, class, run time, mission state,
  daily ops state, depth, distance, kills, resources, and full-health status.
- Backend score recomputation in `server/leaderboardScoring.js`.
- Payload validation before any trusted submission.
- `POST /steam/leaderboards/submit-run`.
- Real server-side `ISteamLeaderboards/SetLeaderboardScore/v1` integration.
- `GET /steam/leaderboards/:board`.
- Real server-side `ISteamLeaderboards/GetLeaderboardEntries/v1` integration.
- Deterministic in-memory mock leaderboard storage when no publisher key is
  configured.
- Dev fallback score submission into mock leaderboards.
- Preload `getSteamLeaderboard(board, options)` helper exists in the current
  worktree.
- Leaderboard ID support through:
  - `HB_STEAM_LEADERBOARD_IDS`
  - `GetLeaderboardsForGame`
  - optional `HB_STEAM_LEADERBOARD_AUTO_CREATE=1`

Not yet implemented:

- Accepted renderer leaderboard display in results/menu UI. A broader Vault
  leaderboard tab exists in parallel work and needs review before merge.
- Durable production run receipts/idempotency ledger.
- Short-lived backend session tokens to avoid burning a fresh Steam auth ticket
  on every call.

### Inventory and Marketplace

Planned, not fully accepted as complete:

- Steam Inventory item schema draft.
- Server inventory routes for read, drop, promo grant, exchange, and market
  eligibility.
- In-game Steam Vault UI.

Current product stance:

- Steam-owned items should be cosmetics, collectibles, and non-power items.
- Core progression remains local/Steam Cloud only.
- Paid crates/keys and random rewards are deferred until policy, legal, and
  Steamworks setup are reviewed.

### DRM and Build Pipeline

Planned:

- Windows Steam DRM wrap step in the SteamPipe build lane.
- Guard against shipping `steam_appid.txt`.
- Keep DRM separate from economy trust.

Not yet implemented:

- Scripted DRM wrap.
- Build-pipeline documentation update.
- CI guard for `steam_appid.txt` in depots.

## Environment Variables

Current:

- `HB_STEAM_APPID`
- `HB_STEAM_AUTH_IDENTITY`
- `HB_STEAM_BACKEND_URL`
- `HB_STEAM_PUBLISHER_KEY`
- `HB_ALLOWED_ORIGINS`
- `HB_STEAM_LEADERBOARD_IDS`
- `HB_STEAM_LEADERBOARD_AUTO_CREATE`

Future:

- Durable DB path or database URL for production idempotency/receipts.
- Inventory schema mode or mock toggle if needed.
- Public economy asset base URL.

## Current Working Slice

This slice is closing the leaderboard loop before going deeper into inventory:

1. Keep mock leaderboard storage local to the leaderboard module until durable
   production receipts exist.
2. Add tests for no-key mock reads, no-key mock submits, and real Steam
   `GetLeaderboardEntries` request formation.
3. Validate `npm run lint`, `npm test`, and `npm run build`.
4. Leave the larger inventory/Vault work unstaged until it is reviewed.

Why this is next:

- It builds directly on the trusted submit path already in place.
- It gives a testable Steam-facing feature without touching marketable value.
- It avoids mixing leaderboard reliability work with inventory monetization.

## Next Practical Slice

After this leaderboard slice is green, tackle one of these in order:

1. Review and harden the inventory scaffold without expanding product scope.
2. Add short-lived backend session tokens so Steam tickets are verified once and
   subsequent `/steam/*` calls use `Authorization: Bearer <token>`.
3. Bake `HB_STEAM_BACKEND_URL`, app ID, and auth identity into packaged Electron
   builds so installed Steam clients do not point at localhost.
4. Add backend deploy/runbook and durable DB path before any production grants.
5. Add a small accepted leaderboard display in the run-summary flow, or formally
   accept and trim the parallel Steam Vault UI.

## Inventory Roadmap

Recommended order:

1. Review and harden the current inventory scaffolding.
2. Authenticate every inventory and market route with Steam tickets.
3. Derive `steamid` server-side only.
4. Add read-only inventory first.
5. Add local mock inventory only for dev.
6. Add non-random promo grants with idempotency.
7. Add exchanges/crafting.
8. Add Steam Vault read-only UI.
9. Add equip state with ownership reconciliation on every refresh.
10. Revisit marketability and paid crates later.

Hard requirements:

- No publisher key in the client.
- No client-supplied `steamid` trust.
- No production grants without durable idempotency.
- No marketable gameplay power.
- No paid random item launch without policy review.

## Steam Vault UI Roadmap

First version:

- Main-menu "Steam Vault" entry.
- Read-only inventory grid.
- Item details.
- Offline/dev/mock states.
- Ownership-aware equipped cosmetic state.

Later:

- Crafting/exchange.
- Store/market links.
- Loot-opening animation if the product decision stays approved.

## DRM Roadmap

Recommended order:

1. Add a documentation-only Steam DRM wrap procedure.
2. Add a local script/helper for Windows wrapper invocation.
3. Add a depot audit that fails if `steam_appid.txt` is present.
4. Test wrapped executable from Steam.
5. Only then fold the step into CI/release automation.

## Decision Log

- Trusted leaderboard writes use backend Steam Web API calls.
- Steam inventory ownership lives in Steam, not localStorage.
- Steam market/trading belongs to Steam Community Market and Steam Trading, not
  a custom in-game peer-to-peer marketplace.
- Local save data may cache display/equip state, but ownership is reconciled
  against Steam inventory.
- Lootbox/key monetization is deferred.

## Validation Baseline

Latest known passing checks:

- `npm run lint`
- `npm test`
- `npm run build`

When a Steam backend slice is implemented, also smoke-test:

- `/health`
- `/steam/session`
- the route being added in both no-key and configured-key/mock paths
