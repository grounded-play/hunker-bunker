# Steam Economy, Leaderboards, and DRM Integration Plan

Plan date: 2026-07-12.

This plan maps Steam DRM, Steam Leaderboards, and Steam Inventory/Market
support onto the current Hunker Bunker codebase. It is intentionally
conservative about trust: the renderer and local save files are good for game
feel and offline continuity, but anything marketable, tradable, paid, or
leaderboard-trusted needs Steam ownership checks and server-side authority.

Official docs referenced:

- https://partner.steamgames.com/doc/features/drm
- https://partner.steamgames.com/doc/features/leaderboards/guide
- https://partner.steamgames.com/doc/features/inventory
- https://partner.steamgames.com/doc/features/inventory/schema
- https://partner.steamgames.com/doc/features/inventory/dynamicproperties
- https://partner.steamgames.com/doc/features/inventory/itemtags
- https://partner.steamgames.com/doc/webapi/IInventoryService
- https://partner.steamgames.com/doc/webapi/ISteamLeaderboards
- https://partner.steamgames.com/doc/webapi/IEconMarketService
- https://partner.steamgames.com/doc/webapi/ISteamUserAuth

## Current Repo Reality

Already present:

- Steam/Electron shell in `electron/main.cjs` and `electron/preload.cjs`.
- `steamworks.js` dependency, currently used for Steam init, overlay, Steam
  Input, achievements, stats, and local player persona lookup. The installed
  package also exposes auth ticket APIs that this plan can build on.
- App ID `4957040` and content depot ID `4957041` in `steam/app_build.vdf`.
- Steam Input manifest at `steam/steam_input_manifest.vdf`.
- Local save bridge: `hb_*` localStorage values mirror to `save.json`.
- Achievement definitions in `src/achievements.js`.
- Score calculation in `src/threeGame.js` via `calculateRunScore()`.
- Game-over score finalization and personal best write in `main.js`.
- Local economy in `src/bank.js`: `tech`, `coin`, `med`, `ammo`, `shells`,
  base upgrades, skills, and weapon upgrades.
- Fabricator recipes in `src/fabricator.js`, currently local and save-backed.
- `server/index.js`, currently only a Socket.IO movement relay, not an
  authenticated economy/leaderboard service.

Important gap:

- The installed `steamworks.js@0.4.0` TypeScript surface does not expose Steam
  Inventory or Leaderboard helper APIs. It does expose auth tickets, which is
  enough to build a secure backend bridge. If we want pure client Steam
  Inventory calls later, we need either upstream wrapper support, a fork, or a
  small native bridge.

## Product Stance

Steam market/trading should be for cosmetics, profile-facing collectibles, and
non-gameplay prestige items. Do not make core progression tradable.

Keep these local or Steam Cloud only:

- `tech`, `coin`, `med`, `ammo`, and `shells`
- O2 generator state
- class skill unlocks
- weapon upgrade levels
- fabricator gameplay unlocks
- story/ending progression

Make these eligible for Steam Inventory:

- operator patches
- suit/emblem cosmetics
- weapon skin cosmetics
- bunker relic collectibles
- profile badges or "mementos" tied to endings/classes
- tradable crafting components that do not grant power by themselves

This avoids a hacked local save turning into real Steam market value.

## Trust Model

DRM is useful, but it is not an anti-cheat or economy-security system. Use it
to require Steam launch/ownership and to keep Steamworks features active.

For trusted systems:

1. Renderer asks Electron for a Steam Web API auth ticket.
2. Electron obtains the ticket from `steamClient.auth.getAuthTicketForWebApi()`.
3. Renderer sends the ticket plus a compact run/economy request to our backend.
4. Backend verifies the ticket through `ISteamUserAuth/AuthenticateUserTicket`.
5. Backend applies limits, idempotency, and sanity checks.
6. Backend calls privileged Steam Web APIs with `HB_STEAM_PUBLISHER_KEY`.

Never ship publisher keys in Electron, preload, renderer JS, or Vite env.

## Architecture

Add a new Steam service layer without disturbing the web build:

- `src/steam/steamEvents.js`
  - Browser-safe event contracts.
  - No Steam SDK imports.
  - Emits `steam-run-score-finalized`, `steam-inventory-refresh-requested`,
    `steam-item-grant-requested`, and `steam-market-status-requested`.

- `electron/main.cjs`
  - Add IPC handlers:
    - `hb:getSteamAuthTicket(identity)`
    - `hb:getSteamIdentity`
    - `hb:openSteamOverlayToUrl(url)` if supported by the wrapper later
  - Keep existing optional initialization behavior.
  - Return graceful `{ ok:false, reason }` objects when Steam is absent.

- `electron/preload.cjs`
  - Expose narrow methods:
    - `getSteamIdentity()`
    - `getSteamAuthTicket(identity)`
    - `submitSteamRunScore(payload)`
    - `refreshSteamInventory()`
    - `requestSteamItemGrant(payload)`
  - These should call HTTPS backend endpoints, not Steam publisher APIs.

- `server/index.js`
  - Split the current relay into modules before it grows:
    - `server/relay.js`
    - `server/steamAuth.js`
    - `server/steamInventory.js`
    - `server/steamLeaderboards.js`
  - Add JSON REST endpoints behind strict CORS.
  - Require `HB_STEAM_PUBLISHER_KEY`, `HB_STEAM_APPID`, and durable request
    storage before enabling grants or trusted writes.

- `steam/inventory_schema_hunker_bunker.json`
  - Source-controlled Steam Inventory schema draft.
  - Treat this file as the catalog source of truth, then upload/publish through
    Steamworks when ready.

## DRM Plan

DRM belongs in the SteamPipe packaging lane, not game logic.

Tasks:

1. Keep `steam_appid.txt` dev-only and excluded from depots.
2. Add a Windows DRM wrapping step before upload:
   - Build `dist_electron/win-unpacked/hunker-bunker.exe`.
   - Run `steamcmd +drm_wrap 4957040 "<input exe>" "<output exe>" drmtoolp 0`.
   - Upload the wrapped exe in the `win-unpacked/` payload inside the content
     depot, or in the Windows depot if the dashboard is later split by OS.
3. Test compatibility mode only if the normal wrapper breaks Electron.
4. Document that Linux may not have equivalent executable wrapping in the same
   way and should rely on Steam launch/ownership plus backend auth for economy.
5. Gate Steam economy and trusted leaderboard submission on verified Steam auth,
   not merely on the DRM wrapper.

Code changes needed:

- `scripts/steam-drm-wrap-windows.md` or a scriptable SteamPipe wrapper step.
- Update `docs/steam-build-pipeline.md` with the exact wrap stage.
- Add CI/build guard to fail if a production depot accidentally includes
  `steam_appid.txt`.

## Leaderboards Plan

Initial leaderboard set:

| API name | Sort | Display | Writes | Source |
| --- | --- | --- | --- | --- |
| `best_run_score` | Descending | Numeric | Trusted | `calculateRunScore()` |
| `daily_ops_score` | Descending | Numeric | Trusted | daily run path in `main.js` |
| `fastest_extraction_ms` | Ascending | Milliseconds | Trusted | victory/extraction run |
| `deepest_depth_score` | Descending | Numeric | Trusted | depth tier + distance |
| `survival_time_seconds` | Descending | Seconds | Client or Trusted | elapsed run time |

Recommendation: make score-bearing boards Trusted. Steam supports client
leaderboard writes, but this game is client-heavy and localStorage-backed, so
public competitive boards should be backend-submitted.

Renderer/game touchpoints:

- In `showGameOver()` in `main.js`, after `score` and `rating` are calculated,
  build a run summary:
  - score
  - class
  - run duration
  - victory/death
  - depth tier
  - distance
  - kills
  - deposited resources
  - daily ops date/seed if applicable
- Dispatch one Steam-facing event, separate from the UI animation.
- Never let UI text scraping become the leaderboard source.

Backend touchpoints:

- Verify Steam auth ticket.
- Apply basic impossible-run checks:
  - duration is positive and within sane bounds
  - score fits the submitted components
  - fastest extraction requires victory
  - daily board requires the current daily seed/date
- Use idempotent request IDs derived from SteamID + run ID + board name.
- Call `ISteamLeaderboards/SetLeaderboardScore` with `KeepBest`.
- Store accepted run receipts in durable storage for audit and replay defense.

In-game UI:

- Add a compact leaderboard tab to the existing results/game-over surface.
- Add a terminal panel in the main menu for:
  - global top
  - friends/around-player if supported
  - daily ops
- If backend is offline, show local bests and "Steam unavailable" state.

## Inventory and Marketplace Plan

Steam Inventory is the source of market/trade ownership. The in-game
"marketplace" should be a console that displays Steam-owned items, links or
redirects users to Steam purchase/market flows, and lets players equip or open
eligible items.

Do not implement a separate player-to-player market inside this game. Let Steam
Trading and the Steam Community Market handle transfer and sale of marketable
assets.

Initial item families:

| Range | Family | Marketable | Tradable | Notes |
| --- | --- | --- | --- | --- |
| `1000-1099` | Common relic fragments | false | true | Crafting materials only |
| `1100-1199` | Rare relic fragments | false | true | Used in exchanges |
| `2000-2099` | Operator patches | true | true | Cosmetic profile/equip items |
| `2100-2199` | Suit decals | true | true | Cosmetic only |
| `2200-2299` | Weapon finish cosmetics | true | true | No damage/stat impact |
| `3000-3099` | Playtime generators | false | false | End-of-run drop checks |
| `4000-4099` | Store bundles/chests | mixed | mixed | Simple item chest + exchange generator |
| `9000-9099` | Tag generators | false | false | Rarity/class/biome tags |

Suggested tag categories:

- `rarity`: `common`, `rare`, `epic`, `legendary`
- `class`: `scout`, `tank`, `engineer`, `all`
- `slot`: `patch`, `decal`, `weapon_finish`, `relic`
- `biome`: `cryo`, `bio`, `machine`, `abyss`
- `source`: `playtime`, `achievement`, `event`, `store`, `exchange`
- `season`: `launch`, `act2`, `event_*`

Dynamic properties:

- Good use:
  - `first_owner_steamid`
  - `earned_at`
  - `source_run_id`
  - `times_equipped`
  - `display_seed`
- Do not use for value-critical identity:
  - rarity
  - item type
  - market-visible attributes
  - class/slot filters

Reason: dynamic properties can be cleared on trade and are not visible in
Steam inventory/market views. Use immutable tags for market filters.

Grant flows:

1. Playtime drops
   - End of run calls backend or client inventory bridge to trigger a
     playtime generator.
   - Drop cadence is controlled by Steam Inventory settings.
   - Good for common relic fragments and occasional cosmetic drops.

2. Achievement/promo grants
   - Tie class victory patches and ending mementos to Steam achievements where
     possible.
   - For manual promo grants, backend validates achievement/progression and
     calls Steam Inventory APIs.

3. Trusted server grants
   - Use only for high-value or limited items.
   - Backend calls `IInventoryService/AddItem`.
   - Use `requestid` for idempotency.
   - Set Steam trade/market cooldowns where appropriate.

4. Crafting/exchange
   - Use Steam Inventory `exchange` recipes for relic fragments -> cosmetics.
   - Server or client bridge passes specific material item IDs.
   - Steam atomically consumes materials and creates output.

5. Purchase
   - Define prices or `price_category` in itemdefs.
   - Start with Steam Item Store / BuyItem web function.
   - Add in-game purchase UI only after inventory refresh and callback handling
     are solid.

In-game UI:

- Add "STEAM VAULT" or "MARKET" terminal from the main menu/base console.
- Views:
  - inventory grid
  - equipped cosmetics
  - crafting/exchange
  - item store link
  - market eligibility and Steam market link
- Do not show local bank currencies as tradeable Steam items.

## Backend API Sketch

All endpoints require a Steam Web API auth ticket from Electron unless the
endpoint is public read-only.

- `POST /steam/session`
  - Input: `{ ticketHex, identity }`
  - Verifies Steam ticket.
  - Returns short-lived backend session token or signed response.

- `POST /steam/leaderboards/submit-run`
  - Input: run summary and board targets.
  - Verifies ticket/session.
  - Recomputes score.
  - Calls `SetLeaderboardScore`.

- `GET /steam/leaderboards/:board`
  - Returns global/friends/around-user entries.
  - Uses publisher key on the server.

- `GET /steam/inventory`
  - Returns current user's Steam inventory through `IInventoryService`.

- `POST /steam/inventory/grant`
  - High-trust grants only.
  - Validates entitlement/progression.
  - Calls `AddItem`.

- `POST /steam/inventory/exchange`
  - Validates requested recipe.
  - Calls `ExchangeItem`.

- `GET /steam/market/eligibility`
  - Calls `IEconMarketService/GetMarketEligibility`.

Backend needs:

- HTTPS in production.
- Strict CORS for Steam/Electron origin and preview origin.
- Rate limiting by SteamID and IP.
- Durable storage for:
  - used request IDs
  - accepted run receipts
  - grant ledger
  - backend session nonces

## Implementation Phases

### Phase 1 - Foundation and Capability Probe

- Add Electron IPC for Steam identity and Web API auth tickets.
- Add `window.electronAPI.getSteamIdentity()` and
  `window.electronAPI.getSteamAuthTicket(identity)`.
- Add a Steam status panel in dev/debug UI showing:
  - Steam active
  - SteamID
  - persona
  - appid
  - inventory/leaderboard backend availability
- Add a backend `/health` endpoint and `/steam/session` ticket verification.
- Confirm `steamworks.js` can issue Web API tickets reliably in packaged builds.

### Phase 2 - Leaderboards

- Create Steamworks leaderboard definitions.
- Add run summary generation from `main.js`/`threeGame.js`.
- Submit `best_run_score` and `daily_ops_score` to backend.
- Add leaderboard read UI to results and menu.
- Add tests for score payload construction and backend recomputation.

### Phase 3 - Inventory Read-Only

- Draft `steam/inventory_schema_hunker_bunker.json`.
- Upload private itemdefs in Steamworks and enable Inventory Service.
- Add inventory refresh backend endpoint.
- Add "Steam Vault" UI that displays owned Steam items.
- Add empty/offline/private-inventory states.

### Phase 4 - Drops and Grants

- Add playtime generator itemdefs.
- Trigger drop checks at end of run.
- Add first achievement/promo cosmetics:
  - Scout victory patch
  - Tank victory patch
  - Engineer victory patch
  - first extraction memento
- Add backend grant ledger and idempotency.

### Phase 5 - Trading, Market, and Store

- Mark selected cosmetics `tradable:true` and `marketable:true`.
- Add icon URLs and large icon URLs hosted on a stable public CDN/path.
- Add tag localizations in Steamworks.
- Add market eligibility check in the Steam Vault.
- Add store/buy links for purchasable simple items or bundles.
- Keep random paid items compliant with Steam schema rules: sell the chest as a
  simple item, then use an exchange/generator to open it.

### Phase 6 - DRM and Release Pipeline

- Add Windows DRM wrap step before SteamPipe upload.
- Smoke test wrapped exe from Steam client.
- Update `docs/steam-build-pipeline.md` with exact commands.
- Verify no `steam_appid.txt` ships.
- Verify backend economy features reject unauthenticated/non-Steam launches.

## Risks and Decisions Needed

- Marketplace scope: decide whether marketable items are all cosmetic. Strong
  recommendation: yes.
- Backend hosting: Netlify static hosting is not enough for publisher-key
  economy calls unless paired with secure serverless functions and durable
  storage. A small Node service with Postgres/SQLite is cleaner.
- `steamworks.js` API coverage: current package supports auth tickets but not
  inventory/leaderboards directly. Backend-first avoids blocking on native
  wrapper work.
- Fraud tolerance: local single-player runs cannot be made perfectly
  cheat-proof. Trusted boards can be made harder to abuse, not impossible.
- Item art: Steam itemdefs need stable public icon URLs. Plan asset pipeline
  before publishing marketable items.
- Legal/platform review: marketable/tradable economy and paid random items need
  careful Steamworks configuration and policy review before release.

## Next Best Work

1. Implement Steam auth ticket IPC and a tiny authenticated backend session.
2. Add leaderboard payload creation from the game-over score path.
3. Draft the first private inventory schema with non-marketable cosmetics.
4. Add the read-only Steam Vault UI.
5. Only after read-only inventory works, turn on grants, marketability, and DRM
   wrapping in that order.
