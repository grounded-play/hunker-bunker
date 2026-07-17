# Steam Backend Admin Runbook

Last updated: 2026-07-16

This runbook covers the trusted backend rail for Hunker Bunker's Steam
leaderboards, inventory grants, and Store purchases. It is for operators and
release engineers, not client gameplay/UI work.

## Safety rules

- Never put `HB_STEAM_PUBLISHER_KEY`, `STEAM_PUBLISHER_KEY`, or
  `STEAM_WEB_API_KEY` in the client, the depot, screenshots, logs, or docs
  intended for players.
- Never trust a client-supplied Steam ID. Every `/steam/*` route derives the
  account from a verified ticket or server-signed session token.
- Never enable live purchases without a durable `HB_DB_STORAGE_PATH` volume and
  a real backup plan.
- Never grant paid items because a client says a purchase completed. The server
  must see `Approved`/`Succeeded` from `ISteamMicroTxn` and only grants after a
  successful `FinalizeTxn` or a known already-committed transaction.
- Treat refunds, partial refunds, chargebacks, suspected fraud refunds, and
  friendly fraud refunds as entitlement-reversal events that need manual or
  automated clawback work before public commerce.

## Required production environment

Minimum:

```bash
NODE_ENV=production
PORT=3001
HB_ALLOWED_ORIGINS=https://your-game-origin.example
HB_STEAM_BACKEND_URL=https://your-backend.example
HB_STEAM_APPID=4957040
HB_STEAM_PUBLISHER_KEY=<steamworks publisher key>
HB_SESSION_SECRET=<long random secret>
HB_DB_STORAGE_PATH=/app/server/data/db_storage.json
```

SQLite-on-volume beta storage:

```bash
HB_DB_BACKEND=sqlite
HB_DB_SQLITE_PATH=/app/server/data/hunker-bunker.sqlite
```

If `HB_DB_BACKEND=sqlite` is set and `HB_DB_SQLITE_PATH` is omitted, the
backend stores SQLite data beside `HB_DB_STORAGE_PATH` when that path exists,
or at `server/data/hunker-bunker.sqlite` by default. JSON remains the default
storage backend for local development and old deploys.

Live Store additions:

```bash
HB_STEAM_STORE_ENABLED=1
HB_STEAM_MICROTXN_ENABLED=1
HB_STEAM_STORE_MOCK_PURCHASES=0
```

Optional:

```bash
HB_STEAM_MICROTXN_SANDBOX=1
HB_STORE_IDEMPOTENCY_TTL_SECONDS=86400
HB_STEAM_DROP_COOLDOWN_SECONDS=60
```

Use `HB_STEAM_MICROTXN_SANDBOX=1` for sandbox testing. Remove it before real
commerce.

## Health checks

1. Hit the backend:

   ```bash
   curl -s https://your-backend.example/steam/auth/config | jq
   curl -s https://your-backend.example/steam/store/catalog | jq
   ```

2. Confirm `steam/auth/config` reports:

   - `configured: true`
   - correct `appId`
   - session signing configured from an explicit secret or publisher key

3. Confirm `steam/store/catalog` reports one of:

   - `purchaseMode: "disabled"` for public builds before commerce approval.
   - `purchaseMode: "live"` only after the Steamworks Microtransactions setup,
     publisher key, durable DB path, and release policy are all ready.

4. Confirm DB status from health output or logs:

   - `storageBackend: "json"` means the legacy atomic JSON file is active.
   - `storageBackend: "sqlite"` means SQLite-on-volume is active.
   - `durable: true` means the path is explicitly configured or SQLite is in
     use on the mounted volume.

5. Check runtime logs for structured request entries:

   ```text
   [hb-request] {"method":"POST","path":"/store/purchase/init","status":200,...}
   ```

   Logs intentionally include only method, route path, status, duration,
   request ID, and booleans for ticket/session presence. They must not include
   raw auth tickets, bearer tokens, publisher keys, or full request bodies.

## Purchase lifecycle

The purchase ledger is canonical, not append-only. Each record is keyed by
`transId`/`orderId` and includes an `events` trail.

Storage locations:

- JSON backend: `db_storage.json` under `purchases`.
- SQLite backend: `purchases` plus `purchase_events` tables.

Common ledger statuses:

- `pending_confirmation`: Steam order exists, user has not completed approval.
- `approved`: Steam reports the user approved the order; backend should
  finalize.
- `finalized_pending_grant`: Steam capture succeeded; inventory grant is next.
- `completed`: item grant completed. Repeated finalization returns
  `alreadyGranted`.
- `mock_completed`: dev-only purchase grant completed in mock mode.
- `failed`: Steam reported a failed order.
- `reversed`: Steam reported a refund, chargeback, or fraud reversal state.
- `query_failed`: backend could not query Steam; retry is safe.
- `finalize_failed`: backend could not finalize; retry is safe unless Steam
  later reports a terminal status.
- `grant_failed`: payment was finalized but inventory grant failed; retry
  `/steam/store/purchase/finalize`.

Client-facing response hooks:

- `purchaseStatus: "pending"` with `nextAction: "open_overlay"` means show the
  Steam confirmation flow.
- `purchaseStatus: "pending"` with `nextAction: "retry_finalize"` means keep the
  purchase visible as pending and retry finalization.
- `purchaseStatus: "completed"` with `nextAction: "refresh_inventory"` means
  refresh the Vault/inventory.
- `purchaseStatus: "failed"` or `"reversed"` with `nextAction: "show_error"`
  means do not grant and show a recoverable error state.
- `purchaseStatus: "disabled"` means hide or disable purchase controls.

## Market eligibility and hosted Item Store links

`GET /steam/market/eligibility` returns a top-level `allowed` boolean derived
from Steam's `IEconMarketService/GetMarketEligibility` response. The Vault UI
uses that normalized flag as the only signal that a hosted Steam Item Store
overlay link may be opened.

Expected client behavior:

- `allowed: true`: show and enable the hosted Steam Item Store CTA when the
  catalog also exposes `hostedItemStore.enabled`.
- `allowed: false` or route failure: keep the CTA disabled and label the state
  as market eligibility unconfirmed. Do not fall back to a raw browser link in
  public Steam builds.
- Dev mode may return `allowed: true` with `reason: "dev_mock"` so local UI
  smoke tests can exercise the path without a live Steam account.

## Steam MicroTxn statuses and errors

Steam status handling follows Valve's Microtransactions docs:

- `Init`: order created, not authorized.
- `Approved`: user approved; backend may call `FinalizeTxn`.
- `Succeeded`: order processed; backend can grant if it has not already done so.
- `Failed`: terminal failure; do not grant.
- `Refunded`, `PartialRefund`, `Chargedback`,
  `RefundedSuspectedFraud`, `RefundedFriendlyFraud`: reversal states; revoke or
  investigate entitlement.

Steam error codes are mapped to stable backend reasons such as
`steam_purchase_not_approved`, `steam_purchase_denied`,
`steam_insufficient_funds`, `steam_restricted_country`,
`steam_fraud_blocked`, and `steam_purchase_already_committed`.

References:

- Steamworks `ISteamMicroTxn` Web API:
  https://partner.steamgames.com/doc/webapi/isteammicrotxn
- Steamworks Microtransactions implementation guide:
  https://partner.steamgames.com/doc/features/microtransactions/implementation

## Investigating a purchase

1. Find the transaction by `transId`, `orderId`, or `requestId` in the active
   storage backend: JSON `db_storage.json`, or SQLite `purchases` plus
   `purchase_events`.
2. Confirm `steamId64` matches the player account under investigation.
3. Read `status`, `reason`, `steamState`, `steamErrorCode`, and `events`.
4. If the status is `pending_confirmation`, ask the player to retry or restart
   the Steam overlay flow.
5. If the status is `approved`, `query_failed`, `finalize_failed`, or
   `grant_failed`, retry `/steam/store/purchase/finalize` for that transaction
   after confirming the backend is healthy.
6. If the status is `failed`, do not manually grant. Check the Steam error code.
7. If the status is `reversed`, start entitlement review/clawback.
8. If the status is `completed`, do not grant again. Repeated finalize requests
   should return `alreadyGranted`.

To refresh Steam state for a locally completed purchase, call
`/steam/store/purchase/finalize` with `reconcile: true`. This forces a
`QueryTxn` call and can move the ledger to `reversed` if Steam later reports a
refund or chargeback. A completed purchase that still reports `Approved` or
`Succeeded` remains completed and does not grant again.

## Idempotency cleanup

Permanent milestone and achievement idempotency records are intentionally
non-expiring unless the caller saves them with a TTL.

Store purchase init responses use a TTL so repeated network retries are cached
for a bounded time while the canonical purchase ledger remains durable. The
default TTL is 24 hours and can be overridden:

```bash
HB_STORE_IDEMPOTENCY_TTL_SECONDS=86400
```

Expired records are pruned during DB initialization and when looked up. The
server also exports `cleanupExpiredIdempotency()` for future admin tasks, but
there is no CLI wrapper yet.

## Backup and recovery

### JSON backend

For JSON-on-volume beta:

1. Stop the backend or put it into maintenance mode.
2. Copy `HB_DB_STORAGE_PATH` and its latest backup.
3. Validate the JSON:

   ```bash
   node -e "JSON.parse(require('fs').readFileSync(process.env.HB_DB_STORAGE_PATH, 'utf8')); console.log('ok')"
   ```

4. Confirm it has `inventories`, `leaderboards`, `idempotency`, `receipts`, and
   `purchases`.
5. Restart one backend instance only.

Do not run multiple writers against the same JSON file. Atomic file replacement
prevents torn writes, but it is not a multi-process database.

### SQLite backend

For SQLite-on-volume beta:

1. Use one backend instance per SQLite database file.
2. Set:

   ```bash
   HB_DB_BACKEND=sqlite
   HB_DB_SQLITE_PATH=/app/server/data/hunker-bunker.sqlite
   ```

3. Back up all SQLite files from the volume:

   ```text
   hunker-bunker.sqlite
   hunker-bunker.sqlite-wal
   hunker-bunker.sqlite-shm
   ```

4. Prefer stopping the backend before copying the DB files. If online backups
   are needed, add a dedicated SQLite backup command before public commerce.
5. Confirm `getDbStatus()` / health output reports `storageBackend: "sqlite"`.

SQLite uses WAL mode and schema tables for inventories, leaderboard mirrors,
idempotency, run receipts, purchase state, and purchase events. It is a better
single-machine beta store than JSON, but it is still not a multi-region or
multi-writer production database.

## SQLite migration path

JSON-on-volume is acceptable for local development. SQLite-on-volume is now
implemented behind `HB_DB_BACKEND=sqlite` and is the next beta storage step, but
it is not the final high-scale production economy store. Remaining migration
work:

1. Deploy SQLite on a durable volume with one backend instance.
2. Add an offline migration script that reads existing JSON once and writes
   SQLite in a transaction.
3. Add a backup command or runbook step that uses SQLite's backup API rather
   than raw file copies.
4. Use tables already created by `server/db-sqlite.js`:
   - `inventories(steam_id64, item_id, itemdefid, quantity, acquired_at, properties_json)`
   - `leaderboard_entries(board_name, steam_id64, score, persona, timestamp)`
   - `idempotency(request_id primary key, status, body_json, timestamp, expires_at)`
   - `run_receipts(id primary key, steam_id64, run_id, body_json, timestamp)`
   - `purchases(trans_id primary key, order_id, request_id, steam_id64, sku, status, price_usd_cents, reason, steam_state, updated_at, created_at, body_json)`
   - `purchase_events(id primary key, trans_id, status, reason, steam_state, timestamp)`
5. Deploy with a fresh backup and one backend instance.
6. Only after a successful beta soak, consider multiple backend instances with a
   server database such as Postgres.

## Pre-release acceptance

- `npm run steam:audit-backend:strict` passes with production env.
- `npm run steam:audit-depot` passes before upload.
- `server/db_storage.json` is absent from depots and git.
- Installed build reaches deployed `/steam/store/catalog`.
- Auth ticket session creation works from an installed Steam build.
- A test purchase goes `pending_confirmation` -> `approved` -> `completed`.
- A canceled/failed purchase grants nothing.
- A repeated finalize on a completed purchase returns `alreadyGranted`.
- A forced inventory grant failure leaves `grant_failed` and can be retried.
- A real account can read inventory and leaderboard state after restart.
